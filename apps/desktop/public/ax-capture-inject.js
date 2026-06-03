// AX WebSocket Capture - Injection Script
// Abra http://192.168.1.75 no navegador, abra o DevTools (F12), vá em Console, e copie/cole este script inteiro.
// Isso intercepta TX/RX do WebSocket em nível Emscripten sem quebrar a UI.

(function() {
  'use strict';

  // Estado global de captura
  window.AX_CAPTURE = {
    enabled: true,
    logs: [],
    txCount: 0,
    rxCount: 0,
    sessionStart: Date.now(),

    // Registra um evento de TX ou RX
    log(type, socketId, byteLength, rawData) {
      if (!this.enabled) return;
      const entry = {
        at: Date.now() - this.sessionStart,
        type: type, // 'TX' ou 'RX'
        socketId: socketId,
        byteLength: byteLength,
        hex: this._toHex(rawData).slice(0, 128),
        bytes: Array.from(new Uint8Array(rawData)).slice(0, 32),
      };
      this.logs.push(entry);
      if (this.logs.length > 200) this.logs.shift();
      if (type === 'TX') this.txCount += 1;
      else this.rxCount += 1;
      this._logToConsole(entry);
    },

    _toHex(buffer) {
      return Array.from(new Uint8Array(buffer))
        .map((b) => ('0' + b.toString(16)).slice(-2))
        .join('');
    },

    _logToConsole(entry) {
      const prefix = entry.type === 'TX' ? '→' : '←';
      console.log(
        `%c${prefix} ${entry.type} [${entry.at}ms]`,
        entry.type === 'TX' ? 'color: #0ff;' : 'color: #f0f;',
        `len=${entry.byteLength}`,
        `hex=${entry.hex}`
      );
    },

    // Controles de API
    summary() {
      console.table({
        'TX Count': this.txCount,
        'RX Count': this.rxCount,
        'Total Logs': this.logs.length,
        'Session Duration (ms)': Date.now() - this.sessionStart,
      });
    },

    clear() {
      this.logs = [];
      this.txCount = 0;
      this.rxCount = 0;
      this.sessionStart = Date.now();
      console.log('%c[AX_CAPTURE] Cleared', 'color: #0f0;');
    },

    toggle() {
      this.enabled = !this.enabled;
      console.log('%c[AX_CAPTURE] ' + (this.enabled ? 'ENABLED' : 'DISABLED'), 'color: #0f0;');
    },

    export() {
      const data = {
        capturedAt: new Date().toISOString(),
        sessionDuration: Date.now() - this.sessionStart,
        txCount: this.txCount,
        rxCount: this.rxCount,
        logs: this.logs,
      };
      const json = JSON.stringify(data, null, 2);
      console.log('%c[AX_CAPTURE] Exported:', 'color: #0f0;');
      console.log(json);
      // Também copia para clipboard se disponível
      if (navigator.clipboard) {
        navigator.clipboard.writeText(json).then(() => {
          console.log('%c[AX_CAPTURE] JSON copiado para clipboard!', 'color: #0f0;');
        });
      }
      return data;
    },

    // Filtro para análise rápida
    filter(predicate) {
      return this.logs.filter(predicate);
    },

    // Reconstruir sequência TX/RX
    sequence() {
      return this.logs.map((log) => `${log.type}[${log.at}]`).join(' → ');
    },
  };

  // Interceptar primitivos de rede
  // A interface AXIOS usa Emscripten WebSocket. Vamos interceptar o envio de dados.

  // Hook 1: Interceptar WebSocket.send
  if (typeof WebSocket !== 'undefined') {
    const OrigWebSocket = WebSocket;
    const originalSend = OrigWebSocket.prototype.send;

    OrigWebSocket.prototype.send = function(data) {
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        const bytes = data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : data;
        // Estimar um socketId baseado no estado interno
        const socketId = `ws_${this.url ? this.url.split(':').pop() : 'unknown'}`;
        window.AX_CAPTURE.log('TX', socketId, bytes.length, bytes);
      }
      return originalSend.call(this, data);
    };

    // Também interceptar RX
    const OrigOnMessage = OrigWebSocket.prototype.onmessage;
    Object.defineProperty(OrigWebSocket.prototype, 'onmessage', {
      get() {
        return this._origOnMessage;
      },
      set(handler) {
        this._origOnMessage = function(event) {
          if (event.data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(event.data);
            const socketId = `ws_${this.url ? this.url.split(':').pop() : 'unknown'}`;
            window.AX_CAPTURE.log('RX', socketId, bytes.length, bytes);
          }
          return handler.call(this, event);
        };
      },
    });

    console.log('%c[AX_CAPTURE] WebSocket hooks installed', 'color: #0f0;');
  }

  // Exibir instruções de uso
  console.log(
    '%c╔════════════════════════════════════════════════════════════╗\n' +
    '║              AX WebSocket Capture - Ready                 ║\n' +
    '║                                                            ║\n' +
    '║ Commands:                                                  ║\n' +
    '║  AX_CAPTURE.summary()      - Resumo de TX/RX              ║\n' +
    '║  AX_CAPTURE.clear()        - Limpar logs                  ║\n' +
    '║  AX_CAPTURE.export()       - Exportar JSON                ║\n' +
    '║  AX_CAPTURE.toggle()       - Ativar/desativar             ║\n' +
    '║  AX_CAPTURE.logs           - Array de logs brutos         ║\n' +
    '║  AX_CAPTURE.sequence()     - Sequência de eventos         ║\n' +
    '║                                                            ║\n' +
    '║ Próximas ações:                                            ║\n' +
    '║  1. Limpe: AX_CAPTURE.clear()                             ║\n' +
    '║  2. Fale no CH1 por 5s                                     ║\n' +
    '║  3. Exporte: AX_CAPTURE.export()                          ║\n' +
    '║  4. Limpe: AX_CAPTURE.clear()                             ║\n' +
    '║  5. Toque Spotify em CH31/32 por 5s                       ║\n' +
    '║  6. Exporte: AX_CAPTURE.export()                          ║\n' +
    '╚════════════════════════════════════════════════════════════╝',
    'color: #0f0; font-weight: bold;'
  );
})();
