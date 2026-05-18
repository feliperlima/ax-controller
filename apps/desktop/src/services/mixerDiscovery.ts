import { invoke } from "@tauri-apps/api/core";

export type MixerSource = "finder" | "manual";
export type MixerStatus = "online" | "unknown";

export type DiscoveredMixer = {
  id: string;
  name: string;
  ip: string;
  model?: string;
  channels?: number;
  status: MixerStatus;
  source: MixerSource;
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
    model: input.model ?? inferred.model,
    channels: input.channels ?? inferred.channels,
    status: input.status ?? "unknown",
    source: input.source ?? "finder",
  };
}

export async function discoverMixers(): Promise<DiscoveredMixer[]> {
  try {
    const response = await invoke<DiscoveredMixer[]>("discover_mixers");
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
