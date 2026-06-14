export type LicenseFormalState =
  | "TRIAL_ACTIVE"
  | "TRIAL_EXPIRED"
  | "PURCHASED_ACTIVE"
  | "PURCHASED_REVALIDATION_DUE"
  | "PURCHASED_REVALIDATION_EXPIRED"
  | "LICENSE_SUSPENDED"
  | "LICENSE_REVOKED"
  | "LICENSE_BLOCKED"
  | "LICENSE_NOT_FOUND";

export type LicenseType = "trial" | "purchased" | "unknown";

export type LinkedUserType = "admin" | "user" | "support" | null;

export type LicenseDevice = {
  deviceId: string;
  deviceName: string;
  devicePlatform: string;
  active: boolean;
};

export type LicenseSnapshot = {
  code: string;
  valid: boolean;
  active: boolean;
  status: string;
  message: string;
  licenseType: LicenseType;
  licenseSeries: string;
  trialExpiryAt: string | null;
  installationUuid: string;
  nextRevalidationAt: string | null;
  activeDevices: number | null;
  remainingActivations: number | null;
  unlimitedActivations: boolean;
  linkedUserType: LinkedUserType;
  devices: LicenseDevice[];
};

export type RuntimeLicenseCache = {
  installationUuid: string;
  licenseKey: string;
  licenseType: LicenseType;
  trialExpiryAt: string | null;
  lastValidatedAt: string | null;
  nextRevalidationAt: string | null;
  cachedState: LicenseFormalState;
  feedbackMessage?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "sim", "ok", "active", "valid"].includes(normalized)) return true;
    if (["0", "false", "no", "nao", "inactive", "invalid", "blocked", "revoked", "suspended"].includes(normalized)) return false;
  }
  return null;
}

export function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const direct = Date.parse(trimmed);
  if (!Number.isNaN(direct)) {
    return new Date(direct).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const withTz = `${trimmed.replace(" ", "T")}Z`;
    const parsed = Date.parse(withTz);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return null;
}

function normalizeLicenseType(value: unknown): LicenseType {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === "trial") return "trial";
  if (normalized === "purchased") return "purchased";
  return "unknown";
}

function normalizePlatformLabel(value: string): string {
  const lower = value.trim().toLowerCase();
  if (!lower || lower === "unknown") return "";
  if (lower.includes("mac") || lower.includes("osx") || lower.includes("darwin")) return "macOS";
  if (lower.includes("win")) return "Windows";
  if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) return "iOS";
  if (lower.includes("android")) return "Android";
  if (lower.includes("linux")) return "Linux";
  return value.trim();
}

function normalizeDevices(value: unknown): LicenseDevice[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = toRecord(item);
      const deviceId =
        toStringValue(record.device_id) ||
        toStringValue(record.uuid) ||
        toStringValue(record.series);
      if (!deviceId) return null;

      return {
        deviceId,
        deviceName: toStringValue(record.device_name) || "Dispositivo",
        devicePlatform: normalizePlatformLabel(toStringValue(record.device_platform)),
        active: toBooleanValue(record.active) !== false,
      };
    })
    .filter((item): item is LicenseDevice => item !== null);
}

export function parseLicenseSnapshot(payload: Record<string, unknown>): LicenseSnapshot {
  const body = toRecord(payload);
  const scoped = toRecord(body.data);
  const license = toRecord(scoped.license && typeof scoped.license === "object" ? scoped.license : body.license);
  const activation = toRecord(
    scoped.activation && typeof scoped.activation === "object" ? scoped.activation : body.activation
  );
  const installation = toRecord(
    scoped.installation && typeof scoped.installation === "object" ? scoped.installation : body.installation
  );
  const revalidation = toRecord(
    scoped.revalidation && typeof scoped.revalidation === "object" ? scoped.revalidation : body.revalidation
  );
  const linkedUser = toRecord(
    scoped.linked_user && typeof scoped.linked_user === "object" ? scoped.linked_user : body.linked_user
  );

  const status = toStringValue(scoped.status) || toStringValue(body.status);
  const code = (toStringValue(scoped.code) || toStringValue(body.code)).toUpperCase();
  const message = toStringValue(scoped.message) || toStringValue(body.message);

  const validValue =
    toBooleanValue(scoped.valid) ??
    toBooleanValue(scoped.is_valid) ??
    toBooleanValue(scoped.license_valid) ??
    toBooleanValue(body.valid) ??
    toBooleanValue(body.is_valid) ??
    toBooleanValue(body.license_valid);

  const activeValue =
    toBooleanValue(scoped.active) ??
    toBooleanValue(scoped.is_active) ??
    toBooleanValue(scoped.license_active) ??
    toBooleanValue(body.active) ??
    toBooleanValue(body.is_active) ??
    toBooleanValue(body.license_active);

  const linkedUserTypeRaw = toStringValue(linkedUser.type).toLowerCase();
  const linkedUserType: LinkedUserType =
    linkedUserTypeRaw === "admin" || linkedUserTypeRaw === "user" || linkedUserTypeRaw === "support"
      ? linkedUserTypeRaw
      : null;
  const linkedUnlimited =
    toBooleanValue(linkedUser.unlimited_activations) ??
    toBooleanValue(scoped.unlimited_activations) ??
    toBooleanValue(body.unlimited_activations);
  const activationUnlimited =
    toBooleanValue(activation.unlimited_activations) ??
    toBooleanValue(scoped.unlimited_activations) ??
    toBooleanValue(body.unlimited_activations);
  const unlimitedActivations =
    linkedUserType === "admin" || linkedUnlimited === true || activationUnlimited === true;

  return {
    code,
    valid: validValue === true,
    active: activeValue !== false,
    status,
    message,
    licenseType: normalizeLicenseType(license.type),
    licenseSeries: toStringValue(license.series),
    trialExpiryAt: normalizeIsoDate(license.expiry_date),
    installationUuid:
      toStringValue(installation.uuid) ||
      toStringValue(scoped.series) ||
      toStringValue(body.series) ||
      toStringValue(scoped.device_id) ||
      toStringValue(body.device_id),
    nextRevalidationAt:
      normalizeIsoDate(revalidation.next_due_at) ||
      normalizeIsoDate(scoped.next_revalidation_at) ||
      normalizeIsoDate(body.next_revalidation_at),
    activeDevices:
      toNumberValue(activation.active_devices) ?? toNumberValue(scoped.active_devices) ?? toNumberValue(body.active_devices),
    remainingActivations:
      unlimitedActivations
        ? null
        : (toNumberValue(activation.remaining_activations) ??
          toNumberValue(scoped.remaining_activations) ??
          toNumberValue(body.remaining_activations)),
    unlimitedActivations,
    linkedUserType,
    devices: normalizeDevices(activation.devices ?? scoped.devices ?? body.devices),
  };
}

