# Changelog

Mudanças notáveis do AX Control. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/);
versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [1.2.0] - 2026-06-24

### Adicionado
- **MEDIA player** no canal DIGI (Beta, AX32): USB Player, Recorder, Bluetooth e Coax.
  - USB: lista da pasta RECORD com nome e duração, barra de progresso, transporte e play/pause.
  - Recorder: gravar/parar com timer.
  - Bluetooth: seleção de fonte e play/pause.
  - Coax: status de sinal.
- **EQ Gráfico (GEQ)** de 15 bandas em AUX e Master (AX32 e AX16/24).

### Alterado
- Passo de ganho do **EQ paramétrico e do GEQ** padronizado em **0,5 dB** (antes 1 dB).

### Corrigido
- Crosstalk entre **mute groups**: o override manual de mute deixou de ser sobrescrito ao alternar
  outro grupo não relacionado.

## [1.1.4] - 2026-06

### Corrigido
- BUG-001: flicker do toggle INPUT/USB.
- BUG-002: itens de FX faltando — dois bancos (A/B), grade 4×4 e ranges corretos por preset.
