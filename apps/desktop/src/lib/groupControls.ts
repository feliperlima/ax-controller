import type { Axios16Client } from "./axios16Client";
import { GROUP_MEMBER_BITS, type GroupMember } from "../protocol/duonn/bitmask";
import type { DcaGroupId, MuteGroupId } from "../protocol/duonn/groups";

export type AssignableMemberId = GroupMember;

export type DcaGroupState = {
  enabled: boolean;
  faderPosition: number;
  members: GroupMember[];
};

export type MuteGroupState = {
  active: boolean;
  members: GroupMember[];
};

export const DCA_IDS: DcaGroupId[] = [1, 2, 3, 4];
export const MUTE_IDS: MuteGroupId[] = [1, 2, 3, 4];

export const DCA_COLOR_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const DCA_DEFAULT_COLOR_IDS: Readonly<Record<DcaGroupId, number>> = {
  1: 7,
  2: 10,
  3: 0,
  4: 8,
};

export const CHANNEL_IDS_MAX = [
  "CH_1", "CH_2", "CH_3", "CH_4", "CH_5", "CH_6", "CH_7", "CH_8",
  "CH_9", "CH_10", "CH_11", "CH_12", "CH_13", "CH_14", "CH_15", "CH_16",
  "CH_17", "CH_18", "CH_19", "CH_20", "CH_21", "CH_22", "CH_23", "CH_24",
] as const;

export const AUX_IDS = [
  "AUX_1", "AUX_2", "AUX_3", "AUX_4", "AUX_5", "AUX_6", "AUX_7", "AUX_8",
] as const;

export const FX_IDS = ["FX_1", "FX_2"] as const;

export const MASTER_IDS = ["MASTER_L", "MASTER_R"] as const;

export const DCA_ACCENT_COLORS: Record<DcaGroupId, string> = {
  1: dcaAccentColorFromId(DCA_DEFAULT_COLOR_IDS[1]),
  2: dcaAccentColorFromId(DCA_DEFAULT_COLOR_IDS[2]),
  3: dcaAccentColorFromId(DCA_DEFAULT_COLOR_IDS[3]),
  4: dcaAccentColorFromId(DCA_DEFAULT_COLOR_IDS[4]),
};

export function dcaAccentColorFromId(colorId: number | undefined, fallbackColorId?: number) {
  const normalized = Math.max(0, Math.min(12, Math.round(colorId ?? 0)));
  const effective =
    normalized === 0 && fallbackColorId !== undefined
      ? Math.max(0, Math.min(12, Math.round(fallbackColorId)))
      : normalized;

  if (effective === 0) return "#7b7b7b";
  return `var(--channel-${String(effective).padStart(2, "0")}, #7b7b7b)`;
}

const DCA_FADER_DB_POINTS = [
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

export const DCA_FADER_SNAP_POINTS_DB = [-50, -40, -30, -20, -10, -5, 0, 5, 10];
export const DCA_FADER_SNAP_POINTS = DCA_FADER_SNAP_POINTS_DB.map((db) => dcaDbToPosition(db));

export function buildAssignableMemberIds(channelCount: number): AssignableMemberId[] {
  const channelIds = CHANNEL_IDS_MAX.slice(0, Math.max(1, Math.min(24, channelCount))) as GroupMember[];
  return [...channelIds, ...AUX_IDS, ...FX_IDS, ...MASTER_IDS];
}

export function buildVisibleDcaMemberIds(channelCount: number, includeMasterRows = false): AssignableMemberId[] {
  const channelIds = CHANNEL_IDS_MAX.slice(0, Math.max(1, Math.min(24, channelCount))) as GroupMember[];
  if (includeMasterRows) {
    return [...channelIds, ...AUX_IDS, ...FX_IDS, ...MASTER_IDS];
  }
  return [...channelIds, ...AUX_IDS, ...FX_IDS];
}

export function isMemberSelectable(member: AssignableMemberId) {
  return GROUP_MEMBER_BITS[member] !== null;
}

export function createInitialDcaState(): DcaGroupState[] {
  return DCA_IDS.map(() => ({
    enabled: true,
    faderPosition: dcaDbToPosition(0),
    members: [],
  }));
}

export function createInitialMuteState(): MuteGroupState[] {
  return MUTE_IDS.map(() => ({
    active: false,
    members: [],
  }));
}

export function dcaDbToPosition(db: number) {
  for (let i = 0; i < DCA_FADER_DB_POINTS.length - 1; i++) {
    const current = DCA_FADER_DB_POINTS[i];
    const next = DCA_FADER_DB_POINTS[i + 1];

    if (db >= current.db && db <= next.db) {
      const t = (db - current.db) / (next.db - current.db);
      return current.pos + t * (next.pos - current.pos);
    }
  }

  return db <= -120 ? 0 : 100;
}

export function dcaPositionToDb(position: number) {
  const clamped = Math.max(0, Math.min(100, position));

  for (let i = 0; i < DCA_FADER_DB_POINTS.length - 1; i++) {
    const current = DCA_FADER_DB_POINTS[i];
    const next = DCA_FADER_DB_POINTS[i + 1];

    if (clamped >= current.pos && clamped <= next.pos) {
      const t = (clamped - current.pos) / (next.pos - current.pos);
      return current.db + t * (next.db - current.db);
    }
  }

  return clamped <= 0 ? -120 : 10;
}

export function dcaValueToDb(value: number) {
  if (value <= 0) return -120;
  return Math.max(-120, Math.min(10, (Math.round(value) - 1200) / 10));
}

export function dcaDbToValue(db: number) {
  const clamped = Math.max(-120, Math.min(10, db));
  if (clamped <= -120) return 0;
  return Math.round(1200 + clamped * 10);
}

export function dcaPositionToValue(position: number): number {
  return dcaDbToValue(dcaPositionToDb(position));
}

export function dcaValueToPosition(value: number): number {
  return dcaDbToPosition(dcaValueToDb(value));
}

export function dcaFaderLabel(db: number): string {
  if (db <= -119.95) return "-∞";
  const formatted = db >= 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
  return `${formatted} dB`;
}

export function applyMuteToMember(client: Axios16Client, member: AssignableMemberId, shouldMute: boolean) {
  if (member.startsWith("CH_")) {
    const channel = Number(member.slice(3));
    if (Number.isFinite(channel) && channel >= 1 && channel <= 24) {
      client.setMute(channel, shouldMute);
    }
    return;
  }

  if (member.startsWith("AUX_")) {
    const aux = Number(member.slice(4));
    if (Number.isFinite(aux) && aux >= 1 && aux <= 8) {
      client.setAuxMute(aux, shouldMute);
    }
    return;
  }

  if (member.startsWith("FX_")) {
    const fx = Number(member.slice(3));
    if (Number.isFinite(fx) && (fx === 1 || fx === 2)) {
      client.setFxMute(fx, shouldMute);
    }
    return;
  }

  if (member === "MASTER_L") {
    client.setMasterMute("left", shouldMute);
    return;
  }

  if (member === "MASTER_R") {
    client.setMasterMute("right", shouldMute);
  }
}