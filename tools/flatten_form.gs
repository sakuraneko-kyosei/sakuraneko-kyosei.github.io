/**
 * 最短日の登録フォームを1ページの形に作り直す Apps Script（restructure_form.gs の後継）。
 *
 * 県ごとのプルダウンは Google フォームの選択肢の上限（約1000件）に東京都が入らなかった。
 * そこで病院名は記述式にし、サイトの病院ごとの「登録する」から県・病院名・今日の日付・匹数0を
 * 事前入力して開く。去勢と避妊は匹数と最短日を別々に持ち、1回の送信で両方登録できる。
 *
 * 使い方: restructure_form.gs と同じプロジェクトに貼り、flatten を1回だけ実行する。
 *   ログの SITE_CONFIG 用の行を config.js へ貼る。
 *
 * ⚠️ 消した設問の回答は、回答スプレッドシートに元の列見出しのまま残る（サイトは旧形式の行も読む）。
 */

const COUNT_CHOICES = ["0","1","2","3","4","5","6","7","8","9","10"];

function flatten() {
  const form = findForm_();
  if (form.getItems().some(i => i.getTitle() === "去勢（オス）の匹数")) throw new Error("作り直し済み");
  const T = FormApp.ItemType;

  // 0. ページへの参照（県の選択肢の分岐・各ページの行き先）を先に外す。参照されたままでは消せない
  byTitle_(form, T.LIST, PREF_Q).asListItem().setChoiceValues(PREFS);
  form.getItems(T.PAGE_BREAK).forEach(p => p.asPageBreakItem().setGoToPage(FormApp.PageNavigationType.CONTINUE));

  // 1. 県ごとのページと病院名の設問、旧「手術の種類」「最短で取れた手術日」を消す
  for (const it of form.getItems().slice().reverse()) {
    const t = it.getTitle();
    if (it.getType() === T.PAGE_BREAK || /^病院名/.test(t) || t === "手術の種類" || t === "最短で取れた手術日") {
      form.deleteItem(it);
    }
  }

  // 2. 都道府県: 分岐を外して普通のプルダウンに
  const pref = byTitle_(form, T.LIST, PREF_Q).asListItem();
  pref.setChoiceValues(PREFS).setHelpText("手術を予約した病院の都道府県");
  form.moveItem(pref.getIndex(), 0);

  // 3. 病院名（記述式）。サイトから開くと入った状態になる
  const clinic = form.addTextItem().setTitle("病院名").setRequired(true)
    .setHelpText("サイトの病院の「登録する」から開くと入っています。手で入れる時はサイトの表記どおりに");
  form.moveItem(clinic.getIndex(), 1);

  // 4. 予約した日（既存の日付の設問）を3番目へ
  const called = byTitle_(form, T.DATE, "電話・予約した日");
  form.moveItem(called.getIndex(), 2);

  // 5. 去勢と避妊: 匹数（0〜10）と最短日
  const add = (title, help, idx) => { const q = form.addListItem().setTitle(title).setRequired(true)
      .setChoiceValues(COUNT_CHOICES).setHelpText(help); form.moveItem(q.getIndex(), idx); return q; };
  const addDate = (title, idx) => { const q = form.addDateItem().setTitle(title)
      .setHelpText("匹数が1以上のときに入れてください"); form.moveItem(q.getIndex(), idx); return q; };
  const mc = add("去勢（オス）の匹数", "予約した去勢手術の匹数。無ければ 0", 3);
  const md = addDate("去勢の最短手術日", 4);
  const fc = add("避妊（メス）の匹数", "予約した避妊手術の匹数。無ければ 0", 5);
  const fd = addDate("避妊の最短手術日", 6);

  // 6. entry ID をログへ
  const today = new Date();
  const url = form.createResponse()
    .withItemResponse(pref.createResponse(PREFS[0]))
    .withItemResponse(clinic.createResponse("x"))
    .withItemResponse(called.asDateItem().createResponse(today))
    .withItemResponse(mc.createResponse("0"))
    .withItemResponse(md.createResponse(today))
    .withItemResponse(fc.createResponse("0"))
    .withItemResponse(fd.createResponse(today))
    .toPrefilledUrl();
  const ids = [...url.matchAll(/[?&](entry\.\d+)=/g)].map(m => m[1]);
  Logger.log('formEntries: {pref: "%s", clinic: "%s", called: "%s", maleCount: "%s", maleDate: "%s", femaleCount: "%s", femaleDate: "%s"},',
    ids[0], ids[1], ids[2], ids[3], ids[4], ids[5], ids[6]);
}
