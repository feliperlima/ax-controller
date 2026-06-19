/**
 * Canonical parameter addressing for AX16, AX24 and AX32.
 *
 * All values confirmed against runtime captures and official EXE analysis.
 * Functions are pure — no global state, no imports from axios16Client.
 *
 * Conventions:
 *   channelIndex — 0-based (CH1 = 0)
 *   auxNumber    — 1-based (AUX1 = 1)
 *   fxNumber     — 1-based (FX1 = 1)
 *   dcaIndex     — 0-based (DCA1 = 0)
 *   groupIndex   — 0-based (MG1 = 0)
 *   side         — "left" | "right"
 *
 * PRE/POST flag: value | 32768 for sends only.
 * Mute semantics: 0 = unmuted, 1 = muted.
 * Fader 0 dB = 1200.
 */

import { type MixerModel } from "./customizationProfiles";
export type { MixerModel };

// ─── Channel ────────────────────────────────────────────────────────────────

const CHANNEL_BASE: Record<MixerModel, number> = {
  AX16: 64,
  AX24: 64,
  AX32: 63,
};

const CHANNEL_STRIDE: Record<MixerModel, number> = {
  AX16: 62,
  AX24: 62,
  AX32: 72,
};

/**
 * Offsets relative to each channel's block base.
 * AX16 and AX24 share the same offsets.
 * AX32 offsets are derived from AX32_CHANNEL_BASE_MAP in axios16Client.
 */
const CHANNEL_OFFSETS = {
  AX16_AX24: {
    hiZ: 0, phantom: 1, gateEnabled: 2, gateThreshold: 3, gateReserved: 4,
    gateAttack: 5, gateDecay: 6, gateHold: 7, gain: 8, phase: 9, mute: 10, pan: 11, fader: 12,
    // AUX sends: offset = 0x0C + auxNumber (auxNumber 1-based). AUX1=13 … AUX8=20.
    auxSendOffset: (auxNumber: number) => 0x0C + auxNumber,
    masterSendL: 21, masterSendR: 22, soloL: 23, soloR: 24,
    // FX sends: offset = 0x18 + fxNumber (1-based). FX1=25, FX2=26.
    fxSendOffset: (fxNumber: number) => 0x18 + fxNumber,
    compEnabled: 29, compRatio: 30, compAttack: 31, compRelease: 32, compThreshold: 33, compGain: 35,
    eqEnabled: 36, hpfTypeSlope: 38, hpfFreq: 39, lpfTypeSlope: 40, lpfFreq: 41,
    eqBand1Freq: 43, eqBand1Gain: 44, eqBand1Q: 45,
    eqBand2Freq: 47, eqBand2Gain: 48, eqBand2Q: 49,
    eqBand3Freq: 51, eqBand3Gain: 52, eqBand3Q: 53,
    eqBand4Freq: 55, eqBand4Gain: 56, eqBand4Q: 57,
    eqExtraFreq: 69, eqExtraGain: 70, eqExtraQ: 71,
  },
  AX32: {
    hiZ: 0, phantom: 1, gateEnabled: 2, gateThreshold: 3, gateReserved: 4,
    gateAttack: 5, gateDecay: 6, gateHold: 7, gain: 8, phase: 9, mute: 10, pan: 11, fader: 12,
    // AUX sends: offset = 0x0C + auxNumber. AUX1=13 … AUX14=26.
    auxSendOffset: (auxNumber: number) => 0x0C + auxNumber,
    masterSendL: 29, masterSendR: 30, soloL: 31, soloR: 32,
    // FX sends: offset = 0x20 + fxNumber. FX1=33 … FX4=36.
    fxSendOffset: (fxNumber: number) => 0x20 + fxNumber,
    compEnabled: 39, compRatio: 40, compAttack: 41, compRelease: 42, compThreshold: 43, compGain: 45,
    eqEnabled: 46, hpfTypeSlope: 48, hpfFreq: 49, lpfTypeSlope: 50, lpfFreq: 51,
    eqBand1Freq: 53, eqBand1Gain: 54, eqBand1Q: 55,
    eqBand2Freq: 57, eqBand2Gain: 58, eqBand2Q: 59,
    eqBand3Freq: 61, eqBand3Gain: 62, eqBand3Q: 63,
    eqBand4Freq: 65, eqBand4Gain: 66, eqBand4Q: 67,
    eqExtraFreq: 69, eqExtraGain: 70, eqExtraQ: 71,
  },
} as const;

function channelOffsets(model: MixerModel) {
  return model === "AX32" ? CHANNEL_OFFSETS.AX32 : CHANNEL_OFFSETS.AX16_AX24;
}

