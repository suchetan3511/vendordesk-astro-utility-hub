export const SITE = {
	name: 'VendorDesk',
	legalName: 'VendorDesk.tools',
	/** Bare host, for the "Generated with …" lines stamped into exported documents. */
	domain: 'vendordesk.tools',
	url: 'https://vendordesk.tools',
	// Single point of contact for the whole site: footer, contact page, legal pages and
	// the Organization schema all read this.
	email: 'support@vendordesk.tools',
	tagline: 'Lightning-fast utilities for independent businesses & designers.',
	// Kept under ~155 characters so Google shows it without truncating. Deliberately
	// market-neutral: the site now serves US freight shippers and Indian small businesses,
	// so no single tax regime or currency belongs in the site-level description.
	description:
		'Free freight class, NMFC and dimensional weight calculators, plus billing and packaging generators. All run in your browser — no sign-up, no limits.',
	twitter: '',
} as const;

/**
 * Which market a page is written for. The site spans two, and the difference is not cosmetic:
 * it drives `<html lang>`, `og:locale`, schema `inLanguage`, and the currency on the free-offer
 * node. A US freight page inheriting `en-IN` and `INR` would be quietly wrong on every signal
 * a search engine reads.
 */
export interface MarketMeta {
	lang: string;
	ogLocale: string;
	currency: string;
	country: string;
}

export const MARKET_US: MarketMeta = { lang: 'en-US', ogLocale: 'en_US', currency: 'USD', country: 'US' };
export const MARKET_IN: MarketMeta = { lang: 'en-IN', ogLocale: 'en_IN', currency: 'INR', country: 'IN' };
/** For pages that belong to neither market in particular: home, about, contact, legal. */
export const MARKET_NEUTRAL: MarketMeta = { lang: 'en', ogLocale: 'en_US', currency: 'USD', country: 'US' };

export type ToolGroup = 'shipping' | 'documents';

export const GROUP_LABELS: Record<ToolGroup, string> = {
	shipping: 'Shipping & Freight',
	documents: 'Business Documents',
};

export interface ToolMeta {
	slug: string;
	href: string;
	name: string;
	shortName: string;
	category: string;
	group: ToolGroup;
	market: MarketMeta;
	description: string;
	/** One line for the homepage card, carrying the page's target keyword. */
	blurb: string;
	features: string[];
	audience: string;
	keywords: string[];
}

/**
 * Order matters: this array drives the homepage tool list, the footer, the 404 page and the
 * homepage ItemList schema. The freight class calculator leads — it is the highest-intent page
 * on the site — followed by the rest of the freight cluster, then the document generators.
 */
