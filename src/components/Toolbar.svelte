<script lang="ts">
	import {
		MIN_GRID_SIZE,
		MAX_GRID_SIZE,
		CELL_DEFINITIONS,
		type ComponentCellDefinition
	} from '../types/grid';
	import { gridStore, gridSummary, selectedTool, type ToolId } from '../stores/grid-store';
	import { get } from 'svelte/store';

	type ToolDefinition = {
		id: ToolId;
		label: string;
		description: string;
		shortcut?: string;
		icon?: string;
	};

	const toolIcons: Partial<Record<ToolId, string>> = {
		erase: '🧽',
		move: '🖐️',
		pan: '🖱️'
	};

	const COMPONENT_DEFINITIONS: ComponentCellDefinition[] = CELL_DEFINITIONS.filter(
		(definition): definition is ComponentCellDefinition => definition.type !== 'empty'
	);

	function getToolIcon(tool: ToolId): string | undefined {
		const componentMatch = COMPONENT_DEFINITIONS.find((definition) => definition.type === tool);
		if (componentMatch) {
			return componentMatch.icon ?? componentMatch.symbol;
		}
		return toolIcons[tool];
	}

	const TOOLBAR_BUTTONS: ToolDefinition[] = [
		{
			id: 'light',
			label: 'Light',
			description: 'Place a light fixture',
			shortcut: '1',
			icon: getToolIcon('light')
		},
		{
			id: 'air-supply',
			label: 'Air Supply',
			description: 'Add a supply vent',
			shortcut: '2',
			icon: getToolIcon('air-supply')
		},
		{
			id: 'air-return',
			label: 'Air Return',
			description: 'Add a return vent',
			shortcut: '3',
			icon: getToolIcon('air-return')
		},
		{
			id: 'smoke-detector',
			label: 'Smoke',
			description: 'Add a smoke detector',
			shortcut: '4',
			icon: getToolIcon('smoke-detector')
		},
		{
			id: 'invalid',
			label: 'Invalid',
			description: 'Mark unusable grid tiles',
			shortcut: '5',
			icon: getToolIcon('invalid')
		},
		{
			id: 'move',
			label: 'Move',
			description: 'Drag existing components',
			shortcut: 'M',
			icon: getToolIcon('move')
		},
		{
			id: 'erase',
			label: 'Erase',
			description: 'Clear selected cells',
			shortcut: 'E',
			icon: getToolIcon('erase')
		},
		{
			id: 'pan',
			label: 'Pan',
			description: 'Drag the canvas (Space)',
			shortcut: 'Space',
			icon: getToolIcon('pan')
		}
	];

	const INITIAL_STATE = get(gridStore);
	let rowInput = INITIAL_STATE.rows;
	let colInput = INITIAL_STATE.cols;
	let editingRows = false;
	let editingCols = false;

	$: currentRows = $gridSummary.rows;
	$: currentCols = $gridSummary.cols;

	$: if (!editingRows) {
		rowInput = currentRows;
	}

	$: if (!editingCols) {
		colInput = currentCols;
	}

	$: clampedRows = clampDimension(rowInput, currentRows);
	$: clampedCols = clampDimension(colInput, currentCols);
	$: canApplyResize = clampedRows !== currentRows || clampedCols !== currentCols;

	const componentDefinitions = COMPONENT_DEFINITIONS;

	function clampDimension(value: number, fallback: number) {
		if (Number.isNaN(value)) return fallback;
		return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(value)));
	}

	function selectTool(tool: ToolId) {
		selectedTool.set(tool);
	}

	function applyResize() {
		if (!canApplyResize) return;
		gridStore.resize(clampedRows, clampedCols);
	}

	function handleReset() {
		gridStore.reset();
	}

	function handleInput(event: Event, setter: (value: number) => void) {
		const target = event.currentTarget as HTMLInputElement;
		setter(Number.parseInt(target.value, 10));
	}

	function formatShortcut(shortcut?: string) {
		if (!shortcut) return '';
		return shortcut === 'Space' ? 'Space' : shortcut.toUpperCase();
	}
</script>

<div class="flex flex-wrap gap-6 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
	<div class="flex flex-1 flex-wrap items-center gap-3">
		<div class="flex items-center gap-2">
			<label class="text-sm font-medium text-slate-600" for="rows-input">Rows</label>
			<input
				id="rows-input"
				type="number"
				min={MIN_GRID_SIZE}
				max={MAX_GRID_SIZE}
				class="h-9 w-20 rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				value={rowInput}
				on:focus={() => (editingRows = true)}
				on:blur={() => {
					editingRows = false;
					applyResize();
				}}
				on:input={(event) => handleInput(event, (value) => (rowInput = value))}
			/>
		</div>
		<div class="flex items-center gap-2">
			<label class="text-sm font-medium text-slate-600" for="cols-input">Columns</label>
			<input
				id="cols-input"
				type="number"
				min={MIN_GRID_SIZE}
				max={MAX_GRID_SIZE}
				class="h-9 w-24 rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				value={colInput}
				on:focus={() => (editingCols = true)}
				on:blur={() => {
					editingCols = false;
					applyResize();
				}}
				on:input={(event) => handleInput(event, (value) => (colInput = value))}
			/>
		</div>
		<button
			type="button"
			class="inline-flex h-9 items-center rounded bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
			on:click={applyResize}
			disabled={!canApplyResize}
		>
			Apply size
		</button>
		<button
			type="button"
			class="inline-flex h-9 items-center rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
			on:click={handleReset}
		>
			Reset layout
		</button>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{#each TOOLBAR_BUTTONS as tool}
			<button
				type="button"
				class={`group relative inline-flex items-center justify-center rounded border px-3 py-1.5 text-sm font-medium transition ${
					tool.id === $selectedTool
						? 'border-blue-500 bg-blue-50 text-blue-700'
						: 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600'
				}`}
				on:click={() => selectTool(tool.id)}
				title={`${tool.description}${tool.shortcut ? ` — Shortcut ${formatShortcut(tool.shortcut)}` : ''}`}
			>
				{#if tool.icon}
					<span class="mr-1 text-base leading-none">{tool.icon}</span>
				{/if}
				{tool.label}
				{#if tool.shortcut}
					<span
						class="ml-1 hidden rounded bg-slate-200 px-1 text-[10px] font-semibold text-slate-600 group-hover:inline"
					>
						{formatShortcut(tool.shortcut)}
					</span>
				{/if}
			</button>
		{/each}
	</div>
</div>

<div
	class="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600"
>
	<div>
		<strong class="font-semibold text-slate-700">Grid size:</strong>
		{currentRows} × {currentCols}
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{#each componentDefinitions as definition}
			<div class="inline-flex items-center gap-1 rounded bg-white px-2 py-1 shadow-sm">
				<span
					class="inline-flex h-5 w-5 items-center justify-center rounded"
					style={`background-color: ${definition.fill}`}
					>{definition.icon ?? definition.symbol}</span
				>
				<span>{definition.label}:</span>
				<span class="font-semibold text-slate-900">{$gridSummary.counts[definition.type]}</span>
			</div>
		{/each}
	</div>
</div>
