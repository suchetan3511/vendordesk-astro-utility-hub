/**
 * Paper bag die-line engine.
 *
 * All geometry is computed in millimetres. The flat sheet is laid out as
 *   [ FRONT ][ GUSSET ][ BACK ][ GUSSET ][ GLUE FLAP ]
 * with a top hem (turn-over) above the panels and a base fold zone below them.
 * Nothing here touches the network: it runs entirely in the visitor's browser.
 */

export type BagStyle = 'luxury' | 'rustic';
export type Unit = 'mm' | 'in';

export interface Material {
	id: string;
	label: string;
	short: string;
	gsm: string;
	/** Caliper in millimetres. */
	thickness: number;
	note: string;
}

export const MATERIALS: Material[] = [
	{
		id: 'kraft',
		label: 'Standard kraft paper',
		short: 'kraft paper',
		gsm: '90–120 gsm',
		thickness: 0.13,
		note: 'Everyday carry bags, bakery and grocery bags.',
	},
	{
		id: 'art',
		label: 'Coated art paper',
		short: 'coated art paper',
		gsm: '150–170 gsm',
		thickness: 0.17,
		note: 'Full-colour print, boutique and gifting bags.',
	},
	{
		id: 'card',
		label: 'Card stock',
		short: 'card stock',
		gsm: '250–300 gsm',
		thickness: 0.3,
		note: 'Rigid luxury bags with rope or ribbon handles.',
	},
	{
		id: 'grain',
		label: 'Bajra / Jau inner lining (grain-lined kraft)',
		short: 'a bajra/jau grain inner lining',
		gsm: '120 gsm kraft + food-safe grain lining',
		thickness: 0.55,
		note: 'Flour, millet and grain bags. The laminated lining adds bulk at every fold, so allowances and bleed grow.',
	},
];

export interface StyleSpec {
	label: string;
	tagline: string;
	topHem: number;
	bottomOverlap: number;
	glueFlap: number;
	handles: string;
}

export const STYLES: Record<BagStyle, StyleSpec> = {
	luxury: {
		label: 'Luxury fold',
		tagline: 'Turned-over top hem, reinforced base, eyelet marks for rope handles.',
		topHem: 40,
		bottomOverlap: 25,
		glueFlap: 20,
		handles: 'Eyelet positions for rope or ribbon handles',
	},
	rustic: {
		label: 'Rustic fold',
		tagline: 'Slim turnover, economical base overlap, glue patches for twisted paper handles.',
		topHem: 25,
		bottomOverlap: 18,
		glueFlap: 15,
		handles: 'Glue patches for twisted paper handles',
	},
};

export interface DielineInput {
	height: number;
	width: number;
	gusset: number;
	style: BagStyle;
	materialId: string;
	glueFlap: number;
	baseBleed: number;
	showSticker: boolean;
	showHandles: boolean;
	showLabels: boolean;
}

export interface Preset {
	id: string;
	label: string;
	hint: string;
	values: Pick<DielineInput, 'height' | 'width' | 'gusset' | 'style' | 'materialId'>;
}

export const PRESETS: Preset[] = [
	{ id: 'boutique', label: 'Boutique carry', hint: '250 × 350 × 100 · luxury · art paper', values: { width: 250, height: 350, gusset: 100, style: 'luxury', materialId: 'art' } },
	{ id: 'bakery', label: 'Bakery', hint: '200 × 280 × 90 · rustic · kraft', values: { width: 200, height: 280, gusset: 90, style: 'rustic', materialId: 'kraft' } },
	{ id: 'grain', label: 'Flour / grain 2 kg', hint: '180 × 340 × 100 · rustic · grain-lined', values: { width: 180, height: 340, gusset: 100, style: 'rustic', materialId: 'grain' } },
];

export const DEFAULT_INPUT: DielineInput = {
	height: 350,
	width: 250,
	gusset: 100,
	style: 'luxury',
	materialId: 'art',
	glueFlap: STYLES.luxury.glueFlap,
	baseBleed: 3,
	showSticker: true,
	showHandles: true,
	showLabels: true,
};

export const LIMITS = { min: 30, max: 1500, glueMin: 8, glueMax: 60, bleedMin: 0, bleedMax: 10 };

const PARENT_SHEETS = [
	{ id: 'imperial', label: '25 × 36 in', w: 635, h: 914.4 },
	{ id: 'metric', label: '700 × 1000 mm', w: 700, h: 1000 },
];

