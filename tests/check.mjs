// index.html のスクリプトを最小の偽 DOM で実際に走らせ、出来た HTML を検査する。
import fs from "node:fs";
var clearP = () => { el("#pager").children = []; el("#pagerTop").children = []; };
const base = "http://127.0.0.1:8765/";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];

const els = {};
function el(sel) {
  return els[sel] ??= {
    textContent: "", innerHTML: "", href: "", value: "", children: [], disabled: false, hidden: true,
    listeners: {},
    get options() { return sel === "#city" ? [{value: ""}, ...this.children] : this.children; },
    get length() { return this.children.length + (sel === "#city" ? 1 : 0); },
    set length(n) { this.children.length = Math.max(0, n - (sel === "#city" ? 1 : 0)); },
    classList: { remove() { el(sel).hidden = false; }, add() { el(sel).hidden = true; } },
    appendChild(o) { this.children.push(o); },
    insertAdjacentHTML(_, h) { this.innerHTML += h; },
    addEventListener(t, f) { this.listeners[t] = f; },
    scrollIntoView() {},
  };
}
globalThis.document = { querySelector: el, createElement: () => ({ listeners: {}, children: [], addEventListener(t, f) { this.listeners[t] = f; }, appendChild(o) { this.children.push(o); } }), title: "" };
const Q = "?pref=" + encodeURIComponent("青森県"); // 既定は東京都なので、既存の検査は URL で青森県を開く
globalThis.location = { search: Q, href: "http://x/index.html" + Q };
globalThis.history = { replaceState(_, __, u) { globalThis.lastUrl = String(u); } };
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
const wl = {};
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
globalThis.window = { addEventListener(t, f) { wl[t] = f; }, dispatchEvent(e) { wl[e.type] && wl[e.type](e); }, SITE_CONFIG: {
  formUrl: "https://docs.google.com/forms/d/e/X/viewform", 
  formEntries: {pref: "entry.p", clinic: "entry.1", called: "entry.c", maleCount: "entry.mc", maleDate: "entry.md", femaleCount: "entry.fc", femaleDate: "entry.fd"},
  sheetCsvUrl: base + "r.csv", staleDays: 90, defaultPref: "東京都",
  clinicFormUrl: "https://docs.google.com/forms/d/e/C/viewform", clinicPrefEntry: "entry.9", clinicEntries: {kind: "entry.k", kindFix: "訂正", name: "entry.n", tel: "entry.t", hours: "entry.h"} } };
const realFetch = fetch;
globalThis.fetch = (u, o) => realFetch(new URL(u, base), o);

await eval(script);
await new Promise(r => setTimeout(r, 500));

