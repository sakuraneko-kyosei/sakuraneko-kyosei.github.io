# 病院データの定期更新（目安: 3〜6 か月に 1 回）

閉院・移転・新規開院を拾うため、公開情報を取り直す。所要はおよそ半日（Caloo は 5 秒ずつ空けるため全県で数時間）。

## ⚠️ 先に知っておくこと

- `scrape_anicom.py` は `data/clinics/<県>.json` を**丸ごと上書き**する。Caloo から足した病院や、
  訂正フォームで直した病院（`updated` を持つ物）も消える。必ず作業用ブランチで走らせ、差分を見てから取り込む。
- 青森県は手で整えたデータなので、引数を省いたときは取り直さない。
- `formName`（フォームの選択肢の名前）が変わると、過去の登録との照合がずれる。最後に
  `tools/restructure_form.gs` の `syncClinics` を必ず実行する。

## 手順

1. 作業用ブランチを作る: `git switch -c data-YYYYMM`
2. 訂正済みの病院を控える:
   `python -X utf8 -B -c "import json,glob;print([c['id'] for f in glob.glob('data/clinics/*.json') for c in json.load(open(f,encoding='utf-8'))['clinics'] if c.get('updated')])"`
3. アニコムを取り直す: `python -X utf8 -B tools/scrape_anicom.py`（県を絞るなら `iwate miyagi` のようにスラッグを並べる）
4. Caloo の分を足し直す: `python -X utf8 -B tools/scrape_caloo.py --cache <一時フォルダ>`（止まっても同じ `--cache` で続きから）
5. 地域名・並び順・件数・最終更新日を整える: `python -X utf8 -B tools/build_index.py`
6. 手順 2 で控えた病院が、訂正後の内容のまま残っているか確かめる（消えていたら `git show main:data/clinics/<県>.json` から戻す）
7. 差分を見る: `git diff --stat data`。件数が大きく減った県があれば取得失敗を疑う
8. 試験: `sh tests/runtests.sh`（全部 NG0 であること）
9. 公開して、Google フォームで `syncClinics` を実行する

## 補足

- 市区町村の一覧（`tools/municipalities.json`）と読み（`tools/city_kana.json`）は Geolonia
  「japanese-addresses」（CC BY 4.0）から作った。市町村合併があった年は取り直す。
- サイト上部の「最終更新」は、病院情報の一番新しい取得日・訂正日と、利用者からの一番新しい登録日の新しい方。
