/* ============================================================================
 * media-tx-hook.js — Sniffer de WebSocket da UI OFICIAL da mesa DUONN Axios
 * ----------------------------------------------------------------------------
 * Mapeia o protocolo do media player (página MEDIA → canal DIGI) capturando os
 * COMANDOS que a UI envia (TX) e os pushes que a mesa devolve (RX).
 *
 * NÃO recarrega a página (reload fecha o WebSocket). Faz patch da conexão JÁ
 * ABERTA via o registry global `WS` (WS.sockets[...]). RX é capturado com
 * addEventListener('message') na conexão existente.
 *
 * ANTI-FLOOD: por padrão NÃO loga nada ao vivo, exceto TX (comandos, que são
 * raros). Os pushes (5212, meters, etc.) são apenas ACUMULADOS — você inspeciona
 * por diferença. Fluxo de captura:
 *
 *     ax.snap()            // tira foto do estado atual
 *     // ...faça UMA ação na mesa (ex.: clicar Play)...
 *     ax.diff()            // mostra só o que mudou (TX e RX) desde o snap
 *
 * COMO INSTALAR:
 *   1. UI oficial aberta e conectada. DevTools (F12) → Console.
 *   2. Cole TODO este arquivo → Enter. (sem reload!)
 *   3. `ax.sockets()` confirma o socket. Se o registry não for `window.WS`,
 *      edite a constante REGISTRY no topo.
 *
 * API (objeto global `ax`):
 *   ax.snap()            fotografa o estado (TX+RX) para comparar
 *   ax.diff()            tabela do que mudou desde o último snap (o trabalho-chave)
 *   ax.mark('texto')     marcador/rótulo no console
 *   ax.watch([5212])     loga AO VIVO só esses params (mesmo RX), com throttle
 *   ax.unwatch()         limpa a watchlist
 *   ax.live(ms=400)      loga TUDO ao vivo com throttle por param (use com cautela)
 *   ax.quiet()           volta ao padrão (silencioso; só TX ao vivo)
 *   ax.top(15)           params mais frequentes (acha meters/flood)
 *   ax.dump()            todos os params vistos (param → último valor, TX/RX)
 *   ax.find(0x14)        filtra o dump por prefixo/intervalo (número)
 *   ax.clear()           zera tabelas e contadores
 *   ax.sockets()         lista as conexões e quais estão patcheadas
 *   ax.off()             restaura sends e remove listeners
 *
 * Frame Duonn: 128 / len / opcode / payload / crc16(2).
 *   op3 (write/push): pares de 4 bytes [pHi,pLo,vHi,vLo] (9 bytes = 1 par)
 *   op6 (read req):   pares de 2 bytes [pHi,pLo]
 * ==========================================================================*/
