# Known Mappings

This file keeps only mappings and structural facts that are useful to remember while maintaining the current app.

## FX preset architecture
- Preset schema universal; parameter map per model and per FX bus.
- Preset IDs/values are shared across AX16, AX24, and AX32 (1-16).
- Control A/B meaning and ranges are shared by preset family; param IDs vary by model/bus.

## Confirmed or currently trusted
- AX32 FX meter params used by the current app: 2864, 2865, 2866, 2867.
- AX16 and AX24 remain on the shared legacy profile family.
- AX32 uses a distinct profile path and its own parameter handling where needed.
- DCA groups, mute groups, scenes, and FX presets are first-class app features and should stay guarded by profile and domain logic.

## Preset values (universal AX16/AX24/AX32)
- 1: Reverb Hall
- 2: Reverb Room
- 3: Reverb Plate
- 4: Reverb Vocal 1
- 5: Reverb Vocal 2
- 6: Vocal Echo 1
- 7: Vocal Echo 2
- 8: Delay 1
- 9: Delay 2
- 10: Mod. Delay
- 11: Reverb Gate
- 12: Pitch Change
- 13: Chorus
- 14: Phaser
- 15: Flange
- 16: Tremolo

## Control A/B rules (universal schema)
- Presets 1-5: Control A = Reverb PreDelay (0-30 ms), Control B = Reverb Duration (0.0-10.0, raw 0-100).
- Presets 6-10: Control A = Echo Delay (0-340 ms), Control B = Echo Repeat (0-100%).
- Preset 11: Control A = Echo Delay (0-10 s), Control B = Echo Repeat (0-100%).
- Preset 12: Control A = Slope (0-63), Control B = Depth (0-100%).
- Presets 13-16: Control A = Frequency (0-127 Hz), Control B = Depth (0-100%).

## AX16/AX24 FX Presets (confirmed by current code)
- FX bus count: 2.
- Current mapping in app code uses the same param triplet for both FX1 and FX2:
	- Preset selector: 3097
	- Control A: 2940
	- Control B: 2941
- In current code path, no explicit AX16/AX24 FX2-specific selector/control params were found.
- In current code path, no additional pre-selection/context param write was found before using 3097/2940/2941.
- Pending validation note: AX16/AX24 FX2 preset selector/control params precisam ser recuperados de logs antigos ou novo teste.

## AX32 FX meters (capture-confirmed)
- FX1 meter: 2864 (0x0B30)
- FX2 meter: 2865 (0x0B31)
- FX3 meter: 2866 (0x0B32)
- FX4 meter: 2867 (0x0B33)
- Observed floor near silence: ~46517
- Higher values indicate stronger signal level.

## AX32 FX Presets (capture-confirmed)
- FX1: selector 5117, Control A 2754, Control B 2755
- FX2: selector 5117, Control A 2785, Control B 2786
- FX3: selector 5118, Control A 2816, Control B 2817
- FX4: selector 5119, Control A 2847, Control B 2848
- Selector mapping must stay explicit.
- Control A/B values follow +31 stride across FX blocks, but keep explicit mapping as source of truth.
- AX16/AX24 preset params (3097/2940/2941) must not be reused as AX32 FX preset mapping.
- 4895: observed/unknown; do not use as preset selector.

## Input Source Mode — all models
value 0 = USB Return / REC PLAY (digital source)
value 1 = Physical input / MIC-LINE (analog source)

### AX16/AX24 (confirmed by project runtime mapping)
- Input Level:        param = 2815 + channelIndex (0-based). CH1=2815, CH2=2816.
- Rec/Play Volume:    param = 2833 + channelIndex. CH1=2833, CH2=2834.
- Input Source Mode:  param = 2849 + channelIndex. CH1=2849, CH2=2850, CH24=2872.
- Indexed directly by channel — no patch map indirection.

### AX32 (confirmed by runtime capture)
- Record Out To Channel: params 2565..2596. formula = 2564 + recordSlot (slot 1..32). value = channelNumber.
- Input Source Mode:     params 2661..2692. formula = 2660 + recordSlot. value 0=USB, 1=MIC-LINE.
- Physical Input Mapping: params 2693..2724. formula = 2692 + channelNumber. value 0=unpatched, 1..32=physical input.
- Input Source Mode is NOT indexed by channel strip — it is indexed by USB return slot.
- To toggle CH1 inputSourceMode: look up Record Out map → find slot → write param (2660+slot).
- Example: CH1 on USB return slot 3 → toggle writes param 2663.

## AX32 notes still under validation
- Param 2862 can vary, but must not be treated as a confirmed individual FX meter without new capture tests.
- AX32 AUX meters 8-14 still require dedicated validation.

## Keep this short
- If a mapping is not confirmed, mark it as experimental or omit it.
- Do not invent new raw values in documentation.
- When a mapping changes, update the code first or in lockstep with the doc.

## Good candidates for future additions
- Channel, AUX, master, solo, phones, patching, and routing mappings once they are explicitly confirmed in code or capture.
- Profile-specific meter maps once validated on hardware.
