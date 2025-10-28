export const CELL_SIZE_PX = 60;

export type CellType =
	| 'empty'
	| 'light'
	| 'air-supply'
	| 'air-return'
	| 'smoke-detector'
	| 'invalid';

export type ComponentCellType = Exclude<CellType, 'empty'>;

export type CellDefinition = {
	type: CellType;
	label: string;
	symbol: string;
	fill: string;
	icon?: string;
};

export type ComponentCellDefinition = CellDefinition & { type: ComponentCellType };

export const CELL_DEFINITIONS: ReadonlyArray<CellDefinition> = [
	{
		type: 'empty',
		label: 'Empty',
		symbol: '',
		fill: '#f8fafc'
	},
	{
		type: 'light',
		label: 'Light Fixture',
		symbol: 'L',
		fill: '#fcd34d',
		icon: '💡'
	},
	{
		type: 'air-supply',
		label: 'Air Supply',
		symbol: 'AS',
		fill: '#60a5fa',
		icon: '🌀'
	},
	{
		type: 'air-return',
		label: 'Air Return',
		symbol: 'AR',
		fill: '#38bdf8',
		icon: '🔁'
	},
	{
		type: 'smoke-detector',
		label: 'Smoke Detector',
		symbol: 'S',
		fill: '#f87171',
		icon: '🚨'
	},
	{
		type: 'invalid',
		label: 'Invalid Tile',
		symbol: 'X',
		fill: '#94a3b8',
		icon: '⛔️'
	}
];

export const DEFAULT_ROWS = 10;
export const DEFAULT_COLS = 10;
export const MIN_GRID_SIZE = 4;
export const MAX_GRID_SIZE = 1000;

export const CELL_TYPE_TO_INDEX = new Map<CellType, number>(
	CELL_DEFINITIONS.map((definition, index) => [definition.type, index])
);

export const INDEX_TO_CELL_TYPE = CELL_DEFINITIONS.map((definition) => definition.type);
