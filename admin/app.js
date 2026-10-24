/* SUMIBIKI 運営管理アプリ
 * 運営マニュアル（2026-10-21版）の各章を画面にしたもの。
 * データはブラウザの localStorage に保存し、JSONで書き出し・読み込みできる。
 */
'use strict';

const STORAGE_KEY = 'sumibiki-admin-v1';

// ---------- マスター定義（マニュアル準拠） ----------

const SEASONS = {
  spring: { ja: '春', en: 'Spring', month: 3 },
  summer: { ja: '夏', en: 'Summer', month: 6 },
  autumn: { ja: '秋', en: 'Autumn', month: 9 },
  winter: { ja: '冬', en: 'Winter', month: 12 },
};

const ISSUE_STATUS = { planning: '企画中', production: '制作中', published: '公開済' };

// 5章 ホテル記事の制作フロー
const STAGES = ['候補', '情報収集', '線図発注', '執筆（日本語）', '英語版', '予約リンク', '公開前チェック', '予約投稿済', '公開済'];
const STAGE_PUBLISHED = STAGES.length - 1;

// 5章 公開前チェックリスト
const PREPUBLISH_CHECKS = [
  ['facts', '基本情報（所在地・開業年・設計者）を一次資料で確認した'],
  ['category', '地域・建築のカテゴリーを設定した'],
  ['drawing', '線図の使用許諾とクレジット表記を確認した'],
  ['affiliate', '予約リンクの遷移先と広告表記を確認した'],
  ['mobile', 'スマホで表示を確認した'],
  ['english', '英語版が公開できる状態になっている'],
];

// 6章 発注時に書面で合意する事項
const DRAWING_AGREEMENTS = [
  ['format', '納品形式'],
  ['revisions', '修正回数'],
  ['due', '納期'],
  ['fee', '報酬'],
  ['scope', '二次利用・掲載範囲'],
  ['credit', 'クレジット表記の有無'],
];
const DRAWING_STATUS = { none: '未手配', asking: '依頼先を探し中', ordered: '発注済', delivered: '納品済' };
const RIGHTS = { '': '未定', transfer: '譲渡', license: '利用許諾' };

// 10章 定期作業
const ROUTINES = {
  weekly: {
    label: '週次',
    items: [
      '管理画面にログインし、更新通知とスパムコメントを確認する',
      '問い合わせの受信を確認し、返信する',
      '次号の記事の進み具合を確認する',
    ],
  },
  monthly: {
    label: '月次',
    items: [
      '全ホテル記事の予約リンクが切れていないか確認する',
      'アクセス状況と予約リンクのクリック数・成果を記録する',
      'WordPress・SWELL・プラグインを更新する（バックアップ後）',
      '掲載ホテルの営業状況・基本情報に変更がないか確認する',
    ],
  },
  issue: {
    label: '号ごと',
    items: [
      '号のテーマ・記事数・公開日を決める',
      '表紙と記事の線図を発注し、納品を確認する',
      '日英の記事を公開し、SNSで告知する',
      '前号の成果を振り返り、次号に反映する',
    ],
  },
};

// 11章 未決定事項（初期値）
const DEFAULT_DECISIONS = [
  ['見出し用フォント（メインカラーは錆 #8c4a2a・明るい錆 #d9a27f に決定）', '4章'],
  ['多言語プラグインの選定と、言語ごとのURL構造', '3章・7章'],
  ['アフィリエイト提携先の比較・決定と、各社の規約確認', '8章'],
  ['創刊号のホテル5本と公開日の確定（年内〜来春）', '2章'],
  ['予算なしでの線図の調達方法（発注先・条件・権利の帰属）', '6章'],
  ['記事作成用Claudeへの依頼文の作成と、用語集の整備', '5章・7章'],
  ['Instagram・X・Pinterestの投稿頻度と運用ルール', '9章'],
  ['収益目標5万円の達成時期と、月額かどうかの確認', '1章'],
  ['月額会員制・家具アフィリエイトに着手する時期と条件', '1章'],
];

const DEFAULT_PARTNERS = ['楽天トラベル', 'Booking.com', '一休.com', 'Agoda'];
const PARTNER_STATUS = { candidate: '候補', applying: '申請中', active: '提携中', dropped: '見送り' };

const SNS_CHANNELS = ['Instagram', 'X', 'Pinterest'];

// ---------- ピクトグラム（24pxグリッドの線のアイコン） ----------

const ICONS = {
  home: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  issue: '<path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2z"/><path d="M12 6.5v14"/>',
  hotel: '<path d="M5 21V4.8a.8.8 0 0 1 .8-.8h8.4a.8.8 0 0 1 .8.8V21"/><path d="M15 10h3.2a.8.8 0 0 1 .8.8V21"/><path d="M3 21h18"/><path d="M8.5 8h1M11 8h1M8.5 11.5h1M11 11.5h1M8.5 15h1M11 15h1"/>',
  archive: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 15.5-5-5-9 9"/>',
  compass: '<circle cx="12" cy="5" r="1.8"/><path d="M11 6.7 6 20.5M13 6.7l5 13.8M8.2 14.5h7.6"/>',
  yen: '<circle cx="12" cy="12" r="9"/><path d="m8.5 7 3.5 5 3.5-5M12 12v5.5M9 12.5h6M9 15h6"/>',
  megaphone: '<path d="M3.5 10v4a1 1 0 0 0 1 1H7l6 4V5L7 9H4.5a1 1 0 0 0-1 1z"/><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5M19 7a7 7 0 0 1 0 10"/>',
  glossary: '<path d="M4 6h8.5M8.2 4v2M6 6c.3 3.5 2.6 6.3 6 7.6M10.6 6c-.6 3.2-2.8 6.2-6.1 7.6"/><path d="m13 20 3.5-8.5L20 20M14.3 17.2h4.4"/>',
  routine: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m9 14.8 2 2 4-4"/>',
  decision: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.5"/><path d="M12 16.8h.01"/>',
  settings: '<path d="M4 7h9.5M18.5 7H20M4 17h3.5M12.5 17H20"/><circle cx="16" cy="7" r="2.3"/><circle cx="10" cy="17" r="2.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  edit: '<path d="M4 20h4L19.2 8.8a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m14.5 7.5 3 3"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  note: '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 13h7M9 17h4.5"/>',
  chat: '<path d="M4 5h16v11H9.5L5 20v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  doc: '<path d="M6 3h12v18H6z"/><path d="M9 7.5h6M9 11h6M9 14.5h3.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  check: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m8 12.5 3 3 5.5-6"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 15.5-5-5-9 9"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 16.8h.01"/>',
  chart: '<path d="M4 4v16h16"/><path d="m7.5 15 3.5-4.5 3 2.5 4.5-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.4-3.3 2.6-5.3 5.5-5.3s5.1 2 5.5 5.3M16 5.7a3 3 0 0 1 0 5.6M18 14.6c1.7.7 2.8 2.3 3 4.9"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  steps: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
};

function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// ---------- ユーティリティ ----------