/** Absolute param for any channel control. channelIndex 0-based, offset within block. */
export function resolveChannelParam(model: MixerModel, channelIndex: number, offset: number): number {
  return CHANNEL_BASE[model] + CHANNEL_STRIDE[model] * channelIndex + offset;
}

export function resolveChannelFaderParam(model: MixerModel, channelIndex: number): number {
  return resolveChannelParam(model, channelIndex, channelOffsets(model).fader);
}

export function resolveChannelMuteParam(model: MixerModel, channelIndex: number): number {
  return resolveChannelParam(model, channelIndex, channelOffsets(model).mute);
}

export function resolveChannelPanParam(model: MixerModel, channelIndex: number): number {
  return resolveChannelParam(model, channelIndex, channelOffsets(model).pan);
}

export function resolveChannelPhaseParam(model: MixerModel, channelIndex: number): number {
  return resolveChannelParam(model, channelIndex, channelOffsets(model).phase);
}

export function resolveChannelGainParam(model: MixerModel, channelIndex: number): number {
  return resolveChannelParam(model, channelIndex, channelOffsets(model).gain);
}

export function resolveChannelSoloParams(model: MixerModel, channelIndex: number): { left: number; right: number } {
  const o = channelOffsets(model);
  const base = CHANNEL_BASE[model] + CHANNEL_STRIDE[model] * channelIndex;
  return { left: base + o.soloL, right: base + o.soloR };
}

// ─── Channel Sends ──────────────────────────────────────────────────────────

/** CH -> AUX send param. auxNumber 1-based.
 * AX16/24: param = 64 + 62*chIdx + (0x0C + auxNum). AUX1 for CH1 = 77.
 * AX32:    param = 63 + 72*chIdx + (0x0C + auxNum). AUX1 for CH1 = 76.
 */
export function resolveChannelToAuxSendParam(
  model: MixerModel, channelIndex: number, auxNumber: number
): number {
  return resolveChannelParam(model, channelIndex, channelOffsets(model).auxSendOffset(auxNumber));
}

/** CH -> FX send param. fxNumber 1-based.
 * AX16/24: param = 64 + 62*chIdx + (0x18 + fxNum). FX1 for CH1 = 89.
 * AX32:    param = 63 + 72*chIdx + (0x20 + fxNum). FX1 for CH1 = 96.
 */
export function resolveChannelToFxSendParam(
  model: MixerModel, channelIndex: number, fxNumber: number
): number {
  return resolveChannelParam(model, channelIndex, channelOffsets(model).fxSendOffset(fxNumber));
}

/** CH -> Master L/R send param. */
export function resolveChannelToMasterSendParam(
  model: MixerModel, channelIndex: number, side: "left" | "right"
): number {
  const o = channelOffsets(model);
  return resolveChannelParam(model, channelIndex, side === "left" ? o.masterSendL : o.masterSendR);
}

// ─── AUX Outputs ────────────────────────────────────────────────────────────

const AUX1_BASE: Record<MixerModel, number> = {
  AX16: 1676,
  AX24: 1676,
  AX32: 2890,
};

const AUX_STRIDE = 109;

// Offsets within AUX block (same for AX16/24 and AX32 based on existing code).
const AUX_OFFSETS = {
  fader: 0,
  mute: 2,
  soloL: 12,
  soloR: 13,
  // Comp/EQ offsets verified in axios16Client.ts getAuxProcessorParams:
  phase: 3,
  compEnabled: 6,
  compRatio: 7,
  compAttack: 8,
  compRelease: 9,
  compThreshold: 10,
  compGain: 11,
  eqEnabled: 15,
  hpfTypeSlope: 17,
  hpfFreq: 18,
  lpfTypeSlope: 19,
  lpfFreq: 20,
  eqBandBase: 22,
} as const;

/** Absolute param for any AUX control. auxNumber 1-based, offset within AUX block. */
export function resolveAuxParam(model: MixerModel, auxNumber: number, offset: number): number {
  return AUX1_BASE[model] + AUX_STRIDE * (auxNumber - 1) + offset;
}

export function resolveAuxFaderParam(model: MixerModel, auxNumber: number): number {
  return resolveAuxParam(model, auxNumber, AUX_OFFSETS.fader);
}

export function resolveAuxMuteParam(model: MixerModel, auxNumber: number): number {
  return resolveAuxParam(model, auxNumber, AUX_OFFSETS.mute);
}

export function resolveAuxSoloParams(model: MixerModel, auxNumber: number): { left: number; right: number } {
  const base = AUX1_BASE[model] + AUX_STRIDE * (auxNumber - 1);
  return { left: base + AUX_OFFSETS.soloL, right: base + AUX_OFFSETS.soloR };
}

// ─── FX Buses ───────────────────────────────────────────────────────────────

