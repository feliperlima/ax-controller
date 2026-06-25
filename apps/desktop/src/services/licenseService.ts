import { invoke } from "@tauri-apps/api/core";
import { parseLicenseSnapshot, type LicenseSnapshot } from "../lib/licenseState";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LICENSE_API_BASE_URL = (
  import.meta.env.VITE_LICENSE_API_BASE_URL ?? "https://www.axcontrol.com.br/api"
).trim();

const REGISTER_ENDPOINT_URL = (import.meta.env.VITE_LICENSE_REGISTER_URL ?? "").trim();
const LOGIN_ENDPOINT_URL = (import.meta.env.VITE_LICENSE_LOGIN_URL ?? "").trim();
const ME_ENDPOINT_URL = (import.meta.env.VITE_LICENSE_ME_URL ?? "").trim();
const VALIDATE_ENDPOINT_URL = (import.meta.env.VITE_LICENSE_VALIDATE_URL ?? "").trim();
const STATUS_ENDPOINT_URL = (import.meta.env.VITE_LICENSE_STATUS_URL ?? "").trim();
const REGISTER_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_REGISTER_PATH ?? "register.php").trim();
const LOGIN_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_LOGIN_PATH ?? "login.php").trim();
const ME_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_ME_PATH ?? "auth/me.php").trim();
const VALIDATE_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_VALIDATE_PATH ?? "validate.php").trim();
const STATUS_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_STATUS_PATH ?? "status.php").trim();
export const REVOKE_DEVICE_PATH = (import.meta.env.VITE_LICENSE_REVOKE_DEVICE_PATH ?? "revoke-device.php").trim();
export const REACTIVATE_DEVICE_PATH = (import.meta.env.VITE_LICENSE_REACTIVATE_DEVICE_PATH ?? "reactivate-device.php").trim();
const ACTIVATE_TRIAL_ENDPOINT_URL = (import.meta.env.VITE_LICENSE_ACTIVATE_TRIAL_URL ?? "").trim();
const ACTIVATE_TRIAL_ENDPOINT_PATH = (import.meta.env.VITE_LICENSE_ACTIVATE_TRIAL_PATH ?? "activate-trial.php").trim();

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type RegisterApiResult = {
  snapshot: LicenseSnapshot;
  returnedLicenseKey: string;
  httpStatus: number;
  rawBody: string;
  success: boolean;
  backendMessage: string;
  attemptedUrl: string;
  transportError?: string;
};

export type AuthApiResult = {
  snapshot: LicenseSnapshot;
  returnedLicenseKey: string;
  returnedUserName: string;
  returnedUserEmail: string;
  httpStatus: number;
  rawBody: string;
  success: boolean;
  backendMessage: string;
};

export type RegisterParams = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  installationId: string;
  wantsUpgrade: boolean;
  appVersion?: string;
};

// ---------------------------------------------------------------------------
// Error sentinel helpers
// ---------------------------------------------------------------------------

export function isAppKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as Record<string, unknown>).isAppKeyError === true;
}

export function isSessionExpiredError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as Record<string, unknown>).isSessionExpiredError === true;
}

export function isRateLimitError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as Record<string, unknown>).isRateLimitError === true;
}

export function licenseApiErrorText(err: unknown): string | null {
  if (isAppKeyError(err)) return "Erro de configuração do aplicativo. Por favor, reinstale ou atualize o app.";
  if (isSessionExpiredError(err)) return "Sessão expirada. Faça login novamente.";
  if (isRateLimitError(err)) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return null;
}

// ---------------------------------------------------------------------------
// Payload normalization helpers
// ---------------------------------------------------------------------------

export function normalizeLicenseApiPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const body = payload && typeof payload === "object" ? payload : {};
  const data = body.data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : body;
}

