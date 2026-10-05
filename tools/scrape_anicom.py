"""アニコムどうぶつ病院検索（公開情報）から、猫を診る病院を県ごとに集める。

使い方: python -X utf8 -B tools/scrape_anicom.py [県スラッグ ...]
  出力: data/clinics/<都道府県名>.json（例 data/clinics/岩手県.json）
  引数を省くと、青森県を除く全県（青森県は手で整えた data を使う）

- robots.txt は全ページを許可している（Disallow が空）。それでも 1.5 秒ずつ空けて取りに行く
- 対応動物に「猫」が無い病院は載せない
- 市区町村は住所から取る。政令市は区ではなく市（例 札幌市）、東京 23 区は区
"""
import html, json, re, sys, time, urllib.request
from pathlib import Path

PREFS = [("hokkaido","北海道"),("aomori","青森県"),("iwate","岩手県"),("miyagi","宮城県"),("akita","秋田県"),
 ("yamagata","山形県"),("fukushima","福島県"),("ibaraki","茨城県"),("tochigi","栃木県"),("gunma","群馬県"),
 ("saitama","埼玉県"),("chiba","千葉県"),("tokyo","東京都"),("kanagawa","神奈川県"),("niigata","新潟県"),
 ("toyama","富山県"),("ishikawa","石川県"),("fukui","福井県"),("yamanashi","山梨県"),("nagano","長野県"),
 ("gifu","岐阜県"),("shizuoka","静岡県"),("aichi","愛知県"),("mie","三重県"),("shiga","滋賀県"),
 ("kyoto","京都府"),("osaka","大阪府"),("hyogo","兵庫県"),("nara","奈良県"),("wakayama","和歌山県"),
 ("tottori","鳥取県"),("shimane","島根県"),("okayama","岡山県"),("hiroshima","広島県"),("yamaguchi","山口県"),
 ("tokushima","徳島県"),("kagawa","香川県"),("ehime","愛媛県"),("kochi","高知県"),("fukuoka","福岡県"),
 ("saga","佐賀県"),("nagasaki","長崎県"),("kumamoto","熊本県"),("oita","大分県"),("miyazaki","宮崎県"),
 ("kagoshima","鹿児島県"),("okinawa","沖縄県")]
BASE = "https://www.anicom-ah.com/"
WAIT = 1.5
OUT = Path(__file__).resolve().parent.parent / "data" / "clinics"
DAYS = "月火水木金土日祝"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "sakuraneko-kyosei-bot (+https://sakuraneko-kyosei.github.io/)"})
    for i in range(3):
        try:
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        except Exception as e:
            print("  retry", i, e, flush=True); time.sleep(5)
    raise RuntimeError("取得できない: " + url)

# 実在の市区町村の一覧（Geolonia「japanese-addresses」api/ja.json、CC BY 4.0）。
# 住所の頭を字で切ると「木津川市市坂」「新宿区市谷」「小郡市」「蒲郡市」を取り違えるので、一覧と照らす
_MUNI = json.loads((Path(__file__).resolve().parent / "municipalities.json").read_text(encoding="utf-8"))
_FORMS = {}
_OLD = {"前原市": "糸島市"}  # 2010 年に合併

def _forms(pref):
    # (住所の頭に来る書き方, 表示する地域名) の組を長い順に。郡は落とし、政令市は区でなく市にまとめる
    if pref not in _FORMS:
        out = []
        for n in _MUNI.get(pref, []):
            shown = re.sub(r"^.+?郡(?=.+[町村]$)", "", n)
            m = re.match(r"^(.+?市)(.+区)$", n)
            if m: shown = m.group(1); out.append((m.group(1), shown))
            out += [(n, shown), (shown, shown)]
        _FORMS[pref] = sorted(set(out), key=lambda x: -len(x[0]))
    return _FORMS[pref]

def _fold(s):
    # 表記の揺れ（鎌ケ谷/鎌ヶ谷、龍ケ崎/龍ヶ崎、諌早/諫早）を寄せて比べる
    return s.replace("ケ", "ヶ").replace("諌", "諫").replace("惠", "恵")

