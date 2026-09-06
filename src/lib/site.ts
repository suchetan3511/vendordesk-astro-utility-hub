export const SITE = {
	name: 'VendorDesk',
	legalName: 'VendorDesk.tools',
	/** Bare host, for the "Generated with …" lines stamped into exported documents. */
	domain: 'vendordesk.tools',
	url: 'https://vendordesk.tools',
	// Single point of contact for the whole site: footer, contact page, legal pages and
	// the Organization schema all read this.
	email: 'support@himmerz.com',
	tagline: 'Lightning-fast utilities for independent businesses & designers.',
	// Kept under ~155 characters so Google shows it without truncating.
	description:
		'Free bill of supply generator and paper bag dieline generator that run in your browser. GST-compliant PDF bills, real-scale SVG dielines, no sign-up.',
	locale: 'en_IN',
	twitter: '',
} as const;

export interface ToolMeta {
	slug: string;
	href: string;
	name: string;
	shortName: string;
	category: string;
	description: string;
	features: string[];
	audience: string;
	keywords: string[];
}

/**
 * Order matters: the Bill of Supply generator is the flagship tool, so it leads
 * the tool grid, the footer and every list built from this array.
 */
export const TOOLS: ToolMeta[] = [
	{
		slug: 'unregistered-vendor-bill-of-supply',
		href: '/unregistered-vendor-bill-of-supply',
		name: 'Free Bill of Supply Generator',
		shortName: 'Bill of Supply',
		category: 'GST compliance',
		description:
			'Create a GST-compliant bill of supply online and download the PDF free. For composition dealers, exempt supplies, restaurants under composition and small sellers below the GST threshold.',
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
		description:
			'Turn height, width and gusset into a print-ready SVG dieline with material-aware bleed, luxury or rustic folds and seamless sticker layout lines.',
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

const bySlug = (slug: string): ToolMeta => {
	const tool = TOOLS.find((t) => t.slug === slug);
	if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
	return tool;
};

/** Named handles so pages never depend on the position of a tool in TOOLS. */
export const BILL = bySlug('unregistered-vendor-bill-of-supply');
export const DIELINE = bySlug('paper-bag-die-line-generator');

export const NAV = [
	{ href: BILL.href, label: BILL.shortName },
	{ href: DIELINE.href, label: DIELINE.shortName },
	{ href: '/about', label: 'About' },
	{ href: '/contact', label: 'Contact' },
] as const;

export const FOOTER_GROUPS = [
	{
		heading: 'Tools',
		links: TOOLS.map((t) => ({ href: t.href, label: t.name })),
	},
	{
		heading: 'Company',
		links: [
			{ href: '/about', label: 'About VendorDesk' },
			{ href: '/contact', label: 'Contact' },
		],
	},
	{
		heading: 'Legal',
		links: [
			{ href: '/privacy-policy', label: 'Privacy Policy' },
			{ href: '/terms-of-service', label: 'Terms of Service' },
		],
	},
] as const;
