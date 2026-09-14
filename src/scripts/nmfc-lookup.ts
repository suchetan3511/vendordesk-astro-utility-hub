/**
 * Filters the commodity table.
 *
 * The table is rendered in full as static HTML at build time, so the whole dataset is crawlable
 * and readable without JavaScript. This only hides rows — it never builds or replaces them.
 */
export function initNmfcLookup(root: HTMLElement): void {
	const input = root.querySelector<HTMLInputElement>('#nmfc-search');
	const basisFilter = root.querySelector<HTMLSelectElement>('#nmfc-basis');
	const countEl = root.querySelector<HTMLElement>('[data-count]');
	const emptyEl = root.querySelector<HTMLElement>('[data-no-results]');
	const clearBtn = root.querySelector<HTMLButtonElement>('[data-clear]');
	const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-commodity]'));
	if (!input || rows.length === 0) return;

	const total = rows.length;

	const apply = () => {
		const query = input.value.trim().toLowerCase();
		const basis = basisFilter?.value ?? 'all';
		let visible = 0;

		for (const row of rows) {
			// Commodity and category are both searchable, so "furniture" finds the group and
			// "mattress" finds the item.
			const haystack = `${row.dataset.commodity ?? ''} ${row.dataset.category ?? ''}`.toLowerCase();
			const matchesQuery = query === '' || haystack.includes(query);
			const matchesBasis = basis === 'all' || row.dataset.basis === basis;
			const show = matchesQuery && matchesBasis;
			row.hidden = !show;
			if (show) visible++;
		}

		if (countEl) {
			countEl.textContent = visible === total ? `${total} commodities` : `${visible} of ${total} commodities`;
		}
		if (emptyEl) emptyEl.hidden = visible > 0;
		if (clearBtn) clearBtn.hidden = query === '' && basis === 'all';
	};

	input.addEventListener('input', apply);
	basisFilter?.addEventListener('change', apply);

	clearBtn?.addEventListener('click', () => {
		input.value = '';
		if (basisFilter) basisFilter.value = 'all';
		apply();
		input.focus();
	});

	// Escape clears the search when focus is in the box — the expected behaviour for a filter.
	input.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && input.value !== '') {
			event.preventDefault();
			input.value = '';
			apply();
		}
	});

	apply();
}
