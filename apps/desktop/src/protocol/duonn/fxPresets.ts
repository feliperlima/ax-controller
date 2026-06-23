/**
 * FX Presets Configuration
 *
 * Dois bancos de presets distintos (16 cada), confirmados nos screenshots
 * da UI oficial + teste de ranges na mesa física:
 *   - Bank A → FX1 e FX3 (FX ímpar)
 *   - Bank B → FX2 e FX4 (FX par)
 *
 * AX16/AX24 têm FX1 (Bank A) e FX2 (Bank B). AX32 tem FX1–FX4 (1/3=A, 2/4=B).
 *
 * Os parâmetros reais (selector + controlA/controlB) NÃO ficam aqui — vêm de
 * resolveFxControlParams(model, fxNumber) / resolveFxPresetSelectorParam em
 * protocolAddressing.ts (acessados via getFxPresetParams no App.tsx).
 * Este módulo define apenas o schema visual (nome, label, range, unidade).
 *
 * Notas de label (firmware da mesa é inconsistente em alguns presets — quando
 * o comportamento real é incerto, espelhamos o hardware para não criar
 * expectativa errada):
 *   - Pitch Change / Vocal Doubler: hardware mostra "SLOPE" → usamos "Slope".
 *   - Distortion: hardware mostra "FREQUENCY Hz" → mantemos "Frequency (Hz)".
 *   - Symphonic: hardware mostra "FREQUENCY ms" → mantemos "Frequency (ms)".
 *   - Reverb Gate / Gate Reverb / Early Ref.: hardware mostra "ECHO DELAY" nos
 *     dois controles (firmware errado) → renomeamos para "Duration (s)" / "Level (%)".
 */

export {
  AX16_24_FX_PRESET_SELECTOR,
  AX16_24_FX_CONTROL_A,
  AX16_24_FX_CONTROL_B,
  AX32_FX_PRESET_SELECTORS,
  AX32_FX_CONTROLS,
  resolveFxPresetSelectorParam,
  resolveFxControlParams,
} from "./protocolAddressing";

export type FxPresetId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type FxPresetCategory =
  | "reverb"
  | "echo_delay"
  | "gate"
  | "pitch"
  | "modulation"
  | "distortion";

export type FxPresetControlKey = "controlA" | "controlB";

export interface FxPresetControlConfig {
  key: FxPresetControlKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  rawMin: number;
  rawMax: number;
  displayFromRaw?: (raw: number) => number | string;
  rawFromDisplay?: (display: number) => number;
}

export interface FxPresetConfig {
  id: FxPresetId;
  name: string;
  category: FxPresetCategory;
  description: string;
  /** Mostra o botão TAP TEMPO no painel de controle (presets de echo/delay). */
  hasTap?: boolean;
  controls: [FxPresetControlConfig, FxPresetControlConfig];
}

// ─── Builders de controle reutilizáveis ──────────────────────────────────────

function preDelayControl(): FxPresetControlConfig {
  return {
    key: "controlA",
    label: "Pre-Delay",
    min: 0,
    max: 30,
    step: 1,
    unit: "ms",
    rawMin: 0,
    rawMax: 30,
  };
}

function durationSecondsControl(label: string): FxPresetControlConfig {
  return {
    key: "controlB",
    label,
    min: 0.0,
    max: 10.0,
    step: 0.1,
    unit: "s",
    rawMin: 0,
    rawMax: 100,
    displayFromRaw: (raw: number) => raw / 10,
    rawFromDisplay: (display: number) => Math.round(display * 10),
  };
}

function durationSecondsControlA(label: string): FxPresetControlConfig {
  return { ...durationSecondsControl(label), key: "controlA" };
}

function percentControl(key: FxPresetControlKey, label: string): FxPresetControlConfig {
  return {
    key,
    label,
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
    rawMin: 0,
    rawMax: 100,
  };
}

function msControl(label: string, rawMax: number): FxPresetControlConfig {
  return {
    key: "controlA",
    label,
    min: 0,
    max: rawMax,
    step: 1,
    unit: "ms",
    rawMin: 0,
    rawMax,
  };
}

function rateHzControl(rawMax: number): FxPresetControlConfig {
  return {
    key: "controlA",
    label: "Rate",
    min: 0,
    max: rawMax,
    step: 1,
    unit: "Hz",
    rawMin: 0,
    rawMax,
  };
}

function frequencyHzControl(rawMax: number): FxPresetControlConfig {
  return { ...rateHzControl(rawMax), label: "Frequency" };
}

function unitlessControlA(label: string, rawMax: number): FxPresetControlConfig {
  return {
    key: "controlA",
    label,
    min: 0,
    max: rawMax,
    step: 1,
    unit: "",
    rawMin: 0,
    rawMax,
  };
}

function reverbPreset(id: FxPresetId, name: string, description: string): FxPresetConfig {
  return {
    id,
    name,
    category: "reverb",
    description,
    controls: [preDelayControl(), durationSecondsControl("Duration")],
  };
}

// ─── Bank A — FX1 & FX3 ───────────────────────────────────────────────────────

