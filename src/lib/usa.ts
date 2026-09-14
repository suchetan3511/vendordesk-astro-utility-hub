/**
 * US document helpers — the counterpart to `india.ts`, shared by the bill of lading and
 * purchase order generators. Currency, dates, states and the small vocabularies those two
 * documents draw on.
 */

export interface UsState {
	code: string;
	name: string;
}

/** The 50 states, DC and the inhabited territories carriers actually deliver to. */
export const US_STATES: UsState[] = [
	{ code: 'AL', name: 'Alabama' },
	{ code: 'AK', name: 'Alaska' },
	{ code: 'AZ', name: 'Arizona' },
	{ code: 'AR', name: 'Arkansas' },
	{ code: 'CA', name: 'California' },
	{ code: 'CO', name: 'Colorado' },
	{ code: 'CT', name: 'Connecticut' },
	{ code: 'DE', name: 'Delaware' },
	{ code: 'DC', name: 'District of Columbia' },
	{ code: 'FL', name: 'Florida' },
	{ code: 'GA', name: 'Georgia' },
	{ code: 'HI', name: 'Hawaii' },
	{ code: 'ID', name: 'Idaho' },
	{ code: 'IL', name: 'Illinois' },
	{ code: 'IN', name: 'Indiana' },
	{ code: 'IA', name: 'Iowa' },
	{ code: 'KS', name: 'Kansas' },
	{ code: 'KY', name: 'Kentucky' },
	{ code: 'LA', name: 'Louisiana' },
	{ code: 'ME', name: 'Maine' },
	{ code: 'MD', name: 'Maryland' },
	{ code: 'MA', name: 'Massachusetts' },
	{ code: 'MI', name: 'Michigan' },
	{ code: 'MN', name: 'Minnesota' },
	{ code: 'MS', name: 'Mississippi' },
	{ code: 'MO', name: 'Missouri' },
	{ code: 'MT', name: 'Montana' },
	{ code: 'NE', name: 'Nebraska' },
	{ code: 'NV', name: 'Nevada' },
	{ code: 'NH', name: 'New Hampshire' },
	{ code: 'NJ', name: 'New Jersey' },
	{ code: 'NM', name: 'New Mexico' },
	{ code: 'NY', name: 'New York' },
	{ code: 'NC', name: 'North Carolina' },
	{ code: 'ND', name: 'North Dakota' },
	{ code: 'OH', name: 'Ohio' },
	{ code: 'OK', name: 'Oklahoma' },
	{ code: 'OR', name: 'Oregon' },
	{ code: 'PA', name: 'Pennsylvania' },
	{ code: 'RI', name: 'Rhode Island' },
	{ code: 'SC', name: 'South Carolina' },
	{ code: 'SD', name: 'South Dakota' },
	{ code: 'TN', name: 'Tennessee' },
	{ code: 'TX', name: 'Texas' },
	{ code: 'UT', name: 'Utah' },
	{ code: 'VT', name: 'Vermont' },
	{ code: 'VA', name: 'Virginia' },
	{ code: 'WA', name: 'Washington' },
	{ code: 'WV', name: 'West Virginia' },
	{ code: 'WI', name: 'Wisconsin' },
	{ code: 'WY', name: 'Wyoming' },
	{ code: 'PR', name: 'Puerto Rico' },
	{ code: 'VI', name: 'U.S. Virgin Islands' },
	{ code: 'GU', name: 'Guam' },
];

export const stateName = (code: string) => US_STATES.find((s) => s.code === code)?.name ?? '';

/** Five digit, or ZIP+4. */
export const ZIP_RE = /^\d{5}(-\d{4})?$/;
/** Carrier SCAC: two to four letters. */
export const SCAC_RE = /^[A-Z]{2,4}$/;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat('en-US');

export const formatUSD = (n: number) => usd.format(Number.isFinite(n) ? n : 0);
export const formatNumber = (n: number) => num.format(Number.isFinite(n) ? n : 0);
/** Thousands separators, no forced decimals — for weights and piece counts. */
export const formatCount = (n: number) => plain.format(Number.isFinite(n) ? n : 0);

export function formatQty(n: number): string {
	if (!Number.isFinite(n)) return '0';
	return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
	if (n < 20) return ONES[n];
	const tens = TENS[Math.floor(n / 10)];
	return n % 10 ? `${tens}-${ONES[n % 10]}` : tens;
}

function threeDigits(n: number): string {
	const h = Math.floor(n / 100);
	const rest = n % 100;
	return (h ? `${ONES[h]} Hundred${rest ? ' ' : ''}` : '') + (rest ? twoDigits(rest) : '');
}

