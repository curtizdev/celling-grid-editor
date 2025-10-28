<script lang="ts">
	import { grid, selectedTool } from '../stores/grid';
	import { get } from 'svelte/store';

	let isPanning = false;
	let startX = 0,
		startY = 0;
	let translateX = 0,
		translateY = 0;
	let scale = 1;

	// When the user clicks a tile, place the selected component there
	function placeComponent(row: number, col: number) {
		const tool = get(selectedTool);
		grid.update((g) => {
			// Make a deep copy of the grid to avoid mutating state in place
			const newGrid = g.map((row) => [...row]);
			newGrid[row][col] = tool;
			return newGrid;
		});
	}

	// Mouse/touch event handlers for panning and zooming
	function onPointerDown(event: PointerEvent) {
		isPanning = true;
		// record starting position of pointer and current translate offsets
		startX = event.clientX - translateX;
		startY = event.clientY - translateY;
		if (event.currentTarget instanceof Element) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
	}
	function onPointerMove(event: PointerEvent) {
		if (!isPanning) return;
		// Calculate new translation as pointer moves
		translateX = event.clientX - startX;
		translateY = event.clientY - startY;
	}
	function onPointerUp(event: PointerEvent) {
		isPanning = false;
		if (event.currentTarget instanceof Element) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}
	function onWheel(event: WheelEvent) {
		event.preventDefault();
		const zoomFactor = 0.1;
		if (event.deltaY < 0) {
			// zoom in
			scale = Math.min(scale + zoomFactor, 2); // cap max zoom (2x)
		} else {
			// zoom out
			scale = Math.max(scale - zoomFactor, 0.5); // cap min zoom (0.5x)
		}
	}
</script>

<!-- Canvas container fills parent, allows pan/zoom via transforms -->
<div
	class="h-full w-full cursor-grab touch-none overflow-hidden"
	on:pointerdown|preventDefault={onPointerDown}
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:wheel={onWheel}
	style="transform: translate({translateX}px, {translateY}px) scale({scale}); transform-origin: 0 0;"
>
	<!-- Grid of 10x10 tiles -->
	<div class="grid grid-cols-10 grid-rows-10">
		{#each $grid as row, i}
			{#each row as cell, j}
				<button
					type="button"
					class="flex h-[100px] w-[100px] items-center justify-center border border-gray-300 bg-transparent"
					on:click={() => placeComponent(i, j)}
				>
					{#if cell === 'light'}
						<span class="text-lg font-bold text-yellow-500">L</span>
					{:else if cell === 'air'}
						<span class="text-lg font-bold text-blue-500">A</span>
					{:else if cell === 'smoke'}
						<span class="text-lg font-bold text-red-500">S</span>
					{:else if cell === 'invalid'}
						<span class="text-lg font-bold text-gray-800">X</span>
					{:else}
						<!-- empty tile, no content -->
					{/if}
				</button>
			{/each}
		{/each}
	</div>
</div>