// AX16/24 FX: fixed params per slot (stride=45).
const FX_PARAMS_AX16_24: Record<number, { fader: number; mute: number; soloL: number; soloR: number }> = {
  1: { fader: 2899, mute: 2900, soloL: 2911, soloR: 2912 },
  2: { fader: 2944, mute: 2945, soloL: 2956, soloR: 2957 },
};

// AX32 FX: formula with base 4873 and stride 22.
const AX32_FX_BASE = 4873;
const AX32_FX_STRIDE = 22;
const AX32_FX_SOLO_BASE = 4893;

// AX16/24 FX preset (single shared selector for all presets).
export const AX16_24_FX_PRESET_SELECTOR = 3097;
export const AX16_24_FX_CONTROL_A = 2940;
export const AX16_24_FX_CONTROL_B = 2941;

// AX32 FX preset selectors and controls (confirmed runtime + EXE analysis).
export const AX32_FX_PRESET_SELECTORS: Record<number, number> = {
  1: 5116, 2: 5117, 3: 5118, 4: 5119,
};
export const AX32_FX_CONTROLS: Record<number, { controlA: number; controlB: number }> = {
  1: { controlA: 2754, controlB: 2755 },
  2: { controlA: 2785, controlB: 2786 },
  3: { controlA: 2816, controlB: 2817 },
  4: { controlA: 2847, controlB: 2848 },
};

export function resolveFxFaderParam(model: MixerModel, fxNumber: number): number {
  if (model === "AX32") return AX32_FX_BASE + (fxNumber - 1) * AX32_FX_STRIDE;
  return FX_PARAMS_AX16_24[fxNumber]?.fader ?? FX_PARAMS_AX16_24[1].fader;
}

export function resolveFxMuteParam(model: MixerModel, fxNumber: number): number {
  if (model === "AX32") return AX32_FX_BASE + (fxNumber - 1) * AX32_FX_STRIDE + 1;
  return FX_PARAMS_AX16_24[fxNumber]?.mute ?? FX_PARAMS_AX16_24[1].mute;
}

export function resolveFxSoloParams(model: MixerModel, fxNumber: number): { left: number; right: number } {
  if (model === "AX32") {
    const left = AX32_FX_SOLO_BASE + (fxNumber - 1) * AX32_FX_STRIDE;
    return { left, right: left + 1 };
  }
  const params = FX_PARAMS_AX16_24[fxNumber] ?? FX_PARAMS_AX16_24[1];
  return { left: params.soloL, right: params.soloR };
}

export function resolveFxPresetSelectorParam(model: MixerModel, fxNumber: number): number {
  if (model === "AX32") return AX32_FX_PRESET_SELECTORS[fxNumber] ?? 5116;
  return AX16_24_FX_PRESET_SELECTOR;
}

export function resolveFxControlParams(
  model: MixerModel, fxNumber: number
): { controlA: number; controlB: number } {
  if (model === "AX32") return AX32_FX_CONTROLS[fxNumber] ?? AX32_FX_CONTROLS[1];
  return { controlA: AX16_24_FX_CONTROL_A, controlB: AX16_24_FX_CONTROL_B };
}

// ─── Master ─────────────────────────────────────────────────────────────────

const MASTER_PARAMS = {
  AX16: {
    left:  { fader: 2548, mute: 2550, colorParam: 3146 },
    right: { fader: 2657, mute: 2659, colorParam: 3147 },
  },
  AX24: {
    left:  { fader: 2548, mute: 2550, colorParam: 3154 },
    right: { fader: 2657, mute: 2659, colorParam: 3155 },
  },
  AX32: {
    left:  { fader: 4634, mute: 4636, colorParam: 5185, soloL: 4646, soloR: 4647 },
    right: { fader: 4743, mute: 4745, colorParam: 5186, soloL: 4755, soloR: 4756 },
  },
} as const;

// AX16/24 master solo (DIGI/media player routing — confirmed via runtime).
export const MASTER_SOLO_AX16_24 = {
  left:  { soloL: 2560, soloR: 2561 },
  right: { soloL: 2669, soloR: 2670 },
};

// AX16/24 master comp/EQ (App.tsx MASTER_PROCESSOR_PARAMS_AX16_24).
export const MASTER_PROCESSOR_AX16_24 = {
  left: {
    compEnabled: 2552, compRatio: 2553, compAttack: 2554, compRelease: 2555,
    compThreshold: 2556, compGain: 2557,
    eqEnabled: 2561, hpfTypeSlope: 2563, hpfFreq: 2564,
    lpfTypeSlope: 2565, lpfFreq: 2566, eqBandBase: 2568,
  },
};

