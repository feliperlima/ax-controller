# Parameter Maps

## Purpose
This document describes how parameter maps are organized in the current app and how to treat confirmed, legacy, and experimental mappings.

## Rules
- Confirmed mappings belong in the code and in the docs.
- Experimental mappings must be clearly marked as experimental and must not replace confirmed values silently.
- Unknown parameters should not overwrite known state unless the profile and domain are both verified.
- If a map differs by model, the model profile must select it explicitly.

## Current model strategy
- AX16 and AX24 share the same profile family for most behavior.
- AX32 uses distinct mappings where the mixer layout differs.
- Meter, send, group, and detail mappings should all respect the active profile.

## What belongs here
- Where parameter ranges live.
- Which layer owns each mapping.
- Which mappings are confirmed and safe to depend on.
- Which mappings are still provisional and should not be used as truth without validation.

## What does not belong here
- Long feature specs.
- SDD-style task breakdowns.
- Historical debate notes.
- Discovery logs that are no longer useful.

## FX preset parameter map policy
- Preset schema universal; parameter map per model and per FX bus.
- AX16/AX24 and AX32 do not share FX preset parameter IDs.
- AX32 selector IDs must stay in an explicit table.

## FX preset maps (current)
- AX16/AX24 (2 FX buses, confirmed by current code path):
	- selector: 3097
	- controlA: 2940
	- controlB: 2941
	- Note: in current code path, no explicit FX2-specific selector/control params were found.
	- Pending validation: AX16/AX24 FX2 preset selector/control params precisam ser recuperados de logs antigos ou novo teste.
- AX32 (4 FX buses, capture-confirmed):
	- FX1: selector 5117, controlA 2754, controlB 2755
	- FX2: selector 5117, controlA 2785, controlB 2786
	- FX3: selector 5118, controlA 2816, controlB 2817
	- FX4: selector 5119, controlA 2847, controlB 2848
	- Control A/B values align with +31 stride, but explicit mapping remains canonical.
	- 4895 is observed/unknown and must not be used as a preset selector.

## FX meters (AX32 capture-confirmed)
- FX1 2864, FX2 2865, FX3 2866, FX4 2867.
- Observed floor near silence: ~46517; larger values indicate stronger signal.
- Param 2862 varies and must not be treated as confirmed individual FX meter without new validation.
- AX32 AUX meters 8-14 remain pending validation.