export const FX_BANK_A_CONFIG: Record<FxPresetId, FxPresetConfig> = {
  1: reverbPreset(1, "Reverb Hall", "Ambiência ampla e natural para vozes e instrumentos."),
  2: reverbPreset(2, "Reverb Room", "Sala curta e mais íntima para presença natural."),
  3: reverbPreset(3, "Reverb Plate", "Reverb brilhante e denso com cauda musical."),
  4: reverbPreset(4, "Reverb Vocal 1", "Reverb vocal balanceado para presença e profundidade."),
  5: reverbPreset(5, "Reverb Vocal 2", "Reverb curto e claro para vocais, com leve ambiência."),
  6: {
    id: 6,
    name: "Vocal Echo 1",
    category: "echo_delay",
    description: "Eco vocal simples para repetições sutis.",
    hasTap: true,
    controls: [msControl("Echo Delay", 340), percentControl("controlB", "Echo Repeat")],
  },
  7: {
    id: 7,
    name: "Vocal Echo 2",
    category: "echo_delay",
    description: "Eco vocal mais presente para destaque.",
    hasTap: true,
    controls: [msControl("Echo Delay", 340), percentControl("controlB", "Echo Repeat")],
  },
  8: {
    id: 8,
    name: "Delay 1",
    category: "echo_delay",
    description: "Delay direto para profundidade e repetição.",
    hasTap: true,
    controls: [msControl("Delay", 675), percentControl("controlB", "Repeat")],
  },
  9: {
    id: 9,
    name: "Delay 2",
    category: "echo_delay",
    description: "Delay alternativo para efeitos rítmicos.",
    hasTap: true,
    controls: [msControl("Delay", 675), percentControl("controlB", "Repeat")],
  },
  10: {
    id: 10,
    name: "Mod. Delay",
    category: "echo_delay",
    description: "Delay com modulação para movimento.",
    hasTap: true,
    controls: [msControl("Delay", 675), percentControl("controlB", "Depth")],
  },
  11: {
    id: 11,
    name: "Reverb Gate",
    category: "gate",
    description: "Ambiência com gate para efeito controlado.",
    controls: [durationSecondsControlA("Duration"), percentControl("controlB", "Level")],
  },
  12: {
    id: 12,
    name: "Pitch Change",
    category: "pitch",
    description: "Alteração de pitch com controle de inclinação e profundidade.",
    controls: [unitlessControlA("Slope", 63), percentControl("controlB", "Depth")],
  },
  13: {
    id: 13,
    name: "Chorus",
    category: "modulation",
    description: "Modulação suave para largura e movimento.",
    controls: [rateHzControl(42), percentControl("controlB", "Depth")],
  },
  14: {
    id: 14,
    name: "Phaser",
    category: "modulation",
    description: "Modulação de fase com variação cíclica.",
    controls: [rateHzControl(63), percentControl("controlB", "Depth")],
  },
  15: {
    id: 15,
    name: "Flange",
    category: "modulation",
    description: "Modulação metálica e profunda.",
    controls: [rateHzControl(63), percentControl("controlB", "Depth")],
  },
  16: {
    id: 16,
    name: "Tremolo",
    category: "modulation",
    description: "Variação de volume rítmica.",
    controls: [rateHzControl(127), percentControl("controlB", "Depth")],
  },
};

// ─── Bank B — FX2 & FX4 ───────────────────────────────────────────────────────

export const FX_BANK_B_CONFIG: Record<FxPresetId, FxPresetConfig> = {
  1: reverbPreset(1, "Reverb Hall", "Ambiência ampla e natural para vozes e instrumentos."),
  2: reverbPreset(2, "Reverb Room", "Sala curta e mais íntima para presença natural."),
  3: reverbPreset(3, "Reverb Plate", "Reverb brilhante e denso com cauda musical."),
  4: reverbPreset(4, "Reverb Vocal 1", "Reverb vocal balanceado para presença e profundidade."),
  5: reverbPreset(5, "Reverb Vocal 2", "Reverb curto e claro para vocais, com leve ambiência."),
  6: {
    id: 6,
    name: "Vocal Echo 1",
    category: "echo_delay",
    description: "Eco vocal simples para repetições sutis.",
    hasTap: true,
    controls: [msControl("Echo Delay", 340), percentControl("controlB", "Echo Repeat")],
  },
  7: {
    id: 7,
    name: "Vocal Echo 2",
    category: "echo_delay",
    description: "Eco vocal mais presente para destaque.",
    hasTap: true,
    controls: [msControl("Echo Delay", 340), percentControl("controlB", "Echo Repeat")],
  },
  8: {
    id: 8,
    name: "Delay 1",
    category: "echo_delay",
    description: "Delay direto para profundidade e repetição.",
    hasTap: true,
    controls: [msControl("Delay", 675), percentControl("controlB", "Repeat")],
  },
  9: {
    id: 9,
    name: "Delay 2",
    category: "echo_delay",
    description: "Delay alternativo para efeitos rítmicos.",
    hasTap: true,
    controls: [msControl("Delay", 675), percentControl("controlB", "Repeat")],
  },
  10: {
    id: 10,
    name: "Early Ref.",
    category: "reverb",
    description: "Reflexões iniciais curtas para sensação de espaço.",
    controls: [durationSecondsControlA("Duration"), percentControl("controlB", "Level")],
  },
  11: {
    id: 11,
    name: "Gate Reverb",
    category: "gate",
    description: "Reverb com gate para cauda cortada e controlada.",
    controls: [durationSecondsControlA("Duration"), percentControl("controlB", "Level")],
  },
  12: {
    id: 12,
    name: "Vocal Doubler",
    category: "pitch",
    description: "Duplicação vocal para encorpar a voz.",
    controls: [unitlessControlA("Slope", 42), percentControl("controlB", "Depth")],
  },
  13: {
    id: 13,
    name: "Flange",
    category: "modulation",
    description: "Modulação metálica e profunda.",
    controls: [rateHzControl(63), percentControl("controlB", "Depth")],
  },
  14: {
    id: 14,
    name: "Symphonic",
    category: "modulation",
    description: "Modulação rica e encorpada para vozes e teclados.",
    controls: [msControl("Frequency", 210), percentControl("controlB", "Depth")],
  },
  15: {
    id: 15,
    name: "Distortion",
    category: "distortion",
    description: "Saturação para guitarras e efeitos agressivos.",
    controls: [frequencyHzControl(63), percentControl("controlB", "Depth")],
  },
  16: {
    id: 16,
    name: "Tap Delay",
    category: "echo_delay",
    description: "Delay com tap tempo para repetições no ritmo.",
    hasTap: true,
    controls: [msControl("Delay", 675), percentControl("controlB", "Repeat")],
  },
};

