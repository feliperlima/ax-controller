#!/usr/bin/env node

// Capture what params the app is requesting (TX packets)
const ip = '192.168.1.75';
const port = 8088;

function crc16(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc & 0xffff;
}

function decodeTxPacket(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 9 || bytes[0] !== 128 || bytes[2] !== 6) return [];
  
  const params = [];
  for (let i = 3; i < bytes.length - 2; i += 2) {
    const param = (bytes[i] << 8) | bytes[i + 1];
    params.push(param);
  }
  return params;
}

const ws = new WebSocket(`ws://${ip}:${port}/`);
let packetCount = 0;
let lastParams = null;

ws.binaryType = 'arraybuffer';

ws.addEventListener('open', () => {
  console.log(`\n🔗 Conectado a ws://${ip}:${port}/`);
  console.log(`👂 Escutando pacotes TX do app...\n`);
});

ws.addEventListener('message', async (event) => {
  // Este é um servidor WS, então vamos capturar mensagens que chegam
  // Mas na verdade, só vamos ver as respostas RX
  // Para ver TX, precisaríamos ser MITM
  // Então vamos inverter: vamos escutar as RX e ver qual range de params estão respondendo
});

ws.addEventListener('close', (event) => {
  console.log(`\n❌ Desconectado (code=${event.code})`);
});

ws.addEventListener('error', (event) => {
  console.log(`⚠️  WebSocket error: ${event?.message || 'unknown'}`);
});

console.log('Nota: Para capturar TX, precisaríamos ser MITM. Alternativa: ver em console.log do app.');
