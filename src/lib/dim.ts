/**
 * Dimensional ("DIM") weight and billable weight for parcel carriers.
 *
 * A bare divisor is not enough to get this right any more. Two carrier rules changed recently
 * and both move the answer:
 *
 *  1. Round-up is now universal. FedEx began rounding every fractional dimension up to the next
 *     whole inch on 18 August 2025 and UPS matched; USPS joined on 12 July 2026. A calculator
 *     that multiplies raw decimals under-reports.
 *  2. USPS applies DIM only above one cubic foot. From 12 July 2026 the USPS divisor dropped
 *     166 → 139 for Priority Mail Express, Priority Mail, Ground Advantage and Parcel Select —
 *     but only for packages *larger than* 1,728 in³. At or below that, USPS bills actual weight.
 *     Applying DIM to every package over-reports small boxes badly.
 *
 * Because the round-up happens before the volume is measured, a package can be pushed over the
 * USPS threshold by rounding alone — so the threshold is tested against the rounded dimensions.
 *
 * Divisors, thresholds and surcharges vary by carrier, service and negotiated account. These are
 * published defaults, not contract terms.
 */

export interface DimProfile {
	id: string;
	label: string;
	divisor: number;
	/** Round each dimension up to the next whole inch before multiplying. */
	roundDimensions: boolean;
	/** DIM applies only when cubic inches exceed this. 0 means it always applies. */
	dimThresholdCubicInches: number;
	note: string;
}

export const DIM_PROFILES: DimProfile[] = [
	{
		id: 'ups',
		label: 'UPS — Daily Rates',
		divisor: 139,
		roundDimensions: true,
		dimThresholdCubicInches: 0,
		note: 'Divisor 139 on Daily Rates, which is what any shipper with a UPS account pays. Each dimension rounds up to the next whole inch before the calculation (since 18 August 2025).',
	},
	{
		id: 'ups-retail',
		label: 'UPS — retail counter',
		divisor: 166,
		roundDimensions: true,
		dimThresholdCubicInches: 0,
		note: 'Walk-in counter shipments use divisor 166 rather than 139. Negotiated contracts also frequently specify 166 or higher, which lowers dimensional weight.',
	},
	{
		id: 'fedex',
		label: 'FedEx Express & Ground',
		divisor: 139,
		roundDimensions: true,
		dimThresholdCubicInches: 0,
		note: 'Divisor 139 across US domestic and US export services, with no separate retail divisor. Each dimension rounds up to the next whole inch (since 18 August 2025).',
	},
	{
		id: 'usps',
		label: 'USPS — Priority Mail, Ground Advantage, Parcel Select',
		divisor: 139,
		roundDimensions: true,
		dimThresholdCubicInches: 1728,
		note: 'From 12 July 2026 the divisor is 139 (down from 166), each dimension rounds up to the next whole inch, and dimensional weight applies only to packages larger than one cubic foot. At or below 1,728 in³ USPS bills actual weight.',
	},
	{
		id: 'custom',
		label: 'Custom divisor',
		divisor: 139,
		roundDimensions: true,
		dimThresholdCubicInches: 0,
		note: 'Use the divisor on your own carrier agreement. Negotiated divisors are often more favourable than published ones.',
	},
];

export const DEFAULT_PROFILE_ID = 'ups';

/**
 * Indicative oversize reference points for 2026. Published thresholds, not contract terms —
 * every one of these should be confirmed against a current rate guide before it is relied on.
 */
export interface OversizeRule {
	carrier: string;
	rule: string;
	threshold: string;
}

export const OVERSIZE_REFERENCE: OversizeRule[] = [
	{ carrier: 'UPS', rule: 'Additional Handling (size)', threshold: 'Length + girth over 105 in, longest side over 48 in, or cubic volume over 10,368 in³' },
	{ carrier: 'UPS', rule: 'Large Package Surcharge', threshold: 'Length + girth over 130 in, longest side over 96 in, cubic volume over 17,280 in³, or actual weight over 110 lb' },
	{ carrier: 'UPS', rule: 'Maximum accepted', threshold: 'Length + girth 165 in' },
	{ carrier: 'FedEx', rule: 'Oversize charge', threshold: 'Length + girth over 130 in, cubic volume over 17,280 in³, or actual weight over 110 lb' },
	{ carrier: 'USPS', rule: 'Oversized surcharge', threshold: 'Length over 108 in' },
	{ carrier: 'USPS', rule: 'Maximum accepted', threshold: 'Length + girth 130 in, 70 lb' },
];

