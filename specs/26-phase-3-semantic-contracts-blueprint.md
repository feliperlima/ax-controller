# Phase 3 Semantic Contracts Blueprint

Task type:
docs-only

Agent role:
Docs/SDD Agent + Architect Agent

## Purpose
Definir o blueprint minimo para implementar a Fase 3 da camada semantica interna sem alterar comportamento funcional e sem conectar runtime.

## Scope
- Somente contratos de tipos/interfaces.
- Sem wiring em App, UI, sync, parser, protocol transport ou profile mapping.

## Non-goals
- Nao criar comandos em producao.
- Nao trocar fluxo de TX/RX atual.
- Nao alterar mapeamentos por profile.
- Nao criar bridge OSC externa.

## Minimal contract set
1. SemanticAddress
- Identifica endereco interno no namespace `/ax`.
- Deve carregar forma canonica (string) e partes estruturadas opcionais.

2. SemanticValue
- Valor normalizado da camada semantica.
- Tipos minimos: boolean, number, string, command/event marker.

3. SemanticCommandName
- Nome do comando semantico interno.
- Ex.: `setChannelMute`, `setChannelFader`, `setAuxSend`.

4. SemanticCommand
- Estrutura minima de comando:
  - `name`
  - `address`
  - `value`
  - `meta` opcional

5. SemanticCommandContext
- Contexto minimo para resolucao:
  - profile ativo
  - capacidades relevantes
  - origem da acao (opcional)

6. SemanticResolutionResult
- Resultado de resolucao sem envio:
  - lista de param/value raw calculados
  - warnings opcionais

7. SemanticProfileResolver (interface)
- Responsavel por expor profile ativo confiavel e capacidades minimas.
- Nao depende de runtime de UI.

8. SemanticParameterResolver (interface)
- Responsavel por traduzir `SemanticCommand` -> param/value raw usando profile.
- Nao envia comandos.

9. SemanticResolverError
- Erro base tipado da camada semantica.

10. SemanticUnsupportedCommandError
- Erro tipado para comando nao suportado no profile ativo.

## Import boundaries (mandatory)
- Permitido:
  - imports de tipos puros internos do modulo semantic.
  - tipos de dominio que nao puxem runtime React/WebSocket.
- Proibido:
  - importar `App.tsx`.
  - importar componentes React.
  - instanciar `Axios16Client`.
  - chamar `sendParam`, `sendRaw` ou `readParams`.

## Suggested placement
- `apps/desktop/src/semantic/types/*`
- `apps/desktop/src/semantic/contracts/*`
- `apps/desktop/src/semantic/errors/*`

Regra: manter modulo semantic independente de UI e de protocolo concreto na Fase 3.

## Acceptance criteria for Phase 3 implementation
- Contratos de tipo/interface criados.
- Nenhum path de runtime em producao chama esses contratos.
- Nenhuma alteracao funcional observavel.
- Nenhuma alteracao de WebSocket/sync/parser/profiles/mappings.
- Erro tipado para comando nao suportado disponivel.

## Validation checklist (no runtime wiring)
- Buscar usos de contratos semantic em App/UI e confirmar zero call sites de producao.
- Confirmar ausencia de chamadas a `sendParam`, `sendRaw`, `readParams` dentro do modulo semantic.
- Confirmar que a compilacao passa sem side effects funcionais.
- Confirmar que somente arquivos de docs foram alterados nesta etapa.

## Handoff to next task
A proxima task de implementacao deve ser limitada a criar somente contratos de tipos/interfaces deste blueprint, sem migrar nenhuma acao funcional ainda.
