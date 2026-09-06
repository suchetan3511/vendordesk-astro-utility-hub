import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

import { SITE, TOOLS } from '../lib/site';

// Prerendered at build time into dist/sitemap.xml. A single flat sitemap rather than an
// index file: the index indirection only earns its keep past 50,000 URLs, and one fewer
// fetch is one fewer thing between a crawler and the URLs.
export const prerender = true;

/**
 * Every .astro page in this directory, discovered at build time so that adding a page
 * cannot silently leave it out of the sitemap. Only the keys are used, so the modules
 * themselves are never evaluated.
 */
const PAGE_FILES = Object.keys(import.meta.glob('./**/*.astro'));

/** Served with `noindex`, so listing them would contradict the pages themselves. */
const EXCLUDED = new Set(['/404', '/500']);

/** Derived from TOOLS so a new tool inherits the right priority without editing this file. */
const TOOL_ROUTES = new Set<string>(TOOLS.map((t) => t.href));
const LEGAL_ROUTES = new Set(['/privacy-policy', '/terms-of-service']);

/** `./about.astro` → `/about`, `./index.astro` → `/`. Matches `trailingSlash: 'never'`. */
function routeOf(key: string): string {
	const slug = key.replace(/^\.\//, '').replace(/\.astro$/, '');
	return slug === 'index' ? '/' : `/${slug}`;
}

/**
 * When a page's content actually last changed, taken from git (falling back to the file's
 * mtime for pages that are not committed yet). Build time would be wrong: it would restamp
 * every URL on every deploy, and a lastmod that always says "now" is one crawlers learn to
 * discount.
 */
function lastModified(route: string): string | undefined {
	const file = route === '/' ? 'src/pages/index.astro' : `src/pages${route}.astro`;
	try {
		const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
		if (iso) return new Date(iso).toISOString();
	} catch {}
	try {
		return statSync(file).mtime.toISOString();
	} catch {}
	return undefined;
}

/** The tools are what we want crawled and recrawled; the legal pages rank for nothing. */
function ranking(route: string): { changefreq: string; priority: string } {
	if (LEGAL_ROUTES.has(route)) return { changefreq: 'yearly', priority: '0.3' };
	if (route === '/') return { changefreq: 'monthly', priority: '1.0' };
	if (TOOL_ROUTES.has(route)) return { changefreq: 'monthly', priority: '0.9' };
	return { changefreq: 'monthly', priority: '0.5' };
}

const escapeXml = (value: string) =>
	value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export const GET: APIRoute = () => {
	const routes = PAGE_FILES.map(routeOf)
		.filter((route) => !EXCLUDED.has(route))
		// Homepage first, then alphabetical — a stable order keeps the file's diff readable
		// when a page is added.
		.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

	const entries = routes.map((route) => {
		const { changefreq, priority } = ranking(route);
		const lastmod = lastModified(route);
		// The <loc> must be the canonical URL exactly as the page declares it and as
		// .htaccess serves it: absolute, extensionless, no trailing slash.
		return [
			'\t<url>',
			`\t\t<loc>${escapeXml(new URL(route, SITE.url).toString())}</loc>`,
			...(lastmod ? [`\t\t<lastmod>${lastmod}</lastmod>`] : []),
			`\t\t<changefreq>${changefreq}</changefreq>`,
			`\t\t<priority>${priority}</priority>`,
			'\t</url>',
		].join('\n');
	});

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries,
		'</urlset>',
		'',
	].join('\n');

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
