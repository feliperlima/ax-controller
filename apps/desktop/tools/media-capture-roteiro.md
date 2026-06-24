# Roteiro de captura — Protocolo MEDIA (canal DIGI)

Working doc da Fase 1. Operate a UI oficial com o hook instalado e preencha as tabelas.
Quando completo, vira a seção "MEDIA / DIGI player" em `docs/KNOWN_MAPPINGS.md`.

---

## Protocolo decodificado — achados confirmados (AX16/24)

### Formato dos frames especiais

**op0x72 (TX — comando para a mesa):**
```
80 06 72 00 00 [CMD] [CRC_HI CRC_LO]
```
Length = 0x06 = opcode(1) + payload(3) + CRC(2).
Payload é sempre `00 00 [CMD]` — o byte de comando é o 3º byte do payload.

**op0x72 longo (TX — seleção de faixa por offset, 14 bytes):**
```
80 0c 72 00 00 d1 [OFF_LO OFF_HI] d2 01 00 d0 [CRC_HI CRC_LO]
```
- `OFF_LO OFF_HI` = **handle opaco da faixa**, 16-bit little-endian — obtido via scan (ver Seção 10)
  - **NÃO é posição de áudio em 10ms** — é um identificador interno da mesa (provável posição FAT ou estrutura de playlist interna)
- Exemplos confirmados: faixa 1 → `07 00` (handle=7); faixa 2 → `f3 0a` (handle=2803); faixa 3 → `c8 26` (handle=9928); faixa 4 → `af 3d` (handle=15791); última (16) → `11 b7` (handle=46865)
- Os handles são obtidos via **scan** (protocolo capturado — ver Seção 10)

**op0x71 Type B (RX — status com device/mode/track):**
```
80 0f 71 02 [device] [mode] 1f 00 [b8] 00 [track] 00 00 [tick] [flags] [CRC_HI CRC_LO]
```
- `device`: 0x00=none/idle, 0x02=USB Player, 0x04=USB buscando/loading (transitório), 0x05=Recorder, 0x06=Bluetooth, 0x0a=SPDIF/Coax
- `mode` (USB): 0x02=paused, 0x03=playing; (BT): 0x01=desconectado, 0x02=paused, 0x03=playing; (Recorder): 0x01=pronto, 0x05=gravando
- **device=0x00, mode=0x04** = USB Player selecionado mas sem arquivo/pendrive (estado "none" com source ativa) — distinto de device=0x00 mode=0x00 (sem source)
- `b8`: para USB=0x0e (normal) / 0x10 (playing?); para Recorder=nº de arquivos no pendrive
- `track`: número da faixa atual (1-based)
- `tick`: tempo decorrido em unidades de ~0.9s (reset no song change)
- `flags` (byte[14]): bit 5 (0x20) sempre ativo; bit 3 (0x08) = **repeat ON** → 0x28=repeat ON, 0x20=repeat OFF

**op0x71 Type A (RX — heartbeat/tick):**
```
80 0f 71 80 [tick] [b5] [b6] 00 00 [OFF_HI] [OFF_LO] 00 00 00 00 [CRC_HI CRC_LO]
```
- `tick` (b[4]): mesmo contador de Type B (~0.9s/unidade, reset no song change)
- bytes 9-10 (`OFF_HI OFF_LO`): **handle opaco da faixa atual** em big-endian 16-bit
  - Imediatamente após song change: b[4]=0 (tick reset) e b[9..10]=handle da nova faixa
  - O handle corresponde exatamente ao offset do scan: faixa 1→`0007`, última→`b711` ✅
  - **NÃO é posição de áudio em 10ms** — NÃO derive duração por diferença entre handles
  - A duração real vem do **sub-frame de extensão 0x06 do scan** (byte `dur`, em segundos)
- b[5..6] variam por faixa/estado (precisam de mais capturas)

**op0x71 Type 0x82 (RX — scan de diretório/playlist):**
Resposta ao scan — entregue em sub-frames por entrada de arquivo.

Sub-frame header (b[5]=0xaa):
```
80 0f 71 82 0a aa [len_hi len_lo] [b8] [b9] [IDX] [TYPE] 00 00 00 [CRC CRC]
```
- IDX = índice da entrada (1-based)
- TYPE:
  - `0x01` = arquivo WAV (ASCII name)
  - `0x40` = subdiretório regular (ex.: pasta RECORD)
  - `0x41` = **último entry do scan** (0x40 | 0x01) — "scan finished!" com count=IDX
  - `0x80` = subdiretório do sistema/macOS (ex.: `.Spotlight-V10`, `.fseventsd`)
  - `0x81` = arquivo com nome UTF-16 (macOS `._xxx`) — **ignorar** no app
  - `0xc0` = último subdiretório no nível atual (observado no final do scan de root)
