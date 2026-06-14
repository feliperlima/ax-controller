import type { UniversalRawParamStore } from "./universalRawParamStore";
import type { Axios16Client } from "./axios16Client";
import {
  getMemberBit,
  isMappedGroupMember,
  hasBit,
  setBit,
  clearBit,
  type GroupMember,
} from "../protocol/duonn/bitmask";
import {
  getDcaMemberParams,
  getMuteGroupMemberParams,
  type DcaGroupId,
  type MuteGroupId,
} from "../protocol/duonn/groups";
import { getDcaIdsForChannelCount, getMuteIdsForChannelCount } from "./groupControls";
import {
  resolveChannelParam,
  resolveAuxParam,
  type MixerModel,
} from "../protocol/duonn/protocolAddressing";

export const CLIPBOARD_STORAGE_KEY = "ax_clipboard_v1";

// Channel block stride per model (base is derived from resolveChannelParam)
const CH_STRIDE: Record<MixerModel, number> = { AX16: 62, AX24: 62, AX32: 72 };

// AUX stride is the same for all models
const AUX_STRIDE = 109;

export type ClipboardModel = MixerModel;

export type ChannelClipboardSnapshot = {
  type: "channel";
  model: ClipboardModel;
  channelCount: number;
  sourceIndex: number;
  sourceLabel: string;
  copiedAt: number;
  blockBase: number;
  blockSize: number;
  blockValues: number[];     // -1 = param not in store at copy time
  dcaMembership: boolean[];  // indexed by DCA slot (0-based)
  muteGroupMembership: boolean[];
};

export type AuxClipboardSnapshot = {
  type: "aux";
  model: ClipboardModel;
  channelCount: number;
  sourceIndex: number;
  sourceLabel: string;
  copiedAt: number;
  blockBase: number;
  blockSize: number;
  blockValues: number[];
  dcaMembership: boolean[];
  muteGroupMembership: boolean[];
};

export type MixerClipboardSnapshot = ChannelClipboardSnapshot | AuxClipboardSnapshot;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function channelToMember(n: number): GroupMember {
  return `CH_${n}` as GroupMember;
}

function auxToMember(n: number): GroupMember {
  return `AUX_${n}` as GroupMember;
}

function readBlockValues(
  blockBase: number,
  blockSize: number,
  rawParamStore: UniversalRawParamStore
): number[] {
  return Array.from({ length: blockSize }, (_, i) => rawParamStore.getRawParam(blockBase + i)?.value ?? -1);
}

function readMembership(
  member: GroupMember,
  rawParamStore: UniversalRawParamStore,
  channelCount: number
): { dcaMembership: boolean[]; muteGroupMembership: boolean[] } {
  if (!isMappedGroupMember(member)) {
    return { dcaMembership: [], muteGroupMembership: [] };
  }

  const srcBit = getMemberBit(member);

  const dcaMembership = getDcaIdsForChannelCount(channelCount).map((id) => {
    const params = getDcaMemberParams(id);
    const word = rawParamStore.getRawParam(params[srcBit.wordIndex])?.value ?? 0;
    return hasBit(word, srcBit.bit);
  });

  const muteGroupMembership = getMuteIdsForChannelCount(channelCount).map((id) => {
    const params = getMuteGroupMemberParams(id);
    const word = rawParamStore.getRawParam(params[srcBit.wordIndex])?.value ?? 0;
    return hasBit(word, srcBit.bit);
  });

  return { dcaMembership, muteGroupMembership };
}

