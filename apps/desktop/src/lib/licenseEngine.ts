import { isLicenseStateBlocked, type LicenseFormalState, type RuntimeLicenseCache } from "./licenseState";

export type LicenseBootDecision = {
  formalState: LicenseFormalState;
  isBlocked: boolean;
  isValidated: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
}

export function computeNextRevalidationAt(lastValidatedAtIso: string, days = 30): string {
  const validatedAtMs = parseMs(lastValidatedAtIso) ?? Date.now();
  return new Date(validatedAtMs + days * DAY_MS).toISOString();
}

export function resolveBootDecision(cache: RuntimeLicenseCache | null, nowMs = Date.now(), warningDays = 5): LicenseBootDecision {
  if (!cache) {
    return {
      formalState: "LICENSE_NOT_FOUND",
      isBlocked: true,
      isValidated: false,
    };
  }

  let state: LicenseFormalState = cache.cachedState;

  if (cache.licenseType === "trial") {
    const expiryMs = parseMs(cache.trialExpiryAt);
    if (expiryMs !== null && nowMs >= expiryMs) {
      state = "TRIAL_EXPIRED";
    } else if (state !== "TRIAL_EXPIRED") {
      state = "TRIAL_ACTIVE";
    }
  }

  if (cache.licenseType === "purchased") {
    const dueMs = parseMs(cache.nextRevalidationAt);
    if (dueMs !== null) {
      if (nowMs > dueMs) {
        state = "PURCHASED_REVALIDATION_EXPIRED";
      } else {
        const daysUntilDue = Math.ceil((dueMs - nowMs) / DAY_MS);
        if (daysUntilDue <= warningDays) {
          state = "PURCHASED_REVALIDATION_DUE";
        } else if (
          state !== "LICENSE_SUSPENDED" &&
          state !== "LICENSE_REVOKED" &&
          state !== "LICENSE_BLOCKED"
        ) {
          state = "PURCHASED_ACTIVE";
        }
      }
    }
  }

  const blocked = isLicenseStateBlocked(state);

  return {
    formalState: state,
    isBlocked: blocked,
    isValidated: !blocked,
  };
}

export function readRuntimeLicenseCacheFromStorage(storageKey: string): RuntimeLicenseCache | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeLicenseCache>;
    if (
      typeof parsed.installationUuid !== "string" ||
      typeof parsed.licenseKey !== "string" ||
      typeof parsed.licenseType !== "string" ||
      typeof parsed.cachedState !== "string"
    ) {
      return null;
    }

    return {
      installationUuid: parsed.installationUuid,
      licenseKey: parsed.licenseKey,
      licenseType: parsed.licenseType,
      trialExpiryAt: typeof parsed.trialExpiryAt === "string" ? parsed.trialExpiryAt : null,
      lastValidatedAt: typeof parsed.lastValidatedAt === "string" ? parsed.lastValidatedAt : null,
      nextRevalidationAt: typeof parsed.nextRevalidationAt === "string" ? parsed.nextRevalidationAt : null,
      cachedState: parsed.cachedState,
      feedbackMessage: typeof parsed.feedbackMessage === "string" ? parsed.feedbackMessage : "",
      isFounder: typeof parsed.isFounder === "boolean" ? parsed.isFounder : undefined,
      featureFlags: parsed.featureFlags && typeof parsed.featureFlags === "object" && !Array.isArray(parsed.featureFlags)
        ? (parsed.featureFlags as Record<string, boolean>)
        : undefined,
    };
  } catch {
    return null;
  }
}

export function writeRuntimeLicenseCacheToStorage(storageKey: string, cache: RuntimeLicenseCache) {
  localStorage.setItem(storageKey, JSON.stringify(cache));
}

export function clearRuntimeLicenseCacheFromStorage(storageKey: string) {
  localStorage.removeItem(storageKey);
}
