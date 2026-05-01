# PLC Ladder Studio

PLC Ladder Studio is a local web/PWA editor and simulator for educational PLC ladder logic. It runs in the browser, stores projects as `.plclad` JSON files, and can export a simplified Structured Text file.

PLC Ladder Studio to lokalny edytor i symulator LAD/PLC działający w przeglądarce. Aplikacja zapisuje projekty jako pliki `.plclad`, umożliwia cykliczną symulację scan cycle i eksportuje uproszczony Structured Text.

> Educational simulator only. This is not a tool for controlling a real PLC or safety-critical equipment.
>
> To symulator edukacyjny. Nie służy do sterowania prawdziwym PLC ani układami krytycznymi dla bezpieczeństwa.

## Screenshot

Placeholder: release screenshots should show the block library, React Flow ladder editor, simulation panel, variable table, and validation panel in light and dark mode.

## Features / Funkcje

- React Flow ladder editor with drag & drop blocks.
- Power rails: `LEFT_RAIL` and `RIGHT_RAIL`.
- Scan cycle simulation: RUN, STOP, Step Scan, Reset Simulation.
- PLC elements: NO/NC contacts, COIL, SET/RESET, TON, TOF, TP, CTU, CTD.
- Variables: BOOL, TIMER, COUNTER.
- Live simulation highlighting for active elements and connections.
- Undo/Redo, copy/paste, multi-select, snap to grid, auto-layout.
- Validation for variable names, addresses, types, rails, cycles, and unsafe output connections.
- Save/Open `.plclad` projects.
- Export simplified Structured Text (`project.st`).
- Dark mode, Polish/English UI, onboarding, local autosave.
- PWA build with offline cache and installable app manifest.

## Run Locally / Uruchomienie

```bash
npm install
npm run dev
npm run build
npm test
```

Optional lint:

```bash
npm run lint
```

## Project Format `.plclad`

`.plclad` is JSON with a central `Project` model:

```ts
type Project = {
  id: string
  name: string
  version: string
  variables: Variable[]
  rungs: Rung[]
}
```

The file stores only the project model: variables, rungs, ladder elements, positions, rail/element connections, comments, and breakpoints. Runtime-only state is not stored in `.plclad`: simulation highlights, scan count, undo/redo history, selected nodes, language, and theme.

Autosave, theme, language, and onboarding choices are stored separately in `localStorage`.

## Supported PLC Elements

- Contacts: `NO_CONTACT`, `NC_CONTACT`
- Outputs: `COIL`, `SET_COIL`, `RESET_COIL`
- Timers: `TON`, `TOF`, `TP`
- Counters: `CTU`, `CTD`
- Rails: logical left/right power rails represented through connections

## Address Formats

- Inputs: `%I0.0`
- Outputs: `%Q0.0`
- Markers: `%M0.0`
- Timers: `%T1`
- Counters: `%C1`

## Structured Text Export

Export is intentionally simplified. It supports common linear/OR ladder expressions, timers, counters, SET and RESET coils. Unsupported or ambiguous fragments are emitted as `TODO` comments instead of crashing.

## Limitations / Ograniczenia

- This is a browser-only simulator, not a certified PLC programming tool.
- No backend, login, Modbus, OPC UA, Tauri, Android, or real PLC communication.
- Structured Text export is educational and should be reviewed manually.
- Complex ladder patterns may require manual validation even when the app can simulate them.
- Timer/counter behavior follows the local scan interval and simplified state model.

## Roadmap

Version 1.1 candidates:

- Better diagnostics for complex branches.
- More complete Structured Text generation.
- Project examples gallery.
- Import/export validation reports.
- Optional PWA install prompt polish.
- More UI tests for React Flow interactions.
- Future PLC blocks only after the RC engine is stable.
