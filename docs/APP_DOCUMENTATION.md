# AX Controller - Documentacao Completa do Aplicativo

## 1. Visao Geral

AX Controller e um aplicativo para controle de mixers Axios com foco em operacao ao vivo e fluxo de mixagem rapido, executando em desktop via Tauri e com suporte de build para iOS.

O app combina:

- UI React com estado global de audio/mixer.
- Cliente WebSocket com mapeamento DUONN/Axios.
- Camada Tauri para discovery e validacao de licenca.
- Politica de licenca com cache offline e bloqueios de seguranca.

## 2. Stack Tecnica

- React 19
- TypeScript
- Vite
- Tauri v2
- Rust (backend Tauri)
- Reqwest (HTTP no backend Tauri)

Arquivos de referencia:

- `apps/desktop/src/main.tsx`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/lib/axios16Client.ts`
- `apps/desktop/src-tauri/src/lib.rs`

## 3. Arquitetura Funcional

### 3.1 Stages do app

- `splash`
- `device-selection`
- `mixer`

### 3.2 Main views (stage mixer)

- `mixer`
- `auxSends`
- `fxSends`
- `muteGroups`
- `dcaGroups`
- `scenes`

### 3.3 Detail views

- `channel`
- `aux`
- `fx`
- `master`

### 3.4 Modais e overlays

- Modal de licenca/Device ID
- Overlays de confirmacao em Scenes
- Seletor customizador de canal (icone, nome, cor)

## 4. Fluxos de Navegacao

### 4.1 Splash

Tela de abertura com duracao minima configurada.

### 4.2 Device Selection

Entradas:

- Lista de mixers descobertos
- Campo de IP manual
- Status de conexao e erro

Acoes:

- Atualizar descoberta
- Conectar mixer descoberto
- Conectar manualmente por IP

### 4.3 Mixer

Topo:

- Tabs principais
- Status de conexao
- Diagnostico de licenca
- Menu de settings

Conteudo:

- Strips de canais
- Strips FX
- Strips AUX
- Master bus
- Navegacao para detalhes

## 5. Modulos de UI e Funcionalidades

### 5.1 TopNavigation

Arquivo: `apps/desktop/src/components/TopNavigation.tsx`

- Tag de status: connected, connecting, disconnected
- Campo IP com submit por Enter
- Botao de desconectar quando conectado

### 5.2 DeviceSelectionScreen

Arquivo: `apps/desktop/src/components/DeviceSelectionScreen.tsx`

- Lista de mixers com nome, IP e canais
- Bloco de conexao manual
- Mensagens de estado e erro

### 5.3 ChannelStrip

Arquivo: `apps/desktop/src/components/ChannelStrip.tsx`

- Mute, solo, phantom, phase
- Fader, pan, gain
- EQ preview
- Footer de canal e indicacao de link

### 5.4 AuxStrip e FxStrip

Arquivos:

- `apps/desktop/src/components/AuxStrip.tsx`
- `apps/desktop/src/components/FxStrip.tsx`

- Fader, mute e solo
- Nome e cor
- Medidores com peak/clip
- Acesso a detail view

### 5.5 MasterBus

Arquivo: `apps/desktop/src/components/MasterBus.tsx`

- Faders L/R
- Modo linked/unlinked
- Mute e solo
- Meter L/R com clip

### 5.6 ChannelProcessors

Arquivo: `apps/desktop/src/components/ChannelProcessors.tsx`

- Modulos: gate, comp, eq, sends, delay, presets
- Eq curve e controles de banda
- Filtros HPF/LPF
- Send strips com tap point pre/post

### 5.7 DcaGroupsView

Arquivo: `apps/desktop/src/components/DcaGroupsView.tsx`

- 4 grupos DCA
- Enable por grupo
- Fader por grupo
- Matriz de membros (canais, AUX, FX)
- Leitura periodica de estado da mesa

### 5.8 MuteGroupsView

Arquivo: `apps/desktop/src/components/MuteGroupsView.tsx`

- 4 grupos de mute
- Ativo/inativo por grupo
- Matriz de membros
- Clear e all-muted
- Aplicacao real de mute nos membros

### 5.9 ScenesView

Arquivo: `apps/desktop/src/components/ScenesView.tsx`

- Lista de 12 cenas
- Call, Save e Rename
- Confirmacoes para call/save
- Rename com validacao e normalizacao ASCII

### 5.10 FxPresetPanel

Arquivo: `apps/desktop/src/components/FxPresetPanel.tsx`

- Grid de presets
- Painel de dois controles contextuais
- Tap tempo para presets de delay

## 6. Protocolo DUONN/Axios

### 6.1 Cliente de protocolo

Arquivo: `apps/desktop/src/lib/axios16Client.ts`

- Conexao WebSocket com URL `ws://<ip>:8088/`
- Leituras de parametros em lote
- Escritas de parametros por dominio
- Leitura/escrita de nomes
- Pacotes raw com CRC

### 6.2 Conversoes e normalizacoes

Inclui conversao de:

