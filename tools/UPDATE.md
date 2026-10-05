# 病院データの定期更新（目安: 3〜6 か月に 1 回）

閉院・移転・新規開院を拾うため、公開情報を取り直す。所要はおよそ半日（Caloo は 5 秒ずつ空けるため全県で数時間）。

## ⚠️ 先に知っておくこと

- `scrape_anicom.py` は `data/clinics/<県>.json` を**丸ごと上書き**する。Caloo から足した病院や、
  訂正フォームで直した病院（`updated` を持つ物）も消える。必ず作業用ブランチで走らせ、差分を見てから取り込む。
- 青森県は手で整えたデータなので、引数を省いたときは取り直さない。
- 過去の登録は病院名（`formName`）で照らしている。同名の病院が増減して `formName` が「名前（地域）」に
  変わると、その病院の過去の登録が出なくなる。手順 7 の差分で `formName` の変化を確かめる。
  （フォームは `flatten_form.gs` で病院名を書き込む形にしたので、`syncClinics` は使わない。今のフォームでは失敗する）
- アニコムを取り直さない県（青森県など）は、Caloo 由来の病院（`caloo-`）が古いまま残る。
  `scrape_caloo.py` は既にある id を取り直さないので、その県の `caloo-` の病院を手で外してから手順 4 を走らせる。

## 手順

1. 公開中の site から作業用ブランチを作る: `git fetch origin && git switch -c data-YYYYMM origin/site`
2. 訂正済みの病院を控える:
   `python -X utf8 -B -c "import json,glob;print([c['id'] for f in glob.glob('data/clinics/*.json') for c in json.load(open(f,encoding='utf-8'))['clinics'] if c.get('updated')])"`
3. アニコムを取り直す: `python -X utf8 -B tools/scrape_anicom.py`（県を絞るなら `iwate miyagi` のようにスラッグを並べる）
4. Caloo の分を足し直す: `python -X utf8 -B tools/scrape_caloo.py --cache <新しい空のフォルダ>`（止まっても同じ `--cache` で続きから。前回のフォルダを使うと古いページを使い回す）
5. 手順 2 で控えた病院が、訂正後の内容のまま残っているか確かめる（消えていたり訂正前の内容に戻っていたら、`git show origin/site:data/clinics/<県>.json` からその病院の行だけを写し戻す。ファイルごと戻すと取り直した分が消える）
6. 地域名・並び順・件数・最終更新日・sitemap を整える（戻した病院も含めるため、必ず手順 5 の後）: `python -X utf8 -B tools/build_index.py`
7. 差分を見る: `git diff --stat data`。件数が大きく減った県があれば取得失敗を疑う。`git diff data | grep formName` で名前の変わった病院も見る
8. 試験: `sh tests/runtests.sh`（全部 NG0 であること）
9. 公開する: `git commit` の後 `git push origin HEAD:site`

## 補足

- 市区町村の一覧（`tools/municipalities.json`）と読み（`tools/city_kana.json`）は Geolonia
  「japanese-addresses」（CC BY 4.0）から作った。市町村合併があった年は取り直す。
- サイト上部の「最終更新」は、病院情報の一番新しい取得日・訂正日（どちらも YYYY-MM-DD で書く）と、利用者からの一番新しい登録日の新しい方。
