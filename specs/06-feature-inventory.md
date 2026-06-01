# Feature Inventory (as-is)

Legenda de risco: baixo | medio | alto

## Mixer base
- Feature: conexao/discovery e ciclo de vida.
  - Onde: `App.tsx` (`connectToMixer`, status, stage), `services/mixerDiscovery.ts`, `hooks/useMixerDiscovery.ts`.
  - Risco: alto.
  - Dependencias: websocket client, licensing, profile detection.
  - Spec propria futura: sim.

## Canais
- Feature: strips de input e estado principal.
  - Onde: `components/ChannelStrip.tsx`, `App.tsx` (`channels`, `syncChannelState`, `syncChannelProcessorState`).
  - Risco: alto.
  - Dependencias: parser, sync, profiles, meters.
  - Spec propria futura: sim.

## Faders
- Feature: controle de fader channel/aux/fx/master e DCA.
  - Onde: `lib/axios16Client.ts` (`setFader`, `setAuxFader`, etc), `App.tsx` (scheduler de writes), `lib/groupControls.ts`.
  - Risco: alto.
  - Dependencias: send throttle, link logic, profile maps.
  - Spec propria futura: sim.

## Meters
- Feature: polling e exibicao de meter/peak/clip.
  - Onde: `App.tsx` (`startMeterPolling`, `updateMetersFromResponse`), `components/Meter.tsx`.
  - Risco: alto.
  - Dependencias: timing, parser, perf UI.
  - Spec propria futura: sim.

## Mute
- Feature: mute por strip e aplicacao em grupos.
  - Onde: `lib/axios16Client.ts`, `App.tsx` (`applyMuteToMember`, handlers grupos).
  - Risco: alto.
  - Dependencias: group membership, link state.
  - Spec propria futura: sim.

## Solo
- Feature: solo channel/aux/fx/master + sync periodico.
  - Onde: `App.tsx` (`syncAllSoloStates`), `lib/axios16Client.ts`.
  - Risco: medio.
  - Dependencias: polling e params por profile.
  - Spec propria futura: sim.

## Pan
- Feature: pan e heuristica de inferencia de link em AX16/24.
  - Onde: `App.tsx` (`syncChannelPairContext`, `syncChannelPairVisualState`), `lib/axios16Client.ts`.
  - Risco: alto.
  - Dependencias: link state, parser, sync order.
  - Spec propria futura: sim.

## Sends
- Feature: sends por canal e bus input sends.
  - Onde: `components/ChannelProcessors.tsx`, `App.tsx` (`syncChannelSendsState`, `syncBusInputSendsState`, `handleSend*`, `resolveLinkedSendWrites`), `lib/axios16Client.ts`.
  - Risco: alto.
  - Dependencias: link stereo, throttle, tap point encoding.
  - Spec propria futura: sim (prioritaria).

## Sends on faders
- Feature: views `auxSends` e `fxSends` por target.
  - Onde: `App.tsx` (`mainView`, `selectedAuxSendsTarget`, `selectedFxSendsTarget`), `ChannelProcessors`.
  - Risco: medio.
  - Dependencias: sends core + mainView routing.
  - Spec propria futura: sim.

## Stereo link
- Feature: links channel/aux/master + fanout de writes.
  - Onde: `App.tsx` (`syncLinkStates`, `applyLinkStateFromRead`, `resolveLinkedSendWrites`, funcoes de pair/lock transition).
  - Risco: altissimo.
  - Dependencias: sends, groups, channel visual state.
  - Spec propria futura: sim (prioritaria).

## FX
- Feature: strips FX, processors FX, cores FX.
  - Onde: `components/FxStrip.tsx`, `App.tsx` (`syncFxState`, `syncAllFxState`, `syncFxColors`).
  - Risco: medio.
  - Dependencias: profile maps, processor params.
  - Spec propria futura: sim.

## DCA Groups
- Feature: enable/fader/members/sync DCA.
  - Onde: `components/DcaGroupsView.tsx`, `protocol/duonn/groups.ts`, `lib/groupControls.ts`, `App.tsx` (`syncAllGroupStates`, handlers DCA).
  - Risco: alto.
  - Dependencias: bitmask mapping, link normalization.
  - Spec propria futura: sim (prioritaria).

## Mute Groups
- Feature: active/members/sync e apply managed mute.
  - Onde: `components/MuteGroupsView.tsx`, `protocol/duonn/groups.ts`, `App.tsx` (`applyManagedMutes`, handlers mute group).
  - Risco: alto.
  - Dependencias: bitmask mapping, assignable members, link state.
  - Spec propria futura: sim (prioritaria).

## Presets
- Feature: FX presets.
  - Onde: `protocol/duonn/fxPresets.ts`, `components/FxPresetPanel.tsx`, `App.tsx` (`syncFxPresetState`).
  - Risco: medio.
  - Dependencias: profile-specific preset params.
  - Spec propria futura: sim.
- Feature: Scenes (call/save/rename/metadata).
  - Onde: `protocol/duonn/scenes.ts`, `services/duonn/scenesService.ts`, `components/ScenesView.tsx`, `App.tsx` (`handleSceneCall`, `handleSceneSave`, `refreshMixerStateAfterSceneAction`).
  - Risco: alto.
  - Dependencias: protocol opcodes, post-action sync.
  - Spec propria futura: sim (prioritaria).

## Custom UI
- Feature: customizacao de strips e aspectos visuais.
  - Onde: `components/ChannelCustomizer.tsx`, `App.tsx` (`customizationView`), `components/stripColor.ts`.
  - Risco: medio.
  - Dependencias: estado de strip e persistencia local.
  - Spec propria futura: sim.

## Navegacao
- Feature: troca de `mainView`, detail views e stages da app.
  - Onde: `App.tsx`, `components/TopNavigation.tsx`, `components/DeviceSelectionScreen.tsx`.
  - Risco: medio.
  - Dependencias: estado global e sync ativo.
  - Spec propria futura: sim.

## Licenca/trial
- Feature: validacao, cache, bloqueio de conexao e revalidacao.
  - Onde: `App.tsx`, `lib/licenseState.ts`, `lib/licenseEngine.ts`.
  - Risco: altissimo.
  - Dependencias: storage, API endpoints, boot decisions.
  - Spec propria futura: sim (prioritaria).

## Device/profile detection
- Feature: resolucao de profile/canal e compatibilidade.
  - Onde: `App.tsx` (`resolveConnectionTargetProfile` fluxo), `lib/mixerCompatibility.ts`, `lib/axios16Client.ts`.
  - Risco: alto.
  - Dependencias: discovery data, parameter map constraints.
  - Spec propria futura: sim (prioritaria).
