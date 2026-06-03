# Test Checklist

Use this checklist for manual validation of the current app.

## Build and typecheck
- Run typecheck.
- Run build.
- Confirm the app starts locally without new warnings or errors.

## Connection
- Connect to the mixer.
- Confirm discovery and manual IP connection behavior.
- Confirm reconnect after disconnect.

## Sync
- Confirm boot sync completes.
- Confirm state recovers after reconnect.
- Confirm the app does not spam the console in normal use.

## Controls
- Fader movement.
- Mute toggles.
- Solo toggles.
- DCA groups.
- Mute groups.
- FX presets.
- Scenes call/save/rename.
- Patching and routing screens.

## Meters
- Channels.
- AUX.
- FX.
- Master.
- AX16, AX24, and AX32 profile checks.

## Licensing
- Valid license flow.
- Trial flow.
- Expired or blocked license behavior.

## Final rule
If a test reveals a profile-specific issue, document the confirmed behavior in [KNOWN_MAPPINGS.md](KNOWN_MAPPINGS.md) rather than expanding the old specs layer.
