/**
 * updateService.ts — Auto-update do desktop (v1.3.0)
 *
 * Máquina de estados offline-first sobre o tauri-plugin-updater:
 *   idle → checking → available → downloading(%) → ready → installing → (relaunch)
 *   (qualquer erro/offline → volta a idle EM SILÊNCIO; nunca trava o app)
 *
 * Regras:
 *  - Só desktop (macOS/Windows). Mobile/web: no-op.
 *  - Atrás de feature flag remota `desktop_auto_update` (kill-switch). Flag off → não roda.
 *  - O check roda em background; ao encontrar update vai para "available" (exibe card).
 *  - Download MANUAL: usuário clica "Baixar" → chama startDownload() → progresso → "ready".
 *  - Install é sempre iniciado pelo usuário (reinicia o app).
 *  - O check NUNCA bloqueia boot nem operação ao vivo (roda ~depois do boot, try/catch).
 */

import { useSyncExternalStore } from "react";
import { getPlatformLabel } from "./licenseService";

export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "installing"
  | "error";

export type UpdateState = {
  phase: UpdatePhase;
  version: string | null;
  percent: number;
  dismissed: boolean;
};

const THROTTLE_MS = 6 * 60 * 60 * 1000;

let state: UpdateState = { phase: "idle", version: null, percent: 0, dismissed: false };
let lastCheckAt = 0;
let inFlight = false;
let pendingUpdate: { version: string; download: (onProgress: (pct: number) => void) => Promise<void>; install: () => Promise<void> } | null = null;

const listeners = new Set<() => void>();

function setState(patch: Partial<UpdateState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUpdateState(): UpdateState {
  return state;
}

function isTauriDesktop(): boolean {
  if (typeof window === "undefined") return false;
  if (!("__TAURI_INTERNALS__" in window)) return false;
  const plat = getPlatformLabel();
  return plat === "macOS" || plat === "Windows";
}

/**
 * Verifica se há atualização. Não-bloqueante e silencioso em erro/offline.
 * Ao encontrar, vai para "available" — download só começa quando o usuário chamar startDownload().
 */
export async function maybeCheckForUpdate(enabled: boolean, force = false): Promise<void> {
  if (!enabled || !isTauriDesktop()) return;
  if (inFlight) return;
  if (state.phase === "available" || state.phase === "downloading" || state.phase === "ready" || state.phase === "installing") return;
  const now = Date.now();
  if (!force && now - lastCheckAt < THROTTLE_MS) return;
  lastCheckAt = now;
  inFlight = true;

  try {
    setState({ phase: "checking" });
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (!update) {
      setState({ phase: "idle", version: null, percent: 0 });
      return;
    }

    const version = update.version;

    pendingUpdate = {
      version,
      download: async (onProgress) => {
        let downloaded = 0;
        let total = 0;
        await update.download((event) => {
          if (event.event === "Started") {
            total = event.data.contentLength ?? 0;
          } else if (event.event === "Progress") {
            downloaded += event.data.chunkLength ?? 0;
            const pct = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
            onProgress(pct);
          }
        });
      },
      install: () => update.install(),
    };

    setState({ phase: "available", version, percent: 0, dismissed: false });
  } catch {
    pendingUpdate = null;
    setState({ phase: "idle", version: null, percent: 0 });
  } finally {
    inFlight = false;
  }
}

/**
 * Inicia o download. Só válido no estado "available".
 * Chamado quando o usuário clica em "Baixar".
 */
export async function startDownload(): Promise<void> {
  if (state.phase !== "available" || !pendingUpdate) return;
  const { version } = pendingUpdate;

  try {
    setState({ phase: "downloading", percent: 0 });
    await pendingUpdate.download((pct) => setState({ percent: pct }));
    setState({ phase: "ready", version, percent: 100 });
  } catch {
    setState({ phase: "available", version, percent: 0 });
  }
}

/**
 * Instala a atualização baixada e reinicia o app. Só válido no estado "ready".
 */
export async function installUpdateNow(): Promise<void> {
  if (state.phase !== "ready" || !pendingUpdate) return;
  try {
    setState({ phase: "installing" });
    await pendingUpdate.install();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch {
    setState({ phase: "ready" });
  }
}

/** Dispensa o banner nesta sessão (reaparece no próximo boot). */
export function dismissUpdateBanner(): void {
  setState({ dismissed: true });
}

/** Hook React: re-renderiza quando o estado de update muda. */
export function useUpdateState(): UpdateState {
  return useSyncExternalStore(subscribe, getUpdateState, getUpdateState);
}
