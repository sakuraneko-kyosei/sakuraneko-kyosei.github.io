/**
 * 日付の設問の説明を「予約した日に限らず、電話で空きを聞いただけの日でもよい」形にする。
 * ⚠️ 設問名は回答シートの列名で、サイトは列名の頭（「電話」「去勢の最短」「避妊の最短」）で読むので変えない。
 *
 * 使い方: flatten_form.gs と同じプロジェクトに貼り、wording を実行する（何度実行しても同じ結果）。
 */
function wording() {
  const form = findForm_(), done = [];
  const help = {
    "電話": "病院に電話などで問い合わせた日です（予約した日でも、空きを聞いただけの日でもかまいません）。",
    "去勢の最短": "予約した手術日、または「最短でこの日なら手術できる」と案内された日を入れてください。",
    "避妊の最短": "予約した手術日、または「最短でこの日なら手術できる」と案内された日を入れてください。",
  };
  form.getItems().forEach(i => { const k = Object.keys(help).find(h => i.getTitle().indexOf(h) === 0);
    if (k) { i.setHelpText(help[k]); done.push(i.getTitle()); } });
  Logger.log("updated: " + JSON.stringify(done));
}
