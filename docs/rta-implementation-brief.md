# RTA — Brief de Implementação (handoff p/ nova sessão)

> Objetivo: implementar o **RTA (analisador de espectro)** desenhado **atrás da curva do EQ**
> (estilo FabFilter), alimentado pela mesa DUONN Axios. **AX32 = nativo completo.** AX16/24 =
> só **leitura/probe + telemetria** (sem ligar). Branch: `hotfix/1.1.2` (RTA vai na 1.1.2 — decisão do fundador, 22/jun; era dev/v1.2.0 no plano original).
> Protocolo descoberto por engenharia reversa da UI oficial (capturas WebSocket). Toda a
> referência também está na memória do projeto: `axios-rta-protocol.md`.

## 1. Protocolo (confirmado, AX32)
- **Frame:** `80 <len> <opcode> <payload…> <crc16(2)>`. `len = total_bytes − 2`. `0x80` = sync.
  O CRC é calculado por `buildRawDuonnPacket(opcode, payload)` em `src/lib/axios16Client.ts` — **reusar**
  (você passa só opcode + payload, ele fecha o CRC).
- **Opcodes:** `0x03` = WRITE param (pares endereço/valor); `0x06` = READ/subscribe; `0x46` = read de bloco.
- **Espectro = opcode `0x46`, endereço `00 1f`** → resposta `80 24 46 00 1f [31 bytes] crc` (38 bytes).
  **31 bandas** (1/3 de oitava, 20Hz→20kHz), **1 byte por banda**, valor `0x00`..~`0x5c` (≈0–92).
  Silêncio = tudo `00`; com sinal, sobe (curva de voz confirmada na captura).
- **Ligar (WRITE op 0x03):** `param 57 = sourceId`, `param 2884 = sourceId`, `param 5196 = 1`.
  **Desligar:** `param 5196 = 0`.
  - `param 57` (0x39) + `param 2884` (0x0B44) = **seletor de fonte** = o MESMO "comando de foco" já usado
    pelos meters de comp (procurar no código onde 57/2884 já são enviados e reusar).
  - `param 5196` (0x144C) = enable on/off do RTA.
- **AX32 vem com RTA DESLIGADO por padrão** → o app precisa LIGAR ao entrar na tela de EQ e DESLIGAR ao sair.
- A página `0x14` (`14 5d`, `14 51..14 5e`) é **config do analisador**, NÃO as bandas. Ignorar p/ o espectro.

## 2. Mapa de Source IDs (valor de param 57/2884)
- **Canais:** CH-n = `n` (1–32).
- **AUX:** AUX-n = `34 + n` (AUX1=35, AUX2=36 … AUX16=50).
- **Master (estéreo):** L = `51`, R = `52`.
- (Vão 33–34 = DCA/extra, irrelevante. **FX não tem RTA.**)
- Conferir o stride de AUX/DCA contra a tabela de barramentos existente (ver memória
  `eq-comp-addressing-dual-system` — addressing por perfil).

## 3. Comportamento por perfil (CRÍTICO)
O app já resolve perfil AX16/24 (família comum) vs AX32 (path distinto). O RTA deve ser **profile-aware**:
- **AX32:** fluxo completo — ao abrir EQ da fonte N: `set 57=N, 2884=N, 5196=1`; pollar `46 00 1f` (~30Hz)
  → 31 bandas → render. Ao sair: `set 5196=0`.
- **AX16/24 (todas variantes — E/S/etc):** **NUNCA mandar write/enable** (DSP é DIFERENTE do AX32 →
  os params 57/2884/5196 podem apontar pra OUTRA coisa → risco de mexer no áudio ao vivo). Fazer só:
  - **read-probe (op 0x06, leitura — seguro):** ler params 57, 2884, 5196 e observar se o bloco `46 00 1f`
    aparece. Ler ≠ ligar.
  - **disparar telemetria `rta_probe`** (ver §5) com o resultado.
  - **RTA fica escondido** nesses modelos; render só se um frame válido de 31 bandas realmente chegar.
  - O probe/escrita futura fica atrás de **feature flag default OFF** (validar caso a caso no hardware).
