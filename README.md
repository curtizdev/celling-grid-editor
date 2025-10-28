# Ceiling Grid Editor

An interactive Svelte + TypeScript prototype for the Consigli frontend take-home assessment. The app lets designers sketch a rectangular ceiling plan, populate tiles with building services, pan/zoom around large layouts, and resize the grid without losing work. The implementation favours clarity, predictable state management, and rendering performance.

## ✨ Feature highlights

- **Fast canvas renderer** – A single HTML canvas draws only the visible tiles, so even a 1000×1000 grid remains responsive.
- **Drag-and-drop editing** – Click to paint fixtures, drag existing components to new locations, or erase tiles with one gesture.
- **Pan & zoom** – Scroll to zoom, hold <kbd>Space</kbd> (or pick the Pan tool) to drag the viewport. Pointer captures keep interactions smooth on touch devices.
- **Resizable layout** – Update width/height at any time; existing components are preserved where possible. Layouts persist in `localStorage` across refreshes.
- **Clear tooling** – Toolbar buttons show keyboard shortcuts and real-time counts of each fixture type for quick auditing.

## 🧱 Architecture overview

| Area                                   | Notes                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/grid.ts`                | Centralises grid constants, cell metadata, and size constraints.                                                                          |
| `src/lib/stores/grid-store.ts`         | Svelte store that keeps grid state in a typed array, exposes mutation helpers (set, move, resize, reset), and persists to `localStorage`. |
| `src/lib/components/GridCanvas.svelte` | Canvas renderer + interaction layer (paint, move, pan, zoom). Only the visible cells are redrawn per frame.                               |
| `src/lib/components/Toolbar.svelte`    | Tool selection, grid resizing controls, and live inventory metrics.                                                                       |
| `src/routes/+page.svelte`              | Page shell, copy, and layout; stitches toolbar and canvas together.                                                                       |

The project keeps shared pieces in `$lib` and exports them via `src/lib/index.ts` for clean imports.

## 🚀 Getting started

Install dependencies and launch the dev server:

```bash
pnpm install
pnpm dev -- --open
```

### Tests & linting

```bash
pnpm test        # Vitest + @vitest/browser smoke tests
pnpm lint        # ESLint + TypeScript checking (configured via eslint.config.js)
```

## 🕹️ Using the editor

1. Select a component in the toolbar (Light, Air Supply, Air Return, Smoke, Invalid, Move, Erase, or Pan).
2. Click or drag on the canvas to paint fixtures. Components snap to 0.6 m × 0.6 m tiles.
3. Choose **Move** to drag a placed component to a different tile.
4. Adjust **Rows** or **Columns** and press **Apply size** to grow/shrink the room. Existing fixtures are preserved within the new bounds.
5. Hold <kbd>Space</kbd> (or select **Pan**) to move the viewport. Scroll to zoom in/out.

### Performance notes

- Rendering work is limited to the visible window, so zoomed-in editing stays smooth on large grids.
- Grid data lives in a `Uint8Array`, keeping updates compact and serialisable for persistence.
- Pointer capture plus desynchronised canvas contexts reduce input latency on high-density screens.

## 📁 Folder structure

```
src/
├─ lib/
│  ├─ components/
│  │  ├─ GridCanvas.svelte
│  │  └─ Toolbar.svelte
│  ├─ stores/
│  │  └─ grid-store.ts
│  ├─ types/
│  │  └─ grid.ts
│  └─ index.ts
└─ routes/
	└─ +page.svelte
```

## ♻️ Persistence & data model

- Layouts persist to `localStorage` under `ceiling-grid-state-v2`.
- A simple version flag allows for schema migrations without corrupting saved layouts.
- The toolbar surfaces live counts for each component type, keeping quick reports a glance away.

## 🔒 Accessibility & UX quick wins

- Canvas exposes hover feedback and coordinate readouts for screen magnifiers.
- Keyboard shortcuts (1-5, <kbd>M</kbd>, <kbd>E</kbd>, <kbd>Space</kbd>) ensure power users can stay on the keyboard.
- Inputs honour min/max bounds and validate on blur as well as on explicit apply.

## 🗺️ Future enhancements

- Snap-to-grid guidelines when dragging components for greater clarity.
- Export/import layouts as JSON for collaboration.
- Multi-selection to move groups of fixtures at once.

---

Prepared as a focused, production-style prototype to demonstrate architecture choices, interaction design, and performance optimisations expected in the Consigli take-home assessment.