export type LengthUnit = 'in' | 'cm';
export type WeightUnit = 'lb' | 'kg';

export interface DimInput {
	length: number;
	width: number;
	height: number;
	weight: number;
	lengthUnit: LengthUnit;
	weightUnit: WeightUnit;
	divisor: number;
	roundDimensions: boolean;
	dimThresholdCubicInches: number;
}

export interface DimResult {
	/** Dimensions in inches as entered, before any carrier round-up. */
	measured: { length: number; width: number; height: number };
	/** Dimensions the carrier actually bills on, after round-up. */
	billed: { length: number; width: number; height: number };
	/** True when the round-up rule changed at least one dimension. */
	roundingApplied: boolean;
	cubicInches: number;
	/** False when the package sits at or below the carrier's DIM threshold (USPS, 1,728 in³). */
	dimApplies: boolean;
	dimWeight: number;
	actualWeight: number;
	billableWeight: number;
	billedOn: 'dimensional' | 'actual';
	/** Plain-English statement of what the carrier will bill, for the result panel. */
	verdict: string;
	/** Longest side, per the carrier convention for girth. */
	longestSide: number;
	girth: number;
	lengthPlusGirth: number;
}

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.4536;

const round = (value: number, places: number) => {
	const factor = 10 ** places;
	return Math.round(value * factor) / factor;
};

export function computeDim(input: DimInput): DimResult | null {
	const toIn = (v: number) => (input.lengthUnit === 'cm' ? v / CM_PER_INCH : v);
	const toLb = (v: number) => (input.weightUnit === 'kg' ? v / KG_PER_POUND : v);

	const measuredRaw = [toIn(input.length), toIn(input.width), toIn(input.height)];
	const weightLb = toLb(input.weight);

	const valid = measuredRaw.every((v) => Number.isFinite(v) && v > 0) && Number.isFinite(weightLb) && weightLb > 0 && input.divisor > 0;
	if (!valid) return null;

	// Round-up happens before the volume is measured, so it can push a package over the USPS
	// threshold on its own. Test the threshold against the billed dimensions, not the measured ones.
	const billedRaw = input.roundDimensions ? measuredRaw.map((v) => Math.ceil(v)) : measuredRaw;
	const cubicInches = billedRaw[0] * billedRaw[1] * billedRaw[2];

	const dimApplies = cubicInches > input.dimThresholdCubicInches;
	const dimWeight = dimApplies ? Math.ceil(cubicInches / input.divisor) : 0;
	const actualWeight = Math.ceil(weightLb);
	const billableWeight = Math.max(actualWeight, dimWeight);
	const billedOn = dimApplies && dimWeight > actualWeight ? 'dimensional' : 'actual';

	// Girth is measured from the two smaller sides, whichever fields the user typed them into.
	const sorted = [...billedRaw].sort((a, b) => b - a);
	const longestSide = sorted[0];
	const girth = 2 * (sorted[1] + sorted[2]);
	const lengthPlusGirth = longestSide + girth;

	const verdict = !dimApplies
		? `This package is one cubic foot or smaller, so it is billed on actual weight: ${actualWeight} lb.`
		: billedOn === 'dimensional'
			? `You will be billed on dimensional weight: ${dimWeight} lb.`
			: `You will be billed on actual weight: ${actualWeight} lb.`;

	return {
		measured: { length: round(measuredRaw[0], 2), width: round(measuredRaw[1], 2), height: round(measuredRaw[2], 2) },
		billed: { length: billedRaw[0], width: billedRaw[1], height: billedRaw[2] },
		roundingApplied: billedRaw.some((v, i) => v !== measuredRaw[i]),
		cubicInches: round(cubicInches, 1),
		dimApplies,
		dimWeight,
		actualWeight,
		billableWeight,
		billedOn,
		verdict,
		longestSide: round(longestSide, 2),
		girth: round(girth, 2),
		lengthPlusGirth: round(lengthPlusGirth, 2),
	};
}

export const DEFAULT_DIM_INPUT = {
	length: 18,
	width: 14,
	height: 12,
	weight: 9,
	lengthUnit: 'in' as LengthUnit,
	weightUnit: 'lb' as WeightUnit,
};
