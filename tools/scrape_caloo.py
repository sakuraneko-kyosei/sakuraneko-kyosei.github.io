"""Caloo ペット（https://pet.caloo.jp/）の公開情報から、既存データに無い「猫を診る病院」を足す。

使い方: python -X utf8 -B tools/scrape_caloo.py [--cache DIR] [県コード ...]
  県コードは 01〜47（例 02 = 青森県）。省くと全県。
  足した後に python -X utf8 -B tools/build_index.py で formName と件数を整える。

- robots.txt は一覧・詳細を許可し、ClaudeBot に Crawl-delay: 5 を求めているので、5 秒ずつ空ける
- 取得した HTML は --cache に置き、途中で止まっても続きから走る
- 既存（アニコム由来・手入力）と重なる病院は足さない。名前・住所・電話のどれかが一致すれば同じ病院とみなす
- 猫を診ない病院、「往診専門」「二次診療専門」の病院は足さない（通院で避妊・去勢を予約する場ではないので）
"""
import html, json, re, sys, time, unicodedata, urllib.request
from pathlib import Path
from scrape_anicom import PREFS, city_of, DAYS

BASE = "https://pet.caloo.jp"
WAIT = 5.0
UA = "sakuraneko-kyosei-bot (+https://sakuraneko-kyosei.github.io/)"
OUT = Path(__file__).resolve().parent.parent / "data" / "clinics"
_last = [0.0]

def get(url, cache):
    f = cache / (re.sub(r"[^0-9A-Za-z]+", "_", url[len(BASE):]).strip("_") + ".html")
    if f.exists():
        return f.read_text(encoding="utf-8")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(6):
        time.sleep(max(0.0, WAIT - (time.time() - _last[0])))
        _last[0] = time.time()
        try:
            s = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
            f.write_text(s, encoding="utf-8")
            return s
        except Exception as e:
            code = getattr(e, "code", None)
            if code == 404:
                return ""
            print("  retry", i, url, e, flush=True)
            time.sleep(60 if code == 429 else 10)
    raise RuntimeError("取得できない: " + url)

def norm_name(s):
    s = unicodedata.normalize("NFKC", s).lower()
    return re.sub(r"[\s・･\-‐ー－()（）]", "", s)

KANSUJI = str.maketrans("一二三四五六七八九", "123456789")

def norm_addr(s, pref):
    s = unicodedata.normalize("NFKC", s)
    if s.startswith(pref): s = s[len(pref):]
    s = re.sub(r"\s", "", s)
    s = re.sub(r"[‐－―ー−–—]", "-", s)
    s = re.sub(r"([一二三四五六七八九])丁目", lambda m: m.group(1).translate(KANSUJI) + "-", s)
    s = re.sub(r"(\d)(丁目|番地|番|の)", r"\1-", s)
    s = re.sub(r"(\d)号", r"\1", s)
    s = s.replace("大字", "").replace("字", "")
    s = re.sub(r"-+", "-", s)
    m = re.match(r"^(.*?\d+(?:-\d+)*)", s)  # 建物名などの後ろは落とす
    return (m.group(1) if m else s).strip("-")

def digits(s):
    return re.sub(r"\D", "", s or "")

def parse_list(page):
    out = []
    for blk in re.split(r'<div class="search-list card-link"', page)[1:]:
        m = re.search(r'<a href="/hospitals/detail/(\d+)"[^>]*>([^<]+)</a>', blk)
        if not m: continue
        addr = re.search(r'<div class="address">([^<]*)</div>', blk)
        ani = re.search(r"<th>診察動物</th>\s*<td>([^<]*)</td>", blk)
        out.append({"cid": m.group(1), "name": html.unescape(m.group(2)).strip(),
                    "address": html.unescape(addr.group(1)).strip() if addr else "",
                    "animals": ani.group(1).strip() if ani else None})
    return out

def hours_of(page):
    t = re.search(r'<table class="hospital-time">(.*?)</table>', page, re.S)
    if not t: return ""
    slots = []
    for row in re.findall(r"<tr><td>([^<]*)</td>(.*?)</tr>", t.group(1), re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row[1], re.S)
        days = {i for i, c in enumerate(cells[:8]) if "●" in c or "▲" in c}
        tm = re.sub(r"\s*~\s*", "-", row[0].strip())
        if days and tm: slots.append((tm, days))
    if not slots: return ""
    open_days = set().union(*(d for _, d in slots))
    closed = "".join(DAYS[i] for i in range(8) if i not in open_days)
    # 全ての枠が同じ曜日なら曜日は「休」だけで示し、曜日で時間が違う時だけ枠ごとに曜日を付ける
    same = all(d == open_days for _, d in slots)
    s = " / ".join(tm if same else f"{day_label(d)} {tm}" for tm, d in slots)
    return s + (f"（休: {closed}）" if closed else "")