export interface DielineResult {
	material: Material;
	thickness: number;
	foldAllowance: number;
	perFold: number;
	glueFlap: number;
	topHem: number;
	baseZone: number;
	bleed: number;
	x: { front: number; gusset1: number; back: number; gusset2: number; flapEnd: number };
	yTop: number;
	yBottom: number;
	flatWidth: number;
	flatHeight: number;
	areaMm2: number;
	areaSqIn: number;
	areaSqCm: number;
	yields: { label: string; count: number }[];
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const mmToIn = (mm: number) => mm / 25.4;
export const inToMm = (inch: number) => inch * 25.4;

export function fmt(n: number, decimals = 1): string {
	const fixed = n.toFixed(decimals);
	return fixed.replace(/\.?0+$/, '');
}

const NBSP = ' ';

export function fmtUnit(mm: number, unit: Unit): string {
	return unit === 'mm' ? `${fmt(mm, 1)}${NBSP}mm` : `${fmt(mmToIn(mm), 2)}${NBSP}in`;
}

/** Query-string representation of the bag spec so a die-line can be shared by link. */
export function toSearchParams(input: DielineInput, unit: Unit): URLSearchParams {
	const p = new URLSearchParams();
	p.set('w', fmt(input.width));
	p.set('h', fmt(input.height));
	p.set('g', fmt(input.gusset));
	p.set('s', input.style);
	p.set('m', input.materialId);
	if (unit === 'in') p.set('u', 'in');
	return p;
}

export function fromSearchParams(search: string): Partial<DielineInput> & { unit?: Unit } {
	const p = new URLSearchParams(search);
	const out: Partial<DielineInput> & { unit?: Unit } = {};
	const num = (key: string) => {
		const v = Number(p.get(key));
		return Number.isFinite(v) && v > 0 ? v : undefined;
	};
	const w = num('w');
	const h = num('h');
	const g = num('g');
	if (w) out.width = w;
	if (h) out.height = h;
	if (g) out.gusset = g;
	const s = p.get('s');
	if (s === 'luxury' || s === 'rustic') {
		out.style = s;
		out.glueFlap = STYLES[s].glueFlap;
	}
	const m = p.get('m');
	if (m && MATERIALS.some((x) => x.id === m)) out.materialId = m;
	if (p.get('u') === 'in') out.unit = 'in';
	return out;
}

export function findMaterial(id: string): Material {
	return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}

export function computeDieline(input: DielineInput): DielineResult {
	const material = findMaterial(input.materialId);
	const t = material.thickness;
	const style = STYLES[input.style];

	const W = clamp(input.width, LIMITS.min, LIMITS.max);
	const H = clamp(input.height, LIMITS.min, LIMITS.max);
	const G = clamp(input.gusset, LIMITS.min, LIMITS.max);
	const glue = clamp(input.glueFlap, LIMITS.glueMin, LIMITS.glueMax);

	// Each fold "consumes" material as the outer skin wraps around the crease.
	const perFold = 1.5 * t;
	const verticalFolds = 7; // 4 panel folds + 2 gusset centre folds + glue flap fold
	const foldAllowance = verticalFolds * perFold;

	const front = W + perFold;
	const gusset1 = front + G + perFold;
	const back = gusset1 + W + perFold;
	const gusset2 = back + G + perFold;
	const flapEnd = gusset2 + glue;

	const topHem = style.topHem + perFold;
	const baseZone = G / 2 + style.bottomOverlap + perFold;
	const yTop = topHem;
	const yBottom = yTop + H;
	const flatWidth = flapEnd;
	const flatHeight = yBottom + baseZone;

	// Thicker stock wraps further around every fold, so printed art must run out further.
	const bleed = Math.round((input.baseBleed + 4 * t) * 10) / 10;

	const areaMm2 = flatWidth * flatHeight;

	const fw = flatWidth + 2 * bleed;
	const fh = flatHeight + 2 * bleed;
	const yields = PARENT_SHEETS.map((s) => {
		const upright = Math.floor(s.w / fw) * Math.floor(s.h / fh);
		const rotated = Math.floor(s.w / fh) * Math.floor(s.h / fw);
		return { label: s.label, count: Math.max(upright, rotated) };
	});

	return {
		material,
		thickness: t,
		foldAllowance,
		perFold,
		glueFlap: glue,
		topHem,
		baseZone,
		bleed,
		x: { front, gusset1, back, gusset2, flapEnd },
		yTop,
		yBottom,
		flatWidth,
		flatHeight,
		areaMm2,
		areaSqIn: areaMm2 / 645.16,
		areaSqCm: areaMm2 / 100,
		yields,
	};
}

/* ------------------------------------------------------------------------- */
/* SVG rendering                                                              */
/* ------------------------------------------------------------------------- */

const INK = {
	cut: '#e10098',
	fold: '#16a34a',
	bleed: '#0a84ff',
	sticker: '#f59e0b',
	label: '#6e6e73',
	dim: '#1d1d1f',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => Number(v.toFixed(3)).toString();

interface RenderOptions {
	unit: Unit;
	/** Adds the title block and “generated with” credit (used for downloads). */
	forExport?: boolean;
}

export function renderSvg(input: DielineInput, r: DielineResult, opts: RenderOptions): string {
	const style = STYLES[input.style];
	const { x, yTop, yBottom, flatWidth: FW, flatHeight: FH, bleed } = r;
	const G = x.gusset1 - x.front; // gusset panel width incl. allowance
	const W = x.front - r.perFold;
	const unit = opts.unit;

	const fs = clamp(FW / 70, 3.2, 6.5); // label font size in mm
	const showLabels = input.showLabels;
	const margin = showLabels ? Math.max(bleed + 6, fs * 5.5) : bleed + 4;
	const headerSpace = opts.forExport && showLabels ? fs * 4.5 : 0;
	const vbX = -margin;
	const vbY = -margin - headerSpace;
	const vbW = FW + margin * 2 + (showLabels ? fs * 2 : 0);
	const vbH = FH + margin * 2 + headerSpace + (opts.forExport && showLabels ? fs * 3 : 0);

	const parts: string[] = [];
	const title = `${style.label} paper bag die-line — ${fmt(W)} × ${fmt(yBottom - yTop)} × ${fmt(G - r.perFold)} mm`;

	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${n(vbW)}mm" height="${n(vbH)}mm" viewBox="${n(vbX)} ${n(vbY)} ${n(vbW)} ${n(vbH)}" font-family="Inter, 'Inter Variable', Helvetica, Arial, sans-serif" role="img" aria-labelledby="vd-title">`,
	);
	parts.push(`<title id="vd-title">${esc(title)}</title>`);
	parts.push(
		`<desc>Flat sheet ${fmt(FW)} × ${fmt(FH)} mm. Material: ${esc(r.material.label)} (${fmt(r.thickness, 2)} mm). Structural bleed ${fmt(bleed)} mm. Magenta = cut, green dashed = fold, blue dashed = bleed, amber = seamless sticker layout.</desc>`,
	);

	if (opts.forExport) {
		parts.push(`<rect x="${n(vbX)}" y="${n(vbY)}" width="${n(vbW)}" height="${n(vbH)}" fill="#ffffff"/>`);
	}

	// Bleed outline
	parts.push(
		`<g id="bleed" fill="none" stroke="${INK.bleed}" stroke-width="0.25" stroke-dasharray="1.4 0.9"><rect x="${n(-bleed)}" y="${n(-bleed)}" width="${n(FW + 2 * bleed)}" height="${n(FH + 2 * bleed)}" rx="${n(bleed)}"/></g>`,
	);

	// Seamless sticker layout
	if (input.showSticker) {
		const seam = clamp(r.glueFlap * 0.5, 6, 12);
		const bandX = 0;
		const bandY = yTop - bleed;
		const bandW = x.gusset2 + seam;
		const bandH = yBottom - yTop + 2 * bleed;
		parts.push(`<g id="sticker" fill="none" stroke="${INK.sticker}" stroke-width="0.3">`);
		parts.push(`<rect x="${n(bandX)}" y="${n(bandY)}" width="${n(bandW)}" height="${n(bandH)}" stroke-dasharray="3 1 0.6 1"/>`);
		// Seam overlap hatch
		parts.push(
			`<rect x="${n(x.gusset2)}" y="${n(bandY)}" width="${n(seam)}" height="${n(bandH)}" fill="${INK.sticker}" fill-opacity="0.14" stroke="none"/>`,
		);
		// Blend zones around each vertical fold inside the band
		for (const fx of [x.front, x.gusset1, x.back, x.gusset2]) {
			parts.push(
				`<rect x="${n(fx - bleed)}" y="${n(bandY)}" width="${n(bleed * 2)}" height="${n(bandH)}" fill="${INK.sticker}" fill-opacity="0.08" stroke="none"/>`,
			);
		}
		if (showLabels) {
			const ly = bandY - fs * 0.6;
			parts.push(
				`<text x="${n(bandX)}" y="${n(ly)}" font-size="${n(fs * 0.85)}" fill="${INK.sticker}" font-weight="600" letter-spacing="0.3">SEAMLESS STICKER BAND ${fmt(bandW)} × ${fmt(bandH)} mm · seam overlap ${fmt(seam)} mm at glue flap</text>`,
			);
		}
		parts.push('</g>');
	}

	// Fold lines
	parts.push(`<g id="fold" fill="none" stroke="${INK.fold}" stroke-width="0.3" stroke-dasharray="2.2 1.4">`);
	for (const fx of [x.front, x.gusset1, x.back, x.gusset2]) parts.push(`<path d="M${n(fx)} 0V${n(FH)}"/>`);
	parts.push(`<path d="M0 ${n(yTop)}H${n(FW)}"/>`);
	parts.push(`<path d="M0 ${n(yBottom)}H${n(FW)}"/>`);
	parts.push(`<path d="M0 ${n(yBottom + G / 2)}H${n(FW)}"/>`);
	parts.push('</g>');
	// Gusset centre creases + base diamonds
	parts.push(`<g id="crease" fill="none" stroke="${INK.fold}" stroke-width="0.25" stroke-dasharray="0.8 1.2">`);
	for (const [gx0, gx1] of [
		[x.front, x.gusset1],
		[x.back, x.gusset2],
	]) {
		const cx = (gx0 + gx1) / 2;
		parts.push(`<path d="M${n(cx)} 0V${n(FH)}"/>`);
		parts.push(`<path d="M${n(gx0)} ${n(yBottom)}L${n(cx)} ${n(yBottom + G / 2)}L${n(gx1)} ${n(yBottom)}"/>`);
	}
	parts.push('</g>');

	// Handle marks
	if (input.showHandles) {
		const offsets = [0.25, 0.75];
		parts.push(`<g id="handles" fill="none" stroke="${INK.cut}" stroke-width="0.3">`);
		for (const px of [0, x.gusset1]) {
			for (const o of offsets) {
				const hx = px + W * o;
				if (input.style === 'luxury') {
					parts.push(`<circle cx="${n(hx)}" cy="${n(yTop / 2)}" r="3"/>`);
					parts.push(`<path d="M${n(hx - 1.2)} ${n(yTop / 2)}h2.4M${n(hx)} ${n(yTop / 2 - 1.2)}v2.4" stroke-width="0.2"/>`);
				} else {
					const pw = Math.min(36, W * 0.3);
					const ph = 14;
					parts.push(
						`<rect x="${n(hx - pw / 2)}" y="${n(yTop + 6)}" width="${n(pw)}" height="${n(ph)}" rx="1.5" stroke-dasharray="1.2 0.8" stroke="${INK.fold}"/>`,
					);
				}
			}
		}
		parts.push('</g>');
	}

	// Cut outline (chamfered glue flap)
	const c = Math.min(6, r.glueFlap * 0.4);
	parts.push(
		`<g id="cut" fill="none" stroke="${INK.cut}" stroke-width="0.35" stroke-linejoin="round"><path d="M0 0H${n(FW - c)}L${n(FW)} ${n(c)}V${n(FH - c)}L${n(FW - c)} ${n(FH)}H0Z"/></g>`,
	);

	// Labels & dimensions
	if (showLabels) {
		const midY = (yTop + yBottom) / 2;
		const label = (tx: number, ty: number, text: string, opt: { size?: number; rotate?: boolean; weight?: number; fill?: string } = {}) => {
			const size = opt.size ?? fs;
			const transform = opt.rotate ? ` transform="rotate(-90 ${n(tx)} ${n(ty)})"` : '';
			return `<text x="${n(tx)}" y="${n(ty)}" font-size="${n(size)}" fill="${opt.fill ?? INK.label}" font-weight="${opt.weight ?? 500}" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.25"${transform}>${esc(text)}</text>`;
		};
		parts.push(`<g id="labels">`);
		const panelText = (name: string, w: number) => `${name} · ${fmt(w)} × ${fmt(yBottom - yTop)}`;
		parts.push(label(x.front / 2, midY, panelText('FRONT', W)));
		parts.push(label((x.gusset1 + x.back) / 2, midY, panelText('BACK', W)));
		const gussetLabel = `GUSSET · ${fmt(G - r.perFold)}`;
		const narrowGusset = G < fs * 9;
		parts.push(label((x.front + x.gusset1) / 2, midY, gussetLabel, { rotate: narrowGusset }));
		parts.push(label((x.back + x.gusset2) / 2, midY, gussetLabel, { rotate: narrowGusset }));
		parts.push(label((x.gusset2 + FW) / 2, midY, `GLUE ${fmt(r.glueFlap)}`, { rotate: true, size: fs * 0.85 }));
		parts.push(label(FW / 2, yTop / 2, `TOP HEM / TURNOVER · ${fmt(r.topHem)} mm`, { size: fs * 0.85 }));
		parts.push(label(FW / 2, yBottom + G / 2 + (FH - yBottom - G / 2) / 2, `BASE FOLD ZONE · ${fmt(r.baseZone)} mm (${fmt(G / 2)} + ${fmt(STYLES[input.style].bottomOverlap)} overlap)`, { size: fs * 0.85 }));

		// Dimension lines
		const dy = FH + margin * 0.55;
		const dx = FW + margin * 0.55;
		parts.push(`<g stroke="${INK.dim}" stroke-width="0.2" fill="none">`);
		parts.push(`<path d="M0 ${n(dy)}H${n(FW)}M0 ${n(dy - 1.5)}v3M${n(FW)} ${n(dy - 1.5)}v3"/>`);
		parts.push(`<path d="M${n(dx)} 0V${n(FH)}M${n(dx - 1.5)} 0h3M${n(dx - 1.5)} ${n(FH)}h3"/>`);
		parts.push('</g>');
		const dimText = (mm: number) => (unit === 'mm' ? `${fmt(mm)} mm (${fmt(mmToIn(mm), 2)} in)` : `${fmt(mmToIn(mm), 2)} in (${fmt(mm)} mm)`);
		parts.push(label(FW / 2, dy + fs * 1.1, `FLAT SHEET WIDTH ${dimText(FW)}`, { fill: INK.dim, weight: 600, size: fs * 0.9 }));
		parts.push(label(dx + fs * 1.1, FH / 2, `FLAT SHEET HEIGHT ${dimText(FH)}`, { fill: INK.dim, weight: 600, size: fs * 0.9, rotate: true }));

		if (opts.forExport) {
			const ty = -margin - headerSpace + fs * 1.6;
			parts.push(
				`<text x="0" y="${n(ty)}" font-size="${n(fs * 1.25)}" fill="${INK.dim}" font-weight="600" letter-spacing="-0.2">${esc(title)}</text>`,
			);
			parts.push(
				`<text x="0" y="${n(ty + fs * 1.6)}" font-size="${n(fs * 0.85)}" fill="${INK.label}">${esc(`${r.material.label} · ${fmt(r.thickness, 2)} mm caliper · structural bleed ${fmt(bleed)} mm · 1:1 scale`)}</text>`,
			);
			const legendY = ty + fs * 3;
			const legend: [string, string][] = [
				['CUT', INK.cut],
				['FOLD / CREASE', INK.fold],
				['BLEED', INK.bleed],
				['STICKER LAYOUT', INK.sticker],
			];
			let lx = 0;
			for (const [name, color] of legend) {
				parts.push(`<path d="M${n(lx)} ${n(legendY)}h${n(fs * 2)}" stroke="${color}" stroke-width="0.5"/>`);
				parts.push(`<text x="${n(lx + fs * 2.4)}" y="${n(legendY)}" font-size="${n(fs * 0.75)}" fill="${INK.label}" dominant-baseline="middle" letter-spacing="0.3">${name}</text>`);
				lx += fs * (3.2 + name.length * 0.55);
			}
			parts.push(
				`<text x="${n(FW)}" y="${n(FH + margin + fs * 2.2)}" font-size="${n(fs * 0.7)}" fill="${INK.label}" text-anchor="end">Generated with vendordesk.in · verify with a physical mock-up before production</text>`,
			);
		}
		parts.push('</g>');
	}

	parts.push('</svg>');
	return parts.join('');
}

/* ------------------------------------------------------------------------- */
/* Dynamic copy                                                               */
/* ------------------------------------------------------------------------- */

export function dynamicSummary(input: DielineInput, r: DielineResult, unit: Unit): { primary: string; secondary: string } {
	const style = STYLES[input.style].label.replace(' fold', '');
	const dims = unit === 'mm'
		? `${fmt(input.height)}x${fmt(input.width)}x${fmt(input.gusset)} mm`
		: `${fmt(mmToIn(input.height), 2)}x${fmt(mmToIn(input.width), 2)}x${fmt(mmToIn(input.gusset), 2)} in`;
	const primary = `For a ${style} bag with dimensions ${dims}, your total flat sheet requirement is ${fmt(r.areaSqIn, 1)} square inches. If using ${r.material.short}, ensure your seamless sticker layout accounts for ${fmt(r.bleed)}mm of structural bleed.`;
	const best = r.yields.reduce((a, b) => (b.count > a.count ? b : a));
	const secondary = `That is a ${fmtUnit(r.flatWidth, unit)} × ${fmtUnit(r.flatHeight, unit)} flat sheet (${fmt(r.areaSqCm, 0)} cm²), made up of a ${fmt(r.glueFlap)} mm glue flap, a ${fmt(r.topHem)} mm top hem and a ${fmt(r.baseZone)} mm base fold zone, plus ${fmt(r.foldAllowance, 1)} mm of fold allowance for ${fmt(r.thickness, 2)} mm stock. Nested with bleed, a ${best.label} parent sheet yields about ${best.count} bag${best.count === 1 ? '' : 's'}.`;
	return { primary, secondary };
}

export function summaryText(input: DielineInput, r: DielineResult, unit: Unit): string {
	const { primary, secondary } = dynamicSummary(input, r, unit);
	return [
		`VendorDesk paper bag die-line`,
		`Bag (H × W × G): ${fmtUnit(input.height, unit)} × ${fmtUnit(input.width, unit)} × ${fmtUnit(input.gusset, unit)}`,
		`Style: ${STYLES[input.style].label} · Material: ${r.material.label} (${fmt(r.thickness, 2)} mm)`,
		`Flat sheet: ${fmtUnit(r.flatWidth, unit)} × ${fmtUnit(r.flatHeight, unit)} · ${fmt(r.areaSqIn, 1)} sq in · ${fmt(r.areaSqCm, 0)} cm²`,
		`Glue flap ${fmt(r.glueFlap)} mm · Top hem ${fmt(r.topHem)} mm · Base zone ${fmt(r.baseZone)} mm · Fold allowance ${fmt(r.foldAllowance, 1)} mm`,
		`Structural bleed: ${fmt(r.bleed)} mm`,
		`Yield: ${r.yields.map((y) => `${y.count} from ${y.label}`).join(' · ')}`,
		'',
		primary,
		secondary,
		'',
		`https://vendordesk.in/paper-bag-die-line-generator?${toSearchParams(input, unit).toString()}`,
	].join('\n');
}

/* ------------------------------------------------------------------------- */
/* DOM wiring                                                                 */
/* ------------------------------------------------------------------------- */

const STORAGE_KEY = 'vd-dieline-v1';

interface Persisted extends DielineInput {
	unit: Unit;
}

function readPersisted(): Partial<Persisted> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
	} catch {
		return {};
	}
}

