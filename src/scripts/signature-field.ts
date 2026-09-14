/**
 * Wires the on-screen signature pads of a document generator.
 *
 * The bill of supply grew this behaviour first. The bill of lading and the purchase order want
 * the same thing, and a bill of lading carries two pads on one page, so the plumbing lives here
 * instead of being copied per generator.
 *
 * A pad is addressed by the key on its wrapper — `data-signature="shipper"` — and the rendered
 * document carries the matching `data-doc-signature="shipper"` image slot. Everything stays in
 * the page: the ink is never uploaded, and the exported PNG is produced on the device.
 */
import { createSignaturePad, type SigStroke, type SignaturePad } from './signature-pad';

export interface SignatureField {
	/** Normalised strokes. Stored in the draft, so reopening a draft brings the ink back. */
	getStrokes(): SigStroke[];
	setStrokes(strokes: SigStroke[]): void;
	/** Trimmed transparent PNG data URL, or '' while the pad is empty. */
	dataUrl(): string;
	isEmpty(): boolean;
	clear(): void;
}

/**
 * Binds every `[data-signature]` pad found under `root`.
 *
 * `onChange` fires once a stroke finishes or the pad is cleared — the generator re-renders and
 * saves its draft from there, the same way it reacts to a typed field.
 */
export function wireSignatures(root: ParentNode, onChange: () => void): Map<string, SignatureField> {
	const fields = new Map<string, SignatureField>();

	for (const scope of Array.from(root.querySelectorAll<HTMLElement>('[data-signature]'))) {
		const key = scope.dataset.signature;
		const canvas = scope.querySelector<HTMLCanvasElement>('canvas[data-signature-pad]');
		if (!key || !canvas) continue;

		const placeholder = scope.querySelector<HTMLElement>('[data-signature-placeholder]');
		const status = scope.querySelector<HTMLElement>('[data-signature-status]');
		const controls = Array.from(scope.querySelectorAll<HTMLButtonElement>('[data-signature-undo], [data-signature-clear]'));

		let pad: SignaturePad;
		try {
			// `onChange` is deferred behind `paint` + the caller's callback, which is why the pad
			// is constructed before either is needed: creating it only lays out the canvas.
			pad = createSignaturePad(canvas, { onChange: () => settle() });
		} catch {
			// No 2D context — a locked-down or very old browser. The typed name is the fallback,
			// so hide the pad rather than leaving a dead box on the page.
			scope.hidden = true;
			continue;
		}

		/** Repaints the pad's own chrome. Says nothing to the generator. */
		function paint() {
			const empty = pad.isEmpty();
			if (placeholder) placeholder.hidden = !empty;
			if (status) status.textContent = empty ? 'Not signed' : 'Signed';
			controls.forEach((b) => (b.disabled = empty));
		}

		/** A real edit: repaint, then let the generator redraw the document and save its draft. */
		function settle() {
			paint();
			onChange();
		}

		scope.querySelector<HTMLButtonElement>('[data-signature-undo]')?.addEventListener('click', () => pad.undo());
		scope.querySelector<HTMLButtonElement>('[data-signature-clear]')?.addEventListener('click', () => pad.clear());

		fields.set(key, {
			getStrokes: () => pad.getStrokes(),
			setStrokes: (strokes) => {
				// A restore, not an edit: repaint without calling back into the generator, which
				// may still be mid-construction when it hands a saved draft back to the pads.
				pad.setStrokes(strokes);
				paint();
			},
			dataUrl: () => (pad.isEmpty() ? '' : pad.toDataURL()),
			isEmpty: () => pad.isEmpty(),
			clear: () => pad.clear(),
		});

		// Initial chrome only — `onChange` here would fire before the caller has finished
		// building the state the callback reads.
		paint();
	}

	return fields;
}

/**
 * Drops the signature for `key` into the rendered document.
 *
 * Drawn ink wins; the typed name is the keyboard-accessible fallback and shows only when
 * nothing has been drawn. Both are hidden when neither is present, so the ruled line stays
 * empty for someone who means to sign the printed copy by hand.
 */
export function applySignature(root: ParentNode, key: string, typedName: string, field?: SignatureField): void {
	const url = field ? field.dataUrl() : '';
	const typed = typedName.trim();

	root.querySelectorAll<HTMLImageElement>(`img[data-doc-signature="${key}"]`).forEach((img) => {
		img.hidden = !url;
		if (url && img.src !== url) img.src = url;
	});
	root.querySelectorAll<HTMLElement>(`[data-doc-sign="${key}"]`).forEach((el) => {
		el.hidden = Boolean(url) || !typed;
		el.textContent = typed;
	});
}
