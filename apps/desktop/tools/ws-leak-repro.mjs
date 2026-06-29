// ============================================================================
// ws-leak-repro.mjs — Reproduz o LEAK de conexões (cenário antigo, sem fechar)
// ----------------------------------------------------------------------------
// Confirma a causa do travamento: abre conexões e as MANTÉM abertas (simula os
// sockets órfãos que o app deixava ao reconectar sem fechar), depois mostra um
// "novo dispositivo" sendo RECUSADO enquanto as órfãs ocupam os slots, e por fim
// fecha tudo e mostra a mesa voltando a aceitar — prova de que eram as órfãs.
//
// ⚠️ DURANTE O TESTE (~15-20s) A MESA FICA TRAVADA P/ TODOS (é o objetivo).
//    Ao final, fecha tudo e a mesa recupera sozinha. Não rode durante um show.
//
// USO: node apps/desktop/tools/ws-leak-repro.mjs <IP> [porta] [encher]
//   ex: node apps/desktop/tools/ws-leak-repro.mjs 192.168.1.20
// ============================================================================

import WebSocket from "ws";

const IP = process.argv[2] || "192.168.1.20";
const PORT = Number(process.argv[3] || 8088);
const FILL = Number(process.argv[4] || 13); // tenta encher além do teto (~12)
const WS_URL = `ws://${IP}:${PORT}/`;
const OPEN_TIMEOUT_MS = 4000;
const opts = { handshakeTimeout: OPEN_TIMEOUT_MS, perMessageDeflate: false, origin: `http://${IP}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function open(label) {
  return new Promise((resolve) => {
    const start = Date.now();
    let done = false;
    let ws;
    const finish = (ok, msg) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      const ms = Date.now() - start;
      console.log(`  ${label}: ${ok ? "OPEN ✓" : "RECUSADA ✗"} (${ms}ms)${msg ? " — " + msg : ""}`);
      resolve({ ok, ws: ok ? ws : null });
    };
    const t = setTimeout(() => { try { ws?.terminate?.(); } catch { /* */ } finish(false, "timeout (mesa não respondeu)"); }, OPEN_TIMEOUT_MS);
    try {
      ws = new WebSocket(WS_URL, opts);
    } catch (e) {
      return finish(false, e?.message);
    }
    ws.onopen = () => finish(true);
    ws.onerror = (e) => finish(false, e?.message || "erro/recusada");
    ws.onclose = (ev) => finish(false, `close no handshake (code ${ev?.code})`);
  });
}

(async () => {
  console.log(`\n=== REPRO do leak (abrir SEM fechar) → ${WS_URL} ===\n`);

  console.log(`FASE 1 — abrindo ${FILL} conexões e MANTENDO abertas (= órfãs acumuladas):`);
  const held = [];
  for (let i = 1; i <= FILL; i++) {
    const r = await open(`  órfã #${i}`);
    if (r.ok && r.ws) held.push(r.ws);
    await sleep(150);
  }
  console.log(`\n  → ${held.length} conexões PRESAS abertas (ninguém fechou).`);

  console.log(`\nFASE 2 — um "novo dispositivo" tenta conectar 4x (com as órfãs ocupando os slots):`);
  let blocked = 0;
  for (let k = 1; k <= 4; k++) {
    const r = await open(`  novo-cliente tentativa ${k}`);
    if (!r.ok) blocked++;
    else { try { r.ws.close(); } catch { /* */ } }
    await sleep(1500);
  }
  console.log(`\n  → novo dispositivo recusado em ${blocked}/4 tentativas (mesa travada enquanto há órfãs).`);

  console.log(`\nFASE 3 — fechando as ${held.length} órfãs (close limpo)...`);
  for (const ws of held) { try { ws.close(); } catch { /* */ } }
  await sleep(3000);

  console.log(`\nFASE 4 — o "novo dispositivo" tenta de novo (slots liberados?):`);
  const r = await open("  novo-cliente pós-limpeza");
  try { r.ws?.close(); } catch { /* */ }

  console.log("");
  if (blocked >= 1 && r.ok) {
    console.log(`✓ CONFIRMADO: com órfãs abertas a mesa RECUSA novos clientes; ao fechá-las, volta a aceitar.`);
    console.log(`  → O travamento "até reiniciar" = sockets órfãos acumulando até o teto (~12).`);
    console.log(`  → O fix (fechar a conexão antiga antes de reconectar) impede isso.\n`);
  } else if (!r.ok) {
    console.log(`✗ Mesa ainda recusa após fechar — pode ter travado de vez (reiniciar) ou não liberou os slots.\n`);
  } else {
    console.log(`(inconclusivo: o teto não foi atingido — aumente o parâmetro "encher").\n`);
  }
  process.exit(0);
})();
