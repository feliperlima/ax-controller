# Changelog

Mudanças notáveis do AX Control. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/);
versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [1.3.2] - 2026-06-26

### Corrigido
- **Ajustes do detalhe (EQ, compressor, GEQ, sends) agora sincronizam ao vivo entre aparelhos**: com o
  mesmo canal/bus aberto em mais de um dispositivo, o que você muda em um aparece no outro sozinho
  (em ~1,5s), sem precisar sair e entrar na tela. A atualização pausa enquanto você está mexendo, para
  não atrapalhar o ajuste.

## [1.3.1] - 2026-06-26

### Corrigido
- **Compressor do Master**: os controles do compressor no bus principal voltaram a responder
  corretamente (antes o ajuste de um parâmetro acabava mexendo em outro).
- **Sincronização ao vivo entre dispositivos**: ajustes feitos em um aparelho (faders, mute, solo, EQ,
  compressor, sends e mais) passam a refletir nos outros conectados à mesma mesa.

## [1.3.0] - 2026-06-25

### Adicionado
- **Auto-atualização no desktop** (macOS e Windows): o app baixa a nova versão em segundo plano e
  oferece "Instalar agora" — sem precisar baixar e instalar manualmente. Offline-first: a verificação
  nunca bloqueia o uso nem a operação ao vivo.

### Alterado
- Leitura de estado de conta consolidada em endpoint único versionado (`/api/v1/account/state`) com
  cache condicional (ETag), reduzindo tráfego — sem alterar comportamento para o usuário.

## [1.2.3] - 2026-06-25

### Segurança
- **Credenciais e PII movidos para store seguro** (cifrado com XChaCha20-Poly1305, chave derivada por
  device via HKDF-SHA256): `license_key`, e-mail, nome, estado de licença e dados de pagamento
  deixaram de ser gravados em plaintext no `localStorage` da WebView. Migração silenciosa — nenhuma
  sessão é perdida ao atualizar.
- **PII removido das URLs**: `status` e `bootstrap` passaram de GET+query para POST+body JSON,
  eliminando vazamento de `license_key`/`device_id` em logs de proxy/acesso.

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
- **Cadastro de conta nova (plano grátis)** era tratado como licença bloqueada: a mensagem "Conta
  criada com sucesso" aparecia em vermelho e vazava para a tela de conexão. Agora a conta grátis
  loga direto, sem erro.

## [1.1.4] - 2026-06

### Corrigido
- BUG-001: flicker do toggle INPUT/USB.
- BUG-002: itens de FX faltando — dois bancos (A/B), grade 4×4 e ranges corretos por preset.
