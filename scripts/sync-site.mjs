#!/usr/bin/env node
// サイト（WordPress）の公開記事を取得し、運営管理アプリのデータベースに書く形のJSONにする。
// 書き込みは ArtifactData で行う（手順は scripts/SYNC.md）。
//
// 使い方:
//   node scripts/sync-site.mjs [--site http://sumibiki.com] [--prev 前回のapp-site.json] [--out sync-out]
//
// 出力（--out の下）:
//   siteposts/<id>.json   一覧用（タイトル・リンク・カテゴリー・小さなアイキャッチ）
//   sitebodies/<id>.json  記事ページ用（本文HTML・大きなアイキャッチ・本文中の画像）
//   app-site.json         取得の記録（sitesync/meta に書く）
//   plan.json             書く文書と消す文書の一覧
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => {
  if (v.startsWith('--')) a.push([v.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true]);
  return a;
}, []));
const SITE = String(args.site || process.env.SITE_URL || 'http://sumibiki.com').replace(/\/+$/, '');
const OUT = args.out || 'sync-out';
const SUMMARY_BUDGET = 60_000;  // 一覧用の文書に入れるアイキャッチの上限（バイト）
const BODY_BUDGET = 235_000;    // 記事ページ用の文書の上限。1文書256KiBの手前で止める

// /wp-json/ は国外IPのアクセス制限で 403 になることがあるため、?rest_route= を先に試す
async function api(route, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const urls = [`${SITE}/?rest_route=${route}${qs ? '&' + qs : ''}`, `${SITE}/wp-json${route}${qs ? '?' + qs : ''}`];
  let last;
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      if (r.ok) return { data: await r.json(), pages: Number(r.headers.get('x-wp-totalpages')) || 1 };
      last = `HTTP ${r.status}`;
    } catch (e) {
      last = e.cause?.code || e.message;
    }
  }
  throw new Error(`${route}: ${last}`);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—' };
function decode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
function text(html) { return decode(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }

// https の証明書がまだ独自ドメイン向けでないことがあるので、失敗したら http でも試す
async function dataUrl(url, max) {
  if (!url) return null;
  for (const u of [url, url.replace(/^https:/, 'http:')]) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const type = (r.headers.get('content-type') || '').split(';')[0];
      if (!type.startsWith('image/')) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      const out = `data:${type};base64,${buf.toString('base64')}`;
      return out.length <= max ? out : null;
    } catch { /* 次を試す */ }
  }
  return null;
}

function sizeUrls(media, order) {
  const sizes = media?.media_details?.sizes || {};
  return [...order.map(k => sizes[k]?.source_url), media?.source_url].filter(Boolean);
}
async function firstFitting(urls, max) {
  for (const u of urls) {
    const d = await dataUrl(u, max);
    if (d) return d;
  }
  return null;
}

// srcset から幅480px以上でいちばん小さい画像を選ぶ
function pickSrc(tag) {
  const src = /\ssrc="([^"]+)"/.exec(tag)?.[1];
  const set = /\ssrcset="([^"]+)"/.exec(tag)?.[1];
  if (!set) return src;
  const c = set.split(',').map(s => s.trim().split(/\s+/)).map(([u, w]) => [u, parseInt(w) || 0]).sort((a, b) => a[1] - b[1]);
  return (c.find(([, w]) => w >= 480) || c.at(-1) || [src])[0];
}

async function inlineImages(html, budget) {
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  let used = 0;
  let dropped = 0;
  for (const tag of tags) {
    const alt = /\salt="([^"]*)"/.exec(tag)?.[1] || '';
    const d = await dataUrl(pickSrc(tag), Math.max(0, budget - used));
    if (d) {
      used += d.length;
      html = html.replace(tag, `<img src="${d}" alt="${alt}">`);
    } else {
      dropped++;
      html = html.replace(tag, '');
    }
  }
  return { html, dropped };
}

