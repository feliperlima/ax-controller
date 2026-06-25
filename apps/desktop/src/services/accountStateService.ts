/**
 * accountStateService.ts — Cliente do endpoint canônico /api/v1/account/state (Fase B, v1.3.0)
 *
 * Mesmo payload do bootstrap (parseAccountStatePayload), com cache condicional via ETag:
 *  - guarda ETag + último payload no secureStore;
 *  - manda If-None-Match; 304 → reusa o cache local (economiza banda/parse);
 *  - 200 → atualiza cache + ETag.
 *
 * Dual-read: usado SÓ quando a flag `account_state_v1` está ligada; senão o app segue no
 * bootstrap.php (que internamente já usa o mesmo builder server-side). Nunca bloqueia: em
 * erro retorna null e o caller cai no bootstrap.
 */

import {
  requestLicenseApiViaNative,
  buildLicenseApiUrl,
  getPlatformLabel,
} from "./licenseService";
import { parseAccountStatePayload, type BootstrapResult } from "./bootstrapService";
import * as secureStore from "../lib/secureStore";

const ACCOUNT_STATE_PATH = (
  import.meta.env.VITE_ACCOUNT_STATE_PATH ?? "/api/v1/account/state.php"
).trim();

const ETAG_KEY = "ax_account_state_etag";
const CACHE_KEY = "ax_account_state_cache";

export async function fetchAccountState(params: {
  installationId: string;
  appVersion: string;
  buildNumber?: string;
  licenseKey?: string;
}): Promise<BootstrapResult | null> {
  const { installationId, appVersion, buildNumber = "", licenseKey = "" } = params;
  const url = buildLicenseApiUrl(ACCOUNT_STATE_PATH);

  const payload: Record<string, unknown> = {
    device_id: installationId,
    platform: getPlatformLabel().toLowerCase(),
    version: appVersion,
    ...(buildNumber ? { build_number: buildNumber } : {}),
    ...(licenseKey ? { license_key: licenseKey } : {}),
  };

  const etag = secureStore.get(ETAG_KEY);
  const headers = etag ? { "If-None-Match": etag } : undefined;

  try {
    const res = await requestLicenseApiViaNative("POST", url, payload, {
      skipSessionExpiredThrow: true,
      headers,
    });
    if (!res) return null;

    if (res.statusCode === 401 && res.body["code"] === "UNAUTHENTICATED") {
      throw Object.assign(new Error("UNAUTHENTICATED"), { isUnauthenticated: true });
    }

    // 304 → nada mudou: reusa o cache local.
    if (res.statusCode === 304) {
      const cached = secureStore.getJSON<BootstrapResult>(CACHE_KEY);
      return cached ?? null;
    }

    if (res.statusCode >= 400 || !res.body["success"]) return null;

    const result = parseAccountStatePayload(res.body as Record<string, unknown>);
    // Persiste ETag + payload p/ o próximo 304.
    if (res.etag) secureStore.set(ETAG_KEY, res.etag);
    secureStore.setJSON(CACHE_KEY, result);
    return result;
  } catch (err) {
    if ((err as { isUnauthenticated?: boolean })?.isUnauthenticated) throw err;
    return null;
  }
}
