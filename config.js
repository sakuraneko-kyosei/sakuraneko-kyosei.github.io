// サイトの設定。運用で触るのはこのファイルだけ。
window.SITE_CONFIG = {
  // Googleフォームの「送信用リンク」（.../viewform）。空ならボタンを隠す。
  formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdJL_81Ne1ks63IME6QABVh9riAJM0d-L75dH5VVUHX3CpSBw/viewform",
  // フォームの「病院名」設問の entry ID（例 "entry.123456789"）。
  // 入れると、病院の行の「登録する」からフォームを開いた時に病院名が入った状態になる。
  formClinicEntry: "entry.1257505099", // 旧形式（県で分ける前）。今は formClinicEntries を使う
  // 「都道府県」設問の entry ID と、県ごとの「病院名（◯◯県）」設問の entry ID。
  // tools/restructure_form.gs の syncClinics のログを貼る。ここに無い県は登録ボタンを出さない
  formPrefEntry: "",
  formClinicEntries: {"青森県": "entry.1257505099"},

  // 回答スプレッドシートを「ウェブに公開」した CSV の URL。
  // 列の並び（1行目が見出し）: タイムスタンプ, 病院名, 手術の種類, 電話した日, 最短で取れた日, 備考
  // 空なら「登録はまだありません」と出るだけで、病院一覧は動く。
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJ8nUPYwdhdCDkHrDo3jtMk6DSOrPnPjtoNwTOJ0uqFsSFzWiO9VT4bQ2z3ZAD1MUJci8mwWmkTAQR/pub?gid=1149079771&single=true&output=csv",

  // 初めて来た人に開く県。URL の ?pref= と、前回選んだ県（ブラウザに保存）が優先される
  defaultPref: "東京都",

  // 「載っていない病院を知らせる」フォーム（tools/create_clinic_form.gs で作る）。空ならボタンを隠す。
  // 回答はサイトに自動では載らない。運営者が確かめて data/clinics.json へ足す。
  clinicFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSd8ilg3stZxDuSCe0CO3Ep8k0t3rGc5cu_oaxndtWHjIprFJg/viewform",
  clinicPrefEntry: "entry.910954798", // 「都道府県」設問の entry ID。入れると今の県が選ばれた状態で開く

  // アクセス解析: Google アナリティクス 4 の測定 ID（例 "G-XXXXXXXXXX"）。空なら計測しない
  gaId: "G-SGDWB7BR9N",

  // サイト運営への応援ページ（OFUSE / Ko-fi など）。空なら出さない
  supportUrl: "",
  // Google AdSense（審査に通ってから入れる）。例 "ca-pub-1234567890123456" と広告ユニットの slot 番号
  adsenseClient: "",
  adsenseSlot: "",

  // 登録から何日経ったら「古い」と表示するか
  staleDays: 90,
};