const $ = (sel, root = document) => root.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function yen(n) { return '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP'); }
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function ym(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function daysBetween(a, b) { return Math.round((b - a) / 864e5); }
function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function fmtDate(s) {
  const d = parseDate(s);
  return d ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : '未定';
}
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${pad(w)}`;
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = val;
}
function lines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// アーティファクト内ではブラウザ標準の確認ダイアログが出ないため、ページ内のダイアログで確認する
function ask(message, okLabel = 'OK') {
  return new Promise(resolve => {
    const d = $('#confirm');
    $('#confirm-msg').textContent = message;
    $('#confirm-ok').textContent = okLabel;
    $('#confirm-ok').onclick = () => { d.close(); resolve(true); };
    $('#confirm-cancel').onclick = () => { d.close(); resolve(false); };
    d.oncancel = () => resolve(false);
    d.showModal();
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('コピーしました');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('コピーしました'); } catch { toast('コピーできませんでした'); }
    ta.remove();
  }
}

// アーティファクトとして開いたときは downloads 機能で保存する。ローカルではリンクから保存する。
async function download(filename, text, type = 'application/json') {
  const dl = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) {
    try {
      await dl.save({ filename, data: text });
    } catch (e) {
      if (e?.code !== 'declined') toast('ファイルを保存できませんでした。コピーを使ってください');
    }
    return;
  }
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function csv(rows) {
  return '﻿' + rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

// ---------- データ ----------

function defaultState() {
  return {
    version: 1,
    issues: [],
    hotels: [],
    partners: DEFAULT_PARTNERS.map(name => ({ id: uid(), name, status: 'candidate', termsCheckedAt: '', reward: '', rules: '', notes: '' })),
    results: [],
    glossary: [],
    snsPosts: [],
    routineDone: {},
    decisions: DEFAULT_DECISIONS.map(([text, chapter]) => ({ id: uid(), text, chapter, done: false, resolution: '' })),
    settings: {
      revenueGoal: 50000,
      goalIsMonthly: true,
      goalDeadline: '',
      ga4Id: '',
      articlesPerIssue: 5,
      prepMonths: 2,
      colorMain: '#8c4a2a',
      colorLight: '#d9a27f',
      headingFont: '',
      bodyFont: '',
      writingStyle: 'です・ます調。建築に関心のある旅行者に向けた、落ち着いた雑誌の文体',
      articleLength: '3,000〜4,000字',
      disclosureText: '本記事には広告（アフィリエイトリンク）を含みます',
      backupNote: '',
      lastExportAt: '',
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('load failed', e);
  }
  return defaultState();
}

// 古いデータや手で書いたJSONでも欠けた項目を補う
function migrate(data) {
  const base = defaultState();
  const s = { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
  for (const k of ['issues', 'hotels', 'partners', 'results', 'glossary', 'snsPosts', 'decisions']) {
    if (!Array.isArray(s[k])) s[k] = base[k];
  }
  if (typeof s.routineDone !== 'object' || !s.routineDone) s.routineDone = {};
  s.hotels = s.hotels.map(normalizeHotel);
  return s;
}

function newHotel(fields = {}) {
  return normalizeHotel({ id: uid(), createdAt: new Date().toISOString(), ...fields });
}
function normalizeHotel(h) {
  return {
    nameJa: '', nameEn: '', architect: '', architectEn: '', contractor: '',
    location: '', region: '', country: '日本', openedYear: '', tags: '',
    issueId: '', stage: 0,
    highlights: '', techniques: '', sources: '', unverified: '', notes: '',
    titleJa: '', titleEn: '', urlJa: '', urlEn: '', publishAt: '',
    bodyJa: '', bodyEn: '', eyecatch: null,
    ...h,
    figures: Array.isArray(h.figures) ? h.figures : [],
    checks: { ...(h.checks || {}) },
    drawing: { status: 'none', illustrator: '', contact: '', rights: '', scopeNote: '', fee: '', due: '', credit: '', sourceMaterial: '', sourcePermission: false, files: '', agreed: {}, ...(h.drawing || {}) },
    affiliate: { partnerId: '', url: '', disclosure: false, lastChecked: '', ...(h.affiliate || {}) },
    en: { status: 'none', note: '', ...(h.en || {}) },
  };
}

let state = load();

// アーティファクトでは db 機能（クラウド）に保存する。
// app/main に号・提携先・設定など、hotels/<id> にホテルを1件ずつ置く。
// db が使えないとき（ローカルで開いたときなど）はブラウザの保存領域だけを使う。
const cloud = { db: null, status: 'local', written: new Map(), queue: Promise.resolve(), timer: null };

function setSync(status) {
  cloud.status = status;
  const el = $('#sync');
  if (!el) return;
  el.textContent = { local: 'このブラウザに保存', loading: '読み込み中…', saving: '保存中…', saved: 'クラウドに保存済み', error: '保存できませんでした' }[status];
  el.className = `sync ${status}`;
}

function cloudParts() {
  const { hotels, ...main } = state;
  const parts = new Map([['app/main', main]]);
  for (const h of hotels) parts.set(`hotels/${h.id}`, h);
  return parts;
}

// 前回書いた内容と違う文書だけを、1件ずつ順に書く
function flushCloud() {
  cloud.queue = cloud.queue.then(async () => {
    const parts = cloudParts();
    const ops = [];
    for (const [path, body] of parts) {
      const json = JSON.stringify(body);
      if (cloud.written.get(path) !== json) ops.push([path, json]);
    }
    for (const path of cloud.written.keys()) if (!parts.has(path)) ops.push([path, null]);
    if (!ops.length) return;
    setSync('saving');
    for (const [path, json] of ops) {
      try {
        if (json) await cloud.db.doc(path).set(JSON.parse(json));
        else await cloud.db.doc(path).delete();
        if (json) cloud.written.set(path, json); else cloud.written.delete(path);
      } catch (e) {
        console.warn('cloud save failed', path, e);
        setSync('error');
        toast(e?.code === 'quota_exceeded' ? '保存容量の上限です。不要なデータを削除してください' : 'クラウドに保存できませんでした');
        return;
      }
    }
    setSync('saved');
  });
}

async function connectCloud() {
  if (!window.claude?.use) return;
  setSync('loading');
  const db = await window.claude.use('db').catch(() => null);
  if (!db) { setSync('local'); return; }
  try {
    const [main, hs] = await Promise.all([db.doc('app/main').get(), db.collection('hotels').limit(1000).get()]);
    cloud.db = db;
    if (main.exists) {
      cloud.written.set('app/main', JSON.stringify(main.data()));
      for (const d of hs.docs) cloud.written.set(`hotels/${d.id}`, JSON.stringify(d.data()));
      // 届いたデータは凍結されているので複製してから使う
      state = migrate(structuredClone({ ...main.data(), hotels: hs.docs.map(d => d.data()) }));
      saveLocal();
    }
    setSync('saved');
    await loadSiteMeta();
    rerender();
    flushCloud(); // 初回はこのブラウザのデータを送る。2回目以降は補った項目だけ
  } catch (e) {
    console.warn('cloud load failed', e);
    cloud.db = null;
    setSync('local');
  }
}

// ---------- サイトから取り込んだ記事（毎日の取り込みが書く。アプリからは読むだけ） ----------
// app/site に取得の記録、siteposts/<id> に一覧用、sitebodies/<id> に本文を置く。

const site = { meta: null, posts: [], loaded: false, loading: null, bodies: new Map() };

async function loadSiteMeta() {
  if (!cloud.db) return;
  try {
    const m = await cloud.db.doc('app/site').get();
    site.meta = m.exists ? m.data() : null;
  } catch (e) { console.warn('site meta failed', e); }
}

function loadSitePosts() {
  if (!cloud.db || site.loaded) return Promise.resolve();
  site.loading ||= cloud.db.collection('siteposts').limit(1000).get().then(snap => {
    site.posts = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    site.loaded = true;
    const { name } = currentRoute();
    if (['archive', 'site', 'article', 'hotel', 'dashboard'].includes(name)) rerender();
  }).catch(e => { console.warn('site posts failed', e); site.loading = null; });
  return site.loading;
}

async function loadSiteBody(id) {
  if (site.bodies.has(id) || !cloud.db) return;
  site.bodies.set(id, null);
  try {
    const d = await cloud.db.doc(`sitebodies/${id}`).get();
    site.bodies.set(id, d.exists ? d.data() : { missing: true });
  } catch { site.bodies.set(id, { missing: true }); }
  if (currentRoute().name === 'site' && currentRoute().arg === id) rerender();
}

// ---------- アクセス解析（毎朝の取り込みが analytics/summary に書く。アプリは読むだけ） ----------

const ga = { summary: null, loaded: false, loading: null };

function loadAnalytics() {
  if (!cloud.db) return Promise.resolve();
  ga.loading ||= cloud.db.doc('analytics/summary').get().then(d => {
    ga.summary = d.exists ? d.data() : null;
    ga.loaded = true;
    if (['analytics', 'dashboard'].includes(currentRoute().name)) rerender();
  }).catch(e => { console.warn('analytics failed', e); ga.loading = null; });
  return ga.loading;
}

function normUrl(u) { return String(u || '').trim().replace(/^https?:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase(); }
function sitePostsFor(h) {
  const urls = [normUrl(h.urlJa), normUrl(h.urlEn)].filter(Boolean);
  return urls.length ? site.posts.filter(p => urls.includes(normUrl(p.link))) : [];
}
function hotelForPost(p) {
  const l = normUrl(p.link);
  return l ? state.hotels.find(h => normUrl(h.urlJa) === l || normUrl(h.urlEn) === l) : null;
}
function sitePostById(id) { return site.posts.find(p => p.id === id); }

// サイトの本文HTMLを、許可した要素と属性だけ残して表示する
const ALLOWED_TAGS = new Set(['P', 'BR', 'H2', 'H3', 'H4', 'H5', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'A', 'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'CITE', 'SMALL', 'SUP', 'SUB', 'DL', 'DT', 'DD']);
const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'NOSCRIPT', 'SVG', 'VIDEO', 'AUDIO', 'TEMPLATE', 'LINK', 'META']);
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const walk = node => {
    for (const el of [...node.children]) {
      if (DROP_TAGS.has(el.tagName)) { el.remove(); continue; }
      walk(el);
      if (!ALLOWED_TAGS.has(el.tagName)) { el.replaceWith(...el.childNodes); continue; }
      const href = el.getAttribute('href');
      const src = el.getAttribute('src');
      const alt = el.getAttribute('alt');
      for (const a of [...el.attributes]) el.removeAttribute(a.name);
      if (el.tagName === 'A' && /^https?:\/\//i.test(href || '')) {
        el.setAttribute('href', href);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      }
      if (el.tagName === 'IMG') {
        if (!/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(src || '')) { el.remove(); continue; }
        el.setAttribute('src', src);
        el.setAttribute('alt', alt || '');
        el.setAttribute('loading', 'lazy');
      }
    }
  };
  walk(doc.body.firstElementChild);
  return doc.body.firstElementChild.innerHTML;
}

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    if (!cloud.db) toast('保存できませんでした（ブラウザの保存領域を確認してください）');
  }
}

function save() {
  saveLocal();
  if (cloud.db) {
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(flushCloud, 600);
  }
  renderNav();
}

// ---------- ドメインの計算 ----------

function issueLabel(issue) {
  if (!issue) return '未割り当て';
  const s = SEASONS[issue.season];
  return `${issue.year} ${s ? s.ja : ''}号`;
}
function issueLabelEn(issue) {
  const s = SEASONS[issue.season];
  return `${s ? s.en : ''} ${issue.year}`;
}
function sortedIssues() {
  return [...state.issues].sort((a, b) => (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999'));
}
function issueNumber(issue) { return sortedIssues().findIndex(i => i.id === issue.id) + 1; }
function issueById(id) { return state.issues.find(i => i.id === id); }
function hotelsOf(issueId) { return state.hotels.filter(h => h.issueId === issueId); }
function prepStart(issue) {
  const d = parseDate(issue.releaseDate);
  return d ? addMonths(d, -Number(state.settings.prepMonths || 2)) : null;
}
function nextIssue() {
  const t = ymd(today());
  return sortedIssues().find(i => i.status !== 'published' && (!i.releaseDate || i.releaseDate >= t))
    || sortedIssues().find(i => i.status !== 'published');
}
function defaultReleaseDate(year, season) {
  const m = SEASONS[season]?.month || 3;
  return `${year}-${pad(m)}-01`;
}
function suggestNextIssue() {
  const order = ['spring', 'summer', 'autumn', 'winter'];
  const last = sortedIssues().at(-1);
  if (last) {
    const idx = order.indexOf(last.season);
    const season = order[(idx + 1) % 4];
    const year = Number(last.year) + (idx === 3 ? 1 : 0);
    return { year, season };
  }
  const t = today();
  // 準備期間が取れる最初の季節
  for (let y = t.getFullYear(); y <= t.getFullYear() + 1; y++) {
    for (const s of order) {
      const d = parseDate(defaultReleaseDate(y, s));
      if (addMonths(d, -Number(state.settings.prepMonths || 2)) >= t) return { year: y, season: s };
    }
  }
  return { year: t.getFullYear() + 1, season: 'spring' };
}

function hotelWarnings(h) {
  const w = [];
  if (h.stage < STAGE_PUBLISHED) {
    if (!lines(h.sources).length && h.stage >= 1) w.push('出典なし');
    if (lines(h.unverified).length) w.push(`要確認 ${lines(h.unverified).length}件`);
    if (h.stage >= 2 && h.drawing.status === 'none') w.push('線図未手配');
    if (h.stage >= 5 && !h.affiliate.url) w.push('予約リンクなし');
    if (h.stage >= 5 && !h.affiliate.disclosure) w.push('広告表記未確認');
  }
  return w;
}
function checksDone(h) { return PREPUBLISH_CHECKS.filter(([k]) => h.checks[k]).length; }

function routineKey(kind, issueId) {
  if (kind === 'weekly') return `weekly:${isoWeek(today())}`;
  if (kind === 'monthly') return `monthly:${ym(today())}`;
  return `issue:${issueId || ''}`;
}
function routineProgress(kind, issueId) {
  const key = routineKey(kind, issueId);
  const items = ROUTINES[kind].items;
  const done = items.filter((_, i) => state.routineDone[`${key}:${i}`]).length;
  return { done, total: items.length, key };
}

function revenueOf(month) {
  return state.results.filter(r => r.month === month).reduce((s, r) => s + (Number(r.revenue) || 0), 0);
}

// 自分のサイトでの計測値に近い順で並べるための月一覧（新しい順）
function resultMonths() {
  return [...new Set(state.results.map(r => r.month))].sort().reverse();
}

// ---------- 記事作成用Claudeへの依頼文（5章・7章） ----------

function promptJa(h) {
  const st = state.settings;
  const src = lines(h.sources);
  return `あなたはWebマガジン「SUMIBIKI」の記事作成担当です。SUMIBIKIは、建築家が設計したホテルを「建築」の視点で読み解くWebマガジン兼データベースです。読者は建築に関心のある旅行者です。
次のホテルについて、日本語で記事の下書きを書いてください。

## 対象
- ホテル名：${h.nameJa || '（未入力）'}${h.nameEn ? `（${h.nameEn}）` : ''}
- 建築家：${h.architect || '（未入力）'}
${h.location ? `- 所在地（参考）：${h.location}\n` : ''}${h.openedYear ? `- 開業年（参考）：${h.openedYear}\n` : ''}${h.contractor ? `- 施工者（参考）：${h.contractor}\n` : ''}
## 参照してよい一次資料
${src.length ? src.map(s => `- ${s}`).join('\n') : '- （公式サイト・建築家の公式情報・建築専門誌など一次情報に限る）'}

## 記事テンプレート（この項目と順序で書く）
1. 基本情報：ホテル名、所在地、開業年、設計者、施工者
2. 見どころ：ホテル全体の特徴を3〜5点（部屋単位の紹介はしない）
3. 建築技法：構造・素材・空間構成など、設計上の工夫の解説
4. 出典：参照した資料の一覧
${h.highlights ? `\n## 見どころのメモ（自分用の下調べ）\n${h.highlights}\n` : ''}${h.techniques ? `\n## 建築技法のメモ（自分用の下調べ）\n${h.techniques}\n` : ''}
## ルール
- 部屋ではなく、ホテル全体の見どころと建築技法を軸にする
- 所在地・開業年・設計者・施工者・建築技法の記述には、必ず出典を付ける
- 出典が確認できない記述は本文に入れず、末尾に「要確認」として別にまとめる
- 文体：${st.writingStyle}
- 文字数の目安：${st.articleLength}
- 記事タイトル案を3つ付ける。「ホテル名＋建築家名」「ホテル名＋建築」など、検索されやすい語を入れる
`;
}

function promptEn(h) {
  const terms = state.glossary.filter(g => g.ja && g.en);
  return `You are the English editor of SUMIBIKI, a web magazine and database that reads hotels designed by architects from an architectural point of view. Readers are travelers interested in architecture.
Translate the finalized Japanese article below into natural, polished magazine English.

## Hotel
- ${h.nameEn || h.nameJa || '(name)'} / Architect: ${h.architectEn || h.architect || '(architect)'}

## Rules
- Keep exactly the same sections and order as the Japanese version (Basic information / Highlights / Architectural techniques / Sources).
- Use the official English spelling for hotel names, architect names and place names. Follow the glossary below.
- Do not add facts that are not in the Japanese version. Keep all source citations.
- Propose 3 English titles that include the hotel name and the architect's name or "architecture".

## Glossary (Japanese → English)
${terms.length ? terms.map(g => `- ${g.ja} → ${g.en}${g.note ? ` (${g.note})` : ''}`).join('\n') : '- (none yet)'}

## Japanese article
（ここに確定した日本語版を貼り付ける）
`;
}

// ---------- ナビゲーション ----------

// [キー, 画面名, タブバー用の短い名前, アイコン]
const ROUTES = [
  ['dashboard', 'ダッシュボード', 'ホーム', 'home'],
  ['issues', '号', '号', 'issue'],
  ['hotels', 'ホテル記事', 'ホテル', 'hotel'],
  ['archive', 'アーカイブ', 'アーカイブ', 'archive'],
  ['analytics', 'アクセス', 'アクセス', 'chart'],
  ['drawings', '線図', '線図', 'compass'],
  ['affiliate', 'アフィリエイト', '収益', 'yen'],
  ['sns', '集客・SNS', '集客', 'megaphone'],
  ['glossary', '用語集', '用語', 'glossary'],
  ['routine', '定期作業', '定期', 'routine'],
  ['decisions', '未決定事項', '未決定', 'decision'],
  ['settings', '設定・データ', '設定', 'settings'],
];

// 画面の切り替えはページ内で持つ（アーティファクトでは #/path がアドレスに届かないため）
let routePath = location.hash.replace(/^#\/?/, '') || 'dashboard';

function currentRoute() {
  const parts = routePath.split('/');
  return { name: parts[0] || 'dashboard', arg: decodeURIComponent(parts[1] || '') };
}

function go(path) {
  routePath = path.replace(/^#\/?/, '') || 'dashboard';
  render();
  window.scrollTo(0, 0);
}

function renderNav() {
  const { name } = currentRoute();
  const active = { hotel: 'hotels', issue: 'issues', article: 'archive', site: 'archive' }[name] || name;
  const openDecisions = state.decisions.filter(d => !d.done).length;
  $('#nav').innerHTML = ROUTES.map(([k, label, short, ico]) => {
    const count = k === 'decisions' && openDecisions ? `<span class="count">${openDecisions}</span>` : '';
    return `<a href="#/${k}" class="${k === active ? 'active' : ''}" aria-label="${label}">${icon(ico)}<span class="full">${label}</span><span class="short">${short}</span>${count}</a>`;
  }).join('');
}

function render() {
  const { name, arg } = currentRoute();
  const views = {
    dashboard: viewDashboard, issues: viewIssues, issue: () => viewIssue(arg), hotels: viewHotels,
    hotel: () => viewHotel(arg), drawings: viewDrawings, affiliate: viewAffiliate, sns: viewSns,
    glossary: viewGlossary, routine: viewRoutine, decisions: viewDecisions, settings: viewSettings,
    archive: viewArchive, article: () => viewArticle(arg), site: () => viewSite(arg), analytics: viewAnalytics,
  };
  $('#view').innerHTML = (views[name] || viewDashboard)();
  renderNav();
}

function rerender() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

// ---------- 画面：ダッシュボード ----------

function gaCard() {
  const t = ga.summary?.ranges?.[30]?.totals;
  return `<a class="card link" href="#/analytics">
    <div class="kpi-label">${icon('chart')}直近30日のユーザー</div>
    ${t ? `<div class="kpi">${t.users.toLocaleString('ja-JP')}<small>人</small></div><div class="meta">${t.sessions.toLocaleString('ja-JP')}セッション・${t.views.toLocaleString('ja-JP')}表示</div>`
      : `<div class="kpi">—</div><div class="meta">${cloud.db ? (ga.loaded ? 'GA4は未接続です' : '読み込み中…') : 'クラウド保存時に表示'}</div>`}
  </a>`;
}

function viewDashboard() {
  loadSitePosts();
  loadAnalytics();
  const st = state.settings;
  const ni = nextIssue();
  const t = today();
  let issueCard;
  if (ni) {
    const hs = hotelsOf(ni.id);
    const rel = parseDate(ni.releaseDate);
    const ps = prepStart(ni);
    const left = rel ? daysBetween(t, rel) : null;
    const progress = hs.length ? hs.reduce((s, h) => s + h.stage, 0) / (hs.length * STAGE_PUBLISHED) : 0;
    issueCard = `<a class="card link" href="#/issue/${ni.id}">
      <div class="kpi-label">${icon('issue')}次の号</div>
      <div class="kpi">${esc(issueLabel(ni))}<small>第${issueNumber(ni)}号</small></div>
      <div>${esc(ni.theme || 'テーマ未定')}</div>
      <div class="meta sub" style="margin:4px 0 0">公開日 ${fmtDate(ni.releaseDate)}${left != null ? `（あと${left}日）` : ''}・着手目安 ${ps ? fmtDate(ymd(ps)) : '未定'}</div>
      <div class="meta sub" style="margin:0">記事 ${hs.length} / ${st.articlesPerIssue}本・公開済 ${hs.filter(h => h.stage === STAGE_PUBLISHED).length}本</div>
      <div class="bar"><i style="width:${Math.round(progress * 100)}%"></i></div>
    </a>`;
  } else {
    issueCard = `<div class="card"><div class="kpi-label">次の号</div><p>まだ号がありません。</p><button class="btn primary" data-act="issue-new">${icon('plus')}創刊号を作る</button></div>`;
  }

  const month = ym(t);
  const rev = revenueOf(month);
  const goal = Number(st.revenueGoal) || 0;
  const revCard = `<a class="card link" href="#/affiliate">
    <div class="kpi-label">${icon('yen')}今月の成果報酬（${month}）</div>
    <div class="kpi">${yen(rev)}<small>/ 目標 ${yen(goal)}${st.goalIsMonthly ? '（月額）' : ''}</small></div>
    <div class="bar"><i style="width:${goal ? Math.min(100, Math.round(rev / goal * 100)) : 0}%"></i></div>
  </a>`;

  const w = routineProgress('weekly');
  const m = routineProgress('monthly');
  const routineCard = `<a class="card link" href="#/routine">
    <div class="kpi-label">${icon('routine')}定期作業</div>
    <div>今週 ${w.done}/${w.total}・今月 ${m.done}/${m.total}</div>
    <div class="bar"><i style="width:${Math.round((w.done + m.done) / (w.total + m.total) * 100)}%"></i></div>
  </a>`;

  const alerts = [];
  if (ni) {
    const ps = prepStart(ni);
    const hs = hotelsOf(ni.id);
    if (ps && ps <= t && hs.length < st.articlesPerIssue) alerts.push(`<a href="#/issue/${ni.id}">${esc(issueLabel(ni))}</a>の着手時期を過ぎています。記事が${hs.length}本です（目安${st.articlesPerIssue}本）。`);
    const noDrawing = hs.filter(h => h.drawing.status === 'none').length;
    if (ps && ps <= t && noDrawing) alerts.push(`${esc(issueLabel(ni))}で線図が未手配のホテルが${noDrawing}件あります。<a href="#/drawings">線図へ</a>`);
    if (!ni.coverNote) alerts.push(`${esc(issueLabel(ni))}の表紙（線図）が未設定です。`);
  }
  if (cloud.db && site.meta) {
    const age = (Date.now() - new Date(site.meta.syncedAt)) / 864e5;
    if (age > 2) alerts.push(`サイトからの記事の取り込みが${Math.floor(age)}日止まっています。スケジュールされたタスクの実行結果を確認してください。`);
  }
  if (ga.summary) {
    const age = (Date.now() - new Date(ga.summary.syncedAt)) / 864e5;
    if (age > 2) alerts.push(`アクセス解析の取り込みが${Math.floor(age)}日止まっています。<a href="#/analytics">アクセスへ</a>`);
  }
  if (site.loaded) {
    const lag = state.hotels.filter(h => h.stage < STAGE_PUBLISHED && sitePostsFor(h).length);
    if (lag.length) alerts.push(`サイトで公開中なのに、段階が「公開済」になっていないホテルが${lag.length}件あります。<a href="#/archive">アーカイブへ</a>`);
  }
  const warned = state.hotels.filter(h => hotelWarnings(h).length);
  if (warned.length) alerts.push(`確認が必要なホテル記事が${warned.length}件あります。<a href="#/hotels">ホテル記事へ</a>`);
  if (m.done < m.total && t.getDate() >= 20) alerts.push(`今月の定期作業が残っています（${m.done}/${m.total}）。<a href="#/routine">定期作業へ</a>`);
  const lastExport = st.lastExportAt ? new Date(st.lastExportAt) : null;
  if (!cloud.db && (!lastExport || daysBetween(lastExport, new Date()) > 30)) alerts.push(`このアプリのデータを30日以上書き出していません。<a href="#/settings">設定・データへ</a>`);

  const openDecisions = state.decisions.filter(d => !d.done);

  return `<h1>ダッシュボード</h1>
  <p class="sub">${fmtDate(ymd(t))}・第${isoWeek(t).split('-W')[1]}週</p>
  <div class="grid two">${issueCard}${revCard}</div>
  <div class="grid three" style="margin-top:12px">${routineCard}
    ${gaCard()}
    <a class="card link" href="#/decisions"><div class="kpi-label">${icon('decision')}未決定事項</div><div class="kpi">${openDecisions.length}<small>件</small></div></a>
  </div>
  <h2>${icon('alert')}確認すること</h2>
  ${alerts.length ? alerts.map(a => `<div class="alert">${a}</div>`).join('') : '<div class="empty">いまは特にありません。</div>'}
  <h2>${icon('hotel')}進行中のホテル記事</h2>
  ${hotelList(state.hotels.filter(h => h.stage < STAGE_PUBLISHED).slice(0, 8))}`;
}

// ---------- 画面：号 ----------

function viewIssues() {
  const issues = sortedIssues();
  return `<h1>号</h1>
  <p class="sub">季節ごとに1号（年4回）。公開の約${state.settings.prepMonths}か月前から着手します。</p>
  <div class="toolbar"><button class="btn primary" data-act="issue-new">${icon('plus')}号を追加</button></div>
  ${issues.length ? `<div class="grid two">${issues.map(issueCard).join('')}</div>` : '<div class="empty">まだ号がありません。</div>'}`;
}

function issueCard(i) {
  const hs = hotelsOf(i.id);
  const ps = prepStart(i);
  const tagClass = i.status === 'published' ? 'ok' : '';
  return `<a class="card link" href="#/issue/${i.id}">
    <div class="kpi-label">第${issueNumber(i)}号・${esc(issueLabelEn(i))}</div>
    <h3 style="margin:2px 0">${esc(issueLabel(i))}</h3>
    <div>${esc(i.theme || 'テーマ未定')}</div>
    <div style="margin-top:6px"><span class="tag ${tagClass}">${ISSUE_STATUS[i.status] || ''}</span><span class="tag">公開 ${fmtDate(i.releaseDate)}</span><span class="tag">着手 ${ps ? fmtDate(ymd(ps)) : '未定'}</span><span class="tag">記事 ${hs.length}本</span></div>
  </a>`;
}

function viewIssue(id) {
  const i = issueById(id);
  if (!i) return `<p>号が見つかりません。</p><a href="#/issues">号の一覧へ</a>`;
  const hs = hotelsOf(i.id);
  const ps = prepStart(i);
  const rp = routineProgress('issue', i.id);
  const unassigned = state.hotels.filter(h => !h.issueId);
  return `<p class="sub" style="margin:0"><a href="#/issues">← 号</a></p>
  <h1>${esc(issueLabel(i))} <small style="font-size:.9rem;color:var(--muted)">第${issueNumber(i)}号・${esc(issueLabelEn(i))}</small></h1>
  <p class="sub">${ISSUE_STATUS[i.status]}・公開日 ${fmtDate(i.releaseDate)}・着手目安 ${ps ? fmtDate(ymd(ps)) : '未定'}</p>
  <div class="toolbar">
    <button class="btn" data-act="issue-edit" data-id="${i.id}">編集</button>
    <button class="btn primary" data-act="hotel-new" data-issue="${i.id}">${icon('plus')}この号にホテルを追加</button>
    <span class="spacer"></span>
    <button class="btn danger" data-act="issue-delete" data-id="${i.id}">削除</button>
  </div>
  <div class="grid two">
    <div class="card"><div class="kpi-label">テーマ</div><div>${esc(i.theme || '未定')}</div>
      <div class="kpi-label" style="margin-top:8px">表紙（線図）</div><div>${esc(i.coverNote || '未設定')}</div>
      ${i.notes ? `<div class="kpi-label" style="margin-top:8px">メモ</div><div style="white-space:pre-wrap">${esc(i.notes)}</div>` : ''}
    </div>
    <div class="card"><div class="kpi-label">号ごとの作業</div>
      <ul class="checklist">${ROUTINES.issue.items.map((t, n) => routineItem(rp.key, n, t)).join('')}</ul>
    </div>
  </div>
  <h2>記事（${hs.length} / ${state.settings.articlesPerIssue}本）</h2>
  ${hotelList(hs)}
  ${unassigned.length ? `<h3>号が未割り当てのホテルから追加</h3>
    <div class="toolbar"><select id="assign-select">${unassigned.map(h => `<option value="${h.id}">${esc(h.nameJa || '(無題)')}</option>`).join('')}</select>
    <button class="btn" data-act="issue-assign" data-id="${i.id}">この号に入れる</button></div>` : ''}`;
}

function issueForm(issue) {
  const sug = issue || suggestNextIssue();
  return [
    { k: 'year', label: '年', type: 'number', value: sug.year },
    { k: 'season', label: '季節', type: 'select', options: Object.entries(SEASONS).map(([k, v]) => [k, v.ja]), value: sug.season },
    { k: 'releaseDate', label: '公開日', type: 'date', value: issue ? issue.releaseDate : defaultReleaseDate(sug.year, sug.season), hint: `着手は${state.settings.prepMonths}か月前が目安` },
    { k: 'status', label: '状態', type: 'select', options: Object.entries(ISSUE_STATUS), value: issue?.status || 'planning' },
    { k: 'theme', label: 'テーマ', type: 'text', value: issue?.theme || '', wide: true },
    { k: 'coverNote', label: '表紙（線図）', type: 'text', value: issue?.coverNote || '', wide: true, hint: '表紙に使うホテル・線図のファイル名など' },
    { k: 'notes', label: 'メモ', type: 'textarea', value: issue?.notes || '', wide: true },
  ];
}

// ---------- 画面：ホテル記事 ----------

let hotelFilter = { q: '', issue: '', stage: '' };

function viewHotels() {
  const f = hotelFilter;
  const list = filteredHotels();
  return `<h1>ホテル記事</h1>
  <p class="sub">単位はホテル。見どころと建築技法を軸にまとめます。</p>
  <div class="toolbar">
    <input type="search" id="hotel-q" placeholder="ホテル名・建築家・地域で検索" value="${esc(f.q)}">
    <select id="hotel-issue"><option value="">すべての号</option><option value="_none" ${f.issue === '_none' ? 'selected' : ''}>未割り当て</option>
      ${sortedIssues().map(i => `<option value="${i.id}" ${f.issue === i.id ? 'selected' : ''}>${esc(issueLabel(i))}</option>`).join('')}</select>
    <select id="hotel-stage"><option value="">すべての段階</option>${STAGES.map((s, n) => `<option value="${n}" ${f.stage === String(n) ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <button class="btn primary" data-act="hotel-new">${icon('plus')}ホテルを追加</button>
  </div>
  <div id="hotel-results">${hotelList(list)}</div>
  ${state.hotels.length ? `<h2>建築から探す・地域から探す</h2>
  <p class="sub">サイトのカテゴリー設計の参考に、登録済みの切り口を集計しています。</p>
  <div class="grid two">
    <div class="card"><div class="kpi-label">建築家</div>${countTags(state.hotels.map(h => h.architect))}</div>
    <div class="card"><div class="kpi-label">地域</div>${countTags(state.hotels.map(h => h.region))}</div>
    <div class="card" style="grid-column:1/-1"><div class="kpi-label">建築タグ（技法・素材など）</div>${countTags(state.hotels.flatMap(h => h.tags.split(/[,、]/)))}</div>
  </div>` : ''}`;
}

function filteredHotels() {
  const f = hotelFilter;
  const q = f.q.trim().toLowerCase();
  return state.hotels.filter(h => {
    if (f.issue === '_none' ? h.issueId : f.issue && h.issueId !== f.issue) return false;
    if (f.stage !== '' && String(h.stage) !== f.stage) return false;
    return !q || [h.nameJa, h.nameEn, h.architect, h.architectEn, h.location, h.region, h.tags].join(' ').toLowerCase().includes(q);
  });
}

function countTags(values) {
  const c = {};
  values.map(v => (v || '').trim()).filter(Boolean).forEach(v => { c[v] = (c[v] || 0) + 1; });
  const entries = Object.entries(c).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([k, n]) => `<span class="tag">${esc(k)} ${n}</span>`).join('') : '<div class="meta">未入力</div>';
}

function hotelList(list) {
  if (!list.length) return '<div class="empty">該当するホテルはありません。</div>';
  return `<div class="grid">${list.map(h => {
    const w = hotelWarnings(h);
    const issue = issueById(h.issueId);
    return `<a class="card link list-item" href="#/hotel/${h.id}">
      <div class="thumb">${h.eyecatch ? `<img src="${esc(imgSrc(h.eyecatch))}" alt="" loading="lazy">` : icon('hotel')}</div>
      <div class="grow">
        <div class="title">${esc(h.nameJa || '(無題)')}${h.nameEn ? ` <span class="meta">${esc(h.nameEn)}</span>` : ''}</div>
        <div class="meta">${esc(h.architect || '建築家未入力')}・${esc(h.region || h.location || '地域未入力')}・${esc(issueLabel(issue))}</div>
        <div><span class="tag ${h.stage === STAGE_PUBLISHED ? 'ok' : ''}">${STAGES[h.stage]}</span>${w.map(x => `<span class="tag warn">${esc(x)}</span>`).join('')}</div>
        <div class="bar"><i style="width:${Math.round(h.stage / STAGE_PUBLISHED * 100)}%"></i></div>
      </div>
    </a>`;
  }).join('')}</div>`;
}

function hotelById(id) { return state.hotels.find(h => h.id === id); }

// data-h 属性を持つ入力欄は、変更するとホテルのそのフィールドに保存される
function hf(h, path, label, type = 'text', opts = {}) {
  const v = getPath(h, path);
  const cls = opts.wide ? 'field wide' : 'field';
  const hint = opts.hint ? `<div class="hint">${opts.hint}</div>` : '';
  const id = `h-${path.replace(/\./g, '-')}`;
  let input;
  if (type === 'textarea') {
    input = `<textarea id="${id}" data-h="${path}" placeholder="${esc(opts.placeholder || '')}" rows="${opts.rows || 4}">${esc(v)}</textarea>`;
  } else if (type === 'select') {
    input = `<select id="${id}" data-h="${path}">${opts.options.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (type === 'checkbox') {
    return `<div class="${cls}"><label style="display:flex;gap:8px;align-items:center;color:var(--text);font-size:.9rem"><input type="checkbox" data-h="${path}" ${v ? 'checked' : ''}>${label}</label>${hint}</div>`;
  } else {
    input = `<input id="${id}" type="${type}" data-h="${path}" value="${esc(v)}" placeholder="${esc(opts.placeholder || '')}"${opts.list ? ` list="${opts.list}"` : ''}>`;
  }
  return `<div class="${cls}"><label for="${id}">${label}</label>${input}${hint}</div>`;
}

function viewHotel(id) {
  loadSitePosts();
  const h = hotelById(id);
  if (!h) return `<p>ホテルが見つかりません。</p><a href="#/hotels">ホテル記事の一覧へ</a>`;
  const w = hotelWarnings(h);
  const issueOpts = [['', '未割り当て'], ...sortedIssues().map(i => [i.id, issueLabel(i)])];
  const partnerOpts = [['', '未選択'], ...state.partners.map(p => [p.id, `${p.name}（${PARTNER_STATUS[p.status] || ''}）`])];
  const mapUrl = h.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.nameJa + ' ' + h.location)}` : '';
  const srcLines = lines(h.sources);

  return `<div class="toolbar crumbs"><a class="back" href="#/hotels">${icon('back')}ホテル記事</a><span class="spacer"></span><a class="btn small" href="#/article/${h.id}">${icon('archive')}記事を表示</a></div>
  <h1>${esc(h.nameJa || '(無題)')}</h1>
  <p class="sub">${esc(h.architect || '建築家未入力')}・${esc(issueLabel(issueById(h.issueId)))}${w.length ? ' ・ ' + w.map(x => `<span class="tag warn">${esc(x)}</span>`).join('') : ''}</p>

  <h2>${icon('steps')}制作の段階</h2>
  <div class="stages">${STAGES.map((s, n) => `<button data-act="stage" data-id="${h.id}" data-stage="${n}" class="${n < h.stage ? 'past' : n === h.stage ? 'current' : ''}">${n + 1}. ${s}</button>`).join('')}</div>

  <div class="section"><h2>${icon('hotel')}基本情報</h2>
  <p class="sub">事実（所在地・開業年・設計者・施工者）は公式サイトか一次資料で確認し、出典を残します。</p>
  <div class="fields">
    ${hf(h, 'nameJa', 'ホテル名（日本語）')}
    ${hf(h, 'nameEn', 'ホテル名（公式の英語表記）')}
    ${hf(h, 'architect', '設計者（建築家）')}
    ${hf(h, 'architectEn', '設計者（英語表記）')}
    ${hf(h, 'contractor', '施工者')}
    ${hf(h, 'openedYear', '開業年', 'text', { placeholder: '例：2019' })}
    ${hf(h, 'location', '所在地', 'text', { wide: true, hint: mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noopener">地図で確認</a>` : '' })}
    ${hf(h, 'region', '地域（地域から探す）', 'text', { placeholder: '例：京都府、北海道、バリ島' })}
    ${hf(h, 'country', '国')}
    ${hf(h, 'tags', '建築タグ（建築から探す）', 'text', { wide: true, placeholder: '例：木造、RC打ち放し、中庭、リノベーション（読点かカンマ区切り）' })}
    ${hf(h, 'issueId', '号', 'select', { options: issueOpts })}
    ${hf(h, 'publishAt', '予約投稿日時', 'datetime-local')}
  </div></div>

  <div class="section"><h2>${icon('note')}取材メモ</h2>
  <div class="fields">
    ${hf(h, 'highlights', '見どころ（3〜5点）', 'textarea', { wide: true, placeholder: '1行に1点' })}
    ${hf(h, 'techniques', '建築技法（構造・素材・空間構成）', 'textarea', { wide: true })}
    ${hf(h, 'sources', '出典・一次資料', 'textarea', { wide: true, placeholder: '1行に1件。例：公式サイト https://…', hint: `${srcLines.length}件` })}
    ${hf(h, 'unverified', '要確認（出典が確認できない記述）', 'textarea', { wide: true, placeholder: '解消したら行を消す' })}
  </div></div>

  <div class="section"><h2>${icon('chat')}記事作成用Claudeへの依頼文</h2>
  <p class="sub">入力済みの情報から依頼文を作ります。コピーして記事作成用のClaudeに渡してください。英語版の依頼文には用語集が入ります。</p>
  <div class="toolbar">
    <button class="btn primary" data-act="copy-prompt" data-lang="ja" data-id="${h.id}">${icon('copy')}日本語版の依頼文をコピー</button>
    <button class="btn" data-act="copy-prompt" data-lang="en" data-id="${h.id}">${icon('copy')}英語版の依頼文をコピー</button>
  </div>
  <details><summary class="meta" style="cursor:pointer">日本語版の依頼文を見る</summary><pre class="prompt">${esc(promptJa(h))}</pre></details>
  </div>

  <div class="section"><h2>${icon('doc')}記事</h2>
  <div class="fields">
    ${hf(h, 'titleJa', '記事タイトル（日本語）', 'text', { wide: true, hint: '「ホテル名＋建築家名」「ホテル名＋建築」など探されやすい語を入れる' })}
    ${hf(h, 'titleEn', '記事タイトル（英語）', 'text', { wide: true })}
    ${hf(h, 'urlJa', '記事URL（日本語）', 'url', { list: 'site-links', hint: 'サイトの記事URLを入れると、取り込んだ記事と結び付きます' })}
    ${hf(h, 'urlEn', '記事URL（英語）', 'url', { list: 'site-links' })}
    <datalist id="site-links">${site.posts.map(p => `<option value="${esc(p.link)}">${esc(p.title)}</option>`).join('')}</datalist>
    ${hf(h, 'en.status', '英語版', 'select', { options: [['none', '未着手'], ['requested', '翻訳依頼済'], ['reviewing', '固有名詞・用語を確認中'], ['ready', '公開できる'], ['published', '公開済'], ['later', '後日公開（日本語のみ先行）']] })}
    ${hf(h, 'en.note', '英語版のメモ（公開予定など）')}
    ${hf(h, 'bodyJa', '本文（確定稿・日本語）', 'textarea', { wide: true, rows: 10, hint: '「## 見出し」「- 箇条書き」「**強調**」「[文字](URL)」が使えます。アーカイブでサイトに近い形で表示します。' })}
    ${hf(h, 'bodyEn', '本文（確定稿・英語）', 'textarea', { wide: true, rows: 6 })}
  </div></div>

  <div class="section"><h2>${icon('image')}アイキャッチ・図版</h2>
  <p class="sub">アイキャッチ（外観の線図）と、平面図・断面図などの図版を取り込みます。画像（PNG・JPEG・WebP）とSVGが使えます。</p>
  ${imageEditor(h)}
  </div>

  <div class="section"><h2>${icon('compass')}線図の発注</h2>
  <div class="fields">
    ${hf(h, 'drawing.status', '状態', 'select', { options: Object.entries(DRAWING_STATUS) })}
    ${hf(h, 'drawing.illustrator', 'イラストレーター')}
    ${hf(h, 'drawing.rights', '権利の帰属', 'select', { options: Object.entries(RIGHTS), hint: '発注前に決める' })}
    ${hf(h, 'drawing.due', '納期', 'date')}
    ${hf(h, 'drawing.fee', '報酬・条件')}
    ${hf(h, 'drawing.credit', 'クレジット表記', 'text', { placeholder: '例：Drawing: 山田花子' })}
    ${hf(h, 'drawing.scopeNote', '利用範囲（SNS・広告・書籍化など）', 'text', { wide: true })}
    ${hf(h, 'drawing.sourceMaterial', '元資料（外観写真・図面）と権利者', 'text', { wide: true })}
    ${hf(h, 'drawing.sourcePermission', '元資料の権利者を確認し、必要な許可を取った', 'checkbox', { wide: true })}
    ${hf(h, 'drawing.files', '保存場所（元データ・Web用）', 'text', { wide: true })}
  </div>
  <h3>書面（メール可）で合意した事項</h3>
  <ul class="checklist">${DRAWING_AGREEMENTS.map(([k, l]) => `<li class="${h.drawing.agreed[k] ? 'done' : ''}"><input type="checkbox" id="ag-${k}" data-h="drawing.agreed.${k}" ${h.drawing.agreed[k] ? 'checked' : ''}><label for="ag-${k}">${l}</label></li>`).join('')}</ul>
  </div>

  <div class="section"><h2>${icon('link')}予約リンク</h2>
  <div class="fields">
    ${hf(h, 'affiliate.partnerId', '提携先', 'select', { options: partnerOpts })}
    ${hf(h, 'affiliate.url', 'アフィリエイトリンク', 'url')}
    ${hf(h, 'affiliate.disclosure', `記事冒頭に広告表記を入れた（「${esc(state.settings.disclosureText)}」）`, 'checkbox', { wide: true })}
    ${hf(h, 'affiliate.lastChecked', 'リンクの最終確認日', 'date')}
  </div></div>

  <div class="section"><h2>${icon('check')}公開前チェックリスト</h2>
  <ul class="checklist">${PREPUBLISH_CHECKS.map(([k, l]) => `<li class="${h.checks[k] ? 'done' : ''}"><input type="checkbox" id="ck-${k}" data-h="checks.${k}" ${h.checks[k] ? 'checked' : ''}><label for="ck-${k}">${l}</label></li>`).join('')}</ul>
  <p class="meta">${checksDone(h)} / ${PREPUBLISH_CHECKS.length} 完了</p>
  </div>

  <div class="section"><h2>${icon('edit')}メモ</h2>
  <div class="fields">${hf(h, 'notes', 'メモ', 'textarea', { wide: true })}</div>
  <div class="toolbar"><span class="spacer"></span><button class="btn danger" data-act="hotel-delete" data-id="${h.id}">${icon('trash')}このホテルを削除</button></div>
  </div>`;
}

// ---------- 画像（アイキャッチ・図版） ----------
// アーティファクトでは assets 機能に保存し、id だけをデータに持つ。
// ローカルで開いたときは縮小した画像を data URL として持つ。

function imgSrc(img) { return img?.assetId ? `/_blob/${img.assetId}` : img?.data || ''; }

async function assetsCap() {
  if (!window.claude?.use) return null;
  return window.claude.use('assets').catch(() => null);
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// 大きな画像は長辺 max px に縮小する。SVG はそのまま使う。
async function prepareImage(file, max) {
  if (file.type === 'image/svg+xml') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1.5e6) return file;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.9));
  return blob || file;
}

async function storeImage(file) {
  const assets = await assetsCap();
  if (cloud.db && !assets) throw new Error('no-assets');
  const blob = await prepareImage(file, assets ? 2400 : 1400);
  const img = { id: uid(), alt: '', caption: '', credit: '' };
  if (assets) img.assetId = (await assets.upload(blob, file.type === 'image/svg+xml' ? { contentType: 'image/svg+xml' } : undefined)).id;
  else img.data = await blobToDataURL(blob);
  return img;
}

async function dropImage(img) {
  if (!img?.assetId) return;
  const assets = await assetsCap();
  if (assets) await assets.delete(img.assetId).catch(() => {});
}

async function addImages(h, kind, files) {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if (!list.length) { toast('画像ファイルを選んでください'); return; }
  toast('画像を取り込んでいます…');
  try {
    if (kind === 'eyecatch') {
      const img = await storeImage(list[0]);
      if (h.eyecatch) {
        img.alt = h.eyecatch.alt; img.credit = h.eyecatch.credit;
        await dropImage(h.eyecatch);
      }
      h.eyecatch = img;
    } else {
      for (const f of list) h.figures.push(await storeImage(f));
    }
    save();
    rerender();
    toast('取り込みました');
  } catch (e) {
    console.warn('image failed', e);
    toast(e?.message === 'no-assets' ? '画像を保存する許可がありません' : e?.code === 'quota_exceeded' ? '画像の保存容量の上限です' : '画像を取り込めませんでした');
  }
}

// ローカル版から読み込んだ data URL の画像を、クラウドでは assets に移す
async function liftDataImages() {
  const assets = await assetsCap();
  if (!assets) return;
  let moved = 0;
  for (const h of state.hotels) {
    for (const img of [h.eyecatch, ...h.figures].filter(Boolean)) {
      if (img.assetId || !img.data) continue;
      try {
        const blob = await (await fetch(img.data)).blob();
        img.assetId = (await assets.upload(blob)).id;
        delete img.data;
        moved++;
      } catch (e) { console.warn('lift failed', e); }
    }
  }
  if (moved) { save(); rerender(); }
}

function imageEditor(h) {
  const e = h.eyecatch;
  const fig = (f, n) => `<div class="fig-row">
      <div class="fig-img"><img src="${esc(imgSrc(f))}" alt="${esc(f.caption)}" loading="lazy"></div>
      <div class="grow fields">
        ${hf(h, `figures.${n}.caption`, `Fig.${n + 1} キャプション`, 'text', { wide: true, placeholder: '例：2階平面図' })}
        ${hf(h, `figures.${n}.credit`, 'クレジット・出典', 'text', { wide: true })}
        <div class="toolbar wide" style="margin:0">
          <button class="btn small icon-only" data-act="fig-move" data-id="${h.id}" data-n="${n}" data-dir="-1" aria-label="前へ" ${n === 0 ? 'disabled' : ''}>${icon('up')}</button>
          <button class="btn small icon-only" data-act="fig-move" data-id="${h.id}" data-n="${n}" data-dir="1" aria-label="後ろへ" ${n === h.figures.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
          <span class="spacer"></span>
          <button class="btn small danger" data-act="fig-delete" data-id="${h.id}" data-n="${n}">${icon('trash')}削除</button>
        </div>
      </div>
    </div>`;
  return `<h3>アイキャッチ</h3>
  <div class="eyecatch-edit">
    <label class="drop ${e ? 'has' : ''}" for="eyecatch-file" data-drop="eyecatch">
      ${e ? `<img src="${esc(imgSrc(e))}" alt="${esc(e.alt)}">` : `${icon('upload')}<span>外観の線図を選ぶか、ここにドロップ</span>`}
    </label>
    <input type="file" id="eyecatch-file" accept="image/*" data-img="eyecatch" hidden>
    ${e ? `<div class="fields">
      ${hf(h, 'eyecatch.alt', '代替テキスト', 'text', { placeholder: '例：〇〇ホテル外観の線図' })}
      ${hf(h, 'eyecatch.credit', 'クレジット', 'text', { placeholder: h.drawing.credit || '例：Drawing: 山田花子' })}
    </div>
    <div class="toolbar"><label class="btn small" for="eyecatch-file">${icon('upload')}差し替える</label><button class="btn small danger" data-act="eyecatch-delete" data-id="${h.id}">${icon('trash')}外す</button></div>` : ''}
  </div>
  <h3>図版（${h.figures.length}）</h3>
  ${h.figures.map(fig).join('')}
  <label class="drop small" for="figure-file" data-drop="figures">${icon('plus')}<span>図版を追加（複数選べます）</span></label>
  <input type="file" id="figure-file" accept="image/*" multiple data-img="figures" hidden>`;
}

// ---------- 本文の簡易マークダウン ----------

function inlineMd(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function md(text) {
  const out = [];
  let para = [];
  let list = null;
  const flushP = () => { if (para.length) out.push(`<p>${para.map(inlineMd).join('<br>')}</p>`); para = []; };
  const flushL = () => { if (list) out.push(`<ul>${list.map(li => `<li>${inlineMd(li)}</li>`).join('')}</ul>`); list = null; };
  for (const raw of String(text || '').split('\n')) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flushP(); flushL(); continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { flushP(); flushL(); const lv = m[1].length + 1; out.push(`<h${lv}>${inlineMd(m[2])}</h${lv}>`); continue; }
    if ((m = /^\s*[-・*]\s+(.*)$/.exec(l))) { flushP(); (list ||= []).push(m[1]); continue; }
    flushL();
    para.push(l);
  }
  flushP();
  flushL();
  return out.join('');
}
function linkify(t) {
  return esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

// ---------- 画面：アーカイブ ----------

let archiveFilter = { q: '', issue: '', show: 'all' };

function archiveHotels() {
  const f = archiveFilter;
  const q = f.q.trim().toLowerCase();
  return state.hotels.filter(h => {
    const live = sitePostsFor(h).length > 0;
    if (f.show === 'site' && !live) return false;
    if (f.show === 'draft' && live) return false;
    if (f.issue && h.issueId !== f.issue) return false;
    return !q || [h.nameJa, h.nameEn, h.titleJa, h.titleEn, h.architect, h.architectEn, h.region, h.tags, ...sitePostsFor(h).map(p => p.title)].join(' ').toLowerCase().includes(q);
  });
}

// ホテル記事と結び付いていないサイトの記事。英語版は日本語版があればそちらにまとめる
function archiveSiteOnly() {
  const f = archiveFilter;
  if (f.show === 'draft' || f.issue) return [];
  const q = f.q.trim().toLowerCase();
  const shown = new Set(site.posts.map(p => p.id));
  return site.posts.filter(p => {
    if (hotelForPost(p)) return false;
    if (p.lang === 'en' && p.translations?.ja && shown.has(p.translations.ja)) return false;
    return !q || [p.title, p.excerpt, ...(p.categories || []), ...(p.tags || [])].join(' ').toLowerCase().includes(q);
  });
}

function issueNo(issue) { return issue ? `No.${pad(issueNumber(issue))}` : 'No.—'; }

function archiveCard(h) {
  const issue = issueById(h.issueId);
  const posts = sitePostsFor(h);
  const thumb = h.eyecatch ? imgSrc(h.eyecatch) : posts.find(p => p.thumb)?.thumb;
  const status = posts.length ? '<span class="tag live">サイト公開中</span>' : h.stage === STAGE_PUBLISHED ? '' : `<span class="tag">下書き・${STAGES[h.stage]}</span>`;
  return `<a class="arch-card" href="#/article/${h.id}">
    <div class="arch-thumb">${thumb ? `<img src="${esc(thumb)}" alt="${esc(h.eyecatch?.alt || '')}" loading="lazy">` : `<span class="ph">${icon('hotel')}</span>`}</div>
    <div class="arch-body">
      <div class="eyebrow">${issueNo(issue)}${h.region ? ` · ${esc(h.region)}` : ''}</div>
      <h3>${esc(h.titleJa || h.nameJa || '(無題)')}</h3>
      <div class="meta">${esc(h.architect || '')}</div>
      ${status}
    </div>
  </a>`;
}

function siteCard(p) {
  return `<a class="arch-card" href="#/site/${p.id}">
    <div class="arch-thumb">${p.thumb ? `<img src="${esc(p.thumb)}" alt="${esc(p.thumbAlt)}" loading="lazy">` : `<span class="ph">${icon('doc')}</span>`}</div>
    <div class="arch-body">
      <div class="eyebrow">${esc((p.categories || []).join(' · ') || 'SUMIBIKI')}${p.date ? ` · ${fmtDate(p.date.slice(0, 10))}` : ''}</div>
      <h3>${esc(p.title || '(無題)')}</h3>
      <div class="meta">${esc(p.excerpt || '').slice(0, 60)}</div>
      <span class="tag live">サイト${p.lang === 'en' ? '・English' : ''}</span>
    </div>
  </a>`;
}

function archiveResults() {
  const list = archiveHotels();
  const siteOnly = archiveSiteOnly();
  if (!list.length && !siteOnly.length) return `<div class="empty">${icon('archive')}<div>表示できる記事がありません。</div></div>`;
  const groups = [...sortedIssues()].reverse().map(i => [i, list.filter(h => h.issueId === i.id)]);
  const unassigned = list.filter(h => !issueById(h.issueId));
  const group = (i, hs) => `<section class="arch-group">
    <header><span class="num">${issueNo(i)}</span><h2>${i ? esc(issueLabel(i)) : '号が未定'}</h2>${i?.theme ? `<span class="theme">${esc(i.theme)}</span>` : ''}</header>
    <div class="arch-grid">${hs.map(archiveCard).join('')}</div>
  </section>`;
  return groups.filter(([, hs]) => hs.length).map(([i, hs]) => group(i, hs)).join('')
    + (siteOnly.length ? `<section class="arch-group">
      <header><span class="num">WEB</span><h2>サイトの記事</h2><span class="theme">ホテル記事と結び付いていない記事（${siteOnly.length}）</span></header>
      <div class="arch-grid">${siteOnly.map(siteCard).join('')}</div>
    </section>` : '')
    + (unassigned.length ? group(null, unassigned) : '');
}

function siteStatusLine() {
  if (!cloud.db) return 'サイトからの取り込みは、クラウドに保存しているとき（アーティファクト版）に表示されます。';
  if (!site.meta) return 'サイトからの取り込みはまだ一度も実行されていません。';
  return `サイトから毎日取り込み・最終取得 ${new Date(site.meta.syncedAt).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })}・${site.meta.count}件${site.loaded ? '' : '（読み込み中…）'}`;
}

function viewArchive() {
  loadSitePosts();
  const f = archiveFilter;
  return `<h1>アーカイブ</h1>
  <p class="sub">号ごとに、サイトに近い形で記事を見返せます。カードを開くと記事のページになります。</p>
  <p class="site-line">${icon('external')}${esc(siteStatusLine())}</p>
  <div class="toolbar">
    <input type="search" id="archive-q" placeholder="ホテル名・建築家・地域で検索" value="${esc(f.q)}">
    <select id="archive-issue"><option value="">すべての号</option>${sortedIssues().map(i => `<option value="${i.id}" ${f.issue === i.id ? 'selected' : ''}>${esc(issueLabel(i))}</option>`).join('')}</select>
    <div class="seg" role="group" aria-label="表示">${[['all', 'すべて'], ['site', 'サイト公開中'], ['draft', '下書き']].map(([k, l]) => `<button data-act="archive-show" data-show="${k}" class="${f.show === k ? 'on' : ''}">${l}</button>`).join('')}</div>
  </div>
  <div id="archive-results">${archiveResults()}</div>`;
}

// ---------- 画面：記事（サイトに近い表示） ----------

let articleLang = 'ja';

function viewArticle(id) {
  loadSitePosts();
  const h = hotelById(id);
  if (!h) return `<p>記事が見つかりません。</p><a href="#/archive">アーカイブへ</a>`;
  const en = articleLang === 'en';
  const issue = issueById(h.issueId);
  const T = en
    ? { basic: 'Basic information', hl: 'Highlights', tech: 'Architectural techniques', figs: 'Figures', access: 'Access & booking', src: 'Sources', hotel: 'Hotel', loc: 'Location', opened: 'Opened', arch: 'Architect', con: 'Contractor', map: 'View on map', book: 'Check availability', ad: 'This article contains affiliate links.', none: 'No English text yet.' }
    : { basic: '基本情報', hl: '見どころ', tech: '建築技法', figs: '図版', access: 'アクセス・予約', src: '出典', hotel: 'ホテル名', loc: '所在地', opened: '開業年', arch: '設計', con: '施工', map: '地図で見る', book: '空室を確認する', ad: state.settings.disclosureText, none: '' };
  const name = en ? (h.nameEn || h.nameJa) : h.nameJa;
  const title = en ? (h.titleEn || h.nameEn || h.nameJa) : (h.titleJa || h.nameJa);
  const architect = en ? (h.architectEn || h.architect) : h.architect;
  const body = en ? h.bodyEn : h.bodyJa;
  const mapUrl = h.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.nameJa + ' ' + h.location)}` : '';
  const credit = h.eyecatch?.credit || h.drawing.credit;
  let n = 0;
  const head = label => `<h2 class="sec"><span class="num">${pad(++n)}</span>${label}</h2>`;
  const facts = [[T.hotel, name], [T.loc, h.location], [T.opened, h.openedYear], [T.arch, architect], [T.con, h.contractor]].filter(([, v]) => v);
  // 番号は紙面の順に振るので、基本情報を先に組む
  const basic = facts.length ? `<section>${head(T.basic)}<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>` : '';

  let main;
  if (body) {
    main = `<div class="prose">${md(body)}</div>`;
  } else if (en) {
    main = `<p class="meta">${T.none}</p>`;
  } else {
    const hl = lines(h.highlights);
    main = (hl.length ? `<section>${head(T.hl)}<ol class="points">${hl.map(x => `<li>${inlineMd(x.replace(/^[-・*\d.、)\s]+/, ''))}</li>`).join('')}</ol></section>` : '')
      + (h.techniques ? `<section>${head(T.tech)}<div class="prose">${md(h.techniques)}</div></section>` : '');
    if (!main) main = '<p class="meta">本文はまだありません。ホテル記事の「記事」に確定稿を入れるか、取材メモの見どころ・建築技法を入力すると、ここに表示されます。</p>';
  }

  return `<div class="toolbar crumbs">
    <a class="back" href="#/archive">${icon('back')}アーカイブ</a>
    <span class="spacer"></span>
    <div class="seg" role="group" aria-label="言語">
      <button data-act="article-lang" data-lang="ja" class="${en ? '' : 'on'}">日本語</button><button data-act="article-lang" data-lang="en" class="${en ? 'on' : ''}">English</button>
    </div>
    ${sitePostsFor(h).map(p => `<a class="btn small" href="#/site/${p.id}">${icon('external')}サイト版${p.lang === 'en' ? '（EN）' : ''}</a>`).join('')}
    <a class="btn small" href="#/hotel/${h.id}">${icon('edit')}編集</a>
  </div>
  <article class="paper" lang="${en ? 'en' : 'ja'}">
    <div class="eyebrow">${issueNo(issue)}${issue ? ` · ${esc(en ? issueLabelEn(issue) : issueLabel(issue))}` : ''}${h.region ? ` · ${esc(h.region)}` : ''}</div>
    <h1 class="art-title">${esc(title || '(無題)')}</h1>
    <p class="art-meta">${[architect, h.openedYear].filter(Boolean).map(esc).join(' · ')}</p>
    ${h.stage !== STAGE_PUBLISHED ? `<p class="draft">${icon('edit')}下書き（${STAGES[h.stage]}）</p>` : ''}
    ${h.affiliate.url ? `<p class="ad">${esc(T.ad)}</p>` : ''}
    <figure class="eyecatch">${h.eyecatch ? `<img src="${esc(imgSrc(h.eyecatch))}" alt="${esc(h.eyecatch.alt || name)}">` : `<div class="ph">${icon('compass')}<span>${en ? 'Line drawing' : '線図（未設定）'}</span></div>`}
      ${credit ? `<figcaption>${esc(credit)}</figcaption>` : ''}</figure>
    ${basic}
    ${main}
    ${h.figures.length ? `<section>${head(T.figs)}<div class="figs">${h.figures.map((f, i) => `<figure><img src="${esc(imgSrc(f))}" alt="${esc(f.caption)}" loading="lazy"><figcaption><span class="num">Fig.${i + 1}</span>${esc(f.caption)}${f.credit ? `<small>${esc(f.credit)}</small>` : ''}</figcaption></figure>`).join('')}</div></section>` : ''}
    ${mapUrl || h.affiliate.url ? `<section>${head(T.access)}${h.location ? `<p>${icon('pin')}${esc(h.location)}</p>` : ''}<div class="toolbar">
      ${mapUrl ? `<a class="btn" href="${mapUrl}" target="_blank" rel="noopener">${icon('pin')}${T.map}</a>` : ''}
      ${h.affiliate.url ? `<a class="btn primary" href="${esc(h.affiliate.url)}" target="_blank" rel="noopener sponsored">${icon('external')}${T.book}</a>` : ''}</div></section>` : ''}
    ${lines(h.sources).length ? `<section>${head(T.src)}<ol class="sources">${lines(h.sources).map(x => `<li>${linkify(x)}</li>`).join('')}</ol></section>` : ''}
  </article>`;
}

