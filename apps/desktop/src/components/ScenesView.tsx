import { useState, useRef } from "react";
import type { Axios16Client } from "../lib/axios16Client";
import type { SceneItem, SceneSlot } from "../protocol/duonn/scenes";
import {
  buildRenameScenePacket,
  createDefaultSceneList,
  normalizeSceneNameToAscii,
} from "../protocol/duonn/scenes";

type ScenesViewProps = {
  client: Axios16Client | null;
  isConnected: boolean;
  cacheScopeKey?: string | null;
  onCallScene: (slot: SceneSlot) => Promise<void> | void;
  onSaveScene: (slot: SceneSlot) => Promise<void> | void;
};

type ConfirmAction =
  | { type: "call"; slot: SceneSlot }
  | { type: "save"; slot: SceneSlot }
  | null;

const SCENE_NAMES_STORAGE_KEY = "ax_scene_names";

function loadStoredScenes(): SceneItem[] {
  const defaults = createDefaultSceneList();

  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = localStorage.getItem(SCENE_NAMES_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return defaults;
    }

    const storedNames = new Map<number, string>();
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const slot = (item as { slot?: unknown }).slot;
      const name = (item as { name?: unknown }).name;
      if (!Number.isInteger(slot) || typeof name !== "string") continue;
      const slotNumber = slot as number;
      if (slotNumber < 1 || slotNumber > 12) continue;
      const trimmed = name.trim();
      if (!trimmed) continue;
      storedNames.set(slotNumber, trimmed);
    }

    return defaults.map((scene) => {
      const storedName = storedNames.get(scene.slot);
      return storedName
        ? { ...scene, name: storedName, isNameLoaded: true }
        : scene;
    });
  } catch {
    return defaults;
  }
}

function persistStoredScenes(scenes: SceneItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = scenes.map((scene) => ({ slot: scene.slot, name: scene.name }));
  localStorage.setItem(SCENE_NAMES_STORAGE_KEY, JSON.stringify(serialized));
}

