/**
 * updateService.ts — Auto-update do desktop (v1.3.0)
 *
 * Máquina de estados offline-first sobre o tauri-plugin-updater:
 *   idle → checking → downloading(%) → ready → installing → (relaunch)
 *   (qualquer erro/offline → volta a idle EM SILÊNCIO; nunca trava o app)
 *
 * Regras (decididas com o fundador):
 *  - Só desktop (macOS/Windows). Mobile/web: no-op.
 *  - Atrás de feature flag remota `desktop_auto_update` (kill-switch). Flag off → não roda
 *    (cai no banner manual de versão, que continua funcionando via bootstrap).
 *  - Download em BACKGROUND ao detectar update; quando pronto, banner "Instalar agora".
 *  - Re-check no boot: sempre baixa a versão que o servidor declara latest (resolve o caso
 *    "lançou outra versão e o usuário não instalou" — nunca instala obsoleta).
 *  - O check NUNCA bloqueia boot nem operação ao vivo (roda ~depois do boot, try/catch).
 *  - Install é sempre iniciado pelo usuário (reinicia o app); o caller confirma se estiver
 *    conectado a uma mesa.
 */

import { useSyncExternalStore } from "react";
import { getPlatformLabel } from "./licenseService";

export type UpdatePhase =
  | "idle"
  | "checking"
  | "downloading"
  | "ready"
  | "installing"
  | "error";

export type UpdateState = {
  phase: UpdatePhase;
  /** versão nova disponível/baixada (ex.: "1.3.0") */
  version: string | null;
  /** progresso de download 0–100 */
  percent: number;
  /** dispensado nesta sessão (some o banner; reaparece no próximo boot) */
  dismissed: boolean;
};

const THROTTLE_MS = 6 * 60 * 60 * 1000; // 6h entre checagens de foreground

let state: UpdateState = { phase: "idle", version: null, percent: 0, dismissed: false };
let lastCheckAt = 0;
let inFlight = false;
// Guarda o objeto Update entre download() e install() (dentro da mesma sessão).
let pendingUpdate: { version: string; install: () => Promise<void> } | null = null;

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
  if (!("__TAURI_INTERNALS__" in window)) return false; // web/dev
  const plat = getPlatformLabel();
  return plat === "macOS" || plat === "Windows";
}

/**
 * Verifica/baixa atualização. Não-bloqueante e silencioso em erro/offline.
 * @param enabled  resultado da feature flag `desktop_auto_update` (do bootstrap/account-state)
 * @param force    ignora o throttle (usar no boot)
 */
export async function maybeCheckForUpdate(enabled: boolean, force = false): Promise<void> {
  if (!enabled || !isTauriDesktop()) return;
  if (inFlight) return;
  // Já temos algo pronto/baixando → não re-checa.
  if (state.phase === "ready" || state.phase === "downloading" || state.phase === "installing") return;
  const now = Date.now();
  if (!force && now - lastCheckAt < THROTTLE_MS) return;
  lastCheckAt = now;
  inFlight = true;

  try {
    setState({ phase: "checking" });
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (!update) {
      // Já está na última.
      setState({ phase: "idle", version: null, percent: 0 });
      return;
    }

    const version = update.version;
    setState({ phase: "downloading", version, percent: 0, dismissed: false });

    let downloaded = 0;
    let total = 0;
    await update.download((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength ?? 0;
        const pct = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
        setState({ percent: pct });
      }
    });

    pendingUpdate = { version, install: () => update.install() };
    setState({ phase: "ready", version, percent: 100 });
  } catch {
    // Offline-first: erro/offline não vira nada visível (cai no banner manual via flag/version).
    pendingUpdate = null;
    setState({ phase: "idle", version: null, percent: 0 });
  } finally {
    inFlight = false;
  }
}

/**
 * Instala a atualização baixada e reinicia o app. Só válido no estado "ready".
 * O caller é responsável por confirmar se houver mesa conectada (reinicia o app).
 */
export async function installUpdateNow(): Promise<void> {
  if (state.phase !== "ready" || !pendingUpdate) return;
  try {
    setState({ phase: "installing" });
    await pendingUpdate.install();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch {
    // Falhou ao instalar → volta a "ready" pra permitir nova tentativa (ou fallback manual).
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
