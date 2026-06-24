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

// ─── Graphic EQ (AUX & Master) ────────────────────────────────────────────────

/**
 * GEQ de 15 bandas nas saídas AUX e Master. Confirmado no AX32 (AUX 1–14, Master L/R).
 * Regra unificada: relativo à base do fader do bloco de saída,
 *   enable     = faderBase + 14
 *   bandBase   = faderBase + 49  (param "type" da banda 1)
 *   por banda  = type(+0), freq(+1), gain(+2), Q(+3)  → só o gain é editável.
 * Ganho: value = 500 + dB*10 (faixa 380..620 = ±12 dB) — igual ao EQ paramétrico.
 */
export const GEQ_BAND_COUNT = 15;
export const GEQ_ENABLE_OFFSET = 14;
export const GEQ_BAND_BASE_OFFSET = 49;
export const GEQ_FREQUENCIES: readonly number[] = [
  25, 40, 63, 100, 163, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 12000,
];

export interface GeqParams {
  /** Param do enable (ON/OFF) do GEQ. */
  enable: number;
  /** Params de ganho das 15 bandas, na ordem das frequências. */
  gains: number[];
}

/** Monta os params do GEQ a partir da base do fader do bloco de saída. */
function geqParamsFromFaderBase(faderBase: number): GeqParams {
  const bandBase = faderBase + GEQ_BAND_BASE_OFFSET;
  return {
    enable: faderBase + GEQ_ENABLE_OFFSET,
    gains: Array.from({ length: GEQ_BAND_COUNT }, (_, k) => bandBase + 2 + k * 4),
  };
}

/**
 * GEQ do AUX. O bloco AUX tem layout uniforme entre modelos (base+stride 109),
 * então vale para AX16/24 e AX32. (AX16/24 inferido — confirmar na mesa.)
 */
export function resolveAuxGeqParams(model: MixerModel, auxNumber: number): GeqParams {
  const faderBase = AUX1_BASE[model] + AUX_STRIDE * (auxNumber - 1);
  return geqParamsFromFaderBase(faderBase);
}

/**
 * GEQ do Master por lado. Regra faderBase+14/+49 confirmada em todos os modelos:
 * AX32: L=4634, R=4743. AX16/24: L=2548 (enable 2562, band 2597), R=2657 (enable 2671, band 2706).
 */
export function resolveMasterGeqParams(
  model: MixerModel, side: "left" | "right"
): GeqParams {
  return geqParamsFromFaderBase(MASTER_PARAMS[model][side].fader);
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

// AX16/24 FX preset selectors and controls — per-FX, stride 1 (preset) and 45 (controls).
// FX1: preset=3097, controlA=2940, controlB=2941
// FX2: preset=3098, controlA=2985, controlB=2986
export const AX16_24_FX_PRESET_BASE = 3097;
export const AX16_24_FX_CONTROL_BASE = 2940;
export const AX16_24_FX_CONTROL_STRIDE = 45;
// Keep legacy single-FX exports for backward compatibility.
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
  return AX16_24_FX_PRESET_BASE + (fxNumber - 1);
}

