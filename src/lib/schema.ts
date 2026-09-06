import { SITE } from './site';

type JsonLd = Record<string, unknown>;

const abs = (path: string) => new URL(path, SITE.url).toString();

export const ORGANIZATION_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export function organization(): JsonLd {
	return {
		'@type': 'Organization',
		'@id': ORGANIZATION_ID,
		name: SITE.name,
		alternateName: SITE.legalName,
		url: SITE.url,
		email: SITE.email,
		logo: {
			'@type': 'ImageObject',
			url: abs('/favicon.svg'),
		},
		description: SITE.description,
		areaServed: 'IN',
		contactPoint: {
			'@type': 'ContactPoint',
			email: SITE.email,
			contactType: 'customer support',
			availableLanguage: ['en'],
		},
	};
}

export function website(): JsonLd {
	return {
		'@type': 'WebSite',
		'@id': WEBSITE_ID,
		url: SITE.url,
		name: SITE.name,
		description: SITE.description,
		inLanguage: 'en-IN',
		publisher: { '@id': ORGANIZATION_ID },
	};
}

export interface SoftwareAppInput {
	name: string;
	path: string;
	description: string;
	category: string;
	features: string[];
	keywords?: string[];
}

export function softwareApplication(app: SoftwareAppInput): JsonLd {
	return {
		'@type': 'SoftwareApplication',
		'@id': `${abs(app.path)}#app`,
		name: app.name,
		url: abs(app.path),
		description: app.description,
		applicationCategory: app.category,
		operatingSystem: 'Any (runs in the browser)',
		browserRequirements: 'Requires JavaScript. Works in current versions of Chrome, Safari, Firefox and Edge.',
		isAccessibleForFree: true,
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'INR',
			availability: 'https://schema.org/InStock',
		},
		featureList: app.features,
		keywords: app.keywords?.join(', '),
		softwareVersion: '1.0',
		author: { '@id': ORGANIZATION_ID },
		publisher: { '@id': ORGANIZATION_ID },
		inLanguage: 'en-IN',
	};
}

export interface Faq {
	question: string;
	answer: string;
}

export function faqPage(faqs: Faq[], path: string): JsonLd {
	return {
		'@type': 'FAQPage',
		'@id': `${abs(path)}#faq`,
		mainEntity: faqs.map((f) => ({
			'@type': 'Question',
			name: f.question,
			acceptedAnswer: { '@type': 'Answer', text: f.answer },
		})),
	};
}

export function breadcrumb(items: { name: string; path: string }[]): JsonLd {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.name,
			item: abs(item.path),
		})),
	};
}

export function webPage(input: { name: string; path: string; description: string; type?: string }): JsonLd {
	return {
		'@type': input.type ?? 'WebPage',
		'@id': `${abs(input.path)}#webpage`,
		url: abs(input.path),
		name: input.name,
		description: input.description,
		isPartOf: { '@id': WEBSITE_ID },
		inLanguage: 'en-IN',
	};
}

/** Wraps one or more schema nodes into a single JSON-LD graph and escapes it for inline <script>. */
export function toJsonLd(nodes: JsonLd | JsonLd[]): string {
	const graph = Array.isArray(nodes) ? nodes : [nodes];
	const doc = { '@context': 'https://schema.org', '@graph': graph };
	return JSON.stringify(doc).replace(/</g, '\\u003c');
}
