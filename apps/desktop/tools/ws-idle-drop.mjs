// ============================================================================
// ws-idle-drop.mjs — Mede o "idle-drop" da mesa (quando ela libera conexões ociosas)
// ----------------------------------------------------------------------------
// Segura N conexões INATIVAS (sem mandar nada no nível de app — simula órfãs) e, ao
// longo do tempo, conta quantas continuam vivas e sonda se um "novo cliente" consegue
// entrar. Mostra se/quando a mesa derruba as ociosas (idle-drop) e em quanto tempo.
//
//   • Se as "presas vivas" caem e o novo cliente passa a conectar → a mesa LIMPA
//     ociosas sozinha (idle-drop). Travamento real = churn/storm, não acúmulo lento.
//   • Se ficam 12 vivas e o novo cliente segue recusado → órfã NÃO é limpa (persiste
//     até fechar/reiniciar) → fechar a conexão antiga é obrigatório.
//
// ⚠️ TRAVA A MESA por ~40s (é o objetivo). Recupera ao final. Não rode num show.
//
// USO: node apps/desktop/tools/ws-idle-drop.mjs <IP> [porta] [encher] [segundos]
// ============================================================================

import WebSocket from "ws";

const IP = process.argv[2] || "192.168.1.20";
const PORT = Number(process.argv[3] || 8088);
const FILL = Number(process.argv[4] || 13);
const WATCH_S = Number(process.argv[5] || 30);
const WS_URL = `ws://${IP}:${PORT}/`;
const OPEN_TIMEOUT_MS = 4000;
const opts = { handshakeTimeout: OPEN_TIMEOUT_MS, perMessageDeflate: false, origin: `http://${IP}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// abre uma conexão; resolve {ok, ws}. NÃO fecha (cabe ao chamador).
function open() {
  return new Promise((resolve) => {
    let done = false;
    let ws;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(t); resolve({ ok, ws: ok ? ws : null }); };
    const t = setTimeout(() => { try { ws?.terminate?.(); } catch { /* */ } finish(false); }, OPEN_TIMEOUT_MS);
    try { ws = new WebSocket(WS_URL, opts); } catch { return finish(false); }
    ws.onopen = () => finish(true);
    ws.onerror = () => finish(false);
    ws.onclose = () => finish(false);
  });
}

(async () => {
  console.log(`\n=== Idle-drop test → ${WS_URL} (encher ${FILL}, observar ${WATCH_S}s) ===\n`);

  console.log(`Enchendo (segurando INATIVAS, sem mandar nada no nível de app)...`);
  const held = [];
  for (let i = 1; i <= FILL; i++) {
    const r = await open();
    if (r.ok && r.ws) held.push(r.ws);
    await sleep(120);
  }
  console.log(`  → ${held.length} conexões presas e inativas.\n`);

  console.log(`Observando idle-drop (presas vivas + sonda de novo cliente) a cada 2s:`);
  const t0 = Date.now();
  let firstFreeAt = null;
  while ((Date.now() - t0) / 1000 < WATCH_S) {
    const alive = held.filter((w) => w.readyState === 1).length; // 1 = OPEN
    const probe = await open(); // sonda: tem slot livre AGORA?
    const ts = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  [t=${ts}s] presas vivas: ${alive}/${held.length} | novo cliente: ${probe.ok ? "OPEN ✓" : "RECUSADA ✗"}`);
    if (probe.ok) {
      if (firstFreeAt === null) firstFreeAt = Number(ts);
      try { probe.ws.close(); } catch { /* */ } // libera a sonda p/ não competir
    }
    await sleep(2000);
  }

  console.log(`\nFechando as presas + checando recuperação...`);
  for (const w of held) { try { w.close(); } catch { /* */ } }
  await sleep(2500);
  const rec = await open();
  try { rec.ws?.close(); } catch { /* */ }

  console.log(`\n=== Conclusão ===`);
  const aliveEnd = held.filter((w) => w.readyState === 1).length;
  if (firstFreeAt !== null) {
    console.log(`A mesa LIBEROU slot de conexão ociosa por volta de t=${firstFreeAt}s (idle-drop ativo).`);
    console.log(`→ Órfã ociosa NÃO fica presa indefinidamente; o travamento "até reiniciar" vem de`);
    console.log(`  CHURN/STORM (abrir mais rápido do que a mesa limpa) + múltiplos devices. O fix`);
    console.log(`  (fechar antes de reconectar + sem storm) ataca exatamente isso.`);
  } else if (aliveEnd >= held.length) {
    console.log(`Nenhum slot liberou em ${WATCH_S}s com as presas vivas → órfã ociosa PERSISTE.`);
    console.log(`→ Fechar a conexão antiga é OBRIGATÓRIO (a mesa não limpa sozinha em tempo útil).`);
  } else {
    console.log(`Algumas presas caíram mas o novo cliente seguiu recusado — comportamento misto; ver o log acima.`);
  }
  console.log(`Recuperação após fechar tudo: ${rec.ok ? "✓ aceita" : "✗ ainda recusa (talvez travada — reiniciar)"}\n`);
  process.exit(0);
})();
