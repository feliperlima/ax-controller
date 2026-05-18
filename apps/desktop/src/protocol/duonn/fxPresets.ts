/**
 * FX Presets Configuration
 * 
 * Centralized configuration for all 16 FX presets with their control schemas.
 * Parameter mappings:
 * - 3097: Active preset selector (1-16)
 * - 2940: Control A (contextual, depends on active preset)
 * - 2941: Control B (contextual, depends on active preset)
 */

export type FxPresetId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type FxPresetCategory = "reverb" | "echo_delay" | "gate" | "pitch" | "modulation";

export type FxPresetControlKey = "controlA" | "controlB";

export interface FxPresetControlConfig {
  key: FxPresetControlKey;
  param: 2940 | 2941;
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
  controls: [FxPresetControlConfig, FxPresetControlConfig];
}

export const FX_PRESET_CONFIG: Record<FxPresetId, FxPresetConfig> = {
  1: {
    id: 1,
    name: "Reverb Hall",
    category: "reverb",
    description: "Ambiência ampla e natural para vozes e instrumentos.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Reverb PreDelay",
        min: 0,
        max: 30,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 30,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Reverb Duration",
        min: 0.0,
        max: 10.0,
        step: 0.1,
        unit: "s",
        rawMin: 0,
        rawMax: 100,
        displayFromRaw: (raw: number) => raw / 10,
        rawFromDisplay: (display: number) => Math.round(display * 10),
      },
    ],
  },
  2: {
    id: 2,
    name: "Reverb Room",
    category: "reverb",
    description: "Sala curta e mais íntima para presença natural.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Reverb PreDelay",
        min: 0,
        max: 30,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 30,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Reverb Duration",
        min: 0.0,
        max: 10.0,
        step: 0.1,
        unit: "s",
        rawMin: 0,
        rawMax: 100,
        displayFromRaw: (raw: number) => raw / 10,
        rawFromDisplay: (display: number) => Math.round(display * 10),
      },
    ],
  },
  3: {
    id: 3,
    name: "Reverb Plate",
    category: "reverb",
    description: "Reverb brilhante e denso com cauda musical.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Reverb PreDelay",
        min: 0,
        max: 30,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 30,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Reverb Duration",
        min: 0.0,
        max: 10.0,
        step: 0.1,
        unit: "s",
        rawMin: 0,
        rawMax: 100,
        displayFromRaw: (raw: number) => raw / 10,
        rawFromDisplay: (display: number) => Math.round(display * 10),
      },
    ],
  },
  4: {
    id: 4,
    name: "Reverb Vocal 1",
    category: "reverb",
    description: "Reverb vocal balanceado para presença e profundidade.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Reverb PreDelay",
        min: 0,
        max: 30,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 30,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Reverb Duration",
        min: 0.0,
        max: 10.0,
        step: 0.1,
        unit: "s",
        rawMin: 0,
        rawMax: 100,
        displayFromRaw: (raw: number) => raw / 10,
        rawFromDisplay: (display: number) => Math.round(display * 10),
      },
    ],
  },
  5: {
    id: 5,
    name: "Reverb Vocal 2",
    category: "reverb",
    description: "Reverb curto e claro para vocais, com leve ambiência.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Reverb PreDelay",
        min: 0,
        max: 30,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 30,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Reverb Duration",
        min: 0.0,
        max: 10.0,
        step: 0.1,
        unit: "s",
        rawMin: 0,
        rawMax: 100,
        displayFromRaw: (raw: number) => raw / 10,
        rawFromDisplay: (display: number) => Math.round(display * 10),
      },
    ],
  },
  6: {
    id: 6,
    name: "Vocal Echo 1",
    category: "echo_delay",
    description: "Eco vocal simples para repetições sutis.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Echo Delay",
        min: 0,
        max: 340,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 340,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Echo Repeat",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  7: {
    id: 7,
    name: "Vocal Echo 2",
    category: "echo_delay",
    description: "Eco vocal mais presente para destaque.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Echo Delay",
        min: 0,
        max: 340,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 340,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Echo Repeat",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  8: {
    id: 8,
    name: "Delay 1",
    category: "echo_delay",
    description: "Delay direto para profundidade e repetição.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Delay Time",
        min: 0,
        max: 340,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 340,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Feedback",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  9: {
    id: 9,
    name: "Delay 2",
    category: "echo_delay",
    description: "Delay alternativo para efeitos rítmicos.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Delay Time",
        min: 0,
        max: 340,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 340,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Feedback",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  10: {
    id: 10,
    name: "Mod. Delay",
    category: "echo_delay",
    description: "Delay com modulação para movimento.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Delay Time",
        min: 0,
        max: 340,
        step: 1,
        unit: "ms",
        rawMin: 0,
        rawMax: 340,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Modulation",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  11: {
    id: 11,
    name: "Reverb Gate",
    category: "gate",
    description: "Ambiência com gate para efeito controlado.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Gate Threshold",
        min: 0,
        max: 10,
        step: 0.1,
        unit: "s",
        rawMin: 0,
        rawMax: 100,
        displayFromRaw: (raw: number) => raw / 10,
        rawFromDisplay: (display: number) => Math.round(display * 10),
      },
      {
        key: "controlB",
        param: 2941,
        label: "Gate Release",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  12: {
    id: 12,
    name: "Pitch Change",
    category: "pitch",
    description: "Alteração de pitch com controle de inclinação e profundidade.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Slope",
        min: 0,
        max: 63,
        step: 1,
        unit: "",
        rawMin: 0,
        rawMax: 63,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Depth",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  13: {
    id: 13,
    name: "Chorus",
    category: "modulation",
    description: "Modulação suave para largura e movimento.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Frequency",
        min: 0,
        max: 127,
        step: 1,
        unit: "Hz",
        rawMin: 0,
        rawMax: 127,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Depth",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  14: {
    id: 14,
    name: "Phaser",
    category: "modulation",
    description: "Modulação de fase com variação cíclica.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Frequency",
        min: 0,
        max: 127,
        step: 1,
        unit: "Hz",
        rawMin: 0,
        rawMax: 127,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Depth",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  15: {
    id: 15,
    name: "Flange",
    category: "modulation",
    description: "Modulação metálica e profunda.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Frequency",
        min: 0,
        max: 127,
        step: 1,
        unit: "Hz",
        rawMin: 0,
        rawMax: 127,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Depth",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
  16: {
    id: 16,
    name: "Tremolo",
    category: "modulation",
    description: "Variação de volume rítmica.",
    controls: [
      {
        key: "controlA",
        param: 2940,
        label: "Frequency",
        min: 0,
        max: 127,
        step: 1,
        unit: "Hz",
        rawMin: 0,
        rawMax: 127,
      },
      {
        key: "controlB",
        param: 2941,
        label: "Depth",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        rawMin: 0,
        rawMax: 100,
      },
    ],
  },
};

const FX_AVAILABLE_PRESET_IDS: FxPresetId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Get preset configuration by ID
 */
export function getFxPresetConfig(presetId: FxPresetId): FxPresetConfig {
  return FX_PRESET_CONFIG[presetId];
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
  controlKey: FxPresetControlKey
): FxPresetControlConfig | null {
  const preset = getFxPresetConfig(presetId);
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
 * Get all presets as array
 */
export function getAllFxPresets(): FxPresetConfig[] {
  return FX_AVAILABLE_PRESET_IDS.map((presetId) => FX_PRESET_CONFIG[presetId]);
}

/**
 * Get presets by category
 */
export function getFxPresetsByCategory(
  category: FxPresetCategory
): FxPresetConfig[] {
  return getAllFxPresets().filter((p) => p.category === category);
}
