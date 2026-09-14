/**
 * LTL freight classification by density.
 *
 * Two scales live here and they are not the same thing:
 *
 *  - NMFC_DENSITY_SCALE is the density provision as it stands after NMFTA's Docket 2025-1
 *    (effective 19 July 2025), which expanded the scale from 11 to 13 subprovisions. This is
 *    what the calculator returns.
 *  - LEGACY_DENSITY_CHART is the 18-row table that virtually every competing calculator and
 *    carrier marketing page still publishes. It is kept because people search for it and
 *    because showing the difference is the honest thing to do — not because it is current.
 *
 * The two agree at and above 15 lb/ft³ and diverge below it.
 *
 * Both pages and client scripts import from here, so the static HTML tables and the live
 * calculation can never drift apart.
 */

export interface DensityBand {
	/** Subprovision number in the NMFC density provision. Absent on the legacy chart. */
	sub?: number;
	/** Inclusive lower bound, lb/ft³. */
	min: number;
	/** Exclusive upper bound, lb/ft³. `null` means "or greater". */
	max: number | null;
	class: number;
}

/**
 * The current NMFC density provision — 13 subprovisions.
 *
 * Subs 11, 12 and 13 are confirmed verbatim from NMFTA's own changes FAQ: sub 11 was *amended*
 * to "30 but less than 35" at class 60, and subs 12 (35–50, class 55) and 13 (50 or greater,
 * class 50) were added. That the amendment touched only sub 11 is what establishes subs 1–10
 * as unchanged from the pre-2025 11-sub FCDC Density Guidelines.
 *
 * NOTE: subs 1–10 are reconstructed from that reasoning, not read off the primary publication
 * (nmfta.org blocks automated fetches). Confirm against the current FCDC Density Guidelines
 * before launch. If any band differs, this array is the only thing that needs to change.
 */
export const NMFC_DENSITY_SCALE: DensityBand[] = [
	{ sub: 1, min: 0, max: 1, class: 400 },
	{ sub: 2, min: 1, max: 2, class: 300 },
	{ sub: 3, min: 2, max: 4, class: 250 },
	{ sub: 4, min: 4, max: 6, class: 175 },
	{ sub: 5, min: 6, max: 8, class: 125 },
	{ sub: 6, min: 8, max: 10, class: 100 },
	{ sub: 7, min: 10, max: 12, class: 92.5 },
	{ sub: 8, min: 12, max: 15, class: 85 },
	{ sub: 9, min: 15, max: 22.5, class: 70 },
	{ sub: 10, min: 22.5, max: 30, class: 65 },
	{ sub: 11, min: 30, max: 35, class: 60 },
	{ sub: 12, min: 35, max: 50, class: 55 },
	{ sub: 13, min: 50, max: null, class: 50 },
];

/** The legacy 18-row chart. Published for reference and comparison only. */
export const LEGACY_DENSITY_CHART: DensityBand[] = [
	{ min: 0, max: 1, class: 500 },
	{ min: 1, max: 2, class: 400 },
	{ min: 2, max: 3, class: 300 },
	{ min: 3, max: 4, class: 250 },
	{ min: 4, max: 5, class: 200 },
	{ min: 5, max: 6, class: 175 },
	{ min: 6, max: 7, class: 150 },
	{ min: 7, max: 8, class: 125 },
	{ min: 8, max: 9, class: 110 },
	{ min: 9, max: 10.5, class: 100 },
	{ min: 10.5, max: 12, class: 92.5 },
	{ min: 12, max: 13.5, class: 85 },
	{ min: 13.5, max: 15, class: 77.5 },
	{ min: 15, max: 22.5, class: 70 },
	{ min: 22.5, max: 30, class: 65 },
	{ min: 30, max: 35, class: 60 },
	{ min: 35, max: 50, class: 55 },
	{ min: 50, max: null, class: 50 },
];

/** All eighteen NMFC classes, lowest (densest, cheapest) first. */
export const ALL_CLASSES = [50, 55, 60, 65, 70, 77.5, 85, 92.5, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500] as const;

/**
 * Classes that exist in the NMFC but are never produced by the density provision. They come
 * from specific commodity listings, or from stowability, handling and liability characteristics.
 * This is the single most misunderstood point about freight class, so it is data, not prose.
 */
export const NON_DENSITY_CLASSES = [77.5, 110, 150, 200, 500] as const;

export const CUBIC_INCHES_PER_CUBIC_FOOT = 1728;
export const CM_PER_INCH = 2.54;
export const KG_PER_POUND = 0.4536;

export const toInches = (cm: number) => cm / CM_PER_INCH;
export const toPounds = (kg: number) => kg / KG_PER_POUND;

