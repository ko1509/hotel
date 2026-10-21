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
    ...h,
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
    rerender();
    flushCloud(); // 初回はこのブラウザのデータを送る。2回目以降は補った項目だけ
  } catch (e) {
    console.warn('cloud load failed', e);
    cloud.db = null;
    setSync('local');
  }
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

const ROUTES = [
  ['dashboard', 'ダッシュボード'],
  ['issues', '号'],
  ['hotels', 'ホテル記事'],
  ['drawings', '線図'],
  ['affiliate', 'アフィリエイト'],
  ['sns', '集客・SNS'],
  ['glossary', '用語集'],
  ['routine', '定期作業'],
  ['decisions', '未決定事項'],
  ['settings', '設定・データ'],
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
  const active = name === 'hotel' ? 'hotels' : name === 'issue' ? 'issues' : name;
  const openDecisions = state.decisions.filter(d => !d.done).length;
  $('#nav').innerHTML = ROUTES.map(([k, label]) => {
    const count = k === 'decisions' && openDecisions ? `<span class="count">${openDecisions}</span>` : '';
    return `<a href="#/${k}" class="${k === active ? 'active' : ''}">${label}${count}</a>`;
  }).join('');
}

function render() {
  const { name, arg } = currentRoute();
  const views = {
    dashboard: viewDashboard, issues: viewIssues, issue: () => viewIssue(arg), hotels: viewHotels,
    hotel: () => viewHotel(arg), drawings: viewDrawings, affiliate: viewAffiliate, sns: viewSns,
    glossary: viewGlossary, routine: viewRoutine, decisions: viewDecisions, settings: viewSettings,
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

function viewDashboard() {
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
      <div class="kpi-label">次の号</div>
      <div class="kpi">${esc(issueLabel(ni))}<small>第${issueNumber(ni)}号</small></div>
      <div>${esc(ni.theme || 'テーマ未定')}</div>
      <div class="meta sub" style="margin:4px 0 0">公開日 ${fmtDate(ni.releaseDate)}${left != null ? `（あと${left}日）` : ''}・着手目安 ${ps ? fmtDate(ymd(ps)) : '未定'}</div>
      <div class="meta sub" style="margin:0">記事 ${hs.length} / ${st.articlesPerIssue}本・公開済 ${hs.filter(h => h.stage === STAGE_PUBLISHED).length}本</div>
      <div class="bar"><i style="width:${Math.round(progress * 100)}%"></i></div>
    </a>`;
  } else {
    issueCard = `<div class="card"><div class="kpi-label">次の号</div><p>まだ号がありません。</p><button class="btn primary" data-act="issue-new">創刊号を作る</button></div>`;
  }

  const month = ym(t);
  const rev = revenueOf(month);
  const goal = Number(st.revenueGoal) || 0;
  const revCard = `<a class="card link" href="#/affiliate">
    <div class="kpi-label">今月の成果報酬（${month}）</div>
    <div class="kpi">${yen(rev)}<small>/ 目標 ${yen(goal)}${st.goalIsMonthly ? '（月額）' : ''}</small></div>
    <div class="bar"><i style="width:${goal ? Math.min(100, Math.round(rev / goal * 100)) : 0}%"></i></div>
  </a>`;

  const w = routineProgress('weekly');
  const m = routineProgress('monthly');
  const routineCard = `<a class="card link" href="#/routine">
    <div class="kpi-label">定期作業</div>
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
  const warned = state.hotels.filter(h => hotelWarnings(h).length);
  if (warned.length) alerts.push(`確認が必要なホテル記事が${warned.length}件あります。<a href="#/hotels">ホテル記事へ</a>`);
  if (m.done < m.total && t.getDate() >= 20) alerts.push(`今月の定期作業が残っています（${m.done}/${m.total}）。<a href="#/routine">定期作業へ</a>`);
  const lastExport = st.lastExportAt ? new Date(st.lastExportAt) : null;
  if (!cloud.db && (!lastExport || daysBetween(lastExport, new Date()) > 30)) alerts.push(`このアプリのデータを30日以上書き出していません。<a href="#/settings">設定・データへ</a>`);

  const openDecisions = state.decisions.filter(d => !d.done);

  return `<h1>ダッシュボード</h1>
  <p class="sub">${fmtDate(ymd(t))}・第${isoWeek(t).split('-W')[1]}週</p>
  <div class="grid two">${issueCard}${revCard}</div>
  <div class="grid two" style="margin-top:12px">${routineCard}
    <a class="card link" href="#/decisions"><div class="kpi-label">未決定事項</div><div class="kpi">${openDecisions.length}<small>件</small></div></a>
  </div>
  <h2>確認すること</h2>
  ${alerts.length ? alerts.map(a => `<div class="alert">${a}</div>`).join('') : '<div class="empty">いまは特にありません。</div>'}
  <h2>進行中のホテル記事</h2>
  ${hotelList(state.hotels.filter(h => h.stage < STAGE_PUBLISHED).slice(0, 8))}`;
}

// ---------- 画面：号 ----------

function viewIssues() {
  const issues = sortedIssues();
  return `<h1>号</h1>
  <p class="sub">季節ごとに1号（年4回）。公開の約${state.settings.prepMonths}か月前から着手します。</p>
  <div class="toolbar"><button class="btn primary" data-act="issue-new">号を追加</button></div>
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
    <button class="btn primary" data-act="hotel-new" data-issue="${i.id}">この号にホテルを追加</button>
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
    <button class="btn primary" data-act="hotel-new">ホテルを追加</button>
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
    input = `<input id="${id}" type="${type}" data-h="${path}" value="${esc(v)}" placeholder="${esc(opts.placeholder || '')}">`;
  }
  return `<div class="${cls}"><label for="${id}">${label}</label>${input}${hint}</div>`;
}

function viewHotel(id) {
  const h = hotelById(id);
  if (!h) return `<p>ホテルが見つかりません。</p><a href="#/hotels">ホテル記事の一覧へ</a>`;
  const w = hotelWarnings(h);
  const issueOpts = [['', '未割り当て'], ...sortedIssues().map(i => [i.id, issueLabel(i)])];
  const partnerOpts = [['', '未選択'], ...state.partners.map(p => [p.id, `${p.name}（${PARTNER_STATUS[p.status] || ''}）`])];
  const mapUrl = h.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.nameJa + ' ' + h.location)}` : '';
  const srcLines = lines(h.sources);

  return `<p class="sub" style="margin:0"><a href="#/hotels">← ホテル記事</a></p>
  <h1>${esc(h.nameJa || '(無題)')}</h1>
  <p class="sub">${esc(h.architect || '建築家未入力')}・${esc(issueLabel(issueById(h.issueId)))}${w.length ? ' ・ ' + w.map(x => `<span class="tag warn">${esc(x)}</span>`).join('') : ''}</p>

  <h2>制作の段階</h2>
  <div class="stages">${STAGES.map((s, n) => `<button data-act="stage" data-id="${h.id}" data-stage="${n}" class="${n < h.stage ? 'past' : n === h.stage ? 'current' : ''}">${n + 1}. ${s}</button>`).join('')}</div>

  <div class="section"><h2>基本情報</h2>
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

  <div class="section"><h2>取材メモ</h2>
  <div class="fields">
    ${hf(h, 'highlights', '見どころ（3〜5点）', 'textarea', { wide: true, placeholder: '1行に1点' })}
    ${hf(h, 'techniques', '建築技法（構造・素材・空間構成）', 'textarea', { wide: true })}
    ${hf(h, 'sources', '出典・一次資料', 'textarea', { wide: true, placeholder: '1行に1件。例：公式サイト https://…', hint: `${srcLines.length}件` })}
    ${hf(h, 'unverified', '要確認（出典が確認できない記述）', 'textarea', { wide: true, placeholder: '解消したら行を消す' })}
  </div></div>

  <div class="section"><h2>記事作成用Claudeへの依頼文</h2>
  <p class="sub">入力済みの情報から依頼文を作ります。コピーして記事作成用のClaudeに渡してください。英語版の依頼文には用語集が入ります。</p>
  <div class="toolbar">
    <button class="btn primary" data-act="copy-prompt" data-lang="ja" data-id="${h.id}">日本語版の依頼文をコピー</button>
    <button class="btn" data-act="copy-prompt" data-lang="en" data-id="${h.id}">英語版の依頼文をコピー</button>
  </div>
  <details><summary class="meta" style="cursor:pointer">日本語版の依頼文を見る</summary><pre class="prompt">${esc(promptJa(h))}</pre></details>
  </div>

  <div class="section"><h2>記事</h2>
  <div class="fields">
    ${hf(h, 'titleJa', '記事タイトル（日本語）', 'text', { wide: true, hint: '「ホテル名＋建築家名」「ホテル名＋建築」など探されやすい語を入れる' })}
    ${hf(h, 'titleEn', '記事タイトル（英語）', 'text', { wide: true })}
    ${hf(h, 'urlJa', '記事URL（日本語）', 'url')}
    ${hf(h, 'urlEn', '記事URL（英語）', 'url')}
    ${hf(h, 'en.status', '英語版', 'select', { options: [['none', '未着手'], ['requested', '翻訳依頼済'], ['reviewing', '固有名詞・用語を確認中'], ['ready', '公開できる'], ['published', '公開済'], ['later', '後日公開（日本語のみ先行）']] })}
    ${hf(h, 'en.note', '英語版のメモ（公開予定など）')}
  </div></div>

  <div class="section"><h2>線図</h2>
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

  <div class="section"><h2>予約リンク</h2>
  <div class="fields">
    ${hf(h, 'affiliate.partnerId', '提携先', 'select', { options: partnerOpts })}
    ${hf(h, 'affiliate.url', 'アフィリエイトリンク', 'url')}
    ${hf(h, 'affiliate.disclosure', `記事冒頭に広告表記を入れた（「${esc(state.settings.disclosureText)}」）`, 'checkbox', { wide: true })}
    ${hf(h, 'affiliate.lastChecked', 'リンクの最終確認日', 'date')}
  </div></div>

  <div class="section"><h2>公開前チェックリスト</h2>
  <ul class="checklist">${PREPUBLISH_CHECKS.map(([k, l]) => `<li class="${h.checks[k] ? 'done' : ''}"><input type="checkbox" id="ck-${k}" data-h="checks.${k}" ${h.checks[k] ? 'checked' : ''}><label for="ck-${k}">${l}</label></li>`).join('')}</ul>
  <p class="meta">${checksDone(h)} / ${PREPUBLISH_CHECKS.length} 完了</p>
  </div>

  <div class="section"><h2>メモ</h2>
  <div class="fields">${hf(h, 'notes', 'メモ', 'textarea', { wide: true })}</div>
  <div class="toolbar"><span class="spacer"></span><button class="btn danger" data-act="hotel-delete" data-id="${h.id}">このホテルを削除</button></div>
  </div>`;
}

// ---------- 画面：線図 ----------

function viewDrawings() {
  const rows = [...state.hotels].sort((a, b) => (issueById(a.issueId)?.releaseDate || '9999').localeCompare(issueById(b.issueId)?.releaseDate || '9999'));
  const counts = Object.keys(DRAWING_STATUS).map(k => `<span class="tag ${k === 'delivered' ? 'ok' : k === 'none' ? 'warn' : ''}">${DRAWING_STATUS[k]} ${state.hotels.filter(h => h.drawing.status === k).length}</span>`).join('');
  return `<h1>線図</h1>
  <p class="sub">アイキャッチはホテル外観の線図。発注前に権利の帰属と利用範囲を決め、書面（メール可）で合意します。</p>
  <div class="toolbar">${counts}<span class="spacer"></span><button class="btn" data-act="drawing-csv">発注用リストをCSVで書き出す</button><button class="btn" data-act="drawing-copy">表をコピー</button></div>
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
  <div class="toolbar"><button class="btn primary" data-act="partner-new">提携先を追加</button></div>
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
  <div class="toolbar"><button class="btn primary" data-act="result-new">成果を記録</button></div>
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
  <div class="toolbar"><button class="btn primary" data-act="sns-new">投稿を追加</button>
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
  <div class="toolbar"><button class="btn primary" data-act="term-new">用語を追加</button><span class="spacer"></span>
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
  <div class="toolbar"><button class="btn primary" data-act="decision-new">項目を追加</button></div>
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

  <h2>サーバー・バックアップのメモ</h2>
  <div class="fields">${sf('backupNote', 'ConoHa WINGの自動バックアップ・復元手順など', 'textarea', { wide: true, hint: 'パスワードはここに書かず、パスワード管理ツールで保管してください。' })}</div>

  <h2>データ</h2>
  <p class="sub">${cloud.db ? 'データはクラウドに保存され、別の端末から開いても同じデータが見られます。念のため、ときどきJSONで書き出してください。' : 'データはこのブラウザだけに保存されています。定期的にJSONで書き出してください。'}${st.lastExportAt ? `最終書き出し：${new Date(st.lastExportAt).toLocaleString('ja-JP')}` : 'まだ書き出していません。'}</p>
  <div class="toolbar">
    <button class="btn primary" data-act="export">JSONで書き出す</button>
    <button class="btn" data-act="export-copy">JSONをコピー</button>
    <label class="btn" for="import-file" style="display:inline-block">JSONを読み込む</label>
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
    if (el.type === 'checkbox' || el.tagName === 'SELECT' || ['nameJa', 'architect', 'sources', 'unverified', 'location'].includes(el.dataset.h)) rerender();
    return;
  }
  if (el.dataset.s) {
    const k = el.dataset.s;
    state.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    save();
    if (k.startsWith('color')) rerender();
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
      } catch {
        toast('JSONを読み込めませんでした');
      }
    };
    reader.readAsText(el.files[0]);
  }
});

document.addEventListener('input', e => {
  if (e.target.id !== 'hotel-q') return;
  hotelFilter.q = e.target.value;
  // 入力欄のフォーカスを保つため、結果部分だけ描き直す
  const results = $('#hotel-results');
  if (results) results.innerHTML = hotelList(filteredHotels());
});

render();
connectCloud();
