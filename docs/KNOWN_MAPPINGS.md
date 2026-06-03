# Known Mappings

This file keeps only mappings and structural facts that are useful to remember while maintaining the current app.

## Confirmed or currently trusted
- AX32 FX meter params used by the current app: 2864, 2865, 2866, 2867.
- AX16 and AX24 remain on the shared legacy profile family.
- AX32 uses a distinct profile path and its own parameter handling where needed.
- DCA groups, mute groups, scenes, and FX presets are first-class app features and should stay guarded by profile and domain logic.

## Keep this short
- If a mapping is not confirmed, mark it as experimental or omit it.
- Do not invent new raw values in documentation.
- When a mapping changes, update the code first or in lockstep with the doc.

## Good candidates for future additions
- Channel, AUX, master, solo, phones, patching, and routing mappings once they are explicitly confirmed in code or capture.
- Profile-specific meter maps once validated on hardware.