export function ScenesView({ client, isConnected, cacheScopeKey, onCallScene, onSaveScene }: ScenesViewProps) {
  void cacheScopeKey;
  const [scenes, setScenes] = useState<SceneItem[]>(loadStoredScenes);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [renamingSlot, setRenamingSlot] = useState<SceneSlot | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  function sendRaw(packet: Uint8Array) {
    if (!client) throw new Error("Not connected.");
    client.sendRaw(packet);
  }

  async function handleCall(slot: SceneSlot) {
    if (!client || !isConnected) return;
    try {
      setActionBusy(true);
      await onCallScene(slot);
    } catch (e) {
      console.error("[Scenes] call error:", e);
    } finally {
      setActionBusy(false);
    }
    setConfirmAction(null);
  }

  async function handleSave(slot: SceneSlot) {
    if (!client || !isConnected) return;
    try {
      setActionBusy(true);
      await onSaveScene(slot);
    } catch (e) {
      console.error("[Scenes] save error:", e);
    } finally {
      setActionBusy(false);
    }
    setConfirmAction(null);
  }

  function openRename(slot: SceneSlot) {
    const scene = scenes.find((s) => s.slot === slot);
    setRenamingSlot(slot);
    setRenameValue(scene?.name ?? `Scene ${slot}`);
    setTimeout(() => renameInputRef.current?.select(), 60);
  }

  function commitRename() {
    if (renamingSlot === null || !client || !isConnected) {
      setRenamingSlot(null);
      return;
    }
    const slot = renamingSlot;
    let safeName: string;
    try {
      safeName = normalizeSceneNameToAscii(renameValue);
    } catch {
      setRenamingSlot(null);
      return;
    }

    try {
      sendRaw(buildRenameScenePacket(slot, safeName));
    } catch (e) {
      console.error("[Scenes] rename error:", e);
      setRenamingSlot(null);
      return;
    }

    setScenes((prev) => {
      const next = prev.map((s) =>
        s.slot === slot ? { ...s, name: safeName, isNameLoaded: true } : s
      );
      persistStoredScenes(next);
      return next;
    });
    setRenamingSlot(null);
  }

  return (
    <div className="scenes-view">
      {/* Confirm overlay */}
      {confirmAction !== null && (
        <div className="groups-view__confirm-overlay">
          <div className="groups-view__confirm-dialog">
            {confirmAction.type === "call" ? (
              <>
                <p className="groups-view__confirm-title">
                  Recall Scene {confirmAction.slot}?
                </p>
                <p className="groups-view__confirm-body">
                  Isso irá carregar a cena {confirmAction.slot} no mixer. O estado atual será sobrescrito.
                </p>
                <div className="groups-view__confirm-actions">
                  <button
                    type="button"
                    className="groups-view__action-btn groups-view__action-btn--primary"
                    disabled={actionBusy}
                    onClick={() => handleCall(confirmAction.slot)}
                  >
                    RECALL
                  </button>
                  <button
                    type="button"
                    className="groups-view__action-btn"
                    disabled={actionBusy}
                    onClick={() => setConfirmAction(null)}
                  >
                    CANCELAR
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="groups-view__confirm-title">
                  Save to Scene {confirmAction.slot}?
                </p>
                <p className="groups-view__confirm-body">
                  Isso irá sobrescrever a cena {confirmAction.slot} com o estado atual do mixer.
                </p>
                <div className="groups-view__confirm-actions">
                  <button
                    type="button"
                    className="groups-view__action-btn groups-view__action-btn--primary"
                    disabled={actionBusy}
                    onClick={() => handleSave(confirmAction.slot)}
                  >
                    SALVAR
                  </button>
                  <button
                    type="button"
                    className="groups-view__action-btn"
                    disabled={actionBusy}
                    onClick={() => setConfirmAction(null)}
                  >
                    CANCELAR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rename overlay */}
      {renamingSlot !== null && (
        <div className="groups-view__confirm-overlay">
          <div className="groups-view__confirm-dialog">
            <p className="groups-view__confirm-title">
              Rename Scene {renamingSlot}
            </p>
            <input
              ref={renameInputRef}
              className="scenes-rename-input"
              value={renameValue}
              maxLength={20}
              spellCheck={false}
              autoCapitalize="characters"
              onChange={(e) => setRenameValue(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingSlot(null);
              }}
            />
            <p className="scenes-rename-hint">
              ASCII only · max 20 chars · Enter para confirmar
            </p>
            <div className="groups-view__confirm-actions">
              <button
                type="button"
                className="groups-view__action-btn groups-view__action-btn--primary"
                onClick={commitRename}
              >
                CONFIRMAR
              </button>
              <button
                type="button"
                className="groups-view__action-btn"
                onClick={() => setRenamingSlot(null)}
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="scenes-view__header">
        <p className="groups-view__subtitle">
          Save, recall and rename mixer scenes.
        </p>
        <button
          type="button"
          className="groups-view__action-btn"
          disabled
          title="Import/Export .scn — Coming soon"
        >
          IMPORT / EXPORT ·{" "}
          <span style={{ color: "var(--text-muted)" }}>Coming soon</span>
        </button>
      </div>

      <div className="scenes-grid">
        {scenes.map((scene) => (
          <div key={scene.slot} className="scene-card">
            <div className="scene-card__slot-number">
              {scene.slot < 10 ? `0${scene.slot}` : scene.slot}
            </div>

            <div className="scene-card__name-area">
              <span className="scene-card__name">{scene.name}</span>
              {!scene.isNameLoaded && (
                <span
                  className="scene-card__status"
                  title="Nome local/fallback — não lido da mesa"
                >
                  LOCAL
                </span>
              )}
            </div>

            <div className="scene-card__actions">
              <button
                type="button"
                className="scene-card__btn scene-card__btn--call"
                disabled={!isConnected || actionBusy}
                title={`Recall Scene ${scene.slot}`}
                onClick={() =>
                  setConfirmAction({ type: "call", slot: scene.slot })
                }
              >
                CALL
              </button>
              <button
                type="button"
                className="scene-card__btn scene-card__btn--save"
                disabled={!isConnected || actionBusy}
                title={`Save to Scene ${scene.slot}`}
                onClick={() =>
                  setConfirmAction({ type: "save", slot: scene.slot })
                }
              >
                SAVE
              </button>
              <button
                type="button"
                className="scene-card__btn scene-card__btn--rename"
                disabled={!isConnected}
                title={`Rename Scene ${scene.slot}`}
                onClick={() => openRename(scene.slot)}
              >
                RENAME
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