export function buildRegisterSnapshotPayload(
  payload: Record<string, unknown>,
  fallbackInstallationId: string
): Record<string, unknown> {
  const normalized = normalizeLicenseApiPayload(payload);
  const license = normalized.license && typeof normalized.license === "object"
    ? (normalized.license as Record<string, unknown>)
    : null;
  const installation = normalized.installation && typeof normalized.installation === "object"
    ? (normalized.installation as Record<string, unknown>)
    : {};

  const statusValue =
    (license && typeof license.status === "string" ? license.status : "") ||
    (typeof normalized.status === "string" ? normalized.status : "active");
  const statusLower = statusValue.trim().toLowerCase();
  const activeValue = typeof normalized.active === "boolean"
    ? normalized.active
    : statusLower === "active";
  const validValue = typeof normalized.valid === "boolean"
    ? normalized.valid
    : activeValue;

  let codeValue = typeof normalized.code === "string" ? normalized.code : "LICENSE_VALID";
  if (typeof normalized.code !== "string") {
    // Conta sem licença ativa = plano grátis. O servidor manda status="free" (valid/active
    // ausentes → false); sem este mapa o snapshot caía em LICENSE_BLOCKED (bug do cadastro,
    // que tratava conta nova como bloqueada).
    if (statusLower === "free") codeValue = "LICENSE_FREE";
    else if (statusLower === "revoked") codeValue = "LICENSE_REVOKED";
    else if (statusLower === "suspended") codeValue = "LICENSE_SUSPENDED";
    else if (statusLower === "blocked" || statusLower === "inactive" || statusLower === "pending") codeValue = "LICENSE_BLOCKED";
  }

  const resolvedSeries =
    (license && typeof license.series === "string" && license.series.trim()) ||
    (typeof normalized.series === "string" && normalized.series.trim()) ||
    fallbackInstallationId;
  const resolvedType =
    (license && typeof license.type === "string" && license.type.trim()) ||
    (typeof normalized.license_type === "string" && normalized.license_type.trim()) ||
    "unknown";

  return {
    ...normalized,
    code: codeValue,
    status: statusValue,
    valid: validValue,
    active: activeValue,
    license: {
      ...(license ?? {}),
      series: resolvedSeries,
      type: resolvedType,
    },
    activation: {
      active_devices: normalized.active_devices,
      remaining_activations:
        normalized.remaining_activations ??
        (license && typeof license.max_activations !== "undefined" ? license.max_activations : null),
      devices: normalized.devices,
    },
    installation: {
      ...installation,
      uuid:
        (typeof installation.uuid === "string" && installation.uuid.trim()) ||
        (typeof normalized.installation_uuid === "string" && normalized.installation_uuid.trim()) ||
        fallbackInstallationId,
    },
  };
}

export function buildAuthSnapshotPayload(
  payload: Record<string, unknown>,
  fallbackInstallationId: string
): Record<string, unknown> {
  const normalized = normalizeLicenseApiPayload(payload);
  const license = normalized.license && typeof normalized.license === "object"
    ? (normalized.license as Record<string, unknown>)
    : {};
  const activation = normalized.activation && typeof normalized.activation === "object"
    ? (normalized.activation as Record<string, unknown>)
    : {};
  const installation = normalized.installation && typeof normalized.installation === "object"
    ? (normalized.installation as Record<string, unknown>)
    : {};

  const statusValue = typeof normalized.status === "string"
    ? normalized.status
    : (typeof license.status === "string" ? license.status : "active");
  const statusLower = statusValue.trim().toLowerCase();

  const activeValue = typeof normalized.active === "boolean"
    ? normalized.active
    : statusLower === "active";
  const validValue = typeof normalized.valid === "boolean"
    ? normalized.valid
    : activeValue;

  let codeValue = typeof normalized.code === "string" ? normalized.code : "LICENSE_VALID";
  if (typeof normalized.code !== "string") {
    // Conta sem licença ativa = plano grátis. O servidor manda status="free" (valid/active
    // ausentes → false); sem este mapa o snapshot caía em LICENSE_BLOCKED (bug do cadastro,
    // que tratava conta nova como bloqueada).
    if (statusLower === "free") codeValue = "LICENSE_FREE";
    else if (statusLower === "revoked") codeValue = "LICENSE_REVOKED";
    else if (statusLower === "suspended") codeValue = "LICENSE_SUSPENDED";
    else if (statusLower === "blocked" || statusLower === "inactive" || statusLower === "pending") codeValue = "LICENSE_BLOCKED";
  }

  const resolvedSeries =
    (typeof license.series === "string" && license.series.trim()) ||
    (typeof normalized.series === "string" && normalized.series.trim()) ||
    fallbackInstallationId;

  const resolvedUuid =
    (typeof installation.uuid === "string" && installation.uuid.trim()) ||
    (typeof normalized.device_id === "string" && normalized.device_id.trim()) ||
    (typeof normalized.series === "string" && normalized.series.trim()) ||
    fallbackInstallationId;

  const licenseTypeValue =
    (typeof license.type === "string" && license.type.trim()) ||
    (typeof normalized.license_type === "string" && normalized.license_type.trim()) ||
    "unknown";

  return {
    ...normalized,
    code: codeValue,
    status: statusValue,
    valid: validValue,
    active: activeValue,
    license: {
      ...license,
      series: resolvedSeries,
      type: licenseTypeValue,
    },
    activation: {
      ...activation,
      active_devices: activation.active_devices ?? normalized.active_devices,
      remaining_activations: activation.remaining_activations ?? normalized.remaining_activations,
    },
    installation: {
      ...installation,
      uuid: resolvedUuid,
    },
  };
}