- Quando TYPE=0x41 → "scan finished! count=IDX"

Sub-frame nome (b[5]≠0xaa, b[4]=0x0a):
```
80 0f 71 82 0a [OFF_HI] [OFF_LO] [nome_bytes...] [CRC CRC]
```
- **b[5..6] = start_offset em big-endian 16-bit** — é EXATAMENTE o valor que vai no frame de seleção (LE 16-bit)
- nome_bytes: ASCII para arquivos normais, UTF-16 LE para arquivos macOS `._`
- Nomes longos chegam em múltiplos sub-frames consecutivos

Sub-frame extensão (b[4]=0x05 ou 0x06):
```
80 0f 71 82 06 [ext_null_terminated] [duration_lo] 00 00 00 00 [CRC CRC]
```
- extensão: `.WAV\0` (5 bytes)
- duration_lo: duração do arquivo em **segundos** (byte único, ex.: 0xe0=224s=3:44)

Sub-frame tipo 0x01/0x03/0x07 (outros metadados — tamanho/count):
```
80 0f 71 82 01 [size_lo] 00 [count] 00 00 ... CRC
80 0f 71 82 03 00 00 [N] 00 ... CRC
80 0f 71 82 07 [name_continuation...] CRC
```

**op0x72 médio (TX — scan, 9 bytes):**
```
80 09 72 [SEQ] 00 d1 08 00 d0 [CRC_HI CRC_LO]
```
- SEQ = sequência de leitura de entradas (0x01, 0x02, ...) — "ler próxima entrada"

**op0x72 navegação de diretório (TX — scan, 14 bytes, d2=02):**
```
80 0c 72 00 00 d1 [OFF_LO OFF_HI] d2 02 00 d0 [CRC_HI CRC_LO]
```
- d2=**02** (vs d2=01 na seleção de faixa) — modo diretório/scan
- `OFF_LO OFF_HI` = offset handle do diretório alvo (LE 16-bit), vindo do scan do diretório pai
  - `0x00 0x00` = raiz do pendrive
  - `0x06 0x00` = pasta RECORD (offset=6 no scan de raiz) → `80 0c 72 00 00 d1 06 00 d2 02 00 d0 [CRC]`
  - Para entrar num subdir: usar o valor b[5..6] (big-endian) do sub-frame nome daquele dir, convertido para LE

**op0x71 Type C (RX — status device BT/none, sem track):**
```
80 0f 71 02 [device] [mode] 1f 00 00 00 00 00 00 [tick] [unk] [CRC_HI CRC_LO]
```
Bytes 8-9 mudam vs Type B (0x0e 0x00 → 0x00 0x00). Aparece quando device ≠ USB.

**op0x71 — campo b[3]: flag global de presença de disco USB**
```
b[3]=0x02 → disco USB fisicamente presente no mixer (qualquer que seja o device ativo)
b[3]=0x00 → nenhum disco USB presente
b[3]=0x80 → Type A (heartbeat)
b[3]=0x82 → scan de diretório
```
A flag é **global** — não é específica do device ativo. BT com disco presente = b[3]=0x02. BT sem disco = b[3]=0x00. Recorder sem disco = b[3]=0x00.

**op0x71 Type 0x00 (RX — status SEM DISCO USB):**
```
80 0f 71 00 [device] [mode] 1f 00 00 00 00 00 00 00 [flags] [CRC_HI CRC_LO]
```
Exemplos:
```
Recorder sem disco:  80 0f 71 00 05 01 1f 00 00 00 00 00 00 00 08 9e bf
None puro (pull):    80 0f 71 00 00 00 1f 00 00 00 00 00 00 00 00 51 fe
BT sem disco:        80 0f 71 00 06 01 1f 00 00 00 00 00 00 02 08 ba b1
```
- **b[3]=0x00** — distingue do Type B (b[3]=0x02)
- Mesmo layout de Type B — device/mode ainda refletem qual fonte estava ativa
- Quando Type 0x00: **nenhum CMD tem efeito** — todos os CMDs são ignorados pela mesa
- Retorna ao Type B (b[3]=0x02) quando disco é inserido ("usb disk plug in")

