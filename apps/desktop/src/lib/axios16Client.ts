export type AxiosCommand = {
  param: number;
  value: number;
};

export type NameTarget =
  | { type: "channel"; channel: number }
  | { type: "fx"; fx: number }
  | { type: "aux"; aux: number };

const CHANNEL_STRIDE = 62;

const BASE = {
  hiZ: 64,
  phantom: 65,
  gateEnabled: 66,
  gateThreshold: 67,
  gateAttack: 69,
  gateDecay: 70,
  gateHold: 71,
  gain: 72,
  phase: 73,
  mute: 74,
  pan: 75,
  fader: 76,
  compEnabled: 93,
  compRatio: 94,
  compAttack: 95,
  compRelease: 96,
  compThreshold: 97,
  compGain: 99,
  eqEnabled: 100,
  hpfTypeSlope: 102,
  hpfFreq: 103,
  lpfTypeSlope: 104,
  lpfFreq: 105,
  eqBand1Freq: 107,
  eqBand1Gain: 108,
  eqBand1Q: 109,
  eqBand2Freq: 111,
  eqBand2Gain: 112,
  eqBand2Q: 113,
  eqBand3Freq: 115,
  eqBand3Gain: 116,
  eqBand3Q: 117,
  eqBand4Freq: 119,
  eqBand4Gain: 120,
  eqBand4Q: 121,
};

const CHANNEL_COLOR_BASE = 3110;
// Color params confirmed on DUONN Axios 16: channels use 3110–3125, FX1=3136, FX2=3137, MasterL=3146, MasterR=3147. Value 0 means clear/default; values 1–12 map to the mixer color palette.
const FX_COLOR_PARAMS: Record<number, number> = {
  1: 3136,
  2: 3137,
};
const MASTER_COLOR_PARAMS = {
  left: 3146,
  right: 3147,
};

export const MASTER = {
  left: {
    fader: 2548,
    mute: 2550,

    compEnabled: 2554,
    compRatio: 2555,
    compAttack: 2556,
    compRelease: 2557,
    compThreshold: 2558,
    compGain: 2559,

    eqEnabled: 2563,
    hpfTypeSlope: 2565,
    hpfFreq: 2566,
    lpfTypeSlope: 2567,
    lpfFreq: 2568,
    eqBandBase: 2570,
  },

  right: {
    fader: 2657,
    mute: 2659,

    compEnabled: 2663,
    compRatio: 2664,
    compAttack: 2665,
    compRelease: 2666,
    compThreshold: 2667,
    compGain: 2668,

    eqEnabled: 2672, // Hipótese: confirmar contra a mesa.
    hpfTypeSlope: 2674,
    hpfFreq: 2675,
    lpfTypeSlope: 2676,
    lpfFreq: 2677,
    eqBandBase: 2679,
  },
};

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

const AUX_PARAMS: Record<
  number,
  {
    fader: number;
    phase: number;
    delay: number;
    eqEnabled: number;
    comp: { enabled: number; ratio: number; attack: number; release: number; threshold: number; gain: number };
    filters: { hpfTypeSlope: number; hpfFreq: number; lpfTypeSlope: number; lpfFreq: number };
    eqBandBase: number;
  }
> = {
  1: {
    fader: 1676,
    phase: 1677,
    delay: 1681,
    eqEnabled: 1691,
    comp: { enabled: 1682, ratio: 1683, attack: 1684, release: 1685, threshold: 1686, gain: 1687 },
    filters: { hpfTypeSlope: 1693, hpfFreq: 1694, lpfTypeSlope: 1695, lpfFreq: 1696 },
    eqBandBase: 1698,
  },
  2: {
    fader: 1785,
    phase: 1786,
    delay: 1790,
    eqEnabled: 1800,
    comp: { enabled: 1791, ratio: 1792, attack: 1793, release: 1794, threshold: 1795, gain: 1796 },
    filters: { hpfTypeSlope: 1802, hpfFreq: 1803, lpfTypeSlope: 1804, lpfFreq: 1805 },
    eqBandBase: 1807,
  },
  3: {
    fader: 1894,
    phase: 1895,
    delay: 1899,
    eqEnabled: 1909,
    comp: { enabled: 1900, ratio: 1901, attack: 1902, release: 1903, threshold: 1904, gain: 1905 },
    filters: { hpfTypeSlope: 1911, hpfFreq: 1912, lpfTypeSlope: 1913, lpfFreq: 1914 },
    eqBandBase: 1916,
  },
  4: {
    fader: 2003,
    phase: 2004,
    delay: 2008,
    eqEnabled: 2018,
    comp: { enabled: 2009, ratio: 2010, attack: 2011, release: 2012, threshold: 2013, gain: 2014 },
    filters: { hpfTypeSlope: 2020, hpfFreq: 2021, lpfTypeSlope: 2022, lpfFreq: 2023 },
    eqBandBase: 2025,
  },
  5: {
    fader: 2112,
    phase: 2113,
    delay: 2117,
    eqEnabled: 2127,
    comp: { enabled: 2118, ratio: 2119, attack: 2120, release: 2121, threshold: 2122, gain: 2123 },
    filters: { hpfTypeSlope: 2129, hpfFreq: 2130, lpfTypeSlope: 2131, lpfFreq: 2132 },
    eqBandBase: 2134,
  },
  6: {
    fader: 2221,
    phase: 2222,
    delay: 2226,
    eqEnabled: 2236,
    comp: { enabled: 2227, ratio: 2228, attack: 2229, release: 2230, threshold: 2231, gain: 2232 },
    filters: { hpfTypeSlope: 2238, hpfFreq: 2239, lpfTypeSlope: 2240, lpfFreq: 2241 },
    eqBandBase: 2243,
  },
  7: {
    fader: 2330,
    phase: 2331,
    delay: 2335,
    eqEnabled: 2345,
    comp: { enabled: 2336, ratio: 2337, attack: 2338, release: 2339, threshold: 2340, gain: 2341 },
    filters: { hpfTypeSlope: 2347, hpfFreq: 2348, lpfTypeSlope: 2349, lpfFreq: 2350 },
    eqBandBase: 2352,
  },
  8: {
    fader: 2438,
    phase: 2440,
    delay: 2444,
    eqEnabled: 2454,
    comp: { enabled: 2445, ratio: 2446, attack: 2447, release: 2448, threshold: 2449, gain: 2450 },
    filters: { hpfTypeSlope: 2456, hpfFreq: 2457, lpfTypeSlope: 2458, lpfFreq: 2459 },
    eqBandBase: 2461,
  },
};


