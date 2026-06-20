// Early Access / interesse em features (ex.: Monitor Pessoal).
// Grava interesse na waitlist (estendida) via /api/app/early-access.php.
// Reaproveita o transporte do licenseService (manda X-AX-App-Key e funciona
// em Tauri e no preview web).
import {
  requestLicenseApiViaNative,
  buildLicenseApiUrl,
  getPlatformLabel,
} from "./licenseService";

const EARLY_ACCESS_PATH = (
  import.meta.env.VITE_EARLY_ACCESS_PATH ?? "app/early-access.php"
).trim();

export type EarlyAccessInput = {
  /** Slug da feature; default "personal_monitor". */
  feature?: string;
  name: string;
  email: string;
  /** "operador" | "musico" */
  role?: string;
  mixerModel?: string;
  musicians?: string;
  whatsapp?: string;
  /** Plano atual da conta (free/trial/founder/plus). */
  plan?: string;
  /** De onde veio (ex.: "home_card"). */
  source?: string;
  appVersion: string;
  userId?: number | null;
};

export type EarlyAccessResult =
  | { ok: true; already: boolean }
  | { ok: false; error: string };

export async function submitEarlyAccess(
  input: EarlyAccessInput
): Promise<EarlyAccessResult> {
  const url = buildLicenseApiUrl(EARLY_ACCESS_PATH);
  if (!url) return { ok: false, error: "no_endpoint" };

  const body = {
    feature: input.feature ?? "personal_monitor",
    name: input.name,
    email: input.email,
    role: input.role ?? "",
    mixer_model: input.mixerModel ?? "",
    musicians: input.musicians ?? "",
    whatsapp: input.whatsapp ?? "",
    plan: input.plan ?? "",
    source: input.source ?? "app",
    app_version: input.appVersion,
    platform: getPlatformLabel(),
    user_id: input.userId ?? null,
  };

  try {
    const res = await requestLicenseApiViaNative("POST", url, body, {
      skipSessionExpiredThrow: true,
    });
    if (!res) return { ok: false, error: "network" };
    if (res.statusCode >= 400 || !res.body["success"]) {
      const code = typeof res.body["code"] === "string" ? res.body["code"] : "";
      const msg = typeof res.body["message"] === "string" ? res.body["message"] : "";
      return { ok: false, error: code || msg || `http_${res.statusCode}` };
    }
    return { ok: true, already: Boolean(res.body["already"]) };
  } catch {
    return { ok: false, error: "network" };
  }
}
