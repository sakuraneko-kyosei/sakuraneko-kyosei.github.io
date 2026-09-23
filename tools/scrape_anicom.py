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
# 「市・区・町・村」の字を名前の途中に含む市町村。住所の頭がこれなら丸ごと採る
SPECIAL = ["四日市市","廿日市市","野々市市","十日町市","大町市","町田市","東村山市","武蔵村山市","村山市",
 "村上市","市川市","市原市","市貝町","市川三郷町","大村市","羽村市","田村市","北村山郡","西村山郡","東村山郡",
 "中新川郡","上市町","日野市","市来","八日市","五日市","町野"]
DAYS = "月火水木金土日祝"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "sakuraneko-kyosei-bot (+https://sakuraneko-kyosei.github.io/)"})
    for i in range(3):
        try:
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        except Exception as e:
            print("  retry", i, e, flush=True); time.sleep(5)
    raise RuntimeError("取得できない: " + url)

def city_of(addr, pref):
    a = addr[len(pref):] if addr.startswith(pref) else addr
    # 郡は落とす。郡の名前自体に「市」「町」を含む事がある（余市郡余市町）ので、郡の位置で切る
    g = a.find("郡")
    if 0 < g <= 5: a = a[g+1:]
    for s in SPECIAL:
        if a.startswith(s) and s[-1] in "市区町村":
            return s
    m = re.match(r"^(.{1,6}?[市区町村])", a)
    if not m: return ""
    c = m.group(1)
    # 「余市」+町、「四日市」+市 のように、次の字も市町村の字なら含める
    if len(a) > len(c) and a[len(c)] in "市町村": c = a[:len(c)+1]
    return c

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
                    "city": city_of(addr, pref), "address": a, "tel": tel, "hours": hours_of(sec)})
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