const out = el("#list").innerHTML;
const checks = {
  "1ページ目は20件": (out.match(/class="card"/g) || []).length === 20,
  "地域 18": el("#city").children.length === 18,
  "地域は件数の多い順": el("#city").children[0].value === "八戸市" && el("#city").children[1].value === "青森市",
  "登録件数 8（新形式の1行は去勢と避妊の2件）": el("#status").textContent === "登録 8 件",
  "一覧に無い病院の枠は1ページ目に出さない": !out.includes("一覧に無い病院の登録"),
  "新形式: 匹数を出す": out.includes("（2匹）") && out.includes("（1匹）"),
  "事前入力: 今日の日付と匹数0": /entry\.c=\d{4}-\d\d-\d\d/.test(out) && out.includes("entry.mc=0") && out.includes("entry.fd="),
  "めざわ: 新しい方(10日後)が最新": /めざわ動物病院[\s\S]*?問い合わせから <span class="days">10日後<\/span>/.test(out),
  "めざわ: 全角空白の名前も同じ病院に数える(他 1 件)": /めざわ動物病院[\s\S]*?>他 1 件</.test(out),
  "あおば: 90日超で古い表示": /あおば動物病院[\s\S]*?class="stale"/.test(out),
  "あおば: 19日後": /あおば動物病院[\s\S]*?19日後/.test(out),
  "引用符内のカンマを保持": out.includes("術前検査は当日, 絶食あり"),
  "めざわ: 避妊は別行で未登録": /めざわ動物病院[\s\S]*?<b>避妊（メス）<\/b> <span class="none">まだ登録がありません/.test(out),
  "あおば: 避妊の行に19日後、去勢は未登録": /あおば動物病院[\s\S]*?<b>去勢（オス）<\/b> <span class="none">[\s\S]*?<b>避妊（メス）<\/b>[\s\S]*?19日後/.test(out),
  "未登録の病院は案内": out.includes("まだ登録がありません"),
  "事前入力リンク": out.includes("entry.1=%E3%82%81%E3%81%96%E3%82%8F"),
  "八戸市が先頭": (out.match(/<h2 class="city">([^<]+)/) || [])[1] === "八戸市",
  "都道府県 47": el("#pref").children.length === 47,
  "既定は青森県": el("#pref").value === "青森県" && el("#prefTitle").textContent === "（青森県）",
  "青森は件数付き": el("#pref").children.find(o => o.value === "青森県").textContent === "青森県（67件）",
  "他県は準備中": el("#pref").children.find(o => o.value === "秋田県").textContent === "秋田県（準備中）",
  "県も事前入力": out.includes("entry.p=%E9%9D%92%E6%A3%AE%E7%9C%8C"),
  "北海道の同名病院は青森のあおばに数えない": !out.includes("北海道の同名病院"),
  "地域に件数": el("#city").children.some(o => o.value === "八戸市" && o.textContent === "八戸市（16件）"),
  "情報の日付: 手入力は運営者調べ": /めざわ動物病院[\s\S]*?情報: 運営者調べ 2026\/9\/23 時点/.test(out),
  "訂正リンク: 今の情報を事前入力": /めざわ動物病院[\s\S]*?情報の訂正を知らせる/.test(out) && out.includes("entry.k=%E8%A8%82%E6%AD%A3") && out.includes("entry.t=0178-46-2220"),
  "青森では登録ボタンを出す": el("#formBtn").hidden === false,
};
// 岩手県へ切り替え（病院データあり）
el("#pref").value = "岩手県"; await el("#pref").listeners.change(); await new Promise(r => setTimeout(r, 50));
const iw2 = el("#list").innerHTML;
Object.assign(checks, {
  "岩手: データの件数": (iw2.match(/class="card"/g) || []).length === Math.min(20, JSON.parse(fs.readFileSync(new URL(".work/data/clinics/岩手県.json", import.meta.url), "utf8")).clinics.length),
  "岩手: せきに8日後": /せき動物病院[\s\S]*?8日後/.test(iw2),
  "荒らしよけ: 予約日より前の手術日は出さない": !iw2.includes("-21日後") && !iw2.includes("2026/9/1）"),
  "荒らしよけ: 10分以内の連投は数えない": !iw2.includes("38日後") && !/せき動物病院[\s\S]*?他 \d 件[\s\S]*?<h3>/.test(iw2.split("せき動物病院")[1].split("<h3>")[0] + "<h3>"),
  "取り消した登録は出さない": !iw2.includes("3日後") && /せき動物病院[\s\S]*?<b>避妊（メス）<\/b> <span class="none">まだ登録がありません/.test(iw2),
  "岩手: 登録ボタン（岩手の設問）": /entry\.1=/.test(iw2) && el("#formBtn").hidden === false,
});
// 秋田県へ切り替え（準備中）
el("#pref").value = "秋田県"; await el("#pref").listeners.change();
const iw = el("#list").innerHTML;
Object.assign(checks, {
  "秋田: 準備中の案内": iw.includes("秋田県の病院はまだ登録されていません（準備中）"),
  "秋田: 病院カード無し": !iw.includes('class="card"'),
  "秋田: 登録ボタンは全県で出す": el("#formBtn").hidden === false,
  "秋田: 病院の追加は受ける（県を事前入力）": el("#clinicBtn").hidden === false && el("#clinicBtn").href.includes("entry.9=%E7%A7%8B%E7%94%B0%E7%9C%8C"),
  "秋田: 登録を受けるのでリマインドも出す": el("#remind").hidden === false,
  "秋田: 共有は岩手のページ": el("#shareX").href.includes(encodeURIComponent("?pref=" + encodeURIComponent("秋田県"))),
  "秋田: 地域は選べない": el("#city").disabled === true,
  "秋田: 見出しとタブ名": el("#prefTitle").textContent === "（秋田県）" && document.title.startsWith("秋田県"),
});
// 青森へ戻すと元どおり
clearP();
el("#pref").value = "青森県"; await el("#pref").listeners.change(); await new Promise(r => setTimeout(r, 50));
const nCard = () => (el("#list").innerHTML.match(/class="card"/g) || []).length;
const pagerText = () => el("#pager").children.map(o => o.textContent).join(" ");
const jumpOf = id => el(id).children[3].children; // [「ページ指定」, 入力, 移動]
checks["青森へ戻すと1ページ目20件"] = nCard() === 20 && el("#formBtn").hidden === false && el("#city").disabled === false;
checks["ページ送り: 1 / 4 ページ（67件中 1〜20件）"] = pagerText().includes("1 / 4 ページ（67件中 1〜20件）") && el("#pager").children[0].disabled === true;
{ const next = el("#pager").children[2]; clearP(); next.listeners.click(); }
checks["次へで2ページ目は20件"] = nCard() === 20 && pagerText().includes("2 / 4 ページ（67件中 21〜40件）") && el("#pager").children[2].disabled === false;
{ const prev = el("#pager").children[0]; clearP(); prev.listeners.click(); }
checks["前へで1ページ目に戻る"] = nCard() === 20 && pagerText().includes("1 / 4 ページ");
const sig = id => el(id).children.map(o => o.textContent + (o.children || []).map(c => c.textContent).join("")).join("|");
checks["ページ送りは上にも下にも出る（同じ中身）"] = el("#pagerTop").children.length === 4 && sig("#pagerTop") === sig("#pager");
checks["番号入力と移動は1つのまとまりで次の行"] = el("#pager").children[3].className === "jump" && jumpOf("#pager")[0].textContent === "ページ指定" && jumpOf("#pager")[2].textContent === "移動";
{ const [, inp, btn] = jumpOf("#pagerTop"); clearP(); inp.value = "2"; btn.listeners.click(); }
checks["上の入力で2ページ目へ移動"] = nCard() === 20 && pagerText().includes("2 / 4 ページ") && jumpOf("#pager")[1].value === 2;
{ const inp = jumpOf("#pager")[1]; clearP(); inp.value = "99"; inp.listeners.keydown({key: "Enter"}); }
checks["下の入力のEnterで範囲外は最終ページ（7件）に丸める"] = nCard() === 7 && pagerText().includes("4 / 4 ページ（67件中 61〜67件）") && el("#pager").children[2].disabled === true;
checks["一覧に無い病院は最後のページに別枠で出す"] = el("#list").innerHTML.includes("一覧に無い病院の登録") && /ねこの森クリニック[\s\S]*?8日後/.test(el("#list").innerHTML);
{ const inp = jumpOf("#pager")[1]; clearP(); inp.value = "0"; inp.listeners.keydown({key: "Enter"}); }
checks["0を入れると1ページ目に丸める"] = nCard() === 20;
el("#q").value = "めざわ"; clearP(); el("#q").listeners.input();
checks["検索: 名前で1件に絞る、ページ送りは出さない"] = nCard() === 1 && el("#list").innerHTML.includes("めざわ動物病院") && el("#pager").children.length === 0;
el("#q").value = "八戸"; el("#q").listeners.input();
checks["検索: 住所・地域の語でも引ける"] = nCard() === 16;
el("#q").value = "はちのへ"; el("#q").listeners.input();
checks["検索: 地域の読み（ひらがな）でも引ける"] = nCard() === 16;
el("#q").value = "ハチノヘ"; el("#q").listeners.input();
checks["検索: カタカナでも引ける"] = nCard() === 16;
el("#q").value = "八戸"; el("#q").listeners.input();
checks["検索中は地域の件数も検索に合う数"] = el("#city").children.find(o => o.value === "八戸市").textContent === "八戸市（16件）"
  && el("#city").children.filter(o => !/（0件）$/.test(o.textContent)).length === 1;