- dB <-> valor de fader
- pan/gain
- filtros
- comp/gate
- frequencias EQ

### 6.3 Grupos

Arquivo: `apps/desktop/src/protocol/duonn/groups.ts`

- Config de DCA e Mute groups
- Builders para:
  - set enabled
  - set fader
  - set members
  - clear members
  - all-muted

### 6.4 Bitmask de membros

Arquivo: `apps/desktop/src/protocol/duonn/bitmask.ts`

- Mapeamento de membros para palavras/bit
- Encode/decode de membros
- Flags de mapeamento confirmado e derivado

### 6.5 Scenes

Arquivo: `apps/desktop/src/protocol/duonn/scenes.ts`

- Slots 1 a 12
- Opcodes de call/save/rename/read metadata
- Validacao de slot e nome

### 6.6 FX Presets

Arquivo: `apps/desktop/src/protocol/duonn/fxPresets.ts`

- Catalogo de presets ativos 1..12
- Config de controles A/B
- Conversao raw/display

## 7. Discovery e Compatibilidade

### 7.1 Discovery

Arquivos:

- `apps/desktop/src/hooks/useMixerDiscovery.ts`
- `apps/desktop/src/services/mixerDiscovery.ts`
- `apps/desktop/src-tauri/src/lib.rs`

Fluxo:

- Frontend chama `discover_mixers` via invoke
- Backend consulta finder local e normaliza mixers
- Front deduplica por IP e apresenta lista

### 7.2 Compatibilidade

Arquivo: `apps/desktop/src/lib/mixerCompatibility.ts`

- Detecta colisoes de parametros para modelos/canais
- Bloqueia conexao quando mapping atual nao suportar modelo

## 8. Licenca, Ativacao e Revalidacao

Arquivo principal: `apps/desktop/src/App.tsx`

### 8.1 Dados locais

- `ax_installation_id`
- `ax_license_key_last`
- `ax_license_status`
- `ax_license_activated_once`

### 8.2 Regras implementadas

- Primeiro uso exige validacao online
- Cache local habilita offline apos validacao
- Revalidacao em background quando online
- Janela de revalidacao de 30 dias
- Aviso in-app nos ultimos 5 dias
- Bloqueio apos expirar janela sem revalidar
- `expiry_date` da API salvo e validado offline
- Trial/licenca expirada bloqueia imediatamente
- Respostas invalidas da API bloqueiam sessao e desconectam mixer

### 8.3 API de validacao

Comando Tauri: `validate_license`

Backend atual envia para:

- `https://axcontrol.com.br/api/license/validate.php`

Payload enviado:

- `license_key`
- `series`
- `device_id`
- `device_name`
- `platform`
- `app_version`

## 9. Comandos e Build

No workspace raiz:

- `npm install`

No app desktop:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run tauri dev`
- `npm run check:param-overlap`

## 10. Configuracao Tauri

Arquivos:

- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/src-tauri/src/lib.rs`

Observacoes:

- `beforeDevCommand`: `npm run dev`
- `devUrl`: `http://localhost:1420`
- Window minima: 1270x720
- Bundle ativo para todos os targets

## 11. Design System

Arquivos:

- `apps/desktop/src/design-system/tokens/tokens.ts`
- `apps/desktop/src/design-system/tokens/tokens.css`

Inclui:

- Tokens primitivos de cor
- Semanticos de sucesso/alerta/danger
- Paleta de canais
- Superficies e estados de controle

## 12. Servicos auxiliares

- `apps/desktop/src/services/duonn/groupsService.ts`
- `apps/desktop/src/services/duonn/scenesService.ts`

Atencao:

- Scenes import/export seguem como pendencia de protocolo.

## 13. Limites e pontos pendentes

- Import/export de scenes nao concluido.
- Parte de mapeamentos para modelos maiores ainda marcada como derivada.
- Recomendado validar em hardware todos os parametros derivados.

## 14. Troubleshooting

### 14.1 `npm run tauri dev` falha por porta ocupada

- Libere a porta 1420 antes de subir Tauri.

### 14.2 `cargo` ausente

- Instale Rust toolchain e carregue ambiente do cargo.

### 14.3 Sem validacao de licenca

- Verifique conectividade com endpoint de licenca.
- Verifique formato de resposta da API.

### 14.4 Mixer nao conecta

- Verifique IP da mesa.
- Verifique rede local e porta 8088.

## 15. Referencias de codigo

Arquivos centrais para manutencao:

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/lib/axios16Client.ts`
- `apps/desktop/src/components/ChannelProcessors.tsx`
- `apps/desktop/src/components/DcaGroupsView.tsx`
- `apps/desktop/src/components/MuteGroupsView.tsx`
- `apps/desktop/src/components/ScenesView.tsx`
- `apps/desktop/src/protocol/duonn/groups.ts`
- `apps/desktop/src/protocol/duonn/scenes.ts`
- `apps/desktop/src/protocol/duonn/bitmask.ts`
- `apps/desktop/src-tauri/src/lib.rs`
