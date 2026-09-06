// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://vendordesk.tools',
	output: 'static',
	trailingSlash: 'never',
	// Hostinger serves this over Apache/LiteSpeed, which is the opposite of Cloudflare's
	// asset handler: with the default 'directory' format every page is `about/index.html`,
	// and mod_dir answers a request for `/about` with a 301 to `/about/` — fighting the
	// canonical, which says `/about`. Emitting flat `about.html` files lets .htaccess serve
	// `/about` directly, so the URL Google is told to index is the URL that actually responds
	// 200. See public/.htaccess.
	build: { format: 'file' },
	// Astro's HTML minifier drops the newline between a word and a following inline element
	// (`…a bill of supply\n<strong>shows no tax</strong>`), silently gluing the words together.
	// Whitespace between prose and inline tags is meaningful, and brotli reclaims the bytes anyway.
	compressHTML: false,
	// @astrojs/sitemap emits /sitemap-index.xml + /sitemap-0.xml, which is what robots.txt
	// and Google Search Console are pointed at. URLs follow `site` and `trailingSlash`, so
	// they match the canonical exactly (absolute, extensionless, no trailing slash).
	integrations: [
		sitemap({
			// Served with `noindex`; listing them would contradict the pages themselves.
			filter: (page) => !/\/(404|500)$/.test(page),
			changefreq: 'monthly',
			priority: 0.7,
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
