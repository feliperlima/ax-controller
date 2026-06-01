# Phase 3 Semantic Contracts - Minimal Implementation Task

Task type:
feature

Agent role:
Feature Agent + Architect Agent

## Task intent
Implementar somente os contratos minimos da Fase 3 (tipos/interfaces/erros tipados), sem conectar ao fluxo de producao.

## Mandatory specs to read before coding
- [08-agent-rules.md](specs/08-agent-rules.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- [24-sync-performance-and-semantic-control-spec.md](specs/24-sync-performance-and-semantic-control-spec.md)
- [26-phase-3-semantic-contracts-blueprint.md](specs/26-phase-3-semantic-contracts-blueprint.md)
- [03-protocol-contract.md](specs/03-protocol-contract.md)
- [04-device-profiles.md](specs/04-device-profiles.md)
- [05-sync-engine.md](specs/05-sync-engine.md)
- [07-risk-map.md](specs/07-risk-map.md)

## Understanding
Esta task existe para preparar base tipada da camada semantica interna, sem mudar comportamento funcional e sem adotar runtime wiring.

## Scope (allowed)
- Criar contratos de tipos/interfaces da camada semantica.
- Criar erro tipado de comando nao suportado.
- Criar estrutura de modulo semantic para contratos puros.
- Adicionar testes de tipo, quando aplicavel, sem alterar runtime funcional.

## Strictly out of scope
- Alterar App/UI.
- Alterar WebSocket, parser, sync, profiles, mappings.
- Alterar persistencia/licensing.
- Chamar sendParam/sendRaw/readParams a partir da camada semantic.
- Migrar qualquer comando de producao para semantic nesta fase.

## Files likely to change
- Sugeridos pela task:
  - apps/desktop/src/semantic/types/*
  - apps/desktop/src/semantic/contracts/*
  - apps/desktop/src/semantic/errors/*

## Files that must not change
- [apps/desktop/src/App.tsx](apps/desktop/src/App.tsx)
- [apps/desktop/src/lib/axios16Client.ts](apps/desktop/src/lib/axios16Client.ts)
- [apps/desktop/src/protocol/duonn/bitmask.ts](apps/desktop/src/protocol/duonn/bitmask.ts)
- [apps/desktop/src/protocol/duonn/groups.ts](apps/desktop/src/protocol/duonn/groups.ts)
- [apps/desktop/src/protocol/duonn/scenes.ts](apps/desktop/src/protocol/duonn/scenes.ts)
- [apps/desktop/src/protocol/duonn/fxPresets.ts](apps/desktop/src/protocol/duonn/fxPresets.ts)
- [apps/desktop/src/lib/mixerCompatibility.ts](apps/desktop/src/lib/mixerCompatibility.ts)

## Critical areas touched
- Somente design de contrato e fronteira arquitetural.
- Nenhum runtime de protocolo/sync deve ser tocado.

## Minimal implementation deliverables
1. SemanticAddress
2. SemanticValue
3. SemanticCommandName
4. SemanticCommand
5. SemanticCommandContext
6. SemanticResolutionResult
7. SemanticProfileResolver interface
8. SemanticParameterResolver interface
9. SemanticResolverError
10. SemanticUnsupportedCommandError

## Import boundary rules
- Permitido: imports de tipos puros.
- Proibido: imports de App, componentes React, instancia de cliente WS, chamadas de TX/RX.

## Validation checklist (mandatory)
- Confirmar que nenhum arquivo de runtime de producao foi alterado.
- Confirmar que nao existem call sites de producao para contratos semantic.
- Confirmar ausencia de sendParam/sendRaw/readParams no modulo semantic.
- Confirmar build/typecheck sem mudanca funcional.
- Confirmar que escopo da task permaneceu minimo.

## Expected delivery format
- Task type
- Agent role
- Specs read
- Files changed
- Summary of changes
- Behavior changed
- Behavior intentionally preserved
- Tests/checks performed
- Manual validation checklist
- Remaining risks

## Stop condition
Pausar e pedir confirmacao antes de qualquer migracao de comando real (Fase 4).
