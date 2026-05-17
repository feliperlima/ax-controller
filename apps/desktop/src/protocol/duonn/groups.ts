import { type GroupMember, encodeGroupMembers } from "./bitmask";

export type DcaGroupId = 1 | 2 | 3 | 4;
export type MuteGroupId = 1 | 2 | 3 | 4;

export type DcaGroupConfig = {
  id: DcaGroupId;
  onOffParam: number;
  faderParam: number;
  memberParams: readonly [number, number, number, number];
  isDerived?: boolean;
};

export type MuteGroupConfig = {
  id: MuteGroupId;
  activeParam: number;
  memberParams: readonly [number, number, number, number];
  allMutedValues?: readonly [number, number, number];
  clearValues?: readonly [0, 0, 0];
  isDerived?: boolean;
};

export type DuonnParamWriteMessage = {
  param: number;
  value: number;
  isDerived?: boolean;
  note?: string;
};

const DCA_BASE_PARAM = 3019;
const DCA_STRIDE = 9;

function deriveDcaConfig(id: DcaGroupId): DcaGroupConfig {
  const base = DCA_BASE_PARAM + (id - 1) * DCA_STRIDE;
  const isDerived = id === 2 || id === 3;

  return {
    id,
    onOffParam: base,
    faderParam: base + 1,
    memberParams: [base + 4, base + 5, base + 6, base + 7],
    isDerived,
  };
}

export const DCA_GROUPS_CONFIG: Readonly<Record<DcaGroupId, DcaGroupConfig>> = {
  1: {
    id: 1,
    onOffParam: 3019,
    faderParam: 3020,
    memberParams: [3023, 3024, 3025, 3026],
  },
  2: deriveDcaConfig(2),
  3: deriveDcaConfig(3),
  4: {
    id: 4,
    onOffParam: 3046,
    faderParam: 3047,
    memberParams: [3050, 3051, 3052, 3053],
  },
};

const MUTE_GROUP_BASE_PARAM = 3057;
const MUTE_GROUP_STRIDE = 5;

function deriveMuteGroupConfig(id: MuteGroupId): MuteGroupConfig {
  const base = MUTE_GROUP_BASE_PARAM + (id - 1) * MUTE_GROUP_STRIDE;
  const isDerived = id === 2 || id === 3;

  return {
    id,
    activeParam: base,
    memberParams: [base + 1, base + 2, base + 3, base + 4],
    isDerived,
  };
}

export const MUTE_GROUPS_CONFIG: Readonly<Record<MuteGroupId, MuteGroupConfig>> = {
  1: {
    id: 1,
    activeParam: 3057,
    memberParams: [3058, 3059, 3060, 3061],
    allMutedValues: [65535, 65280, 63],
    clearValues: [0, 0, 0],
  },
  2: deriveMuteGroupConfig(2),
  3: deriveMuteGroupConfig(3),
  4: {
    id: 4,
    activeParam: 3072,
    memberParams: [3073, 3074, 3075, 3076],
    allMutedValues: [65535, 65280, 63],
    clearValues: [0, 0, 0],
  },
};

function assertDcaGroupId(id: number): asserts id is DcaGroupId {
  if (id !== 1 && id !== 2 && id !== 3 && id !== 4) {
    throw new Error(`Invalid DCA group id ${id}. Use 1..4.`);
  }
}

function assertMuteGroupId(id: number): asserts id is MuteGroupId {
  if (id !== 1 && id !== 2 && id !== 3 && id !== 4) {
    throw new Error(`Invalid mute group id ${id}. Use 1..4.`);
  }
}

function assertDcaFaderValue(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1300) {
    throw new Error(`Invalid DCA fader value ${value}. Use range 0..1300.`);
  }
}

function mapWordsToMessages(
  params: readonly [number, number, number, number],
  words: readonly [number, number, number, number],
  metadata?: { isDerived?: boolean; note?: string }
): DuonnParamWriteMessage[] {
  return params.map((param, index) => ({
    param,
    value: words[index],
    ...(metadata?.isDerived ? { isDerived: true } : {}),
    ...(metadata?.note ? { note: metadata.note } : {}),
  }));
}

export function getDcaGroupConfig(id: DcaGroupId): DcaGroupConfig {
  assertDcaGroupId(id);
  return DCA_GROUPS_CONFIG[id];
}

export function getDcaOnOffParam(id: DcaGroupId): number {
  return getDcaGroupConfig(id).onOffParam;
}