**Sequência de eventos: USB pull-out (confirmado)**
```
"usb disk pull out"
→ 80 0f 71 00 00 00 1f ... (Type 0x00, device=0x00, mode=0x00 — "none puro")
→ "play device: bluetooth"  (se BT pareado)
→ 80 0f 71 00 06 01 1f ... (Type 0x00, device=0x06, BT aparece sem CMD)
```

**Sequência de eventos: USB plug-in (confirmado)**
```
"usb disk plug in"
→ 80 0f 71 02 02 02 1f 00 10 00 10 00 00 05 28 ... (Type B, device=0x02, track=16 — mesa lembra a última faixa!)
→ "play device: u-disk"
→ UI dispara scan automático: d2=02 offset=0x0000 (raiz)
→ UI navega diretórios (root → RECORD com offset=0x0006)
→ scan de RECORD: op0x71 type 0x82 (flood de sub-frames)
→ "scan finished! count: 16  err: 0"
→ "saving play list..." → "save play list finish!"
→ USB Player pronto, paused na última faixa
```

---

## Tabela de comandos op0x72 (CMD = byte 5 do frame)

| CMD (hex) | Decimal | Ação confirmada | Contexto | Evidência |
|-----------|---------|-----------------|----------|-----------|
| `0xa0`    | 160     | **PAUSE** | USB | TX → mode 03→02 |
| `0xa1`    | 161     | **PLAY / RESUME** | USB | TX → mode 02→03 |
| `0xa2`    | 162     | **PLAY/PAUSE toggle BT** | BT | Quando 0x03→0x02 (pausa); botão único na UI (não há CMD de PLAY separado para BT) |
| `0xa4`    | 164     | **PREV** | USB + BT | USB: song change N-1; BT: relay para phone |
| `0xa6`    | 166     | **NEXT** | USB + BT | USB: song change N+1; BT: relay para phone |
| `0xc3`    | 195     | **SELECT SPDIF/Coax** | SPDIF | TX → device→0x0a, mode→0x02 |
| `0xc7`    | 199     | desconhecido (NÃO é SELECT Recorder) | ? | não aparece nas capturas; Recorder chega via fallback de 0xc8 |
| `0xc8`    | 200     | **STOP / SELECT none** | universal | TX → device→0x00 (none) em todos os contextos |
| `0xa8`    | 168     | **SELECT USB Player** | universal | TX ao mudar dropdown para u-disk; RX device→0x02, mode→0x04 (transitório)→0x02; `play device: u-disk` no console |
| `0xaa`    | 170     | **REPEAT toggle** | USB Player | TX → byte[14] 0x20↔0x28 (bit 3); evidência: dois 0xaa consecutivos, primeiro→0x28 (ON), segundo→0x20 (OFF) |
| `0xe0`    | 224     | **Record START/STOP toggle** | Recorder | mode 0x01→0x05 (start); 0x05→0x01 (stop) |

Padrão emergente: `0xa0`-`0xaf` = controles de playback por contexto (USB vs BT);
`0xc0`-`0xcf` = stop/switch de source; `0xe0`-`0xef` = comandos Recorder.
BT usa apenas `0xa2` como toggle; `0xa1`=USB PLAY, `0xa0`=USB PAUSE, `0xa4`=PREV, `0xa6`=NEXT, `0xaa`=REPEAT toggle.
Padrão `0xc0`-`0xcf` = switch de fonte + stop: `0xc3`=SPDIF, `0xc8`=liberar fonte (→Recorder como fallback, ou none); `0xc7` não confirmado. SELECT USB = `0xa8`; BT e Recorder sem CMD explícito.

---

## Setup

1. UI oficial aberta no navegador (ex.: `http://192.168.1.20`), **já conectada**.
2. DevTools → Console → cola `apps/desktop/tools/media-tx-hook.js` → Enter.
   **NÃO recarregue** — reload fecha o WebSocket. O hook faz patch da conexão viva
   (`window.WS.sockets[...]`). `ax.sockets()` confirma; se o registry não for
   `window.WS`, edite a constante `REGISTRY` no topo do script.

## Fluxo de captura (silencioso, sem flood)

Para ações novas use **live mode com marcadores**:

```js
ax.live(50)
// faça a ação (ex.: clicar Play)
ax.quiet()
// identifique TX op0x72 no log
```

Ou, para ações discretas:
```js
ax.snap()
// faça UMA ação
ax.diff()
```

---

## 1. Entrar / sair da página MEDIA (subscribe)

| Ação | TX (comando) | RX (push) | Modelo | Notas |
|---|---|---|---|---|
| Abrir página MEDIA | op3 param 75=917, op3 param 5212=1 | op0x71 começa | AX16/24 | TX confirmado |
| Sair da página MEDIA | ? | para op0x71? | | não capturado |

