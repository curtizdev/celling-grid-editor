import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Define the shape of our grid: 10x10 initially, filled with "empty"
type CellType = 'empty' | 'light' | 'air' | 'smoke' | 'invalid';
type GridData = CellType[][];
const DEFAULT_GRID: GridData = Array.from({ length: 10 }, () => Array(10).fill('empty'));

// Initialize grid store, with localStorage persistence
let initialGrid = DEFAULT_GRID;
if (browser) {
	const saved = window.localStorage.getItem('ceiling-grid-layout');
	if (saved) {
		try {
			initialGrid = JSON.parse(saved);
		} catch {
			initialGrid = DEFAULT_GRID;
		}
	}
}
export const grid = writable<GridData>(initialGrid);

// Subscribe to store changes to update localStorage (on the client only)
if (browser) {
	grid.subscribe((val) => {
		window.localStorage.setItem('ceiling-grid-layout', JSON.stringify(val));
	});
}

// Store for currently selected tool (default to "light")
export const selectedTool = writable<'light' | 'air' | 'smoke' | 'invalid'>('light');
