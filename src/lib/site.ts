export const SITE = {
	name: 'VendorDesk',
	legalName: 'VendorDesk.tools',
	url: 'https://vendordesk.tools',
	email: 'hello@vendordesk.in',
	tagline: 'Lightning-fast utilities for independent businesses & designers.',
	description:
		'Free, client-side B2B tools for independent businesses, digital designers and packaging specialists. Paper bag die-line generator, GST Bill of Supply generator and more — no sign-up, nothing leaves your browser.',
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

export const TOOLS: ToolMeta[] = [
	{
		slug: 'paper-bag-die-line-generator',
		href: '/paper-bag-die-line-generator',
		name: 'Paper Bag Die-Line Generator',
		shortName: 'Die-Line Generator',
		category: 'Packaging',
		description:
			'Turn height, width and gusset into a print-ready SVG die-line with material-aware bleed, luxury or rustic folds and seamless sticker layout lines.',
		features: ['Instant SVG & PNG export', 'Material-aware bleed', 'Seamless sticker guides', 'Sheet yield calculator'],
		audience: 'Digital designers · Packaging manufacturers',
		keywords: ['paper bag die line', 'paper bag template generator', 'SOS bag dieline', 'gusset bag template svg'],
	},
	{
		slug: 'unregistered-vendor-bill-of-supply',
		href: '/unregistered-vendor-bill-of-supply',
		name: 'Bill of Supply Generator',
		shortName: 'Bill of Supply',
		category: 'GST compliance',
		description:
			'Create a GST-compliant Bill of Supply for unregistered vendors and composition dealers, then download it as a PDF — generated entirely in your browser.',
		features: ['Rule 49 compliant layout', 'Sign on screen', 'Amount in words (lakh/crore)', 'One-click PDF'],
		audience: 'Freelancers · Retail suppliers · Composition dealers',
		keywords: ['bill of supply generator', 'bill of supply format', 'unregistered vendor invoice', 'composition dealer bill'],
	},
];

export const NAV = [
	{ href: '/paper-bag-die-line-generator', label: 'Die-Line Generator' },
	{ href: '/unregistered-vendor-bill-of-supply', label: 'Bill of Supply' },
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