const FX_MASTER_FADER_PARAMS: Record<number, number> = {
  1: 2899,
  2: 2944,
};

type MasterSide = "L" | "R" | "left" | "right";
export type MonitorTapPoint = "pre" | "post";

export const PRE_FADER_FLAG = 32768;
const CHANNEL_SOLO_BASE = 87;
const CHANNEL_SOLO_STRIDE = CHANNEL_STRIDE;
const AUX_SOLO_BASE = 1688;
const AUX_SOLO_STRIDE = 109;
const FX_SOLO_PARAMS: Record<number, { left: number; right: number }> = {
  1: { left: 2911, right: 2912 },
  2: { left: 2956, right: 2957 },
};
const DIGI_SOLO = {
  left: { left: 1575, right: 1576 },
  right: { left: 1637, right: 1638 },
};

function delayMsToValue(ms: number) {
  return Math.round(ms * 10);
}

export function monitorSendValue(
  db: number | "-inf",
  tapPoint: MonitorTapPoint = "post"
) {
  if (db === "-inf") {
    return tapPoint === "pre" ? PRE_FADER_FLAG : 0;
  }

  const clampedDb = clamp(db, -120, 12);
  const level = Math.max(0, Math.round(1200 + clampedDb * 10));

  return tapPoint === "pre" ? PRE_FADER_FLAG + level : level;
}

type FilterType = "butterworth" | "bessel" | "linkwitz";
type FilterSlope = 12 | 24;

function chParam(channel: number, base: number) {
  return base + (channel - 1) * CHANNEL_STRIDE;
}

function channelColorParam(channel: number) {
  return CHANNEL_COLOR_BASE + channel - 1;
}

function channelSoloParams(channel: number) {
  const rounded = Math.round(channel);

  if (rounded < 1 || rounded > 16) {
    throw new Error("Canal inválido para solo. Use de 1 a 16.");
  }

  const left = CHANNEL_SOLO_BASE + (rounded - 1) * CHANNEL_SOLO_STRIDE;

  return { left, right: left + 1 };
}

function auxSoloParams(auxNumber: number) {
  const rounded = Math.round(auxNumber);

  if (rounded < 1 || rounded > 8) {
    throw new Error("Auxiliar inválido para solo. Use de 1 a 8.");
  }

  const left = AUX_SOLO_BASE + (rounded - 1) * AUX_SOLO_STRIDE;

  return { left, right: left + 1 };
}

function getEqBandParams(band: number) {
  const bandNumber = Math.round(band);
  const bands: Record<number, { freq: number; gain: number; q: number }> = {
    1: { freq: BASE.eqBand1Freq, gain: BASE.eqBand1Gain, q: BASE.eqBand1Q },
    2: { freq: BASE.eqBand2Freq, gain: BASE.eqBand2Gain, q: BASE.eqBand2Q },
    3: { freq: BASE.eqBand3Freq, gain: BASE.eqBand3Gain, q: BASE.eqBand3Q },
    4: { freq: BASE.eqBand4Freq, gain: BASE.eqBand4Gain, q: BASE.eqBand4Q },
  };

  const params = bands[bandNumber];
  if (!params) throw new Error("Banda inválida. Use 1, 2, 3 ou 4.");

  return params;
}

export function masterEqBandParams(side: MasterSide, band: number) {
  const bandNumber = Math.round(band);

  if (bandNumber < 1 || bandNumber > 7) {
    throw new Error("Banda inválida. Use de 1 a 7.");
  }

  const sideParams = getMasterSideParams(side);
  const freq = sideParams.eqBandBase + (bandNumber - 1) * 4;

  return {
    freq,
    gain: freq + 1,
    q: freq + 2,
  };
}

function getMasterSideParams(side: MasterSide) {
  if (side === "L" || side === "left") return MASTER.left;
  if (side === "R" || side === "right") return MASTER.right;

  throw new Error("Lado inválido. Use L/R ou left/right.");
}

export function duonnCrc16Modbus(bytes: readonly number[]) {
  let crc = 0xffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }

  return crc & 0xffff;
}

export function buildRawDuonnPacket(opcode: number, payload: readonly number[] = []) {
  const normalizedOpcode = Math.max(0, Math.min(255, Math.round(opcode)));
  const normalizedPayload = payload.map((value) => Math.max(0, Math.min(255, Math.round(value))));
  const data = [128, 3 + normalizedPayload.length, normalizedOpcode, ...normalizedPayload];
  const crc = duonnCrc16Modbus(data);

  return new Uint8Array([
    ...data,
    (crc >> 8) & 255,
    crc & 255,
  ]);
}

function makeCommand(param: number, value: number) {
  return buildRawDuonnPacket(3, [
    (param >> 8) & 255,
    param & 255,
    (value >> 8) & 255,
    value & 255,
  ]);
}

function makeReadParamsCommand(params: number[]) {
  const payload: number[] = [];

  for (const param of params) {
    payload.push((param >> 8) & 255);
    payload.push(param & 255);
  }

  return buildRawDuonnPacket(6, payload);
}

