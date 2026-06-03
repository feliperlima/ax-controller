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