def city_of(addr, pref):
    a = addr.strip()
    while a.startswith(pref): a = a[len(pref):].strip()  # 住所に県名が重なっている物がある
    if not a: return "住所未掲載"
    a = _fold(a)
    for old, new in _OLD.items():  # 合併前の市名のままの住所
        if a.startswith(old): a = new + a[len(old):]
    for form, shown in _forms(pref):
        if a.startswith(_fold(form)): return shown
    # 頭に島の名前などが付く住所（八丈島八丈町）は、頭の数字の内側で探す
    for form, shown in _forms(pref):
        i = a.find(_fold(form))
        if 0 < i <= 4: return shown
    # 郡までしか書いていない住所は郡の名前で出す
    m = re.match(r"^(.+?郡)", a)
    if m and any(f.startswith(m.group(1)) for f, _ in _forms(pref)): return m.group(1)
    return "その他"

def hours_of(sec):
    rows = re.findall(r"<tr>\s*<td>([^<]*)</td>(.*?)</tr>", sec, re.S)
    slots, open_days = [], set()
    for t, cells in rows:
        marks = re.findall(r"<td>(.*?)</td>", cells, re.S)
        slots.append(t.strip().replace("~", "-"))
        for i, c in enumerate(marks[:8]):
            if "mark--" in c: open_days.add(i)
    closed = "".join(DAYS[i] for i in range(8) if i not in open_days)
    s = " / ".join(x for x in slots if x)
    return s + (f"（休: {closed}）" if closed and s else "")

def parse(page, pref):
    out = []
    for sec in re.findall(r'<section class="g-search__wrap">(.*?)</section>', page, re.S):
        m = re.search(r'vh/anicom\?id=(\d+)"[^>]*>([^<]+)</a>', sec)
        if not m: continue
        animals = re.findall(r"<li>([^<]+)</li>", (re.search(r'g-user__animalList">(.*?)</ul>', sec, re.S) or [None, ""])[1] if re.search(r'g-user__animalList">(.*?)</ul>', sec, re.S) else "")
        if "猫" not in animals: continue
        addr = html.unescape((re.search(r'<p class="g-user__address">([^<]*)</p>', sec) or [None, ""])[1]).strip()
        tel = (re.search(r'href="tel:([^"]+)"', sec) or [None, ""])[1]
        a = addr[len(pref):] if addr.startswith(pref) else addr
        out.append({"id": "anicom-" + m.group(1), "pref": pref, "name": html.unescape(m.group(2)).strip(),
                    "city": city_of(addr, pref), "address": a, "tel": tel, "hours": hours_of(sec),
                    "asOf": time.strftime("%Y-%m-%d")})  # 取得日（サイトの「最終更新」と各病院の「時点」に出る）
    return out

def scrape(slug, pref):
    first = get(BASE + slug)
    total = int((re.search(r'g-search__text--number">(\d+)<', first) or [None, "0"])[1])
    nxt = re.search(r'href="(https://www\.anicom-ah\.com/detailsearch\?postData=[^"]*?&amp;page=)2"', first)
    clinics = parse(first, pref)
    pages = (total + 9) // 10
    for p in range(2, pages + 1):
        time.sleep(WAIT)
        clinics += parse(get(html.unescape(nxt.group(1)) + str(p)), pref)
    seen, uniq = set(), []
    for c in clinics:
        if c["id"] not in seen: seen.add(c["id"]); uniq.append(c)
    return total, uniq

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    want = sys.argv[1:] or [s for s, _ in PREFS if s != "aomori"]
    for slug, pref in PREFS:
        if slug not in want: continue
        total, cl = scrape(slug, pref)
        # 地域ごとにまとめる（出てきた順を保つ）
        order = list(dict.fromkeys(c["city"] for c in cl))
        cl.sort(key=lambda c: order.index(c["city"]))
        (OUT / f"{pref}.json").write_text(json.dumps({"pref": pref, "clinics": cl}, ensure_ascii=False, indent=0), encoding="utf-8")
        print(pref, "掲載", total, "猫", len(cl), flush=True)
        time.sleep(WAIT)

if __name__ == "__main__":
    main()
