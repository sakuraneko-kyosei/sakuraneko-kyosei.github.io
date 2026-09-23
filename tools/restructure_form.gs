/**
 * 最短日の登録フォームを「都道府県 → その県の病院 → 手術について」の順に組み替える Apps Script。
 *
 * 全国の病院を1つのプルダウンに入れると数千件になり、別の県の同名病院も混ざる。
 * そこで最初に県を選び、「回答に応じてセクションに移動」でその県の病院だけのプルダウンへ進ませる。
 * 既存のフォームを組み替えるので、フォームの URL と、ウェブ公開した回答 CSV はそのまま使える。
 *
 * 使い方:
 *   1. https://script.google.com/ で新しいプロジェクトを作り、このファイルを貼る
 *   2. restructure を1回だけ実行（許可を出す。外部 URL の読み取り＝サイトの病院データの取得も許可に含まれる）
 *   3. syncClinics を実行 → ログの formPrefEntry と formClinicEntries を config.js へ貼る
 *   4. 病院データ（data/clinics/*.json）を更新して push したら、syncClinics だけ実行し直す
 *
 * ⚠️ 選択肢の名前はサイトの formName（tools/build_index.py が付ける）と一致させる。
 *    サイトは「県＋この名前」で登録を病院に結び付ける。
 * ⚠️ 回答 CSV は県ごとに「病院名（◯◯県）」の列が分かれる。サイトは見出しの名前で列を探す。
 */

const SITE = "https://sakuraneko-kyosei.github.io/";
const OLD_TITLE = "猫の去勢・避妊 最短予約日の登録（青森）";
const NEW_TITLE = "猫の去勢・避妊 最短予約日の登録";
const OTHER = "その他（備考に病院名を書いてください）";
const PREFS = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県",
  "埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県",
  "岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県",
  "大分県","宮崎県","鹿児島県","沖縄県"];
const PREF_Q = "都道府県";
const clinicQ_ = p => `病院名（${p}）`;
const sectionT_ = p => `病院を選ぶ（${p}）`;
const COMMON_T = "手術について";

function findForm_() {
  for (const t of [OLD_TITLE, NEW_TITLE]) {
    const it = DriveApp.getFilesByName(t);
    while (it.hasNext()) {
      const f = it.next();
      if (f.getMimeType() === MimeType.GOOGLE_FORMS) return FormApp.openById(f.getId());
    }
  }
  throw new Error("登録フォームが見つからない: " + OLD_TITLE);
}

function byTitle_(form, type, title) {
  return form.getItems(type).find(i => i.getTitle() === title) || null;
}

function restructure() {
  const form = findForm_();
  if (byTitle_(form, FormApp.ItemType.LIST, PREF_Q)) throw new Error("組み替え済み。syncClinics だけ実行する");
  form.setTitle(NEW_TITLE);

  // 既存の設問: 病院名（青森県の病院）と、手術についての4問
  const oldClinic = byTitle_(form, FormApp.ItemType.LIST, "病院名");
  const common = form.getItems().filter(i => i.getId() !== oldClinic.getId());

  // 1. 先頭に都道府県
  const prefQ = form.addListItem().setTitle(PREF_Q).setRequired(true)
    .setHelpText("手術を予約した病院の都道府県。次のページでその県の病院を選びます。");
  form.moveItem(prefQ.getIndex(), 0);

  // 2. 県ごとのセクション（病院のプルダウン）を末尾へ足していく
  const pages = {};
  for (const p of PREFS) {
    pages[p] = form.addPageBreakItem().setTitle(sectionT_(p));
    let q;
    if (p === "青森県") {
      q = oldClinic.asListItem().setTitle(clinicQ_(p));
      form.moveItem(q.getIndex(), form.getItems().length - 1);
    } else {
      q = form.addListItem().setTitle(clinicQ_(p)).setRequired(true);
      q.setChoiceValues([OTHER]); // 中身は syncClinics で入れる
    }
  }

  // 3. 共通のセクション。手術についての4問を末尾へ移す
  const commonPage = form.addPageBreakItem().setTitle(COMMON_T);
  for (const it of common) form.moveItem(it.getIndex(), form.getItems().length - 1);

  // 4. 移動先: 県を選ぶ → その県のセクション。各県のセクションを終えたら → 共通のセクション
  //    （PageBreakItem.setGoToPage は「この区切りの直前のページを終えた後の行き先」）
  prefQ.setChoices(PREFS.map(p => prefQ.createChoice(p, pages[p])));
  PREFS.forEach((p, i) => {
    if (i === 0) return; // 最初の区切りの直前は「都道府県」のページ。行き先は選択肢で決まる
    pages[p].setGoToPage(commonPage);
  });
  commonPage.setGoToPage(commonPage); // 最後の県（沖縄県）のセクションの後も共通へ（直後なので実質そのまま）
  Logger.log("組み替え完了。続けて syncClinics を実行する");
}

function syncClinics() {
  const form = findForm_();
  const prefQ = byTitle_(form, FormApp.ItemType.LIST, PREF_Q).asListItem();
  const entries = {};
  let total = 0;
  for (const p of PREFS) {
    const q = byTitle_(form, FormApp.ItemType.LIST, clinicQ_(p)).asListItem();
    let names = [];
    const res = UrlFetchApp.fetch(SITE + "data/clinics/" + encodeURIComponent(p) + ".json", {muteHttpExceptions: true});
    if (res.getResponseCode() === 200) {
      names = JSON.parse(res.getContentText("UTF-8")).clinics.map(c => c.formName || c.name);
    }
    q.setChoiceValues(names.concat([OTHER]));
    total += names.length;
    const url = form.createResponse().withItemResponse(q.createResponse(OTHER)) /* 病院名は Forms が空白を詰めて弾くことがあるので、必ず在る OTHER で entry ID だけ取る */.toPrefilledUrl();
    entries[p] = (url.match(/[?&](entry\.\d+)=/) || [])[1] || "";
  }
  const pu = form.createResponse().withItemResponse(prefQ.createResponse(PREFS[0])).toPrefilledUrl();
  Logger.log("病院 %s 件を反映", total);
  Logger.log('formPrefEntry: "%s",', (pu.match(/[?&](entry\.\d+)=/) || [])[1] || "");
  Logger.log("formClinicEntries: %s,", JSON.stringify(entries));
}

// 設問の型を確かめる（日付の設問が DATE か TEXT か）
function inspect() {
  findForm_().getItems().forEach(i => { if (i.getType() !== FormApp.ItemType.LIST) Logger.log("%s | %s | %s", i.getIndex(), i.getType(), i.getTitle()); });
}