export function resolveFxControlParams(
  model: MixerModel, fxNumber: number
): { controlA: number; controlB: number } {
  if (model === "AX32") return AX32_FX_CONTROLS[fxNumber] ?? AX32_FX_CONTROLS[1];
  const base = AX16_24_FX_CONTROL_BASE + (fxNumber - 1) * AX16_24_FX_CONTROL_STRIDE;
  return { controlA: base, controlB: base + 1 };
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
// AX16/24: param = 2846 + channel  (CH1 → 2847). AX32: param = 2660 + slot  (slot 1 → 2661).
// Validated on AX16 hardware: CH1=0x0B1F(2847), CH2=0x0B20(2848) — base 2846, not 2848.
export function resolveInputSourceParam(model: MixerModel, channel: number): number {
  return model === "AX32" ? 2660 + channel : 2846 + channel;
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
// AX16/24: confirmed by manual testing on AX24. Low-address packed params.
export const AX16_24_AUX_METER_PARAMS = [43, 44, 45, 46] as const;
export const AX16_24_FX_METER_PARAMS = [41, 42] as const;
export const AX16_24_MASTER_METER_PARAM = 47;
// Legacy aliases kept for backward compatibility during migration.
export const AUX_METER_BASE_AX16_24 = 43;
export const FX_METER_BASE_AX16_24 = 41;
export const AX32_AUX_METER_PARAMS = [2854, 2855, 2856, 2857, 2858, 2859, 2860] as const;
export const AX32_FX_METER_PARAMS = [2864, 2865, 2866, 2867] as const;

// ─── RTA / Analisador de Espectro ───────────────────────────────────────────────
// Confirmado por engenharia reversa no AX32. NÃO suportado em AX16/24 (DSP diferente →
// os mesmos params podem apontar pra OUTRA coisa e mexer no áudio ao vivo). Por isso os
// resolvers retornam null fora do AX32 — o controller NUNCA escreve em AX16/24.
//
// Controle (WRITE op 0x03, só AX32):
//   - source-select (foco): params 57 (0x39) + 2884 (0x0B44) = valor sourceId. É o MESMO
//     "comando de foco" reaproveitável pelos meters reais de comp do AX32.
//   - enable on/off do RTA: param 5196 (0x144C) = 1 liga / 0 desliga.
// Espectro (op 0x46): bloco no endereço 00 1f → 31 bandas (1/3 oitava, 20Hz–20kHz),
//   1 byte/banda, ~0x00..0x5c. Ver docs/rta-implementation-brief.md.
export const AX32_RTA_SOURCE_SELECT_PARAMS = [57, 2884] as const;
export const AX32_RTA_ENABLE_PARAM = 5196;
export const RTA_SPECTRUM_BLOCK_ADDRESS = [0x00, 0x1f] as const;
export const RTA_SPECTRUM_BAND_COUNT = 31;
export const RTA_SPECTRUM_VALUE_MAX = 0x5c; // ~92, teto p/ normalizar 0..1

export type RtaTarget =
  | { readonly kind: "channel"; readonly index: number }
  | { readonly kind: "aux"; readonly index: number }
  | { readonly kind: "master"; readonly side: "left" | "right" };

/**
 * Source ID (valor de 57/2884) por fonte. SÓ AX32 — retorna null em AX16/24,
 * o que garante que o controller nunca ligue/escreva nesses modelos.
 */
export function resolveRtaSourceId(model: MixerModel, target: RtaTarget): number | null {
  if (model !== "AX32") return null;
  switch (target.kind) {
    case "channel":
      return target.index; // CH-n = n (1..32)
    case "aux":
      return 34 + target.index; // AUX-n = 34+n (AUX1=35 … AUX16=50)
    case "master":
      return target.side === "left" ? 51 : 52;
  }
}

/** RTA só tem fluxo nativo (ligar/poll) no AX32. */
export function isRtaSupported(model: MixerModel): boolean {
  return model === "AX32";
}

/**
 * Bit a checar em `resolveOutputLinkParam(model)` para detectar par AUX linkado.
 * Pares: (AUX1+2)→bit0=1, (AUX3+4)→bit1=2, (AUX5+6)→bit2=4, etc.
 * auxNumber 1-based.
 */
export function getAuxLinkBit(auxNumber: number): number {
  return 1 << Math.floor((auxNumber - 1) / 2);
}

/**
 * Source IDs de um par AUX linkado: [sourceIdL, sourceIdR]. auxNumber 1-based.
 * Ex.: AUX3 (ou AUX4) → par (3,4) → [37, 38].
 */
export function getAuxStereoSourceIds(auxNumber: number): [number, number] {
  const pairIdx = Math.floor((auxNumber - 1) / 2);
  return [34 + pairIdx * 2 + 1, 34 + pairIdx * 2 + 2];
}

// ─── MEDIA player (canal DIGI) ──────────────────────────────────────────────────
// Mapeado por engenharia reversa (AX16/24) — ver apps/desktop/tools/media-capture-roteiro.md.
// O media player toca pelo canal DIGI. Subscribe envia param 75=917 + keepalive 5212=1 (~1s)
// enquanto a aba MEDIA está aberta. Comandos de transporte/fonte vão por op0x72 (frame raw),
// e o status chega por op0x71 (RX raw, lido via Axios16Client.onRawMessage).

/** Subscribe da página MEDIA: [param, value] enviado ao abrir a aba. */
export const MEDIA_SUBSCRIBE_PARAMS = [75, 917] as const;
/** Keepalive/heartbeat de "página MEDIA ativa" — enviar 1 a cada ~1s enquanto aberta. */
export const MEDIA_KEEPALIVE_PARAM = 5212;

/** Comandos op0x72 (byte CMD). Frame: 80 06 72 00 00 [CMD] crc crc. */
export const MEDIA_CMD = {
  SELECT_USB: 0xa8,       // seleciona USB Player
  SELECT_SPDIF: 0xc3,     // seleciona SPDIF/Coax
  SELECT_BT: 0xc7,        // seleciona Bluetooth (confirmado: USB→none→bluetooth na mesa)
  RELEASE_SOURCE: 0xc8,   // libera fonte → Recorder (se pendrive) ou none; também STOP
  // ATENÇÃO (AX32): tocar=0xa0, pausar=0xa1 — confirmado pelo tick (só corre tocando) e
  // pelo ouvido na mesa. O roteiro AX16/24 trazia o inverso; pode variar por modelo (a confirmar).
  PLAY: 0xa0,             // tocar/resume (tick volta a correr)
  PAUSE: 0xa1,            // pausar (também usado no auto-play intercept)
  NEXT: 0xa6,             // USB/BT próxima
  PREV: 0xa4,             // USB/BT anterior
  BT_TOGGLE: 0xa2,        // BT play/pause (botão único)
  REPEAT: 0xaa,           // USB repeat toggle
  RECORD_TOGGLE: 0xe0,    // Recorder start/stop
} as const;

/** device byte (op0x71 b[4]) → fonte ativa. */
export const MEDIA_DEVICE = {
  NONE: 0x00,
  USB: 0x02,
  RECORDER: 0x05,
  BLUETOOTH: 0x06,
  COAX: 0x0a,
} as const;

// ─── Unified Mixer Profiles ───────────────────────────────────────────────────
// Single source of truth for all model-specific constants.
// All sync, polling, meters, names, and colors should derive from the active profile.

export type MasterProcessorBlock = {
  readonly compEnabled: number;
  readonly compRatio: number;
  readonly compAttack: number;
  readonly compRelease: number;
  readonly compThreshold: number;
  readonly compGain: number;
  readonly eqEnabled: number;
  readonly hpfTypeSlope: number;
  readonly hpfFreq: number;
  readonly lpfTypeSlope: number;
  readonly lpfFreq: number;
  readonly eqBandBase: number;
};

export type MixerFxSlot = {
  readonly fader: number;
  readonly mute: number;
  readonly soloL: number;
  readonly soloR: number;
  readonly presetSelector: number;
  readonly controlA: number;
  readonly controlB: number;
  /** AX32 only: base param for the FX bus EQ/processor block. */
  readonly processorBase?: number;
};

export type MixerProfile = {
  readonly model: MixerModel;
  readonly channels: {
    readonly count: number;
    readonly base: number;
    readonly stride: number;
  };
  readonly digi: {
    readonly left: number;   // 1-based internal channel number
    readonly right: number;
  };
  readonly aux: {
    readonly count: number;
    readonly base: number;
    readonly stride: number;
  };
  readonly fx: {
    readonly count: number;
    readonly slots: ReadonlyArray<MixerFxSlot>;
  };
  readonly dca: {
    readonly count: number;
    readonly base: number;
    readonly stride: number;
  };
  readonly muteGroups: {
    readonly count: number;
    readonly base: number;
    readonly stride: number;
  };
  readonly meters: {
    readonly inputBase: number;
    readonly auxParams: ReadonlyArray<number>;
    readonly fxParams: ReadonlyArray<number>;
    readonly masterParam: number;
    readonly isPackedStereo: boolean;
  };
  readonly patching: {
    readonly usbRecIn:    { readonly base: number; readonly count: number };
    readonly usbRecOut:   { readonly base: number; readonly count: number };
    readonly inputPatch:  { readonly base: number; readonly count: number; readonly visibleCount: number; readonly supportsUnpatched: boolean };
    readonly outputPatch: { readonly base: number; readonly count: number; readonly visibleCount: number; readonly supportsUnpatched: boolean };
  };
  readonly master: {
    readonly left:  { readonly fader: number; readonly mute: number; readonly colorParam: number; readonly soloL: number; readonly soloR: number };
    readonly right: { readonly fader: number; readonly mute: number; readonly colorParam: number; readonly soloL: number; readonly soloR: number };
    readonly processor: {
      readonly left: MasterProcessorBlock;
      readonly right?: MasterProcessorBlock;  // AX32 only
    };
  };
  readonly links: {
    readonly channelLink: number;
    readonly outputLink: number;
    readonly masterLinkBit: number;
  };
  readonly colors: {
    /** Base param for channel color (ch 1 = base, ch N = base + N - 1). */
    readonly channelBase: number;
    /** Base param for FX bus color (FX 1 = base, FX N = base + N - 1). */
    readonly fxBase: number;
    /** Base param for AUX bus color (AUX 1 = base, AUX N = base + N - 1). */
    readonly auxBase: number;
  };
  readonly inputSource: {
    /** param = base + channel (1-based). AX16/24: 2848, AX32: 2660. */
    readonly base: number;
  };
};

export const PROFILE_AX16: MixerProfile = {
  model: "AX16",
  channels: { count: 16, base: 64, stride: 62 },
  digi: { left: 25, right: 26 },
  aux: { count: 8, base: 1676, stride: 109 },
  fx: {
    count: 2,
    slots: [
      { fader: 2899, mute: 2900, soloL: 2911, soloR: 2912, presetSelector: 3097, controlA: 2940, controlB: 2941 },
      { fader: 2944, mute: 2945, soloL: 2956, soloR: 2957, presetSelector: 3098, controlA: 2985, controlB: 2986 },
    ],
  },
  dca: { count: 4, base: 3019, stride: 9 },
  muteGroups: { count: 4, base: 3057, stride: 5 },
  meters: {
    inputBase: 2,
    auxParams: [43, 44, 45, 46],
    fxParams: [41, 42],
    masterParam: 47,
    isPackedStereo: true,
  },
  patching: {
    usbRecIn:    { base: 2783, count: 16 },
    usbRecOut:   { base: 2799, count: 16 },
    inputPatch:  { base: 2863, count: 18, visibleCount: 16, supportsUnpatched: true },  // CH1–16 + DIGI L/R
    outputPatch: { base: 2889, count: 10, visibleCount: 10, supportsUnpatched: true },
  },
  master: {
    left:  { fader: 2548, mute: 2550, colorParam: 3146, soloL: 1575, soloR: 1576 },
    right: { fader: 2657, mute: 2659, colorParam: 3147, soloL: 1637, soloR: 1638 },
    processor: {
      left: {
        compEnabled: 2552, compRatio: 2553, compAttack: 2554, compRelease: 2555,
        compThreshold: 2556, compGain: 2557,
        eqEnabled: 2563, hpfTypeSlope: 2565, hpfFreq: 2566,
        lpfTypeSlope: 2567, lpfFreq: 2568, eqBandBase: 2570,
      },
    },
  },
  links: { channelLink: 3055, outputLink: 3056, masterLinkBit: 16 },
  colors: { channelBase: 3110, fxBase: 3128, auxBase: 3130 },
  inputSource: { base: 2846 },
};

export const PROFILE_AX24: MixerProfile = {
  model: "AX24",
  channels: { count: 24, base: 64, stride: 62 },
  digi: { left: 25, right: 26 },
  aux: { count: 8, base: 1676, stride: 109 },
  fx: {
    count: 2,
    slots: [
      { fader: 2899, mute: 2900, soloL: 2911, soloR: 2912, presetSelector: 3097, controlA: 2940, controlB: 2941 },
      { fader: 2944, mute: 2945, soloL: 2956, soloR: 2957, presetSelector: 3098, controlA: 2985, controlB: 2986 },
    ],
  },
  dca: { count: 4, base: 3019, stride: 9 },
  muteGroups: { count: 4, base: 3057, stride: 5 },
  meters: {
    inputBase: 2,
    auxParams: [43, 44, 45, 46],
    fxParams: [41, 42],
    masterParam: 47,
    isPackedStereo: true,
  },
  patching: {
    usbRecIn:    { base: 2783, count: 16 },
    usbRecOut:   { base: 2799, count: 16 },
    inputPatch:  { base: 2863, count: 26, visibleCount: 24, supportsUnpatched: true },  // CH1–24 + DIGI L/R
    outputPatch: { base: 2889, count: 10, visibleCount: 10, supportsUnpatched: true },
  },
  master: {
    left:  { fader: 2548, mute: 2550, colorParam: 3154, soloL: 1575, soloR: 1576 },
    right: { fader: 2657, mute: 2659, colorParam: 3155, soloL: 1637, soloR: 1638 },
    processor: {
      left: {
        compEnabled: 2552, compRatio: 2553, compAttack: 2554, compRelease: 2555,
        compThreshold: 2556, compGain: 2557,
        eqEnabled: 2563, hpfTypeSlope: 2565, hpfFreq: 2566,
        lpfTypeSlope: 2567, lpfFreq: 2568, eqBandBase: 2570,
      },
    },
  },
  links: { channelLink: 3055, outputLink: 3056, masterLinkBit: 16 },
  colors: { channelBase: 3110, fxBase: 3136, auxBase: 3138 },
  inputSource: { base: 2846 },
};

export const PROFILE_AX32: MixerProfile = {
  model: "AX32",
  channels: { count: 32, base: 63, stride: 72 },
  digi: { left: 33, right: 34 },
  aux: { count: 14, base: 2890, stride: 109 },
  fx: {
    count: 4,
    slots: [
      { fader: 4873, mute: 4874, soloL: 4893, soloR: 4894, presetSelector: 5116, controlA: 2754, controlB: 2755, processorBase: 2727 },
      { fader: 4895, mute: 4896, soloL: 4915, soloR: 4916, presetSelector: 5117, controlA: 2785, controlB: 2786, processorBase: 2758 },
      { fader: 4917, mute: 4918, soloL: 4937, soloR: 4938, presetSelector: 5118, controlA: 2816, controlB: 2817, processorBase: 2789 },
      { fader: 4939, mute: 4940, soloL: 4959, soloR: 4960, presetSelector: 5119, controlA: 2847, controlB: 2848, processorBase: 2820 },
    ],
  },
  dca: { count: 8, base: 4991, stride: 9 },
  muteGroups: { count: 6, base: 5064, stride: 5 },
  meters: {
    inputBase: 2,
    auxParams: [2854, 2855, 2856, 2857, 2858, 2859, 2860],
    fxParams: [2864, 2865, 2866, 2867],
    masterParam: 47,
    isPackedStereo: true,
  },
  patching: {
    usbRecIn:    { base: 2533, count: 32 },
    usbRecOut:   { base: 2565, count: 32 },
    inputPatch:  { base: 2693, count: 34, visibleCount: 32, supportsUnpatched: true },  // CH1–32 + DIGI L/R
    outputPatch: { base: 4855, count: 18, visibleCount: 14, supportsUnpatched: true },
  },
  master: {
    left:  { fader: 4634, mute: 4636, colorParam: 5185, soloL: 4646, soloR: 4647 },
    right: { fader: 4743, mute: 4745, colorParam: 5186, soloL: 4755, soloR: 4756 },
    processor: {
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
    },
  },
  links: { channelLink: 5108, outputLink: 5109, masterLinkBit: 256 },
  colors: { channelBase: 5131, fxBase: 5165, auxBase: 5169 },
  inputSource: { base: 2660 },
};

export const MIXER_PROFILES: Readonly<Record<MixerModel, MixerProfile>> = {
  AX16: PROFILE_AX16,
  AX24: PROFILE_AX24,
  AX32: PROFILE_AX32,
};

export function getMixerProfile(model: MixerModel): MixerProfile {
  return MIXER_PROFILES[model];
}
