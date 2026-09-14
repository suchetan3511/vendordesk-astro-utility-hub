/**
 * Pings IndexNow with the site's indexable URLs.
 *
 * IndexNow is a push protocol: instead of waiting for a crawler to notice a change, the site
 * tells participating engines directly. Bing, Yandex, Naver, Seznam and Yep consume it —
 * Google does not, so this complements Search Console rather than replacing it.
 *
 * Verification is by a key file at the site root (`/<key>.txt`, containing exactly the key).
 * That file is public by design, which is why the key must be a throwaway random string and
 * never a credential that means anything anywhere else.
 *
 * The URL list is read from the built sitemap, so it can never drift from what was deployed.
 *
 *   node scripts/indexnow.mjs            # submit every URL in the sitemap
 *   node scripts/indexnow.mjs --dry-run  # print what would be sent
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'vendordesk.tools';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const DRY_RUN = process.argv.includes('--dry-run');

/** The key is whichever `<key>.txt` sits in public/ — one source of truth, no duplicated constant. */
function findKey() {
	const candidates = fs
		.readdirSync(path.join(ROOT, 'public'))
		.filter((f) => /^[A-Za-z0-9-]{8,128}\.txt$/.test(f) && f !== 'robots.txt');
	if (candidates.length !== 1) {
		throw new Error(`expected exactly one IndexNow key file in public/, found ${candidates.length}: ${candidates.join(', ')}`);
	}
	const file = candidates[0];
	const key = file.replace(/\.txt$/, '');
	const contents = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8').trim();
	if (contents !== key) throw new Error(`${file} must contain exactly its own key; it contains something else`);
	return key;
}

function sitemapUrls() {
	const sitemap = path.join(ROOT, 'dist', 'sitemap-0.xml');
	if (!fs.existsSync(sitemap)) throw new Error('dist/sitemap-0.xml is missing — run `npm run build` first');
	const xml = fs.readFileSync(sitemap, 'utf8');
	return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const key = findKey();
const urlList = sitemapUrls();
if (!urlList.length) throw new Error('no URLs found in the sitemap');

console.log(`host      : ${HOST}`);
console.log(`key file  : /${key}.txt`);
console.log(`urls      : ${urlList.length}`);
for (const u of urlList) console.log('   ', u);

if (DRY_RUN) {
	console.log('\ndry run — nothing submitted');
	process.exit(0);
}

const body = { host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList };
const res = await fetch(ENDPOINT, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json; charset=utf-8' },
	body: JSON.stringify(body),
});

// 200 accepted, 202 accepted but the key is still being validated. Both are success.
const text = await res.text();
console.log(`\nresponse  : ${res.status} ${res.statusText}`);
if (text.trim()) console.log(`body      : ${text.slice(0, 300)}`);
if (![200, 202].includes(res.status)) process.exit(1);
console.log(res.status === 202 ? 'accepted — key still being validated' : 'accepted');
