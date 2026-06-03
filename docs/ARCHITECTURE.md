# Architecture

## Overview
AX Control is a Tauri desktop app with a React + TypeScript UI and a Rust backend. It connects to DUONN Axios mixers over WebSocket and keeps the app state synchronized with mixer state, local UI actions, and profile-specific behavior.

## Main layers

### UI layer
- React screens and components render the mixer, channels, AUX, FX, master, DCA groups, mute groups, scenes, and licensing UI.
- App-level orchestration lives in [../apps/desktop/src/App.tsx](../apps/desktop/src/App.tsx).

### State and services
- Local state is split across UI state, protocol state, and profile-aware resolver logic.
- The app depends on a parameter store and profile-aware helpers so writes and reads stay aligned with the active mixer model.

### Protocol layer
- [../apps/desktop/src/lib/axios16Client.ts](../apps/desktop/src/lib/axios16Client.ts) handles WebSocket transport, batched reads, writes, and raw packets.
- Protocol helpers decode and encode mixer state using model-aware mappings.

### Backend layer
- [../apps/desktop/src-tauri/src/lib.rs](../apps/desktop/src-tauri/src/lib.rs) supports discovery and backend-side responsibilities such as licensing-related checks.

## Model profiles
- AX16 and AX24 share the same general profile family.
- AX32 uses a distinct profile path and distinct mappings where required.
- Feature behavior should always branch by profile rather than by hardcoded assumptions.

## UI surfaces
- Splash and device selection happen before the mixer view.
- The mixer view contains channels, AUX, FX, master, DCA groups, mute groups, scenes, and detail views.

## Stability rule
Keep the current functional behavior intact. Documentation should describe what the app already does, not propose new architecture by default.
