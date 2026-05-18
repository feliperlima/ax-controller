const BASE = {
  hiZ: 64, phantom: 65, gateEnabled: 66, gateThreshold: 67, gateAttack: 69, gateDecay: 70, gateHold: 71,
  gain: 72, phase: 73, mute: 74, pan: 75, fader: 76, soloL: 87, soloR: 88, compEnabled: 93,
  compRatio: 94, compAttack: 95, compRelease: 96, compThreshold: 97, compGain: 99, 
  eqEnabled: 100, hpfTypeSlope: 102, hpfFreq: 103, lpfTypeSlope: 104, lpfFreq: 105,
  eqBand1Freq: 107, eqBand1Gain: 108, eqBand1Q: 109, eqBand2Freq: 111, eqBand2Gain: 112, eqBand2Q: 113,
  eqBand3Freq: 115, eqBand3Gain: 116, eqBand3Q: 117, eqBand4Freq: 119, eqBand4Gain: 120, eqBand4Q: 121,
};

const CHANNEL_STRIDE = 62;
const CHANNEL_COLOR_BASE = 3110;

const AUX_RANGES = [
  { name: "AUX 1", start: 1676, end: 1784 },
  { name: "AUX 2", start: 1785, end: 1893 },
  { name: "AUX 3", start: 1894, end: 2002 },
  { name: "AUX 4", start: 2003, end: 2111 },
  { name: "AUX 5", start: 2112, end: 2220 },
  { name: "AUX 6", start: 2221, end: 2329 },
  { name: "AUX 7", start: 2330, end: 2437 }, // Note: skip 2438 as aux 8 fader?
  { name: "AUX 8", start: 2438, end: 2547 },
];

const MASTER_RANGES = [
  { name: "MASTER L", start: 2548, end: 2656 },
  { name: "MASTER R", start: 2657, end: 2765 },
];

const FX_RANGES = [
  { name: "FX 1", start: 2899, end: 2943 },
  { name: "FX 2", start: 2944, end: 2988 },
];

const COLOR_PARAMS = [
  { name: "FX Color", start: 3136, end: 3137 },
  { name: "Master Color", start: 3146, end: 3147 },
];

function analyze(N) {
  const channelParams = [];
  for (let ch = 1; ch <= N; ch++) {
    for (const [key, base] of Object.entries(BASE)) {
      const p = base + (ch - 1) * CHANNEL_STRIDE;
      channelParams.push({ ch, key, p });
    }
    channelParams.push({ ch, key: "color", p: CHANNEL_COLOR_BASE + ch - 1 });
  }

  const minP = Math.min(...channelParams.map(cp => cp.p));
  const maxP = Math.max(...channelParams.map(cp => cp.p));

  const collisions = [];
  const allKnown = [...AUX_RANGES, ...MASTER_RANGES, ...FX_RANGES, ...COLOR_PARAMS];

  for (const cp of channelParams) {
    for (const kr of allKnown) {
      if (cp.p >= kr.start && cp.p <= kr.end) {
        collisions.push({ cp, kr });
      }
    }
  }

  console.log(`\n--- Análise para N=${N} ---`);
  console.log(`Range de parâmetros de canal: ${minP} até ${maxP}`);

  if (collisions.length === 0) {
    console.log("Nenhuma colisão encontrada.");
  } else {
    console.log(`Encontradas ${collisions.length} colisões!`);
    const sorted = collisions.sort((a,b) => a.cp.p - b.cp.p);
    const examples = sorted.slice(0, 10);
    examples.forEach(c => {
      console.log(`- Param ${c.cp.p}: Ch ${c.cp.ch} ${c.cp.key} <=> ${c.kr.name}`);
    });
    if (collisions.length > 10) console.log(`... e mais ${collisions.length - 10} colisões.`);
  }
}

[16, 24, 32].forEach(analyze);
