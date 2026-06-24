// ============================================================================
// media-sniffer.mjs — Sniffer passivo do WebSocket da mesa DUONN Axios (Node)
// ----------------------------------------------------------------------------
// Conecta na mesa e escuta os PUSHES (opcode 3) e respostas de leitura (opcode 6),
// com filtro de flood (silencia repetição tipo 5212), baseline/diff e timestamps
// relativos — para mapear o protocolo do media player (página MEDIA → canal DIGI).
//
// IMPORTANTE: a mesa só começa a streamar o status do MEDIA (ex.: 5212) DEPOIS de
// um "subscribe" que a UI oficial envia ao entrar na página MEDIA. Este sniffer é
// passivo (não envia subscribe). Para ver o stream do MEDIA, mantenha a UI oficial
// aberta NA página MEDIA em paralelo — se a mesa fizer broadcast a todos os clientes
// WS, este sniffer também recebe. Para capturar os COMANDOS enviados (TX), use o
// hook de console: apps/desktop/tools/media-tx-hook.js
//
// USO:  node apps/desktop/media-sniffer.mjs <IP_DA_MESA> [porta]
//   ex: node apps/desktop/media-sniffer.mjs 192.168.1.20
//
// COMANDOS (digite no terminal enquanto roda):
//   mark <texto>   separa o log por ação (rotule cada passo)
//   baseline       fotografa o estado atual de todos os params vistos
//   diff           mostra só os params que mudaram desde o baseline
//   dump           lista todos os params vistos (param → último valor)
//   flood on|off   liga/desliga o filtro de flood (padrão: on)
//   raw on|off     liga/desliga o dump dos bytes crus (hex)
//   only 5212,...  silencia esses params no log (ainda contam no dump)
//   clear          limpa a tabela e o baseline
//   quit           sai
// ============================================================================
import WebSocket from "ws";
import net from "node:net";
import readline from "node:readline";

const ip = process.argv[2];
const port = Number(process.argv[3] ?? 8088);
if (!ip) {
  console.error("Uso: node apps/desktop/media-sniffer.mjs <IP_DA_MESA> [porta]");
  process.exit(1);
}

const t0 = Date.now();
const rel = () => `+${((Date.now() - t0) / 1000).toFixed(3)}s`;

const state = {
  floodFilter: true,
  logRaw: false,
  silenced: new Set(),
  lastValue: new Map(), // param -> último valor logado (flood)
  seen: new Map(),      // param -> último valor visto (dump/diff)
  baseline: new Map(),
};

function hex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

// Decodifica frame Duonn: 128 / len / opcode / payload / crc(2).
function decode(bytes) {
  if (bytes.length < 5 || bytes[0] !== 128) return null;
  const opcode = bytes[2];
  const pairs = [];
  if (opcode === 3) {
    for (let i = 3; i + 3 < bytes.length - 2; i += 4) {
      pairs.push({ param: (bytes[i] << 8) | bytes[i + 1], value: (bytes[i + 2] << 8) | bytes[i + 3] });
    }
    return { opcode, pairs, kind: "param" };
  }
  if (opcode === 6) {
    for (let i = 3; i + 1 < bytes.length - 2; i += 2) {
      pairs.push({ param: (bytes[i] << 8) | bytes[i + 1], value: null });
    }
    return { opcode, pairs, kind: "read" };
  }
  return { opcode, pairs, kind: "other" };
}

function record(bytes) {
  const decoded = decode(bytes);
  if (!decoded) {
    if (state.logRaw) console.log(rel(), "raw", hex(bytes));
    return;
  }
  const { opcode, pairs, kind } = decoded;

  if (kind === "other") {
    console.log(rel(), `opcode=0x${opcode.toString(16)}`, hex(bytes));
    return;
  }

  for (const { param, value } of pairs) {
    if (value !== null) state.seen.set(param, value);

    if (state.floodFilter && value !== null) {
      const prev = state.lastValue.get(param);
      if (prev === value) continue;
      state.lastValue.set(param, value);
    }
    if (state.silenced.has(param)) continue;

    const label = kind === "read" ? "READ" : "    ";
    const valStr = value === null ? "" : `= ${value} (0x${value.toString(16)})`;
    console.log(
      rel(), `op${opcode}`, label,
      `param ${String(param).padStart(5)} (0x${param.toString(16)})`, valStr,
      state.logRaw ? `\n      ${hex(bytes)}` : ""
    );
  }
}

function startStdin() {
  const rl = readline.createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    const [cmd, ...rest] = line.trim().split(/\s+/);
    const arg = rest.join(" ");
    switch (cmd) {
      case "mark":
        console.log(`\n━━━━━ ${rel()}  ${arg} ━━━━━\n`);
        break;
      case "baseline":
        state.baseline = new Map(state.seen);
        console.log(`[baseline] ${state.baseline.size} params`);
        break;
      case "diff": {
        const changed = [];
        for (const [param, value] of state.seen) {
          const before = state.baseline.get(param);
          if (before !== value) changed.push({ param, hex: "0x" + param.toString(16), before, now: value });
        }
        if (changed.length === 0) { console.log("[diff] nada mudou"); break; }
        console.table(changed.sort((a, b) => a.param - b.param));
        break;
      }
      case "dump": {
        const rows = [...state.seen.entries()].sort((a, b) => a[0] - b[0])
          .map(([param, value]) => ({ param, hex: "0x" + param.toString(16), value }));
        console.table(rows);
        break;
      }
      case "flood": state.floodFilter = arg !== "off"; console.log(`[flood] ${state.floodFilter}`); break;
      case "raw": state.logRaw = arg === "on"; console.log(`[raw] ${state.logRaw}`); break;
      case "only":
        state.silenced = new Set(arg.split(",").map((s) => Number(s.trim())).filter(Number.isFinite));
        console.log(`[only] silenciados: ${[...state.silenced].join(", ") || "—"}`);
        break;
      case "clear": state.seen.clear(); state.lastValue.clear(); state.baseline.clear(); console.log("[clear]"); break;
      case "quit": case "exit": process.exit(0); break;
      default: if (cmd) console.log(`comando desconhecido: ${cmd}`);
    }
  });
}

const url = `ws://${ip}:${port}/`;
console.log(`\n[*] TCP ${ip}:${port} ...`);
const tcp = net.connect({ host: ip, port });
tcp.setTimeout(4000);
tcp.on("connect", () => { console.log("[+] TCP OK."); tcp.end(); startWs(); });
tcp.on("timeout", () => { console.error("[!] TCP TIMEOUT."); process.exit(2); });
tcp.on("error", (e) => { console.error(`[!] TCP FALHOU: ${e.code || e.message}.`); process.exit(2); });

function startWs() {
  console.log(`[*] WS ${url} ...`);
  const ws = new WebSocket(url, { handshakeTimeout: 5000, perMessageDeflate: false, origin: `http://${ip}` });
  ws.binaryType = "arraybuffer";

  ws.on("open", () => {
    console.log("[+] WS conectado. Escutando pushes (op3) + reads (op6).");
    console.log("    Filtro de flood LIGADO (só transições). Comandos: mark/baseline/diff/dump/flood/raw/only/clear/quit\n");
    startStdin();
  });
  ws.on("message", (data) => {
    const buf = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    record(buf);
  });
  ws.on("error", (err) => { console.error(`[!] WS erro: ${err.message}`); process.exit(3); });
  ws.on("close", (code) => { console.error(`[!] WS fechou (code=${code}).`); process.exit(0); });
}
