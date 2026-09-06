/** GST state codes (first two digits of a GSTIN). */
export const STATES: { code: string; name: string }[] = [
	{ code: '01', name: 'Jammu & Kashmir' },
	{ code: '02', name: 'Himachal Pradesh' },
	{ code: '03', name: 'Punjab' },
	{ code: '04', name: 'Chandigarh' },
	{ code: '05', name: 'Uttarakhand' },
	{ code: '06', name: 'Haryana' },
	{ code: '07', name: 'Delhi' },
	{ code: '08', name: 'Rajasthan' },
	{ code: '09', name: 'Uttar Pradesh' },
	{ code: '10', name: 'Bihar' },
	{ code: '11', name: 'Sikkim' },
	{ code: '12', name: 'Arunachal Pradesh' },
	{ code: '13', name: 'Nagaland' },
	{ code: '14', name: 'Manipur' },
	{ code: '15', name: 'Mizoram' },
	{ code: '16', name: 'Tripura' },
	{ code: '17', name: 'Meghalaya' },
	{ code: '18', name: 'Assam' },
	{ code: '19', name: 'West Bengal' },
	{ code: '20', name: 'Jharkhand' },
	{ code: '21', name: 'Odisha' },
	{ code: '22', name: 'Chhattisgarh' },
	{ code: '23', name: 'Madhya Pradesh' },
	{ code: '24', name: 'Gujarat' },
	{ code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
	{ code: '27', name: 'Maharashtra' },
	{ code: '29', name: 'Karnataka' },
	{ code: '30', name: 'Goa' },
	{ code: '31', name: 'Lakshadweep' },
	{ code: '32', name: 'Kerala' },
	{ code: '33', name: 'Tamil Nadu' },
	{ code: '34', name: 'Puducherry' },
	{ code: '35', name: 'Andaman & Nicobar Islands' },
	{ code: '36', name: 'Telangana' },
	{ code: '37', name: 'Andhra Pradesh' },
	{ code: '38', name: 'Ladakh' },
	{ code: '97', name: 'Other Territory' },
];

export const stateName = (code: string) => STATES.find((s) => s.code === code)?.name ?? '';

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const ITEM_UNITS = ['pcs', 'nos', 'set', 'box', 'kg', 'g', 'ltr', 'm', 'sq ft', 'hrs', 'days', 'service'];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatINR = (n: number) => inr.format(Number.isFinite(n) ? n : 0);
export const formatNumber = (n: number) => num.format(Number.isFinite(n) ? n : 0);

export function formatQty(n: number): string {
	if (!Number.isFinite(n)) return '0';
	return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
	if (n < 20) return ONES[n];
	return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function threeDigits(n: number): string {
	const h = Math.floor(n / 100);
	const rest = n % 100;
	return (h ? ONES[h] + ' Hundred' + (rest ? ' ' : '') : '') + (rest ? twoDigits(rest) : '');
}

/** Integer to words using the Indian numbering system (thousand, lakh, crore). */
export function integerToWords(n: number): string {
	if (!Number.isFinite(n) || n < 0) return '';
	n = Math.floor(n);
	if (n === 0) return 'Zero';
	const parts: string[] = [];
	const crore = Math.floor(n / 1e7);
	n %= 1e7;
	const lakh = Math.floor(n / 1e5);
	n %= 1e5;
	const thousand = Math.floor(n / 1e3);
	n %= 1e3;
	if (crore) parts.push(integerToWords(crore) + ' Crore');
	if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
	if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
	if (n) parts.push(threeDigits(n));
	return parts.join(' ');
}

export function amountInWords(amount: number): string {
	if (!Number.isFinite(amount) || amount < 0) return '';
	const rupees = Math.floor(amount);
	const paise = Math.round((amount - rupees) * 100);
	let out = `Rupees ${integerToWords(rupees)}`;
	if (paise) out += ` and ${integerToWords(paise)} Paise`;
	return `${out} Only`;
}

/** Indian financial year label for a date, e.g. 2026-27. */
export function financialYear(date: Date): string {
	const y = date.getFullYear();
	const startYear = date.getMonth() >= 3 ? y : y - 1;
	return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function formatDateIN(iso: string): string {
	if (!iso) return '';
	const d = new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayISO(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
