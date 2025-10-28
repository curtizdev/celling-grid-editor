<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		CELL_DEFINITIONS,
		CELL_SIZE_PX,
		CELL_TYPE_TO_INDEX,
		type CellDefinition,
		type CellType
	} from '$lib/types/grid';
	import { gridStore, selectedTool, type GridState, type ToolId } from '$lib/stores/grid-store';

	type PointerMode = 'idle' | 'panning' | 'painting' | 'moving';
	type CellPosition = { row: number; col: number };
	type DragSource = { row: number; col: number; typeIndex: number };

	const MIN_SCALE = 0.25;
	const MAX_SCALE = 3;
	const ZOOM_INTENSITY = 0.0015;

	let container: HTMLDivElement | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;

	let gridState: GridState = get(gridStore);
	let activeTool: ToolId = get(selectedTool);
	let toolBeforeSpace: ToolId | null = null;

	let viewportWidth = 0;
	let viewportHeight = 0;
	let devicePixelRatioValue = 1;

	let translateX = 0;
	let translateY = 0;
	let scale = 1;

	let pointerMode: PointerMode = 'idle';
	let activePointerId: number | null = null;
	let panStart = { x: 0, y: 0, translateX: 0, translateY: 0 };
	let dragSource: DragSource | null = null;
	let dragTarget: CellPosition | null = null;
	let hoverCell: CellPosition | null = null;
	let paintType: CellType | null = null;

	let animationHandle: number | null = null;

	const TOOL_TO_CELL_TYPE: Record<ToolId, CellType | null> = {
		light: 'light',
		'air-supply': 'air-supply',
		'air-return': 'air-return',
		'smoke-detector': 'smoke-detector',
		invalid: 'invalid',
		erase: 'empty',
		move: null,
		pan: null
	};

	const scheduleDraw = () => {
		if (!canvas || !ctx) return;
		if (animationHandle) cancelAnimationFrame(animationHandle);
		animationHandle = requestAnimationFrame(drawScene);
	};

	const resizeCanvas = () => {
		if (!container || !canvas) return;
		const rect = container.getBoundingClientRect();
		viewportWidth = rect.width;
		viewportHeight = rect.height;
		devicePixelRatioValue = window.devicePixelRatio ?? 1;

		canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatioValue));
		canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatioValue));
		canvas.style.width = `${rect.width}px`;
		canvas.style.height = `${rect.height}px`;

		scheduleDraw();
	};

	const unsubscribeGrid = gridStore.subscribe((next) => {
		gridState = next;
		scheduleDraw();
	});

	const unsubscribeTool = selectedTool.subscribe((next) => {
		activeTool = next;
		if (pointerMode === 'painting') {
			paintType = TOOL_TO_CELL_TYPE[next];
		}
	});

	onMount(() => {
		if (!canvas) return;
		ctx = canvas.getContext('2d', { desynchronized: true });
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;

		resizeCanvas();
		const resizeObserver = new ResizeObserver(resizeCanvas);
		if (container) resizeObserver.observe(container);

		canvas.addEventListener('contextmenu', (event) => event.preventDefault());

		return () => {
			resizeObserver.disconnect();
		};
	});

	onDestroy(() => {
		unsubscribeGrid();
		unsubscribeTool();
		if (animationHandle) cancelAnimationFrame(animationHandle);
	});

	const drawScene = () => {
		animationHandle = null;
		if (!ctx || !canvas) return;

		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.restore();

		ctx.save();
		ctx.scale(devicePixelRatioValue, devicePixelRatioValue);
		ctx.translate(translateX, translateY);
		ctx.scale(scale, scale);

		const { rows, cols, data } = gridState;
		const cellSize = CELL_SIZE_PX;

		ctx.fillStyle = '#e2e8f0';
		ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

		const visibleLeft = -translateX / scale;
		const visibleTop = -translateY / scale;
		const visibleRight = visibleLeft + viewportWidth / scale;
		const visibleBottom = visibleTop + viewportHeight / scale;

		const startCol = Math.max(0, Math.floor(visibleLeft / cellSize));
		const endCol = Math.min(cols, Math.ceil(visibleRight / cellSize));
		const startRow = Math.max(0, Math.floor(visibleTop / cellSize));
		const endRow = Math.min(rows, Math.ceil(visibleBottom / cellSize));

		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = `${Math.max(16, cellSize / 2)}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Inter', 'Roboto', sans-serif`;

		for (let row = startRow; row < endRow; row += 1) {
			for (let col = startCol; col < endCol; col += 1) {
				const index = row * cols + col;
				const typeIndex = data[index] ?? 0;
				const definition: CellDefinition | undefined = CELL_DEFINITIONS[typeIndex];
				if (!definition) continue;
				const x = col * cellSize;
				const y = row * cellSize;

				if (definition.type !== 'empty') {
					ctx.fillStyle = definition.fill;
					ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
					const glyph = definition.icon || definition.symbol;
					if (glyph) {
						ctx.fillStyle = '#0f172a';
						ctx.fillText(glyph, x + cellSize / 2, y + cellSize / 2 + 1);
					}
				}

				ctx.strokeStyle = '#94a3b8';
				ctx.lineWidth = 1 / scale;
				ctx.strokeRect(x, y, cellSize, cellSize);

				const isHover = hoverCell && hoverCell.row === row && hoverCell.col === col;
				const isSource = dragSource && dragSource.row === row && dragSource.col === col;
				const isTarget = dragTarget && dragTarget.row === row && dragTarget.col === col;

				if (isHover || isSource || isTarget) {
					ctx.lineWidth = 2 / scale;
					ctx.strokeStyle = isSource ? '#1d4ed8' : isTarget ? '#f97316' : '#2563eb';
					ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
				}
			}
		}

		ctx.restore();
	};

	const pointerToCell = (event: PointerEvent): CellPosition | null => {
		if (!container) return null;
		const rect = container.getBoundingClientRect();
		const x = (event.clientX - rect.left - translateX) / scale;
		const y = (event.clientY - rect.top - translateY) / scale;
		const row = Math.floor(y / CELL_SIZE_PX);
		const col = Math.floor(x / CELL_SIZE_PX);
		if (row < 0 || col < 0 || row >= gridState.rows || col >= gridState.cols) return null;
		return { row, col };
	};

	const shouldPan = (event: PointerEvent) =>
		event.button === 1 ||
		event.button === 2 ||
		activeTool === 'pan' ||
		event.altKey ||
		event.metaKey;

	const beginPan = (event: PointerEvent) => {
		pointerMode = 'panning';
		panStart = {
			x: event.clientX,
			y: event.clientY,
			translateX,
			translateY
		};
	};

	const beginPainting = (cell: CellPosition) => {
		const mapped = TOOL_TO_CELL_TYPE[activeTool];
		if (mapped === undefined || mapped === null) {
			pointerMode = 'idle';
			return;
		}
		pointerMode = 'painting';
		paintType = mapped;
		applyPaint(cell.row, cell.col);
	};

	const beginMove = (cell: CellPosition) => {
		const index = cell.row * gridState.cols + cell.col;
		const typeIndex = gridState.data[index];
		if (typeIndex === 0) {
			pointerMode = 'idle';
			return;
		}
		pointerMode = 'moving';
		dragSource = { row: cell.row, col: cell.col, typeIndex };
		dragTarget = cell;
		scheduleDraw();
	};

	const handlePointerDown = (event: PointerEvent) => {
		if (!canvas) return;
		canvas.focus();
		canvas.setPointerCapture(event.pointerId);
		activePointerId = event.pointerId;

		if (shouldPan(event)) {
			beginPan(event);
			return;
		}

		const cell = pointerToCell(event);
		if (!cell) {
			pointerMode = 'idle';
			return;
		}

		hoverCell = cell;
		scheduleDraw();

		if (activeTool === 'move') {
			beginMove(cell);
			return;
		}

		if (activeTool === 'erase') {
			pointerMode = 'painting';
			paintType = 'empty';
			applyPaint(cell.row, cell.col);
			return;
		}

		beginPainting(cell);
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (activePointerId !== event.pointerId) return;
		if (pointerMode === 'panning') {
			translateX = panStart.translateX + (event.clientX - panStart.x);
			translateY = panStart.translateY + (event.clientY - panStart.y);
			scheduleDraw();
			return;
		}

		const cell = pointerToCell(event);
		hoverCell = cell;

		if (pointerMode === 'painting' && paintType && cell) {
			applyPaint(cell.row, cell.col);
		} else if (pointerMode === 'moving') {
			dragTarget = cell;
			scheduleDraw();
		}
	};

	const handlePointerUp = (event: PointerEvent) => {
		if (activePointerId !== event.pointerId) return;
		canvas?.releasePointerCapture(event.pointerId);
		if (pointerMode === 'moving' && dragSource && dragTarget) {
			if (dragSource.row !== dragTarget.row || dragSource.col !== dragTarget.col) {
				gridStore.moveCell(dragSource.row, dragSource.col, dragTarget.row, dragTarget.col);
			}
		}
		resetPointerState();
	};

	const handlePointerCancel = (event: PointerEvent) => {
		if (activePointerId !== event.pointerId) return;
		resetPointerState();
	};

	const resetPointerState = () => {
		pointerMode = 'idle';
		activePointerId = null;
		panStart = { x: 0, y: 0, translateX: 0, translateY: 0 };
		dragSource = null;
		dragTarget = null;
		paintType = null;
		hoverCell = null;
		scheduleDraw();
	};

	const applyPaint = (row: number, col: number) => {
		if (!paintType) return;
		const index = row * gridState.cols + col;
		const currentIndex = gridState.data[index];
		if (paintType === 'empty') {
			if (currentIndex !== 0) {
				gridStore.clearCell(row, col);
			}
			return;
		}

		const mapped = CELL_TYPE_TO_INDEX.get(paintType);
		if (mapped === undefined) return;
		if (currentIndex === mapped) return;
		gridStore.setCell(row, col, paintType);
	};

	const handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		const rect = container?.getBoundingClientRect();
		if (!rect) return;
		const zoomDelta = -event.deltaY * ZOOM_INTENSITY;
		const zoomFactor = Math.exp(zoomDelta);
		const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));

		const cursorX = event.clientX - rect.left;
		const cursorY = event.clientY - rect.top;

		translateX = cursorX - ((cursorX - translateX) * nextScale) / scale;
		translateY = cursorY - ((cursorY - translateY) * nextScale) / scale;
		scale = nextScale;
		scheduleDraw();
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.code === 'Space' && toolBeforeSpace === null) {
			event.preventDefault();
			toolBeforeSpace = activeTool;
			selectedTool.set('pan');
		}
	};

	const handleKeyUp = (event: KeyboardEvent) => {
		if (event.code === 'Space' && toolBeforeSpace) {
			event.preventDefault();
			selectedTool.set(toolBeforeSpace);
			toolBeforeSpace = null;
		}
	};
</script>

<div
	bind:this={container}
	class="relative h-full w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-100"
>
	<canvas
		bind:this={canvas}
		tabindex="0"
		class="h-full w-full touch-none focus:outline-none"
		on:pointerdown={handlePointerDown}
		on:pointermove={handlePointerMove}
		on:pointerup={handlePointerUp}
		on:pointercancel={handlePointerCancel}
		on:pointerleave={() => {
			hoverCell = null;
			scheduleDraw();
		}}
		on:wheel={handleWheel}
		on:keydown={handleKeyDown}
		on:keyup={handleKeyUp}
	></canvas>

	{#if pointerMode === 'moving' && dragSource && dragTarget}
		<div
			class="pointer-events-none absolute top-3 left-3 rounded bg-slate-900/70 px-2 py-1 text-xs font-medium text-slate-50"
		>
			Moving to ({dragTarget.row + 1}, {dragTarget.col + 1})
		</div>
	{:else if hoverCell}
		<div
			class="pointer-events-none absolute top-3 left-3 rounded bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-50"
		>
			Cell ({hoverCell.row + 1}, {hoverCell.col + 1})
		</div>
	{/if}
</div>
