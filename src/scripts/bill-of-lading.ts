/**
 * Straight Bill of Lading generator.
 * Form → in-memory state → live Letter-size document → PDF. No network calls.
 */
import { FREIGHT_TERMS, cityLine, formatCount, formatDateUS, formatUSD, todayISO } from '../lib/usa';
import { autoScale, bindFields, createDraftStore, syncFields, wireExport } from './document-export';
import { applySignature, wireSignatures } from './signature-field';
import type { SigStroke } from './signature-pad';

export interface BolParty {
	name: string;
	address: string;
	city: string;
	state: string;
	zip: string;
	contact: string;
	phone: string;
}

export interface BolItem {
	id: string;
	qty: number;
	packageType: string;
	weight: number;
	hazmat: boolean;
	description: string;
	nmfc: string;
	freightClass: string;
}

export interface BolState {
	shipper: BolParty;
	consignee: BolParty;
	thirdParty: BolParty;
	bol: { number: string; date: string; po: string; pro: string; trailer: string; seal: string };
	carrier: { name: string; scac: string };
	terms: string;
	items: BolItem[];
	special: string;
	cod: { enabled: boolean; amount: number };
	declared: { enabled: boolean; amount: number; per: string };
	sign: { shipper: string; carrier: string };
	/** Drawn signatures, as normalised strokes, so a restored draft still carries the ink. */
	ink: { shipper: SigStroke[]; carrier: SigStroke[] };
	keepDraft: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyParty = (): BolParty => ({ name: '', address: '', city: '', state: '', zip: '', contact: '', phone: '' });

export function newBolItem(partial: Partial<BolItem> = {}): BolItem {
	return { id: uid(), qty: 1, packageType: 'Pallets', weight: 0, hazmat: false, description: '', nmfc: '', freightClass: '', ...partial };
}

export function defaultBolState(): BolState {
	const date = todayISO();
	return {
		shipper: emptyParty(),
		consignee: emptyParty(),
		thirdParty: emptyParty(),
		bol: { number: `BOL-${date.replace(/-/g, '')}-001`, date, po: '', pro: '', trailer: '', seal: '' },
		carrier: { name: '', scac: '' },
		terms: 'prepaid',
		items: [newBolItem()],
		special: '',
		cod: { enabled: false, amount: 0 },
		declared: { enabled: false, amount: 0, per: 'shipment' },
		sign: { shipper: '', carrier: '' },
		ink: { shipper: [], carrier: [] },
		keepDraft: true,
	};
}

export interface BolTotals {
	lines: BolItem[];
	pieces: number;
	weight: number;
	hazmat: boolean;
	classes: string[];
}

export function computeBolTotals(state: BolState): BolTotals {
	const lines = state.items;
	const pieces = lines.reduce((s, i) => s + Math.max(0, i.qty || 0), 0);
	const weight = lines.reduce((s, i) => s + Math.max(0, i.weight || 0), 0);
	const classes = [...new Set(lines.map((i) => i.freightClass).filter(Boolean))];
	return { lines, pieces, weight, hazmat: lines.some((i) => i.hazmat), classes };
}

export interface Readiness {
	missing: string[];
	warnings: string[];
}

export function checkBolReadiness(state: BolState, totals: BolTotals): Readiness {
	const missing: string[] = [];
	const warnings: string[] = [];
	if (!state.shipper.name.trim()) missing.push('the shipper name');
	if (!state.shipper.city.trim() || !state.shipper.state.trim()) missing.push('the shipper city and state');
	if (!state.consignee.name.trim()) missing.push('the consignee name');
	if (!state.consignee.city.trim() || !state.consignee.state.trim()) missing.push('the consignee city and state');
	if (!state.carrier.name.trim()) missing.push('the carrier name');
	if (!totals.lines.some((i) => i.description.trim() && i.weight > 0)) missing.push('at least one line with a description and a weight');
	if (state.terms === 'thirdparty' && !state.thirdParty.name.trim()) missing.push('the third party who pays the freight charges');

	if (totals.lines.some((i) => i.description.trim() && !i.freightClass)) {
		warnings.push('One or more lines have no freight class. Carriers will classify it themselves, and usually not in your favour.');
	}
	if (totals.hazmat) {
		warnings.push('This shipment is marked hazardous. A signed shipper certification and the correct DOT placards and paperwork are required.');
	}
	if (state.cod.enabled && state.cod.amount <= 0) warnings.push('COD is switched on but the amount is zero.');
	if (state.declared.enabled && state.declared.amount <= 0) warnings.push('A declared value is switched on but the amount is zero.');
	return { missing, warnings };
}

/**
 * Prefill from the freight class calculator. The calculator links here with the shipment it
 * just rated, so the class does not have to be re-keyed and cannot be mistyped in transit.
 */
export function prefillFromQuery(state: BolState, search: string): boolean {
	const params = new URLSearchParams(search);
	const cls = params.get('class');
	const weightRaw = params.get('weight');
	const piecesRaw = params.get('pieces');
	const desc = params.get('desc');
	// Test for the parameters themselves, not their numeric value: `Number(null)` is 0, which
	// is finite, so a missing parameter would otherwise read as a valid weight of zero.
	if (!cls && weightRaw === null && piecesRaw === null && desc === null) return false;

	const item = state.items[0] ?? newBolItem();
	const weight = Number(weightRaw);
	const pieces = Number(piecesRaw);
	if (cls) item.freightClass = cls;
	if (weightRaw !== null && Number.isFinite(weight) && weight > 0) item.weight = Math.round(weight);
	if (piecesRaw !== null && Number.isFinite(pieces) && pieces > 0) item.qty = Math.round(pieces);
	if (desc) item.description = desc.slice(0, 120);
	state.items[0] = item;
	return true;
}

const store = createDraftStore<BolState>('vd-bol-draft-v1');

export function initBillOfLadingTool(root: HTMLElement) {
	const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
	const $$ = <T extends HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

	const form = $<HTMLFormElement>('form[data-bol-form]')!;
	form.addEventListener('submit', (e) => e.preventDefault());

	const doc = $('#bol-document')!;
	const scaler = $('#doc-scaler')!;
	const viewport = $('#doc-viewport')!;
	const itemsHost = $('[data-items]')!;
	const rowTemplate = $<HTMLTemplateElement>('#bol-row-template')!;
	const docRows = $<HTMLTableSectionElement>('[data-doc-items]')!;
	const readinessBox = $('#bol-readiness')!;
	const thirdPartyBlock = $('[data-third-party]')!;

	const saved = store.load();
	let state: BolState = saved ? { ...defaultBolState(), ...(saved as BolState) } : defaultBolState();
	if (!saved && prefillFromQuery(state, window.location.search)) {
		// A prefilled shipment came from the calculator; keep the URL clean afterwards.
		history.replaceState(null, '', window.location.pathname);
	}
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

			const bind = (key: keyof BolItem) => {
				const el = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-item-field="${key}"]`);
				if (!el) return;
				if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(item[key]);
				else el.value = String(item[key] ?? '');
				el.id = `bol-${key}-${item.id}`;
				const label = row.querySelector<HTMLLabelElement>(`label[data-for="${key}"]`);
				if (label) label.htmlFor = el.id;
				const evt = el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === 'checkbox') ? 'change' : 'input';
				el.addEventListener(evt, () => {
					const target = state.items.find((i) => i.id === item.id);
					if (!target) return;
					if (el instanceof HTMLInputElement && el.type === 'checkbox') (target as unknown as Record<string, boolean>)[key] = el.checked;
					else if (key === 'qty' || key === 'weight') (target as unknown as Record<string, number>)[key] = el.value === '' ? 0 : Number(el.value);
					else (target as unknown as Record<string, string>)[key] = el.value;
					render();
				});
			};
			(['qty', 'packageType', 'weight', 'hazmat', 'description', 'nmfc', 'freightClass'] as (keyof BolItem)[]).forEach(bind);

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

	$('[data-add-item]')?.addEventListener('click', () => {
		state.items.push(newBolItem());
		renderItemRows();
		render();
		itemsHost.querySelector<HTMLInputElement>('[data-item-row]:last-child [data-item-field="description"]')?.focus();
	});

	/* Render ----------------------------------------------------------------- */

	function renderParty(prefix: 'shipper' | 'consignee' | 'thirdParty', party: BolParty) {
		set(`${prefix}.name`, party.name.trim() || '—');
		set(`${prefix}.address`, party.address.trim());
		set(`${prefix}.cityLine`, cityLine(party.city, party.state, party.zip));
		const contact = [party.contact.trim(), party.phone.trim()].filter(Boolean).join(' · ');
		set(`${prefix}.contact`, contact);
	}

	function render() {
		const totals = computeBolTotals(state);

		renderParty('shipper', state.shipper);
		renderParty('consignee', state.consignee);
		renderParty('thirdParty', state.thirdParty);

		set('bol.number', state.bol.number.trim() || '—');
		set('bol.date', formatDateUS(state.bol.date) || '—');
		set('bol.po', state.bol.po.trim() || '—');
		set('bol.pro', state.bol.pro.trim() || '—');
		set('carrier.name', state.carrier.name.trim() || '—');
		set('carrier.scac', state.carrier.scac.trim().toUpperCase() || '—');
		set('bol.trailer', state.bol.trailer.trim() || '—');
		set('bol.seal', state.bol.seal.trim() || '—');

		const term = FREIGHT_TERMS.find((t) => t.id === state.terms) ?? FREIGHT_TERMS[0];
		set('terms', term.label);
		$('[data-terms-note]')!.textContent = term.note;
		thirdPartyBlock.hidden = state.terms !== 'thirdparty';
		show('thirdParty', state.terms === 'thirdparty');

		// Document lines
		docRows.innerHTML = '';
		const real = totals.lines.filter((i) => i.description.trim() || i.weight > 0);
		if (real.length === 0) {
			const tr = document.createElement('tr');
			tr.className = 'vd-empty-row';
			const td = document.createElement('td');
			td.colSpan = 7;
			td.textContent = 'No commodities added yet.';
			tr.appendChild(td);
			docRows.appendChild(tr);
		} else {
			for (const item of real) {
				const tr = document.createElement('tr');
				const cells: [string, string][] = [
					[formatCount(item.qty || 0), 'vd-num'],
					[item.packageType, ''],
					[item.hazmat ? 'X' : '', 'vd-mid'],
					[item.description.trim() || '—', 'vd-desc'],
					[item.nmfc.trim() || '—', 'vd-mid'],
					[item.freightClass || '—', 'vd-mid'],
				];
				// Weight sits between description and NMFC on the printed form.
				cells.splice(3, 0, [`${formatCount(item.weight || 0)} lb`, 'vd-num']);
				for (const [text, cls] of cells) {
					const td = document.createElement('td');
					td.textContent = text;
					if (cls) td.className = cls;
					tr.appendChild(td);
				}
				docRows.appendChild(tr);
			}
		}

		set('totals.pieces', formatCount(totals.pieces));
		set('totals.weight', `${formatCount(totals.weight)} lb`);
		set('special', state.special.trim());
		show('special', Boolean(state.special.trim()));

		show('cod', state.cod.enabled);
		set('cod.amount', formatUSD(state.cod.amount));
		show('declared', state.declared.enabled);
		set('declared.amount', `${formatUSD(state.declared.amount)} per ${state.declared.per || 'shipment'}`);

		show('hazmat', totals.hazmat);

		applySignature(root, 'shipper', state.sign.shipper, signatures.get('shipper'));
		applySignature(root, 'carrier', state.sign.carrier, signatures.get('carrier'));

		// Summary strip above the preview
		set('summary.pieces', formatCount(totals.pieces));
		set('summary.weight', `${formatCount(totals.weight)} lb`);
		set('summary.class', totals.classes.length ? totals.classes.join(', ') : '—');

		renderReadiness(checkBolReadiness(state, totals));

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
		if (missing.length === 0 && warnings.length === 0) {
			line('ok', 'Ready. Every field a carrier needs is filled in.');
		} else if (missing.length) {
			line('missing', `Still needed: ${missing.join(', ')}.`);
		}
		warnings.forEach((w) => line('warn', w));
	}

	/* Wiring ----------------------------------------------------------------- */

	const fields = bindFields(form, state, render);

	/*
	 * Pads are wired before the first render so `render()` can read their ink. Finishing a
	 * stroke lands here, copies the strokes onto state and re-renders — the same path a typed
	 * field takes, so the draft and the document stay in step.
	 */
	const signatures = wireSignatures(root, () => {
		state.ink.shipper = signatures.get('shipper')?.getStrokes() ?? [];
		state.ink.carrier = signatures.get('carrier')?.getStrokes() ?? [];
		render();
	});

	function syncFormFromState() {
		syncFields(fields, state);
		$$<HTMLButtonElement>('[data-term]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.term === state.terms)));
		signatures.get('shipper')?.setStrokes(state.ink.shipper ?? []);
		signatures.get('carrier')?.setStrokes(state.ink.carrier ?? []);
		renderItemRows();
	}

	$$<HTMLButtonElement>('[data-term]').forEach((btn) =>
		btn.addEventListener('click', () => {
			state.terms = btn.dataset.term ?? 'prepaid';
			$$<HTMLButtonElement>('[data-term]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
			render();
		}),
	);

	$('[data-reset]')?.addEventListener('click', () => {
		if (!window.confirm('Clear this bill of lading and start over?')) return;
		state = defaultBolState();
		store.clear();
		dirty = false;
		syncFormFromState();
		render();
	});

	const announce = wireExport(
		root,
		() => doc,
		() => `Bill-of-Lading-${state.bol.number || 'draft'}`,
		['tr', '.vd-block'],
	);

	autoScale(viewport, scaler, doc, 816);
	syncFormFromState();
	render();
	announce('');
	root.dataset.ready = 'true';
}
