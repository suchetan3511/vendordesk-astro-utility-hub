import { computeDim, DEFAULT_DIM_INPUT, DIM_PROFILES, type DimResult, type LengthUnit, type WeightUnit } from '../lib/dim';

/** Wires the dimensional weight calculator and the girth panel on the same page. */
export function initDimWeightTool(root: HTMLElement): void {
	const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
	const set = (name: string, value: string) => {
		root.querySelectorAll<HTMLElement>(`[data-out="${name}"]`).forEach((el) => (el.textContent = value));
	};

	const fields = {
		length: $<HTMLInputElement>('#dim-length'),
		width: $<HTMLInputElement>('#dim-width'),
		height: $<HTMLInputElement>('#dim-height'),
		weight: $<HTMLInputElement>('#dim-weight'),
	};
	const carrierSelect = $<HTMLSelectElement>('#dim-carrier');
	const divisorInput = $<HTMLInputElement>('#dim-divisor');
	const divisorRow = $('[data-divisor-row]');
	const roundToggle = $<HTMLInputElement>('#dim-round');
	const carrierNote = $('[data-carrier-note]');
	const resultPanel = $('[data-result]');
	const emptyPanel = $('[data-empty]');
	const errorEl = $('[data-error]');
	const thresholdNote = $('[data-threshold-note]');
	const roundingNote = $('[data-rounding-note]');

	if (!fields.length || !fields.width || !fields.height || !fields.weight || !carrierSelect) return;

	let lengthUnit: LengthUnit = 'in';
	let weightUnit: WeightUnit = 'lb';

	const profile = () => DIM_PROFILES.find((p) => p.id === carrierSelect.value) ?? DIM_PROFILES[0];

	const setUnitLabels = () => {
		root.querySelectorAll<HTMLElement>('[data-length-label]').forEach((el) => (el.textContent = lengthUnit));
		root.querySelectorAll<HTMLElement>('[data-weight-label]').forEach((el) => (el.textContent = weightUnit));
	};

	const setPressed = (attr: string, value: string) => {
		root.querySelectorAll<HTMLButtonElement>(`[${attr}]`).forEach((btn) => {
			btn.setAttribute('aria-pressed', String(btn.getAttribute(attr) === value));
		});
	};

	/** The custom profile is the only one where the divisor is the user's to set. */
	const syncProfileUi = () => {
		const active = profile();
		const isCustom = active.id === 'custom';
		if (divisorRow) divisorRow.hidden = !isCustom;
		if (divisorInput && !isCustom) divisorInput.value = String(active.divisor);
		if (roundToggle && !isCustom) roundToggle.checked = active.roundDimensions;
		if (roundToggle) roundToggle.disabled = !isCustom;
		if (carrierNote) carrierNote.textContent = active.note;
	};

	const render = () => {
		const active = profile();
		const isCustom = active.id === 'custom';
		const divisor = isCustom ? Number(divisorInput?.value) : active.divisor;
		const roundDimensions = isCustom ? (roundToggle?.checked ?? true) : active.roundDimensions;

		const result: DimResult | null = computeDim({
			length: Number(fields.length!.value),
			width: Number(fields.width!.value),
			height: Number(fields.height!.value),
			weight: Number(fields.weight!.value),
			lengthUnit,
			weightUnit,
			divisor,
			roundDimensions,
			dimThresholdCubicInches: active.dimThresholdCubicInches,
		});

		if (!result) {
			resultPanel?.setAttribute('hidden', '');
			emptyPanel?.removeAttribute('hidden');
			errorEl?.removeAttribute('hidden');
			return;
		}

		errorEl?.setAttribute('hidden', '');
		emptyPanel?.setAttribute('hidden', '');
		resultPanel?.removeAttribute('hidden');

		set('verdict', result.verdict);
		set('billable', String(result.billableWeight));
		set('dimWeight', result.dimApplies ? String(result.dimWeight) : 'Not applied');
		set('actualWeight', String(result.actualWeight));
		set('cubicInches', result.cubicInches.toLocaleString('en-US'));
		set('divisor', String(divisor));
		set('billedDims', `${result.billed.length} × ${result.billed.width} × ${result.billed.height} in`);
		set('measuredDims', `${result.measured.length} × ${result.measured.width} × ${result.measured.height} in`);
		set('girth', String(result.girth));
		set('longestSide', String(result.longestSide));
		set('lengthPlusGirth', String(result.lengthPlusGirth));

		// Both notes describe a rule that only sometimes bites, so they appear only when they did.
		if (thresholdNote) thresholdNote.hidden = result.dimApplies;
		if (roundingNote) roundingNote.hidden = !result.roundingApplied;

		root.querySelectorAll<HTMLElement>('[data-billed-on]').forEach((el) => {
			el.dataset.billedOn = result.billedOn;
		});
	};

	Object.values(fields).forEach((field) => field?.addEventListener('input', render));
	divisorInput?.addEventListener('input', render);
	roundToggle?.addEventListener('change', render);
	carrierSelect.addEventListener('change', () => {
		syncProfileUi();
		render();
	});

	root.querySelectorAll<HTMLButtonElement>('[data-length-unit]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const next = btn.dataset.lengthUnit as LengthUnit;
			if (next === lengthUnit) return;
			const factor = next === 'cm' ? 2.54 : 1 / 2.54;
			(['length', 'width', 'height'] as const).forEach((key) => {
				const el = fields[key];
				if (!el) return;
				const value = Number(el.value);
				if (Number.isFinite(value) && value > 0) el.value = String(Math.round(value * factor * 100) / 100);
			});
			lengthUnit = next;
			setPressed('data-length-unit', next);
			setUnitLabels();
			render();
		});
	});

	root.querySelectorAll<HTMLButtonElement>('[data-weight-unit]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const next = btn.dataset.weightUnit as WeightUnit;
			if (next === weightUnit) return;
			const factor = next === 'kg' ? 0.4536 : 1 / 0.4536;
			const el = fields.weight;
			if (el) {
				const value = Number(el.value);
				if (Number.isFinite(value) && value > 0) el.value = String(Math.round(value * factor * 100) / 100);
			}
			weightUnit = next;
			setPressed('data-weight-unit', next);
			setUnitLabels();
			render();
		});
	});

	$<HTMLButtonElement>('[data-reset]')?.addEventListener('click', () => {
		fields.length!.value = String(DEFAULT_DIM_INPUT.length);
		fields.width!.value = String(DEFAULT_DIM_INPUT.width);
		fields.height!.value = String(DEFAULT_DIM_INPUT.height);
		fields.weight!.value = String(DEFAULT_DIM_INPUT.weight);
		lengthUnit = DEFAULT_DIM_INPUT.lengthUnit;
		weightUnit = DEFAULT_DIM_INPUT.weightUnit;
		setPressed('data-length-unit', lengthUnit);
		setPressed('data-weight-unit', weightUnit);
		setUnitLabels();
		syncProfileUi();
		render();
	});

	syncProfileUi();
	setUnitLabels();
	render();
}
