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
			// Priority is a hint about relative importance within the site, not a ranking lever.
			// The homepage leads, the freight class calculator is the highest-intent page, and
			// the remaining tools and guides sit above the legal boilerplate.
			serialize(item) {
				const path = new URL(item.url).pathname.replace(/\/$/, '');
				if (path === '') item.priority = 1.0;
				// The two highest-intent pages: the flagship calculator and the document it feeds.
				else if (/^\/(freight-class-calculator|bill-of-lading-generator)$/.test(path)) item.priority = 0.9;
				else if (/^\/(privacy-policy|terms-of-service)$/.test(path)) item.priority = 0.4;
				else item.priority = 0.8;
				return item;
			},
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
