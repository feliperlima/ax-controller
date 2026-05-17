import { buildRawDuonnPacket } from "../../lib/axios16Client";

export type SceneSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type SceneItem = {
  slot: SceneSlot;
  name: string;
  isNameLoaded: boolean;
  isDirty?: boolean;
};

export type SceneFile = {
  name: string;
  size: number;
  data: Uint8Array;
};

export const SCENE_CONFIG = {
  totalSlots: 12,
  minSlot: 1,
  maxSlot: 12,
  slotBase: 1,
} as const;

export const SCENE_OPCODES = {
  call: 1,
  readParams: 6,
  rename: 16,
  save: 17,
  readSceneMetadata: 46,
  textCommand: 57,
  exportData: 90,
  importOrExportChunk: 93,
  transferEnd: 106,
} as const;

// Captured on AXIOS16E web UI (SYSTEM/SCENE): CALL uses opcode 1 with no slot payload.
const SCENE_CALL_USES_SLOT_PAYLOAD = false;

export function validateSceneSlot(slot: number): asserts slot is SceneSlot {
  if (!Number.isInteger(slot) || slot < SCENE_CONFIG.minSlot || slot > SCENE_CONFIG.maxSlot) {
    throw new Error(`Invalid scene slot ${slot}. Use ${SCENE_CONFIG.minSlot}..${SCENE_CONFIG.maxSlot}.`);
  }
}

export function createDefaultSceneList(): SceneItem[] {
  return Array.from({ length: SCENE_CONFIG.totalSlots }, (_, index) => {
    const slot = (index + SCENE_CONFIG.slotBase) as SceneSlot;
    return {
      slot,
      name: `Scene ${slot}`,
      isNameLoaded: false,
    };
  });
}

export function normalizeSceneNameToAscii(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();

  if (!normalized) {
    throw new Error("Scene name cannot be empty after ASCII normalization.");
  }

  return normalized;
}

export function buildCallScenePacket(slot: SceneSlot) {
  const payload = SCENE_CALL_USES_SLOT_PAYLOAD ? [slot] : [];
  return buildRawDuonnPacket(SCENE_OPCODES.call, payload);
}

export function buildSaveScenePacket(slot: SceneSlot) {
  return buildRawDuonnPacket(SCENE_OPCODES.save, [slot]);
}

export function buildRenameScenePacket(slot: SceneSlot, sceneName: string) {
  const safeName = normalizeSceneNameToAscii(sceneName);
  const nameBytes = Array.from(new TextEncoder().encode(safeName));
  return buildRawDuonnPacket(SCENE_OPCODES.rename, [slot, ...nameBytes]);
}

export function buildRequestSceneMetadataChunkPacket(index: number) {
  if (!Number.isInteger(index) || index < 0 || index > 255) {
    throw new Error(`Invalid scene metadata chunk index ${index}. Use 0..255.`);
  }

  return buildRawDuonnPacket(SCENE_OPCODES.readSceneMetadata, [index]);
}

export function buildRequestSceneMetadataPackets(range: { start: number; end: number } = { start: 0, end: 59 }) {
  if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 0 || range.end < range.start) {
    throw new Error("Invalid metadata request range.");
  }

  const packets: Uint8Array[] = [];
  for (let index = range.start; index <= range.end; index++) {
    packets.push(buildRequestSceneMetadataChunkPacket(index));
  }
  return packets;
}

export function validateSceneFile(file: SceneFile): boolean {
  return file.size > 0 && file.data.length > 0 && file.name.toLowerCase().endsWith(".scn");
}
