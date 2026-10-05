// 開く県の優先順（URL → 保存 → 既定）と、選択の保存を場面ごとに検査する。
// 使い方: node check_mem.mjs <場面>   場面 = fresh | saved | url-wins | broken-storage
import fs from "node:fs";
const base = "http://127.0.0.1:8765/";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const scen = process.argv[2];

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
    addEventListener(t, f) { this.listeners[t] = f; },
    scrollIntoView() {},
  };
}
const KEY = "sakuraneko.selection";
const store = {};
if (scen === "saved" || scen === "url-wins" || scen === "url-allcity") store[KEY] = JSON.stringify({pref: "青森県", city: "弘前市"});
const E = encodeURIComponent;
const Q = scen === "url-wins" ? "?pref=" + E("岩手県")
  : scen === "url-state" ? `?pref=${E("青森県")}&city=${E("八戸市")}&q=${E("めざわ")}`
  : scen === "url-page" ? `?pref=${E("青森県")}&page=2` : scen === "url-frac" ? `?pref=${E("青森県")}&page=1.5`
  : scen === "url-allcity" ? `?pref=${E("青森県")}` : scen === "url-empty" ? `?pref=${E("青森県")}&q=${E("めざわ")}&page=2` : "";
globalThis.document = { querySelector: el, createElement: () => ({ listeners: {}, children: [], addEventListener(t, f) { this.listeners[t] = f; }, appendChild(o) { this.children.push(o); } }), title: "" };
globalThis.location = { search: Q, href: "http://x/index.html" + Q };
globalThis.history = { replaceState(_, __, u) { globalThis.lastUrl = String(u); } };
globalThis.localStorage = scen === "broken-storage"
  ? { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } }
  : { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
globalThis.window = { addEventListener() {}, dispatchEvent() {}, SITE_CONFIG: {
  formUrl: "https://docs.google.com/forms/d/e/X/viewform", formEntries: {pref: "entry.p", clinic: "entry.1"},
  sheetCsvUrl: "", staleDays: 90, defaultPref: "東京都" } };
const realFetch = fetch;
let failIwate = scen === "fetch-fail" ? 1 : 0;
globalThis.fetch = (u, o) => {
  if (failIwate && String(u).includes(encodeURIComponent("岩手県"))) { failIwate--; return Promise.reject(new Error("offline")); }
  return realFetch(new URL(u, base), o);
};

await eval(script);
await new Promise(r => setTimeout(r, 300));

const cards = () => (el("#list").innerHTML.match(/class="card"/g) || []).length;
const saved = () => JSON.parse(store[KEY] || "{}");
const checks = {};
if (scen === "fresh" || scen === "broken-storage") {
  checks["既定で東京都が開く"] = el("#pref").value === "東京都";
  checks["東京都は準備中"] = el("#list").innerHTML.includes("東京都の病院はまだ登録されていません（準備中）");
  checks["タブ名に「さくらねこ」が無い"] = document.title === "東京都 猫の去勢・避妊 掲示板 最短予約日一覧";
  // 青森県を選び、弘前市に絞る → 保存される
  el("#pref").value = "青森県"; await el("#pref").listeners.change();
  el("#city").value = "弘前市"; el("#city").listeners.change();
  if (scen === "fresh") {
    checks["県を選ぶと保存"] = saved().pref === "青森県";
    checks["地域を選ぶと保存"] = saved().city === "弘前市";
  } else {
    checks["保存できなくても動く（弘前市9件）"] = cards() === 9;
  }
}
if (scen === "saved") {
  checks["前回の県（青森県）で開く"] = el("#pref").value === "青森県";
  checks["前回の地域（弘前市）で開く"] = el("#city").value === "弘前市";
  checks["弘前市の9件だけ出る"] = cards() === 9;
  // 県を変えたら、地域は「すべて」に戻って保存される
  el("#pref").value = "岩手県"; await el("#pref").listeners.change();
  checks["県を変えると地域はすべてに戻り保存"] = saved().pref === "岩手県" && saved().city === "";
}
if (scen === "url-state") {
  checks["URL の地域（八戸市）で開く"] = el("#city").value === "八戸市";
  checks["URL の検索語で開く"] = el("#q").value === "めざわ" && cards() === 1;
  checks["今の状態が URL に写る"] = /city=%E5%85%AB%E6%88%B8%E5%B8%82/.test(globalThis.lastUrl || location.href) && /q=%E3%82%81%E3%81%96%E3%82%8F/.test(globalThis.lastUrl || location.href);
}
if (scen === "url-page") {
  checks["URL の page=2 で2ページ目（20件）"] = cards() === 20;
  el("#q").value = "八戸"; el("#q").listeners.input();
  checks["検索すると page は URL から消える"] = !/page=/.test(globalThis.lastUrl) && /q=/.test(globalThis.lastUrl);
}
if (scen === "fetch-fail") {
  el("#pref").value = "岩手県"; await el("#pref").listeners.change();
  checks["取得失敗は準備中でなく読み込み失敗と出す"] = el("#list").innerHTML.includes("岩手県の病院を読み込めませんでした") && !el("#list").innerHTML.includes("準備中");
  el("#pref").value = "青森県"; await el("#pref").listeners.change();
  el("#pref").value = "岩手県"; await el("#pref").listeners.change();
  checks["選び直すと取り直して表示する"] = cards() === 20;
}
if (scen === "url-frac") {
  checks["小数のページ番号は切り捨てて1ページ目（20件）"] = cards() === 20 && !/page=/.test(globalThis.lastUrl || "");
}
if (scen === "url-allcity") {
  checks["URL に県だけなら保存済みの地域で絞らない"] = el("#city").value === "" && cards() === 20;
}
if (scen === "url-empty") {
  el("#pref").value = "秋田県"; await el("#pref").listeners.change();
  checks["病院の無い県へ切り替えても URL に前の検索とページを残さない"] = !/q=|page=|city=/.test(globalThis.lastUrl) && /pref=%E7%A7%8B%E7%94%B0/.test(globalThis.lastUrl);
}
if (scen === "url-wins") {
  checks["URL の県（岩手県）が保存より優先"] = el("#pref").value === "岩手県";
  checks["別の県なので前回の地域は戻さない"] = el("#city").value === "";
}
let ng = 0;
for (const [k, v] of Object.entries(checks)) { console.log(v ? "OK" : "NG", `[${scen}]`, k); if (!v) ng++; }
if (!Object.keys(checks).length) { console.log("NG 場面の指定が不正:", scen); ng = 1; }
process.exit(ng);
