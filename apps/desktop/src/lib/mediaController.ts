// MEDIA player (canal DIGI) — controller liga/desliga ao abrir/fechar a aba MEDIA.
//
// Mapeado por engenharia reversa (AX16/24) — ver apps/desktop/tools/media-capture-roteiro.md.
// Molde: lib/rtaAdapter.ts (liga subscribe ao entrar numa tela, desliga ao sair).
//
// Fluxo:
//   start(): subscribe (param 75=917 + keepalive 5212=1 a cada ~1s) e escuta op0x71 (RX raw).
//   handleFrame(): despacha por bytes[3] — status (0x02/0x00), Type A (0x80), scan (0x82).
//   stop(): para keepalive e listeners — NÃO para a reprodução (sair da aba não muda o áudio).
//
// Tudo best-effort e não-bloqueante: falha nunca derruba a sessão ao vivo.
//
// NOTA: a sequência exata do scan (TX 9-byte sequencial vs flood automático da mesa) e a
// codificação dos bytes TYPE precisam de validação na mesa real — implementação derivada do
// roteiro de captura, marcada com comentários onde há incerteza.

import { buildRawDuonnPacket, type Axios16Client } from "./axios16Client";
import {
  MEDIA_CMD,
  MEDIA_DEVICE,
  MEDIA_KEEPALIVE_PARAM,
  MEDIA_SUBSCRIBE_PARAMS,
} from "../protocol/duonn/protocolAddressing";

// ─── Tipos ───────────────────────────────────────────────────────────────────────

export type MediaSource = "usb" | "recorder" | "bluetooth" | "coax" | "none";
export type MediaMode = "idle" | "playing" | "paused" | "seeking" | "recording";

/** Entrada da lista de navegação: arquivo de áudio OU pasta navegável. */
export type MediaEntry =
  | { kind: "file"; handle: number; name: string; durSec: number }
  | { kind: "folder"; handle: number; name: string };

export type MediaState = {
  source: MediaSource;
  diskPresent: boolean;
  mode: MediaMode;
  trackHandle: number; // handle da faixa em reprodução (Type A b[9..10])
  trackIndex: number; // 1-based (Type B b[10])
  trackCount: number; // total de faixas da pasta atual (do scan)
  tickElapsed: number; // tempo decorrido em unidades de ~0.9s
  repeatOn: boolean;
  entries: MediaEntry[]; // conteúdo da pasta atual (pastas + arquivos)
  path: { handle: number; name: string }[]; // breadcrumb (raiz = [])
  scanning: boolean;
  fileCount: number; // Recorder: nº de arquivos no pendrive
  btDeviceName: string | null;
};

export function createDefaultMediaState(): MediaState {
  return {
    source: "none",
    diskPresent: false,
    mode: "idle",
    trackHandle: 0,
    trackIndex: 0,
    trackCount: 0,
    tickElapsed: 0,
    repeatOn: false,
    entries: [],
    path: [],
    scanning: false,
    fileCount: 0,
    btDeviceName: null,
  };
}

// ─── Builders de frame (op0x72) ───────────────────────────────────────────────────

/** Comando curto: 80 06 72 00 00 [CMD] crc crc. */
export function buildMediaCmd(cmd: number): Uint8Array {
  return buildRawDuonnPacket(0x72, [0x00, 0x00, cmd]);
}

/**
 * Navegação por handle: 80 0c 72 00 00 d1 [LO HI] d2 [mode] 00 d0 crc crc.
 * mode 0x01 = selecionar faixa (tocar/carregar) · 0x02 = entrar em diretório (scan).
 */
export function buildMediaNav(handleLe: number, mode: 1 | 2): Uint8Array {
  return buildRawDuonnPacket(0x72, [
    0x00,
    0x00,
    0xd1,
    handleLe & 0xff,
    (handleLe >> 8) & 0xff,
    0xd2,
    mode,
    0x00,
    0xd0,
  ]);
}

/** Leitura sequencial de entrada do scan: 80 09 72 [SEQ] 00 d1 08 00 d0 crc crc. */
export function buildMediaReadEntry(seq: number): Uint8Array {
  return buildRawDuonnPacket(0x72, [seq & 0xff, 0x00, 0xd1, 0x08, 0x00, 0xd0]);
}

