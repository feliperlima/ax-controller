const CHANNEL_STRIDE = 62;
const CHANNEL_COLOR_BASE = 3110;

const CHANNEL_BASE_PARAMS = [
  64, 65, 66, 67, 69, 70, 71, 72, 73, 74, 75, 76,
  77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 90,
  93, 94, 95, 96, 97, 99, 100, 102, 103, 104, 105,
  107, 108, 109, 111, 112, 113, 115, 116, 117, 119, 120, 121,
];

const AUX_BLOCK_STARTS = [1676, 1785, 1894, 2003, 2112, 2221, 2330, 2438];
const AUX_BLOCK_SIZE = 109;
const MASTER_RANGE = [2548, 2679];
const FX_RANGES = [
  [2899, 2912],
  [2944, 2957],
];
const FX_COLORS = [3136, 3137];
const MASTER_COLORS = [3146, 3147];

function buildChannelParams(channelCount) {
  const params = new Set();

  for (let channel = 1; channel <= channelCount; channel += 1) {
    const offset = (channel - 1) * CHANNEL_STRIDE;

    for (const base of CHANNEL_BASE_PARAMS) {
      params.add(base + offset);
    }

    params.add(CHANNEL_COLOR_BASE + channel - 1);
  }

  return params;
}

function buildReservedParamOrigins() {
  const origins = new Map();

  for (const start of AUX_BLOCK_STARTS) {
    for (let offset = 0; offset < AUX_BLOCK_SIZE; offset += 1) {
      const param = start + offset;
      if (!origins.has(param)) origins.set(param, []);
      origins.get(param).push("AUX");
    }
  }

  for (let param = MASTER_RANGE[0]; param <= MASTER_RANGE[1]; param += 1) {
    if (!origins.has(param)) origins.set(param, []);
    origins.get(param).push("MASTER");
  }

  for (const [start, end] of FX_RANGES) {
    for (let param = start; param <= end; param += 1) {
      if (!origins.has(param)) origins.set(param, []);
      origins.get(param).push("FX");
    }
  }

  for (const param of FX_COLORS) {
    if (!origins.has(param)) origins.set(param, []);
    origins.get(param).push("FX_COLOR");
  }

  for (const param of MASTER_COLORS) {
    if (!origins.has(param)) origins.set(param, []);
    origins.get(param).push("MASTER_COLOR");
  }

  return origins;
}

function channelRange(channelCount) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let channel = 1; channel <= channelCount; channel += 1) {
    const offset = (channel - 1) * CHANNEL_STRIDE;

    for (const base of CHANNEL_BASE_PARAMS) {
      const param = base + offset;
      min = Math.min(min, param);
      max = Math.max(max, param);
    }

    const colorParam = CHANNEL_COLOR_BASE + channel - 1;
    min = Math.min(min, colorParam);
    max = Math.max(max, colorParam);
  }

  return { min, max };
}

function analyze(channelCount, reservedOrigins) {
  const params = buildChannelParams(channelCount);
  const collisions = [];

  for (const param of params) {
    if (reservedOrigins.has(param)) {
      collisions.push({ param, origins: reservedOrigins.get(param) });
    }
  }

  collisions.sort((a, b) => a.param - b.param);

  return {
    channelCount,
    range: channelRange(channelCount),
    collisions,
  };
}

const reservedOrigins = buildReservedParamOrigins();
const targets = [16, 24, 32];

for (const n of targets) {
  const result = analyze(n, reservedOrigins);
  const header = `N=${result.channelCount} | range=${result.range.min}..${result.range.max}`;

  if (result.collisions.length === 0) {
    console.log(`${header} | collisions=0`);
    continue;
  }

  console.log(`${header} | collisions=${result.collisions.length}`);
  const sample = result.collisions.slice(0, 8);
  sample.forEach((item) => {
    console.log(`  - param ${item.param}: ${item.origins.join(",")}`);
  });
}
