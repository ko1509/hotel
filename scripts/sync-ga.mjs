#!/usr/bin/env node
// GA4（Google Analytics Data API）から直近のアクセス状況を取得し、運営管理アプリが読む形のJSONにする。
// 書き込みは ArtifactData で行う（手順は scripts/SYNC.md の「アクセス解析」）。
//
// 必要な環境変数:
//   GA4_SERVICE_ACCOUNT_JSON  サービスアカウントのJSONキー（中身そのもの。base64でも可）
//   GA4_PROPERTY_ID           GA4のプロパティID（数字のみ）
// 使い方:
//   node scripts/sync-ga.mjs [--out ga-out]
//
// 出力: <out>/summary.json（→ アプリの analytics/summary）
import { mkdirSync, writeFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => {
  if (v.startsWith('--')) a.push([v.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true]);
  return a;
}, []));
const OUT = args.out || 'ga-out';
const API = (process.env.GA4_API_BASE || 'https://analyticsdata.googleapis.com').replace(/\/+$/, '');
const RANGES = [7, 30, 90];

function fail(msg) {
  console.error(`sync-ga failed: ${msg}`);
  process.exit(1);
}

function loadKey() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!raw) fail('GA4_SERVICE_ACCOUNT_JSON が未設定です');
  for (const text of [raw, Buffer.from(raw, 'base64').toString('utf8')]) {
    try {
      const k = JSON.parse(text);
      if (k.client_email && k.private_key) return k;
    } catch { /* 次を試す */ }
  }
  fail('GA4_SERVICE_ACCOUNT_JSON をJSONとして読めません（client_email と private_key が必要です）');
}

const b64url = v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

async function accessToken(key) {
  const uri = key.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'RS256', typ: 'JWT' });
  const claim = b64url({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: uri, iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key).toString('base64url');
  const res = await fetch(uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) fail(`認証に失敗しました（${res.status} ${body.error || ''}）。JSONキーが正しいか確認してください`);
  return body.access_token;
}

async function batch(token, property, requests) {
  const res = await fetch(`${API}/v1beta/properties/${property}:batchRunReports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ requests }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint = res.status === 403
      ? '。サービスアカウントを GA4 の「プロパティのアクセス管理」に閲覧者で追加し、Google Analytics Data API を有効にしてください'
      : res.status === 404 ? '。GA4_PROPERTY_ID（数字のプロパティID）を確認してください' : '';
    throw new Error(`GA4 API ${res.status}: ${body.error?.message || ''}${hint}`);
  }
  return body.reports || [];
}

// 5件ずつに分けて取得する（APIの上限）
async function runAll(token, property, requests) {
  const out = [];
  for (let i = 0; i < requests.length; i += 5) out.push(...await batch(token, property, requests.slice(i, i + 5)));
  return out;
}

const num = v => Number(v) || 0;
const NOT_SET = new Set(['(not set)', '(other)', '']);
const label = v => (NOT_SET.has(v) ? '' : v);

function rows(report) {
  return (report?.rows || []).map(r => [r.dimensionValues.map(d => d.value), r.metricValues.map(m => num(m.value))]);
}

const M = [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }];
const measure = ([u, s, v]) => ({ users: u, sessions: s, views: v });

function req(range, dimensions, limit, extra = {}) {
  return {
    dateRanges: [{ startDate: `${range}daysAgo`, endDate: 'yesterday' }],
    dimensions: dimensions.map(name => ({ name })),
    metrics: M,
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit,
    ...extra,
  };
}

async function main() {
  const property = String(process.env.GA4_PROPERTY_ID || '').trim();
  if (!/^\d+$/.test(property)) fail('GA4_PROPERTY_ID が未設定、または数字ではありません');
  const token = await accessToken(loadKey());

  // 1) 期間ごとの集計
  const per = [];
  for (const r of RANGES) {
    per.push(
      { ...req(r, [], 1), metrics: [...M, { name: 'engagementRate' }] },
      req(r, ['sessionDefaultChannelGroup'], 10),
      req(r, ['sessionSource', 'sessionMedium'], 15),
      req(r, ['country', 'countryId'], 15),
      req(r, ['city', 'country'], 15),
      req(r, ['deviceCategory'], 5),
      { ...req(r, ['pagePath', 'pageTitle'], 20), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] },
    );
  }
  // 2) 日ごとの推移（90日分）
  per.push({
    dateRanges: [{ startDate: '90daysAgo', endDate: 'yesterday' }],
    dimensions: [{ name: 'date' }], metrics: M,
    orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 100,
  });
  const reports = await runAll(token, property, per);

  const ranges = {};
  RANGES.forEach((r, i) => {
    const [tot, ch, src, ctry, city, dev, pg] = reports.slice(i * 7, i * 7 + 7);
    const t = rows(tot)[0];
    ranges[r] = {
      totals: t ? { ...measure(t[1]), engagementRate: t[1][3] } : { users: 0, sessions: 0, views: 0, engagementRate: 0 },
      channels: rows(ch).map(([d, m]) => ({ name: d[0], ...measure(m) })),
      sources: rows(src).map(([d, m]) => ({ source: d[0], medium: d[1], ...measure(m) })),
      countries: rows(ctry).map(([d, m]) => ({ name: label(d[0]), code: label(d[1]), ...measure(m) })),
      cities: rows(city).map(([d, m]) => ({ city: label(d[0]), country: label(d[1]), ...measure(m) })),
      devices: rows(dev).map(([d, m]) => ({ name: d[0], ...measure(m) })),
      pages: rows(pg).map(([d, m]) => ({ path: d[0], title: d[1], ...measure(m) })).sort((a, b) => b.views - a.views),
      outbound: null,
    };
  });
  const daily = rows(reports[RANGES.length * 7]).map(([d, m]) => ({
    date: `${d[0].slice(0, 4)}-${d[0].slice(4, 6)}-${d[0].slice(6, 8)}`, ...measure(m),
  }));

  // 3) 外部リンクのクリック（拡張計測が有効なときだけ。予約リンクのクリック数の目安）。失敗しても全体は止めない
  let outboundNote = '';
  try {
    const ob = await runAll(token, property, RANGES.map(r => ({
      dateRanges: [{ startDate: `${r}daysAgo`, endDate: 'yesterday' }],
      dimensions: [{ name: 'linkDomain' }], metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'click' } } },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 10,
    })));
    RANGES.forEach((r, i) => { ranges[r].outbound = rows(ob[i]).map(([d, m]) => ({ domain: d[0], clicks: m[0] })); });
  } catch (e) {
    outboundNote = ` (外部リンクのクリックは取得できませんでした: ${e.message.slice(0, 80)})`;
  }

  const summary = {
    syncedAt: new Date().toISOString(),
    property,
    timeZone: reports[0]?.metadata?.timeZone || '',
    lastDate: daily.at(-1)?.date || '',
    ranges,
    daily,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary));
  const t = ranges[30].totals;
  console.log(`property: ${property} last30: users ${t.users} sessions ${t.sessions} views ${t.views} days: ${daily.length}${outboundNote}`);
}

main().catch(e => fail(e.message));