/** Integer to words on the short scale: thousand, million, billion. */
export function integerToWords(n: number): string {
	if (!Number.isFinite(n) || n < 0) return '';
	n = Math.floor(n);
	if (n === 0) return 'Zero';
	const groups: { value: number; label: string }[] = [
		{ value: 1e9, label: 'Billion' },
		{ value: 1e6, label: 'Million' },
		{ value: 1e3, label: 'Thousand' },
	];
	const parts: string[] = [];
	for (const { value, label } of groups) {
		const count = Math.floor(n / value);
		if (count) {
			parts.push(`${threeDigits(count)} ${label}`);
			n %= value;
		}
	}
	if (n) parts.push(threeDigits(n));
	return parts.join(' ');
}

/**
 * Check-style amount in words: "One Thousand Two Hundred Thirty-Four and 56/100 US Dollars".
 * This is the convention for a declared value on a bill of lading.
 */
export function amountInWords(amount: number): string {
	if (!Number.isFinite(amount) || amount < 0) return '';
	const dollars = Math.floor(amount);
	const cents = Math.round((amount - dollars) * 100);
	return `${integerToWords(dollars)} and ${String(cents).padStart(2, '0')}/100 US Dollars`;
}

export function todayISO(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Adds days to an ISO date, for a default "required by" that is not in the past. */
export function addDaysISO(iso: string, days: number): string {
	const d = new Date(`${iso || todayISO()}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	d.setDate(d.getDate() + days);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Sep 15, 2026" — unambiguous, unlike the all-numeric US format. */
export function formatDateUS(iso: string): string {
	if (!iso) return '';
	const d = new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Assembles "City, ST 12345", skipping whatever is missing. */
export function cityLine(city: string, state: string, zip: string): string {
	const left = [city.trim(), state.trim()].filter(Boolean).join(', ');
	return [left, zip.trim()].filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Bill of lading vocabularies
// ---------------------------------------------------------------------------

/** Packaging units as they appear in the NMFC's own package descriptions. */
export const PACKAGE_TYPES = ['Pallets', 'Skids', 'Cartons', 'Cases', 'Boxes', 'Crates', 'Drums', 'Pails', 'Bags', 'Bundles', 'Rolls', 'Reels', 'Totes', 'Pieces', 'Loose'];

export interface FreightTerm {
	id: string;
	label: string;
	note: string;
}

/**
 * Who pays the carrier. Getting this wrong is the second most common cause of a corrected
 * invoice after a wrong class, so each option carries a plain-English note.
 */
export const FREIGHT_TERMS: FreightTerm[] = [
	{ id: 'prepaid', label: 'Prepaid', note: 'The shipper pays the freight charges. Most common for outbound shipments to a customer.' },
	{ id: 'collect', label: 'Collect', note: 'The consignee pays the freight charges on delivery. Common when a customer uses their own carrier account.' },
	{ id: 'thirdparty', label: 'Third party', note: 'A party other than shipper or consignee pays. Name and address of that party are required below.' },
];

/** The 18 NMFC classes, for the class column on a bill of lading line. */
export const FREIGHT_CLASSES = ['50', '55', '60', '65', '70', '77.5', '85', '92.5', '100', '110', '125', '150', '175', '200', '250', '300', '400', '500'];

// ---------------------------------------------------------------------------
// Purchase order vocabularies
// ---------------------------------------------------------------------------

export const ITEM_UNITS = ['ea', 'pcs', 'case', 'box', 'pallet', 'set', 'pair', 'lb', 'oz', 'ft', 'in', 'yd', 'gal', 'hr', 'day', 'lot', 'service'];

export const PAYMENT_TERMS = ['Net 30', 'Net 15', 'Net 45', 'Net 60', 'Due on receipt', '2/10 Net 30', '50% deposit, balance on delivery', 'Prepaid'];

/**
 * Incoterms-style FOB points. On a domestic US purchase order "FOB" states where title and
 * risk pass, which decides who eats the loss if the freight is damaged in transit.
 */
export const FOB_TERMS = ['FOB Destination', 'FOB Origin', 'FOB Origin, Freight Prepaid', 'FOB Origin, Freight Collect', 'FOB Destination, Freight Prepaid', 'Ex Works'];

export const SHIP_METHODS = ['Ground', 'LTL freight', 'Truckload', 'Next day air', '2nd day air', 'Expedited', 'Customer pickup', 'Vendor delivery'];