## 2. Dropdown de fonte (dispara `play device: X`)

> **Modelo de seleção:** cada fonte tem um CMD op0x72 explícito — não é auto-detect.
> USB Player: `0xa8` ✅ (confirmado). SPDIF: `0xc3` ✅. Recorder: `0xc7`? (candidato). BT: desconhecido.
> Exceção: plugar/desconectar físico (USB drive, BT pair) pode mudar o device sem CMD do app.

| Fonte | `play device:` log | op0x71 byte[device] | CMD de seleção TX | Modelo |
|---|---|---|---|---|
| Player (USB) | u-disk | 0x02 | **`0xa8`** ✅ | AX16/24 ✅ |
| Recorder | unknown | **0x05** | **sem CMD** — aparece automaticamente após `0xc8` se pendrive plugado ✅ | AX16/24 ✅ |
| Bluetooth | bluetooth | 0x06 | **sem CMD** — auto-detectado quando BT pareado ✅ | AX16/24 ✅ |
| (parar / liberar) | none | 0x00 | **`0xc8`** — libera fonte atual; se Recorder disponível, mesa cai no Recorder; se não, device→0x00 ✅ | AX16/24 ✅ |
| USB selecionado sem mídia | none | 0x00, mode=0x04 | estado de USB Player ativo mas sem arquivo/pendrive | AX16/24 ✅ |
| **Disco ausente (ejetado)** | (any) | Type 0x00 b[3]=0x00 | op0x71 Type 0x00 substitui Type B; todos os CMDs ignorados pela mesa | AX16/24 ✅ |
| Coax / SPDIF | spdif | **0x0a** | **`0xc3`** ✅ | AX16/24 ✅ |

## 3. Player (USB)

| Ação | CMD (op0x72) | Efeito no op0x71 | Confirmado? |
|---|---|---|---|
| Play / Resume | `0xa1` (161) | mode 02→03 | ✅ |
| Pause | `0xa0` (160) | mode 03→02 | ✅ |
| Next | `0xa6` (166) | song change: N+1, mode→02, tick reset | ✅ |
| Prev | `0xa4` (164) | song change: N-1, mode→02, tick reset | ✅ |
| Repeat toggle | `0xaa` (170) | byte[14]: 0x20→0x28 (ON) ou 0x28→0x20 (OFF) | ✅ |
| **Selecionar faixa N** | frame 14 bytes (ver abaixo) | song change: N, mode→04 (transitório)→02, tick reset | ✅ |
| Stop | `0xa3`? ou `0xc8`? | mode→00? | ❌ a capturar |
| Shuffle toggle | ? (distinto de repeat?) | ? | ❌ a capturar |
| Pg Up / Pg Dn (lista) | **nenhum CMD** | nenhum RX muda | ✅ — é navegação local na UI, a mesa não sabe qual "página" está visível |
| Back (navegar pasta) | ? (provável: nenhum CMD) | ? | ❌ a confirmar |

Estado após NEXT/PREV/seleção: track carrega em modo **paused** (mode=02), precedido brevemente por mode=**0x04** (seeking/loading). É preciso enviar `0xa1` para começar a tocar.

**Seleção de faixa — frame longo de 14 bytes:**
```
80 0c 72 00 00 d1 [OFF_LO OFF_HI] d2 01 00 d0 [CRC_HI CRC_LO]
```
Exemplos:
```
Faixa 1: 80 0c 72 00 00 d1 07 00 d2 01 00 d0 53 53   (offset=7)
Faixa 2: 80 0c 72 00 00 d1 f3 0a d2 01 00 d0 26 de   (offset=2803)
Faixa 3: 80 0c 72 00 00 d1 c8 26 d2 01 00 d0 09 2e   (offset=9928)
Faixa 4: 80 0c 72 00 00 d1 af 3d d2 01 00 d0 8a 87   (offset=15791)
Faixa 7: 80 0c 72 00 00 d1 f2 45 d2 01 00 d0 85 a3   (offset=17906)
```
O app precisa conhecer os handles das faixas antes de navegar → obter via scan da playlist.

## 4. Significado do `5212`

| Observação | Resultado |
|---|---|
| Poll da UI | Lido via op6 a cada ~1s |
| Escrito via op3 | TX param 5212=1 durante reprodução ativa |
| Conclusão | Heartbeat de "ainda estou aqui"; **não** é posição de playback |