export function getBackendMessage(payload: Record<string, unknown>, parsed: Record<string, unknown>) {
  const fromPayload = typeof payload.message === "string" ? payload.message.trim() : "";
  if (fromPayload) return fromPayload;
  const fromParsed = typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (fromParsed) return fromParsed;
  return "";
}

export function buildRegistrationFailureMessage(input: {
  httpStatus: number;
  backendMessage: string;
  rawBody: string;
  transportError?: string;
}) {
  if (input.transportError) {
    return "Não foi possível concluir o cadastro agora. Tente novamente em instantes ou use Entrar se já tiver uma conta.";
  }

  const backendMessage = input.backendMessage.trim();
  const backendMessageLower = backendMessage.toLowerCase();
  if (backendMessage) {
    const looksLikeDuplicateAccount =
      backendMessageLower.includes("já existe") ||
      backendMessageLower.includes("ja existe") ||
      backendMessageLower.includes("already") ||
      backendMessageLower.includes("duplic") ||
      backendMessageLower.includes("e-mail") ||
      backendMessageLower.includes("email");

    if (looksLikeDuplicateAccount) {
      return "Não foi possível concluir o cadastro com estes dados. Se você já possui uma conta, use Entrar para continuar.";
    }

    return backendMessage;
  }

  const rawBody = input.rawBody.trim().toLowerCase();
  const looksLikeHtml = rawBody.startsWith("<!doctype") || rawBody.startsWith("<html") || rawBody.includes("<body");
  if (looksLikeHtml || input.httpStatus === 404) {
    return "Não foi possível concluir o cadastro agora. Se você já possui uma conta, use Entrar para continuar.";
  }

  if (input.httpStatus >= 500) {
    return "Serviço de cadastro indisponível no momento. Tente novamente em instantes.";
  }

  if (input.httpStatus === 429) {
    return "Muitas tentativas em sequência. Aguarde um momento e tente novamente.";
  }

  return "Não foi possível concluir o cadastro agora. Revise os dados e tente novamente. Se você já possui uma conta, use Entrar para continuar.";
}

// ---------------------------------------------------------------------------
// Device / platform utilities
// ---------------------------------------------------------------------------

export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatPhoneWithDddMask(value: string) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return "";

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);

  if (digits.length <= 6) {
    return `(${ddd}) ${number}`;
  }

  if (digits.length <= 10) {
    const first = number.slice(0, 4);
    const last = number.slice(4);
    return `(${ddd}) ${first}${last ? `-${last}` : ""}`;
  }

  const first = number.slice(0, 5);
  const last = number.slice(5, 9);
  return `(${ddd}) ${first}-${last}`;
}

export function getPlatformLabel() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("win")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  return "";
}

export function getDeviceNameLabel() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("mac")) return "Mac";
  if (ua.includes("win")) return "Windows PC";
  if (ua.includes("android")) return "Android Device";
  return "Desktop Device";
}

