"""県別の病院ファイルを整え、県ごとの件数の索引を作る。

使い方: python -X utf8 -B tools/build_index.py
  - data/clinics/<県>.json の各病院に formName（フォームの選択肢の名前）を付ける。
    同じ県に同じ名前の病院があれば「名前（市区町村）」、それでも重なれば住所を足す
  - data/prefs.json に県ごとの件数と出典を書く（サイトの都道府県プルダウンが読む）
⚠️ formName を変えると、フォームの選択肢（tools/restructure_form.gs の syncClinics）と
   過去の登録の照合がずれる。変えたら syncClinics を実行し直す。
"""
import json
from collections import Counter
from pathlib import Path
from urllib.parse import quote
from scrape_anicom import city_of

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "clinics"
# 市区町村の読み（Geolonia「japanese-addresses」latest.csv の市区町村名カナ、CC BY 4.0）
KANA = json.loads((ROOT / "tools" / "city_kana.json").read_text(encoding="utf-8"))
# 市区町村の代表地点（同じ csv の町丁目の緯度経度の平均）。サイトの「近い順」が使う
GEO = json.loads((ROOT / "tools" / "city_geo.json").read_text(encoding="utf-8"))
SOURCE = ("アニコムどうぶつ病院検索（https://www.anicom-ah.com/）と Caloo ペット（https://pet.caloo.jp/）の公開情報から、猫を診る病院を転記。"
          "診療時間は要約であり変わることがあるので、必ず病院へ確認してください。")

def main():
    counts, latest, geo = {}, "", {}
    for f in sorted(DIR.glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        cl = d["clinics"]
        # 地域名は全県とも住所から、実在の市区町村の一覧と照らして決める（郡は落とす、政令市は市）
        for c in cl: c["city"] = city_of(d["pref"] + c["address"], d["pref"])
        # 地域は件数の多い順、同数は読みのあいうえお順（読みの無い「住所未掲載」等は最後）。
        # サイトは出てきた順に地域を並べるので、病院の並びごと入れ替える（地域内の順は保つ）
        kana, n = KANA.get(d["pref"], {}), Counter(c["city"] for c in cl)
        cl.sort(key=lambda c: (c["city"] not in kana, -n[c["city"]], kana.get(c["city"], c["city"])))
        # 地域の読みを持たせ、サイトの検索で「はちのへ」でも引けるようにする
        for c in cl:
            if c["city"] in kana: c["cityKana"] = kana[c["city"]]
            else: c.pop("cityKana", None)
        n1 = Counter(c["name"] for c in cl)
        for c in cl:
            c["formName"] = c["name"] if n1[c["name"]] == 1 else f'{c["name"]}（{c["city"]}）'
        n2 = Counter(c["formName"] for c in cl)
        for c in cl:
            if n2[c["formName"]] > 1:
                c["formName"] = f'{c["name"]}（{c["address"]}）'
        assert len({c["formName"] for c in cl}) == len(cl), f.name + " に formName の重複"
        f.write_text(json.dumps(d, ensure_ascii=False, indent=0), encoding="utf-8")
        counts[d["pref"]] = len(cl)
        g = GEO.get(d["pref"], {})
        geo[d["pref"]] = {c: g[c] for c in dict.fromkeys(x["city"] for x in cl) if c in g}
        # 病院情報の最終更新日（訂正日 updated か取得日 asOf。どちらも無い物は一括取り込みの日）
        latest = max([latest] + [max(c.get("updated") or "", c.get("asOf") or "") or "2026-09-23" for c in cl])
    (ROOT / "data" / "prefs.json").write_text(
        json.dumps({"source": SOURCE, "updated": latest, "counts": counts}, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "data" / "city_geo.json").write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # 検索エンジン向けの一覧。更新日はデータの最終更新日に合わせる（掲載のある県だけ載せる）
    top = "https://sakuraneko-kyosei.github.io/"
    urls = [top] + [top + "?pref=" + quote(p) for p, n in counts.items() if n]
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{latest}</lastmod></url>\n" for u in urls) + "</urlset>\n",
        encoding="utf-8", newline="\n")
    print(len(counts), "県", sum(counts.values()), "件")

if __name__ == "__main__":
    main()