export const TOOLS: ToolMeta[] = [
	{
		slug: 'freight-class-calculator',
		href: '/freight-class-calculator',
		name: 'Freight Class Calculator',
		shortName: 'Freight Class',
		category: 'LTL shipping',
		group: 'shipping',
		market: MARKET_US,
		description:
			'Calculate LTL freight class from dimensions and weight. Returns density, cubic feet and the NMFC class on the current 13-subprovision density scale introduced by Docket 2025-1.',
		blurb: 'Work out your LTL freight class from dimensions and weight, on the current NMFC density scale.',
		features: [
			'Density and cubic feet from length, width, height and piece count',
			'Class from the post-2025 13-subprovision NMFC density scale',
			'Side-by-side comparison with the legacy 18-class chart',
			'Inches or centimetres, pounds or kilograms',
			'Copyable one-line summary for the bill of lading',
		],
		audience: 'Shippers · 3PLs · Freight brokers',
		keywords: [
			'freight class calculator',
			'NMFC class lookup',
			'LTL freight class',
			'freight density calculator',
			'how to calculate freight class',
			'NMFC density scale',
		],
	},
	{
		slug: 'dimensional-weight-calculator',
		href: '/dimensional-weight-calculator',
		name: 'Dimensional Weight Calculator',
		shortName: 'DIM Weight',
		category: 'Parcel shipping',
		group: 'shipping',
		market: MARKET_US,
		description:
			'Calculate dimensional weight and billable weight for UPS, FedEx and USPS, with the current whole-inch round-up rule and the USPS one-cubic-foot threshold applied correctly.',
		blurb: 'Find the dimensional weight and billable weight for a UPS, FedEx or USPS parcel.',
		features: [
			'DIM weight and billable weight per carrier profile',
			'Whole-inch round-up applied as UPS, FedEx and USPS now require',
			'USPS one-cubic-foot threshold handled correctly',
			'Custom divisor for negotiated rates',
			'Girth and length-plus-girth with oversize reference points',
		],
		audience: 'Ecommerce sellers · Shippers · 3PLs',
		keywords: [
			'dimensional weight calculator',
			'DIM weight calculator',
			'billable weight calculator',
			'DIM divisor',
			'girth calculator',
			'UPS FedEx USPS dimensional weight',
		],
	},
	{
		slug: 'freight-class-chart',
		href: '/freight-class-chart',
		name: 'Freight Class Chart',
		shortName: 'Class Chart',
		category: 'LTL reference',
		group: 'shipping',
		market: MARKET_US,
		description:
			'The full freight class chart: the current 13-subprovision NMFC density scale, the legacy 18-class table, and example commodities for every class from 50 to 500.',
		blurb: 'The full freight class chart, with density ranges and example commodities for all 18 classes.',
		features: [
			'Current NMFC density scale and legacy chart side by side',
			'Example commodities for every class',
			'Which classes density can and cannot produce',
		],
		audience: 'Shippers · Freight brokers · Warehouse teams',
		keywords: ['freight class chart', 'NMFC class chart', 'freight class table', 'freight class list', 'density to freight class'],
	},
	{
		slug: 'nmfc-code-lookup',
		href: '/nmfc-code-lookup',
		name: 'NMFC Code Lookup',
		shortName: 'NMFC Lookup',
		category: 'LTL reference',
		group: 'shipping',
		market: MARKET_US,
		description:
			'Search common LTL commodities to see whether each rates on density or carries a fixed class, and the class it typically lands at. Filters as you type.',
		blurb: 'Search common commodities to see how each one classifies for LTL freight.',
		features: ['Filter as you type', 'Density-based vs fixed classification', 'Typical class for 100+ common commodities'],
		audience: 'Shippers · Freight brokers · Customer service teams',
		keywords: ['NMFC code lookup', 'NMFC codes list', 'freight class by commodity', 'NMFC commodity search', 'freight class lookup'],
	},
	{
		slug: 'bill-of-lading-generator',
		href: '/bill-of-lading-generator',
		name: 'Bill of Lading Generator',
		shortName: 'Bill of Lading',
		category: 'LTL shipping',
		group: 'documents',
		market: MARKET_US,
		description:
			'Create a straight bill of lading for an LTL shipment and download the PDF free. Freight class and NMFC columns, freight charge terms, COD and declared value.',
		blurb: 'Create a straight bill of lading for an LTL shipment and download it as a PDF.',
		features: [
			'Freight class and NMFC item on every line',
			'Prepaid, collect or third-party freight terms',
			'Hazardous material flag and shipper certification',
			'COD and declared value blocks',
			'Shipper and carrier signatures drawn on screen with touch, stylus or mouse',
			'Free PDF, no sign-up',
		],
		audience: 'Shippers · 3PLs · Warehouse teams',
		keywords: [
			'bill of lading generator',
			'bill of lading template',
			'free bill of lading',
			'straight bill of lading',
			'BOL template',
			'LTL bill of lading',
			'sign bill of lading online',
		],
	},
	{
		slug: 'purchase-order-generator',
		href: '/purchase-order-generator',
		name: 'Purchase Order Generator',
		shortName: 'Purchase Order',
		category: 'Procurement',
		group: 'documents',
		market: MARKET_US,
		description:
			'Create a purchase order online and download the PDF free. Line items, tax and shipping, payment and FOB terms, and a running total as you type.',
		blurb: 'Raise a purchase order with line items and terms, and download it as a PDF.',
		features: [
			'Line items with quantity, unit and unit price',
			'Tax rate, shipping and discount',
			'Payment, FOB and ship-method terms',
			'Authorising signature drawn on screen with touch, stylus or mouse',
			'Free PDF, no sign-up',
		],
		audience: 'Buyers · Small businesses · Operations teams',
		keywords: [
			'purchase order generator',
			'purchase order template',
			'free purchase order',
			'PO generator',
			'create purchase order online',
			'purchase order form',
			'sign purchase order online',
		],
	},
	{
		slug: 'unregistered-vendor-bill-of-supply',
		href: '/unregistered-vendor-bill-of-supply',
		name: 'Free Bill of Supply Generator',
		shortName: 'Bill of Supply',
		category: 'India · GST compliance',
		group: 'documents',
		market: MARKET_IN,
		description:
			'Create a GST-compliant bill of supply online and download the PDF free. For composition dealers, exempt supplies, restaurants under composition and small sellers below the GST threshold.',
		blurb: 'Create a GST-compliant bill of supply and download it as a PDF.',
		features: ['Rule 49 compliant format', 'Sign on screen', 'Amount in words (lakh/crore)', 'Free PDF, no sign-up'],
		audience: 'Freelancers · Small businesses · Composition dealers',
		keywords: [
			'free bill of supply generator',
			'bill of supply format',
			'bill of supply pdf',
			'online free bill generator',
			'free bill generator for small businesses',
			'composition dealer bill format',
			'unregistered vendor bill',
		],
	},
	{
		slug: 'paper-bag-die-line-generator',
		href: '/paper-bag-die-line-generator',
		name: 'Paper Bag Dieline Generator',
		shortName: 'Dieline Generator',
		category: 'Packaging',
		group: 'documents',
		market: MARKET_IN,
		description:
			'Turn height, width and gusset into a print-ready SVG dieline with material-aware bleed, luxury or rustic folds and seamless sticker layout lines.',
		blurb: 'Turn height, width and gusset into a real-scale, print-ready SVG paper bag dieline.',
		features: ['Instant SVG & PNG export', 'Material-aware bleed', 'Seamless sticker guides', 'Sheet yield calculator'],
		audience: 'Digital designers · Packaging manufacturers',
		keywords: [
			'paper bag dieline generator',
			'bag dieline generator',
			'paper bag template generator',
			'free dieline generator',
			'packaging dieline svg',
			'SOS bag dieline',
			'gusset bag template',
		],
	},
];