// ---------------------------------------------------------------------------
// Endpoint resolution helpers
// ---------------------------------------------------------------------------

export function buildLicenseApiUrl(path: string) {
  if (!LICENSE_API_BASE_URL) return "";
  const base = LICENSE_API_BASE_URL.endsWith("/") ? LICENSE_API_BASE_URL.slice(0, -1) : LICENSE_API_BASE_URL;
  let suffix = path.startsWith("/") ? path : `/${path}`;
  // Blindagem: se a base já termina em /api e o path também começa com /api,
  // remove a duplicata (evita .../api/api/... → 404). Vale pra qualquer path/plataforma.
  if (/\/api$/i.test(base)) {
    suffix = suffix.replace(/^\/api(?=\/|$)/i, "");
    if (suffix === "") suffix = "/";
  }
  return `${base}${suffix}`;
}

export function buildLicenseEndpointCandidates(primaryUrl: string, primaryPath: string, fallbackPaths: string[]) {
  const unique = new Set<string>();
  const result: string[] = [];

  if (primaryUrl) {
    const normalizedUrl = primaryUrl.trim();
    if (normalizedUrl) {
      unique.add(normalizedUrl);
      result.push(normalizedUrl);
    }
  }

  for (const rawPath of [primaryPath, ...fallbackPaths]) {
    const path = rawPath.trim();
    if (!path) continue;

    const endpoint = /^https?:\/\//i.test(path) ? path : buildLicenseApiUrl(path);
    if (!endpoint || unique.has(endpoint)) continue;

    unique.add(endpoint);
    result.push(endpoint);
  }

  return result;
}

export function resolveLicenseEndpointUrl(primaryUrl: string, primaryPath: string, fallbackPaths: string[]) {
  const candidates = buildLicenseEndpointCandidates(primaryUrl, primaryPath, fallbackPaths);
  return candidates[0] ?? "";
}

export function buildLocalhostApiCandidates(fileName: string) {
  return [
    `https://www.axcontrol.com.br/api/${fileName}`,
    `https://www.axcontrol.com.br/${fileName}`,
    `/api/${fileName}`,
    `api/${fileName}`,
    fileName,
    `/${fileName}`,
  ];
}

export function resolveDeviceEndpointUrl(phpFile: string): string {
  if (/^https?:\/\//i.test(phpFile)) return phpFile;
  // Roteia tudo pelo builder blindado (única fonte de verdade de URL): aceita path
  // com ou sem /api e nunca duplica. Antes usava .origin e exigia /api no path.
  return buildLicenseApiUrl(phpFile);
}

// ---------------------------------------------------------------------------
// HTTP transport — Tauri (invoke) or browser (fetch)
// ---------------------------------------------------------------------------

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__");
}

function toBrowserUrl(url: string): string {
  // In the browser preview the Vite proxy handles /api/** → axcontrol.com.br.
  // Convert absolute axcontrol.com.br URLs to relative /api/... paths so the
  // proxy intercepts them (avoids CORS entirely).
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "axcontrol.com.br" || parsed.hostname === "www.axcontrol.com.br") {
      return parsed.pathname + parsed.search;
    }
  } catch {
    // already a relative path — fine as-is
  }
  return url;
}

async function fetchLicenseApi(
  method: "GET" | "POST",
  url: string,
  body?: Record<string, unknown>
): Promise<{ statusCode: number; body: Record<string, unknown>; rawBody: string } | null> {
  const proxyUrl = toBrowserUrl(url);
  const appKey = import.meta.env.VITE_AX_APP_KEY ?? "";
  const res = await fetch(proxyUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(appKey ? { "X-AX-App-Key": appKey } : {}),
      "X-App-Version": "1.1.0",
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  const rawBody = await res.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(rawBody); } catch { /* non-JSON response */ }
  return { statusCode: res.status, body: parsed, rawBody };
}

