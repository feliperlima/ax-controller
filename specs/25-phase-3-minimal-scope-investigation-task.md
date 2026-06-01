# Phase 3 Minimal Scope - Investigation Task

Task type:
investigation-only

Agent role:
Architect Agent + Protocol/Sync Agent

## Objective
Mapear com precisao onde e como preparar a Fase 3 de contratos semanticos (tipos/interfaces) com escopo minimo, sem alterar comportamento funcional e sem conectar nada ao fluxo de producao.

## Mandatory specs to read before investigation
- [08-agent-rules.md](specs/08-agent-rules.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- [24-sync-performance-and-semantic-control-spec.md](specs/24-sync-performance-and-semantic-control-spec.md)
- [03-protocol-contract.md](specs/03-protocol-contract.md)
- [04-device-profiles.md](specs/04-device-profiles.md)
- [05-sync-engine.md](specs/05-sync-engine.md)
- [07-risk-map.md](specs/07-risk-map.md)

## Scope
- Somente investigacao, leitura e diagnostico.
- Nenhuma implementacao.
- Nenhuma alteracao de comportamento.

## Out of scope
- Alteracao de codigo fonte.
- Alteracao de UI.
- Alteracao de WebSocket.
- Alteracao de sync/parser.
- Alteracao de profiles/mappings.
- Alteracao de persistencia/licensing.
- Refactor amplo.

## Questions to answer
1. Quais tipos minimos de comando semantico sao necessarios para Fase 3.
2. Quais tipos minimos de endereco semantico sao necessarios para Fase 3.
3. Qual shape minimo de profile resolver para traducao sem acoplamento de runtime.
4. Qual shape minimo de parameter resolver para traducao semantica -> raw.
5. Onde esses contratos devem viver para nao gerar dependencia circular.
6. Quais imports atuais seriam risco de acoplamento indevido.
7. Quais caminhos de App/UI nao podem ser tocados na Fase 3.
8. Qual plano de validacao para provar que Fase 3 nao conecta em producao.

## Files to inspect
- [apps/desktop/src/App.tsx](apps/desktop/src/App.tsx)
- [apps/desktop/src/lib/axios16Client.ts](apps/desktop/src/lib/axios16Client.ts)
- [apps/desktop/src/protocol/duonn](apps/desktop/src/protocol/duonn)
- [apps/desktop/src/lib/mixerCompatibility.ts](apps/desktop/src/lib/mixerCompatibility.ts)

## Expected output format
- Task type
- Agent role
- Specs read
- Understanding
- Files inspected
- Minimal contracts proposed
- Non-goals confirmed
- Coupling risks
- Suggested folder/module placement
- Validation strategy (no runtime wiring)
- Recommendation
- Confirmation that no files were altered

## Stop condition
Pausar e pedir confirmacao antes de qualquer fase docs-only ou feature baseada nos achados.
