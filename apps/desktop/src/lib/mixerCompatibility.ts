import type { DiscoveredMixer } from "../services/mixerDiscovery";

type MixerCompatibility = {
  supported: boolean;
  reason: string;
};

const CHANNEL_STRIDE = 62;
const CHANNEL_COLOR_BASE = 3110;
const FX_COLOR_PARAMS = [3136, 3137];
const MASTER_COLOR_PARAMS = [3146, 3147];
const AUX_BLOCK_STARTS = [1676, 1785, 1894, 2003, 2112, 2221, 2330, 2438];
const AUX_BLOCK_SIZE = 109;
const MASTER_RANGE: [number, number] = [2548, 2679];
const FX_RANGES: Array<[number, number]> = [
  [2899, 2912],
  [2944, 2957],
];

const CHANNEL_BASE_PARAMS = [
  64, 65, 66, 67, 69, 70, 71, 72, 73, 74, 75, 76,
  77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 90,
  93, 94, 95, 96, 97, 99, 100, 102, 103, 104, 105,
  107, 108, 109, 111, 112, 113, 115, 116, 117, 119, 120, 121,
];

function buildReservedParams() {
  const params = new Set<number>();

  for (const start of AUX_BLOCK_STARTS) {
    for (let offset = 0; offset < AUX_BLOCK_SIZE; offset += 1) {
      params.add(start + offset);
    }
  }

  for (let param = MASTER_RANGE[0]; param <= MASTER_RANGE[1]; param += 1) {
    params.add(param);
  }

  for (const [start, end] of FX_RANGES) {
    for (let param = start; param <= end; param += 1) {
      params.add(param);
    }
  }

  FX_COLOR_PARAMS.forEach((param) => params.add(param));
  MASTER_COLOR_PARAMS.forEach((param) => params.add(param));

  return params;
}

const RESERVED_PARAMS = buildReservedParams();

function findChannelParamCollisions(channelCount: number) {
  const collisions: number[] = [];

  for (let channel = 1; channel <= channelCount; channel += 1) {
    const channelOffset = (channel - 1) * CHANNEL_STRIDE;

    for (const baseParam of CHANNEL_BASE_PARAMS) {
      const param = baseParam + channelOffset;
      if (RESERVED_PARAMS.has(param)) {
        collisions.push(param);
      }
    }

    const channelColorParam = CHANNEL_COLOR_BASE + channel - 1;
    if (RESERVED_PARAMS.has(channelColorParam)) {
      collisions.push(channelColorParam);
    }
  }

  return collisions;
}

export function getMixerCompatibility(mixer: DiscoveredMixer): MixerCompatibility {
  const channelCount = mixer.channels;

  if (!channelCount || channelCount <= 0) {
    return {
      supported: true,
      reason: "",
    };
  }

  // Mixers de 32 canais usam mapa AX32 dedicado e nao devem ser
  // validados pelas faixas reservadas de AX16/AX24.
  if (channelCount >= 32) {
    return {
      supported: true,
      reason: "",
    };
  }

  const collisions = findChannelParamCollisions(channelCount);
  if (collisions.length > 0) {
    const firstCollision = collisions[0];
    return {
      supported: false,
      reason: `Modelo com ${channelCount} canais nao suportado no mapa atual (colisao de parametro em ${firstCollision}).`,
    };
  }

  return {
    supported: true,
    reason: "",
  };
}
