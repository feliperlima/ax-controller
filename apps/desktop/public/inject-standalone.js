// ============================================================
// AX WebSocket Capture - Script Standalone de Injeção
// ============================================================
// 
// USO:
// 1. Abra http://192.168.1.75 no navegador
// 2. Pressione F12 (DevTools)
// 3. Vá para aba "Console"
// 4. Copie e cole TODO este arquivo (de // até o final)
// 5. Pressione Enter
//
// Você verá mensagens de sucesso em VERDE no console.
//
// ============================================================

(function() {
  'use strict';

  // Estado global de captura
  window.AX_CAPTURE = {
    enabled: true,
    logs: [],
    txCount: 0,
    rxCount: 0,
    sessionStart: Date.now(),
    initialized: false,

    // Registra evento TX ou RX
    log(type, socketId, byteLength, rawData) {
      if (!this.enabled) return;
      try {
        const entry = {
          at: Date.now() - this.sessionStart,
          type: type, // TX ou RX
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
      } catch (e) {
        console.error('[AX_CAPTURE] Log error:', e);
      }
    },

    _toHex(buffer) {
      try {
        return Array.from(new Uint8Array(buffer))
          .map((b) => ('0' + b.toString(16)).slice(-2))
          .join('');
      } catch (e) {
        return 'error';
      }
    },

    _logToConsole(entry) {
      const prefix = entry.type === 'TX' ? '→' : '←';
      const style = entry.type === 'TX' 
        ? 'color: #0ff; font-weight: bold;'
        : 'color: #f0f; font-weight: bold;';
      console.log(
        `%c${prefix} ${entry.type} [${entry.at}ms] len=${entry.byteLength}`,
        style,
        entry.hex
      );
    },

    // Controles de API
    summary() {
      console.group('%c📊 AX_CAPTURE Summary', 'color: #0f0; font-weight: bold;');
      console.table({
        'TX Count': this.txCount,
        'RX Count': this.rxCount,
        'Total Logs': this.logs.length,
        'Session Duration (ms)': Date.now() - this.sessionStart,
        'Enabled': this.enabled ? '✓ YES' : '✗ NO',
      });
      if (this.logs.length > 0) {
        console.log('First log:', this.logs[0]);
        console.log('Last log:', this.logs[this.logs.length - 1]);
      }
      console.groupEnd();
    },

    clear() {
      this.logs = [];
      this.txCount = 0;
      this.rxCount = 0;
      this.sessionStart = Date.now();
      console.log('%c[AX_CAPTURE] ✓ Cleared all logs', 'color: #0f0; font-weight: bold;');
    },

    toggle() {
      this.enabled = !this.enabled;
      console.log(
        '%c[AX_CAPTURE] ' + (this.enabled ? '✓ ENABLED' : '✗ DISABLED'),
        'color: #0f0; font-weight: bold;'
      );
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
      console.group('%c📤 AX_CAPTURE Export', 'color: #0f0; font-weight: bold;');
      console.log(json);
      console.groupEnd();
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(json).then(() => {
          console.log('%c[AX_CAPTURE] ✓ JSON copied to clipboard!', 'color: #0f0;');
        }).catch(() => {
          console.log('%c[AX_CAPTURE] Clipboard copy failed, check console for JSON', 'color: #ff0;');
        });
      }
      return data;
    },

    sequence() {
      const seq = this.logs.map((log) => `${log.type}[${log.at}ms]`).join(' → ');
      console.log('%c[AX_CAPTURE] Sequence:', 'color: #0f0;', seq);
      return seq;
    },

    stats() {
      const unique = new Set(this.logs.map((log) => log.hex));
      console.log('%c[AX_CAPTURE] Stats:', 'color: #0f0;', {
        totalLogs: this.logs.length,
        uniqueMessages: unique.size,
        txPercent: Math.round((this.txCount / (this.txCount + this.rxCount)) * 100) + '%',
      });
    },
  };

  // ============================================================
  // HOOKS: Interceptar WebSocket TX/RX
  // ============================================================

  if (typeof WebSocket !== 'undefined') {
    const OrigWebSocket = WebSocket;
    const originalSend = OrigWebSocket.prototype.send;

    // Hook TX (send)
    OrigWebSocket.prototype.send = function(data) {
      if (data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(data);
        const socketId = `ws_${this.url ? this.url.split(':').pop() : 'unknown'}`;
        window.AX_CAPTURE.log('TX', socketId, bytes.length, bytes);
      } else if (data instanceof Uint8Array) {
        const socketId = `ws_${this.url ? this.url.split(':').pop() : 'unknown'}`;
        window.AX_CAPTURE.log('TX', socketId, data.length, data);
      }
      return originalSend.call(this, data);
    };

    // Hook RX (onmessage)
    const descriptor = Object.getOwnPropertyDescriptor(OrigWebSocket.prototype, 'onmessage') || {
      get: function() { return this._origOnMessage; },
      set: function(handler) { this._origOnMessage = handler; },
    };

    Object.defineProperty(OrigWebSocket.prototype, 'onmessage', {
      get: descriptor.get,
      set(handler) {
        const self = this;
        this._origOnMessage = function(event) {
          if (event.data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(event.data);
            const socketId = `ws_${self.url ? self.url.split(':').pop() : 'unknown'}`;
            window.AX_CAPTURE.log('RX', socketId, bytes.length, bytes);
          }
          return handler.call(this, event);
        };
      },
    });

    window.AX_CAPTURE.initialized = true;
  }

  // ============================================================
  // DISPLAY BANNER
  // ============================================================

  console.log(
    '%c╔══════════════════════════════════════════════════════════════════╗\n' +
    '║                 ✓ AX WebSocket Capture - Ready                  ║\n' +
    '║                                                                  ║\n' +
    '║  📊 Commands:                                                    ║\n' +
    '║    AX_CAPTURE.summary()       → Show stats                       ║\n' +
    '║    AX_CAPTURE.clear()         → Clear all logs                   ║\n' +
    '║    AX_CAPTURE.export()        → Save to JSON + clipboard         ║\n' +
    '║    AX_CAPTURE.toggle()        → Enable/disable capture           ║\n' +
    '║    AX_CAPTURE.sequence()      → Show event order                 ║\n' +
    '║    AX_CAPTURE.stats()         → Advanced stats                   ║\n' +
    '║    AX_CAPTURE.logs            → Raw logs array                   ║\n' +
    '║                                                                  ║\n' +
    '║  🔴 Test A: CH1 Microphone                                       ║\n' +
    '║    1. AX_CAPTURE.clear()                                         ║\n' +
    '║    2. Speak in CH1 microphone for 5 seconds                      ║\n' +
    '║    3. AX_CAPTURE.summary()                                       ║\n' +
    '║    4. AX_CAPTURE.export()                                        ║\n' +
    '║                                                                  ║\n' +
    '║  🔴 Test B: CH31/32 Spotify                                      ║\n' +
    '║    1. AX_CAPTURE.clear()                                         ║\n' +
    '║    2. Route Spotify to CH31/32 and play for 5 seconds            ║\n' +
    '║    3. AX_CAPTURE.summary()                                       ║\n' +
    '║    4. AX_CAPTURE.export()                                        ║\n' +
    '║                                                                  ║\n' +
    '╚══════════════════════════════════════════════════════════════════╝',
    'color: #0f0; font-family: monospace; font-weight: bold; white-space: pre;'
  );

  console.log(
    '%c[AX_CAPTURE] Hooks installed: %s',
    'color: #0f0; font-weight: bold;',
    window.AX_CAPTURE.initialized ? '✓ WebSocket' : '✗ Failed'
  );

})();

// ============================================================
// End of AX Capture injection script
// ============================================================
