// admin/ の3ファイルを、アーティファクトとして公開できる1枚のHTMLにまとめる。
// 使い方: node scripts/build-artifact.mjs → dist/sumibiki-admin.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(root, 'admin', f), 'utf8');

const html = read('index.html');
const title = html.match(/<title>.*<\/title>/)[0];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script src="app.js"><\/script>/, () => `<script>\n${read('app.js')}\n</script>`);

const out = `${title}\n<style>\n${read('style.css')}\n</style>\n${body.trim()}\n`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'sumibiki-admin.html'), out);
console.log('dist/sumibiki-admin.html', out.length, 'bytes');
