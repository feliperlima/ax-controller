import {
  type SceneFile,
  type SceneItem,
  type SceneSlot,
  buildCallScenePacket,
  buildRenameScenePacket,
  buildRequestSceneMetadataChunkPacket,
  buildRequestSceneMetadataPackets,
  buildSaveScenePacket,
  createDefaultSceneList,
  normalizeSceneNameToAscii,
  validateSceneFile,
  validateSceneSlot,
} from "../../protocol/duonn/scenes";

export type DuonnRawSender = (packet: Uint8Array) => void | Promise<void>;

export class DuonnScenesService {
  private sceneItems: SceneItem[] = createDefaultSceneList();

  constructor(private readonly sendRaw: DuonnRawSender) {}

  getSceneList() {
    return this.sceneItems.map((item) => ({ ...item }));
  }

  createDefaultSceneList() {
    return createDefaultSceneList();
  }

  async callScene(slot: SceneSlot): Promise<void> {
    validateSceneSlot(slot);
    await this.sendRaw(buildCallScenePacket(slot));
    // TODO(protocol): app web triggers opcode 6 mass refresh after call; wire optional post-call sync without side effects.
  }

  async saveScene(slot: SceneSlot): Promise<void> {
    validateSceneSlot(slot);
    await this.sendRaw(buildSaveScenePacket(slot));
    // TODO(protocol): add save acknowledgment handling if firmware returns explicit success/failure packet.
  }

  async renameScene(slot: SceneSlot, name: string): Promise<void> {
    validateSceneSlot(slot);
    const safeName = normalizeSceneNameToAscii(name);
    await this.sendRaw(buildRenameScenePacket(slot, safeName));

    this.sceneItems = this.sceneItems.map((scene) =>
      scene.slot === slot
        ? { ...scene, name: safeName, isNameLoaded: true }
        : scene
    );
    // TODO(protocol): replace optimistic update with ack-based update once rename response mapping is confirmed.
  }

  async requestSceneMetadata(): Promise<void> {
    const packets = buildRequestSceneMetadataPackets();
    for (const packet of packets) {
      await this.sendRaw(packet);
    }
    // TODO(protocol): decode opcode 46 metadata response blocks (observed sequence 0..59) into slot names.
  }

  async requestSceneMetadataChunk(index: number): Promise<void> {
    await this.sendRaw(buildRequestSceneMetadataChunkPacket(index));
    // TODO(protocol): parser for single chunk response format is not mapped yet.
  }

  async refreshSceneList(): Promise<void> {
    await this.requestSceneMetadata();
    // TODO(protocol): merge decoded metadata into sceneItems once chunk parser is implemented.
  }

  async readSceneFileFromDisk(): Promise<SceneFile> {
    throw new Error(
      "TODO(protocol): map project-specific file picker flow for .scn import (Tauri dialog/filesystem integration)."
    );
  }

  validateSceneFile(file: SceneFile): boolean {
    return validateSceneFile(file);
  }

  async importSceneFile(file: SceneFile): Promise<void> {
    if (!this.validateSceneFile(file)) {
      throw new Error("Invalid .scn file.");
    }

    // TODO(protocol): map full .scn import transfer protocol.
    // TODO(protocol): identify whether opcode 93 is chunk ack/request.
    // TODO(protocol): identify transfer commit/finalization behavior.
    throw new Error("TODO(protocol): .scn import is experimental and not implemented.");
  }

  async exportSceneToFile(slot: SceneSlot): Promise<void> {
    validateSceneSlot(slot);
    // TODO(protocol): map full .scn export transfer protocol.
    // TODO(protocol): identify whether opcode 90 is export data request, data chunk, or transfer command.
    // TODO(protocol): identify whether opcode 106 is transfer end/commit.
    throw new Error("TODO(protocol): .scn export is experimental and not implemented.");
  }
}