export function getDcaFaderParam(id: DcaGroupId): number {
  return getDcaGroupConfig(id).faderParam;
}

export function getDcaMemberParams(id: DcaGroupId): readonly number[] {
  return getDcaGroupConfig(id).memberParams;
}

export function buildSetDcaEnabledMessages(id: DcaGroupId, enabled: boolean): DuonnParamWriteMessage[] {
  const config = getDcaGroupConfig(id);
  return [{
    param: config.onOffParam,
    value: enabled ? 1 : 0,
    ...(config.isDerived ? { isDerived: true, note: "Derived DCA slot mapping. Validate on hardware." } : {}),
  }];
}

export function buildSetDcaFaderMessage(id: DcaGroupId, value: number): DuonnParamWriteMessage {
  const config = getDcaGroupConfig(id);
  assertDcaFaderValue(value);

  return {
    param: config.faderParam,
    value: Math.round(value),
    ...(config.isDerived ? { isDerived: true, note: "Derived DCA slot mapping. Validate on hardware." } : {}),
  };
}

export function buildSetDcaMembersMessages(id: DcaGroupId, members: GroupMember[]): DuonnParamWriteMessage[] {
  const config = getDcaGroupConfig(id);
  const words = encodeGroupMembers(members);

  return mapWordsToMessages(config.memberParams, words, {
    isDerived: config.isDerived,
    note: config.isDerived ? "Derived DCA member params for this group." : undefined,
  });
}

export function buildClearDcaMembersMessages(id: DcaGroupId): DuonnParamWriteMessage[] {
  const config = getDcaGroupConfig(id);
  const clearWords: [number, number, number, number] = [0, 0, 0, 0];

  return mapWordsToMessages(config.memberParams, clearWords, {
    isDerived: config.isDerived,
    note: config.isDerived ? "Derived DCA member params for this group." : undefined,
  });
}

export function getMuteGroupConfig(id: MuteGroupId): MuteGroupConfig {
  assertMuteGroupId(id);
  return MUTE_GROUPS_CONFIG[id];
}

export function getMuteGroupActiveParam(id: MuteGroupId): number {
  return getMuteGroupConfig(id).activeParam;
}

export function getMuteGroupMemberParams(id: MuteGroupId): readonly number[] {
  return getMuteGroupConfig(id).memberParams;
}

export function buildSetMuteGroupActiveMessages(id: MuteGroupId, active: boolean): DuonnParamWriteMessage[] {
  const config = getMuteGroupConfig(id);
  return [{
    param: config.activeParam,
    value: active ? 1 : 0,
    ...(config.isDerived ? { isDerived: true, note: "Derived mute group slot mapping. Validate on hardware." } : {}),
  }];
}

export function buildSetMuteGroupMembersMessages(id: MuteGroupId, members: GroupMember[]): DuonnParamWriteMessage[] {
  const config = getMuteGroupConfig(id);
  const words = encodeGroupMembers(members);

  return mapWordsToMessages(config.memberParams, words, {
    isDerived: config.isDerived,
    note: config.isDerived ? "Derived mute group member params for this group." : undefined,
  });
}

export function buildClearMuteGroupMembersMessages(id: MuteGroupId): DuonnParamWriteMessage[] {
  const config = getMuteGroupConfig(id);

  if (config.clearValues) {
    return config.clearValues.map((value, index) => ({
      param: config.memberParams[index],
      value,
    }));
  }

  const clearWords: [number, number, number, number] = [0, 0, 0, 0];
  return mapWordsToMessages(config.memberParams, clearWords, {
    isDerived: config.isDerived,
    note: "Derived clear values. Confirm exact word coverage on hardware.",
  });
}

export function buildAllMutedMuteGroupMessages(
  id: MuteGroupId,
  options?: { allowDerived?: boolean }
): DuonnParamWriteMessage[] {
  const config = getMuteGroupConfig(id);

  if (config.allMutedValues) {
    return config.allMutedValues.map((value, index) => ({
      param: config.memberParams[index],
      value,
    }));
  }

  if (!options?.allowDerived) {
    throw new Error(
      `All muted values for mute group ${id} are derived/provisional. Pass allowDerived=true to generate experimental writes.`
    );
  }

  return [65535, 65280, 63].map((value, index) => ({
    param: config.memberParams[index],
    value,
    isDerived: true,
    note: "Experimental: derived from mute groups 1/4 stride pattern.",
  }));
}
