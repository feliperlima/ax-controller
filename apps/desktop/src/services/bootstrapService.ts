import {
  requestLicenseApiViaNative,
  buildLicenseApiUrl,
  getPlatformLabel,
} from "./licenseService";

export type BootstrapFeatureFlags = Record<string, boolean>;

export type BootstrapMessage = {
  key: string;
  title: string | null;
  body: string;
  severity: "info" | "warning" | "error" | "critical";
  channel: "banner" | "toast" | "modal" | "inline";
  cta_label: string | null;
  cta_url: string | null;
};

export type BootstrapVersionInfo = {
  update_type: "none" | "optional" | "recommended" | "required";
  current_version: string;
  latest_version: string;
  download_url: string | null;
  message: string | null;
};

export type BootstrapLicense = {
  status: string;
  plan: string;
  plan_label: string;
  trial_expires_at: string | null;
  days_remaining: number | null;
  expires_at: string | null;
  max_devices: number;
  active_devices: number;
};

export type BootstrapCertificate = {
  needs_renewal: boolean;
  valid_until: string | null;
  /** JWT token — present when newly issued/renewed */
  token: string | null;
  sig_v: number | null;
  reason?: string;
};

export type BootstrapUser = {
  id: number;
  name: string;
  email: string;
  is_founder: boolean;
};

export type BootstrapResult = {
  user: BootstrapUser | null;
  license: BootstrapLicense | null;
  certificate: BootstrapCertificate | null;
  feature_flags: BootstrapFeatureFlags;
  messages: BootstrapMessage[];
  version: BootstrapVersionInfo | null;
  public_key: string | null;
  maintenance: { active: boolean; message: string | null };
  server_time: string | null;
};

const BOOTSTRAP_PATH = (
  import.meta.env.VITE_BOOTSTRAP_PATH ?? "/api/app/bootstrap.php"
).trim();

export async function fetchBootstrap(params: {
  installationId: string;
  appVersion: string;
  buildNumber?: string;
}): Promise<BootstrapResult | null> {
  const { installationId, appVersion, buildNumber = "" } = params;

  const platform = getPlatformLabel();
  const base = buildLicenseApiUrl(BOOTSTRAP_PATH);

  const qs = new URLSearchParams({
    device_id: installationId,
    platform,
    version: appVersion,
    ...(buildNumber ? { build_number: buildNumber } : {}),
  });

  const url = `${base}?${qs.toString()}`;

  try {
    const res = await requestLicenseApiViaNative("GET", url);
    if (!res || res.statusCode >= 400 || !res.body["success"]) return null;

    const b = res.body as Record<string, unknown>;

    const flags: BootstrapFeatureFlags = {};
    const rawFlags = b["feature_flags"];
    if (rawFlags && typeof rawFlags === "object") {
      for (const [k, v] of Object.entries(rawFlags as Record<string, unknown>)) {
        flags[k] = Boolean(v);
      }
    }

    const messages: BootstrapMessage[] = [];
    if (Array.isArray(b["messages"])) {
      for (const m of b["messages"] as Record<string, unknown>[]) {
        if (typeof m["body"] === "string") {
          messages.push({
            key: String(m["key"] ?? ""),
            title: typeof m["title"] === "string" ? m["title"] : null,
            body: m["body"],
            severity: (["info", "warning", "error", "critical"].includes(String(m["severity"])) ? m["severity"] : "info") as BootstrapMessage["severity"],
            channel: (["banner", "toast", "modal", "inline"].includes(String(m["channel"])) ? m["channel"] : "toast") as BootstrapMessage["channel"],
            cta_label: typeof m["cta_label"] === "string" ? m["cta_label"] : null,
            cta_url: typeof m["cta_url"] === "string" ? m["cta_url"] : null,
          });
        }
      }
    }

    const rawVer = b["version"] as Record<string, unknown> | null | undefined;
    const version: BootstrapVersionInfo | null = rawVer && typeof rawVer === "object" ? {
      update_type: (["none", "optional", "recommended", "required"].includes(String(rawVer["update_type"])) ? rawVer["update_type"] : "none") as BootstrapVersionInfo["update_type"],
      current_version: String(rawVer["current_version"] ?? ""),
      latest_version: String(rawVer["latest_version"] ?? ""),
      download_url: typeof rawVer["download_url"] === "string" ? rawVer["download_url"] : null,
      message: typeof rawVer["message"] === "string" ? rawVer["message"] : null,
    } : null;

    const rawLic = b["license"] as Record<string, unknown> | null | undefined;
    const license: BootstrapLicense | null = rawLic && typeof rawLic === "object" ? {
      status: String(rawLic["status"] ?? "free"),
      plan: String(rawLic["plan"] ?? "free"),
      plan_label: String(rawLic["plan_label"] ?? ""),
      trial_expires_at: typeof rawLic["trial_expires_at"] === "string" ? rawLic["trial_expires_at"] : null,
      days_remaining: typeof rawLic["days_remaining"] === "number" ? rawLic["days_remaining"] : null,
      expires_at: typeof rawLic["expires_at"] === "string" ? rawLic["expires_at"] : null,
      max_devices: typeof rawLic["max_devices"] === "number" ? rawLic["max_devices"] : 1,
      active_devices: typeof rawLic["active_devices"] === "number" ? rawLic["active_devices"] : 0,
    } : null;

    const rawUser = b["user"] as Record<string, unknown> | null | undefined;
    const user: BootstrapUser | null = rawUser && typeof rawUser === "object" ? {
      id: Number(rawUser["id"] ?? 0),
      name: String(rawUser["name"] ?? ""),
      email: String(rawUser["email"] ?? ""),
      is_founder: Boolean(rawUser["is_founder"]),
    } : null;

    const rawCert = b["certificate"] as Record<string, unknown> | null | undefined;
    const certificate: BootstrapCertificate | null = rawCert && typeof rawCert === "object" ? {
      needs_renewal: Boolean(rawCert["needs_renewal"]),
      valid_until: typeof rawCert["valid_until"] === "string" ? rawCert["valid_until"] : null,
      token: typeof rawCert["token"] === "string" && rawCert["token"] ? rawCert["token"] : null,
      sig_v: typeof rawCert["sig_v"] === "number" ? rawCert["sig_v"] : null,
      reason: typeof rawCert["reason"] === "string" ? rawCert["reason"] : undefined,
    } : null;

    const rawMaint = b["maintenance"] as Record<string, unknown> | null | undefined;

    return {
      user,
      license,
      certificate,
      feature_flags: flags,
      messages,
      version,
      public_key: typeof b["public_key"] === "string" ? b["public_key"] : null,
      maintenance: {
        active: Boolean(rawMaint?.["active"]),
        message: typeof rawMaint?.["message"] === "string" ? rawMaint["message"] : null,
      },
      server_time: typeof b["server_time"] === "string" ? b["server_time"] : null,
    };
  } catch {
    return null;
  }
}
