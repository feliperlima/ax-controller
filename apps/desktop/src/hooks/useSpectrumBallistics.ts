import { useEffect, useRef, useState } from "react";

// Balística do espectro (RTA) — dá o movimento "de plugin" sem piscar:
// sobe rápido (attack) e cai devagar (decay), com peak-hold que escorrega lentamente.
// É agnóstica de fonte: recebe um `sample()` que devolve as bandas cruas (0..1).
// Hoje a fonte é o simulado (protótipo); depois vira `() => rtaAdapter.latestFrame()`.

export type SpectrumFrame = { levels: number[]; peaks: number[] };

type Options = {
  /** fração de aproximação ao alvo por frame quando SOBE (0..1). */
  attack?: number;
  /** quanto cai por frame quando o alvo está abaixo (0..1). */
  decay?: number;
  /** quanto o peak-hold escorrega por frame (0..1). */
  peakDecay?: number;
  /** intervalo mínimo entre re-renders, em ms (~30 fps). */
  throttleMs?: number;
};

const EMPTY: SpectrumFrame = { levels: [], peaks: [] };

export function useSpectrumBallistics(
  sample: () => number[] | null,
  active: boolean,
  { attack = 0.5, decay = 0.045, peakDecay = 0.006, throttleMs = 33 }: Options = {}
): SpectrumFrame {
  const [frame, setFrame] = useState<SpectrumFrame>(EMPTY);

  // refs pra não recriar o loop a cada render e não ler closures velhas.
  const sampleRef = useRef(sample);
  sampleRef.current = sample;
  const levelsRef = useRef<number[]>([]);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    if (!active) {
      levelsRef.current = [];
      peaksRef.current = [];
      setFrame(EMPTY);
      return;
    }

    let running = true;
    let rafId = 0;
    let lastEmit = 0;

    const tick = (ts: number) => {
      const raw = sampleRef.current();
      const L = levelsRef.current;
      const P = peaksRef.current;
      let changed = false;

      if (raw && raw.length) {
        if (L.length !== raw.length) {
          levelsRef.current = raw.slice();
          peaksRef.current = raw.slice();
        } else {
          for (let i = 0; i < raw.length; i += 1) {
            const target = raw[i];
            L[i] = target > L[i] ? L[i] + (target - L[i]) * attack : Math.max(target, L[i] - decay);
            P[i] = Math.max(L[i], P[i] - peakDecay);
          }
        }
        changed = true;
      } else if (L.length > 0) {
        // Sem dado: decai pro silêncio e some quando zerar (não congela o último frame).
        let alive = false;
        for (let i = 0; i < L.length; i += 1) {
          L[i] = Math.max(0, L[i] - decay);
          P[i] = Math.max(L[i], P[i] - peakDecay);
          if (L[i] > 0.001 || P[i] > 0.001) alive = true;
        }
        if (!alive) {
          levelsRef.current = [];
          peaksRef.current = [];
        }
        changed = true;
      }

      if (changed && ts - lastEmit >= throttleMs) {
        lastEmit = ts;
        setFrame({ levels: levelsRef.current.slice(), peaks: peaksRef.current.slice() });
      }
      if (running) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [active, attack, decay, peakDecay, throttleMs]);

  return frame;
}