async function allPosts() {
  const seen = new Map();
  // Polylang の言語ごとに取得する（lang が効かないサイトでは同じ結果になるだけ）
  for (const lang of ['', 'ja', 'en']) {
    for (let page = 1, pages = 1; page <= pages; page++) {
      const params = { per_page: 50, page, _embed: 'wp:featuredmedia,wp:term' };
      if (lang) params.lang = lang;
      const r = await api('/wp/v2/posts', params);
      pages = r.pages;
      for (const p of r.data) if (!seen.has(p.id)) seen.set(p.id, { ...p, _lang: p.lang || lang || '' });
    }
  }
  return [...seen.values()];
}

function langOf(p) {
  if (p.lang) return p.lang;
  try { if (new URL(p.link).pathname.startsWith('/en/')) return 'en'; } catch { /* そのまま */ }
  return p._lang || 'ja';
}

async function main() {
  const prev = args.prev ? JSON.parse(readFileSync(args.prev, 'utf8')) : null;
  const prevMap = prev?.posts || {};
  const posts = await allPosts();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'siteposts'), { recursive: true });
  mkdirSync(join(OUT, 'sitebodies'), { recursive: true });

  const map = {};
  const write = [];
  for (const p of posts) {
    const id = `p${p.id}`;
    map[id] = p.modified_gmt || p.modified;
    if (prevMap[id] === map[id] && !args.all) continue;

    const media = p._embedded?.['wp:featuredmedia']?.[0];
    const terms = (p._embedded?.['wp:term'] || []).flat();
    const lang = langOf(p);
    const summary = {
      wpId: p.id, lang, link: p.link, slug: decodeURIComponent(p.slug || ''),
      date: p.date, modified: map[id],
      title: text(p.title?.rendered), excerpt: text(p.excerpt?.rendered).slice(0, 300),
      categories: terms.filter(t => t.taxonomy === 'category').map(t => decode(t.name)),
      tags: terms.filter(t => t.taxonomy === 'post_tag').map(t => decode(t.name)),
      translations: p.translations && typeof p.translations === 'object' ? Object.fromEntries(Object.entries(p.translations).map(([k, v]) => [k, `p${v}`])) : null,
      thumb: await firstFitting(sizeUrls(media, ['medium', 'medium_large', 'large']), SUMMARY_BUDGET),
      thumbAlt: media?.alt_text || '',
    };
    const featured = await firstFitting(sizeUrls(media, ['large', 'medium_large', 'medium']), 120_000);
    const used = (featured?.length || 0) + 4_000;
    const raw = p.content?.rendered || '';
    const { html, dropped } = await inlineImages(raw, BODY_BUDGET - used - raw.length);
    const body = {
      wpId: p.id, modified: map[id], content: html, imagesDropped: dropped,
      featured, featuredCaption: text(media?.caption?.rendered), featuredAlt: media?.alt_text || '',
    };
    writeFileSync(join(OUT, 'siteposts', `${id}.json`), JSON.stringify(summary));
    writeFileSync(join(OUT, 'sitebodies', `${id}.json`), JSON.stringify(body));
    write.push(id);
  }
  const remove = Object.keys(prevMap).filter(id => !(id in map));
  const meta = { syncedAt: new Date().toISOString(), site: SITE, count: posts.length, posts: map };
  writeFileSync(join(OUT, 'app-site.json'), JSON.stringify(meta));
  writeFileSync(join(OUT, 'plan.json'), JSON.stringify({ write, remove }, null, 2));
  console.log(`site: ${SITE} posts: ${posts.length} write: ${write.length} remove: ${remove.length}`);
  for (const id of write) {
    const size = readFileSync(join(OUT, 'sitebodies', `${id}.json`)).length;
    console.log(`  ${id} body ${Math.round(size / 1024)}KB`);
  }
}

main().catch(e => {
  console.error('sync failed:', e.message);
  process.exit(1);
});
