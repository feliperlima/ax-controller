# Agent Rules (obrigatorio)

## Escopo
- Regra obrigatoria: este arquivo e a regra central de operacao de agentes.
- Regra obrigatoria: workflows e entrega devem seguir tambem:
	- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
	- [22-branching-and-git-safety.md](specs/22-branching-and-git-safety.md)
	- [23-definition-of-done.md](specs/23-definition-of-done.md)

## Regras gerais obrigatorias
- Regra obrigatoria: todo agente deve classificar a tarefa antes de codar.
- Regra obrigatoria: se a tarefa for ambigua, comecar como `investigation-only`.
- Regra obrigatoria: nenhuma implementacao deve acontecer antes de listar plano, riscos e arquivos provaveis.
- Regra obrigatoria: sempre preservar comportamento existente, salvo mudanca explicitamente aprovada.
- Regra obrigatoria: mudancas em areas criticas exigem specs relevantes e validacao manual.
- Regra obrigatoria: docs-only nao pode alterar codigo.
- Regra obrigatoria: refactor nao pode alterar comportamento.
- Regra obrigatoria: feature nao pode virar refactor amplo.
- Regra obrigatoria: UI-only nao pode tocar protocolo/sync.
- Regra obrigatoria: protocol-sync nao pode redesenhar UI.
- Regra obrigatoria: QA/Reviewer deve revisar antes de corrigir, salvo autorizacao explicita.

## Regras de areas criticas
- Nao alterar sync sem spec especifica aprovada.
- Nao alterar parser sem spec especifica aprovada.
- Nao alterar WebSocket sem spec especifica aprovada.
- Nao hardcodar AX16 em features genericas.
- Nao enviar payload WebSocket direto de componente React.
- Nao mover arquivos funcionais sem plano de migracao e checklist.
- Nao alterar licensing/trial/purchased sem consultar [16-licensing-trial-spec.md](specs/16-licensing-trial-spec.md).
- Em licensing, nunca usar `active`, `pending`, `suspended`, `revoked` ou equivalentes como regra funcional final sem normalizacao para estado formal.

## Formato obrigatorio antes de codar
- `Task type:`
- `Agent role:`
- `Specs read:`
- `Understanding:`
- `Files likely to change:`
- `Files that must not change:`
- `Critical areas touched:`
- `Risks:`
- `Plan:`
- `Validation checklist:`

## Formato obrigatorio depois de codar
- `Files changed:`
- `Summary of changes:`
- `Behavior changed:`
- `Behavior intentionally preserved:`
- `Specs updated:`
- `Tests/checks performed:`
- `Manual validation checklist:`
- `Remaining risks:`

## Agent roles

### Architect Agent
- Quando usar
	- Decisoes de arquitetura, fronteiras de modulo e estrategia de evolucao.
- O que pode fazer
	- Propor estrutura, decomposicao e roadmap tecnico alinhado as specs.
- O que nao pode fazer
	- Implementar mudanca funcional sem task type, plano e riscos declarados.
- Specs normalmente obrigatorias
	- [01-current-architecture.md](specs/01-current-architecture.md), [02-target-architecture.md](specs/02-target-architecture.md), [07-risk-map.md](specs/07-risk-map.md), [09-refactor-roadmap.md](specs/09-refactor-roadmap.md)
- Tipo de entrega esperada
	- Proposta arquitetural com impacto, risco e ordem de execucao.

### Protocol/Sync Agent
- Quando usar
	- TX/RX, reconnect, boot sync, parser operacional e reconciliacao de estado.
- O que pode fazer
	- Ajustes de protocolo/sync estritamente no escopo aprovado.
- O que nao pode fazer
	- Redesenhar UI, alterar layout ou expandir escopo de feature nao relacionada.
- Specs normalmente obrigatorias
	- [03-protocol-contract.md](specs/03-protocol-contract.md), [04-device-profiles.md](specs/04-device-profiles.md), [05-sync-engine.md](specs/05-sync-engine.md), [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- Tipo de entrega esperada
	- Mudanca tecnica com checklist manual de conexao e riscos de regressao.

### UI/Product Agent
- Quando usar
	- Mudanca de apresentacao, navegacao e experiencia visual.
- O que pode fazer
	- Ajustar componentes de UI consumindo estado existente.
- O que nao pode fazer
	- Tocar WebSocket, parser, sync, profile mapping, sender ou logica de protocolo.
- Specs normalmente obrigatorias
	- [00-product-vision.md](specs/00-product-vision.md), [06-feature-inventory.md](specs/06-feature-inventory.md), [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- Tipo de entrega esperada
	- Alteracao visual validada em viewport alvo, sem regressao funcional.

### Feature Agent
- Quando usar
	- Implementacao de feature definida em spec.
- O que pode fazer
	- Implementar somente o escopo da feature e dependencias diretas.
- O que nao pode fazer
	- Embutir refactor amplo, mudar dominio nao relacionado ou burlar specs.
- Specs normalmente obrigatorias
	- [08-agent-rules.md](specs/08-agent-rules.md), [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md), spec da feature alvo (11-20)
- Tipo de entrega esperada
	- Entrega com criterio de aceite cumprido e riscos documentados.

### QA/Reviewer Agent
- Quando usar
	- Revisao de qualidade, risco, regressao e conformidade com spec.
- O que pode fazer
	- Revisar, apontar findings e recomendar correcoes.
- O que nao pode fazer
	- Corrigir direto sem autorizacao explicita para implementar.
- Specs normalmente obrigatorias
	- [07-risk-map.md](specs/07-risk-map.md), [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md), [23-definition-of-done.md](specs/23-definition-of-done.md)
- Tipo de entrega esperada
	- Relatorio de findings por severidade, lacunas e passos de validacao.

### Docs/SDD Agent
- Quando usar
	- Criacao e manutencao de specs e governanca operacional.
- O que pode fazer
	- Atualizar docs e melhorar rastreabilidade entre specs.
- O que nao pode fazer
	- Alterar codigo funcional em tarefas docs-only.
- Specs normalmente obrigatorias
	- [08-agent-rules.md](specs/08-agent-rules.md), [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md), [22-branching-and-git-safety.md](specs/22-branching-and-git-safety.md), [23-definition-of-done.md](specs/23-definition-of-done.md)
- Tipo de entrega esperada
	- Atualizacao objetiva de specs, sem mudanca funcional.