export async function requestLicenseApiViaNative(
  method: "GET" | "POST",
  url: string,
  body?: Record<string, unknown>,
  options: { skipSessionExpiredThrow?: boolean } = {}
): Promise<{ statusCode: number; body: Record<string, unknown>; rawBody: string } | null> {
  if (!url) return null;

  try {
    let response: { statusCode: number; body: Record<string, unknown>; rawBody: string };

    if (isTauriRuntime()) {
      response = await invoke<typeof response>("license_api_request", {
        payload: {
          method,
          url,
          body: method === "POST" ? (body ?? null) : null,
        },
      });
    } else {
      const fetched = await fetchLicenseApi(method, url, body);
      if (!fetched) return null;
      response = fetched;
    }

    if (response.statusCode === 403) {
      throw Object.assign(new Error("APP_KEY_UNAUTHORIZED"), { isAppKeyError: true });
    }
    if (response.statusCode === 401 && !options.skipSessionExpiredThrow) {
      throw Object.assign(new Error("SESSION_EXPIRED"), { isSessionExpiredError: true });
    }
    if (response.statusCode === 429) {
      throw Object.assign(new Error("RATE_LIMIT"), { isRateLimitError: true });
    }

    return response;
  } catch (err) {
    if (isAppKeyError(err) || isSessionExpiredError(err) || isRateLimitError(err)) throw err;
    return null;
  }
}

// ---------------------------------------------------------------------------
// API functions (pure network calls — no React state)
// ---------------------------------------------------------------------------

export async function apiRegisterLicense(params: RegisterParams): Promise<RegisterApiResult | null> {
  if (!params.installationId) return null;

  const endpointCandidates = buildLicenseEndpointCandidates(
    REGISTER_ENDPOINT_URL,
    REGISTER_ENDPOINT_PATH,
    buildLocalhostApiCandidates("register.php")
  );
  if (endpointCandidates.length === 0) return null;

  console.info("[license/register] candidates", endpointCandidates);

  const payloadBody: Record<string, unknown> = {
    name: params.name.trim(),
    email: params.email.trim(),
    phone: normalizePhoneDigits(params.phone),
    password: params.password,
    installation_uuid: params.installationId,
    device_id: params.installationId,
    device_name: getDeviceNameLabel(),
    device_platform: getPlatformLabel(),
    wants_upgrade: params.wantsUpgrade,
    app_version: params.appVersion ?? "",
  };

  const confirm = params.confirmPassword?.trim();
  if (confirm) {
    payloadBody.confirm_password = confirm;
  }

  let lastAttempt: RegisterApiResult | null = null;

  for (const endpoint of endpointCandidates) {
    try {
      const response = await requestLicenseApiViaNative("POST", endpoint, payloadBody, { skipSessionExpiredThrow: true });
      if (!response) {
        lastAttempt = {
          snapshot: parseLicenseSnapshot(buildRegisterSnapshotPayload({}, params.installationId)),
          returnedLicenseKey: "",
          httpStatus: 0,
          rawBody: "",
          success: false,
          backendMessage: "",
          attemptedUrl: endpoint,
          transportError: "Falha nativa ao chamar o endpoint de cadastro.",
        };
        continue;
      }

      const rawText = response.rawBody;
      console.info("[license/register] url", endpoint);
      console.info("[license/register] status", response.statusCode);
      console.info("[license/register] raw", rawText);

      const parsed = response.body;
      const payload = normalizeLicenseApiPayload(parsed);
      const hasRegisterContract =
        (("success" in parsed) || ("success" in payload)) &&
        (typeof parsed.user === "object" || typeof payload.user === "object") &&
        (Object.prototype.hasOwnProperty.call(parsed, "license") || Object.prototype.hasOwnProperty.call(payload, "license"));

      if (!hasRegisterContract) {
        lastAttempt = {
          snapshot: parseLicenseSnapshot(buildRegisterSnapshotPayload(parsed, params.installationId)),
          returnedLicenseKey: "",
          httpStatus: response.statusCode,
          rawBody: rawText,
          success: false,
          backendMessage: getBackendMessage(payload, parsed),
          attemptedUrl: endpoint,
        };
        continue;
      }

      const success = payload.success === true || parsed.success === true;
      const snapshotPayload = buildRegisterSnapshotPayload(parsed, params.installationId);
      const backendMessage = getBackendMessage(payload, parsed);
      const licenseRecord = payload.license && typeof payload.license === "object"
        ? (payload.license as Record<string, unknown>)
        : {};

      const returnedLicenseKey =
        (typeof payload.license_key === "string" && payload.license_key.trim()) ||
        (typeof licenseRecord.license_key === "string" && licenseRecord.license_key.trim()) ||
        "";

      const attempt: RegisterApiResult = {
        snapshot: parseLicenseSnapshot(snapshotPayload),
        returnedLicenseKey,
        httpStatus: response.statusCode,
        rawBody: rawText,
        success,
        backendMessage,
        attemptedUrl: endpoint,
      };

      lastAttempt = attempt;

      if (response.statusCode !== 404) {
        return attempt;
      }
    } catch (error) {
      lastAttempt = {
        snapshot: parseLicenseSnapshot(buildRegisterSnapshotPayload({}, params.installationId)),
        returnedLicenseKey: "",
        httpStatus: 0,
        rawBody: "",
        success: false,
        backendMessage: "",
        attemptedUrl: endpoint,
        transportError: error instanceof Error ? error.message : "Erro de rede ao chamar o cadastro.",
      };
    }
  }

  return lastAttempt;
}

