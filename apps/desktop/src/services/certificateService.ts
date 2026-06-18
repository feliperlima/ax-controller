import { invoke } from "@tauri-apps/api/core";
import { requestLicenseApiViaNative } from "./licenseService";

export type CertificateStatus =
  | "valid"
  | "expired"
  | "invalid"
  | "device_mismatch"
  | "unknown_key_version"
  | "not_found";

export type CertificateValidationResult = {
  status: CertificateStatus;
  plan: string | null;
  expiresAt: number | null; // Unix timestamp seconds
};

export async function getOrCreateDeviceId(existingId?: string | null): Promise<string> {
  return invoke<string>("get_or_create_device_id", {
    existingId: existingId?.trim() || null,
  });
}

export async function validateCertificate(
  serverTimeUnix?: number | null,
): Promise<CertificateValidationResult> {
  return invoke<CertificateValidationResult>("validate_certificate", {
    serverTimeUnix: serverTimeUnix ?? null,
  });
}

export async function storeCertificate(jwt: string): Promise<void> {
  return invoke("store_certificate", { jwt });
}

export async function loadCertificate(): Promise<string | null> {
  return invoke<string | null>("load_certificate");
}

export async function cachePublicKey(sigV: number, keyBase64url: string): Promise<void> {
  return invoke("cache_public_key", { sigV, keyBase64url });
}

// ── Certificate API helpers ──────────────────────────────────────────────────

const CERT_ISSUE_PATH = (
  import.meta.env.VITE_CERT_ISSUE_PATH ?? "/api/certificate/issue.php"
).trim();

const CERT_RENEW_PATH = (
  import.meta.env.VITE_CERT_RENEW_PATH ?? "/api/certificate/renew.php"
).trim();

export async function issueCertificateFromApi(
  licenseKey: string,
  installationId: string,
  appVersion: string,
): Promise<string | null> {
  try {
    const result = await requestLicenseApiViaNative("POST", CERT_ISSUE_PATH, {
      license_key: licenseKey,
      device_id: installationId,
      app_version: appVersion,
    });
    if (!result || result.statusCode >= 400) return null;
    const jwt = result.body["token"] ?? result.body["certificate"] ?? null;
    return typeof jwt === "string" && jwt.trim().length > 0 ? jwt.trim() : null;
  } catch {
    return null;
  }
}

export async function renewCertificateFromApi(
  licenseKey: string,
  installationId: string,
): Promise<string | null> {
  try {
    const result = await requestLicenseApiViaNative("POST", CERT_RENEW_PATH, {
      license_key: licenseKey,
      device_id: installationId,
    });
    if (!result || result.statusCode >= 400) return null;
    const jwt = result.body["token"] ?? result.body["certificate"] ?? null;
    return typeof jwt === "string" && jwt.trim().length > 0 ? jwt.trim() : null;
  } catch {
    return null;
  }
}

export async function issueCertificateAndStore(
  licenseKey: string,
  installationId: string,
  appVersion: string,
): Promise<boolean> {
  const jwt = await issueCertificateFromApi(licenseKey, installationId, appVersion);
  if (!jwt) return false;
  await storeCertificate(jwt);
  return true;
}

export async function renewCertificateAndStore(
  licenseKey: string,
  installationId: string,
): Promise<boolean> {
  const jwt = await renewCertificateFromApi(licenseKey, installationId);
  if (!jwt) return false;
  await storeCertificate(jwt);
  return true;
}

export function daysUntilExpiry(expiresAtSecs: number | null): number | null {
  if (expiresAtSecs === null) return null;
  const nowSecs = Math.floor(Date.now() / 1000);
  return Math.ceil((expiresAtSecs - nowSecs) / 86400);
}
