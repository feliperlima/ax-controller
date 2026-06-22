import { requestLicenseApiViaNative, buildLicenseApiUrl } from "./licenseService";

const QUEUE_KEY = "ax_telemetry_queue_v1";
const IEM_SENT_KEY = "ax_iem_interest_sent";
const RTA_PROBE_SENT_KEY = "ax_rta_probe_models_v1";
const TELEMETRY_PATH = "app/telemetry.php";

export type TelemetryEventType = "console_connected" | "iem_interest" | "rta_probe";

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ── Fila local (offline buffer) ────────────────────────────────────────────

function readQueue(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: TelemetryEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // sandbox sem localStorage — silencia
  }
}

function addToQueue(evt: TelemetryEvent): void {
  const queue = readQueue();
  // iem_interest: dedup local
  if (evt.type === "iem_interest" && queue.some((e) => e.type === "iem_interest")) return;
  // rta_probe: dedup por modelo
  if (
    evt.type === "rta_probe" &&
    queue.some((e) => e.type === "rta_probe" && e.metadata?.model === evt.metadata?.model)
  )
    return;
  queue.push(evt);
  writeQueue(queue);
}

// ── Estado persistido do IEM ────────────────────────────────────────────────

/** True se o interesse IEM já foi registrado (enviado ao servidor ou na fila). */
export function iemInterestAlreadyRegistered(): boolean {
  if (localStorage.getItem(IEM_SENT_KEY) === "1") return true;
  return readQueue().some((e) => e.type === "iem_interest");
}

function rtaProbeSentModels(): string[] {
  try {
    const raw = localStorage.getItem(RTA_PROBE_SENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markRtaProbeSent(model: string): void {
  if (!model) return;
  const next = Array.from(new Set([...rtaProbeSentModels(), model]));
  try {
    localStorage.setItem(RTA_PROBE_SENT_KEY, JSON.stringify(next));
  } catch {
    // sandbox sem localStorage — silencia
  }
}

/** True se o probe de RTA desse modelo já foi registrado (enviado ou na fila). */
export function rtaProbeAlreadyRegistered(model: string): boolean {
  if (rtaProbeSentModels().includes(model)) return true;
  return readQueue().some((e) => e.type === "rta_probe" && e.metadata?.model === model);
}

// ── Envio ao servidor ───────────────────────────────────────────────────────

async function sendEvents(
  licenseKey: string,
  events: TelemetryEvent[]
): Promise<boolean> {
  if (events.length === 0) return true;
  if (!licenseKey) return false; // sem key → enfileira; envia no flush (bootstrap, já com key)

  const url = buildLicenseApiUrl(TELEMETRY_PATH);
  try {
    const res = await requestLicenseApiViaNative(
      "POST",
      url,
      { license_key: licenseKey, events },
      { skipSessionExpiredThrow: true }
    );
    // só 2xx conta como enviado; 4xx/5xx (404, app-key, etc) → reentra na fila e tenta no próximo flush
    return res !== null && res.statusCode >= 200 && res.statusCode < 300;
  } catch {
    return false; // sem internet
  }
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Registra um evento de telemetria.
 * Quando online: envia imediatamente ao servidor.
 * Quando offline: guarda na fila local; será enviado no próximo flush (bootstrap).
 */
export async function trackEvent(
  licenseKey: string,
  type: TelemetryEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const evt: TelemetryEvent = { type, timestamp: new Date().toISOString(), metadata };
  const model = typeof metadata?.model === "string" ? metadata.model : "";

  // dedup de eventos "uma vez só"
  if (type === "iem_interest" && iemInterestAlreadyRegistered()) return;
  if (type === "rta_probe" && rtaProbeAlreadyRegistered(model)) return;

  const sent = await sendEvents(licenseKey, [evt]);

  if (sent) {
    if (type === "iem_interest") localStorage.setItem(IEM_SENT_KEY, "1");
    if (type === "rta_probe") markRtaProbeSent(model);
    // garante que não fica duplicado na fila caso tenha caído lá antes
    const queue = readQueue().filter((e) => e.type !== type || type !== "iem_interest");
    writeQueue(queue);
  } else {
    // offline: enfileira para o próximo flush
    addToQueue(evt);
  }
}

/**
 * Flush da fila offline. Chamado pelo runBootstrap quando há internet.
 * Nunca lança — nunca deve bloquear o bootstrap.
 */
export async function flushTelemetryQueue(licenseKey: string): Promise<void> {
  if (!licenseKey) return;
  const queue = readQueue();
  if (queue.length === 0) return;

  const sent = await sendEvents(licenseKey, queue);
  if (sent) {
    if (queue.some((e) => e.type === "iem_interest")) {
      localStorage.setItem(IEM_SENT_KEY, "1");
    }
    queue
      .filter((e) => e.type === "rta_probe")
      .forEach((e) => markRtaProbeSent(typeof e.metadata?.model === "string" ? e.metadata.model : ""));
    writeQueue([]);
  }
  // se falhou (5xx/sem rede): mantém na fila para próxima tentativa
}