// ---------- 画面：サイトの記事 ----------

function viewSite(id) {
  loadSitePosts();
  const p = sitePostById(id);
  if (!p) return site.loaded || !cloud.db
    ? `<p>記事が見つかりません。</p><a href="#/archive">アーカイブへ</a>`
    : `<div class="empty">${icon('archive')}<div>読み込み中…</div></div>`;
  loadSiteBody(id);
  const body = site.bodies.get(id);
  const h = hotelForPost(p);
  const other = p.translations ? Object.entries(p.translations).filter(([l, pid]) => l !== p.lang && sitePostById(pid)) : [];
  const en = p.lang === 'en';
  let content;
  if (!body) content = `<p class="meta">本文を読み込み中…</p>`;
  else if (body.missing) content = `<p class="meta">本文を読み込めませんでした。次の取り込みで入ります。</p>`;
  else content = `<div class="prose wp">${sanitizeHtml(body.content)}</div>${body.imagesDropped ? `<p class="meta">${icon('image')}本文の画像${body.imagesDropped}点は容量の都合で省略しています。サイトで確認してください。</p>` : ''}`;
  const featured = body?.featured || p.thumb;
  return `<div class="toolbar crumbs">
    <a class="back" href="#/archive">${icon('back')}アーカイブ</a>
    <span class="spacer"></span>
    ${other.map(([l, pid]) => `<a class="btn small" href="#/site/${pid}">${l === 'en' ? 'English' : '日本語'}</a>`).join('')}
    ${h ? `<a class="btn small" href="#/hotel/${h.id}">${icon('edit')}ホテル記事</a>` : ''}
    <a class="btn small" href="${esc(p.link)}" target="_blank" rel="noopener">${icon('external')}サイトで開く</a>
  </div>
  <article class="paper" lang="${en ? 'en' : 'ja'}">
    <div class="eyebrow">${h ? `${issueNo(issueById(h.issueId))} · ` : ''}${esc((p.categories || []).join(' · ') || 'SUMIBIKI')}</div>
    <h1 class="art-title">${esc(p.title || '(無題)')}</h1>
    <p class="art-meta">${p.date ? `${en ? 'Published' : '公開'} ${fmtDate(p.date.slice(0, 10))}` : ''}${p.modified && p.modified.slice(0, 10) !== (p.date || '').slice(0, 10) ? ` · ${en ? 'Updated' : '更新'} ${fmtDate(p.modified.slice(0, 10))}` : ''}</p>
    ${featured ? `<figure class="eyecatch"><img src="${esc(featured)}" alt="${esc(body?.featuredAlt || p.thumbAlt || '')}">${body?.featuredCaption ? `<figcaption>${esc(body.featuredCaption)}</figcaption>` : ''}</figure>` : ''}
    ${content}
    ${(p.tags || []).length ? `<p class="art-tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : ''}
    <p class="meta site-src">${icon('external')}<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link)}</a></p>
  </article>`;
}

// ---------- 画面：アクセス ----------

let gaRange = '30';

const CHANNEL_JA = {
  'Organic Search': '検索', 'Direct': '直接アクセス', 'Referral': '他のサイト', 'Organic Social': 'SNS',
  'Paid Search': '検索広告', 'Paid Social': 'SNS広告', 'Email': 'メール', 'Display': 'ディスプレイ広告',
  'Organic Video': '動画', 'Affiliates': 'アフィリエイト', 'Unassigned': '不明', 'Cross-network': 'クロスネットワーク',
};
const DEVICE_JA = { mobile: 'スマホ', desktop: 'パソコン', tablet: 'タブレット', 'smart tv': 'テレビ' };

function countryName(c) {
  if (!c.name) return '不明';
  try { return c.code ? new Intl.DisplayNames(['ja'], { type: 'region' }).of(c.code.toUpperCase()) || c.name : c.name; } catch { return c.name; }
}
const n0 = v => Number(v || 0).toLocaleString('ja-JP');

// 横棒のランキング。幅は最大値に対する割合
function hbars(items, nameOf, valueOf, unit = '人') {
  if (!items.length) return '<div class="meta">データがありません</div>';
  const max = Math.max(...items.map(valueOf), 1);
  const total = items.reduce((a, i) => a + valueOf(i), 0) || 1;
  return `<ul class="hbars">${items.map(i => `<li>
    <div class="row"><span class="name">${esc(nameOf(i))}</span><span class="val">${n0(valueOf(i))}${unit}<small>${Math.round(valueOf(i) / total * 100)}%</small></span></div>
    <div class="bar"><i style="width:${Math.max(2, Math.round(valueOf(i) / max * 100))}%"></i></div>
  </li>`).join('')}</ul>`;
}

// 日ごとの棒グラフ。高さは最大値に対する割合で、目盛りは切りのよい値にする
function dailyChart(days) {
  if (!days.length) return '';
  const max = Math.max(...days.map(d => d.users), 1);
  // 上限は2の倍数に切り上げ、真ん中の目盛りも整数になるようにする
  const unit = 2 * 10 ** Math.max(0, Math.floor(Math.log10(max)) - 1);
  const top = Math.ceil(max / unit) * unit;
  const fmt = d => { const [, m, dd] = d.split('-'); return `${+m}/${+dd}`; };
  const mid = days[Math.floor(days.length / 2)];
  const total = days.reduce((a, d) => a + d.users, 0);
  const best = days.reduce((a, d) => (d.users > a.users ? d : a), days[0]);
  return `<div class="chart">
    <div class="yaxis"><span>${n0(top)}</span><span>${n0(top / 2)}</span><span>0</span></div>
    <div class="plot"><div class="bars" style="--n:${days.length}">${days.map(d => `<i style="height:${Math.round(d.users / top * 100)}%" title="${fmt(d.date)}：${n0(d.users)}人・${n0(d.sessions)}セッション"></i>`).join('')}</div>
      <div class="xaxis"><span>${fmt(days[0].date)}</span><span>${fmt(mid.date)}</span><span>${fmt(days.at(-1).date)}</span></div></div>
  </div>
  <p class="meta">1日あたりのユーザー数。平均 ${n0(Math.round(total / days.length))}人／日・最多 ${n0(best.users)}人（${fmt(best.date)}）</p>`;
}

// ページに埋め込むとき、文字列の中の script の閉じタグでページ側のスクリプトが終わってしまう。バックスラッシュ付きで書く
function snippet(id) {
  return `<!-- Google tag (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"><\/script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
<\/script>`;
}

function setupGuide(open) {
  const id = (state.settings.ga4Id || '').trim();
  const valid = /^G-[A-Z0-9]{6,14}$/i.test(id);
  return `<details class="setup" ${open ? 'open' : ''}><summary>${icon('settings')}GA4の設定手順</summary>
    <ol class="steps-list">
      <li><b>GA4のプロパティを作る。</b>Googleアナリティクスで、プロパティと「ウェブ」のデータストリーム（sumibiki.com）を作り、<b>測定ID</b>（G-で始まる）を下に入れます。
        <div class="field" style="margin:10px 0 0"><label for="s-ga4Id">測定ID</label><input id="s-ga4Id" type="text" data-s="ga4Id" value="${esc(id)}" placeholder="G-XXXXXXXXXX" autocomplete="off"></div>
        ${id && !valid ? '<p class="meta warn-text">測定IDの形式が違います。「G-」で始まる10文字前後のIDです。</p>' : ''}</li>
      <li><b>タグをサイトに入れる。</b>${valid ? `次のタグをコピーし、WordPressの管理画面で、SWELLの「外観 → カスタマイズ → 高度な設定 → headタグ終了直前に出力するコード」に貼ります（メニュー名はSWELLのバージョンで少し違うことがあります）。日本語と英語は同じサイトなので、1か所で両方に入ります。
        <pre class="prompt">${esc(snippet(id.toUpperCase()))}</pre><div class="toolbar"><button class="btn small" data-act="ga-copy-snippet">${icon('copy')}タグをコピー</button></div>` : '測定IDを入れると、貼り付けるタグがここに表示されます。'}</li>
      <li><b>データを取るための鍵を作る。</b>Google Cloud で「Google Analytics Data API」を有効にし、サービスアカウントを作って、JSONキーをダウンロードします。</li>
      <li><b>GA4に閲覧権限を渡す。</b>GA4の「管理 → プロパティのアクセス管理」で、サービスアカウントのメールアドレスを<b>閲覧者</b>として追加します。</li>
      <li><b>環境に登録する。</b>Claude Code の環境設定（クラウド環境のメニュー → 編集）に、<code>GA4_SERVICE_ACCOUNT_JSON</code>（JSONキーの中身）と <code>GA4_PROPERTY_ID</code>（GA4の数字のプロパティID）を登録します。鍵はチャットに貼らないでください。</li>
      <li><b>翌朝から取り込まれます。</b>サイトの記事の取り込みと同じ毎朝のタスクが、前日までのデータを書き込みます。タグを入れてからGA4に数字が出るまでは、通常1日ほどかかります。</li>
      <li><b>自分のアクセスを除く。</b>運営者の閲覧が混ざらないよう、GA4の「データストリーム → タグ設定を行う → 内部トラフィックの定義」で自分のIPを登録しておくと、数字が正確になります。</li>
    </ol>
    <p class="meta">Googleアナリティクスはクッキーで統計を取るため、プライバシーポリシーのページに利用目的を書いておきます（マニュアル1章の法的表記）。</p>
  </details>`;
}

function viewAnalytics() {
  loadAnalytics();
  loadSitePosts();
  const head = `<h1>アクセス</h1>
  <p class="sub">サイトに、どこから・何人が来たか。GA4のデータを毎朝取り込んで表示します。</p>`;
  if (!cloud.db) return `${head}<div class="empty">${icon('chart')}<div>アクセスの表示は、クラウドに保存しているとき（アーティファクト版）に使えます。</div></div>${setupGuide(false)}`;
  if (!ga.loaded) return `${head}<div class="empty">${icon('chart')}<div>読み込み中…</div></div>`;
  const sum = ga.summary;
  if (!sum) return `${head}<div class="empty">${icon('chart')}<div>GA4はまだ接続されていません。下の手順で設定すると、翌朝からここに表示されます。</div></div>${setupGuide(true)}`;

  const R = sum.ranges[gaRange];
  const days = (sum.daily || []).slice(-Number(gaRange));
  const age = (Date.now() - new Date(sum.syncedAt)) / 864e5;
  const empty = !R.totals.sessions && !(sum.ranges[90]?.totals.sessions);
  const organic = R.channels.find(c => c.name === 'Organic Search');
  const sitePath = p => { try { return new URL(p.link).pathname.replace(/\/+$/, '') || '/'; } catch { return ''; } };
  const postFor = path => site.posts.find(p => sitePath(p) === (path.replace(/\/+$/, '') || '/'));
  const siteBase = (site.meta?.site || 'https://sumibiki.com').replace(/\/+$/, '');
  const clicks = R.outbound;

  return `${head}
  <p class="site-line">${icon('chart')}GA4から毎日取り込み・最終取得 ${new Date(sum.syncedAt).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })}・データは${sum.lastDate ? fmtDate(sum.lastDate) : '前日'}まで${sum.timeZone ? `（${esc(sum.timeZone)}）` : ''}</p>
  ${age > 2 ? `<div class="alert">取り込みが${Math.floor(age)}日止まっています。スケジュールされたタスクの実行結果を確認してください。</div>` : ''}
  <div class="toolbar"><div class="seg" role="group" aria-label="期間">${['7', '30', '90'].map(r => `<button data-act="ga-range" data-range="${r}" class="${gaRange === r ? 'on' : ''}">直近${r}日</button>`).join('')}</div></div>
  ${empty ? `<div class="alert">まだアクセスの記録がありません。タグを入れてからGA4に数字が出るまで、通常1日ほどかかります。</div>` : ''}

  <div class="grid two">
    <div class="card"><div class="kpi-label">${icon('people')}ユーザー</div><div class="kpi">${n0(R.totals.users)}<small>人</small></div></div>
    <div class="card"><div class="kpi-label">${icon('search')}検索からの流入</div><div class="kpi">${n0(organic?.sessions)}<small>セッション</small></div><div class="meta">全体の${R.totals.sessions ? Math.round((organic?.sessions || 0) / R.totals.sessions * 100) : 0}%</div></div>
    <div class="card"><div class="kpi-label">${icon('doc')}ページの表示</div><div class="kpi">${n0(R.totals.views)}<small>回</small></div><div class="meta">${n0(R.totals.sessions)}セッション・エンゲージメント率 ${Math.round((R.totals.engagementRate || 0) * 100)}%</div></div>
    <div class="card"><div class="kpi-label">${icon('external')}外部リンクのクリック</div>${clicks === null ? '<div class="kpi">—</div><div class="meta">GA4の拡張計測（外部リンクのクリック）を有効にすると表示されます</div>' : `<div class="kpi">${n0(clicks.reduce((a, c) => a + c.clicks, 0))}<small>回</small></div><div class="meta">${clicks.slice(0, 3).map(c => `${esc(c.domain)} ${n0(c.clicks)}`).join('・') || '予約リンクのクリックの目安'}</div>`}</div>
  </div>

  <h2>${icon('chart')}推移</h2>
  <div class="card">${dailyChart(days)}</div>

  <h2>${icon('globe')}どこから来たか</h2>
  <div class="grid two">
    <div class="card"><h3>流入のきっかけ</h3>${hbars(R.channels, c => CHANNEL_JA[c.name] || c.name || '不明', c => c.users)}</div>
    <div class="card"><h3>国・地域</h3>${hbars(R.countries, countryName, c => c.users)}</div>
    <div class="card"><h3>都市</h3>${hbars(R.cities.filter(c => c.city), c => [c.city, c.country && c.country !== c.city ? countryName({ name: c.country }) : ''].filter(Boolean).join('・'), c => c.users)}</div>
    <div class="card"><h3>端末</h3>${hbars(R.devices, d => DEVICE_JA[d.name] || d.name || '不明', d => d.users)}</div>
  </div>

  <h3>参照元（どのサイト・検索から）</h3>
  <div class="table-wrap"><table>
    <thead><tr><th>参照元 / メディア</th><th class="num">ユーザー</th><th class="num">セッション</th></tr></thead>
    <tbody>${R.sources.map(r => `<tr><td>${esc(r.source)} <span class="meta">/ ${esc(r.medium)}</span></td><td class="num">${n0(r.users)}</td><td class="num">${n0(r.sessions)}</td></tr>`).join('') || '<tr><td colspan="3" class="meta">データがありません</td></tr>'}</tbody>
  </table></div>

  <h2>${icon('doc')}よく見られたページ</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>ページ</th><th class="num">表示</th><th class="num">ユーザー</th></tr></thead>
    <tbody>${R.pages.map(r => {
      const post = postFor(r.path);
      const hotel = post && hotelForPost(post);
      const title = post?.title || r.title || r.path;
      const link = post ? `<a href="#/site/${post.id}">${esc(title)}</a>` : `<a href="${esc(siteBase + r.path)}" target="_blank" rel="noopener">${esc(title)}</a>`;
      return `<tr><td>${link}<div class="meta">${esc(r.path)}${hotel ? ` ・ <a href="#/hotel/${hotel.id}">${esc(hotel.nameJa)}</a>` : ''}</div></td><td class="num">${n0(r.views)}</td><td class="num">${n0(r.users)}</td></tr>`;
    }).join('') || '<tr><td colspan="3" class="meta">データがありません</td></tr>'}</tbody>
  </table></div>

  ${setupGuide(false)}`;
}

// ---------- 画面：線図 ----------

function viewDrawings() {
  const rows = [...state.hotels].sort((a, b) => (issueById(a.issueId)?.releaseDate || '9999').localeCompare(issueById(b.issueId)?.releaseDate || '9999'));
  const counts = Object.keys(DRAWING_STATUS).map(k => `<span class="tag ${k === 'delivered' ? 'ok' : k === 'none' ? 'warn' : ''}">${DRAWING_STATUS[k]} ${state.hotels.filter(h => h.drawing.status === k).length}</span>`).join('');
  return `<h1>線図</h1>
  <p class="sub">アイキャッチはホテル外観の線図。発注前に権利の帰属と利用範囲を決め、書面（メール可）で合意します。</p>
  <div class="toolbar">${counts}<span class="spacer"></span><button class="btn" data-act="drawing-csv">${icon('download')}発注用リストをCSVで書き出す</button><button class="btn" data-act="drawing-copy">${icon('copy')}表をコピー</button></div>
  ${rows.length ? `<div class="table-wrap"><table>
    <thead><tr><th>ホテル</th><th>号</th><th>状態</th><th>イラストレーター</th><th>権利</th><th>合意</th><th>元資料</th><th>納期</th></tr></thead>
    <tbody>${rows.map(h => {
      const agreed = DRAWING_AGREEMENTS.filter(([k]) => h.drawing.agreed[k]).length;
      return `<tr>
        <td><a href="#/hotel/${h.id}">${esc(h.nameJa || '(無題)')}</a><div class="meta">${esc(h.nameEn)}</div></td>
        <td>${esc(issueLabel(issueById(h.issueId)))}</td>
        <td><span class="tag ${h.drawing.status === 'delivered' ? 'ok' : h.drawing.status === 'none' ? 'warn' : ''}">${DRAWING_STATUS[h.drawing.status]}</span></td>
        <td>${esc(h.drawing.illustrator || '—')}</td>
        <td>${RIGHTS[h.drawing.rights] || '未定'}</td>
        <td class="num"><span class="${agreed < DRAWING_AGREEMENTS.length && h.drawing.status !== 'none' ? 'tag warn' : ''}">${agreed}/${DRAWING_AGREEMENTS.length}</span></td>
        <td>${h.drawing.sourcePermission ? '<span class="tag ok">確認済</span>' : '<span class="tag">未確認</span>'}</td>
        <td>${h.drawing.due ? fmtDate(h.drawing.due) : '—'}</td>
      </tr>`;
    }).join('')}</tbody></table></div>` : '<div class="empty">ホテルを登録すると、ここに線図の一覧が出ます。</div>'}
  <h2>発注時に合意する事項</h2>
  <div class="card"><ul style="margin:0;padding-left:1.2em">${DRAWING_AGREEMENTS.map(([, l]) => `<li>${l}</li>`).join('')}</ul>
  <p class="meta" style="margin-bottom:0">ホテルや建築家が公開している画像でも、無断で転載・トレースしない。掲載許可・施設名や建築家名の使用は施設ごとに確認する。</p></div>`;
}

function drawingRows() {
  const rows = [['号', 'ホテル名', 'Hotel name', '建築家', '所在地', '状態', 'イラストレーター', '権利の帰属', '利用範囲', '元資料', '元資料の許可', '納期', '報酬・条件', 'クレジット']];
  for (const h of state.hotels) {
    rows.push([issueLabel(issueById(h.issueId)), h.nameJa, h.nameEn, h.architect, h.location, DRAWING_STATUS[h.drawing.status], h.drawing.illustrator, RIGHTS[h.drawing.rights], h.drawing.scopeNote, h.drawing.sourceMaterial, h.drawing.sourcePermission ? '確認済' : '未確認', h.drawing.due, h.drawing.fee, h.drawing.credit]);
  }
  return rows;
}

// ---------- 画面：アフィリエイト ----------

function viewAffiliate() {
  const st = state.settings;
  const months = resultMonths();
  const goal = Number(st.revenueGoal) || 0;
  const t = today();
  const linked = state.hotels.filter(h => h.affiliate.url);
  const staleLimit = ymd(addMonths(t, -1));
  return `<h1>アフィリエイト</h1>
  <p class="sub">当面は宿泊予約のみ。紹介するホテルは建築的な価値で選び、報酬の高さで選ばない。</p>

  <h2>提携先</h2>
  <div class="toolbar"><button class="btn primary" data-act="partner-new">${icon('plus')}提携先を追加</button></div>
  <div class="table-wrap"><table>
    <thead><tr><th>提携先</th><th>状態</th><th>規約確認日</th><th>報酬条件</th><th>規約の要点</th><th>設置記事</th><th></th></tr></thead>
    <tbody>${state.partners.map(p => `<tr>
      <td>${esc(p.name)}${p.notes ? `<div class="meta">${esc(p.notes)}</div>` : ''}</td>
      <td><span class="tag ${p.status === 'active' ? 'ok' : ''}">${PARTNER_STATUS[p.status] || ''}</span></td>
      <td>${p.termsCheckedAt ? fmtDate(p.termsCheckedAt) : '<span class="tag warn">未確認</span>'}</td>
      <td>${esc(p.reward || '—')}</td>
      <td style="white-space:pre-wrap">${esc(p.rules || '—')}</td>
      <td class="num">${state.hotels.filter(h => h.affiliate.partnerId === p.id).length}</td>
      <td class="actions"><button class="btn small" data-act="partner-edit" data-id="${p.id}">編集</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="meta">提携先がありません</td></tr>'}</tbody>
  </table></div>

  <h2>月ごとの成果</h2>
  <p class="sub">目標 ${yen(goal)}${st.goalIsMonthly ? '／月' : ''}${st.goalDeadline ? `・達成時期 ${esc(st.goalDeadline)}` : '・達成時期は未定'}（<a href="#/settings">設定で変更</a>）</p>
  <div class="toolbar"><button class="btn primary" data-act="result-new">${icon('plus')}成果を記録</button></div>
  ${months.length ? `<div class="table-wrap"><table>
    <thead><tr><th>月</th><th class="num">クリック</th><th class="num">成果件数</th><th class="num">報酬</th><th>目標比</th></tr></thead>
    <tbody>${months.map(m => {
      const rs = state.results.filter(r => r.month === m);
      const sum = k => rs.reduce((s, r) => s + (Number(r[k]) || 0), 0);
      const rev = sum('revenue');
      const pct = goal ? Math.round(rev / goal * 100) : 0;
      return `<tr><td>${m}</td><td class="num">${sum('clicks').toLocaleString()}</td><td class="num">${sum('conversions').toLocaleString()}</td><td class="num">${yen(rev)}</td>
        <td style="min-width:120px"><div class="bar" style="margin:6px 0 0"><i style="width:${Math.min(100, pct)}%"></i></div><span class="meta">${pct}%</span></td></tr>`;
    }).join('')}</tbody></table></div>
    <h3>明細</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>月</th><th>提携先</th><th class="num">クリック</th><th class="num">成果</th><th class="num">報酬</th><th></th></tr></thead>
      <tbody>${[...state.results].sort((a, b) => b.month.localeCompare(a.month)).map(r => `<tr>
        <td>${esc(r.month)}</td><td>${esc(state.partners.find(p => p.id === r.partnerId)?.name || '—')}</td>
        <td class="num">${Number(r.clicks || 0).toLocaleString()}</td><td class="num">${Number(r.conversions || 0).toLocaleString()}</td><td class="num">${yen(r.revenue)}</td>
        <td class="actions"><button class="btn small" data-act="result-edit" data-id="${r.id}">編集</button></td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="empty">まだ成果の記録がありません。</div>'}

  <h2>予約リンクの確認（月次）</h2>
  <p class="sub">最終確認から1か月以上たったリンクに印を付けています。</p>
  ${linked.length ? `<div class="table-wrap"><table>
    <thead><tr><th>ホテル</th><th>提携先</th><th>広告表記</th><th>最終確認</th><th></th></tr></thead>
    <tbody>${linked.map(h => {
      const stale = !h.affiliate.lastChecked || h.affiliate.lastChecked < staleLimit;
      return `<tr><td><a href="#/hotel/${h.id}">${esc(h.nameJa)}</a><div class="meta"><a href="${esc(h.affiliate.url)}" target="_blank" rel="noopener">リンクを開く</a></div></td>
        <td>${esc(state.partners.find(p => p.id === h.affiliate.partnerId)?.name || '—')}</td>
        <td>${h.affiliate.disclosure ? '<span class="tag ok">あり</span>' : '<span class="tag warn">未確認</span>'}</td>
        <td><span class="tag ${stale ? 'warn' : 'ok'}">${h.affiliate.lastChecked ? fmtDate(h.affiliate.lastChecked) : '未確認'}</span></td>
        <td class="actions"><button class="btn small" data-act="link-checked" data-id="${h.id}">今日確認した</button></td></tr>`;
    }).join('')}</tbody></table></div>` : '<div class="empty">予約リンクを設定したホテルはまだありません。</div>'}`;
}

function partnerForm(p) {
  return [
    { k: 'name', label: '提携先', type: 'text', value: p?.name || '', required: true },
    { k: 'status', label: '状態', type: 'select', options: Object.entries(PARTNER_STATUS), value: p?.status || 'candidate' },
    { k: 'termsCheckedAt', label: '規約確認日', type: 'date', value: p?.termsCheckedAt || '' },
    { k: 'reward', label: '報酬条件', type: 'text', value: p?.reward || '' },
    { k: 'rules', label: '規約の要点（禁止事項・リンク表示の条件・成果条件）', type: 'textarea', value: p?.rules || '', wide: true },
    { k: 'notes', label: '備考', type: 'text', value: p?.notes || '', wide: true },
  ];
}
function resultForm(r) {
  return [
    { k: 'month', label: '月', type: 'month', value: r?.month || ym(today()), required: true },
    { k: 'partnerId', label: '提携先', type: 'select', options: [['', '—'], ...state.partners.map(p => [p.id, p.name])], value: r?.partnerId || '' },
    { k: 'clicks', label: '予約リンクのクリック数', type: 'number', value: r?.clicks ?? '' },
    { k: 'conversions', label: '成果件数', type: 'number', value: r?.conversions ?? '' },
    { k: 'revenue', label: '報酬（円）', type: 'number', value: r?.revenue ?? '' },
  ];
}

// ---------- 画面：集客・SNS ----------

function viewSns() {
  const posts = [...state.snsPosts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const months = [...new Set(state.results.map(r => r.month))];
  return `<h1>集客・SNS</h1>
  <p class="sub">中心にするチャネルは検索（SEO）、Instagram、X、Pinterest。号の公開日に告知し、線図を投稿の画像に使います（使用範囲は線図の合意内容に従う）。</p>

  <h2>投稿の予定と記録</h2>
  <div class="toolbar"><button class="btn primary" data-act="sns-new">${icon('plus')}投稿を追加</button>
  ${nextIssue() ? `<button class="btn" data-act="sns-issue">次の号の告知をまとめて追加</button>` : ''}</div>
  ${posts.length ? `<div class="table-wrap"><table>
    <thead><tr><th>日付</th><th>チャネル</th><th>内容</th><th>線図の利用範囲</th><th>状態</th><th></th></tr></thead>
    <tbody>${posts.map(p => {
      const h = hotelById(p.hotelId);
      return `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.channel)}</td>
        <td>${esc(p.text)}${h ? `<div class="meta"><a href="#/hotel/${h.id}">${esc(h.nameJa)}</a></div>` : ''}</td>
        <td>${h ? (h.drawing.scopeNote ? esc(h.drawing.scopeNote) : '<span class="tag warn">未確認</span>') : '—'}</td>
        <td><span class="tag ${p.done ? 'ok' : ''}">${p.done ? '投稿済' : '予定'}</span></td>
        <td class="actions"><button class="btn small" data-act="sns-edit" data-id="${p.id}">編集</button></td></tr>`;
    }).join('')}</tbody></table></div>` : '<div class="empty">まだ投稿の予定がありません。</div>'}

  <h2>SEOのチェック</h2>
  <p class="sub">記事タイトルに「ホテル名＋建築家名」または「ホテル名＋建築」が入っているかを確認します。</p>
  ${state.hotels.length ? `<div class="table-wrap"><table>
    <thead><tr><th>ホテル</th><th>日本語タイトル</th><th>英語タイトル</th></tr></thead>
    <tbody>${state.hotels.map(h => `<tr><td><a href="#/hotel/${h.id}">${esc(h.nameJa || '(無題)')}</a></td>
      <td>${seoCell(h.titleJa, h.nameJa, h.architect, '建築')}</td><td>${seoCell(h.titleEn, h.nameEn, h.architectEn, 'architect')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">ホテルを登録すると表示されます。</div>'}
  ${months.length ? '' : `<p class="meta">見る指標（案）：検索流入数、記事ごとの閲覧数、予約リンクのクリック数、成果件数。クリック数と成果は「アフィリエイト」で記録します。</p>`}`;
}

function seoCell(title, name, architect, word) {
  if (!title) return '<span class="tag">未入力</span>';
  const t = title.toLowerCase();
  const hasName = name && t.includes(name.toLowerCase());
  const hasArch = (architect && t.includes(architect.toLowerCase())) || t.includes(word.toLowerCase());
  return `${esc(title)}<div>${hasName ? '<span class="tag ok">ホテル名</span>' : '<span class="tag warn">ホテル名なし</span>'}${hasArch ? '<span class="tag ok">建築家・建築</span>' : '<span class="tag warn">建築家・建築なし</span>'}</div>`;
}

function snsForm(p) {
  return [
    { k: 'date', label: '日付', type: 'date', value: p?.date || ymd(today()), required: true },
    { k: 'channel', label: 'チャネル', type: 'select', options: SNS_CHANNELS.map(c => [c, c]), value: p?.channel || SNS_CHANNELS[0] },
    { k: 'hotelId', label: '関連するホテル', type: 'select', options: [['', '—'], ...state.hotels.map(h => [h.id, h.nameJa || '(無題)'])], value: p?.hotelId || '' },
    { k: 'done', label: '投稿済', type: 'checkbox', value: !!p?.done },
    { k: 'text', label: '内容', type: 'textarea', value: p?.text || '', wide: true },
  ];
}

// ---------- 画面：用語集 ----------

function viewGlossary() {
  const list = [...state.glossary].sort((a, b) => (a.kind || '').localeCompare(b.kind || '') || a.ja.localeCompare(b.ja, 'ja'));
  return `<h1>用語集</h1>
  <p class="sub">ホテル名・建築家名・地名は公式の英語表記に合わせます。英語版の依頼文に自動で入ります。</p>
  <div class="toolbar"><button class="btn primary" data-act="term-new">${icon('plus')}用語を追加</button><span class="spacer"></span>
    <button class="btn" data-act="glossary-copy">用語集をテキストでコピー</button></div>
  ${list.length ? `<div class="table-wrap"><table>
    <thead><tr><th>種類</th><th>日本語</th><th>英語</th><th>メモ・出典</th><th></th></tr></thead>
    <tbody>${list.map(g => `<tr><td><span class="tag">${esc(g.kind || '—')}</span></td><td>${esc(g.ja)}</td><td>${esc(g.en)}</td><td>${esc(g.note)}</td>
      <td class="actions"><button class="btn small" data-act="term-edit" data-id="${g.id}">編集</button></td></tr>`).join('')}</tbody>
  </table></div>` : '<div class="empty">まだ用語がありません。</div>'}`;
}

function termForm(g) {
  return [
    { k: 'kind', label: '種類', type: 'select', options: ['ホテル名', '建築家名', '地名', '建築用語', 'その他'].map(x => [x, x]), value: g?.kind || '建築用語' },
    { k: 'ja', label: '日本語', type: 'text', value: g?.ja || '', required: true },
    { k: 'en', label: '英語', type: 'text', value: g?.en || '', required: true },
    { k: 'note', label: 'メモ・出典（公式表記の確認先など）', type: 'text', value: g?.note || '', wide: true },
  ];
}

// ---------- 画面：定期作業 ----------

function routineItem(key, n, text) {
  const k = `${key}:${n}`;
  const done = state.routineDone[k];
  const id = `rt-${k.replace(/[^\w]/g, '-')}`;
  return `<li class="${done ? 'done' : ''}"><input type="checkbox" id="${id}" data-routine="${esc(k)}" ${done ? 'checked' : ''}><label for="${id}">${esc(text)}${done ? `<div class="meta">${fmtDate(done)}に完了</div>` : ''}</label></li>`;
}

let routineIssue = '';

function viewRoutine() {
  const t = today();
  const w = routineProgress('weekly');
  const m = routineProgress('monthly');
  const issues = sortedIssues();
  const sel = issueById(routineIssue) || nextIssue() || issues[0];
  const ip = sel ? routineProgress('issue', sel.id) : null;
  return `<h1>定期作業</h1>
  <p class="sub">チェックは週・月・号ごとに自動でリセットされます。</p>
  <div class="grid">
    <div class="card"><h3>週次 <span class="meta">${isoWeek(t)}・${w.done}/${w.total}</span></h3>
      <ul class="checklist">${ROUTINES.weekly.items.map((x, n) => routineItem(w.key, n, x)).join('')}</ul></div>
    <div class="card"><h3>月次 <span class="meta">${ym(t)}・${m.done}/${m.total}</span></h3>
      <ul class="checklist">${ROUTINES.monthly.items.map((x, n) => routineItem(m.key, n, x)).join('')}</ul>
      <p class="meta" style="margin-bottom:0">予約リンクの確認は<a href="#/affiliate">アフィリエイト</a>、成果の記録もそこで行います。</p></div>
    <div class="card"><h3>号ごと ${ip ? `<span class="meta">${ip.done}/${ip.total}</span>` : ''}</h3>
      ${sel ? `<div class="toolbar"><select id="routine-issue">${issues.map(i => `<option value="${i.id}" ${i.id === sel.id ? 'selected' : ''}>${esc(issueLabel(i))}</option>`).join('')}</select></div>
      <ul class="checklist">${ROUTINES.issue.items.map((x, n) => routineItem(ip.key, n, x)).join('')}</ul>` : '<p class="meta">号を作ると使えます。</p>'}</div>
  </div>
  <h2>バックアップとセキュリティ</h2>
  <div class="card"><ul style="margin:0;padding-left:1.2em">
    <li>更新作業の前に必ず手動でバックアップを取る</li>
    <li>ConoHa WINGの自動バックアップの有無と保存期間を確認して記録する（<a href="#/settings">設定</a>のメモ欄）</li>
    <li>復元手順を一度試して、手順を記録する</li>
    <li>管理者アカウントは最小限にし、2段階認証を使う</li>
    <li>使っていないプラグイン・テーマは削除する</li>
    <li>常時https化を確認する</li>
  </ul></div>`;
}

// ---------- 画面：未決定事項 ----------

function viewDecisions() {
  const open = state.decisions.filter(d => !d.done);
  const done = state.decisions.filter(d => d.done);
  const item = d => `<li class="${d.done ? 'done' : ''}">
    <input type="checkbox" id="dc-${d.id}" data-decision="${d.id}" ${d.done ? 'checked' : ''}>
    <label for="dc-${d.id}">${esc(d.text)} <span class="tag">${esc(d.chapter || '')}</span>${d.resolution ? `<div class="meta" style="text-decoration:none">決定：${esc(d.resolution)}</div>` : ''}</label>
    <button class="btn small" data-act="decision-edit" data-id="${d.id}">編集</button></li>`;
  return `<h1>未決定事項</h1>
  <p class="sub">決まったら内容を記録し、マニュアルの該当の章に反映します。</p>
  <div class="toolbar"><button class="btn primary" data-act="decision-new">${icon('plus')}項目を追加</button></div>
  <div class="card"><ul class="checklist">${open.map(item).join('') || '<li class="meta">すべて決まりました。</li>'}</ul></div>
  ${done.length ? `<h2>決定済み（${done.length}）</h2><div class="card"><ul class="checklist">${done.map(item).join('')}</ul></div>` : ''}`;
}

function decisionForm(d) {
  return [
    { k: 'text', label: '項目', type: 'text', value: d?.text || '', wide: true, required: true },
    { k: 'chapter', label: '関連する章', type: 'text', value: d?.chapter || '' },
    { k: 'done', label: '決定済み', type: 'checkbox', value: !!d?.done },
    { k: 'resolution', label: '決定内容', type: 'textarea', value: d?.resolution || '', wide: true },
  ];
}

// ---------- 画面：設定・データ ----------

function viewSettings() {
  const st = state.settings;
  const sf = (k, label, type = 'text', opts = {}) => {
    const v = st[k];
    const cls = opts.wide ? 'field wide' : 'field';
    const hint = opts.hint ? `<div class="hint">${opts.hint}</div>` : '';
    if (type === 'checkbox') return `<div class="${cls}"><label style="display:flex;gap:8px;align-items:center;color:var(--text)"><input type="checkbox" data-s="${k}" ${v ? 'checked' : ''}>${label}</label></div>`;
    if (type === 'textarea') return `<div class="${cls}"><label for="s-${k}">${label}</label><textarea id="s-${k}" data-s="${k}">${esc(v)}</textarea>${hint}</div>`;
    return `<div class="${cls}"><label for="s-${k}">${label}</label><input id="s-${k}" type="${type}" data-s="${k}" value="${esc(v)}" placeholder="${esc(opts.placeholder || '')}">${hint}</div>`;
  };
  const swatch = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${c};vertical-align:middle;border:1px solid var(--line)"></span> ${esc(c)}` : '未決定';
  return `<h1>設定・データ</h1>

  <h2>目標と運営</h2>
  <div class="fields">
    ${sf('revenueGoal', '収益目標（円）', 'number')}
    ${sf('goalDeadline', '達成時期', 'text', { placeholder: '未定' })}
    ${sf('goalIsMonthly', '目標は月額', 'checkbox')}
    <div></div>
    ${sf('articlesPerIssue', '1号あたりの記事数', 'number')}
    ${sf('prepMonths', '号の準備期間（か月）', 'number')}
  </div>

  <h2>デザイン</h2>
  <p class="sub">錆 ${swatch(st.colorMain)}・明るい錆 ${swatch(st.colorLight)}</p>
  <div class="fields">
    ${sf('colorMain', '錆（セクション番号・種別ラベル）', 'text', { placeholder: '#8c4a2a' })}
    ${sf('colorLight', '明るい錆（暗い面での番号・ホバー時）', 'text', { placeholder: '#d9a27f' })}
    ${sf('headingFont', '見出し用フォント')}
    ${sf('bodyFont', '本文用フォント')}
  </div>

  <h2>記事作成用Claudeへの依頼</h2>
  <div class="fields">
    ${sf('writingStyle', '文体', 'text', { wide: true })}
    ${sf('articleLength', '文字数の目安')}
    ${sf('disclosureText', '広告表記の文言', 'text', { wide: true })}
  </div>

  <h2>アクセス解析</h2>
  <div class="fields">${sf('ga4Id', 'GA4の測定ID', 'text', { placeholder: 'G-XXXXXXXXXX', hint: '設定手順とタグは「アクセス」画面にあります。' })}</div>

  <h2>サーバー・バックアップのメモ</h2>
  <div class="fields">${sf('backupNote', 'ConoHa WINGの自動バックアップ・復元手順など', 'textarea', { wide: true, hint: 'パスワードはここに書かず、パスワード管理ツールで保管してください。' })}</div>

  <h2>データ</h2>
  <p class="sub">${cloud.db ? 'データはクラウドに保存され、別の端末から開いても同じデータが見られます。念のため、ときどきJSONで書き出してください。' : 'データはこのブラウザだけに保存されています。定期的にJSONで書き出してください。'}${st.lastExportAt ? `最終書き出し：${new Date(st.lastExportAt).toLocaleString('ja-JP')}` : 'まだ書き出していません。'}</p>
  <div class="toolbar">
    <button class="btn primary" data-act="export">${icon('download')}JSONで書き出す</button>
    <button class="btn" data-act="export-copy">${icon('copy')}JSONをコピー</button>
    <label class="btn" for="import-file">${icon('upload')}JSONを読み込む</label>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <span class="spacer"></span>
    <button class="btn danger" data-act="reset">すべて消去</button>
  </div>`;
}

// ---------- モーダルフォーム ----------

function openForm(title, fields, onSave, onDelete) {
  const modal = $('#modal');
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = `<div class="fields">${fields.map(f => {
    const id = `f-${f.k}`;
    const cls = f.wide || f.type === 'textarea' ? 'field wide' : 'field';
    const hint = f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '';
    const req = f.required ? 'required' : '';
    let input;
    if (f.type === 'select') input = `<select id="${id}" name="${f.k}">${f.options.map(([k, l]) => `<option value="${esc(k)}" ${String(f.value) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.k}">${esc(f.value)}</textarea>`;
    else if (f.type === 'checkbox') return `<div class="${cls}"><label style="display:flex;gap:8px;align-items:center;color:var(--text);font-size:.9rem;margin-top:22px"><input type="checkbox" id="${id}" name="${f.k}" ${f.value ? 'checked' : ''}>${esc(f.label)}</label></div>`;
    else input = `<input id="${id}" name="${f.k}" type="${f.type}" value="${esc(f.value)}" ${req}>`;
    return `<div class="${cls}"><label for="${id}">${esc(f.label)}</label>${input}${hint}</div>`;
  }).join('')}</div>
  ${onDelete ? '<div class="toolbar"><button type="button" class="btn danger small" id="modal-delete">削除</button></div>' : ''}`;

  const form = $('#modal-form');
  form.onsubmit = e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.k];
      out[f.k] = f.type === 'checkbox' ? el.checked : f.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim();
    }
    onSave(out);
    modal.close();
    save();
    rerender();
  };
  $('#modal-cancel').onclick = () => modal.close();
  const del = $('#modal-delete');
  if (del) del.onclick = async () => {
    if (!await ask('削除しますか？', '削除')) return;
    onDelete();
    modal.close();
    save();
    rerender();
  };
  modal.showModal();
}

// ---------- 操作 ----------

const actions = {
  'issue-new': () => openForm('号を追加', issueForm(null), v => { state.issues.push({ id: uid(), ...v }); }),
  'issue-edit': ({ id }) => {
    const i = issueById(id);
    openForm('号を編集', issueForm(i), v => Object.assign(i, v));
  },
  'issue-delete': async ({ id }) => {
    const i = issueById(id);
    if (!await ask(`${issueLabel(i)}を削除しますか？ この号のホテルは「未割り当て」に戻ります。`, '削除')) return;
    state.hotels.forEach(h => { if (h.issueId === id) h.issueId = ''; });
    state.issues = state.issues.filter(x => x.id !== id);
    save();
    go('issues');
  },
  'issue-assign': ({ id }) => {
    const h = hotelById($('#assign-select').value);
    if (!h) return;
    h.issueId = id;
    save();
    rerender();
  },
  'hotel-new': ({ issue }) => openForm('ホテルを追加', [
    { k: 'nameJa', label: 'ホテル名', type: 'text', value: '', required: true, wide: true },
    { k: 'architect', label: '設計者（建築家）', type: 'text', value: '' },
    { k: 'region', label: '地域', type: 'text', value: '' },
    { k: 'issueId', label: '号', type: 'select', options: [['', '未割り当て'], ...sortedIssues().map(i => [i.id, issueLabel(i)])], value: issue || '' },
  ], v => {
    const h = newHotel(v);
    state.hotels.push(h);
    setTimeout(() => go(`hotel/${h.id}`));
  }),
  'hotel-delete': async ({ id }) => {
    const h = hotelById(id);
    if (!await ask(`「${h.nameJa}」を削除しますか？`, '削除')) return;
    for (const img of [h.eyecatch, ...h.figures]) await dropImage(img);
    state.hotels = state.hotels.filter(x => x.id !== id);
    state.snsPosts.forEach(p => { if (p.hotelId === id) p.hotelId = ''; });
    save();
    go('hotels');
  },
  stage: async ({ id, stage }) => {
    const h = hotelById(id);
    const n = Number(stage);
    if (n === STAGE_PUBLISHED && checksDone(h) < PREPUBLISH_CHECKS.length && !await ask('公開前チェックリストが終わっていません。公開済にしますか？', '公開済にする')) return;
    h.stage = n;
    h.updatedAt = new Date().toISOString();
    save();
    rerender();
  },
  'copy-prompt': ({ id, lang }) => {
    const h = hotelById(id);
    copyText(lang === 'en' ? promptEn(h) : promptJa(h));
  },
  'article-lang': ({ lang }) => { articleLang = lang; rerender(); },
  'ga-range': ({ range }) => { gaRange = range; rerender(); },
  'ga-copy-snippet': () => {
    const id = (state.settings.ga4Id || '').trim().toUpperCase();
    if (/^G-[A-Z0-9]{6,14}$/.test(id)) copyText(snippet(id));
  },
  'archive-show': ({ show }) => { archiveFilter.show = show; rerender(); },
  'eyecatch-delete': async ({ id }) => {
    const h = hotelById(id);
    if (!await ask('アイキャッチを外しますか？ 画像も削除されます。', '外す')) return;
    await dropImage(h.eyecatch);
    h.eyecatch = null;
    save();
    rerender();
  },
  'fig-delete': async ({ id, n }) => {
    const h = hotelById(id);
    if (!await ask(`Fig.${Number(n) + 1} を削除しますか？`, '削除')) return;
    const [img] = h.figures.splice(Number(n), 1);
    await dropImage(img);
    save();
    rerender();
  },
  'fig-move': ({ id, n, dir }) => {
    const h = hotelById(id);
    const a = Number(n), b = a + Number(dir);
    if (b < 0 || b >= h.figures.length) return;
    [h.figures[a], h.figures[b]] = [h.figures[b], h.figures[a]];
    save();
    rerender();
  },
  'drawing-csv': () => download(`sumibiki-drawings-${ymd(today())}.csv`, csv(drawingRows()), 'text/csv'),
  'drawing-copy': () => copyText(drawingRows().map(r => r.join('\t')).join('\n')),
  'partner-new': () => openForm('提携先を追加', partnerForm(null), v => { state.partners.push({ id: uid(), ...v }); }),
  'partner-edit': ({ id }) => {
    const p = state.partners.find(x => x.id === id);
    openForm('提携先を編集', partnerForm(p), v => Object.assign(p, v), () => {
      state.partners = state.partners.filter(x => x.id !== id);
      state.hotels.forEach(h => { if (h.affiliate.partnerId === id) h.affiliate.partnerId = ''; });
    });
  },
  'result-new': () => openForm('成果を記録', resultForm(null), v => { state.results.push({ id: uid(), ...v }); }),
  'result-edit': ({ id }) => {
    const r = state.results.find(x => x.id === id);
    openForm('成果を編集', resultForm(r), v => Object.assign(r, v), () => { state.results = state.results.filter(x => x.id !== id); });
  },
  'link-checked': ({ id }) => {
    hotelById(id).affiliate.lastChecked = ymd(today());
    save();
    rerender();
  },
  'sns-new': () => openForm('投稿を追加', snsForm(null), v => { state.snsPosts.push({ id: uid(), ...v }); }),
  'sns-edit': ({ id }) => {
    const p = state.snsPosts.find(x => x.id === id);
    openForm('投稿を編集', snsForm(p), v => Object.assign(p, v), () => { state.snsPosts = state.snsPosts.filter(x => x.id !== id); });
  },
  'sns-issue': () => {
    const i = nextIssue();
    const date = i.releaseDate || ymd(today());
    for (const c of SNS_CHANNELS) {
      state.snsPosts.push({ id: uid(), date, channel: c, hotelId: '', done: false, text: `${issueLabel(i)}公開の告知${i.theme ? `（${i.theme}）` : ''}` });
    }
    save();
    rerender();
    toast(`${SNS_CHANNELS.length}件追加しました`);
  },
  'term-new': () => openForm('用語を追加', termForm(null), v => { state.glossary.push({ id: uid(), ...v }); }),
  'term-edit': ({ id }) => {
    const g = state.glossary.find(x => x.id === id);
    openForm('用語を編集', termForm(g), v => Object.assign(g, v), () => { state.glossary = state.glossary.filter(x => x.id !== id); });
  },
  'glossary-copy': () => copyText(state.glossary.map(g => `${g.ja}\t${g.en}\t${g.kind || ''}\t${g.note || ''}`).join('\n')),
  'decision-new': () => openForm('未決定事項を追加', decisionForm(null), v => { state.decisions.push({ id: uid(), ...v }); }),
  'decision-edit': ({ id }) => {
    const d = state.decisions.find(x => x.id === id);
    openForm('未決定事項を編集', decisionForm(d), v => Object.assign(d, v), () => { state.decisions = state.decisions.filter(x => x.id !== id); });
  },
  'export-copy': () => copyText(JSON.stringify(state, null, 2)),
  export: () => {
    state.settings.lastExportAt = new Date().toISOString();
    save();
    download(`sumibiki-admin-${ymd(today())}.json`, JSON.stringify(state, null, 2));
    rerender();
  },
  reset: async () => {
    if (!await ask('すべてのデータを消去して初期状態に戻します。先にJSONで書き出しましたか？', 'すべて消去')) return;
    state = defaultState();
    save();
    go('dashboard');
  },
};

document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (link) {
    e.preventDefault();
    go(link.getAttribute('href'));
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  e.preventDefault();
  const fn = actions[el.dataset.act];
  if (fn) fn({ ...el.dataset });
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.h) {
    const h = hotelById(currentRoute().arg);
    if (!h) return;
    const val = el.type === 'checkbox' ? el.checked : el.value;
    setPath(h, el.dataset.h, val);
    h.updatedAt = new Date().toISOString();
    save();
    if (el.type === 'checkbox' || el.tagName === 'SELECT' || ['nameJa', 'architect', 'sources', 'unverified', 'location', 'urlJa', 'urlEn'].includes(el.dataset.h)) rerender();
    return;
  }
  if (el.dataset.s) {
    const k = el.dataset.s;
    state.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    save();
    if (k.startsWith('color') || k === 'ga4Id') rerender();
    return;
  }
  if (el.dataset.routine) {
    const k = el.dataset.routine;
    if (el.checked) state.routineDone[k] = ymd(today()); else delete state.routineDone[k];
    save();
    rerender();
    return;
  }
  if (el.dataset.decision) {
    const d = state.decisions.find(x => x.id === el.dataset.decision);
    d.done = el.checked;
    save();
    rerender();
    return;
  }
  if (el.id === 'hotel-issue' || el.id === 'hotel-stage') {
    hotelFilter.issue = $('#hotel-issue').value;
    hotelFilter.stage = $('#hotel-stage').value;
    rerender();
    return;
  }
  if (el.id === 'routine-issue') {
    routineIssue = el.value;
    rerender();
    return;
  }
  if (el.dataset.img && el.files.length) {
    const h = hotelById(currentRoute().arg);
    if (h) addImages(h, el.dataset.img, el.files);
    el.value = '';
    return;
  }
  if (el.id === 'archive-issue') {
    archiveFilter.issue = $('#archive-issue').value;
    $('#archive-results').innerHTML = archiveResults();
    return;
  }
  if (el.id === 'import-file' && el.files[0]) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        el.value = '';
        if (!await ask('読み込んだデータで、いまのデータを置き換えます。よろしいですか？', '置き換える')) return;
        state = migrate(data);
        save();
        rerender();
        toast('読み込みました');
        if (cloud.db) liftDataImages();
      } catch {
        toast('JSONを読み込めませんでした');
      }
    };
    reader.readAsText(el.files[0]);
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'archive-q') {
    archiveFilter.q = e.target.value;
    $('#archive-results').innerHTML = archiveResults();
    return;
  }
  if (e.target.id !== 'hotel-q') return;
  hotelFilter.q = e.target.value;
  // 入力欄のフォーカスを保つため、結果部分だけ描き直す
  const results = $('#hotel-results');
  if (results) results.innerHTML = hotelList(filteredHotels());
});

// 画像のドラッグ＆ドロップ
document.addEventListener('dragover', e => {
  const zone = e.target.closest?.('[data-drop]');
  if (!zone) return;
  e.preventDefault();
  zone.classList.add('over');
});
document.addEventListener('dragleave', e => e.target.closest?.('[data-drop]')?.classList.remove('over'));
document.addEventListener('drop', e => {
  const zone = e.target.closest?.('[data-drop]');
  if (!zone) return;
  e.preventDefault();
  zone.classList.remove('over');
  const h = hotelById(currentRoute().arg);
  if (h && e.dataTransfer.files.length) addImages(h, zone.dataset.drop, e.dataTransfer.files);
});

render();
connectCloud().then(() => { if (cloud.db) liftDataImages(); });
