/**
 * Dependency-free signature pad.
 *
 * Uses Pointer Events, so a finger, a stylus, a mouse, a trackpad or a graphics
 * tablet all drive the same code path. Strokes are stored as coordinates
 * normalised to 0–1, which means the drawing survives any resize (rotating a
 * phone, opening the sidebar) and can be exported at print resolution.
 *
 * Nothing here touches the network: the signature exists only in the page.
 */

export type SigPoint = [number, number];
export type SigStroke = SigPoint[];

export interface SignaturePad {
	clear(): void;
	undo(): void;
	isEmpty(): boolean;
	getStrokes(): SigStroke[];
	setStrokes(strokes: SigStroke[]): void;
	/** Trimmed PNG data URL with a transparent background, or '' when empty. */
	toDataURL(scale?: number): string;
	destroy(): void;
}

interface Options {
	onChange?: () => void;
	/** Ink colour. Stays dark regardless of theme — the signature lands on white paper. */
	color?: string;
	lineWidth?: number;
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const round = (n: number) => Math.round(n * 10000) / 10000;

export function createSignaturePad(canvas: HTMLCanvasElement, options: Options = {}): SignaturePad {
	const color = options.color ?? '#1d1d1f';
	const lineWidth = options.lineWidth ?? 2.4;
	const context2d = canvas.getContext('2d');
	if (!context2d) throw new Error('Canvas 2D context unavailable');
	// Bind to a non-nullable const so the closures below don't each need a null check.
	const ctx: CanvasRenderingContext2D = context2d;

	let strokes: SigStroke[] = [];
	let active: SigStroke | null = null;
	let cssW = 0;
	let cssH = 0;

	function paint(target: CanvasRenderingContext2D, w: number, h: number) {
		target.lineCap = 'round';
		target.lineJoin = 'round';
		target.strokeStyle = color;
		target.lineWidth = lineWidth;
		for (const stroke of strokes) {
			if (!stroke.length) continue;
			const pts = stroke.map(([x, y]) => [x * w, y * h] as SigPoint);
			target.beginPath();
			if (pts.length < 3) {
				// A tap or a very short flick still leaves a visible mark.
				target.moveTo(pts[0][0], pts[0][1]);
				target.lineTo(pts[pts.length - 1][0] + 0.01, pts[pts.length - 1][1]);
			} else {
				target.moveTo(pts[0][0], pts[0][1]);
				// Quadratic through stroke midpoints smooths the sampled pointer path.
				for (let i = 1; i < pts.length - 1; i++) {
					const mx = (pts[i][0] + pts[i + 1][0]) / 2;
					const my = (pts[i][1] + pts[i + 1][1]) / 2;
					target.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
				}
				target.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
			}
			target.stroke();
		}
	}

	function render() {
		if (cssW <= 0 || cssH <= 0) return;
		ctx.clearRect(0, 0, cssW, cssH);
		paint(ctx, cssW, cssH);
	}

	function resize() {
		const rect = canvas.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;
		cssW = rect.width;
		cssH = rect.height;
		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		canvas.width = Math.max(1, Math.round(cssW * dpr));
		canvas.height = Math.max(1, Math.round(cssH * dpr));
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		render();
	}

	function pointAt(e: PointerEvent): SigPoint {
		const r = canvas.getBoundingClientRect();
		return [round(clamp01((e.clientX - r.left) / r.width)), round(clamp01((e.clientY - r.top) / r.height))];
	}

	function onPointerDown(e: PointerEvent) {
		// Ignore right/middle mouse buttons; pen and touch report button 0.
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		e.preventDefault();
		try {
			canvas.setPointerCapture(e.pointerId);
		} catch {}
		active = [pointAt(e)];
		strokes.push(active);
		render();
	}

	function onPointerMove(e: PointerEvent) {
		if (!active) return;
		e.preventDefault();
		// Coalesced events recover the full-rate pointer path on high-frequency digitisers.
		const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
		for (const ev of events.length ? events : [e]) active.push(pointAt(ev));
		render();
	}

	function onPointerUp(e: PointerEvent) {
		if (!active) return;
		active = null;
		try {
			canvas.releasePointerCapture(e.pointerId);
		} catch {}
		options.onChange?.();
	}

	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('pointermove', onPointerMove);
	canvas.addEventListener('pointerup', onPointerUp);
	canvas.addEventListener('pointercancel', onPointerUp);

	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	resize();

	return {
		clear() {
			strokes = [];
			active = null;
			render();
			options.onChange?.();
		},
		undo() {
			strokes.pop();
			active = null;
			render();
			options.onChange?.();
		},
		isEmpty() {
			return strokes.length === 0;
		},
		getStrokes() {
			return strokes;
		},
		setStrokes(next) {
			strokes = Array.isArray(next) ? next.filter((s) => Array.isArray(s) && s.length) : [];
			active = null;
			render();
		},
		toDataURL(scale = 3) {
			if (!strokes.length || cssW <= 0 || cssH <= 0) return '';
			let minX = 1;
			let minY = 1;
			let maxX = 0;
			let maxY = 0;
			for (const stroke of strokes) {
				for (const [x, y] of stroke) {
					if (x < minX) minX = x;
					if (y < minY) minY = y;
					if (x > maxX) maxX = x;
					if (y > maxY) maxY = y;
				}
			}
			// Crop to the ink so the document isn't padded with empty pad.
			const pad = lineWidth * 2;
			const x0 = Math.max(0, minX * cssW - pad);
			const y0 = Math.max(0, minY * cssH - pad);
			const x1 = Math.min(cssW, maxX * cssW + pad);
			const y1 = Math.min(cssH, maxY * cssH + pad);
			const outW = Math.max(1, x1 - x0);
			const outH = Math.max(1, y1 - y0);

			const out = document.createElement('canvas');
			out.width = Math.round(outW * scale);
			out.height = Math.round(outH * scale);
			const octx = out.getContext('2d');
			if (!octx) return '';
			octx.scale(scale, scale);
			octx.translate(-x0, -y0);
			paint(octx, cssW, cssH);
			return out.toDataURL('image/png');
		},
		destroy() {
			ro.disconnect();
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointermove', onPointerMove);
			canvas.removeEventListener('pointerup', onPointerUp);
			canvas.removeEventListener('pointercancel', onPointerUp);
		},
	};
}
