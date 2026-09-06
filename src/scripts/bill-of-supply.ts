/**
 * Bill of Supply generator.
 * Form → in-memory state → live A4 document → PDF, all in the browser. No network calls.
 */
import {
	GSTIN_RE,
	PAN_RE,
	amountInWords,
	financialYear,
	formatDateIN,
	formatINR,
	formatQty,
	stateName,
	todayISO,
} from '../lib/india';
import { createSignaturePad, type SigStroke, type SignaturePad } from './signature-pad';

export type SupplierType = 'unregistered' | 'composition';

export interface Item {
	id: string;
	description: string;
	hsn: string;
	qty: number;
	unit: string;
	rate: number;
}

export interface BosState {
	supplier: {
		type: SupplierType;
		name: string;
		address: string;
		stateCode: string;
		gstin: string;
		pan: string;
		phone: string;
		email: string;
	};
	bill: { number: string; date: string; placeOfSupply: string };
	recipient: { name: string; address: string; stateCode: string; gstin: string };
	items: Item[];
	discount: number;
	roundOff: boolean;
	notes: string;
	bank: { accountName: string; accountNumber: string; ifsc: string; upi: string };
	/** Drawn signature (normalised strokes) plus a typed fallback for keyboard users. */
	signature: { strokes: SigStroke[]; typed: string };
	keepDraft: boolean;
}

const STORAGE_KEY = 'vd-bos-draft-v1';

const uid = () => Math.random().toString(36).slice(2, 9);

export function newItem(partial: Partial<Item> = {}): Item {
	return { id: uid(), description: '', hsn: '', qty: 1, unit: 'pcs', rate: 0, ...partial };
}

export function defaultState(): BosState {
	const date = todayISO();
	return {
		supplier: { type: 'unregistered', name: '', address: '', stateCode: '27', gstin: '', pan: '', phone: '', email: '' },
		bill: { number: `BOS/${financialYear(new Date())}/001`, date, placeOfSupply: '27' },
		recipient: { name: '', address: '', stateCode: '27', gstin: '' },
		items: [newItem()],
		discount: 0,
		roundOff: false,
		notes: 'Thank you for your business. Payment is due within 15 days of the bill date.',
		bank: { accountName: '', accountNumber: '', ifsc: '', upi: '' },
		signature: { strokes: [], typed: '' },
		keepDraft: true,
	};
}

export interface Totals {
	lines: { item: Item; amount: number }[];
	subtotal: number;
	discount: number;
	roundOff: number;
	total: number;
}

export function computeTotals(state: BosState): Totals {
	const lines = state.items.map((item) => ({ item, amount: Math.max(0, (item.qty || 0) * (item.rate || 0)) }));
	const subtotal = lines.reduce((s, l) => s + l.amount, 0);
	const discount = Math.min(Math.max(0, state.discount || 0), subtotal);
	const net = subtotal - discount;
	const rounded = Math.round(net);
	const roundOff = state.roundOff ? Math.round((rounded - net) * 100) / 100 : 0;
	const total = state.roundOff ? rounded : Math.round(net * 100) / 100;
	return { lines, subtotal, discount, roundOff, total };
}

export function declarationFor(type: SupplierType): string {
	return type === 'composition'
		? 'Composition taxable person, not eligible to collect tax on supplies.'
		: 'Supplier is not registered under GST. No GST is charged or collected on this supply.';
}

export interface Readiness {
	missing: string[];
	warnings: string[];
}

export function checkReadiness(state: BosState, totals: Totals): Readiness {
	const missing: string[] = [];
	const warnings: string[] = [];
	if (!state.supplier.name.trim()) missing.push('your business name');
	if (!state.bill.number.trim()) missing.push('a bill number');
	if (!state.bill.date) missing.push('a bill date');
	if (!state.recipient.name.trim()) missing.push('the recipient name');
	if (!totals.lines.some((l) => l.item.description.trim() && l.amount > 0)) missing.push('at least one item with an amount');
	if (state.supplier.type === 'composition') {
		if (!state.supplier.gstin.trim()) missing.push('your GSTIN (mandatory for composition dealers)');
		else if (!GSTIN_RE.test(state.supplier.gstin.trim().toUpperCase())) warnings.push('Your GSTIN does not look like a valid 15-character GSTIN.');
		else if (state.supplier.gstin.trim().slice(0, 2) !== state.supplier.stateCode) warnings.push('The first two digits of your GSTIN do not match the state you selected.');
	}
	if (state.recipient.gstin.trim() && !GSTIN_RE.test(state.recipient.gstin.trim().toUpperCase())) warnings.push('The recipient GSTIN does not look valid.');
	if (state.supplier.pan.trim() && !PAN_RE.test(state.supplier.pan.trim().toUpperCase())) warnings.push('The PAN does not look like a valid 10-character PAN.');
	if (state.supplier.stateCode && state.bill.placeOfSupply && state.supplier.stateCode !== state.bill.placeOfSupply) {
		warnings.push(
			state.supplier.type === 'composition'
				? 'Place of supply is in another state. Composition dealers cannot make inter-state outward supplies of goods — confirm this supply is permitted.'
				: 'Place of supply is in another state. Unregistered persons making inter-state supplies of goods must register under GST — confirm before issuing.',
		);
	}
	if (totals.total >= 200 && state.supplier.type === 'composition' && !state.recipient.name.trim()) warnings.push('For bills of ₹200 or more, record who the recipient is.');
	return { missing, warnings };
}