export async function apiLoginLicense(
  email: string,
  password: string,
  installationId: string
): Promise<AuthApiResult | null> {
  const endpoint = resolveLicenseEndpointUrl(
    LOGIN_ENDPOINT_URL,
    LOGIN_ENDPOINT_PATH,
    buildLocalhostApiCandidates("login.php")
  );
  if (!endpoint) return null;

  const response = await requestLicenseApiViaNative("POST", endpoint, {
    email,
    password,
    device_id: installationId,
    device_name: getDeviceNameLabel(),
    device_platform: getPlatformLabel(),
  }, { skipSessionExpiredThrow: true });
  if (!response) return null;

  const rawText = response.rawBody;
  const parsed = response.body;
  const snapshotPayload = buildAuthSnapshotPayload(parsed, installationId);
  const envelope = normalizeLicenseApiPayload(parsed);
  const success = envelope.success === true || parsed.success === true;
  const hasFormalContract =
    success &&
    (typeof envelope.code === "string" || typeof parsed.code === "string") &&
    (typeof envelope.status === "string" || typeof parsed.status === "string") &&
    (typeof envelope.valid === "boolean" || typeof parsed.valid === "boolean") &&
    (typeof envelope.active === "boolean" || typeof parsed.active === "boolean");
  const licenseRecord = envelope.license && typeof envelope.license === "object"
    ? (envelope.license as Record<string, unknown>)
    : {};
  const returnedLicenseKey =
    (typeof envelope.license_key === "string" && envelope.license_key.trim()) ||
    (typeof licenseRecord.license_key === "string" && licenseRecord.license_key.trim()) ||
    "";

  const loginUserProfile = extractUserProfile(parsed);

  return {
    snapshot: parseLicenseSnapshot(snapshotPayload),
    returnedLicenseKey,
    returnedUserName: loginUserProfile.name,
    returnedUserEmail: loginUserProfile.email,
    httpStatus: response.statusCode,
    rawBody: rawText,
    success: hasFormalContract,
    backendMessage: getBackendMessage(envelope, parsed),
  };
}

