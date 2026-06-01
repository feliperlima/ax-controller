# Semantic Command Expansion Matrix

Task type:
docs-only

Agent role:
Docs/SDD Agent + Architect Agent

## Purpose
Preparar a expansao completa dos comandos semanticos internos do AX Control, cobrindo CH/AUX/FX/MASTER e demais dominios criticos (sends, stereo link, groups, scenes, presets, patching, app/mixer state), com foco em cobertura funcional, ordem de risco e aplicabilidade real.

## Scope
- Planejamento e catalogo de comandos semanticos.
- Sem implementacao funcional.
- Sem alteracao de protocolo, parser, sync, mappings ou UI.

## Functional coverage domains
- Channel strip and processing
- Aux strip and processing
- FX return and FX processing
- Master strip and processing
- Sends and send tap points
- Stereo link (channel/aux/master)
- DCA groups and mute groups
- Scenes and presets
- Patching and routing
- App/mixer status namespace

## Domains and applicability

### Channel (CH)
- Fader: aplicavel
- Mute: aplicavel
- Phantom: aplicavel
- EQ: aplicavel
- Comp: aplicavel
- Gate: aplicavel
- Name: aplicavel
- Color: aplicavel

### Aux
- Fader: aplicavel
- Mute: aplicavel
- Phantom: nao aplicavel (N/A)
- EQ: aplicavel
- Comp: aplicavel
- Gate: nao aplicavel (N/A)
- Name: aplicavel
- Color: aplicavel

### FX (return/processor)
- Fader: aplicavel (return)
- Mute: aplicavel (return)
- Phantom: nao aplicavel (N/A)
- EQ: aplicavel
- Comp: nao aplicavel por padrao atual (N/A)
- Gate: nao aplicavel (N/A)
- Name: aplicavel
- Color: aplicavel

### Master
- Fader: aplicavel
- Mute: aplicavel
- Phantom: nao aplicavel (N/A)
- EQ: aplicavel
- Comp: aplicavel
- Gate: nao aplicavel (N/A)
- Name: nao aplicavel como comando de rotina (N/A)
- Color: aplicavel com regra especial atual

### Sends and stereo link
- Send level/tap point: aplicavel
- Link on/off e lock transitions: aplicavel
- Fanout semantic em pares linked: aplicavel com risco alto

### Groups, scenes, presets, patching
- DCA/mute groups: aplicavel
- Scenes recall/save/rename: aplicavel
- FX presets: aplicavel
- Patching/routing: aplicavel (alto risco)

## Suggested semantic commands

### CH
- setChannelFader
- setChannelMute
- setChannelPhantom
- setChannelName
- setChannelColor
- setChannelGateEnabled
- setChannelGateThreshold
- setChannelGateAttack
- setChannelGateRelease
- setChannelCompEnabled
- setChannelCompThreshold
- setChannelCompRatio
- setChannelCompAttack
- setChannelCompRelease
- setChannelCompGain
- setChannelEqEnabled
- setChannelEqBand

### AUX
- setAuxFader
- setAuxMute
- setAuxSolo
- setAuxPan
- setAuxName
- setAuxColor
- setAuxEqEnabled
- setAuxEqBand
- setAuxCompEnabled
- setAuxCompThreshold
- setAuxCompRatio
- setAuxCompAttack
- setAuxCompRelease
- setAuxCompGain

### FX
- setFxReturnFader
- setFxReturnMute
- setFxReturnSolo
- setFxName
- setFxColor
- setFxEqEnabled
- setFxEqBand

### MASTER
- setMasterFader
- setMasterMute
- setMasterSolo
- setMasterCompEnabled
- setMasterCompThreshold
- setMasterCompRatio
- setMasterCompAttack
- setMasterCompRelease
- setMasterCompGain
- setMasterEqEnabled
- setMasterEqBand
- setMasterColor

### SENDS / LINK
- setChannelAuxSendLevel
- setChannelFxSendLevel
- setChannelAuxSendTapPoint
- setBusInputSendLevel
- setBusInputSendTapPoint
- setChannelLinkState
- setAuxLinkState
- setMasterLinkState

### GROUPS
- setDcaEnabled
- setDcaMembers
- setMuteGroupActive
- setMuteGroupMembers

### SCENES / PRESETS
- recallScene
- saveScene
- renameScene
- setFxPreset
- setFxPresetControlA
- setFxPresetControlB

### PATCHING / ROUTING
- setUsbInputPatch
- setUsbReturnPatch
- setAx32OutputPatch

### APP / MIXER STATUS
- setAppSyncState (internal)
- setAppSyncProgress (internal)
- setMixerConnectionState (internal)

## Risk-tier rollout (recommended)
1. Tier A (baixo/medio): mute, name, color
2. Tier B (medio): phantom, eq enable, comp enable
3. Tier C (medio/alto): eq band, comp params, pan/solo
4. Tier D (alto): gate, sends tap point, stereo link transitions
5. Tier E (alto): groups/scenes/presets
6. Tier F (altissimo): patching/routing e comandos com impacto amplo de estado

## Mandatory guardrails
- Um comando por vez em piloto funcional.
- Sempre com fallback para caminho atual.
- Nao misturar comandos de dominios distintos no mesmo lote inicial.
- Sem alterar parser, transport e profile mapping na fase de expansao de comandos.

## Dependencies and ordering constraints
- Link state precisa estar resolvido antes de comandos semanticos de send que dependem de fanout.
- Comandos de group membership dependem de bitmask/profile corretos.
- Scenes/presets exigem reconciliacao pos-acao.
- Patching exige validacao extra de profile/capabilities e rollback claro.

## Acceptance criteria for preparation phase
- Matriz de comandos e aplicabilidade publicada.
- Ordem de rollout por risco definida.
- Guardrails de migracao incremental definidos.
- Nenhuma alteracao funcional realizada nesta etapa.
