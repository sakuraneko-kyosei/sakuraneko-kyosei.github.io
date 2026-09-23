/**
 * 「載っていない病院を追加する」フォームを作る Google Apps Script。
 *
 * ネットに情報が無い病院もあるので、見た人がサイトから病院を知らせられるようにする。
 * 送られた病院はサイトへ自動では載せない。運営者が確かめてから
 * data/clinics.json と、最短日フォームの病院プルダウン（create_form.gs の CLINICS と
 * 作成済みフォームの編集画面）の両方へ足す。
 *   - 自動で載せない理由: 架空の病院や宣伝のいたずらを防ぐため。また最短日の登録は
 *     病院名をプルダウンから選ぶので、プルダウンに無い病院は登録を受けられない
 *
 * 使い方（1回だけ）:
 *   1. https://script.google.com/ で「新しいプロジェクト」
 *   2. このファイルの中身を全部貼って保存
 *   3. 関数に createClinicForm を選んで「実行」→ Google アカウントの許可を出す
 *   4. 実行ログに出る clinicFormUrl の行を config.js へ貼る → サイトに「病院を追加」ボタンが出る
 *
 * 回答シートはウェブに公開しない（運営者だけが読む。電話番号などを確かめる前に晒さない）。
 */

const PREFS = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県",
  "埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県",
  "岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県",
  "大分県","宮崎県","鹿児島県","沖縄県"];

function createClinicForm() {
  const form = FormApp.create("猫の去勢・避妊 最短予約日：載っていない病院を知らせる");
  form.setDescription(
    "サイトに載っていない動物病院を教えてください。運営者が確かめてから一覧に追加します（すぐには載りません）。\n" +
    "病院の名前・場所など、病院として公開されている情報だけを書いてください。" +
    "あなたのお名前や連絡先は書かないでください。"
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);

  const pref = form.addListItem().setTitle("都道府県").setRequired(true);
  pref.setChoiceValues(PREFS);
  form.addTextItem().setTitle("病院名").setRequired(true);
  form.addTextItem().setTitle("市区町村").setHelpText("例: 八戸市").setRequired(true);
  form.addTextItem().setTitle("住所").setHelpText("分かる範囲で");
  form.addTextItem().setTitle("電話番号").setHelpText("病院の電話番号（分かれば）");
  form.addTextItem().setTitle("診療時間・休診日").setHelpText("分かれば");
  form.addParagraphTextItem().setTitle("備考")
    .setHelpText("「ネットに情報が無いが猫の手術をしている」など、確かめる手がかりになること");

  const ss = SpreadsheetApp.create("猫の去勢・避妊：病院の追加依頼（回答）");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // 都道府県を事前入力するための entry ID（サイトのボタンで今の県を入れておく）
  const pr = form.createResponse().withItemResponse(pref.createResponse("青森県")).toPrefilledUrl();
  const entry = (pr.match(/(entry\.\d+)=/) || [])[1] || "";

  Logger.log("clinicFormUrl: \"%s\",", form.getPublishedUrl());
  Logger.log("clinicPrefEntry: \"%s\",", entry);
  Logger.log("回答シート（公開しない）: %s", ss.getUrl());
  Logger.log("フォームの編集画面: %s", form.getEditUrl());
}