function decodeParamResponse(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 9) return [];
  if (bytes[0] !== 128) return [];

  const opcode = bytes[2];

  if (opcode !== 6) return [];

  const results: AxiosCommand[] = [];

  for (let i = 3; i < bytes.length - 2; i += 4) {
    const param = (bytes[i] << 8) | bytes[i + 1];
    const value = (bytes[i + 2] << 8) | bytes[i + 3];

    results.push({ param, value });
  }

  return results;
}

function decodeNameResponse(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 6) return null;
  if (bytes[0] !== 128) return null;

  const length = bytes[1];
  const opcode = bytes[2];

  if (opcode !== 46) return null;
  if (length + 2 !== bytes.length) return null;

  const targetIndex = bytes[3];
  const nameBytes = bytes.slice(4, bytes.length - 2);
  const name = new TextDecoder("utf-8").decode(nameBytes).trim();

  return { targetIndex, name };
}

function getNameTargetIndex(target: NameTarget) {
  if (target.type === "channel") {
    const channel = Math.round(target.channel);
    if (channel < 1 || channel > 16) {
      throw new Error("Canal inválido para nome. Use de 1 a 16.");
    }
    return channel - 1;
  }

  if (target.type === "fx") {
    const fx = Math.round(target.fx);
    if (fx < 1 || fx > 2) {
      throw new Error("FX inválido para nome. Use 1 ou 2.");
    }
    return 25 + fx;
  }

  const aux = Math.round(target.aux);
  if (aux < 1 || aux > 8) {
    throw new Error("AUX inválido para nome. Use de 1 a 8.");
  }
  return 27 + aux;
}

function makeReadNameCommand(targetIndex: number) {
  return buildRawDuonnPacket(46, [targetIndex & 255]);
}

export function toMixerSafeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .slice(0, 12);
}

function makeWriteNameCommand(targetIndex: number, displayName: string) {
  const safe = toMixerSafeName(displayName);
  const nameBytes = Array.from(new TextEncoder().encode(safe));
  return buildRawDuonnPacket(47, [targetIndex & 255, ...nameBytes]);
}

function faderDbToValue(db: number | "-inf") {
  if (db === "-inf") return 0;

  const clamped = Math.max(-120, Math.min(10, db));

  if (clamped <= -120) return 0;

  return Math.round(1200 + clamped * 10);
}

function panToValue(value: number) {
  return Math.max(0, Math.min(200, Math.round(value)));
}

function gainToValue(value: number) {
  return Math.max(0, Math.min(63, Math.round(value)));
}