el("#q").value = "本田動物病院"; el("#q").listeners.input();
checks["情報の日付: Caloo（2ページ目以降の病院も検索で出る）"] = /本田動物病院[\s\S]*?情報: Caloo ペット 2026\/9\/24 時点/.test(el("#list").innerHTML);
el("#q").value = "存在しない病院名"; el("#q").listeners.input();
checks["検索: 合わなければ案内"] = el("#list").innerHTML.includes("検索に合う病院がありません。");
el("#q").value = ""; clearP(); el("#q").listeners.input();
checks["検索を消すと元の20件"] = nCard() === 20;
el("#q").value = "めざわ"; el("#q").listeners.input();
el("#pref").value = "岩手県"; await el("#pref").listeners.change(); await new Promise(r => setTimeout(r, 50));
checks["県を切り替えると検索語を消す"] = el("#q").value === "" && nCard() === 20;
el("#pref").value = "青森県"; await el("#pref").listeners.change(); await new Promise(r => setTimeout(r, 50));
checks["実績: 掲載数と登録数を実数で出す"] = /^全国 [\d,]+ 件の病院を掲載中 ／ 利用者からの登録 \d+ 件 ／ 最終更新 2026\/9\/24$/.test(el("#stats").textContent);
checks["空状態: 最初の1件を促す"] = el("#list").innerHTML.includes("まだ登録がありません。予約が取れたら、最初の1件をお願いします");
// 登録がある病院だけ
el("#onlyReported").checked = true; el("#onlyReported").listeners.change();
const on = el("#list").innerHTML, onCards = on.split('<div class="card').slice(1);
checks["絞り込み: 登録のある病院だけ残る"] = onCards.length > 0 && onCards.length < 67 && on.includes("めざわ動物病院") && on.includes("あおば動物病院")
  && onCards.every(c => (c.match(/まだ登録がありません/g) || []).length < 2);
