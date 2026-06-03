# Protocol Notes

## WebSocket
- The app talks to the mixer over WebSocket.
- Reads should be batched when possible.
- Writes should go through the protocol layer, not directly from React components.

## RX/TX behavior
- RX should be deterministic and tolerant of partial data.
- Unknown opcodes or parameters should be cataloged instead of silently ignored.
- Polling must not spam the console or break sync loops.

## Sync and boot
- Boot sync should be incremental and safe.
- Reconnect should clear stale timers and stale local assumptions.
- RX from the mixer always wins over stale optimistic state.

## Profiles
- AX16, AX24, and AX32 must be handled through profile-aware resolution.
- Do not assume one linear parameter formula fits every profile.
- Confirmed profile-specific behavior should be encoded in the app, not inferred from incidental values.

## Licensing gate
- Licensing state is a gate in the operational flow.
- The app should not rely on local guesses when the backend has already returned a normalized licensing result.
- Server time is preferred for trial and expiry decisions.

## Logging
- Keep logging minimal in normal use.
- Debug logs that only helped discovery belong in archive or should stay behind explicit flags.
