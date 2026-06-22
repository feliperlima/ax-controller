// RTA — utilitários do espectro (analisador atrás da curva do EQ, estilo FabFilter).
//
// Este módulo é PURO e agnóstico de fonte: as funções de path servem tanto pro
// protótipo (dados simulados, abaixo) quanto pro dado real da mesa (op 0x46, addr 00 1f)
// quando o rtaAdapter for plugado. Ver docs/rta-implementation-brief.md.

/** 31 bandas de 1/3 de oitava (centros ISO), 20 Hz → 20 kHz — o que o AX32 entrega. */
export const THIRD_OCTAVE_CENTERS_HZ: readonly number[] = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
  12500, 16000, 20000,
];

export const RTA_BAND_COUNT = THIRD_OCTAVE_CENTERS_HZ.length; // 31

type Point = { x: number; y: number };

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Spline cúbica monotônica (Fritsch–Carlson) → string de path SVG (curva aberta).
 * Monotônica evita overshoot abaixo de 0 / acima dos picos — fica suave sem "estourar".
 */
export function spectrumLinePath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${r(points[0].x)} ${r(points[0].y)}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }

  const tan: number[] = new Array(n);
  tan[0] = slope[0];
  tan[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      tan[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tan[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }

  let d = `M ${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = points[i].x + dx[i] / 3;
    const c1y = points[i].y + (tan[i] * dx[i]) / 3;
    const c2x = points[i + 1].x - dx[i] / 3;
    const c2y = points[i + 1].y - (tan[i + 1] * dx[i]) / 3;
    d += ` C ${r(c1x)} ${r(c1y)}, ${r(c2x)} ${r(c2y)}, ${r(points[i + 1].x)} ${r(points[i + 1].y)}`;
  }
  return d;
}

/** Mesma spline, fechada até `baseY` → área preenchida (sem borda dura). */
export function spectrumAreaPath(points: Point[], baseY: number): string {
  if (points.length < 2) return "";
  const line = spectrumLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${r(last.x)} ${r(baseY)} L ${r(first.x)} ${r(baseY)} Z`;
}

// ---------------------------------------------------------------------------
// PROTÓTIPO — dados simulados (apenas pra aprovar o look do espectro).
// NÃO é dado real da mesa. Quando o rtaAdapter (op 0x46) for plugado, troca-se
// a fonte por `() => rtaAdapter.latestFrame()` e isto sai. Determinístico no
// tempo (sem random) → a suavização fica por conta da balística (peak/decay).
// ---------------------------------------------------------------------------
const g = (lf: number, center: number, w: number) =>
  Math.exp(-Math.pow((lf - center) / w, 2));

/** Frame simulado "musical": kick pulsando, vocal varrendo e brilho nos agudos. */
export function simulateSpectrumFrame(tMs: number): number[] {
  const t = tMs / 1000;
  const out = new Array<number>(RTA_BAND_COUNT);
  const swell = 0.62 + 0.38 * Math.sin(t * 0.5); // respiração geral da "música"
  const voxCenter = 2.6 + 0.5 * Math.sin(t * 0.35); // formante varrendo 300 Hz–3 kHz

  for (let i = 0; i < RTA_BAND_COUNT; i += 1) {
    const lf = Math.log10(THIRD_OCTAVE_CENTERS_HZ[i]); // ~1.3 .. 4.3
    const body = g(lf, 2.5, 1.05) * swell; // corpo pink-ish (200 Hz–1 kHz)
    const kick = g(lf, 1.85, 0.28) * (0.45 + 0.55 * Math.pow(Math.max(0, Math.sin(t * 2 * Math.PI * 1.7)), 2));
    const vox = g(lf, voxCenter, 0.33) * (0.5 + 0.5 * Math.sin(t * 1.3 + 1));
    const air = g(lf, 3.95, 0.5) * (0.3 + 0.7 * Math.abs(Math.sin(t * 4 + i)));
    const shimmer = 0.05 * Math.sin(t * 9 + i * 1.7) + 0.04 * Math.sin(t * 13.3 + i * 0.6);

    let v = 0.12 + 0.42 * body + 0.4 * kick + 0.36 * vox + 0.26 * air + shimmer;
    v *= 1 - 0.18 * Math.max(0, lf - 3.3); // rolloff gentil no topo
    out[i] = Math.max(0, Math.min(1, v));
  }
  return out;
}