def day_label(days):
    runs, cur = [], []
    for i in sorted(days):
        if cur and i == cur[-1] + 1: cur.append(i)
        else:
            if cur: runs.append(cur)
            cur = [i]
    runs.append(cur)
    return "・".join("・".join(DAYS[i] for i in r) if len(r) <= 2 else f"{DAYS[r[0]]}〜{DAYS[r[-1]]}" for r in runs)

def parse_detail(page):
    tel = ""
    for ld in re.findall(r"<script type='application/ld\+json'>\s*(\{.*?\})\s*</script>", page, re.S):
        try: j = json.loads(ld)
        except ValueError: continue
        if j.get("@type") == "VeterinaryCare":
            tel = j.get("telephone", "") or ""; break
    # ⚠️ ページ下部の「近くの病院」にも「診察動物」の表があるので、この病院の「診療動物」欄だけを読む
    ani = re.search(r"<th>診療動物</th>\s*<td class=\"animal\">([^<]*)</td>", page)
    equip = re.search(r'<ul class="equip-box">(.*?)</ul>', page, re.S)
    active = set(re.findall(r"<li>([^<]+)</li>", equip.group(1))) if equip else set()
    return {"tel": tel.strip(), "hours": hours_of(page), "animals": ani.group(1) if ani else None,
            "housecall": "往診専門" in active, "referral": "二次診療専門" in active}

def scrape_pref(code, pref, cache, log):
    f = OUT / f"{pref}.json"
    d = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"pref": pref, "clinics": []}
    cl = d["clinics"]
    names = {norm_name(c["name"]) for c in cl}
    addrs = {norm_addr(c["address"], pref) for c in cl if c.get("address")}
    tels = {digits(c.get("tel")) for c in cl if digits(c.get("tel"))}
    ids = {c["id"] for c in cl}
    listed, page = [], 1
    while True:
        s = get(f"{BASE}/hospitals/search/{code}/all/all" + (f"?page={page}" if page > 1 else ""), cache)
        got = parse_list(s)
        listed += got
        if not got or f"?page={page + 1}\"" not in s: break
        page += 1
    stat = {"掲載": len(listed), "既存と一致": 0, "猫なし": 0, "往診・二次専門": 0, "追加": 0}
    added = []
    for h in listed:
        if "caloo-" + h["cid"] in ids or norm_name(h["name"]) in names or norm_addr(h["address"], pref) in addrs:
            stat["既存と一致"] += 1; continue
        if h["animals"] is not None and "ネコ" not in h["animals"]:
            stat["猫なし"] += 1; continue
        det = parse_detail(get(f"{BASE}/hospitals/detail/{h['cid']}", cache))
        if "ネコ" not in (det["animals"] or h["animals"] or ""):
            stat["猫なし"] += 1; continue
        if det["housecall"] or det["referral"] or "往診" in h["name"]:  # 「〜往診所」は印が無くても往診専門
            stat["往診・二次専門"] += 1; continue
        if digits(det["tel"]) and digits(det["tel"]) in tels:
            stat["既存と一致"] += 1; continue
        a = unicodedata.normalize("NFKC", h["address"])
        a = a[len(pref):] if a.startswith(pref) else a
        c = {"id": "caloo-" + h["cid"], "pref": pref, "name": h["name"], "city": city_of(pref + a, pref),
             "address": a, "tel": det["tel"], "hours": det["hours"]}
        added.append(c)
        names.add(norm_name(c["name"])); addrs.add(norm_addr(a, pref)); ids.add(c["id"])
        if digits(c["tel"]): tels.add(digits(c["tel"]))
    for c in added:  # 同じ市区町村の最後の病院の後ろへ。無ければ末尾
        at = max((i for i, x in enumerate(cl) if x["city"] == c["city"]), default=len(cl) - 1)
        cl.insert(at + 1, c)
    stat["追加"] = len(added)
    if added:
        f.write_text(json.dumps(d, ensure_ascii=False, indent=0), encoding="utf-8", newline="\n")
    line = f"{pref} " + " ".join(f"{k}{v}" for k, v in stat.items())
    print(line, flush=True)
    log.write(json.dumps({"pref": pref, **stat, "added": [c["name"] for c in added]}, ensure_ascii=False) + "\n")
    log.flush()

def main():
    args = sys.argv[1:]
    cache = Path("caloo_cache")
    if args[:1] == ["--cache"]:
        cache, args = Path(args[1]), args[2:]
    cache.mkdir(parents=True, exist_ok=True)
    want = set(args) or {f"{i:02d}" for i in range(1, 48)}
    with open(cache / "log.jsonl", "a", encoding="utf-8") as log:
        for i, (_, pref) in enumerate(PREFS, 1):
            if f"{i:02d}" in want:
                scrape_pref(f"{i:02d}", pref, cache, log)

if __name__ == "__main__":
    main()
