/**
 * Purchase Order generator.
 * Form → in-memory state → live Letter-size document → PDF. No network calls.
 */
import { cityLine, formatDateUS, formatQty, formatUSD, todayISO } from '../lib/usa';
import { autoScale, bindFields, createDraftStore, syncFields, wireExport } from './document-export';
import { applySignature, wireSignatures } from './signature-field';
import type { SigStroke } from './signature-pad';

export interface PoParty {
	name: string;
	address: string;
	city: string;
	state: string;
	zip: string;
	contact: string;
	phone: string;
	email: string;
}

export interface PoItem {
	id: string;
	sku: string;
	description: string;
	qty: number;
	unit: string;
	unitPrice: number;
}

export interface PoState {
	buyer: PoParty;
	vendor: PoParty;
	shipTo: PoParty;
	shipToSame: boolean;
	po: { number: string; date: string; requiredBy: string; terms: string; fob: string; shipMethod: string };
	items: PoItem[];
	taxRate: number;
	shipping: number;
	discount: number;
	notes: string;
	sign: { name: string; title: string };
	/** Drawn signature, as normalised strokes, so a restored draft still carries the ink. */
	ink: { authorized: SigStroke[] };
	keepDraft: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyParty = (): PoParty => ({ name: '', address: '', city: '', state: '', zip: '', contact: '', phone: '', email: '' });

export function newPoItem(partial: Partial<PoItem> = {}): PoItem {
	return { id: uid(), sku: '', description: '', qty: 1, unit: 'ea', unitPrice: 0, ...partial };
}

export function defaultPoState(): PoState {
	const date = todayISO();
	return {
		buyer: emptyParty(),
		vendor: emptyParty(),
		shipTo: emptyParty(),
		shipToSame: true,
		po: { number: `PO-${date.replace(/-/g, '')}-001`, date, requiredBy: '', terms: 'Net 30', fob: 'FOB Destination', shipMethod: 'Ground' },
		items: [newPoItem()],
		taxRate: 0,
		shipping: 0,
		discount: 0,
		notes: 'Please confirm receipt of this purchase order and advise the expected ship date.',
		sign: { name: '', title: '' },
		ink: { authorized: [] },
		keepDraft: true,
	};
}

export interface PoTotals {
	lines: { item: PoItem; amount: number }[];
	subtotal: number;
	discount: number;
	taxable: number;
	tax: number;
	shipping: number;
	total: number;
	units: number;
}

/**
 * Discount comes off the subtotal, tax is charged on what remains, and shipping is added
 * after tax. That is the ordinary US treatment; a handful of states tax freight too, which
 * the page notes rather than trying to model.
 */
export function computePoTotals(state: PoState): PoTotals {
	const lines = state.items.map((item) => ({ item, amount: Math.max(0, (item.qty || 0) * (item.unitPrice || 0)) }));
	const subtotal = lines.reduce((s, l) => s + l.amount, 0);
	const discount = Math.min(Math.max(0, state.discount || 0), subtotal);
	const taxable = subtotal - discount;
	const tax = Math.max(0, taxable * (Math.max(0, state.taxRate || 0) / 100));
	const shipping = Math.max(0, state.shipping || 0);
	const round = (n: number) => Math.round(n * 100) / 100;
	const units = lines.reduce((s, l) => s + Math.max(0, l.item.qty || 0), 0);
	return {
		lines,
		subtotal: round(subtotal),
		discount: round(discount),
		taxable: round(taxable),
		tax: round(tax),
		shipping: round(shipping),
		total: round(taxable + tax + shipping),
		units,
	};
}

export interface Readiness {
	missing: string[];
	warnings: string[];
}

export function checkPoReadiness(state: PoState, totals: PoTotals): Readiness {
	const missing: string[] = [];
	const warnings: string[] = [];
	if (!state.buyer.name.trim()) missing.push('your company name');
	if (!state.vendor.name.trim()) missing.push('the vendor name');
	if (!state.po.number.trim()) missing.push('a PO number');
	if (!state.po.date) missing.push('a PO date');
	if (!totals.lines.some((l) => l.item.description.trim() && l.amount > 0)) missing.push('at least one line with a description and an amount');

	if (state.po.requiredBy && state.po.date && state.po.requiredBy < state.po.date) {
		warnings.push('The required-by date is earlier than the PO date.');
	}
	if (totals.lines.some((l) => l.item.description.trim() && l.item.unitPrice <= 0)) {
		warnings.push('One or more lines have no unit price. A vendor can treat a zero-price line as a free-of-charge item.');
	}
	if (!state.shipToSame && !state.shipTo.name.trim() && !state.shipTo.city.trim()) {
		warnings.push('A separate ship-to address is switched on but empty.');
	}
	return { missing, warnings };
}

const store = createDraftStore<PoState>('vd-po-draft-v1');

export function initPurchaseOrderTool(root: HTMLElement) {
	const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
	const $$ = <T extends HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

	const form = $<HTMLFormElement>('form[data-po-form]')!;
	form.addEventListener('submit', (e) => e.preventDefault());

	const doc = $('#po-document')!;
	const scaler = $('#doc-scaler')!;
	const viewport = $('#doc-viewport')!;
	const itemsHost = $('[data-items]')!;
	const rowTemplate = $<HTMLTemplateElement>('#po-row-template')!;
	const docRows = $<HTMLTableSectionElement>('[data-doc-items]')!;
	const readinessBox = $('#po-readiness')!;
	const shipToBlock = $('[data-ship-to]')!;

	const saved = store.load();
	let state: PoState = saved ? { ...defaultPoState(), ...(saved as PoState) } : defaultPoState();
	let dirty = false;

	window.addEventListener('beforeunload', (e) => {
		if (dirty && !state.keepDraft) {
			e.preventDefault();
			e.returnValue = '';
		}
	});

	const set = (name: string, value: string) => $$(`[data-doc="${name}"]`).forEach((el) => (el.textContent = value));
	const show = (name: string, visible: boolean) => $$(`[data-doc-row="${name}"]`).forEach((el) => (el.hidden = !visible));

	/* Items ------------------------------------------------------------------ */

	function renderItemRows() {
		itemsHost.innerHTML = '';
		state.items.forEach((item, index) => {
			const frag = rowTemplate.content.cloneNode(true) as DocumentFragment;
			const row = frag.querySelector<HTMLElement>('[data-item-row]')!;
			row.dataset.id = item.id;
			row.querySelector<HTMLElement>('[data-item-index]')!.textContent = String(index + 1);

			const bind = (key: keyof PoItem) => {
				const el = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-item-field="${key}"]`);
				if (!el) return;
				el.value = String(item[key] ?? '');
				el.id = `po-${key}-${item.id}`;
				const label = row.querySelector<HTMLLabelElement>(`label[data-for="${key}"]`);
				if (label) label.htmlFor = el.id;
				const evt = el instanceof HTMLSelectElement ? 'change' : 'input';
				el.addEventListener(evt, () => {
					const target = state.items.find((i) => i.id === item.id);
					if (!target) return;
					if (key === 'qty' || key === 'unitPrice') (target as unknown as Record<string, number>)[key] = el.value === '' ? 0 : Number(el.value);
					else (target as unknown as Record<string, string>)[key] = el.value;
					updateRowAmount(row, target);
					render();
				});
			};
			(['sku', 'description', 'qty', 'unit', 'unitPrice'] as (keyof PoItem)[]).forEach(bind);
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

	function updateRowAmount(row: HTMLElement, item: PoItem) {
		const amount = Math.max(0, (item.qty || 0) * (item.unitPrice || 0));
		row.querySelector<HTMLElement>('[data-item-amount]')!.textContent = formatUSD(amount);
	}

	$('[data-add-item]')?.addEventListener('click', () => {
		state.items.push(newPoItem());
		renderItemRows();
		render();
		itemsHost.querySelector<HTMLInputElement>('[data-item-row]:last-child [data-item-field="description"]')?.focus();
	});

	/* Render ----------------------------------------------------------------- */

	function renderParty(prefix: 'buyer' | 'vendor' | 'shipTo', party: PoParty) {
		set(`${prefix}.name`, party.name.trim() || '—');
		set(`${prefix}.address`, party.address.trim());
		set(`${prefix}.cityLine`, cityLine(party.city, party.state, party.zip));
		set(`${prefix}.contact`, [party.contact.trim(), party.phone.trim()].filter(Boolean).join(' · '));
		set(`${prefix}.email`, party.email.trim());
	}

	function render() {
		const totals = computePoTotals(state);

		renderParty('buyer', state.buyer);
		renderParty('vendor', state.vendor);
		renderParty('shipTo', state.shipToSame ? state.buyer : state.shipTo);

		set('po.number', state.po.number.trim() || '—');
		set('po.date', formatDateUS(state.po.date) || '—');
		set('po.requiredBy', formatDateUS(state.po.requiredBy) || '—');
		set('po.terms', state.po.terms || '—');
		set('po.fob', state.po.fob || '—');
		set('po.shipMethod', state.po.shipMethod || '—');

		shipToBlock.hidden = state.shipToSame;

		docRows.innerHTML = '';
		const real = totals.lines.filter((l) => l.item.description.trim() || l.amount > 0);
		if (real.length === 0) {
			const tr = document.createElement('tr');
			tr.className = 'vd-empty-row';
			const td = document.createElement('td');
			td.colSpan = 6;
			td.textContent = 'No items added yet.';
			tr.appendChild(td);
			docRows.appendChild(tr);
		} else {
			real.forEach((line, i) => {
				const tr = document.createElement('tr');
				const cells: [string, string][] = [
					[String(i + 1), 'vd-mid'],
					[line.item.sku.trim() || '—', 'vd-mid'],
					[line.item.description.trim() || '—', 'vd-desc'],
					[`${formatQty(line.item.qty || 0)} ${line.item.unit}`, 'vd-num'],
					[formatUSD(line.item.unitPrice || 0), 'vd-num'],
					[formatUSD(line.amount), 'vd-num'],
				];
				for (const [text, cls] of cells) {
					const td = document.createElement('td');
					td.textContent = text;
					if (cls) td.className = cls;
					tr.appendChild(td);
				}
				docRows.appendChild(tr);
			});
		}

		set('subtotal', formatUSD(totals.subtotal));
		show('discount', totals.discount > 0);
		set('discount', `-${formatUSD(totals.discount)}`);
		show('tax', totals.tax > 0);
		set('taxLabel', `Tax (${formatQty(state.taxRate || 0)}%)`);
		set('tax', formatUSD(totals.tax));
		show('shipping', totals.shipping > 0);
		set('shipping', formatUSD(totals.shipping));
		set('total', formatUSD(totals.total));

		set('notes', state.notes.trim());
		show('notes', Boolean(state.notes.trim()));

		applySignature(root, 'authorized', state.sign.name, signatures.get('authorized'));
		set('sign.title', state.sign.title.trim());

		set('summary.total', formatUSD(totals.total));
		set('summary.units', formatQty(totals.units));

		renderReadiness(checkPoReadiness(state, totals));

		dirty = true;
		store.save(state, state.keepDraft);
	}

	function renderReadiness({ missing, warnings }: Readiness) {
		readinessBox.innerHTML = '';
		const line = (kind: 'ok' | 'missing' | 'warn', text: string) => {
			const p = document.createElement('p');
			p.dataset.kind = kind;
			p.textContent = text;
			readinessBox.appendChild(p);
		};
		if (missing.length === 0 && warnings.length === 0) line('ok', 'Ready. This purchase order can go to the vendor.');
		else if (missing.length) line('missing', `Still needed: ${missing.join(', ')}.`);
		warnings.forEach((w) => line('warn', w));
	}

	/* Wiring ----------------------------------------------------------------- */

	const fields = bindFields(form, state, render);

	/*
	 * Wired before the first render so `render()` can read the pad's ink. Finishing a stroke
	 * lands here, copies the strokes onto state and re-renders — the same path a typed field
	 * takes, so the draft and the document stay in step.
	 */
	const signatures = wireSignatures(root, () => {
		state.ink.authorized = signatures.get('authorized')?.getStrokes() ?? [];
		render();
	});

	function syncFormFromState() {
		syncFields(fields, state);
		signatures.get('authorized')?.setStrokes(state.ink.authorized ?? []);
		renderItemRows();
	}

	$('[data-reset]')?.addEventListener('click', () => {
		if (!window.confirm('Clear this purchase order and start over?')) return;
		state = defaultPoState();
		store.clear();
		dirty = false;
		syncFormFromState();
		render();
	});

	const announce = wireExport(
		root,
		() => doc,
		() => `Purchase-Order-${state.po.number || 'draft'}`,
		['tr', '.vd-block'],
	);

	autoScale(viewport, scaler, doc, 816);
	syncFormFromState();
	render();
	announce('');
	root.dataset.ready = 'true';
}