→ **5212 = keepalive / subscribe ativo** — enviar 1 enquanto na página; não é flag on/off.

## 5. Posição / tempo da faixa

Fonte dos dados: **op0x71 Type A e Type B**

| Campo | Fonte | Encoding |
|---|---|---|
| Elapsed ticks | Type A b[4] e Type B b[13] | **~0.9s/tick**, reset no song change (confirmado: 10 ticks em 9.9s no Recorder) |
| **Handle da faixa** | Type A b[9..10] | big-endian 16-bit — **handle opaco** (igual ao offset do scan); NÃO é posição de áudio |
| Duração de uma faixa | **scan** ext b[4]=0x06 | byte `dur` em **segundos** (ex.: 0xe0=224s, 0xd8=216s, 0xf1=241s) |
| Número da faixa | Type B b[10] | 1-based integer |
| Estado reprodução | Type B b[5] | 0x02=paused, 0x03=playing, 0x04=seeking (transitório) |
| Repeat flag | Type B b[14] | 0x20=OFF, 0x28=ON (bit 3 = 0x08) |
| Presença de disco | op0x71 b[3] | 0x02=disco presente, 0x00=sem disco (flag global) |

Referência de handles confirmados (faixa → b[9..10] big-endian → handle decimal):
- Faixa 1 (REC_0000): `0x0007` = 7, dur=224s ✅
- Faixa 2 (REC_0001): `0x0af3` = 2803, dur=216s ✅
- Faixa 3 (REC_0002): `0x26c8` = 9928, dur=203s ✅
- Faixa 4 (REC_0003): `0x3daf` = 15791, dur=203s ✅
- Última (REC_0025): `0xb711` = 46865, dur=247s ✅

Para exibir progresso: elapsed_ticks × 0.9s / dur_seconds (dur vem do scan).
Para identificar faixa atual: comparar Type A b[9..10] com os handles do scan.

## 6. Bluetooth

| Ação | CMD (op0x72) | Efeito no op0x71 | Confirmado? |
|---|---|---|---|
| STOP / ejetar BT | `0xc8` (200) | device→0x00 (none) | ✅ |
| PLAY/PAUSE toggle BT | `0xa2` (162) | mode 0x03→0x02 (pausa); **não há CMD separado de PLAY** | ✅ AX16/24 |
| NEXT BT | `0xa6` (166) | relay AVRCP; mode fica 0x02 | ✅ AX16/24 |
| PREV BT | `0xa4` (164) | relay AVRCP; mode fica 0x02 | ✅ AX16/24 |

**Conclusão BT (confirmada em múltiplas sessões de captura):**
A UI oficial usa `0xa2` como **único botão de Play/Pause** para BT — não há CMDs `0xa1` ou `0xa3` separados para BT.
- Quando mode=0x03 (tocando) → `0xa2` → mode=0x02 (paused) — efeito imediato
- Quando mode=0x02 (paused) → `0xa2` → sem efeito (mode permanece 0x02)
- O phone pode retomar automaticamente após alguns segundos (comportamento AVRCP do dispositivo; a mesa não envia CMD de resume)
- `0xa1` e `0xa3` NÃO aparecem em nenhuma captura BT — são exclusivos do USB Player
- **Seleção de BT: sem CMD** — BT é auto-detectado quando dispositivo está pareado; a mesa empurra device=0x06 via op0x71 sem que o app envie nada

**Mode codes BT (op0x71 Type B byte[5]):**
- `0x01` = desconectado
- `0x02` = conectado, paused/idle
- `0x03` = conectado, tocando

**Frames de referência:**
```
BT desconectado:  80 0f 71 02 06 01 1f 00 00 00 00 00 00 02 08 7d 48
BT paused:        80 0f 71 02 06 02 1f 00 00 00 00 00 00 00 00 d4 b8
BT tocando:       80 0f 71 02 06 03 1f 00 00 00 00 00 00 00 08 d7 e8
```

## 7. Coax / SPDIF

| Ação | CMD (op0x72) | Efeito no op0x71 | Confirmado? |
|---|---|---|---|
| Selecionar SPDIF | `0xc3` (195) | device→0x0a, mode→0x02 | ✅ AX16/24 |
| Sem transporte | — | device estático em 0x0a | ✅ (sem PLAY/PAUSE/NEXT) |

**Frame de referência SPDIF:**
```
80 0f 71 02 0a 02 1f 00 00 00 00 00 00 02 08 22 87
```
- device=0x0a, mode=0x02 (ativo/recebendo sinal)

## 8. Recorder

