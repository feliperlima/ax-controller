#!/usr/bin/env node

// Mapear DIGI na AX32
// Captura valores de TODOS os parâmetros (2-50) para entender o padrão

const ip = '192.168.1.75';
const port = 8088;

// Testa params 2-50 para descobrir DIGI
const allParams = Array.from({ length: 49 }, (_, i) => i + 2);

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

function buildPacket(opcode, payload = []) {
  const data = [128, 3 + payload.length, opcode, ...payload];
  const crc = crc16(data);
  return Uint8Array.from([...data, (crc >> 8) & 255, crc & 255]);
}

function buildReadParamsPacket(readParams) {
  const payload = [];
  for (const param of readParams) {
    payload.push((param >> 8) & 255, param & 255);
  }
  return buildPacket(6, payload);
}

function decode(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 9 || bytes[0] !== 128 || bytes[2] !== 6) return [];
  const items = [];
  for (let i = 3; i < bytes.length - 2; i += 4) {
    items.push({
      param: (bytes[i] << 8) | bytes[i + 1],
      value: (bytes[i + 2] << 8) | bytes[i + 3],
    });
  }
  return items;
}

const ws = new WebSocket(`ws://${ip}:${port}/`);
const last = new Map();
let ready = false;
let timer = null;

ws.binaryType = 'arraybuffer';

ws.addEventListener('open', () => {
  ready = true;
  console.log(`\n🔗 Conectado a ws://${ip}:${port}/`);
  console.log(`📊 Capturando params 2-50 para mapear DIGI na AX32...\n`);
  
  const poll = () => {
    if (!ready) return;
    ws.send(buildReadParamsPacket(allParams));
    timer = setTimeout(poll, 300);
  };
  poll();
});

ws.addEventListener('message', async (event) => {
  const buffer = event.data instanceof ArrayBuffer
    ? event.data
    : event.data?.arrayBuffer
      ? await event.data.arrayBuffer()
      : null;
  if (!buffer) return;

  const decoded = decode(buffer);
  if (decoded.length === 0) return;

  // Agrupa por padrão de valores para descobrir qual é DIGI
  const byPattern = {};
  
  for (const item of decoded) {
    const prev = last.get(item.param);
    
    if (prev !== item.value && item.value !== 0) {
      // Detecta qual param deve ser DIGI (último par)
      // CH1-16: params 2-9 (8 params)
      // CH17-32: params 10-17 (8 params)
      // DIGI: params 18+ ??
      
      const channelPair = (item.param - 2) * 2 + 1;
      const category = 
        item.param >= 2 && item.param <= 9 ? `CH${channelPair}-${channelPair + 1} (channels 1-16)` :
        item.param >= 10 && item.param <= 17 ? `CH${channelPair}-${channelPair + 1} (channels 17-32)` :
        item.param >= 18 ? `?? POSSÍVEL DIGI (param ${item.param})` :
        'UNKNOWN';

      console.log(`param=${item.param.toString().padStart(2)} value=${item.value.toString().padStart(5)} → ${category}`);
      last.set(item.param, item.value);
    }
  }
});

ws.addEventListener('close', (event) => {
  ready = false;
  if (timer) clearTimeout(timer);
  console.log(`\n❌ Desconectado (code=${event.code})`);
});

ws.addEventListener('error', (event) => {
  console.log(`⚠️  WebSocket error: ${event?.message || 'unknown'}`);
});

// Aguarda 15 segundos
setTimeout(() => {
  console.log('\n✅ Captura finalizada');
  process.exit(0);
}, 15000);
