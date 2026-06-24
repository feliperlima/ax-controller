// Teste de detecção de canais — replica o probe do app (read opcode 6 + CRC Modbus).
// Usa o pacote 'ws' (mais tolerante que o WebSocket nativo do Node, igual ao cliente Rust).
// Uso:  node axios-probe-test.mjs <IP_DA_MESA>
// Ex.:  node axios-probe-test.mjs 192.168.1.20
import WebSocket from "ws";
import net from "node:net";

const ip = process.argv[2];
if (!ip) {
  console.error("Uso: node axios-probe-test.mjs <IP_DA_MESA>");
  process.exit(1);
}

// Params a testar (id -> rótulo)
const TEST = [
  [74,   "CH1  (grade-62, existe em 16/24 — e talvez 32)"],
  [1066, "CH17 (AX24-EXCLUSIVO, grade-62)"],
  [1500, "CH24 (AX24-EXCLUSIVO, grade-62)"],
  [4634, "Master L fader  (sentinela AX32 ATUAL)"],
  [4743, "Master R fader  (sentinela AX32 ATUAL)"],
  [4649, "Master L EQ-en  (sentinela AX32 ATUAL)"],
  [4758, "Master R EQ-en  (sentinela AX32 ATUAL)"],
  [1801, "CH25 mute (AX32 grade-72 — PROPOSTA)"],
  [2017, "CH28 mute (AX32 grade-72 — PROPOSTA)"],
  [2305, "CH32 mute (AX32 grade-72 — PROPOSTA)"],
  [7777,  "CONTROLE: ID inexistente (NÃO deveria responder)"],
  [9998,  "CONTROLE: ID inexistente (NÃO deveria responder)"],
  [30000, "CONTROLE: ID inexistente (NÃO deveria responder)"],
];
const TEST_IDS = TEST.map(([id]) => id);

function crc16(data) {
  let crc = 0xffff;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
  }
  return crc & 0xffff;
}

function buildReadPacket(params) {
  const payload = [];
  for (const p of params) { payload.push((p >> 8) & 0xff, p & 0xff); }
  const data = [128, (3 + payload.length) & 0xff, 6, ...payload];
  const crc = crc16(data);
  data.push((crc >> 8) & 0xff, crc & 0xff);
  return Uint8Array.from(data);
}

// Decodifica IGUAL ao app: frame 128 / opcode 6 / pares (param,valor) de 4 bytes.
function decode(buf) {
  const out = [];
  if (buf.length < 9 || buf[0] !== 128) return out;
  const expected = buf[1] + 2;
  if (expected > buf.length || buf[2] !== 6) return out;
  let i = 3;
  while (i + 3 < expected - 2) {
    out.push({ param: (buf[i] << 8) | buf[i + 1], value: (buf[i + 2] << 8) | buf[i + 3] });
    i += 4;
  }
  return out;
}

const url = `ws://${ip}:8088/`;

// 1) Pré-checagem TCP
console.log(`\n[*] Testando TCP ${ip}:8088 ...`);
const tcp = net.connect({ host: ip, port: 8088 });
tcp.setTimeout(4000);
tcp.on("connect", () => { console.log("[+] TCP OK (porta 8088 aberta)."); tcp.end(); startWs(); });
tcp.on("timeout", () => { console.error("[!] TCP TIMEOUT: porta 8088 não respondeu."); process.exit(2); });
tcp.on("error", (e) => { console.error(`[!] TCP FALHOU: ${e.code || e.message}.`); process.exit(2); });

function startWs() {
  console.log(`[*] Conectando WebSocket (pacote 'ws') em ${url} ...`);
  const ws = new WebSocket(url, { handshakeTimeout: 5000, perMessageDeflate: false, origin: `http://${ip}` });
  ws.binaryType = "arraybuffer";

  const responded = new Map();
  const allParams = new Set();
  let frames = 0;

  ws.on("open", () => {
    console.log("[+] WS conectado. Enviando read dos params de teste...");
    ws.send(buildReadPacket(TEST_IDS));
    setTimeout(finish, 2000); // coleta 2s
  });

  ws.on("message", (data) => {
    const buf = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    frames++;
    for (const { param, value } of decode(buf)) {
      allParams.add(param);
      if (TEST_IDS.includes(param)) responded.set(param, value);
    }
  });

  ws.on("error", (err) => { console.error(`[!] Erro de WebSocket: ${err.message}`); process.exit(3); });
  ws.on("close", (code, reason) => { if (frames === 0) console.error(`[!] WS fechou (code=${code} reason=${reason || "-"}).`); });

  function finish() {
    console.log(`\n==== RESULTADO  (mesa ${ip}, ${frames} frames recebidos) ====`);
    for (const [id, label] of TEST) {
      const ok = responded.has(id);
      console.log(`  ${ok ? "✅ RESPONDEU" : "—  não    "}  ${String(id).padStart(4)}  ${label}` + (ok ? `   valor=${responded.get(id)}` : ""));
    }
    const extras = [...allParams].filter((p) => !TEST_IDS.includes(p)).sort((a, b) => a - b);
    console.log(`\n  Outros params observados (${extras.length}): ${extras.slice(0, 60).join(", ")}${extras.length > 60 ? " ..." : ""}`);
    const controlsHit = [7777, 9998, 30000].filter((id) => responded.has(id));
    console.log("\n  VEREDITO ECO:");
    if (controlsHit.length === 0) {
      console.log("   ✅ Nenhum CONTROLE respondeu -> a mesa só responde params REAIS. Probe é confiável e CH25-32 serve de sentinela AX32.");
    } else {
      console.log(`   ⚠️ CONTROLE(s) responderam (${controlsHit.join(", ")}) -> a mesa ECOA qualquer ID. Probe é inútil -> tem que ser NOME-only.`);
    }
    console.log("\n  Leitura modelos:");
    console.log("   - 1801/2305 (CH25-32) respondem -> é AX32 real.");
    console.log("   - 1801/2305 NÃO e 1066/1500 sim   -> é AX24.");
    console.log("   - só 74                            -> é AX16.");
    ws.close();
    process.exit(0);
  }
}
