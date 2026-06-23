// RTA — controller profile-aware do analisador de espectro.
//
// AX32:  Liga o RTA (source-select 57/2884 + enable 5196=1) na primeira abertura.
//        Ao trocar de canal, chama updateTarget() que só troca a fonte (57/2884) sem
//        ciclar o enable — evita flood de escritas e acendimento de indicadores na mesa.
//        Ao sair do EQ (stop), desliga (5196=0). Sempre mono (fonte L do par linkado).
//        Polla o bloco 0x46 ~30 Hz, normaliza (0..1) e empurra pro rtaSpectrumStore.
// AX16/24: NUNCA escreve. Read-probe + telemetria rta_probe. RTA escondido.
//
// Tudo best-effort e não-bloqueante: falha nunca derruba a sessão ao vivo.

import type { Axios16Client } from "./axios16Client";
import {
  AX32_RTA_ENABLE_PARAM,
  AX32_RTA_SOURCE_SELECT_PARAMS,
  RTA_SPECTRUM_VALUE_MAX,
  isRtaSupported,
  resolveRtaSourceId,
  type MixerModel,
  type RtaTarget,
} from "../protocol/duonn/protocolAddressing";
import { rtaSpectrumStore } from "./rtaSpectrumStore";

const POLL_INTERVAL_MS = 33; // ~30 Hz
const STALE_TIMEOUT_MS = 600; // sem frame → some (não congela)
const PROBE_WINDOW_MS = 1200; // AX16/24: janela do read-probe

export type RtaProbeResult = {
  model: MixerModel;
  responded: { p57: boolean; p2884: boolean; p5196: boolean; block46: boolean };
};

type RtaControllerDeps = {
  client: Axios16Client;
  model: MixerModel;
  target: RtaTarget;
  onProbe?: (result: RtaProbeResult) => void;
};

export class RtaController {
  private readonly client: Axios16Client;
  private readonly model: MixerModel;
  private readonly onProbe?: (result: RtaProbeResult) => void;
  private target: RtaTarget;

  private pollTimer: number | null = null;
  private staleTimer: number | null = null;
  private unsubscribeFrame: (() => void) | null = null;
  private stopped = false;

  constructor(deps: RtaControllerDeps) {
    this.client = deps.client;
    this.model = deps.model;
    this.target = deps.target;
    this.onProbe = deps.onProbe;
  }

  start() {
    if (isRtaSupported(this.model)) {
      this.startAx32();
    } else {
      this.probeReadOnly();
    }
  }

  /**
   * Troca a fonte (57/2884) ao mudar de canal com o RTA já rodando.
   * Reafirma o enable (5196=1) uma única vez — sem ciclar 0→1 — porque o AX32
   * só "re-tapa" o RTA na nova fonte quando o enable é reafirmado. É 1 write por
   * troca (não flood); o flood antigo vinha da alternância L/R ~60×/s, já removida.
   */
  updateTarget(target: RtaTarget) {
    if (!isRtaSupported(this.model) || this.stopped) return;
    this.target = target;
    const sourceId = resolveRtaSourceId(this.model, target);
    if (sourceId === null) return;
    AX32_RTA_SOURCE_SELECT_PARAMS.forEach((p) => this.safeSend(p, sourceId));
    this.safeSend(AX32_RTA_ENABLE_PARAM, 1);
  }

  stop() {
    this.stopped = true;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.staleTimer !== null) {
      window.clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
    if (this.unsubscribeFrame) {
      this.unsubscribeFrame();
      this.unsubscribeFrame = null;
    }
    if (isRtaSupported(this.model)) {
      this.safeSend(AX32_RTA_ENABLE_PARAM, 0);
    }
    rtaSpectrumStore.clear();
  }

  // ── AX32: mono — usa sempre a fonte do target (L do par se linkado) ──────────
  private startAx32() {
    const sourceId = resolveRtaSourceId(this.model, this.target);
    if (sourceId === null || this.stopped) return;

    AX32_RTA_SOURCE_SELECT_PARAMS.forEach((p) => this.safeSend(p, sourceId));
    this.safeSend(AX32_RTA_ENABLE_PARAM, 1);

    this.unsubscribeFrame = this.client.onSpectrumFrame((bands) => {
      if (this.stopped) return;
      const levels = bands.map((b) => Math.min(1, Math.max(0, b / RTA_SPECTRUM_VALUE_MAX)));
      rtaSpectrumStore.setLevels(levels);
      this.armStaleWatchdog();
    });

    this.pollTimer = window.setInterval(() => {
      try { this.client.pollSpectrum(); } catch { /* best-effort */ }
    }, POLL_INTERVAL_MS);
  }

  private armStaleWatchdog() {
    if (this.staleTimer !== null) window.clearTimeout(this.staleTimer);
    this.staleTimer = window.setTimeout(() => {
      rtaSpectrumStore.clear();
    }, STALE_TIMEOUT_MS);
  }

  // ── AX16/24: read-probe (leitura) + telemetria. NUNCA escreve. ───────────────
  private probeReadOnly() {
    rtaSpectrumStore.clear();
    const responded = { p57: false, p2884: false, p5196: false, block46: false };

    const unsubscribeFrame = this.client.onSpectrumFrame(() => {
      responded.block46 = true;
    });

    this.client
      .readParams([57, 2884, 5196], PROBE_WINDOW_MS)
      .then((results) => {
        results.forEach((item) => {
          if (item.param === 57) responded.p57 = true;
          if (item.param === 2884) responded.p2884 = true;
          if (item.param === 5196) responded.p5196 = true;
        });
      })
      .catch(() => {})
      .finally(() => {
        unsubscribeFrame();
        if (this.stopped) return;
        this.onProbe?.({ model: this.model, responded });
      });
  }

  private safeSend(param: number, value: number) {
    try {
      this.client.sendParam(param, value);
    } catch { /* best-effort */ }
  }
}
