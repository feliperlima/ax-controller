import { useEffect, useRef, useState } from "react";
import {
  Axios16Client,
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
  valueToGateAttack,
  valueToGateDecay,
  valueToGateHold,
  valueToGateThreshold,
  valueToHpfTypeSlope,
  valueToLpfTypeSlope,
  valueToMute,
  valueToPan,
  toMixerSafeName,
} from "./lib/axios16Client";
import { ChannelStrip } from "./components/ChannelStrip";
import { AuxStrip } from "./components/AuxStrip";
import { FxStrip } from "./components/FxStrip";
import { MasterBus } from "./components/MasterBus";
import { DuonnIconsSprite, DUONN_CHANNEL_ICONS } from "./components/DuonnIcon";
import { ChannelCustomizer } from "./components/ChannelCustomizer";
import { AxHeaderConnectionIp, AxHeaderStatusTag } from "./components/TopNavigation";
import duonnBrand from "./assets/duonn.brand.webp";
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

type ChannelState = {
  muted: boolean;
  soloOn: boolean;
  phantomOn: boolean;
  hiZOn: boolean;
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

function createInitialChannelsState() {
  return Array.from({ length: 16 }, () => createDefaultChannelState());
}

function createDefaultMasterState(): MasterState {
  return {
    leftMuted: false,
    rightMuted: false,
    leftColorId: 0,
    rightColorId: 0,
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
  return base + (channel - 1) * 62;
}

function channelColorParam(channel: number) {
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

const MASTER_PARAMS = {
  leftFader: 2548,
  leftMute: 2550,
  rightFader: 2657,
  rightMute: 2659,
  leftColor: 3146,
  rightColor: 3147,
};

const FX_COLOR_PARAMS = {
  1: 3136,
  2: 3137,
} as const;

const AUX_COLOR_BASE = 3138;

function auxColorParam(aux: number) {
  return AUX_COLOR_BASE + aux - 1;
}

type DetailView =
  | { type: "channel"; channel: number }
  | { type: "aux"; aux: number }
  | null;
type StripSection = "inputs" | "aux" | "fx";
type CustomizationView = { section: StripSection; index: number } | null;
type PairLinkState = Record<string, boolean>;
type SendValueState = Record<SendStripId, number>;
type SendTapPointState = Record<SendStripId, SendTapPoint>;

type DragScrollState = {
  pointerId: number | null;
  pointerType: "mouse" | "touch" | "pen" | "";
  scrollerElement: HTMLElement | null;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startAtMs: number;
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
    holdMs: 8,
    thresholdPx: 4,
    horizontalBias: 1.04,
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

type ColorScope = "input" | "aux" | "fx" | "master";

const COLOR_SCOPE_DEFAULTS: Record<ColorScope, number> = {
  input: 0,
  aux: DEFAULT_AUX_COLOR_ID,
  fx: DEFAULT_FX_COLOR_ID,
  master: 0,
};

const COLOR_SCOPE_ZERO_WRITEBACK: Record<ColorScope, boolean> = {
  input: false,
  aux: true,
  fx: true,
  master: false,
};

function clampColorId(colorId: number) {
  return Math.max(0, Math.min(12, Math.round(colorId)));
}

function normalizeColorByScope(scope: ColorScope, colorId: number) {
  const clamped = clampColorId(colorId);
  if (clamped === 0) return COLOR_SCOPE_DEFAULTS[scope];
  return clamped;
}

function resolveMesaColorByScope(
  scope: ColorScope,
  rawColor: number | undefined,
  onWriteBack?: () => void
) {
  if (rawColor === undefined) return undefined;

  const clamped = clampColorId(rawColor);

  if (clamped === 0 && COLOR_SCOPE_ZERO_WRITEBACK[scope]) {
    onWriteBack?.();
  }

  return normalizeColorByScope(scope, clamped);
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
  if (linked) return 3;
  if (pairOdd === 1) return 2;
  if (pairOdd === 3) return 1;
  return null;
}

const AUX_LINK_BITS: Record<number, number> = {
  1: 1,
  3: 2,
  5: 4,
  7: 8,
};

const SEND_IDS: SendStripId[] = [
  "fx1",
  "fx2",
  "aux1",
  "aux2",
  "aux3",
  "aux4",
  "aux5",
  "aux6",
  "aux7",
  "aux8",
];

const AUX_SEND_BASES: Record<number, number> = {
  1: 77,
  2: 78,
  3: 79,
  4: 80,
  5: 81,
  6: 82,
  7: 83,
  8: 84,
};

const FX_SEND_BASES: Record<number, number> = {
  1: 89,
  2: 90,
};

const SEND_WRITE_THROTTLE_MS = 80;
const SEND_PRE_FADER_FLAG = 32768;

// Channel sends use the same fader scale as channel faders. AUX sends are params 77–84 + channel offset; FX sends are 89–90 + channel offset.
function sendDbToValue(db: number | "-inf") {
  if (db === "-inf") return 0;
  const clamped = Math.max(-120, Math.min(10, db));
  if (clamped <= -120) return 0;
  return Math.round(1200 + clamped * 10);
}

function sendValueToDb(value: number) {
  if (value <= 0) return -120;
  return (value - 1200) / 10;
}

function createDefaultSendValues(): SendValueState {
  return {
    fx1: 1200,
    fx2: 1200,
    aux1: 1200,
    aux2: 1200,
    aux3: 1200,
    aux4: 1200,
    aux5: 1200,
    aux6: 1200,
    aux7: 1200,
    aux8: 1200,
  };
}

function createDefaultSendTapPoints(): SendTapPointState {
  return {
    fx1: "post",
    fx2: "post",
    aux1: "post",
    aux2: "post",
    aux3: "post",
    aux4: "post",
    aux5: "post",
    aux6: "post",
    aux7: "post",
    aux8: "post",
  };
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
  const channelOffset = (channel - 1) * 62;

  if (id === "fx1") return FX_SEND_BASES[1] + channelOffset;
  if (id === "fx2") return FX_SEND_BASES[2] + channelOffset;

  const auxNumber = Number(id.replace("aux", ""));
  return (AUX_SEND_BASES[auxNumber] ?? AUX_SEND_BASES[1]) + channelOffset;
}

const MASTER_LINK_BIT = 16;

function isAuxLinked(value3056: number, aux: number) {
  const odd = aux % 2 === 0 ? aux - 1 : aux;
  const bit = AUX_LINK_BITS[odd];

  if (!bit) return false;

  return Boolean(value3056 & bit);
}

function isMasterLinked(value3056: number) {
  return Boolean(value3056 & MASTER_LINK_BIT);
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
    return (
      normalized === `AUX${target.aux}` ||
      normalized === `AUXILIAR${target.aux}`
    );
  }

  return (
    normalized === `FX${target.fx}` ||
    normalized === `EFFECT${target.fx}` ||
    normalized === `EFEITO${target.fx}`
  );
}

function getDefaultDisplayName(target: NameTarget) {
  if (target.type === "channel") return `Channel ${target.channel}`;
  if (target.type === "aux") return `Auxiliar ${target.aux}`;
  return `Efeito ${target.fx}`;
}

function getDefaultMixerAlias(target: NameTarget) {
  if (target.type === "channel") return `CH${target.channel}`;
  if (target.type === "aux") return `AUX${target.aux}`;
  return `FX${target.fx}`;
}

function isLocalDefaultDisplayName(target: NameTarget, displayName: string) {
  const normalized = normalizeMixerName(displayName);
  const defaultDisplayNormalized = normalizeMixerName(getDefaultDisplayName(target));
  return normalized === defaultDisplayNormalized || isDefaultMixerName(target, displayName);
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
    { enabled: true, freq: 160, gain: 0, q: 1 },
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

function createInitialProcessorStates() {
  return Array.from({ length: 16 }, () => createDefaultProcessorState());
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

function inferHpfEnabledFromRaw(rawValue: number, currentEnabled = true) {
  if (rawValue === 0) return false;

  if (valueToFrequency(rawValue) <= DEFAULT_EQ.hpfFreq) {
    return currentEnabled;
  }

  return true;
}

function inferLpfEnabledFromRaw(rawValue: number, currentEnabled = true) {
  if (rawValue === 0) return false;

  if (valueToFrequency(rawValue) >= DEFAULT_EQ.lpfFreq) {
    return currentEnabled;
  }

  return true;
}

function shouldKeepCachedHpfFreq(rawValue: number | undefined) {
  if (rawValue === undefined || rawValue === 0) return true;

  return valueToFrequency(rawValue) <= DEFAULT_EQ.hpfFreq;
}

function shouldKeepCachedLpfFreq(rawValue: number | undefined) {
  if (rawValue === undefined || rawValue === 0) return true;

  return valueToFrequency(rawValue) >= DEFAULT_EQ.lpfFreq;
}

function meterByteToDb(byte: number) {
  return byte >= 128 ? byte - 256 : byte;
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
  const [ip, setIp] = useState("192.168.1.20");
  const [status, setStatus] = useState("Desconectado");
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [customizationView, setCustomizationView] = useState<CustomizationView>(null);
  const [channels, setChannels] = useState<ChannelState[]>(
    createInitialChannelsState
  );
  const [auxStrips, setAuxStrips] = useState<ChannelState[]>(() =>
    createVirtualStripsState(8, DEFAULT_AUX_COLOR_ID)
  );
  const [fxStrips, setFxStrips] = useState<ChannelState[]>(() =>
    createVirtualStripsState(2, DEFAULT_FX_COLOR_ID)
  );
  const [auxProcessorStates, setAuxProcessorStates] = useState<ProcessorState[]>(() =>
    Array.from({ length: 8 }, () => createDefaultAuxProcessorState())
  );
  const [processorStates, setProcessorStates] = useState<ProcessorState[]>(
    createInitialProcessorStates
  );
  const [channelLinks, setChannelLinks] = useState<PairLinkState>({});
  const [auxLinks, setAuxLinks] = useState<PairLinkState>({});
  const [masterLinked, setMasterLinked] = useState(true);
  const [activeProcessorModule, setActiveProcessorModule] =
    useState<ProcessorModule>("eq");
  const [channelSendValues, setChannelSendValues] =
    useState<SendValueState>(createDefaultSendValues);
  const [sendTapPoints, setSendTapPoints] =
    useState<SendTapPointState>(createDefaultSendTapPoints);
  const [master, setMaster] = useState<MasterState>(createDefaultMasterState);
  const [mainMasterMeter, setMainMasterMeter] = useState<MainMasterMeterState>(
    createDefaultMainMasterMeterState
  );
  const [, setMonitorSoloMeter] = useState<MonitorSoloMeterState>(
    createDefaultMonitorSoloMeterState
  );

  const clientRef = useRef<Axios16Client | null>(null);
  const meterTimerRef = useRef<number | null>(null);
  const meterBusyRef = useRef(false);
  const auxLinkBusyRef = useRef(false);
  const meterUpdateLastAtRef = useRef(0);
  const isChannelsDraggingRef = useRef(false);
  const dragScrollRafRef = useRef<number | null>(null);
  const pendingDragScrollLeftRef = useRef<number | null>(null);
  const sendWriteTimersRef = useRef<Map<number, number>>(new Map());
  const sendWriteLastAtRef = useRef<Map<number, number>>(new Map());
  const sendWritePendingRef = useRef<Map<number, number>>(new Map());
  const dragScrollStateRef = useRef<DragScrollState>({
    pointerId: null,
    pointerType: "",
    scrollerElement: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startAtMs: 0,
    dragging: false,
    suppressClick: false,
  });
  const [isChannelsDragging, setIsChannelsDragging] = useState(false);

  useEffect(() => {
    isChannelsDraggingRef.current = isChannelsDragging;
  }, [isChannelsDragging]);

  useEffect(() => {
    return () => {
      clearScheduledSendWrites();
    };
  }, []);

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

  function cancelPendingDragScrollFrame() {
    if (dragScrollRafRef.current !== null) {
      cancelAnimationFrame(dragScrollRafRef.current);
      dragScrollRafRef.current = null;
    }

    pendingDragScrollLeftRef.current = null;
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
    dragScrollStateRef.current.dragging = false;
    setIsChannelsDragging(false);
  }

  function handleChannelsPointerDown(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (shouldPrioritizeLocalControl(event.target)) return;

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
    dragScrollStateRef.current.startAtMs = Date.now();
    dragScrollStateRef.current.dragging = false;
    dragScrollStateRef.current.suppressClick = false;
  }

  function handleChannelsPointerMove(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (dragScrollStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragScrollStateRef.current.startX;
    const deltaY = event.clientY - dragScrollStateRef.current.startY;

    if (!dragScrollStateRef.current.dragging) {
      const profile = getDragScrollProfile(dragScrollStateRef.current.pointerType);
      const holdElapsed =
        Date.now() - dragScrollStateRef.current.startAtMs >= profile.holdMs;
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
  }

  function handleChannelsPointerUp(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (dragScrollStateRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetDragScrollState();
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

  function updateChannelState(
    channelNumber: number,
    patch: Partial<ChannelState>
  ) {
    setChannels((current) =>
      current.map((channelState, index) =>
        index === channelNumber - 1
          ? { ...channelState, ...patch }
          : channelState
      )
    );
  }

  function updateMasterState(patch: Partial<MasterState>) {
    setMaster((current) => ({ ...current, ...patch }));
  }

  function updateAuxStripState(index: number, patch: Partial<ChannelState>) {
    const normalizedPatch =
      patch.colorId === undefined
        ? patch
        : { ...patch, colorId: normalizeAuxColorId(patch.colorId) };

    setAuxStrips((current) =>
      current.map((strip, currentIndex) =>
        currentIndex === index - 1 ? { ...strip, ...normalizedPatch } : strip
      )
    );
  }

  function updateFxStripState(index: number, patch: Partial<ChannelState>) {
    const normalizedPatch =
      patch.colorId === undefined
        ? patch
        : { ...patch, colorId: normalizeFxColorId(patch.colorId) };

    setFxStrips((current) =>
      current.map((strip, currentIndex) =>
        currentIndex === index - 1 ? { ...strip, ...normalizedPatch } : strip
      )
    );
  }

  function getSectionStrips(section: StripSection) {
    if (section === "inputs") return channels;
    if (section === "aux") return auxStrips;
    return fxStrips;
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

  function getLinkedChannelTargets(channelNumber: number) {
    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);

    if (!channelLinks[key]) return [channelNumber];

    return [odd, even];
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

    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);

    await Promise.all([syncChannelState(odd), syncChannelState(even)]);

    const response = await client.readParams([
      channelParam(odd, 75),
      channelParam(even, 75),
      channelParam(odd, 85),
      channelParam(odd, 86),
      channelParam(even, 85),
      channelParam(even, 86),
      channelColorParam(odd),
      channelColorParam(even),
    ]);
    const values = new Map(response.map((item) => [item.param, item.value]));
    const oddPan = valueToPan(values.get(channelParam(odd, 75)) ?? 100);
    const evenPan = valueToPan(values.get(channelParam(even, 75)) ?? 100);
    const oddMasterLSend = values.get(channelParam(odd, 85)) ?? 1200;
    const oddMasterRSend = values.get(channelParam(odd, 86)) ?? 1200;
    const evenMasterLSend = values.get(channelParam(even, 85)) ?? 1200;
    const evenMasterRSend = values.get(channelParam(even, 86)) ?? 1200;
    const oddColor = normalizeColorByScope(
      "input",
      valueToColorId(values.get(channelColorParam(odd)) ?? 1)
    );
    const evenColor = normalizeColorByScope(
      "input",
      valueToColorId(values.get(channelColorParam(even)) ?? 1)
    );
    const linked = Boolean(channelLinks[key]);

    setChannelLinks((current) => ({
      ...current,
      [key]: linked,
    }));

    if (linked) {
      if (oddPan !== 0 || evenPan !== 200) {
        client.setPan(odd, 0);
        client.setPan(even, 200);
      }

      // Strict stereo routing: odd channel feeds only L, even channel feeds only R.
      // This removes residual crossfeed in master meters when only one side has source.
      if (oddMasterRSend !== 0 || evenMasterLSend !== 0 || evenMasterRSend !== oddMasterLSend) {
        client.sendParam(channelParam(odd, 86), 0);
        client.sendParam(channelParam(even, 85), 0);
        client.sendParam(channelParam(even, 86), oddMasterLSend);
      }

      setChannels((current) => {
        const next = [...current];
        next[odd - 1] = {
          ...next[odd - 1],
          pan: 0,
          colorId: oddColor,
        };
        next[even - 1] = {
          ...next[even - 1],
          ...next[odd - 1],
          pan: 200,
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

    const params = {
      hiZ: channelParam(channelNumber, 64),
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

    const response = await client.readParams(Object.values(params), 2000);
    const values = new Map(response.map((item) => [item.param, item.value]));

    const faderDb = valueToFaderDb(values.get(params.fader) ?? 1200);

    updateChannelState(channelNumber, {
      hiZOn: valueToBoolean(values.get(params.hiZ) ?? 0),
      phantomOn: valueToBoolean(values.get(params.phantom) ?? 0),
      gain: valueToGain(values.get(params.gain) ?? 0),
      phasePositive: valueToBoolean(values.get(params.phase) ?? 1),
      colorId: normalizeColorByScope(
        "input",
        valueToColorId(values.get(params.color) ?? 1)
      ),
      muted: valueToMute(values.get(params.mute) ?? 1),
      pan: valueToPan(values.get(params.pan) ?? 100),
      faderDb,
      faderPosition: dbToFaderPosition(faderDb),
      soloOn: (values.get(params.soloLeft) ?? 0) > 0 || (values.get(params.soloRight) ?? 0) > 0,
    });
  }

  async function syncChannelProcessorState(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = processorParams(channelNumber);
    const response = await client.readParams(Object.values(params), 2500);
    const values = new Map(response.map((item) => [item.param, item.value]));
    const getValue = (param: number, fallback: number) =>
      values.get(param) ?? fallback;

    updateProcessorState(channelNumber, (current) => {
      const rawHpfFreq = getValue(params.hpfFreq, 0);
      const rawLpfFreq = getValue(params.lpfFreq, 0);
      const nextHpfEnabled = inferHpfEnabledFromRaw(rawHpfFreq, current.eq.hpfEnabled);
      const nextLpfEnabled = inferLpfEnabledFromRaw(rawLpfFreq, current.eq.lpfEnabled);

      return ({
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
        hpfType: valueToHpfTypeSlope(
          getValue(params.hpfTypeSlope, 8)
        ).type,
        hpfSlope: valueToHpfTypeSlope(
          getValue(params.hpfTypeSlope, 8)
        ).slope,
        hpfFreq:
          shouldKeepCachedHpfFreq(rawHpfFreq)
            ? current.eq.hpfFreq
            : valueToFrequency(rawHpfFreq),
        lpfEnabled: nextLpfEnabled,
        lpfType: valueToLpfTypeSlope(
          getValue(params.lpfTypeSlope, 13)
        ).type,
        lpfSlope: valueToLpfTypeSlope(
          getValue(params.lpfTypeSlope, 13)
        ).slope,
        lpfFreq:
          shouldKeepCachedLpfFreq(rawLpfFreq)
            ? current.eq.lpfFreq
            : valueToFrequency(rawLpfFreq),
        bands: [
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand1Freq, 120)),
            gain: valueToEqGain(getValue(params.eqBand1Gain, 470)),
            q: valueToEqQ(getValue(params.eqBand1Q, 120)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand2Freq, 393)),
            gain: valueToEqGain(getValue(params.eqBand2Gain, 477)),
            q: valueToEqQ(getValue(params.eqBand2Q, 121)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand3Freq, 1010)),
            gain: valueToEqGain(getValue(params.eqBand3Gain, 478)),
            q: valueToEqQ(getValue(params.eqBand3Q, 121)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand4Freq, 11000)),
            gain: valueToEqGain(getValue(params.eqBand4Gain, 526)),
            q: valueToEqQ(getValue(params.eqBand4Q, 121)),
          },
        ],
      },
    })
    });
  }

  async function syncAllChannels() {
    try {
      setIsSyncing(true);
      setStatus("Sincronizando canais...");

      for (let channel = 1; channel <= 16; channel++) {
        await syncChannelState(channel);
        await syncChannelProcessorState(channel);
      }

      await syncChannelPairVisualState();
      await syncFxColors();
      await syncMasterState();
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

  async function syncChannelEqPreviewStates() {
    const client = clientRef.current;
    if (!client) return;

    const eqEnabledParams = Array.from(
      { length: 16 },
      (_, index) => processorParams(index + 1).eqEnabled
    );
    const response = await client.readParams(eqEnabledParams, 1400);
    const values = new Map(response.map((item) => [item.param, item.value]));

    setProcessorStates((current) =>
      current.map((processorState, index) => {
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
      })
    );
  }

  async function syncAllStripNames() {
    const client = clientRef.current;
    if (!client) return;

    const [channelNames, auxNames, fxNames] = await Promise.all([
      client.readChannelNames(600),
      client.readAuxNames(600),
      client.readFxNames(600),
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
        const displayName =
          hasUserLocalName
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
        const displayName =
          hasUserLocalName
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
        const displayName =
          hasUserLocalName
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
  }

  async function syncChannelPairVisualState() {
    const client = clientRef.current;
    if (!client) return;

    const params: number[] = [];

    for (let odd = 1; odd <= 15; odd += 2) {
      params.push(channelParam(odd, 75));
      params.push(channelParam(odd + 1, 75));
      params.push(channelColorParam(odd));
      params.push(channelColorParam(odd + 1));
    }

    const response = await client.readParams(params, 2600);
    const values = new Map(response.map((item) => [item.param, item.value]));

    const linksFromMesa: PairLinkState = {};

    for (let odd = 1; odd <= 15; odd += 2) {
      const even = odd + 1;
      const key = pairKey(odd, even);
      const oddPan = valueToPan(values.get(channelParam(odd, 75)) ?? 100);
      const evenPan = valueToPan(values.get(channelParam(even, 75)) ?? 100);
      // Visual linked state comes from pair pan lock on the hardware.
      linksFromMesa[key] = oddPan === 0 && evenPan === 200;
    }

    setChannelLinks((current) => ({
      ...current,
      ...linksFromMesa,
    }));

    setChannels((current) => {
      const next = [...current];

      for (let odd = 1; odd <= 15; odd += 2) {
        const even = odd + 1;
        const key = pairKey(odd, even);
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
  }

  async function syncMasterState() {
    const client = clientRef.current;
    if (!client) return;

    const response = await client.readParams(Object.values(MASTER_PARAMS));
    const values = new Map(response.map((item) => [item.param, item.value]));

    const leftFaderDb = valueToFaderDb(
      values.get(MASTER_PARAMS.leftFader) ?? 1200
    );
    const rightFaderDb = valueToFaderDb(
      values.get(MASTER_PARAMS.rightFader) ?? 1200
    );

    const rawLeftColor = values.get(MASTER_PARAMS.leftColor);
    const rawRightColor = values.get(MASTER_PARAMS.rightColor);

    if (rawLeftColor !== undefined && Math.round(rawLeftColor) !== MASTER_FIXED_COLOR_ID) {
      client.setMasterColor("left", MASTER_FIXED_COLOR_ID);
    }

    if (rawRightColor !== undefined && Math.round(rawRightColor) !== MASTER_FIXED_COLOR_ID) {
      client.setMasterColor("right", MASTER_FIXED_COLOR_ID);
    }

    updateMasterState({
      leftMuted: valueToMute(values.get(MASTER_PARAMS.leftMute) ?? 1),
      rightMuted: valueToMute(values.get(MASTER_PARAMS.rightMute) ?? 1),
      leftColorId: MASTER_FIXED_COLOR_ID,
      rightColorId: MASTER_FIXED_COLOR_ID,
      leftFaderDb,
      rightFaderDb,
      leftFaderPosition: dbToFaderPosition(leftFaderDb),
      rightFaderPosition: dbToFaderPosition(rightFaderDb),
    });
  }

  async function syncFxColors() {
    const client = clientRef.current;
    if (!client) return;

    const response = await client.readParams([
      FX_COLOR_PARAMS[1],
      FX_COLOR_PARAMS[2],
    ]);
    const values = new Map(response.map((item) => [item.param, item.value]));

    setFxStrips((current) =>
      current.map((strip, index) => {
        const fx = (index + 1) as 1 | 2;
        const raw = values.get(FX_COLOR_PARAMS[fx]);
        if (raw === undefined) return strip;

        const nextColorId = resolveMesaColorByScope(
          "fx",
          raw,
          () => client.setFxColor(fx, DEFAULT_FX_COLOR_ID)
        );

        if (nextColorId === undefined) return strip;

        return {
          ...strip,
          colorId: nextColorId,
        };
      })
    );
  }

  async function syncLinkStates() {
    const client = clientRef.current;
    if (!client) return;

    const response = await client.readParams([3056]);
    const value3056 = response[0]?.value ?? 0;

    applyLinkStateFrom3056(value3056);
  }

  function clearScheduledSendWrites() {
    sendWriteTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    sendWriteTimersRef.current.clear();
    sendWriteLastAtRef.current.clear();
    sendWritePendingRef.current.clear();
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
    const [odd, even] = getAuxPair(auxNumber);
    const key = pairKey(odd, even);

    if (!auxLinks[key]) return [sendId];

    return [`aux${odd}` as SendStripId, `aux${even}` as SendStripId];
  }

  async function syncChannelSendsState(channelNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const sendParams = SEND_IDS.map((id) => sendIdToParam(channelNumber, id));
    const response = await client.readParams([...sendParams, 3056], 2200);
    const values = new Map(response.map((item) => [item.param, item.value]));

    setChannelSendValues(() => {
      const next = createDefaultSendValues();
      const nextTapPoints = createDefaultSendTapPoints();

      SEND_IDS.forEach((id) => {
        const param = sendIdToParam(channelNumber, id);
        const decoded = decodeSendRawValue(values.get(param));
        next[id] = decoded.value;
        nextTapPoints[id] = decoded.tapPoint;
      });

      setSendTapPoints(nextTapPoints);

      return next;
    });

    const value3056 = values.get(3056) ?? 0;
    applyLinkStateFrom3056(value3056);
  }

  function handleSendValueChange(channelNumber: number, sendId: SendStripId, nextValue: number) {
    const clampedValue = Math.max(0, Math.min(1300, Math.round(nextValue)));
    const targets = getLinkedAuxSendTargets(sendId);

    setChannelSendValues((current) => {
      const next = { ...current };
      targets.forEach((target) => {
        next[target] = clampedValue;
      });
      return next;
    });

    targets.forEach((target) => {
      const param = sendIdToParam(channelNumber, target);
      const tapPoint = sendTapPoints[target] ?? "post";
      scheduleSendParamWrite(param, encodeSendRawValue(clampedValue, tapPoint));
    });
  }

  function handleSendTapPointToggle(channelNumber: number, sendId: SendStripId) {
    const targets = getLinkedAuxSendTargets(sendId);

    const nextTapByTarget = new Map<SendStripId, SendTapPoint>();

    setSendTapPoints((current) => {
      const next = { ...current };

      targets.forEach((target) => {
        const toggled = current[target] === "post" ? "pre" : "post";
        next[target] = toggled;
        nextTapByTarget.set(target, toggled);
      });

      return next;
    });

    targets.forEach((target) => {
      const param = sendIdToParam(channelNumber, target);
      const baseValue = channelSendValues[target] ?? 1200;
      const tapPoint = nextTapByTarget.get(target) ?? "post";
      scheduleSendParamWrite(param, encodeSendRawValue(baseValue, tapPoint), true);
    });
  }

  async function syncAuxState(auxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = auxProcessorParams(auxNumber);
    const response = await client.readParams([params.fader, params.phase]);
    const values = new Map(response.map((item) => [item.param, item.value]));
    const faderDb = valueToFaderDb(values.get(params.fader) ?? 1200);

    let nextColorId: number | undefined;
    const colorParam = auxColorParam(auxNumber);

    try {
      const colorResponse = await client.readParams([colorParam], 2200);
      const rawColor = colorResponse[0]?.value;

      nextColorId = resolveMesaColorByScope(
        "aux",
        rawColor,
        () => client.sendParam(colorParam, DEFAULT_AUX_COLOR_ID)
      );
    } catch {
      // Some firmwares may not expose AUX color params; keep local color in that case.
    }

    updateAuxStripState(auxNumber, {
      faderDb,
      faderPosition: dbToFaderPosition(faderDb),
      phasePositive: valueToBoolean(values.get(params.phase) ?? 1),
      ...(nextColorId === undefined ? {} : { colorId: nextColorId }),
    });
  }

  async function syncAuxProcessorState(auxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const params = auxProcessorParams(auxNumber);
    const paramsToRead = [
      params.compEnabled,
      params.eqEnabled,
      params.compRatio,
      params.compAttack,
      params.compRelease,
      params.compThreshold,
      params.compGain,
      params.hpfTypeSlope,
      params.hpfFreq,
      params.lpfTypeSlope,
      params.lpfFreq,
      params.eqBand1Freq,
      params.eqBand1Gain,
      params.eqBand1Q,
      params.eqBand2Freq,
      params.eqBand2Gain,
      params.eqBand2Q,
      params.eqBand3Freq,
      params.eqBand3Gain,
      params.eqBand3Q,
      params.eqBand4Freq,
      params.eqBand4Gain,
      params.eqBand4Q,
      params.eqBand5Freq,
      params.eqBand5Gain,
      params.eqBand5Q,
      params.eqBand6Freq,
      params.eqBand6Gain,
      params.eqBand6Q,
      params.eqBand7Freq,
      params.eqBand7Gain,
      params.eqBand7Q,
    ];

    const values = new Map<number, number>();
    const chunkSize = 10;

    for (let i = 0; i < paramsToRead.length; i += chunkSize) {
      const chunk = paramsToRead.slice(i, i + chunkSize);

      try {
        const response = await client.readParams(chunk, 2200);
        response.forEach((item) => values.set(item.param, item.value));
      } catch {
        // Keep partial state from successful chunks instead of failing all AUX detail sync.
      }
    }

    if (values.size === 0) {
      throw new Error("Nao foi possivel ler os parametros do AUX na mesa.");
    }

    const getValue = (param: number, fallback: number) =>
      values.get(param) ?? fallback;

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

      return ({
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
            : valueToFrequency(values.get(params.hpfFreq) as number),
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
            : valueToFrequency(values.get(params.lpfFreq) as number),
        bands: [
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand1Freq, 63)),
            gain: valueToEqGain(getValue(params.eqBand1Gain, 500)),
            q: valueToEqQ(getValue(params.eqBand1Q, 100)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand2Freq, 160)),
            gain: valueToEqGain(getValue(params.eqBand2Gain, 500)),
            q: valueToEqQ(getValue(params.eqBand2Q, 100)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand3Freq, 400)),
            gain: valueToEqGain(getValue(params.eqBand3Gain, 500)),
            q: valueToEqQ(getValue(params.eqBand3Q, 100)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand4Freq, 1000)),
            gain: valueToEqGain(getValue(params.eqBand4Gain, 500)),
            q: valueToEqQ(getValue(params.eqBand4Q, 100)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand5Freq, 2500)),
            gain: valueToEqGain(getValue(params.eqBand5Gain, 500)),
            q: valueToEqQ(getValue(params.eqBand5Q, 100)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand6Freq, 6300)),
            gain: valueToEqGain(getValue(params.eqBand6Gain, 500)),
            q: valueToEqQ(getValue(params.eqBand6Q, 100)),
          },
          {
            enabled: true,
            freq: valueToFrequency(getValue(params.eqBand7Freq, 16000)),
            gain: valueToEqGain(getValue(params.eqBand7Gain, 500)),
            q: valueToEqQ(getValue(params.eqBand7Q, 100)),
          },
        ],
      },
    })
    });
  }

  async function syncAllAux() {
    for (let aux = 1; aux <= 8; aux++) {
      await syncAuxState(aux);
      await syncAuxProcessorState(aux);
    }
  }

  async function syncAllSoloStates() {
    const client = clientRef.current;
    if (!client) return;

    // Read solo left+right params for all 16 channels (base=87, stride=62)
    const channelParams: number[] = [];
    for (let ch = 1; ch <= 16; ch++) {
      channelParams.push(channelParam(ch, 87));
      channelParams.push(channelParam(ch, 88));
    }

    // Read aux solo params (base=1688, stride=109)
    const auxParams: number[] = [];
    for (let aux = 1; aux <= 8; aux++) {
      auxParams.push(1688 + (aux - 1) * 109);
      auxParams.push(1689 + (aux - 1) * 109);
    }

    try {
      const chResponse = await client.readParams(channelParams, 1200);
      const chValues = new Map(chResponse.map((item) => [item.param, item.value]));

      setChannels((current) => {
        const next = [...current];
        for (let ch = 1; ch <= 16; ch++) {
          const leftVal = chValues.get(channelParam(ch, 87)) ?? 0;
          const rightVal = chValues.get(channelParam(ch, 88)) ?? 0;
          const soloOn = leftVal > 0 || rightVal > 0;
          if (next[ch - 1].soloOn !== soloOn) {
            next[ch - 1] = { ...next[ch - 1], soloOn };
          }
        }
        return next;
      });

      const auxResponse = await client.readParams(auxParams, 1200);
      const auxValues = new Map(auxResponse.map((item) => [item.param, item.value]));

      setAuxStrips((current) => {
        const next = [...current];
        for (let aux = 1; aux <= 8; aux++) {
          const leftVal = auxValues.get(1688 + (aux - 1) * 109) ?? 0;
          const rightVal = auxValues.get(1689 + (aux - 1) * 109) ?? 0;
          const soloOn = leftVal > 0 || rightVal > 0;
          if (next[aux - 1].soloOn !== soloOn) {
            next[aux - 1] = { ...next[aux - 1], soloOn };
          }
        }
        return next;
      });
    } catch {
      // Ignore transient errors during solo sync
    }
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
                    : valueToFrequency(rawHpfFreq as number),
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
                    : valueToFrequency(rawLpfFreq as number),
              },
            };
          })
        );
      } catch {
        // Ignore transient errors to avoid noisy status churn.
      }

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
                  : valueToFrequency(rawHpfFreq as number),
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
                  : valueToFrequency(rawLpfFreq as number),
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
    if (!isConnected || !detailView || detailView.type !== "channel") return;
    if (activeProcessorModule !== "sends") return;

    syncChannelSendsState(detailView.channel).catch(() => {
      // Keep the existing values when send sync fails transiently.
    });
  }, [activeProcessorModule, detailView, isConnected]);

  useEffect(() => {
    if (!isConnected) return;

    // Poll solo state from the hardware every 2.5 s so that changes made
    // directly on the mixer (hardware buttons) are reflected in the app.
    const timer = window.setInterval(() => {
      syncAllSoloStates();
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [isConnected]);

  function applyLinkStateFrom3056(value3056: number) {
    setAuxLinks({
      "1-2": isAuxLinked(value3056, 1),
      "3-4": isAuxLinked(value3056, 3),
      "5-6": isAuxLinked(value3056, 5),
      "7-8": isAuxLinked(value3056, 7),
    });

    setMasterLinked(isMasterLinked(value3056));
  }

  function updateMetersFromResponse(
    response: {
      param: number;
      value: number;
    }[]
  ) {
    const now = Date.now();
    if (isChannelsDraggingRef.current && now - meterUpdateLastAtRef.current < 140) {
      return;
    }
    meterUpdateLastAtRef.current = now;

    const CLIP_HOLD_MS = 2500;
    const mainMaster = response.find((item) => item.param === 47);
    const monitorSolo = response.find((item) => item.param === 48);

    if (mainMaster) {
      // hiByte = R, loByte = L (firmware da mesa envia invertido).
      const masterRDb = meterByteToDb(mainMaster.value >> 8);
      const masterLDb = meterByteToDb(mainMaster.value & 255);

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

      function ensureNext() {
        if (!next) {
          next = [...current];
        }

        return next;
      }

      function updateOneChannel(channelNumber: number, channelDb: number) {
        if (channelNumber < 1 || channelNumber > 16) return;

        const index = channelNumber - 1;
        const previous = (next ?? current)[index];
        const holdActive = previous.peakUntil > now || previous.clipUntil > now;

        // Ignore muted channels once hold has ended to prevent unnecessary re-renders.
        if (previous.muted && !holdActive) {
          const idleLevel = meterDbToLevel(CHANNEL_IDLE_DB);
          const alreadyIdle =
            previous.meterDb === CHANNEL_IDLE_DB &&
            previous.meterLevel === idleLevel &&
            previous.peakDb <= CHANNEL_ACTIVE_MIN_DB &&
            previous.peakLevel === 0 &&
            previous.peakUntil === 0 &&
            previous.clipUntil === 0;

          if (alreadyIdle) return;

          const updated = {
            ...previous,
            meterDb: CHANNEL_IDLE_DB,
            meterLevel: idleLevel,
            peakDb: CHANNEL_IDLE_DB,
            peakLevel: 0,
            peakUntil: 0,
            clipUntil: 0,
          };

          ensureNext()[index] = updated;
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

      for (const { param, value } of response) {
        if (param < 2 || param > 9) continue;

        const firstChannel = (param - 2) * 2 + 1;
        const secondChannel = firstChannel + 1;

        const hiByte = value >> 8;
        const loByte = value & 255;

        // A mesa envia cada par invertido:
        // hiByte = canal par
        // loByte = canal ímpar
        const oddChannelDb = meterByteToDb(loByte);
        const evenChannelDb = meterByteToDb(hiByte);

        updateOneChannel(firstChannel, oddChannelDb);
        updateOneChannel(secondChannel, evenChannelDb);
      }

      return next ?? current;
    });
  }

  function startMeterPolling() {
    stopMeterPolling();

    let cancelled = false;
    const METER_POLL_INTERVAL_MS = 100;
    const METER_POLL_INTERVAL_DRAGGING_MS = 165;

    async function poll() {
      if (cancelled) return;

      const client = clientRef.current;

      if (client) {
        // Poll dos meters: canais (2-9) + main master (47) + monitor/solo (48).
        try {
          const meterResponse = await client.readParams(
            [2, 3, 4, 5, 6, 7, 8, 9, 47, 48],
            100
          );
          updateMetersFromResponse(meterResponse);
        } catch {
          // Falhas pontuais de meter são ignoradas.
        }
      }

      if (!cancelled) {
        const nextDelay = isChannelsDraggingRef.current
          ? METER_POLL_INTERVAL_DRAGGING_MS
          : METER_POLL_INTERVAL_MS;
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
  }

  async function handleConnect() {
    try {
      setStatus("Conectando...");

      const client = new Axios16Client(ip);
      await client.connect();

      client.setOnDisconnect(() => {
        // Keep UI/client state consistent when the socket drops unexpectedly.
        if (clientRef.current !== client) return;
        stopMeterPolling();
        clearScheduledSendWrites();
        clientRef.current = null;
        setIsConnected(false);
        setStatus("Conexao com a mesa foi encerrada.");
      });

      clientRef.current = client;
      setIsConnected(true);
      setStatus(`Conectado em ${ip}`);

      // Sync operations with better error isolation
      try {
        await syncAllChannels();
      } catch (syncError) {
        console.error("Erro ao sincronizar canais:", syncError);
        setStatus("Conexão estabelecida, mas erro ao sincronizar canais");
      }

      try {
        await syncChannelEqPreviewStates();
      } catch (syncError) {
        console.error("Erro ao sincronizar EQ:", syncError);
      }

      try {
        await syncAllStripNames();
      } catch (syncError) {
        console.error("Erro ao sincronizar nomes:", syncError);
      }

      try {
        const channelForInitialSendSync =
          detailView && detailView.type === "channel" ? detailView.channel : 1;
        await syncChannelSendsState(channelForInitialSendSync);
      } catch (syncError) {
        console.error("Erro ao sincronizar sends:", syncError);
      }

      startMeterPolling();
    } catch (error) {
      stopMeterPolling();
      setIsConnected(false);
      setStatus(error instanceof Error ? error.message : "Erro ao conectar");
      clientRef.current = null;
    }
  }

  function handleDisconnect() {
    stopMeterPolling();
    clearScheduledSendWrites();

    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setStatus("Desconectado");
  }

  function toggleMute(channelNumber: number) {
    const targets = getLinkedChannelTargets(channelNumber);
    const current = channels[channelNumber - 1];
    const nextValue = !current.muted;

    targets.forEach((target) => {
      clientRef.current?.setMute(target, nextValue);
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
      const nextValue = !(channels[odd - 1].soloOn && channels[even - 1].soloOn);
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

  function handleFaderChange(channelNumber: number, position: number) {
    const targets = getLinkedChannelTargets(channelNumber);
    const db = faderPositionToDb(position);

    targets.forEach((target) => {
      clientRef.current?.setFader(target, db <= -120 ? "-inf" : db);

      updateChannelState(target, {
        faderPosition: position,
        faderDb: db,
      });
    });
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
    const [odd, even] = getChannelPair(channelNumber);
    const key = pairKey(odd, even);
    const isLinked = Boolean(channelLinks[key]);
    const nextLinked = !isLinked;
    let oddMasterLSendForStereo = 1200;

    try {
      if (nextLinked && client) {
        const basesToCopy = [
          66, 67, 69, 70, 71,
          72, 73, 74, 76,
          77, 78, 79, 80, 81, 82, 83, 84,
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

      const linkFlag = getChannelLinkFlag(odd, nextLinked);

      if (client) {
        client.setPan(odd, nextLinked ? 0 : 100);
        client.setPan(even, nextLinked ? 200 : 100);

        if (nextLinked) {
          client.sendParam(channelParam(odd, 86), 0);
          client.sendParam(channelParam(even, 85), 0);
          client.sendParam(channelParam(even, 86), oddMasterLSendForStereo);
        }

        if (linkFlag !== null) {
          client.sendParam(3055, linkFlag);
        }
      }

      setChannelLinks((current) => ({
        ...current,
        [key]: nextLinked,
      }));

      if (nextLinked) {
        setChannels((current) => {
          const next = [...current];
          const primaryNameBase =
            stripLinkedNameSuffix(next[odd - 1].channelName) || `Canal ${odd}`;

          next[even - 1] = {
            ...next[odd - 1],
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
        updateChannelState(odd, { pan: 100 });
        updateChannelState(even, { pan: 100 });
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erro ao alternar link de canal"
      );
    }
  }

  async function toggleAuxLink(auxNumber: number) {
    const client = clientRef.current;
    if (!client) return;

    const [odd, even] = getAuxPair(auxNumber);
    const bit = AUX_LINK_BITS[odd];

    if (!bit) {
      setStatus("AUX invalido para link");
      return;
    }

    const shouldResumeMeter = meterTimerRef.current !== null;
    auxLinkBusyRef.current = true;

    if (shouldResumeMeter) {
      stopMeterPolling();
    }

    try {
      const initialMaskResponse = await client.readParams([3056], 2000);
      const currentMask = initialMaskResponse[0]?.value ?? 0;
      const isLinked = Boolean(currentMask & bit);
      const nextLinked = !isLinked;

      if (nextLinked) {
        const sourceStart = AUX_BLOCK_STARTS[odd];
        const targetStart = AUX_BLOCK_STARTS[even];

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
      }

      const nextMask = nextLinked
        ? currentMask | bit
        : currentMask & ~bit;

      client.sendParam(3056, nextMask);

      let confirmedMask = nextMask;
      for (let attempt = 0; attempt < 4; attempt++) {
        const verify = await client.readParams([3056], 2000);
        const value = verify[0]?.value;

        if (value === undefined) continue;

        confirmedMask = value;
        if (Boolean(value & bit) === nextLinked) break;
      }

      const confirmedLinked = Boolean(confirmedMask & bit);
      applyLinkStateFrom3056(confirmedMask);

      if (confirmedLinked !== nextLinked) {
        throw new Error("A mesa nao confirmou o estado de link AUX.");
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
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erro ao alternar link de auxiliar"
      );
    } finally {
      auxLinkBusyRef.current = false;
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
        const nextValue = !(auxStrips[odd - 1].soloOn && auxStrips[even - 1].soloOn);
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

    if (section === "aux") {
      const targets = getLinkedAuxTargets(index);

      targets.forEach((target) => {
        clientRef.current?.setAuxMasterFader(target, db <= -120 ? "-inf" : db);
        updateAuxStripState(target, { faderPosition: position, faderDb: db });
      });
      return;
    }

    clientRef.current?.setFxMasterFader(index, db <= -120 ? "-inf" : db);
    updateFxStripState(index, { faderPosition: position, faderDb: db });
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

  function handleCustomizerIconChange(section: StripSection, index: number, iconId: number) {
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

    if (section === "aux") {
      const normalizedColorId = normalizeColorByScope("aux", colorId);
      clientRef.current?.sendParam(auxColorParam(index), normalizedColorId);
      updateAuxStripState(index, { colorId: normalizedColorId });
      return;
    }

    if (index === 1 || index === 2) {
      const normalizedColorId = normalizeColorByScope("fx", colorId);
      clientRef.current?.setFxColor(index, normalizedColorId);
      updateFxStripState(index, { colorId: normalizedColorId });
      return;
    }

    updateFxStripState(index, { colorId: normalizeColorByScope("fx", colorId) });
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

    clientRef.current?.setMainMasterSolo(nextValue, { db: 0, tapPoint: "post" });

    updateMasterState({
      soloOn: nextValue,
    });
  }

  function handleMainMasterFaderChange(position: number) {
    const db = faderPositionToDb(position);
    const dbForSend = db <= -120 ? "-inf" : db;

    clientRef.current?.setMainMasterFader(dbForSend);

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

    clientRef.current?.setMasterFader("left", dbForSend);

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

    clientRef.current?.setMasterFader("right", dbForSend);

    updateMasterState({
      rightFaderPosition: position,
      rightFaderDb: db,
    });
  }

  async function toggleMasterLink() {
    const client = clientRef.current;
    if (!client) return;

    const nextLinked = !masterLinked;
    const response = await client.readParams([3056]);
    const currentMask = response[0]?.value ?? 0;
    const nextMask = nextLinked
      ? currentMask | MASTER_LINK_BIT
      : currentMask & ~MASTER_LINK_BIT;

    client.sendParam(3056, nextMask);
    applyLinkStateFrom3056(nextMask);
  }


  function goToDetailChannel(channelNumber: number) {
    const nextChannel = Math.max(1, Math.min(16, channelNumber));

    clearScheduledSendWrites();
    setActiveProcessorModule("sends");
    setDetailView({ type: "channel", channel: nextChannel });
    Promise.all([
      syncLinkStates(),
      syncChannelPairVisualState(),
      syncChannelProcessorState(nextChannel),
      syncChannelSendsState(nextChannel),
      syncChannelPairContext(nextChannel),
    ]).catch((error) => {
      setStatus(
        error instanceof Error
          ? error.message
          : "Erro ao sincronizar detalhe do canal"
      );
    });
  }


  function goToDetailAux(auxNumber: number) {
    const nextAux = Math.max(1, Math.min(8, auxNumber));
    const [pairOdd, pairEven] = getAuxPair(nextAux);
    setActiveProcessorModule("comp");
    setDetailView({ type: "aux", aux: nextAux });
    Promise.allSettled([
      syncLinkStates(),
      syncAuxState(nextAux),
      syncAuxProcessorState(nextAux),
      syncAuxState(pairOdd),
      syncAuxProcessorState(pairOdd),
      syncAuxState(pairEven),
      syncAuxProcessorState(pairEven),
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
    const sendsView: SendStripView[] = [
      {
        id: "fx1",
        type: "fx",
        colorId: fxStrips[0]?.colorId ?? 7,
        label: "FX 1",
        name: fxStrips[0]?.channelName?.trim() || "Reverb",
        value: sendDbToValue(sendValueToDb(channelSendValues.fx1)),
        tapPoint: sendTapPoints.fx1,
        isLinked: false,
      },
      {
        id: "fx2",
        type: "fx",
        colorId: fxStrips[1]?.colorId ?? 7,
        label: "FX 2",
        name: fxStrips[1]?.channelName?.trim() || "Delay",
        value: sendDbToValue(sendValueToDb(channelSendValues.fx2)),
        tapPoint: sendTapPoints.fx2,
        isLinked: false,
      },
      {
        id: "aux1",
        type: "aux",
        colorId: auxStrips[0]?.colorId ?? 8,
        label: "AUX 1",
        name: auxStrips[0]?.channelName?.trim() || "AUX 1",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux1)),
        tapPoint: sendTapPoints.aux1,
        isLinked: Boolean(auxLinks["1-2"]),
      },
      {
        id: "aux2",
        type: "aux",
        colorId: auxStrips[1]?.colorId ?? 8,
        label: "AUX 2",
        name: auxStrips[1]?.channelName?.trim() || "AUX 2",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux2)),
        tapPoint: sendTapPoints.aux2,
        isLinked: Boolean(auxLinks["1-2"]),
      },
      {
        id: "aux3",
        type: "aux",
        colorId: auxStrips[2]?.colorId ?? 8,
        label: "AUX 3",
        name: auxStrips[2]?.channelName?.trim() || "AUX 3",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux3)),
        tapPoint: sendTapPoints.aux3,
        isLinked: Boolean(auxLinks["3-4"]),
      },
      {
        id: "aux4",
        type: "aux",
        colorId: auxStrips[3]?.colorId ?? 8,
        label: "AUX 4",
        name: auxStrips[3]?.channelName?.trim() || "AUX 4",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux4)),
        tapPoint: sendTapPoints.aux4,
        isLinked: Boolean(auxLinks["3-4"]),
      },
      {
        id: "aux5",
        type: "aux",
        colorId: auxStrips[4]?.colorId ?? 8,
        label: "AUX 5",
        name: auxStrips[4]?.channelName?.trim() || "AUX 5",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux5)),
        tapPoint: sendTapPoints.aux5,
        isLinked: Boolean(auxLinks["5-6"]),
      },
      {
        id: "aux6",
        type: "aux",
        colorId: auxStrips[5]?.colorId ?? 8,
        label: "AUX 6",
        name: auxStrips[5]?.channelName?.trim() || "AUX 6",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux6)),
        tapPoint: sendTapPoints.aux6,
        isLinked: Boolean(auxLinks["5-6"]),
      },
      {
        id: "aux7",
        type: "aux",
        colorId: auxStrips[6]?.colorId ?? 8,
        label: "AUX 7",
        name: auxStrips[6]?.channelName?.trim() || "AUX 7",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux7)),
        tapPoint: sendTapPoints.aux7,
        isLinked: Boolean(auxLinks["7-8"]),
      },
      {
        id: "aux8",
        type: "aux",
        colorId: auxStrips[7]?.colorId ?? 8,
        label: "AUX 8",
        name: auxStrips[7]?.channelName?.trim() || "AUX 8",
        value: sendDbToValue(sendValueToDb(channelSendValues.aux8)),
        tapPoint: sendTapPoints.aux8,
        isLinked: Boolean(auxLinks["7-8"]),
      },
    ];

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
          padding: 8,
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
              padding: "8px 16px",
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
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
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
                  style={{
                    minWidth: 45,
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: channelColorBadgeBackground(channelState.colorId),
                    color: "var(--text-inverse)",
                    fontSize: 12,
                    lineHeight: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.6px",
                    textAlign: "center",
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
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => {
                  toggleChannelLink(channelNumber).catch((error) => {
                    setStatus(
                      error instanceof Error
                        ? error.message
                        : "Erro ao alternar link de canal"
                    );
                  });
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: isLinked ? "1px solid #67e8f9" : "1px solid #334155",
                  background: isLinked ? "#164e63" : "#0f172a",
                  color: isLinked ? "#f0fdff" : "#64748b",
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  cursor: !isConnected ? "not-allowed" : "pointer",
                  opacity: !isConnected ? 0.5 : 1,
                  boxShadow: isLinked
                    ? "0 0 8px rgba(103,232,249,0.35)"
                    : "none",
                }}
              >
                {isLinked ? `LINKED CH${pairOdd}-CH${pairEven}` : `LINK CH${pairOdd}-CH${pairEven}`}
              </button>
            </div>
          </div>

        </section>

        <section
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "110px minmax(0, 1fr)",
            gap: 4,
            padding: 0,
            overflow: "visible",
            position: "relative",
          }}
        >
          <aside
            style={{
              minWidth: 0,
              minHeight: 0,
              width: 110,
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
              onFaderChange={(position) =>
                handleFaderChange(channelNumber, position)
              }
              onPanChange={(value) => handlePanChange(channelNumber, value)}
              onGainChange={(value) => handleGainChange(channelNumber, value)}
              onOpenDetail={goToDetailChannel}
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

    return (
      <div className="detail-layout" style={{ width: "100%", height: "100%" }}>
        <section
          className="detail-panel"
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #1a2a37",
            background: "linear-gradient(180deg, #08131b 0%, #050c13 100%)",
            display: "grid",
            gridTemplateRows: "auto auto 1fr",
            gap: 8,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setDetailView(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #1f6f8b",
                  background: "#082232",
                  color: "#a5f3fc",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: "pointer",
                }}
                aria-label="Voltar"
                title="Voltar"
              >
                ←
              </button>

              <button
                type="button"
                disabled={auxNumber === 1}
                onClick={() => goToDetailAux(auxNumber - 1)}
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
              <span
                style={{
                  minWidth: 72,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#e5eef5",
                }}
              >
                AUX {auxNumber}/8
              </span>
              <button
                type="button"
                disabled={auxNumber === 8}
                onClick={() => goToDetailAux(auxNumber + 1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: auxNumber === 8 ? "not-allowed" : "pointer",
                  opacity: auxNumber === 8 ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>

            <button
              type="button"
              disabled={!isConnected}
              onClick={() => {
                toggleAuxLink(auxNumber).catch((error) => {
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : "Erro ao alternar link de auxiliar"
                  );
                });
              }}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: isLinked ? "1px solid #38bdf8" : "1px solid #334155",
                background: isLinked ? "#0b2a3b" : "#111827",
                color: isLinked ? "#a5f3fc" : "#e5eef5",
                fontWeight: 900,
                fontSize: 12,
                cursor: !isConnected ? "not-allowed" : "pointer",
                opacity: !isConnected ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              {isLinked
                ? `Linked AUX ${pairOdd}-${pairEven}`
                : `Link AUX ${pairOdd}-${pairEven}`}
            </button>
          </div>

          <div
            style={{
              borderRadius: 8,
              border: "1px solid #193141",
              background: "#071721",
              color: "#8fb3c9",
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 10px",
            }}
          >
            Configuracoes deste par serao espelhadas em estereo enquanto o link estiver ativo.
          </div>

          <ChannelProcessors
            activeModule={activeProcessorModule}
            state={processorState}
            disabled={!isConnected}
            hideGate={true}
            hideSends={true}
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
              });
            }}
          />
        </section>

        <aside
          style={{
            minWidth: 0,
            minHeight: 0,
            width: 140,
            display: "flex",
            justifyContent: "flex-end",
            justifySelf: "end",
            overflow: "hidden",
          }}
        >
          <ChannelStrip
            channel={auxNumber}
            channelName={auxState.channelName}
            section="aux"
            muted={auxState.muted}
            soloOn={auxState.soloOn}
            phantomOn={auxState.phantomOn}
            colorId={auxState.colorId}
            eqState={processorState.eq}
            faderDb={auxState.faderDb}
            faderPosition={auxState.faderPosition}
            pan={auxState.pan}
            gain={auxState.gain}
            meterDb={auxState.meterDb}
            peakDb={auxState.peakDb}
            clipped={auxState.clipUntil > Date.now()}
            disabled={!isConnected}
            onToggleMute={() => toggleStripMute("aux", auxNumber)}
            onToggleSolo={() => toggleStripSolo("aux", auxNumber)}
            onTogglePhantom={() => toggleStripPhantom("aux", auxNumber)}
            onFaderChange={(position) => handleStripFaderChange("aux", auxNumber, position)}
            onPanChange={(value) => handleStripPanChange("aux", auxNumber, value)}
            onGainChange={(value) => handleStripGainChange("aux", auxNumber, value)}
          />
        </aside>
      </div>
    );
  }

  const customizerStrip = customizationView
    ? getSectionStrips(customizationView.section)[customizationView.index - 1]
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

  return (
    <main
      className={`app-shell ${detailView ? "app-shell--detail" : ""} ${isChannelsDragging ? "app-shell--dragging" : ""}`}
    >
      <DuonnIconsSprite />
      <div className="portrait-orientation-hint">
        Para melhor experiência, use em modo paisagem.
      </div>

      <nav className="top-nav" data-node-id="18:438">
        <div className="top-nav__brand" data-node-id="73:2724">
          <img className="brand-logo" src={duonnBrand} alt="Duonn" />
        </div>

        <div className="top-nav__tabs" data-node-id="73:575">
          <button
            type="button"
            className={`top-nav__tab ${!detailView ? "active" : ""}`}
            onClick={() => setDetailView(null)}
            data-node-id="73:517"
          >
            MIXER
          </button>
          <button type="button" className="top-nav__tab" data-node-id="73:572">
            AUX SENDS
          </button>
          <button type="button" className="top-nav__tab" data-node-id="73:576">
            FX SENDS
          </button>
          <button type="button" className="top-nav__tab" data-node-id="73:2725">
            DCA GROUPS
          </button>
        </div>

        <div className="top-nav__actions" data-node-id="73:2723">
          <AxHeaderConnectionIp
            ip={ip}
            connected={isConnected}
            onIpChange={setIp}
            onSubmit={() => {
              if (!isConnected) {
                void handleConnect();
              }
            }}
            onDisconnect={handleDisconnect}
          />
          <AxHeaderStatusTag
            status={
              isConnected
                ? "connected"
                : status.startsWith("Conectando")
                  ? "connecting"
                  : "disconnected"
            }
          />
        </div>
      </nav>

      {detailView
        ? detailView.type === "channel"
          ? renderChannelDetail()
          : renderAuxDetail()
        : <section className="mixer-layout">
          <section
            className={`channels-scroller mixer-channels ${isChannelsDragging ? "channels-scroller--dragging" : ""}`}
            onPointerDownCapture={handleChannelsPointerDown}
            onPointerMoveCapture={handleChannelsPointerMove}
            onPointerUpCapture={handleChannelsPointerUp}
            onPointerCancelCapture={handleChannelsPointerCancel}
            onClickCapture={handleChannelsClickCapture}
            style={{
              alignItems: "stretch",
              gap: 0,
            }}
          >
            {channels.map((channelState, index) => {
              const stripNumber = index + 1;
              const pair = getChannelPair(stripNumber);
              const pairKeyValue = pairKey(pair[0], pair[1]);
              const pairLinked = Boolean(channelLinks[pairKeyValue]);
              const wrapperMarginRight = index === channels.length - 1 ? 0 : 4;

              return (
                <div
                  key={`channel-${stripNumber}`}
                  style={{
                    marginLeft: 0,
                    marginRight: wrapperMarginRight,
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
                        bottom: 40,
                        transform: "translateY(2px)",
                        width: 224,
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
                    channelName={channelState.channelName}
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
                  />
                </div>
              );
            })}

            {/* FX Strips separator */}
            <div
              style={{
                flex: "0 0 auto",
                width: 1,
                alignSelf: "stretch",
                background: "var(--border-default)",
                margin: "0 6px",
                borderRadius: 1,
              }}
            />

            {/* FX 1-2 */}
            {fxStrips.map((fxState, index) => {
              const fxNumber = (index + 1) as 1 | 2;
              return (
                <div
                  key={`fx-${fxNumber}`}
                  style={{
                    marginLeft: 0,
                    marginRight: index === fxStrips.length - 1 ? 0 : 4,
                    flex: "0 0 auto",
                    position: "relative",
                    overflow: "visible",
                  }}
                >
                  <FxStrip
                    fxNumber={fxNumber}
                    colorId={fxState.colorId}
                    channelName={fxState.channelName}
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
                  />
                </div>
              );
            })}

            {/* AUX Strips separator */}
            <div
              style={{
                flex: "0 0 auto",
                width: 1,
                alignSelf: "stretch",
                background: "var(--border-default)",
                margin: "0 6px",
                borderRadius: 1,
              }}
            />

            {/* AUX 1-8 */}
            {auxStrips.map((auxState, index) => {
              const auxNumber = index + 1;
              const [odd, even] = getAuxPair(auxNumber);
              const key = pairKey(odd, even);
              const isLinked = Boolean(auxLinks[key]);
              return (
                <div
                  key={`aux-${auxNumber}`}
                  style={{
                    marginLeft: 0,
                    marginRight: index === auxStrips.length - 1 ? 0 : 4,
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
                        bottom: 40,
                        transform: "translateY(2px)",
                        width: 224,
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
                    eqState={auxProcessorStates[index].eq}
                    onToggleMute={() => toggleStripMute("aux", auxNumber)}
                    onToggleSolo={() => toggleStripSolo("aux", auxNumber)}
                    onFaderChange={(position) =>
                      handleStripFaderChange("aux", auxNumber, position)
                    }
                    onOpenDetail={goToDetailAux}
                  />
                </div>
              );
            })}
          </section>

          <aside className="mixer-master">
            {(() => {
              // Mesa envia meters pré-fader: aplicamos a atenuação do fader no display.
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
              muted={master.leftMuted}
              soloOn={master.soloOn}
              linked={masterLinked}
              leftFaderDb={master.leftFaderDb}
              leftFaderPosition={master.leftFaderPosition}
              rightFaderPosition={master.rightFaderPosition}
              meterDbL={masterMeterDbL}
              meterDbR={masterMeterDbR}
              peakDbL={masterPeakDbL}
              peakDbR={masterPeakDbR}
              clippedL={masterClipL}
              clippedR={masterClipR}
              disabled={!isConnected}
              onToggleMute={toggleMainMasterMute}
              onToggleSolo={toggleMainMasterSolo}
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
            />
              );
            })()}
          </aside>
        </section>}
      {customizationView && customizerStrip && (
        <ChannelCustomizer
          channel={customizationView.index}
          iconId={customizerStrip.iconId}
          channelName={customizerStrip.channelName}
          colorId={customizerStrip.colorId}
          onIconChange={(iconId) =>
            handleCustomizerIconChange(
              customizationView.section,
              customizationView.index,
              iconId
            )
          }
          onNameChange={(name) =>
            handleCustomizerNameChange(
              customizationView.section,
              customizationView.index,
              name
            )
          }
          onColorChange={(colorId) =>
            handleCustomizerColorChange(
              customizationView.section,
              customizationView.index,
              colorId
            )
          }
          onClose={closeChannelCustomizer}
        />
      )}
    </main>
  );
}

export default App;