checks["絞り込み: 病院の無い地域の見出しは出さない"] = (on.match(/<h2 class="city">/g) || []).length < 20 + 1;
checks["チェック中は地域が登録のある病院の件数"] = el("#city").children.find(o => o.value === "八戸市").textContent === "八戸市（3件）" && /^（\d+件）$/.test(el("#onlyCount").textContent);
el("#onlyReported").checked = false; el("#onlyReported").listeners.change(); await new Promise(r => setTimeout(r, 50));
checks["外すと地域の件数が戻る"] = el("#city").children.find(o => o.value === "八戸市").textContent === "八戸市（16件）";
checks["絞り込みを外すと1ページ目20件"] = nCard() === 20;
// 他 N 件はタップで開ける
checks["他N件: details で中身を出す"] = /めざわ動物病院[\s\S]*?<details class="more"><summary class="meta">他 1 件<\/summary><ul><li>/.test(el("#list").innerHTML);
// 送信直後の仮表示と、自分の登録にだけ出る取り消しボタン
store["sakuraneko.mine"] = JSON.stringify([{h: "abc123", key: "k", pref: "青森県", clinic: "あおば動物病院", at: Date.now()}]);
window.dispatchEvent(new CustomEvent("kyosei:sent", {detail: {rows: [{ts: new Date().toISOString(), pref: "青森県", clinic: "あおば動物病院", called: "2026-09-23", got: "2026-09-30", kind: "去勢", n: 3, note: "", h: "abc123"}]}}));
const pe = el("#list").innerHTML;
checks["送信直後: 反映待ちで出す"] = /あおば動物病院[\s\S]*?7日後[\s\S]*?（3匹）[\s\S]*?送信済み・反映待ち/.test(pe);
checks["自分の登録にだけ取り消しボタン"] = (pe.match(/data-undo=/g) || []).length === 1 && pe.includes('data-undo="abc123"');
window.dispatchEvent(new CustomEvent("kyosei:sent", {detail: {del: "abc123"}}));
checks["取り消すと一覧から消える"] = !el("#list").innerHTML.includes("送信済み・反映待ち");
let ng = 0;
for (const [k, v] of Object.entries(checks)) { console.log(v ? "OK" : "NG", k); if (!v) ng++; }
process.exit(ng);