function channelColorToValue(value: number) {
  return Math.max(0, Math.min(12, Math.round(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function boolToValue(value: boolean) {
  return value ? 1 : 0;
}

function filterTypeSlopeToValue(
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

function frequencyToValue(freqHz: number) {
  if (freqHz === 0) return 0;

  if (freqHz < 20 || freqHz > 20000) {
    throw new Error("Frequência fora do range. Use de 20 a 20000 Hz.");
  }

  if (freqHz < 100) {
    return 32768 + Math.round(freqHz * 10);
  }

  return Math.round(freqHz);
}

function eqGainToValue(db: number) {
  return Math.round(500 + clamp(db, -12, 12) * 10);
}

function eqQToValue(q: number) {
  return Math.round(clamp(q, 0.6, 28.08) * 100);
}

function gateThresholdToValue(db: number) {
  return Math.round(Math.abs(clamp(db, -80, 0)));
}

function gateAttackToValue(ms: number) {
  return Math.round(clamp(ms, 3, 200));
}

function gateHoldToValue(ms: number) {
  return Math.round(clamp(ms, 0, 530));
}

function gateDecayToValue(value: number) {
  const allowed = [2, 4, 6, 8, 16, 32];
  const rounded = Math.round(value);

  return allowed.reduce((closest, option) =>
    Math.abs(option - rounded) < Math.abs(closest - rounded) ? option : closest
  );
}

function compRatioToValue(ratio: number | "inf") {
  if (ratio === "inf" || !Number.isFinite(ratio) || ratio >= 40) return 4040;

  return Math.round(ratio * 100);
}

function compTimeToValue(ms: number) {
  return Math.round(ms * 10);
}

function compGainToValue(db: number) {
  return Math.round(1200 + clamp(db, 0, 20) * 10);
}

function compThresholdToValue(db: number) {
  if (db >= 0) return 0;

  return 32768 + Math.round(Math.abs(clamp(db, -80, 0)) * 10);
}

function filterTypeSlopeValue(value: number) {
  return Math.max(0, Math.min(65535, Math.round(value)));
}

export function valueToFaderDb(value: number) {
  if (value === 0) return -120;

  return Math.max(-120, Math.min(10, Math.round((value - 1200) / 10)));
}

export function valueToPan(value: number) {
  return Math.max(0, Math.min(200, Math.round(value)));
}

export function valueToGain(value: number) {
  return Math.max(0, Math.min(63, Math.round(value)));
}

export function valueToMute(value: number) {
  // Protocolo invertido: 0 = mutado, 1 = aberto
  return value === 0;
}

export function valueToBoolean(value: number) {
  return value === 1;
}

export function valueToFrequency(value: number) {
  if (value === 0) return 0;

  if (value >= 32768) {
    return Math.round((value - 32768) / 10);
  }

  return Math.round(value);
}

export function valueToEqGain(value: number) {
  return Math.round((value - 500) / 10);
}

export function valueToEqQ(value: number) {
  return Math.round(value) / 100;
}

export function valueToGateThreshold(value: number) {
  return -Math.abs(Math.round(value));
}

export function valueToGateAttack(value: number) {
  return Math.round(value);
}

export function valueToGateDecay(value: number) {
  const allowed = [2, 4, 6, 8, 16, 32];
  const rounded = Math.round(value);

  return allowed.reduce((closest, option) =>
    Math.abs(option - rounded) < Math.abs(closest - rounded) ? option : closest
  );
}

export function valueToGateHold(value: number) {
  return Math.round(value);
}

export function valueToCompRatio(value: number) {
  if (value >= 4000) return 40;

  return Math.round(value) / 100;
}

export function valueToCompTime(value: number) {
  return Math.round(value) / 10;
}

export function valueToCompGain(value: number) {
  return Math.round((value - 1200) / 10);
}

export function valueToCompThreshold(value: number) {
  if (value === 0) return 0;
  if (value >= 32768) return -Math.round((value - 32768) / 10);

  return -Math.round(value / 10);
}

export function valueToHpfTypeSlope(value: number) {
  return valueToFilterTypeSlope("hpf", value);
}

export function valueToLpfTypeSlope(value: number) {
  return valueToFilterTypeSlope("lpf", value);
}

function valueToFilterTypeSlope(filter: "hpf" | "lpf", value: number) {
  const normalized = Math.round(value);
  const baseValue = filter === "hpf" ? 8 : 9;
  const slope: FilterSlope = normalized >= baseValue + 12 ? 24 : 12;
  const typeValue = normalized - (slope === 24 ? 12 : 0);
  const offset = typeValue - baseValue;
  const type: FilterType =
    offset >= 4 ? "linkwitz" : offset >= 2 ? "bessel" : "butterworth";

  return { type, slope };
}

export class Axios16Client {
  private ws: WebSocket | null = null;
  private readQueue: Promise<void> = Promise.resolve();
  private onDisconnectCallback: (() => void) | null = null;

  constructor(private ip: string, private port = 8088) {}

  setOnDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  get url() {
    return `ws://${this.ip}:${this.port}/`;
  }

  connect() {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);

      this.ws = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        resolve();
      };

      ws.onerror = () => {
        reject(new Error(`Não foi possível conectar em ${this.url}`));
      };

      ws.onclose = (event) => {
        console.log("WebSocket fechado:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        if (this.ws === ws) {
          this.ws = null;
          // Notify about unexpected disconnect
          if (this.onDisconnectCallback) {
            this.onDisconnectCallback();
          }
        }
      };
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.readQueue = Promise.resolve();
  }

  sendParam(param: number, value: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Cliente não conectado.");
    }

    const packet = makeCommand(param, value);
    this.ws.send(packet);
  }

  sendRaw(packet: Uint8Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Cliente não conectado.");
    }

    this.ws.send(packet);
  }

  readParams(params: number[], timeoutMs = 1000) {
    const request = this.readQueue.then(() =>
      this.executeReadParams(params, timeoutMs)
    );

    this.readQueue = request.then(
      () => undefined,
      () => undefined
    );

    return request;
  }

  readName(target: NameTarget, timeoutMs = 1200) {
    const request = this.readQueue.then(() =>
      this.executeReadName(target, timeoutMs)
    );

    this.readQueue = request.then(
      () => undefined,
      () => undefined
    );

    return request;
  }

  readNameByIndex(targetIndex: number, timeoutMs = 1200) {
    const request = this.readQueue.then(() =>
      this.executeReadNameByIndex(targetIndex, timeoutMs)
    );

    this.readQueue = request.then(
      () => undefined,
      () => undefined
    );

    return request;
  }

  private executeReadName(target: NameTarget, timeoutMs: number) {
    const targetIndex = getNameTargetIndex(target);
    return this.executeReadNameByIndex(targetIndex, timeoutMs);
  }

  private executeReadNameByIndex(targetIndex: number, timeoutMs: number) {
    const ws = this.ws;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("Cliente não conectado.");
    }

    if (!Number.isFinite(targetIndex) || targetIndex < 0 || targetIndex > 255) {
      throw new Error("Indice de nome invalido. Use 0..255.");
    }

    const normalizedTargetIndex = Math.round(targetIndex);

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let timeout = 0;

      const cleanup = () => {
        window.clearTimeout(timeout);
        ws.removeEventListener("message", onMessage);
        ws.removeEventListener("close", onClose);
        ws.removeEventListener("error", onError);
      };

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      timeout = window.setTimeout(() => {
        fail(new Error("Timeout ao ler nome da mesa."));
      }, timeoutMs);

      const onMessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        const decoded = decodeNameResponse(event.data);
        if (!decoded) return;
        if (decoded.targetIndex !== normalizedTargetIndex) return;

        if (settled) return;
        settled = true;
        cleanup();
        resolve(decoded.name);
      };

      const onClose = () => {
        fail(new Error("Conexão com a mesa foi encerrada durante a leitura do nome."));
      };

      const onError = () => {
        fail(new Error("Erro no WebSocket durante a leitura do nome."));
      };

      ws.addEventListener("message", onMessage);
      ws.addEventListener("close", onClose);
      ws.addEventListener("error", onError);
      ws.send(makeReadNameCommand(normalizedTargetIndex));
    });
  }

  setName(target: NameTarget, displayName: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Cliente não conectado.");
    }

    const targetIndex = getNameTargetIndex(target);
    const packet = makeWriteNameCommand(targetIndex, displayName);
    this.ws.send(packet);
  }

  setNameByIndex(targetIndex: number, displayName: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Cliente não conectado.");
    }

    if (!Number.isFinite(targetIndex) || targetIndex < 0 || targetIndex > 255) {
      throw new Error("Indice de nome invalido. Use 0..255.");
    }

    const normalizedTargetIndex = Math.round(targetIndex);
    const packet = makeWriteNameCommand(normalizedTargetIndex, displayName);
    this.ws.send(packet);
  }

  readChannelName(channel: number, timeoutMs = 1200) {
    return this.readName({ type: "channel", channel }, timeoutMs);
  }

  readAuxName(aux: number, timeoutMs = 1200) {
    return this.readName({ type: "aux", aux }, timeoutMs);
  }

  readFxName(fx: number, timeoutMs = 1200) {
    return this.readName({ type: "fx", fx }, timeoutMs);
  }

  setChannelName(channel: number, displayName: string) {
    this.setName({ type: "channel", channel }, displayName);
  }

  setAuxName(aux: number, displayName: string) {
    this.setName({ type: "aux", aux }, displayName);
  }

  setFxName(fx: number, displayName: string) {
    this.setName({ type: "fx", fx }, displayName);
  }

  async readChannelNames(channelCount = 16, timeoutMs = 1200) {
    const result: Record<number, string> = {};
    const safeChannelCount = Math.max(1, Math.min(32, Math.round(channelCount)));

    for (let channel = 1; channel <= safeChannelCount; channel++) {
      result[channel] = await this.readChannelName(channel, timeoutMs);
    }

    return result;
  }

  async readAuxNames(timeoutMs = 1200) {
    const result: Record<number, string> = {};

    for (let aux = 1; aux <= 8; aux++) {
      result[aux] = await this.readAuxName(aux, timeoutMs);
    }

    return result;
  }

  async readFxNames(timeoutMs = 1200) {
    const result: Record<number, string> = {};

    for (let fx = 1; fx <= 2; fx++) {
      result[fx] = await this.readFxName(fx, timeoutMs);
    }

    return result;
  }

  private executeReadParams(params: number[], timeoutMs: number) {
    const ws = this.ws;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("Cliente não conectado.");
    }

    return new Promise<AxiosCommand[]>((resolve, reject) => {
      const requested = new Set(params);
      const results = new Map<number, number>();
      let settled = false;
      let timeout = 0;

      const cleanup = () => {
        window.clearTimeout(timeout);
        ws.removeEventListener("message", onMessage);
        ws.removeEventListener("close", onClose);
        ws.removeEventListener("error", onError);
      };

      const fail = (error: Error) => {
        if (settled) return;

        settled = true;
        cleanup();
        reject(error);
      };

      timeout = window.setTimeout(() => {
        fail(new Error("Timeout ao ler parâmetros da mesa."));
      }, timeoutMs);

      const onMessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;

        const decoded = decodeParamResponse(event.data);

        if (decoded.length === 0) return;

        for (const item of decoded) {
          if (requested.has(item.param)) {
            results.set(item.param, item.value);
          }
        }

        if (results.size === requested.size) {
          if (settled) return;

          settled = true;
          cleanup();

          resolve(
            Array.from(results.entries()).map(([param, value]) => ({
              param,
              value,
            }))
          );
        }
      };

      const onClose = () => {
        fail(new Error("Conexão com a mesa foi encerrada durante a leitura."));
      };

      const onError = () => {
        fail(new Error("Erro no WebSocket durante a leitura da mesa."));
      };

      ws.addEventListener("message", onMessage);
      ws.addEventListener("close", onClose);
      ws.addEventListener("error", onError);

      const packet = makeReadParamsCommand(params);
      ws.send(packet);
    });
  }

  setMute(channel: number, shouldMute: boolean) {
    // Protocolo invertido: 0 = mutado, 1 = aberto
    this.sendParam(chParam(channel, BASE.mute), shouldMute ? 0 : 1);
  }

  setFader(channel: number, db: number | "-inf") {
    this.sendParam(chParam(channel, BASE.fader), faderDbToValue(db));
  }

  setPan(channel: number, value: number) {
    this.sendParam(chParam(channel, BASE.pan), panToValue(value));
  }

  setGain(channel: number, value: number) {
    this.sendParam(chParam(channel, BASE.gain), gainToValue(value));
  }

  setPhantom(channel: number, enabled: boolean) {
    this.sendParam(chParam(channel, BASE.phantom), enabled ? 1 : 0);
  }

  setHiZ(channel: number, enabled: boolean) {
    if (channel !== 1 && channel !== 2) {
      throw new Error("Hi-Z disponível apenas nos canais 1 e 2.");
    }

    this.sendParam(chParam(channel, BASE.hiZ), enabled ? 1 : 0);
  }

  setPhase(channel: number, positive: boolean) {
    this.sendParam(chParam(channel, BASE.phase), positive ? 1 : 0);
  }

  setChannelColor(channel: number, colorId: number) {
    this.sendParam(channelColorParam(channel), channelColorToValue(colorId));
  }

  setFxColor(fx: 1 | 2, colorId: number) {
    this.sendParam(FX_COLOR_PARAMS[fx], channelColorToValue(colorId));
  }

  setMasterColor(side: MasterSide, colorId: number) {
    const param = side === "L" || side === "left" ? MASTER_COLOR_PARAMS.left : MASTER_COLOR_PARAMS.right;
    this.sendParam(param, channelColorToValue(colorId));
  }

  setGateEnabled(channel: number, enabled: boolean) {
    this.sendParam(chParam(channel, BASE.gateEnabled), boolToValue(enabled));
  }

  setGateThreshold(channel: number, db: number) {
    this.sendParam(chParam(channel, BASE.gateThreshold), gateThresholdToValue(db));
  }

  setGateAttack(channel: number, ms: number) {
    this.sendParam(chParam(channel, BASE.gateAttack), gateAttackToValue(ms));
  }

  setGateDecay(channel: number, value: number) {
    this.sendParam(chParam(channel, BASE.gateDecay), gateDecayToValue(value));
  }

  setGateHold(channel: number, ms: number) {
    this.sendParam(chParam(channel, BASE.gateHold), gateHoldToValue(ms));
  }

  setCompEnabled(channel: number, enabled: boolean) {
    this.sendParam(chParam(channel, BASE.compEnabled), boolToValue(enabled));
  }

  setCompThreshold(channel: number, db: number) {
    this.sendParam(chParam(channel, BASE.compThreshold), compThresholdToValue(db));
  }

  setCompRatio(channel: number, ratio: number | "inf") {
    this.sendParam(chParam(channel, BASE.compRatio), compRatioToValue(ratio));
  }

  setCompAttack(channel: number, ms: number) {
    this.sendParam(chParam(channel, BASE.compAttack), compTimeToValue(ms));
  }

  setCompRelease(channel: number, ms: number) {
    this.sendParam(chParam(channel, BASE.compRelease), compTimeToValue(ms));
  }

  setCompGain(channel: number, db: number) {
    this.sendParam(chParam(channel, BASE.compGain), compGainToValue(db));
  }

  setEqEnabled(channel: number, enabled: boolean) {
    this.sendParam(chParam(channel, BASE.eqEnabled), boolToValue(enabled));
  }

  setHpfFreq(channel: number, freqHz: number) {
    this.sendParam(chParam(channel, BASE.hpfFreq), frequencyToValue(freqHz));
  }

  setLpfFreq(channel: number, freqHz: number) {
    this.sendParam(chParam(channel, BASE.lpfFreq), frequencyToValue(freqHz));
  }

  setHpfTypeSlope(channel: number, type: FilterType, slope: FilterSlope) {
    this.sendParam(
      chParam(channel, BASE.hpfTypeSlope),
      filterTypeSlopeToValue("hpf", type, slope)
    );
  }

  setLpfTypeSlope(channel: number, type: FilterType, slope: FilterSlope) {
    this.sendParam(
      chParam(channel, BASE.lpfTypeSlope),
      filterTypeSlopeToValue("lpf", type, slope)
    );
  }

  setEqBand(
    channel: number,
    band: number,
    freqHz: number,
    gainDb: number,
    q: number
  ) {
    this.setEqBandFreq(channel, band, freqHz);
    this.setEqBandGain(channel, band, gainDb);
    this.setEqBandQ(channel, band, q);
  }

  setEqBandFreq(channel: number, band: number, freqHz: number) {
    this.sendParam(chParam(channel, getEqBandParams(band).freq), frequencyToValue(freqHz));
  }

  setEqBandGain(channel: number, band: number, gainDb: number) {
    this.sendParam(chParam(channel, getEqBandParams(band).gain), eqGainToValue(gainDb));
  }

  setEqBandQ(channel: number, band: number, q: number) {
    this.sendParam(chParam(channel, getEqBandParams(band).q), eqQToValue(q));
  }

  setMasterMute(side: MasterSide, shouldMute: boolean) {
    const param = getMasterSideParams(side).mute;

    this.sendParam(param, shouldMute ? 0 : 1);
  }

  setMainMasterMute(shouldMute: boolean) {
    this.setMasterMute("left", shouldMute);
    this.setMasterMute("right", shouldMute);
  }

  setAuxMute(auxNumber: number, shouldMute: boolean) {
    // AUX mute params: 1678 (AUX1), 1787 (AUX2), stride=109
    const auxIndex = Math.round(auxNumber);
    if (auxIndex < 1 || auxIndex > 8) return;
    
    const muteParam = 1678 + (auxIndex - 1) * 109;
    this.sendParam(muteParam, shouldMute ? 0 : 1);
  }

  setFxMute(fxNumber: number, shouldMute: boolean) {
    // FX mute params: 2900 (FX1), 2945 (FX2), stride=45
    const fxIndex = Math.round(fxNumber);
    if (fxIndex < 1 || fxIndex > 2) return;
    
    const muteParam = fxIndex === 1 ? 2900 : 2945;
    this.sendParam(muteParam, shouldMute ? 0 : 1);
  }

  setMasterFader(side: MasterSide, db: number | "-inf") {
    const param = getMasterSideParams(side).fader;

    this.sendParam(param, faderDbToValue(db));
  }

  setMainMasterFader(db: number | "-inf") {
    this.setMasterFader("left", db);
    this.setMasterFader("right", db);
  }

  setChannelSolo(
    channel: number,
    enabled: boolean,
    options?: { linkedStereo?: boolean; db?: number | "-inf"; tapPoint?: MonitorTapPoint }
  ) {
    const params = channelSoloParams(channel);
    const tapPoint = options?.tapPoint ?? "post";
    const onValue = monitorSendValue(options?.db ?? 0, tapPoint);
    const offValue = monitorSendValue("-inf", tapPoint);

    if (!enabled) {
      this.sendParam(params.left, offValue);
      this.sendParam(params.right, offValue);
      return;
    }

    if (options?.linkedStereo) {
      const oddChannel = Math.round(channel) % 2 === 1;
      this.sendParam(params.left, oddChannel ? onValue : offValue);
      this.sendParam(params.right, oddChannel ? offValue : onValue);
      return;
    }

    this.sendParam(params.left, onValue);
    this.sendParam(params.right, onValue);
  }

  setChannelSoloPair(
    oddChannel: number,
    enabled: boolean,
    options?: { db?: number | "-inf"; tapPoint?: MonitorTapPoint }
  ) {
    const odd = Math.round(oddChannel);
    const even = odd + 1;

    if (odd % 2 === 0 || odd < 1 || even > 32) {
      throw new Error("Par de canal inválido para solo. Use o canal ímpar inicial do par.");
    }

    const tapPoint = options?.tapPoint ?? "post";
    const onValue = monitorSendValue(options?.db ?? 0, tapPoint);
    const offValue = monitorSendValue("-inf", tapPoint);
    const oddParams = channelSoloParams(odd);
    const evenParams = channelSoloParams(even);

    if (!enabled) {
      this.sendParam(oddParams.left, offValue);
      this.sendParam(oddParams.right, offValue);
      this.sendParam(evenParams.left, offValue);
      this.sendParam(evenParams.right, offValue);
      return;
    }

    this.sendParam(oddParams.left, onValue);
    this.sendParam(oddParams.right, offValue);
    this.sendParam(evenParams.left, offValue);
    this.sendParam(evenParams.right, onValue);
  }

  setAuxMasterFader(auxNumber: number, db: number | "-inf") {
    const param = AUX_MASTER_FADER_PARAMS[Math.round(auxNumber)];

    if (!param) {
      throw new Error("Auxiliar invalido. Use valores de 1 a 8.");
    }

    this.sendParam(param, faderDbToValue(db));
  }

  setAuxSolo(
    auxNumber: number,
    enabled: boolean,
    options?: { linkedStereo?: boolean; db?: number | "-inf"; tapPoint?: MonitorTapPoint }
  ) {
    const params = auxSoloParams(auxNumber);
    const tapPoint = options?.tapPoint ?? "post";
    const onValue = monitorSendValue(options?.db ?? 0, tapPoint);
    const offValue = monitorSendValue("-inf", tapPoint);

    if (!enabled) {
      this.sendParam(params.left, offValue);
      this.sendParam(params.right, offValue);
      return;
    }

    if (options?.linkedStereo) {
      const oddAux = Math.round(auxNumber) % 2 === 1;
      this.sendParam(params.left, oddAux ? onValue : offValue);
      this.sendParam(params.right, oddAux ? offValue : onValue);
      return;
    }

    this.sendParam(params.left, onValue);
    this.sendParam(params.right, onValue);
  }

  setAuxSoloPair(
    oddAux: number,
    enabled: boolean,
    options?: { db?: number | "-inf"; tapPoint?: MonitorTapPoint }
  ) {
    const odd = Math.round(oddAux);
    const even = odd + 1;

    if (odd % 2 === 0 || odd < 1 || even > 8) {
      throw new Error("Par de AUX inválido para solo. Use o AUX ímpar inicial do par.");
    }

    const tapPoint = options?.tapPoint ?? "post";
    const onValue = monitorSendValue(options?.db ?? 0, tapPoint);
    const offValue = monitorSendValue("-inf", tapPoint);
    const oddParams = auxSoloParams(odd);
    const evenParams = auxSoloParams(even);

    if (!enabled) {
      this.sendParam(oddParams.left, offValue);
      this.sendParam(oddParams.right, offValue);
      this.sendParam(evenParams.left, offValue);
      this.sendParam(evenParams.right, offValue);
      return;
    }

    this.sendParam(oddParams.left, onValue);
    this.sendParam(oddParams.right, offValue);
    this.sendParam(evenParams.left, offValue);
    this.sendParam(evenParams.right, onValue);
  }

  setMasterSolo(side: MasterSide, enabled: boolean, options?: { db?: number | "-inf"; tapPoint?: MonitorTapPoint }) {
    const tapPoint = options?.tapPoint ?? "post";
    const onValue = monitorSendValue(options?.db ?? 0, tapPoint);
    const offValue = monitorSendValue("-inf", tapPoint);

    if (side === "L" || side === "left") {
      this.sendParam(2560, enabled ? onValue : offValue);
      this.sendParam(2561, enabled ? onValue : offValue);
      return;
    }

    this.sendParam(2669, enabled ? onValue : offValue);
    this.sendParam(2670, enabled ? onValue : offValue);
  }

  setMainMasterSolo(enabled: boolean, options?: { db?: number | "-inf"; tapPoint?: MonitorTapPoint }) {
    const tapPoint = options?.tapPoint ?? "post";
    const onValue = monitorSendValue(options?.db ?? 0, tapPoint);
    const offValue = monitorSendValue("-inf", tapPoint);

    if (!enabled) {
      this.sendParam(2560, offValue);
      this.sendParam(2561, offValue);
      this.sendParam(2669, offValue);
      this.sendParam(2670, offValue);
      return;
    }

    this.sendParam(2560, onValue);
    this.sendParam(2561, offValue);
    this.sendParam(2669, offValue);
    this.sendParam(2670, onValue);
  }

  setFxSolo(fxNumber: number, enabled: boolean, options?: { db?: number | "-inf"; tapPoint?: MonitorTapPoint }) {
    const params = FX_SOLO_PARAMS[Math.round(fxNumber)];

    if (!params) {
      throw new Error("FX inválido para solo. Use valores 1 ou 2.");
    }

    const tapPoint = options?.tapPoint ?? "post";
    const value = enabled
      ? monitorSendValue(options?.db ?? 0, tapPoint)
      : monitorSendValue("-inf", tapPoint);

    this.sendParam(params.left, value);
    this.sendParam(params.right, value);
  }

  setDigiSolo(enabled: boolean, options?: { db?: number | "-inf"; tapPoint?: MonitorTapPoint }) {
    const tapPoint = options?.tapPoint ?? "post";
    const onValue = monitorSendValue(options?.db ?? 0, tapPoint);
    const offValue = monitorSendValue("-inf", tapPoint);

    if (!enabled) {
      this.sendParam(DIGI_SOLO.left.left, offValue);
      this.sendParam(DIGI_SOLO.left.right, offValue);
      this.sendParam(DIGI_SOLO.right.left, offValue);
      this.sendParam(DIGI_SOLO.right.right, offValue);
      return;
    }

    this.sendParam(DIGI_SOLO.left.left, onValue);
    this.sendParam(DIGI_SOLO.left.right, offValue);
    this.sendParam(DIGI_SOLO.right.left, offValue);
    this.sendParam(DIGI_SOLO.right.right, onValue);
  }

  setFxMasterFader(fxNumber: number, db: number | "-inf") {
    const param = FX_MASTER_FADER_PARAMS[Math.round(fxNumber)];

    if (!param) {
      throw new Error("FX invalido. Use valores 1 ou 2.");
    }

    this.sendParam(param, faderDbToValue(db));
  }

  setAuxPhase(auxNumber: number, positive: boolean) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.phase, positive ? 1 : 0);
  }

  setAuxDelay(auxNumber: number, ms: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.delay, delayMsToValue(ms));
  }

  setAuxCompEnabled(auxNumber: number, enabled: boolean) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.comp.enabled, boolToValue(enabled));
  }

  setAuxCompRatio(auxNumber: number, ratio: number | "inf") {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.comp.ratio, compRatioToValue(ratio));
  }

  setAuxCompAttack(auxNumber: number, ms: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.comp.attack, compTimeToValue(ms));
  }

  setAuxCompRelease(auxNumber: number, ms: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.comp.release, compTimeToValue(ms));
  }

  setAuxCompThreshold(auxNumber: number, db: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.comp.threshold, compThresholdToValue(db));
  }

  setAuxCompGain(auxNumber: number, db: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.comp.gain, compGainToValue(db));
  }

  setAuxEqEnabled(auxNumber: number, enabled: boolean) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.eqEnabled, boolToValue(enabled));
  }

  setAuxHpfFreq(auxNumber: number, freqHz: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.filters.hpfFreq, frequencyToValue(freqHz));
  }

  setAuxLpfFreq(auxNumber: number, freqHz: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.filters.lpfFreq, frequencyToValue(freqHz));
  }

  setAuxHpfTypeSlope(auxNumber: number, value: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.filters.hpfTypeSlope, value);
  }

  setAuxLpfTypeSlope(auxNumber: number, value: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");

    this.sendParam(auxParams.filters.lpfTypeSlope, value);
  }

  setAuxEqBandFreq(auxNumber: number, band: number, freqHz: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");
    if (band < 1 || band > 7) throw new Error("Banda inválida. Use de 1 a 7.");

    const freq = auxParams.eqBandBase + (band - 1) * 4;
    this.sendParam(freq, frequencyToValue(freqHz));
  }

  setAuxEqBandGain(auxNumber: number, band: number, gainDb: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");
    if (band < 1 || band > 7) throw new Error("Banda inválida. Use de 1 a 7.");

    const gain = auxParams.eqBandBase + (band - 1) * 4 + 1;
    this.sendParam(gain, eqGainToValue(gainDb));
  }

  setAuxEqBandQ(auxNumber: number, band: number, q: number) {
    const auxParams = AUX_PARAMS[Math.round(auxNumber)];
    if (!auxParams) throw new Error("AUX inválido. Use valores de 1 a 8.");
    if (band < 1 || band > 7) throw new Error("Banda inválida. Use de 1 a 7.");

    const qParam = auxParams.eqBandBase + (band - 1) * 4 + 2;
    this.sendParam(qParam, eqQToValue(q));
  }

  setAuxEqBand(auxNumber: number, band: number, freqHz: number, gainDb: number, q: number) {
    this.setAuxEqBandFreq(auxNumber, band, freqHz);
    this.setAuxEqBandGain(auxNumber, band, gainDb);
    this.setAuxEqBandQ(auxNumber, band, q);
  }

  async readMainMasterFader() {
    const response = await this.readParams([MASTER.left.fader, MASTER.right.fader]);
    const values = new Map(response.map((item) => [item.param, item.value]));
    const leftValue = values.get(MASTER.left.fader) ?? 1200;

    return valueToFaderDb(leftValue);
  }

  setMasterCompEnabled(side: MasterSide, enabled: boolean) {
    this.sendParam(getMasterSideParams(side).compEnabled, boolToValue(enabled));
  }

  setMasterCompThreshold(side: MasterSide, db: number) {
    this.sendParam(
      getMasterSideParams(side).compThreshold,
      compThresholdToValue(db)
    );
  }

  setMasterCompRatio(side: MasterSide, ratio: number | "inf") {
    this.sendParam(getMasterSideParams(side).compRatio, compRatioToValue(ratio));
  }

  setMasterCompAttack(side: MasterSide, ms: number) {
    this.sendParam(getMasterSideParams(side).compAttack, compTimeToValue(ms));
  }

  setMasterCompRelease(side: MasterSide, ms: number) {
    this.sendParam(getMasterSideParams(side).compRelease, compTimeToValue(ms));
  }

  setMasterCompGain(side: MasterSide, db: number) {
    this.sendParam(getMasterSideParams(side).compGain, compGainToValue(db));
  }

  setMasterEqEnabled(side: MasterSide, enabled: boolean) {
    this.sendParam(getMasterSideParams(side).eqEnabled, boolToValue(enabled));
  }

  setMasterHpfFreq(side: MasterSide, freqHz: number) {
    this.sendParam(getMasterSideParams(side).hpfFreq, frequencyToValue(freqHz));
  }

  setMasterLpfFreq(side: MasterSide, freqHz: number) {
    this.sendParam(getMasterSideParams(side).lpfFreq, frequencyToValue(freqHz));
  }

  setMasterHpfTypeSlopeValue(side: MasterSide, value: number) {
    // Valores do master ainda precisam de validação por tipo de filtro.
    this.sendParam(
      getMasterSideParams(side).hpfTypeSlope,
      filterTypeSlopeValue(value)
    );
  }

  setMasterLpfTypeSlopeValue(side: MasterSide, value: number) {
    // Valores do master ainda precisam de validação por tipo de filtro.
    this.sendParam(
      getMasterSideParams(side).lpfTypeSlope,
      filterTypeSlopeValue(value)
    );
  }

  setMasterEqBand(
    side: MasterSide,
    band: number,
    freqHz: number,
    gainDb: number,
    q: number
  ) {
    const params = masterEqBandParams(side, band);

    this.sendParam(params.freq, frequencyToValue(freqHz));
    this.sendParam(params.gain, eqGainToValue(gainDb));
    this.sendParam(params.q, eqQToValue(q));
  }

  setMasterEqBandFreq(side: MasterSide, band: number, freqHz: number) {
    this.sendParam(
      masterEqBandParams(side, band).freq,
      frequencyToValue(freqHz)
    );
  }

  setMasterEqBandGain(side: MasterSide, band: number, gainDb: number) {
    this.sendParam(
      masterEqBandParams(side, band).gain,
      eqGainToValue(gainDb)
    );
  }

  setMasterEqBandQ(side: MasterSide, band: number, q: number) {
    this.sendParam(masterEqBandParams(side, band).q, eqQToValue(q));
  }
}
