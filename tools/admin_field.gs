/**
 * 登録した人が自分の登録を取り消せるように、フォームへ「管理用」の記述式の設問を1つ足す。
 *
 * サイトは登録の時に「k:<鍵のハッシュ>」、取り消しの時に「d:<鍵>」をこの設問へ入れて送る。
 * 回答シートは公開なので、登録の行に載るのはハッシュだけにしてある（鍵は登録した端末にだけ残る）。
 *
 * 使い方: flatten_form.gs と同じプロジェクトに貼り、addAdmin を1回だけ実行する。
 *   ログの entry ID を config.js の formEntries.admin へ入れる。
 * ⚠️ 既存の設問と回答は変えない。2回目は足さずに entry ID だけ出す。
 */
function addAdmin() {
  const form = findForm_();
  const TITLE = "管理用（入力しないでください）";
  const find = () => form.getItems().find(i => i.getTitle() === TITLE);
  if (!find()) {
    form.addTextItem().setTitle(TITLE)
      .setHelpText("サイトが自動で使う欄です。空のままにしてください。");
  }
  // ⚠️ addTextItem の戻り値（TextItem）には asTextItem が無いので、足した後も汎用の Item として拾い直す
  const item = find();
  // 事前入力 URL を作って entry ID を読む（ID は API から直接は取れない）
  const url = form.createResponse()
    .withItemResponse(item.asTextItem().createResponse("x"))
    .toPrefilledUrl();
  const m = url.match(/entry\.(\d+)=x/);
  Logger.log("admin: \"entry." + (m ? m[1] : "?") + "\"");
}
