# Phase 4B Pilot - setChannelMute

Task type:
implementation-task

## Purpose
Migrar apenas o comando `setChannelMute` para caminho semantico interno (`/ax/ch/{n}/mute`) mantendo fallback imediato para o caminho legado.

## Scope
- Integrar piloto de `setChannelMute` no fluxo atual de toggle de mute em canais de entrada.
- Preservar fanout de canais linked ja existente no App.
- Preservar escrita otimista de estado local.

## Out of scope
- Nao migrar mute de AUX/FX/MASTER nesta task.
- Nao alterar parser/protocolo/sync/mapping.
- Nao alterar fluxo de link de canal.

## Implementation contract
- Resolver dedicado `SetChannelMutePilotResolver`:
  - address: `/ax/ch/{n}/mute`
  - command: `setChannelMute`
  - value: boolean
  - write: `channelParam(channel, 74)`
  - regra de valor: protocolo invertido (`true -> 0`, `false -> 1`)
- Integracao no `toggleMute`:
  - `ENABLE_SEMANTIC_SET_CHANNEL_MUTE_PILOT`
  - `try semantic resolve + sendParam`
  - `catch => client.setMute` (rollback)

## Acceptance criteria
1. Typecheck sem erros.
2. Toggle de mute em canal nao-linked segue funcional.
3. Toggle de mute em par linked preserva fanout atual.
4. Falha no resolver nao bloqueia acao (fallback legado funcional).
5. Sem regressao observavel em demais comandos de canal.

## Manual validation checklist (AX32)
1. Conectar em mesa AX32 e abrir canal de entrada nao-linked.
2. Alternar mute on/off e validar retorno visual local + estado real na mesa.
3. Linkar par de canais, alternar mute em um lado e validar fanout no par.
4. Deslinkar par e validar comportamento independente.
5. Repetir em pelo menos dois pares de canais distintos.

## Current status
- Implementacao local concluida.
- Typecheck local concluido.
- Validacao manual em hardware: pendente.

## Rollback
- Desativar `ENABLE_SEMANTIC_SET_CHANNEL_MUTE_PILOT` para retornar ao caminho legado sem remover codigo.