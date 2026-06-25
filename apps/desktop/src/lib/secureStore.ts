import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Secure Store (Fase A) — credenciais/PII fora do localStorage em plaintext.
//
// No app (Tauri) os valores vivem cifrados em disco, geridos pelo Rust
// (secure_store.bin, XChaCha20-Poly1305). Como vários pontos do app leem esses
// valores de forma SÍNCRONA (useState initializers, etc.), mantemos um espelho
// em memória hidratado UMA vez no boot (antes do render). Leituras são síncronas
// (do espelho); escritas são write-through assíncronas (fila serializada).
//
// No browser (dev/preview, sem Tauri) caímos de volta no localStorage para não
// quebrar o fluxo de desenvolvimento.
// ---------------------------------------------------------------------------

/** Chaves sensíveis (credencial + PII + estado de licença/pagamento) que saem do
 *  localStorage em claro e passam a viver no store cifrado. As demais (DCA, cenas,
 *  IPs de mesa, clipboard, media cache) permanecem no localStorage. */
export const SECURE_STORE_KEYS = [
  "ax_license_key_last",
  "ax_user_email",
  "ax_user_name",
  "ax_license_validated",
  "ax_license_activated_once",
  "ax_license_status",
  "ax_license_runtime_cache_v2",
  "ax_license_devices_cache",
  "ax_pending_trial_activation",
  "ax_pending_pix_payment_id",
  "ax_pix_purchase_confirmed",
  "ax_installation_id",
] as const;

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__");
}

const mirror = new Map<string, string>();
let hydrated = false;
let tauri = false;

// Fila serializada de escritas — evita corrida no read-modify-write do arquivo.
let writeChain: Promise<unknown> = Promise.resolve();
function enqueue(fn: () => Promise<unknown>): Promise<unknown> {
  writeChain = writeChain.then(fn, fn);
  return writeChain;
}

function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeLocalRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/**
 * Carrega o store cifrado para o espelho em memória e faz a MIGRAÇÃO silenciosa
 * das chaves antigas em plaintext do localStorage. Deve ser chamado UMA vez no
 * boot, ANTES de renderizar o app. Idempotente.
 */
export async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  tauri = isTauriRuntime();

  // Fallback web (dev/preview): espelha o localStorage, sem migração.
  if (!tauri) {
    for (const k of SECURE_STORE_KEYS) {
      const v = safeLocalGet(k);
      if (v !== null) mirror.set(k, v);
    }
    return;
  }

  // App: carrega o que já está no store cifrado.
  try {
    const all = await invoke<Record<string, string> | null>("secure_store_load_all");
    if (all) {
      for (const [k, v] of Object.entries(all)) mirror.set(k, v);
    }
  } catch {
    /* store vazio/indisponível — segue p/ migração */
  }

  // Migração silenciosa: copia chaves antigas do localStorage → store cifrado,
  // depois APAGA do localStorage. Copia ANTES de apagar (preserva sessão).
  for (const k of SECURE_STORE_KEYS) {
    if (mirror.has(k)) {
      // Já no store cifrado; garante que não sobrou cópia em claro.
      if (safeLocalGet(k) !== null) safeLocalRemove(k);
      continue;
    }
    const legacy = safeLocalGet(k);
    if (legacy === null) continue;
    try {
      await invoke("secure_store_set", { key: k, value: legacy });
      mirror.set(k, legacy);
      safeLocalRemove(k);
    } catch {
      /* persistência falhou — mantém em localStorage p/ tentar de novo no próximo boot */
    }
  }
}

/** Leitura síncrona (do espelho em memória). */
export function get(key: string): string | null {
  const v = mirror.get(key);
  return v === undefined ? null : v;
}

export function getJSON<T>(key: string): T | null {
  const raw = get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Escrita: atualiza o espelho na hora + persiste async (write-through). */
export function set(key: string, value: string): void {
  mirror.set(key, value);
  if (tauri) {
    void enqueue(() => invoke("secure_store_set", { key, value }).catch(() => {}));
  } else {
    safeLocalSet(key, value);
  }
}

export function setJSON(key: string, value: unknown): void {
  set(key, JSON.stringify(value));
}

export function remove(key: string): void {
  mirror.delete(key);
  if (tauri) {
    void enqueue(() => invoke("secure_store_remove", { key }).catch(() => {}));
  } else {
    safeLocalRemove(key);
  }
}

export const secureStore = { hydrate, get, getJSON, set, setJSON, remove };
export default secureStore;