| Ação | TX CMD (op0x72) | RX op0x71 Type B | Notas |
|---|---|---|---|
| Selecionar Recorder | **`0xc8`** (libera fonte atual) | device=0x05, mode=0x01 — Recorder aparece automaticamente se pendrive plugado | ✅ AX16/24 |
| Record START | `0xe0` (224) | mode 0x01→0x05 | ✅ AX16/24 |
| Record STOP | `0xe0` (224) (toggle) | mode 0x05→0x01 | ✅ AX16/24 |
| Timer gravando | — | Type A: b[4]=b[6]=tick (~0.45s/unit) | ✅ AX16/24 |

**Recorder op0x71 Type B durante gravação:**
```
80 0f 71 02 05 05 1f 00 [nfiles] 00 [nfiles] 00 00 [tick] 20 CRC CRC
```
- device=0x05, mode=0x05 (recording)
- b[8]=b[10]= **número de arquivos no pendrive** (ex.: 0x1a=26 após nova gravação)
- tick no b[13] = tempo decorrido de gravação (~0.9s/unidade, confirmado: 10 ticks ≈ 9.9s)
- `play device: unknown` na UI = Recorder (device=0x05)

**Recorder op0x71 Type B parado:**
```
80 0f 71 02 05 01 1f 00 00 00 00 00 00 00 20 47 46   (b[14]=0x20 — uma captura)
80 0f 71 02 05 01 1f 00 00 00 00 00 00 00 08 59 46   (b[14]=0x08 — captura com BT→Recorder)
```
- device=0x05, mode=0x01 (ready)
- b[14] no Recorder idle varia: 0x08 (só bit 3) ou 0x20 (só bit 5) — bit 5 não é fixo no Recorder, distinto do USB Player onde 0x20 era sempre presente

## 9. Navegação de lista (USB Player)

| Ação | CMD (op0x72) | Efeito | Confirmado? |
|---|---|---|---|
| Pg Up / Pg Dn | **nenhum CMD** | nenhum RX muda | ✅ — navegação local na UI |
| **Back (voltar pasta)** | **nenhum CMD** | nenhum RX muda | ✅ — navegação local na UI |
| **Update / Refresh** | trigger do scan (ver Seção 10) | flood de op0x71 type 0x82 | ✅ |

Conclusão: toda navegação de lista/pasta é **local na UI** — a mesa não sabe qual item está destacado. Só a seleção de faixa (offset frame 14 bytes) e o scan (Seção 10) enviam dados reais.

## 10. Protocolo de scan de playlist (op0x71 type 0x82)

**Disparado por:**
- Botão Update/Refresh na lista (manual)
- **Automaticamente ao inserir pendrive USB** — a UI dispara o scan sozinha ao detectar "usb disk plug in" (não precisa de CMD do app para iniciar)

**Sequência de scan confirmada (auto, plug-in):**
```
1. d2=02 offset=0x0000       → scan raiz
2. d2=02 offset=0x0002       → navega 1º subdir (ex.: .Spotlight)
3. d2=02 offset=0x0004       → navega 2º subdir
4. ...
5. d2=02 offset=0x0006       → NAVEGA PARA RECORD (offset=6 da raiz)
6. d1 SEQ=01,02,...           → lê entradas do RECORD sequencialmente
7. "scan finished! count: N  err: 0"
8. "saving play list... save play list finish!"
```
Arquivos TYPE=0x81 (`._xxx`) são macOS metadata — **o app deve ignorá-los** na lista de faixas.

**TX — navegar diretório (frame 14 bytes, d2=02):**
```
80 0c 72 00 00 d1 [OFF_LO OFF_HI] d2 02 00 d0 [CRC CRC]
```
- d2=**02** = modo diretório/scan (distingue de d2=01 da seleção de faixa)
- `OFF_LO OFF_HI` = offset handle do diretório alvo (LE 16-bit), do scan do pai
  - `06 00` = RECORD (offset=6 confirmado no scan de raiz)

**TX — leitura sequencial de entradas (frame 9 bytes):**
```
80 09 72 [SEQ] 00 d1 08 00 d0 [CRC CRC]
```
- SEQ = 0x01, 0x02, 0x03, ... para cada entrada subsequente

**RX — op0x71 type 0x82: três tipos de sub-frame por entrada:**

