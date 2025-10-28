import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import {
	CELL_DEFINITIONS,
	CELL_TYPE_TO_INDEX,
	DEFAULT_COLS,
	DEFAULT_ROWS,
	INDEX_TO_CELL_TYPE,
	type CellType
} from '../types/grid';

const STORAGE_KEY = 'ceiling-grid-state-v2';
const STORAGE_VERSION = 1;

type GridData = Uint8Array;

export interface GridState {
	rows: number;
	cols: number;
	data: GridData;
	version: number;
}

interface PersistedGridState {
	version: number;
	rows: number;
	cols: number;
	data: number[];
}

const createDefaultState = (rows = DEFAULT_ROWS, cols = DEFAULT_COLS): GridState => ({
	rows,
	cols,
	data: new Uint8Array(rows * cols),
	version: 0
});

const encodeState = (state: GridState): string => {
	const payload: PersistedGridState = {
		version: STORAGE_VERSION,
		rows: state.rows,
		cols: state.cols,
		data: Array.from(state.data)
	};
	return JSON.stringify(payload);
};

const decodeState = (raw: string): GridState | null => {
	try {
		const parsed = JSON.parse(raw) as PersistedGridState;
		if (parsed.version !== STORAGE_VERSION) return null;
		const expectedLength = parsed.rows * parsed.cols;
		if (!Array.isArray(parsed.data) || parsed.data.length !== expectedLength) {
			return null;
		}
		return {
			rows: parsed.rows,
			cols: parsed.cols,
			data: new Uint8Array(parsed.data),
			version: 0
		};
	} catch (error) {
		console.error('Failed to load grid from storage', error);
		return null;
	}
};

const persistState = (state: GridState) => {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, encodeState(state));
	} catch (error) {
		console.warn('Unable to persist grid layout', error);
	}
};

const loadInitialState = (): GridState => {
	if (!browser) return createDefaultState();
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return createDefaultState();
	const decoded = decodeState(raw);
	return decoded ?? createDefaultState();
};

const MUTABLE_ACTION =
	<Args extends unknown[]>(action: (state: GridState, ...args: Args) => GridState | void) =>
	(state: GridState, ...args: Args) => {
		const result = action(state, ...args);
		return result ?? state;
	};

const withinBounds = (rows: number, cols: number, row: number, col: number) =>
	row >= 0 && col >= 0 && row < rows && col < cols;

const indexFor = (cols: number, row: number, col: number) => row * cols + col;

const mutateData = (state: GridState, mutator: (data: GridData) => void): GridState => {
	const nextData = new Uint8Array(state.data);
	mutator(nextData);
	const next: GridState = {
		...state,
		data: nextData,
		version: state.version + 1
	};
	persistState(next);
	return next;
};

const setCellValue = MUTABLE_ACTION((state, row: number, col: number, type: CellType) => {
	if (!withinBounds(state.rows, state.cols, row, col)) return;
	const valueIndex = CELL_TYPE_TO_INDEX.get(type);
	if (valueIndex === undefined) return;
	return mutateData(state, (data) => {
		data[indexFor(state.cols, row, col)] = valueIndex;
	});
});

const clearCellValue = MUTABLE_ACTION((state, row: number, col: number) => {
	if (!withinBounds(state.rows, state.cols, row, col)) return;
	return mutateData(state, (data) => {
		data[indexFor(state.cols, row, col)] = 0;
	});
});

const moveCellValue = MUTABLE_ACTION(
	(state, fromRow: number, fromCol: number, toRow: number, toCol: number) => {
		if (!withinBounds(state.rows, state.cols, fromRow, fromCol)) return;
		if (!withinBounds(state.rows, state.cols, toRow, toCol)) return;
		const fromIndex = indexFor(state.cols, fromRow, fromCol);
		const toIndex = indexFor(state.cols, toRow, toCol);
		if (fromIndex === toIndex) return;
		const sourceType = state.data[fromIndex];
		if (sourceType === 0) return;
		return mutateData(state, (data) => {
			data[fromIndex] = 0;
			data[toIndex] = sourceType;
		});
	}
);

const resizeGrid = MUTABLE_ACTION((state, rows: number, cols: number) => {
	const nextRows = Math.max(rows, 1);
	const nextCols = Math.max(cols, 1);
	const nextData = new Uint8Array(nextRows * nextCols);
	const copyRows = Math.min(state.rows, nextRows);
	const copyCols = Math.min(state.cols, nextCols);

	for (let row = 0; row < copyRows; row += 1) {
		for (let col = 0; col < copyCols; col += 1) {
			const sourceIndex = indexFor(state.cols, row, col);
			const targetIndex = indexFor(nextCols, row, col);
			nextData[targetIndex] = state.data[sourceIndex];
		}
	}

	const next: GridState = {
		rows: nextRows,
		cols: nextCols,
		data: nextData,
		version: state.version + 1
	};
	persistState(next);
	return next;
});

const resetGrid = () => createDefaultState();

const gridStateStore = writable<GridState>(loadInitialState());

const gridActions = {
	setCell: (row: number, col: number, type: CellType) =>
		gridStateStore.update((state) => setCellValue(state, row, col, type)),
	clearCell: (row: number, col: number) =>
		gridStateStore.update((state) => clearCellValue(state, row, col)),
	moveCell: (fromRow: number, fromCol: number, toRow: number, toCol: number) =>
		gridStateStore.update((state) => moveCellValue(state, fromRow, fromCol, toRow, toCol)),
	resize: (rows: number, cols: number) =>
		gridStateStore.update((state) => resizeGrid(state, rows, cols)),
	reset: () => {
		const next = resetGrid();
		persistState(next);
		gridStateStore.set(next);
	}
};

export const gridStore = {
	subscribe: gridStateStore.subscribe,
	...gridActions
};

export type ToolId =
	| 'light'
	| 'air-supply'
	| 'air-return'
	| 'smoke-detector'
	| 'invalid'
	| 'erase'
	| 'move'
	| 'pan';

export const selectedTool = writable<ToolId>('light');

export const gridSummary = derived(gridStateStore, ($state) => {
	const counts: Record<CellType, number> = Object.fromEntries(
		CELL_DEFINITIONS.map((definition) => [definition.type, 0])
	) as Record<CellType, number>;

	for (const value of $state.data) {
		const type = INDEX_TO_CELL_TYPE[value] ?? 'empty';
		counts[type] += 1;
	}

	return {
		rows: $state.rows,
		cols: $state.cols,
		counts
	};
});
