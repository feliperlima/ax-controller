# Do Not Break

These are the sensitive areas that must stay stable.

- WebSocket transport and batched protocol reads.
- Parameter Store and local state reconciliation.
- Boot sync and reconnect flow.
- Profile resolution for AX16, AX24, and AX32.
- Patching and routing behavior.
- License and trial flow.
- Scenes.
- DCA groups.
- Mute groups.
- Solo and phones.
- FX presets.
- Confirmed mappings and meter maps.

## Profile sync guardrail (P0)
- After applying mixer profile changes, keep these globals aligned:
	- ACTIVE_CHANNEL_PROFILE
	- ACTIVE_PROTOCOL_PROFILE
	- ACTIVE_GROUP_PROFILE
	- ACTIVE_BITMASK_PROFILE
- Runtime behavior must not change because of this check.
- If they diverge, emit console warning only.

## FX Presets safety by profile (P0)
- AX16/AX24: supported with params 3097 (preset), 2940 (control A), 2941 (control B).
- AX16/AX24: do not document FX2 dedicated selector/control params as confirmed without logs/new test.
- AX32: supported with model-specific mappings; do not use AX16/AX24 preset params on AX32.
- Keep AX32 selector mapping explicit (no implicit arithmetic selector assumptions).
- Control A/B can be documented as +31 stride between FX blocks, but preserve explicit confirmed values in mapping.

## Operational rule
If a change touches any of these areas, validate it on hardware or with the narrowest reliable check available before calling it done.
