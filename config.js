// サイトの設定。運用で触るのはこのファイルだけ。
window.SITE_CONFIG = {
  // Googleフォームの「送信用リンク」（.../viewform）。空ならボタンを隠す。
  formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdJL_81Ne1ks63IME6QABVh9riAJM0d-L75dH5VVUHX3CpSBw/viewform",
  // フォームの「病院名」設問の entry ID（例 "entry.123456789"）。
  // 入れると、病院の行の「登録する」からフォームを開いた時に病院名が入った状態になる。
  formClinicEntry: "entry.1257505099",

  // 回答スプレッドシートを「ウェブに公開」した CSV の URL。
  // 列の並び（1行目が見出し）: タイムスタンプ, 病院名, 手術の種類, 電話した日, 最短で取れた日, 備考
  // 空なら「登録はまだありません」と出るだけで、病院一覧は動く。
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJ8nUPYwdhdCDkHrDo3jtMk6DSOrPnPjtoNwTOJ0uqFsSFzWiO9VT4bQ2z3ZAD1MUJci8mwWmkTAQR/pub?gid=1149079771&single=true&output=csv",

  // 登録を受け付けている都道府県。フォームの「病院名」の選択肢がこの県の病院だけなので、
  // 県を増やすときは data/clinics.json と tools/create_form.gs の CLINICS も足してからここへ加える。
  // ここに無い県は、病院が載っていても登録ボタンを出さない。
  formPrefs: ["青森県"],

  // 初めて来た人に開く県。URL の ?pref= と、前回選んだ県（ブラウザに保存）が優先される
  defaultPref: "東京都",

  // 「載っていない病院を知らせる」フォーム（tools/create_clinic_form.gs で作る）。空ならボタンを隠す。
  // 回答はサイトに自動では載らない。運営者が確かめて data/clinics.json へ足す。
  clinicFormUrl: "",
  clinicPrefEntry: "", // 「都道府県」設問の entry ID。入れると今の県が選ばれた状態で開く

  // 登録から何日経ったら「古い」と表示するか
  staleDays: 90,
};
