import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { gridStore } from './grid-store';

const snapshot = () => structuredClone(get(gridStore));

describe('gridStore', () => {
	beforeEach(() => {
		gridStore.reset();
	});

	it('sets and clears cells', () => {
		gridStore.setCell(0, 0, 'light');
		let state = snapshot();
		const index = 0 * state.cols + 0;
		expect(state.data[index]).toBeGreaterThan(0);

		gridStore.clearCell(0, 0);
		state = snapshot();
		expect(state.data[index]).toBe(0);
	});

	it('moves cells across the grid', () => {
		gridStore.setCell(1, 1, 'smoke-detector');
		gridStore.moveCell(1, 1, 2, 3);
		const state = snapshot();
		const originIndex = 1 * state.cols + 1;
		const targetIndex = 2 * state.cols + 3;
		expect(state.data[originIndex]).toBe(0);
		expect(state.data[targetIndex]).toBeGreaterThan(0);
	});

	it('resizes grid while preserving overlapping data', () => {
		gridStore.setCell(0, 0, 'light');
		gridStore.resize(12, 8);
		let state = snapshot();
		expect(state.rows).toBe(12);
		expect(state.cols).toBe(8);
		expect(state.data[0]).toBeGreaterThan(0);

		gridStore.resize(6, 6);
		state = snapshot();
		expect(state.rows).toBe(6);
		expect(state.cols).toBe(6);
		expect(state.data[0]).toBeGreaterThan(0);
	});
});