export function resolveLicenseFormalState(input: {
  snapshot: LicenseSnapshot | null;
  nowMs?: number;
  warningDays?: number;
  fallbackTrialExpiryAt?: string | null;
  fallbackNextRevalidationAt?: string | null;
}): LicenseFormalState {
  const nowMs = input.nowMs ?? Date.now();
  const warningDays = input.warningDays ?? 5;
  const snapshot = input.snapshot;

  if (!snapshot) return "LICENSE_NOT_FOUND";

  const codeUpper = snapshot.code.toUpperCase();
  const statusLower = snapshot.status.toLowerCase();

  if (codeUpper === "LICENSE_NOT_FOUND") return "LICENSE_NOT_FOUND";
  if (codeUpper === "LICENSE_EXPIRED") return "TRIAL_EXPIRED";
  if (codeUpper === "LICENSE_INACTIVE") return "LICENSE_BLOCKED";
  if (codeUpper === "LICENSE_PENDING") return "LICENSE_BLOCKED";
  if (codeUpper === "ACTIVATION_LIMIT_REACHED") return "LICENSE_BLOCKED";
  if (codeUpper === "LICENSE_REVOKED" || statusLower === "revoked") return "LICENSE_REVOKED";
  if (codeUpper === "LICENSE_SUSPENDED" || statusLower === "suspended") return "LICENSE_SUSPENDED";
  if (codeUpper === "LICENSE_BLOCKED" || statusLower === "blocked") return "LICENSE_BLOCKED";

  if (!snapshot.valid || !snapshot.active) {
    return "LICENSE_BLOCKED";
  }

  const type = snapshot.licenseType;
  if (type === "trial") {
    const expiryIso = snapshot.trialExpiryAt ?? input.fallbackTrialExpiryAt ?? null;
    if (!expiryIso) return "TRIAL_ACTIVE";
    const expiryMs = Date.parse(expiryIso);
    if (Number.isNaN(expiryMs)) return "TRIAL_ACTIVE";
    return nowMs >= expiryMs ? "TRIAL_EXPIRED" : "TRIAL_ACTIVE";
  }

  const dueIso = snapshot.nextRevalidationAt ?? input.fallbackNextRevalidationAt ?? null;
  if (!dueIso) {
    return "PURCHASED_ACTIVE";
  }

  const dueMs = Date.parse(dueIso);
  if (Number.isNaN(dueMs)) {
    return "PURCHASED_ACTIVE";
  }

  if (nowMs > dueMs) {
    return "PURCHASED_REVALIDATION_EXPIRED";
  }

  const daysUntilDue = Math.ceil((dueMs - nowMs) / DAY_MS);
  if (daysUntilDue <= warningDays) {
    return "PURCHASED_REVALIDATION_DUE";
  }

  return "PURCHASED_ACTIVE";
}

export function isLicenseStateBlocked(state: LicenseFormalState): boolean {
  return [
    "TRIAL_EXPIRED",
    "PURCHASED_REVALIDATION_EXPIRED",
    "LICENSE_SUSPENDED",
    "LICENSE_REVOKED",
    "LICENSE_BLOCKED",
    "LICENSE_NOT_FOUND",
  ].includes(state);
}