function persist(state: Persisted) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {}
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function initDielineTool(root: HTMLElement) {
	const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
	const $$ = <T extends HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

	const inputs = {
		height: $<HTMLInputElement>('#height')!,
		width: $<HTMLInputElement>('#width')!,
		gusset: $<HTMLInputElement>('#gusset')!,
		material: $<HTMLSelectElement>('#material')!,
		glue: $<HTMLInputElement>('#glue')!,
		bleed: $<HTMLInputElement>('#bleed')!,
		sticker: $<HTMLInputElement>('#show-sticker')!,
		handles: $<HTMLInputElement>('#show-handles')!,
		labels: $<HTMLInputElement>('#show-labels')!,
	};
	const preview = $('#preview')!;
	const status = $('#tool-status')!;
	const dynamicPrimary = $('#dynamic-primary')!;
	const dynamicSecondary = $('#dynamic-secondary')!;
	const errorBox = $('#form-error')!;
	const unitButtons = $$<HTMLButtonElement>('[data-unit]');
	const styleButtons = $$<HTMLButtonElement>('[data-style]');
	const presetButtons = $$<HTMLButtonElement>('[data-preset]');
	const unitLabels = $$('[data-unit-label]');
	const outs = $$('[data-out]');

	root.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());

	// A shared link wins over what this browser remembers.
	const fromUrl = fromSearchParams(location.search);
	const saved = fromUrl.width || fromUrl.height || fromUrl.gusset ? fromUrl : readPersisted();
	let unit: Unit = saved.unit === 'in' ? 'in' : 'mm';
	let state: DielineInput = { ...DEFAULT_INPUT, ...saved };
	delete (state as Partial<Persisted>).unit;
	let lastSvg = '';
	let lastResult: DielineResult | null = null;
	let interacted = false;

	function syncUrl() {
		if (!interacted) return;
		try {
			history.replaceState(null, '', `${location.pathname}?${toSearchParams(state, unit).toString()}`);
		} catch {}
	}

	const toDisplay = (mm: number) => (unit === 'mm' ? fmt(mm, 1) : fmt(mmToIn(mm), 2));
	const fromDisplay = (v: number) => (unit === 'mm' ? v : inToMm(v));

	function syncInputsFromState() {
		inputs.height.value = toDisplay(state.height);
		inputs.width.value = toDisplay(state.width);
		inputs.gusset.value = toDisplay(state.gusset);
		inputs.material.value = state.materialId;
		inputs.glue.value = fmt(state.glueFlap, 1);
		inputs.bleed.value = fmt(state.baseBleed, 1);
		inputs.sticker.checked = state.showSticker;
		inputs.handles.checked = state.showHandles;
		inputs.labels.checked = state.showLabels;
		for (const el of [inputs.height, inputs.width, inputs.gusset]) {
			el.step = unit === 'mm' ? '1' : '0.05';
			el.min = toDisplay(LIMITS.min);
			el.max = toDisplay(LIMITS.max);
			el.inputMode = 'decimal';
		}
		unitLabels.forEach((el) => (el.textContent = unit));
		unitButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.unit === unit)));
		styleButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === state.style)));
		presetButtons.forEach((b) => {
			const p = PRESETS.find((p) => p.id === b.dataset.preset);
			const active =
				!!p &&
				p.values.width === state.width &&
				p.values.height === state.height &&
				p.values.gusset === state.gusset &&
				p.values.style === state.style &&
				p.values.materialId === state.materialId;
			b.setAttribute('aria-pressed', String(active));
		});
	}

	function validate(): string | null {
		const vals = [
			['Height', state.height],
			['Width', state.width],
			['Gusset', state.gusset],
		] as const;
		for (const [name, v] of vals) {
			if (!Number.isFinite(v)) return `${name} must be a number.`;
			if (v < LIMITS.min || v > LIMITS.max) return `${name} must be between ${fmtUnit(LIMITS.min, unit)} and ${fmtUnit(LIMITS.max, unit)}.`;
		}
		if (state.gusset > state.width * 1.5) return 'Gusset is unusually large for this width — bags normally use a gusset of 25–60% of the width.';
		return null;
	}

	function setOut(key: string, value: string) {
		outs.filter((el) => el.dataset.out === key).forEach((el) => (el.textContent = value));
	}

	function render() {
		const error = validate();
		errorBox.textContent = error ?? '';
		errorBox.hidden = !error;
		[inputs.height, inputs.width, inputs.gusset].forEach((el) => el.setAttribute('aria-invalid', String(!!error)));
		if (error) return;

		const r = computeDieline(state);
		lastResult = r;
		lastSvg = renderSvg(state, r, { unit });
		preview.innerHTML = lastSvg;
		const svg = preview.querySelector('svg');
		if (svg) {
			svg.removeAttribute('width');
			svg.removeAttribute('height');
			svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		}

		setOut('flatW', fmtUnit(r.flatWidth, unit));
		setOut('flatH', fmtUnit(r.flatHeight, unit));
		setOut('flatWAlt', unit === 'mm' ? `${fmt(mmToIn(r.flatWidth), 2)} in` : `${fmt(r.flatWidth)} mm`);
		setOut('flatHAlt', unit === 'mm' ? `${fmt(mmToIn(r.flatHeight), 2)} in` : `${fmt(r.flatHeight)} mm`);
		setOut('areaIn', `${fmt(r.areaSqIn, 1)}${NBSP}sq${NBSP}in`);
		setOut('areaCm', `${fmt(r.areaSqCm, 0)}${NBSP}cm²`);
		setOut('bleed', `${fmt(r.bleed)}${NBSP}mm`);
		setOut('thickness', `${fmt(r.thickness, 2)}${NBSP}mm`);
		setOut('foldAllow', `${fmt(r.foldAllowance, 1)}${NBSP}mm`);
		setOut('topHem', `${fmt(r.topHem)}${NBSP}mm`);
		setOut('baseZone', `${fmt(r.baseZone)}${NBSP}mm`);
		setOut('glue', `${fmt(r.glueFlap)}${NBSP}mm`);
		const bags = (count: number) => `${count} ${count === 1 ? 'bag' : 'bags'}`;
		setOut('yield1', bags(r.yields[0].count));
		setOut('yield2', bags(r.yields[1].count));
		setOut('materialNote', r.material.note);

		const copy = dynamicSummary(state, r, unit);
		dynamicPrimary.textContent = copy.primary;
		dynamicSecondary.textContent = copy.secondary;

		persist({ ...state, unit });
		syncUrl();
	}

	root.addEventListener('input', () => (interacted = true), { capture: true, once: true });
	root.addEventListener('click', () => (interacted = true), { capture: true, once: true });

	function readNumber(el: HTMLInputElement): number {
		return el.value.trim() === '' ? NaN : Number(el.value);
	}

	// Dimension inputs
	for (const [key, el] of [
		['height', inputs.height],
		['width', inputs.width],
		['gusset', inputs.gusset],
	] as const) {
		el.addEventListener('input', () => {
			state = { ...state, [key]: fromDisplay(readNumber(el)) };
			syncPresetState();
			render();
		});
	}
	inputs.material.addEventListener('change', () => {
		state = { ...state, materialId: inputs.material.value };
		syncPresetState();
		render();
	});
	inputs.glue.addEventListener('input', () => {
		state = { ...state, glueFlap: readNumber(inputs.glue) };
		render();
	});
	inputs.bleed.addEventListener('input', () => {
		state = { ...state, baseBleed: readNumber(inputs.bleed) };
		render();
	});
	inputs.sticker.addEventListener('change', () => {
		state = { ...state, showSticker: inputs.sticker.checked };
		render();
	});
	inputs.handles.addEventListener('change', () => {
		state = { ...state, showHandles: inputs.handles.checked };
		render();
	});
	inputs.labels.addEventListener('change', () => {
		state = { ...state, showLabels: inputs.labels.checked };
		render();
	});

	function syncPresetState() {
		presetButtons.forEach((b) => {
			const p = PRESETS.find((p) => p.id === b.dataset.preset);
			const active =
				!!p &&
				p.values.width === state.width &&
				p.values.height === state.height &&
				p.values.gusset === state.gusset &&
				p.values.style === state.style &&
				p.values.materialId === state.materialId;
			b.setAttribute('aria-pressed', String(active));
		});
	}

	unitButtons.forEach((b) =>
		b.addEventListener('click', () => {
			const next = b.dataset.unit === 'in' ? 'in' : 'mm';
			if (next === unit) return;
			unit = next;
			syncInputsFromState();
			render();
		}),
	);

	styleButtons.forEach((b) =>
		b.addEventListener('click', () => {
			const next = b.dataset.style === 'rustic' ? 'rustic' : 'luxury';
			state = { ...state, style: next, glueFlap: STYLES[next].glueFlap };
			syncInputsFromState();
			render();
		}),
	);

	presetButtons.forEach((b) =>
		b.addEventListener('click', () => {
			const p = PRESETS.find((p) => p.id === b.dataset.preset);
			if (!p) return;
			state = { ...state, ...p.values, glueFlap: STYLES[p.values.style].glueFlap };
			syncInputsFromState();
			render();
			announce(`Loaded the ${p.label} preset.`);
		}),
	);

	function announce(msg: string) {
		status.textContent = msg;
		window.setTimeout(() => {
			if (status.textContent === msg) status.textContent = '';
		}, 4000);
	}

	function filename(ext: string) {
		return `vendordesk-dieline-${fmt(state.width)}x${fmt(state.height)}x${fmt(state.gusset)}mm-${state.style}.${ext}`;
	}

	$('#download-svg')?.addEventListener('click', () => {
		if (!lastResult) return;
		const svg = renderSvg(state, lastResult, { unit, forExport: true });
		downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename('svg'));
		announce('SVG downloaded. Import at 1:1 — dimensions are in millimetres.');
	});

	$('#download-png')?.addEventListener('click', async () => {
		if (!lastResult) return;
		const svgMarkup = renderSvg(state, lastResult, { unit, forExport: true });
		const match = svgMarkup.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/);
		if (!match) return;
		const vbW = Number(match[3]);
		const vbH = Number(match[4]);
		const scale = Math.min(8, 4000 / Math.max(vbW, vbH));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(vbW * scale);
		canvas.height = Math.round(vbH * scale);
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }));
		const img = new Image();
		img.decoding = 'async';
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error('Could not rasterise SVG'));
			img.src = url;
		}).catch(() => announce('PNG export failed in this browser — try the SVG download instead.'));
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		URL.revokeObjectURL(url);
		canvas.toBlob((blob) => {
			if (blob) {
				downloadBlob(blob, filename('png'));
				announce(`PNG downloaded at ${canvas.width} × ${canvas.height} px.`);
			}
		}, 'image/png');
	});

	$('#copy-summary')?.addEventListener('click', async () => {
		if (!lastResult) return;
		try {
			await navigator.clipboard.writeText(summaryText(state, lastResult, unit));
			announce('Summary copied to clipboard.');
		} catch {
			announce('Clipboard is unavailable — select the summary text and copy it manually.');
		}
	});

	$('#reset-tool')?.addEventListener('click', () => {
		state = { ...DEFAULT_INPUT };
		unit = 'mm';
		syncInputsFromState();
		render();
		announce('Reset to the default boutique bag.');
	});

	syncInputsFromState();
	render();
	root.dataset.ready = 'true';
}
