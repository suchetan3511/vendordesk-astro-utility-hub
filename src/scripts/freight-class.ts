import {
	bandLabel,
	computeDensity,
	DEFAULT_FREIGHT_INPUT,
	type FreightInput,
	type FreightResult,
	type LengthUnit,
	type WeightUnit,
} from '../lib/freight';

/**
 * Wires the freight class calculator. The page already contains every number and every table row
 * as static HTML; this only keeps them in sync with what the user types.
 */
export function initFreightClassTool(root: HTMLElement): void {
	const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);

	/**
	 * Several values appear in more than one place — the class shows in the headline and again in
	 * the divergence note — so every matching node is updated, not just the first.
	 */
	const set = (name: string, value: string) => {
		root.querySelectorAll<HTMLElement>(`[data-out="${name}"]`).forEach((el) => (el.textContent = value));
	};

	const fields = {
		length: $<HTMLInputElement>('#fc-length'),
		width: $<HTMLInputElement>('#fc-width'),
		height: $<HTMLInputElement>('#fc-height'),
		weight: $<HTMLInputElement>('#fc-weight'),
		pieces: $<HTMLInputElement>('#fc-pieces'),
	};
	if (!fields.length || !fields.width || !fields.height || !fields.weight || !fields.pieces) return;

	const resultPanel = $('[data-result]');
	const emptyPanel = $('[data-empty]');
	const errorEl = $('[data-error]');
	const statusEl = $('[data-status]');
	const copyBtn = $<HTMLButtonElement>('[data-copy]');
	const resetBtn = $<HTMLButtonElement>('[data-reset]');
	const divergence = $('[data-divergence]');
	const bolLink = $<HTMLAnchorElement>('[data-bol-link]');

	let lengthUnit: LengthUnit = DEFAULT_FREIGHT_INPUT.lengthUnit;
	let weightUnit: WeightUnit = DEFAULT_FREIGHT_INPUT.weightUnit;
	let last: FreightResult | null = null;

	const readInput = (): FreightInput => ({
		length: Number(fields.length!.value),
		width: Number(fields.width!.value),
		height: Number(fields.height!.value),
		weight: Number(fields.weight!.value),
		pieces: Number(fields.pieces!.value) || 1,
		lengthUnit,
		weightUnit,
	});

	const setUnitLabels = () => {
		root.querySelectorAll<HTMLElement>('[data-length-label]').forEach((el) => (el.textContent = lengthUnit));
		root.querySelectorAll<HTMLElement>('[data-weight-label]').forEach((el) => (el.textContent = weightUnit));
	};

	const setPressed = (attr: string, value: string) => {
		root.querySelectorAll<HTMLButtonElement>(`[${attr}]`).forEach((btn) => {
			btn.setAttribute('aria-pressed', String(btn.getAttribute(attr) === value));
		});
	};

	/** Highlights the band the result landed in, so the static table doubles as the explanation. */
	const highlightBand = (result: FreightResult | null) => {
		root.querySelectorAll<HTMLElement>('[data-density-row]').forEach((row) => {
			const matches = result !== null && Number(row.dataset.class) === result.nmfc.class && Number(row.dataset.min) === result.nmfc.min;
			if (matches) row.setAttribute('data-match', '');
			else row.removeAttribute('data-match');
		});
	};

	const render = () => {
		const result = computeDensity(readInput());
		last = result;

		if (!result) {
			resultPanel?.setAttribute('hidden', '');
			emptyPanel?.removeAttribute('hidden');
			errorEl?.removeAttribute('hidden');
			highlightBand(null);
			return;
		}

		errorEl?.setAttribute('hidden', '');
		emptyPanel?.setAttribute('hidden', '');
		resultPanel?.removeAttribute('hidden');

		set('class', String(result.nmfc.class));
		set('density', result.densityLabel);
		set('cubicFeet', result.cubicFeet.toFixed(1));
		set('cubicInches', result.cubicInches.toLocaleString('en-US'));
		set('band', bandLabel(result.nmfc));
		set('sub', String(result.nmfc.sub ?? ''));
		set('legacyClass', String(result.legacy.class));
		set('summary', result.summary);

		// Hand the rated shipment to the bill of lading generator rather than making the
		// shipper re-key a class they have just worked out.
		if (bolLink) {
			const params = new URLSearchParams({
				class: String(result.nmfc.class),
				weight: String(Math.round(result.pounds)),
				pieces: String(result.pieces),
			});
			bolLink.href = `${bolLink.pathname}?${params}`;
		}

		// The comparison only earns its space when the two scales actually disagree.
		if (divergence) {
			if (result.scalesDiffer) divergence.removeAttribute('hidden');
			else divergence.setAttribute('hidden', '');
		}

		highlightBand(result);
	};

	Object.values(fields).forEach((field) => {
		field?.addEventListener('input', render);
	});

	root.querySelectorAll<HTMLButtonElement>('[data-length-unit]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const next = btn.dataset.lengthUnit as LengthUnit;
			if (next === lengthUnit) return;
			// Convert the values so the shipment stays the same size when the unit flips.
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

	copyBtn?.addEventListener('click', async () => {
		if (!last) return;
		try {
			await navigator.clipboard.writeText(last.summary);
			if (statusEl) statusEl.textContent = 'Summary copied.';
		} catch {
			if (statusEl) statusEl.textContent = 'Copy failed — select the text and copy manually.';
		}
		window.setTimeout(() => {
			if (statusEl) statusEl.textContent = '';
		}, 4000);
	});

	resetBtn?.addEventListener('click', () => {
		fields.length!.value = String(DEFAULT_FREIGHT_INPUT.length);
		fields.width!.value = String(DEFAULT_FREIGHT_INPUT.width);
		fields.height!.value = String(DEFAULT_FREIGHT_INPUT.height);
		fields.weight!.value = String(DEFAULT_FREIGHT_INPUT.weight);
		fields.pieces!.value = String(DEFAULT_FREIGHT_INPUT.pieces);
		lengthUnit = DEFAULT_FREIGHT_INPUT.lengthUnit;
		weightUnit = DEFAULT_FREIGHT_INPUT.weightUnit;
		setPressed('data-length-unit', lengthUnit);
		setPressed('data-weight-unit', weightUnit);
		setUnitLabels();
		render();
	});

	setUnitLabels();
	render();
}
