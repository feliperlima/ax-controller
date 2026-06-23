// RTA — controller profile-aware do analisador de espectro.
//
// AX32:  Lê o estado atual de 5196 antes de agir. Se RTA já estava ligado na mesa,
//        apenas troca a fonte (57/2884) sem re-enviar enable — evita flashes e escritas
//        desnecessárias ao navegar entre canais. Ao sair (stop), SEMPRE desliga (5196=0).
//        Polla o bloco 0x46 ~30 Hz, normaliza (0..1) e empurra pro rtaSpectrumStore.
//        Estéreo: lê outputLink antes; se linkado, alterna L↔R por frame (~15 fps/lado).
// AX16/24: NUNCA escreve. Read-probe + telemetria rta_probe. RTA escondido.
//
// Tudo best-effort e não-bloqueante: falha nunca derruba a sessão ao vivo.

import type { Axios16Client } from "./axios16Client";
import {
  AX32_RTA_ENABLE_PARAM,
  AX32_RTA_SOURCE_SELECT_PARAMS,
  RTA_SPECTRUM_VALUE_MAX,
  getAuxLinkBit,
  getAuxStereoSourceIds,
  getMasterLinkBit,
  isRtaSupported,
  resolveOutputLinkParam,
  resolveRtaSourceId,
  type MixerModel,
  type RtaTarget,
} from "../protocol/duonn/protocolAddressing";
import { rtaSpectrumStore } from "./rtaSpectrumStore";

const POLL_INTERVAL_MS = 33; // ~30 Hz
const STALE_TIMEOUT_MS = 600; // sem frame → some (não congela)
const PROBE_WINDOW_MS = 1200; // AX16/24: janela do read-probe
const LINK_READ_TIMEOUT_MS = 400; // leitura do link antes de iniciar; timeout → mono
const ENABLE_READ_TIMEOUT_MS = 300; // leitura do estado 5196 antes de iniciar; timeout → assume off

export type RtaProbeResult = {
  model: MixerModel;
  responded: { p57: boolean; p2884: boolean; p5196: boolean; block46: boolean };
};

type RtaControllerDeps = {
  client: Axios16Client;
  model: MixerModel;
  target: RtaTarget;
  /** Chamado UMA vez no AX16/24 com o resultado do read-probe (telemetria). Nunca no AX32. */
  onProbe?: (result: RtaProbeResult) => void;
};

export class RtaController {
  private readonly client: Axios16Client;
  private readonly model: MixerModel;
  private readonly target: RtaTarget;
  private readonly onProbe?: (result: RtaProbeResult) => void;

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
      void this.startAx32();
    } else {
      this.probeReadOnly();
    }
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
    // Desliga o RTA na mesa — SÓ no AX32 (em AX16/24 nunca ligamos).
    if (isRtaSupported(this.model)) {
      this.safeSend(AX32_RTA_ENABLE_PARAM, 0);
    }
    rtaSpectrumStore.clear();
  }

  // ── AX32: lê estado atual + link, decide mono/stereo, inicia stream ─────────
  private async startAx32() {
    // Lê enable e link em paralelo — falha em qualquer um = safe fallback.
    const [rtaEnabled, stereoIds] = await Promise.all([
      this.client
        .readParams([AX32_RTA_ENABLE_PARAM], ENABLE_READ_TIMEOUT_MS)
        .then((r) => (r.find((x) => x.param === AX32_RTA_ENABLE_PARAM)?.value ?? 0) === 1)
        .catch(() => false),
      this.resolveStereoIds(),
    ]);
    if (this.stopped) return;

    if (stereoIds) {
      this.startAx32StereoStream(stereoIds[0], stereoIds[1], rtaEnabled);
    } else {
      const sourceId = resolveRtaSourceId(this.model, this.target);
      if (sourceId === null || this.stopped) return;
      this.startAx32MonoStream(sourceId, rtaEnabled);
    }
  }

  /**
   * Lê outputLink da mesa e determina se o target é estéreo.
   * Master: checa masterLinkBit. AUX: checa bit do par. Canal: sempre null (mono).
   * Timeout ou falha de leitura → null (mono, safe fallback).
   */
  private async resolveStereoIds(): Promise<[number, number] | null> {
    const target = this.target;
    if (target.kind === "channel") return null;

    const linkParam = resolveOutputLinkParam(this.model);
    try {
      const results = await this.client.readParams([linkParam], LINK_READ_TIMEOUT_MS);
      const linkValue = results.find((r) => r.param === linkParam)?.value ?? 0;

      if (target.kind === "master") {
        const bit = getMasterLinkBit(this.model);
        return (linkValue & bit) !== 0 ? [51, 52] : null;
      }
      if (target.kind === "aux") {
        const bit = getAuxLinkBit(target.index);
        return (linkValue & bit) !== 0 ? getAuxStereoSourceIds(target.index) : null;
      }
    } catch {
      // timeout ou sem rede — mono seguro
    }
    return null;
  }

  // ── Mono: stream de uma fonte só ─────────────────────────────────────────────
  private startAx32MonoStream(sourceId: number, rtaAlreadyEnabled: boolean) {
    AX32_RTA_SOURCE_SELECT_PARAMS.forEach((p) => this.safeSend(p, sourceId));
    if (!rtaAlreadyEnabled) this.safeSend(AX32_RTA_ENABLE_PARAM, 1);

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

  // ── Estéreo: alterna L↔R por frame, empurra max(L,R) ao ter os dois ─────────
  //
  // A cada frame recebido: armazena o lado atual, troca a fonte (params 57/2884),
  // e quando AMBOS estão disponíveis empurra max(L[i], R[i]) no store.
  // Assim o store é atualizado a ~15 fps (cada par de frames = 1 update), enquanto
  // os ballistics no SpectrumLayer mantêm a animação fluida.
  private startAx32StereoStream(sourceIdL: number, sourceIdR: number, rtaAlreadyEnabled: boolean) {
    let side: "L" | "R" = "L";
    let lastL: number[] | null = null;
    let lastR: number[] | null = null;

    // Começa no lado L
    AX32_RTA_SOURCE_SELECT_PARAMS.forEach((p) => this.safeSend(p, sourceIdL));
    if (!rtaAlreadyEnabled) this.safeSend(AX32_RTA_ENABLE_PARAM, 1);

    this.unsubscribeFrame = this.client.onSpectrumFrame((bands) => {
      if (this.stopped) return;
      const levels = bands.map((b) => Math.min(1, Math.max(0, b / RTA_SPECTRUM_VALUE_MAX)));

      if (side === "L") {
        lastL = levels;
        // Troca para R antes do próximo poll
        side = "R";
        AX32_RTA_SOURCE_SELECT_PARAMS.forEach((p) => this.safeSend(p, sourceIdR));
      } else {
        lastR = levels;
        // Troca de volta para L e publica o resultado combinado
        side = "L";
        AX32_RTA_SOURCE_SELECT_PARAMS.forEach((p) => this.safeSend(p, sourceIdL));
        if (lastL) {
          const combined = lastL.map((v, i) => Math.max(v, lastR![i]));
          rtaSpectrumStore.setLevels(combined);
          this.armStaleWatchdog();
        }
      }
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
    rtaSpectrumStore.clear(); // RTA escondido nesses modelos
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
      .catch(() => { /* sem resposta — responded fica false */ })
      .finally(() => {
        unsubscribeFrame();
        if (this.stopped) return;
        this.onProbe?.({ model: this.model, responded });
      });
  }

  private safeSend(param: number, value: number) {
    try {
      this.client.sendParam(param, value);
    } catch {
      /* best-effort */
    }
  }
}