(function installAxiosMediaHook() {
  // Ajuste se o registry não for `window.WS`:
  const REGISTRY = window.WS;

  const t0 = performance.now();
  const rel = () => `+${((performance.now() - t0) / 1000).toFixed(3)}s`;

  // Send nativo do protótipo — usado para neutralizar qualquer patch de send anterior
  // (ex.: um logger colado antes), que é a causa comum de flood persistente.
  const PROTO_SEND = (window.WebSocket && window.WebSocket.prototype && window.WebSocket.prototype.send) || null;

  const S = {
    mode: "off",                // 'off' = silencioso total | 'tx' = comandos ao vivo | 'all' = tudo
    throttleMs: 400,
    watch: new Set(),           // params sempre logados ao vivo (bypassa mode)
    tx: new Map(),              // param -> último valor (origem TX)
    rx: new Map(),              // param -> último valor (origem RX)
    count: new Map(),           // "dir:param" -> nº de frames
    lastLog: new Map(),         // "dir:param" -> ts do último log (throttle)
    snapTx: new Map(),
    snapRx: new Map(),
    patched: [],
  };

  function toBytes(d) {
    if (d == null || typeof d === "string") return null;
    if (d instanceof ArrayBuffer) return new Uint8Array(d);
    if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    if (Array.isArray(d)) return Uint8Array.from(d);
    try { return Uint8Array.from(d); } catch { return null; }
  }
  const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(" ");

  function decode(b) {
    if (!b || b.length < 5 || b[0] !== 128) return null;
    const opcode = b[2];
    const pairs = [];
    if (opcode === 3) {
      for (let i = 3; i + 3 < b.length - 2; i += 4) pairs.push({ param: (b[i] << 8) | b[i + 1], value: (b[i + 2] << 8) | b[i + 3] });
      return { opcode, pairs, kind: "param" };
    }
    if (opcode === 6) {
      for (let i = 3; i + 1 < b.length - 2; i += 2) pairs.push({ param: (b[i] << 8) | b[i + 1], value: null });
      return { opcode, pairs, kind: "read" };
    }
    return { opcode, pairs, kind: "other" };
  }

  const style = (dir) => dir === "TX"
    ? "color:#fff;background:#b45309;padding:1px 4px;border-radius:3px;font-weight:700"
    : "color:#fff;background:#1d4ed8;padding:1px 4px;border-radius:3px;font-weight:700";

  function shouldLog(dir, param) {
    if (S.watch.has(param)) return throttle(dir, param);
    if (S.mode === "off") return false;
    if (S.mode === "tx" && dir === "RX") return false;
    return throttle(dir, param);
  }
  function throttle(dir, param) {
    const key = dir + ":" + param;
    const now = performance.now();
    const last = S.lastLog.get(key) ?? -Infinity;
    if (now - last < S.throttleMs) return false;
    S.lastLog.set(key, now);
    return true;
  }

  function record(dir, bytes) {
    const d = decode(bytes);
    if (!d) return;
    const { opcode, pairs, kind } = d;

    if (kind === "other") {
      S.count.set(dir + ":op0x" + opcode.toString(16), (S.count.get(dir + ":op0x" + opcode.toString(16)) ?? 0) + 1);
      if (S.mode === "all") console.log(`%c${dir}`, style(dir), rel(), `op0x${opcode.toString(16)}`, hex(bytes));
      return;
    }
    const store = dir === "TX" ? S.tx : S.rx;
    for (const { param, value } of pairs) {
      if (value !== null) store.set(param, value);
      const ckey = dir + ":" + param;
      S.count.set(ckey, (S.count.get(ckey) ?? 0) + 1);

      if (!shouldLog(dir, param)) continue;
      const valStr = value === null ? "READ" : `= ${value} (0x${value.toString(16)})`;
      console.log(`%c${dir}`, style(dir), rel(), `op${opcode}`, `param ${param} (0x${param.toString(16)})`, valStr);
    }
  }

  // ── patch dos sockets já abertos ──────────────────────────────────────────
  function collect() {
    if (!REGISTRY) return [];
    const src = REGISTRY.sockets ?? REGISTRY;
    const out = [];
    if (Array.isArray(src)) src.forEach((s, i) => { if (s && typeof s.send === "function") out.push([String(i), s]); });
    else if (src && typeof src === "object") for (const k of Object.keys(src)) { const s = src[k]; if (s && typeof s.send === "function") out.push([k, s]); }
    return out;
  }
  function patch(key, sock) {
    if (sock.__axPatched) return false;
    sock.__axPatched = true;
    // Usa o send NATIVO do protótipo (não o da instância), neutralizando qualquer
    // logger de send colado antes — fonte comum de flood que persiste por baixo.
    const wasPatched = PROTO_SEND && sock.send !== PROTO_SEND;
    const realSend = PROTO_SEND ? (data) => PROTO_SEND.call(sock, data) : sock.send.bind(sock);
    sock.send = function (data) { const b = toBytes(data); if (b) record("TX", b); return realSend(data); };
    const onMsg = (ev) => { const b = toBytes(ev.data); if (b) record("RX", b); };
    sock.addEventListener("message", onMsg);
    S.patched.push({ sock, realSend, onMsg });
    if (wasPatched) console.warn(`%c[ax] socket ${key}: havia um patch de send anterior — neutralizado (send nativo).`, "color:#d97706;font-weight:700");
    return true;
  }

  const socks = collect();
  if (socks.length === 0) console.error("%c[ax] não achei window.WS.sockets — edite REGISTRY no topo e cole de novo.", "color:#dc2626;font-weight:700");
  let n = 0; for (const [k, s] of socks) if (patch(k, s)) n++;

  function changes(beforeMap, nowMap) {
    const rows = [];
    for (const [param, value] of nowMap) {
      const before = beforeMap.get(param);
      if (before !== value) rows.push({ param, hex: "0x" + param.toString(16), before: before ?? "—", now: value });
    }
    return rows.sort((a, b) => a.param - b.param);
  }

  window.ax = {
    snap() { S.snapTx = new Map(S.tx); S.snapRx = new Map(S.rx); console.log(`%c[ax] snap (tx ${S.snapTx.size} / rx ${S.snapRx.size})`, "color:#16a34a"); },
    diff() {
      const tx = changes(S.snapTx, S.tx), rx = changes(S.snapRx, S.rx);
      console.log(`%c━ DIFF desde o snap ━`, "color:#a855f7;font-weight:800");
      if (tx.length) { console.log("%cTX (comandos enviados):", "color:#b45309;font-weight:700"); console.table(tx); } else console.log("TX: nada mudou");
      if (rx.length) { console.log("%cRX (pushes da mesa):", "color:#1d4ed8;font-weight:700"); console.table(rx); } else console.log("RX: nada mudou");
    },
    mark(t = "") { console.log(`%c━━━━━ ${rel()}  ${t} ━━━━━`, "color:#a855f7;font-weight:800;font-size:12px"); },
    watch(params = []) { S.watch = new Set(params); console.log(`[ax] watch: ${[...S.watch].join(", ") || "—"}`); },
    unwatch() { S.watch.clear(); console.log("[ax] watch limpo"); },
    live(ms = 400) { S.mode = "all"; S.throttleMs = ms; console.log(`[ax] LIVE (throttle ${ms}ms/param) — use ax.quiet() para parar`); },
    quiet() { S.mode = "off"; console.log("[ax] silencioso total (nada ao vivo; use snap/diff/watch)"); },
    txlive() { S.mode = "tx"; console.log("[ax] TX ao vivo (comandos); pushes via snap/diff"); },
    top(k = 15) {
      const rows = [...S.count.entries()].sort((a, b) => b[1] - a[1]).slice(0, k)
        .map(([key, count]) => { const [dir, p] = key.split(":"); return { dir, param: +p, hex: "0x" + (+p).toString(16), frames: count }; });
      console.table(rows);
    },
    dump() {
      const all = new Map();
      for (const [p, v] of S.tx) all.set(p, { param: p, hex: "0x" + p.toString(16), tx: v, rx: all.get(p)?.rx });
      for (const [p, v] of S.rx) all.set(p, { ...(all.get(p) ?? { param: p, hex: "0x" + p.toString(16) }), rx: v });
      console.table([...all.values()].sort((a, b) => a.param - b.param));
    },
    find(prefix) {
      const lo = prefix, hi = prefix < 256 ? (prefix << 8) | 0xff : prefix;
      const rows = [];
      for (const [p, v] of S.rx) if ((p >= lo && p <= hi) || (p >> 8) === prefix) rows.push({ param: p, hex: "0x" + p.toString(16), rx: v, tx: S.tx.get(p) });
      console.table(rows.sort((a, b) => a.param - b.param));
    },
    clear() { S.tx.clear(); S.rx.clear(); S.count.clear(); S.snapTx.clear(); S.snapRx.clear(); S.lastLog.clear(); console.log("[ax] limpo"); },
    sockets() { console.table(collect().map(([key, s]) => ({ key, readyState: s.readyState, patched: !!s.__axPatched, url: s.url }))); },
    off() { for (const p of S.patched) { try { p.sock.send = PROTO_SEND ?? p.realSend; p.sock.removeEventListener("message", p.onMsg); delete p.sock.__axPatched; } catch {} } S.patched = []; console.log("[ax] hooks removidos (send restaurado para o nativo)"); },
  };

  console.log(
    `%c[ax] instalado em ${n} socket(s). SILENCIOSO TOTAL — não loga nada ao vivo (sem flood). ` +
    `Fluxo: ax.snap() → faça UMA ação → ax.diff(). Param específico ao vivo: ax.watch([5212]).`,
    "color:#16a34a;font-weight:800;font-size:13px"
  );
  console.log(
    `%c[ax] se você tinha um logger colado antes, o patch de send dele foi neutralizado. ` +
    `Se AINDA houver flood, é um listener de RX antigo — me mostre UMA linha do flood que eu identifico.`,
    "color:#6b7280"
  );
})();