- **Master:** L=51/R=52. Como o EQ do master é linkado, usar **máx(L,R)** (decisão do fundador — confirmar).
- Render só com frame válido (op `0x46`, addr `00 1f`, 38 bytes, 31 valores). Sem dado em X ms → esconde.

## 4. Render (espectro atrás do EQ)
- Componente do gráfico de EQ: procurar em `apps/desktop/src/components/` (ChannelProcessors.tsx / AuxStrip.tsx /
  FxStrip.tsx) e/ou App.tsx — onde a curva de EQ é desenhada (SVG/canvas, eixo log 20Hz–20kHz).
- 31 bandas → plota nos centros de 1/3 de oitava no **mesmo eixo log** → **spline suave** (cúbica
  monotônica/Catmull-Rom) → **área preenchida**.
- Cor: **cyan da marca, opacidade ~12–20%**, gradiente sumindo pro topo. **Sem borda dura.**
- **Curva do EQ branca sempre por cima** (z-index maior). Marcadores (H,1,2,3,4,L) por cima.
- **decay + peak-hold** no tempo (banda cai devagar) p/ o movimento de plugin sem piscar.
- Esconde no FX e quando não há dado.

## 5. Telemetria `rta_probe` (AX16/24)
Reusar a pipeline offline-first existente: `src/services/telemetryService.ts` →
`/api/app/telemetry.php` → tabela `license_events`.
- Adicionar o tipo de evento `rta_probe` (hoje aceita `console_connected`, `iem_interest`).
- Metadata compacta (não o dump todo): `{ model, fw, responded: { p57:bool, p2884:bool, p5196:bool, block46:bool } }`.
- Offline-first: enfileira local, manda no próximo bootstrap com internet.
- Server (`api/app/telemetry.php`): permitir o novo `type` + gravar metadata.
- Admin (opcional): mostrar contagem de quais AX16/24 responderam aos params do RTA → decisão data-driven.

## 6. Arquivos a tocar
- **Novo:** `src/lib/rtaAdapter.ts` — controlador: `enable(sourceId)`, `poll()`, `parse(frame)→number[31]`,
  `disable()`, profile-aware (AX32 liga/poll; AX16/24 read-probe + telemetria, sem write).
- `src/lib/axios16Client.ts` — reusar `buildRawDuonnPacket`, o caminho de read/poll e `onRemoteParamRead`.
- Componente do gráfico de EQ (achar) — camada de espectro atrás da curva.
- `src/services/telemetryService.ts` — tipo `rta_probe`.
- `api/app/telemetry.php` (servidor) — aceitar `rta_probe`.
- Feature flags — flag default OFF p/ probe/ativação no AX16/24.

## 7. Segurança (DO_NOT_BREAK — operação ao vivo)
- **AX16/24: NUNCA escrever** 57/2884/5196 (DSP diferente → colisão de endereço → pode alterar áudio ao vivo).
  Só leitura.
- **Validar o ligar/poll do AX32 em hardware real** antes de shippar (área sensível — ver `docs/DO_NOT_BREAK.md`).
- **Nunca fabricar um espectro falso** a partir de meters/nível (não há dado de frequência sem o motor da mesa;
  fake engana o operador). Sem motor → esconde.
- Polling não-bloqueante; falha/ausência de dado nunca derruba a sessão.

## 8. Passos sugeridos (ordem)
1. Protótipo **só visual** da camada de espectro (dados simulados/ruído) atrás do EQ → aprovar o look.
2. `rtaAdapter` AX32: enable/poll/parse/disable; ligar no enter do EQ, desligar no leave.
3. Validar no **AX32 real** (ligar, falar no mic, ver as 31 bandas reagirem; calibrar teto ~0x5c→100%).
4. AX16/24: read-probe + evento `rta_probe` (server aceitando) — sem write; RTA escondido.
5. (Opcional) painel no admin com os resultados do probe.

## 9. Decisões abertas
- Master: **máx(L,R)** vs só L (sugerido máx — confirmar com o fundador).
- Escala exata dB por banda (calibrar com tom de referência, ex.: 1kHz cheio) — por ora `valor/0x5c`.