/**
 * Explainers rather than tools. They carry Article schema, not SoftwareApplication, and are kept
 * out of TOOLS so they never render as a tool card or appear in the homepage ItemList.
 */
export interface ArticleMeta {
	slug: string;
	href: string;
	name: string;
	shortName: string;
	group: ToolGroup;
	market: MarketMeta;
	description: string;
	blurb: string;
	keywords: string[];
}

export const ARTICLES: ArticleMeta[] = [
	{
		slug: 'what-is-freight-class',
		href: '/what-is-freight-class',
		name: 'What Is Freight Class?',
		shortName: 'What Is Freight Class',
		group: 'shipping',
		market: MARKET_US,
		description:
			'Freight class explained in plain English: what the NMFC is, the four factors that set your class, and how to avoid costly reclassification fees.',
		blurb: 'Freight class explained: what the NMFC is and the four factors that set your class.',
		keywords: ['what is freight class', 'freight class explained', 'NMFC explained', 'freight classification', 'reclassification fee'],
	},
];

const bySlug = (slug: string): ToolMeta => {
	const tool = TOOLS.find((t) => t.slug === slug);
	if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
	return tool;
};

const articleBySlug = (slug: string): ArticleMeta => {
	const article = ARTICLES.find((a) => a.slug === slug);
	if (!article) throw new Error(`Unknown article slug: ${slug}`);
	return article;
};

/** Named handles so pages never depend on the position of an entry in TOOLS. */
export const FREIGHT_CLASS = bySlug('freight-class-calculator');
export const DIM_WEIGHT = bySlug('dimensional-weight-calculator');
export const FREIGHT_CHART = bySlug('freight-class-chart');
export const NMFC_LOOKUP = bySlug('nmfc-code-lookup');
export const BOL = bySlug('bill-of-lading-generator');
export const PURCHASE_ORDER = bySlug('purchase-order-generator');
export const BILL = bySlug('unregistered-vendor-bill-of-supply');
export const DIELINE = bySlug('paper-bag-die-line-generator');
export const WHAT_IS_CLASS = articleBySlug('what-is-freight-class');

export const toolsInGroup = (group: ToolGroup) => TOOLS.filter((t) => t.group === group);

// Seven pages will not fit in the header, so the nav points at the homepage hub rather than
// listing tools individually. The footer carries the full set.
export const NAV = [
	{ href: '/#tools', label: 'Tools' },
	{ href: FREIGHT_CLASS.href, label: FREIGHT_CLASS.shortName },
	{ href: '/about', label: 'About' },
	{ href: '/contact', label: 'Contact' },
] as const;

export const FOOTER_GROUPS = [
	{
		heading: GROUP_LABELS.shipping,
		links: [
			...toolsInGroup('shipping').map((t) => ({ href: t.href, label: t.name })),
			{ href: WHAT_IS_CLASS.href, label: WHAT_IS_CLASS.name },
		],
	},
	{
		heading: GROUP_LABELS.documents,
		links: toolsInGroup('documents').map((t) => ({ href: t.href, label: t.name })),
	},
	{
		heading: 'Company',
		links: [
			{ href: '/about', label: 'About VendorDesk' },
			{ href: '/contact', label: 'Contact' },
			{ href: '/privacy-policy', label: 'Privacy Policy' },
			{ href: '/terms-of-service', label: 'Terms of Service' },
		],
	},
] as const;
