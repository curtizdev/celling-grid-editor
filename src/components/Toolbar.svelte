<script lang="ts">
	import { selectedTool } from '../stores/grid';

	const tools = [
		{ id: 'light', label: 'Light' },
		{ id: 'air', label: 'Air Supply' },
		{ id: 'smoke', label: 'Smoke Detector' },
		{ id: 'invalid', label: 'Invalid Tile' }
	] as const;

	type ToolId = (typeof tools)[number]['id'];

	function selectTool(toolId: ToolId) {
		selectedTool.set(toolId);
	}
</script>

<div class="flex flex-wrap items-center gap-2 border-b border-gray-300 bg-gray-100 p-2">
	{#each tools as tool}
		<button
			type="button"
			class="rounded border border-gray-300 bg-white px-3 py-1 text-sm
             font-medium hover:bg-gray-200
             {tool.id === $selectedTool ? 'border-blue-500 bg-blue-100' : ''}"
			on:click={() => selectTool(tool.id)}
		>
			{tool.label}
		</button>
	{/each}
</div>