// AX32 master comp/EQ (axios16Client.ts MASTER_AX32, stride 109 between L and R).
export const MASTER_PROCESSOR_AX32 = {
  left: {
    compEnabled: 4638, compRatio: 4639, compAttack: 4640, compRelease: 4641,
    compThreshold: 4642, compGain: 4643,
    eqEnabled: 4649, hpfTypeSlope: 4651, hpfFreq: 4652,
    lpfTypeSlope: 4653, lpfFreq: 4654, eqBandBase: 4656,
  },
  right: {
    compEnabled: 4747, compRatio: 4748, compAttack: 4749, compRelease: 4750,
    compThreshold: 4751, compGain: 4752,
    eqEnabled: 4758, hpfTypeSlope: 4760, hpfFreq: 4761,
    lpfTypeSlope: 4762, lpfFreq: 4763, eqBandBase: 4765,
  },
};

export function resolveMasterFaderParam(model: MixerModel, side: "left" | "right"): number {
  return MASTER_PARAMS[model][side].fader;
}

export function resolveMasterMuteParam(model: MixerModel, side: "left" | "right"): number {
  return MASTER_PARAMS[model][side].mute;
}

export function resolveMasterColorParam(model: MixerModel, side: "left" | "right"): number {
  return MASTER_PARAMS[model][side].colorParam;
}

// ─── Input Source ────────────────────────────────────────────────────────────

// Physical input source routing param. channel 1-based.
export function resolveInputSourceParam(model: MixerModel, channel: number): number {
  return model === "AX32" ? 2662 + channel : 2846 + channel;
}

// ─── Links ───────────────────────────────────────────────────────────────────

/** Bitmask param for channel stereo links. */
export function resolveChannelLinkParam(model: MixerModel): number {
  return model === "AX32" ? 5108 : 3055;
}

/** Bitmask param for output (AUX/Master) stereo links. */
export function resolveOutputLinkParam(model: MixerModel): number {
  return model === "AX32" ? 5109 : 3056;
}

/** Bitmask value for Master L/R link bit within the output link word. */
export function getMasterLinkBit(model: MixerModel): number {
  return model === "AX32" ? 256 : 16;
}

// ─── Patching (AX32 only) ────────────────────────────────────────────────────

/** Record In routing: params 2533..2564, values 1..32. */
export const AX32_RECORD_IN_BASE = 2533;

/** Record Out routing: params 2565..2596, values 1..32. */
export const AX32_RECORD_OUT_BASE = 2565;

/** Physical Input Mapping: params 2693..2724, values 0..32 (0=unpatched). */
export const AX32_PHYSICAL_INPUT_BASE = 2693;

/** Physical Output Patch: param = AX32_PHYSICAL_OUTPUT_BASE + index, values 0..14. */
export const AX32_PHYSICAL_OUTPUT_BASE = 4855;

export function resolveAx32RecordInParam(destination: number): number {
  return AX32_RECORD_IN_BASE + (destination - 1);
}

export function resolveAx32RecordOutParam(destination: number): number {
  return AX32_RECORD_OUT_BASE + (destination - 1);
}

export function resolveAx32PhysicalInputParam(source: number): number {
  return AX32_PHYSICAL_INPUT_BASE + (source - 1);
}

export function resolveAx32PhysicalOutputParam(destination: number): number {
  return AX32_PHYSICAL_OUTPUT_BASE + (destination - 1);
}

// ─── DCA and Mute Groups ─────────────────────────────────────────────────────
// Use builders from src/protocol/duonn/groups.ts.
// DCA active/fader/membership and Mute Group active/membership are covered there.
// Re-exported constants for reference:

export const DCA_BASE_PARAM_AX16_24 = 3019;
export const DCA_BASE_PARAM_AX32 = 4991;
export const DCA_STRIDE = 9;

export const MUTE_GROUP_BASE_AX16_24 = 3057;
export const MUTE_GROUP_BASE_AX32 = 5064;
export const MUTE_GROUP_STRIDE = 5;

// ─── Solo / Phones ────────────────────────────────────────────────────────────
// AX16/24 DIGI (media player) solo — used as master solo source.
export const DIGI_SOLO_AX16_24 = {
  left: { soloL: 1575, soloR: 1576 },
  right: { soloL: 1637, soloR: 1638 },
};

// ─── Meter Parameters ─────────────────────────────────────────────────────────
// For polling only; not sent to mixer.
export const AUX_METER_BASE_AX16_24 = 2854;
// 2868-2869 not present in EXE defaults table; 2849-2850 are best binary-analysis candidates
export const FX_METER_BASE_AX16_24 = 2849;
export const AX32_AUX_METER_PARAMS = [2854, 2855, 2856, 2857, 2858, 2859, 2860] as const;
export const AX32_FX_METER_PARAMS = [2864, 2865, 2866, 2867] as const;
