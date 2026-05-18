# AX24 Candidate Parameter Map (2026-05-18)

## Base de evidência
Comparacao estatica entre:
- `research/extracted/ax16/.rdata`
- `research/extracted/ax24/.rdata`

Achados confirmados em `.rdata` (offset decimal):
- `STEREO-FX-AUX%d` em 1548396 (AX16 e AX24)
- `ST-FX` em 1550862 (AX16 e AX24)
- `DIGI-FX` em 1550868 (AX16 e AX24)
- `AUX1-8` em 1554308 (AX16 e AX24)
- `CH9-16` em 1554374 (AX16 e AX24)
- `CH17-24` em 1554521 (AX24)
- `DCA1-4` em 1554553/1554561 (AX16/AX24)

Observacao: os tamanhos de secoes sao iguais entre AX16 e AX24, mas hashes diferentes (mudancas pontuais, nao reestruturacao grande).

## Diagnostico tecnico
1. O AX24 preserva a base estrutural de AX16 para AUX, DCA e labels de FX.
2. O AX24 adiciona bloco de canais 17-24 (evidencia direta por string).
3. Quantidade de motores FX nao aparece de forma explicita por string.

## Mapa candidato por bloco

### Canais
- Candidato: manter logica AX16 com extensao para 24 canais.
- Formula candidata: `param = base + (channel-1) * 62` (base herdada do AX16).
- Faixa candidata: canais 1..24.
- Confianca: **Alta** para existencia de CH17-24; **Media-Alta** para stride/offset identicos ao AX16 (a confirmar com captura dinamica).

### AUX
- Candidato: manter AUX 1..8 com mesmos blocos AX16.
- Evidencia: `AUX1-8` igual entre AX16 e AX24.
- Confianca: **Alta**.

### DCA
- Candidato: manter DCA 1..4 com mapa AX16.
- Evidencia: `DCA1-4` presente em AX16 e AX24.
- Confianca: **Alta**.

### FX
- Candidato: manter mapa base AX16 para FX (FX1/FX2) ate prova em contrario.
- Evidencia: labels de FX identicas (`ST-FX`, `DIGI-FX`, `STEREO-FX-AUX%d`).
- Confianca: **Media** (tipos de FX confirmados, quantidade de motores nao confirmada por string).

### Master e Cores
- Candidato: manter mapa AX16 (master e cores) como baseline.
- Evidencia direta por string: fraca.
- Confianca: **Media-Baixa** (depende de validacao dinamica/protocolo).

## Risco de colisao (com mapa AX16 atual)
Usando o modelo atual de stride de canal do app:
- 16 canais: sem colisao
- 24 canais: sem colisao
- 32 canais: com colisao em blocos AUX/FX/cores

Implicacao: AX24 e um alvo viavel para liberacao incremental antes de AX32.

## Proximo passo recomendado
1. Implementar profile AX24 experimental no app (24 canais, 8 AUX, 4 DCA, FX conservador).
2. Validar escrita/leitura com harness de protocolo (mock WS) antes de teste em mesa.
3. Somente depois abrir AX32 em feature flag separada.
