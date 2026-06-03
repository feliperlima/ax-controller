# AX Control Documentation

This is the compact documentation set for the current, functional state of AX Control.

The project is not using formal SDD right now. Keep documentation short, operational, and aligned with what is actually running in the app.

## Core docs
- [ARCHITECTURE.md](ARCHITECTURE.md): app layers, runtime structure, and major services.
- [PROTOCOL_NOTES.md](PROTOCOL_NOTES.md): WebSocket, polling, RX/TX, sync, and protocol notes.
- [PARAMETER_MAPS.md](PARAMETER_MAPS.md): how parameter maps are organized and how to treat confirmed vs experimental mappings.
- [KNOWN_MAPPINGS.md](KNOWN_MAPPINGS.md): confirmed mappings worth keeping visible.
- [DO_NOT_BREAK.md](DO_NOT_BREAK.md): sensitive areas that must stay stable.
- [TEST_CHECKLIST.md](TEST_CHECKLIST.md): manual validation checklist for the current app.

## Archived material
- [archive/README.md](archive/README.md): index of old specs and capture notes moved out of the main docs path.

## Where the code lives
- [../apps/desktop/src/App.tsx](../apps/desktop/src/App.tsx): UI orchestration, meters, and view state.
- [../apps/desktop/src/lib/axios16Client.ts](../apps/desktop/src/lib/axios16Client.ts): WebSocket client and protocol helpers.
- [../apps/desktop/src-tauri/src/lib.rs](../apps/desktop/src-tauri/src/lib.rs): discovery and backend commands.

## Practical rule
If a doc does not help maintain, validate, or audit the current app, it belongs in archive.
