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
from scrape_anicom import city_of

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "clinics"
SOURCE = ("アニコムどうぶつ病院検索（https://www.anicom-ah.com/）の公開情報から、猫を診る病院を転記。"
          "診療時間は要約であり変わることがあるので、必ず病院へ確認してください。")

def main():
    counts = {}
    for f in sorted(DIR.glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        cl = d["clinics"]
        if d["pref"] != "青森県":  # 青森県は手で整えた市町村名を保つ
            for c in cl: c["city"] = city_of(d["pref"] + c["address"], d["pref"])
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
    (ROOT / "data" / "prefs.json").write_text(
        json.dumps({"source": SOURCE, "counts": counts}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(counts), "県", sum(counts.values()), "件")

if __name__ == "__main__":
    main()
