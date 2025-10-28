<script lang="ts">
	import Toolbar from '../components/Toolbar.svelte';
	import GridCanvas from '../components/GridCanvas.svelte';
</script>

<div class="flex min-h-screen flex-col bg-slate-50">
	<header class="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
		<h1 class="text-2xl font-semibold text-slate-900">Room Ceiling Grid Editor</h1>
		<p class="mt-1 max-w-3xl text-sm text-slate-600">
			Design, adjust, and review ceiling layouts quickly. Use the toolbar to choose components,
			resize the grid, and drag existing fixtures to new positions. Hold <kbd>Space</kbd> to pan, and
			scroll to zoom.
		</p>
	</header>
	<Toolbar />
	<main class="flex flex-1 flex-col items-center justify-center p-4">
		<div
			class="relative flex aspect-[4/3] w-full max-w-7xl items-center justify-center rounded-xl bg-white p-4 shadow-lg"
		>
			<GridCanvas />
		</div>
	</main>
</div>
