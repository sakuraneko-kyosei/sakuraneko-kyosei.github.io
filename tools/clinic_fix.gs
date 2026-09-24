/**
 * 「載っていない病院を知らせる」フォームを、掲載中の病院の訂正（時間・電話など）も受けられる形にする。
 * - 先頭に「知らせる内容」（追加 / 訂正）を足す。サイトの各病院の「訂正を知らせる」は、ここと今の情報を事前入力して開く
 * - 題名と説明を両方に合う形にする
 * 使い方: 他の .gs と同じプロジェクトに貼り、clinicFix を実行する（何度実行しても同じ結果）。
 * 実行ログの entry を config.js の clinicEntries へ貼る。
 */
function clinicFix() {
  const TITLE_OLD = "猫の去勢・避妊 最短予約日：載っていない病院を知らせる";
  const TITLE = "猫の去勢・避妊 掲示板：病院の追加・情報の訂正";
  let file = null;
  for (const t of [TITLE, TITLE_OLD]) {
    const it = DriveApp.getFilesByName(t);
    if (it.hasNext()) { file = it.next(); break; }
  }
  if (!file) throw new Error("病院フォームが見つからない");
  const form = FormApp.openById(file.getId());
  form.setTitle(TITLE);
  form.setDescription(
    "サイトに載っていない動物病院の追加や、掲載中の病院の診療時間・電話番号などの変更を教えてください。" +
    "運営者が確かめてから一覧に反映します（すぐには載りません）。\n" +
    "病院として公開されている情報だけを書いてください。あなたのお名前や連絡先は書かないでください。"
  );
  const Q = "知らせる内容";
  let q = form.getItems().find(i => i.getTitle() === Q);
  if (!q) {
    const mc = form.addMultipleChoiceItem().setTitle(Q).setRequired(true)
      .setChoiceValues(["載っていない病院の追加", "掲載中の病院の情報の訂正（時間・電話・住所など）", "閉院・移転"]);
    form.moveItem(mc.getIndex(), 0);
    q = form.getItems().find(i => i.getTitle() === Q);
  }
  const names = {};
  form.getItems().forEach(i => { names[i.getTitle()] = i.getId(); });
  Logger.log(JSON.stringify(names));
}
