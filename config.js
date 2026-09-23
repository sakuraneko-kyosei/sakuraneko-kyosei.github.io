// サイトの設定。運用で触るのはこのファイルだけ。
window.SITE_CONFIG = {
  // Googleフォームの「送信用リンク」（.../viewform）。空ならボタンを隠す。
  formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdJL_81Ne1ks63IME6QABVh9riAJM0d-L75dH5VVUHX3CpSBw/viewform",
  // フォームの各設問の entry ID（tools/flatten_form.gs の flatten のログを貼る）。
  // 入っていれば全県で「登録する」を出し、県・病院名・今日の日付・匹数0を事前入力して開く
  formEntries: {pref: "entry.1739476446", clinic: "entry.400639525", called: "entry.302042983", maleCount: "entry.926655885", maleDate: "entry.167439866", femaleCount: "entry.1648414951", femaleDate: "entry.1019954660", note: "entry.1944321604", admin: "entry.651196966"},

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
  supportUrl: "https://ofuse.me/76bca621",
  // Google AdSense（審査に通ってから入れる）。例 "ca-pub-1234567890123456" と広告ユニットの slot 番号
  adsenseClient: "",
  adsenseSlot: "",

  // 登録から何日経ったら「古い」と表示するか
  staleDays: 90,
};
