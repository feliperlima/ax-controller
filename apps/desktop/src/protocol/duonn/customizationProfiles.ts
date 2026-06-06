export type MixerModel = "AX16" | "AX24" | "AX32";
export type CustomTargetType = "channel" | "fx" | "aux" | "master" | "dca";

// Confirmed by runtime captures and EXE analysis.
// colorParam = colorBaseParam + targetId.
// Name write: opcode 0x2F, payload[0] = targetId, payload[1..] = ASCII text.
// Name read:  opcode 0x2E, payload[0] = targetId.
// DCA color is NOT sent to the mixer; kept local only.
export const CUSTOMIZATION_PROFILES = {
  AX16: {
    renameWriteOpcode: 0x2f,
    renameReadOpcode: 0x2e,
    colorBaseParam: 3110,
    channelCount: 16,
    fxCount: 2,
    auxCount: 14,
    dcaCount: 4,
    muteGroupCount: 4,
    targets: {
      channelBase: 0x00,
      fxBase: 0x12,
      auxBase: 0x14,
      masterBase: 0x24,
      dcaBase: 0x26,
    },
    supportsDcaProtocolRename: true,
    supportsDcaProtocolColor: false,
  },
  AX24: {
    renameWriteOpcode: 0x2f,
    renameReadOpcode: 0x2e,
    colorBaseParam: 3110,
    channelCount: 24,
    fxCount: 2,
    auxCount: 14,
    dcaCount: 4,
    muteGroupCount: 4,
    targets: {
      channelBase: 0x00,
      fxBase: 0x1a,
      auxBase: 0x1c,
      masterBase: 0x2c,
      dcaBase: 0x2e,
    },
    supportsDcaProtocolRename: true,
    supportsDcaProtocolColor: false,
  },
  AX32: {
    renameWriteOpcode: 0x2f,
    renameReadOpcode: 0x2e,
    colorBaseParam: 5131,
    channelCount: 32,
    fxCount: 4,
    auxCount: 14,
    dcaCount: 8,
    muteGroupCount: 6,
    targets: {
      channelBase: 0x00,
      fxBase: 0x22,
      auxBase: 0x26,
      masterBase: 0x36,
      dcaBase: 0x38,
    },
    supportsDcaProtocolRename: true,
    supportsDcaProtocolColor: false,
  },
} as const;

// AX16 expected results:
//   CH1=3110, CH16=3125, FX1=3128, FX2=3129
//   AUX1=3130, AUX14=3143, MasterL=3146, MasterR=3147
//
// AX24 expected results:
//   CH1=3110, CH24=3133, FX1=3136, FX2=3137
//   AUX1=3138, AUX14=3151, MasterL=3154, MasterR=3155
//   NOTE: AX24 Master L/R must NOT be 3146/3147 (those collide with AX16 AUX).
//
// AX32 expected results (confirmed runtime):
//   CH1=5131, CH32=5162, FX1=5165..FX4=5168
//   AUX1=5169, AUX14=5182, MasterL=5185, MasterR=5186

export function mixerModelFromChannelCount(channelCount: number): MixerModel {
  if (channelCount >= 32) return "AX32";
  if (channelCount >= 24) return "AX24";
  return "AX16";
}

// Returns the target ID used in opcode 0x2F/0x2E packets.
// index is 0-based for channel/fx/aux/dca; 0=L, 1=R for master.
export function getCustomizationTargetId(
  model: MixerModel,
  type: CustomTargetType,
  index: number
): number {
  const profile = CUSTOMIZATION_PROFILES[model];
  switch (type) {
    case "channel": return profile.targets.channelBase + index;
    case "fx":      return profile.targets.fxBase + index;
    case "aux":     return profile.targets.auxBase + index;
    case "master":  return profile.targets.masterBase + index;
    case "dca":     return profile.targets.dcaBase + index;
  }
}

// Returns the RAW parameter number used to write color via opcode 0x03.
// Returns null for DCA (color is kept local, never sent to mixer).
export function getCustomizationColorParam(
  model: MixerModel,
  type: CustomTargetType,
  index: number // 0-based
): number | null {
  if (type === "dca") return null;
  const profile = CUSTOMIZATION_PROFILES[model];
  return profile.colorBaseParam + getCustomizationTargetId(model, type, index);
}

export function supportsCustomizationRename(model: MixerModel, type: CustomTargetType): boolean {
  if (type === "dca") return CUSTOMIZATION_PROFILES[model].supportsDcaProtocolRename;
  return true;
}

export function supportsCustomizationColor(model: MixerModel, type: CustomTargetType): boolean {
  if (type === "dca") return CUSTOMIZATION_PROFILES[model].supportsDcaProtocolColor;
  return true;
}