/** Half-open bands: `min <= density < max`. An open-ended band matches everything above `min`. */
export function classify(density: number, scale: DensityBand[] = NMFC_DENSITY_SCALE): DensityBand {
	const band = scale.find((b) => density >= b.min && (b.max === null || density < b.max));
	// Only reachable for a negative or non-finite density, which the caller guards against.
	return band ?? scale[0];
}

/** "12 but less than 15", "50 or greater", "Less than 1" — the NMFC's own phrasing. */
export function bandLabel(band: DensityBand): string {
	if (band.max === null) return `${band.min} or greater`;
	if (band.min === 0) return `Less than ${band.max}`;
	return `${band.min} but less than ${band.max}`;
}

export type LengthUnit = 'in' | 'cm';
export type WeightUnit = 'lb' | 'kg';

export interface FreightInput {
	length: number;
	width: number;
	height: number;
	/** Total weight of the whole shipment, not per piece. */
	weight: number;
	pieces: number;
	lengthUnit: LengthUnit;
	weightUnit: WeightUnit;
}

export interface FreightResult {
	/** Dimensions normalised to inches, whatever the user typed. */
	inches: { length: number; width: number; height: number };
	/** Total shipment weight in pounds. */
	pounds: number;
	pieces: number;
	cubicInches: number;
	cubicFeet: number;
	density: number;
	/** Density formatted for display — see `formatDensity`. */
	densityLabel: string;
	nmfc: DensityBand;
	legacy: DensityBand;
	/** True when the two scales disagree, which is the interesting case worth explaining. */
	scalesDiffer: boolean;
	/** One-line summary suitable for pasting onto a bill of lading. */
	summary: string;
}

const round = (value: number, places: number) => {
	const factor = 10 ** places;
	return Math.round(value * factor) / factor;
};

/**
 * One decimal place, as the brief asks — except where that would round the number across a band
 * boundary and print a density that appears to contradict the class beside it (11.97 lb/ft³ is
 * class 92.5, but "12.0 lb/ft³" reads like class 85). In that case show two places.
 */
export function formatDensity(density: number, band: DensityBand): string {
	const oneDp = round(density, 1);
	const insideBand = oneDp >= band.min && (band.max === null || oneDp < band.max);
	return insideBand ? oneDp.toFixed(1) : density.toFixed(2);
}

const trimNumber = (value: number) => String(round(value, 2));

export function computeDensity(input: FreightInput): FreightResult | null {
	const { lengthUnit, weightUnit } = input;
	const convertLength = lengthUnit === 'cm' ? toInches : (v: number) => v;
	const convertWeight = weightUnit === 'kg' ? toPounds : (v: number) => v;

	const length = convertLength(input.length);
	const width = convertLength(input.width);
	const height = convertLength(input.height);
	const pounds = convertWeight(input.weight);
	const pieces = Math.floor(input.pieces);

	const valid = [length, width, height, pounds].every((v) => Number.isFinite(v) && v > 0) && Number.isFinite(pieces) && pieces > 0;
	if (!valid) return null;

	const cubicInches = length * width * height * pieces;
	const cubicFeet = cubicInches / CUBIC_INCHES_PER_CUBIC_FOOT;
	const density = pounds / cubicFeet;
	if (!Number.isFinite(density) || density <= 0) return null;

	const nmfc = classify(density, NMFC_DENSITY_SCALE);
	const legacy = classify(density, LEGACY_DENSITY_CHART);
	const densityLabel = formatDensity(density, nmfc);

	const pieceLabel = pieces === 1 ? '1 piece' : `${pieces} pieces`;
	const dims = `${trimNumber(input.length)}x${trimNumber(input.width)}x${trimNumber(input.height)} ${lengthUnit}`;
	const summary = `${dims}, ${trimNumber(input.weight)} ${weightUnit}, ${pieceLabel} — ${round(cubicFeet, 1).toFixed(1)} ft³ — ${densityLabel} lb/ft³ — Class ${nmfc.class}`;

	return {
		inches: { length: round(length, 2), width: round(width, 2), height: round(height, 2) },
		pounds: round(pounds, 2),
		pieces,
		cubicInches: round(cubicInches, 1),
		cubicFeet: round(cubicFeet, 1),
		density,
		densityLabel,
		nmfc,
		legacy,
		scalesDiffer: nmfc.class !== legacy.class,
		summary,
	};
}

export const DEFAULT_FREIGHT_INPUT: FreightInput = {
	length: 48,
	width: 40,
	height: 60,
	weight: 850,
	pieces: 1,
	lengthUnit: 'in',
	weightUnit: 'lb',
};