// ─── Constantes internas ──────────────────────────────────────────────────────────

const KEEPALIVE_INTERVAL_MS = 800;
const DISK_INSERT_GUARD_MS = 15000; // janela do auto-play intercept após inserção
const SELECT_PLAY_GUARD_MS = 4000; // janela p/ pausar o auto-retomar ao selecionar USB
const SCAN_IDLE_MS = 1500; // sem frame novo por esse tempo → considera o scan terminado
const NAME_DEBOUNCE_MS = 40; // espera os frames de nome pararem antes de pedir a próxima entrada
// Offset da pasta RECORD (gravações) na raiz do pendrive — confirmado neste pendrive de teste.
// TODO fase 2: descobrir dinamicamente via scan da raiz (navegação por handle).
const RECORD_DIR_HANDLE = 0x0006;

// Debug: ative no console com `localStorage.ax_media_debug = "1"` (e recarregue ou reabra a aba).
// Loga cada frame op0x71 RX e cada TX do media player — usado para validar scan/comandos na mesa.
function mediaDebugOn(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("ax_media_debug") === "1";
  } catch {
    return false;
  }
}
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join(" ");
}
function dlog(...args: unknown[]) {
  if (mediaDebugOn()) console.log("[media]", ...args);
}

// Cache da lista do USB em localStorage — evita re-escanear ao reabrir o app. Invalidado
// quando o nº de faixas (b[8]) não bate com o cache (pendrive trocado).
const USB_CACHE_KEY = "ax_media_usb_record_cache";
function loadUsbCache(): { count: number; entries: MediaEntry[] } | null {
  try {
    const raw = localStorage.getItem(USB_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { count: number; entries: MediaEntry[] };
    if (typeof parsed?.count === "number" && Array.isArray(parsed.entries)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
function saveUsbCache(count: number, entries: MediaEntry[]) {
  try {
    localStorage.setItem(USB_CACHE_KEY, JSON.stringify({ count, entries }));
  } catch {
    /* ignore */
  }
}

// device byte (op0x71 b[4]) → fonte.
function mapDevice(device: number): MediaSource {
  switch (device) {
    case MEDIA_DEVICE.USB:
      return "usb";
    case MEDIA_DEVICE.RECORDER:
      return "recorder";
    case MEDIA_DEVICE.BLUETOOTH:
      return "bluetooth";
    case MEDIA_DEVICE.COAX:
      return "coax";
    default:
      return "none";
  }
}

// mode byte (op0x71 b[5]) → MediaMode, dependente da fonte.
// AX32: 0x02 = TOCANDO (o tick só corre nesse estado), 0x03 = PAUSADO. Confirmado na mesa.
function deriveMode(source: MediaSource, mode: number): MediaMode {
  if (source === "recorder") {
    return mode === 0x05 ? "recording" : "idle";
  }
  switch (mode) {
    case 0x02:
      return "playing";
    case 0x03:
      return "paused";
    case 0x04:
      return "seeking";
    default:
      return "idle";
  }
}

// TYPE byte do scan (sub-frame header b[11]).
// TYPE byte (sub-frame header b[11]), confirmado no log da UI oficial:
//   bit 0 (0x01) = arquivo (vs diretório)
//   0x41 = último arquivo do dir · 0xc0 = último diretório do nível
//   0x80 = diretório de sistema/macOS (nome UTF-16, começa com ".") → ocultar
//   0x40 = diretório regular visível (ex.: RECORD)
function isFileType(type: number): boolean {
  return (type & 0x01) !== 0;
}
function isLastType(type: number): boolean {
  return type === 0x41 || type === 0xc0;
}
// Entradas de sistema/macOS a ocultar (nome UTF-16, dirs ".xxx" / arquivos "._xxx").
function isHiddenType(type: number): boolean {
  return (type & 0x80) !== 0;
}

function asciiName(bytes: Uint8Array, start: number, endExclusive: number): string {
  let out = "";
  for (let i = start; i < endExclusive; i += 1) {
    const c = bytes[i];
    if (c >= 0x20 && c < 0x7f) out += String.fromCharCode(c);
  }
  return out.trim();
}

type ScanPending = {
  idx: number;
  type: number;
  isLast: boolean;
  handle: number;
  name: string;
  durSec: number;
  readSent: boolean; // já enviamos o readEntry(IDX) desta entrada?
};
type ScanState = {
  active: boolean;
  entries: MediaEntry[];
  pending: ScanPending | null;
};

// ─── Controller ────────────────────────────────────────────────────────────────────

type MediaControllerDeps = {
  client: Axios16Client;
  onStateChange: (state: MediaState) => void;
  // Estado preservado da sessão anterior (ao reabrir a aba MEDIA) — evita re-escanear e
  // perder a lista só porque o controller foi recriado.
  initialState?: MediaState;
};

export class MediaController {
  private readonly client: Axios16Client;
  private readonly onStateChange: (state: MediaState) => void;

  private state: MediaState = createDefaultMediaState();
  private stopped = false;

  private keepaliveTimer: number | null = null;
  private scanTimer: number | null = null;
  private diskGuardUntil = 0;
  private unsubscribeRaw: (() => void) | null = null;

  private scan: ScanState = { active: false, entries: [], pending: null };
  private nameTimer: number | null = null; // debounce dos frames de nome do scan
  private bootStatusSeen = false; // já vimos o 1º status? (p/ não tratar o boot como inserção)

  constructor(deps: MediaControllerDeps) {
    this.client = deps.client;
    this.onStateChange = deps.onStateChange;
    if (deps.initialState) {
      // Herda a lista/estado já conhecidos; scanning sempre false (sem scan em andamento).
      this.state = { ...deps.initialState, scanning: false };
    }
    // Sem lista em memória (app recém-aberto)? Tenta o cache em disco — evita re-escanear.
    if (this.state.entries.length === 0) {
      const cache = loadUsbCache();
      if (cache && cache.entries.length > 0) {
        this.state.entries = cache.entries;
      }
    }
  }

  start() {
    this.safeSend(() => {
      this.client.sendParam(MEDIA_SUBSCRIBE_PARAMS[0], MEDIA_SUBSCRIBE_PARAMS[1]);
      this.client.sendParam(MEDIA_KEEPALIVE_PARAM, 1);
    });
    this.keepaliveTimer = window.setInterval(() => {
      this.safeSend(() => this.client.sendParam(MEDIA_KEEPALIVE_PARAM, 1));
    }, KEEPALIVE_INTERVAL_MS);
    this.unsubscribeRaw = this.client.onRawMessage((buf) => this.handleFrame(buf));
  }

  stop() {
    this.stopped = true;
    if (this.keepaliveTimer !== null) {
      window.clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.nameTimer !== null) {
      window.clearTimeout(this.nameTimer);
      this.nameTimer = null;
    }
    if (this.unsubscribeRaw) {
      this.unsubscribeRaw();
      this.unsubscribeRaw = null;
    }
    // Não enviamos comando de parar reprodução: sair da aba não deve mexer no áudio.
  }

  // ── Comandos da UI ────────────────────────────────────────────────────────────
  selectSource(source: MediaSource) {
    // 0xc8 (RELEASE_SOURCE) libera a fonte → Recorder/none. BT tem CMD próprio (0xc7).
    if (source === "usb") {
      // Vindo de OUTRA fonte, a mesa auto-retoma a faixa USB ao selecionar. Armamos o
      // auto-play intercept p/ pausar esse retorno (o app não inicia reprodução sozinho).
      // Re-clicar USB já ativo não arma (não pausa o que já está tocando).
      if (this.state.source !== "usb") {
        this.diskGuardUntil = Date.now() + SELECT_PLAY_GUARD_MS;
      }
      this.sendRaw(buildMediaCmd(MEDIA_CMD.SELECT_USB));
    } else if (source === "coax") {
      this.sendRaw(buildMediaCmd(MEDIA_CMD.SELECT_SPDIF));
    } else if (source === "bluetooth") {
      this.sendRaw(buildMediaCmd(MEDIA_CMD.SELECT_BT));
    } else if (source === "recorder" || source === "none") {
      this.sendRaw(buildMediaCmd(MEDIA_CMD.RELEASE_SOURCE));
    }
  }
  play() {
    this.sendRaw(buildMediaCmd(MEDIA_CMD.PLAY));
  }
  pause() {
    this.sendRaw(buildMediaCmd(MEDIA_CMD.PAUSE));
  }
  next() {
    this.sendRaw(buildMediaCmd(MEDIA_CMD.NEXT));
  }
  prev() {
    this.sendRaw(buildMediaCmd(MEDIA_CMD.PREV));
  }
  btToggle() {
    this.sendRaw(buildMediaCmd(MEDIA_CMD.BT_TOGGLE));
  }
  toggleRepeat() {
    this.sendRaw(buildMediaCmd(MEDIA_CMD.REPEAT));
  }
  toggleRecord() {
    this.sendRaw(buildMediaCmd(MEDIA_CMD.RECORD_TOGGLE));
  }
  /** Seleciona faixa por handle — carrega (mode→paused). NUNCA dá play automático. */
  selectTrack(handle: number) {
    this.sendRaw(buildMediaNav(handle, 1));
  }
  enterFolder(entry: Extract<MediaEntry, { kind: "folder" }>) {
    this.scanFolder(entry.handle, [...this.state.path, { handle: entry.handle, name: entry.name }]);
  }
  /** index = -1 volta à raiz; index = i volta ao nível i do breadcrumb. */
  navigateTo(index: number) {
    if (index < 0) {
      this.scanFolder(0, []);
      return;
    }
    const seg = this.state.path[index];
    if (!seg) return;
    this.scanFolder(seg.handle, this.state.path.slice(0, index + 1));
  }
  /** Re-scan da pasta atual (botão atualizar). */
  rescan() {
    const last = this.state.path[this.state.path.length - 1];
    this.scanFolder(last ? last.handle : 0, this.state.path);
  }

  // ── RX ──────────────────────────────────────────────────────────────────────────
  private handleFrame(buffer: ArrayBuffer) {
    if (this.stopped) return;
    const b = new Uint8Array(buffer);
    if (b.length < 5 || b[0] !== 128 || b[2] !== 0x71) return;

    dlog("RX", toHex(b));

    switch (b[3]) {
      case 0x02:
      case 0x00:
        this.parseStatus(b);
        break;
      case 0x80:
        this.parseTypeA(b);
        break;
      case 0x82:
        this.parseScan(b);
        break;
      default:
        break;
    }
  }

  private parseStatus(b: Uint8Array) {
    const diskPresent = b[3] === 0x02;
    const wasDiskPresent = this.state.diskPresent;
    const device = b[4];
    const rawMode = b[5];
    const source = mapDevice(device);
    const mode = deriveMode(source, rawMode);

    this.state.diskPresent = diskPresent;
    this.state.source = source;
    this.state.mode = mode;
    this.state.trackIndex = b[10] ?? 0;
    this.state.tickElapsed = b[13] ?? 0;
    this.state.repeatOn = ((b[14] ?? 0) & 0x08) !== 0;
    if (source === "usb") {
      // b[8] = total de faixas tocáveis (toda a árvore do pendrive). NÃO usamos para validar a
      // lista: o scan só cobre a pasta RECORD, então b[8] (árvore) ≠ tamanho da lista (RECORD)
      // por natureza — comparar causava invalidação + re-scan em loop (a tela piscava).
      // A troca de pendrive já é tratada pela transição remover/inserir disco (limpa a lista).
      const total = b[8] ?? 0;
      if (total > 0) this.state.trackCount = total;
    }
    if (source === "recorder") {
      // b[8] = nº de arquivos, mas só vem preenchido durante a gravação (mode=0x05);
      // no idle vem 0x00 — por isso só atualizamos com valor > 0 (não zerar o último conhecido).
      const n = b[8] ?? 0;
      if (n > 0) this.state.fileCount = n;
    }

    dlog("status", {
      disk: diskPresent,
      source,
      mode,
      track: this.state.trackIndex,
      tick: this.state.tickElapsed,
      b8: b[8],
      repeat: this.state.repeatOn,
    });

    // O 1º status (boot) NÃO é uma inserção real — é só o app abrindo com o disco já lá.
    // Tratar como inserção armava o auto-play intercept e PAUSAVA a música que já tocava.
    const firstStatus = !this.bootStatusSeen;
    this.bootStatusSeen = true;

    if (!firstStatus && !wasDiskPresent && diskPresent) {
      // Inserção REAL (depois do boot): arma o auto-play intercept e invalida a lista.
      this.diskGuardUntil = Date.now() + DISK_INSERT_GUARD_MS;
      this.state.entries = [];
    } else if (wasDiskPresent && !diskPresent) {
      this.state.entries = [];
    }

    // Escaneia a lista do USB UMA vez — só quando entra em USB com disco e ainda NÃO temos a
    // lista. Re-escanear à toa (ao voltar pra aba/re-selecionar) interrompe a reprodução e
    // zera a lista, então não fazemos. As faixas = WAVs da pasta RECORD (offset 0x0006 neste
    // pendrive; fase 2: descobrir dinâmico via árvore).
    if (
      source === "usb" &&
      diskPresent &&
      this.state.entries.length === 0 &&
      !this.scan.active
    ) {
      this.scanFolder(RECORD_DIR_HANDLE, []);
    }

    // Auto-play intercept: a mesa começa a tocar sozinha após inserir o pendrive.
    // Enquanto na aba MEDIA, cancelamos com PAUSE — o app nunca inicia reprodução sozinho.
    if (Date.now() < this.diskGuardUntil && mode === "playing") {
      this.diskGuardUntil = 0;
      this.sendRaw(buildMediaCmd(MEDIA_CMD.PAUSE));
      this.state.mode = "paused";
    }

    this.emit();
  }

  private parseTypeA(b: Uint8Array) {
    this.state.tickElapsed = b[4] ?? this.state.tickElapsed;
    this.state.trackHandle = ((b[9] ?? 0) << 8) | (b[10] ?? 0); // big-endian
    this.emit();
  }

  // Scan: sub-frames op0x71 type 0x82 (confirmado no log da UI oficial). Sequência por entrada:
  //   RX header(0xaa): IDX=b[10], TYPE=b[11]
  //   RX nome: handle BE=b[5..6], nome ASCII em b[7..]  → TX readEntry(IDX)
  //   RX ext(0x06): ".WAV" + dur=b[10] (arquivo)  |  RX 0x05: metadados (pasta)
  // O readEntry(IDX) é enviado DEPOIS do nome e provoca o ext/metadados + a próxima entrada.
  private parseScan(b: Uint8Array) {
    if (!this.scan.active) return;
    this.armScanWatchdog(); // chegou frame de scan → reinicia o watchdog (scan ainda vivo)
    const b4 = b[4];
    const b5 = b[5];

    if (b4 === 0x0a && b5 === 0xaa) {
      // Header de uma nova entrada.
      const idx = b[10] ?? 0;
      const type = b[11] ?? 0;
      this.scan.pending = {
        idx,
        type,
        isLast: isLastType(type),
        handle: 0,
        name: "",
        durSec: 0,
        readSent: false,
      };
      return;
    }

    if (b4 === 0x0a) {
      // Sub-frame de nome. O 1º frame traz o handle (b[5..6] BE) + início do nome;
      // frames seguintes são continuação (nomes longos UTF-16 de dirs de sistema).
      const p = this.scan.pending;
      if (!p) return;
      if (p.name === "") {
        p.handle = ((b[5] ?? 0) << 8) | (b[6] ?? 0);
        p.name = asciiName(b, 7, Math.max(7, b.length - 2));
      } else {
        p.name += asciiName(b, 5, Math.max(5, b.length - 2));
      }
      // ARQUIVO: pedir a entrada (readEntry) após o nome provoca o ext 0x06 (com a duração).
      // PASTA: o metadado 0x05 chega automático após o nav; o readEntry vai no finalize.
      // O debounce evita enviar no meio de um nome multi-frame (dessincronizaria o scan).
      if (isFileType(p.type)) this.scheduleReadEntry();
      return;
    }

    if (b4 === 0x06) {
      // Extensão de arquivo: ".WAV\0" + duração (segundos) em b[10]. Fecha um arquivo.
      const p = this.scan.pending;
      if (!p) return;
      p.durSec = b[10] ?? 0;
      this.finalizeScanEntry();
      return;
    }

    if (b4 === 0x05) {
      // Metadados de diretório (sem duração). Fecha uma pasta.
      if (!this.scan.pending) return;
      this.finalizeScanEntry();
    }
  }

  private finalizeScanEntry() {
    if (this.nameTimer !== null) {
      window.clearTimeout(this.nameTimer);
      this.nameTimer = null;
    }
    const p = this.scan.pending;
    this.scan.pending = null;
    if (!p) return;

    if (!isHiddenType(p.type) && p.name.length > 0) {
      if (isFileType(p.type)) {
        this.scan.entries.push({ kind: "file", handle: p.handle, name: p.name, durSec: p.durSec });
      } else {
        this.scan.entries.push({ kind: "folder", handle: p.handle, name: p.name });
      }
    }

    if (p.isLast) {
      this.completeScan();
      return;
    }
    // Avança para a próxima entrada. Para PASTAS o readEntry ainda não foi enviado (o 0x05
    // veio sozinho), então pedimos aqui. Para ARQUIVOS já foi enviado após o nome (readSent).
    if (!p.readSent) {
      p.readSent = true;
      this.sendRaw(buildMediaReadEntry(p.idx));
    }
  }

  // Debounce: só pede a próxima entrada (readEntry SEQ=IDX) quando os frames de nome param
  // de chegar. Enviar no meio de um nome multi-frame dessincroniza o scan.
  private scheduleReadEntry() {
    if (this.nameTimer !== null) window.clearTimeout(this.nameTimer);
    this.nameTimer = window.setTimeout(() => {
      this.nameTimer = null;
      const p = this.scan.pending;
      if (p && !p.readSent) {
        p.readSent = true;
        this.sendRaw(buildMediaReadEntry(p.idx));
      }
    }, NAME_DEBOUNCE_MS);
  }

  private scanFolder(handle: number, pathSegs: { handle: number; name: string }[]) {
    dlog("scanFolder start", { handle, path: pathSegs.map((p) => p.name) });
    this.scan = { active: true, entries: [], pending: null };
    this.state.scanning = true;
    this.state.entries = [];
    this.state.path = pathSegs;
    this.emit();

    // Só o nav: a 1ª entrada (header+nome) vem em resposta. O readEntry(IDX) é enviado
    // depois, ao receber cada nome (ver parseScan). NÃO enviar readEntry aqui.
    this.sendRaw(buildMediaNav(handle, 2));
    this.armScanWatchdog();
  }

  // Watchdog: se o scan ficar SCAN_IDLE_MS sem nenhum frame novo, finaliza com o que chegou
  // (evita travar em "scanning" se não vier o "último entry").
  private armScanWatchdog() {
    if (this.scanTimer !== null) window.clearTimeout(this.scanTimer);
    this.scanTimer = window.setTimeout(() => {
      dlog("scan ocioso — finalizando com o que chegou");
      this.completeScan();
    }, SCAN_IDLE_MS);
  }

  private completeScan() {
    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.nameTimer !== null) {
      window.clearTimeout(this.nameTimer);
      this.nameTimer = null;
    }
    if (!this.scan.active) return;
    this.scan.active = false;
    this.state.entries = this.scan.entries;
    const fileCount = this.scan.entries.filter((e) => e.kind === "file").length;
    // NÃO sobrescreve trackCount com fileCount: o total "Faixa N / M" vem do b[8] (status),
    // que reflete toda a árvore. Mexer aqui fazia o total oscilar (17 do scan ↔ 19 do status).
    this.state.scanning = false;
    // Persiste a lista em disco p/ não re-escanear no próximo boot.
    if (this.scan.entries.length > 0) {
      saveUsbCache(fileCount, this.scan.entries);
    }
    dlog("scan done", { count: this.scan.entries.length, entries: this.scan.entries });
    this.emit();
  }

  // ── helpers ───────────────────────────────────────────────────────────────────
  private emit() {
    if (this.stopped) return;
    this.onStateChange({ ...this.state });
  }

  private sendRaw(packet: Uint8Array) {
    try {
      dlog("TX", toHex(packet));
      this.client.sendRaw(packet);
    } catch {
      /* best-effort */
    }
  }

  private safeSend(fn: () => void) {
    try {
      fn();
    } catch {
      /* best-effort */
    }
  }
}
