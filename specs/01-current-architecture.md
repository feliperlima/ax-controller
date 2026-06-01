# Current Architecture (as-is)

## Estrutura atual de pastas (resumo)
- `apps/desktop/src/App.tsx`: orquestracao principal de estado, sync e fluxos de UI.
- `apps/desktop/src/components/*`: componentes de UI (strips, views, processors, grupos, scenes, patching).
- `apps/desktop/src/lib/axios16Client.ts`: cliente de protocolo, transporte WebSocket, encode/decode base, conversoes e comandos.
- `apps/desktop/src/protocol/duonn/*`: contratos e builders de protocolo (bitmask, groups, scenes, fx presets).
- `apps/desktop/src/services/*`: discovery e servicos DUONN especializados.
- `apps/desktop/src/lib/*`: utilitarios de dominio local (group controls, licensing, compatibilidade, etc).

## Principais modulos e responsabilidades
- Transporte/protocolo:
  - `lib/axios16Client.ts`
    - `connect()` com plugin Tauri e fallback browser websocket.
    - `sendParam`, `sendRaw`, `readParams`, decode de resposta (`decodeParamResponse`, `decodeNameResponse`, `decodeSceneNameResponse`).
    - Perfis e capabilities (`ax16_24` e `ax32_experimental`).
- Orquestracao de sync e estado global:
  - `App.tsx`
    - Estado global amplo via `useState`/`useRef`.
    - Boot connect/sync em `connectToMixer()` com etapas sequenciais `runConnectSyncStep(...)`.
    - Loops de sync parcial (ex.: grupos) e polling de meters.
- Regras de grupo:
  - `protocol/duonn/groups.ts`, `protocol/duonn/bitmask.ts`, `lib/groupControls.ts`, `services/duonn/groupsService.ts`.
- Scenes/presets:
  - `protocol/duonn/scenes.ts`, `services/duonn/scenesService.ts`, `protocol/duonn/fxPresets.ts`.
- Licenciamento/trial:
  - `lib/licenseState.ts`, `lib/licenseEngine.ts`, fluxo principal em `App.tsx`.
- Persistencia local:
  - `localStorage` em `App.tsx` (licenca, IDs, cache, preferencias por mixer).
  - `services/mixerDiscovery.ts` (historico IP/discovery cache).

## Onde ficam WebSocket, sync, profiles, UI e estado
- WebSocket: `lib/axios16Client.ts` (`connect`, wrappers `BrowserMixerSocket`/`TauriMixerSocket`).
- Boot sync: `App.tsx` (`connectToMixer` + `runConnectSyncStep` + `syncAllChannels` e relacionados).
- Profiles AX16/AX24/AX32:
  - `lib/axios16Client.ts` (capabilities e mapa de params).
  - `protocol/duonn/groups.ts` e `protocol/duonn/bitmask.ts` (perfil de grupos/bitmask).
  - `lib/mixerCompatibility.ts` (guardas de compatibilidade).
- UI:
  - Canais/strips: `components/ChannelStrip.tsx`, `components/AuxStrip.tsx`, `components/FxStrip.tsx`, `components/MasterBus.tsx`.
  - Sends/processors: `components/ChannelProcessors.tsx`.
  - DCA/Mute groups: `components/DcaGroupsView.tsx`, `components/MuteGroupsView.tsx`.
  - Scenes: `components/ScenesView.tsx`.
  - Customizacao: `components/ChannelCustomizer.tsx`.
- Estado global:
  - Concentrado em `App.tsx` (estado de conexao, strips, sends, links, groups, scenes, licenca e patching).

## Dependencias principais entre areas
- UI -> `App.tsx` handlers -> `Axios16Client`/protocol builders.
- `App.tsx` depende de varios dominios (`groupControls`, `license*`, `protocol/duonn/*`) e coordena side effects.
- `Axios16Client` combina transporte, codec de payload, mapeamento de parametros e comandos semanticos.

## Pontos de acoplamento encontrados
- Alto acoplamento em `App.tsx` (estado + regras de dominio + I/O + agenda de sync).
- Acoplamento de perfil com logica de parametro em `lib/axios16Client.ts`.
- Regras de link stereo impactam sends, grupos, sync e UI em varios pontos do `App.tsx`.
- Fluxo de licenca/trial e conexao compartilham caminhos criticos no `App.tsx`.

## Mapeamento solicitado (onde esta cada area)
- Conexao WebSocket: `lib/axios16Client.ts`.
- Boot sync: `App.tsx` (`connectToMixer`, `syncAllChannels`, `sync*`).
- Parser de mensagens: `lib/axios16Client.ts` (decode opcode 6/46/4 + leitura de responses).
- Envio de comandos: `lib/axios16Client.ts` (`sendParam`/`sendRaw`) + builders em `protocol/duonn/*`.
- Profiles AX16/AX24/AX32: `lib/axios16Client.ts`, `protocol/duonn/groups.ts`, `protocol/duonn/bitmask.ts`, `lib/mixerCompatibility.ts`.
- Estado global: `App.tsx`.
- UI de canais: `components/ChannelStrip.tsx`, `components/AuxStrip.tsx`, `components/FxStrip.tsx`, `components/MasterBus.tsx`.
- UI de sends: `components/ChannelProcessors.tsx`, views `mainView=auxSends|fxSends` em `App.tsx`.
- Stereo link: `App.tsx` (`syncLinkStates`, `syncChannelPairContext`, `resolveLinkedSendWrites`, etc).
- FX: `components/FxStrip.tsx`, `components/FxPresetPanel.tsx`, `protocol/duonn/fxPresets.ts`, `App.tsx` (`syncFx*`).
- DCA Groups: `components/DcaGroupsView.tsx`, `protocol/duonn/groups.ts`, `App.tsx` (`syncAllGroupStates`, handlers DCA).
- Mute Groups: `components/MuteGroupsView.tsx`, `protocol/duonn/groups.ts`, `App.tsx` (sync/aplicacao de mute gerenciado).
- Presets: FX em `protocol/duonn/fxPresets.ts`; scenes em `protocol/duonn/scenes.ts` e `services/duonn/scenesService.ts`.
- Custom UI: `components/ChannelCustomizer.tsx` + `customizationView` no `App.tsx`.
- Licenca/trial: `lib/licenseState.ts`, `lib/licenseEngine.ts`, fluxo em `App.tsx`.
- Persistencia local: `App.tsx` e `services/mixerDiscovery.ts` via `localStorage`.