*Header (b[5]=0xaa):*
```
80 0f 71 82 0a aa [len_hi len_lo] [b8] [b9] [IDX] [TYPE] 00 00 00 CRC CRC
```
- IDX = índice da entrada (1-based)
- TYPE: `0x01`=arquivo WAV (ASCII), `0x40`=subdir regular, `0x41`=**último entry** (0x40|0x01), `0x80`=subdir sistema/macOS, `0x81`=arquivo UTF-16 (`._` macOS), `0xc0`=último subdir do nível
- Quando TYPE=0x41 → "scan finished! count=IDX"

*Nome (b[5]≠0xaa, b[4]=0x0a):*
```
80 0f 71 82 0a [OFF_HI] [OFF_LO] [nome_bytes...] CRC CRC
```
- **b[5..6] = handle opaco da faixa (big-endian)** → é o valor a usar na seleção de faixa (converter para LE no TX)
  - Para subdiretórios: é o handle a passar em d2=02 para entrar nele
  - Para arquivos WAV: é o handle a passar em d2=01 para tocar a faixa
- Confirmado cruzando com track selection:
  - REC_0000: `00 07`=7 ✅, REC_0001: `0a f3`=2803 ✅, REC_0002: `26 c8`=9928 ✅, REC_0003: `3d af`=15791 ✅
  - Última faixa (REC_0025): `b7 11`=46865 = mesmo valor de Type A b[9..10] quando tocando ✅
- ASCII para arquivos normais; UTF-16 LE para `._` (macOS metadata — ignorar no app)
- Nomes longos chegam em múltiplos sub-frames consecutivos

*Extensão (b[4]=0x06):*
```
80 0f 71 82 06 2e 57 41 56 00 [dur] 00 00 00 00 CRC CRC
```
- `2e 57 41 56 00` = `.WAV\0`
- `dur` = **duração em segundos** (byte único): ex. 0xe0=224s, 0xd8=216s, 0xf1=241s

**Exemplo de uma entrada completa (REC_0001):**
```
RX: 80 0f 71 82 0a aa 00 17 01 00 02 01 00 00 00 b4 a6   ← header, IDX=2, TYPE=01
RX: 80 0f 71 82 0a 0a f3 52 45 43 5f 30 30 30 31 d0 48   ← nome: offset=2803, "REC_0001"
RX: 80 0f 71 82 06 2e 57 41 56 00 d8 00 00 00 00 16 fe   ← ext: ".WAV", 216s
```

**Nota importante:** nomes ASCII terminam em um sub-frame de extensão (b[4]=0x06). Nomes longos (UTF-16) chegam em múltiplos sub-frames. Arquivos `._` (TYPE=0x81) devem ser ignorados pelo app — são metadados do macOS.

## 11. Volumes (confirmar sobreposição com USB IN/OUT já mapeado)

| Controle | Param esperado (AX16/24) | Confirmado? |
|---|---|---|
| USB OUT CH1/CH2 | 2815 / 2816 | pendente |
| USB IN CH1/CH2 | 2831 / 2832 | pendente |
| Toggle USB CH1/CH2 | 2847 / 2848 | pendente |
| MEDIA usa estes ou params próprios? | | pendente |

---

## O que falta capturar (prioridade)

1. ~~**Recorder:** start/stop~~ ✅ `0xe0` toggle
2. ~~**Recorder device code**~~ ✅ device=0x05
3. ~~**BT PAUSE**~~ ✅ `0xa2` (mode 0x03→0x02)
4. ~~**BT mode codes**~~ ✅ 0x01=descon., 0x02=paused, 0x03=playing
5. ~~**BT PLAY/RESUME separado**~~ ✅ não existe — `0xa2` é botão único
6. ~~**Coax device byte**~~ ✅ 0x0a; CMD seleção = `0xc3`
7. ~~**Repeat toggle**~~ ✅ CMD=`0xaa`; byte[14] 0x20=OFF / 0x28=ON
8. ~~**Selecionar faixa por índice**~~ ✅ frame 14 bytes com offset LE 16-bit × 10ms
9. ~~**Unidade do tick**~~ ✅ ~0.9s/unidade (confirmado no Recorder: 10 ticks = 9.9s)
10. ~~**Type A b[9..10]**~~ ✅ é handle opaco da faixa (igual offset do scan) — NÃO é posição de áudio em 10ms; duração vem do sub-frame 0x06 do scan (byte `dur` em segundos)
11. ~~**Pg Up / Pg Dn**~~ ✅ não enviam CMD — navegação puramente local na UI
12. ~~**CMD SELECT USB Player**~~ ✅ `0xa8`
13. ~~**Back (navegar pasta)**~~ ✅ sem CMD — igual Pg Up/Dn, navegação local na UI
14. ~~**Protocolo de scan da playlist**~~ ✅ capturado! op0x71 type 0x82 + TX d2=02 + TX 9-byte seq; scan automático ao plug-in; pasta RECORD em offset=0x0006 da raiz (ver Seção 10)
15. ~~**CMD SELECT Bluetooth**~~ ✅ sem CMD — BT é auto-detectado (device=0x06 empurrado pela mesa quando pareado)
16. ~~**CMD SELECT Recorder**~~ ✅ `0xc8` libera fonte atual → mesa cai no Recorder se pendrive plugado
17. **USB STOP explícito** — qual CMD para parar o USB Player e voltar para none sem ter Recorder?
18. **Shuffle** — existe botão separado de repeat?
19. **Volumes**: confirmar se 2815/2816/2831/2832 afetam o MEDIA ou são IN/OUT digitais separados
20. **AX32**: capturar os mesmos dados (pode diferir)

