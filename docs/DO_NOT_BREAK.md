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

## Operational rule
If a change touches any of these areas, validate it on hardware or with the narrowest reliable check available before calling it done.
