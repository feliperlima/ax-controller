# Phase 4 Pilot - setChannelFader

Task type:
feature

Agent role:
Feature Agent + Protocol/Sync Agent + QA/Reviewer Agent

## Purpose
Executar a primeira migracao funcional minima da camada semantica usando apenas `setChannelFader`, com risco controlado e rollback simples.

## Mandatory specs to read before coding
- [08-agent-rules.md](specs/08-agent-rules.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- [24-sync-performance-and-semantic-control-spec.md](specs/24-sync-performance-and-semantic-control-spec.md)
- [26-phase-3-semantic-contracts-blueprint.md](specs/26-phase-3-semantic-contracts-blueprint.md)
- [27-phase-3-semantic-contracts-implementation-task.md](specs/27-phase-3-semantic-contracts-implementation-task.md)
- [03-protocol-contract.md](specs/03-protocol-contract.md)
- [04-device-profiles.md](specs/04-device-profiles.md)
- [05-sync-engine.md](specs/05-sync-engine.md)
- [07-risk-map.md](specs/07-risk-map.md)

## Scope (strict)
- Migrar somente o comando `setChannelFader` para usar caminho semantico interno.
- Manter comportamento funcional equivalente.
- Preservar throttle/RAF e atualizacao otimista ja existentes.

## Out of scope
- Qualquer outro comando semantico.
- Sends, stereo link, DCA, mute groups, scenes, presets, patching.
- Alteracao de parser.
- Alteracao de transporte WebSocket.
- Alteracao de mappings/profile tables.
- Refactor amplo em App.

## Files likely to change
- [apps/desktop/src/semantic](apps/desktop/src/semantic)
- [apps/desktop/src/App.tsx](apps/desktop/src/App.tsx) em ponto minimo de integracao do piloto

## Files that must be treated as high risk
- [apps/desktop/src/lib/axios16Client.ts](apps/desktop/src/lib/axios16Client.ts)
- [apps/desktop/src/protocol/duonn/groups.ts](apps/desktop/src/protocol/duonn/groups.ts)
- [apps/desktop/src/protocol/duonn/bitmask.ts](apps/desktop/src/protocol/duonn/bitmask.ts)

## Mitigation strategy
1. Integrar piloto atras de caminho controlado (facil rollback).
2. Garantir equivalencia semantic -> raw para fader em todos os profiles suportados.
3. Comparar latencia percebida antes/depois.
4. Validar reconciliação com RX real da mesa.
5. Confirmar ausencia de novos writes automaticos durante boot sync.

## Acceptance criteria
- Apenas `setChannelFader` migrou para path semantico.
- Nenhuma regressao visivel de responsividade de fader.
- Nenhuma mudanca em sends/link/groups/scenes.
- Sem alteracao de parser, protocolo wire e mappings.
- Checklist manual do piloto executado e documentado.

## Manual validation checklist (pilot)
- Fader responde na UI com a mesma fluidez anterior.
- Mesa recebe atualizacao de fader corretamente.
- RX confirma valor sem drift persistente.
- AX16/AX24/AX32 mantem comportamento consistente.
- Boot sync nao introduz writes automaticos novos.
- Rollback do path semantic do piloto e simples e verificavel.

## Validation notes
- 2026-06-01 (feedback manual inicial): fader no app responde na mesa e vice-versa (PASS preliminar de fluxo bidirecional).
- Pendencias para fechamento completo do piloto:
	- validar explicitamente AX16, AX24 e AX32
	- validar ausencia de writes novos no boot sync
	- validar rollback com flag do piloto

## Validation notes - automated pass (2026-06-01)
- PASS: piloto restrito ao handler de fader de canal (`handleFaderChange`) e nao acoplado ao fluxo de `connectToMixer`/etapas de boot sync.
- PASS: caminho de rollback simples confirmado por flag (`ENABLE_SEMANTIC_SET_CHANNEL_FADER_PILOT`).
- PASS: camada semantic (types/contracts/errors/pilot) sem chamadas diretas de `sendParam`, `sendRaw` ou `readParams`.
- PASS: typecheck (`npx tsc --noEmit`) sem erro visivel.
- PASS (manual parcial): fluxo validado no hardware AX32 disponivel (app -> mesa e mesa -> app).
- Confianca condicional AX16/AX24: alta, pois o piloto resolve param de fader via profile ativo no mesmo caminho de parametros ja existente.
- Pendente (manual): confirmacao em hardware AX16 e AX24 quando disponivel, para fechamento formal multi-profile.

## Stop condition
Pausar e pedir confirmacao antes de migrar qualquer segundo comando.