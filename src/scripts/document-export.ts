/**
 * Shared PDF and print export for the document generators.
 *
 * `html2pdf.js` is ~935KB, so it is imported dynamically on the first click rather than
 * bundled into the page load — a visitor who never exports never pays for it.
 */

export interface ExportOptions {
	/** The element to rasterise. Must be on-screen and laid out, not `display: none`. */
	doc: HTMLElement;
	/** Without the `.pdf` extension; sanitised before use. */
	filename: string;
	/** Selectors html2pdf should avoid breaking across a page boundary. */
	avoidBreak?: string[];
	onStatus?: (message: string) => void;
}

const safeName = (name: string) => (name || 'document').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';

let busy = false;

export async function exportPdf({ doc, filename, avoidBreak = ['tr'], onStatus }: ExportOptions): Promise<void> {
	if (busy) return;
	busy = true;
	const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-download-pdf]'));
	buttons.forEach((b) => (b.disabled = true));
	onStatus?.('Building the PDF on your device…');
	try {
		const { default: html2pdf } = await import('html2pdf.js');
		// `pagebreak` is a real html2pdf option that its bundled typings omit.
		const options = {
			margin: 0,
			filename: `${safeName(filename)}.pdf`,
			image: { type: 'jpeg', quality: 0.98 },
			html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
			jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
			pagebreak: { mode: ['css', 'legacy'], avoid: avoidBreak },
		} as const;
		type WorkerOptions = Parameters<InstanceType<typeof html2pdf.Worker>['set']>[0];
		await html2pdf()
			.set(options as unknown as WorkerOptions)
			.from(doc)
			.save();
		onStatus?.('PDF downloaded. Nothing was uploaded — it was built on your device.');
	} catch (err) {
		console.error(err);
		onStatus?.('PDF generation failed in this browser. Use “Print” and choose “Save as PDF” instead.');
	} finally {
		busy = false;
		buttons.forEach((b) => (b.disabled = false));
	}
}

/**
 * Wires the export buttons and returns an announce function for the live region.
 * Every generator page carries the same three controls.
 */
export function wireExport(root: ParentNode, getDoc: () => HTMLElement, getFilename: () => string, avoidBreak?: string[]) {
	const live = root.querySelector<HTMLElement>('[data-live]');
	const announce = (message: string) => {
		if (live) live.textContent = message;
	};
	root.querySelectorAll<HTMLButtonElement>('[data-download-pdf]').forEach((b) =>
		b.addEventListener('click', () => void exportPdf({ doc: getDoc(), filename: getFilename(), avoidBreak, onStatus: announce })),
	);
	root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());
	return announce;
}

/**
 * Draft persistence. Each generator owns a key; the draft never leaves the browser, and a
 * blocked or full localStorage degrades to "this session only" rather than throwing.
 */
export function createDraftStore<T>(key: string) {
	return {
		load(): Partial<T> | null {
			try {
				const raw = localStorage.getItem(key);
				return raw ? (JSON.parse(raw) as Partial<T>) : null;
			} catch {
				return null;
			}
		},
		save(state: T, enabled: boolean) {
			try {
				if (enabled) localStorage.setItem(key, JSON.stringify(state));
				else localStorage.removeItem(key);
			} catch {
				/* Private mode or a full quota: the tool still works, the draft just will not persist. */
			}
		},
		clear() {
			try {
				localStorage.removeItem(key);
			} catch {
				/* Nothing to do. */
			}
		},
	};
}

/**
 * Dot-path access, so a form field can address its own slice of state through `name`
 * (`shipper.city`) instead of every field needing a bespoke listener.
 */
export function setPath(obj: object, path: string, value: unknown): void {
	const keys = path.split('.');
	const last = keys.pop();
	if (!last) return;
	let cursor = obj as Record<string, unknown>;
	for (const key of keys) {
		if (typeof cursor[key] !== 'object' || cursor[key] === null) cursor[key] = {};
		cursor = cursor[key] as Record<string, unknown>;
	}
	cursor[last] = value;
}

export function getPath(obj: object, path: string): unknown {
	return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
}

/** Binds every `[name]` field in a form to its dot path on state. */
export function bindFields(form: HTMLFormElement, state: object, onChange: () => void): HTMLElement[] {
	const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]'));
	for (const el of fields) {
		const isToggle = el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'date');
		const evt = el instanceof HTMLSelectElement || isToggle ? 'change' : 'input';
		el.addEventListener(evt, () => {
			let value: unknown = el.value;
			if (el instanceof HTMLInputElement && el.type === 'checkbox') value = el.checked;
			else if (el instanceof HTMLInputElement && el.type === 'number') value = el.value === '' ? 0 : Number(el.value);
			setPath(state, el.name, value);
			onChange();
		});
	}
	return fields;
}

/** Writes state back into the form, for a restored draft or a reset. */
export function syncFields(fields: HTMLElement[], state: object): void {
	for (const el of fields) {
		if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
		const value = getPath(state, el.name);
		if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(value);
		else el.value = value == null ? '' : String(value);
	}
}

/** Scales an oversized document down to fit its viewport, keeping full print fidelity. */
export function autoScale(viewport: HTMLElement, scaler: HTMLElement, doc: HTMLElement, naturalWidth: number): void {
	let raf = 0;
	const apply = () => {
		// `clientWidth` counts the viewport's own padding, but the document has to fit *inside*
		// that padding. Scaling against it made the document exactly one horizontal padding too
		// wide, so `overflow-hidden` clipped its right edge while the left kept its gutter — most
		// obvious on a laptop, where the padding is at its widest.
		const style = getComputedStyle(viewport);
		const inset = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
		const available = Math.max(0, viewport.clientWidth - inset);
		const k = Math.min(1, available / (doc.offsetWidth || naturalWidth));
		scaler.style.transform = `scale(${k})`;
		scaler.style.height = `${doc.offsetHeight * k}px`;
	};
	const schedule = () => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(apply);
	};
	new ResizeObserver(schedule).observe(viewport);
	new ResizeObserver(schedule).observe(doc);
	apply();
}
