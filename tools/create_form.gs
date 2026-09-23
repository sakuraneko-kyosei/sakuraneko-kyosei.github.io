/**
 * 最短予約日の登録フォームと回答シートを作る Google Apps Script。
 *
 * 使い方（1回だけ）:
 *   1. https://script.google.com/ で「新しいプロジェクト」
 *   2. このファイルの中身を全部貼って保存
 *   3. 関数に createForm を選んで「実行」→ Google アカウントの許可を出す
 *   4. 「実行ログ」に出る 3 行を config.js へ貼る（sheetCsvUrl は手順 5 の後）
 *   5. ログに出たスプレッドシートを開き、ファイル → 共有 → ウェブに公開 →
 *      「フォームの回答 1」/「カンマ区切り形式（.csv）」で公開。出た URL が sheetCsvUrl
 *
 * ⚠️ 設問の順番はサイトの読み取り（index.html の r[1]〜r[5]）と対になっている。
 *    並べ替えるならサイト側も直す。
 * ⚠️ CLINICS は data/clinics.json の name と同じ並び・同じ綴り。病院を足したら両方直す。
 */

const CLINICS = [
  "めざわ動物病院", "あおば動物病院", "ごとう動物病院", "ファインド動物病院",
  "やすだ動物病院", "不二動物病院", "ユーカリ動物病院", "どうぶつの森クリニック",
  "南部グリーン動物病院", "りんごの木動物病院", "ティーズ動物病院",
  "ドルフィンペットクリニック", "ふれあい動物病院", "小笠原犬猫病院", "ポー動物病院",
  "さわ動物病院", "さわや動物病院", "あすなろ動物病院",
  "青森動物医療センター", "こなか動物病院", "ほき動物クリニック", "成田動物病院",
  "めめ動物病院", "横田動物病院", "たなべ動物病院", "あっぷる獣医科病院",
  "RUアニマルクリニック", "成田動物病院 黒石",
  "さくら動物病院", "ごり動物病院", "おとも動物病院", "なとわ動物病院",
  "浜の町動物病院", "いずみの動物クリニック", "ヨッシー動物病院 弘前",
  "アスヒ動物病院", "エルムペットクリニック", "よなが動物病院",
];
const OTHER = "その他（備考に病院名を書いてください）";

function createForm() {
  const form = FormApp.create("猫の去勢・避妊 最短予約日の登録（青森）");
  form.setDescription(
    "予約が取れたら、その日付を一件だけ登録してください。次に困る誰かの助けになります。\n" +
    "登録内容は善意の記録としてサイトに公開されます。病院の公式情報ではなく、最短である保証もありません。\n" +
    "お名前・連絡先・猫の名前など、個人が分かることは書かないでください。"
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setConfirmationMessage("登録ありがとうございました。手術が無事に終わりますように。");

  // 1. 病院名（列 B）
  const clinic = form.addListItem().setTitle("病院名").setRequired(true);
  clinic.setChoiceValues(CLINICS.concat([OTHER]));

  // 2. 手術の種類（列 C）
  form.addMultipleChoiceItem().setTitle("手術の種類").setRequired(true)
    .setChoiceValues(["去勢（オス）", "避妊（メス）"]);

  // 3. 電話・予約した日（列 D）
  form.addDateItem().setTitle("電話・予約した日")
    .setHelpText("分かれば。サイトでは「電話から何日後に手術か」を出すのに使います。");

  // 4. 最短で取れた手術日（列 E）
  form.addDateItem().setTitle("最短で取れた手術日").setRequired(true);

  // 5. 備考（列 F）
  form.addParagraphTextItem().setTitle("備考")
    .setHelpText("例: 術前検査は別日、野良・保護猫の割引あり、さくらねこ（耳カット）対応。個人が分かることは書かないでください。");

  // 回答シート
  const ss = SpreadsheetApp.create("猫の去勢・避妊 最短予約日（回答）");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // 病院名の事前入力に使う entry ID を、事前入力 URL から読み取る
  const pre = form.createResponse()
    .withItemResponse(clinic.createResponse(CLINICS[0]))
    .toPrefilledUrl();
  const m = pre.match(/[?&](entry\.\d+)=/);

  Logger.log('formUrl: "%s",', form.getPublishedUrl());
  Logger.log('formClinicEntry: "%s",', m ? m[1] : "");
  Logger.log("回答スプレッドシート（ここを「ウェブに公開」→ CSV）: %s", ss.getUrl());
  Logger.log("フォームの編集画面: %s", form.getEditUrl());
}