function extractStringField(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function extractUserProfile(parsed: Record<string, unknown>): { name: string; email: string } {
  const envelope = normalizeLicenseApiPayload(parsed);
  const userObj =
    (envelope.user && typeof envelope.user === "object" ? envelope.user : null) as Record<string, unknown> | null ??
    (parsed.user && typeof parsed.user === "object" ? parsed.user : null) as Record<string, unknown> | null ??
    {} as Record<string, unknown>;

  const name =
    extractStringField(userObj, "name", "full_name", "display_name") ||
    extractStringField(envelope, "name", "user_name") ||
    extractStringField(parsed, "name", "user_name");

  const email =
    extractStringField(userObj, "email") ||
    extractStringField(envelope, "email", "user_email") ||
    extractStringField(parsed, "email", "user_email");

  return { name, email };
}

export async function apiGetMe(installationId: string, licenseKey?: string): Promise<AuthApiResult | null> {
  const endpoint = resolveLicenseEndpointUrl(
    ME_ENDPOINT_URL,
    ME_ENDPOINT_PATH,
    buildLocalhostApiCandidates("auth/me.php")
  );
  if (!endpoint) return null;

  let response: Awaited<ReturnType<typeof requestLicenseApiViaNative>> = null;

  try {
    response = await requestLicenseApiViaNative("GET", endpoint);
  } catch (err) {
    if (!isSessionExpiredError(err)) throw err;
    // 401 on GET — fall through to POST with license_key
  }

  if (!response || response.statusCode >= 400) {
    const postBody: Record<string, unknown> = { device_id: installationId };
    if (licenseKey) {
      // Backend stores license keys as raw hex without separators (e.g. 502ECE92...).
      // Strip any dashes, "AX-" prefix, or other formatting the app may have applied.
      postBody.license_key = licenseKey.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
    }
    try {
      response = await requestLicenseApiViaNative("POST", endpoint, postBody);
    } catch (postErr) {
      if (!isSessionExpiredError(postErr)) throw postErr;
      return null;
    }
  }
  if (!response) return null;

  const rawText = response.rawBody;
  const parsed = response.body;
  const snapshotPayload = buildAuthSnapshotPayload(parsed, installationId);
  const envelope = normalizeLicenseApiPayload(parsed);
  const success = envelope.success === true || parsed.success === true;
  const hasFormalContract =
    success &&
    (typeof envelope.code === "string" || typeof parsed.code === "string") &&
    (typeof envelope.status === "string" || typeof parsed.status === "string") &&
    (typeof envelope.valid === "boolean" || typeof parsed.valid === "boolean") &&
    (typeof envelope.active === "boolean" || typeof parsed.active === "boolean");
  const licenseRecord = envelope.license && typeof envelope.license === "object"
    ? (envelope.license as Record<string, unknown>)
    : {};
  const returnedLicenseKey =
    (typeof envelope.license_key === "string" && envelope.license_key.trim()) ||
    (typeof licenseRecord.license_key === "string" && licenseRecord.license_key.trim()) ||
    "";

  const userProfile = extractUserProfile(parsed);

  return {
    snapshot: parseLicenseSnapshot(snapshotPayload),
    returnedLicenseKey,
    returnedUserName: userProfile.name,
    returnedUserEmail: userProfile.email,
    httpStatus: response.statusCode,
    rawBody: rawText,
    success: hasFormalContract,
    backendMessage: getBackendMessage(envelope, parsed),
  };
}

// Activates the 7-day trial for an account that already exists (registration already
// happened, online, separately). Endpoint not yet implemented backend-side — see
// app-backend-contract-v1.1.0.md.
export async function apiActivateTrial(installationId: string, email = ""): Promise<AuthApiResult | null> {
  const endpoint = resolveLicenseEndpointUrl(
    ACTIVATE_TRIAL_ENDPOINT_URL,
    ACTIVATE_TRIAL_ENDPOINT_PATH,
    buildLocalhostApiCandidates("activate-trial.php")
  );
  if (!endpoint) return null;

  const response = await requestLicenseApiViaNative("POST", endpoint, {
    device_id: installationId,
    ...(email ? { email } : {}),
  });
  if (!response) return null;

  const rawText = response.rawBody;
  const parsed = response.body;
  const snapshotPayload = buildAuthSnapshotPayload(parsed, installationId);
  const envelope = normalizeLicenseApiPayload(parsed);
  const success = envelope.success === true || parsed.success === true;
  const licenseRecord = envelope.license && typeof envelope.license === "object"
    ? (envelope.license as Record<string, unknown>)
    : {};
  const returnedLicenseKey =
    (typeof envelope.license_key === "string" && envelope.license_key.trim()) ||
    (typeof licenseRecord.license_key === "string" && licenseRecord.license_key.trim()) ||
    "";
  const userProfile = extractUserProfile(parsed);

  return {
    snapshot: parseLicenseSnapshot(snapshotPayload),
    returnedLicenseKey,
    returnedUserName: userProfile.name,
    returnedUserEmail: userProfile.email,
    httpStatus: response.statusCode,
    rawBody: rawText,
    success,
    backendMessage: getBackendMessage(envelope, parsed),
  };
}

export async function apiValidateLicense(
  licenseKey: string,
  installationId: string,
  appVersion: string
): Promise<LicenseSnapshot | null> {
  const endpoint = resolveLicenseEndpointUrl(
    VALIDATE_ENDPOINT_URL,
    VALIDATE_ENDPOINT_PATH,
    buildLocalhostApiCandidates("validate.php")
  );
  if (!endpoint) return null;

  const response = await requestLicenseApiViaNative("POST", endpoint, {
    license_key: licenseKey,
    series: installationId,
    device_id: installationId,
    device_name: getDeviceNameLabel(),
    device_platform: getPlatformLabel(),
    platform: getPlatformLabel(),
    app_version: appVersion,
  });
  if (!response) return null;

  const parsed = response.body;
  const payload = normalizeLicenseApiPayload(parsed);

  const hasFormalContract =
    (typeof payload.code === "string" || typeof parsed.code === "string") &&
    (typeof payload.status === "string" || typeof parsed.status === "string") &&
    (typeof payload.valid === "boolean" || typeof parsed.valid === "boolean") &&
    (typeof payload.active === "boolean" || typeof parsed.active === "boolean");
  if (!hasFormalContract) {
    return null;
  }

  return parseLicenseSnapshot(payload);
}

export async function apiGetLicenseStatus(
  licenseKey: string,
  installationId: string,
  includeDevices = true
): Promise<LicenseSnapshot | null> {
  if (!licenseKey || !installationId) return null;

  const endpoint = resolveLicenseEndpointUrl(
    STATUS_ENDPOINT_URL,
    STATUS_ENDPOINT_PATH,
    buildLocalhostApiCandidates("status.php")
  );
  if (!endpoint) return null;

  // POST (corpo JSON) — NUNCA query string: credencial/device fora da URL (logs/proxies).
  // status.php lê php://input com fallback p/ GET/POST, então o corpo basta.
  const response = await requestLicenseApiViaNative("POST", endpoint, {
    license_key: licenseKey,
    series: installationId,
    installation_uuid: installationId,
    device_id: installationId,
    device_name: getDeviceNameLabel(),
    device_platform: getPlatformLabel(),
    include_devices: includeDevices ? "1" : "0",
  });
  if (!response) return null;

  const parsed = response.body;
  const payload = normalizeLicenseApiPayload(parsed);

  const hasAnyLicenseSignal =
    typeof payload.code === "string" ||
    typeof parsed.code === "string" ||
    typeof payload.status === "string" ||
    typeof parsed.status === "string" ||
    typeof payload.license_type === "string" ||
    typeof parsed.license_type === "string" ||
    (payload.license !== null && typeof payload.license === "object") ||
    (parsed.license !== null && typeof parsed.license === "object");
  if (!hasAnyLicenseSignal) {
    return null;
  }

  const normalizedPayload = buildAuthSnapshotPayload(payload, installationId);
  return parseLicenseSnapshot(normalizedPayload);
}

export async function apiDeviceAction(
  phpFile: string,
  licenseKey: string,
  installationId: string,
  targetDeviceId: string
): Promise<{ statusCode: number; body: Record<string, unknown>; rawBody: string } | null> {
  if (!licenseKey || !installationId || !targetDeviceId) return null;

  const endpoint = resolveDeviceEndpointUrl(phpFile);
  if (!endpoint) return null;

  return requestLicenseApiViaNative("POST", endpoint, {
    license_key: licenseKey,
    series: installationId,
    installation_uuid: installationId,
    device_id: targetDeviceId,
    device_name: getDeviceNameLabel(),
    device_platform: getPlatformLabel(),
  });
}
