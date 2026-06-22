// Store dedicado dos níveis do RTA (analisador de espectro), fora do estado do React.
// O frame chega ~30 Hz; pôr isso no estado do App re-renderizaria o App inteiro nessa taxa.
// O controller (rtaAdapter) escreve aqui; só o SpectrumLayer lê. Mesma ideia do
// UniversalRawParamStore, mas enxuto pro stream do espectro.
//
// IMPORTANTE: guarda SOMENTE níveis limpos já normalizados (0..1). A UI nunca vê o frame
// cru (op 0x46 / bytes / CRC) — isso fica no client + adapter.

type Listener = () => void;

class RtaSpectrumStore {
  private levels: number[] | null = null;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Referência estável entre updates (seguro p/ useSyncExternalStore e p/ leitura no rAF). */
  getSnapshot = (): number[] | null => this.levels;

  /** Substitui o frame atual por níveis 0..1 já normalizados. */
  setLevels(levels: number[]) {
    this.levels = levels;
    this.listeners.forEach((listener) => listener());
  }

  /** Some com o espectro (ao sair do EQ, perder dado, ou em modelo sem RTA). */
  clear() {
    if (this.levels === null) return;
    this.levels = null;
    this.listeners.forEach((listener) => listener());
  }
}

export const rtaSpectrumStore = new RtaSpectrumStore();
