// ============================================================================
// ws-connection-probe.mjs — Probe de limite de conexões do WebSocket da mesa DUONN
// ----------------------------------------------------------------------------
// Abre conexões WS incrementais à mesa até ela recusar → descobre quantos clientes
// simultâneos ela aguenta. Depois fecha TODAS de forma limpa e testa se a mesa volta
// a aceitar — isso responde a pergunta-chave:
//   • Mesa aceita de novo após fechar  → esgotamento de slots que se LIBERA no close
//     limpo → o fix de higiene de conexão do app resolve (não deixar socket órfão).
//   • Mesa NÃO aceita após fechar       → ela não libera o slot no close (leak de
//     hardware/firmware) → pauta com a DUONN; do nosso lado, minimizar churn ajuda.
//
// ⚠️ ESTE TESTE PODE TRAVAR A MESA DE PROPÓSITO (é o objetivo). Pode ser necessário
//    REINICIAR a mesa depois. Não rode durante um show.
//
// USO:  node apps/desktop/tools/ws-connection-probe.mjs <IP_DA_MESA> [porta] [maxConns]
//   ex: node apps/desktop/tools/ws-connection-probe.mjs 192.168.1.20
// ============================================================================

// Usa o pacote `ws` (igual ao media-sniffer.mjs) — a undici global do Node falha o handshake
// com a mesa (precisa de Origin http://<ip> + sem perMessageDeflate).
import WebSocket from "ws";

const IP = process.argv[2] || "192.168.1.20";
const PORT = Number(process.argv[3] || 8088);
const MAX = Number(process.argv[4] || 40);
// NÃO nomear "URL" — colide com o construtor global URL que o WebSocket usa internamente.
const WS_URL = `ws://${IP}:${PORT}/`;

const OPEN_TIMEOUT_MS = 4000; // tempo p/ considerar o handshake travado
const DELAY_BETWEEN_MS = 250; // intervalo entre tentativas (não floodar de uma vez)
const HOLD_MS = 3000; // segura as conexões abertas antes de fechar
const RECOVER_WAIT_MS = 3000; // espera após fechar tudo, antes do teste de recuperação

const sockets = [];
let opened = 0;
let failed = 0;

function attempt(label) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    let ws;
    try {
      ws = new WebSocket(WS_URL, {
        handshakeTimeout: OPEN_TIMEOUT_MS,
        perMessageDeflate: false,
        origin: `http://${IP}`,
      });
    } catch (e) {
      console.log(`  #${label}: EXCEÇÃO ao criar socket — ${e?.message || e}`);
      failed++;
      return resolve("error");
    }
    const finish = (outcome, note) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const ms = Date.now() - startedAt;
      if (outcome === "open") {
        opened++;
        sockets.push(ws);
        console.log(`  #${label}: OPEN ✓  (${ms}ms)  — total abertas: ${opened}`);
      } else {
        failed++;
        console.log(`  #${label}: ${outcome.toUpperCase()} ✗  (${ms}ms)${note ? " — " + note : ""}`);
        try { ws.close(); } catch { /* ignore */ }
      }
      resolve(outcome);
    };
    const timer = setTimeout(() => finish("timeout", `mesa não respondeu ao handshake em ${OPEN_TIMEOUT_MS}ms`), OPEN_TIMEOUT_MS);
    ws.onopen = () => finish("open");
    ws.onerror = (e) => finish("error", e?.message || "conexão recusada/erro");
    ws.onclose = (e) => finish("close", `fechou no handshake (code ${e?.code})`);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`\n=== Probe de conexões WS → ${WS_URL} ===`);
  console.log(`Abrindo até ${MAX} conexões (timeout ${OPEN_TIMEOUT_MS}ms cada, ${DELAY_BETWEEN_MS}ms entre tentativas)\n`);

  for (let i = 1; i <= MAX; i++) {
    const outcome = await attempt(i);
    if (outcome !== "open") {
      console.log(`\n>>> Falhou na tentativa #${i}. LIMITE APARENTE: ${opened} conexões simultâneas.\n`);
      break;
    }
    await sleep(DELAY_BETWEEN_MS);
  }

  if (opened === MAX) {
    console.log(`\n>>> Abriu todas as ${MAX} sem recusar. A mesa aguenta pelo menos ${MAX} (aumente maxConns p/ achar o teto).\n`);
  }

  console.log(`Resumo da subida: ${opened} abertas, ${failed} falhas. Segurando ${HOLD_MS}ms...`);
  await sleep(HOLD_MS);

  console.log(`\nFechando as ${sockets.length} conexões (close limpo)...`);
  for (const ws of sockets) {
    try { ws.close(); } catch { /* ignore */ }
  }
  await sleep(RECOVER_WAIT_MS);

  console.log(`\n=== Teste de recuperação (slots liberados no close?) ===`);
  const r1 = await attempt("recovery-1");
  await sleep(800);
  const r2 = await attempt("recovery-2");
  if (r1 === "open" || r2 === "open") {
    console.log(`\n✓ Mesa ACEITOU nova conexão após fechar tudo.`);
    console.log(`  → Os slots se liberam no CLOSE limpo. O travamento vem de sockets ÓRFÃOS`);
    console.log(`    (não fechados) acumulando — exatamente o que o fix de higiene resolve.\n`);
  } else {
    console.log(`\n✗ Mesa NÃO aceitou nova conexão mesmo após fechar tudo.`);
    console.log(`  → A mesa NÃO libera o slot no close (leak de firmware) OU já travou.`);
    console.log(`    Provável necessidade de REINICIAR a mesa. Pauta com a DUONN.\n`);
  }
  process.exit(0);
})();
