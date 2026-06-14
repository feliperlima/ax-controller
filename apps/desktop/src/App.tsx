import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Axios16Client,
  type LocalParamWrite,
  type RemoteParamRead,
  type AxiosProtocolProfile,
  type NameTarget,
  valueToCompGain,
  valueToCompRatio,
  valueToCompThreshold,
  valueToCompTime,
  valueToEqGain,
  valueToEqQ,
  valueToBoolean,
  valueToFaderDb,
  valueToFrequency,
  valueToGain,
  getActiveProtocolProfile,
  valueToGateAttack,
  valueToGateDecay,
  valueToGateHold,
  valueToGateThreshold,
  valueToHpfTypeSlope,
  valueToLpfTypeSlope,
  valueToMute,
  valueToPan,
  toMixerSafeName,
  buildRawDuonnPacket,
} from "./lib/axios16Client";
import {
  SetChannelFaderPilotResolver,
  SetChannelMutePilotResolver,
  type SemanticCommand,
  type SemanticCommandContext,
} from "./semantic";
import {
  type FxPresetId,
  validateFxPresetId,
  getFxPresetConfig,
} from "./protocol/duonn/fxPresets";
import { ChannelStrip } from "./components/ChannelStrip";
import { AuxStrip } from "./components/AuxStrip";
import { FxStrip } from "./components/FxStrip";
import { GroupStrip } from "./components/GroupStrip";
import { MasterBus } from "./components/MasterBus";
import { DuonnIconsSprite, DUONN_CHANNEL_ICONS } from "./components/DuonnIcon";
import { ChannelCustomizer } from "./components/ChannelCustomizer";
import { AxHeaderStatusTag } from "./components/TopNavigation";
import { DcaGroupsView } from "./components/DcaGroupsView";
import { MuteGroupsView } from "./components/MuteGroupsView";
import { ScenesView } from "./components/ScenesView";
import { PatchingView } from "./components/PatchingView";
import { FxPresetGrid, FxPresetControlPanel } from "./components/FxPresetPanel";
import { SplashScreen } from "./components/SplashScreen";
import { DeviceSelectionScreen } from "./components/DeviceSelectionScreen";
import { MixerTabs, type MixerTabDefinition } from "./components/MixerTabs";
import axControlBrand from "./assets/AX-control-Brand-vert.svg";
import productAxios24 from "./assets/product-axios24.webp";
import { useMixerDiscovery } from "./hooks/useMixerDiscovery";
import {
  type DiscoveredMixer,
  type ProfileConfidence,
  rememberConnectedMixerIp,
  saveKnownMixer,
} from "./services/mixerDiscovery";
import { getMixerCompatibility } from "./lib/mixerCompatibility";
import { apiCreatePixPayment, apiCheckPixStatus } from "./lib/pixPaymentApi";
import {
  decodeGroupMembers,
  getBitmaskProtocolProfile,
  type GroupMember,
  setBitmaskProtocolProfile,
} from "./protocol/duonn/bitmask";
import {
  buildClearDcaMembersMessages,
  buildClearMuteGroupMembersMessages,
  buildSetDcaEnabledMessages,
  buildSetDcaFaderMessage,
  buildSetDcaMembersMessages,
  buildSetMuteGroupActiveMessages,
  buildSetMuteGroupMembersMessages,
  getGroupProtocolProfile,
  getDcaFaderParam,
  getDcaMemberParams,
  getDcaOnOffParam,
  getMuteGroupActiveParam,
  getMuteGroupMemberParams,
  type DcaGroupId,
  type DuonnParamWriteMessage,
  type MuteGroupId,
  setGroupProtocolProfile,
} from "./protocol/duonn/groups";
import {
  applyMuteToMember,
  buildAssignableMemberIds,
  createInitialDcaState,
  createInitialMuteState,
  DCA_DEFAULT_COLOR_IDS,
  dcaPositionToValue,
  dcaValueToPosition,
  dcaAccentColorFromId,
  getDcaIdsForChannelCount,
  type AssignableMemberId,
  type DcaGroupState,
  type MuteGroupState,
} from "./lib/groupControls";
import {
  ChannelProcessors,
  type CompressorState,
  type EqBandState,
  type EqState,
  type FilterSlope,
  type FilterType,
  type GateState,
  type ProcessorModule,
  type ProcessorState,
  type SendStripId,
  type SendStripView,
  type SendTapPoint,
} from "./components/ChannelProcessors";
import {
  type LicenseDevice,
  type LicenseFormalState,
  type LicenseSnapshot,
  type RuntimeLicenseCache,
  isLicenseStateBlocked,
  parseLicenseSnapshot,
  resolveLicenseFormalState,
} from "./lib/licenseState";
import {
  clearRuntimeLicenseCacheFromStorage,
  computeNextRevalidationAt,
  readRuntimeLicenseCacheFromStorage,
  resolveBootDecision,
  writeRuntimeLicenseCacheToStorage,
} from "./lib/licenseEngine";
import { Eye, EyeOff, Hash, Laptop2, LockKeyhole, Mail, Monitor, Phone, RefreshCw, ShieldCheck, Smartphone, User, X, Zap } from "lucide-react";
import { UniversalRawParamStore, type RawParamProfileModel, type RawParamSource } from "./lib/universalRawParamStore";
import {
  ProfileAwareParameterRegistry,
  type ProfileAwareParamDescriptor,
} from "./lib/profileAwareParameterRegistry";
import {
  createDomainSelectors,
  type AppParamResolver,
  type ChannelValueDecoder,
  type DomainSelectors,
} from "./lib/domainSelectors";
import { useToast } from "./components/FloatingToast";
import { useMixerClipboard } from "./hooks/useMixerClipboard";
import {
  buildChannelSnapshot,
  buildAuxSnapshot,
  applyChannelPaste,
  applyAuxPaste,
  isClipboardCompatible,
} from "./lib/mixerClipboard";

type ChannelState = {
  muted: boolean;
  soloOn: boolean;
  phantomOn: boolean;
  hiZOn: boolean;
  usbInputOn: boolean;
  phasePositive: boolean;
  colorId: number;
  iconId: number;
  channelName: string;
  mixerName: string;
  faderDb: number;
  faderPosition: number;
  pan: number;
  gain: number;
  meterDb: number;
  meterLevel: number;
  peakDb: number;
  peakLevel: number;
  peakUntil: number;
  clipUntil: number;
};

type MasterState = {
  leftMuted: boolean;
  rightMuted: boolean;
  leftColorId: number;
  rightColorId: number;
  leftSoloOn: boolean;
  rightSoloOn: boolean;
  soloOn: boolean;
  leftFaderDb: number;
  rightFaderDb: number;
  leftFaderPosition: number;
  rightFaderPosition: number;
  leftMeterDb: number;
  rightMeterDb: number;
  leftMeterLevel: number;
  rightMeterLevel: number;
  leftPeakDb: number;
  rightPeakDb: number;
  leftPeakUntil: number;
  rightPeakUntil: number;
  leftClipUntil: number;
  rightClipUntil: number;
};

type MainMasterMeterState = {
  leftDb: number;
  rightDb: number;
  leftLevel: number;
  rightLevel: number;
  leftPeakDb: number;
  rightPeakDb: number;
  leftPeakUntil: number;
  rightPeakUntil: number;
  leftClipUntil: number;
  rightClipUntil: number;
};

type MonitorSoloMeterState = {
  leftDb: number;
  rightDb: number;
  leftLevel: number;
  rightLevel: number;
};

type FxPresetState = {
  presetId: FxPresetId;
  controlAValue: number;
  controlBValue: number;
};

const DEFAULT_CHANNEL_COUNT = 16;
const AX24_CHANNEL_COUNT = 24;
const AX32_CHANNEL_COUNT = 32;
const AX16_24_AUX_COUNT = 8;
const AX32_AUX_COUNT = 14;
const AX16_24_FX_COUNT = 2;
const AX32_FX_COUNT = 4;

// Meter parameter ranges for AUX/FX
// AUX1-14 meters: sequential from 2854 (AUX1=2854, AUX2=2855, ...)
const AUX_METER_PARAM_START = 2854;
const FX_METER_PARAM_START = 2868;
const AX32_AUX_METER_PARAMS = [2854, 2855, 2856, 2857, 2858, 2859, 2860];
const AX32_FX_METER_PARAMS = [2864, 2865, 2866, 2867];

let ACTIVE_CHANNEL_PROFILE: AxiosProtocolProfile = "ax16_24";
let ACTIVE_CHANNEL_COUNT = 24;
const ENABLE_SEMANTIC_SET_CHANNEL_FADER_PILOT = true;
const ENABLE_SEMANTIC_SET_CHANNEL_MUTE_PILOT = true;

const setChannelFaderPilotResolver = new SetChannelFaderPilotResolver({
  resolveChannelFaderParam: (channel) => channelParam(channel, 76),
});

const setChannelMutePilotResolver = new SetChannelMutePilotResolver({
  resolveChannelMuteParam: (channel) => channelParam(channel, 74),
});

function isAx32ProtocolProfile(profile: AxiosProtocolProfile) {
  return profile === "ax32" || profile === "ax32_experimental";
}

function normalizeProtocolProfile(profile: AxiosProtocolProfile): AxiosProtocolProfile {
  return profile === "ax32_experimental" ? "ax32" : profile;
}

const AX32_CHANNEL_STRIDE = 72;
const CHANNEL_LINK_MIRROR_BASES: readonly number[] = [
  65, 66, 67, 69, 70, 71,
  72, 73, 74, 76,
  77, 78, 79, 80, 81, 82, 83, 84,
];
const AX32_CHANNEL_BASE_MAP: Record<number, number> = {
  64: 63,
  65: 64,
  66: 65,
  67: 66,
  69: 68,
  70: 69,
  71: 70,
  72: 71,
  73: 72,
  74: 73,
  75: 74,
  76: 75,
  77: 76,
  78: 77,
  79: 78,
  80: 79,
  81: 80,
  82: 81,
  83: 82,
  84: 83,
  85: 92,
  86: 93,
  87: 94,
  88: 95,
  89: 96,
  90: 97,
  93: 102,
  94: 103,
  95: 104,
  96: 105,
  97: 106,
  99: 108,
  100: 109,
  102: 111,
  103: 112,
  104: 113,
  105: 114,
  107: 116,
  108: 117,
  109: 118,
  111: 120,
  112: 121,
  113: 122,
  115: 124,
  116: 125,
  117: 126,
  119: 128,
  120: 129,
  121: 130,
};

function normalizeSupportedChannelCount(channels?: number) {
  if (channels && channels >= AX32_CHANNEL_COUNT) {
    return AX32_CHANNEL_COUNT;
  }

  if (channels && channels >= AX24_CHANNEL_COUNT) {
    return AX24_CHANNEL_COUNT;
  }

  return DEFAULT_CHANNEL_COUNT;
}

function inferChannelCountFromIdentity(identity: string) {
  const normalized = identity.toUpperCase();
  const match = normalized.match(/AX(?:IOS)?\s*(16|24|32)\b/);

  if (!match) return undefined;

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return undefined;

  return parsed;
}

function resolveMixerChannelCount(mixer?: DiscoveredMixer) {
  if (!mixer) return undefined;

  if (typeof mixer.channels === "number" && Number.isFinite(mixer.channels)) {
    return normalizeSupportedChannelCount(mixer.channels);
  }

  const inferred = inferChannelCountFromIdentity(`${mixer.model ?? ""} ${mixer.name ?? ""}`);

  return inferred === undefined ? undefined : normalizeSupportedChannelCount(inferred);
}

function resolveConnectionTargetProfile(
  targetIp: string,
  mixers: DiscoveredMixer[],
  currentChannelCount: number,
  forcedProfile?: AxiosProtocolProfile,
  forcedChannelCount?: number
) {
  const discoveredMixer = mixers.find((mixer) => mixer.ip.trim() === targetIp.trim());
  const discoveredChannelCount = resolveMixerChannelCount(discoveredMixer);
  const normalizedForcedChannelCount =
    forcedChannelCount === undefined
      ? undefined
      : normalizeSupportedChannelCount(forcedChannelCount);

  const resolvedChannelCount =
    normalizedForcedChannelCount ??
    discoveredChannelCount ??
    normalizeSupportedChannelCount(currentChannelCount);

  const resolvedProfile = forcedProfile ?? channelCountToProtocolProfile(resolvedChannelCount);
  const targetChannelCount =
    isAx32ProtocolProfile(resolvedProfile)
      ? AX32_CHANNEL_COUNT
      : resolvedChannelCount;

  return {
    profile: normalizeProtocolProfile(resolvedProfile),
    channelCount: targetChannelCount,
  };
}

function channelCountToProtocolProfile(channels: number): AxiosProtocolProfile {
  return channels >= AX32_CHANNEL_COUNT ? "ax32" : "ax16_24";
}

function isAx32ProfileActive() {
  return isAx32ProtocolProfile(ACTIVE_CHANNEL_PROFILE);
}

function getAuxBusCount() {
  return isAx32ProfileActive() ? AX32_AUX_COUNT : AX16_24_AUX_COUNT;
}

function getFxBusCount() {
  return isAx32ProfileActive() ? AX32_FX_COUNT : AX16_24_FX_COUNT;
}

type AuxFxMeterConfig = {
  auxMeterParams: number[];
  fxMeterParams: number[];
  auxPairCount: number;
};

const AUX_FX_METER_CONFIGS: Record<"ax16_24" | "ax32", AuxFxMeterConfig> = {
  ax16_24: {
    auxMeterParams: Array.from({ length: AX16_24_AUX_COUNT }, (_, index) => AUX_METER_PARAM_START + index),
    fxMeterParams: Array.from({ length: AX16_24_FX_COUNT }, (_, index) => FX_METER_PARAM_START + index),
    auxPairCount: AX16_24_AUX_COUNT,
  },
  ax32: {
    auxMeterParams: AX32_AUX_METER_PARAMS,
    fxMeterParams: AX32_FX_METER_PARAMS,
    auxPairCount: Math.ceil(AX32_AUX_COUNT / 2),
  },
};

function getAuxFxMeterConfig(): AuxFxMeterConfig {
  return isAx32ProfileActive() ? AUX_FX_METER_CONFIGS.ax32 : AUX_FX_METER_CONFIGS.ax16_24;
}

function getDcaIdsForActiveProfile(): DcaGroupId[] {
  return isAx32ProtocolProfile(ACTIVE_CHANNEL_PROFILE) ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4];
}

function getMuteIdsForActiveProfile(): MuteGroupId[] {
  return isAx32ProtocolProfile(ACTIVE_CHANNEL_PROFILE) ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];
}

function faderPositionToDb(position: number) {
  const points = [
    { pos: 0, db: -120 },
    { pos: 10, db: -50 },
    { pos: 25, db: -30 },
    { pos: 45, db: -20 },
    { pos: 65, db: -10 },
    { pos: 80, db: -5 },
    { pos: 90, db: 0 },
    { pos: 95, db: 5 },
    { pos: 100, db: 10 },
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    if (position >= current.pos && position <= next.pos) {
      const t = (position - current.pos) / (next.pos - current.pos);
      return Math.round(current.db + t * (next.db - current.db));
    }
  }

  return position <= 0 ? -120 : 10;
}

function dbToFaderPosition(db: number) {
  const points = [
    { pos: 0, db: -120 },
    { pos: 10, db: -50 },
    { pos: 25, db: -30 },
    { pos: 45, db: -20 },
    { pos: 65, db: -10 },
    { pos: 80, db: -5 },
    { pos: 90, db: 0 },
    { pos: 95, db: 5 },
    { pos: 100, db: 10 },
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    if (db >= current.db && db <= next.db) {
      const t = (db - current.db) / (next.db - current.db);
      return Math.round(current.pos + t * (next.pos - current.pos));
    }
  }

  return db <= -120 ? 0 : 100;
}

function createDefaultChannelState(): ChannelState {
  return {
    muted: false,
    soloOn: false,
    phantomOn: false,
    hiZOn: false,
    usbInputOn: false,
    phasePositive: true,
    colorId: 1,
    iconId: 0,
    channelName: "",
    mixerName: "",
    faderDb: 0,
    faderPosition: 90,
    pan: 100,
    gain: 32,
    meterDb: -75,
    meterLevel: 0,
    peakDb: -75,
    peakLevel: 0,
    peakUntil: 0,
    clipUntil: 0,
  };
}

function createInitialChannelsState(channelCount = DEFAULT_CHANNEL_COUNT) {
  return Array.from({ length: channelCount }, () => createDefaultChannelState());
}

function createDefaultMasterState(): MasterState {
  return {
    leftMuted: false,
    rightMuted: false,
    leftColorId: 0,
    rightColorId: 0,
    leftSoloOn: false,
    rightSoloOn: false,
    soloOn: false,
    leftFaderDb: 0,
    rightFaderDb: 0,
    leftFaderPosition: 90,
    rightFaderPosition: 90,
    leftMeterDb: -75,
    rightMeterDb: -75,
    leftMeterLevel: 0,
    rightMeterLevel: 0,
    leftPeakDb: -75,
    rightPeakDb: -75,
    leftPeakUntil: 0,
    rightPeakUntil: 0,
    leftClipUntil: 0,
    rightClipUntil: 0,
  };
}

function createDefaultMainMasterMeterState(): MainMasterMeterState {
  return {
    leftDb: -75,
    rightDb: -75,
    leftLevel: 0,
    rightLevel: 0,
    leftPeakDb: -75,
    rightPeakDb: -75,
    leftPeakUntil: 0,
    rightPeakUntil: 0,
    leftClipUntil: 0,
    rightClipUntil: 0,
  };
}

function createDefaultMonitorSoloMeterState(): MonitorSoloMeterState {
  return {
    leftDb: -75,
    rightDb: -75,
    leftLevel: 0,
    rightLevel: 0,
  };
}

function channelParam(channel: number, base: number) {
  if (isAx32ProfileActive()) {
    const translatedBase = AX32_CHANNEL_BASE_MAP[base] ?? base;
    return translatedBase + (channel - 1) * AX32_CHANNEL_STRIDE;
  }

  return base + (channel - 1) * 62;
}

// AX16/AX24: param = 2849 + channelIndex (0-based) = 2848 + channel (1-based).
//   CH1 → 2849, CH2 → 2850, ..., CH24 → 2872.
//   Indexed directly by channel — no patch map indirection.
// AX32: param = 2660 + usbReturnSlot (1-based slot from Record Out To Channel map).
//   Slot 1 → 2661, slot 2 → 2662, ..., slot 32 → 2692.
//   slotOrChannel must come from resolveInputSourceControlChannel(), NOT from channelNumber directly.
function inputSourceParam(slotOrChannel: number) {
  return isAx32ProfileActive() ? 2660 + slotOrChannel : 2848 + slotOrChannel;
}

function channelColorParam(channel: number) {
  if (isAx32ProfileActive()) {
    return 5131 + channel - 1;
  }

  return 3110 + channel - 1;
}

function valueToColorId(value: number) {
  return Math.max(0, Math.min(12, Math.round(value)));
}

function channelColorBadgeBackground(colorId: number) {
  const normalized = Math.max(0, Math.min(12, Math.round(colorId)));
  if (normalized === 0) return "#7B7B7B";
  return `var(--channel-${String(normalized).padStart(2, "0")}, #c96626)`;
}

const MASTER_PARAMS_AX16 = {
  leftFader: 2548,
  leftMute: 2550,
  rightFader: 2657,
  rightMute: 2659,
  leftColor: 3146,
  rightColor: 3147,
};

const MASTER_PARAMS_AX24 = {
  leftFader: 2548,
  leftMute: 2550,
  rightFader: 2657,
  rightMute: 2659,
  leftColor: 3154,
  rightColor: 3155,
};

const MASTER_PARAMS_AX32 = {
  leftFader: 4634,
  leftMute: 4636,
  rightFader: 4743,
  rightMute: 4745,
  leftColor: 5185,
  rightColor: 5186,
};

function getMasterParams() {
  if (isAx32ProfileActive()) return MASTER_PARAMS_AX32;
  if (ACTIVE_CHANNEL_COUNT <= 16) return MASTER_PARAMS_AX16;
  return MASTER_PARAMS_AX24;
}

const MASTER_PROCESSOR_PARAMS_AX16_24 = {
  compEnabled: 2552,
  compRatio: 2553,
  compAttack: 2554,
  compRelease: 2555,
  compThreshold: 2556,
  compGain: 2557,
  eqEnabled: 2561,
  hpfTypeSlope: 2563,
  hpfFreq: 2564,
  lpfTypeSlope: 2565,
  lpfFreq: 2566,
  eqBandBase: 2568,
};

const MASTER_PROCESSOR_PARAMS_AX32_LEFT = {
  compEnabled: 4638,
  compRatio: 4639,
  compAttack: 4640,
  compRelease: 4641,
  compThreshold: 4642,
  compGain: 4643,
  eqEnabled: 4649,
  hpfTypeSlope: 4651,
  hpfFreq: 4652,
  lpfTypeSlope: 4653,
  lpfFreq: 4654,
  eqBandBase: 4656,
};

const MASTER_PROCESSOR_AX32_SIDE_STRIDE = 109;

function masterProcessorParams(side: "left" | "right" = "left") {
  if (!isAx32ProfileActive()) {
    return MASTER_PROCESSOR_PARAMS_AX16_24;
  }

  if (side === "right") {
    const offset = MASTER_PROCESSOR_AX32_SIDE_STRIDE;
    return {
      compEnabled: MASTER_PROCESSOR_PARAMS_AX32_LEFT.compEnabled + offset,
      compRatio: MASTER_PROCESSOR_PARAMS_AX32_LEFT.compRatio + offset,
      compAttack: MASTER_PROCESSOR_PARAMS_AX32_LEFT.compAttack + offset,
      compRelease: MASTER_PROCESSOR_PARAMS_AX32_LEFT.compRelease + offset,
      compThreshold: MASTER_PROCESSOR_PARAMS_AX32_LEFT.compThreshold + offset,
      compGain: MASTER_PROCESSOR_PARAMS_AX32_LEFT.compGain + offset,
      eqEnabled: MASTER_PROCESSOR_PARAMS_AX32_LEFT.eqEnabled + offset,
      hpfTypeSlope: MASTER_PROCESSOR_PARAMS_AX32_LEFT.hpfTypeSlope + offset,
      hpfFreq: MASTER_PROCESSOR_PARAMS_AX32_LEFT.hpfFreq + offset,
      lpfTypeSlope: MASTER_PROCESSOR_PARAMS_AX32_LEFT.lpfTypeSlope + offset,
      lpfFreq: MASTER_PROCESSOR_PARAMS_AX32_LEFT.lpfFreq + offset,
      eqBandBase: MASTER_PROCESSOR_PARAMS_AX32_LEFT.eqBandBase + offset,
    };
  }

  return MASTER_PROCESSOR_PARAMS_AX32_LEFT;
}

const FX_COLOR_BASE_AX32 = 5165;
const AUX_COLOR_BASE_AX32 = 5169;

function fxColorParam(fx: number) {
  if (isAx32ProfileActive()) {
    return FX_COLOR_BASE_AX32 + fx - 1;
  }
  // AX16: fxBase=0x12=18, AX24: fxBase=0x1A=26 — both share colorBaseParam 3110
  const fxBase = ACTIVE_CHANNEL_COUNT <= 16 ? 0x12 : 0x1A;
  return 3110 + fxBase + fx - 1;
}

function auxColorParam(aux: number) {
  if (isAx32ProfileActive()) return AUX_COLOR_BASE_AX32 + aux - 1;
  // AX16: auxBase=0x14=20, AX24: auxBase=0x1C=28 — both share colorBaseParam 3110
  const auxBase = ACTIVE_CHANNEL_COUNT <= 16 ? 0x14 : 0x1C;
  return 3110 + auxBase + aux - 1;
}

function getFxStateParams(fxNumber: number): {
  fader: number;
  mute: number;
} {
  const fx = Math.round(fxNumber);
  const maxFx = getFxBusCount();

  if (fx < 1 || fx > maxFx) {
    throw new Error(`FX invalido. Use valores de 1 a ${maxFx}.`);
  }

  if (isAx32ProfileActive()) {
    const base = 4873 + (fx - 1) * 22;
    return {
      fader: base,
      mute: base + 1,
    };
  }

  const table: Record<number, { fader: number; mute: number }> = {
    1: { fader: 2899, mute: 2900 },
    2: { fader: 2944, mute: 2945 },
  };

  return table[fx];
}

type FxProcessorParams = {
  eqEnabled: number;
  hpfTypeSlope: number;
  hpfFreq: number;
  lpfTypeSlope: number;
  lpfFreq: number;
  eqBand1Freq: number;
  eqBand1Gain: number;
  eqBand1Q: number;
  eqBand2Freq: number;
  eqBand2Gain: number;
  eqBand2Q: number;
  eqBand3Freq: number;
  eqBand3Gain: number;
  eqBand3Q: number;
  eqBand4Freq: number;
  eqBand4Gain: number;
  eqBand4Q: number;
};

function getFxProcessorParams(fxNumber: number): FxProcessorParams | undefined {
  if (!isAx32ProfileActive()) {
    return undefined;
  }

  const fx = Math.round(fxNumber);
  if (fx < 1 || fx > 4) {
    return undefined;
  }

  // AX32 FX EQ block confirmed from mesa logs. FX buses use stride 31.
  const base = 2727 + (fx - 1) * 31;
  return {
    eqEnabled: base,
    hpfTypeSlope: base + 2,
    hpfFreq: base + 3,
    lpfTypeSlope: base + 4,
    lpfFreq: base + 5,
    eqBand1Freq: base + 7,
    eqBand1Gain: base + 8,
    eqBand1Q: base + 9,
    eqBand2Freq: base + 11,
    eqBand2Gain: base + 12,
    eqBand2Q: base + 13,
    eqBand3Freq: base + 15,
    eqBand3Gain: base + 16,
    eqBand3Q: base + 17,
    eqBand4Freq: base + 19,
    eqBand4Gain: base + 20,
    eqBand4Q: base + 21,
  };
}

function getFxPresetParams(fxNumber: number) {
  if (!isAx32ProfileActive()) {
    return {
      preset: 3097,
      controlA: 2940,
      controlB: 2941,
    };
  }

  const fx = Math.max(1, Math.min(4, Math.round(fxNumber)));
  const ax32SelectorMap: Record<number, number> = {
    1: 5116,
    2: 5117,
    3: 5118,
    4: 5119,
  };
  // Control A/B were capture-confirmed on AX32 and align with +31 stride across FX blocks.
  const ax32ControlMap: Record<number, { controlA: number; controlB: number }> = {
    1: { controlA: 2754, controlB: 2755 },
    2: { controlA: 2785, controlB: 2786 },
    3: { controlA: 2816, controlB: 2817 },
    4: { controlA: 2847, controlB: 2848 },
  };

  return {
    preset: ax32SelectorMap[fx],
    controlA: ax32ControlMap[fx].controlA,
    controlB: ax32ControlMap[fx].controlB,
  };
}

function warnIfProtocolProfilesOutOfSync(context: string) {
  const channelProfile = normalizeProtocolProfile(ACTIVE_CHANNEL_PROFILE);
  const protocolProfile = normalizeProtocolProfile(getActiveProtocolProfile());
  const groupProfile = normalizeProtocolProfile(getGroupProtocolProfile());
  const bitmaskProfile = normalizeProtocolProfile(getBitmaskProtocolProfile());

  if (
    channelProfile !== protocolProfile
    || channelProfile !== groupProfile
    || channelProfile !== bitmaskProfile
  ) {
    console.warn("[ProfileSync] Profile globals out of sync", {
      context,
      channelProfile,
      protocolProfile,
      groupProfile,
      bitmaskProfile,
    });
  }
}

type DetailView =
  | { type: "channel"; channel: number }
  | { type: "aux"; aux: number }
  | { type: "fx"; fx: number }
  | { type: "master"; side: "left" | "right" }
  | null;
type AppStage = "splash" | "device-selection" | "mixer";
type MainView = "mixer" | "auxSends" | "fxSends" | "dcaGroups" | "muteGroups" | "scenes" | "patching";
type StripSection = "inputs" | "aux" | "fx";
type CustomizationSection = StripSection | "dca";
type CustomizationView = { section: CustomizationSection; index: number } | null;
type PairLinkState = Record<string, boolean>;
type SendValueState = Record<SendStripId, number>;
type SendTapPointState = Record<SendStripId, SendTapPoint>;
type ChannelInputSendValues = Record<string, number>;
type ChannelInputSendTapPointState = Record<string, SendTapPoint>;

type DragScrollState = {
  pointerId: number | null;
  pointerType: "mouse" | "touch" | "pen" | "";
  scrollerElement: HTMLElement | null;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startAtMs: number;
  lastClientX: number;
  lastMoveAtMs: number;
  scrollVelocityPxPerMs: number;
  dragging: boolean;
  suppressClick: boolean;
};

function getDragScrollProfile(pointerType: "mouse" | "touch" | "pen" | "") {
  if (pointerType === "mouse") {
    return {
      holdMs: 0,
      thresholdPx: 2,
      horizontalBias: 1,
    };
  }

  if (pointerType === "pen") {
    return {
      holdMs: 0,
      thresholdPx: 3,
      horizontalBias: 1.02,
    };
  }

  return {
    holdMs: 0,
    thresholdPx: 2,
    horizontalBias: 1,
  };
}

function shouldPrioritizeLocalControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  if (
    target.closest(
      "button, input, select, textarea, label, a, [role='button'], [data-drag-scroll-priority='control'], [data-drag-scroll-priority='thumb']"
    )
  ) {
    return true;
  }

  const sliderElement = target.closest("[role='slider']");
  if (!sliderElement) return false;

  const thumbOnlySlider =
    sliderElement.getAttribute("data-thumb-only-drag") === "true";

  // For thumb-only sliders, only the thumb itself blocks horizontal drag.
  if (thumbOnlySlider) {
    return Boolean(target.closest("[data-drag-scroll-priority='thumb']"));
  }

  // Other sliders (e.g. knobs/master faders) keep local interaction priority.
  return true;
}


const AUX_MASTER_FADER_PARAMS: Record<number, number> = {
  1: 1676,
  2: 1785,
  3: 1894,
  4: 2003,
  5: 2112,
  6: 2221,
  7: 2330,
  8: 2438,
};

const AUX_BLOCK_STARTS = AUX_MASTER_FADER_PARAMS;
const AUX_BLOCK_SIZE = 109;
const DEFAULT_AUX_COLOR_ID = 8;
const DEFAULT_FX_COLOR_ID = 7;
const MASTER_FIXED_COLOR_ID = 10;
const DEFAULT_MIXER_IP = "";
const SPLASH_MIN_DURATION_MS = 2000;
const APP_VERSION = "1.0.0";
const INSTALLATION_ID_STORAGE_KEY = "ax_installation_id";
const LICENSE_VALIDATED_STORAGE_KEY = "ax_license_validated";
const DCA_NAMES_STORAGE_KEY_BASE = "ax_dca_group_names";
const DCA_COLOR_IDS_STORAGE_KEY_BASE = "ax_dca_group_color_ids";
const LICENSE_ACTIVATED_ONCE_STORAGE_KEY = "ax_license_activated_once";
const LICENSE_STATUS_STORAGE_KEY = "ax_license_status";
const LICENSE_RUNTIME_CACHE_STORAGE_KEY = "ax_license_runtime_cache_v2";
const LICENSE_KEY_STORAGE_KEY = "ax_license_key_last";
const TRIAL_UPGRADE_PROMPT_DATE_KEY = "ax_trial_upgrade_prompt_date";
const PIX_CREATE_PATH = (import.meta.env.VITE_PIX_CREATE_PATH ?? "/api/payment/create-pix.php").trim();
const PIX_STATUS_PATH = (import.meta.env.VITE_PIX_STATUS_PATH ?? "/api/payment/status.php").trim();
const PIX_AMOUNT_BRL = 99.90;
const AX_APP_KEY = (import.meta.env.VITE_AX_APP_KEY ?? "").trim();
const LICENSE_REVALIDATE_INTERVAL_DAYS = 30;
const LICENSE_REVALIDATE_WARNING_DAYS = 5;
const LICENSE_BACKGROUND_RECHECK_COOLDOWN_MS = 2 * 60 * 1000;
const LICENSE_STRICT_SERVER_VALIDATION = true;
const LICENSE_API_BASE_URL = (
  import.meta.env.VITE_LICENSE_API_BASE_URL ?? "https://www.axcontrol.com.br/api"
).trim();
const REGISTER_ENDPOINT_URL = (
  import.meta.env.VITE_LICENSE_REGISTER_URL ?? ""
).trim();
const LOGIN_ENDPOINT_URL = (
  import.meta.env.VITE_LICENSE_LOGIN_URL ?? ""
).trim();
const ME_ENDPOINT_URL = (
  import.meta.env.VITE_LICENSE_ME_URL ?? ""
).trim();
const VALIDATE_ENDPOINT_URL = (
  import.meta.env.VITE_LICENSE_VALIDATE_URL ?? ""
).trim();
const STATUS_ENDPOINT_URL = (
  import.meta.env.VITE_LICENSE_STATUS_URL ?? ""
).trim();
const REGISTER_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_REGISTER_PATH ?? "register.php").trim();
const LOGIN_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_LOGIN_PATH ?? "login.php").trim();
const ME_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_ME_PATH ?? "me.php").trim();
const VALIDATE_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_VALIDATE_PATH ?? "validate.php").trim();
const STATUS_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_STATUS_PATH ?? "status.php").trim();
const REVOKE_DEVICE_PATH = (import.meta.env.VITE_LICENSE_REVOKE_DEVICE_PATH ?? "revoke-device.php").trim();
const REACTIVATE_DEVICE_PATH = (import.meta.env.VITE_LICENSE_REACTIVATE_DEVICE_PATH ?? "reactivate-device.php").trim();
const UPGRADE_PRICE_LABEL = (import.meta.env.VITE_UPGRADE_PRICE_LABEL ?? "R$99,90").trim();
const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP ?? "+5592993361237").trim();
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL ?? "").trim();

type CachedLicenseStatus = {
  installationId: string;
  code: string;
  validatedAt: string;
  nextRevalidationAt: string;
  expiryDate: string | null;
  message: string;
};

function readCachedLicenseStatus(): CachedLicenseStatus | null {
  const raw = localStorage.getItem(LICENSE_STATUS_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CachedLicenseStatus>;

    if (
      typeof parsed.installationId !== "string" ||
      typeof parsed.code !== "string" ||
      typeof parsed.validatedAt !== "string" ||
      typeof parsed.nextRevalidationAt !== "string" ||
      typeof parsed.message !== "string"
    ) {
      return null;
    }

    return {
      installationId: parsed.installationId,
      code: parsed.code,
      validatedAt: parsed.validatedAt,
      nextRevalidationAt: parsed.nextRevalidationAt,
      expiryDate: typeof parsed.expiryDate === "string" ? parsed.expiryDate : null,
      message: parsed.message,
    };
  } catch {
    return null;
  }
}

function isCacheValidForInstallation(cached: CachedLicenseStatus | null, installationId: string) {
  if (!cached) return false;
  if (cached.installationId !== installationId) return false;
  return cached.code === "LICENSE_VALID";
}

function isLicenseExpiredByDate(expiryIso: string | null, nowMs = Date.now()) {
  if (!expiryIso) return false;

  const expiryMs = Date.parse(expiryIso);
  if (Number.isNaN(expiryMs)) return false;

  return nowMs >= expiryMs;
}

function normalizeMixerMacAddress(macAddress?: string) {
  if (!macAddress) return undefined;

  const upper = macAddress.trim().toUpperCase();
  if (!upper) return undefined;

  const parts = upper.split(":");
  if (parts.length !== 6 || parts.some((part) => !/^[0-9A-F]{2}$/.test(part))) {
    return undefined;
  }

  return parts.join(":");
}

function buildMixerCacheIdentity(
  ip: string,
  channelCountValue: number,
  mixers: DiscoveredMixer[]
) {
  const normalizedIp = ip.trim();
  const discoveredMixer = mixers.find((mixer) => mixer.ip.trim() === normalizedIp);
  const normalizedChannels = normalizeSupportedChannelCount(channelCountValue);
  const normalizedMac = normalizeMixerMacAddress(discoveredMixer?.macAddress);

  if (normalizedMac) {
    return `mac:${normalizedMac}:ch:${normalizedChannels}`;
  }

  return `ip:${normalizedIp}:ch:${normalizedChannels}`;
}

function getScopedStorageKey(baseKey: string, mixerCacheIdentity: string | null) {
  if (!mixerCacheIdentity) return null;
  return `${baseKey}:${mixerCacheIdentity}`;
}

function readScopedDcaNames(mixerCacheIdentity: string | null, dcaCount: number) {
  const storageKey = getScopedStorageKey(DCA_NAMES_STORAGE_KEY_BASE, mixerCacheIdentity);
  if (!storageKey) return null;

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as unknown[];
    if (
      Array.isArray(parsed) &&
      parsed.length === dcaCount &&
      parsed.every((value) => typeof value === "string")
    ) {
      return parsed as string[];
    }
  } catch {
    // Ignore malformed or unavailable local cache.
  }

  return null;
}

function readScopedDcaColorIds(mixerCacheIdentity: string | null, dcaIds: DcaGroupId[]) {
  const storageKey = getScopedStorageKey(DCA_COLOR_IDS_STORAGE_KEY_BASE, mixerCacheIdentity);
  if (!storageKey) return null;

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as unknown[];
    if (!Array.isArray(parsed)) return null;

    return Array.from({ length: dcaIds.length }, (_, index) => {
      const cached = parsed[index];
      if (typeof cached === "number") {
        return Math.max(0, Math.min(12, Math.round(cached)));
      }

      return DCA_DEFAULT_COLOR_IDS[dcaIds[index]];
    });
  } catch {
    // Ignore malformed or unavailable local cache.
  }

  return null;
}

function isLicenseCacheExpired(
  cached: CachedLicenseStatus | null,
  installationId: string,
  nowMs = Date.now()
) {
  if (!cached) return true;
  if (!isCacheValidForInstallation(cached, installationId)) return true;

  const dueAtMs = Date.parse(cached.nextRevalidationAt);
  if (Number.isNaN(dueAtMs)) return true;

  return nowMs > dueAtMs;
}

function buildLicenseRevalidationHint(
  cached: CachedLicenseStatus | null,
  installationId: string,
  online: boolean,
  nowMs = Date.now()
) {
  if (!cached || cached.installationId !== installationId) return "";

  const dueAtMs = Date.parse(cached.nextRevalidationAt);
  if (Number.isNaN(dueAtMs)) return "";

  const dayMs = 24 * 60 * 60 * 1000;
  const daysUntilDue = Math.ceil((dueAtMs - nowMs) / dayMs);

  if (daysUntilDue > LICENSE_REVALIDATE_WARNING_DAYS) {
    return "";
  }

  if (daysUntilDue >= 0) {
    if (daysUntilDue === 0) {
      return "Revalidação da licença vence hoje. Se possível, valide com internet.";
    }

    return `Revalidação da licença em ${daysUntilDue} dia(s).`;
  }

  const overdueDays = Math.abs(daysUntilDue);
  if (online) {
    return `Revalidação obrigatória pendente há ${overdueDays} dia(s). Conecte-se à internet para evitar bloqueio.`;
  }

  return `Sem internet. Revalidação pendente há ${overdueDays} dia(s).`;
}

function buildLicenseExpiryHint(cached: CachedLicenseStatus | null, installationId: string, nowMs = Date.now()) {
  if (!cached || cached.installationId !== installationId) return "";
  if (!cached.expiryDate) return "";

  const expiryMs = Date.parse(cached.expiryDate);
  if (Number.isNaN(expiryMs)) return "";

  const dayMs = 24 * 60 * 60 * 1000;
  const daysUntilExpiry = Math.ceil((expiryMs - nowMs) / dayMs);

  if (daysUntilExpiry < 0) {
    return "Período de teste expirado. Entre em contato para adquirir a licença.";
  }

  if (daysUntilExpiry === 0) {
    return "Período de teste expira hoje.";
  }

  if (daysUntilExpiry <= LICENSE_REVALIDATE_WARNING_DAYS) {
    return `Período de teste expira em ${daysUntilExpiry} dia(s).`;
  }

  return "";
}

function getTrialRemainingDays(trialExpiryAt: string | null, nowMs = Date.now()) {
  if (!trialExpiryAt) return null;
  const expiryMs = Date.parse(trialExpiryAt);
  if (Number.isNaN(expiryMs)) return null;
  return Math.ceil((expiryMs - nowMs) / (24 * 60 * 60 * 1000));
}

function readRuntimeLicenseCache(): RuntimeLicenseCache | null {
  return readRuntimeLicenseCacheFromStorage(LICENSE_RUNTIME_CACHE_STORAGE_KEY);
}

function writeRuntimeLicenseCache(cache: RuntimeLicenseCache) {
  writeRuntimeLicenseCacheToStorage(LICENSE_RUNTIME_CACHE_STORAGE_KEY, cache);
}

function clearRuntimeLicenseCache() {
  clearRuntimeLicenseCacheFromStorage(LICENSE_RUNTIME_CACHE_STORAGE_KEY);
}

function buildLicenseApiUrl(path: string) {
  if (!LICENSE_API_BASE_URL) return "";
  const base = LICENSE_API_BASE_URL.endsWith("/") ? LICENSE_API_BASE_URL.slice(0, -1) : LICENSE_API_BASE_URL;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function buildLicenseEndpointCandidates(primaryUrl: string, primaryPath: string, fallbackPaths: string[]) {
  const unique = new Set<string>();
  const result: string[] = [];

  if (primaryUrl) {
    const normalizedUrl = primaryUrl.trim();
    if (normalizedUrl) {
      unique.add(normalizedUrl);
      result.push(normalizedUrl);
    }
  }

  for (const rawPath of [primaryPath, ...fallbackPaths]) {
    const path = rawPath.trim();
    if (!path) continue;

    const endpoint = /^https?:\/\//i.test(path) ? path : buildLicenseApiUrl(path);
    if (!endpoint || unique.has(endpoint)) continue;

    unique.add(endpoint);
    result.push(endpoint);
  }

  return result;
}

function resolveLicenseEndpointUrl(primaryUrl: string, primaryPath: string, fallbackPaths: string[]) {
  const candidates = buildLicenseEndpointCandidates(primaryUrl, primaryPath, fallbackPaths);
  return candidates[0] ?? "";
}

function buildLocalhostApiCandidates(fileName: string) {
  return [
    `https://www.axcontrol.com.br/api/${fileName}`,
    `https://www.axcontrol.com.br/${fileName}`,
    `http://www.axcontrol.com.br/api/${fileName}`,
    `http://www.axcontrol.com.br/${fileName}`,
    `/api/${fileName}`,
    `api/${fileName}`,
    fileName,
    `/${fileName}`,
  ];
}

function getBackendMessage(payload: Record<string, unknown>, parsed: Record<string, unknown>) {
  const fromPayload = typeof payload.message === "string" ? payload.message.trim() : "";
  if (fromPayload) return fromPayload;
  const fromParsed = typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (fromParsed) return fromParsed;
  return "";
}

function buildRegistrationFailureMessage(input: {
  httpStatus: number;
  backendMessage: string;
  rawBody: string;
  transportError?: string;
}) {
  if (input.transportError) {
    return "Não foi possível concluir o cadastro agora. Tente novamente em instantes ou use Entrar se já tiver uma conta.";
  }

  const backendMessage = input.backendMessage.trim();
  const backendMessageLower = backendMessage.toLowerCase();
  if (backendMessage) {
    const looksLikeDuplicateAccount =
      backendMessageLower.includes("já existe") ||
      backendMessageLower.includes("ja existe") ||
      backendMessageLower.includes("already") ||
      backendMessageLower.includes("duplic") ||
      backendMessageLower.includes("e-mail") ||
      backendMessageLower.includes("email");

    if (looksLikeDuplicateAccount) {
      return "Não foi possível concluir o cadastro com estes dados. Se você já possui uma conta, use Entrar para continuar.";
    }

    return backendMessage;
  }

  const rawBody = input.rawBody.trim().toLowerCase();
  const looksLikeHtml = rawBody.startsWith("<!doctype") || rawBody.startsWith("<html") || rawBody.includes("<body");
  if (looksLikeHtml || input.httpStatus === 404) {
    return "Não foi possível concluir o cadastro agora. Se você já possui uma conta, use Entrar para continuar.";
  }

  if (input.httpStatus >= 500) {
    return "Serviço de cadastro indisponível no momento. Tente novamente em instantes.";
  }

  if (input.httpStatus === 429) {
    return "Muitas tentativas em sequência. Aguarde um momento e tente novamente.";
  }

  return "Não foi possível concluir o cadastro agora. Revise os dados e tente novamente. Se você já possui uma conta, use Entrar para continuar.";
}

function buildRegisterSnapshotPayload(payload: Record<string, unknown>, fallbackInstallationId: string): Record<string, unknown> {
  const normalized = normalizeLicenseApiPayload(payload);
  const license = normalized.license && typeof normalized.license === "object"
    ? (normalized.license as Record<string, unknown>)
    : null;
  const installation = normalized.installation && typeof normalized.installation === "object"
    ? (normalized.installation as Record<string, unknown>)
    : {};

  const statusValue =
    (license && typeof license.status === "string" ? license.status : "") ||
    (typeof normalized.status === "string" ? normalized.status : "active");
  const statusLower = statusValue.trim().toLowerCase();
  const activeValue = typeof normalized.active === "boolean"
    ? normalized.active
    : statusLower === "active";
  const validValue = typeof normalized.valid === "boolean"
    ? normalized.valid
    : activeValue;

  let codeValue = typeof normalized.code === "string" ? normalized.code : "LICENSE_VALID";
  if (typeof normalized.code !== "string") {
    if (statusLower === "revoked") codeValue = "LICENSE_REVOKED";
    else if (statusLower === "suspended") codeValue = "LICENSE_SUSPENDED";
    else if (statusLower === "blocked" || statusLower === "inactive" || statusLower === "pending") codeValue = "LICENSE_BLOCKED";
  }

  const resolvedSeries =
    (license && typeof license.series === "string" && license.series.trim()) ||
    (typeof normalized.series === "string" && normalized.series.trim()) ||
    fallbackInstallationId;
  const resolvedType =
    (license && typeof license.type === "string" && license.type.trim()) ||
    (typeof normalized.license_type === "string" && normalized.license_type.trim()) ||
    "unknown";

  return {
    ...normalized,
    code: codeValue,
    status: statusValue,
    valid: validValue,
    active: activeValue,
    license: {
      ...(license ?? {}),
      series: resolvedSeries,
      type: resolvedType,
    },
    activation: {
      active_devices: normalized.active_devices,
      remaining_activations:
        normalized.remaining_activations ??
        (license && typeof license.max_activations !== "undefined" ? license.max_activations : null),
      devices: normalized.devices,
    },
    installation: {
      ...installation,
      uuid:
        (typeof installation.uuid === "string" && installation.uuid.trim()) ||
        (typeof normalized.installation_uuid === "string" && normalized.installation_uuid.trim()) ||
        fallbackInstallationId,
    },
  };
}

function normalizeLicenseApiPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const body = payload && typeof payload === "object" ? payload : {};
  const data = body.data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : body;
}

function isAppKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as Record<string, unknown>).isAppKeyError === true;
}

function isSessionExpiredError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as Record<string, unknown>).isSessionExpiredError === true;
}

function isRateLimitError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as Record<string, unknown>).isRateLimitError === true;
}

function licenseApiErrorText(err: unknown): string | null {
  if (isAppKeyError(err)) return "Erro de configuração do aplicativo. Por favor, reinstale ou atualize o app.";
  if (isSessionExpiredError(err)) return "Sessão expirada. Faça login novamente.";
  if (isRateLimitError(err)) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return null;
}

async function requestLicenseApiViaNative(
  method: "GET" | "POST",
  url: string,
  body?: Record<string, unknown>
): Promise<{ statusCode: number; body: Record<string, unknown>; rawBody: string } | null> {
  if (!url) return null;

  try {
    const response = await invoke<{ statusCode: number; body: Record<string, unknown>; rawBody: string }>(
      "license_api_request",
      {
        payload: {
          method,
          url,
          body: method === "POST" ? (body ?? null) : null,
        },
      }
    );

    if (response.statusCode === 403) {
      throw Object.assign(new Error("APP_KEY_UNAUTHORIZED"), { isAppKeyError: true });
    }
    if (response.statusCode === 401) {
      throw Object.assign(new Error("SESSION_EXPIRED"), { isSessionExpiredError: true });
    }
    if (response.statusCode === 429) {
      throw Object.assign(new Error("RATE_LIMIT"), { isRateLimitError: true });
    }

    return response;
  } catch (err) {
    if (isAppKeyError(err) || isSessionExpiredError(err) || isRateLimitError(err)) throw err;
    return null;
  }
}

function buildAuthSnapshotPayload(payload: Record<string, unknown>, fallbackInstallationId: string): Record<string, unknown> {
  const normalized = normalizeLicenseApiPayload(payload);
  const license = normalized.license && typeof normalized.license === "object"
    ? (normalized.license as Record<string, unknown>)
    : {};
  const activation = normalized.activation && typeof normalized.activation === "object"
    ? (normalized.activation as Record<string, unknown>)
    : {};
  const installation = normalized.installation && typeof normalized.installation === "object"
    ? (normalized.installation as Record<string, unknown>)
    : {};

  const statusValue = typeof normalized.status === "string"
    ? normalized.status
    : (typeof license.status === "string" ? license.status : "active");
  const statusLower = statusValue.trim().toLowerCase();

  const activeValue = typeof normalized.active === "boolean"
    ? normalized.active
    : statusLower === "active";
  const validValue = typeof normalized.valid === "boolean"
    ? normalized.valid
    : activeValue;

  let codeValue = typeof normalized.code === "string" ? normalized.code : "LICENSE_VALID";
  if (typeof normalized.code !== "string") {
    if (statusLower === "revoked") codeValue = "LICENSE_REVOKED";
    else if (statusLower === "suspended") codeValue = "LICENSE_SUSPENDED";
    else if (statusLower === "blocked" || statusLower === "inactive" || statusLower === "pending") codeValue = "LICENSE_BLOCKED";
  }

  const resolvedSeries =
    (typeof license.series === "string" && license.series.trim()) ||
    (typeof normalized.series === "string" && normalized.series.trim()) ||
    fallbackInstallationId;

  const resolvedUuid =
    (typeof installation.uuid === "string" && installation.uuid.trim()) ||
    (typeof normalized.device_id === "string" && normalized.device_id.trim()) ||
    (typeof normalized.series === "string" && normalized.series.trim()) ||
    fallbackInstallationId;

  const licenseTypeValue =
    (typeof license.type === "string" && license.type.trim()) ||
    (typeof normalized.license_type === "string" && normalized.license_type.trim()) ||
    "unknown";

  return {
    ...normalized,
    code: codeValue,
    status: statusValue,
    valid: validValue,
    active: activeValue,
    license: {
      ...license,
      series: resolvedSeries,
      type: licenseTypeValue,
    },
    activation: {
      ...activation,
      active_devices: activation.active_devices ?? normalized.active_devices,
      remaining_activations: activation.remaining_activations ?? normalized.remaining_activations,
    },
    installation: {
      ...installation,
      uuid: resolvedUuid,
    },
  };
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatPhoneWithDddMask(value: string) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return "";

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);

  if (digits.length <= 6) {
    return `(${ddd}) ${number}`;
  }

  if (digits.length <= 10) {
    const first = number.slice(0, 4);
    const last = number.slice(4);
    return `(${ddd}) ${first}${last ? `-${last}` : ""}`;
  }

  const first = number.slice(0, 5);
  const last = number.slice(5, 9);
  return `(${ddd}) ${first}-${last}`;
}

type ColorScope = "input" | "aux" | "fx" | "master";

function clampColorId(colorId: number) {
  return Math.max(0, Math.min(12, Math.round(colorId)));
}

function normalizeColorByScope(scope: ColorScope, colorId: number) {
  void scope;
  return clampColorId(colorId);
}

function resolveMesaColorByScope(
  scope: ColorScope,
  rawColor: number | undefined,
  onWriteBack?: () => void
) {
  if (rawColor === undefined) return undefined;
  void onWriteBack;
  return normalizeColorByScope(scope, rawColor);
}

function generateInstallationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPlatformLabel() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("win")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  return "";
}

function getDeviceNameLabel() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("mac")) return "Mac";
  if (ua.includes("win")) return "Windows PC";
  if (ua.includes("android")) return "Android Device";
  return "Desktop Device";
}

function isConstrainedMobileDevice() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  const isIpad =
    ua.includes("ipad") ||
    (ua.includes("macintosh") && navigator.maxTouchPoints > 1);

  if (!isIpad) return false;

  const memoryHint = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memoryHint === "number") {
    return memoryHint <= 4;
  }

  // Safari on iPad may not expose deviceMemory; default to conservative profile.
  return true;
}

function shouldPreferDirectWhatsAppLaunch() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  const isIpad = ua.includes("ipad") || (ua.includes("macintosh") && navigator.maxTouchPoints > 1);

  return isIpad || ua.includes("iphone") || ua.includes("android");
}

function normalizeAuxColorId(colorId: number) {
  return normalizeColorByScope("aux", colorId);
}

function normalizeFxColorId(colorId: number) {
  return normalizeColorByScope("fx", colorId);
}

function getChannelPair(channel: number): [number, number] {
  const odd = channel % 2 === 0 ? channel - 1 : channel;
  return [odd, odd + 1];
}

function getAuxPair(aux: number): [number, number] {
  const odd = aux % 2 === 0 ? aux - 1 : aux;
  return [odd, odd + 1];
}

function pairKey(odd: number, even: number) {
  return `${odd}-${even}`;
}

function stripLinkedNameSuffix(name: string) {
  return name.replace(/\s(?:\+\s)?[LR]$/i, "").trim();
}

function getChannelLinkFlag(pairOdd: number, linked: boolean) {
  if (isAx32ProfileActive()) {
    if (!linked) return 0;
    return Math.max(1, Math.floor((pairOdd + 1) / 2));
  }

  if (linked) return 3;
  if (pairOdd === 1) return 2;
  if (pairOdd === 3) return 1;
  return null;
}

function getChannelLinkParam() {
  return isAx32ProfileActive() ? 5108 : 3055;
}

function getLinkMaskParam() {
  return isAx32ProfileActive() ? 5109 : 3056;
}

function getMasterLinkBit() {
  return isAx32ProfileActive() ? 256 : 16;
}

function isUsbInputSelectedFromRaw(rawValue: number) {
  return rawValue === 0;
}

function rawValueFromUsbInputSelected(usbSelected: boolean) {
  return usbSelected ? 0 : 1;
}

function auxBlockStart(aux: number) {
  if (isAx32ProfileActive()) {
    return 2890 + (aux - 1) * 109;
  }

  return AUX_BLOCK_STARTS[aux];
}

function auxSoloLeftParam(aux: number) {
  if (isAx32ProfileActive()) {
    return 2902 + (aux - 1) * 109;
  }

  return 1688 + (aux - 1) * 109;
}

function auxMuteParam(aux: number) {
  if (isAx32ProfileActive()) {
    return 2892 + (aux - 1) * 109;
  }

  return 1678 + (aux - 1) * 109;
}

function fxSoloLeftParam(fx: number) {
  if (isAx32ProfileActive()) {
    return 4893 + (fx - 1) * 22;
  }

  const table: Record<number, number> = {
    1: 2911,
    2: 2956,
  };

  return table[fx] ?? 2911;
}

function masterSoloLeftParam() {
  return isAx32ProfileActive() ? 4646 : 1575;
}

function masterSoloRightParam() {
  return isAx32ProfileActive() ? 4755 : 1637;
}

function masterSoloAuxLeftParam() {
  return isAx32ProfileActive() ? 4647 : 1576;
}

function masterSoloAuxRightParam() {
  return isAx32ProfileActive() ? 4756 : 1638;
}

const AUX_LINK_BITS: Record<number, number> = {
  1: 1,
  3: 2,
  5: 4,
  7: 8,
};

function getActiveSendIds(): SendStripId[] {
  const fxCount = getFxBusCount();
  const auxCount = getAuxBusCount();

  return [
    ...Array.from({ length: fxCount }, (_, index) => `fx${index + 1}`),
    ...Array.from({ length: auxCount }, (_, index) => `aux${index + 1}`),
  ];
}

const AUX_SEND_BASES_AX16_24: Record<number, number> = {
  1: 77,
  2: 78,
  3: 79,
  4: 80,
  5: 81,
  6: 82,
  7: 83,
  8: 84,
};

const FX_SEND_BASES_AX16_24: Record<number, number> = {
  1: 89,
  2: 90,
};

const FX_SEND_BASES_AX32: Record<number, number> = {
  1: 96,
  2: 97,
  3: 98,
  4: 99,
};

const SEND_WRITE_THROTTLE_MS = 80;
const GLOBAL_CONTROL_FAST_POLL_INTERVAL_MIXER_MS = 280;
const GLOBAL_CONTROL_FAST_POLL_INTERVAL_DETAIL_MS = 420;
const GLOBAL_CONTROL_FAST_POLL_INTERVAL_OTHER_MS = 650;
const GLOBAL_CONTROL_POLL_INTERVAL_MS = 2400;
const USB_RETURN_PATCH_POLL_INTERVAL_MS = 6500;
const LOCAL_WRITE_ECHO_SUPPRESSION_MS = 900;
const CHANNEL_FADER_UI_COMMIT_INTERVAL_MS = 20;
const AX16_24_READ_TIMEOUT_MS = 1400;
const AX16_24_BATCH_CHANNEL_CHUNK = 30;
const AX16_24_BATCH_AUX_CHUNK = 28;
const AX16_24_FAST_CHANNEL_CHUNK = 34;
const SEND_PRE_FADER_FLAG = 32768;
const AX32_INPUT_PATCH_BASE = 2693;
const AX32_INPUT_PATCH_SIZE = 34;
const AX32_INPUT_PATCH_VISIBLE_SIZE = 32;
const AX32_USB_INPUT_PATCH_BASE = 2533;
const AX32_USB_INPUT_PATCH_SIZE = 32;
const AX32_USB_RETURN_PATCH_BASE = 2565;
const AX32_USB_RETURN_PATCH_SIZE = 32;
const AX32_OUTPUT_PATCH_BASE = 4855;
const AX32_OUTPUT_PATCH_SIZE = 18;
const AX32_OUTPUT_PATCH_VISIBLE_SIZE = 14;
const FX_RETURN_MAPPING: Readonly<{ available: false; reason: string }> = {
  available: false,
  reason: "TODO(types): mapear parametros reais de retorno de FX (level/mute/pan) antes de habilitar controle.",
};

function createIdentityRoutes(visibleCount: number) {
  return Array.from({ length: visibleCount }, (_, index) => index + 1);
}

function normalizePatchRouteValue(rawValue: number, baseParam: number, fullSize: number): number | null {
  const candidates = [Math.round(rawValue), Math.round(rawValue) - 32768];

  for (const candidate of candidates) {
    if (candidate >= 0 && candidate <= fullSize) {
      return candidate;
    }

    const fromParamRange = candidate - baseParam + 1;
    if (fromParamRange >= 0 && fromParamRange <= fullSize) {
      return fromParamRange;
    }
  }

  return null;
}

function createDefaultSendValues(): SendValueState {
  const next: SendValueState = {};
  getActiveSendIds().forEach((id) => {
    next[id] = 1200;
  });
  return next;
}

function createDefaultSendTapPoints(): SendTapPointState {
  const next: SendTapPointState = {};
  getActiveSendIds().forEach((id) => {
    next[id] = "post";
  });
  return next;
}

function createDefaultChannelInputSendValues(channelCount = DEFAULT_CHANNEL_COUNT): ChannelInputSendValues {
  const next: ChannelInputSendValues = {};
  for (let channel = 1; channel <= channelCount; channel++) {
    next[`ch${channel}`] = 1200;
  }
  return next;
}

function createDefaultChannelInputSendTapPoints(channelCount = DEFAULT_CHANNEL_COUNT): ChannelInputSendTapPointState {
  const next: ChannelInputSendTapPointState = {};
  for (let channel = 1; channel <= channelCount; channel++) {
    next[`ch${channel}`] = "post";
  }
  return next;
}

function decodeSendRawValue(rawValue: number | undefined) {
  if (rawValue === undefined) {
    return {
      value: 1200,
      tapPoint: "post" as SendTapPoint,
    };
  }

  const normalized = Math.max(0, Math.round(rawValue));
  const pre = normalized >= SEND_PRE_FADER_FLAG;
  const baseValue = pre ? normalized - SEND_PRE_FADER_FLAG : normalized;

  return {
    value: Math.max(0, Math.min(1300, baseValue)),
    tapPoint: pre ? ("pre" as SendTapPoint) : ("post" as SendTapPoint),
  };
}

function encodeSendRawValue(value: number, tapPoint: SendTapPoint) {
  const clamped = Math.max(0, Math.min(1300, Math.round(value)));
  return tapPoint === "pre" ? clamped + SEND_PRE_FADER_FLAG : clamped;
}

function sendIdToParam(channel: number, id: SendStripId) {
  const channelOffset = (channel - 1) * (isAx32ProfileActive() ? AX32_CHANNEL_STRIDE : 62);

  if (id.startsWith("fx")) {
    const fxNumber = Number(id.replace("fx", ""));
    const maxFx = getFxBusCount();
    if (!Number.isFinite(fxNumber) || fxNumber < 1 || fxNumber > maxFx) {
      throw new Error(`FX send inválido para o perfil atual: ${id}`);
    }
    const base = isAx32ProfileActive()
      ? FX_SEND_BASES_AX32[fxNumber]
      : FX_SEND_BASES_AX16_24[fxNumber];

    if (base === undefined) {
      throw new Error(`Base de FX send não mapeada para ${id}`);
    }

    return base + channelOffset;
  }

  const auxNumber = Number(id.replace("aux", ""));
  const maxAux = getAuxBusCount();
  if (!Number.isFinite(auxNumber) || auxNumber < 1 || auxNumber > maxAux) {
    throw new Error(`AUX send inválido para o perfil atual: ${id}`);
  }
  const base = isAx32ProfileActive()
    ? 75 + auxNumber // AUX1..14 -> 76..89
    : AUX_SEND_BASES_AX16_24[auxNumber];

  if (base === undefined) {
    throw new Error(`Base de AUX send não mapeada para ${id}`);
  }

  return base + channelOffset;
}

function isAuxLinked(value3056: number, aux: number) {
  const odd = aux % 2 === 0 ? aux - 1 : aux;
  const bit = AUX_LINK_BITS[odd];

  if (!bit) return false;

  return Boolean(value3056 & bit);
}

function isMasterLinked(value3056: number) {
  return Boolean(value3056 & getMasterLinkBit());
}

// AUX link state comes from param 3056 bitmask. Linked AUX pairs should mirror values and show the same linked visual treatment used in Mixer.

function normalizeMixerName(name: string) {
  return name.trim().toUpperCase().replace(/\s+/g, "");
}

function isDefaultMixerName(target: NameTarget, mixerName: string) {
  const normalized = normalizeMixerName(mixerName);

  if (!normalized) return true;

  if (target.type === "channel") {
    return (
      normalized === `CH${target.channel}` ||
      normalized === `CHANNEL${target.channel}`
    );
  }

  if (target.type === "aux") {
    const ax32CompactAlias = isAx32ProfileActive() && target.aux >= 10
      ? `AX${target.aux}`
      : null;

    return (
      normalized === `AUX${target.aux}` ||
      (ax32CompactAlias !== null && normalized === ax32CompactAlias) ||
      normalized === `AUXILIAR${target.aux}`
    );
  }

  if (target.type === "fx") {
    return (
      normalized === `FX${target.fx}` ||
      normalized === `EFFECT${target.fx}` ||
      normalized === `EFEITO${target.fx}`
    );
  }

  return false;
}

function getDefaultDisplayName(target: NameTarget) {
  if (target.type === "channel") return `Channel ${target.channel}`;
  if (target.type === "aux") return `Auxiliar ${target.aux}`;
  if (target.type === "fx") return `Efeito ${target.fx}`;
  if (target.type === "master") return `Master ${target.side === "left" ? "L" : "R"}`;
  return `DCA ${target.dca}`;
}

function getDefaultMixerAlias(target: NameTarget) {
  if (target.type === "channel") return `CH${target.channel}`;
  if (target.type === "aux") {
    if (isAx32ProfileActive() && target.aux >= 10) {
      return `AX${target.aux}`;
    }

    return `AUX${target.aux}`;
  }
  if (target.type === "fx") return `FX${target.fx}`;
  if (target.type === "master") return target.side === "left" ? "MASTERL" : "MASTERR";
  return `DCA${target.dca}`;
}

function isLocalDefaultDisplayName(target: NameTarget, displayName: string) {
  const normalized = normalizeMixerName(displayName);
  const defaultDisplayNormalized = normalizeMixerName(getDefaultDisplayName(target));
  return normalized === defaultDisplayNormalized || isDefaultMixerName(target, displayName);
}

function getDefaultDcaGroupName(index: number) {
  return `DCA Group ${index + 1}`;
}

function createVirtualStripsState(count: number, defaultColorId?: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...createDefaultChannelState(),
    colorId: defaultColorId ?? ((index + 2) % 12) + 1,
    iconId: index % DUONN_CHANNEL_ICONS.length,
    faderDb: -5,
    faderPosition: dbToFaderPosition(-5),
  }));
}

function sendGroupMessages(
  client: Axios16Client,
  messages: DuonnParamWriteMessage[]
) {
  for (const message of messages) {
    client.sendParam(message.param, message.value);
  }
}

const DEFAULT_GATE: GateState = {
  enabled: false,
  threshold: -50,
  attack: 15,
  decay: 2,
  hold: 120,
};

const DEFAULT_COMP: CompressorState = {
  enabled: false,
  threshold: 0,
  ratio: 1,
  attack: 30,
  release: 145,
  gain: 0,
};

const DEFAULT_EQ: EqState = {
  enabled: false,
  hpfEnabled: false,
  hpfType: "butterworth",
  hpfSlope: 24,
  hpfFreq: 20,
  lpfEnabled: false,
  lpfType: "butterworth",
  lpfSlope: 24,
  lpfFreq: 20000,
  bands: [
    { enabled: true, freq: 80, gain: 0, q: 1 },
    { enabled: true, freq: 400, gain: 0, q: 1 },
    { enabled: true, freq: 2500, gain: 0, q: 1 },
    { enabled: true, freq: 12000, gain: 0, q: 1 },
  ],
};

const DEFAULT_AUX_EQ: EqState = {
  enabled: false,
  hpfEnabled: false,
  hpfType: "butterworth",
  hpfSlope: 24,
  hpfFreq: 20,
  lpfEnabled: false,
  lpfType: "butterworth",
  lpfSlope: 24,
  lpfFreq: 20000,
  bands: [
    { enabled: true, freq: 63, gain: 0, q: 1 },
    { enabled: true, freq: 150, gain: 0, q: 1 },
    { enabled: true, freq: 400, gain: 0, q: 1 },
    { enabled: true, freq: 1000, gain: 0, q: 1 },
    { enabled: true, freq: 2500, gain: 0, q: 1 },
    { enabled: true, freq: 6300, gain: 0, q: 1 },
    { enabled: true, freq: 16000, gain: 0, q: 1 },
  ],
};

const EQ_MIN_FREQ = 20;
const EQ_MAX_FREQ = 20000;
const EQ_MIN_GAP = 10;

function clampEqFrequency(value: number) {
  return Math.max(EQ_MIN_FREQ, Math.min(EQ_MAX_FREQ, Math.round(value)));
}

function normalizeEqFrequencies(hpfFreq: number, lpfFreq: number) {
  let nextHpf = clampEqFrequency(hpfFreq);
  let nextLpf = clampEqFrequency(lpfFreq);

  if (nextHpf > EQ_MAX_FREQ - EQ_MIN_GAP) {
    nextHpf = EQ_MAX_FREQ - EQ_MIN_GAP;
  }

  if (nextLpf < EQ_MIN_FREQ + EQ_MIN_GAP) {
    nextLpf = EQ_MIN_FREQ + EQ_MIN_GAP;
  }

  if (nextHpf >= nextLpf) {
    nextLpf = Math.min(EQ_MAX_FREQ, nextHpf + EQ_MIN_GAP);
    if (nextLpf - nextHpf < EQ_MIN_GAP) {
      nextHpf = Math.max(EQ_MIN_FREQ, nextLpf - EQ_MIN_GAP);
    }
  }

  return {
    hpfFreq: nextHpf,
    lpfFreq: nextLpf,
  };
}

function mergeEqPatch(current: EqState, patch: Partial<EqState>): EqState {
  const merged = {
    ...current,
    ...patch,
  };
  const normalized = normalizeEqFrequencies(merged.hpfFreq, merged.lpfFreq);

  return {
    ...merged,
    hpfFreq: normalized.hpfFreq,
    lpfFreq: normalized.lpfFreq,
  };
}

function createDefaultProcessorState(): ProcessorState {
  return {
    gate: { ...DEFAULT_GATE },
    comp: { ...DEFAULT_COMP },
    eq: {
      ...DEFAULT_EQ,
      bands: DEFAULT_EQ.bands.map((band) => ({ ...band })),
    },
  };
}

function createDefaultAuxProcessorState(): ProcessorState {
  return {
    gate: { ...DEFAULT_GATE },
    comp: { ...DEFAULT_COMP },
    eq: {
      ...DEFAULT_AUX_EQ,
      bands: DEFAULT_AUX_EQ.bands.map((band) => ({ ...band })),
    },
  };
}

function createDefaultFxPresetState(): FxPresetState {
  return {
    presetId: 1,
    controlAValue: 0,
    controlBValue: 0,
  };
}

function createInitialFxPresetStates(fxCount: number) {
  return Array.from({ length: fxCount }, () => createDefaultFxPresetState());
}

function createInitialProcessorStates(channelCount = DEFAULT_CHANNEL_COUNT) {
  return Array.from({ length: channelCount }, () => createDefaultProcessorState());
}

function cloneProcessorState(state: ProcessorState): ProcessorState {
  return {
    gate: { ...state.gate },
    comp: { ...state.comp },
    eq: {
      ...state.eq,
      bands: state.eq.bands.map((band) => ({ ...band })),
    },
  };
}

function processorParams(channelNumber: number) {
  return {
    gateEnabled: channelParam(channelNumber, 66),
    gateThreshold: channelParam(channelNumber, 67),
    gateAttack: channelParam(channelNumber, 69),
    gateDecay: channelParam(channelNumber, 70),
    gateHold: channelParam(channelNumber, 71),
    compEnabled: channelParam(channelNumber, 93),
    compRatio: channelParam(channelNumber, 94),
    compAttack: channelParam(channelNumber, 95),
    compRelease: channelParam(channelNumber, 96),
    compThreshold: channelParam(channelNumber, 97),
    compGain: channelParam(channelNumber, 99),
    eqEnabled: channelParam(channelNumber, 100),
    hpfTypeSlope: channelParam(channelNumber, 102),
    hpfFreq: channelParam(channelNumber, 103),
    lpfTypeSlope: channelParam(channelNumber, 104),
    lpfFreq: channelParam(channelNumber, 105),
    eqBand1Freq: channelParam(channelNumber, 107),
    eqBand1Gain: channelParam(channelNumber, 108),
    eqBand1Q: channelParam(channelNumber, 109),
    eqBand2Freq: channelParam(channelNumber, 111),
    eqBand2Gain: channelParam(channelNumber, 112),
    eqBand2Q: channelParam(channelNumber, 113),
    eqBand3Freq: channelParam(channelNumber, 115),
    eqBand3Gain: channelParam(channelNumber, 116),
    eqBand3Q: channelParam(channelNumber, 117),
    eqBand4Freq: channelParam(channelNumber, 119),
    eqBand4Gain: channelParam(channelNumber, 120),
    eqBand4Q: channelParam(channelNumber, 121),
  };
}

function auxProcessorParams(auxNumber: number) {
  const aux = Math.round(auxNumber);

  if (isAx32ProfileActive()) {
    const base = 2890 + (aux - 1) * 109;

    if (aux < 1 || aux > AX32_AUX_COUNT) {
      throw new Error("AUX invalido. Use valores de 1 a 14.");
    }

    const params = {
      fader: base,
      phase: base + 1,
      compEnabled: base + 6,
      compRatio: base + 7,
      compAttack: base + 8,
      compRelease: base + 9,
      compThreshold: base + 10,
      compGain: base + 11,
      eqEnabled: base + 15,
      hpfTypeSlope: base + 17,
      hpfFreq: base + 18,
      lpfTypeSlope: base + 19,
      lpfFreq: base + 20,
      eqBandBase: base + 22,
    };

    return {
      ...params,
      eqBand1Freq: params.eqBandBase,
      eqBand1Gain: params.eqBandBase + 1,
      eqBand1Q: params.eqBandBase + 2,
      eqBand2Freq: params.eqBandBase + 4,
      eqBand2Gain: params.eqBandBase + 5,
      eqBand2Q: params.eqBandBase + 6,
      eqBand3Freq: params.eqBandBase + 8,
      eqBand3Gain: params.eqBandBase + 9,
      eqBand3Q: params.eqBandBase + 10,
      eqBand4Freq: params.eqBandBase + 12,
      eqBand4Gain: params.eqBandBase + 13,
      eqBand4Q: params.eqBandBase + 14,
      eqBand5Freq: params.eqBandBase + 16,
      eqBand5Gain: params.eqBandBase + 17,
      eqBand5Q: params.eqBandBase + 18,
      eqBand6Freq: params.eqBandBase + 20,
      eqBand6Gain: params.eqBandBase + 21,
      eqBand6Q: params.eqBandBase + 22,
      eqBand7Freq: params.eqBandBase + 24,
      eqBand7Gain: params.eqBandBase + 25,
      eqBand7Q: params.eqBandBase + 26,
    };
  }

  const table: Record<number, {
    fader: number;
    phase: number;
    compEnabled: number;
    compRatio: number;
    compAttack: number;
    compRelease: number;
    compThreshold: number;
    compGain: number;
    eqEnabled: number;
    hpfTypeSlope: number;
    hpfFreq: number;
    lpfTypeSlope: number;
    lpfFreq: number;
    eqBandBase: number;
  }> = {
    1: {
      fader: 1676,
      phase: 1677,
      compEnabled: 1682,
      compRatio: 1683,
      compAttack: 1684,
      compRelease: 1685,
      compThreshold: 1686,
      compGain: 1687,
      eqEnabled: 1691,
      hpfTypeSlope: 1693,
      hpfFreq: 1694,
      lpfTypeSlope: 1695,
      lpfFreq: 1696,
      eqBandBase: 1698,
    },
    2: {
      fader: 1785,
      phase: 1786,
      compEnabled: 1791,
      compRatio: 1792,
      compAttack: 1793,
      compRelease: 1794,
      compThreshold: 1795,
      compGain: 1796,
      eqEnabled: 1800,
      hpfTypeSlope: 1802,
      hpfFreq: 1803,
      lpfTypeSlope: 1804,
      lpfFreq: 1805,
      eqBandBase: 1807,
    },
    3: {
      fader: 1894,
      phase: 1895,
      compEnabled: 1900,
      compRatio: 1901,
      compAttack: 1902,
      compRelease: 1903,
      compThreshold: 1904,
      compGain: 1905,
      eqEnabled: 1909,
      hpfTypeSlope: 1911,
      hpfFreq: 1912,
      lpfTypeSlope: 1913,
      lpfFreq: 1914,
      eqBandBase: 1916,
    },
    4: {
      fader: 2003,
      phase: 2004,
      compEnabled: 2009,
      compRatio: 2010,
      compAttack: 2011,
      compRelease: 2012,
      compThreshold: 2013,
      compGain: 2014,
      eqEnabled: 2018,
      hpfTypeSlope: 2020,
      hpfFreq: 2021,
      lpfTypeSlope: 2022,
      lpfFreq: 2023,
      eqBandBase: 2025,
    },
    5: {
      fader: 2112,
      phase: 2113,
      compEnabled: 2118,
      compRatio: 2119,
      compAttack: 2120,
      compRelease: 2121,
      compThreshold: 2122,
      compGain: 2123,
      eqEnabled: 2127,
      hpfTypeSlope: 2129,
      hpfFreq: 2130,
      lpfTypeSlope: 2131,
      lpfFreq: 2132,
      eqBandBase: 2134,
    },
    6: {
      fader: 2221,
      phase: 2222,
      compEnabled: 2227,
      compRatio: 2228,
      compAttack: 2229,
      compRelease: 2230,
      compThreshold: 2231,
      compGain: 2232,
      eqEnabled: 2236,
      hpfTypeSlope: 2238,
      hpfFreq: 2239,
      lpfTypeSlope: 2240,
      lpfFreq: 2241,
      eqBandBase: 2243,
    },
    7: {
      fader: 2330,
      phase: 2331,
      compEnabled: 2336,
      compRatio: 2337,
      compAttack: 2338,
      compRelease: 2339,
      compThreshold: 2340,
      compGain: 2341,
      eqEnabled: 2345,
      hpfTypeSlope: 2347,
      hpfFreq: 2348,
      lpfTypeSlope: 2349,
      lpfFreq: 2350,
      eqBandBase: 2352,
    },
    8: {
      fader: 2438,
      phase: 2440,
      compEnabled: 2445,
      compRatio: 2446,
      compAttack: 2447,
      compRelease: 2448,
      compThreshold: 2449,
      compGain: 2450,
      eqEnabled: 2454,
      hpfTypeSlope: 2456,
      hpfFreq: 2457,
      lpfTypeSlope: 2458,
      lpfFreq: 2459,
      eqBandBase: 2461,
    },
  };

  const params = table[aux];

  if (!params) {
    throw new Error("AUX invalido. Use valores de 1 a 8.");
  }

  return {
    ...params,
    eqBand1Freq: params.eqBandBase,
    eqBand1Gain: params.eqBandBase + 1,
    eqBand1Q: params.eqBandBase + 2,
    eqBand2Freq: params.eqBandBase + 4,
    eqBand2Gain: params.eqBandBase + 5,
    eqBand2Q: params.eqBandBase + 6,
    eqBand3Freq: params.eqBandBase + 8,
    eqBand3Gain: params.eqBandBase + 9,
    eqBand3Q: params.eqBandBase + 10,
    eqBand4Freq: params.eqBandBase + 12,
    eqBand4Gain: params.eqBandBase + 13,
    eqBand4Q: params.eqBandBase + 14,
    eqBand5Freq: params.eqBandBase + 16,
    eqBand5Gain: params.eqBandBase + 17,
    eqBand5Q: params.eqBandBase + 18,
    eqBand6Freq: params.eqBandBase + 20,
    eqBand6Gain: params.eqBandBase + 21,
    eqBand6Q: params.eqBandBase + 22,
    eqBand7Freq: params.eqBandBase + 24,
    eqBand7Gain: params.eqBandBase + 25,
    eqBand7Q: params.eqBandBase + 26,
  };
}

function filterTypeSlopeToRaw(
  filter: "hpf" | "lpf",
  type: FilterType,
  slope: FilterSlope
) {
  const offsets: Record<FilterType, number> = {
    butterworth: 0,
    bessel: 2,
    linkwitz: 4,
  };
  const base = (filter === "hpf" ? 8 : 9) + offsets[type];

  return slope === 24 ? base + 12 : base;
}

function frequencyToRawValue(freqHz: number) {
  if (freqHz === 0) return 0;
  if (freqHz < 100) {
    return 32768 + Math.round(freqHz * 10);
  }
  return Math.round(freqHz);
}

function inferHpfEnabledFromRaw(rawValue: number, currentEnabled = true) {
  void currentEnabled;
  if (rawValue === 0) return false;
  return valueToFrequency(rawValue) > DEFAULT_EQ.hpfFreq;
}

function inferLpfEnabledFromRaw(rawValue: number, currentEnabled = true) {
  void currentEnabled;
  if (rawValue === 0) return false;
  return valueToFrequency(rawValue) < DEFAULT_EQ.lpfFreq;
}

function shouldKeepCachedHpfFreq(rawValue: number | undefined) {
  return rawValue === undefined;
}

function shouldKeepCachedLpfFreq(rawValue: number | undefined) {
  return rawValue === undefined;
}

function resolveHpfFreqFromRaw(rawValue: number | undefined, fallback: number) {
  if (rawValue === undefined) return fallback;
  if (rawValue === 0) return DEFAULT_EQ.hpfFreq;
  return valueToFrequency(rawValue);
}

function resolveLpfFreqFromRaw(rawValue: number | undefined, fallback: number) {
  if (rawValue === undefined) return fallback;
  if (rawValue === 0) return DEFAULT_EQ.lpfFreq;
  return valueToFrequency(rawValue);
}

function meterByteToDb(byte: number) {
  return byte >= 128 ? byte - 256 : byte;
}

function decodeSingleMeterWord(value: number) {
  const hi = meterByteToDb(value >> 8);
  const lo = meterByteToDb(value & 255);

  const hiInRange = hi >= -90 && hi <= 20;
  const loInRange = lo >= -90 && lo <= 20;

  if (hiInRange && !loInRange) return hi;
  if (loInRange && !hiInRange) return lo;

  return lo;
}

type MasterMeterSourceId =
  | "legacy47"
  | "ax32_1947_1948"
  | "ax32_4644_4753"
  | "ax32_4645_4754"
  | "ax32_2862";

type MasterMeterCandidate = {
  id: MasterMeterSourceId;
  leftDb: number;
  rightDb: number;
  valid: boolean;
};

function decodeRawMeterDb(value: number) {
  const normalized = Math.max(0, Math.min(65535, Math.round(value)));
  const signed16 = normalized >= 32768 ? normalized - 65536 : normalized;
  if (signed16 >= -90 && signed16 <= 20) return signed16;

  return decodeSingleMeterWord(normalized);
}

function decodePackedStereoMeterWord(value: number) {
  const normalized = Math.max(0, Math.min(65535, Math.round(value)));

  // AX32 param 2862 reports 0x0000 while idle; treat it as silence.
  if (normalized === 0) {
    return {
      leftDb: -90,
      rightDb: -90,
      hiDb: -90,
      loDb: -90,
    };
  }

  const hiDb = meterByteToDb((normalized >> 8) & 255);
  const loDb = meterByteToDb(normalized & 255);

  // Keep the same orientation already used for param 47: hi=R, lo=L.
  return {
    leftDb: loDb,
    rightDb: hiDb,
    hiDb,
    loDb,
  };
}

function isValidMeterDb(db: number) {
  return db >= -90 && db <= 20;
}

function meterDbToLevel(db: number) {
  const points = [
    { db: -40, level: 0 },
    { db: -20, level: 0.22 },
    { db: -10, level: 0.42 },
    { db: -7, level: 0.52 },
    { db: -4, level: 0.62 },
    { db: -2, level: 0.72 },
    { db: 0, level: 0.8 },
    { db: 2, level: 0.86 },
    { db: 4, level: 0.91 },
    { db: 7, level: 0.96 },
    { db: 14, level: 1 },
  ];

  if (db <= -40) return 0;
  if (db >= 14) return 1;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    if (db >= current.db && db <= next.db) {
      const t = (db - current.db) / (next.db - current.db);
      return current.level + t * (next.level - current.level);
    }
  }

  return 0;
}

function clampMasterMeterForDisplay(db: number) {
  // UX rule: the master meter should only react from -30 dB upward.
  return db < -30 ? -90 : db;
}

function computeNextPeakState(
  currentDb: number,
  previousPeakDb: number,
  previousPeakUntil: number,
  now: number
) {
  const PEAK_HOLD_MS = 1500;
  const PEAK_FALL_DB_PER_UPDATE = 4;

  if (currentDb >= previousPeakDb) {
    return {
      peakDb: currentDb,
      peakLevel: meterDbToLevel(currentDb),
      peakUntil: now + PEAK_HOLD_MS,
    };
  }

  if (now <= previousPeakUntil) {
    return {
      peakDb: previousPeakDb,
      peakLevel: meterDbToLevel(previousPeakDb),
      peakUntil: previousPeakUntil,
    };
  }

  const fallingPeakDb = Math.max(currentDb, previousPeakDb - PEAK_FALL_DB_PER_UPDATE);

  return {
    peakDb: fallingPeakDb,
    peakLevel: meterDbToLevel(fallingPeakDb),
    peakUntil: previousPeakUntil,
  };
}

function App() {
  const isConstrainedDevice = useMemo(() => isConstrainedMobileDevice(), []);
  const [channelCount, setChannelCount] = useState(DEFAULT_CHANNEL_COUNT);
  const [appStage, setAppStage] = useState<AppStage>("splash");
  const [_ip, setIp] = useState(DEFAULT_MIXER_IP);
  void _ip;
  const [status, setStatus] = useState("Desconectado");
  const [connectingSource, setConnectingSource] = useState<"manual" | "discovered" | null>(null);
  const [initialConnectSyncBusy, setInitialConnectSyncBusy] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [licenseModalMandatory, setLicenseModalMandatory] = useState(false);
  const [licenseModalMode, setLicenseModalMode] = useState<"onboarding" | "settings" | "upgrade">("onboarding");
  const [pixPayment, setPixPayment] = useState<
    | { stage: "idle" }
    | { stage: "creating" }
    | { stage: "awaiting"; paymentId: string; qrCode: string; qrCodeBase64: string; expiresAt: string }
    | { stage: "confirmed" }
    | { stage: "failed"; reason: "rejected" | "cancelled" | "expired" | "network" }
  >({ stage: "idle" });
  const [installationId, setInstallationId] = useState("");
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseValidationBusy, setLicenseValidationBusy] = useState(false);
  const [licenseValidationMessage, setLicenseValidationMessage] = useState<{ kind: "idle" | "success" | "error"; text: string }>({
    kind: "idle",
    text: "",
  });
  const [isLicenseValidated, setIsLicenseValidated] = useState(false);
  const [licenseFormalState, setLicenseFormalState] = useState<LicenseFormalState>("LICENSE_NOT_FOUND");
  const [licenseNextRevalidationAt, setLicenseNextRevalidationAt] = useState<string | null>(null);
  const [licenseTrialExpiryAt, setLicenseTrialExpiryAt] = useState<string | null>(null);
  const [licenseUnlimitedActivations, setLicenseUnlimitedActivations] = useState(false);
  const [licenseLinkedUserType, setLicenseLinkedUserType] = useState<LicenseSnapshot["linkedUserType"]>(null);
  const [licenseActiveDevicesCount, setLicenseActiveDevicesCount] = useState<number | null>(null);
  const [licenseRemainingActivations, setLicenseRemainingActivations] = useState<number | null>(null);
  const [licenseDevices, setLicenseDevices] = useState<LicenseDevice[]>([]);
  const [licenseDevicesLoading, setLicenseDevicesLoading] = useState(false);
  const [licenseDeviceActionBusy, setLicenseDeviceActionBusy] = useState<string | null>(null);
  const [licenseRegisterBusy, setLicenseRegisterBusy] = useState(false);
  const [licenseRegisterWantsUpgrade] = useState(false);
  const [licenseRegisterName, setLicenseRegisterName] = useState("");
  const [licenseRegisterEmail, setLicenseRegisterEmail] = useState("");
  const [licenseRegisterPhone, setLicenseRegisterPhone] = useState("");
  const [licenseRegisterPassword, setLicenseRegisterPassword] = useState("");
  const [licenseRegisterConfirmPassword, setLicenseRegisterConfirmPassword] = useState("");
  const [licenseOnboardingView, setLicenseOnboardingView] = useState<"register" | "signin">("register");
  const [licenseSignInEmail, setLicenseSignInEmail] = useState("");
  const [licenseSignInPassword, setLicenseSignInPassword] = useState("");
  const [licenseSignInBusy, setLicenseSignInBusy] = useState(false);
  const [licenseSignInShowPassword, setLicenseSignInShowPassword] = useState(false);
  const [licenseRegisterShowPassword, setLicenseRegisterShowPassword] = useState(false);
  const [licenseRegisterShowConfirmPassword, setLicenseRegisterShowConfirmPassword] = useState(false);
  const [, setHasLicenseActivatedOnce] = useState(false);
  const [licenseRevalidationHint, setLicenseRevalidationHint] = useState("");
  const [pendingDiscoveryMixer, setPendingDiscoveryMixer] = useState<DiscoveredMixer | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [mainView, setMainView] = useState<MainView>("mixer");
  const [activeMixerTabId, setActiveMixerTabId] = useState("ch-1-8");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [patchingResetBusy, setPatchingResetBusy] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [inputPatchRoutes, setInputPatchRoutes] = useState<number[]>(() =>
    createIdentityRoutes(AX32_INPUT_PATCH_VISIBLE_SIZE)
  );
  const [outputPatchRoutes, setOutputPatchRoutes] = useState<number[]>(() =>
    createIdentityRoutes(AX32_OUTPUT_PATCH_VISIBLE_SIZE)
  );
  const [usbInputToUsbRoutes, setUsbInputToUsbRoutes] = useState<number[]>(() =>
    createIdentityRoutes(AX32_INPUT_PATCH_VISIBLE_SIZE)
  );
  const [usbReturnRoutes, setUsbReturnRoutes] = useState<number[]>(() =>
    createIdentityRoutes(AX32_INPUT_PATCH_VISIBLE_SIZE)
  );
  const [detailView, setDetailView] = useState<DetailView>(null);
  const detailViewRef = useRef<DetailView>(null);
  detailViewRef.current = detailView;
  const [customizationView, setCustomizationView] = useState<CustomizationView>(null);
  const [channels, setChannels] = useState<ChannelState[]>(
    createInitialChannelsState
  );
  // Inicialização dinâmica dos estados baseada no perfil ativo
  const initialAuxCount = channelCount >= AX32_CHANNEL_COUNT ? AX32_AUX_COUNT : AX16_24_AUX_COUNT;
  const initialFxCount = channelCount >= AX32_CHANNEL_COUNT ? AX32_FX_COUNT : AX16_24_FX_COUNT;
  const initialDcaIds = getDcaIdsForChannelCount(channelCount);
  const [auxStrips, setAuxStrips] = useState<ChannelState[]>(() =>
    createVirtualStripsState(initialAuxCount, DEFAULT_AUX_COLOR_ID)
  );
  const [fxStrips, setFxStrips] = useState<ChannelState[]>(() =>
    createVirtualStripsState(initialFxCount, DEFAULT_FX_COLOR_ID)
  );
  const [dcaNames, setDcaNames] = useState<string[]>(() =>
    initialDcaIds.map((_, index) => getDefaultDcaGroupName(index))
  );
  const [dcaGroups, setDcaGroups] = useState<DcaGroupState[]>(() => createInitialDcaState(channelCount));
  const [muteGroups, setMuteGroups] = useState<MuteGroupState[]>(() => createInitialMuteState(channelCount));
  const [auxProcessorStates, setAuxProcessorStates] = useState<ProcessorState[]>(() =>
    Array.from({ length: initialAuxCount }, () => createDefaultAuxProcessorState())
  );
  const [fxProcessorStates, setFxProcessorStates] = useState<ProcessorState[]>(() =>
    Array.from({ length: initialFxCount }, () => createDefaultProcessorState())
  );
  const [masterProcessorState, setMasterProcessorState] = useState<ProcessorState>(() =>
    createDefaultAuxProcessorState()
  );
  const [processorStates, setProcessorStates] = useState<ProcessorState[]>(
    createInitialProcessorStates
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  const [channelLinks, setChannelLinks] = useState<PairLinkState>({});
  const [auxLinks, setAuxLinks] = useState<PairLinkState>({});
  const [masterLinked, setMasterLinked] = useState(true);
  const [activeProcessorModule, setActiveProcessorModule] =
    useState<ProcessorModule>("eq");
  const [channelSendValues, setChannelSendValues] =
    useState<SendValueState>(createDefaultSendValues);
  const [sendTapPoints, setSendTapPoints] =
    useState<SendTapPointState>(createDefaultSendTapPoints);
  const [auxInputSendValues, setAuxInputSendValues] =
    useState<Record<number, ChannelInputSendValues>>({});
  const [auxInputSendTapPoints, setAuxInputSendTapPoints] =
    useState<Record<number, ChannelInputSendTapPointState>>({});
  const [fxInputSendValues, setFxInputSendValues] =
    useState<Record<number, ChannelInputSendValues>>({});
  const [fxInputSendTapPoints, setFxInputSendTapPoints] =
    useState<Record<number, ChannelInputSendTapPointState>>({});
  const [selectedAuxSendsTarget, setSelectedAuxSendsTarget] = useState(1);
  const [selectedFxSendsTarget, setSelectedFxSendsTarget] = useState(1);
  const [master, setMaster] = useState<MasterState>(createDefaultMasterState);
  const [mainMasterMeter, setMainMasterMeter] = useState<MainMasterMeterState>(
    createDefaultMainMasterMeterState
  );
  const [, setMonitorSoloMeter] = useState<MonitorSoloMeterState>(
    createDefaultMonitorSoloMeterState
  );
  const [fxPresetStates, setFxPresetStates] = useState<FxPresetState[]>(() =>
    createInitialFxPresetStates(initialFxCount)
  );
  const [sceneUiRefreshNonce, setSceneUiRefreshNonce] = useState(0);

  const clientRef = useRef<Axios16Client | null>(null);
  const meterTimerRef = useRef<number | null>(null);
  const reconnectParamsRef = useRef<{
    ip: string;
    source: "manual" | "discovered";
    profile: AxiosProtocolProfile;
    channelCount: number;
  } | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pixPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast, ToastRenderer } = useToast();
  const { snapshot: clipboardSnapshot, saveSnapshot: saveClipboardSnapshot } = useMixerClipboard();
  const activeDcaIds = getDcaIdsForChannelCount(channelCount);
  const [dcaColorIds, setDcaColorIds] = useState<number[]>(() =>
    initialDcaIds.map((id) => DCA_DEFAULT_COLOR_IDS[id])
  );
  const [activeMixerCacheIdentity, setActiveMixerCacheIdentity] = useState<string | null>(null);
  const meterBusyRef = useRef(false);
  const missingChannelMeterFramesRef = useRef(0);
  const channelMeterLastUpdateAtRef = useRef<number[]>([]);
  const masterMeterSourceRef = useRef<MasterMeterSourceId>("legacy47");
  const masterMeterSourceScoreRef = useRef<Record<MasterMeterSourceId, number>>({
    legacy47: 0,
    ax32_1947_1948: 0,
    ax32_4644_4753: 0,
    ax32_4645_4754: 0,
    ax32_2862: 0,
  });
  const remoteWsCaptureLastStatusAtRef = useRef(0);
  const remoteWsCaptureRef = useRef<
    Map<number, { value: number; at: number; changes: number }>
  >(new Map());
  const auxLinkBusyRef = useRef(false);
  const meterUpdateLastAtRef = useRef(0);
  const isChannelsDraggingRef = useRef(false);
  const mixerChannelsScrollerRef = useRef<HTMLElement | null>(null);
  const mixerChannelsScrollLeftRef = useRef(0);
  const dragScrollRafRef = useRef<number | null>(null);
  const dragMomentumRafRef = useRef<number | null>(null);
  const pendingDragScrollLeftRef = useRef<number | null>(null);
  const sendWriteTimersRef = useRef<Map<number, number>>(new Map());
  const sendWriteLastAtRef = useRef<Map<number, number>>(new Map());
  const sendWritePendingRef = useRef<Map<number, number>>(new Map());
  const faderWriteRafRef = useRef<number | null>(null);
  const pendingFaderWritesRef = useRef<Map<string, () => void>>(new Map());
  const rawParamStoreRef = useRef(new UniversalRawParamStore());
  const profileAwareRegistryRef = useRef(new ProfileAwareParameterRegistry());
  const domainSelectorsRef = useRef<DomainSelectors | null>(null);

  const domainSelectors: DomainSelectors = useMemo(() => {
    const resolver: AppParamResolver = {
      getFaderParam: (ch) => channelParam(ch, 76),
      getMuteParam: (ch) => channelParam(ch, 74),
      getSoloLeftParam: (ch) => channelParam(ch, 87),
      getSoloRightParam: (ch) => channelParam(ch, 88),
      getPanParam: (ch) => channelParam(ch, 75),

      getChannelLinkParams: () => ({
        linkMask: getChannelLinkParam(),
      }),

      getChannelProcessorParams: (ch) => processorParams(ch),

      getSendParams: (ch, sendId) => {
        try {
          return { level: sendIdToParam(ch, sendId as SendStripId) };
        } catch {
          return {};
        }
      },

      getAuxParams: (aux) => ({
        fader: auxProcessorParams(aux).fader,
        phase: auxProcessorParams(aux).phase,
        color: auxColorParam(aux),
        mute: auxMuteParam(aux),
      }),

      getAuxLinkParams: () => ({
        linkMask: getLinkMaskParam(),
      }),

      getAuxProcessorParams: (aux) => auxProcessorParams(aux),

      getFxParams: (fx) => {
        try {
          const fp = getFxStateParams(fx);
          return { fader: fp.fader, mute: fp.mute, color: fxColorParam(fx) };
        } catch {
          return {};
        }
      },

      getFxProcessorParams: (fx) => getFxProcessorParams(fx) ?? {},

      getFxPresetParams: (fx) => {
        const selectorParamId = isAx32ProfileActive() ? 5116 + fx - 1 : undefined;
        return selectorParamId !== undefined ? { selector: selectorParamId } : {};
      },

      getMasterParams: () => {
        const mp = getMasterParams();
        return {
          leftFader: mp.leftFader,
          leftMute: mp.leftMute,
          rightFader: mp.rightFader,
          rightMute: mp.rightMute,
        };
      },

      getMasterLinkParams: () => ({
        linkMask: getLinkMaskParam(),
      }),

      getMasterProcessorParams: (side) => masterProcessorParams(side),

      getDcaParams: (id) => ({
        onOff: getDcaOnOffParam(id as DcaGroupId),
        fader: getDcaFaderParam(id as DcaGroupId),
      }),

      getMuteGroupParams: (id) => ({
        active: getMuteGroupActiveParam(id as MuteGroupId),
      }),
    };

    const decoder: ChannelValueDecoder = {
      faderRawToDb: valueToFaderDb,
      faderDbToPosition: dbToFaderPosition,
      muteRawToBoolean: (v) => valueToMute(v),
      soloRawToBoolean: (v) => v > 0,
      panRawToValue: valueToPan,
      auxLinkRawToBoolean: (pairOdd, maskRaw) =>
        maskRaw !== undefined ? isAuxLinked(maskRaw, pairOdd) : null,
      masterLinkRawToBoolean: (maskRaw) =>
        maskRaw !== undefined ? isMasterLinked(maskRaw) : null,
    };

    return createDomainSelectors(rawParamStoreRef.current, resolver, decoder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelCount, isConnected]);
  domainSelectorsRef.current = domainSelectors;

  const rawParamDebugLastPublishAtRef = useRef(0);
  const channelFaderUiCommitTimerRef = useRef<number | null>(null);
  const channelFaderUiPendingRef = useRef<Map<number, { position: number; db: number }>>(
    new Map()
  );
  const channelFaderUiLastCommitAtRef = useRef(0);
  const recentLocalParamWritesRef = useRef<Map<number, LocalParamWrite>>(new Map());
  const localParamWriteUnsubscribeRef = useRef<(() => void) | null>(null);
  const remoteParamReadUnsubscribeRef = useRef<(() => void) | null>(null);
  const fastControlSyncInFlightRef = useRef(false);
  const usbInputToUsbPatchMapRef = useRef<Map<number, number>>(new Map());
  const usbReturnPatchMapRef = useRef<Map<number, number>>(new Map());
  const usbReturnOutputPatchMapRef = useRef<Map<number, number>>(new Map());
  const ax32OutputPatchMapRef = useRef<Map<number, number>>(new Map());
  const usbReturnPatchSyncInFlightRef = useRef(false);
  const recordOutRxDebounceTimerRef = useRef<number | null>(null);
  const backgroundLicenseRevalidationBusyRef = useRef(false);
  const lastBackgroundRevalidationAtRef = useRef(0);
  const strictStartupValidationDoneRef = useRef(false);
  const lastAppliedMuteGroupsSignatureRef = useRef("");
  const channelLinkTransitionUntilRef = useRef<Map<string, number>>(new Map());
  const auxLinkTransitionUntilRef = useRef<Map<string, number>>(new Map());
  const masterLinkTransitionUntilRef = useRef(0);
  const sceneRefreshQueueRef = useRef<Promise<void>>(Promise.resolve());
  const dragScrollStateRef = useRef<DragScrollState>({
    pointerId: null,
    pointerType: "",
    scrollerElement: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startAtMs: 0,
    lastClientX: 0,
    lastMoveAtMs: 0,
    scrollVelocityPxPerMs: 0,
    dragging: false,
    suppressClick: false,
  });
  const [isChannelsDragging, setIsChannelsDragging] = useState(false);
  const {
    mixers: discoveredMixers,
    knownMixers: knownDiscoveryMixers,
    hasSearched: mixerDiscoveryHasSearched,
    isLoading: isDiscoveringMixers,
    error: discoveryError,
    refresh: refreshMixerDiscovery,
  } = useMixerDiscovery(true);
  const assignableMemberIds = useMemo(
    () => buildAssignableMemberIds(channelCount),
    [channelCount]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppStage((current) => (current === "splash" ? "device-selection" : current));
    }, SPLASH_MIN_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  // Reconecta automaticamente quando o app volta ao foreground (iOS background → foreground)
  useEffect(() => {
    if (appStage !== "mixer") return;

    function handleReturnToForeground() {
      if (document.visibilityState !== "visible") return;
      if (!isConnected && reconnectParamsRef.current && !reconnectTimerRef.current) {
        setStatus("Reconectando...");
        scheduleAutoReconnect(500);
      }
    }

    document.addEventListener("visibilitychange", handleReturnToForeground);
    window.addEventListener("focus", handleReturnToForeground);

    return () => {
      document.removeEventListener("visibilitychange", handleReturnToForeground);
      window.removeEventListener("focus", handleReturnToForeground);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appStage, isConnected]);

  useEffect(() => {
    const storedInstallationId = localStorage.getItem(INSTALLATION_ID_STORAGE_KEY);
    const storedLicenseKey = localStorage.getItem(LICENSE_KEY_STORAGE_KEY);
    const nextInstallationId = storedInstallationId && storedInstallationId.trim().length > 0
      ? storedInstallationId
      : generateInstallationId();

    if (!storedInstallationId) {
      localStorage.setItem(INSTALLATION_ID_STORAGE_KEY, nextInstallationId);
    }

    setInstallationId(nextInstallationId);
    if (storedLicenseKey && storedLicenseKey.trim().length > 0) {
      setLicenseKeyInput(storedLicenseKey);
    }
    const activatedOnce = localStorage.getItem(LICENSE_ACTIVATED_ONCE_STORAGE_KEY) === "1";
    const cached = readCachedLicenseStatus();
    const runtimeCache = readRuntimeLicenseCache();
    const hasValidCache = isCacheValidForInstallation(cached, nextInstallationId);
    const cacheExpired = isLicenseCacheExpired(cached, nextInstallationId);
    const licenseExpiredByDate = isLicenseExpiredByDate(cached?.expiryDate ?? null);
    const bootDecision = resolveBootDecision(runtimeCache, Date.now(), LICENSE_REVALIDATE_WARNING_DAYS);
    const runtimeState = bootDecision.formalState;
    const runtimeBlocked = bootDecision.isBlocked;
    const nextValidated =
      (hasValidCache && !cacheExpired && !licenseExpiredByDate && !runtimeBlocked) ||
      bootDecision.isValidated;

    if (storedLicenseKey && !activatedOnce) {
      localStorage.setItem(LICENSE_ACTIVATED_ONCE_STORAGE_KEY, "1");
    }

    if (LICENSE_STRICT_SERVER_VALIDATION) {
      localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
    }

    if (cached?.installationId === nextInstallationId) {
      // License cached state verified
    }

    setHasLicenseActivatedOnce(activatedOnce || Boolean(storedLicenseKey));
    setIsLicenseValidated(nextValidated);
    setLicenseFormalState(runtimeState);
    setLicenseTrialExpiryAt(runtimeCache?.trialExpiryAt ?? null);
    setLicenseNextRevalidationAt(runtimeCache?.nextRevalidationAt ?? null);
    if (hasValidCache) {
      const expiryHint = buildLicenseExpiryHint(cached, nextInstallationId);
      const revalidationHint = buildLicenseRevalidationHint(
        cached,
        nextInstallationId,
        typeof navigator !== "undefined" ? navigator.onLine : true
      );
      setLicenseRevalidationHint(expiryHint || revalidationHint);
    } else {
      setLicenseRevalidationHint("");
    }
  }, []);

  useEffect(() => {
    if (!LICENSE_STRICT_SERVER_VALIDATION) return;
    if (!installationId || strictStartupValidationDoneRef.current) return;

    const storedLicenseKey = localStorage.getItem(LICENSE_KEY_STORAGE_KEY)?.trim() ?? "";
    const runtimeCache = readRuntimeLicenseCache();
    const bootDecision = resolveBootDecision(runtimeCache, Date.now(), LICENSE_REVALIDATE_WARNING_DAYS);
    const cached = readCachedLicenseStatus();
    const hasValidCache = isCacheValidForInstallation(cached, installationId);
    const cacheExpired = isLicenseCacheExpired(cached, installationId);
    const licenseExpiredByDate = isLicenseExpiredByDate(cached?.expiryDate ?? null);

    if (!storedLicenseKey && runtimeCache && bootDecision.isValidated && runtimeCache.licenseType === "trial") {
      setIsLicenseValidated(true);
      setLicenseFormalState(bootDecision.formalState);
      strictStartupValidationDoneRef.current = true;
      return;
    }

    if (!storedLicenseKey) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Informe e valide a chave para liberar este dispositivo.",
      });
      setLicenseModalMandatory(true);
      setLicenseModalMode("onboarding");
      setLicenseModalOpen(true);
      strictStartupValidationDoneRef.current = true;
      return;
    }

    if (hasValidCache && !cacheExpired && !licenseExpiredByDate) {
      setIsLicenseValidated(true);
      const expiryHint = buildLicenseExpiryHint(cached, installationId);
      const revalidationHint = buildLicenseRevalidationHint(cached, installationId, isOnline);
      setLicenseRevalidationHint(expiryHint || revalidationHint);
      strictStartupValidationDoneRef.current = true;

      if (isOnline) {
        void runBackgroundLicenseRevalidation(true, false);
      }
      return;
    }

    if (!isOnline) {
      setLicenseValidationMessage({
        kind: "error",
        text: hasValidCache && licenseExpiredByDate
          ? "Período de teste expirado. Conecte-se e entre em contato para adquirir a licença."
          : hasValidCache && cacheExpired
            ? "Revalidação da licença expirou. Conecte-se à internet para continuar."
            : "Conecte-se à internet para validar a licença deste dispositivo.",
      });
      setLicenseModalMandatory(true);
      setLicenseModalMode("onboarding");
      setLicenseModalOpen(true);
      return;
    }

    strictStartupValidationDoneRef.current = true;
    void runBackgroundLicenseRevalidation(true, true);
  }, [installationId, isOnline]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isLicenseValidated || !installationId) {
      setLicenseRevalidationHint("");
      return;
    }

    const cached = readCachedLicenseStatus();
    const runtimeCache = readRuntimeLicenseCache();
    const expiryHint = buildLicenseExpiryHint(cached, installationId);
    const revalidationHint = buildLicenseRevalidationHint(cached, installationId, isOnline);
    if (runtimeCache?.licenseType === "purchased" && runtimeCache.nextRevalidationAt) {
      const dueMs = Date.parse(runtimeCache.nextRevalidationAt);
      if (!Number.isNaN(dueMs)) {
        const days = Math.ceil((dueMs - Date.now()) / (24 * 60 * 60 * 1000));
        if (days <= LICENSE_REVALIDATE_WARNING_DAYS && days >= 0) {
          setLicenseRevalidationHint(
            days === 0 ? "Revalidação da licença vence hoje." : `Revalidação da licença em ${days} dia(s).`
          );
          return;
        }
      }
    }

    setLicenseRevalidationHint(expiryHint || revalidationHint);
  }, [installationId, isLicenseValidated, isOnline]);

  useEffect(() => {
    if (!installationId) return;

    const checkExpiryFromCache = () => {
      const runtimeCache = readRuntimeLicenseCache();
      const bootDecision = resolveBootDecision(runtimeCache, Date.now(), LICENSE_REVALIDATE_WARNING_DAYS);
      if (runtimeCache && bootDecision.isBlocked) {
        localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
        setIsLicenseValidated(false);
        setLicenseFormalState(bootDecision.formalState);
        setLicenseRevalidationHint("");
        enforceLicenseBlock("Licença expirada/revalidação vencida. Revalide para continuar.");
        return;
      }

      const cached = readCachedLicenseStatus();
      if (!cached || !isCacheValidForInstallation(cached, installationId)) return;
      if (!isLicenseExpiredByDate(cached.expiryDate)) return;

      localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
      localStorage.removeItem(LICENSE_STATUS_STORAGE_KEY);
      setIsLicenseValidated(false);
      setLicenseRevalidationHint("");
      setLicenseValidationMessage({
        kind: "error",
        text: "Período de teste expirado. Entre em contato para adquirir a licença.",
      });
      enforceLicenseBlock("Período de teste expirado. Entre em contato para adquirir a licença.", "upgrade");
    };

    checkExpiryFromCache();
    const timer = window.setInterval(checkExpiryFromCache, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [installationId]);

  useEffect(() => {
    if (!isOnline || !installationId) return;

    const storedLicenseKey = localStorage.getItem(LICENSE_KEY_STORAGE_KEY)?.trim() ?? "";
    if (!storedLicenseKey) return;

    void runBackgroundLicenseRevalidation();
  }, [isOnline, installationId]);

  useEffect(() => {
    if (!licenseModalOpen || licenseModalMode !== "settings") return;
    void handleRefreshLicenseStatus();
  }, [licenseModalMode, licenseModalOpen]);

  useEffect(() => {
    if (!licenseModalOpen || licenseModalMode !== "onboarding") return;
    setLicenseOnboardingView("register");
    setLicenseSignInPassword("");
    setLicenseValidationMessage({ kind: "idle", text: "" });
  }, [licenseModalMode, licenseModalOpen]);

  useEffect(() => {
    if (licenseModalOpen) return;
    stopPixPolling();
    setPixPayment({ stage: "idle" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseModalOpen]);

  // On boot: if still on trial and there's a pending Pix payment_id, check if it was approved.
  useEffect(() => {
    if (!isOnline || !installationId) return;
    if (licenseFormalState !== "TRIAL_ACTIVE" && licenseFormalState !== "TRIAL_EXPIRED") return;

    const pendingPaymentId = localStorage.getItem("ax_pending_pix_payment_id");
    if (!pendingPaymentId) return;

    void apiCheckPixStatus(
      "https://www.axcontrol.com.br",
      PIX_STATUS_PATH,
      pendingPaymentId,
      installationId,
      AX_APP_KEY
    ).then((result) => {
      if (result.status === "approved" && result.license_key) {
        void handlePixPaymentApproved(result.license_key);
      } else if (result.status === "rejected" || result.status === "cancelled") {
        localStorage.removeItem("ax_pending_pix_payment_id");
      }
    }).catch(() => { /* network unavailable — will retry on next boot */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, installationId, licenseFormalState]);

  useEffect(() => {
    if (!isOnline || !installationId) return;

    const storedLicenseKey = localStorage.getItem(LICENSE_KEY_STORAGE_KEY)?.trim() ?? "";
    if (!storedLicenseKey) return;

    const timer = window.setInterval(() => {
      void runBackgroundLicenseRevalidation();
    }, LICENSE_BACKGROUND_RECHECK_COOLDOWN_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isOnline, installationId]);

  useEffect(() => {
    isChannelsDraggingRef.current = isChannelsDragging;
  }, [isChannelsDragging]);

  useEffect(() => {
    return () => {
      cancelPendingDragScrollFrame();
      cancelDragMomentumFrame();
      cancelScheduledFaderWrites();
      clearScheduledChannelFaderUiUpdates();
      clearScheduledSendWrites();
      clearLocalParamWriteTracking();
    };
  }, []);

  useEffect(() => {
    const profileModel = resolveActiveRawProfileModel();
    if (profileModel === "unknown") {
      return;
    }

    const descriptors = buildKnownParamDescriptorsForActiveProfile();
    profileAwareRegistryRef.current.registerProfileDescriptors(profileModel, descriptors);
  }, [channelCount, isConnected]);

  function scheduleDragScrollLeft(scrollerElement: HTMLElement, scrollLeft: number) {
    pendingDragScrollLeftRef.current = scrollLeft;

    if (dragScrollRafRef.current !== null) {
      return;
    }

    dragScrollRafRef.current = requestAnimationFrame(() => {
      dragScrollRafRef.current = null;
      const nextScrollLeft = pendingDragScrollLeftRef.current;
      pendingDragScrollLeftRef.current = null;
      if (nextScrollLeft === null) return;

      scrollerElement.scrollLeft = nextScrollLeft;
    });
  }

  function attachMixerChannelsScroller(element: HTMLElement | null) {
    mixerChannelsScrollerRef.current = element;

    if (!element) return;

    const targetScrollLeft = Math.max(0, mixerChannelsScrollLeftRef.current);
    if (element.scrollLeft !== targetScrollLeft) {
      element.scrollLeft = targetScrollLeft;
    }
  }

  function handleMixerChannelsScroll(event: React.UIEvent<HTMLElement>) {
    mixerChannelsScrollLeftRef.current = event.currentTarget.scrollLeft;
  }

  function cancelPendingDragScrollFrame() {
    if (dragScrollRafRef.current !== null) {
      cancelAnimationFrame(dragScrollRafRef.current);
      dragScrollRafRef.current = null;
    }

    pendingDragScrollLeftRef.current = null;
  }

  function cancelDragMomentumFrame() {
    if (dragMomentumRafRef.current !== null) {
      cancelAnimationFrame(dragMomentumRafRef.current);
      dragMomentumRafRef.current = null;
    }
  }

  function runChannelsMomentumScroll(scrollerElement: HTMLElement, initialVelocityPxPerMs: number) {
    const MIN_ABS_VELOCITY = 0.02;
    const DECAY_PER_FRAME = 0.92;
    let velocity = initialVelocityPxPerMs;
    let lastAt = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(1, Math.min(34, now - lastAt));
      lastAt = now;

      const maxScrollLeft = Math.max(0, scrollerElement.scrollWidth - scrollerElement.clientWidth);
      const nextScrollLeft = Math.min(
        maxScrollLeft,
        Math.max(0, scrollerElement.scrollLeft + velocity * dt)
      );
      const reachedBoundary = nextScrollLeft <= 0 || nextScrollLeft >= maxScrollLeft;

      scrollerElement.scrollLeft = nextScrollLeft;
      mixerChannelsScrollLeftRef.current = nextScrollLeft;

      velocity *= Math.pow(DECAY_PER_FRAME, dt / 16.67);

      if (Math.abs(velocity) < MIN_ABS_VELOCITY || reachedBoundary) {
        cancelDragMomentumFrame();
        setIsChannelsDragging(false);
        return;
      }

      dragMomentumRafRef.current = requestAnimationFrame(tick);
    };

    cancelDragMomentumFrame();
    setIsChannelsDragging(true);
    dragMomentumRafRef.current = requestAnimationFrame(tick);
  }

  function resetDragScrollState() {
    cancelPendingDragScrollFrame();
    dragScrollStateRef.current.pointerId = null;
    dragScrollStateRef.current.pointerType = "";
    dragScrollStateRef.current.scrollerElement = null;
    dragScrollStateRef.current.startX = 0;
    dragScrollStateRef.current.startY = 0;
    dragScrollStateRef.current.startScrollLeft = 0;
    dragScrollStateRef.current.startAtMs = 0;
    dragScrollStateRef.current.lastClientX = 0;
    dragScrollStateRef.current.lastMoveAtMs = 0;
    dragScrollStateRef.current.scrollVelocityPxPerMs = 0;
    dragScrollStateRef.current.dragging = false;
    setIsChannelsDragging(false);
  }

  function handleChannelsPointerDown(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (shouldPrioritizeLocalControl(event.target)) return;

    cancelDragMomentumFrame();

    dragScrollStateRef.current.pointerId = event.pointerId;
    dragScrollStateRef.current.pointerType =
      event.pointerType === "mouse" ||
      event.pointerType === "touch" ||
      event.pointerType === "pen"
        ? event.pointerType
        : "touch";
    dragScrollStateRef.current.startX = event.clientX;
    dragScrollStateRef.current.startY = event.clientY;
    dragScrollStateRef.current.scrollerElement = event.currentTarget;
    dragScrollStateRef.current.startScrollLeft = event.currentTarget.scrollLeft;
    dragScrollStateRef.current.startAtMs = performance.now();
    dragScrollStateRef.current.lastClientX = event.clientX;
    dragScrollStateRef.current.lastMoveAtMs = performance.now();
    dragScrollStateRef.current.scrollVelocityPxPerMs = 0;
    dragScrollStateRef.current.dragging = false;
    dragScrollStateRef.current.suppressClick = false;
  }

  function handleChannelsPointerMove(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (dragScrollStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragScrollStateRef.current.startX;
    const deltaY = event.clientY - dragScrollStateRef.current.startY;
    const now = performance.now();

    if (!dragScrollStateRef.current.dragging) {
      const profile = getDragScrollProfile(dragScrollStateRef.current.pointerType);
      const holdElapsed =
        now - dragScrollStateRef.current.startAtMs >= profile.holdMs;
      const passedThreshold = Math.abs(deltaX) >= profile.thresholdPx;
      const horizontalIntent =
        Math.abs(deltaX) > Math.abs(deltaY) * profile.horizontalBias;

      if (!(holdElapsed && passedThreshold && horizontalIntent)) return;

      dragScrollStateRef.current.dragging = true;
      dragScrollStateRef.current.suppressClick = true;
      setIsChannelsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    const scrollerElement =
      dragScrollStateRef.current.scrollerElement ?? event.currentTarget;
    scheduleDragScrollLeft(
      scrollerElement,
      dragScrollStateRef.current.startScrollLeft - deltaX
    );

    const dt = Math.max(1, now - dragScrollStateRef.current.lastMoveAtMs);
    const pointerDeltaX = event.clientX - dragScrollStateRef.current.lastClientX;
    const instantScrollVelocity = -pointerDeltaX / dt;
    dragScrollStateRef.current.scrollVelocityPxPerMs =
      dragScrollStateRef.current.scrollVelocityPxPerMs * 0.72 +
      instantScrollVelocity * 0.28;
    dragScrollStateRef.current.lastClientX = event.clientX;
    dragScrollStateRef.current.lastMoveAtMs = now;
  }

  function handleChannelsPointerUp(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (dragScrollStateRef.current.pointerId !== event.pointerId) return;

    const wasDragging = dragScrollStateRef.current.dragging;
    const flingVelocity = dragScrollStateRef.current.scrollVelocityPxPerMs;
    const scrollerElement =
      dragScrollStateRef.current.scrollerElement ?? event.currentTarget;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetDragScrollState();

    if (wasDragging && Math.abs(flingVelocity) >= 0.025) {
      runChannelsMomentumScroll(scrollerElement, flingVelocity);
    }
  }

  function handleChannelsPointerCancel(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (dragScrollStateRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetDragScrollState();
  }

  function handleChannelsClickCapture(
    event: React.MouseEvent<HTMLElement>
  ) {
    if (!dragScrollStateRef.current.suppressClick) return;

    event.preventDefault();
    event.stopPropagation();
    dragScrollStateRef.current.suppressClick = false;
  }

  // Keep handlers defined for upcoming drag-scroll reattachment in mixer tabs layout.
  void attachMixerChannelsScroller;
  void handleMixerChannelsScroll;
  void handleChannelsPointerDown;
  void handleChannelsPointerMove;
  void handleChannelsPointerUp;
  void handleChannelsPointerCancel;
  void handleChannelsClickCapture;

  function updateChannelState(
    channelNumber: number,
    patch: Partial<ChannelState>
  ) {
    setChannels((current) => {
      const targetIndex = channelNumber - 1;
      const currentChannel = current[targetIndex];
      if (!currentChannel) return current;

      const changed = Object.entries(patch).some(([key, value]) =>
        currentChannel[key as keyof ChannelState] !== value
      );
      if (!changed) return current;

      const next = [...current];
      next[targetIndex] = { ...currentChannel, ...patch };
      return next;
    });
  }

  function updateMasterState(patch: Partial<MasterState>) {
    setMaster((current) => ({ ...current, ...patch }));
  }

  function updateAuxStripState(index: number, patch: Partial<ChannelState>) {
    const normalizedPatch =
      patch.colorId === undefined
        ? patch
        : { ...patch, colorId: normalizeAuxColorId(patch.colorId) };

    setAuxStrips((current) => {
      const targetIndex = index - 1;
      const currentStrip = current[targetIndex];
      if (!currentStrip) return current;

      const changed = Object.entries(normalizedPatch).some(([key, value]) =>
        currentStrip[key as keyof ChannelState] !== value
      );
      if (!changed) return current;

      const next = [...current];
      next[targetIndex] = { ...currentStrip, ...normalizedPatch };
      return next;
    });
  }

  function updateFxStripState(index: number, patch: Partial<ChannelState>) {
    const normalizedPatch =
      patch.colorId === undefined
        ? patch
        : { ...patch, colorId: normalizeFxColorId(patch.colorId) };

    setFxStrips((current) => {
      const targetIndex = index - 1;
      const currentStrip = current[targetIndex];
      if (!currentStrip) return current;

      const changed = Object.entries(normalizedPatch).some(([key, value]) =>
        currentStrip[key as keyof ChannelState] !== value
      );
      if (!changed) return current;

      const next = [...current];
      next[targetIndex] = { ...currentStrip, ...normalizedPatch };
      return next;
    });
  }

  function commitPendingChannelFaderUiUpdates() {
    if (channelFaderUiPendingRef.current.size === 0) {
      return;
    }

    const pending = new Map(channelFaderUiPendingRef.current);
    channelFaderUiPendingRef.current.clear();
    channelFaderUiLastCommitAtRef.current = Date.now();

    setChannels((current) => {
      let changed = false;
      const next = [...current];

      pending.forEach(({ position, db }, target) => {
        const targetIndex = target - 1;
        const currentChannel = current[targetIndex];
        if (!currentChannel) return;
        if (currentChannel.faderPosition === position && currentChannel.faderDb === db) return;

        changed = true;
        next[targetIndex] = {
          ...currentChannel,
          faderPosition: position,
          faderDb: db,
        };
      });

      return changed ? next : current;
    });
  }

  function clearScheduledChannelFaderUiUpdates() {
    if (channelFaderUiCommitTimerRef.current !== null) {
      window.clearTimeout(channelFaderUiCommitTimerRef.current);
      channelFaderUiCommitTimerRef.current = null;
    }

    channelFaderUiPendingRef.current.clear();
  }

  function scheduleChannelFaderUiUpdates(targets: number[], position: number, db: number) {
    targets.forEach((target) => {
      channelFaderUiPendingRef.current.set(target, { position, db });
    });

    const elapsed = Date.now() - channelFaderUiLastCommitAtRef.current;
    if (elapsed >= CHANNEL_FADER_UI_COMMIT_INTERVAL_MS) {
      if (channelFaderUiCommitTimerRef.current !== null) {
        window.clearTimeout(channelFaderUiCommitTimerRef.current);
        channelFaderUiCommitTimerRef.current = null;
      }
      commitPendingChannelFaderUiUpdates();
      return;
    }

    if (channelFaderUiCommitTimerRef.current !== null) {
      return;
    }

    const waitMs = Math.max(0, CHANNEL_FADER_UI_COMMIT_INTERVAL_MS - elapsed);
    channelFaderUiCommitTimerRef.current = window.setTimeout(() => {
      channelFaderUiCommitTimerRef.current = null;
      commitPendingChannelFaderUiUpdates();
    }, waitMs);
  }

  function updateAuxFaderStates(targets: number[], position: number, db: number) {
    setAuxStrips((current) => {
      let changed = false;
      const next = [...current];

      targets.forEach((target) => {
        const targetIndex = target - 1;
        const currentStrip = current[targetIndex];
        if (!currentStrip) return;
        if (currentStrip.faderPosition === position && currentStrip.faderDb === db) return;

        changed = true;
        next[targetIndex] = {
          ...currentStrip,
          faderPosition: position,
          faderDb: db,
        };
      });

      return changed ? next : current;
    });
  }

  function updateFxFaderState(index: number, position: number, db: number) {
    setFxStrips((current) => {
      const targetIndex = index - 1;
      const currentStrip = current[targetIndex];
      if (!currentStrip) return current;
      if (currentStrip.faderPosition === position && currentStrip.faderDb === db) return current;

      const next = [...current];
      next[targetIndex] = {
        ...currentStrip,
        faderPosition: position,
        faderDb: db,
      };
      return next;
    });
  }

  function updateDcaGroupState(id: DcaGroupId, patch: Partial<DcaGroupState>) {
    setDcaGroups((current) =>
      current.map((group, index) =>
        index === id - 1 ? { ...group, ...patch } : group
      )
    );
  }

  function updateMuteGroupState(id: MuteGroupId, patch: Partial<MuteGroupState>) {
    setMuteGroups((current) => {
      const next = current.map((group, index) =>
        index === id - 1 ? { ...group, ...patch } : group
      );
      applyManagedMutes(next);
      return next;
    });
  }

  function expandMuteGroupManagedMembers(members: Iterable<GroupMember>): AssignableMemberId[] {
    const expanded = new Set<AssignableMemberId>();

    for (const member of members) {
      if (!assignableMemberIds.includes(member as AssignableMemberId)) continue;

      if (member.startsWith("CH_")) {
        const channel = Number(member.slice(3));
        if (Number.isFinite(channel) && channel >= 1 && channel <= channelCount) {
          for (const target of getLinkedChannelTargets(channel)) {
            expanded.add(`CH_${target}` as AssignableMemberId);
          }
        }
        continue;
      }

      if (member.startsWith("AUX_")) {
        const aux = Number(member.slice(4));
        if (Number.isFinite(aux) && aux >= 1 && aux <= getAuxBusCount()) {
          for (const target of getLinkedAuxTargets(aux)) {
            expanded.add(`AUX_${target}` as AssignableMemberId);
          }
        }
        continue;
      }

      if ((member === "MASTER_L" || member === "MASTER_R") && masterLinked) {
        expanded.add("MASTER_L");
        expanded.add("MASTER_R");
        continue;
      }

      expanded.add(member as AssignableMemberId);
    }

    return assignableMemberIds.filter((member) => expanded.has(member));
  }

  async function syncAllGroupStates(options?: { ignoreConnectionState?: boolean; suppressManagedMuteWrites?: boolean }) {
    const client = clientRef.current;
    if (!client || (!isConnected && !options?.ignoreConnectionState)) {
      lastAppliedMuteGroupsSignatureRef.current = "";
      return;
    }

    const dcaIdsSnapshot = getDcaIdsForActiveProfile();
    const muteIdsSnapshot = getMuteIdsForActiveProfile();

    const params = [
      ...dcaIdsSnapshot.flatMap((id) => [
        getDcaOnOffParam(id),
        getDcaFaderParam(id),
        ...getDcaMemberParams(id),
      ]),
      ...muteIdsSnapshot.flatMap((id) => [
        getMuteGroupActiveParam(id),
        ...getMuteGroupMemberParams(id),
      ]),
    ];
    const values = new Map<number, number>();
    const chunkSize = isAx32ProfileActive() ? 20 : 44;

    for (let offset = 0; offset < params.length; offset += chunkSize) {
      const chunk = params.slice(offset, offset + chunkSize);

      if (chunk.length === 0) continue;

      const response = await client.readParams(chunk, 1200);
      response.forEach((item) => {
        values.set(item.param, item.value);
      });
    }

    if (values.size === 0) {
      throw new Error("Nao foi possivel ler grupos da mesa.");
    }

    const dcaCoreParams = dcaIdsSnapshot.flatMap((id) => [
      getDcaOnOffParam(id),
      getDcaFaderParam(id),
    ]);
    const dcaCoreCoverage = dcaCoreParams.reduce((count, param) => count + (values.has(param) ? 1 : 0), 0);

    if (dcaCoreCoverage === 0) {
      throw new Error("Mesa nao retornou parametros de DCA no sync de grupos.");
    }

    setDcaGroups((current) =>
      dcaIdsSnapshot.map((id, index) => {
        const group = current[index] ?? {
          enabled: true,
          faderPosition: dcaValueToPosition(1200),
          members: [] as GroupMember[],
        };
        const rawEnabled = values.get(getDcaOnOffParam(id));
        const rawFader = values.get(getDcaFaderParam(id));
        const words = getDcaMemberParams(id).map((param) => values.get(param));
        const nextMembers = words.every((word) => word !== undefined)
          ? decodeGroupMembers(words as [number, number, number, number]).filter(
              (member): member is AssignableMemberId => assignableMemberIds.includes(member as AssignableMemberId)
            )
          : group.members;

        return {
          ...group,
          enabled: rawEnabled === undefined ? group.enabled : rawEnabled > 0,
          faderPosition: rawFader === undefined ? group.faderPosition : dcaValueToPosition(rawFader),
          members: nextMembers,
        };
      })
    );

    setMuteGroups((current) => {
      const next = muteIdsSnapshot.map((id, index) => {
        const group = current[index] ?? { active: false, members: [] as GroupMember[] };
        const rawActive = values.get(getMuteGroupActiveParam(id));
        const words = getMuteGroupMemberParams(id).map((param) => values.get(param));
        const nextMembers = words.every((word) => word !== undefined)
          ? decodeGroupMembers(words as [number, number, number, number]).filter(
              (member): member is AssignableMemberId => assignableMemberIds.includes(member as AssignableMemberId)
            )
          : group.members;

        return {
          ...group,
          active: rawActive === undefined ? group.active : rawActive > 0,
          members: nextMembers,
        };
      });

      if (!options?.suppressManagedMuteWrites) {
        applyManagedMutes(next, options);
      }
      return next;
    });
  }

  function applyManagedMutes(nextGroups: MuteGroupState[], options?: { ignoreConnectionState?: boolean }) {
    const client = clientRef.current;
    if (!client || (!isConnected && !options?.ignoreConnectionState)) {
      lastAppliedMuteGroupsSignatureRef.current = "";
      return;
    }

    const managedMembersSet = new Set<AssignableMemberId>();
    const activeMembersSet = new Set<AssignableMemberId>();

    for (const group of nextGroups) {
      const expandedMembers = expandMuteGroupManagedMembers(group.members);

      for (const member of expandedMembers) {
        managedMembersSet.add(member);
        if (group.active) {
          activeMembersSet.add(member);
        }
      }
    }

    const managedOrdered = assignableMemberIds.filter((member) => managedMembersSet.has(member));
    const activeOrdered = assignableMemberIds.filter((member) => activeMembersSet.has(member));
    const signature = `${managedOrdered.join(",")}|${activeOrdered.join(",")}`;

    if (signature === lastAppliedMuteGroupsSignatureRef.current) {
      return;
    }

    for (const member of managedOrdered) {
      const shouldMute = activeMembersSet.has(member);
      applyMuteToMember(client, member, shouldMute);
      handleMuteGroupsMemberMuteApplied(member, shouldMute);
    }

    lastAppliedMuteGroupsSignatureRef.current = signature;
  }

  useEffect(() => {
    const client = clientRef.current;
    const groupsViewActive = mainView === "dcaGroups" || mainView === "muteGroups";

    if (!client || !isConnected || isSyncing || !groupsViewActive) {
      lastAppliedMuteGroupsSignatureRef.current = "";
      return;
    }

    let _disposed = false;
    void _disposed;

    const syncGroupStates = async () => {
      try {
        await syncAllGroupStates();
      } catch {
        // Ignore transient read failures.
      }
    };

    syncGroupStates();
    const timer = window.setInterval(syncGroupStates, 2500);

    return () => {
      _disposed = true;
      window.clearInterval(timer);
    };
  }, [assignableMemberIds, isConnected, isSyncing, mainView]);

  function handleDcaGroupToggleEnabled(id: DcaGroupId) {
    const group = dcaGroups[id - 1];
    if (!group) return;

    const nextEnabled = !group.enabled;

    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      sendGroupMessages(client, buildSetDcaEnabledMessages(id, nextEnabled));
    } catch (error) {
      console.error("[DCA] toggle enabled error:", error);
      return;
    }

    updateDcaGroupState(id, { enabled: nextEnabled });
  }

  function handleDcaGroupFaderChange(id: DcaGroupId, position: number) {
    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      const message = buildSetDcaFaderMessage(id, dcaPositionToValue(position));
      scheduleFaderWrite(`dca:${id}`, () => {
        clientRef.current?.sendParam(message.param, message.value);
      });
    } catch (error) {
      console.error("[DCA] fader error:", error);
      return;
    }

    updateDcaGroupState(id, { faderPosition: position });
  }

  function normalizeDcaMembersForLinkedChannels(
    currentMembers: GroupMember[],
    proposedMembers: GroupMember[]
  ): GroupMember[] {
    const currentSet = new Set(currentMembers);
    const nextMembers = new Set(proposedMembers);

    for (let odd = 1; odd < channelCount; odd += 2) {
      const even = odd + 1;
      const key = pairKey(odd, even);
      if (!channelLinks[key]) continue;

      const oddMember = `CH_${odd}` as GroupMember;
      const evenMember = `CH_${even}` as GroupMember;
      const prevBothSelected = currentSet.has(oddMember) && currentSet.has(evenMember);
      const nextOddSelected = nextMembers.has(oddMember);
      const nextEvenSelected = nextMembers.has(evenMember);

      if (nextOddSelected !== nextEvenSelected) {
        if (prevBothSelected) {
          nextMembers.delete(oddMember);
          nextMembers.delete(evenMember);
        } else {
          nextMembers.add(oddMember);
          nextMembers.add(evenMember);
        }
      }
    }

    return assignableMemberIds.filter((member) => nextMembers.has(member));
  }

  function handleDcaGroupMembersChange(id: DcaGroupId, members: GroupMember[]) {
    const currentMembers = dcaGroups[id - 1]?.members ?? [];
    const normalizedMembers = normalizeDcaMembersForLinkedChannels(currentMembers, members);

    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      sendGroupMessages(client, buildSetDcaMembersMessages(id, normalizedMembers));
    } catch (error) {
      console.error("[DCA] members error:", error);
      return;
    }

    updateDcaGroupState(id, { members: normalizedMembers });
  }

  function normalizeMuteGroupMembersForLinkedTargets(
    currentMembers: GroupMember[],
    proposedMembers: GroupMember[]
  ): GroupMember[] {
    const currentSet = new Set(currentMembers);
    const nextMembers = new Set(proposedMembers);

    for (let odd = 1; odd < channelCount; odd += 2) {
      const even = odd + 1;
      const key = pairKey(odd, even);
      if (!channelLinks[key]) continue;

      const oddMember = `CH_${odd}` as GroupMember;
      const evenMember = `CH_${even}` as GroupMember;
      const prevBothSelected = currentSet.has(oddMember) && currentSet.has(evenMember);
      const nextOddSelected = nextMembers.has(oddMember);
      const nextEvenSelected = nextMembers.has(evenMember);

      if (nextOddSelected !== nextEvenSelected) {
        if (prevBothSelected) {
          nextMembers.delete(oddMember);
          nextMembers.delete(evenMember);
        } else {
          nextMembers.add(oddMember);
          nextMembers.add(evenMember);
        }
      }
    }

    const auxCount = getAuxBusCount();
    for (let odd = 1; odd < auxCount; odd += 2) {
      const even = odd + 1;
      const key = pairKey(odd, even);
      if (!auxLinks[key]) continue;

      const oddMember = `AUX_${odd}` as GroupMember;
      const evenMember = `AUX_${even}` as GroupMember;
      const prevBothSelected = currentSet.has(oddMember) && currentSet.has(evenMember);
      const nextOddSelected = nextMembers.has(oddMember);
      const nextEvenSelected = nextMembers.has(evenMember);

      if (nextOddSelected !== nextEvenSelected) {
        if (prevBothSelected) {
          nextMembers.delete(oddMember);
          nextMembers.delete(evenMember);
        } else {
          nextMembers.add(oddMember);
          nextMembers.add(evenMember);
        }
      }
    }

    if (masterLinked) {
      const leftMember = "MASTER_L" as GroupMember;
      const rightMember = "MASTER_R" as GroupMember;
      const prevBothSelected = currentSet.has(leftMember) && currentSet.has(rightMember);
      const nextLeftSelected = nextMembers.has(leftMember);
      const nextRightSelected = nextMembers.has(rightMember);

      if (nextLeftSelected !== nextRightSelected) {
        if (prevBothSelected) {
          nextMembers.delete(leftMember);
          nextMembers.delete(rightMember);
        } else {
          nextMembers.add(leftMember);
          nextMembers.add(rightMember);
        }
      }
    }

    return assignableMemberIds.filter((member) => nextMembers.has(member));
  }

  function handleDcaGroupClear(id: DcaGroupId) {
    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      sendGroupMessages(client, buildClearDcaMembersMessages(id));
    } catch (error) {
      console.error("[DCA] clear error:", error);
      return;
    }

    updateDcaGroupState(id, { members: [] });
  }

  function handleMuteGroupToggleActive(id: MuteGroupId) {
    const group = muteGroups[id - 1];
    if (!group) return;

    const nextActive = !group.active;

    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      sendGroupMessages(client, buildSetMuteGroupActiveMessages(id, nextActive));
    } catch (error) {
      console.error("[Mute] toggle active error:", error);
      return;
    }

    updateMuteGroupState(id, { active: nextActive });
  }

  function handleMuteGroupMembersChange(id: MuteGroupId, members: GroupMember[]) {
    const currentMembers = muteGroups[id - 1]?.members ?? [];
    const normalizedMembers = normalizeMuteGroupMembersForLinkedTargets(currentMembers, members);

    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      sendGroupMessages(client, buildSetMuteGroupMembersMessages(id, normalizedMembers));
    } catch (error) {
      console.error("[Mute] members error:", error);
      return;
    }

    updateMuteGroupState(id, { members: normalizedMembers });
  }

  function handleMuteGroupClear(id: MuteGroupId) {
    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      sendGroupMessages(client, buildClearMuteGroupMembersMessages(id));
    } catch (error) {
      console.error("[Mute] clear error:", error);
      return;
    }

    updateMuteGroupState(id, { members: [] });
  }

  function handleMuteGroupAllMuted(id: MuteGroupId) {
    const mappedMembers = assignableMemberIds.filter((member) => member !== "MASTER_L" && member !== "MASTER_R");

    const client = clientRef.current;
    if (!client || !isConnected) return;

    try {
      sendGroupMessages(client, buildSetMuteGroupMembersMessages(id, mappedMembers as GroupMember[]));
    } catch (error) {
      console.error("[Mute] all muted error:", error);
      return;
    }

    updateMuteGroupState(id, { members: mappedMembers as GroupMember[] });
  }

  function getSectionStrips(section: StripSection) {
    if (section === "inputs") return channels;
    if (section === "aux") return auxStrips;
    return fxStrips;
  }

  function applyMixerChannelProfile(nextChannelCount: number) {
    ACTIVE_CHANNEL_PROFILE = channelCountToProtocolProfile(nextChannelCount);
    ACTIVE_CHANNEL_COUNT = nextChannelCount;
    setGroupProtocolProfile(ACTIVE_CHANNEL_PROFILE);
    setBitmaskProtocolProfile(ACTIVE_CHANNEL_PROFILE);
    const nextAuxCount = getAuxBusCount();
    const nextFxCount = getFxBusCount();
    const nextDcaIds = getDcaIdsForChannelCount(nextChannelCount);

    setChannelCount(nextChannelCount);
    setChannels(createInitialChannelsState(nextChannelCount));
    setProcessorStates(createInitialProcessorStates(nextChannelCount));
    setAuxStrips(createVirtualStripsState(nextAuxCount, DEFAULT_AUX_COLOR_ID));
    setFxStrips(createVirtualStripsState(nextFxCount, DEFAULT_FX_COLOR_ID));
    setAuxProcessorStates(Array.from({ length: nextAuxCount }, () => createDefaultAuxProcessorState()));
    setFxProcessorStates(Array.from({ length: nextFxCount }, () => createDefaultProcessorState()));
    setFxPresetStates(createInitialFxPresetStates(nextFxCount));
    setSelectedAuxSendsTarget((current) => Math.max(1, Math.min(nextAuxCount, current)));
    setSelectedFxSendsTarget((current) => Math.max(1, Math.min(nextFxCount, current)));
    setDcaNames((current) => Array.from({ length: nextDcaIds.length }, (_, index) => current[index] ?? getDefaultDcaGroupName(index)));
    setDcaColorIds((current) => Array.from({ length: nextDcaIds.length }, (_, index) => {
      const stored = current[index];
      if (typeof stored === "number") return Math.max(0, Math.min(12, Math.round(stored)));
      return DCA_DEFAULT_COLOR_IDS[nextDcaIds[index]];
    }));
    setDcaGroups(createInitialDcaState(nextChannelCount));
    setMuteGroups(createInitialMuteState(nextChannelCount));
    setChannelLinks({});
    setChannelSendValues(createDefaultSendValues());
    setSendTapPoints(createDefaultSendTapPoints());
    setAuxInputSendValues({});
    setAuxInputSendTapPoints({});
    setFxInputSendValues({});
    setFxInputSendTapPoints({});
    warnIfProtocolProfilesOutOfSync("applyMixerChannelProfile");
  }

  function hydrateDcaCacheForMixer(mixerCacheIdentity: string | null, channelTotal: number) {
    const dcaIds = getDcaIdsForChannelCount(channelTotal);
    const cachedNames = readScopedDcaNames(mixerCacheIdentity, dcaIds.length);
    const cachedColorIds = readScopedDcaColorIds(mixerCacheIdentity, dcaIds);

    if (cachedNames) {
      setDcaNames(cachedNames);
    } else {
      setDcaNames(dcaIds.map((_, index) => getDefaultDcaGroupName(index)));
    }

    if (cachedColorIds) {
      setDcaColorIds(cachedColorIds);
    } else {
      setDcaColorIds(dcaIds.map((id) => DCA_DEFAULT_COLOR_IDS[id]));
    }
  }

  // Removed setSelectedForSection - no longer used in new component structure

  function updateProcessorState(
    channelNumber: number,
    updater: (current: ProcessorState) => ProcessorState
  ) {
    setProcessorStates((current) =>
      current.map((processorState, index) =>
        index === channelNumber - 1 ? updater(processorState) : processorState
      )
    );
  }

  function updateAuxProcessorState(
    auxNumber: number,
    updater: (current: ProcessorState) => ProcessorState
  ) {
    setAuxProcessorStates((current) =>
      current.map((processorState, index) =>
        index === auxNumber - 1 ? updater(processorState) : processorState
      )
    );
  }

  function updateFxPresetState(
    fxNumber: number,
    updater: (current: FxPresetState) => FxPresetState
  ) {
    setFxPresetStates((current) =>
      current.map((presetState, index) =>
        index === fxNumber - 1 ? updater(presetState) : presetState
      )
    );
  }

  function updateFxProcessorState(
    fxNumber: number,
    updater: (current: ProcessorState) => ProcessorState
  ) {
    setFxProcessorStates((current) =>
      current.map((processorState, index) =>
        index === fxNumber - 1 ? updater(processorState) : processorState
      )
    );
  }

  function getLinkedChannelTargets(channelNumber: number) {
    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);

    if (!channelLinks[key]) return [channelNumber];

    return [odd, even];
  }

  function lockChannelPairTransition(key: string, durationMs = 1300) {
    channelLinkTransitionUntilRef.current.set(key, Date.now() + durationMs);
  }

  function unlockChannelPairTransition(key: string) {
    channelLinkTransitionUntilRef.current.delete(key);
  }

  function isChannelPairTransitionLocked(key: string, now = Date.now()) {
    const until = channelLinkTransitionUntilRef.current.get(key);
    if (!until) return false;
    if (now > until) {
      channelLinkTransitionUntilRef.current.delete(key);
      return false;
    }
    return true;
  }

  function lockAuxPairTransition(key: string, durationMs = 1300) {
    auxLinkTransitionUntilRef.current.set(key, Date.now() + durationMs);
  }

  function unlockAuxPairTransition(key: string) {
    auxLinkTransitionUntilRef.current.delete(key);
  }

  function isAuxPairTransitionLocked(key: string, now = Date.now()) {
    const until = auxLinkTransitionUntilRef.current.get(key);
    if (!until) return false;
    if (now > until) {
      auxLinkTransitionUntilRef.current.delete(key);
      return false;
    }
    return true;
  }

  function lockMasterLinkTransition(durationMs = 1300) {
    masterLinkTransitionUntilRef.current = Date.now() + durationMs;
  }

  function unlockMasterLinkTransition() {
    masterLinkTransitionUntilRef.current = 0;
  }

  function isMasterLinkTransitionLocked(now = Date.now()) {
    const until = masterLinkTransitionUntilRef.current;
    if (!until) return false;
    if (now > until) {
      masterLinkTransitionUntilRef.current = 0;
      return false;
    }
    return true;
  }

  function getLinkedAuxTargets(auxNumber: number) {
    const [odd, even] = getAuxPair(auxNumber);
    const key = pairKey(odd, even);

    if (!auxLinks[key]) return [auxNumber];

    return [odd, even];
  }

  async function syncChannelPairContext(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;
    const isAx32 = isAx32ProfileActive();

    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);

    await Promise.all([syncChannelState(odd), syncChannelState(even)]);

    const mirrorParams = CHANNEL_LINK_MIRROR_BASES.flatMap((base) => [
      channelParam(odd, base),
      channelParam(even, base),
    ]);

    const values = await readValuesMapChunked(
      client,
      [
      channelParam(odd, 75),
      channelParam(even, 75),
      channelParam(odd, 85),
      channelParam(odd, 86),
      channelParam(even, 85),
      channelParam(even, 86),
      ...(isAx32 ? [getChannelLinkParam()] : []),
      ...mirrorParams,
      channelColorParam(odd),
      channelColorParam(even),
      ],
      isAx32 ? 24 : 40,
      isAx32 ? 900 : 2200
    );
    const oddPan = valueToPan(values.get(channelParam(odd, 75)) ?? 100);
    const evenPan = valueToPan(values.get(channelParam(even, 75)) ?? 100);
    const oddColor = normalizeColorByScope(
      "input",
      valueToColorId(values.get(channelColorParam(odd)) ?? 1)
    );
    const evenColor = normalizeColorByScope(
      "input",
      valueToColorId(values.get(channelColorParam(even)) ?? 1)
    );
    let linked: boolean;

    if (isAx32) {
      const linkMask = values.get(getChannelLinkParam()) ?? 0;
      const pairBit = 1 << Math.floor((odd - 1) / 2);
      linked = (linkMask & pairBit) !== 0;
    } else {
      let mirroredControls = 0;
      let comparedControls = 0;

      CHANNEL_LINK_MIRROR_BASES.forEach((base) => {
        const oddValue = values.get(channelParam(odd, base));
        const evenValue = values.get(channelParam(even, base));
        if (oddValue === undefined || evenValue === undefined) return;
        comparedControls += 1;
        if (oddValue === evenValue) mirroredControls += 1;
      });

      const hasPanLock = oddPan === 0 && evenPan === 200;
      const hasDeskUnlinkSignature = oddPan === 0 && evenPan === 0;
      const hasStrongMirrorSignature =
        comparedControls >= 6 &&
        mirroredControls >= Math.max(5, Math.ceil(comparedControls * 0.5));

      const linkedFromPanLock = hasPanLock && hasStrongMirrorSignature;
      const hasEnoughEvidence = comparedControls >= 6;
      const linkedFromEvidence = hasDeskUnlinkSignature && hasStrongMirrorSignature
        ? false
        : linkedFromPanLock;
      linked = hasEnoughEvidence
        ? linkedFromEvidence
        : hasPanLock || Boolean(channelLinks[key]);
    }

    setChannelLinks((current) => {
      if (isChannelPairTransitionLocked(key)) {
        return current;
      }

      return {
        ...current,
        [key]: linked,
      };
    });

    if (linked) {
      setChannels((current) => {
        const next = [...current];
        next[odd - 1] = {
          ...next[odd - 1],
          pan: oddPan,
          colorId: oddColor,
        };
        next[even - 1] = {
          ...next[even - 1],
          ...next[odd - 1],
          pan: evenPan,
          colorId: oddColor,
          iconId: next[odd - 1].iconId,
        };
        return next;
      });
      return;
    }

    updateChannelState(odd, { pan: oddPan, colorId: oddColor });
    updateChannelState(even, { pan: evenPan, colorId: evenColor });
  }

  async function syncChannelState(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = getChannelStateParams(channelNumber);

    const readParams = Object.values(params).filter(
      (param): param is number => typeof param === "number"
    );
    if (readParams.length === 0) {
      return;
    }

    const response = await client.readParams(readParams, 2000);
    const values = new Map(response.map((item) => [item.param, item.value]));

    applyChannelStateFromValues(channelNumber, values, params);
  }

  async function syncChannelProcessorState(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = processorParams(channelNumber);
    const response = await client.readParams(Object.values(params), 2500);
    const values = new Map(response.map((item) => [item.param, item.value]));
    applyChannelProcessorStateFromValues(channelNumber, values, params);
  }

  function getUsbReturnPatchParamsForActiveProfile() {
    if (!isAx32ProfileActive()) return [];

    return Array.from(
      { length: AX32_INPUT_PATCH_SIZE },
      (_, index) => AX32_INPUT_PATCH_BASE + index
    );
  }

  function getUsbInputPatchParamsForActiveProfile() {
    if (!isAx32ProfileActive()) return [];

    return Array.from(
      { length: AX32_USB_INPUT_PATCH_SIZE },
      (_, index) => AX32_USB_INPUT_PATCH_BASE + index
    );
  }

  function getUsbReturnOutputPatchParamsForActiveProfile() {
    if (!isAx32ProfileActive()) return [];

    return Array.from(
      { length: AX32_USB_RETURN_PATCH_SIZE },
      (_, index) => AX32_USB_RETURN_PATCH_BASE + index
    );
  }

  function getAx32OutputPatchParamsForActiveProfile() {
    if (!isAx32ProfileActive()) return [];

    return Array.from(
      { length: AX32_OUTPUT_PATCH_SIZE },
      (_, index) => AX32_OUTPUT_PATCH_BASE + index
    );
  }

  function syncVisibleInputPatchRoutes(nextPatchMap: Map<number, number>) {
    const nextVisible = Array.from(
      { length: AX32_INPUT_PATCH_VISIBLE_SIZE },
      (_, index) => {
        const destination = index + 1;
        return nextPatchMap.get(destination) ?? destination;
      }
    );
    setInputPatchRoutes(nextVisible);
  }

  function syncVisibleUsbInputPatchRoutes(nextPatchMap: Map<number, number>) {
    const nextVisible = Array.from(
      { length: AX32_INPUT_PATCH_VISIBLE_SIZE },
      (_, index) => {
        const destination = index + 1;
        return nextPatchMap.get(destination) ?? destination;
      }
    );
    setUsbInputToUsbRoutes(nextVisible);
  }

  function syncVisibleUsbReturnRoutes(nextPatchMap: Map<number, number>) {
    const nextVisible = Array.from(
      { length: AX32_INPUT_PATCH_VISIBLE_SIZE },
      (_, index) => {
        const destination = index + 1;
        return nextPatchMap.get(destination) ?? destination;
      }
    );
    setUsbReturnRoutes(nextVisible);
  }

  function syncVisibleOutputPatchRoutes(nextPatchMap: Map<number, number>) {
    const nextVisible = Array.from(
      { length: AX32_OUTPUT_PATCH_VISIBLE_SIZE },
      (_, index) => {
        const destination = index + 1;
        return nextPatchMap.get(destination) ?? destination;
      }
    );
    setOutputPatchRoutes(nextVisible);
  }

  function clearAx32PatchRoutingState() {
    const hadAnyPatchState =
      usbReturnPatchMapRef.current.size > 0 ||
      usbInputToUsbPatchMapRef.current.size > 0 ||
      usbReturnOutputPatchMapRef.current.size > 0;

    if (!hadAnyPatchState) {
      return;
    }

    usbReturnPatchMapRef.current = new Map();
    usbInputToUsbPatchMapRef.current = new Map();
    usbReturnOutputPatchMapRef.current = new Map();

    const emptyMap = new Map<number, number>();
    syncVisibleInputPatchRoutes(emptyMap);
    syncVisibleUsbInputPatchRoutes(emptyMap);
    syncVisibleUsbReturnRoutes(emptyMap);
    syncVisibleOutputPatchRoutes(emptyMap);
  }

  function resolveInputSourceControlChannel(channelNumber: number) {
    if (channelNumber < 1 || channelNumber > channelCount) {
      return null;
    }

    if (!isAx32ProfileActive()) {
      // AX16/AX24: channel maps 1:1 to param index (no patch map indirection).
      return channelNumber;
    }

    // AX32: Input Source Mode is indexed by USB return slot, NOT by channel strip number.
    // The Record Out To Channel map (params 2565-2596) tells us which slot feeds each channel.
    // inputSourceParam(slot) = 2660 + slot  →  slot 1=2661, slot 3=2663, etc.
    const usbReturnSlot = usbReturnOutputPatchMapRef.current.get(channelNumber);
    if (usbReturnSlot === undefined) {
      // Channel has no USB return slot assigned — toggle not applicable.
      return null;
    }
    return usbReturnSlot;
  }

  function resolveUsbInputOnFromRaw(rawValue: number) {
    return isUsbInputSelectedFromRaw(rawValue);
  }

  function resolveExpectedInputSourceRawForToggle(usbInputOn: boolean) {
    return rawValueFromUsbInputSelected(usbInputOn);
  }

  async function refreshResolvedInputSourceStates(options?: { ignoreConnectionState?: boolean }) {
    const client = clientRef.current;
    if (!client || (!isConnected && !options?.ignoreConnectionState)) return;

    if (!isAx32ProfileActive()) {
      const readParams = Array.from(
        { length: channelCount },
        (_, index) => inputSourceParam(index + 1)
      );
      const values = await readValuesMapChunked(client, readParams, 24, 900);

      for (let index = 0; index < channelCount; index += 1) {
        const channelNumber = index + 1;
        const rawValue = values.get(inputSourceParam(channelNumber));
        if (rawValue === undefined) continue;

        updateChannelState(channelNumber, {
          usbInputOn: resolveUsbInputOnFromRaw(rawValue),
        });
      }
      return;
    }

    const pendingUpdates: Array<{ channelNumber: number; controlChannel: number }> = [];

    const readParams = Array.from({ length: channelCount }, (_, index) => {
      const channelNumber = index + 1;
      const controlChannel = resolveInputSourceControlChannel(channelNumber);
      if (controlChannel === null) {
        updateChannelState(channelNumber, { usbInputOn: false });
        return null;
      }
      pendingUpdates.push({ channelNumber, controlChannel });
      return inputSourceParam(controlChannel);
    }).filter((param): param is number => param !== null);
    const uniqueReadParams = Array.from(new Set(readParams));

    if (uniqueReadParams.length === 0) {
      return;
    }

    const timeoutMs = isAx32ProfileActive() ? 700 : 900;
    const values = await readValuesMapChunked(client, uniqueReadParams, 24, timeoutMs);

    for (const { channelNumber, controlChannel } of pendingUpdates) {
      const sourceParam = inputSourceParam(controlChannel);
      const rawValue = values.get(sourceParam);
      if (rawValue === undefined) continue;

      updateChannelState(channelNumber, {
        usbInputOn: resolveUsbInputOnFromRaw(rawValue),
      });
    }
  }

  async function syncUsbReturnPatchMap(options?: {
    refreshInputStates?: boolean;
    ignoreConnectionState?: boolean;
  }) {
    const client = clientRef.current;
    if (!client || (!isConnected && !options?.ignoreConnectionState)) return;

    if (!isAx32ProfileActive()) {
      clearAx32PatchRoutingState();
      if (options?.refreshInputStates !== false) {
        await refreshResolvedInputSourceStates();
      }
      return;
    }

    const patchParams = getUsbReturnPatchParamsForActiveProfile();

    if (patchParams.length === 0) {
      if (usbReturnPatchMapRef.current.size > 0) {
        usbReturnPatchMapRef.current = new Map();
      }
      return;
    }

    const response = await client.readParams(patchParams, 1200);
    const nextPatchMap = new Map<number, number>();

    response.forEach(({ param, value }) => {
      const destinationChannel = param - AX32_INPUT_PATCH_BASE + 1;
      if (destinationChannel < 1 || destinationChannel > AX32_INPUT_PATCH_VISIBLE_SIZE) {
        return;
      }

      const sourceChannel = normalizePatchRouteValue(
        value,
        AX32_INPUT_PATCH_BASE,
        AX32_INPUT_PATCH_SIZE
      );
      if (sourceChannel === null) {
        return;
      }
      nextPatchMap.set(destinationChannel, sourceChannel);
    });

    let changed = nextPatchMap.size !== usbReturnPatchMapRef.current.size;
    if (!changed) {
      for (const [destination, source] of nextPatchMap.entries()) {
        if (usbReturnPatchMapRef.current.get(destination) !== source) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) {
      if (options?.refreshInputStates !== false) {
        await refreshResolvedInputSourceStates();
      }
      return;
    }

    usbReturnPatchMapRef.current = nextPatchMap;
    syncVisibleInputPatchRoutes(nextPatchMap);

    if (options?.refreshInputStates !== false) {
      await refreshResolvedInputSourceStates();
    }
  }

  async function syncUsbInputPatchMap(options?: {
    ignoreConnectionState?: boolean;
    refreshInputStates?: boolean;
  }) {
    const client = clientRef.current;
    if (!client || (!isConnected && !options?.ignoreConnectionState)) return;

    if (!isAx32ProfileActive()) {
      clearAx32PatchRoutingState();
      if (options?.refreshInputStates !== false) {
        await refreshResolvedInputSourceStates();
      }
      return;
    }

    const patchParams = getUsbInputPatchParamsForActiveProfile();
    if (patchParams.length === 0) return;

    const response = await client.readParams(patchParams, 1200);
    const nextPatchMap = new Map<number, number>();

    response.forEach(({ param, value }) => {
      const destinationChannel = param - AX32_USB_INPUT_PATCH_BASE + 1;
      if (destinationChannel < 1 || destinationChannel > AX32_USB_INPUT_PATCH_SIZE) {
        return;
      }

      const sourceChannel = normalizePatchRouteValue(
        value,
        AX32_USB_INPUT_PATCH_BASE,
        AX32_USB_INPUT_PATCH_SIZE
      );
      if (sourceChannel === null || sourceChannel === 0) {
        return;
      }

      nextPatchMap.set(destinationChannel, sourceChannel);
    });

    let changed = nextPatchMap.size !== usbInputToUsbPatchMapRef.current.size;
    if (!changed) {
      for (const [destination, source] of nextPatchMap.entries()) {
        if (usbInputToUsbPatchMapRef.current.get(destination) !== source) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) {
      if (options?.refreshInputStates !== false) {
        await refreshResolvedInputSourceStates();
      }
      return;
    }

    usbInputToUsbPatchMapRef.current = nextPatchMap;
    syncVisibleUsbInputPatchRoutes(nextPatchMap);

    if (options?.refreshInputStates !== false) {
      await refreshResolvedInputSourceStates();
    }
  }

  async function syncUsbReturnOutputPatchMap(options?: {
    ignoreConnectionState?: boolean;
    refreshInputStates?: boolean;
  }) {
    const client = clientRef.current;
    if (!client || (!isConnected && !options?.ignoreConnectionState)) return;

    if (!isAx32ProfileActive()) {
      clearAx32PatchRoutingState();
      if (options?.refreshInputStates !== false) {
        await refreshResolvedInputSourceStates();
      }
      return;
    }

    const patchParams = getUsbReturnOutputPatchParamsForActiveProfile();
    if (patchParams.length === 0) return;

    const response = await client.readParams(patchParams, 1200);
    const nextPatchMap = new Map<number, number>();

    response.forEach(({ param, value }) => {
      const destinationChannel = param - AX32_USB_RETURN_PATCH_BASE + 1;
      if (destinationChannel < 1 || destinationChannel > AX32_USB_RETURN_PATCH_SIZE) {
        return;
      }

      const sourceChannel = normalizePatchRouteValue(
        value,
        AX32_USB_RETURN_PATCH_BASE,
        AX32_USB_RETURN_PATCH_SIZE
      );
      if (sourceChannel === null || sourceChannel === 0) {
        return;
      }

      nextPatchMap.set(destinationChannel, sourceChannel);
    });

    if (nextPatchMap.size === 0) return;

    let changed = nextPatchMap.size !== usbReturnOutputPatchMapRef.current.size;
    if (!changed) {
      for (const [destination, source] of nextPatchMap.entries()) {
        if (usbReturnOutputPatchMapRef.current.get(destination) !== source) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) {
      if (options?.refreshInputStates !== false) {
        await refreshResolvedInputSourceStates();
      }
      return;
    }

    usbReturnOutputPatchMapRef.current = nextPatchMap;
    syncVisibleUsbReturnRoutes(nextPatchMap);

    if (options?.refreshInputStates !== false) {
      await refreshResolvedInputSourceStates();
    }
  }

  async function syncAx32OutputPatchMap(options?: { ignoreConnectionState?: boolean }) {
    const client = clientRef.current;
    if (!client || (!isConnected && !options?.ignoreConnectionState) || !isAx32ProfileActive()) return;

    const patchParams = getAx32OutputPatchParamsForActiveProfile();
    if (patchParams.length === 0) return;

    const response = await client.readParams(patchParams, 1200);
    const nextPatchMap = new Map<number, number>();

    response.forEach(({ param, value }) => {
      const destinationOutput = param - AX32_OUTPUT_PATCH_BASE + 1;
      if (destinationOutput < 1 || destinationOutput > AX32_OUTPUT_PATCH_SIZE) {
        return;
      }

      const source = normalizePatchRouteValue(
        value,
        AX32_OUTPUT_PATCH_BASE,
        AX32_OUTPUT_PATCH_SIZE
      );
      if (source === null) {
        return;
      }

      nextPatchMap.set(destinationOutput, source);
    });

    if (nextPatchMap.size === 0) return;

    let changed = nextPatchMap.size !== ax32OutputPatchMapRef.current.size;
    if (!changed) {
      for (const [destination, source] of nextPatchMap.entries()) {
        if (ax32OutputPatchMapRef.current.get(destination) !== source) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) return;

    ax32OutputPatchMapRef.current = nextPatchMap;
    syncVisibleOutputPatchRoutes(nextPatchMap);
  }

  function getChannelStateParams(channelNumber: number) {
    const controlChannel = resolveInputSourceControlChannel(channelNumber);

    return {
      hiZ: channelParam(channelNumber, 64),
      inputSource:
        controlChannel === null
          ? undefined
          : inputSourceParam(controlChannel),
      phantom: channelParam(channelNumber, 65),
      gain: channelParam(channelNumber, 72),
      phase: channelParam(channelNumber, 73),
      mute: channelParam(channelNumber, 74),
      pan: channelParam(channelNumber, 75),
      fader: channelParam(channelNumber, 76),
      color: channelColorParam(channelNumber),
      soloLeft: channelParam(channelNumber, 87),
      soloRight: channelParam(channelNumber, 88),
    };
  }

  function applyChannelStateFromValues(
    channelNumber: number,
    values: Map<number, number>,
    params: ReturnType<typeof getChannelStateParams>,
    options?: { shouldApplyParam?: (param: number, value: number) => boolean }
  ) {
    const shouldApplyParam = options?.shouldApplyParam;
    const patch: Partial<ChannelState> = {};

    const readAccepted = (param: number | undefined) => {
      if (param === undefined) return undefined;
      const value = values.get(param);
      if (value === undefined) return undefined;
      if (shouldApplyParam && !shouldApplyParam(param, value)) return undefined;
      return value;
    };

    const hiZ = readAccepted(params.hiZ);
    if (hiZ !== undefined) {
      patch.hiZOn = valueToBoolean(hiZ);
    }

    if (params.inputSource === undefined) {
      patch.usbInputOn = false;
    }

    const inputSource = readAccepted(params.inputSource);
    if (inputSource !== undefined) {
      patch.usbInputOn = resolveUsbInputOnFromRaw(inputSource);
    }

    const phantom = readAccepted(params.phantom);
    if (phantom !== undefined) {
      patch.phantomOn = valueToBoolean(phantom);
    }

    const gain = readAccepted(params.gain);
    if (gain !== undefined) {
      patch.gain = valueToGain(gain);
    }

    const phase = readAccepted(params.phase);
    if (phase !== undefined) {
      patch.phasePositive = valueToBoolean(phase);
    }

    const color = readAccepted(params.color);
    if (color !== undefined) {
      patch.colorId = normalizeColorByScope("input", valueToColorId(color));
    }

    const mute = readAccepted(params.mute);
    if (mute !== undefined) {
      patch.muted = valueToMute(mute);
    }

    const pan = readAccepted(params.pan);
    if (pan !== undefined) {
      patch.pan = valueToPan(pan);
    }

    const fader = readAccepted(params.fader);
    if (fader !== undefined) {
      const faderDb = valueToFaderDb(fader);
      patch.faderDb = faderDb;
      patch.faderPosition = dbToFaderPosition(faderDb);
    }

    const soloLeft = readAccepted(params.soloLeft);
    const soloRight = readAccepted(params.soloRight);
    if (soloLeft !== undefined && soloRight !== undefined) {
      patch.soloOn = soloLeft > 0 || soloRight > 0;
    }

    if (Object.keys(patch).length === 0) return;
    updateChannelState(channelNumber, patch);
  }

  function applyChannelProcessorStateFromValues(
    channelNumber: number,
    values: Map<number, number>,
    params: ReturnType<typeof processorParams>
  ) {
    const getValue = (param: number, fallback: number) => values.get(param) ?? fallback;

    setProcessorStates((current) => {
      const next = [...current];
      const index = channelNumber - 1;
      const currentState = current[index];
      if (!currentState) return current;

      const rawHpfFreq = getValue(params.hpfFreq, 0);
      const rawLpfFreq = getValue(params.lpfFreq, 0);
      const nextHpfEnabled = inferHpfEnabledFromRaw(rawHpfFreq, currentState.eq.hpfEnabled);
      const nextLpfEnabled = inferLpfEnabledFromRaw(rawLpfFreq, currentState.eq.lpfEnabled);

      const parsedState: ProcessorState = {
        gate: {
          enabled: valueToBoolean(getValue(params.gateEnabled, 0)),
          threshold: valueToGateThreshold(getValue(params.gateThreshold, 50)),
          attack: valueToGateAttack(getValue(params.gateAttack, 15)),
          decay: valueToGateDecay(getValue(params.gateDecay, 2)),
          hold: valueToGateHold(getValue(params.gateHold, 120)),
        },
        comp: {
          enabled: valueToBoolean(getValue(params.compEnabled, 0)),
          ratio: valueToCompRatio(getValue(params.compRatio, 100)),
          attack: valueToCompTime(getValue(params.compAttack, 300)),
          release: valueToCompTime(getValue(params.compRelease, 1450)),
          threshold: valueToCompThreshold(getValue(params.compThreshold, 0)),
          gain: valueToCompGain(getValue(params.compGain, 1200)),
        },
        eq: {
          enabled: valueToBoolean(getValue(params.eqEnabled, 0)),
          hpfEnabled: nextHpfEnabled,
          hpfType: valueToHpfTypeSlope(getValue(params.hpfTypeSlope, 8)).type,
          hpfSlope: valueToHpfTypeSlope(getValue(params.hpfTypeSlope, 8)).slope,
          hpfFreq: shouldKeepCachedHpfFreq(rawHpfFreq)
            ? currentState.eq.hpfFreq
            : resolveHpfFreqFromRaw(rawHpfFreq, currentState.eq.hpfFreq),
          lpfEnabled: nextLpfEnabled,
          lpfType: valueToLpfTypeSlope(getValue(params.lpfTypeSlope, 13)).type,
          lpfSlope: valueToLpfTypeSlope(getValue(params.lpfTypeSlope, 13)).slope,
          lpfFreq: shouldKeepCachedLpfFreq(rawLpfFreq)
            ? currentState.eq.lpfFreq
            : resolveLpfFreqFromRaw(rawLpfFreq, currentState.eq.lpfFreq),
          bands: [
            // Band enabled is UI-only: mixer doesn't know about it. When a band is disabled,
            // we send defaults to the mixer — so incoming mixer values for a disabled band
            // are the defaults, not the user's saved values. Preserve the full band state.
            currentState.eq.bands[0]?.enabled === false
              ? currentState.eq.bands[0]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand1Freq, 120)),
                  gain: valueToEqGain(getValue(params.eqBand1Gain, 470)),
                  q: valueToEqQ(getValue(params.eqBand1Q, 120)),
                },
            currentState.eq.bands[1]?.enabled === false
              ? currentState.eq.bands[1]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand2Freq, 393)),
                  gain: valueToEqGain(getValue(params.eqBand2Gain, 477)),
                  q: valueToEqQ(getValue(params.eqBand2Q, 121)),
                },
            currentState.eq.bands[2]?.enabled === false
              ? currentState.eq.bands[2]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand3Freq, 1010)),
                  gain: valueToEqGain(getValue(params.eqBand3Gain, 478)),
                  q: valueToEqQ(getValue(params.eqBand3Q, 121)),
                },
            currentState.eq.bands[3]?.enabled === false
              ? currentState.eq.bands[3]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand4Freq, 11000)),
                  gain: valueToEqGain(getValue(params.eqBand4Gain, 526)),
                  q: valueToEqQ(getValue(params.eqBand4Q, 121)),
                },
          ],
        },
      };

      next[index] = parsedState;

      const [odd, even] = getChannelPair(channelNumber);
      const key = pairKey(odd, even);
      if (channelLinks[key]) {
        const oddIndex = odd - 1;
        const evenIndex = even - 1;
        // For linked pairs, always fan out the latest parsed processor state to both sides.
        // This avoids stale rollback when updates arrive from the even channel first.
        next[oddIndex] = cloneProcessorState(parsedState);
        next[evenIndex] = cloneProcessorState(parsedState);
      }

      return next;
    });
  }

  async function readValuesMapChunked(
    client: Axios16Client,
    params: number[],
    chunkSize: number,
    timeoutMs: number
  ) {
    const values = new Map<number, number>();

    for (let index = 0; index < params.length; index += chunkSize) {
      const chunk = params.slice(index, index + chunkSize);

      try {
        const response = await client.readParams(chunk, timeoutMs);
        response.forEach((item) => values.set(item.param, item.value));
      } catch {
        // Keep partial sync progress; don't fall back to per-channel slow path.
      }
    }

    return values;
  }

  function getChannelSyncParams(channelNumber: number) {
    return [
      ...Object.values(getChannelStateParams(channelNumber)),
      ...Object.values(processorParams(channelNumber)),
    ].filter((param): param is number => typeof param === "number");
  }

  function hasCoreChannelValues(values: Map<number, number>, channelNumber: number) {
    const stateParams = getChannelStateParams(channelNumber);
    const procParams = processorParams(channelNumber);

    return (
      values.has(stateParams.fader) ||
      values.has(stateParams.gain) ||
      values.has(procParams.eqEnabled)
    );
  }

  async function syncChannelCombinedRead(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = getChannelSyncParams(channelNumber);
    const timeoutMs = isAx32ProfileActive() ? 900 : AX16_24_READ_TIMEOUT_MS;
    const response = await client.readParams(params, timeoutMs);
    const values = new Map(response.map((item) => [item.param, item.value]));

    applyChannelStateFromValues(channelNumber, values, getChannelStateParams(channelNumber));
    applyChannelProcessorStateFromValues(channelNumber, values, processorParams(channelNumber));
  }

  async function syncChannelBatch(channelNumbers: number[]) {
    const client = clientRef.current;
    if (!client || channelNumbers.length === 0) return;

    const params = channelNumbers.flatMap((channelNumber) =>
      getChannelSyncParams(channelNumber)
    );

    const chunkSize = isAx32ProfileActive() ? 24 : AX16_24_BATCH_CHANNEL_CHUNK;
    const timeoutMs = isAx32ProfileActive() ? 700 : AX16_24_READ_TIMEOUT_MS;
    const values = await readValuesMapChunked(client, params, chunkSize, timeoutMs);

    if (values.size === 0) {
      throw new Error("Nao foi possivel ler os canais da mesa.");
    }

    const missingChannels: number[] = [];

    for (const channelNumber of channelNumbers) {
      if (!hasCoreChannelValues(values, channelNumber)) {
        missingChannels.push(channelNumber);
        continue;
      }

      applyChannelStateFromValues(channelNumber, values, getChannelStateParams(channelNumber));
      applyChannelProcessorStateFromValues(channelNumber, values, processorParams(channelNumber));
    }

    for (const channelNumber of missingChannels) {
      try {
        await syncChannelCombinedRead(channelNumber);
      } catch {
        // Keep other channels synced even if one fallback read fails.
      }
    }
  }

  function getAuxStateParams(auxNumber: number) {
    const params = auxProcessorParams(auxNumber);

    return {
      fader: params.fader,
      phase: params.phase,
      color: auxColorParam(auxNumber),
      mute: auxMuteParam(auxNumber),
    };
  }

  function applyAuxStateFromValues(
    auxNumber: number,
    values: Map<number, number>,
    params: ReturnType<typeof getAuxStateParams>,
    options?: { shouldApplyParam?: (param: number, value: number) => boolean }
  ) {
    const shouldApplyParam = options?.shouldApplyParam;
    const patch: Partial<ChannelState> = {};

    const readAccepted = (param: number) => {
      const value = values.get(param);
      if (value === undefined) return undefined;
      if (shouldApplyParam && !shouldApplyParam(param, value)) return undefined;
      return value;
    };

    const fader = readAccepted(params.fader);
    if (fader !== undefined) {
      const faderDb = valueToFaderDb(fader);
      patch.faderDb = faderDb;
      patch.faderPosition = dbToFaderPosition(faderDb);
    }

    const phase = readAccepted(params.phase);
    if (phase !== undefined) {
      patch.phasePositive = valueToBoolean(phase);
    }

    const mute = readAccepted(params.mute);
    if (mute !== undefined) {
      patch.muted = valueToMute(mute);
    }

    const rawColor = readAccepted(params.color);
    if (rawColor !== undefined) {
      // Nunca envie cor para a mesa durante sync/leitura, apenas ajuste local
      const nextColorId = resolveMesaColorByScope(
        "aux",
        rawColor,
        undefined // nunca envie autofix durante sync
      );
      if (nextColorId !== undefined) {
        patch.colorId = nextColorId;
      }
    }

    if (Object.keys(patch).length === 0) return;
    updateAuxStripState(auxNumber, patch);
  }

  function applyAuxProcessorStateFromValues(
    auxNumber: number,
    values: Map<number, number>,
    params: ReturnType<typeof auxProcessorParams>
  ) {
    const getValue = (param: number, fallback: number) => values.get(param) ?? fallback;

    updateAuxProcessorState(auxNumber, (current) => {
      const rawHpfFreq = values.get(params.hpfFreq);
      const rawLpfFreq = values.get(params.lpfFreq);
      const nextHpfEnabled =
        rawHpfFreq === undefined
          ? current.eq.hpfEnabled
          : inferHpfEnabledFromRaw(rawHpfFreq, current.eq.hpfEnabled);
      const nextLpfEnabled =
        rawLpfFreq === undefined
          ? current.eq.lpfEnabled
          : inferLpfEnabledFromRaw(rawLpfFreq, current.eq.lpfEnabled);

      return {
        ...current,
        comp: {
          enabled: valueToBoolean(getValue(params.compEnabled, 0)),
          ratio: valueToCompRatio(getValue(params.compRatio, 100)),
          attack: valueToCompTime(getValue(params.compAttack, 300)),
          release: valueToCompTime(getValue(params.compRelease, 1450)),
          threshold: valueToCompThreshold(getValue(params.compThreshold, 0)),
          gain: valueToCompGain(getValue(params.compGain, 1200)),
        },
        eq: {
          ...current.eq,
          enabled: valueToBoolean(getValue(params.eqEnabled, current.eq.enabled ? 1 : 0)),
          hpfEnabled: nextHpfEnabled,
          hpfType:
            values.get(params.hpfTypeSlope) === undefined
              ? current.eq.hpfType
              : valueToHpfTypeSlope(values.get(params.hpfTypeSlope) as number).type,
          hpfSlope:
            values.get(params.hpfTypeSlope) === undefined
              ? current.eq.hpfSlope
              : valueToHpfTypeSlope(values.get(params.hpfTypeSlope) as number).slope,
          hpfFreq:
            shouldKeepCachedHpfFreq(values.get(params.hpfFreq))
              ? current.eq.hpfFreq
              : resolveHpfFreqFromRaw(values.get(params.hpfFreq), current.eq.hpfFreq),
          lpfEnabled: nextLpfEnabled,
          lpfType:
            values.get(params.lpfTypeSlope) === undefined
              ? current.eq.lpfType
              : valueToLpfTypeSlope(values.get(params.lpfTypeSlope) as number).type,
          lpfSlope:
            values.get(params.lpfTypeSlope) === undefined
              ? current.eq.lpfSlope
              : valueToLpfTypeSlope(values.get(params.lpfTypeSlope) as number).slope,
          lpfFreq:
            shouldKeepCachedLpfFreq(values.get(params.lpfFreq))
              ? current.eq.lpfFreq
              : resolveLpfFreqFromRaw(values.get(params.lpfFreq), current.eq.lpfFreq),
          bands: [
            current.eq.bands[0]?.enabled === false
              ? current.eq.bands[0]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand1Freq, 63)),
                  gain: valueToEqGain(getValue(params.eqBand1Gain, 500)),
                  q: valueToEqQ(getValue(params.eqBand1Q, 100)),
                },
            current.eq.bands[1]?.enabled === false
              ? current.eq.bands[1]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand2Freq, 160)),
                  gain: valueToEqGain(getValue(params.eqBand2Gain, 500)),
                  q: valueToEqQ(getValue(params.eqBand2Q, 100)),
                },
            current.eq.bands[2]?.enabled === false
              ? current.eq.bands[2]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand3Freq, 400)),
                  gain: valueToEqGain(getValue(params.eqBand3Gain, 500)),
                  q: valueToEqQ(getValue(params.eqBand3Q, 100)),
                },
            current.eq.bands[3]?.enabled === false
              ? current.eq.bands[3]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand4Freq, 1000)),
                  gain: valueToEqGain(getValue(params.eqBand4Gain, 500)),
                  q: valueToEqQ(getValue(params.eqBand4Q, 100)),
                },
            current.eq.bands[4]?.enabled === false
              ? current.eq.bands[4]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand5Freq, 2500)),
                  gain: valueToEqGain(getValue(params.eqBand5Gain, 500)),
                  q: valueToEqQ(getValue(params.eqBand5Q, 100)),
                },
            current.eq.bands[5]?.enabled === false
              ? current.eq.bands[5]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand6Freq, 6300)),
                  gain: valueToEqGain(getValue(params.eqBand6Gain, 500)),
                  q: valueToEqQ(getValue(params.eqBand6Q, 100)),
                },
            current.eq.bands[6]?.enabled === false
              ? current.eq.bands[6]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(params.eqBand7Freq, 16000)),
                  gain: valueToEqGain(getValue(params.eqBand7Gain, 500)),
                  q: valueToEqQ(getValue(params.eqBand7Q, 100)),
                },
          ],
        },
      };
    });
  }

  function getAuxSyncParams(auxNumber: number) {
    return [
      ...Object.values(getAuxStateParams(auxNumber)),
      ...Object.values(auxProcessorParams(auxNumber)),
    ];
  }

  function hasCoreAuxValues(values: Map<number, number>, auxNumber: number) {
    const stateParams = getAuxStateParams(auxNumber);
    const processor = auxProcessorParams(auxNumber);

    return (
      values.has(stateParams.fader) ||
      values.has(stateParams.phase) ||
      values.has(processor.eqEnabled)
    );
  }

  async function syncAuxCombinedRead(auxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const timeoutMs = isAx32ProfileActive() ? 900 : AX16_24_READ_TIMEOUT_MS;
    const response = await client.readParams(getAuxSyncParams(auxNumber), timeoutMs);
    const values = new Map(response.map((item) => [item.param, item.value]));

    applyAuxStateFromValues(auxNumber, values, getAuxStateParams(auxNumber));
    applyAuxProcessorStateFromValues(auxNumber, values, auxProcessorParams(auxNumber));
  }

  async function syncAuxBatch(auxNumbers: number[]) {
    const client = clientRef.current;
    if (!client || auxNumbers.length === 0) return;

    const params = auxNumbers.flatMap((auxNumber) => getAuxSyncParams(auxNumber));

    const chunkSize = isAx32ProfileActive() ? 22 : AX16_24_BATCH_AUX_CHUNK;
    const timeoutMs = isAx32ProfileActive() ? 700 : AX16_24_READ_TIMEOUT_MS;
    const values = await readValuesMapChunked(client, params, chunkSize, timeoutMs);

    if (values.size === 0) {
      throw new Error("Nao foi possivel ler os auxiliares da mesa.");
    }

    const missingAux: number[] = [];

    for (const auxNumber of auxNumbers) {
      if (!hasCoreAuxValues(values, auxNumber)) {
        missingAux.push(auxNumber);
        continue;
      }

      applyAuxStateFromValues(auxNumber, values, getAuxStateParams(auxNumber));
      applyAuxProcessorStateFromValues(auxNumber, values, auxProcessorParams(auxNumber));
    }

    for (const auxNumber of missingAux) {
      try {
        await syncAuxCombinedRead(auxNumber);
      } catch {
        // Keep other AUX synced even if one fallback read fails.
      }
    }
  }

  function applyFxStateFromValues(
    fxNumber: number,
    values: Map<number, number>,
    params: ReturnType<typeof getFxStateParams>,
    options?: { shouldApplyParam?: (param: number, value: number) => boolean }
  ) {
    const shouldApplyParam = options?.shouldApplyParam;
    const patch: Partial<ChannelState> = {};

    const readAccepted = (param: number) => {
      const value = values.get(param);
      if (value === undefined) return undefined;
      if (shouldApplyParam && !shouldApplyParam(param, value)) return undefined;
      return value;
    };

    const mute = readAccepted(params.mute);
    if (mute !== undefined) {
      patch.muted = valueToMute(mute);
    }

    const fader = readAccepted(params.fader);
    if (fader !== undefined) {
      const faderDb = valueToFaderDb(fader);
      patch.faderDb = faderDb;
      patch.faderPosition = dbToFaderPosition(faderDb);
    }

    if (Object.keys(patch).length > 0) {
      updateFxStripState(fxNumber, patch);
    }

    const processorParams = getFxProcessorParams(fxNumber);
    if (!processorParams) return;
    if (!values.has(processorParams.eqEnabled)) return;

    updateFxProcessorState(fxNumber, (current) => {
      const getValue = (param: number, fallback: number) => values.get(param) ?? fallback;
      const rawHpfFreq = values.get(processorParams.hpfFreq);
      const rawLpfFreq = values.get(processorParams.lpfFreq);
      const rawHpfTypeSlope = values.get(processorParams.hpfTypeSlope);
      const rawLpfTypeSlope = values.get(processorParams.lpfTypeSlope);
      const nextHpfEnabled =
        rawHpfFreq === undefined
          ? current.eq.hpfEnabled
          : inferHpfEnabledFromRaw(rawHpfFreq, current.eq.hpfEnabled);
      const nextLpfEnabled =
        rawLpfFreq === undefined
          ? current.eq.lpfEnabled
          : inferLpfEnabledFromRaw(rawLpfFreq, current.eq.lpfEnabled);

      return {
        ...current,
        eq: {
          ...current.eq,
          enabled: valueToBoolean(values.get(processorParams.eqEnabled) ?? (current.eq.enabled ? 1 : 0)),
          hpfEnabled: nextHpfEnabled,
          hpfType:
            rawHpfTypeSlope === undefined
              ? current.eq.hpfType
              : valueToHpfTypeSlope(rawHpfTypeSlope).type,
          hpfSlope:
            rawHpfTypeSlope === undefined
              ? current.eq.hpfSlope
              : valueToHpfTypeSlope(rawHpfTypeSlope).slope,
          hpfFreq:
            shouldKeepCachedHpfFreq(rawHpfFreq)
              ? current.eq.hpfFreq
              : resolveHpfFreqFromRaw(rawHpfFreq, current.eq.hpfFreq),
          lpfEnabled: nextLpfEnabled,
          lpfType:
            rawLpfTypeSlope === undefined
              ? current.eq.lpfType
              : valueToLpfTypeSlope(rawLpfTypeSlope).type,
          lpfSlope:
            rawLpfTypeSlope === undefined
              ? current.eq.lpfSlope
              : valueToLpfTypeSlope(rawLpfTypeSlope).slope,
          lpfFreq:
            shouldKeepCachedLpfFreq(rawLpfFreq)
              ? current.eq.lpfFreq
              : resolveLpfFreqFromRaw(rawLpfFreq, current.eq.lpfFreq),
          bands: [
            current.eq.bands[0]?.enabled === false
              ? current.eq.bands[0]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(processorParams.eqBand1Freq, frequencyToRawValue(DEFAULT_EQ.bands[0].freq))),
                  gain: valueToEqGain(getValue(processorParams.eqBand1Gain, 500)),
                  q: valueToEqQ(getValue(processorParams.eqBand1Q, 100)),
                },
            current.eq.bands[1]?.enabled === false
              ? current.eq.bands[1]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(processorParams.eqBand2Freq, frequencyToRawValue(DEFAULT_EQ.bands[1].freq))),
                  gain: valueToEqGain(getValue(processorParams.eqBand2Gain, 500)),
                  q: valueToEqQ(getValue(processorParams.eqBand2Q, 100)),
                },
            current.eq.bands[2]?.enabled === false
              ? current.eq.bands[2]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(processorParams.eqBand3Freq, frequencyToRawValue(DEFAULT_EQ.bands[2].freq))),
                  gain: valueToEqGain(getValue(processorParams.eqBand3Gain, 500)),
                  q: valueToEqQ(getValue(processorParams.eqBand3Q, 100)),
                },
            current.eq.bands[3]?.enabled === false
              ? current.eq.bands[3]
              : {
                  enabled: true,
                  freq: valueToFrequency(getValue(processorParams.eqBand4Freq, frequencyToRawValue(DEFAULT_EQ.bands[3].freq))),
                  gain: valueToEqGain(getValue(processorParams.eqBand4Gain, 500)),
                  q: valueToEqQ(getValue(processorParams.eqBand4Q, 100)),
                },
          ],
        },
      };
    });
  }

  async function syncFxState(fxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = getFxStateParams(fxNumber);
    const processorParams = getFxProcessorParams(fxNumber);
    const paramsToRead = [
      params.fader,
      params.mute,
      ...(processorParams
        ? [
            processorParams.eqEnabled,
            processorParams.hpfTypeSlope,
            processorParams.hpfFreq,
            processorParams.lpfTypeSlope,
            processorParams.lpfFreq,
            processorParams.eqBand1Freq,
            processorParams.eqBand1Gain,
            processorParams.eqBand1Q,
            processorParams.eqBand2Freq,
            processorParams.eqBand2Gain,
            processorParams.eqBand2Q,
            processorParams.eqBand3Freq,
            processorParams.eqBand3Gain,
            processorParams.eqBand3Q,
            processorParams.eqBand4Freq,
            processorParams.eqBand4Gain,
            processorParams.eqBand4Q,
          ]
        : []),
    ];
    const response = await client.readParams(paramsToRead, 1200);
    const values = new Map(response.map((item) => [item.param, item.value]));

    applyFxStateFromValues(fxNumber, values, params);
  }

  async function syncAllFxState() {
    const fxCount = getFxBusCount();

    for (let fx = 1; fx <= fxCount; fx += 1) {
      await syncFxState(fx);
    }
  }

  async function syncAllChannels(channelTotal = channelCount) {
    try {
      setIsSyncing(true);
      setStatus("Sincronizando canais...");

      if (isAx32ProfileActive()) {
        const channelBatchSize = 6;
        for (let channel = 1; channel <= channelTotal; channel += channelBatchSize) {
          const batch = Array.from(
            { length: Math.min(channelBatchSize, channelTotal - channel + 1) },
            (_, index) => channel + index
          );

          await syncChannelBatch(batch);
        }
      } else {
        for (let channel = 1; channel <= channelTotal; channel++) {
          await syncChannelState(channel);
          await syncChannelProcessorState(channel);
        }
      }

      await syncChannelPairVisualState();
      await syncAllFxState();
      await syncFxColors();
      await syncAllFxPresetState();
      await syncMasterState();
      await syncMasterProcessorState();
      await syncLinkStates();
      await syncAllAux();

      setStatus("Canais, auxiliares e EQ sincronizados com a mesa");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erro ao sincronizar canais"
      );
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }

  function applyMasterControlFromValues(
    values: Map<number, number>,
    params: ReturnType<typeof getMasterParams>,
    options?: { shouldApplyParam?: (param: number, value: number) => boolean }
  ) {
    const shouldApplyParam = options?.shouldApplyParam;
    const patch: Partial<MasterState> = {};

    const readAccepted = (param: number) => {
      const value = values.get(param);
      if (value === undefined) return undefined;
      if (shouldApplyParam && !shouldApplyParam(param, value)) return undefined;
      return value;
    };

    const leftMute = readAccepted(params.leftMute);
    if (leftMute !== undefined) {
      patch.leftMuted = valueToMute(leftMute);
    }

    const rightMute = readAccepted(params.rightMute);
    if (rightMute !== undefined) {
      patch.rightMuted = valueToMute(rightMute);
    }

    const leftFader = readAccepted(params.leftFader);
    if (leftFader !== undefined) {
      const leftFaderDb = valueToFaderDb(leftFader);
      patch.leftFaderDb = leftFaderDb;
      patch.leftFaderPosition = dbToFaderPosition(leftFaderDb);
    }

    const rightFader = readAccepted(params.rightFader);
    if (rightFader !== undefined) {
      const rightFaderDb = valueToFaderDb(rightFader);
      patch.rightFaderDb = rightFaderDb;
      patch.rightFaderPosition = dbToFaderPosition(rightFaderDb);
    }

    if (Object.keys(patch).length === 0) return;
    updateMasterState(patch);
  }

  function getChannelRealtimeControlParams(channelNumber: number) {
    const params = getChannelStateParams(channelNumber);
    return [
      params.mute,
      params.inputSource,
      params.pan,
      params.fader,
      params.phase,
      params.soloLeft,
      params.soloRight,
    ].filter((param): param is number => typeof param === "number");
  }

  function getAuxRealtimeControlParams(auxNumber: number) {
    const params = getAuxStateParams(auxNumber);
    return [params.mute, params.fader, params.phase];
  }

  function getFxRealtimeControlParams(fxNumber: number) {
    const params = getFxStateParams(fxNumber);
    return [params.mute, params.fader];
  }

  async function syncFastControlStates() {
    const client = clientRef.current;
    if (!client || !isConnected || isSyncing) return;
    const skipNonMasterFastPass = isChannelsDraggingRef.current;

    const now = Date.now();
    cleanupStaleLocalWriteTracking(now);
    const shouldApplyParam = (param: number, value: number) =>
      !shouldSuppressRemoteParam(param, value, now);

    if (!skipNonMasterFastPass) {
      const channelParams = Array.from({ length: channelCount }, (_, index) =>
        getChannelRealtimeControlParams(index + 1)
      )
        .flat()
        .filter((param): param is number => typeof param === "number");
      const channelValues = await readValuesMapChunked(
        client,
        channelParams,
        isAx32ProfileActive() ? 32 : AX16_24_FAST_CHANNEL_CHUNK,
        450
      );

      for (let channel = 1; channel <= channelCount; channel++) {
        applyChannelStateFromValues(channel, channelValues, getChannelStateParams(channel), {
          shouldApplyParam,
        });
      }

      const auxCount = getAuxBusCount();
      const auxParams = Array.from({ length: auxCount }, (_, index) =>
        getAuxRealtimeControlParams(index + 1)
      ).flat();
      const auxValues = await readValuesMapChunked(
        client,
        auxParams,
        24,
        450
      );

      for (let aux = 1; aux <= auxCount; aux++) {
        applyAuxStateFromValues(aux, auxValues, getAuxStateParams(aux), {
          shouldApplyParam,
        });
      }

      const fxCount = getFxBusCount();
      const fxParams = Array.from({ length: fxCount }, (_, index) =>
        getFxRealtimeControlParams(index + 1)
      ).flat();
      const fxValues = await readValuesMapChunked(client, fxParams, 24, 450);

      for (let fx = 1; fx <= fxCount; fx++) {
        applyFxStateFromValues(fx, fxValues, getFxStateParams(fx), {
          shouldApplyParam,
        });
      }
    }

    const masterParams = getMasterParams();
    const linkMaskParam = getLinkMaskParam();
    const masterResponse = await client.readParams([
      masterParams.leftFader,
      masterParams.leftMute,
      masterParams.rightFader,
      masterParams.rightMute,
      masterSoloLeftParam(),
      masterSoloAuxLeftParam(),
      masterSoloRightParam(),
      masterSoloAuxRightParam(),
      linkMaskParam,
    ], 450);
    const masterValues = new Map(masterResponse.map((item) => [item.param, item.value]));
    applyMasterControlFromValues(masterValues, masterParams, { shouldApplyParam });

    const masterSoloLeft = masterValues.get(masterSoloLeftParam());
    const masterSoloAuxLeft = masterValues.get(masterSoloAuxLeftParam());
    const masterSoloRight = masterValues.get(masterSoloRightParam());
    const masterSoloAuxRight = masterValues.get(masterSoloAuxRightParam());

    if (
      masterSoloLeft !== undefined ||
      masterSoloAuxLeft !== undefined ||
      masterSoloRight !== undefined ||
      masterSoloAuxRight !== undefined
    ) {
      const leftSoloOn =
        (masterSoloLeft ?? 0) > 0 ||
        (masterSoloAuxLeft ?? 0) > 0;
      const rightSoloOn =
        (masterSoloRight ?? 0) > 0 ||
        (masterSoloAuxRight ?? 0) > 0;
      const masterSoloOn =
        leftSoloOn || rightSoloOn;
      updateMasterState({ leftSoloOn, rightSoloOn, soloOn: masterSoloOn });
    }

    const linkMask = masterValues.get(linkMaskParam);
    if (linkMask !== undefined && shouldApplyParam(linkMaskParam, linkMask)) {
      applyLinkStateFrom3056(linkMask);
    }
  }

  async function syncGlobalControlStates() {
    const client = clientRef.current;
    if (!client || !isConnected || isSyncing) return;
    if (meterBusyRef.current) return;

    const now = Date.now();
    cleanupStaleLocalWriteTracking(now);
    const shouldApplyParam = (param: number, value: number) =>
      !shouldSuppressRemoteParam(param, value, now);

    const channelParams = Array.from({ length: channelCount }, (_, index) =>
      Object.values(getChannelStateParams(index + 1))
    )
      .flat()
      .filter((param): param is number => typeof param === "number");

    const channelChunkSize = isAx32ProfileActive() ? 24 : AX16_24_BATCH_CHANNEL_CHUNK;
    const channelTimeout = isAx32ProfileActive() ? 700 : 1000;
    const channelValues = await readValuesMapChunked(
      client,
      channelParams,
      channelChunkSize,
      channelTimeout
    );

    for (let channel = 1; channel <= channelCount; channel++) {
      applyChannelStateFromValues(
        channel,
        channelValues,
        getChannelStateParams(channel),
        { shouldApplyParam }
      );
    }

    const auxCount = getAuxBusCount();
    const auxParams = Array.from({ length: auxCount }, (_, index) =>
      Object.values(getAuxStateParams(index + 1))
    ).flat();
    const auxValues = await readValuesMapChunked(
      client,
      auxParams,
      isAx32ProfileActive() ? 24 : AX16_24_BATCH_AUX_CHUNK,
      isAx32ProfileActive() ? 700 : 1000
    );

    for (let aux = 1; aux <= auxCount; aux++) {
      applyAuxStateFromValues(aux, auxValues, getAuxStateParams(aux), {
        shouldApplyParam,
      });
    }

    const fxCount = getFxBusCount();
    const fxParams = Array.from({ length: fxCount }, (_, index) =>
      Object.values(getFxStateParams(index + 1))
    ).flat();
    const fxValues = await readValuesMapChunked(
      client,
      fxParams,
      24,
      900
    );

    for (let fx = 1; fx <= fxCount; fx++) {
      applyFxStateFromValues(fx, fxValues, getFxStateParams(fx), {
        shouldApplyParam,
      });
    }

    const masterParams = getMasterParams();
    const linkMaskParam = getLinkMaskParam();
    const masterResponse = await client.readParams([
      masterParams.leftFader,
      masterParams.leftMute,
      masterParams.rightFader,
      masterParams.rightMute,
      masterSoloLeftParam(),
      masterSoloAuxLeftParam(),
      masterSoloRightParam(),
      masterSoloAuxRightParam(),
      linkMaskParam,
    ]);
    const masterValues = new Map(masterResponse.map((item) => [item.param, item.value]));
    applyMasterControlFromValues(masterValues, masterParams, { shouldApplyParam });

    const masterSoloLeft = masterValues.get(masterSoloLeftParam());
    const masterSoloAuxLeft = masterValues.get(masterSoloAuxLeftParam());
    const masterSoloRight = masterValues.get(masterSoloRightParam());
    const masterSoloAuxRight = masterValues.get(masterSoloAuxRightParam());

    if (
      masterSoloLeft !== undefined ||
      masterSoloAuxLeft !== undefined ||
      masterSoloRight !== undefined ||
      masterSoloAuxRight !== undefined
    ) {
      const leftSoloOn =
        (masterSoloLeft ?? 0) > 0 ||
        (masterSoloAuxLeft ?? 0) > 0;
      const rightSoloOn =
        (masterSoloRight ?? 0) > 0 ||
        (masterSoloAuxRight ?? 0) > 0;
      const masterSoloOn =
        leftSoloOn || rightSoloOn;
      updateMasterState({ leftSoloOn, rightSoloOn, soloOn: masterSoloOn });
    }

    const linkMask = masterValues.get(linkMaskParam);
    if (linkMask !== undefined && shouldApplyParam(linkMaskParam, linkMask)) {
      applyLinkStateFrom3056(linkMask);
    }
  }

  async function syncChannelEqPreviewStates(channelTotal = channelCount) {
    const client = clientRef.current;
    if (!client) return;

    const eqEnabledParams = Array.from(
      { length: channelTotal },
      (_, index) => processorParams(index + 1).eqEnabled
    );
    const response = await client.readParams(eqEnabledParams, 1400);
    const values = new Map(response.map((item) => [item.param, item.value]));

    setProcessorStates((current) => {
      const next = current.map((processorState, index) => {
        const param = eqEnabledParams[index];
        const raw = values.get(param);
        if (raw === undefined) {
          return processorState;
        }

        return {
          ...processorState,
          eq: {
            ...processorState.eq,
            enabled: valueToBoolean(raw),
          },
        };
      });

      for (let odd = 1; odd < channelTotal; odd += 2) {
        const even = odd + 1;
        const key = pairKey(odd, even);
        if (!channelLinks[key]) continue;

        next[even - 1] = {
          ...next[even - 1],
          eq: {
            ...next[even - 1].eq,
            enabled: next[odd - 1].eq.enabled,
          },
        };
      }

      return next;
    });
  }

  async function syncAllStripNames(options?: {
    forceFromMixer?: boolean;
    channelTotal?: number;
    writeBackDefaults?: boolean;
    readTimeoutMs?: number;
  }) {
    const client = clientRef.current;
    if (!client) return;
    const forceFromMixer = options?.forceFromMixer === true;
    const channelTotal = options?.channelTotal ?? channelCount;
    const writeBackDefaults = options?.writeBackDefaults === true;
    const readTimeoutMs = options?.readTimeoutMs ?? 1200;
    const pendingNameWrites: Array<{ target: NameTarget; mixerName: string }> = [];

    const [channelNames, auxNames, fxNames] = await Promise.all([
      client.readChannelNames(channelTotal, readTimeoutMs),
      client.readAuxNames(readTimeoutMs, getAuxBusCount()),
      client.readFxNames(readTimeoutMs, getFxBusCount()),
    ]);

    setChannels((current) =>
      current.map((channelState, index) => {
        const channelNumber = index + 1;
        const target: NameTarget = { type: "channel", channel: channelNumber };
        const mixerName = (channelNames[channelNumber] ?? "").trim();
        const mixerIsDefault = isDefaultMixerName(target, mixerName);
        const localName = channelState.channelName.trim();
        const hasUserLocalName =
          localName.length > 0 && !isLocalDefaultDisplayName(target, localName);
        if (writeBackDefaults && (mixerName.length === 0 || mixerIsDefault)) {
          pendingNameWrites.push({
            target,
            mixerName: hasUserLocalName ? toMixerSafeName(channelState.channelName) : getDefaultMixerAlias(target),
          });
        }
        const displayName =
          !forceFromMixer && hasUserLocalName && (mixerName.length === 0 || mixerIsDefault)
            ? channelState.channelName
            : mixerName.length > 0 && !mixerIsDefault
              ? mixerName
              : getDefaultDisplayName(target);

        return {
          ...channelState,
          channelName: displayName,
          mixerName: mixerName.length > 0 ? mixerName : getDefaultMixerAlias(target),
        };
      })
    );

    setAuxStrips((current) =>
      current.map((strip, index) => {
        const auxNumber = index + 1;
        const target: NameTarget = { type: "aux", aux: auxNumber };
        const mixerName = (auxNames[auxNumber] ?? "").trim();
        const mixerIsDefault = isDefaultMixerName(target, mixerName);
        const localName = strip.channelName.trim();
        const hasUserLocalName =
          localName.length > 0 && !isLocalDefaultDisplayName(target, localName);
        if (writeBackDefaults && (mixerName.length === 0 || mixerIsDefault)) {
          pendingNameWrites.push({
            target,
            mixerName: hasUserLocalName ? toMixerSafeName(strip.channelName) : getDefaultMixerAlias(target),
          });
        }
        const displayName =
          !forceFromMixer && hasUserLocalName && (mixerName.length === 0 || mixerIsDefault)
            ? strip.channelName
            : mixerName.length > 0 && !mixerIsDefault
              ? mixerName
              : getDefaultDisplayName(target);

        return {
          ...strip,
          channelName: displayName,
          mixerName: mixerName.length > 0 ? mixerName : getDefaultMixerAlias(target),
        };
      })
    );

    setFxStrips((current) =>
      current.map((strip, index) => {
        const fxNumber = index + 1;
        const target: NameTarget = { type: "fx", fx: fxNumber };
        const mixerName = (fxNames[fxNumber] ?? "").trim();
        const mixerIsDefault = isDefaultMixerName(target, mixerName);
        const localName = strip.channelName.trim();
        const hasUserLocalName =
          localName.length > 0 && !isLocalDefaultDisplayName(target, localName);
        if (writeBackDefaults && (mixerName.length === 0 || mixerIsDefault)) {
          pendingNameWrites.push({
            target,
            mixerName: hasUserLocalName ? toMixerSafeName(strip.channelName) : getDefaultMixerAlias(target),
          });
        }
        const displayName =
          !forceFromMixer && hasUserLocalName && (mixerName.length === 0 || mixerIsDefault)
            ? strip.channelName
            : mixerName.length > 0 && !mixerIsDefault
              ? mixerName
              : getDefaultDisplayName(target);

        return {
          ...strip,
          channelName: displayName,
          mixerName: mixerName.length > 0 ? mixerName : getDefaultMixerAlias(target),
        };
      })
    );

    if (pendingNameWrites.length > 0) {
      pendingNameWrites.forEach(({ target, mixerName }) => {
        if (target.type === "channel") {
          client.setChannelName(target.channel, mixerName);
          return;
        }

        if (target.type === "aux") {
          client.setAuxName(target.aux, mixerName);
          return;
        }

        if (target.type === "fx") {
          client.setFxName(target.fx, mixerName);
        }
      });
    }
  }

  function handleDcaGroupRename(id: DcaGroupId, name: string) {
    const trimmed = name.trim();
    const finalName = trimmed.length > 0 ? trimmed : getDefaultDcaGroupName(id - 1);
    const storageKey = getScopedStorageKey(
      DCA_NAMES_STORAGE_KEY_BASE,
      activeMixerCacheIdentity
    );

    setDcaNames((current) => {
      const next = [...current];
      next[id - 1] = finalName;
      try {
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch { /* ignore */ }
      return next;
    });

    clientRef.current?.setDcaName(id, finalName);
  }

  function handleDcaGroupColorChange(id: DcaGroupId, colorId: number) {
    const normalizedColorId = Math.max(0, Math.min(12, Math.round(colorId)));
    const storageKey = getScopedStorageKey(
      DCA_COLOR_IDS_STORAGE_KEY_BASE,
      activeMixerCacheIdentity
    );

    setDcaColorIds((current) => {
      const next = [...current];
      next[id - 1] = normalizedColorId;
      try {
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch { /* ignore */ }
      return next;
    });
  }

  function handleDcaCustomizerSave(id: DcaGroupId, patch: { channelName: string; colorId: number }) {
    handleDcaGroupRename(id, patch.channelName);
    handleDcaGroupColorChange(id, patch.colorId);
  }

  async function syncChannelPairVisualState() {
    const client = clientRef.current;
    if (!client) return;
    const isAx32 = isAx32ProfileActive();

    const params: number[] = [];

    const maxPairOdd = Math.max(1, channelCount - 1);

    for (let odd = 1; odd <= maxPairOdd; odd += 2) {
      params.push(channelParam(odd, 75));
      params.push(channelParam(odd + 1, 75));
      CHANNEL_LINK_MIRROR_BASES.forEach((base) => {
        params.push(channelParam(odd, base));
        params.push(channelParam(odd + 1, base));
      });
      params.push(channelColorParam(odd));
      params.push(channelColorParam(odd + 1));
    }

    const values = await readValuesMapChunked(
      client,
      params,
      isAx32 ? 24 : 40,
      isAx32 ? 900 : 2200
    );
    let ax32LinkMask = 0;
    if (isAx32) {
      const linkResponse = await client.readParams([getChannelLinkParam()], 900);
      ax32LinkMask = linkResponse[0]?.value ?? 0;
    }
    const now = Date.now();
    cleanupStaleLocalWriteTracking(now);

    const linksFromMesa: PairLinkState = {};

    for (let odd = 1; odd <= maxPairOdd; odd += 2) {
      const even = odd + 1;
      const key = pairKey(odd, even);
      const oddPanParam = channelParam(odd, 75);
      const evenPanParam = channelParam(even, 75);
      const oddPanRaw = values.get(oddPanParam);
      const evenPanRaw = values.get(evenPanParam);

      if (oddPanRaw === undefined || evenPanRaw === undefined) continue;
      if (shouldSuppressRemoteParam(oddPanParam, oddPanRaw, now)) continue;
      if (shouldSuppressRemoteParam(evenPanParam, evenPanRaw, now)) continue;

      const oddPan = valueToPan(oddPanRaw);
      const evenPan = valueToPan(evenPanRaw);

      if (isAx32) {
        const pairBit = 1 << Math.floor((odd - 1) / 2);
        linksFromMesa[key] = (ax32LinkMask & pairBit) !== 0;
        continue;
      }

      // Link inference uses broad odd->even mirror signature observed on desk link.
      // Pan lock alone is insufficient; mirror signature alone is risky when channels
      // are intentionally matched. We require both signals together.
      let mirroredControls = 0;
      let comparedControls = 0;

      CHANNEL_LINK_MIRROR_BASES.forEach((base) => {
        const oddParam = channelParam(odd, base);
        const evenParam = channelParam(even, base);
        const oddValue = values.get(oddParam);
        const evenValue = values.get(evenParam);

        if (oddValue === undefined || evenValue === undefined) return;
        if (shouldSuppressRemoteParam(oddParam, oddValue, now)) return;
        if (shouldSuppressRemoteParam(evenParam, evenValue, now)) return;

        comparedControls += 1;
        if (oddValue === evenValue) mirroredControls += 1;
      });

      const hasPanLock = oddPan === 0 && evenPan === 200;
      const hasDeskUnlinkSignature = oddPan === 0 && evenPan === 0;
      const hasStrongMirrorSignature =
        comparedControls >= 6 &&
        mirroredControls >= Math.max(5, Math.ceil(comparedControls * 0.5));

      if (hasDeskUnlinkSignature && hasStrongMirrorSignature) {
        linksFromMesa[key] = false;
        continue;
      }

      linksFromMesa[key] =
        comparedControls >= 6
          ? hasPanLock && hasStrongMirrorSignature
          : hasPanLock || Boolean(channelLinks[key]);
    }

    setChannelLinks((current) => {
      const next = { ...current };

      for (const [key, linked] of Object.entries(linksFromMesa)) {
        if (isChannelPairTransitionLocked(key)) continue;
        next[key] = linked;
      }

      return next;
    });

    setChannels((current) => {
      const next = [...current];

      for (let odd = 1; odd <= maxPairOdd; odd += 2) {
        const even = odd + 1;
        const key = pairKey(odd, even);
        const oddPanParam = channelParam(odd, 75);
        const evenPanParam = channelParam(even, 75);
        const oddPanRaw = values.get(oddPanParam);
        const evenPanRaw = values.get(evenPanParam);
        if (oddPanRaw === undefined || evenPanRaw === undefined) continue;
        if (shouldSuppressRemoteParam(oddPanParam, oddPanRaw, now)) continue;
        if (shouldSuppressRemoteParam(evenPanParam, evenPanRaw, now)) continue;

        const oddPan = valueToPan(oddPanRaw);
        const evenPan = valueToPan(evenPanRaw);
        const oddColor = normalizeColorByScope(
          "input",
          valueToColorId(values.get(channelColorParam(odd)) ?? 1)
        );
        const evenColor = normalizeColorByScope(
          "input",
          valueToColorId(values.get(channelColorParam(even)) ?? 1)
        );
        const linked = Boolean(linksFromMesa[key]);

        next[odd - 1] = {
          ...next[odd - 1],
          pan: oddPan,
          colorId: oddColor,
        };
        next[even - 1] = {
          ...next[even - 1],
          pan: evenPan,
          colorId: linked ? oddColor : evenColor,
        };
      }

      return next;
    });

    setProcessorStates((current) => {
      const next = [...current];

      for (let odd = 1; odd <= maxPairOdd; odd += 2) {
        const even = odd + 1;
        const key = pairKey(odd, even);
        if (!linksFromMesa[key]) continue;

        next[even - 1] = cloneProcessorState(next[odd - 1]);
      }

      return next;
    });
  }

  async function syncMasterState() {
    const client = clientRef.current;
    if (!client) return;

    const masterParams = getMasterParams();
    const response = await client.readParams(Object.values(masterParams));
    const values = new Map(response.map((item) => [item.param, item.value]));

    const leftFaderDb = valueToFaderDb(
      values.get(masterParams.leftFader) ?? 1200
    );
    const rightFaderDb = valueToFaderDb(
      values.get(masterParams.rightFader) ?? 1200
    );

    const rawLeftColor = values.get(masterParams.leftColor);
    const rawRightColor = values.get(masterParams.rightColor);

    if (rawLeftColor !== undefined && Math.round(rawLeftColor) !== MASTER_FIXED_COLOR_ID) {
      client.setMasterColor("left", MASTER_FIXED_COLOR_ID);
    }

    if (rawRightColor !== undefined && Math.round(rawRightColor) !== MASTER_FIXED_COLOR_ID) {
      client.setMasterColor("right", MASTER_FIXED_COLOR_ID);
    }

    updateMasterState({
      leftMuted: valueToMute(values.get(masterParams.leftMute) ?? 1),
      rightMuted: valueToMute(values.get(masterParams.rightMute) ?? 1),
      leftColorId: MASTER_FIXED_COLOR_ID,
      rightColorId: MASTER_FIXED_COLOR_ID,
      leftFaderDb,
      rightFaderDb,
      leftFaderPosition: dbToFaderPosition(leftFaderDb),
      rightFaderPosition: dbToFaderPosition(rightFaderDb),
    });
  }

  async function syncMasterProcessorState(side: "left" | "right" = "left") {
    const client = clientRef.current;
    if (!client) return;

    const p = masterProcessorParams(side);
    const eqBandParams = Array.from({ length: 7 }, (_, index) => p.eqBandBase + index * 4);
    const params = [
      p.compEnabled,
      p.compRatio,
      p.compAttack,
      p.compRelease,
      p.compThreshold,
      p.compGain,
      p.eqEnabled,
      p.hpfTypeSlope,
      p.hpfFreq,
      p.lpfTypeSlope,
      p.lpfFreq,
      ...eqBandParams.flatMap((bandBase) => [bandBase, bandBase + 1, bandBase + 2]),
    ];

    const response = await client.readParams(params, 1400);
    const values = new Map(response.map((item) => [item.param, item.value]));

    setMasterProcessorState((current) => {
      const rawHpfFreq = values.get(p.hpfFreq);
      const rawLpfFreq = values.get(p.lpfFreq);
      const rawHpfTypeSlope = values.get(p.hpfTypeSlope);
      const rawLpfTypeSlope = values.get(p.lpfTypeSlope);
      const nextHpfEnabled =
        rawHpfFreq === undefined
          ? current.eq.hpfEnabled
          : inferHpfEnabledFromRaw(rawHpfFreq, current.eq.hpfEnabled);
      const nextLpfEnabled =
        rawLpfFreq === undefined
          ? current.eq.lpfEnabled
          : inferLpfEnabledFromRaw(rawLpfFreq, current.eq.lpfEnabled);

      return {
        ...current,
        comp: {
          ...current.comp,
          enabled: valueToBoolean(values.get(p.compEnabled) ?? (current.comp.enabled ? 1 : 0)),
          ratio: valueToCompRatio(values.get(p.compRatio) ?? Math.round(current.comp.ratio * 100)),
          attack: valueToCompTime(values.get(p.compAttack) ?? Math.round(current.comp.attack * 10)),
          release: valueToCompTime(values.get(p.compRelease) ?? Math.round(current.comp.release * 10)),
          threshold:
            values.get(p.compThreshold) !== undefined
              ? valueToCompThreshold(values.get(p.compThreshold) as number)
              : current.comp.threshold,
          gain: valueToCompGain(values.get(p.compGain) ?? 1200 + Math.round(current.comp.gain * 10)),
        },
        eq: {
          ...current.eq,
          enabled: valueToBoolean(values.get(p.eqEnabled) ?? (current.eq.enabled ? 1 : 0)),
          hpfEnabled: nextHpfEnabled,
          hpfType:
            rawHpfTypeSlope === undefined
              ? current.eq.hpfType
              : valueToHpfTypeSlope(rawHpfTypeSlope).type,
          hpfSlope:
            rawHpfTypeSlope === undefined
              ? current.eq.hpfSlope
              : valueToHpfTypeSlope(rawHpfTypeSlope).slope,
          hpfFreq:
            shouldKeepCachedHpfFreq(rawHpfFreq)
              ? current.eq.hpfFreq
              : resolveHpfFreqFromRaw(rawHpfFreq, current.eq.hpfFreq),
          lpfEnabled: nextLpfEnabled,
          lpfType:
            rawLpfTypeSlope === undefined
              ? current.eq.lpfType
              : valueToLpfTypeSlope(rawLpfTypeSlope).type,
          lpfSlope:
            rawLpfTypeSlope === undefined
              ? current.eq.lpfSlope
              : valueToLpfTypeSlope(rawLpfTypeSlope).slope,
          lpfFreq:
            shouldKeepCachedLpfFreq(rawLpfFreq)
              ? current.eq.lpfFreq
              : resolveLpfFreqFromRaw(rawLpfFreq, current.eq.lpfFreq),
          bands: current.eq.bands.map((bandState, index) => {
            const bandBase = p.eqBandBase + index * 4;
            const freqRaw = values.get(bandBase);
            const gainRaw = values.get(bandBase + 1);
            const qRaw = values.get(bandBase + 2);
            const hasBandValue = freqRaw !== undefined || gainRaw !== undefined || qRaw !== undefined;

            if (!hasBandValue) {
              return bandState;
            }

            return {
              ...bandState,
              freq: freqRaw !== undefined ? valueToFrequency(freqRaw) : bandState.freq,
              gain: gainRaw !== undefined ? valueToEqGain(gainRaw) : bandState.gain,
              q: qRaw !== undefined ? valueToEqQ(qRaw) : bandState.q,
            };
          }),
        },
      };
    });
  }

  async function syncFxColors() {
    const client = clientRef.current;
    if (!client) return;

    const fxCount = getFxBusCount();
    const params = Array.from({ length: fxCount }, (_, index) => fxColorParam(index + 1)).filter(
      (param): param is number => typeof param === "number"
    );

    if (params.length === 0) return;

    const response = await client.readParams(params);
    const values = new Map(response.map((item) => [item.param, item.value]));

    setFxStrips((current) =>
      current.map((strip, index) => {
        const fx = index + 1;
        if (fx > fxCount) return strip;

        const colorParam = fxColorParam(fx);
        if (colorParam === undefined) return strip;

        const raw = values.get(colorParam);
        if (raw === undefined) return strip;

        const nextColorId = resolveMesaColorByScope("fx", raw);

        if (nextColorId === undefined) return strip;

        return {
          ...strip,
          colorId: nextColorId,
        };
      })
    );
  }

  async function syncFxPresetState(fxNumber = 1) {
    const client = clientRef.current;
    if (!client) return;

    const presetParams = getFxPresetParams(fxNumber);

    try {
      const response = await client.readParams(
        [presetParams.preset, presetParams.controlA, presetParams.controlB],
        1200
      );
      const values = new Map(response.map((item) => [item.param, item.value]));

      const presetRaw = values.get(presetParams.preset) ?? 1;
      const controlARaw = values.get(presetParams.controlA) ?? 0;
      const controlBRaw = values.get(presetParams.controlB) ?? 0;

      const presetId = validateFxPresetId(presetRaw);
      updateFxPresetState(fxNumber, () => ({
        presetId: presetId ?? 1,
        controlAValue: Math.max(0, Math.min(127, controlARaw)),
        controlBValue: Math.max(0, Math.min(127, controlBRaw)),
      }));
    } catch {
      updateFxPresetState(fxNumber, () => createDefaultFxPresetState());
    }
  }

  async function syncAllFxPresetState() {
    const fxCount = getFxBusCount();

    for (let fx = 1; fx <= fxCount; fx += 1) {
      await syncFxPresetState(fx);
    }
  }

  async function syncLinkStates() {
    const client = clientRef.current;
    if (!client) return;

    const linkMaskParam = getLinkMaskParam();
    const response = await client.readParams([linkMaskParam]);
    const value3056 = response[0]?.value;

    if (value3056 === undefined) {
      return;
    }

    applyLinkStateFromRead(value3056, linkMaskParam);
  }

  function applyLinkStateFromRead(value: number, linkMaskParam = getLinkMaskParam()) {
    const now = Date.now();
    cleanupStaleLocalWriteTracking(now);
    if (shouldSuppressRemoteParam(linkMaskParam, value, now)) {
      return;
    }

    applyLinkStateFrom3056(value);
  }

  function resolveActiveRawProfileModel(): RawParamProfileModel {
    if (!isConnected) {
      return "unknown";
    }

    if (isAx32ProfileActive()) {
      return "AX32";
    }

    return channelCount <= 16 ? "AX16" : "AX24";
  }

  function resolveRawParamSource(): RawParamSource {
    if (!isConnected) {
      return "unknown";
    }

    if (initialConnectSyncBusy || isSyncing) {
      return "bootSync";
    }

    if (status.toLowerCase().includes("reconect")) {
      return "reconnect";
    }

    return "runtime";
  }

  function buildKnownParamDescriptorsForActiveProfile() {
    const descriptorByParam = new Map<number, ProfileAwareParamDescriptor>();

    const addDescriptor = (
      paramId: number,
      decodedEntity?: string,
      decodedProperty?: string,
      knownStatus: ProfileAwareParamDescriptor["knownStatus"] = "known"
    ) => {
      const current = descriptorByParam.get(paramId);
      if (current) {
        descriptorByParam.set(paramId, {
          ...current,
          knownStatus,
          decodedEntity: current.decodedEntity ?? decodedEntity,
          decodedProperty: current.decodedProperty ?? decodedProperty,
        });
        return;
      }

      descriptorByParam.set(paramId, {
        paramId,
        knownStatus,
        decodedEntity,
        decodedProperty,
      });
    };

    for (let channel = 1; channel <= channelCount; channel += 1) {
      getChannelSyncParams(channel).forEach((paramId) => {
        addDescriptor(paramId);
      });

      getActiveSendIds().forEach((sendId) => {
        addDescriptor(sendIdToParam(channel, sendId), `channel:${channel}`, `send:${sendId}`);
      });

      addDescriptor(channelParam(channel, 76), `channel:${channel}`, "fader");
      addDescriptor(channelParam(channel, 74), `channel:${channel}`, "mute");
      addDescriptor(channelParam(channel, 87), `channel:${channel}`, "soloLeft");
      addDescriptor(channelParam(channel, 88), `channel:${channel}`, "soloRight");
      addDescriptor(channelParam(channel, 75), `channel:${channel}`, "pan");
    }

    const auxCount = getAuxBusCount();
    for (let aux = 1; aux <= auxCount; aux += 1) {
      const auxStateParams = getAuxStateParams(aux);
      addDescriptor(auxStateParams.fader, `aux:${aux}`, "fader");
      addDescriptor(auxStateParams.mute, `aux:${aux}`, "mute");
      addDescriptor(auxStateParams.color, `aux:${aux}`, "color");
      addDescriptor(auxStateParams.phase, `aux:${aux}`, "phase");
      Object.values(auxProcessorParams(aux)).forEach((paramId) => {
        addDescriptor(paramId as number, `aux:${aux}`);
      });
    }

    const fxCount = getFxBusCount();
    for (let fx = 1; fx <= fxCount; fx += 1) {
      const fxStateParams = getFxStateParams(fx);
      addDescriptor(fxStateParams.fader, `fx:${fx}`, "fader");
      addDescriptor(fxStateParams.mute, `fx:${fx}`, "mute");
      const fxProcessorParams = getFxProcessorParams(fx);
      if (fxProcessorParams) {
        Object.values(fxProcessorParams).forEach((paramId) => {
          addDescriptor(paramId);
        });
      }
    }

    const masterParams = getMasterParams();
    addDescriptor(getChannelLinkParam(), "global", "channelLink");
    addDescriptor(getLinkMaskParam(), "global", "auxMasterLinkMask");
    addDescriptor(masterParams.leftFader, "master:left", "fader");
    addDescriptor(masterParams.rightFader, "master:right", "fader");
    addDescriptor(masterParams.leftMute, "master:left", "mute");
    addDescriptor(masterParams.rightMute, "master:right", "mute");
    addDescriptor(masterParams.leftColor, "master:left", "color");
    addDescriptor(masterParams.rightColor, "master:right", "color");
    addDescriptor(masterSoloLeftParam(), "master:left", "solo");
    addDescriptor(masterSoloAuxLeftParam(), "master:left", "soloAux");
    addDescriptor(masterSoloRightParam(), "master:right", "solo");
    addDescriptor(masterSoloAuxRightParam(), "master:right", "soloAux");
    addDescriptor(getLinkMaskParam(), "global", "linkMask");

    (["left", "right"] as const).forEach((side) => {
      const processor = masterProcessorParams(side);
      Object.entries(processor).forEach(([property, paramId]) => {
        addDescriptor(paramId, `master:${side}`, property);
      });
      Array.from({ length: 7 }, (_, index) => processor.eqBandBase + index * 4).forEach(
        (paramId, index) => addDescriptor(paramId, `master:${side}`, `eqBand${index + 1}`)
      );
    });

    for (let fx = 1; fx <= fxCount; fx += 1) {
      Object.entries(getFxPresetParams(fx)).forEach(([property, paramId]) => {
        addDescriptor(paramId, `fx:${fx}`, `preset:${property}`);
      });
    }

    activeDcaIds.forEach((id) => {
      addDescriptor(getDcaOnOffParam(id), `dca:${id}`, "enabled");
      addDescriptor(getDcaFaderParam(id), `dca:${id}`, "fader");
      getDcaMemberParams(id).forEach((paramId) => addDescriptor(paramId));
    });

    getMuteIdsForActiveProfile().forEach((id) => {
      addDescriptor(getMuteGroupActiveParam(id), `muteGroup:${id}`, "active");
      getMuteGroupMemberParams(id).forEach((paramId) => addDescriptor(paramId));
    });

    // Input Source Mode and related channel params per profile.
    if (isAx32ProfileActive()) {
      // AX32: Record Out To Channel (2565-2596), Input Source Mode (2661-2692),
      // Physical Input Mapping (2693-2724) — all 32 slots registered unconditionally
      // so params arriving via 0x03 before the record-out map is built are still classified.
      for (let slot = 1; slot <= 32; slot += 1) {
        addDescriptor(2564 + slot, `recordSlot:${slot}`, "recordOutToChannel");
        addDescriptor(2660 + slot, `recordSlot:${slot}`, "inputSourceMode");
        addDescriptor(2692 + slot, `channel:${slot}`, "physicalInputMapping");
      }
    } else {
      // AX16/AX24: inputLevel, recPlayVolume, inputSourceMode — indexed by channelIndex (0-based).
      for (let ch = 1; ch <= channelCount; ch += 1) {
        addDescriptor(2815 + (ch - 1), `channel:${ch}`, "inputLevel");
        addDescriptor(2833 + (ch - 1), `channel:${ch}`, "recPlayVolume");
        addDescriptor(2849 + (ch - 1), `channel:${ch}`, "inputSourceMode");
      }
    }

    return Array.from(descriptorByParam.values());
  }

  function publishRawParamDebugSnapshot(now = Date.now()) {
    if (now - rawParamDebugLastPublishAtRef.current < 250) {
      return;
    }

    rawParamDebugLastPublishAtRef.current = now;

    if (typeof window === "undefined") {
      return;
    }

    const target = window as unknown as {
      __AX_RAW_PARAM_DEBUG__?: unknown;
    };

    target.__AX_RAW_PARAM_DEBUG__ = rawParamStoreRef.current.getRawParamStoreSnapshot();
  }

  function upsertRawParamFromTransport(
    paramId: number,
    value: number,
    timestamp: number,
    source: RawParamSource
  ) {
    const profileModel = resolveActiveRawProfileModel();
    const classification = profileAwareRegistryRef.current.classifyParam(paramId, profileModel);

    rawParamStoreRef.current.upsertRawParam({
      paramId,
      value,
      activeProfile: profileModel,
      timestamp,
      source,
      knownStatus: classification.knownStatus,
      decodedEntity: classification.decodedEntity,
      decodedProperty: classification.decodedProperty,
    });

    publishRawParamDebugSnapshot(timestamp);
  }

  function clearScheduledSendWrites() {
    sendWriteTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    sendWriteTimersRef.current.clear();
    sendWriteLastAtRef.current.clear();
    sendWritePendingRef.current.clear();
  }

  function clearLocalParamWriteTracking() {
    localParamWriteUnsubscribeRef.current?.();
    localParamWriteUnsubscribeRef.current = null;
    remoteParamReadUnsubscribeRef.current?.();
    remoteParamReadUnsubscribeRef.current = null;
    recentLocalParamWritesRef.current.clear();
  }

  function handleLocalParamWrite(write: LocalParamWrite) {
    recentLocalParamWritesRef.current.set(write.param, write);
    upsertRawParamFromTransport(write.param, write.value, write.at, "userTxEcho");
  }

  function routeRxParamToDetailView(paramId: number) {
    const view = detailViewRef.current;
    if (!view) return;

    const store = rawParamStoreRef.current;

    function buildValuesFromStore(paramRecord: Record<string, number | undefined>): Map<number, number> {
      const map = new Map<number, number>();
      for (const id of Object.values(paramRecord)) {
        if (typeof id !== "number") continue;
        const entry = store.getRawParam(id);
        if (entry) map.set(id, entry.value);
      }
      return map;
    }

    if (view.type === "channel") {
      const ch = view.channel;
      const proc = processorParams(ch);
      const procIds = new Set(Object.values(proc));
      if (procIds.has(paramId)) {
        applyChannelProcessorStateFromValues(ch, buildValuesFromStore(proc), proc);
        return;
      }
      const sendIds = getActiveSendIds();
      for (const sendId of sendIds) {
        try {
          if (sendIdToParam(ch, sendId) !== paramId) continue;
          const decoded = decodeSendRawValue(store.getRawParam(paramId)?.value);
          setChannelSendValues((cur) =>
            cur[sendId] === decoded.value ? cur : { ...cur, [sendId]: decoded.value }
          );
          setSendTapPoints((cur) =>
            cur[sendId] === decoded.tapPoint ? cur : { ...cur, [sendId]: decoded.tapPoint }
          );
          return;
        } catch { /* invalid sendId for this profile */ }
      }
      return;
    }

    if (view.type === "aux") {
      const aux = view.aux;
      const params = auxProcessorParams(aux);
      const allIds = Object.values(params).filter((v): v is number => typeof v === "number");
      if (!allIds.includes(paramId)) return;
      applyAuxProcessorStateFromValues(aux, buildValuesFromStore(params as Record<string, number | undefined>), params);
      return;
    }

    if (view.type === "fx") {
      const fx = view.fx;
      const fxProc = getFxProcessorParams(fx);
      if (!fxProc) return;
      const allIds = Object.values(fxProc).filter((v): v is number => typeof v === "number");
      if (!allIds.includes(paramId)) return;
      const values = buildValuesFromStore(fxProc as Record<string, number | undefined>);
      if (!values.has(fxProc.eqEnabled)) return;
      applyFxStateFromValues(fx, values, getFxStateParams(fx));
      return;
    }
  }

  function handleRemoteParamRead(read: RemoteParamRead) {
    if (shouldSuppressRemoteParam(read.param, read.value, read.at)) {
      return;
    }

    upsertRawParamFromTransport(read.param, read.value, read.at, resolveRawParamSource());
    routeRxParamToDetailView(read.param);

    // Semantic apply — Input Source Mode received from mixer (opcode 0x03 or polling).
    // AX16/AX24: params 2849..(2849 + channelCount - 1), indexed by channel (0-based).
    if (!isAx32ProfileActive()) {
      const ax1624InputSourceBase = 2849;
      if (read.param >= ax1624InputSourceBase && read.param < ax1624InputSourceBase + channelCount) {
        const channelNumber = read.param - ax1624InputSourceBase + 1;
        updateChannelState(channelNumber, { usbInputOn: read.value === 0 });
      }
    }

    if (isAx32ProfileActive()) {
      // AX32: Input Source Mode params 2661..2692 (slot 1..32).
      // Reverse-lookup: find which channel has this USB return slot assigned.
      if (read.param >= 2661 && read.param <= 2692) {
        const usbReturnSlot = read.param - 2660;
        for (const [channelNumber, slot] of usbReturnOutputPatchMapRef.current.entries()) {
          if (slot === usbReturnSlot) {
            updateChannelState(channelNumber, { usbInputOn: read.value === 0 });
            break;
          }
        }
      }

      // AX32: Record Out To Channel params 2565..2596 received — debounce re-sync of the
      // record-out map so the Input Source Mode lookup stays consistent.
      if (read.param >= 2565 && read.param <= 2596) {
        if (recordOutRxDebounceTimerRef.current !== null) {
          window.clearTimeout(recordOutRxDebounceTimerRef.current);
        }
        recordOutRxDebounceTimerRef.current = window.setTimeout(() => {
          recordOutRxDebounceTimerRef.current = null;
          void syncUsbReturnOutputPatchMap().catch(() => {});
        }, 350);
      }
    }

    if (
      isAx32ProfileActive() &&
      ((read.param >= 2 && read.param <= 255) ||
        read.param === 2862 ||
        read.param === 1947 ||
        read.param === 1948 ||
        read.param === 4644 ||
        read.param === 4645 ||
        read.param === 4753 ||
        read.param === 4754)
    ) {
      const current = remoteWsCaptureRef.current.get(read.param);
      remoteWsCaptureRef.current.set(read.param, {
        value: read.value,
        at: read.at,
        changes: current ? current.changes + 1 : 1,
      });

      if (read.at - remoteWsCaptureLastStatusAtRef.current >= 900) {
        remoteWsCaptureLastStatusAtRef.current = read.at;
        const active = Array.from(remoteWsCaptureRef.current.entries())
          .filter(([, sample]) => sample.value !== 0 && read.at - sample.at <= 2500)
          .sort((a, b) => {
            if (b[1].changes !== a[1].changes) {
              return b[1].changes - a[1].changes;
            }
            return b[1].at - a[1].at;
          })
          .slice(0, 8)
          .map(([param, sample]) => `${param}:${sample.value}`);

        if (typeof window !== "undefined") {
          const target = window as unknown as {
            __AX_WS_CAPTURE__?: unknown;
          };
          target.__AX_WS_CAPTURE__ = Array.from(remoteWsCaptureRef.current.entries()).map(
            ([param, sample]) => ({
              param,
              value: sample.value,
              at: sample.at,
              changes: sample.changes,
            })
          );
        }

        if (active.length > 0) {
          setStatus(`WS ativos: ${active.join(" ")}`);
        }
      }
    }
  }

  function shouldSuppressRemoteParam(param: number, value: number, now = Date.now()) {
    const recentWrite = recentLocalParamWritesRef.current.get(param);
    if (!recentWrite) return false;

    if (now - recentWrite.at > LOCAL_WRITE_ECHO_SUPPRESSION_MS) {
      recentLocalParamWritesRef.current.delete(param);
      return false;
    }

    if (recentWrite.value === value) {
      recentLocalParamWritesRef.current.delete(param);
      return false;
    }

    // Ignore short-lived remote divergence right after local writes to prevent
    // UI rollback/flicker while the desk converges (common during fader drags).
    return true;
  }

  function cleanupStaleLocalWriteTracking(now = Date.now()) {
    recentLocalParamWritesRef.current.forEach((write, param) => {
      if (now - write.at > LOCAL_WRITE_ECHO_SUPPRESSION_MS) {
        recentLocalParamWritesRef.current.delete(param);
      }
    });
  }

  function cancelScheduledFaderWrites() {
    if (faderWriteRafRef.current !== null) {
      cancelAnimationFrame(faderWriteRafRef.current);
      faderWriteRafRef.current = null;
    }

    pendingFaderWritesRef.current.clear();
  }

  function scheduleFaderWrite(key: string, write: () => void) {
    pendingFaderWritesRef.current.set(key, write);

    if (faderWriteRafRef.current !== null) {
      return;
    }

    faderWriteRafRef.current = requestAnimationFrame(() => {
      faderWriteRafRef.current = null;
      const writes = Array.from(pendingFaderWritesRef.current.values());
      pendingFaderWritesRef.current.clear();

      writes.forEach((runWrite) => {
        runWrite();
      });
    });
  }

  function writeSendParamNow(param: number, value: number) {
    const client = clientRef.current;
    if (!client) return;

    client.sendParam(param, value);
    sendWriteLastAtRef.current.set(param, Date.now());
    sendWritePendingRef.current.delete(param);
  }

  function scheduleSendParamWrite(param: number, value: number, flush = false) {
    if (flush) {
      const existingTimer = sendWriteTimersRef.current.get(param);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
        sendWriteTimersRef.current.delete(param);
      }
      writeSendParamNow(param, value);
      return;
    }

    const now = Date.now();
    const lastAt = sendWriteLastAtRef.current.get(param) ?? 0;
    const elapsed = now - lastAt;

    if (elapsed >= SEND_WRITE_THROTTLE_MS) {
      writeSendParamNow(param, value);
      return;
    }

    sendWritePendingRef.current.set(param, value);

    const existingTimer = sendWriteTimersRef.current.get(param);
    if (existingTimer !== undefined) return;

    const waitMs = SEND_WRITE_THROTTLE_MS - elapsed;
    const timer = window.setTimeout(() => {
      sendWriteTimersRef.current.delete(param);
      const pendingValue = sendWritePendingRef.current.get(param);
      if (pendingValue === undefined) return;
      writeSendParamNow(param, pendingValue);
    }, waitMs);

    sendWriteTimersRef.current.set(param, timer);
  }

  function getLinkedAuxSendTargets(sendId: SendStripId) {
    if (!sendId.startsWith("aux")) return [sendId];

    const auxNumber = Number(sendId.replace("aux", ""));
    if (!Number.isFinite(auxNumber) || auxNumber < 1 || auxNumber > getAuxBusCount()) {
      return [sendId];
    }
    const [odd, even] = getAuxPair(auxNumber);
    if (even > getAuxBusCount()) {
      return [sendId];
    }
    const key = pairKey(odd, even);

    if (!auxLinks[key]) return [sendId];

    return [`aux${odd}` as SendStripId, `aux${even}` as SendStripId];
  }

  function parseBusFromSendId(sendId: SendStripId): { busType: "aux" | "fx"; busNumber: number } | null {
    if (sendId.startsWith("aux")) {
      const busNumber = Number(sendId.replace("aux", ""));
      if (!Number.isFinite(busNumber)) return null;
      return { busType: "aux", busNumber };
    }

    if (sendId.startsWith("fx")) {
      const busNumber = Number(sendId.replace("fx", ""));
      if (!Number.isFinite(busNumber)) return null;
      return { busType: "fx", busNumber };
    }

    return null;
  }

  function resolveLinkedSendWrites(params: {
    sourceChannel: number;
    targetBusType: "aux" | "fx";
    targetBusNumber: number;
    value: number;
    offValue?: number;
    channelCount: number;
    auxCount: number;
    channelLinkState: PairLinkState;
    auxLinkState: PairLinkState;
  }) {
    const {
      sourceChannel,
      targetBusType,
      targetBusNumber,
      value,
      offValue = 0,
      channelCount: maxChannel,
      auxCount: maxAux,
      channelLinkState,
      auxLinkState,
    } = params;

    if (!Number.isInteger(sourceChannel) || sourceChannel < 1 || sourceChannel > maxChannel) {
      return [] as Array<{ channel: number; busType: "aux" | "fx"; busNumber: number; value: number }>;
    }

    const resolvedValue = Math.max(0, Math.min(1300, Math.round(value)));
    const resolvedOffValue = Math.max(0, Math.min(1300, Math.round(offValue)));

    const [channelOdd, channelEven] = getChannelPair(sourceChannel);
    const channelPairKey = pairKey(channelOdd, channelEven);
    const channelLinked = Boolean(channelLinkState[channelPairKey]);
    const channelTargets = channelLinked ? [channelOdd, channelEven] : [sourceChannel];

    let busTargets = [targetBusNumber];

    if (targetBusType === "aux") {
      if (!Number.isInteger(targetBusNumber) || targetBusNumber < 1 || targetBusNumber > maxAux) {
        return [] as Array<{ channel: number; busType: "aux" | "fx"; busNumber: number; value: number }>;
      }

      const [auxOdd, auxEven] = getAuxPair(targetBusNumber);
      const auxPairKey = pairKey(auxOdd, auxEven);
      const auxLinked = auxEven <= maxAux && Boolean(auxLinkState[auxPairKey]);
      busTargets = auxLinked ? [auxOdd, auxEven] : [targetBusNumber];
    }

    if (targetBusType === "aux" && channelTargets.length === 2 && busTargets.length === 2) {
      const [auxOdd, auxEven] = busTargets;
      return [
        { channel: channelOdd, busType: targetBusType, busNumber: auxOdd, value: resolvedValue },
        { channel: channelOdd, busType: targetBusType, busNumber: auxEven, value: resolvedOffValue },
        { channel: channelEven, busType: targetBusType, busNumber: auxOdd, value: resolvedOffValue },
        { channel: channelEven, busType: targetBusType, busNumber: auxEven, value: resolvedValue },
      ];
    }

    return channelTargets.flatMap((channel) =>
      busTargets.map((busNumber) => ({
        channel,
        busType: targetBusType,
        busNumber,
        value: resolvedValue,
      }))
    );
  }

  async function syncChannelSendsState(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const [channelOdd, channelEven] = getChannelPair(channelNumber);
    const channelKey = pairKey(channelOdd, channelEven);
    const readFromOddWhenLinked = Boolean(channelLinks[channelKey]);
    const channelForRead = readFromOddWhenLinked ? channelOdd : channelNumber;

    const sendIds = getActiveSendIds();
    const sendParams = sendIds.map((id) => sendIdToParam(channelForRead, id));
    const linkMaskParam = getLinkMaskParam();
    const response = await client.readParams([...sendParams, linkMaskParam], 2200);
    const values = new Map(response.map((item) => [item.param, item.value]));

    setChannelSendValues(() => {
      const next = createDefaultSendValues();
      const nextTapPoints = createDefaultSendTapPoints();

      sendIds.forEach((id) => {
        const param = sendIdToParam(channelForRead, id);
        const decoded = decodeSendRawValue(values.get(param));
        next[id] = decoded.value;
        nextTapPoints[id] = decoded.tapPoint;
      });

      if (readFromOddWhenLinked) {
        const auxCount = getAuxBusCount();
        for (let aux = 1; aux <= auxCount; aux += 2) {
          const even = aux + 1;
          if (even > auxCount) continue;
          const auxKey = pairKey(aux, even);
          if (!auxLinks[auxKey]) continue;

          const oddId = `aux${aux}` as SendStripId;
          const evenId = `aux${even}` as SendStripId;
          next[evenId] = next[oddId];
          nextTapPoints[evenId] = nextTapPoints[oddId];
        }
      }

      setSendTapPoints(nextTapPoints);

      return next;
    });

    const value3056 = values.get(linkMaskParam);
    if (value3056 !== undefined) {
      applyLinkStateFromRead(value3056, linkMaskParam);
    }
  }

  async function syncBusInputSendsState(busType: "aux" | "fx", busNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const mappedSendId = `${busType}${busNumber}` as SendStripId;
    const sendParams = Array.from({ length: channelCount }, (_, index) =>
      sendIdToParam(index + 1, mappedSendId)
    );
    const linkMaskParam = getLinkMaskParam();
    const response = await client.readParams([...sendParams, linkMaskParam], 2200);
    const valuesByParam = new Map(response.map((item) => [item.param, item.value]));

    const nextValues = createDefaultChannelInputSendValues(channelCount);
    const nextTapPoints = createDefaultChannelInputSendTapPoints(channelCount);

    for (let channel = 1; channel <= channelCount; channel++) {
      const id = `ch${channel}`;
      const param = sendIdToParam(channel, mappedSendId);
      const decoded = decodeSendRawValue(valuesByParam.get(param));
      nextValues[id] = decoded.value;
      nextTapPoints[id] = decoded.tapPoint;
    }

    const linkMaskValue = valuesByParam.get(linkMaskParam);
    if (linkMaskValue !== undefined) {
      applyLinkStateFromRead(linkMaskValue, linkMaskParam);
    }

    if (busType === "aux") {
      setAuxInputSendValues((current) => ({
        ...current,
        [busNumber]: nextValues,
      }));
      setAuxInputSendTapPoints((current) => ({
        ...current,
        [busNumber]: nextTapPoints,
      }));
      return;
    }

    setFxInputSendValues((current) => ({
      ...current,
      [busNumber]: nextValues,
    }));
    setFxInputSendTapPoints((current) => ({
      ...current,
      [busNumber]: nextTapPoints,
    }));
  }

  async function syncAllBusInputSendsState() {
    const auxCount = getAuxBusCount();
    const fxCount = getFxBusCount();

    for (let aux = 1; aux <= auxCount; aux++) {
      await syncBusInputSendsState("aux", aux);
    }

    for (let fx = 1; fx <= fxCount; fx++) {
      await syncBusInputSendsState("fx", fx);
    }
  }

  function channelFromInputSendId(id: SendStripId) {
    if (!id.startsWith("ch")) return null;
    const channel = Number(id.slice(2));
    if (!Number.isInteger(channel) || channel < 1 || channel > channelCount) return null;
    return channel;
  }

  function getLinkedChannelInputTargets(sendId: SendStripId) {
    const channel = channelFromInputSendId(sendId);
    if (!channel) return [sendId];

    const [odd, even] = getChannelPair(channel);
    const key = pairKey(odd, even);
    if (!channelLinks[key]) return [sendId];

    return [`ch${odd}`, `ch${even}`] as SendStripId[];
  }

  function handleBusInputSendValueChange(
    busType: "aux" | "fx",
    busNumber: number,
    sendId: SendStripId,
    nextValue: number
  ) {
    const clampedValue = Math.max(0, Math.min(1300, Math.round(nextValue)));
    const sourceChannel = channelFromInputSendId(sendId);
    if (!sourceChannel) return;

    const resolvedWrites = resolveLinkedSendWrites({
      sourceChannel,
      targetBusType: busType,
      targetBusNumber: busNumber,
      value: clampedValue,
      offValue: 0,
      channelCount,
      auxCount: getAuxBusCount(),
      channelLinkState: channelLinks,
      auxLinkState: auxLinks,
    });

    if (resolvedWrites.length === 0) return;

    if (busType === "aux") {
      setAuxInputSendValues((current) => {
        const next = { ...current };
        resolvedWrites.forEach(({ channel, busNumber: targetBus, value }) => {
          const channelTarget = `ch${channel}`;
          next[targetBus] = {
            ...(next[targetBus] ?? createDefaultChannelInputSendValues(channelCount)),
            [channelTarget]: value,
          };
        });
        return next;
      });
    } else {
      setFxInputSendValues((current) => ({
        ...current,
        [busNumber]: {
          ...(current[busNumber] ?? createDefaultChannelInputSendValues(channelCount)),
          ...resolvedWrites.reduce<Record<string, number>>((acc, write) => {
            if (write.busNumber !== busNumber) return acc;
            acc[`ch${write.channel}`] = write.value;
            return acc;
          }, {}),
        },
      }));
    }

    resolvedWrites.forEach(({ channel, busNumber: targetBus, value }) => {
      const mappedSendId = `${busType}${targetBus}` as SendStripId;
      const channelTarget = `ch${channel}`;
      const tapPoint =
        busType === "aux"
          ? auxInputSendTapPoints[targetBus]?.[channelTarget] ?? "post"
          : fxInputSendTapPoints[targetBus]?.[channelTarget] ?? "post";
      const param = sendIdToParam(channel, mappedSendId);
      scheduleSendParamWrite(param, encodeSendRawValue(value, tapPoint));
    });
  }

  function handleBusInputSendTapPointToggle(
    busType: "aux" | "fx",
    busNumber: number,
    sendId: SendStripId
  ) {
    const busTargets = busType === "aux" ? getLinkedAuxTargets(busNumber) : [busNumber];
    const channelTargets = getLinkedChannelInputTargets(sendId);
    const nextTapByTarget = new Map<string, SendTapPoint>();

    if (busType === "aux") {
      busTargets.forEach((target) => {
        const currentTap = auxInputSendTapPoints[target]?.[sendId] ?? "post";
        const toggled = currentTap === "post" ? "pre" : "post";

        channelTargets.forEach((channelTarget) => {
          nextTapByTarget.set(`${target}:${channelTarget}`, toggled);
        });
      });

      setAuxInputSendTapPoints((current) => {
        const next = { ...current };

        busTargets.forEach((target) => {
          next[target] = {
            ...(next[target] ?? createDefaultChannelInputSendTapPoints(channelCount)),
            ...channelTargets.reduce<Record<string, SendTapPoint>>((acc, channelTarget) => {
              acc[channelTarget] = nextTapByTarget.get(`${target}:${channelTarget}`) ?? "post";
              return acc;
            }, {}),
          };
        });

        return next;
      });
    } else {
      const currentTap = fxInputSendTapPoints[busNumber]?.[sendId] ?? "post";
      const toggled = currentTap === "post" ? "pre" : "post";

      channelTargets.forEach((channelTarget) => {
        nextTapByTarget.set(`${busNumber}:${channelTarget}`, toggled);
      });

      setFxInputSendTapPoints((current) => ({
        ...current,
        [busNumber]: {
          ...(current[busNumber] ?? createDefaultChannelInputSendTapPoints(channelCount)),
          ...channelTargets.reduce<Record<string, SendTapPoint>>((acc, channelTarget) => {
            acc[channelTarget] = nextTapByTarget.get(`${busNumber}:${channelTarget}`) ?? "post";
            return acc;
          }, {}),
        },
      }));
    }

    busTargets.forEach((busTarget) => {
      const mappedSendId = `${busType}${busTarget}` as SendStripId;

      channelTargets.forEach((channelTarget) => {
        const channel = channelFromInputSendId(channelTarget);
        if (!channel) return;

        const baseValue =
          busType === "aux"
            ? auxInputSendValues[busTarget]?.[channelTarget] ?? 1200
            : fxInputSendValues[busTarget]?.[channelTarget] ?? 1200;
        const tapPoint = nextTapByTarget.get(`${busTarget}:${channelTarget}`) ?? "post";
        const param = sendIdToParam(channel, mappedSendId);
        scheduleSendParamWrite(param, encodeSendRawValue(baseValue, tapPoint), true);
      });
    });

    // Re-read from desk shortly after toggling to avoid UI/desync drift.
    window.setTimeout(() => {
      busTargets.forEach((busTarget) => {
        syncBusInputSendsState(busType, busTarget).catch(() => {
          // Keep optimistic state if a transient read fails.
        });
      });
    }, 180);
  }

  function handleSendValueChange(channelNumber: number, sendId: SendStripId, nextValue: number) {
    const clampedValue = Math.max(0, Math.min(1300, Math.round(nextValue)));
    const parsedBus = parseBusFromSendId(sendId);
    if (!parsedBus) return;

    const resolvedWrites = resolveLinkedSendWrites({
      sourceChannel: channelNumber,
      targetBusType: parsedBus.busType,
      targetBusNumber: parsedBus.busNumber,
      value: clampedValue,
      offValue: 0,
      channelCount,
      auxCount: getAuxBusCount(),
      channelLinkState: channelLinks,
      auxLinkState: auxLinks,
    });

    if (resolvedWrites.length === 0) return;

    setChannelSendValues((current) => {
      const next = { ...current };

      if (parsedBus.busType === "aux") {
        const targets = getLinkedAuxSendTargets(sendId);
        targets.forEach((target) => {
          next[target] = clampedValue;
        });
      } else {
        next[sendId] = clampedValue;
      }

      return next;
    });

    resolvedWrites.forEach(({ channel, busType: writeBusType, busNumber, value }) => {
      const target = `${writeBusType}${busNumber}` as SendStripId;
      const param = sendIdToParam(channel, target);
      const tapPoint = sendTapPoints[target] ?? "post";
      scheduleSendParamWrite(param, encodeSendRawValue(value, tapPoint));
    });
  }

  function handleSendTapPointToggle(channelNumber: number, sendId: SendStripId) {
    const targets = getLinkedAuxSendTargets(sendId);
    const nextTapByTarget = new Map<SendStripId, SendTapPoint>();

    targets.forEach((target) => {
      const currentTap = sendTapPoints[target] ?? "post";
      const toggled = currentTap === "post" ? "pre" : "post";
      nextTapByTarget.set(target, toggled);
    });

    setSendTapPoints((current) => {
      const next = { ...current };

      targets.forEach((target) => {
        next[target] = nextTapByTarget.get(target) ?? "post";
      });

      return next;
    });

    targets.forEach((target) => {
      const param = sendIdToParam(channelNumber, target);
      const baseValue = channelSendValues[target] ?? 1200;
      const tapPoint = nextTapByTarget.get(target) ?? "post";
      scheduleSendParamWrite(param, encodeSendRawValue(baseValue, tapPoint), true);
    });

    // Re-read from desk shortly after toggling to avoid UI/desync drift.
    window.setTimeout(() => {
      syncChannelSendsState(channelNumber).catch(() => {
        // Keep optimistic state if a transient read fails.
      });
    }, 180);
  }

  async function syncAuxState(auxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = getAuxStateParams(auxNumber);
    const response = await client.readParams(Object.values(params), 2200);
    const values = new Map(response.map((item) => [item.param, item.value]));

    applyAuxStateFromValues(auxNumber, values, params);
  }

  async function syncAuxProcessorState(auxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = auxProcessorParams(auxNumber);
    const response = await client.readParams(Object.values(params), 2200);
    const values = new Map(response.map((item) => [item.param, item.value]));

    applyAuxProcessorStateFromValues(auxNumber, values, params);
  }

  async function syncAllAux() {
    const auxCount = getAuxBusCount();
    if (isAx32ProfileActive()) {
      const auxBatchSize = 4;

      for (let aux = 1; aux <= auxCount; aux += auxBatchSize) {
        const batch = Array.from(
          { length: Math.min(auxBatchSize, auxCount - aux + 1) },
          (_, index) => aux + index
        );

        await syncAuxBatch(batch);
      }
      return;
    }

    for (let aux = 1; aux <= auxCount; aux++) {
      await syncAuxState(aux);
      await syncAuxProcessorState(aux);
    }
  }

  async function syncAllSoloStates() {
    const client = clientRef.current;
    if (!client || meterBusyRef.current) return;

    // Se os meters acabaram de atualizar, prioriza responsividade visual.
    if (Date.now() - meterUpdateLastAtRef.current < 320) return;

    // Read solo left+right params for all visible channels (base=87, stride=62)
    const channelParams: number[] = [];
    for (let ch = 1; ch <= channelCount; ch++) {
      channelParams.push(channelParam(ch, 87));
      channelParams.push(channelParam(ch, 88));
    }

    // Read aux solo params (base=1688, stride=109)
    const auxParams: number[] = [];
    const auxCount = getAuxBusCount();
    for (let aux = 1; aux <= auxCount; aux++) {
      const left = auxSoloLeftParam(aux);
      auxParams.push(left);
      auxParams.push(left + 1);
    }

    const fxParams: number[] = [];
    const fxCount = getFxBusCount();
    for (let fx = 1; fx <= fxCount; fx++) {
      const left = fxSoloLeftParam(fx);
      fxParams.push(left);
      fxParams.push(left + 1);
    }

    const masterParams = [
      masterSoloLeftParam(),
      masterSoloAuxLeftParam(),
      masterSoloRightParam(),
      masterSoloAuxRightParam(),
    ];

    try {
      const chResponse = await client.readParams(channelParams, 260);
      const chValues = new Map(chResponse.map((item) => [item.param, item.value]));

      setChannels((current) => {
        const next = [...current];
        for (let ch = 1; ch <= channelCount; ch++) {
          const leftVal = chValues.get(channelParam(ch, 87)) ?? 0;
          const rightVal = chValues.get(channelParam(ch, 88)) ?? 0;
          const soloOn = leftVal > 0 || rightVal > 0;
          if (next[ch - 1].soloOn !== soloOn) {
            next[ch - 1] = { ...next[ch - 1], soloOn };
          }
        }

        for (let odd = 1; odd <= channelCount - 1; odd += 2) {
          const even = odd + 1;
          const key = pairKey(odd, even);
          if (!channelLinks[key]) continue;

          const pairSoloOn = next[odd - 1].soloOn || next[even - 1].soloOn;
          if (next[odd - 1].soloOn !== pairSoloOn) {
            next[odd - 1] = { ...next[odd - 1], soloOn: pairSoloOn };
          }
          if (next[even - 1].soloOn !== pairSoloOn) {
            next[even - 1] = { ...next[even - 1], soloOn: pairSoloOn };
          }
        }

        return next;
      });

      const auxResponse = await client.readParams(auxParams, 260);
      const auxValues = new Map(auxResponse.map((item) => [item.param, item.value]));

      setAuxStrips((current) => {
        const next = [...current];
        const auxCount = getAuxBusCount();
        for (let aux = 1; aux <= auxCount; aux++) {
          const left = auxSoloLeftParam(aux);
          const leftVal = auxValues.get(left) ?? 0;
          const rightVal = auxValues.get(left + 1) ?? 0;
          const soloOn = leftVal > 0 || rightVal > 0;
          if (next[aux - 1].soloOn !== soloOn) {
            next[aux - 1] = { ...next[aux - 1], soloOn };
          }
        }

        for (let odd = 1; odd <= auxCount - 1; odd += 2) {
          const even = odd + 1;
          const key = pairKey(odd, even);
          if (!auxLinks[key]) continue;

          const pairSoloOn = next[odd - 1].soloOn || next[even - 1].soloOn;
          if (next[odd - 1].soloOn !== pairSoloOn) {
            next[odd - 1] = { ...next[odd - 1], soloOn: pairSoloOn };
          }
          if (next[even - 1].soloOn !== pairSoloOn) {
            next[even - 1] = { ...next[even - 1], soloOn: pairSoloOn };
          }
        }

        return next;
      });

      const fxResponse = await client.readParams(fxParams, 260);
      const fxValues = new Map(fxResponse.map((item) => [item.param, item.value]));

      setFxStrips((current) => {
        const next = [...current];
        const fxCount = getFxBusCount();
        for (let fx = 1; fx <= fxCount; fx++) {
          const left = fxSoloLeftParam(fx);
          const leftVal = fxValues.get(left) ?? 0;
          const rightVal = fxValues.get(left + 1) ?? 0;
          const soloOn = leftVal > 0 || rightVal > 0;
          if (next[fx - 1].soloOn !== soloOn) {
            next[fx - 1] = { ...next[fx - 1], soloOn };
          }
        }
        return next;
      });

      const masterResponse = await client.readParams(masterParams, 260);
      const masterValues = new Map(masterResponse.map((item) => [item.param, item.value]));
      const leftSoloOn =
        (masterValues.get(masterSoloLeftParam()) ?? 0) > 0 ||
        (masterValues.get(masterSoloAuxLeftParam()) ?? 0) > 0;
      const rightSoloOn =
        (masterValues.get(masterSoloRightParam()) ?? 0) > 0 ||
        (masterValues.get(masterSoloAuxRightParam()) ?? 0) > 0;
      const masterSoloOn =
        leftSoloOn || rightSoloOn;

      updateMasterState({ leftSoloOn, rightSoloOn, soloOn: masterSoloOn });
    } catch {
      // Ignore transient errors during solo sync
    }
  }

  async function syncVisibleSendsState() {
    if (!isConnected) return;

    if (detailView && activeProcessorModule === "sends") {
      if (detailView.type === "channel") {
        await syncChannelSendsState(detailView.channel);
        return;
      }

      if (detailView.type === "aux") {
        await syncBusInputSendsState("aux", detailView.aux);
        return;
      }

      if (detailView.type === "fx") {
        await syncBusInputSendsState("fx", detailView.fx);
      }

      return;
    }

    if (detailView) return;

    if (mainView === "auxSends") {
      await syncBusInputSendsState("aux", selectedAuxSendsTarget);
      return;
    }

    if (mainView === "fxSends") {
      await syncBusInputSendsState("fx", selectedFxSendsTarget);
    }
  }

  async function refreshMixerStateAfterSceneAction(action: "call" | "save") {
    const waitMs = action === "call" ? 520 : 140;

    setStatus(action === "call" ? "Aplicando cena e sincronizando mesa..." : "Salvando cena e sincronizando mesa...");

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, waitMs);
    });

    const failures: string[] = [];

    const runFullSyncPass = async (forceNamesFromMixer: boolean) => {
      await syncAllChannels();
      await syncChannelEqPreviewStates();
      await syncAllStripNames({ forceFromMixer: forceNamesFromMixer });
      await syncAllSoloStates();
      await syncAllGroupStates();
      await syncVisibleSendsState();
    };

    if (action === "call") {
      let callSynced = false;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await runFullSyncPass(true);
          callSynced = true;
          break;
        } catch {
          if (attempt < 2) {
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, 180);
            });
          }
        }
      }

      if (!callSynced) {
        failures.push("sincronizacao completa de cena");
      }
    } else {
      const followUpSteps: Array<[string, () => Promise<void>]> = [
        ["previews de EQ", syncChannelEqPreviewStates],
        ["nomes", () => syncAllStripNames({ forceFromMixer: false })],
        ["solos", syncAllSoloStates],
        ["grupos", syncAllGroupStates],
        ["sends visiveis", syncVisibleSendsState],
      ];

      await Promise.all([
        (async () => {
          try {
            await syncAllChannels();
          } catch {
            failures.push("canais/processadores");
          }
        })(),
        ...followUpSteps.map(([label, task]) =>
          (async () => {
            try {
              await task();
            } catch {
              failures.push(label);
            }
          })()
        ),
      ]);
    }

    if (failures.length > 0) {
      if (action === "call") {
        setSceneUiRefreshNonce((current) => current + 1);
      }
      setStatus(`Cena aplicada com sincronizacao parcial (${failures.join(", ")})`);
      return;
    }

    if (action === "call") {
      setSceneUiRefreshNonce((current) => current + 1);
    }
    setStatus(action === "call" ? "Cena carregada e app sincronizado" : "Cena salva e app sincronizado");
  }

  async function handleSceneCall(slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) {
    const client = clientRef.current;
    if (!client || !isConnected) return;

    // Firmware variants differ: some call with opcode 1 + slot, others with opcode 1 and no payload.
    client.sendRaw(buildRawDuonnPacket(1, [slot]));
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 70);
    });
    client.sendRaw(buildRawDuonnPacket(1, []));

    const refreshTask = sceneRefreshQueueRef.current
      .then(() => refreshMixerStateAfterSceneAction("call"))
      .catch(() => {
        // Keep queue alive for future refreshes.
      });

    sceneRefreshQueueRef.current = refreshTask;
    await refreshTask;
  }

  async function handleSceneSave(slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) {
    const client = clientRef.current;
    if (!client || !isConnected) return;

    client.sendRaw(buildRawDuonnPacket(17, [slot]));

    const refreshTask = sceneRefreshQueueRef.current
      .then(() => refreshMixerStateAfterSceneAction("save"))
      .catch(() => {
        // Keep queue alive for future refreshes.
      });

    sceneRefreshQueueRef.current = refreshTask;
    await refreshTask;
  }


  async function syncBypassFlagsFromMesa() {
    const client = clientRef.current;
    if (
      !client ||
      !isConnected ||
      isSyncing ||
      auxLinkBusyRef.current ||
      meterBusyRef.current ||
      !detailView
    ) {
      return;
    }

    if (detailView.type === "channel") {
      const channel = detailView.channel;
      const p = processorParams(channel);

      try {
        const response = await client.readParams(
          [
            p.gateEnabled,
            p.gateThreshold,
            p.gateAttack,
            p.gateDecay,
            p.gateHold,
            p.compEnabled,
            p.compRatio,
            p.compAttack,
            p.compRelease,
            p.compThreshold,
            p.compGain,
            p.hpfTypeSlope,
            p.hpfFreq,
            p.lpfTypeSlope,
            p.lpfFreq,
          ],
          1200
        );
        const values = new Map(response.map((item) => [item.param, item.value]));

        setProcessorStates((current) =>
          current.map((state, index) => {
            if (index !== channel - 1) return state;
            const rawHpfFreq = values.get(p.hpfFreq);
            const rawLpfFreq = values.get(p.lpfFreq);
            const rawHpfTypeSlope = values.get(p.hpfTypeSlope);
            const rawLpfTypeSlope = values.get(p.lpfTypeSlope);
            const nextHpfEnabled =
              rawHpfFreq === undefined
                ? state.eq.hpfEnabled
                : inferHpfEnabledFromRaw(rawHpfFreq, state.eq.hpfEnabled);
            const nextLpfEnabled =
              rawLpfFreq === undefined
                ? state.eq.lpfEnabled
                : inferLpfEnabledFromRaw(rawLpfFreq, state.eq.lpfEnabled);

            return {
              ...state,
              gate: {
                ...state.gate,
                enabled: valueToBoolean(values.get(p.gateEnabled) ?? (state.gate.enabled ? 1 : 0)),
                threshold: valueToGateThreshold(values.get(p.gateThreshold) ?? Math.abs(state.gate.threshold)),
                attack: valueToGateAttack(values.get(p.gateAttack) ?? state.gate.attack),
                decay: valueToGateDecay(values.get(p.gateDecay) ?? state.gate.decay),
                hold: valueToGateHold(values.get(p.gateHold) ?? state.gate.hold),
              },
              comp: {
                ...state.comp,
                enabled: valueToBoolean(values.get(p.compEnabled) ?? (state.comp.enabled ? 1 : 0)),
                ratio: valueToCompRatio(values.get(p.compRatio) ?? Math.round(state.comp.ratio * 100)),
                attack: valueToCompTime(values.get(p.compAttack) ?? Math.round(state.comp.attack * 10)),
                release: valueToCompTime(values.get(p.compRelease) ?? Math.round(state.comp.release * 10)),
                threshold:
                  values.get(p.compThreshold) !== undefined
                    ? valueToCompThreshold(values.get(p.compThreshold) as number)
                    : state.comp.threshold,
                gain: valueToCompGain(values.get(p.compGain) ?? 1200 + Math.round(state.comp.gain * 10)),
              },
              eq: {
                ...state.eq,
                hpfEnabled: nextHpfEnabled,
                hpfType:
                  rawHpfTypeSlope === undefined
                    ? state.eq.hpfType
                    : valueToHpfTypeSlope(rawHpfTypeSlope).type,
                hpfSlope:
                  rawHpfTypeSlope === undefined
                    ? state.eq.hpfSlope
                    : valueToHpfTypeSlope(rawHpfTypeSlope).slope,
                hpfFreq:
                  shouldKeepCachedHpfFreq(rawHpfFreq)
                    ? state.eq.hpfFreq
                    : resolveHpfFreqFromRaw(rawHpfFreq, state.eq.hpfFreq),
                lpfEnabled: nextLpfEnabled,
                lpfType:
                  rawLpfTypeSlope === undefined
                    ? state.eq.lpfType
                    : valueToLpfTypeSlope(rawLpfTypeSlope).type,
                lpfSlope:
                  rawLpfTypeSlope === undefined
                    ? state.eq.lpfSlope
                    : valueToLpfTypeSlope(rawLpfTypeSlope).slope,
                lpfFreq:
                  shouldKeepCachedLpfFreq(rawLpfFreq)
                    ? state.eq.lpfFreq
                    : resolveLpfFreqFromRaw(rawLpfFreq, state.eq.lpfFreq),
              },
            };
          })
        );
      } catch {
        // Ignore transient errors to avoid noisy status churn.
      }

      return;
    }

    if (detailView.type === "master") {
      try {
        await syncMasterProcessorState(detailView.side);
      } catch {
        // Ignore transient errors to avoid noisy status churn.
      }

      return;
    }

    if (detailView.type !== "aux") {
      return;
    }

    const aux = detailView.aux;
    const p = auxProcessorParams(aux);

    try {
      const response = await client.readParams(
        [
          p.compEnabled,
          p.compRatio,
          p.compAttack,
          p.compRelease,
          p.compThreshold,
          p.compGain,
          p.hpfTypeSlope,
          p.hpfFreq,
          p.lpfTypeSlope,
          p.lpfFreq,
        ],
        1200
      );
      const values = new Map(response.map((item) => [item.param, item.value]));

      setAuxProcessorStates((current) =>
        current.map((state, index) => {
          if (index !== aux - 1) return state;
          const rawHpfFreq = values.get(p.hpfFreq);
          const rawLpfFreq = values.get(p.lpfFreq);
          const rawHpfTypeSlope = values.get(p.hpfTypeSlope);
          const rawLpfTypeSlope = values.get(p.lpfTypeSlope);
          const nextHpfEnabled =
            rawHpfFreq === undefined
              ? state.eq.hpfEnabled
              : inferHpfEnabledFromRaw(rawHpfFreq, state.eq.hpfEnabled);
          const nextLpfEnabled =
            rawLpfFreq === undefined
              ? state.eq.lpfEnabled
              : inferLpfEnabledFromRaw(rawLpfFreq, state.eq.lpfEnabled);

          return {
            ...state,
            comp: {
              ...state.comp,
              enabled: valueToBoolean(values.get(p.compEnabled) ?? (state.comp.enabled ? 1 : 0)),
              ratio: valueToCompRatio(values.get(p.compRatio) ?? Math.round(state.comp.ratio * 100)),
              attack: valueToCompTime(values.get(p.compAttack) ?? Math.round(state.comp.attack * 10)),
              release: valueToCompTime(values.get(p.compRelease) ?? Math.round(state.comp.release * 10)),
              threshold:
                values.get(p.compThreshold) !== undefined
                  ? valueToCompThreshold(values.get(p.compThreshold) as number)
                  : state.comp.threshold,
              gain: valueToCompGain(values.get(p.compGain) ?? 1200 + Math.round(state.comp.gain * 10)),
            },
            eq: {
              ...state.eq,
              hpfEnabled: nextHpfEnabled,
              hpfType:
                rawHpfTypeSlope === undefined
                  ? state.eq.hpfType
                  : valueToHpfTypeSlope(rawHpfTypeSlope).type,
              hpfSlope:
                rawHpfTypeSlope === undefined
                  ? state.eq.hpfSlope
                  : valueToHpfTypeSlope(rawHpfTypeSlope).slope,
              hpfFreq:
                shouldKeepCachedHpfFreq(rawHpfFreq)
                  ? state.eq.hpfFreq
                  : resolveHpfFreqFromRaw(rawHpfFreq, state.eq.hpfFreq),
              lpfEnabled: nextLpfEnabled,
              lpfType:
                rawLpfTypeSlope === undefined
                  ? state.eq.lpfType
                  : valueToLpfTypeSlope(rawLpfTypeSlope).type,
              lpfSlope:
                rawLpfTypeSlope === undefined
                  ? state.eq.lpfSlope
                  : valueToLpfTypeSlope(rawLpfTypeSlope).slope,
              lpfFreq:
                shouldKeepCachedLpfFreq(rawLpfFreq)
                  ? state.eq.lpfFreq
                  : resolveLpfFreqFromRaw(rawLpfFreq, state.eq.lpfFreq),
            },
          };
        })
      );
    } catch {
      // Ignore transient errors to avoid noisy status churn.
    }
  }

  useEffect(() => {
    if (!isConnected || !detailView) return;

    syncBypassFlagsFromMesa();

    const timer = window.setInterval(() => {
      syncBypassFlagsFromMesa();
    }, 1800);

    return () => {
      window.clearInterval(timer);
    };
  }, [isConnected, isSyncing, detailView]);

  useEffect(() => {
    if (!isConnected || isSyncing) return;

    const intervalMs = detailView
      ? isConstrainedDevice
        ? 700
        : GLOBAL_CONTROL_FAST_POLL_INTERVAL_DETAIL_MS
      : mainView === "mixer"
        ? isConstrainedDevice
          ? 420
          : GLOBAL_CONTROL_FAST_POLL_INTERVAL_MIXER_MS
        : isConstrainedDevice
          ? 1000
          : GLOBAL_CONTROL_FAST_POLL_INTERVAL_OTHER_MS;

    const run = () => {
      if (fastControlSyncInFlightRef.current) return;
      fastControlSyncInFlightRef.current = true;
      void syncFastControlStates().catch(() => {
        // Ignore transient read failures in fast control polling.
      }).finally(() => {
        fastControlSyncInFlightRef.current = false;
      });
    };

    run();

    const timer = window.setInterval(run, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [channelCount, detailView, isConnected, isConstrainedDevice, isSyncing, mainView]);

  useEffect(() => {
    if (!isConnected || isSyncing) return;

    const run = () => {
      void syncGlobalControlStates().catch(() => {
        // Ignore transient read failures in periodic control polling.
      });
    };

    run();

    const timer = window.setInterval(run, GLOBAL_CONTROL_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [channelCount, isConnected, isSyncing]);

  useEffect(() => {
    if (!isConnected || isSyncing) return;

    const run = () => {
      if (usbReturnPatchSyncInFlightRef.current) return;

      usbReturnPatchSyncInFlightRef.current = true;
      void Promise.all([
        syncUsbInputPatchMap(),
        syncUsbReturnPatchMap({ refreshInputStates: true }),
        syncUsbReturnOutputPatchMap(),
        syncAx32OutputPatchMap(),
      ]).catch(() => {
        // Ignore transient read failures for patch map polling.
      }).finally(() => {
        usbReturnPatchSyncInFlightRef.current = false;
      });
    };

    run();

    const timer = window.setInterval(run, USB_RETURN_PATCH_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [channelCount, isConnected, isSyncing]);

  useEffect(() => {
    if (!isConnected || isSyncing) return;

    // Always refresh controls when returning to mixer or opening detail views.
    if (mainView !== "mixer" && !detailView) return;

    void syncGlobalControlStates().catch(() => {
      // Ignore transient read failures on route-entry refresh.
    });
  }, [detailView, isConnected, isSyncing, mainView]);

  useEffect(() => {
    if (!isConnected || !detailView || detailView.type !== "channel") return;
    if (activeProcessorModule !== "sends") return;

    syncChannelSendsState(detailView.channel).catch(() => {
      // Keep the existing values when send sync fails transiently.
    });
  }, [activeProcessorModule, detailView, isConnected]);

  useEffect(() => {
    if (!isConnected || !detailView) return;
    if (activeProcessorModule !== "sends") return;
    if (detailView.type === "aux") {
      syncBusInputSendsState("aux", detailView.aux).catch(() => {
        // Keep the existing values when send sync fails transiently.
      });
      return;
    }
    if (detailView.type === "fx") {
      syncBusInputSendsState("fx", detailView.fx).catch(() => {
        // Keep the existing values when send sync fails transiently.
      });
    }
  }, [activeProcessorModule, detailView, isConnected]);

  useEffect(() => {
    if (!isConnected || detailView) return;
    if (mainView === "auxSends") {
      syncBusInputSendsState("aux", selectedAuxSendsTarget).catch(() => {
        // Keep existing values on transient read failures.
      });
      return;
    }

    if (mainView === "fxSends") {
      syncBusInputSendsState("fx", selectedFxSendsTarget).catch(() => {
        // Keep existing values on transient read failures.
      });
    }
  }, [detailView, isConnected, mainView, selectedAuxSendsTarget, selectedFxSendsTarget]);

  useEffect(() => {
    if (!isConnected || isSyncing) return;

    // Poll solo state from the hardware every 2.5 s so that changes made
    // directly on the mixer (hardware buttons) are reflected in the app.
    const timer = window.setInterval(() => {
      if (meterBusyRef.current) return;
      syncAllSoloStates();
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isConnected, isSyncing]);

  useEffect(() => {
    if (!isConnected || isSyncing) return;

    // Keep AUX link badges/state fresh even when user stays on sends views.
    const timer = window.setInterval(() => {
      if (meterBusyRef.current) return;
      syncLinkStates().catch(() => {
        // Ignore transient link read failures.
      });
    }, 4200);

    return () => {
      window.clearInterval(timer);
    };
  }, [isConnected, isSyncing]);

  useEffect(() => {
    if (!isConnected || isSyncing) return;

    const run = () => {
      if (meterBusyRef.current || isChannelsDraggingRef.current) return;
      void syncChannelPairVisualState().catch(() => {
        // Ignore transient pair-state read failures.
      });
    };

    run();
    const timer = window.setInterval(run, isAx32ProfileActive() ? 1600 : 2200);

    return () => {
      window.clearInterval(timer);
    };
  }, [channelCount, isConnected, isSyncing]);

  function applyLinkStateFrom3056(value3056: number) {
    const now = Date.now();

    setAuxLinks((current) => {
      const next = {
        "1-2": isAuxLinked(value3056, 1),
        "3-4": isAuxLinked(value3056, 3),
        "5-6": isAuxLinked(value3056, 5),
        "7-8": isAuxLinked(value3056, 7),
      };

      if (isAuxPairTransitionLocked("1-2", now)) next["1-2"] = current["1-2"];
      if (isAuxPairTransitionLocked("3-4", now)) next["3-4"] = current["3-4"];
      if (isAuxPairTransitionLocked("5-6", now)) next["5-6"] = current["5-6"];
      if (isAuxPairTransitionLocked("7-8", now)) next["7-8"] = current["7-8"];

      return next;
    });

    setMasterLinked((current) =>
      isMasterLinkTransitionLocked(now) ? current : isMasterLinked(value3056)
    );
  }

  function updateMetersFromResponse(
    response: {
      param: number;
      value: number;
    }[],
    effectiveChannelCount?: number
  ) {
    const now = Date.now();
    const minDragMeterUpdateIntervalMs = isConstrainedDevice ? 170 : 140;
    if (
      isChannelsDraggingRef.current &&
      now - meterUpdateLastAtRef.current < minDragMeterUpdateIntervalMs
    ) {
      return;
    }
    meterUpdateLastAtRef.current = now;

    const CLIP_HOLD_MS = 2500;
    const mainMaster = response.find((item) => item.param === 47);
    const ax32MasterL = response.find((item) => item.param === 1947);
    const ax32MasterR = response.find((item) => item.param === 1948);
    const ax32MasterAltLeftA = response.find((item) => item.param === 4644);
    const ax32MasterAltRightA = response.find((item) => item.param === 4753);
    const ax32MasterAltLeftB = response.find((item) => item.param === 4645);
    const ax32MasterAltRightB = response.find((item) => item.param === 4754);
    const ax32MasterProcessed = response.find((item) => item.param === 2862);
    const monitorSolo = response.find((item) => item.param === 48);

    const meterCandidates: MasterMeterCandidate[] = [];

    if (mainMaster) {
      const rightDb = meterByteToDb(mainMaster.value >> 8);
      const leftDb = meterByteToDb(mainMaster.value & 255);
      meterCandidates.push({
        id: "legacy47",
        leftDb,
        rightDb,
        valid: isValidMeterDb(leftDb) && isValidMeterDb(rightDb),
      });
    }

    if (isAx32ProfileActive()) {
      if (ax32MasterL && ax32MasterR) {
        const leftDb = decodeRawMeterDb(ax32MasterL.value);
        const rightDb = decodeRawMeterDb(ax32MasterR.value);
        meterCandidates.push({
          id: "ax32_1947_1948",
          leftDb,
          rightDb,
          valid: isValidMeterDb(leftDb) && isValidMeterDb(rightDb),
        });
      }

      if (ax32MasterAltLeftA && ax32MasterAltRightA) {
        const leftDb = decodeRawMeterDb(ax32MasterAltLeftA.value);
        const rightDb = decodeRawMeterDb(ax32MasterAltRightA.value);
        meterCandidates.push({
          id: "ax32_4644_4753",
          leftDb,
          rightDb,
          valid: isValidMeterDb(leftDb) && isValidMeterDb(rightDb),
        });
      }

      if (ax32MasterAltLeftB && ax32MasterAltRightB) {
        const leftDb = decodeRawMeterDb(ax32MasterAltLeftB.value);
        const rightDb = decodeRawMeterDb(ax32MasterAltRightB.value);
        meterCandidates.push({
          id: "ax32_4645_4754",
          leftDb,
          rightDb,
          valid: isValidMeterDb(leftDb) && isValidMeterDb(rightDb),
        });
      }

      if (ax32MasterProcessed) {
        const processed = decodePackedStereoMeterWord(ax32MasterProcessed.value);
        meterCandidates.push({
          id: "ax32_2862",
          leftDb: processed.leftDb,
          rightDb: processed.rightDb,
          valid:
            isValidMeterDb(processed.leftDb) &&
            isValidMeterDb(processed.rightDb),
        });
      }
    }

    if (meterCandidates.length > 0) {
      const scores = masterMeterSourceScoreRef.current;

      meterCandidates.forEach((candidate) => {
        const activity = Math.max(candidate.leftDb, candidate.rightDb);
        const stereoDelta = Math.abs(candidate.leftDb - candidate.rightDb);
        const hasActivity = activity > -70 ? 1 : 0;
        const hasStereoVariation = stereoDelta >= 1.5 ? 0.4 : 0;
        const validBonus = candidate.valid ? 0.2 : -0.3;
        const sampleScore = hasActivity + hasStereoVariation + validBonus;
        scores[candidate.id] = scores[candidate.id] * 0.88 + sampleScore;
      });

      let selected: MasterMeterCandidate;

      if (isAx32ProfileActive()) {
        const processedCandidate = meterCandidates.find(
          (candidate) => candidate.id === "ax32_2862" && candidate.valid
        );

        if (processedCandidate) {
          // Prefer mapped processed master source when present to avoid source hopping.
          masterMeterSourceRef.current = "ax32_2862";
          selected = processedCandidate;
        } else {
          const ranked = [...meterCandidates]
            .filter((candidate) => candidate.valid)
            .sort(
              (a, b) =>
                (scores[b.id] ?? Number.NEGATIVE_INFINITY) -
                (scores[a.id] ?? Number.NEGATIVE_INFINITY)
            );

          if (ranked.length > 0 && (scores[ranked[0].id] ?? 0) > 0.25) {
            masterMeterSourceRef.current = ranked[0].id;
          }

          selected =
            meterCandidates.find(
              (candidate) => candidate.id === masterMeterSourceRef.current
            ) ?? meterCandidates[0];
        }
      } else {
        selected =
          meterCandidates.find((candidate) => candidate.id === "legacy47") ??
          meterCandidates[0];
      }

      const masterLDb = clampMasterMeterForDisplay(selected.leftDb);
      const masterRDb = clampMasterMeterForDisplay(selected.rightDb);

      setMainMasterMeter((current) => {
        const leftPeak = computeNextPeakState(
          masterLDb,
          current.leftPeakDb,
          current.leftPeakUntil,
          now
        );
        const rightPeak = computeNextPeakState(
          masterRDb,
          current.rightPeakDb,
          current.rightPeakUntil,
          now
        );

        return {
          ...current,
          leftDb: masterLDb,
          rightDb: masterRDb,
          leftLevel: meterDbToLevel(masterLDb),
          rightLevel: meterDbToLevel(masterRDb),
          leftPeakDb: leftPeak.peakDb,
          rightPeakDb: rightPeak.peakDb,
          leftPeakUntil: leftPeak.peakUntil,
          rightPeakUntil: rightPeak.peakUntil,
          leftClipUntil:
            masterLDb >= 14
              ? now + CLIP_HOLD_MS
              : current.leftClipUntil > now
                ? current.leftClipUntil
                : 0,
          rightClipUntil:
            masterRDb >= 14
              ? now + CLIP_HOLD_MS
              : current.rightClipUntil > now
                ? current.rightClipUntil
                : 0,
        };
      });
    }

    if (monitorSolo) {
      const monitorRDb = meterByteToDb(monitorSolo.value >> 8);
      const monitorLDb = meterByteToDb(monitorSolo.value & 255);

      setMonitorSoloMeter({
        leftDb: monitorLDb,
        rightDb: monitorRDb,
        leftLevel: meterDbToLevel(monitorLDb),
        rightLevel: meterDbToLevel(monitorRDb),
      });
    }

    setChannels((current) => {
      let next: ChannelState[] | null = null;
      const CHANNEL_IDLE_DB = -75;
      const CHANNEL_ACTIVE_MIN_DB = -40;
      const CHANNEL_STALE_TIMEOUT_MS = 420;
      const resolvedChannelCount = effectiveChannelCount ?? channelCount;
      const maxChannelMeterParam = resolvedChannelCount / 2 + 1;
      const channelMeterItems = response.filter((item) => {
        return item.param >= 2 && item.param <= maxChannelMeterParam;
      });

      const seenChannels = new Set<number>();
      const hasAnyChannelMeterData = channelMeterItems.length > 0;

      if (!hasAnyChannelMeterData) {
        missingChannelMeterFramesRef.current += 1;
      } else {
        missingChannelMeterFramesRef.current = 0;
      }

      function ensureNext() {
        if (!next) {
          next = [...current];
        }

        return next;
      }

      function applyIdleChannelState(
        index: number,
        previous: ChannelState,
        idleLevel: number
      ) {
        const alreadyIdle =
          previous.meterDb === CHANNEL_IDLE_DB &&
          previous.meterLevel === idleLevel &&
          previous.peakDb <= CHANNEL_ACTIVE_MIN_DB &&
          previous.peakLevel === 0 &&
          previous.peakUntil === 0 &&
          previous.clipUntil === 0;

        if (alreadyIdle) return;

        ensureNext()[index] = {
          ...previous,
          meterDb: CHANNEL_IDLE_DB,
          meterLevel: idleLevel,
          peakDb: CHANNEL_IDLE_DB,
          peakLevel: 0,
          peakUntil: 0,
          clipUntil: 0,
        };
      }

      function updateOneChannel(channelNumber: number, channelDb: number) {
        if (channelNumber < 1 || channelNumber > resolvedChannelCount) return;

        seenChannels.add(channelNumber);
        const index = channelNumber - 1;
        channelMeterLastUpdateAtRef.current[index] = now;
        const previous = (next ?? current)[index];
        const holdActive = previous.peakUntil > now || previous.clipUntil > now;

        // Ignore muted channels once hold has ended to prevent unnecessary re-renders.
        if (previous.muted && !holdActive) {
          const idleLevel = meterDbToLevel(CHANNEL_IDLE_DB);
          applyIdleChannelState(index, previous, idleLevel);
          return;
        }

        const peak = computeNextPeakState(
          channelDb,
          previous.peakDb,
          previous.peakUntil,
          now
        );
        const meterLevel = meterDbToLevel(channelDb);
        const clipUntil =
          channelDb > 12
            ? now + CLIP_HOLD_MS
            : previous.clipUntil > now
              ? previous.clipUntil
              : 0;

        const unchanged =
          previous.meterDb === channelDb &&
          previous.meterLevel === meterLevel &&
          previous.peakDb === peak.peakDb &&
          previous.peakLevel === peak.peakLevel &&
          previous.peakUntil === peak.peakUntil &&
          previous.clipUntil === clipUntil;

        if (unchanged) return;

        const updated = {
          ...previous,
          meterDb: channelDb,
          meterLevel,
          peakDb: peak.peakDb,
          peakLevel: peak.peakLevel,
          peakUntil: peak.peakUntil,
          clipUntil,
        };

        ensureNext()[index] = updated;
      }

      for (const { param, value } of channelMeterItems) {
        let firstChannel = (param - 2) * 2 + 1;
        let secondChannel = firstChannel + 1;

        const hiByte = (value >> 8) & 255;
        const loByte = value & 255;

        // A mesa envia cada par invertido:
        // hiByte = canal par
        // loByte = canal ímpar
        const oddChannelDb = meterByteToDb(loByte);
        const evenChannelDb = meterByteToDb(hiByte);

        if (param >= 16) {
          // (debug removed)
        }

        updateOneChannel(firstChannel, oddChannelDb);
        updateOneChannel(secondChannel, evenChannelDb);
      }

      if (!isChannelsDraggingRef.current) {
        const idleLevel = meterDbToLevel(CHANNEL_IDLE_DB);
        const staleBefore = now - CHANNEL_STALE_TIMEOUT_MS;
        const channelLastUpdateAt = channelMeterLastUpdateAtRef.current;

        for (let index = 0; index < channelCount; index++) {
          const channelNumber = index + 1;
          if (seenChannels.has(channelNumber)) continue;

          const lastUpdateAt = channelLastUpdateAt[index] ?? 0;
          if (lastUpdateAt >= staleBefore) continue;

          const previous = (next ?? current)[index];
          const holdActive = previous.peakUntil > now || previous.clipUntil > now;
          if (holdActive) continue;

          applyIdleChannelState(index, previous, idleLevel);
        }
      }

      return next ?? current;
    });

    // Process AUX meters using the profile-resolved meter param map.
    const { auxMeterParams: validAuxParams } = getAuxFxMeterConfig();
    const auxMeterItems = response.filter((item) => validAuxParams.includes(item.param));

    if (auxMeterItems.length > 0) {
      setAuxStrips((current) => {
        let next: ChannelState[] | null = null;
        const CLIP_HOLD_MS = 2500;

        for (const { param, value } of auxMeterItems) {
          const pairIndex = validAuxParams.indexOf(param);
          if (pairIndex < 0) continue;

          const loByte = value & 255; // Odd AUX (1,3,5,7,9,11,13)
          const hiByte = (value >> 8) & 255; // Even AUX (2,4,6,8,10,12,14)

          // Process odd-numbered AUX (lo byte)
          const auxIndex1 = pairIndex * 2;
          if (auxIndex1 < current.length) {
            const meterDb1 = meterByteToDb(loByte);
            const meterLevel1 = meterDbToLevel(meterDb1);
            const clipUntil1 =
              meterDb1 > 12
                ? now + CLIP_HOLD_MS
                : current[auxIndex1].clipUntil > now
                  ? current[auxIndex1].clipUntil
                  : 0;

            const previous1 = (next ?? current)[auxIndex1];
            const unchanged1 =
              previous1.meterDb === meterDb1 &&
              previous1.meterLevel === meterLevel1 &&
              previous1.clipUntil === clipUntil1;

            if (!unchanged1) {
              if (!next) next = [...current];
              next[auxIndex1] = {
                ...previous1,
                meterDb: meterDb1,
                meterLevel: meterLevel1,
                clipUntil: clipUntil1,
              };
            }
          }

          // Process even-numbered AUX (hi byte)
          const auxIndex2 = pairIndex * 2 + 1;
          if (auxIndex2 < current.length) {
            const meterDb2 = meterByteToDb(hiByte);
            const meterLevel2 = meterDbToLevel(meterDb2);
            const clipUntil2 =
              meterDb2 > 12
                ? now + CLIP_HOLD_MS
                : current[auxIndex2].clipUntil > now
                  ? current[auxIndex2].clipUntil
                  : 0;

            const previous2 = (next ?? current)[auxIndex2];
            const unchanged2 =
              previous2.meterDb === meterDb2 &&
              previous2.meterLevel === meterLevel2 &&
              previous2.clipUntil === clipUntil2;

            if (!unchanged2) {
              if (!next) next = [...current];
              next[auxIndex2] = {
                ...previous2,
                meterDb: meterDb2,
                meterLevel: meterLevel2,
                clipUntil: clipUntil2,
              };
            }
          }
        }

        return next ?? current;
      });
    }

    // Process FX meters
    const { fxMeterParams } = getAuxFxMeterConfig();
    const fxMeterItems = response.filter((item) => fxMeterParams.includes(item.param));

    if (fxMeterItems.length > 0) {
      setFxStrips((current) => {
        let next: ChannelState[] | null = null;
        const CLIP_HOLD_MS = 2500;

        for (const { param, value } of fxMeterItems) {
          const fxIndex = fxMeterParams.indexOf(param);
          if (fxIndex < 0 || fxIndex >= current.length) continue;

          const loByte = value & 255;
          const meterDb = meterByteToDb(loByte);
          const meterLevel = meterDbToLevel(meterDb);
          const clipUntil =
            meterDb > 12
              ? now + CLIP_HOLD_MS
              : current[fxIndex].clipUntil > now
                ? current[fxIndex].clipUntil
                : 0;

          const previous = (next ?? current)[fxIndex];
          const unchanged =
            previous.meterDb === meterDb &&
            previous.meterLevel === meterLevel &&
            previous.clipUntil === clipUntil;

          if (!unchanged) {
            if (!next) next = [...current];
            next[fxIndex] = {
              ...previous,
              meterDb,
              meterLevel,
              clipUntil,
            };
          }
        }

        return next ?? current;
      });
    }
  }

  function startMeterPolling(explicitChannelCount?: number) {
    stopMeterPolling();
    missingChannelMeterFramesRef.current = 0;
    const effectiveChannelCount = explicitChannelCount ?? channelCount;
    channelMeterLastUpdateAtRef.current = Array.from(
      { length: effectiveChannelCount },
      () => Date.now()
    );

    let cancelled = false;
    let meterPollCycle = 0;
    const METER_POLL_INTERVAL_MS = isConstrainedDevice ? 82 : 70;
    const METER_POLL_INTERVAL_DRAGGING_MS = isConstrainedDevice ? 125 : 110;
    const METER_READ_TIMEOUT_MS = isConstrainedDevice ? 170 : 140;
    const METER_MIN_RESCHEDULE_MS = 16;

    async function poll() {
      if (cancelled) return;
      const startedAt = Date.now();

      const client = clientRef.current;

      if (client) {
        // Poll dos meters: canais (2-maxChannelMeterParam) + AUX/FX + main master (47) + monitor/solo (48) + master alts
        // AX16: params 2-9 (CH1-16) + 8 AUX + 2 FX
        // AX24: params 2-13 (CH1-24) + 8 AUX + 2 FX
        // AX32: params 2-17 (CH1-32) + 14 AUX + 4 FX
        try {
          meterBusyRef.current = true;
          meterPollCycle += 1;
          const maxChannelMeterParam = effectiveChannelCount / 2 + 1;
          const chMeterParams = Array.from({ length: maxChannelMeterParam - 1 }, (_, i) => i + 2);
          
          // AUX/FX meter params
          const { auxMeterParams, fxMeterParams } = getAuxFxMeterConfig();
          
          const masterMeterParams = [47, 48, 2862, 1947, 1948, 4644, 4645, 4753, 4754];
          const meterParams = [...chMeterParams, ...auxMeterParams, ...fxMeterParams, ...masterMeterParams];
          const meterResponse = await client.readParams(
            meterParams,
            METER_READ_TIMEOUT_MS
          );
          updateMetersFromResponse(meterResponse, effectiveChannelCount);
        } catch {
          // Falhas pontuais de meter são ignoradas.
        } finally {
          meterBusyRef.current = false;
        }
      }

      if (!cancelled) {
        const targetInterval = isChannelsDraggingRef.current
          ? METER_POLL_INTERVAL_DRAGGING_MS
          : METER_POLL_INTERVAL_MS;
        const elapsed = Date.now() - startedAt;
        const nextDelay = Math.max(
          METER_MIN_RESCHEDULE_MS,
          targetInterval - elapsed
        );
        meterTimerRef.current = window.setTimeout(poll, nextDelay);
      }
    }

    meterTimerRef.current = window.setTimeout(poll, METER_POLL_INTERVAL_MS);

    // Store cancel flag via a sentinel value trick — we repurpose meterBusyRef
    // to signal cancellation between the closure and stopMeterPolling.
    (meterTimerRef as unknown as { _cancel?: () => void })._cancel = () => {
      cancelled = true;
    };
  }

  function stopMeterPolling() {
    const cancel = (meterTimerRef as unknown as { _cancel?: () => void })._cancel;
    if (cancel) {
      cancel();
      (meterTimerRef as unknown as { _cancel?: () => void })._cancel = undefined;
    }

    if (meterTimerRef.current !== null) {
      window.clearTimeout(meterTimerRef.current);
      meterTimerRef.current = null;
    }

    meterBusyRef.current = false;
    channelMeterLastUpdateAtRef.current = [];
  }

  async function connectToMixer(
    targetIp: string,
    source: "manual" | "discovered",
    forcedProfile?: AxiosProtocolProfile,
    forcedChannelCount?: number
  ) {
    rawParamStoreRef.current.clear();

    setConnectingSource(source);
    setConnectionError(null);
    setStatus("Conectando...");

    const storedLicenseKey = localStorage.getItem(LICENSE_KEY_STORAGE_KEY)?.trim() ?? "";
    const runtimeCache = readRuntimeLicenseCache();
    const bootDecision = resolveBootDecision(runtimeCache, Date.now(), LICENSE_REVALIDATE_WARNING_DAYS);
    const allowsTrialWithoutKey = runtimeCache?.licenseType === "trial" && bootDecision.formalState === "TRIAL_ACTIVE";

    if (!storedLicenseKey && !allowsTrialWithoutKey) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Valide a licença antes de conectar ao mixer.",
      });
      openLicenseModal(true, "onboarding");
      setConnectingSource(null);
      return false;
    }

    if ((!isLicenseValidated || isLicenseStateBlocked(licenseFormalState)) && !allowsTrialWithoutKey) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Valide a licença antes de conectar ao mixer.",
      });
      openLicenseModal(true, "onboarding");
      setConnectingSource(null);
      return false;
    }

    const normalizedIp = targetIp.trim();

    if (!normalizedIp) {
      const message = "Confirme o endereco IP e tente novamente.";
      setConnectionError(message);
      setStatus(message);
      setConnectingSource(null);
      return false;
    }

    setAppStage("mixer");
    setInitialConnectSyncBusy(true);
    setStatus("Conectando à mesa...");

    try {
      if (source === "manual") {
        setIp(normalizedIp);
      }

      if (import.meta.env.DEV) {
        console.debug(
          `[AX] connectToMixer: ip=${normalizedIp} source=${source}` +
          ` forcedChannelCount=${forcedChannelCount ?? "auto"} forcedProfile=${forcedProfile ?? "auto"}`
        );
      }

      const resolvedTarget = resolveConnectionTargetProfile(
        normalizedIp,
        discoveredMixers,
        channelCount,
        forcedProfile,
        forcedChannelCount
      );
      const selectedProfile = resolvedTarget.profile;
      const targetChannelCount = resolvedTarget.channelCount;
      const mixerCacheIdentity = buildMixerCacheIdentity(
        normalizedIp,
        targetChannelCount,
        discoveredMixers
      );
      const client = new Axios16Client(normalizedIp, 8088, selectedProfile, {
        channelCount: targetChannelCount,
      });
      await client.connect();
      clearLocalParamWriteTracking();
      localParamWriteUnsubscribeRef.current = client.onLocalParamWrite(handleLocalParamWrite);
      remoteParamReadUnsubscribeRef.current = client.onRemoteParamRead(handleRemoteParamRead);

      client.setOnDisconnect(() => {
        // Keep UI/client state consistent when the socket drops unexpectedly.
        if (clientRef.current !== client) return;
        if (import.meta.env.DEV) {
          console.debug(`[AX] unexpected disconnect from: ${normalizedIp}`);
        }
        stopMeterPolling();
        clearScheduledSendWrites();
        clearLocalParamWriteTracking();
        rawParamStoreRef.current.clear();
        clientRef.current = null;
        setIsConnected(false);

        if (reconnectParamsRef.current) {
          setStatus("Reconectando...");
          scheduleAutoReconnect();
        } else {
          setStatus("Conexao com a mesa foi encerrada.");
        }
      });

      clientRef.current = client;
      const connectedStatus = licenseRevalidationHint
        ? `Conectado em ${normalizedIp} - ${licenseRevalidationHint}`
        : `Conectado em ${normalizedIp}`;

      setStatus("Sincronizando mesa...");

      if (channelCount !== targetChannelCount || ACTIVE_CHANNEL_PROFILE !== selectedProfile) {
        applyMixerChannelProfile(targetChannelCount);
      }

      if (import.meta.env.DEV) {
        console.debug(
          `[AX] profile applied: profile=${selectedProfile} channelCount=${targetChannelCount}` +
          ` cacheScope=${mixerCacheIdentity}`
        );
      }

      setActiveMixerCacheIdentity(mixerCacheIdentity);
      hydrateDcaCacheForMixer(mixerCacheIdentity, targetChannelCount);

      // Ensure profile/strip state updates are committed before the first full sync pass.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0);
      });

      if (licenseFormalState === "TRIAL_ACTIVE") {
        const todayDate = new Date().toISOString().slice(0, 10);
        const lastPromptDate = localStorage.getItem(TRIAL_UPGRADE_PROMPT_DATE_KEY);
        if (lastPromptDate !== todayDate) {
          localStorage.setItem(TRIAL_UPGRADE_PROMPT_DATE_KEY, todayDate);
          setPendingDiscoveryMixer(null);
          setLicenseValidationMessage({ kind: "idle", text: "" });
          setLicenseModalMandatory(true);
          setLicenseModalMode("upgrade");
          setLicenseModalOpen(true);
        }
      }

      mixerChannelsScrollLeftRef.current = 0;
      if (mixerChannelsScrollerRef.current) {
        mixerChannelsScrollerRef.current.scrollLeft = 0;
      }

      setIsConnected(true);
      reconnectParamsRef.current = {
        ip: normalizedIp,
        source,
        profile: selectedProfile,
        channelCount: targetChannelCount,
      };
      reconnectAttemptsRef.current = 0;
      if (licenseFormalState === "TRIAL_ACTIVE") {
        setLicenseModalMandatory(false);
      }

      rememberConnectedMixerIp(normalizedIp);

      // Salvar entrada completa no cache de mesas conhecidas
      const discoveredMixerRef = discoveredMixers.find((m) => m.ip.trim() === normalizedIp);
      const knownMixerConfidence: ProfileConfidence = source === "manual" ? "manual" : "confirmed";
      saveKnownMixer({
        ip: normalizedIp,
        port: 8088,
        mac: discoveredMixerRef?.macAddress,
        channelCount: normalizeSupportedChannelCount(targetChannelCount) as 16 | 24 | 32,
        name: discoveredMixerRef?.name,
        lastSeenAt: Date.now(),
        lastConnectedAt: Date.now(),
        source: source === "manual" ? "manual" : "discovery",
        confidence: knownMixerConfidence,
        cacheScopeKey: mixerCacheIdentity,
      });

      startMeterPolling(targetChannelCount);
      setConnectingSource(null);

      setStatus(`${connectedStatus} (sincronizando em segundo plano...)`);

      void (async () => {
        const syncFailures: string[] = [];

        const runConnectSyncStep = async (label: string, task: () => Promise<void>) => {
          try {
            await task();
          } catch (syncError) {
            console.error(`Erro ao sincronizar ${label}:`, syncError);
            syncFailures.push(label);
          }
        };

        await runConnectSyncStep("canais", async () => {
          await syncAllChannels(targetChannelCount);
        });

        await runConnectSyncStep("EQ preview", async () => {
          await syncChannelEqPreviewStates(targetChannelCount);
        });

        await runConnectSyncStep("nomes", async () => {
          await syncAllStripNames({
            forceFromMixer: true,
            channelTotal: targetChannelCount,
            writeBackDefaults: true,
            readTimeoutMs: 1400,
          });
        });

        await runConnectSyncStep("solos", async () => {
          await syncAllSoloStates();
        });

        await runConnectSyncStep("grupos", async () => {
          await syncAllGroupStates({
            ignoreConnectionState: true,
            suppressManagedMuteWrites: true,
          });
        });

        await runConnectSyncStep("patching", async () => {
          await Promise.all([
            syncUsbInputPatchMap({ ignoreConnectionState: true }),
            syncUsbReturnPatchMap({
              refreshInputStates: false,
              ignoreConnectionState: true,
            }),
            syncUsbReturnOutputPatchMap({ ignoreConnectionState: true, refreshInputStates: false }),
            syncAx32OutputPatchMap({ ignoreConnectionState: true }),
          ]);
        });

        await runConnectSyncStep("sends", async () => {
          const channelForInitialSendSync =
            detailView && detailView.type === "channel" ? detailView.channel : 1;
          await syncChannelSendsState(channelForInitialSendSync);
          await syncAllBusInputSendsState();

          if (detailView && activeProcessorModule === "sends") {
            if (detailView.type === "channel") {
              await syncChannelSendsState(detailView.channel);
              return;
            }

            if (detailView.type === "aux") {
              await syncBusInputSendsState("aux", detailView.aux);
              return;
            }

            if (detailView.type === "fx") {
              await syncBusInputSendsState("fx", detailView.fx);
              return;
            }
          }

          if (!detailView && mainView === "auxSends") {
            await syncBusInputSendsState("aux", selectedAuxSendsTarget);
            return;
          }

          if (!detailView && mainView === "fxSends") {
            await syncBusInputSendsState("fx", selectedFxSendsTarget);
          }
        });

        if (syncFailures.length > 0) {
          setStatus(`${connectedStatus} (sync parcial: ${syncFailures.join(", ")})`);
        } else {
          setStatus(connectedStatus);
        }

        void refreshResolvedInputSourceStates({ ignoreConnectionState: true }).catch(() => {
          // Background refresh for INPUT/USB state after connect to keep startup responsive.
          // ignoreConnectionState: true because isConnected in this closure is stale (false).
        });
      })().finally(() => {
        setInitialConnectSyncBusy(false);
      });
      return true;
    } catch (error) {
      stopMeterPolling();
      clearLocalParamWriteTracking();
      setIsConnected(false);
      setInitialConnectSyncBusy(false);
      setAppStage("device-selection");
      setActiveMixerCacheIdentity(null);
      const detail = error instanceof Error ? error.message : "Erro ao conectar";
      setStatus(detail);
      setConnectionError(`Nao foi possivel conectar a mesa. ${detail}`);
      clientRef.current = null;
      setConnectingSource(null);
      return false;
    }
  }

  function applyLicenseSnapshot(snapshot: LicenseSnapshot, licenseKey: string, sourceMessage?: string) {
    const validatedAtIso = new Date().toISOString();
    const resolvedTrialExpiryAt =
      snapshot.licenseType === "trial"
        ? snapshot.trialExpiryAt ?? new Date(Date.parse(validatedAtIso) + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const resolvedNextRevalidationAt =
      snapshot.licenseType === "purchased"
        ? snapshot.nextRevalidationAt ?? computeNextRevalidationAt(validatedAtIso, LICENSE_REVALIDATE_INTERVAL_DAYS)
        : snapshot.nextRevalidationAt;

    const formalState = resolveLicenseFormalState({
      snapshot: {
        ...snapshot,
        trialExpiryAt: resolvedTrialExpiryAt,
        nextRevalidationAt: resolvedNextRevalidationAt,
      },
      warningDays: LICENSE_REVALIDATE_WARNING_DAYS,
      fallbackTrialExpiryAt: licenseTrialExpiryAt,
      fallbackNextRevalidationAt: licenseNextRevalidationAt,
    });

    setLicenseFormalState(formalState);
    setLicenseTrialExpiryAt(resolvedTrialExpiryAt);
    setLicenseNextRevalidationAt(resolvedNextRevalidationAt);
    setLicenseUnlimitedActivations(snapshot.unlimitedActivations);
    setLicenseLinkedUserType(snapshot.linkedUserType);
    setLicenseActiveDevicesCount(snapshot.activeDevices);
    setLicenseRemainingActivations(snapshot.remainingActivations);
    setLicenseDevices(snapshot.devices);

    const blocked = isLicenseStateBlocked(formalState);
    setIsLicenseValidated(!blocked);

    const cache: RuntimeLicenseCache = {
      installationUuid: installationId,
      licenseKey,
      licenseType: snapshot.licenseType,
      trialExpiryAt: resolvedTrialExpiryAt,
      lastValidatedAt: validatedAtIso,
      nextRevalidationAt: resolvedNextRevalidationAt,
      cachedState: formalState,
      feedbackMessage: sourceMessage ?? snapshot.message,
    };
    writeRuntimeLicenseCache(cache);

    if (resolvedNextRevalidationAt) {
      const pseudoCache: CachedLicenseStatus = {
        installationId,
        code: snapshot.code || "LICENSE_VALID",
        validatedAt: cache.lastValidatedAt || validatedAtIso,
        nextRevalidationAt: resolvedNextRevalidationAt,
        expiryDate: resolvedTrialExpiryAt,
        message: snapshot.message || "Licença validada.",
      };
      localStorage.setItem(LICENSE_STATUS_STORAGE_KEY, JSON.stringify(pseudoCache));
      const hintExpiry = buildLicenseExpiryHint(pseudoCache, installationId);
      const hintRevalidation = buildLicenseRevalidationHint(pseudoCache, installationId, isOnline);
      setLicenseRevalidationHint(hintExpiry || hintRevalidation);
    } else {
      setLicenseRevalidationHint("");
    }

    if (blocked) {
      const blockingMessage =
        sourceMessage ||
        snapshot.message ||
        (formalState === "TRIAL_EXPIRED"
          ? "Período de teste expirado. Entre em contato para adquirir a licença."
          : "Licença bloqueada. Revalide para continuar.");
      enforceLicenseBlock(blockingMessage, formalState === "TRIAL_EXPIRED" ? "upgrade" : "onboarding");
    }
  }

  async function requestLicenseRegister(wantsUpgrade: boolean): Promise<{
    snapshot: LicenseSnapshot;
    returnedLicenseKey: string;
    httpStatus: number;
    rawBody: string;
    success: boolean;
    backendMessage: string;
    attemptedUrl: string;
    transportError?: string;
  } | null> {
    if (!installationId) {
      return null;
    }

    const endpointCandidates = buildLicenseEndpointCandidates(
      REGISTER_ENDPOINT_URL,
      REGISTER_ENDPOINT_PATH,
      buildLocalhostApiCandidates("register.php")
    );
    if (endpointCandidates.length === 0) return null;

    console.info("[license/register] candidates", endpointCandidates);

    const payloadBody: Record<string, unknown> = {
      name: licenseRegisterName.trim(),
      email: licenseRegisterEmail.trim(),
      phone: normalizePhoneDigits(licenseRegisterPhone),
      password: licenseRegisterPassword,
      installation_uuid: installationId,
      device_id: installationId,
      device_name: getDeviceNameLabel(),
      device_platform: getPlatformLabel(),
      wants_upgrade: wantsUpgrade,
    };

    const confirm = licenseRegisterConfirmPassword.trim();
    if (confirm) {
      payloadBody.confirm_password = confirm;
    }

    let lastAttempt: {
      snapshot: LicenseSnapshot;
      returnedLicenseKey: string;
      httpStatus: number;
      rawBody: string;
      success: boolean;
      backendMessage: string;
      attemptedUrl: string;
      transportError?: string;
    } | null = null;

    for (const endpoint of endpointCandidates) {
      try {
        const response = await requestLicenseApiViaNative("POST", endpoint, payloadBody);
        if (!response) {
          lastAttempt = {
            snapshot: parseLicenseSnapshot(buildRegisterSnapshotPayload({}, installationId)),
            returnedLicenseKey: "",
            httpStatus: 0,
            rawBody: "",
            success: false,
            backendMessage: "",
            attemptedUrl: endpoint,
            transportError: "Falha nativa ao chamar o endpoint de cadastro.",
          };
          continue;
        }

        const rawText = response.rawBody;
        console.info("[license/register] url", endpoint);
        console.info("[license/register] status", response.statusCode);
        console.info("[license/register] raw", rawText);

        const parsed = response.body;
        const payload = normalizeLicenseApiPayload(parsed);
        const hasRegisterContract =
          (("success" in parsed) || ("success" in payload)) &&
          (typeof parsed.user === "object" || typeof payload.user === "object") &&
          (Object.prototype.hasOwnProperty.call(parsed, "license") || Object.prototype.hasOwnProperty.call(payload, "license"));

        if (!hasRegisterContract) {
          lastAttempt = {
            snapshot: parseLicenseSnapshot(buildRegisterSnapshotPayload(parsed, installationId)),
            returnedLicenseKey: "",
            httpStatus: response.statusCode,
            rawBody: rawText,
            success: false,
            backendMessage: getBackendMessage(payload, parsed),
            attemptedUrl: endpoint,
          };
          continue;
        }

        const success = payload.success === true || parsed.success === true;
        const snapshotPayload = buildRegisterSnapshotPayload(parsed, installationId);
        const backendMessage = getBackendMessage(payload, parsed);
        const licenseRecord = payload.license && typeof payload.license === "object"
          ? (payload.license as Record<string, unknown>)
          : {};

        const returnedLicenseKey =
          (typeof payload.license_key === "string" && payload.license_key.trim()) ||
          (typeof licenseRecord.license_key === "string" && licenseRecord.license_key.trim()) ||
          "";
        const attempt = {
          snapshot: parseLicenseSnapshot(snapshotPayload),
          returnedLicenseKey,
          httpStatus: response.statusCode,
          rawBody: rawText,
          success,
          backendMessage,
          attemptedUrl: endpoint,
        };

        lastAttempt = attempt;

        if (response.statusCode !== 404) {
          return attempt;
        }
      } catch (error) {
        lastAttempt = {
          snapshot: parseLicenseSnapshot(buildRegisterSnapshotPayload({}, installationId)),
          returnedLicenseKey: "",
          httpStatus: 0,
          rawBody: "",
          success: false,
          backendMessage: "",
          attemptedUrl: endpoint,
          transportError: error instanceof Error ? error.message : "Erro de rede ao chamar o cadastro.",
        };
      }
    }

    return lastAttempt;
  }

  async function requestLicenseLogin(email: string, password: string) {
    const endpoint = resolveLicenseEndpointUrl(
      LOGIN_ENDPOINT_URL,
      LOGIN_ENDPOINT_PATH,
      buildLocalhostApiCandidates("login.php")
    );
    if (!endpoint) return null;

    const response = await requestLicenseApiViaNative("POST", endpoint, {
      email,
      password,
      device_id: installationId,
      device_name: getDeviceNameLabel(),
      device_platform: getPlatformLabel(),
    });
    if (!response) return null;

    const rawText = response.rawBody;
    const parsed = response.body;
    const snapshotPayload = buildAuthSnapshotPayload(parsed, installationId);
    const envelope = normalizeLicenseApiPayload(parsed);
    const success = envelope.success === true || parsed.success === true;
    const hasFormalContract =
      success &&
      (typeof envelope.code === "string" || typeof parsed.code === "string") &&
      (typeof envelope.status === "string" || typeof parsed.status === "string") &&
      (typeof envelope.valid === "boolean" || typeof parsed.valid === "boolean") &&
      (typeof envelope.active === "boolean" || typeof parsed.active === "boolean");
    const licenseRecord = envelope.license && typeof envelope.license === "object"
      ? (envelope.license as Record<string, unknown>)
      : {};
    const returnedLicenseKey =
      (typeof envelope.license_key === "string" && envelope.license_key.trim()) ||
      (typeof licenseRecord.license_key === "string" && licenseRecord.license_key.trim()) ||
      "";

    return {
      snapshot: parseLicenseSnapshot(snapshotPayload),
      returnedLicenseKey,
      httpStatus: response.statusCode,
      rawBody: rawText,
      success: hasFormalContract,
      backendMessage: getBackendMessage(envelope, parsed),
    };
  }

  async function requestLicenseMe() {
    const endpoint = resolveLicenseEndpointUrl(
      ME_ENDPOINT_URL,
      ME_ENDPOINT_PATH,
      buildLocalhostApiCandidates("me.php")
    );
    if (!endpoint) return null;

    let response = await requestLicenseApiViaNative("GET", endpoint);

    if (!response || response.statusCode >= 400) {
      response = await requestLicenseApiViaNative("POST", endpoint, {
        device_id: installationId,
      });
    }
    if (!response) return null;

    const rawText = response.rawBody;
    const parsed = response.body;
    const snapshotPayload = buildAuthSnapshotPayload(parsed, installationId);
    const envelope = normalizeLicenseApiPayload(parsed);
    const success = envelope.success === true || parsed.success === true;
    const hasFormalContract =
      success &&
      (typeof envelope.code === "string" || typeof parsed.code === "string") &&
      (typeof envelope.status === "string" || typeof parsed.status === "string") &&
      (typeof envelope.valid === "boolean" || typeof parsed.valid === "boolean") &&
      (typeof envelope.active === "boolean" || typeof parsed.active === "boolean");
    const licenseRecord = envelope.license && typeof envelope.license === "object"
      ? (envelope.license as Record<string, unknown>)
      : {};
    const returnedLicenseKey =
      (typeof envelope.license_key === "string" && envelope.license_key.trim()) ||
      (typeof licenseRecord.license_key === "string" && licenseRecord.license_key.trim()) ||
      "";

    return {
      snapshot: parseLicenseSnapshot(snapshotPayload),
      returnedLicenseKey,
      httpStatus: response.statusCode,
      rawBody: rawText,
      success: hasFormalContract,
      backendMessage: getBackendMessage(envelope, parsed),
    };
  }

  async function requestLicenseValidateApi(licenseValue: string) {
    const endpoint = resolveLicenseEndpointUrl(
      VALIDATE_ENDPOINT_URL,
      VALIDATE_ENDPOINT_PATH,
      buildLocalhostApiCandidates("validate.php")
    );
    if (!endpoint) return null;

    const response = await requestLicenseApiViaNative("POST", endpoint, {
      license_key: licenseValue,
      series: installationId,
      device_id: installationId,
      device_name: getDeviceNameLabel(),
      device_platform: getPlatformLabel(),
      platform: getPlatformLabel(),
      app_version: APP_VERSION,
    });
    if (!response) return null;

    const parsed = response.body;
    const payload = normalizeLicenseApiPayload(parsed);

    const hasFormalContract =
      (typeof payload.code === "string" || typeof parsed.code === "string") &&
      (typeof payload.status === "string" || typeof parsed.status === "string") &&
      (typeof payload.valid === "boolean" || typeof parsed.valid === "boolean") &&
      (typeof payload.active === "boolean" || typeof parsed.active === "boolean");
    if (!hasFormalContract) {
      return null;
    }

    return parseLicenseSnapshot(payload);
  }

  async function requestLicenseStatus(includeDevices = true, licenseKeyOverride?: string) {
    const effectiveLicenseKey = (licenseKeyOverride ?? licenseKeyInput).trim();
    if (!effectiveLicenseKey || !installationId) {
      return null;
    }

    const endpoint = resolveLicenseEndpointUrl(
      STATUS_ENDPOINT_URL,
      STATUS_ENDPOINT_PATH,
      buildLocalhostApiCandidates("status.php")
    );
    if (!endpoint) return null;

    const query = new URLSearchParams({
      license_key: effectiveLicenseKey,
      series: installationId,
      installation_uuid: installationId,
      device_id: installationId,
      device_name: getDeviceNameLabel(),
      device_platform: getPlatformLabel(),
      include_devices: includeDevices ? "1" : "0",
    });

    let response = await requestLicenseApiViaNative("GET", `${endpoint}?${query.toString()}`);

    if (!response || response.statusCode >= 400) {
      response = await requestLicenseApiViaNative("POST", endpoint, {
        license_key: effectiveLicenseKey,
        series: installationId,
        installation_uuid: installationId,
        device_id: installationId,
        device_name: getDeviceNameLabel(),
        device_platform: getPlatformLabel(),
        include_devices: includeDevices ? "1" : "0",
      });
    }
    if (!response) return null;

    const parsed = response.body;
    const payload = normalizeLicenseApiPayload(parsed);

    const hasAnyLicenseSignal =
      typeof payload.code === "string" ||
      typeof parsed.code === "string" ||
      typeof payload.status === "string" ||
      typeof parsed.status === "string" ||
      typeof payload.license_type === "string" ||
      typeof parsed.license_type === "string" ||
      (payload.license !== null && typeof payload.license === "object") ||
      (parsed.license !== null && typeof parsed.license === "object");
    if (!hasAnyLicenseSignal) {
      return null;
    }

    const normalizedPayload = buildAuthSnapshotPayload(payload, installationId);
    return parseLicenseSnapshot(normalizedPayload);
  }

  function scoreRecoveredLicenseSnapshot(snapshot: LicenseSnapshot) {
    const code = snapshot.code.toUpperCase();
    let score = 0;

    if (code !== "LICENSE_NOT_FOUND") score += 120;
    if (snapshot.licenseType === "purchased") score += 80;
    if (snapshot.valid) score += 30;
    if (snapshot.active) score += 30;
    if (code === "LICENSE_VALID") score += 40;

    if (code === "LICENSE_NOT_FOUND") score -= 120;
    if (code === "LICENSE_BLOCKED" || code === "LICENSE_REVOKED" || code === "LICENSE_SUSPENDED") {
      score -= 80;
    }

    return score;
  }

  function pickBestRecoveredLicenseSnapshot(candidates: Array<LicenseSnapshot | null | undefined>) {
    const validCandidates = candidates.filter((item): item is LicenseSnapshot => item !== null && item !== undefined);
    if (validCandidates.length === 0) return null;

    return validCandidates.reduce((best, current) => {
      if (!best) return current;
      return scoreRecoveredLicenseSnapshot(current) > scoreRecoveredLicenseSnapshot(best) ? current : best;
    }, validCandidates[0]);
  }

  async function handleRefreshLicenseStatus() {
    setLicenseDevicesLoading(true);
    const effectiveKey = licenseKeyInput.trim() || (localStorage.getItem(LICENSE_KEY_STORAGE_KEY)?.trim() ?? "");
    try {
      let snapshot: LicenseSnapshot | null = null;

      // Try PHP status endpoint first; fall back to native validate on failure (e.g. 403).
      try {
        snapshot = await requestLicenseStatus(true, effectiveKey || undefined);
      } catch {
        // status.php failed — fall through to native validate
      }

      if (!snapshot && effectiveKey && installationId) {
        try {
          const response = await invoke<{ statusCode: number; body: Record<string, unknown> }>("validate_license", {
            payload: {
              licenseKey: effectiveKey,
              series: effectiveKey,
              deviceId: installationId,
              deviceName: "",
              platform: "",
              appVersion: APP_VERSION,
            },
          });
          console.debug("[AX] validate_license response:", response.statusCode, JSON.stringify(response.body).slice(0, 200));
          if (response.statusCode < 400) {
            const payload = normalizeLicenseApiPayload(response.body ?? {});
            snapshot = parseLicenseSnapshot(payload);
          }
        } catch (invokeErr) {
          console.error("[AX] validate_license invoke failed:", invokeErr);
        }
      }

      if (!snapshot) {
        setLicenseValidationMessage({ kind: "error", text: "Não foi possível consultar o status da licença." });
        return;
      }

      applyLicenseSnapshot(snapshot, effectiveKey, snapshot.message || "Status atualizado.");
      setLicenseValidationMessage({ kind: "success", text: snapshot.message || "Status atualizado." });
    } catch (err) {
      console.error("[AX] handleRefreshLicenseStatus failed:", err);
      setLicenseValidationMessage({ kind: "error", text: "Falha ao consultar o status da licença." });
    } finally {
      setLicenseDevicesLoading(false);
    }
  }

  function resolveDeviceEndpointUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/")) {
      try {
        return `${new URL(LICENSE_API_BASE_URL).origin}${path}`;
      } catch {
        return path;
      }
    }
    return buildLicenseApiUrl(path);
  }

  async function callDeviceEndpoint(
    phpFile: string,
    targetDeviceId: string,
    successCodes: string[],
    successMsg: string
  ) {
    if (!licenseKeyInput.trim() || !installationId || !targetDeviceId) return;

    setLicenseDeviceActionBusy(targetDeviceId);
    try {
      const endpoint = resolveDeviceEndpointUrl(phpFile);
      if (!endpoint) {
        setLicenseValidationMessage({ kind: "error", text: "URL da API de licença não configurada." });
        return;
      }

      const response = await requestLicenseApiViaNative("POST", endpoint, {
        license_key: licenseKeyInput.trim(),
        series: installationId,
        installation_uuid: installationId,
        device_id: targetDeviceId,
        device_name: getDeviceNameLabel(),
        device_platform: getPlatformLabel(),
      });

      if (!response) {
        setLicenseValidationMessage({ kind: "error", text: "Falha de conexão com a API. Tente novamente." });
        return;
      }

      // A API retorna HTTP 200 com code no body — usar o code, não o HTTP status
      const body = response.body as Record<string, unknown>;
      const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
      // Rust coloca o body bruto em "message" quando não é JSON válido — ignorar HTML
      const rawMsg = typeof body.message === "string" ? body.message : "";
      const serverMsg = rawMsg.trimStart().startsWith("<") ? "" : rawMsg;

      if (code === "DEVICE_NOT_FOUND") {
        setLicenseValidationMessage({
          kind: "error",
          text: "Dispositivo não localizado nesta licença. Verifique se o ID está correto.",
        });
        return;
      }

      if (code === "ACTIVATION_LIMIT_REACHED") {
        setLicenseValidationMessage({
          kind: "error",
          text: "Limite de dispositivos atingido. Revogue outro dispositivo antes de reativar este.",
        });
        return;
      }

      if (code === "LICENSE_NOT_FOUND") {
        setLicenseValidationMessage({ kind: "error", text: "Licença não encontrada. Verifique a chave informada." });
        return;
      }

      if (response.statusCode === 404) {
        setLicenseValidationMessage({ kind: "error", text: "Endpoint não encontrado. Verifique a configuração da API." });
        return;
      }

      if (response.statusCode >= 400 && !successCodes.includes(code)) {
        setLicenseValidationMessage({ kind: "error", text: serverMsg || "Operação recusada pela API. Tente novamente." });
        return;
      }

      if (!successCodes.includes(code) && code !== "") {
        setLicenseValidationMessage({ kind: "error", text: serverMsg || "Resposta inesperada da API. Tente novamente." });
        return;
      }

      // Reconsultar status com include_devices=1 para atualizar a lista
      await handleRefreshLicenseStatus();
      setLicenseValidationMessage({ kind: "success", text: successMsg });
    } catch (err) {
      setLicenseValidationMessage({ kind: "error", text: licenseApiErrorText(err) ?? "Erro inesperado. Tente novamente." });
    } finally {
      setLicenseDeviceActionBusy(null);
    }
  }

  function handleRevokeLicenseDevice(targetDeviceId: string) {
    void callDeviceEndpoint(
      REVOKE_DEVICE_PATH,
      targetDeviceId,
      ["DEVICE_REVOKED"],
      "Dispositivo revogado com sucesso."
    );
  }

  function handleReactivateLicenseDevice(targetDeviceId: string) {
    void callDeviceEndpoint(
      REACTIVATE_DEVICE_PATH,
      targetDeviceId,
      ["DEVICE_REACTIVATED", "DEVICE_ALREADY_ACTIVE"],
      "Dispositivo reativado com sucesso."
    );
  }

  function buildUpgradeDraft() {
    return [
      "Olá! Quero comprar a licença do AX Control e ter acesso completo.",
      "Pode me orientar com o pagamento e ativação?",
    ].join("\n");
  }

  async function handleContactForUpgrade() {
    const draft = buildUpgradeDraft();

    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      // continua com canais de contato
    }

    if (SUPPORT_WHATSAPP) {
      const digits = SUPPORT_WHATSAPP.replace(/\D/g, "");
      const encodedDraft = encodeURIComponent(draft);
      const webUrl = `https://wa.me/${digits}?text=${encodedDraft}`;

      setLicenseValidationMessage({ kind: "idle", text: "" });

      try {
        if (shouldPreferDirectWhatsAppLaunch()) {
          const appUrl = `whatsapp://send?phone=${digits}&text=${encodedDraft}`;

          try {
            await openUrl(appUrl);
            return;
          } catch {
            await openUrl(webUrl, "inAppBrowser");
            return;
          }
        }

        await openUrl(webUrl);
        return;
      } catch {
        if (shouldPreferDirectWhatsAppLaunch()) {
          const appUrl = `whatsapp://send?phone=${digits}&text=${encodedDraft}`;
          const launchedAt = Date.now();

          window.location.href = appUrl;
          window.setTimeout(() => {
            if (Date.now() - launchedAt < 1400) {
              window.open(webUrl, "_blank", "noopener,noreferrer");
            }
          }, 900);
          return;
        }

        window.open(webUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    if (SUPPORT_EMAIL) {
      const subject = encodeURIComponent("Upgrade para licença Purchased - AX Control");
      const body = encodeURIComponent(draft);
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
      setLicenseValidationMessage({
        kind: "success",
        text: `Oferta de upgrade ${UPGRADE_PRICE_LABEL}. E-mail aberto com seus dados.`,
      });
      return;
    }

    setLicenseValidationMessage({
      kind: "error",
      text: "Configure contato de suporte (WhatsApp ou e-mail) para finalizar a compra.",
    });
  }

  function openUpgradeOfferForMixer(mixer: DiscoveredMixer, mandatory: boolean) {
    setPendingDiscoveryMixer(mixer);
    setLicenseValidationMessage({ kind: "idle", text: "" });
    setLicenseModalMandatory(mandatory);
    setLicenseModalMode("upgrade");
    setLicenseModalOpen(true);
  }

  function connectToSelectedMixer(mixer: DiscoveredMixer) {
    const compatibility = getMixerCompatibility(mixer);

    if (!compatibility.supported) {
      setConnectionError(compatibility.reason);
      setStatus(compatibility.reason);
      return;
    }

    const resolvedChannelCount = resolveMixerChannelCount(mixer);

    // Bloquear connect silencioso com profile errado: se o modelo não foi identificado
    // via discovery/probe e não é conexão manual explícita, exigir seleção do usuário.
    if (resolvedChannelCount === undefined && mixer.source !== "manual") {
      const message =
        "Modelo da mesa não identificado. Selecione o modelo na lista ou use 'Conexão Manual'.";
      setConnectionError(message);
      setStatus(message);
      return;
    }

    const normalizedChannels = resolvedChannelCount ?? normalizeSupportedChannelCount(mixer.channels);
    const protocolProfile = channelCountToProtocolProfile(normalizedChannels);
    const connectSource = mixer.source === "manual" ? "manual" : "discovered";
    const profileConfidence: ProfileConfidence =
      mixer.source === "manual" ? "manual" : "confirmed";

    if (import.meta.env.DEV) {
      console.debug(
        `[AX] connectToSelectedMixer: ip=${mixer.ip} channels=${normalizedChannels}` +
        ` profile=${protocolProfile} confidence=${profileConfidence} source=${mixer.source}`
      );
    }

    applyMixerChannelProfile(normalizedChannels);
    setConnectionError(null);
    void connectToMixer(mixer.ip, connectSource, protocolProfile, normalizedChannels);
  }

  function handleContinueTrialConnection() {
    if (!pendingDiscoveryMixer) return;

    const mixer = pendingDiscoveryMixer;
    setPendingDiscoveryMixer(null);
    setLicenseModalOpen(false);
    setLicenseModalMandatory(false);
    connectToSelectedMixer(mixer);
  }

  function handleLicenseOnboardingSuccess(successMessage: string) {
    setLicenseModalMandatory(false);
    setLicenseModalMode("settings");
    setLicenseModalOpen(false);
    setLicenseValidationMessage({
      kind: "success",
      text: successMessage,
    });

    if (!pendingDiscoveryMixer) {
      return;
    }

    const mixer = pendingDiscoveryMixer;
    setPendingDiscoveryMixer(null);
    connectToSelectedMixer(mixer);
  }

  function buildLicenseRegistrationDraft() {
    return [
      "Solicitação de cadastro/licença - AX Controller",
      `Nome: ${licenseRegisterName || ""}`,
      `E-mail: ${licenseRegisterEmail || ""}`,
      `Telefone: ${licenseRegisterPhone || ""}`,
      `UUID: ${installationId || "indisponivel"}`,
      `Dispositivo: ${getDeviceNameLabel()}`,
      `Plataforma: ${getPlatformLabel()}`,
      `Versão app: ${APP_VERSION}`,
      `Data: ${new Date().toISOString()}`,
    ].join("\n");
  }

  async function handleRequestLicenseRegistration() {
    const name = licenseRegisterName.trim();
    const email = licenseRegisterEmail.trim();
    const phoneDigits = normalizePhoneDigits(licenseRegisterPhone);
    const password = licenseRegisterPassword.trim();
    const confirm = licenseRegisterConfirmPassword.trim();

    if (!name || !email || !password) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Preencha os dados corretamente para seguir.",
      });
      return;
    }

    if (phoneDigits && phoneDigits.length < 10) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Informe um telefone válido com DDD para continuar.",
      });
      return;
    }

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmailValid) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Informe um e-mail válido para continuar.",
      });
      return;
    }

    if (password.length < 8) {
      setLicenseValidationMessage({
        kind: "error",
        text: "A senha deve ter pelo menos 8 caracteres.",
      });
      return;
    }

    if (!confirm) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Confirme sua senha para continuar.",
      });
      return;
    }

    if (!installationId) {
      setLicenseValidationMessage({ kind: "error", text: "UUID da instalação indisponível." });
      return;
    }

    if (licenseRegisterConfirmPassword && licenseRegisterConfirmPassword !== licenseRegisterPassword) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Senha e confirmação estão diferentes.",
      });
      return;
    }

    setLicenseRegisterBusy(true);
    setLicenseValidationMessage({ kind: "idle", text: "" });
    try {
      const registered = await requestLicenseRegister(licenseRegisterWantsUpgrade);
      if (registered) {
        if (registered.httpStatus >= 400) {
          setLicenseValidationMessage({
            kind: "error",
            text: buildRegistrationFailureMessage({
              httpStatus: registered.httpStatus,
              backendMessage: registered.backendMessage,
              rawBody: registered.rawBody,
              transportError: registered.transportError,
            }),
          });
          return;
        }

        if (!registered.success) {
          setLicenseValidationMessage({
            kind: "error",
            text: buildRegistrationFailureMessage({
              httpStatus: registered.httpStatus,
              backendMessage: registered.backendMessage,
              rawBody: registered.rawBody,
              transportError: registered.transportError,
            }),
          });
          return;
        }

        const returnedKey = registered.returnedLicenseKey || licenseKeyInput.trim();
        if (returnedKey) {
          localStorage.setItem(LICENSE_KEY_STORAGE_KEY, returnedKey);
          setLicenseKeyInput(returnedKey);
        }

        const statusSnapshot = returnedKey ? await requestLicenseStatus(true, returnedKey) : null;
        const validatedSnapshot = statusSnapshot ?? (returnedKey ? await requestLicenseValidateApi(returnedKey) : null);
        const snapshotToApply = validatedSnapshot ?? registered.snapshot;

        applyLicenseSnapshot(
          snapshotToApply,
          returnedKey,
          snapshotToApply.message || "Cadastro concluído. Teste grátis iniciado."
        );

        const resolvedState = resolveLicenseFormalState({
          snapshot: snapshotToApply,
          warningDays: LICENSE_REVALIDATE_WARNING_DAYS,
          fallbackTrialExpiryAt: licenseTrialExpiryAt,
          fallbackNextRevalidationAt: licenseNextRevalidationAt,
        });

        if (!isLicenseStateBlocked(resolvedState)) {
          localStorage.setItem(LICENSE_ACTIVATED_ONCE_STORAGE_KEY, "1");
          setHasLicenseActivatedOnce(true);
          localStorage.setItem(LICENSE_VALIDATED_STORAGE_KEY, "1");
          setIsLicenseValidated(true);
          setLicenseOnboardingView("register");
          setLicenseRegisterName("");
          setLicenseRegisterEmail("");
          setLicenseRegisterPhone("");
          setLicenseRegisterPassword("");
          setLicenseRegisterConfirmPassword("");
          handleLicenseOnboardingSuccess(snapshotToApply.message || "Cadastro concluído com sucesso.");
          return;
        }

        setLicenseValidationMessage({
          kind: "error",
          text: snapshotToApply.message || "Não foi possível concluir o cadastro com os dados informados.",
        });
        return;
      }

      const draft = buildLicenseRegistrationDraft();
      try {
        await navigator.clipboard.writeText(draft);
      } catch {
        // Se falhar copiar, ainda tentamos abrir canal de contato.
      }

      if (SUPPORT_WHATSAPP) {
        const digits = SUPPORT_WHATSAPP.replace(/\D/g, "");
        const url = `https://wa.me/${digits}?text=${encodeURIComponent(draft)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        setLicenseValidationMessage({
          kind: "success",
          text: "Cadastro não disponível via API. Dados copiados e WhatsApp aberto.",
        });
        return;
      }

      if (SUPPORT_EMAIL) {
        const subject = encodeURIComponent("Cadastro de licença - AX Controller");
        const body = encodeURIComponent(draft);
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
        setLicenseValidationMessage({
          kind: "success",
          text: "Cadastro não disponível via API. Dados copiados e e-mail aberto.",
        });
        return;
      }

      setLicenseValidationMessage({
        kind: "error",
        text: "Cadastro indisponível nesta API. Nenhum endpoint retornou resposta válida.",
      });
    } catch {
      setLicenseValidationMessage({ kind: "error", text: "Falha ao cadastrar licença/teste grátis." });
    } finally {
      setLicenseRegisterBusy(false);
    }
  }

  async function handleRecoverLicenseByCredentials() {
    const email = licenseSignInEmail.trim();
    const password = licenseSignInPassword.trim();

    if (!email || !password) {
      setLicenseValidationMessage({
        kind: "error",
        text: "Preencha e-mail e senha para recuperar sua licença.",
      });
      return;
    }

    setLicenseSignInBusy(true);
    setLicenseValidationMessage({ kind: "idle", text: "" });

    try {
      const loginResult = await requestLicenseLogin(email, password);
      if (!loginResult) {
        setLicenseValidationMessage({
          kind: "error",
          text: "Não foi possível iniciar sessão. Verifique a configuração da API de licença.",
        });
        return;
      }

      if (loginResult.httpStatus >= 400) {
        const invalidCredentials = loginResult.httpStatus === 401 || loginResult.httpStatus === 403;
        setLicenseValidationMessage({
          kind: "error",
          text: loginResult.backendMessage || (invalidCredentials
            ? "E-mail ou senha inválidos. Tente novamente."
            : "Falha ao entrar no momento. Tente novamente em instantes."),
        });
        return;
      }

      if (!loginResult.success) {
        setLicenseValidationMessage({
          kind: "error",
          text: loginResult.backendMessage || "Resposta de login fora do contrato esperado do backend.",
        });
        return;
      }

      let returnedKey = loginResult.returnedLicenseKey || licenseKeyInput.trim();

      const meResult = await requestLicenseMe();
      if (meResult && meResult.httpStatus < 400 && meResult.success && meResult.returnedLicenseKey) {
        returnedKey = meResult.returnedLicenseKey;
      }

      if (returnedKey) {
        localStorage.setItem(LICENSE_KEY_STORAGE_KEY, returnedKey);
        setLicenseKeyInput(returnedKey);
      }

      const meSnapshot = meResult?.httpStatus && meResult.httpStatus < 400 && meResult.success
        ? meResult.snapshot
        : null;
      const statusSnapshot = returnedKey ? await requestLicenseStatus(true, returnedKey) : null;
      const validateSnapshot = returnedKey ? await requestLicenseValidateApi(returnedKey) : null;
      const snapshotToApply = pickBestRecoveredLicenseSnapshot([
        statusSnapshot,
        validateSnapshot,
        meSnapshot,
        loginResult.snapshot,
      ]);

      if (!snapshotToApply) {
        setLicenseValidationMessage({
          kind: "error",
          text: "Não foi possível determinar o estado atualizado da licença. Tente novamente.",
        });
        return;
      }

      applyLicenseSnapshot(
        snapshotToApply,
        returnedKey,
        snapshotToApply.message || "Licença recuperada com sucesso."
      );

      const resolvedState = resolveLicenseFormalState({
        snapshot: snapshotToApply,
        warningDays: LICENSE_REVALIDATE_WARNING_DAYS,
        fallbackTrialExpiryAt: licenseTrialExpiryAt,
        fallbackNextRevalidationAt: licenseNextRevalidationAt,
      });

      if (isLicenseStateBlocked(resolvedState)) {
        setLicenseValidationMessage({
          kind: "error",
          text: snapshotToApply.message || "Sua licença está bloqueada. Regularize para continuar.",
        });
        return;
      }

      localStorage.setItem(LICENSE_VALIDATED_STORAGE_KEY, "1");
      localStorage.setItem(LICENSE_ACTIVATED_ONCE_STORAGE_KEY, "1");
      setHasLicenseActivatedOnce(true);
      setLicenseSignInPassword("");
      handleLicenseOnboardingSuccess("Dados de licença recuperados com sucesso.");
    } catch (err) {
      const text = licenseApiErrorText(err) ?? "Não foi possível autenticar. Verifique e-mail, senha e tente novamente.";
      setLicenseValidationMessage({ kind: "error", text });
    } finally {
      setLicenseSignInBusy(false);
    }
  }

  const MAX_AUTO_RECONNECT_ATTEMPTS = 6;

  function scheduleAutoReconnect(delayMs = 2000) {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      void attemptAutoReconnect();
    }, delayMs);
  }

  async function attemptAutoReconnect() {
    const params = reconnectParamsRef.current;
    if (!params) return;

    reconnectAttemptsRef.current += 1;

    if (reconnectAttemptsRef.current > MAX_AUTO_RECONNECT_ATTEMPTS) {
      reconnectParamsRef.current = null;
      reconnectAttemptsRef.current = 0;
      setStatus("Nao foi possivel reconectar. Verifique a conexao de rede.");
      setAppStage("device-selection");
      return;
    }

    const connected = await connectToMixer(params.ip, params.source, params.profile, params.channelCount);

    if (!connected) {
      // Backoff: 2s, 3s, 4s, 5s, 5s, 5s
      const delay = Math.min(2000 + (reconnectAttemptsRef.current - 1) * 1000, 5000);
      scheduleAutoReconnect(delay);
    }
  }

  function handleDisconnect() {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectParamsRef.current = null;
    reconnectAttemptsRef.current = 0;

    stopMeterPolling();
    clearScheduledSendWrites();
    clearLocalParamWriteTracking();

    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setConnectionError(null);
    setStatus("Desconectado");
    setDetailView(null);
    setMainView("mixer");
    setSettingsDropdownOpen(false);
    setAppStage("device-selection");
    setConnectingSource(null);
    setActiveMixerCacheIdentity(null);
    const blocked = isLicenseStateBlocked(licenseFormalState);
    setLicenseModalMandatory(blocked);
    setLicenseModalMode(blocked ? (licenseFormalState === "TRIAL_EXPIRED" ? "upgrade" : "onboarding") : "settings");
    setLicenseModalOpen(blocked);
  }

  function handleLogout() {
    stopMeterPolling();
    clearScheduledSendWrites();
    clearLocalParamWriteTracking();

    clientRef.current?.disconnect();
    clientRef.current = null;

    localStorage.removeItem(LICENSE_KEY_STORAGE_KEY);
    localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
    localStorage.removeItem(LICENSE_STATUS_STORAGE_KEY);
    localStorage.removeItem(LICENSE_ACTIVATED_ONCE_STORAGE_KEY);
    clearRuntimeLicenseCache();

    setIsConnected(false);
    setConnectionError(null);
    setStatus("Sessao encerrada");
    setDetailView(null);
    setMainView("mixer");
    setSettingsDropdownOpen(false);
    setAppStage("device-selection");
    setConnectingSource(null);
    setActiveMixerCacheIdentity(null);
    setPendingDiscoveryMixer(null);

    setLicenseKeyInput("");
    setLicenseSignInEmail("");
    setLicenseSignInPassword("");
    setLicenseRegisterPassword("");
    setLicenseRegisterConfirmPassword("");
    setHasLicenseActivatedOnce(false);
    setIsLicenseValidated(false);
    setLicenseFormalState("LICENSE_NOT_FOUND");
    setLicenseNextRevalidationAt(null);
    setLicenseTrialExpiryAt(null);
    setLicenseUnlimitedActivations(false);
    setLicenseLinkedUserType(null);
    setLicenseActiveDevicesCount(null);
    setLicenseRemainingActivations(null);
    setLicenseDevices([]);
    setLicenseRevalidationHint("");
    setLicenseValidationMessage({ kind: "idle", text: "" });
    setLicenseModalMandatory(true);
    setLicenseModalMode("onboarding");
    setLicenseModalOpen(true);
  }

  function enforceLicenseBlock(message: string, mode: "onboarding" | "upgrade" = "onboarding") {
    stopMeterPolling();
    clearScheduledSendWrites();
    clearLocalParamWriteTracking();

    clientRef.current?.disconnect();
    clientRef.current = null;

    setIsConnected(false);
    setConnectionError(message);
    setStatus(message);
    setConnectingSource(null);
    setDetailView(null);
    setMainView("mixer");
    setSettingsDropdownOpen(false);
    setAppStage("device-selection");
    setLicenseModalMandatory(true);
    setLicenseModalMode(mode);
    setLicenseModalOpen(true);
  }

  function openLicenseModal(mandatory = false, mode: "onboarding" | "settings" | "upgrade" = "settings") {
    setLicenseModalMandatory(mandatory);
    setLicenseModalMode(mandatory && mode !== "upgrade" ? "onboarding" : mode);
    setLicenseValidationMessage({ kind: "idle", text: "" });
    setLicenseModalOpen(true);
    setSettingsDropdownOpen(false);
  }

  function closeLicenseModal() {
    if (licenseModalMandatory) return;
    setPendingDiscoveryMixer(null);
    setLicenseModalOpen(false);
  }

  function stopPixPolling() {
    if (pixPollingRef.current !== null) {
      clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
  }

  async function handlePixPaymentApproved(licenseKey: string) {
    stopPixPolling();
    setPixPayment({ stage: "confirmed" });
    localStorage.setItem(LICENSE_KEY_STORAGE_KEY, licenseKey);
    localStorage.setItem(LICENSE_ACTIVATED_ONCE_STORAGE_KEY, "1");
    setHasLicenseActivatedOnce(true);
    setLicenseKeyInput(licenseKey);

    localStorage.removeItem("ax_pending_pix_payment_id");
    // Guard flag: prevents background revalidation from downgrading to trial
    // before the server confirms the purchased status.
    localStorage.setItem("ax_pix_purchase_confirmed", licenseKey);

    // Apply purchased state immediately so the UI never reverts to trial.
    const syntheticSnapshot: LicenseSnapshot = {
      code: "LICENSE_VALID",
      valid: true,
      active: true,
      status: "active",
      message: "Licença ativada com sucesso!",
      licenseType: "purchased",
      licenseSeries: "",
      trialExpiryAt: null,
      installationUuid: installationId ?? "",
      nextRevalidationAt: null,
      activeDevices: null,
      remainingActivations: null,
      unlimitedActivations: false,
      linkedUserType: "user",
      devices: [],
    };
    applyLicenseSnapshot(syntheticSnapshot, licenseKey, "Licença ativada com sucesso!");

    // Confirm with the admin via native validate (correct endpoint + app key).
    // Only update if admin confirms purchased; otherwise keep the synthetic snapshot.
    void invoke<{ statusCode: number; body: Record<string, unknown> }>("validate_license", {
      payload: {
        licenseKey,
        series: licenseKey,
        deviceId: installationId ?? "",
        deviceName: "",
        platform: "",
        appVersion: APP_VERSION,
      },
    }).then((response) => {
      if (response.statusCode < 400) {
        const payload = normalizeLicenseApiPayload(response.body ?? {});
        const snapshot = parseLicenseSnapshot(payload);
        if (snapshot.licenseType === "purchased") {
          localStorage.removeItem("ax_pix_purchase_confirmed");
          applyLicenseSnapshot(snapshot, licenseKey, "Licença ativada com sucesso!");
        }
      }
    }).catch(() => { /* keep synthetic */ });

    window.setTimeout(() => {
      setLicenseModalOpen(false);
      setLicenseModalMandatory(false);
      setLicenseModalMode("settings");
      setPixPayment({ stage: "idle" });
      void runBackgroundLicenseRevalidation(true);
    }, 2500);
  }

  function startPixPolling(paymentId: string) {
    stopPixPolling();
    let noKeyRetries = 0;

    pixPollingRef.current = setInterval(() => {
      if (!installationId) return;

      void apiCheckPixStatus(
        "https://www.axcontrol.com.br",
        PIX_STATUS_PATH,
        paymentId,
        installationId,
        AX_APP_KEY
      ).then((result) => {
        console.debug("[AX] pix status poll:", JSON.stringify(result));
        if (result.status === "approved") {
          if (result.license_key) {
            void handlePixPaymentApproved(result.license_key);
          } else {
            noKeyRetries += 1;
            if (noKeyRetries > 8) {
              stopPixPolling();
              setPixPayment({ stage: "failed", reason: "network" });
            }
          }
        } else if (result.status === "rejected" || result.status === "cancelled") {
          stopPixPolling();
          setPixPayment({ stage: "failed", reason: result.status });
        }
      }).catch((err: unknown) => {
        console.debug("[AX] pix status poll error:", err);
        if (err && typeof err === "object" && "isInvalid" in err) {
          stopPixPolling();
          setPixPayment({ stage: "failed", reason: "expired" });
        }
        // network hiccup — keep polling
      });
    }, 4000);
  }

  async function startPixPayment() {
    if (!installationId) return;
    setPixPayment({ stage: "creating" });
    try {
      const result = await apiCreatePixPayment(
        "https://www.axcontrol.com.br",
        PIX_CREATE_PATH,
        installationId,
        PIX_AMOUNT_BRL,
        "Licença AX Control",
        AX_APP_KEY
      );
      setPixPayment({
        stage: "awaiting",
        paymentId: result.payment_id,
        qrCode: result.qr_code,
        qrCodeBase64: result.qr_code_base64,
        expiresAt: result.expires_at,
      });
      localStorage.setItem("ax_pending_pix_payment_id", result.payment_id);
      startPixPolling(result.payment_id);
    } catch (err) {
      console.error("[AX] startPixPayment failed:", err);
      setPixPayment({ stage: "failed", reason: "network" });
    }
  }

  async function handleCopyInstallationId() {
    if (!installationId) return;
    try {
      await navigator.clipboard.writeText(installationId);
      setLicenseValidationMessage({ kind: "success", text: "UUID copiado para a área de transferência." });
    } catch {
      setLicenseValidationMessage({ kind: "error", text: "Não foi possível copiar o UUID." });
    }
  }

  async function handleValidateLicense() {
    const licenseValue = licenseKeyInput.trim();

    if (!licenseValue) {
      setLicenseValidationMessage({ kind: "error", text: "Informe a chave da licença." });
      return;
    }

    if (!installationId) {
      setLicenseValidationMessage({ kind: "error", text: "UUID da instalação indisponível." });
      return;
    }

    localStorage.setItem(LICENSE_KEY_STORAGE_KEY, licenseValue);

    setLicenseValidationBusy(true);
    setLicenseValidationMessage({ kind: "idle", text: "" });

    try {
      let snapshot = await requestLicenseValidateApi(licenseValue);
      if (!snapshot) {
        const response = await invoke<{ statusCode: number; body: Record<string, unknown> }>("validate_license", {
          payload: {
            licenseKey: licenseValue,
            series: licenseValue,
            deviceId: installationId,
            deviceName: getDeviceNameLabel(),
            platform: getPlatformLabel(),
            appVersion: APP_VERSION,
          },
        });
        if (response.statusCode === 403) {
          throw Object.assign(new Error("APP_KEY_UNAUTHORIZED"), { isAppKeyError: true });
        }
        const payload = normalizeLicenseApiPayload(response.body ?? {});
        snapshot = parseLicenseSnapshot(payload);
      }

      const formalState = resolveLicenseFormalState({
        snapshot,
        warningDays: LICENSE_REVALIDATE_WARNING_DAYS,
        fallbackTrialExpiryAt: licenseTrialExpiryAt,
        fallbackNextRevalidationAt: licenseNextRevalidationAt,
      });

      applyLicenseSnapshot(snapshot, licenseValue, snapshot.message || "Licença validada.");

      if (!isLicenseStateBlocked(formalState)) {
        localStorage.setItem(LICENSE_VALIDATED_STORAGE_KEY, "1");
        localStorage.setItem(LICENSE_ACTIVATED_ONCE_STORAGE_KEY, "1");
        setHasLicenseActivatedOnce(true);
        setLicenseModalOpen(false);
        setLicenseModalMandatory(false);
        setLicenseModalMode("settings");
        setLicenseValidationMessage({ kind: "success", text: snapshot.message || "Licença validada com sucesso." });
        return;
      }

      localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
      localStorage.removeItem(LICENSE_STATUS_STORAGE_KEY);
      clearRuntimeLicenseCache();
      setIsLicenseValidated(false);
      setLicenseValidationMessage({
        kind: "error",
        text: snapshot.message || "Licença bloqueada. Revalide para continuar.",
      });
    } catch (err) {
      const text = licenseApiErrorText(err) ?? "Não foi possível verificar a licença. Tente novamente.";
      setLicenseValidationMessage({ kind: "error", text });
    } finally {
      setLicenseValidationBusy(false);
    }
  }

  async function runBackgroundLicenseRevalidation(force = false, strict = false): Promise<boolean> {
    if (backgroundLicenseRevalidationBusyRef.current) return false;

    const now = Date.now();
    if (!force && !strict && now - lastBackgroundRevalidationAtRef.current < LICENSE_BACKGROUND_RECHECK_COOLDOWN_MS) {
      return false;
    }

    const cached = readCachedLicenseStatus();
    if (!force && !strict) {
      if (!cached || cached.installationId !== installationId || cached.code !== "LICENSE_VALID") {
        return false;
      }
    } else if (cached && cached.installationId !== installationId) {
      return false;
    }

    if (strict && !isOnline) {
      localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
      setIsLicenseValidated(false);
      setLicenseRevalidationHint("");
      setLicenseValidationMessage({
        kind: "error",
        text: "Validação online obrigatória. Conecte-se à internet para continuar.",
      });
      setLicenseModalMandatory(true);
      setLicenseModalMode("onboarding");
      setLicenseModalOpen(true);
      return false;
    }

    const licenseValue = localStorage.getItem(LICENSE_KEY_STORAGE_KEY)?.trim() ?? "";
    if (!licenseValue) {
      if (strict) {
        localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
        setIsLicenseValidated(false);
        setLicenseRevalidationHint("");
        setLicenseValidationMessage({ kind: "error", text: "Chave de licença não encontrada neste dispositivo." });
        setLicenseModalMandatory(true);
        setLicenseModalMode("onboarding");
        setLicenseModalOpen(true);
      }
      return false;
    }

    backgroundLicenseRevalidationBusyRef.current = true;
    lastBackgroundRevalidationAtRef.current = now;

    try {
      const pixPurchaseConfirmedKey = localStorage.getItem("ax_pix_purchase_confirmed");
      const pixPurchaseGuardActive = Boolean(pixPurchaseConfirmedKey);

      if (LICENSE_API_BASE_URL) {
        const statusSnapshot = await requestLicenseStatus(false, licenseValue);
        if (statusSnapshot) {
          // If a Pix purchase was recently confirmed, don't downgrade to trial
          // until the backend explicitly confirms purchased status.
          if (pixPurchaseGuardActive && statusSnapshot.licenseType !== "purchased") {
            backgroundLicenseRevalidationBusyRef.current = false;
            return true;
          }
          if (statusSnapshot.licenseType === "purchased") {
            localStorage.removeItem("ax_pix_purchase_confirmed");
          }

          const formalState = resolveLicenseFormalState({
            snapshot: statusSnapshot,
            warningDays: LICENSE_REVALIDATE_WARNING_DAYS,
            fallbackTrialExpiryAt: licenseTrialExpiryAt,
            fallbackNextRevalidationAt: licenseNextRevalidationAt,
          });

          applyLicenseSnapshot(statusSnapshot, licenseValue, statusSnapshot.message || "Status de licença atualizado.");

          if (!isLicenseStateBlocked(formalState)) {
            localStorage.setItem(LICENSE_VALIDATED_STORAGE_KEY, "1");
            return true;
          }

          localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
          localStorage.removeItem(LICENSE_STATUS_STORAGE_KEY);
          clearRuntimeLicenseCache();
          setIsLicenseValidated(false);
          setLicenseRevalidationHint("");
          setLicenseValidationMessage({
            kind: "error",
            text: statusSnapshot.message || "Licença revogada/suspensa neste dispositivo.",
          });
          enforceLicenseBlock(statusSnapshot.message || "Licença revogada/suspensa neste dispositivo.");
          return false;
        }
      }

      const response = await invoke<{ statusCode: number; body: Record<string, unknown> }>("validate_license", {
        payload: {
          licenseKey: licenseValue,
          series: licenseValue,
          deviceId: installationId,
          deviceName: getDeviceNameLabel(),
          platform: getPlatformLabel(),
          appVersion: APP_VERSION,
        },
      });
      if (response.statusCode === 403) {
        throw Object.assign(new Error("APP_KEY_UNAUTHORIZED"), { isAppKeyError: true });
      }

      const payload = normalizeLicenseApiPayload(response.body ?? {});
      const snapshot = parseLicenseSnapshot(payload);

      // Same guard: don't downgrade from purchased to trial if payment was recently confirmed.
      if (pixPurchaseGuardActive && snapshot.licenseType !== "purchased") {
        backgroundLicenseRevalidationBusyRef.current = false;
        return true;
      }
      if (snapshot.licenseType === "purchased") {
        localStorage.removeItem("ax_pix_purchase_confirmed");
      }

      const formalState = resolveLicenseFormalState({
        snapshot,
        warningDays: LICENSE_REVALIDATE_WARNING_DAYS,
        fallbackTrialExpiryAt: licenseTrialExpiryAt,
        fallbackNextRevalidationAt: licenseNextRevalidationAt,
      });

      applyLicenseSnapshot(snapshot, licenseValue, snapshot.message || "Licença validada.");

      if (!isLicenseStateBlocked(formalState)) {
        localStorage.setItem(LICENSE_VALIDATED_STORAGE_KEY, "1");
        return true;
      }

      localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
      localStorage.removeItem(LICENSE_STATUS_STORAGE_KEY);
      clearRuntimeLicenseCache();
      setIsLicenseValidated(false);
      setLicenseRevalidationHint("");
      setLicenseValidationMessage({
        kind: "error",
        text: snapshot.message || "Licença suspensa ou inválida. Revalide para continuar.",
      });
      enforceLicenseBlock(snapshot.message || "Licença suspensa ou inválida. Revalide para continuar.");
      return false;
    } catch (err) {
      const knownErrText = licenseApiErrorText(err);
      if (knownErrText) {
        setLicenseValidationMessage({ kind: "error", text: knownErrText });
      } else if (strict) {
        localStorage.removeItem(LICENSE_VALIDATED_STORAGE_KEY);
        setIsLicenseValidated(false);
        setLicenseRevalidationHint("");
        setLicenseValidationMessage({
          kind: "error",
          text: "Falha ao validar na API. Acesso bloqueado até nova validação.",
        });
        enforceLicenseBlock("Falha ao validar na API. Acesso bloqueado até nova validação.");
      }
    } finally {
      backgroundLicenseRevalidationBusyRef.current = false;
    }

    return false;
  }

  function handlePreconnectMixerSelection(mixer: DiscoveredMixer) {
    if (licenseFormalState === "TRIAL_EXPIRED") {
      openUpgradeOfferForMixer(mixer, true);
      return;
    }

    if (!isLicenseValidated || isLicenseStateBlocked(licenseFormalState)) {
      setPendingDiscoveryMixer(mixer);
      setLicenseValidationMessage({
        kind: "error",
        text: "Valide a licença antes de conectar ao mixer.",
      });
      openLicenseModal(true, "onboarding");
      return;
    }

    connectToSelectedMixer(mixer);
  }

  function toggleMute(channelNumber: number) {
    const targets = getLinkedChannelTargets(channelNumber);
    const current = channels[channelNumber - 1];
    const nextValue = !current.muted;

    targets.forEach((target) => {
      const client = clientRef.current;
      if (!client) return;

      if (!ENABLE_SEMANTIC_SET_CHANNEL_MUTE_PILOT) {
        client.setMute(target, nextValue);
        updateChannelState(target, { muted: nextValue });
        return;
      }

      try {
        const command: SemanticCommand<boolean> = {
          name: "setChannelMute",
          address: {
            path: `/ax/ch/${target}/mute`,
            segments: ["ax", "ch", target, "mute"],
          },
          value: nextValue,
          meta: {
            source: "ui",
          },
        };

        const context: SemanticCommandContext = {
          activeProfile: ACTIVE_CHANNEL_PROFILE,
          profileReliable: isConnected,
          issuedAt: Date.now(),
        };

        const resolved = setChannelMutePilotResolver.resolve(command, context);
        resolved.writes.forEach((write) => {
          client.sendParam(write.param, write.value);
        });
      } catch {
        // Safe rollback path for pilot: keep current production behavior.
        client.setMute(target, nextValue);
      }

      updateChannelState(target, { muted: nextValue });
    });
  }

  function toggleChannelSolo(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);
    const linked = Boolean(channelLinks[key]);

    if (linked) {
      const pairSoloOn = channels[odd - 1].soloOn || channels[even - 1].soloOn;
      const nextValue = !pairSoloOn;
      client.setChannelSoloPair(odd, nextValue, { db: 0, tapPoint: "post" });
      updateChannelState(odd, { soloOn: nextValue });
      updateChannelState(even, { soloOn: nextValue });
      return;
    }

    const nextValue = !channels[channelNumber - 1].soloOn;
    client.setChannelSolo(channelNumber, nextValue, { db: 0, tapPoint: "post" });
    updateChannelState(channelNumber, { soloOn: nextValue });
  }

  function togglePhantom(channelNumber: number) {
    const targets = getLinkedChannelTargets(channelNumber);
    const current = channels[channelNumber - 1];
    const nextValue = !current.phantomOn;

    targets.forEach((target) => {
      clientRef.current?.setPhantom(target, nextValue);
      updateChannelState(target, { phantomOn: nextValue });
    });
  }

  async function toggleInputSource(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const current = channels[channelNumber - 1];
    const nextValue = !current.usbInputOn;
    const expectedRawValue = resolveExpectedInputSourceRawForToggle(nextValue);
    const controlChannel = isAx32ProfileActive()
      ? resolveInputSourceControlChannel(channelNumber)
      : channelNumber;
    if (controlChannel === null) {
      setStatus("Canal sem rota valida de entrada no Patching (use CH 1..32).");
      return;
    }
    const sourceParam = inputSourceParam(controlChannel);

    try {
      client.sendParam(sourceParam, expectedRawValue);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Falha ao alternar INPUT/USB deste canal."
      );
      return;
    }

    updateChannelState(channelNumber, { usbInputOn: nextValue });

    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const verify = await client.readParams([sourceParam], 900);
        const rawValue = verify[0]?.value;

        if (rawValue === undefined) continue;

        updateChannelState(channelNumber, {
          usbInputOn: resolveUsbInputOnFromRaw(rawValue),
        });
        if (rawValue === expectedRawValue) {
          return;
        }
      }

      setStatus("Mesa nao confirmou a troca de INPUT/USB deste canal.");
    } catch {
      setStatus("Falha ao confirmar INPUT/USB na mesa.");
    }
  }

  async function applyExclusivePatchRoute(
    mapRef: { current: Map<number, number> },
    baseParam: number,
    fullSize: number,
    visibleSize: number,
    destination: number,
    source: number,
    setVisibleRoutes: (routes: number[]) => void
  ) {
    const client = clientRef.current;
    if (!client || !isConnected || !isAx32ProfileActive()) return;

    const normalizedDestination = Math.round(destination);
    const normalizedSource = Math.max(0, Math.min(fullSize, Math.round(source)));

    if (normalizedDestination < 1 || normalizedDestination > visibleSize) return;

    const current = mapRef.current.get(normalizedDestination) ?? normalizedDestination;
    if (current === normalizedSource) return;

    const nextMap = new Map(mapRef.current);
    const conflictingDestination =
      normalizedSource > 0
        ? Array.from({ length: visibleSize }, (_, index) => index + 1).find(
            (candidate) =>
              candidate !== normalizedDestination &&
              (nextMap.get(candidate) ?? candidate) === normalizedSource
          )
        : undefined;

    if (conflictingDestination !== undefined) {
      client.sendParam(baseParam + (conflictingDestination - 1), 0);
      nextMap.set(conflictingDestination, 0);
    }

    client.sendParam(baseParam + (normalizedDestination - 1), normalizedSource);
    nextMap.set(normalizedDestination, normalizedSource);

    mapRef.current = nextMap;
    setVisibleRoutes(
      Array.from({ length: visibleSize }, (_, index) => {
        const visibleDestination = index + 1;
        return nextMap.get(visibleDestination) ?? visibleDestination;
      })
    );
  }

  async function applyExclusivePatchRouteWithSwap(
    mapRef: { current: Map<number, number> },
    baseParam: number,
    fullSize: number,
    visibleSize: number,
    destination: number,
    source: number,
    setVisibleRoutes: (routes: number[]) => void
  ) {
    const client = clientRef.current;
    if (!client || !isConnected || !isAx32ProfileActive()) return;

    const normalizedDestination = Math.round(destination);
    const normalizedSource = Math.max(1, Math.min(fullSize, Math.round(source)));

    if (normalizedDestination < 1 || normalizedDestination > visibleSize) return;

    const currentSource = mapRef.current.get(normalizedDestination) ?? normalizedDestination;
    if (currentSource === normalizedSource) return;

    const nextMap = new Map(mapRef.current);
    const conflictingDestination = Array.from({ length: visibleSize }, (_, index) => index + 1).find(
      (candidate) =>
        candidate !== normalizedDestination &&
        (nextMap.get(candidate) ?? candidate) === normalizedSource
    );

    client.sendParam(baseParam + (normalizedDestination - 1), normalizedSource);
    nextMap.set(normalizedDestination, normalizedSource);

    if (conflictingDestination !== undefined) {
      client.sendParam(baseParam + (conflictingDestination - 1), currentSource);
      nextMap.set(conflictingDestination, currentSource);
    }

    mapRef.current = nextMap;
    setVisibleRoutes(
      Array.from({ length: visibleSize }, (_, index) => {
        const visibleDestination = index + 1;
        return nextMap.get(visibleDestination) ?? visibleDestination;
      })
    );
  }

  function handleInputPatchRouteChange(destination: number, source: number) {
    void applyExclusivePatchRoute(
      usbReturnPatchMapRef,
      AX32_INPUT_PATCH_BASE,
      AX32_INPUT_PATCH_SIZE,
      AX32_INPUT_PATCH_VISIBLE_SIZE,
      destination,
      source,
      setInputPatchRoutes
    ).then(async () => {
      await syncUsbReturnPatchMap({ refreshInputStates: true });
    }).catch(() => {
      setStatus("Falha ao atualizar patch de entrada.");
    });
  }

  function handleOutputPatchRouteChange(destination: number, source: number) {
    void applyExclusivePatchRoute(
      ax32OutputPatchMapRef,
      AX32_OUTPUT_PATCH_BASE,
      AX32_OUTPUT_PATCH_SIZE,
      AX32_OUTPUT_PATCH_VISIBLE_SIZE,
      destination,
      source,
      setOutputPatchRoutes
    ).then(async () => {
      await syncAx32OutputPatchMap();
    }).catch(() => {
      setStatus("Falha ao atualizar patch de saida.");
    });
  }

  function handleUsbInputToUsbRouteChange(destination: number, source: number) {
    void applyExclusivePatchRouteWithSwap(
      usbInputToUsbPatchMapRef,
      AX32_USB_INPUT_PATCH_BASE,
      AX32_USB_INPUT_PATCH_SIZE,
      AX32_INPUT_PATCH_VISIBLE_SIZE,
      destination,
      source,
      setUsbInputToUsbRoutes
    ).then(async () => {
      await syncUsbInputPatchMap({ refreshInputStates: true });
    }).catch(() => {
      setStatus("Falha ao atualizar patch USB input->USB.");
    });
  }

  function handleUsbReturnRouteChange(destination: number, source: number) {
    void applyExclusivePatchRouteWithSwap(
      usbReturnOutputPatchMapRef,
      AX32_USB_RETURN_PATCH_BASE,
      AX32_USB_RETURN_PATCH_SIZE,
      AX32_INPUT_PATCH_VISIBLE_SIZE,
      destination,
      source,
      setUsbReturnRoutes
    ).then(async () => {
      await syncUsbReturnOutputPatchMap({ refreshInputStates: true });
    }).catch(() => {
      setStatus("Falha ao atualizar patch USB return.");
    });
  }

  async function handleResetRecordPatchingDefaults() {
    const client = clientRef.current;
    if (!client || !isConnected || !isAx32ProfileActive() || patchingResetBusy) return;

    setPatchingResetBusy(true);
    setStatus("Aplicando padrao de patching USB...");

    try {
      for (let destination = 1; destination <= AX32_INPUT_PATCH_VISIBLE_SIZE; destination += 1) {
        client.sendParam(AX32_USB_INPUT_PATCH_BASE + (destination - 1), destination);
      }

      for (let destination = 1; destination <= AX32_INPUT_PATCH_VISIBLE_SIZE; destination += 1) {
        client.sendParam(AX32_USB_RETURN_PATCH_BASE + (destination - 1), destination);
      }

      await Promise.all([
        syncUsbInputPatchMap({ refreshInputStates: true }),
        syncUsbReturnOutputPatchMap({ refreshInputStates: true }),
      ]);

      setStatus("Patching USB restaurado para o padrao.");
    } catch {
      setStatus("Falha ao restaurar patching USB.");
    } finally {
      setPatchingResetBusy(false);
    }
  }

  async function handleResetPlayPatchingDefaults() {
    const client = clientRef.current;
    if (!client || !isConnected || !isAx32ProfileActive() || patchingResetBusy) return;

    setPatchingResetBusy(true);
    setStatus("Aplicando padrao de patching fisico...");

    try {
      for (let source = 1; source <= AX32_INPUT_PATCH_VISIBLE_SIZE; source += 1) {
        client.sendParam(AX32_INPUT_PATCH_BASE + (source - 1), source);
      }

      for (let destination = 1; destination <= AX32_OUTPUT_PATCH_VISIBLE_SIZE; destination += 1) {
        client.sendParam(AX32_OUTPUT_PATCH_BASE + (destination - 1), destination);
      }

      await Promise.all([
        syncUsbReturnPatchMap({ refreshInputStates: true }),
        syncAx32OutputPatchMap(),
      ]);

      setStatus("Patching fisico restaurado para o padrao.");
    } catch {
      setStatus("Falha ao restaurar patching fisico.");
    } finally {
      setPatchingResetBusy(false);
    }
  }

  function handleFaderChange(channelNumber: number, position: number) {
    const targets = getLinkedChannelTargets(channelNumber);
    const db = faderPositionToDb(position);
    const dbForSend = db <= -120 ? "-inf" : db;

    targets.forEach((target) => {
      scheduleFaderWrite(`ch:${target}`, () => {
        const client = clientRef.current;
        if (!client) return;

        if (!ENABLE_SEMANTIC_SET_CHANNEL_FADER_PILOT) {
          client.setFader(target, dbForSend);
          return;
        }

        try {
          const semanticDbValue = dbForSend === "-inf" ? -120 : dbForSend;

          const command: SemanticCommand<number> = {
            name: "setChannelFader",
            address: {
              path: `/ax/ch/${target}/fader`,
              segments: ["ax", "ch", target, "fader"],
            },
            value: semanticDbValue,
            meta: {
              source: "ui",
            },
          };

          const context: SemanticCommandContext = {
            activeProfile: ACTIVE_CHANNEL_PROFILE,
            profileReliable: isConnected,
            issuedAt: Date.now(),
          };

          const resolved = setChannelFaderPilotResolver.resolve(command, context);
          resolved.writes.forEach((write) => {
            client.sendParam(write.param, write.value);
          });
        } catch {
          // Safe rollback path for pilot: keep current production behavior.
          client.setFader(target, dbForSend);
        }
      });
    });

    scheduleChannelFaderUiUpdates(targets, position, db);
  }

  function handlePanChange(channelNumber: number, value: number) {
    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);

    if (channelLinks[key]) {
      return;
    }

    clientRef.current?.setPan(channelNumber, value);
    updateChannelState(channelNumber, { pan: value });
  }

  function handleGainChange(channelNumber: number, value: number) {
    const targets = getLinkedChannelTargets(channelNumber);

    targets.forEach((target) => {
      clientRef.current?.setGain(target, value);
      updateChannelState(target, { gain: value });
    });
  }

  function handleColorChange(channelNumber: number, colorId: number) {
    const normalizedColorId = normalizeColorByScope("input", colorId);
    const targets = getLinkedChannelTargets(channelNumber);

    targets.forEach((target) => {
      clientRef.current?.setChannelColor(target, normalizedColorId);
      updateChannelState(target, { colorId: normalizedColorId });
    });
  }

  function handleIconChange(channelNumber: number, iconId: number) {
    const targets = getLinkedChannelTargets(channelNumber);

    targets.forEach((target) => {
      updateChannelState(target, { iconId });
    });
  }

  function handleNameChange(channelNumber: number, channelName: string) {
    const targets = getLinkedChannelTargets(channelNumber);
    const cleanName = stripLinkedNameSuffix(channelName);

    targets.forEach((target) => {
      const targetName: NameTarget = { type: "channel", channel: target };
      const displayName = cleanName.trim().length > 0
        ? cleanName
        : getDefaultDisplayName(targetName);
      const mixerName = cleanName.trim().length > 0
        ? toMixerSafeName(cleanName)
        : getDefaultMixerAlias(targetName);

      updateChannelState(target, { channelName: displayName, mixerName });
      clientRef.current?.setChannelName(target, mixerName);
    });
  }

  function closeChannelCustomizer() {
    setCustomizationView(null);
  }

  // Removed openStripCustomizer - no longer used in new component structure

  async function toggleChannelLink(channelNumber: number) {
    const client = clientRef.current;
    const isAx32 = isAx32ProfileActive();
    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);
    const isLinked = Boolean(channelLinks[key]);
    const nextLinked = !isLinked;
    let confirmedLinked = nextLinked;
    let oddMasterLSendForStereo = 1200;
    lockChannelPairTransition(key);

    try {
      if (nextLinked && client) {
        const basesToCopy = [
          66, 67, 69, 70, 71,
          72, 73, 74, 76,
          77, 78, 79, 80, 81, 82, 83, 84,
          // Processor block: comp + EQ/filters (needed to match official desk link behavior).
          93, 94, 95, 96, 97, 99,
          100, 102, 103, 104, 105,
          107, 108, 109,
          111, 112, 113,
          115, 116, 117,
          119, 120, 121,
          65,
          ...(odd === 1 ? [64] : []),
        ];
        const sourceParams = basesToCopy.map((base) => channelParam(odd, base));
        const response = await client.readParams(sourceParams, 1200);
        const sourceValues = new Map(response.map((item) => [item.param, item.value]));

        basesToCopy.forEach((base) => {
          const sourceParam = channelParam(odd, base);
          const targetParam = channelParam(even, base);
          const value = sourceValues.get(sourceParam);

          if (value !== undefined) {
            client.sendParam(targetParam, value);
          }
        });

        oddMasterLSendForStereo =
          sourceValues.get(channelParam(odd, 85)) ?? oddMasterLSendForStereo;
      }

      if (client) {
        if (nextLinked) {
          // Stereo link pan lock: odd hard-left (0), even hard-right (200).
          client.setPan(odd, 0);
          client.setPan(even, 200);
        } else {
          // On unlink, return both channels to center pan (C = 100).
          client.setPan(odd, 100);
          client.setPan(even, 100);
        }

        if (nextLinked && !isAx32) {
          client.sendParam(channelParam(odd, 86), 0);
          client.sendParam(channelParam(even, 85), 0);
          client.sendParam(channelParam(even, 86), oddMasterLSendForStereo);
        }

        if (!isAx32) {
          const linkFlag = getChannelLinkFlag(odd, nextLinked);
          if (linkFlag !== null) {
            client.sendParam(getChannelLinkParam(), linkFlag);
          }
        } else {
          const linkParam = getChannelLinkParam();
          const pairBit = 1 << Math.floor((odd - 1) / 2);
          const currentLinkResponse = await client.readParams([linkParam], 900);
          const currentMask = currentLinkResponse[0]?.value ?? 0;
          const nextMask = nextLinked
            ? (currentMask | pairBit)
            : (currentMask & ~pairBit);
          client.sendParam(linkParam, nextMask);
        }

        const verifyParams = [
          channelParam(odd, 75),
          channelParam(even, 75),
          ...CHANNEL_LINK_MIRROR_BASES.flatMap((base) => [
            channelParam(odd, base),
            channelParam(even, base),
          ]),
        ];

        for (let attempt = 0; attempt < 4; attempt += 1) {
          const verify = await client.readParams(verifyParams, 900);
          const values = new Map(verify.map((item) => [item.param, item.value]));
          const oddPan = valueToPan(values.get(channelParam(odd, 75)) ?? 100);
          const evenPan = valueToPan(values.get(channelParam(even, 75)) ?? 100);

          if (!isAx32) {
            confirmedLinked = oddPan === 0 && evenPan === 200;
          } else {
            const linkParam = getChannelLinkParam();
            const pairBit = 1 << Math.floor((odd - 1) / 2);
            const linkState = await client.readParams([linkParam], 900);
            const mask = linkState[0]?.value ?? 0;
            confirmedLinked = (mask & pairBit) !== 0;
          }

          if (confirmedLinked === nextLinked) {
            break;
          }
        }

        if (confirmedLinked !== nextLinked) {
          throw new Error("A mesa nao confirmou o estado de link do canal.");
        }
      }

      setChannelLinks((current) => ({
        ...current,
        [key]: confirmedLinked,
      }));

      if (confirmedLinked) {
        setChannels((current) => {
          const next = [...current];
          const primaryNameBase =
            stripLinkedNameSuffix(next[odd - 1].channelName) || `Canal ${odd}`;

          next[even - 1] = {
            ...next[even - 1],
            pan: 200,
            channelName: primaryNameBase,
          };
          next[odd - 1] = {
            ...next[odd - 1],
            pan: 0,
            channelName: primaryNameBase,
          };

          return next;
        });

        setProcessorStates((current) => {
          const next = [...current];
          next[even - 1] = {
            ...next[odd - 1],
            gate: { ...next[odd - 1].gate },
            comp: { ...next[odd - 1].comp },
            eq: {
              ...next[odd - 1].eq,
              bands: next[odd - 1].eq.bands.map((band) => ({ ...band })),
            },
          };
          return next;
        });
      } else {
        const unlinkPan = 100;
        updateChannelState(odd, { pan: unlinkPan });
        updateChannelState(even, { pan: unlinkPan });
      }

      await syncChannelPairContext(odd);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erro ao alternar link de canal"
      );
    } finally {
      window.setTimeout(() => {
        unlockChannelPairTransition(key);
      }, 900);
    }
  }

  async function toggleAuxLink(auxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const [odd, even] = getAuxPair(auxNumber);
    const key = pairKey(odd, even);
    const bit = AUX_LINK_BITS[odd];

    if (!bit) {
      setStatus("AUX invalido para link");
      return;
    }

    const shouldResumeMeter = meterTimerRef.current !== null;
    auxLinkBusyRef.current = true;
    lockAuxPairTransition(key);

    const previousLinked = Boolean(auxLinks[key]);
    const optimisticLinked = !previousLinked;
    setAuxLinks((current) => ({
      ...current,
      [key]: optimisticLinked,
    }));
    setStatus(optimisticLinked ? "Ativando link AUX..." : "Desativando link AUX...");

    if (shouldResumeMeter) {
      stopMeterPolling();
    }

    try {
      const linkMaskParam = getLinkMaskParam();
      const initialMaskResponse = await client.readParams([linkMaskParam], 2000);
      const currentMask = initialMaskResponse[0]?.value;
      if (currentMask === undefined) {
        throw new Error("Nao foi possivel ler o estado atual de link AUX.");
      }
      const nextLinked = optimisticLinked;

      if (nextLinked) {
        const sourceStart = auxBlockStart(odd);
        const targetStart = auxBlockStart(even);

        if (!sourceStart || !targetStart) {
          throw new Error("Bloco de auxiliar nao encontrado para este par.");
        }

        const sourceParams = Array.from({ length: AUX_BLOCK_SIZE }, (_, index) =>
          sourceStart + index
        );

        const chunkSize = 18;
        for (let i = 0; i < sourceParams.length; i += chunkSize) {
          const chunk = sourceParams.slice(i, i + chunkSize);
          const response = await client.readParams(chunk, 2600);

          response.forEach((item) => {
            const offset = item.param - sourceStart;
            client.sendParam(targetStart + offset, item.value);
          });
        }

        // When AUX link is enabled from detail view, clone all channel sends
        // from the odd bus to the even bus so StripSends stays consistent.
        const sourceSendId = `aux${odd}` as SendStripId;
        const targetSendId = `aux${even}` as SendStripId;
        const sendParamPairs = Array.from({ length: channelCount }, (_, index) => {
          const channel = index + 1;
          return {
            source: sendIdToParam(channel, sourceSendId),
            target: sendIdToParam(channel, targetSendId),
          };
        });

        const sendChunkSize = 18;
        for (let i = 0; i < sendParamPairs.length; i += sendChunkSize) {
          const chunkPairs = sendParamPairs.slice(i, i + sendChunkSize);
          const response = await client.readParams(
            chunkPairs.map((pair) => pair.source),
            2600
          );
          const valuesByParam = new Map(response.map((item) => [item.param, item.value]));

          chunkPairs.forEach((pair) => {
            const sourceValue = valuesByParam.get(pair.source);
            if (sourceValue === undefined) return;
            client.sendParam(pair.target, sourceValue);
          });
        }
      }

      const nextMask = nextLinked
        ? currentMask | bit
        : currentMask & ~bit;

      client.sendParam(linkMaskParam, nextMask);

      let confirmedMask: number | undefined;
      for (let attempt = 0; attempt < 4; attempt++) {
        const verify = await client.readParams([linkMaskParam], 2000);
        const value = verify[0]?.value;

        if (value === undefined) continue;

        confirmedMask = value;
        if (Boolean(value & bit) === nextLinked) break;
      }

      if (confirmedMask === undefined) {
        throw new Error("A mesa nao confirmou o estado de link AUX.");
      }

      const confirmedLinked = Boolean(confirmedMask & bit);
      applyLinkStateFrom3056(confirmedMask);

      if (confirmedLinked !== nextLinked) {
        throw new Error("A mesa nao confirmou o estado de link AUX.");
      }

      if (!nextLinked) {
        // After unlink is confirmed, collapse linked channel pairs to mono per AUX bus,
        // keeping each bus's active side instead of preserving cross OFF values.
        const pairTargets = Array.from({ length: channelCount / 2 }, (_, index) => {
          const channelOdd = index * 2 + 1;
          const channelEven = channelOdd + 1;
          const channelKey = pairKey(channelOdd, channelEven);

          return {
            channelOdd,
            channelEven,
            linked: Boolean(channelLinks[channelKey]),
          };
        }).filter((pair) => pair.linked);

        const buses = [odd, even];

        for (const bus of buses) {
          if (pairTargets.length === 0) continue;

          const sendId = `aux${bus}` as SendStripId;
          const params = pairTargets.flatMap((pair) => [
            sendIdToParam(pair.channelOdd, sendId),
            sendIdToParam(pair.channelEven, sendId),
          ]);

          const response = await client.readParams(params, 2600);
          const valuesByParam = new Map(response.map((item) => [item.param, item.value]));

          pairTargets.forEach((pair) => {
            const oddParam = sendIdToParam(pair.channelOdd, sendId);
            const evenParam = sendIdToParam(pair.channelEven, sendId);
            const oddRaw = valuesByParam.get(oddParam);
            const evenRaw = valuesByParam.get(evenParam);

            if (oddRaw === undefined && evenRaw === undefined) return;

            const oddDecoded = decodeSendRawValue(oddRaw);
            const evenDecoded = decodeSendRawValue(evenRaw);
            const chooseEven = oddDecoded.value === 0 && evenDecoded.value > 0;
            const monoRaw = chooseEven
              ? evenRaw ?? oddRaw ?? encodeSendRawValue(evenDecoded.value, evenDecoded.tapPoint)
              : oddRaw ?? evenRaw ?? encodeSendRawValue(oddDecoded.value, oddDecoded.tapPoint);

            client.sendParam(oddParam, monoRaw);
            client.sendParam(evenParam, monoRaw);
          });
        }
      }

      if (nextLinked) {
        setAuxStrips((current) => {
          const next = [...current];
          next[even - 1] = { ...next[odd - 1] };
          return next;
        });

        setAuxProcessorStates((current) => {
          const next = [...current];
          next[even - 1] = {
            ...next[odd - 1],
            gate: { ...next[odd - 1].gate },
            comp: { ...next[odd - 1].comp },
            eq: {
              ...next[odd - 1].eq,
              bands: next[odd - 1].eq.bands.map((band) => ({ ...band })),
            },
          };
          return next;
        });

        setAuxInputSendValues((current) => {
          const sourceValues = current[odd] ?? createDefaultChannelInputSendValues(channelCount);
          return {
            ...current,
            [odd]: { ...sourceValues },
            [even]: { ...sourceValues },
          };
        });

        setAuxInputSendTapPoints((current) => {
          const sourceTapPoints =
            current[odd] ?? createDefaultChannelInputSendTapPoints(channelCount);
          return {
            ...current,
            [odd]: { ...sourceTapPoints },
            [even]: { ...sourceTapPoints },
          };
        });

        setChannelSendValues((current) => {
          const sourceId = `aux${odd}`;
          const targetId = `aux${even}`;
          const sourceValue = current[sourceId] ?? 1200;
          return {
            ...current,
            [sourceId]: sourceValue,
            [targetId]: sourceValue,
          };
        });

        setSendTapPoints((current) => {
          const sourceId = `aux${odd}`;
          const targetId = `aux${even}`;
          const sourceTapPoint = current[sourceId] ?? "post";
          return {
            ...current,
            [sourceId]: sourceTapPoint,
            [targetId]: sourceTapPoint,
          };
        });
      } else {
        setAuxInputSendValues((current) => {
          const next = {
            ...current,
            [odd]: {
              ...(current[odd] ?? createDefaultChannelInputSendValues(channelCount)),
            },
            [even]: {
              ...(current[even] ?? createDefaultChannelInputSendValues(channelCount)),
            },
          };

          for (let channelOdd = 1; channelOdd <= channelCount; channelOdd += 2) {
            const channelEven = channelOdd + 1;
            if (channelEven > channelCount) continue;
            const channelKey = pairKey(channelOdd, channelEven);
            if (!channelLinks[channelKey]) continue;

            const oddId = `ch${channelOdd}`;
            const evenId = `ch${channelEven}`;

            [odd, even].forEach((bus) => {
              const busValues = next[bus];
              const left = busValues[oddId] ?? 0;
              const right = busValues[evenId] ?? 0;
              const mono = left === 0 && right > 0 ? right : left;
              busValues[oddId] = mono;
              busValues[evenId] = mono;
            });
          }

          return {
            ...current,
            [odd]: next[odd],
            [even]: next[even],
          };
        });

        setAuxInputSendTapPoints((current) => {
          const next = {
            ...current,
            [odd]: {
              ...(current[odd] ?? createDefaultChannelInputSendTapPoints(channelCount)),
            },
            [even]: {
              ...(current[even] ?? createDefaultChannelInputSendTapPoints(channelCount)),
            },
          };

          for (let channelOdd = 1; channelOdd <= channelCount; channelOdd += 2) {
            const channelEven = channelOdd + 1;
            if (channelEven > channelCount) continue;
            const channelKey = pairKey(channelOdd, channelEven);
            if (!channelLinks[channelKey]) continue;

            const oddId = `ch${channelOdd}`;
            const evenId = `ch${channelEven}`;

            [odd, even].forEach((bus) => {
              const busValues = next[bus];
              const leftValue = auxInputSendValues[bus]?.[oddId] ?? 0;
              const rightValue = auxInputSendValues[bus]?.[evenId] ?? 0;
              const monoTap =
                leftValue === 0 && rightValue > 0
                  ? busValues[evenId] ?? "post"
                  : busValues[oddId] ?? "post";
              busValues[oddId] = monoTap;
              busValues[evenId] = monoTap;
            });
          }

          return {
            ...current,
            [odd]: next[odd],
            [even]: next[even],
          };
        });

        setChannelSendValues((current) => {
          return {
            ...current,
            [`aux${odd}`]: current[`aux${odd}`] ?? 1200,
            [`aux${even}`]: current[`aux${even}`] ?? current[`aux${odd}`] ?? 1200,
          };
        });

        setSendTapPoints((current) => {
          return {
            ...current,
            [`aux${odd}`]: current[`aux${odd}`] ?? "post",
            [`aux${even}`]: current[`aux${even}`] ?? current[`aux${odd}`] ?? "post",
          };
        });
      }

      // Re-sync pair sends after link toggle in background so click feedback stays instant.
      void Promise.allSettled([
        syncBusInputSendsState("aux", odd),
        syncBusInputSendsState("aux", even),
      ]).then(() => {
        if (detailView?.type === "channel") {
          void syncChannelSendsState(detailView.channel).catch(() => {
            // Keep optimistic state if readback fails transiently.
          });
        }

        if (mainView === "auxSends") {
          const currentAuxTarget = Math.max(1, Math.min(getAuxBusCount(), selectedAuxSendsTarget));
          void syncBusInputSendsState("aux", currentAuxTarget).catch(() => {
            // Keep optimistic state if readback fails transiently.
          });
        }
      });
    } catch (error) {
      setAuxLinks((current) => ({
        ...current,
        [key]: previousLinked,
      }));
      setStatus(
        error instanceof Error ? error.message : "Erro ao alternar link de auxiliar"
      );
    } finally {
      auxLinkBusyRef.current = false;
      window.setTimeout(() => {
        unlockAuxPairTransition(key);
      }, 900);
      if (shouldResumeMeter && isConnected) {
        startMeterPolling();
      }
    }
  }

  function toggleStripMute(section: StripSection, index: number) {
    if (section === "inputs") {
      toggleMute(index);
      return;
    }

    const client = clientRef.current;
    if (!client) return;

    const strips = getSectionStrips(section);
    const nextValue = !strips[index - 1].muted;

    if (section === "aux") {
      const targets = getLinkedAuxTargets(index);
      targets.forEach((target) => {
        client.setAuxMute(target, nextValue);
        updateAuxStripState(target, { muted: nextValue });
      });
      return;
    }

    client.setFxMute(index, nextValue);
    updateFxStripState(index, { muted: nextValue });
  }

  function toggleStripSolo(section: StripSection, index: number) {
    if (section === "inputs") {
      toggleChannelSolo(index);
      return;
    }

    const client = clientRef.current;
    if (!client) return;

    if (section === "aux") {
      const [odd, even] = getAuxPair(index);
      const key = pairKey(odd, even);
      const linked = Boolean(auxLinks[key]);

      if (linked) {
        const pairSoloOn = auxStrips[odd - 1].soloOn || auxStrips[even - 1].soloOn;
        const nextValue = !pairSoloOn;
        client.setAuxSoloPair(odd, nextValue, { db: 0, tapPoint: "post" });
        updateAuxStripState(odd, { soloOn: nextValue });
        updateAuxStripState(even, { soloOn: nextValue });
        return;
      }

      const nextValue = !auxStrips[index - 1].soloOn;
      client.setAuxSolo(index, nextValue, { db: 0, tapPoint: "post" });
      updateAuxStripState(index, { soloOn: nextValue });
      return;
    }

    const nextValue = !fxStrips[index - 1].soloOn;
    client.setFxSolo(index, nextValue, { db: 0, tapPoint: "post" });
    updateFxStripState(index, { soloOn: nextValue });
  }

  function toggleStripPhantom(section: StripSection, index: number) {
    if (section === "inputs") {
      togglePhantom(index);
      return;
    }

    const strips = getSectionStrips(section);
    const nextValue = !strips[index - 1].phantomOn;

    if (section === "aux") {
      const targets = getLinkedAuxTargets(index);
      targets.forEach((target) => {
        updateAuxStripState(target, { phantomOn: nextValue });
      });
      return;
    }

    updateFxStripState(index, { phantomOn: nextValue });
  }

  function handleStripFaderChange(section: StripSection, index: number, position: number) {
    if (section === "inputs") {
      handleFaderChange(index, position);
      return;
    }

    const db = faderPositionToDb(position);
    const dbForSend = db <= -120 ? "-inf" : db;

    if (section === "aux") {
      const targets = getLinkedAuxTargets(index);

      targets.forEach((target) => {
        scheduleFaderWrite(`aux:${target}`, () => {
          clientRef.current?.setAuxMasterFader(target, dbForSend);
        });
      });

      updateAuxFaderStates(targets, position, db);
      return;
    }

    scheduleFaderWrite(`fx:${index}`, () => {
      clientRef.current?.setFxMasterFader(index, dbForSend);
    });
    updateFxFaderState(index, position, db);
  }

  function handleStripPanChange(section: StripSection, index: number, value: number) {
    if (section === "inputs") {
      handlePanChange(index, value);
      return;
    }

    if (section === "aux") {
      const targets = getLinkedAuxTargets(index);
      targets.forEach((target) => {
        updateAuxStripState(target, { pan: value });
      });
      return;
    }

    updateFxStripState(index, { pan: value });
  }

  function handleStripGainChange(section: StripSection, index: number, value: number) {
    if (section === "inputs") {
      handleGainChange(index, value);
      return;
    }

    if (section === "aux") {
      const targets = getLinkedAuxTargets(index);
      targets.forEach((target) => {
        updateAuxStripState(target, { gain: value });
      });
      return;
    }

    updateFxStripState(index, { gain: value });
  }
    void _handleCustomizerIconChange;

  function _handleCustomizerIconChange(section: StripSection, index: number, iconId: number) {
    if (section === "inputs") {
      handleIconChange(index, iconId);
      return;
    }

    if (section === "aux") {
      updateAuxStripState(index, { iconId });
      return;
    }

    updateFxStripState(index, { iconId });
  }

  function handleCustomizerNameChange(section: StripSection, index: number, channelName: string) {
    if (section === "inputs") {
      const target: NameTarget = { type: "channel", channel: index };
      if (isLocalDefaultDisplayName(target, channelName)) {
        handleNameChange(index, "");
        return;
      }

      handleNameChange(index, channelName);
      return;
    }

    if (section === "aux") {
      const target: NameTarget = { type: "aux", aux: index };
      const cleanName = channelName.trim();
      const displayName = cleanName.length > 0
        ? channelName
        : getDefaultDisplayName(target);
      const mixerName = cleanName.length > 0
        ? toMixerSafeName(channelName)
        : getDefaultMixerAlias(target);

      updateAuxStripState(index, { channelName: displayName, mixerName });
      clientRef.current?.setAuxName(index, mixerName);
      return;
    }

    const target: NameTarget = { type: "fx", fx: index };
    const cleanName = channelName.trim();
    const displayName = cleanName.length > 0
      ? channelName
      : getDefaultDisplayName(target);
    const mixerName = cleanName.length > 0
      ? toMixerSafeName(channelName)
      : getDefaultMixerAlias(target);

    updateFxStripState(index, { channelName: displayName, mixerName });
    clientRef.current?.setFxName(index, mixerName);
  }

  function handleCustomizerColorChange(section: StripSection, index: number, colorId: number) {

    if (section === "inputs") {
      handleColorChange(index, colorId);
      return;
    }

    // Só envia para a mesa se for ação do usuário (customizer), nunca durante sync/leitura
    if (section === "aux") {
      const normalizedColorId = normalizeColorByScope("aux", colorId);
      if (!isSyncing) {
        clientRef.current?.setAuxColor(index, normalizedColorId);
      }
      updateAuxStripState(index, { colorId: normalizedColorId });
      return;
    }

    const normalizedColorId = normalizeColorByScope("fx", colorId);
    if (index >= 1 && index <= getFxBusCount()) {
      clientRef.current?.setFxColor(index, normalizedColorId);
    }
    updateFxStripState(index, { colorId: normalizedColorId });
  }

  function handleCustomizerSave(
    section: StripSection,
    index: number,
    patch: { channelName: string; colorId: number }
  ) {
    handleCustomizerNameChange(section, index, patch.channelName);
    handleCustomizerColorChange(section, index, patch.colorId);
  }

  function handleGateChange(channelNumber: number, patch: Partial<GateState>) {
    const targets = getLinkedChannelTargets(channelNumber);

    targets.forEach((target) => {
      updateProcessorState(target, (current) => ({
        ...current,
        gate: { ...current.gate, ...patch },
      }));
    });

    const client = clientRef.current;
    if (!client) return;

    targets.forEach((target) => {
      if (patch.enabled !== undefined) {
        client.setGateEnabled(target, patch.enabled);
      }
      if (patch.threshold !== undefined) {
        client.setGateThreshold(target, patch.threshold);
      }
      if (patch.attack !== undefined) {
        client.setGateAttack(target, patch.attack);
      }
      if (patch.decay !== undefined) {
        client.setGateDecay(target, patch.decay);
      }
      if (patch.hold !== undefined) {
        client.setGateHold(target, patch.hold);
      }
    });
  }

  function handleCompChange(
    channelNumber: number,
    patch: Partial<CompressorState>
  ) {
    const targets = getLinkedChannelTargets(channelNumber);

    targets.forEach((target) => {
      updateProcessorState(target, (current) => ({
        ...current,
        comp: { ...current.comp, ...patch },
      }));
    });

    const client = clientRef.current;
    if (!client) return;

    targets.forEach((target) => {
      if (patch.enabled !== undefined) {
        client.setCompEnabled(target, patch.enabled);
      }
      if (patch.threshold !== undefined) {
        client.setCompThreshold(target, patch.threshold);
      }
      if (patch.ratio !== undefined) {
        client.setCompRatio(target, patch.ratio);
      }
      if (patch.attack !== undefined) {
        client.setCompAttack(target, patch.attack);
      }
      if (patch.release !== undefined) {
        client.setCompRelease(target, patch.release);
      }
      if (patch.gain !== undefined) {
        client.setCompGain(target, patch.gain);
      }
    });
  }

  function handleEqChange(channelNumber: number, patch: Partial<EqState>) {
    const targets = getLinkedChannelTargets(channelNumber);
    const nextEqByTarget = new Map<number, EqState>();

    targets.forEach((target) => {
      const currentEq = processorStates[target - 1].eq;
      const nextEq = mergeEqPatch(currentEq, patch);
      nextEqByTarget.set(target, nextEq);

      updateProcessorState(target, (current) => ({
        ...current,
        eq: nextEq,
      }));
    });

    const client = clientRef.current;
    if (!client) return;

    targets.forEach((target) => {
      const nextEq = nextEqByTarget.get(target);
      if (!nextEq) return;

      if (patch.enabled !== undefined) {
        client.setEqEnabled(target, nextEq.enabled);
      }
      if (patch.hpfEnabled !== undefined) {
        client.setHpfFreq(
          target,
          nextEq.hpfEnabled ? nextEq.hpfFreq : DEFAULT_EQ.hpfFreq
        );
      } else if (patch.hpfFreq !== undefined && nextEq.hpfEnabled) {
        client.setHpfFreq(target, nextEq.hpfFreq);
      }
      if (patch.lpfEnabled !== undefined) {
        client.setLpfFreq(
          target,
          nextEq.lpfEnabled ? nextEq.lpfFreq : DEFAULT_EQ.lpfFreq
        );
      } else if (patch.lpfFreq !== undefined && nextEq.lpfEnabled) {
        client.setLpfFreq(target, nextEq.lpfFreq);
      }
      if (patch.hpfType !== undefined || patch.hpfSlope !== undefined) {
        client.setHpfTypeSlope(
          target,
          nextEq.hpfType as FilterType,
          nextEq.hpfSlope as FilterSlope
        );
      }
      if (patch.lpfType !== undefined || patch.lpfSlope !== undefined) {
        client.setLpfTypeSlope(
          target,
          nextEq.lpfType as FilterType,
          nextEq.lpfSlope as FilterSlope
        );
      }
    });
  }

  function handleEqBandChange(
    channelNumber: number,
    band: number,
    patch: Partial<EqBandState>
  ) {
    const targets = getLinkedChannelTargets(channelNumber);
    const currentBand = processorStates[channelNumber - 1].eq.bands[band - 1];
    const nextBand = { ...currentBand, ...patch };
    const defaultBand = DEFAULT_EQ.bands[band - 1];

    targets.forEach((target) => {
      updateProcessorState(target, (current) => ({
        ...current,
        eq: {
          ...current.eq,
          bands: current.eq.bands.map((bandState, index) =>
            index === band - 1 ? { ...bandState, ...patch } : bandState
          ),
        },
      }));
    });

    const client = clientRef.current;
    if (!client) return;

    targets.forEach((target) => {
      if (patch.enabled === false) {
        client.setEqBand(target, band, defaultBand.freq, defaultBand.gain, defaultBand.q);
        return;
      }

      if (patch.enabled === true) {
        client.setEqBand(target, band, nextBand.freq, nextBand.gain, nextBand.q);
        return;
      }

      if (!nextBand.enabled) return;

      if (patch.freq !== undefined) {
        client.setEqBandFreq(target, band, patch.freq);
      }
      if (patch.gain !== undefined) {
        client.setEqBandGain(target, band, patch.gain);
      }
      if (patch.q !== undefined) {
        client.setEqBandQ(target, band, patch.q);
      }
    });
  }

  function resetGate(channelNumber: number) {
    const current = processorStates[channelNumber - 1].gate;
    handleGateChange(channelNumber, {
      ...DEFAULT_GATE,
      enabled: current.enabled,
    });
  }

  function resetComp(channelNumber: number) {
    const current = processorStates[channelNumber - 1].comp;
    handleCompChange(channelNumber, {
      ...DEFAULT_COMP,
      enabled: current.enabled,
    });
  }

  function resetEq(channelNumber: number) {
    const currentEq = processorStates[channelNumber - 1].eq;

    handleEqChange(channelNumber, {
      enabled: currentEq.enabled,
      hpfEnabled: DEFAULT_EQ.hpfEnabled,
      hpfType: DEFAULT_EQ.hpfType,
      hpfSlope: DEFAULT_EQ.hpfSlope,
      hpfFreq: DEFAULT_EQ.hpfFreq,
      lpfEnabled: DEFAULT_EQ.lpfEnabled,
      lpfType: DEFAULT_EQ.lpfType,
      lpfSlope: DEFAULT_EQ.lpfSlope,
      lpfFreq: DEFAULT_EQ.lpfFreq,
    });

    DEFAULT_EQ.bands.forEach((band, index) => {
      handleEqBandChange(channelNumber, index + 1, {
        ...band,
        enabled: currentEq.bands[index]?.enabled ?? band.enabled,
      });
    });
  }

  function togglePhase(channelNumber: number) {
    const targets = getLinkedChannelTargets(channelNumber);
    const current = channels[channelNumber - 1];
    const nextValue = !current.phasePositive;

    targets.forEach((target) => {
      clientRef.current?.setPhase(target, nextValue);
      updateChannelState(target, { phasePositive: nextValue });
    });
  }

  function toggleHiZ(channelNumber: number) {
    if (channelNumber !== 1 && channelNumber !== 2) return;

    const targets = getLinkedChannelTargets(channelNumber).filter(
      (target) => target === 1 || target === 2
    );
    const current = channels[channelNumber - 1];
    const nextValue = !current.hiZOn;

    targets.forEach((target) => {
      clientRef.current?.setHiZ(target, nextValue);
      updateChannelState(target, { hiZOn: nextValue });
    });
  }

  void toggleHiZ;

  function toggleMainMasterMute() {
    const current = master.leftMuted;
    const nextValue = !current;

    clientRef.current?.setMainMasterMute(nextValue);

    updateMasterState({
      leftMuted: nextValue,
      rightMuted: nextValue,
    });
  }

  function toggleMainMasterSolo() {
    const current = master.soloOn;
    const nextValue = !current;

    clientRef.current?.setDigiSolo(nextValue, { db: 0, tapPoint: "post" });

    updateMasterState({
      leftSoloOn: nextValue,
      rightSoloOn: nextValue,
      soloOn: nextValue,
    });

    // Read back from desk to keep UI in sync with actual hardware state.
    window.setTimeout(() => {
      void syncAllSoloStates();
    }, 180);
  }

  function handleMainMasterFaderChange(position: number) {
    const db = faderPositionToDb(position);
    const dbForSend = db <= -120 ? "-inf" : db;

    scheduleFaderWrite("master:main", () => {
      clientRef.current?.setMainMasterFader(dbForSend);
    });

    updateMasterState({
      leftFaderPosition: position,
      rightFaderPosition: position,
      leftFaderDb: db,
      rightFaderDb: db,
    });
  }

  function handleMasterLeftFaderChange(position: number) {
    const db = faderPositionToDb(position);
    const dbForSend = db <= -120 ? "-inf" : db;

    if (masterLinked) {
      handleMainMasterFaderChange(position);
      return;
    }

    scheduleFaderWrite("master:left", () => {
      clientRef.current?.setMasterFader("left", dbForSend);
    });

    updateMasterState({
      leftFaderPosition: position,
      leftFaderDb: db,
    });
  }

  function handleMasterRightFaderChange(position: number) {
    const db = faderPositionToDb(position);
    const dbForSend = db <= -120 ? "-inf" : db;

    if (masterLinked) {
      handleMainMasterFaderChange(position);
      return;
    }

    scheduleFaderWrite("master:right", () => {
      clientRef.current?.setMasterFader("right", dbForSend);
    });

    updateMasterState({
      rightFaderPosition: position,
      rightFaderDb: db,
    });
  }

  function toggleMasterLeftMute() {
    const nextValue = !master.leftMuted;
    clientRef.current?.setMasterMute("left", nextValue);
    updateMasterState({ leftMuted: nextValue });
  }

  function toggleMasterRightMute() {
    const nextValue = !master.rightMuted;
    clientRef.current?.setMasterMute("right", nextValue);
    updateMasterState({ rightMuted: nextValue });
  }

  function toggleMasterLeftSolo() {
    const nextValue = !master.leftSoloOn;
    clientRef.current?.setMasterSolo("left", nextValue, { db: 0, tapPoint: "post" });
    updateMasterState({
      leftSoloOn: nextValue,
      soloOn: nextValue || master.rightSoloOn,
    });
  }

  function toggleMasterRightSolo() {
    const nextValue = !master.rightSoloOn;
    clientRef.current?.setMasterSolo("right", nextValue, { db: 0, tapPoint: "post" });
    updateMasterState({
      rightSoloOn: nextValue,
      soloOn: master.leftSoloOn || nextValue,
    });
  }

  async function toggleMasterLink() {
    const client = clientRef.current;
    if (!client) return;
    lockMasterLinkTransition();

    try {
      const nextLinked = !masterLinked;
      // Optimistic UI update for immediate button feedback.
      setMasterLinked(nextLinked);

      if (nextLinked) {
        // Keep master link behavior aligned with channel/aux pairs: left side is source.
        const sourceDb = master.leftFaderDb;
        const sourceMuted = master.leftMuted;
        const sourceSoloOn = master.leftSoloOn;
        const dbForSend = sourceDb <= -120 ? "-inf" : sourceDb;
        client.setMainMasterFader(dbForSend);
        client.setMainMasterMute(sourceMuted);
        client.setMainMasterSolo(sourceSoloOn, { db: 0, tapPoint: "post" });
        updateMasterState({
          leftMuted: sourceMuted,
          rightMuted: sourceMuted,
          leftSoloOn: sourceSoloOn,
          rightSoloOn: sourceSoloOn,
          soloOn: sourceSoloOn,
          leftFaderDb: sourceDb,
          rightFaderDb: sourceDb,
          leftFaderPosition: dbToFaderPosition(sourceDb),
          rightFaderPosition: dbToFaderPosition(sourceDb),
        });
      }

      const linkMaskParam = getLinkMaskParam();
      const response = await client.readParams([linkMaskParam], 450);
      const currentMask = response[0]?.value ?? 0;
      const masterLinkBit = getMasterLinkBit();
      const nextMask = nextLinked
        ? currentMask | masterLinkBit
        : currentMask & ~masterLinkBit;

      client.sendParam(linkMaskParam, nextMask);
      let confirmedMask = nextMask;

      for (let attempt = 0; attempt < 3; attempt++) {
        const verify = await client.readParams([linkMaskParam], 450);
        const value = verify[0]?.value;

        if (value === undefined) continue;

        confirmedMask = value;
        if (Boolean(value & masterLinkBit) === nextLinked) break;
      }

      const confirmedLinked = Boolean(confirmedMask & masterLinkBit);
      applyLinkStateFrom3056(confirmedMask);
      setMasterLinked(confirmedLinked);

      if (confirmedLinked !== nextLinked) {
        throw new Error("A mesa nao confirmou o estado de link do master.");
      }
    } finally {
      window.setTimeout(() => {
        unlockMasterLinkTransition();
      }, 900);
    }
  }


  function goToDetailChannel(channelNumber: number, options?: { preserveActiveModule?: boolean }) {
    const nextChannel = Math.max(1, Math.min(channelCount, channelNumber));

    setMainView("mixer");
    clearScheduledSendWrites();
    if (!options?.preserveActiveModule) {
      setActiveProcessorModule("eq");
    }
    setDetailView({ type: "channel", channel: nextChannel });
    (async () => {
      // Garante estado de link antes da leitura do processador do canal.
      await syncLinkStates();
      await syncUsbReturnPatchMap({ refreshInputStates: true });
      await syncChannelPairVisualState();
      await Promise.all([
        syncChannelState(nextChannel),
        syncChannelProcessorState(nextChannel),
        syncChannelSendsState(nextChannel),
        syncChannelPairContext(nextChannel),
      ]);
    })().catch((error) => {
      setStatus(
        error instanceof Error
          ? error.message
          : "Erro ao sincronizar detalhe do canal"
      );
    });
  }


  function goToDetailAux(auxNumber: number, options?: { preserveActiveModule?: boolean }) {
    const nextAux = Math.max(1, Math.min(getAuxBusCount(), auxNumber));
    const [pairOdd, pairEven] = getAuxPair(nextAux);
    setMainView("mixer");
    if (!options?.preserveActiveModule) {
      setActiveProcessorModule("eq");
    }
    setDetailView({ type: "aux", aux: nextAux });
    Promise.allSettled([
      syncLinkStates(),
      syncAuxState(nextAux),
      syncAuxProcessorState(nextAux),
      syncAuxState(pairOdd),
      syncAuxProcessorState(pairOdd),
      ...(pairEven <= getAuxBusCount()
        ? [syncAuxState(pairEven), syncAuxProcessorState(pairEven)]
        : []),
    ]).then((results) => {
      const failed = results.find((result) => result.status === "rejected");

      if (failed && failed.status === "rejected") {
        const reason = failed.reason;
        setStatus(
          reason instanceof Error
            ? reason.message
            : "Erro parcial ao sincronizar detalhe do auxiliar"
        );
      }
    });
  }

  function goToDetailFx(fxNumber: number) {
    const nextFx = Math.max(1, Math.min(getFxBusCount(), fxNumber));
    setMainView("mixer");
    setActiveProcessorModule("presets");
    setDetailView({ type: "fx", fx: nextFx });

    Promise.allSettled([syncFxState(nextFx), syncFxPresetState(nextFx)]).then((results) => {
      const failed = results.find((result) => result.status === "rejected");

      if (failed && failed.status === "rejected") {
        const reason = failed.reason;
        setStatus(
          reason instanceof Error
            ? reason.message
            : "Erro parcial ao sincronizar detalhe do FX"
        );
      }
    });
  }

  function handleFxPresetChange(presetId: FxPresetId) {
    const client = clientRef.current;
    if (!client) return;

    const activeFxNumber = detailView?.type === "fx" ? detailView.fx : 1;
    const presetParams = getFxPresetParams(activeFxNumber);

    updateFxPresetState(activeFxNumber, (current) => ({
      ...current,
      presetId,
    }));

    // Enviar novo preset para a mesa
    client.sendParam(presetParams.preset, presetId);

    // Sincronizar valores dos controles do hardware
    client
      .readParams([presetParams.controlA, presetParams.controlB])
      .then((commands) => {
        let nextControlAValue = 0;
        let nextControlBValue = 0;

        for (const cmd of commands) {
          if (cmd.param === presetParams.controlA) {
            nextControlAValue = cmd.value;
          } else if (cmd.param === presetParams.controlB) {
            nextControlBValue = cmd.value;
          }
        }

        updateFxPresetState(activeFxNumber, (current) => ({
          ...current,
          controlAValue: nextControlAValue,
          controlBValue: nextControlBValue,
        }));
      })
      .catch(() => {
        updateFxPresetState(activeFxNumber, (current) => ({
          ...current,
          controlAValue: 0,
          controlBValue: 0,
        }));
      });
  }

  function handleFxControlAChange(rawValue: number) {
    const activeFxNumber = detailView?.type === "fx" ? detailView.fx : 1;
    const fxPresetState = fxPresetStates[activeFxNumber - 1];
    if (!fxPresetState?.presetId) return;
    const client = clientRef.current;
    if (!client) return;
    const presetParams = getFxPresetParams(activeFxNumber);
    const controlConfig = getFxPresetConfig(fxPresetState.presetId).controls[0];
    const clamped = Math.max(controlConfig.rawMin, rawValue);
    const isSeconds = controlConfig.unit === "s";
    const nextValue = isSeconds ? clamped : Math.round(clamped);
    updateFxPresetState(activeFxNumber, (current) => ({
      ...current,
      controlAValue: nextValue,
    }));
    client.sendParam(presetParams.controlA, Math.min(nextValue, controlConfig.rawMax));
  }

  function handleFxControlBChange(rawValue: number) {
    const activeFxNumber = detailView?.type === "fx" ? detailView.fx : 1;
    const fxPresetState = fxPresetStates[activeFxNumber - 1];
    if (!fxPresetState?.presetId) return;
    const client = clientRef.current;
    if (!client) return;
    const presetParams = getFxPresetParams(activeFxNumber);
    const controlConfig = getFxPresetConfig(fxPresetState.presetId).controls[1];
    const clamped = Math.max(controlConfig.rawMin, Math.min(controlConfig.rawMax, rawValue));
    const isSeconds = controlConfig.unit === "s";
    const nextValue = isSeconds ? clamped : Math.round(clamped);
    updateFxPresetState(activeFxNumber, (current) => ({
      ...current,
      controlBValue: nextValue,
    }));
    client.sendParam(presetParams.controlB, nextValue);
  }

  function goToDetailMaster() {
    setMainView("mixer");
    setActiveProcessorModule("eq");
    const side: "left" | "right" = "left";
    setDetailView({ type: "master", side });

    syncMasterProcessorState(side).catch(() => {
      // Keep current values when a transient read fails.
    });
  }

  function buildChannelInputSendsView(
    values: ChannelInputSendValues = createDefaultChannelInputSendValues(),
    tapPoints: ChannelInputSendTapPointState = createDefaultChannelInputSendTapPoints(),
    contextLabel?: string,
    options?: { mirrorLinkedChannels?: boolean }
  ): SendStripView[] {
    const mirrorLinkedChannels = options?.mirrorLinkedChannels === true;

    return channels.map((channelState, index) => {
      const channelNumber = index + 1;
      const [odd, even] = getChannelPair(channelNumber);
      const linkKey = pairKey(odd, even);
      const id = `ch${channelNumber}`;
      const oddId = `ch${odd}`;
      const linked = Boolean(channelLinks[linkKey]);
      const useOddReference = mirrorLinkedChannels && linked && channelNumber === even;
      const valueRefId = useOddReference ? oddId : id;

      return {
        id,
        type: "channel",
        colorId: channelState.colorId,
        label: `CH ${channelNumber}`,
        name: channelState.channelName?.trim() || `Channel ${channelNumber}`,
        contextLabel,
        value: values[valueRefId] ?? 1200,
        tapPoint: tapPoints[valueRefId] ?? "post",
        isLinked: linked,
      };
    });
  }

  function resolveAuxSendsViewSource(auxNumber: number) {
    const [odd, even] = getAuxPair(auxNumber);
    const key = pairKey(odd, even);
    const linked = even <= getAuxBusCount() && Boolean(auxLinks[key]);
    const sourceAux = linked ? odd : auxNumber;

    return {
      values: auxInputSendValues[sourceAux],
      tapPoints: auxInputSendTapPoints[sourceAux],
    };
  }

  function renderFxPresetsContent() {
    const activeFxNumber = detailView?.type === "fx" ? detailView.fx : 1;
    const fxPresetState = fxPresetStates[activeFxNumber - 1] ?? createDefaultFxPresetState();

    return (
      <div
        style={{
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "44px minmax(0, 1fr)",
          gap: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            borderRadius: 4,
            background: "var(--surface-panel-raised)",
          }}
        >
          <div style={{ color: "var(--text-primary)", fontWeight: 700, letterSpacing: "1.2px", fontSize: 10 }}>
            PRESETS
          </div>
        </div>

        <div
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(360px, 0.9fr)",
            gap: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              minHeight: 0,
              height: "100%",
              borderRadius: 4,
              background: "var(--surface-panel-raised)",
              padding: "24px 32px",
              overflow: "hidden",
            }}
          >
            <FxPresetGrid
              activePresetId={fxPresetState.presetId}
              disabled={!isConnected}
              onPresetSelect={handleFxPresetChange}
            />
          </div>

          <div
            style={{
              minHeight: 0,
              height: "100%",
              overflow: "hidden",
            }}
          >
            <FxPresetControlPanel
              presetId={fxPresetState.presetId}
              controlAValue={fxPresetState.controlAValue}
              controlBValue={fxPresetState.controlBValue}
              disabled={!isConnected}
              onControlAChange={handleFxControlAChange}
              onControlBChange={handleFxControlBChange}
            />
          </div>
        </div>
      </div>
    );
  }

  function handleCopyChannel(channelNumber: number) {
    const store = rawParamStoreRef.current;
    const model = resolveActiveRawProfileModel();
    if (!store || model === "unknown") return;
    const snapshot = buildChannelSnapshot(channelNumber, store, model, channelCount);
    saveClipboardSnapshot(snapshot);
    showToast(`CH ${channelNumber} copiado`);
  }

  function handlePasteChannel(channelNumber: number) {
    const store = rawParamStoreRef.current;
    const client = clientRef.current;
    const model = resolveActiveRawProfileModel();
    if (model === "unknown") return;
    if (!store || !client || !clipboardSnapshot) { showToast("Nada copiado ainda"); return; }
    if (clipboardSnapshot.type !== "channel") { showToast("Clipboard não contém configuração de canal"); return; }
    if (!isClipboardCompatible(clipboardSnapshot, model, channelCount)) {
      showToast("Clipboard incompatível com o modelo atual");
      return;
    }
    applyChannelPaste(clipboardSnapshot, channelNumber, client, store, model);
    showToast(`${clipboardSnapshot.sourceLabel} colado em CH ${channelNumber}`);
  }

  function handleCopyAux(auxNumber: number) {
    const store = rawParamStoreRef.current;
    const model = resolveActiveRawProfileModel();
    if (!store || model === "unknown") return;
    const snapshot = buildAuxSnapshot(auxNumber, store, model, channelCount);
    saveClipboardSnapshot(snapshot);
    showToast(`AUX ${auxNumber} copiado`);
  }

  function handlePasteAux(auxNumber: number) {
    const store = rawParamStoreRef.current;
    const client = clientRef.current;
    const model = resolveActiveRawProfileModel();
    if (model === "unknown") return;
    if (!store || !client || !clipboardSnapshot) { showToast("Nada copiado ainda"); return; }
    if (clipboardSnapshot.type !== "aux") { showToast("Clipboard não contém configuração de auxiliar"); return; }
    if (!isClipboardCompatible(clipboardSnapshot, model, channelCount)) {
      showToast("Clipboard incompatível com o modelo atual");
      return;
    }
    applyAuxPaste(clipboardSnapshot, auxNumber, client, store, model);
    showToast(`${clipboardSnapshot.sourceLabel} colado em AUX ${auxNumber}`);
  }

  function renderChannelDetail() {
    if (!detailView || detailView.type !== "channel") return null;

    const channelNumber = detailView.channel;
    const channelState = channels[channelNumber - 1];
    const processorState = processorStates[channelNumber - 1];
    const [pairOdd, pairEven] = getChannelPair(channelNumber);
    const linkKey = pairKey(pairOdd, pairEven);
    const isLinked = Boolean(channelLinks[linkKey]);
    const detailChannelName =
      isLinked && channelState.channelName.trim().length > 0
        ? `${stripLinkedNameSuffix(channelState.channelName)} ${
            channelNumber === pairOdd ? "L" : "R"
          }`
        : channelState.channelName;
    const fxSendsView: SendStripView[] = fxStrips.map((fxState, index) => {
      const fxNumber = index + 1;
      const id = `fx${fxNumber}`;

      return {
        id,
        type: "fx",
        colorId: fxState.colorId,
        label: `FX ${fxNumber}`,
        name: fxState.channelName?.trim() || `FX ${fxNumber}`,
        value: channelSendValues[id] ?? 1200,
        tapPoint: sendTapPoints[id] ?? "post",
        isLinked: false,
      };
    });

    const auxSendsView: SendStripView[] = auxStrips.map((auxState, index) => {
      const auxNumber = index + 1;
      const id = `aux${auxNumber}`;
      const [odd, even] = getAuxPair(auxNumber);
      const linkKey = pairKey(odd, even);
      const linkedPairExists = even <= getAuxBusCount();

      return {
        id,
        type: "aux",
        colorId: auxState.colorId,
        label: `AUX ${auxNumber}`,
        name: auxState.channelName?.trim() || `AUX ${auxNumber}`,
        value: channelSendValues[id] ?? 1200,
        tapPoint: sendTapPoints[id] ?? "post",
        isLinked: linkedPairExists ? Boolean(auxLinks[linkKey]) : false,
      };
    });

    const sendsView: SendStripView[] = [...fxSendsView, ...auxSendsView];

    return (
      <div
        className="detail-layout"
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 4,
          padding: 0,
        }}
      >
        <section
          className="detail-panel"
          style={{
            padding: 0,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            minWidth: 0,
            position: "relative",
            zIndex: 3,
          }}
        >
          <div
            style={{
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              minWidth: 0,
              padding: "8px",
              borderRadius: 4,
              background: "var(--surface-overlay-strong)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: 113,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setDetailView(null)}
                style={{
                  height: 32,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--button-default-border)",
                  background: "var(--button-default-bg)",
                  color: "var(--button-default-text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 900,
                  fontSize: 10,
                  letterSpacing: "1.2px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                aria-label="Voltar"
                title="Voltar"
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
                <span>VOLTAR</span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minWidth: 0,
                flex: "1 1 auto",
              }}
            >
              <div
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 22,
                  lineHeight: "30px",
                  fontWeight: 700,
                  color: "#ffffff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 320,
                }}
              >
                {detailChannelName.trim().length > 0 ? detailChannelName : `Canal ${channelNumber}`}
              </div>
              <div
                className="dca-matrix-row__tag"
                style={{
                  background: channelColorBadgeBackground(channelState.colorId),
                }}
              >
                {`CH ${channelNumber}`}
              </div>
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => setCustomizationView({ section: "inputs", index: channelNumber })}
                aria-label="Editar canal"
                title="Editar canal"
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: !isConnected ? "not-allowed" : "pointer",
                  opacity: !isConnected ? 0.5 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M11.98 1.793a1.5 1.5 0 0 1 2.122 2.121l-7.19 7.191-2.93.808.808-2.93 7.19-7.19Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.98 3.793 12.102 5.915" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => handleCopyChannel(channelNumber)}
                aria-label="Copiar canal"
                title="Copiar canal"
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: !isConnected ? "not-allowed" : "pointer",
                  opacity: !isConnected ? 0.5 : 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <rect x="5" y="1" width="9" height="9" rx="1.25" stroke="currentColor" strokeWidth="1.25"/>
                  <path d="M4 4.5H2.5A1.5 1.5 0 0 0 1 6v6.5A1.5 1.5 0 0 0 2.5 14h6A1.5 1.5 0 0 0 10 12.5V11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                type="button"
                disabled={!isConnected || !clipboardSnapshot || clipboardSnapshot.type !== "channel" || !isClipboardCompatible(clipboardSnapshot, resolveActiveRawProfileModel(), channelCount)}
                onClick={() => handlePasteChannel(channelNumber)}
                aria-label="Colar no canal"
                title={
                  !clipboardSnapshot ? "Nada copiado ainda"
                  : clipboardSnapshot.type !== "channel" ? "Clipboard não contém canal"
                  : !isClipboardCompatible(clipboardSnapshot, resolveActiveRawProfileModel(), channelCount) ? "Clipboard incompatível"
                  : `Colar ${clipboardSnapshot.sourceLabel}`
                }
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: (!isConnected || !clipboardSnapshot || clipboardSnapshot.type !== "channel") ? "not-allowed" : "pointer",
                  opacity: (!isConnected || !clipboardSnapshot || clipboardSnapshot.type !== "channel" || !isClipboardCompatible(clipboardSnapshot, resolveActiveRawProfileModel(), channelCount)) ? 0.3 : 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <rect x="2.5" y="3.5" width="10" height="10.5" rx="1.25" stroke="currentColor" strokeWidth="1.25"/>
                  <path d="M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                  <path d="M5 9.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div style={{ width: 1, height: 20, background: "#334155", margin: "0 2px" }} />
              <button
                type="button"
                disabled={channelNumber === 1}
                onClick={() => goToDetailChannel(channelNumber - 1, { preserveActiveModule: true })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: channelNumber === 1 ? "not-allowed" : "pointer",
                  opacity: channelNumber === 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>
              <button
                type="button"
                disabled={channelNumber >= channelCount}
                onClick={() => goToDetailChannel(channelNumber + 1, { preserveActiveModule: true })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: channelNumber >= channelCount ? "not-allowed" : "pointer",
                  opacity: channelNumber >= channelCount ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>

        </section>

        <section
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "var(--strip-width) minmax(0, 1fr)",
            gap: 4,
            padding: 8,
            overflow: "visible",
            position: "relative",
          }}
        >
          <aside
            style={{
              minWidth: 0,
              minHeight: 0,
              width: "var(--strip-width)",
              display: "flex",
              justifyContent: "stretch",
              justifySelf: "start",
              overflow: "hidden",
              position: "relative",
              zIndex: 3,
            }}
          >
            <ChannelStrip
              channel={channelNumber}
              channelName={channelState.channelName}
              section="inputs"
              variant="detail"
              isPairLinked={isLinked}
              muted={channelState.muted}
              soloOn={channelState.soloOn}
              phantomOn={channelState.phantomOn}
              phasePositive={channelState.phasePositive}
              usbInputOn={channelState.usbInputOn}
              colorId={channelState.colorId}
              eqState={processorState.eq}
              faderDb={channelState.faderDb}
              faderPosition={channelState.faderPosition}
              pan={channelState.pan}
              gain={channelState.gain}
              meterDb={channelState.meterDb}
              peakDb={channelState.peakDb}
              clipped={channelState.clipUntil > Date.now()}
              disabled={!isConnected}
              onToggleMute={() => toggleMute(channelNumber)}
              onToggleSolo={() => toggleChannelSolo(channelNumber)}
              onTogglePhantom={() => togglePhantom(channelNumber)}
              onTogglePhase={() => togglePhase(channelNumber)}
              onToggleInputSource={() => toggleInputSource(channelNumber)}
              onFaderChange={(position) =>
                handleFaderChange(channelNumber, position)
              }
              onPanChange={(value) => handlePanChange(channelNumber, value)}
              onGainChange={(value) => handleGainChange(channelNumber, value)}
              onToggleLink={() => {
                toggleChannelLink(channelNumber).catch((error) => {
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : "Erro ao alternar link de canal"
                  );
                });
              }}
              linkButtonLabel={`${pairOdd}-${pairEven}`}
              onOpenDetail={goToDetailChannel}
              rawParamStore={rawParamStoreRef.current}
              domainSelectors={domainSelectors}
            />
          </aside>

          <section
            className="detail-panel"
            style={{
              padding: "0 24px",
              borderRadius: 4,
              border: "none",
              background: "transparent",
              minHeight: 0,
              overflow: "hidden",
              position: "relative",
              zIndex: 1,
            }}
          >

          <ChannelProcessors
            activeModule={activeProcessorModule}
            state={processorState}
            disabled={!isConnected}
            channelInputDb={channelState.meterDb}
            sends={sendsView}
            onModuleChange={setActiveProcessorModule}
            onGateChange={(patch) => handleGateChange(channelNumber, patch)}
            onCompChange={(patch) => handleCompChange(channelNumber, patch)}
            onEqChange={(patch) => handleEqChange(channelNumber, patch)}
            onEqBandChange={(band, patch) =>
              handleEqBandChange(channelNumber, band, patch)
            }
            onSendValueChange={(id, value) =>
              handleSendValueChange(channelNumber, id, value)
            }
            onSendTapPointToggle={(id) =>
              handleSendTapPointToggle(channelNumber, id)
            }
            onResetGate={() => resetGate(channelNumber)}
            onResetComp={() => resetComp(channelNumber)}
            onResetEq={() => resetEq(channelNumber)}
          />
          </section>
        </section>
      </div>
    );
  }

  function renderAuxDetail() {
    if (!detailView || detailView.type !== "aux") return null;

    const auxNumber = detailView.aux;
    const auxState = auxStrips[auxNumber - 1];
    const processorState = auxProcessorStates[auxNumber - 1];
    const [pairOdd, pairEven] = getAuxPair(auxNumber);
    const linkKey = pairKey(pairOdd, pairEven);
    const isLinked = Boolean(auxLinks[linkKey]);
    const auxViewSource = resolveAuxSendsViewSource(auxNumber);
    const sendsView = buildChannelInputSendsView(
      auxViewSource.values,
      auxViewSource.tapPoints,
      `TO AUX ${auxNumber}`,
      { mirrorLinkedChannels: isLinked }
    );

    return (
      <div
        className="detail-layout"
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 4,
          padding: 0,
        }}
      >
        <section
          className="detail-panel"
          style={{
            padding: 0,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            minWidth: 0,
            position: "relative",
            zIndex: 3,
          }}
        >
          <div
            style={{
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              minWidth: 0,
              padding: "8px",
              borderRadius: 4,
              background: "var(--surface-overlay-strong)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: 113,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setDetailView(null)}
                style={{
                  height: 32,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--button-default-border)",
                  background: "var(--button-default-bg)",
                  color: "var(--button-default-text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 900,
                  fontSize: 10,
                  letterSpacing: "1.2px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                aria-label="Voltar"
                title="Voltar"
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
                <span>VOLTAR</span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minWidth: 0,
                flex: "1 1 auto",
              }}
            >
              <span
                style={{
                  minWidth: "var(--strip-width)",
                  textAlign: "center",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 22,
                  lineHeight: "30px",
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {auxState.channelName.trim().length > 0 ? auxState.channelName : `AUX ${auxNumber}`}
              </span>
              <div
                className="dca-matrix-row__tag"
                style={{
                  background: channelColorBadgeBackground(auxState.colorId),
                }}
              >
                {`AUX ${auxNumber}`}
              </div>
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => setCustomizationView({ section: "aux", index: auxNumber })}
                aria-label="Editar auxiliar"
                title="Editar auxiliar"
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: !isConnected ? "not-allowed" : "pointer",
                  opacity: !isConnected ? 0.5 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M11.98 1.793a1.5 1.5 0 0 1 2.122 2.121l-7.19 7.191-2.93.808.808-2.93 7.19-7.19Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.98 3.793 12.102 5.915" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => handleCopyAux(auxNumber)}
                aria-label="Copiar auxiliar"
                title="Copiar auxiliar"
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: !isConnected ? "not-allowed" : "pointer",
                  opacity: !isConnected ? 0.5 : 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <rect x="5" y="1" width="9" height="9" rx="1.25" stroke="currentColor" strokeWidth="1.25"/>
                  <path d="M4 4.5H2.5A1.5 1.5 0 0 0 1 6v6.5A1.5 1.5 0 0 0 2.5 14h6A1.5 1.5 0 0 0 10 12.5V11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                type="button"
                disabled={!isConnected || !clipboardSnapshot || clipboardSnapshot.type !== "aux" || !isClipboardCompatible(clipboardSnapshot, resolveActiveRawProfileModel(), channelCount)}
                onClick={() => handlePasteAux(auxNumber)}
                aria-label="Colar no auxiliar"
                title={
                  !clipboardSnapshot ? "Nada copiado ainda"
                  : clipboardSnapshot.type !== "aux" ? "Clipboard não contém auxiliar"
                  : !isClipboardCompatible(clipboardSnapshot, resolveActiveRawProfileModel(), channelCount) ? "Clipboard incompatível"
                  : `Colar ${clipboardSnapshot.sourceLabel}`
                }
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: (!isConnected || !clipboardSnapshot || clipboardSnapshot.type !== "aux") ? "not-allowed" : "pointer",
                  opacity: (!isConnected || !clipboardSnapshot || clipboardSnapshot.type !== "aux" || !isClipboardCompatible(clipboardSnapshot, resolveActiveRawProfileModel(), channelCount)) ? 0.3 : 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <rect x="2.5" y="3.5" width="10" height="10.5" rx="1.25" stroke="currentColor" strokeWidth="1.25"/>
                  <path d="M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                  <path d="M5 9.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div style={{ width: 1, height: 20, background: "#334155", margin: "0 2px" }} />
              <button
                type="button"
                disabled={auxNumber === 1}
                onClick={() => goToDetailAux(auxNumber - 1, { preserveActiveModule: true })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: auxNumber === 1 ? "not-allowed" : "pointer",
                  opacity: auxNumber === 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>
              <button
                type="button"
                disabled={auxNumber >= getAuxBusCount()}
                onClick={() => goToDetailAux(auxNumber + 1, { preserveActiveModule: true })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: auxNumber >= getAuxBusCount() ? "not-allowed" : "pointer",
                  opacity: auxNumber >= getAuxBusCount() ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>

        </section>

        <section
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "var(--strip-width) minmax(0, 1fr)",
            gap: 4,
            padding: 8,
            overflow: "visible",
            position: "relative",
          }}
        >
          <aside
            style={{
              minWidth: 0,
              minHeight: 0,
              width: "var(--strip-width)",
              display: "flex",
              justifyContent: "stretch",
              justifySelf: "start",
              overflow: "hidden",
              position: "relative",
              zIndex: 3,
            }}
          >
            <AuxStrip
              auxNumber={auxNumber}
              variant="detail"
              colorId={auxState.colorId}
              channelName={auxState.channelName}
              muted={auxState.muted}
              soloOn={auxState.soloOn}
              faderDb={auxState.faderDb}
              faderPosition={auxState.faderPosition}
              meterDb={auxState.meterDb}
              peakDb={auxState.peakDb}
              clipped={auxState.clipUntil > Date.now()}
              isLinked={isLinked}
              disabled={!isConnected}
              eqState={processorState.eq}
              onToggleMute={() => toggleStripMute("aux", auxNumber)}
              onToggleSolo={() => toggleStripSolo("aux", auxNumber)}
              onToggleLink={() => {
                toggleAuxLink(auxNumber).catch((error) => {
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : "Erro ao alternar link de auxiliar"
                  );
                });
              }}
              linkButtonLabel={`${pairOdd}-${pairEven}`}
              onFaderChange={(position) => handleStripFaderChange("aux", auxNumber, position)}
              onOpenDetail={goToDetailAux}
              rawParamStore={rawParamStoreRef.current}
              domainSelectors={domainSelectors}
            />
          </aside>

          <section
            className="detail-panel"
            style={{
              padding: "0 24px",
              borderRadius: 4,
              border: "none",
              background: "transparent",
              minHeight: 0,
              overflow: "hidden",
              position: "relative",
              zIndex: 1,
            }}
          >
          <ChannelProcessors
            activeModule={activeProcessorModule}
            state={processorState}
            disabled={!isConnected}
            hideGate={true}
            moduleItems={[
              { id: "eq", label: "EQ" },
              { id: "comp", label: "COMP" },
              { id: "sends", label: "AUX MIX" },
            ]}
            sends={sendsView}
            onModuleChange={setActiveProcessorModule}
            onGateChange={() => {}}
            onCompChange={(patch) => {
              const client = clientRef.current;
              if (!client) return;

              const targets = getLinkedAuxTargets(auxNumber);
              targets.forEach((target) => {
                updateAuxProcessorState(target, (current) => ({
                  ...current,
                  comp: { ...current.comp, ...patch },
                }));
                
                if (patch.enabled !== undefined) {
                  client.setAuxCompEnabled(target, patch.enabled);
                }
                if (patch.ratio !== undefined) {
                  client.setAuxCompRatio(target, patch.ratio);
                }
                if (patch.attack !== undefined) {
                  client.setAuxCompAttack(target, patch.attack);
                }
                if (patch.release !== undefined) {
                  client.setAuxCompRelease(target, patch.release);
                }
                if (patch.threshold !== undefined) {
                  client.setAuxCompThreshold(target, patch.threshold);
                }
                if (patch.gain !== undefined) {
                  client.setAuxCompGain(target, patch.gain);
                }
              });
            }}
            onEqChange={(patch) => {
              const client = clientRef.current;
              const targets = getLinkedAuxTargets(auxNumber);
              const nextEqByTarget = new Map<number, EqState>();

              targets.forEach((target) => {
                const currentEq = auxProcessorStates[target - 1].eq;
                const nextEq = mergeEqPatch(currentEq, patch);
                nextEqByTarget.set(target, nextEq);

                updateAuxProcessorState(target, (current) => ({
                  ...current,
                  eq: nextEq,
                }));

                if (!client) return;

                const eqToSend = nextEqByTarget.get(target);
                if (!eqToSend) return;

                if (patch.enabled !== undefined) {
                  client.setAuxEqEnabled(target, eqToSend.enabled);
                }

                if (patch.hpfEnabled !== undefined) {
                  client.setAuxHpfFreq(
                    target,
                    eqToSend.hpfEnabled ? eqToSend.hpfFreq : DEFAULT_AUX_EQ.hpfFreq
                  );
                } else if (patch.hpfFreq !== undefined && eqToSend.hpfEnabled) {
                  client.setAuxHpfFreq(target, eqToSend.hpfFreq);
                }
                if (patch.lpfEnabled !== undefined) {
                  client.setAuxLpfFreq(
                    target,
                    eqToSend.lpfEnabled ? eqToSend.lpfFreq : DEFAULT_AUX_EQ.lpfFreq
                  );
                } else if (patch.lpfFreq !== undefined && eqToSend.lpfEnabled) {
                  client.setAuxLpfFreq(target, eqToSend.lpfFreq);
                }
                if (patch.hpfType !== undefined || patch.hpfSlope !== undefined) {
                  client.setAuxHpfTypeSlope(
                    target,
                    filterTypeSlopeToRaw(
                      "hpf",
                      eqToSend.hpfType as FilterType,
                      eqToSend.hpfSlope as FilterSlope
                    )
                  );
                }
                if (patch.lpfType !== undefined || patch.lpfSlope !== undefined) {
                  client.setAuxLpfTypeSlope(
                    target,
                    filterTypeSlopeToRaw(
                      "lpf",
                      eqToSend.lpfType as FilterType,
                      eqToSend.lpfSlope as FilterSlope
                    )
                  );
                }
              });
            }}
            onEqBandChange={(band, patch) => {
              const client = clientRef.current;
              if (!client) return;

              const currentBand = auxProcessorStates[auxNumber - 1].eq.bands[band - 1];
              const nextBand = { ...currentBand, ...patch };
              const defaultBand = DEFAULT_AUX_EQ.bands[band - 1];

              const targets = getLinkedAuxTargets(auxNumber);
              targets.forEach((target) => {
                updateAuxProcessorState(target, (current) => ({
                  ...current,
                  eq: {
                    ...current.eq,
                    bands: current.eq.bands.map((bandState, index) =>
                      index === band - 1 ? { ...bandState, ...patch } : bandState
                    ),
                  },
                }));

                if (patch.enabled === false) {
                  client.setAuxEqBand(target, band, defaultBand.freq, defaultBand.gain, defaultBand.q);
                  return;
                }

                if (patch.enabled === true) {
                  client.setAuxEqBand(target, band, nextBand.freq, nextBand.gain, nextBand.q);
                  return;
                }

                if (!nextBand.enabled) return;

                if (patch.freq !== undefined) {
                  client.setAuxEqBandFreq(target, band, patch.freq);
                }
                if (patch.gain !== undefined) {
                  client.setAuxEqBandGain(target, band, patch.gain);
                }
                if (patch.q !== undefined) {
                  client.setAuxEqBandQ(target, band, patch.q);
                }
              });
            }}
            onResetGate={() => {}}
            onResetComp={() => {
              const targets = getLinkedAuxTargets(auxNumber);
              targets.forEach((target) => {
                updateAuxProcessorState(target, (current) => ({
                  ...current,
                  comp: {
                    ...DEFAULT_COMP,
                    enabled: current.comp.enabled,
                  },
                }));
              });
            }}
            onResetEq={() => {
              const client = clientRef.current;
              const targets = getLinkedAuxTargets(auxNumber);
              targets.forEach((target) => {
                updateAuxProcessorState(target, (current) => ({
                  ...current,
                  eq: {
                    ...DEFAULT_AUX_EQ,
                    enabled: current.eq.enabled,
                    hpfEnabled: current.eq.hpfEnabled,
                    lpfEnabled: current.eq.lpfEnabled,
                    bands: DEFAULT_AUX_EQ.bands.map((band, index) => ({
                      ...band,
                      enabled: current.eq.bands[index]?.enabled ?? band.enabled,
                    })),
                  },
                }));

                if (!client) return;
                // Envia todos os parâmetros default para a mesa
                client.setAuxEqEnabled(target, true);
                client.setAuxHpfFreq(target, DEFAULT_AUX_EQ.hpfFreq);
                client.setAuxHpfTypeSlope(target, filterTypeSlopeToRaw("hpf", DEFAULT_AUX_EQ.hpfType, DEFAULT_AUX_EQ.hpfSlope));
                client.setAuxLpfFreq(target, DEFAULT_AUX_EQ.lpfFreq);
                client.setAuxLpfTypeSlope(target, filterTypeSlopeToRaw("lpf", DEFAULT_AUX_EQ.lpfType, DEFAULT_AUX_EQ.lpfSlope));
                DEFAULT_AUX_EQ.bands.forEach((band, idx) => {
                  client.setAuxEqBand(target, idx + 1, band.freq, band.gain, band.q);
                });
              });
            }}
            onSendValueChange={(id, value) =>
              handleBusInputSendValueChange("aux", auxNumber, id, value)
            }
            onSendTapPointToggle={(id) =>
              handleBusInputSendTapPointToggle("aux", auxNumber, id)
            }
          />
          </section>
        </section>
      </div>
    );
  }

  function renderFxDetail() {
    if (!detailView || detailView.type !== "fx") return null;

    const fxNumber = detailView.fx;
    const fxState = fxStrips[fxNumber - 1];
    const processorState = fxProcessorStates[fxNumber - 1];
    const sendsView = buildChannelInputSendsView(
      fxInputSendValues[fxNumber],
      fxInputSendTapPoints[fxNumber],
      `TO FX ${fxNumber}`
    );

    return (
      <div
        className="detail-layout"
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 4,
          padding: 0,
        }}
      >
        <section className="detail-panel" style={{ padding: 0, borderRadius: 4, border: "none", background: "transparent", minWidth: 0, position: "relative", zIndex: 3 }}>
          <div style={{ minHeight: 48, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, minWidth: 0, padding: "8px", borderRadius: 4, background: "var(--surface-overlay-strong)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: 113, flexShrink: 0 }}>
              <button type="button" onClick={() => setDetailView(null)} style={{ height: 32, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--button-default-border)", background: "var(--button-default-bg)", color: "var(--button-default-text)", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 10, letterSpacing: "1.2px", cursor: "pointer", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
                <span>VOLTAR</span>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0, flex: "1 1 auto" }}>
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#ffffff" }}>
                {fxState.channelName.trim().length > 0 ? fxState.channelName : `FX ${fxNumber}`}
              </div>
              <div
                className="dca-matrix-row__tag"
                style={{ background: channelColorBadgeBackground(fxState.colorId) }}
              >
                {`FX ${fxNumber}`}
              </div>
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => setCustomizationView({ section: "fx", index: fxNumber })}
                aria-label="Editar FX"
                title="Editar FX"
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: !isConnected ? "not-allowed" : "pointer",
                  opacity: !isConnected ? 0.5 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M11.98 1.793a1.5 1.5 0 0 1 2.122 2.121l-7.19 7.191-2.93.808.808-2.93 7.19-7.19Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.98 3.793 12.102 5.915" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, width: 113, flexShrink: 0 }}>
              <button
                type="button"
                disabled={fxNumber === 1}
                onClick={() => goToDetailFx(fxNumber - 1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: fxNumber === 1 ? "not-allowed" : "pointer",
                  opacity: fxNumber === 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>
              <button
                type="button"
                disabled={fxNumber >= getFxBusCount()}
                onClick={() => goToDetailFx(fxNumber + 1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: fxNumber >= getFxBusCount() ? "not-allowed" : "pointer",
                  opacity: fxNumber >= getFxBusCount() ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>
        </section>

        <section style={{ minHeight: 0, display: "grid", gridTemplateColumns: "var(--strip-width) minmax(0, 1fr)", gap: 4, padding: 8, overflow: "visible", position: "relative" }}>
          <aside style={{ minWidth: 0, minHeight: 0, width: "var(--strip-width)", display: "flex", justifyContent: "stretch", justifySelf: "start", overflow: "hidden", position: "relative", zIndex: 3 }}>
            <FxStrip
              fxNumber={fxNumber}
              variant="detail"
              colorId={fxState.colorId}
              channelName={fxState.channelName}
              eqState={processorState.eq}
              muted={fxState.muted}
              soloOn={fxState.soloOn}
              faderDb={fxState.faderDb}
              faderPosition={fxState.faderPosition}
              meterDb={fxState.meterDb}
              peakDb={fxState.peakDb}
              clipped={fxState.clipUntil > Date.now()}
              disabled={!isConnected}
              onToggleMute={() => toggleStripMute("fx", fxNumber)}
              onToggleSolo={() => toggleStripSolo("fx", fxNumber)}
              onFaderChange={(position) => handleStripFaderChange("fx", fxNumber, position)}
              rawParamStore={rawParamStoreRef.current}
              domainSelectors={domainSelectors}
            />
          </aside>

          <section className="detail-panel" style={{ padding: "0 24px", borderRadius: 4, border: "none", background: "transparent", minHeight: 0, overflow: "hidden", position: "relative", zIndex: 1 }}>
            <ChannelProcessors
              activeModule={activeProcessorModule}
              state={processorState}
              disabled={!isConnected}
              hideComp={true}
              hideGate={true}
              moduleItems={[
                { id: "presets", label: "PRESETS" },
                { id: "eq", label: "EQ" },
                { id: "sends", label: "SEND MIX" },
              ]}
              customModuleContent={{
                presets: renderFxPresetsContent(),
              }}
              sends={sendsView}
              onModuleChange={setActiveProcessorModule}
              onGateChange={() => {}}
              onCompChange={() => {}}
              onEqChange={(patch) => {
                const client = clientRef.current;
                const fxParams = getFxProcessorParams(fxNumber);

                updateFxProcessorState(fxNumber, (current) => {
                  const nextEq = mergeEqPatch(current.eq, patch);

                  if (client && fxParams) {
                    if (patch.enabled !== undefined) {
                      client.sendParam(fxParams.eqEnabled, nextEq.enabled ? 1 : 0);
                    }

                    if (patch.hpfEnabled !== undefined) {
                      client.sendParam(
                        fxParams.hpfFreq,
                        frequencyToRawValue(nextEq.hpfEnabled ? nextEq.hpfFreq : DEFAULT_EQ.hpfFreq)
                      );
                    } else if (patch.hpfFreq !== undefined && nextEq.hpfEnabled) {
                      client.sendParam(fxParams.hpfFreq, frequencyToRawValue(nextEq.hpfFreq));
                    }

                    if (patch.lpfEnabled !== undefined) {
                      client.sendParam(
                        fxParams.lpfFreq,
                        frequencyToRawValue(nextEq.lpfEnabled ? nextEq.lpfFreq : DEFAULT_EQ.lpfFreq)
                      );
                    } else if (patch.lpfFreq !== undefined && nextEq.lpfEnabled) {
                      client.sendParam(fxParams.lpfFreq, frequencyToRawValue(nextEq.lpfFreq));
                    }

                    if (patch.hpfType !== undefined || patch.hpfSlope !== undefined) {
                      client.sendParam(
                        fxParams.hpfTypeSlope,
                        filterTypeSlopeToRaw(
                          "hpf",
                          nextEq.hpfType as FilterType,
                          nextEq.hpfSlope as FilterSlope
                        )
                      );
                    }

                    if (patch.lpfType !== undefined || patch.lpfSlope !== undefined) {
                      client.sendParam(
                        fxParams.lpfTypeSlope,
                        filterTypeSlopeToRaw(
                          "lpf",
                          nextEq.lpfType as FilterType,
                          nextEq.lpfSlope as FilterSlope
                        )
                      );
                    }
                  }

                  return {
                    ...current,
                    eq: nextEq,
                  };
                });
              }}
              onEqBandChange={(band, patch) => {
                const client = clientRef.current;
                const fxParams = getFxProcessorParams(fxNumber);

                updateFxProcessorState(fxNumber, (current) => {
                  const currentBand = current.eq.bands[band - 1];
                  const nextBand = { ...currentBand, ...patch };
                  const defaultBand = DEFAULT_EQ.bands[band - 1];

                  if (client && fxParams && band >= 1 && band <= 4) {
                    const freqParam =
                      band === 1
                        ? fxParams.eqBand1Freq
                        : band === 2
                          ? fxParams.eqBand2Freq
                          : band === 3
                            ? fxParams.eqBand3Freq
                            : fxParams.eqBand4Freq;
                    const gainParam = freqParam + 1;
                    const qParam = freqParam + 2;

                    if (patch.enabled === false) {
                      client.sendParam(freqParam, frequencyToRawValue(defaultBand.freq));
                      client.sendParam(gainParam, 500);
                      client.sendParam(qParam, 100);
                    } else if (patch.enabled === true) {
                      client.sendParam(freqParam, frequencyToRawValue(nextBand.freq));
                      client.sendParam(gainParam, 500 + Math.round(Math.max(-12, Math.min(12, nextBand.gain)) * 10));
                      client.sendParam(qParam, Math.round(Math.max(0.6, Math.min(28.08, nextBand.q)) * 100));
                    } else if (nextBand.enabled) {
                      if (patch.freq !== undefined) {
                        client.sendParam(freqParam, frequencyToRawValue(patch.freq));
                      }
                      if (patch.gain !== undefined) {
                        client.sendParam(gainParam, 500 + Math.round(Math.max(-12, Math.min(12, patch.gain)) * 10));
                      }
                      if (patch.q !== undefined) {
                        client.sendParam(qParam, Math.round(Math.max(0.6, Math.min(28.08, patch.q)) * 100));
                      }
                    }
                  }

                  return {
                    ...current,
                    eq: {
                      ...current.eq,
                      bands: current.eq.bands.map((bandState, index) =>
                        index === band - 1 ? { ...bandState, ...patch } : bandState
                      ),
                    },
                  };
                });
              }}
              onSendValueChange={(id, value) =>
                handleBusInputSendValueChange("fx", fxNumber, id, value)
              }
              onSendTapPointToggle={(id) =>
                handleBusInputSendTapPointToggle("fx", fxNumber, id)
              }
              onResetGate={() => {}}
              onResetComp={() => {}}
              onResetEq={() => {
                const client = clientRef.current;
                const fxParams = getFxProcessorParams(fxNumber);

                updateFxProcessorState(fxNumber, (current) => ({
                  ...current,
                  eq: {
                    ...DEFAULT_EQ,
                    enabled: current.eq.enabled,
                    bands: DEFAULT_EQ.bands.map((band, index) => ({
                      ...band,
                      enabled: current.eq.bands[index]?.enabled ?? band.enabled,
                    })),
                  },
                }));

                if (!client || !fxParams) return;

                client.sendParam(fxParams.eqEnabled, processorState.eq.enabled ? 1 : 0);
                client.sendParam(fxParams.hpfFreq, frequencyToRawValue(DEFAULT_EQ.hpfFreq));
                client.sendParam(
                  fxParams.hpfTypeSlope,
                  filterTypeSlopeToRaw("hpf", DEFAULT_EQ.hpfType, DEFAULT_EQ.hpfSlope)
                );
                client.sendParam(fxParams.lpfFreq, frequencyToRawValue(DEFAULT_EQ.lpfFreq));
                client.sendParam(
                  fxParams.lpfTypeSlope,
                  filterTypeSlopeToRaw("lpf", DEFAULT_EQ.lpfType, DEFAULT_EQ.lpfSlope)
                );

                DEFAULT_EQ.bands.forEach((bandState, index) => {
                  const band = index + 1;
                  const freqParam =
                    band === 1
                      ? fxParams.eqBand1Freq
                      : band === 2
                        ? fxParams.eqBand2Freq
                        : band === 3
                          ? fxParams.eqBand3Freq
                          : fxParams.eqBand4Freq;
                  client.sendParam(freqParam, frequencyToRawValue(bandState.freq));
                  client.sendParam(freqParam + 1, 500 + Math.round(Math.max(-12, Math.min(12, bandState.gain)) * 10));
                  client.sendParam(freqParam + 2, Math.round(Math.max(0.6, Math.min(28.08, bandState.q)) * 100));
                });
              }}
            />
            {activeProcessorModule === "sends" && (
              <section
                style={{
                  marginTop: 8,
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-panel-raised)",
                  padding: "10px 12px",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                  RETURN
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  Retorno de FX
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: "14px" }}>
                  {FX_RETURN_MAPPING.reason}
                </div>
              </section>
            )}
          </section>
        </section>
      </div>
    );
  }

  function renderMasterDetail() {
    if (!detailView || detailView.type !== "master") return null;
    const sendsView = buildChannelInputSendsView(undefined, undefined, "TO MASTER");
    const masterDetailSide = detailView.side;
    const masterDetailTargets: ("left" | "right")[] = masterLinked
      ? ["left", "right"]
      : [masterDetailSide];
    const masterDetailTitle = masterLinked
      ? "Master Bus"
      : masterDetailSide === "left"
        ? "Master Bus L"
        : "Master Bus R";

    const navigateMasterDetail = (side: "left" | "right") => {
      setDetailView({ type: "master", side });
      syncMasterProcessorState(side).catch(() => {
        // Keep current values when a transient read fails.
      });
    };

    return (
      <div
        className="detail-layout"
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 4,
          padding: 0,
        }}
      >
        <section className="detail-panel" style={{ padding: 0, borderRadius: 4, border: "none", background: "transparent", minWidth: 0, position: "relative", zIndex: 3 }}>
          <div style={{ minHeight: 48, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, minWidth: 0, padding: "8px", borderRadius: 4, background: "var(--surface-overlay-strong)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: 113, flexShrink: 0 }}>
              <button type="button" onClick={() => setDetailView(null)} style={{ height: 32, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--button-default-border)", background: "var(--button-default-bg)", color: "var(--button-default-text)", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 10, letterSpacing: "1.2px", cursor: "pointer", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
                <span>VOLTAR</span>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0, flex: "1 1 auto" }}>
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#ffffff" }}>
                {masterDetailTitle}
              </div>
              <div
                className="dca-matrix-row__tag"
                style={{
                  background: channelColorBadgeBackground(
                    master.leftColorId || master.rightColorId
                  ),
                }}
              >
                MASTER
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                width: 113,
                flexShrink: 0,
              }}
            >
              {!masterLinked && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    disabled={masterDetailSide === "left"}
                    onClick={() => navigateMasterDetail("left")}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "1px solid #334155",
                      background: "#0b1220",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 14,
                      cursor: masterDetailSide === "left" ? "not-allowed" : "pointer",
                      opacity: masterDetailSide === "left" ? 0.4 : 1,
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={masterDetailSide === "right"}
                    onClick={() => navigateMasterDetail("right")}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "1px solid #334155",
                      background: "#0b1220",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 14,
                      cursor: masterDetailSide === "right" ? "not-allowed" : "pointer",
                      opacity: masterDetailSide === "right" ? 0.4 : 1,
                    }}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section style={{ minHeight: 0, display: "grid", gridTemplateColumns: "var(--master-strip-width) minmax(0, 1fr)", gap: 4, padding: 8, overflow: "visible", position: "relative" }}>
          <aside style={{ minWidth: 0, minHeight: 0, width: "var(--master-strip-width)", display: "flex", justifyContent: "stretch", justifySelf: "start", overflow: "hidden", position: "relative", zIndex: 3 }}>
            <MasterBus
              leftColorId={master.leftColorId}
              rightColorId={master.rightColorId}
              leftMuted={master.leftMuted}
              rightMuted={master.rightMuted}
              leftSoloOn={master.leftSoloOn}
              rightSoloOn={master.rightSoloOn}
              soloOn={master.soloOn}
              linked={masterLinked}
              leftFaderDb={master.leftFaderDb}
              rightFaderDb={master.rightFaderDb}
              leftFaderPosition={master.leftFaderPosition}
              rightFaderPosition={master.rightFaderPosition}
              meterDbL={mainMasterMeter.leftDb}
              meterDbR={mainMasterMeter.rightDb}
              peakDbL={mainMasterMeter.leftPeakDb}
              peakDbR={mainMasterMeter.rightPeakDb}
              clippedL={mainMasterMeter.leftClipUntil > Date.now()}
              clippedR={mainMasterMeter.rightClipUntil > Date.now()}
              disabled={!isConnected}
              muteGroups={getMuteIdsForActiveProfile().map((id) => ({
                id,
                active: muteGroups[id - 1]?.active ?? false,
              }))}
              onToggleMuteGroup={(id) => handleMuteGroupToggleActive(id as MuteGroupId)}
              onToggleMainMute={toggleMainMasterMute}
              onToggleMainSolo={toggleMainMasterSolo}
              onToggleLeftMute={toggleMasterLeftMute}
              onToggleLeftSolo={toggleMasterLeftSolo}
              onToggleRightMute={toggleMasterRightMute}
              onToggleRightSolo={toggleMasterRightSolo}
              onToggleLink={() => {
                toggleMasterLink().catch((error) => {
                  setStatus(error instanceof Error ? error.message : "Erro ao alternar link de master");
                });
              }}
              onMainFaderChange={handleMainMasterFaderChange}
              onLeftFaderChange={handleMasterLeftFaderChange}
              onRightFaderChange={handleMasterRightFaderChange}
              detailSide={!masterLinked ? masterDetailSide : undefined}
              rawParamStore={rawParamStoreRef.current}
              domainSelectors={domainSelectors}
            />
          </aside>

          <section className="detail-panel" style={{ padding: "0 24px", borderRadius: 4, border: "none", background: "transparent", minHeight: 0, overflow: "hidden", position: "relative", zIndex: 1 }}>
            <ChannelProcessors
              activeModule={activeProcessorModule}
              state={masterProcessorState}
              disabled={!isConnected}
              hideGate={true}
              moduleItems={[
                { id: "eq", label: "EQ" },
                { id: "comp", label: "COMP" },
                { id: "sends", label: "SENDS" },
              ]}
              sends={sendsView}
              onModuleChange={setActiveProcessorModule}
              onGateChange={() => {}}
              onCompChange={(patch) => {
                const client = clientRef.current;
                const targets = masterDetailTargets;

                setMasterProcessorState((current) => ({
                  ...current,
                  comp: { ...current.comp, ...patch },
                }));

                if (!client) return;

                targets.forEach((target) => {
                  if (patch.enabled !== undefined) {
                    client.setMasterCompEnabled(target, patch.enabled);
                  }
                  if (patch.ratio !== undefined) {
                    client.setMasterCompRatio(target, patch.ratio);
                  }
                  if (patch.attack !== undefined) {
                    client.setMasterCompAttack(target, patch.attack);
                  }
                  if (patch.release !== undefined) {
                    client.setMasterCompRelease(target, patch.release);
                  }
                  if (patch.threshold !== undefined) {
                    client.setMasterCompThreshold(target, patch.threshold);
                  }
                  if (patch.gain !== undefined) {
                    client.setMasterCompGain(target, patch.gain);
                  }
                });
              }}
              onEqChange={(patch) => {
                const client = clientRef.current;
                const targets = masterDetailTargets;

                setMasterProcessorState((current) => {
                  const nextEq = mergeEqPatch(current.eq, patch);

                  if (client) {
                    targets.forEach((target) => {
                      if (patch.enabled !== undefined) {
                        client.setMasterEqEnabled(target, nextEq.enabled);
                      }

                      if (patch.hpfEnabled !== undefined) {
                        client.setMasterHpfFreq(
                          target,
                          nextEq.hpfEnabled ? nextEq.hpfFreq : DEFAULT_AUX_EQ.hpfFreq
                        );
                      } else if (patch.hpfFreq !== undefined && nextEq.hpfEnabled) {
                        client.setMasterHpfFreq(target, nextEq.hpfFreq);
                      }

                      if (patch.lpfEnabled !== undefined) {
                        client.setMasterLpfFreq(
                          target,
                          nextEq.lpfEnabled ? nextEq.lpfFreq : DEFAULT_AUX_EQ.lpfFreq
                        );
                      } else if (patch.lpfFreq !== undefined && nextEq.lpfEnabled) {
                        client.setMasterLpfFreq(target, nextEq.lpfFreq);
                      }

                      if (patch.hpfType !== undefined || patch.hpfSlope !== undefined) {
                        client.setMasterHpfTypeSlopeValue(
                          target,
                          filterTypeSlopeToRaw(
                            "hpf",
                            nextEq.hpfType as FilterType,
                            nextEq.hpfSlope as FilterSlope
                          )
                        );
                      }

                      if (patch.lpfType !== undefined || patch.lpfSlope !== undefined) {
                        client.setMasterLpfTypeSlopeValue(
                          target,
                          filterTypeSlopeToRaw(
                            "lpf",
                            nextEq.lpfType as FilterType,
                            nextEq.lpfSlope as FilterSlope
                          )
                        );
                      }
                    });
                  }

                  return {
                    ...current,
                    eq: nextEq,
                  };
                });
              }}
              onEqBandChange={(band, patch) => {
                const client = clientRef.current;
                const targets = masterDetailTargets;

                setMasterProcessorState((current) => {
                  const currentBand = current.eq.bands[band - 1];
                  const nextBand = { ...currentBand, ...patch };
                  const defaultBand = DEFAULT_AUX_EQ.bands[band - 1];

                  if (client) {
                    targets.forEach((target) => {
                      if (patch.enabled === false) {
                        client.setMasterEqBand(target, band, defaultBand.freq, defaultBand.gain, defaultBand.q);
                        return;
                      }

                      if (patch.enabled === true) {
                        client.setMasterEqBand(target, band, nextBand.freq, nextBand.gain, nextBand.q);
                        return;
                      }

                      if (!nextBand.enabled) return;

                      if (patch.freq !== undefined) {
                        client.setMasterEqBandFreq(target, band, patch.freq);
                      }
                      if (patch.gain !== undefined) {
                        client.setMasterEqBandGain(target, band, patch.gain);
                      }
                      if (patch.q !== undefined) {
                        client.setMasterEqBandQ(target, band, patch.q);
                      }
                    });
                  }

                  return {
                    ...current,
                    eq: {
                      ...current.eq,
                      bands: current.eq.bands.map((bandState, index) =>
                        index === band - 1 ? { ...bandState, ...patch } : bandState
                      ),
                    },
                  };
                });
              }}
              onSendValueChange={() => {}}
              onSendTapPointToggle={() => {}}
              onResetGate={() => {}}
              onResetComp={() => {
                const client = clientRef.current;
                const targets = masterDetailTargets;

                setMasterProcessorState((current) => ({
                  ...current,
                  comp: {
                    ...DEFAULT_COMP,
                    enabled: current.comp.enabled,
                  },
                }));

                if (!client) return;

                targets.forEach((target) => {
                  client.setMasterCompRatio(target, DEFAULT_COMP.ratio);
                  client.setMasterCompAttack(target, DEFAULT_COMP.attack);
                  client.setMasterCompRelease(target, DEFAULT_COMP.release);
                  client.setMasterCompThreshold(target, DEFAULT_COMP.threshold);
                  client.setMasterCompGain(target, DEFAULT_COMP.gain);
                });
              }}
              onResetEq={() => {
                const client = clientRef.current;
                const targets = masterDetailTargets;

                setMasterProcessorState((current) => ({
                  ...current,
                  eq: {
                    ...DEFAULT_AUX_EQ,
                    enabled: current.eq.enabled,
                    bands: DEFAULT_AUX_EQ.bands.map((band, index) => ({
                      ...band,
                      enabled: current.eq.bands[index]?.enabled ?? band.enabled,
                    })),
                  },
                }));

                if (!client) return;

                targets.forEach((target) => {
                  client.setMasterHpfFreq(target, DEFAULT_AUX_EQ.hpfFreq);
                  client.setMasterLpfFreq(target, DEFAULT_AUX_EQ.lpfFreq);
                  client.setMasterHpfTypeSlopeValue(
                    target,
                    filterTypeSlopeToRaw("hpf", DEFAULT_AUX_EQ.hpfType, DEFAULT_AUX_EQ.hpfSlope)
                  );
                  client.setMasterLpfTypeSlopeValue(
                    target,
                    filterTypeSlopeToRaw("lpf", DEFAULT_AUX_EQ.lpfType, DEFAULT_AUX_EQ.lpfSlope)
                  );

                  DEFAULT_AUX_EQ.bands.forEach((bandState, index) => {
                    client.setMasterEqBand(target, index + 1, bandState.freq, bandState.gain, bandState.q);
                  });
                });
              }}
            />
          </section>
        </section>
      </div>
    );
  }

  function renderInputStrip(stripNumber: number): ReactNode {
    const channelState = channels[stripNumber - 1];
    const pair = getChannelPair(stripNumber);
    const pairKeyValue = pairKey(pair[0], pair[1]);
    const pairLinked = Boolean(channelLinks[pairKeyValue]);
    const displayChannelName =
      pairLinked && channelState.channelName.trim().length > 0
        ? `${stripLinkedNameSuffix(channelState.channelName)} ${stripNumber === pair[0] ? "L" : "R"}`
        : channelState.channelName;

    return (
      <div
        key={`channel-${stripNumber}`}
        style={{
          marginLeft: 0,
          marginRight: 0,
          flex: "0 0 auto",
          position: "relative",
          overflow: "visible",
          zIndex: pairLinked && stripNumber === pair[0] ? 3 : 1,
        }}
      >
        {pairLinked && stripNumber === pair[0] && (
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 36,
              width: "calc(200% + 4px)",
              height: 4,
              borderRadius: "1px",
              background: "#fb923c",
              boxShadow: "0 0 8px rgba(251,146,60,0.5)",
              pointerEvents: "none",
              zIndex: 8,
            }}
          />
        )}

        <ChannelStrip
          channel={stripNumber}
          channelName={displayChannelName}
          section="inputs"
          isPairLinked={pairLinked}
          muted={channelState.muted}
          soloOn={channelState.soloOn}
          phantomOn={channelState.phantomOn}
          phasePositive={channelState.phasePositive}
          colorId={channelState.colorId}
          eqState={processorStates[stripNumber - 1].eq}
          faderDb={channelState.faderDb}
          faderPosition={channelState.faderPosition}
          pan={channelState.pan}
          gain={channelState.gain}
          meterDb={channelState.meterDb}
          peakDb={channelState.peakDb}
          clipped={channelState.clipUntil > Date.now()}
          disabled={!isConnected}
          onToggleMute={() => toggleStripMute("inputs", stripNumber)}
          onToggleSolo={() => toggleStripSolo("inputs", stripNumber)}
          onTogglePhantom={() => toggleStripPhantom("inputs", stripNumber)}
          onTogglePhase={() => togglePhase(stripNumber)}
          onFaderChange={(position) =>
            handleStripFaderChange("inputs", stripNumber, position)
          }
          onPanChange={(value) =>
            handleStripPanChange("inputs", stripNumber, value)
          }
          onGainChange={(value) =>
            handleStripGainChange("inputs", stripNumber, value)
          }
          onOpenDetail={goToDetailChannel}
          onOpenEditMenu={(channelNumber) =>
            setCustomizationView({ section: "inputs", index: channelNumber })
          }
          rawParamStore={rawParamStoreRef.current}
          domainSelectors={domainSelectors}
        />
      </div>
    );
  }

  function renderFxStripNode(fxNumber: number): ReactNode {
    const fxState = fxStrips[fxNumber - 1];

    return (
      <div
        key={`fx-${fxNumber}`}
        style={{
          marginLeft: 0,
          marginRight: 0,
          flex: "0 0 auto",
          position: "relative",
          overflow: "visible",
        }}
      >
        <FxStrip
          fxNumber={fxNumber}
          colorId={fxState.colorId}
          channelName={fxState.channelName}
          eqState={fxProcessorStates[fxNumber - 1].eq}
          muted={fxState.muted}
          soloOn={fxState.soloOn}
          faderDb={fxState.faderDb}
          faderPosition={fxState.faderPosition}
          meterDb={fxState.meterDb}
          peakDb={fxState.peakDb}
          clipped={fxState.clipUntil > Date.now()}
          disabled={!isConnected}
          onToggleMute={() => toggleStripMute("fx", fxNumber)}
          onToggleSolo={() => toggleStripSolo("fx", fxNumber)}
          onFaderChange={(position) =>
            handleStripFaderChange("fx", fxNumber, position)
          }
          onOpenDetail={goToDetailFx}
          onOpenEditMenu={(targetFxNumber) =>
            setCustomizationView({ section: "fx", index: targetFxNumber })
          }
          rawParamStore={rawParamStoreRef.current}
          domainSelectors={domainSelectors}
        />
      </div>
    );
  }

  function renderAuxStripNode(auxNumber: number): ReactNode {
    const auxState = auxStrips[auxNumber - 1];
    const [odd, even] = getAuxPair(auxNumber);
    const key = pairKey(odd, even);
    const isLinked = Boolean(auxLinks[key]);
    const displayAuxName =
      isLinked && auxState.channelName.trim().length > 0
        ? `${stripLinkedNameSuffix(auxState.channelName)} ${auxNumber === odd ? "L" : "R"}`
        : auxState.channelName;

    return (
      <div
        key={`aux-${auxNumber}`}
        style={{
          marginLeft: 0,
          marginRight: 0,
          flex: "0 0 auto",
          position: "relative",
          overflow: "visible",
          zIndex: isLinked && auxNumber === odd ? 3 : 1,
        }}
      >
        {isLinked && auxNumber === odd && (
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 36,
              width: "calc(200% + 4px)",
              height: 4,
              borderRadius: "1px",
              background: "#fb923c",
              boxShadow: "0 0 8px rgba(251,146,60,0.5)",
              pointerEvents: "none",
              zIndex: 8,
            }}
          />
        )}

        <AuxStrip
          auxNumber={auxNumber}
          colorId={auxState.colorId}
          channelName={displayAuxName}
          muted={auxState.muted}
          soloOn={auxState.soloOn}
          faderDb={auxState.faderDb}
          faderPosition={auxState.faderPosition}
          meterDb={auxState.meterDb}
          peakDb={auxState.peakDb}
          clipped={auxState.clipUntil > Date.now()}
          isLinked={isLinked}
          disabled={!isConnected}
          eqState={auxProcessorStates[auxNumber - 1].eq}
          onToggleMute={() => toggleStripMute("aux", auxNumber)}
          onToggleSolo={() => toggleStripSolo("aux", auxNumber)}
          onFaderChange={(position) =>
            handleStripFaderChange("aux", auxNumber, position)
          }
          onOpenDetail={goToDetailAux}
          onOpenEditMenu={(targetAuxNumber) =>
            setCustomizationView({ section: "aux", index: targetAuxNumber })
          }
          rawParamStore={rawParamStoreRef.current}
          domainSelectors={domainSelectors}
        />
      </div>
    );
  }

  function renderDcaStripNode(id: DcaGroupId, index: number): ReactNode {
    const group = dcaGroups[index] ?? {
      enabled: true,
      faderPosition: dcaValueToPosition(1200),
      members: [] as GroupMember[],
    };

    return (
      <div
        key={`dca-group-${id}`}
        style={{
          marginLeft: 0,
          marginRight: 0,
          flex: "0 0 auto",
          position: "relative",
          overflow: "visible",
        }}
      >
        <GroupStrip
          kind="dca"
          groupId={id}
          groupName={dcaNames[id - 1]}
          memberCount={group.members.length}
          active={group.enabled}
          faderPosition={group.faderPosition}
          accentColor={dcaAccentColorFromId(dcaColorIds[id - 1], DCA_DEFAULT_COLOR_IDS[id])}
          disabled={!isConnected}
          onToggleActive={() => handleDcaGroupToggleEnabled(id)}
          onFaderChange={(value) => handleDcaGroupFaderChange(id, value)}
          onOpenDetail={() => {
            setMainView("dcaGroups");
            setDetailView(null);
            setSettingsDropdownOpen(false);
          }}
          onOpenEditMenu={() => {
            setCustomizationView({ section: "dca", index: id });
            setDetailView(null);
            setSettingsDropdownOpen(false);
          }}
          rawParamStore={rawParamStoreRef.current}
          domainSelectors={domainSelectors}
        />
      </div>
    );
  }

  function renderFixedMasterBus(): ReactNode {
    const now = Date.now();
    const lFader = master.leftFaderDb;
    const rFader = master.rightFaderDb;
    const applyFader = (db: number, faderDb: number) =>
      faderDb <= -120 ? -75 : Math.max(-75, db + faderDb);
    const masterMeterDbL = applyFader(mainMasterMeter.leftDb, lFader);
    const masterMeterDbR = applyFader(mainMasterMeter.rightDb, rFader);
    const masterPeakDbL = applyFader(mainMasterMeter.leftPeakDb, lFader);
    const masterPeakDbR = applyFader(mainMasterMeter.rightPeakDb, rFader);
    const masterClipL = lFader > -6 && mainMasterMeter.leftClipUntil > now;
    const masterClipR = rFader > -6 && mainMasterMeter.rightClipUntil > now;

    return (
      <MasterBus
        leftColorId={master.leftColorId}
        rightColorId={master.rightColorId}
        leftMuted={master.leftMuted}
        rightMuted={master.rightMuted}
        leftSoloOn={master.leftSoloOn}
        rightSoloOn={master.rightSoloOn}
        soloOn={master.soloOn}
        linked={masterLinked}
        leftFaderDb={master.leftFaderDb}
        rightFaderDb={master.rightFaderDb}
        leftFaderPosition={master.leftFaderPosition}
        rightFaderPosition={master.rightFaderPosition}
        meterDbL={masterMeterDbL}
        meterDbR={masterMeterDbR}
        peakDbL={masterPeakDbL}
        peakDbR={masterPeakDbR}
        clippedL={masterClipL}
        clippedR={masterClipR}
        disabled={!isConnected}
        muteGroups={getMuteIdsForActiveProfile().map((id) => ({
          id,
          active: muteGroups[id - 1]?.active ?? false,
        }))}
        onToggleMuteGroup={(id) => handleMuteGroupToggleActive(id as MuteGroupId)}
        onToggleMainMute={toggleMainMasterMute}
        onToggleMainSolo={toggleMainMasterSolo}
        onToggleLeftMute={toggleMasterLeftMute}
        onToggleLeftSolo={toggleMasterLeftSolo}
        onToggleRightMute={toggleMasterRightMute}
        onToggleRightSolo={toggleMasterRightSolo}
        onToggleLink={() => {
          toggleMasterLink().catch((error) => {
            setStatus(
              error instanceof Error
                ? error.message
                : "Erro ao alternar link de master"
            );
          });
        }}
        onMainFaderChange={handleMainMasterFaderChange}
        onLeftFaderChange={handleMasterLeftFaderChange}
        onRightFaderChange={handleMasterRightFaderChange}
        onOpenDetail={goToDetailMaster}
        rawParamStore={rawParamStoreRef.current}
        domainSelectors={domainSelectors}
      />
    );
  }

  function buildMixerTabs(): MixerTabDefinition[] {
    const tabs: MixerTabDefinition[] = [];
    const slotsPerTab = viewportWidth >= 1920 ? 16 : viewportWidth >= 1200 ? 12 : 8;
    const inputSlotsPerTab = slotsPerTab;
    const mixBusSlotsPerTab = slotsPerTab;

    for (let start = 1; start <= channelCount; start += inputSlotsPerTab) {
      const end = Math.min(start + inputSlotsPerTab - 1, channelCount);
      tabs.push({
        id: `ch-${start}-${end}`,
        label: `CH ${start}-${end}`,
        itemCount: end - start + 1,
        visibleSlots: inputSlotsPerTab,
        items: Array.from({ length: end - start + 1 }, (_, index) =>
          renderInputStrip(start + index)
        ),
      });
    }

    for (let start = 1; start <= auxStrips.length; start += mixBusSlotsPerTab) {
      const end = Math.min(start + mixBusSlotsPerTab - 1, auxStrips.length);
      tabs.push({
        id: `aux-${start}-${end}`,
        label: `AUX ${start}-${end}`,
        itemCount: end - start + 1,
        visibleSlots: mixBusSlotsPerTab,
        items: Array.from({ length: end - start + 1 }, (_, index) =>
          renderAuxStripNode(start + index)
        ),
      });
    }

    if (fxStrips.length > 0) {
      tabs.push({
        id: `fx-1-${fxStrips.length}`,
        label: `FX 1-${fxStrips.length}`,
        itemCount: fxStrips.length,
        visibleSlots: mixBusSlotsPerTab,
        items: fxStrips.map((_, index) => renderFxStripNode(index + 1)),
      });
    }

    if (activeDcaIds.length > 0) {
      tabs.push({
        id: `dca-1-${activeDcaIds.length}`,
        label: `DCA 1-${activeDcaIds.length}`,
        itemCount: activeDcaIds.length,
        visibleSlots: mixBusSlotsPerTab,
        items: activeDcaIds.map((id, index) => renderDcaStripNode(id, index)),
      });
    }

    return tabs;
  }

  const mixerTabs = buildMixerTabs();
  const resolvedMixerTabId = mixerTabs.some((tab) => tab.id === activeMixerTabId)
    ? activeMixerTabId
    : mixerTabs[0]?.id ?? "ch-1-8";

  function renderGlobalSendsView(kind: "aux" | "fx") {
    const isAux = kind === "aux";
    const selectedBus = isAux ? selectedAuxSendsTarget : selectedFxSendsTarget;
    const destinationCount = isAux ? auxStrips.length : fxStrips.length;
    const destinations = Array.from({ length: destinationCount }, (_, index) => index + 1);
    const auxViewSource = isAux ? resolveAuxSendsViewSource(selectedBus) : null;
    const values = isAux
      ? auxViewSource?.values
      : fxInputSendValues[selectedBus];
    const tapPoints = isAux
      ? auxViewSource?.tapPoints
      : fxInputSendTapPoints[selectedBus];
    const selectedBusProcessorState = isAux
      ? auxProcessorStates[selectedBus - 1] ?? createDefaultAuxProcessorState()
      : fxProcessorStates[selectedBus - 1] ?? createDefaultProcessorState();
    const selectedAuxStrip = isAux ? auxStrips[selectedBus - 1] : null;
    const selectedFxStrip = isAux ? null : fxStrips[selectedBus - 1];
    const selectedAuxPair = isAux ? getAuxPair(selectedBus) : null;
    const selectedAuxLinkKey = selectedAuxPair ? pairKey(selectedAuxPair[0], selectedAuxPair[1]) : null;
    const selectedAuxLinked = selectedAuxLinkKey ? Boolean(auxLinks[selectedAuxLinkKey]) : false;
    const sendsView = buildChannelInputSendsView(
      values,
      tapPoints,
      undefined,
      { mirrorLinkedChannels: isAux && selectedAuxLinked }
    );

    return (
      <div
        className="detail-layout"
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateRows: "32px minmax(0, 1fr)",
          gap: 0,
          padding: "8px 8px 8px 8px",
        }}
      >
        <section
          className="detail-panel"
          style={{
            minWidth: 0,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            overflow: "hidden",
          }}
        >
          <div
            role="tablist"
            aria-label={`${isAux ? "Auxiliares" : "FX"} do Sends on Fader`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              borderRadius: 4,
              border: "none",
              background: "transparent",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            {destinations.map((destination) => {
              const active = destination === selectedBus;
              return (
                <button
                  key={`${kind}-destination-${destination}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={!isConnected}
                  onClick={() => {
                    if (isAux) {
                      setSelectedAuxSendsTarget(destination);
                    } else {
                      setSelectedFxSendsTarget(destination);
                    }
                  }}
                  style={{
                    height: 32,
                    minHeight: 32,
                    padding: "0 16px",
                    borderRadius: 0,
                    border: "none",
                    borderBottom: active
                      ? "2px solid var(--border-focus)"
                      : "2px solid transparent",
                    background: "transparent",
                    color: active
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontSize: 10,
                    lineHeight: "12px",
                    fontWeight: 700,
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                    cursor: !isConnected ? "not-allowed" : "pointer",
                    opacity: !isConnected ? 0.5 : 1,
                    whiteSpace: "nowrap",
                    width: "auto",
                    flex: "0 0 auto",
                  }}
                >
                  {`${isAux ? "AUX" : "FX"} ${destination}`}
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="detail-panel"
          style={{
            borderRadius: 4,
            border: "none",
            background: "transparent",
            minHeight: 0,
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
            padding: 0,
          }}
        >
          <aside
            style={{
              minHeight: 0,
              width: "var(--strip-width)",
              overflow: "hidden",
              position: "absolute",
              top: 24,
              left: 0,
              bottom: 0,
              zIndex: 3,
              boxSizing: "border-box",
              paddingBottom: 0,
            }}
          >
            {isAux && selectedAuxStrip ? (
              <AuxStrip
                auxNumber={selectedBus}
                colorId={selectedAuxStrip.colorId}
                channelName={selectedAuxStrip.channelName}
                muted={selectedAuxStrip.muted}
                soloOn={selectedAuxStrip.soloOn}
                faderDb={selectedAuxStrip.faderDb}
                faderPosition={selectedAuxStrip.faderPosition}
                meterDb={selectedAuxStrip.meterDb}
                peakDb={selectedAuxStrip.peakDb}
                clipped={selectedAuxStrip.clipUntil > Date.now()}
                isLinked={selectedAuxLinked}
                disabled={!isConnected}
                eqState={selectedBusProcessorState.eq}
                onToggleMute={() => toggleStripMute("aux", selectedBus)}
                onToggleSolo={() => toggleStripSolo("aux", selectedBus)}
                onToggleLink={() => {
                  toggleAuxLink(selectedBus).catch((error) => {
                    setStatus(
                      error instanceof Error
                        ? error.message
                        : "Erro ao alternar link de auxiliar"
                    );
                  });
                }}
                linkButtonLabel={selectedAuxPair ? `${selectedAuxPair[0]}-${selectedAuxPair[1]}` : undefined}
                onFaderChange={(position) => handleStripFaderChange("aux", selectedBus, position)}
                rawParamStore={rawParamStoreRef.current}
                domainSelectors={domainSelectors}
              />
            ) : selectedFxStrip ? (
              <FxStrip
                fxNumber={selectedBus}
                colorId={selectedFxStrip.colorId}
                channelName={selectedFxStrip.channelName}
                eqState={selectedBusProcessorState.eq}
                muted={selectedFxStrip.muted}
                soloOn={selectedFxStrip.soloOn}
                faderDb={selectedFxStrip.faderDb}
                faderPosition={selectedFxStrip.faderPosition}
                meterDb={selectedFxStrip.meterDb}
                peakDb={selectedFxStrip.peakDb}
                clipped={selectedFxStrip.clipUntil > Date.now()}
                disabled={!isConnected}
                onToggleMute={() => toggleStripMute("fx", selectedBus)}
                onToggleSolo={() => toggleStripSolo("fx", selectedBus)}
                onFaderChange={(position) => handleStripFaderChange("fx", selectedBus, position)}
                rawParamStore={rawParamStoreRef.current}
                domainSelectors={domainSelectors}
              />
            ) : null}
          </aside>

          <div
            style={{
              position: "absolute",
              top: 24,
              left: "var(--strip-width)",
              right: 0,
              bottom: 0,
              minWidth: 0,
              overflow: "hidden",
              paddingLeft: 4,
              zIndex: 1,
            }}
          >
            <ChannelProcessors
              activeModule="sends"
              state={selectedBusProcessorState}
              disabled={!isConnected}
              hideGate={true}
              hideComp={true}
              hideModuleTabs={true}
              moduleItems={[
                { id: "sends", label: isAux ? "AUX MIX" : "SEND MIX" },
              ]}
              sends={sendsView}
              onModuleChange={() => {}}
              onGateChange={() => {}}
              onCompChange={() => {}}
              onEqChange={() => {}}
              onEqBandChange={() => {}}
              onSendValueChange={(id, value) =>
                handleBusInputSendValueChange(kind, selectedBus, id, value)
              }
              onSendTapPointToggle={(id) =>
                handleBusInputSendTapPointToggle(kind, selectedBus, id)
              }
              onResetGate={() => {}}
              onResetComp={() => {}}
              onResetEq={() => {}}
            />
          </div>
        </section>
      </div>
    );
  }

  function handleMuteGroupsMemberMuteApplied(memberId: string, muted: boolean) {
    if (memberId.startsWith("CH_")) {
      const channel = Number(memberId.slice(3));
      if (Number.isFinite(channel) && channel >= 1 && channel <= channelCount) {
        updateChannelState(channel, { muted });
      }
      return;
    }

    if (memberId.startsWith("AUX_")) {
      const aux = Number(memberId.slice(4));
      if (Number.isFinite(aux) && aux >= 1 && aux <= getAuxBusCount()) {
        updateAuxStripState(aux, { muted });
      }
      return;
    }

    if (memberId.startsWith("FX_")) {
      const fx = Number(memberId.slice(3));
      if (Number.isFinite(fx) && fx >= 1 && fx <= getFxBusCount()) {
        updateFxStripState(fx, { muted });
      }
      return;
    }

    if (memberId === "MASTER_L") {
      updateMasterState({ leftMuted: muted });
      return;
    }

    if (memberId === "MASTER_R") {
      updateMasterState({ rightMuted: muted });
    }
  }

  const customizerItem = customizationView
    ? customizationView.section === "dca"
      ? {
          defaultName: getDefaultDcaGroupName(customizationView.index - 1),
          channelName: dcaNames[customizationView.index - 1],
          colorId: dcaColorIds[customizationView.index - 1],
          title: "Editar DCA",
          allowZeroColorSelection: false,
        }
      : {
          defaultName: getDefaultDisplayName(
            customizationView.section === "inputs"
              ? { type: "channel", channel: customizationView.index }
              : customizationView.section === "aux"
                ? { type: "aux", aux: customizationView.index }
                : { type: "fx", fx: customizationView.index }
          ),
          channelName: getSectionStrips(customizationView.section)[customizationView.index - 1].channelName,
          colorId: getSectionStrips(customizationView.section)[customizationView.index - 1].colorId,
          title: "Editar Canal",
          allowZeroColorSelection: false,
        }
    : null;

  useEffect(() => {
    if (!isConnected) return;
    if (detailView !== null) return;

    Promise.allSettled([
      syncLinkStates(),
      syncChannelPairVisualState(),
      syncMasterState(),
    ]).catch(() => {
      // Ignore transient sync issues when returning to mixer view.
    });
  }, [detailView, isConnected]);

  const trialDaysRemaining = getTrialRemainingDays(licenseTrialExpiryAt);
  const trialIsActive = licenseFormalState === "TRIAL_ACTIVE";
  const trialIsExpired = licenseFormalState === "TRIAL_EXPIRED";
  const trialDaysRemainingLabel = trialDaysRemaining !== null ? `${Math.max(0, trialDaysRemaining)} dia(s)` : "trial ativo";
  const isTrialLicense = trialIsActive || trialIsExpired;
  const normalizedInstallationId = installationId.trim();
  const hasCurrentDeviceInList = licenseDevices.some((device) => device.deviceId === normalizedInstallationId);
  const shouldInjectCurrentDevice =
    Boolean(normalizedInstallationId) &&
    !isLicenseStateBlocked(licenseFormalState) &&
    !hasCurrentDeviceInList;
  const visibleAssociatedDevices = (() => {
    const base = shouldInjectCurrentDevice
      ? [
          {
            deviceId: normalizedInstallationId,
            deviceName: getDeviceNameLabel(),
            devicePlatform: getPlatformLabel(),
            active: true,
          },
          ...licenseDevices,
        ]
      : licenseDevices;

    return [...base].sort((a, b) => {
      if (a.deviceId === normalizedInstallationId) return -1;
      if (b.deviceId === normalizedInstallationId) return 1;
      return 0;
    });
  })();
  const hasUnlimitedActivations = licenseUnlimitedActivations || licenseLinkedUserType === "admin";
  const defaultDeviceLimit = isTrialLicense ? 1 : 2;
  const apiDeviceLimit =
    !hasUnlimitedActivations && licenseRemainingActivations !== null
      ? Math.max(
          visibleAssociatedDevices.length,
          (licenseActiveDevicesCount ?? visibleAssociatedDevices.length) + licenseRemainingActivations
        )
      : null;
  const associatedDeviceLimit = hasUnlimitedActivations ? null : (apiDeviceLimit ?? defaultDeviceLimit);
  const activeDeviceCount = visibleAssociatedDevices.filter((d) => d.active).length;
  const canReactivate = hasUnlimitedActivations || associatedDeviceLimit === null || activeDeviceCount < associatedDeviceLimit;
  const deviceCount = visibleAssociatedDevices.length;
  const deviceCountLabel = deviceCount === 1 ? "1 dispositivo" : `${deviceCount} dispositivos`;
  const settingsUsageLabel = hasUnlimitedActivations
    ? `${deviceCountLabel} ${deviceCount === 1 ? "ativo" : "ativos"}`
    : `${deviceCountLabel} de ${associatedDeviceLimit}`;
  const associatedDeviceCapacityLabel = hasUnlimitedActivations ? "Sem limite" : String(associatedDeviceLimit);
  const isFullLicenseView = !isTrialLicense && licenseFormalState !== "LICENSE_NOT_FOUND";
  const settingsVariantClass = isFullLicenseView ? "settings-modal--settings-full" : "settings-modal--settings-trial";
  const settingsStatusChipLabel = trialIsActive
    ? "Teste ativo"
    : trialIsExpired
      ? "Teste encerrado"
      : licenseFormalState === "LICENSE_NOT_FOUND"
        ? "Sem licença"
        : "Licença adquirida";
  const settingsStatusChipDetail = trialIsActive
    ? `${trialDaysRemainingLabel} restantes`
    : isTrialLicense
      ? "Adquira a licença para liberar mais dispositivos"
      : hasUnlimitedActivations
        ? "Licença ativa"
        : licenseRemainingActivations !== null
          ? licenseRemainingActivations === 1
            ? "1 ativação disponível"
            : `${licenseRemainingActivations} ativações disponíveis`
          : "Licença ativa";
  const upgradeBadgeLabel = trialIsActive
    ? trialDaysRemaining !== null && trialDaysRemaining >= 0
      ? `Teste ativo · ${trialDaysRemaining} dias`
      : "Teste ativo"
    : "Teste encerrado";
  const upgradeHeadline = trialIsActive
    ? "Continue usando o AX Control"
    : "Ative seu acesso ao AX Control";
  const upgradeDescription = trialIsActive
    ? "Adquira sua licença e continue controlando sua Mesa Axios sem interrupções."
    : "Finalize a compra pelo WhatsApp e volte a usar o AX Control sem interrupções.";

  const licenseModalNode = licenseModalOpen ? (
    <div
      className="settings-modal-backdrop"
      onClick={() => {
        if (!licenseModalMandatory) {
          closeLicenseModal();
        }
      }}
    >
      <section
        className={`settings-modal ${licenseModalMode === "onboarding" ? "settings-modal--onboarding" : ""} ${licenseModalMode === "upgrade" ? "settings-modal--upgrade" : ""} ${licenseModalMode === "settings" ? `settings-modal--settings ${settingsVariantClass}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Licença"
        onClick={(event) => event.stopPropagation()}
      >
        {!licenseModalMandatory && (
          <button
            type="button"
            className="settings-modal__close"
            onClick={closeLicenseModal}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        )}
        <div className="settings-modal__header">
          <div>
            {licenseModalMode === "onboarding" && licenseOnboardingView === "register" && (
              <span className="settings-modal__badge">7 dias grátis</span>
            )}
            {licenseModalMode !== "upgrade" && (
              <>
                <h2>
                  {licenseModalMode === "onboarding"
                    ? licenseOnboardingView === "register"
                      ? "Experimente grátis por 7 dias"
                      : "Entre na sua conta"
                    : "Licença e acesso"}
                </h2>
                <p>
                  {licenseModalMode === "onboarding"
                    ? licenseOnboardingView === "register"
                      ? "Controle total da sua Mesa Axios. Sem cartão, sem compromisso."
                      : "Entre com sua conta e continue de onde parou."
                    : isTrialLicense
                      ? "Veja o status do seu teste grátis e gerencie seu acesso."
                      : "Gerencie sua licença e os dispositivos associados."}
                </p>
              </>
            )}
            {licenseModalMode === "onboarding" && licenseOnboardingView === "register" && !isOnline && (
              <p className="settings-modal__hint">Sem internet no momento. A ativação exige conexão.</p>
            )}
            {licenseModalMode === "upgrade" && trialIsActive && trialDaysRemaining !== null && (
              <p>Seu teste ainda tem {trialDaysRemaining === 1 ? "1 dia" : `${trialDaysRemaining} dias`}. Aproveite para garantir o acesso completo.</p>
            )}
            {licenseModalMode === "upgrade" && trialIsExpired && (
              <p>Seu período de teste encerrou. Adquira a licença para voltar a usar o AX Control.</p>
            )}
            {licenseModalMode === "settings" && !isOnline && <p>Sem internet no momento. Alguns recursos exigem conexão.</p>}
          </div>
        </div>

        {licenseModalMode === "upgrade" && (
          <div className="settings-modal__upgrade">
            {pixPayment.stage === "idle" && (
              <>
                <div className="settings-modal__upgrade-hero">
                  <span className="settings-modal__upgrade-badge">{upgradeBadgeLabel}</span>
                  <div className="settings-modal__upgrade-hero-copy">
                    <h3>{upgradeHeadline}</h3>
                    <p>{upgradeDescription}</p>
                  </div>
                  <div className="settings-modal__upgrade-visual" aria-hidden="true">
                    <img
                      className="settings-modal__upgrade-product"
                      src={productAxios24}
                      alt=""
                    />
                    <div className="settings-modal__upgrade-appicon">
                      <svg viewBox="0 0 132 94" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 0H47.091L66.0001 22.8485H32.1213L14 0Z" fill="#15B2E8" />
                        <path d="M118 0H84.909L65.9999 22.8485H99.8787L118 0Z" fill="#15B2E8" />
                        <path d="M98.3218 66.7083L33.6785 66.7082L66.0001 27.2916L98.3218 66.7083Z" fill="#72CFEF" />
                        <path d="M14 94.0002H47.091L66.0001 71.1517H32.1213L14 94.0002Z" fill="#39C5EC" />
                        <path d="M118 94.0002H84.909L65.9999 71.1517H99.8787L118 94.0002Z" fill="#39C5EC" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="settings-modal__upgrade-card">
                  <div className="settings-modal__upgrade-price-block">
                    <div className="settings-modal__upgrade-price">{UPGRADE_PRICE_LABEL}</div>
                    <div className="settings-modal__upgrade-copy">
                      <strong>Acesso completo ao AX Control</strong>
                      <span>Licença permanente para o AX Control.</span>
                    </div>
                  </div>
                  <div className="settings-modal__upgrade-benefits">
                    <div className="settings-modal__upgrade-benefit">
                      <ShieldCheck size={18} className="settings-modal__upgrade-benefit-icon" aria-hidden="true" />
                      <strong>Acesso completo</strong>
                    </div>
                    <div className="settings-modal__upgrade-benefit">
                      <Zap size={18} className="settings-modal__upgrade-benefit-icon" aria-hidden="true" />
                      <strong>Sem limitações</strong>
                    </div>
                    <div className="settings-modal__upgrade-benefit">
                      <Monitor size={18} className="settings-modal__upgrade-benefit-icon" aria-hidden="true" />
                      <strong>Atualizações incluídas</strong>
                    </div>
                    <div className="settings-modal__upgrade-benefit">
                      <Phone size={18} className="settings-modal__upgrade-benefit-icon" aria-hidden="true" />
                      <strong>Suporte no WhatsApp</strong>
                    </div>
                  </div>
                </div>
              </>
            )}

            {pixPayment.stage !== "idle" && (
              <div className="pix-payment__header-compact">
                <div className="pix-payment__header-brand">
                  <div className="pix-payment__header-icon" aria-hidden="true">
                    <svg viewBox="0 0 132 94" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="23">
                      <path d="M14 0H47.091L66.0001 22.8485H32.1213L14 0Z" fill="#15B2E8" />
                      <path d="M118 0H84.909L65.9999 22.8485H99.8787L118 0Z" fill="#15B2E8" />
                      <path d="M98.3218 66.7083L33.6785 66.7082L66.0001 27.2916L98.3218 66.7083Z" fill="#72CFEF" />
                      <path d="M14 94.0002H47.091L66.0001 71.1517H32.1213L14 94.0002Z" fill="#39C5EC" />
                      <path d="M118 94.0002H84.909L65.9999 71.1517H99.8787L118 94.0002Z" fill="#39C5EC" />
                    </svg>
                  </div>
                  <div className="pix-payment__header-text">
                    <span className="pix-payment__header-appname">AX Control</span>
                    <span className="pix-payment__header-sublabel">Licença permanente</span>
                  </div>
                  <span className="pix-payment__header-price">{UPGRADE_PRICE_LABEL}</span>
                </div>
                {trialIsActive && trialDaysRemaining !== null && (
                  <span className="settings-modal__upgrade-badge" style={{ alignSelf: "center" }}>
                    {upgradeBadgeLabel}
                  </span>
                )}
              </div>
            )}

            {pixPayment.stage === "idle" && (
              <>
                <button
                  type="button"
                  className="startup-button settings-modal__upgrade-button settings-modal__upgrade-button--pix"
                  onClick={() => { void startPixPayment(); }}
                >
                  <span className="settings-modal__upgrade-button-label">Comprar via Pix</span>
                  <span className="settings-modal__upgrade-button-hint">Pagamento instantâneo • Ativação automática</span>
                </button>

                <button
                  type="button"
                  className="startup-button settings-modal__upgrade-button settings-modal__upgrade-button--whatsapp"
                  onClick={() => { void handleContactForUpgrade(); }}
                >
                  <span className="settings-modal__upgrade-button-label">Comprar pelo WhatsApp</span>
                  <span className="settings-modal__upgrade-button-hint">Atendimento direto para pagamento e ativação</span>
                </button>

                {trialIsActive && (
                  <button
                    type="button"
                    className="startup-button startup-button--secondary settings-modal__upgrade-trial"
                    onClick={() => {
                      if (pendingDiscoveryMixer) { handleContinueTrialConnection(); return; }
                      closeLicenseModal();
                    }}
                  >
                    Continuar com o teste grátis
                  </button>
                )}

                <div className="settings-modal__upgrade-footer">
                  Compra segura • Pix instantâneo • Suporte via WhatsApp
                </div>
              </>
            )}

            {pixPayment.stage === "creating" && (
              <div className="pix-payment pix-payment--loading">
                <div className="pix-payment__spinner" />
                <p className="pix-payment__label">Gerando QR Code Pix...</p>
              </div>
            )}

            {pixPayment.stage === "awaiting" && (
              <div className="pix-payment">
                <p className="pix-payment__title">Escaneie o QR Code ou copie o código Pix</p>
                <div className="pix-payment__qr-wrap">
                  <img
                    className="pix-payment__qr"
                    src={`data:image/png;base64,${pixPayment.qrCodeBase64}`}
                    alt="QR Code Pix"
                    width={180}
                    height={180}
                  />
                </div>
                <div className="pix-payment__code-row">
                  <code className="pix-payment__code">
                    {pixPayment.qrCode.slice(0, 44)}…
                  </code>
                  <button
                    type="button"
                    className="startup-button startup-button--ghost pix-payment__copy-btn"
                    onClick={() => { void navigator.clipboard.writeText(pixPayment.qrCode); }}
                  >
                    Copiar
                  </button>
                </div>
                <p className="pix-payment__status">
                  <span className="pix-payment__status-dot" />
                  Aguardando pagamento...
                </p>
                <button
                  type="button"
                  className="startup-button startup-button--ghost pix-payment__cancel-btn"
                  onClick={() => { stopPixPolling(); setPixPayment({ stage: "idle" }); }}
                >
                  Cancelar
                </button>
              </div>
            )}

            {pixPayment.stage === "confirmed" && (
              <div className="pix-payment pix-payment--confirmed">
                <div className="pix-payment__check" aria-hidden="true">✓</div>
                <p className="pix-payment__title">Pagamento confirmado!</p>
                <p className="pix-payment__label">Sua licença está sendo ativada...</p>
              </div>
            )}

            {pixPayment.stage === "failed" && (
              <div className="pix-payment pix-payment--failed">
                <p className="pix-payment__title">
                  {pixPayment.reason === "rejected" && "Pagamento recusado."}
                  {pixPayment.reason === "cancelled" && "Pagamento cancelado."}
                  {pixPayment.reason === "expired" && "QR Code expirado."}
                  {pixPayment.reason === "network" && "Erro de conexão."}
                </p>
                <p className="pix-payment__label">Tente novamente ou use o WhatsApp.</p>
                <button
                  type="button"
                  className="startup-button startup-button--primary"
                  onClick={() => { void startPixPayment(); }}
                >
                  Tentar novamente
                </button>
                <button
                  type="button"
                  className="startup-button startup-button--ghost"
                  onClick={() => { void handleContactForUpgrade(); }}
                >
                  Comprar pelo WhatsApp
                </button>
                <button
                  type="button"
                  className="startup-button startup-button--ghost pix-payment__cancel-btn"
                  onClick={() => { setPixPayment({ stage: "idle" }); }}
                >
                  Voltar
                </button>
              </div>
            )}
          </div>
        )}

        {licenseModalMode === "settings" && (
          <>
            <div className="settings-modal__license-overview">
              <div className="settings-modal__license-overview-status">
                <strong>{settingsStatusChipLabel}</strong>
                <span>{settingsStatusChipDetail}</span>
              </div>
              <div className="settings-modal__license-overview-capacity">
                <strong>{associatedDeviceCapacityLabel}</strong>
                <span>{settingsUsageLabel}</span>
              </div>
            </div>

            <div className="settings-modal__settings-layout">
              <section className="settings-modal__settings-card settings-modal__settings-card--devices">
                <div className="settings-modal__settings-card-header">
                  <div>
                    <h3>Este dispositivo</h3>
                    <p>Seu ID de dispositivo é único e permanente. Use-o para ativar ou transferir sua licença.</p>
                  </div>
                </div>

                <div className="settings-modal__row">
                  <label htmlFor="settings-installation-id">
                    <Hash size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} aria-hidden="true" />
                    ID do dispositivo
                  </label>
                  <div className="settings-modal__inline">
                    <input
                      id="settings-installation-id"
                      className="settings-modal__input"
                      value={installationId}
                      readOnly
                    />
                    <button
                      type="button"
                      className="startup-button startup-button--secondary settings-modal__copy"
                      onClick={handleCopyInstallationId}
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="settings-modal__row">
                  <label htmlFor="settings-license-key">Chave de licença</label>
                  <input
                    id="settings-license-key"
                    className="settings-modal__input"
                    value={licenseKeyInput}
                    onChange={(event) => setLicenseKeyInput(event.target.value)}
                    placeholder="Cole ou digite sua chave de licença"
                    disabled={licenseValidationBusy}
                  />
                </div>

                <div className="settings-modal__settings-inline-actions">
                  <button
                    type="button"
                    className="startup-button startup-button--secondary"
                    disabled={licenseValidationBusy}
                    onClick={() => {
                      void handleValidateLicense();
                    }}
                  >
                    {licenseValidationBusy
                      ? "Validando..."
                      : isFullLicenseView ? "Trocar licença" : "Aplicar licença"}
                  </button>
                  {isTrialLicense && (
                    <>
                      <button
                        type="button"
                        className="startup-button startup-button--primary"
                        onClick={() => {
                          setLicenseModalMandatory(false);
                          setLicenseModalMode("upgrade");
                          void startPixPayment();
                        }}
                      >
                        Comprar via Pix · {UPGRADE_PRICE_LABEL}
                      </button>
                      <button
                        type="button"
                        className="startup-button startup-button--secondary"
                        onClick={() => { void handleContactForUpgrade(); }}
                      >
                        Comprar pelo WhatsApp
                      </button>
                    </>
                  )}
                </div>
              </section>

              <section className="settings-modal__settings-card">
                <div className="settings-modal__settings-card-header settings-modal__settings-card-header--split">
                  <div>
                    <h3>Dispositivos associados</h3>
                    <p>{hasUnlimitedActivations
                      ? "Sem limite de dispositivos para esta conta."
                      : isTrialLicense
                        ? "O teste grátis permite apenas 1 dispositivo."
                        : associatedDeviceLimit !== null
                          ? `Esta licença permite até ${associatedDeviceLimit} dispositivos.`
                          : "Número de dispositivos definido pela sua licença."}</p>
                  </div>
                  <button
                    type="button"
                    className="startup-button startup-button--secondary settings-modal__refresh-btn"
                    disabled={licenseDevicesLoading}
                    onClick={() => {
                      void handleRefreshLicenseStatus();
                    }}
                    aria-label="Atualizar lista de dispositivos"
                  >
                    <RefreshCw size={13} className={licenseDevicesLoading ? "settings-modal__spin" : ""} aria-hidden="true" />
                    {licenseDevicesLoading ? "Atualizando..." : "Atualizar"}
                  </button>
                </div>

                {visibleAssociatedDevices.length > 0 ? (
                  <div className="settings-modal__device-list">
                    {visibleAssociatedDevices.map((device) => {
                      const isCurrentDevice = device.deviceId === installationId;
                      const platformLower = device.devicePlatform.toLowerCase();
                      const PlatformIcon = platformLower === "ios" || platformLower === "android"
                        ? Smartphone
                        : platformLower === "macos" || platformLower === "windows" || platformLower === "linux"
                          ? Laptop2
                          : Monitor;

                      const isBusy = licenseDeviceActionBusy === device.deviceId;
                      const isRevoked = device.active === false;

                      return (
                        <div
                          key={device.deviceId}
                          className={[
                            "settings-modal__device-card",
                            isCurrentDevice ? "settings-modal__device-card--current" : "",
                            isRevoked ? "settings-modal__device-card--revoked" : "",
                          ].filter(Boolean).join(" ")}
                        >
                          <div className="settings-modal__device-copy">
                            <strong className="settings-modal__device-name">
                              <PlatformIcon size={13} className="settings-modal__device-icon" aria-hidden="true" />
                              {device.deviceName}
                              {isCurrentDevice && <span className="settings-modal__device-current-tag">Este dispositivo</span>}
                              {isRevoked && <span className="settings-modal__device-revoked-tag">Removido</span>}
                            </strong>
                            <span>
                              {device.devicePlatform || "Plataforma desconhecida"}
                              {isCurrentDevice ? " · Ativo agora" : ""}
                            </span>
                            <span className="settings-modal__device-id">
                              {device.deviceId}
                            </span>
                          </div>
                          {!isCurrentDevice && (
                            isRevoked ? (
                              canReactivate && (
                                <button
                                  type="button"
                                  className="startup-button startup-button--primary settings-modal__remove-btn"
                                  disabled={isBusy}
                                  onClick={() => handleReactivateLicenseDevice(device.deviceId)}
                                >
                                  {isBusy
                                    ? <><RefreshCw size={12} className="settings-modal__spin" aria-hidden="true" /> Reativando...</>
                                    : "Reativar"}
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                className="startup-button startup-button--secondary settings-modal__remove-btn"
                                disabled={isBusy}
                                onClick={() => handleRevokeLicenseDevice(device.deviceId)}
                              >
                                {isBusy
                                  ? <><RefreshCw size={12} className="settings-modal__spin" aria-hidden="true" /> Revogando...</>
                                  : <><X size={12} aria-hidden="true" /> Revogar</>}
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="settings-modal__device-empty">
                    Nenhum dispositivo associado no momento.
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {licenseModalMode === "onboarding" && (
          <div className="settings-modal__onboarding">
            {licenseOnboardingView === "register" ? (
              <>
                <div className="settings-modal__onboarding-fields">
                  <div className="settings-modal__field">
                    <User size={16} className="settings-modal__field-icon" aria-hidden="true" />
                    <input
                      className="settings-modal__input"
                      value={licenseRegisterName}
                      onChange={(event) => setLicenseRegisterName(event.target.value)}
                      placeholder="Nome completo"
                      disabled={licenseRegisterBusy}
                    />
                  </div>
                  <div className="settings-modal__field">
                    <Mail size={16} className="settings-modal__field-icon" aria-hidden="true" />
                    <input
                      className="settings-modal__input"
                      value={licenseRegisterEmail}
                      onChange={(event) => setLicenseRegisterEmail(event.target.value)}
                      placeholder="E-mail"
                      inputMode="email"
                      disabled={licenseRegisterBusy}
                    />
                  </div>
                  <div className="settings-modal__field">
                    <Phone size={16} className="settings-modal__field-icon" aria-hidden="true" />
                    <input
                      className="settings-modal__input"
                      value={licenseRegisterPhone}
                      onChange={(event) => setLicenseRegisterPhone(formatPhoneWithDddMask(event.target.value))}
                      placeholder="Telefone (opcional)"
                      inputMode="tel"
                      disabled={licenseRegisterBusy}
                    />
                  </div>
                  <div className="settings-modal__field settings-modal__field--with-toggle">
                    <LockKeyhole size={16} className="settings-modal__field-icon" aria-hidden="true" />
                    <input
                      className="settings-modal__input"
                      value={licenseRegisterPassword}
                      onChange={(event) => setLicenseRegisterPassword(event.target.value)}
                      placeholder="Senha"
                      type={licenseRegisterShowPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={licenseRegisterBusy}
                    />
                    <button
                      type="button"
                      className="settings-modal__password-toggle"
                      onClick={() => setLicenseRegisterShowPassword((v) => !v)}
                      aria-label={licenseRegisterShowPassword ? "Ocultar senha" : "Mostrar senha"}
                      disabled={licenseRegisterBusy}
                    >
                      {licenseRegisterShowPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="settings-modal__field settings-modal__field--with-toggle">
                    <LockKeyhole size={16} className="settings-modal__field-icon" aria-hidden="true" />
                    <input
                      className="settings-modal__input"
                      value={licenseRegisterConfirmPassword}
                      onChange={(event) => setLicenseRegisterConfirmPassword(event.target.value)}
                      placeholder="Confirmar senha"
                      type={licenseRegisterShowConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={licenseRegisterBusy}
                    />
                    <button
                      type="button"
                      className="settings-modal__password-toggle"
                      onClick={() => setLicenseRegisterShowConfirmPassword((v) => !v)}
                      aria-label={licenseRegisterShowConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                      disabled={licenseRegisterBusy}
                    >
                      {licenseRegisterShowConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {licenseValidationMessage.kind !== "idle" && (
                  <div className={`settings-modal__result ${licenseValidationMessage.kind === "success" ? "settings-modal__result--success" : "settings-modal__result--error"}`}>
                    {licenseValidationMessage.text}
                  </div>
                )}
                <button
                  type="button"
                  className="startup-button startup-button--primary settings-modal__onboarding-cta"
                  disabled={licenseRegisterBusy}
                  onClick={() => {
                    void handleRequestLicenseRegistration();
                  }}
                >
                  {licenseRegisterBusy ? "Criando conta..." : "Criar conta grátis"}
                </button>
              </>
            ) : (
              <>
                <div className="settings-modal__onboarding-fields">
                  <div className="settings-modal__field">
                    <Mail size={16} className="settings-modal__field-icon" aria-hidden="true" />
                    <input
                      className="settings-modal__input"
                      value={licenseSignInEmail}
                      onChange={(event) => setLicenseSignInEmail(event.target.value)}
                      placeholder="E-mail da conta"
                      inputMode="email"
                      autoComplete="email"
                      disabled={licenseSignInBusy}
                    />
                  </div>
                  <div className="settings-modal__field settings-modal__field--with-toggle">
                    <LockKeyhole size={16} className="settings-modal__field-icon" aria-hidden="true" />
                    <input
                      className="settings-modal__input"
                      value={licenseSignInPassword}
                      onChange={(event) => setLicenseSignInPassword(event.target.value)}
                      placeholder="Senha"
                      type={licenseSignInShowPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={licenseSignInBusy}
                    />
                    <button
                      type="button"
                      className="settings-modal__password-toggle"
                      onClick={() => setLicenseSignInShowPassword((v) => !v)}
                      aria-label={licenseSignInShowPassword ? "Ocultar senha" : "Mostrar senha"}
                      disabled={licenseSignInBusy}
                    >
                      {licenseSignInShowPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {licenseValidationMessage.kind !== "idle" && (
                  <div className={`settings-modal__result ${licenseValidationMessage.kind === "success" ? "settings-modal__result--success" : "settings-modal__result--error"}`}>
                    {licenseValidationMessage.text}
                  </div>
                )}
                <button
                  type="button"
                  className="startup-button startup-button--primary settings-modal__onboarding-cta"
                  disabled={licenseSignInBusy}
                  onClick={() => {
                    void handleRecoverLicenseByCredentials();
                  }}
                >
                  {licenseSignInBusy ? "Entrando..." : "Entrar"}
                </button>
              </>
            )}

            <div className="settings-modal__onboarding-divider">
              <span className="settings-modal__onboarding-divider-label">
                {licenseOnboardingView === "register" ? "Já tem acesso?" : "Ainda não tem conta?"}
              </span>
              <button
                type="button"
                className="settings-modal__onboarding-link"
                onClick={() => {
                  setLicenseValidationMessage({ kind: "idle", text: "" });
                  setLicenseSignInShowPassword(false);
                  setLicenseRegisterShowPassword(false);
                  setLicenseRegisterShowConfirmPassword(false);
                  setLicenseOnboardingView((current) => (current === "register" ? "signin" : "register"));
                }}
              >
                {licenseOnboardingView === "register" ? "Entrar" : "Criar conta"}
              </button>
            </div>

            {licenseOnboardingView === "register" && (
              <div className="settings-modal__onboarding-benefits">
                <div className="settings-modal__benefit">
                  <ShieldCheck size={16} className="settings-modal__benefit-icon" aria-hidden="true" />
                  <div className="settings-modal__benefit-text">
                    <strong>Sem cartão</strong>
                    <span>Comece sem pagar nada</span>
                  </div>
                </div>
                <div className="settings-modal__benefit">
                  <Zap size={16} className="settings-modal__benefit-icon" aria-hidden="true" />
                  <div className="settings-modal__benefit-text">
                    <strong>Ativação imediata</strong>
                    <span>Pronto para usar</span>
                  </div>
                </div>
                <div className="settings-modal__benefit">
                  <Monitor size={16} className="settings-modal__benefit-icon" aria-hidden="true" />
                  <div className="settings-modal__benefit-text">
                    <strong>Axios 16, 24 e 32</strong>
                    <span>Compatível com todos</span>
                  </div>
                </div>
              </div>
            )}

            <p className="settings-modal__onboarding-security">
              Seus dados são seus. Nunca compartilhamos com terceiros.
            </p>
          </div>
        )}

        {licenseValidationMessage.kind !== "idle" && licenseModalMode !== "onboarding" && !(licenseModalMode === "settings" && licenseValidationMessage.kind === "success") && (
          <div
            className={`settings-modal__result ${licenseValidationMessage.kind === "success" ? "settings-modal__result--success" : "settings-modal__result--error"}`}
          >
            {licenseValidationMessage.text}
          </div>
        )}

        {(licenseModalMode === "settings" || (licenseModalMandatory && isConnected)) && (
          <div className="settings-modal__actions">
            {licenseModalMode === "settings" && !licenseModalMandatory && (
              <button
                type="button"
                className="startup-button startup-button--secondary"
                onClick={closeLicenseModal}
              >
                Fechar
              </button>
            )}
            {licenseModalMandatory && isConnected && (
              <button
                type="button"
                className="startup-button startup-button--secondary"
                onClick={handleDisconnect}
              >
                Desconectar
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  ) : null;

  if (appStage === "splash") {
    return <SplashScreen version={APP_VERSION} />;
  }

  if (appStage === "device-selection") {
    return (
      <>
        <DeviceSelectionScreen
          mixers={discoveredMixers}
          knownMixers={knownDiscoveryMixers}
          hasSearched={mixerDiscoveryHasSearched}
          discoveryLoading={isDiscoveringMixers}
          discoveryError={discoveryError}
          connectBusy={connectingSource !== null}
          connectionError={connectionError}
          version={APP_VERSION}
          onRefresh={() => {
            setConnectionError(null);
            void refreshMixerDiscovery(true);
          }}
          onConnectMixer={handlePreconnectMixerSelection}
        />
        {licenseModalNode}
      </>
    );
  }

  const showConnectBlockingOverlay = connectingSource !== null || initialConnectSyncBusy;
  const connectBlockingText = connectingSource !== null
    ? "Conectando à mesa..."
    : "Sincronizando mesa...";

  return (
    <main
      key={`scene-ui-refresh-${sceneUiRefreshNonce}`}
      className={`app-shell ${detailView ? "app-shell--detail" : ""} ${isChannelsDragging ? "app-shell--dragging" : ""}`}
    >
      <DuonnIconsSprite />
      <div className="portrait-orientation-hint">
        Para melhor experiência, use em modo paisagem.
      </div>

      {showConnectBlockingOverlay && (
        <div className="connect-blocking-overlay" role="status" aria-live="polite">
          <div className="connect-blocking-overlay__card">
            <strong>{connectBlockingText}</strong>
            <span>Aguarde, preparando controles e sincronização inicial.</span>
          </div>
        </div>
      )}

      <nav className="top-nav" data-node-id="18:438">
        <div className="top-nav__brand" data-node-id="73:2724">
          <img className="brand-logo brand-logo--wordmark" src={axControlBrand} alt="AX Control" />
        </div>

        <div className="top-nav__tabs" data-node-id="73:575">
          <button
            type="button"
            className={`top-nav__tab ${mainView === "mixer" ? "active" : ""}`}
            onClick={() => {
              setMainView("mixer");
              setDetailView(null);
              setSettingsDropdownOpen(false);
            }}
          >
            MIXER
          </button>
          <button
            type="button"
            className={`top-nav__tab ${mainView === "auxSends" ? "active" : ""}`}
            onClick={() => {
              setMainView("auxSends");
              setDetailView(null);
              setSettingsDropdownOpen(false);
            }}
            data-node-id="73:572"
          >
            AUX SENDS
          </button>
          <button
            type="button"
            className={`top-nav__tab ${mainView === "fxSends" ? "active" : ""}`}
            onClick={() => {
              setMainView("fxSends");
              setDetailView(null);
              setSettingsDropdownOpen(false);
            }}
            data-node-id="73:576"
          >
            FX SENDS
          </button>
          <button
            type="button"
            className={`top-nav__tab ${mainView === "muteGroups" ? "active" : ""}`}
            onClick={() => {
              setMainView("muteGroups");
              setDetailView(null);
              setSettingsDropdownOpen(false);
            }}
          >
            MUTE GROUPS
          </button>
          <button
            type="button"
            className={`top-nav__tab ${mainView === "dcaGroups" ? "active" : ""}`}
            onClick={() => {
              setMainView("dcaGroups");
              setDetailView(null);
              setSettingsDropdownOpen(false);
            }}
            data-node-id="73:2725"
          >
            DCA GROUPS
          </button>
        </div>

        <div className="top-nav__actions" data-node-id="73:2723">
          <AxHeaderStatusTag
            status={
              isConnected
                ? "connected"
                : status.startsWith("Conectando")
                  ? "connecting"
                  : "disconnected"
            }
          />
          <div className="settings-dropdown-wrap">
            <button
              type="button"
              className={`settings-gear-btn ${settingsDropdownOpen || (!detailView && (mainView === "scenes" || mainView === "patching")) ? "settings-gear-btn--active" : ""}`}
              title="Configurações"
              onClick={() => setSettingsDropdownOpen((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            {settingsDropdownOpen && (
              <div className="settings-dropdown">
                <button
                  type="button"
                  className={`settings-dropdown__item ${!detailView && mainView === "patching" ? "settings-dropdown__item--active" : ""}`}
                  onClick={() => {
                    setMainView("patching");
                    setDetailView(null);
                    setSettingsDropdownOpen(false);
                  }}
                >
                  Patching
                </button>
                <button
                  type="button"
                  className={`settings-dropdown__item ${!detailView && mainView === "scenes" ? "settings-dropdown__item--active" : ""}`}
                  onClick={() => {
                    setMainView("scenes");
                    setDetailView(null);
                    setSettingsDropdownOpen(false);
                  }}
                >
                  Scenes
                </button>
                <button
                  type="button"
                  className="settings-dropdown__item"
                  onClick={() => openLicenseModal(false)}
                >
                  Licença
                </button>
                <button
                  type="button"
                  className={`settings-dropdown__item${isConnected ? " settings-dropdown__item--danger" : ""}`}
                  onClick={() => {
                    if (isConnected) {
                      handleDisconnect();
                    } else {
                      void attemptAutoReconnect();
                    }
                    setSettingsDropdownOpen(false);
                  }}
                >
                  {isConnected ? "Desconectar" : "Reconectar"}
                </button>
                <button
                  type="button"
                  className="settings-dropdown__item settings-dropdown__item--danger"
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {detailView
        ? detailView.type === "channel"
          ? renderChannelDetail()
          : detailView.type === "aux"
            ? renderAuxDetail()
            : detailView.type === "fx"
              ? renderFxDetail()
              : renderMasterDetail()
        : mainView === "auxSends"
          ? renderGlobalSendsView("aux")
          : mainView === "fxSends"
            ? renderGlobalSendsView("fx")
            : mainView === "dcaGroups"
                ? <div className="global-view-shell"><DcaGroupsView isConnected={isConnected} channelCount={channelCount} groups={dcaGroups} onToggleEnabled={handleDcaGroupToggleEnabled} onMembersChange={handleDcaGroupMembersChange} onClear={handleDcaGroupClear} channelNames={channels.map((c) => c.channelName)} channelColorIds={channels.map((c) => c.colorId)} auxNames={auxStrips.map((a) => a.channelName)} auxColorIds={auxStrips.map((a) => a.colorId)} fxNames={fxStrips.map((f) => f.channelName)} fxColorIds={fxStrips.map((f) => f.colorId)} masterColorIds={[master.leftColorId, master.rightColorId]} dcaNames={dcaNames} dcaColorIds={dcaColorIds} rawParamStore={rawParamStoreRef.current} domainSelectors={domainSelectors} /></div>
            : mainView === "muteGroups"
                ? <div className="global-view-shell"><MuteGroupsView isConnected={isConnected} channelCount={channelCount} groups={muteGroups} onToggleActive={handleMuteGroupToggleActive} onMembersChange={handleMuteGroupMembersChange} onClear={handleMuteGroupClear} onAllMuted={handleMuteGroupAllMuted} channelNames={channels.map((c) => c.channelName)} channelColorIds={channels.map((c) => c.colorId)} auxNames={auxStrips.map((a) => a.channelName)} auxColorIds={auxStrips.map((a) => a.colorId)} fxNames={fxStrips.map((f) => f.channelName)} fxColorIds={fxStrips.map((f) => f.colorId)} masterColorIds={[master.leftColorId, master.rightColorId]} rawParamStore={rawParamStoreRef.current} domainSelectors={domainSelectors} /></div>
            : mainView === "patching"
              ? <div className="global-view-shell"><PatchingView isConnected={isConnected} isAx32ProfileActive={isAx32ProfileActive()} channelCount={channelCount} usbInputToUsbRoutes={usbInputToUsbRoutes} usbReturnRoutes={usbReturnRoutes} inputRoutes={inputPatchRoutes} outputRoutes={outputPatchRoutes} channelNames={channels.map((c) => c.channelName)} channelColorIds={channels.map((c) => c.colorId)} auxNames={auxStrips.map((a) => a.channelName)} auxColorIds={auxStrips.map((a) => a.colorId)} onUsbInputToUsbRouteChange={handleUsbInputToUsbRouteChange} onUsbReturnRouteChange={handleUsbReturnRouteChange} onInputRouteChange={handleInputPatchRouteChange} onOutputRouteChange={handleOutputPatchRouteChange} onResetRecordPatchingDefaults={handleResetRecordPatchingDefaults} onResetPlayPatchingDefaults={handleResetPlayPatchingDefaults} resetBusy={patchingResetBusy} /></div>
            : mainView === "scenes"
              ? <div className="global-view-shell"><ScenesView client={clientRef.current} isConnected={isConnected} cacheScopeKey={activeMixerCacheIdentity} onCallScene={handleSceneCall} onSaveScene={handleSceneSave} /></div>
        : <MixerTabs
            tabs={mixerTabs}
            activeTabId={resolvedMixerTabId}
            onTabChange={setActiveMixerTabId}
            master={renderFixedMasterBus()}
          />}
      {customizationView && customizerItem && (
        <ChannelCustomizer
          channel={customizationView.index}
          title={customizerItem.title}
          defaultName={customizerItem.defaultName}
          channelName={customizerItem.channelName}
          colorId={customizerItem.colorId}
          allowZeroColorSelection={customizerItem.allowZeroColorSelection}
          onSave={(patch) => {
            if (customizationView.section === "dca") {
              handleDcaCustomizerSave(customizationView.index as DcaGroupId, patch);
              return;
            }

            handleCustomizerSave(
              customizationView.section,
              customizationView.index,
              patch
            );
          }}
          onClose={closeChannelCustomizer}
        />
      )}

      {licenseModalNode}
      <ToastRenderer />
    </main>
  );
}

export default App;