const FX_AVAILABLE_PRESET_IDS: FxPresetId[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
];

/** Bank A para FX ímpar (1, 3), Bank B para FX par (2, 4). */
function getBankConfig(fxNumber?: number): Record<FxPresetId, FxPresetConfig> {
  if (fxNumber !== undefined && fxNumber % 2 === 0) {
    return FX_BANK_B_CONFIG;
  }
  return FX_BANK_A_CONFIG;
}

/**
 * Get preset configuration by ID. Quando `fxNumber` é informado, resolve do
 * banco correto (par → Bank B, ímpar → Bank A); senão usa Bank A.
 */
export function getFxPresetConfig(presetId: FxPresetId, fxNumber?: number): FxPresetConfig {
  return getBankConfig(fxNumber)[presetId];
}

/**
 * Retorna os 16 presets do banco correspondente ao FX (1/3 → Bank A, 2/4 → Bank B).
 */
export function getFxBankPresets(fxNumber: number): FxPresetConfig[] {
  const bank = getBankConfig(fxNumber);
  return FX_AVAILABLE_PRESET_IDS.map((presetId) => bank[presetId]);
}

/**
 * Validate and normalize preset ID
 */
export function validateFxPresetId(value: number): FxPresetId | null {
  if (!Number.isFinite(value)) return null;
  const normalized = Math.round(value);
  if (normalized >= 1 && normalized <= 16) {
    return normalized as FxPresetId;
  }
  return null;
}

/**
 * Get control configuration for a specific preset and control key
 */
export function getFxPresetControlConfig(
  presetId: FxPresetId,
  controlKey: FxPresetControlKey,
  fxNumber?: number
): FxPresetControlConfig | null {
  const preset = getFxPresetConfig(presetId, fxNumber);
  const controlConfig = preset.controls.find((c) => c.key === controlKey);
  return controlConfig ?? null;
}

/**
 * Clamp value to control range
 */
export function clampFxPresetControlValue(
  controlConfig: FxPresetControlConfig,
  value: number
): number {
  return Math.max(controlConfig.rawMin, Math.min(controlConfig.rawMax, value));
}

/**
 * Format raw value for display using control config
 */
export function formatFxPresetControlValue(
  controlConfig: FxPresetControlConfig,
  rawValue: number
): string {
  if (controlConfig.unit === "ms") {
    return Math.round(rawValue).toString();
  }

  if (controlConfig.displayFromRaw) {
    const displayValue = controlConfig.displayFromRaw(rawValue);
    if (typeof displayValue === "string") {
      return displayValue;
    }
    return displayValue.toFixed(controlConfig.step < 1 ? 1 : 0);
  }
  return rawValue.toString();
}

/**
 * Convert display value to raw value
 */
export function toRawFxPresetControlValue(
  controlConfig: FxPresetControlConfig,
  displayValue: number
): number {
  if (controlConfig.rawFromDisplay) {
    return clampFxPresetControlValue(
      controlConfig,
      controlConfig.rawFromDisplay(displayValue)
    );
  }
  return clampFxPresetControlValue(controlConfig, displayValue);
}

/**
 * Get all presets as array (Bank A — usado no modo demo/default)
 */
export function getAllFxPresets(): FxPresetConfig[] {
  return FX_AVAILABLE_PRESET_IDS.map((presetId) => FX_BANK_A_CONFIG[presetId]);
}

/**
 * Get presets by category (Bank A)
 */
export function getFxPresetsByCategory(
  category: FxPresetCategory
): FxPresetConfig[] {
  return getAllFxPresets().filter((p) => p.category === category);
}
