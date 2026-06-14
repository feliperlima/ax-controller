import { invoke } from "@tauri-apps/api/core";

export type MixerSource = "finder" | "manual";
export type MixerStatus = "online" | "unknown";

export type DiscoveredMixer = {
  id: string;
  name: string;
  ip: string;
  macAddress?: string;
  model?: string;
  channels?: number;
  status: MixerStatus;
  source: MixerSource;
};

export type ProfileConfidence = "confirmed" | "inferred" | "manual" | "unknown";

export type KnownMixerEntry = {
  ip: string;
  port: number;
  mac?: string;
  channelCount: 16 | 24 | 32;
  name?: string;
  lastSeenAt: number;
  lastConnectedAt: number;
  source: "discovery" | "manual" | "cache";
  confidence: ProfileConfidence;
  cacheScopeKey: string;
};

const DEFAULT_MIXER_NAME = "Mixer Axios";

function inferMixerMetadata(name: string) {
  const normalized = name.trim().toUpperCase();
  const axiosMatch = normalized.match(/AXIOS\s*(\d+)([A-Z0-9_-]*)/i);

  if (axiosMatch) {
    const channels = Number(axiosMatch[1]);

    return {
      model: normalized,
      channels: Number.isFinite(channels) ? channels : undefined,
    };
  }

  if (normalized.includes("AXIOS32")) {
    return {
      model: "Axios 32",
      channels: 32,
    };
  }

  if (normalized.includes("AXIOS16E")) {
    return {
      model: "AXIOS16E",
      channels: 16,
    };
  }

  if (normalized.includes("AXIOS16")) {
    return {
      model: "Axios 16",
      channels: 16,
    };
  }

  return {
    model: undefined,
    channels: undefined,
  };
}

function normalizeMixer(input: Partial<DiscoveredMixer> & { ip: string; name?: string }): DiscoveredMixer {
  const cleanIp = input.ip.trim();
  const cleanName = input.name?.trim() || DEFAULT_MIXER_NAME;
  const inferred = inferMixerMetadata(cleanName);

  return {
    id: input.id?.trim() || `${input.source ?? "finder"}:${cleanIp}`,
    name: cleanName,
    ip: cleanIp,
    macAddress: input.macAddress,
    model: input.model ?? inferred.model,
    channels: input.channels ?? inferred.channels,
    status: input.status ?? "unknown",
    source: input.source ?? "finder",
  };
}

const LAST_CONNECTED_MIXER_IP_KEY = "last_connected_mixer_ip";
const RECENT_CONNECTED_MIXERS_IPS_KEY = "recent_connected_mixer_ips";
const MAX_RECENT_IPS = 5;
const KNOWN_MIXERS_STORAGE_KEY = "ax_known_mixers";
const MAX_KNOWN_MIXERS = 10;

function normalizePrivateIp(ip: string): string | null {
  const normalized = ip.trim();
  if (!normalized) return null;

  const octets = normalized.split(".");
  if (octets.length !== 4) return null;

  const numbers = octets.map((part) => Number(part));
  if (numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return null;
  }

  const [a, b] = numbers;
  const isPrivate =
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);

  return isPrivate ? normalized : null;
}

function readRememberedMixerIps(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const deduped = new Map<string, true>();

  try {
    const current = localStorage.getItem(LAST_CONNECTED_MIXER_IP_KEY);
    const normalized = current ? normalizePrivateIp(current) : null;
    if (normalized) deduped.set(normalized, true);
  } catch {
    // Ignore storage failures in restricted environments.
  }

  try {
    const rawRecent = localStorage.getItem(RECENT_CONNECTED_MIXERS_IPS_KEY);
    if (rawRecent) {
      const parsed = JSON.parse(rawRecent) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((value) => {
          if (typeof value !== "string") return;
          const normalized = normalizePrivateIp(value);
          if (normalized) deduped.set(normalized, true);
        });
      }
    }
  } catch {
    // Ignore malformed cache.
  }

  return Array.from(deduped.keys()).slice(0, MAX_RECENT_IPS);
}

function isKnownMixerEntry(value: unknown): value is KnownMixerEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ip === "string" &&
    typeof v.channelCount === "number" &&
    typeof v.lastConnectedAt === "number" &&
    typeof v.confidence === "string" &&
    typeof v.cacheScopeKey === "string"
  );
}

export function readKnownMixers(): KnownMixerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KNOWN_MIXERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isKnownMixerEntry);
  } catch {
    return [];
  }
}

export function saveKnownMixer(entry: KnownMixerEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readKnownMixers().filter((m) => m.ip !== entry.ip);
    const next = [entry, ...existing].slice(0, MAX_KNOWN_MIXERS);
    localStorage.setItem(KNOWN_MIXERS_STORAGE_KEY, JSON.stringify(next));
    // Mantém keys legadas sincronizadas para compatibilidade com readRememberedMixerIps
    localStorage.setItem(LAST_CONNECTED_MIXER_IP_KEY, entry.ip);
    const recentIps = next.map((m) => m.ip);
    localStorage.setItem(RECENT_CONNECTED_MIXERS_IPS_KEY, JSON.stringify(recentIps));
  } catch {
    // Ignorar falhas de storage.
  }
}

export function readKnownMixerByIp(ip: string): KnownMixerEntry | undefined {
  const normalized = ip.trim();
  return readKnownMixers().find((m) => m.ip === normalized);
}

export function rememberConnectedMixerIp(ip: string) {
  const normalizedIp = normalizePrivateIp(ip);
  if (!normalizedIp) return;

  try {
    localStorage.setItem(LAST_CONNECTED_MIXER_IP_KEY, normalizedIp);

    const current = readRememberedMixerIps().filter((value) => value !== normalizedIp);
    const next = [normalizedIp, ...current].slice(0, MAX_RECENT_IPS);
    localStorage.setItem(RECENT_CONNECTED_MIXERS_IPS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export async function discoverMixers(fullScan = false): Promise<DiscoveredMixer[]> {
  try {
    const legacyIps = readRememberedMixerIps();
    const knownIps = readKnownMixers().map((m) => m.ip);
    const seen = new Set<string>();
    const preferredIps: string[] = [];
    for (const ip of [...knownIps, ...legacyIps]) {
      if (!seen.has(ip)) {
        seen.add(ip);
        preferredIps.push(ip);
      }
    }
    const response = await invoke<DiscoveredMixer[]>("discover_mixers", {
      preferredIps: preferredIps.length > 0 ? preferredIps : undefined,
      fullScan: fullScan || undefined,
    });
    const deduped = new Map<string, DiscoveredMixer>();

    response.forEach((mixer) => {
      const normalized = normalizeMixer({ ...mixer, source: mixer.source ?? "finder" });
      deduped.set(normalized.ip, normalized);
    });

    return Array.from(deduped.values());
  } catch {
    return [];
  }
}