function applyGroupMembership(
  srcMembership: boolean[],
  dstMember: GroupMember,
  rawParamStore: UniversalRawParamStore,
  client: Axios16Client,
  getParams: (id: number) => readonly number[]
): void {
  if (!isMappedGroupMember(dstMember)) return;

  const dstBit = getMemberBit(dstMember);

  srcMembership.forEach((shouldBeMember, idx) => {
    const params = getParams(idx + 1);
    const wordAddr = params[dstBit.wordIndex];
    if (wordAddr === undefined) return;

    const current = rawParamStore.getRawParam(wordAddr)?.value ?? 0;
    const next = shouldBeMember ? setBit(current, dstBit.bit) : clearBit(current, dstBit.bit);
    if (next !== current) client.sendParam(wordAddr, next);
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function buildChannelSnapshot(
  channelNumber: number,
  rawParamStore: UniversalRawParamStore,
  model: ClipboardModel,
  channelCount: number
): ChannelClipboardSnapshot {
  const stride = CH_STRIDE[model];
  // channelIndex is 0-based; resolveChannelParam(model, idx, 0) gives block base
  const channelIndex = channelNumber - 1;
  const blockBase = resolveChannelParam(model, channelIndex, 0);
  const blockValues = readBlockValues(blockBase, stride, rawParamStore);
  const member = channelToMember(channelNumber);
  const { dcaMembership, muteGroupMembership } = readMembership(member, rawParamStore, channelCount);

  return {
    type: "channel",
    model,
    channelCount,
    sourceIndex: channelNumber,
    sourceLabel: `CH ${channelNumber}`,
    copiedAt: Date.now(),
    blockBase,
    blockSize: stride,
    blockValues,
    dcaMembership,
    muteGroupMembership,
  };
}

export function buildAuxSnapshot(
  auxNumber: number,
  rawParamStore: UniversalRawParamStore,
  model: ClipboardModel,
  channelCount: number
): AuxClipboardSnapshot {
  // resolveAuxParam(model, auxNumber, 0) gives AUX block base (auxNumber is 1-based)
  const blockBase = resolveAuxParam(model, auxNumber, 0);
  const blockValues = readBlockValues(blockBase, AUX_STRIDE, rawParamStore);
  const member = auxToMember(auxNumber);
  const { dcaMembership, muteGroupMembership } = readMembership(member, rawParamStore, channelCount);

  return {
    type: "aux",
    model,
    channelCount,
    sourceIndex: auxNumber,
    sourceLabel: `AUX ${auxNumber}`,
    copiedAt: Date.now(),
    blockBase,
    blockSize: AUX_STRIDE,
    blockValues,
    dcaMembership,
    muteGroupMembership,
  };
}

export function applyChannelPaste(
  snapshot: ChannelClipboardSnapshot,
  targetChannel: number,
  client: Axios16Client,
  rawParamStore: UniversalRawParamStore,
  model: ClipboardModel
): void {
  const channelIndex = targetChannel - 1;
  const dstBase = resolveChannelParam(model, channelIndex, 0);
  const pairs: Array<{ param: number; value: number }> = [];

  for (let offset = 0; offset < snapshot.blockSize; offset++) {
    const value = snapshot.blockValues[offset];
    if (value === undefined || value === -1) continue;
    pairs.push({ param: dstBase + offset, value });
  }

  if (pairs.length > 0) client.sendParamBatch(pairs);

  const dstMember = channelToMember(targetChannel);
  applyGroupMembership(snapshot.dcaMembership, dstMember, rawParamStore, client, (id) =>
    getDcaMemberParams(id as DcaGroupId)
  );
  applyGroupMembership(snapshot.muteGroupMembership, dstMember, rawParamStore, client, (id) =>
    getMuteGroupMemberParams(id as MuteGroupId)
  );
}

export function applyAuxPaste(
  snapshot: AuxClipboardSnapshot,
  targetAux: number,
  client: Axios16Client,
  rawParamStore: UniversalRawParamStore,
  model: ClipboardModel
): void {
  const dstBase = resolveAuxParam(model, targetAux, 0);
  const pairs: Array<{ param: number; value: number }> = [];

  for (let offset = 0; offset < snapshot.blockSize; offset++) {
    const value = snapshot.blockValues[offset];
    if (value === undefined || value === -1) continue;
    pairs.push({ param: dstBase + offset, value });
  }

  if (pairs.length > 0) client.sendParamBatch(pairs);

  const dstMember = auxToMember(targetAux);
  applyGroupMembership(snapshot.dcaMembership, dstMember, rawParamStore, client, (id) =>
    getDcaMemberParams(id as DcaGroupId)
  );
  applyGroupMembership(snapshot.muteGroupMembership, dstMember, rawParamStore, client, (id) =>
    getMuteGroupMemberParams(id as MuteGroupId)
  );
}

export function isClipboardCompatible(
  snapshot: MixerClipboardSnapshot,
  model: ClipboardModel | "unknown",
  channelCount: number
): boolean {
  if (model === "unknown") return false;
  const snapshotIsAx32 = snapshot.model === "AX32";
  const currentIsAx32 = model === "AX32";
  return snapshotIsAx32 === currentIsAx32 && snapshot.channelCount === channelCount;
}

export function serializeClipboard(snapshot: MixerClipboardSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeClipboard(raw: string): MixerClipboardSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as MixerClipboardSnapshot;
    if (parsed.type !== "channel" && parsed.type !== "aux") return null;
    if (!parsed.model || !Array.isArray(parsed.blockValues)) return null;
    return parsed;
  } catch {
    return null;
  }
}