---

## Resumo consolidado (parcial — preencher ao final)

| Função | Protocolo | Valores | AX16/24 | AX32 |
|---|---|---|---|---|
| Subscribe MEDIA | op3 param 75=917 + param 5212=1 | — | ✅ | pendente |
| Seletor de fonte | op0x71 RX byte[4] | 0x00=none, 0x02=USB, 0x05=Rec, 0x06=BT | ✅ | pendente |
| PLAY | op0x72 CMD=0xa1 | — | ✅ | pendente |
| PAUSE | op0x72 CMD=0xa0 | — | ✅ | pendente |
| NEXT | op0x72 CMD=0xa6 | — | ✅ | pendente |
| PREV | op0x72 CMD=0xa4 | — | ✅ | pendente |
| Status play (USB) | op0x71 Type B b[5] | 0x02=paused, 0x03=playing | ✅ | pendente |
| Status play (BT) | op0x71 Type B b[5] | 0x01=descon., 0x02=paused, 0x03=playing | ✅ | pendente |
| PLAY/PAUSE toggle BT | op0x72 CMD=0xa2 | mode 0x03→0x02; sem CMD separado de PLAY | ✅ | pendente |
| Faixa atual | op0x71 Type B b[10] | 1-based | ✅ | pendente |
| Tempo decorrido | op0x71 Type A b[4] / Type B b[13] | ~0.9s/tick | ✅ | pendente |
| Handle da faixa atual | op0x71 Type A b[9..10] | big-endian 16-bit — handle opaco (igual offset do scan) | ✅ | pendente |
| Duração da faixa | scan sub-frame b[4]=0x06 | byte `dur` em **segundos** | ✅ | pendente |
| Repeat flag (USB) | op0x71 Type B b[14] | 0x20=OFF, 0x28=ON (bit 3); Recorder idle=0x08 (bit 5 ausente) | ✅ | pendente |
| Repeat toggle | op0x72 CMD=0xaa | byte[14] 0x20↔0x28 | ✅ | pendente |
| Selecionar faixa | op0x72 frame 14B: `d1 [OFF_LO OFF_HI] d2 01 00 d0` | handle opaco LE 16-bit (do scan) | ✅ | pendente |
| Presença de disco | op0x71 b[3] | 0x02=disco presente, 0x00=sem disco (flag global) | ✅ | pendente |
| Record start/stop | op0x72 CMD=0xe0 (toggle) | mode 0x01↔0x05 | ✅ | pendente |
| Recorder device | op0x71 Type B b[4] | 0x05 | ✅ | pendente |
| Nº arquivos pendrive | op0x71 Type B b[8]=b[10] | durante gravação | ✅ | pendente |
| **Scan playlist** | op0x72 d2=02 + op0x72 9B seq | op0x71 type 0x82: nome+offset+dur | ✅ | pendente |
| Pg Up / Pg Dn / Back | nenhum CMD | navegação local na UI | ✅ | — |
| SELECT USB Player | op0x72 CMD=0xa8 | device→0x02, mode→0x04→0x02 | ✅ | pendente |
| SELECT BT | **sem CMD** | BT auto-detectado; mesa empurra device=0x06 quando pareado | ✅ | — |
| SELECT Recorder / STOP | op0x72 CMD=0xc8 | libera fonte; Recorder aparece se pendrive plugado, senão device→0x00 | ✅ | pendente |
| SELECT SPDIF | op0x72 CMD=0xc3 | device→0x0a, mode→0x02 | ✅ | pendente |
| Coax device | op0x71 Type B b[4] | 0x0a | ✅ | pendente |
| Volumes | params 2815/2816/2831/2832 | — | pendente | pendente |