export function dynamicSummary(state: BosState, totals: Totals): string {
	const who = state.supplier.type === 'composition' ? 'a composition taxable person' : 'a supplier who is not registered under GST';
	const to = state.recipient.name.trim() ? state.recipient.name.trim() : 'your client';
	const reason =
		state.supplier.type === 'composition'
			? 'composition dealers pay tax at a flat rate on their own turnover and are barred from collecting it from customers'
			: 'only registered persons may charge and collect GST, and doing so without registration is an offence';
	const amount = totals.total > 0 ? `${formatINR(totals.total)} (${amountInWords(totals.total)})` : 'the amount you enter';
	return `You are issuing a Bill of Supply as ${who} to ${to} for ${amount}. Because ${reason}, no CGST, SGST or IGST may be added to this figure, no tax column should appear, and the document must not be titled “Tax Invoice”. The bill is for ${
		state.supplier.stateCode === state.bill.placeOfSupply ? 'an intra-state supply' : 'an inter-state supply'
	} with place of supply in ${stateName(state.bill.placeOfSupply) || 'the selected state'}.`;
}

/* ------------------------------------------------------------------------- */
/* Persistence                                                                */
/* ------------------------------------------------------------------------- */

function loadDraft(): BosState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<BosState>;
		const base = defaultState();
		return {
			...base,
			...parsed,
			supplier: { ...base.supplier, ...(parsed.supplier ?? {}) },
			bill: { ...base.bill, ...(parsed.bill ?? {}) },
			recipient: { ...base.recipient, ...(parsed.recipient ?? {}) },
			bank: { ...base.bank, ...(parsed.bank ?? {}) },
			signature: { ...base.signature, ...(parsed.signature ?? {}) },
			items: Array.isArray(parsed.items) && parsed.items.length ? parsed.items.map((i) => newItem(i)) : base.items,
		};
	} catch {
		return null;
	}
}

function saveDraft(state: BosState) {
	try {
		if (state.keepDraft) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {}
}

function clearDraft() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {}
}

/* ------------------------------------------------------------------------- */
/* DOM wiring                                                                 */
/* ------------------------------------------------------------------------- */

function setPath(obj: BosState, path: string, value: unknown) {
	const keys = path.split('.');
	let cur: Record<string, unknown> = obj as unknown as Record<string, unknown>;
	for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] as Record<string, unknown>;
	cur[keys[keys.length - 1]] = value;
}

function getPath(obj: BosState, path: string): unknown {
	return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
}

export function initBillOfSupplyTool(root: HTMLElement) {
	const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
	const $$ = <T extends HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

	const form = $<HTMLFormElement>('form[data-bos-form]')!;
	form.addEventListener('submit', (e) => e.preventDefault());

	const doc = $('#bos-document')!;
	const scaler = $('#doc-scaler')!;
	const viewport = $('#doc-viewport')!;
	const itemsHost = $('[data-items]')!;
	const rowTemplate = $<HTMLTemplateElement>('#item-row-template')!;
	const docRows = $<HTMLTableSectionElement>('[data-doc-items]')!;
	const status = $('#bos-status')!;
	const readinessBox = $('#readiness')!;
	const dynamicText = $('#bos-dynamic')!;
	const typeButtons = $$<HTMLButtonElement>('[data-supplier-type]');
	const gstinField = $('[data-gstin-field]')!;

	let state = loadDraft() ?? defaultState();
	let posTouched = state.bill.placeOfSupply !== state.recipient.stateCode;
	let dirty = false;

	// Without a local draft, navigating away would silently discard the bill.
	window.addEventListener('beforeunload', (e) => {
		if (dirty && !state.keepDraft) {
			e.preventDefault();
			e.returnValue = '';
		}
	});

	const fields = $$<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]').filter((el) => !el.closest('[data-item-row]'));

	function syncFormFromState() {
		for (const el of fields) {
			const value = getPath(state, el.name);
			if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(value);
			else el.value = value == null ? '' : String(value);
		}
		typeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.supplierType === state.supplier.type)));
		gstinField.hidden = state.supplier.type !== 'composition';
		renderItemRows();
	}

	function renderItemRows() {
		itemsHost.innerHTML = '';
		state.items.forEach((item, index) => {
			const frag = rowTemplate.content.cloneNode(true) as DocumentFragment;
			const row = frag.querySelector<HTMLElement>('[data-item-row]')!;
			row.dataset.id = item.id;
			row.querySelector<HTMLElement>('[data-item-index]')!.textContent = String(index + 1);
			const bind = (key: keyof Item) => {
				const el = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-item-field="${key}"]`);
				if (!el) return;
				el.value = String(item[key] ?? '');
				el.id = `${key}-${item.id}`;
				const label = row.querySelector<HTMLLabelElement>(`label[data-for="${key}"]`);
				if (label) label.htmlFor = el.id;
				el.addEventListener('input', () => {
					const target = state.items.find((i) => i.id === item.id);
					if (!target) return;
					if (key === 'qty' || key === 'rate') (target as unknown as Record<string, number>)[key] = el.value === '' ? 0 : Number(el.value);
					else (target as unknown as Record<string, string>)[key] = el.value;
					render();
					updateRowAmount(row, target);
				});
			};
			(['description', 'hsn', 'qty', 'unit', 'rate'] as (keyof Item)[]).forEach(bind);
			updateRowAmount(row, item);
			const remove = row.querySelector<HTMLButtonElement>('[data-remove-item]')!;
			remove.disabled = state.items.length <= 1;
			remove.addEventListener('click', () => {
				if (state.items.length <= 1) return;
				state.items = state.items.filter((i) => i.id !== item.id);
				renderItemRows();
				render();
			});
			itemsHost.appendChild(frag);
		});
	}

	function updateRowAmount(row: HTMLElement, item: Item) {
		const amount = Math.max(0, (item.qty || 0) * (item.rate || 0));
		row.querySelector<HTMLElement>('[data-item-amount]')!.textContent = formatINR(amount);
	}

	$('[data-add-item]')?.addEventListener('click', () => {
		state.items.push(newItem());
		renderItemRows();
		render();
		const last = itemsHost.querySelector<HTMLInputElement>('[data-item-row]:last-child [data-item-field="description"]');
		last?.focus();
	});

	for (const el of fields) {
		const evt = el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'date')) ? 'change' : 'input';
		el.addEventListener(evt, () => {
			let value: unknown = el.value;
			if (el instanceof HTMLInputElement && el.type === 'checkbox') value = el.checked;
			else if (el instanceof HTMLInputElement && el.type === 'number') value = el.value === '' ? 0 : Number(el.value);
			else if (el.name.endsWith('gstin') || el.name.endsWith('pan') || el.name.endsWith('ifsc')) value = String(value).toUpperCase();
			setPath(state, el.name, value);
			if (el.name === 'bill.placeOfSupply') posTouched = true;
			if (el.name === 'recipient.stateCode' && !posTouched) {
				state.bill.placeOfSupply = state.recipient.stateCode;
				const pos = fields.find((f) => f.name === 'bill.placeOfSupply');
				if (pos) pos.value = state.bill.placeOfSupply;
			}
			if (el.name === 'keepDraft' && !state.keepDraft) clearDraft();
			render();
		});
	}

	typeButtons.forEach((b) =>
		b.addEventListener('click', () => {
			state.supplier.type = b.dataset.supplierType === 'composition' ? 'composition' : 'unregistered';
			typeButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
			gstinField.hidden = state.supplier.type !== 'composition';
			render();
		}),
	);

	$('[data-clear-draft]')?.addEventListener('click', () => {
		if (!window.confirm('Clear this bill and start again? This removes the draft stored in your browser.')) return;
		clearDraft();
		state = { ...defaultState(), keepDraft: state.keepDraft };
		posTouched = false;
		dirty = false;
		pad?.setStrokes([]);
		signatureUrl = '';
		syncFormFromState();
		render();
		announce('Draft cleared. The form has been reset.');
	});

	/* Signature ------------------------------------------------------------- */

	let pad: SignaturePad | null = null;
	let signatureUrl = '';
	const padCanvas = $<HTMLCanvasElement>('[data-signature-pad]');
	const padPlaceholder = $('[data-signature-placeholder]');
	const padStatus = $('[data-signature-status]');

	/** Cheap: text and button state only. Safe to call on every render. */
	function updateSignatureStatus() {
		const signed = Boolean(signatureUrl);
		if (padPlaceholder) padPlaceholder.hidden = signed;
		if (padStatus) padStatus.textContent = signed ? 'Signed' : state.signature.typed.trim() ? 'Using typed name' : 'Not signed';
		$$('[data-signature-undo], [data-signature-clear]').forEach((b) => ((b as HTMLButtonElement).disabled = !signed));
	}

	/** Expensive: re-exports the PNG. Only call when the drawing itself changed. */
	function refreshSignature() {
		signatureUrl = pad && !pad.isEmpty() ? pad.toDataURL() : '';
		updateSignatureStatus();
	}

	if (padCanvas) {
		pad = createSignaturePad(padCanvas, {
			onChange: () => {
				state.signature.strokes = pad ? pad.getStrokes() : [];
				refreshSignature();
				render();
			},
		});
		if (state.signature.strokes.length) pad.setStrokes(state.signature.strokes);
		// The canvas may still be laying out, so re-export once it has a real size.
		new ResizeObserver(() => {
			if (!pad || pad.isEmpty()) return;
			const next = pad.toDataURL();
			if (next && next !== signatureUrl) {
				signatureUrl = next;
				applySignature();
			}
		}).observe(padCanvas);
	}

	$('[data-signature-clear]')?.addEventListener('click', () => {
		pad?.clear();
		announce('Signature cleared.');
	});
	$('[data-signature-undo]')?.addEventListener('click', () => pad?.undo());

	/* Document rendering ---------------------------------------------------- */

	const signatureImg = $<HTMLImageElement>('[data-doc-signature]');
	const signatureTyped = $('[data-doc-typed]');

	/** Drawn signature wins; a typed name is the keyboard-accessible fallback. */
	function applySignature() {
		const typed = state.signature.typed.trim();
		if (signatureImg) {
			signatureImg.hidden = !signatureUrl;
			if (signatureUrl && signatureImg.src !== signatureUrl) signatureImg.src = signatureUrl;
		}
		if (signatureTyped) {
			signatureTyped.hidden = Boolean(signatureUrl) || !typed;
			signatureTyped.textContent = typed;
		}
	}

	const docText = (key: string, value: string, hideWhenEmpty = false) => {
		$$(`[data-doc="${key}"]`).forEach((el) => {
			el.textContent = value;
			if (hideWhenEmpty) el.hidden = !value;
		});
	};

	let initialised = false;

	function render() {
		if (initialised) dirty = true;
		const totals = computeTotals(state);
		const s = state.supplier;
		const r = state.recipient;

		docText('declaration', declarationFor(s.type));
		docText('bill.number', state.bill.number || '—');
		docText('bill.date', formatDateIN(state.bill.date) || '—');
		docText('bill.placeOfSupply', state.bill.placeOfSupply ? `${stateName(state.bill.placeOfSupply)} (${state.bill.placeOfSupply})` : '—');

		docText('supplier.name', s.name.trim() || 'Your business name');
		docText('supplier.address', s.address.trim(), true);
		docText('supplier.stateLine', s.stateCode ? `${stateName(s.stateCode)} · State code ${s.stateCode}` : '', true);
		docText('supplier.gstin', s.type === 'composition' && s.gstin.trim() ? `GSTIN: ${s.gstin.trim()}` : '', true);
		docText('supplier.pan', s.pan.trim() ? `PAN: ${s.pan.trim()}` : '', true);
		docText('supplier.contact', [s.phone.trim(), s.email.trim()].filter(Boolean).join(' · '), true);

		docText('recipient.name', r.name.trim() || 'Recipient name');
		docText('recipient.address', r.address.trim(), true);
		docText('recipient.stateLine', r.stateCode ? `${stateName(r.stateCode)} · State code ${r.stateCode}` : '', true);
		docText('recipient.gstin', r.gstin.trim() ? `GSTIN: ${r.gstin.trim()}` : '', true);

		docRows.innerHTML = '';
		totals.lines.forEach(({ item, amount }, i) => {
			const tr = document.createElement('tr');
			const cells = [
				String(i + 1),
				item.description.trim() || 'Item description',
				item.hsn.trim() || '—',
				`${formatQty(item.qty)} ${item.unit}`.trim(),
				formatINR(item.rate || 0),
				formatINR(amount),
			];
			cells.forEach((text, ci) => {
				const td = document.createElement('td');
				td.textContent = text;
				if (ci >= 3) td.className = 'num';
				if (ci === 1) td.className = 'desc';
				tr.appendChild(td);
			});
			docRows.appendChild(tr);
		});

		docText('subtotal', formatINR(totals.subtotal));
		const discountRow = $('[data-doc-row="discount"]')!;
		discountRow.hidden = totals.discount <= 0;
		docText('discount', `− ${formatINR(totals.discount)}`);
		const roundRow = $('[data-doc-row="roundOff"]')!;
		roundRow.hidden = !state.roundOff || totals.roundOff === 0;
		docText('roundOff', `${totals.roundOff >= 0 ? '+' : '−'} ${formatINR(Math.abs(totals.roundOff))}`);
		docText('total', formatINR(totals.total));
		docText('words', totals.total > 0 ? amountInWords(totals.total) : 'Rupees Zero Only');

		docText('notes', state.notes.trim(), true);
		const bankLines = [
			state.bank.accountName.trim() && `Account name: ${state.bank.accountName.trim()}`,
			state.bank.accountNumber.trim() && `Account no.: ${state.bank.accountNumber.trim()}`,
			state.bank.ifsc.trim() && `IFSC: ${state.bank.ifsc.trim()}`,
			state.bank.upi.trim() && `UPI: ${state.bank.upi.trim()}`,
		].filter(Boolean) as string[];
		const bankBlock = $('[data-doc-block="bank"]')!;
		bankBlock.hidden = bankLines.length === 0;
		docText('bank', bankLines.join('\n'));
		docText('signatory', s.name.trim() ? `For ${s.name.trim()}` : 'For your business');
		applySignature();
		updateSignatureStatus();

		$$('[data-out="total"]').forEach((el) => (el.textContent = formatINR(totals.total)));
		dynamicText.textContent = dynamicSummary(state, totals);

		const ready = checkReadiness(state, totals);
		readinessBox.innerHTML = '';
		if (ready.missing.length === 0 && ready.warnings.length === 0) {
			readinessBox.append(makeNote('ok', 'Ready to download — all mandatory fields are filled in.'));
		} else {
			if (ready.missing.length) readinessBox.append(makeNote('missing', `Still needed: ${ready.missing.join(', ')}.`));
			ready.warnings.forEach((w) => readinessBox.append(makeNote('warn', w)));
		}

		saveDraft(state);
		scheduleScale();
	}

	function makeNote(kind: 'ok' | 'missing' | 'warn', text: string) {
		const p = document.createElement('p');
		p.dataset.kind = kind;
		p.textContent = text;
		return p;
	}

	/* Preview scaling -------------------------------------------------------- */

	let scaleRaf = 0;
	function scheduleScale() {
		cancelAnimationFrame(scaleRaf);
		scaleRaf = requestAnimationFrame(applyScale);
	}
	function applyScale() {
		const available = viewport.clientWidth;
		const docWidth = doc.offsetWidth || 794;
		const k = Math.min(1, available / docWidth);
		scaler.style.transform = `scale(${k})`;
		scaler.style.height = `${doc.offsetHeight * k}px`;
	}
	new ResizeObserver(scheduleScale).observe(viewport);
	new ResizeObserver(scheduleScale).observe(doc);

	/* Actions ---------------------------------------------------------------- */

	function announce(msg: string) {
		status.textContent = msg;
	}

	let busy = false;
	async function downloadPdf() {
		if (busy) return;
		busy = true;
		const buttons = $$<HTMLButtonElement>('[data-download-pdf]');
		buttons.forEach((b) => (b.disabled = true));
		announce('Preparing your PDF…');
		try {
			const { default: html2pdf } = await import('html2pdf.js');
			const safeNo = (state.bill.number || 'draft').replace(/[^\w.-]+/g, '-');
			// `pagebreak` is a real html2pdf option that its bundled typings omit.
			const options = {
				margin: 0,
				filename: `Bill-of-Supply-${safeNo}.pdf`,
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
				jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
				pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.bos-block'] },
			} as const;
			type WorkerOptions = Parameters<InstanceType<typeof html2pdf.Worker>['set']>[0];
			await html2pdf()
				.set(options as unknown as WorkerOptions)
				.from(doc)
				.save();
			announce('PDF downloaded. Nothing was uploaded — it was built on your device.');
		} catch (err) {
			console.error(err);
			announce('PDF generation failed in this browser. Use “Print” and choose “Save as PDF” instead.');
		} finally {
			busy = false;
			buttons.forEach((b) => (b.disabled = false));
		}
	}

	$$('[data-download-pdf]').forEach((b) => b.addEventListener('click', downloadPdf));
	$('[data-print]')?.addEventListener('click', () => window.print());

	syncFormFromState();
	refreshSignature();
	render();
	initialised = true;
	root.dataset.ready = 'true';
}
