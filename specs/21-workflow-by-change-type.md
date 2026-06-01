# Workflow By Change Type (obrigatorio)

## Regra mestra
- Regra obrigatoria: todo trabalho deve classificar o tipo da tarefa antes de alterar arquivos.
- Regra obrigatoria: se o tipo estiver incerto, iniciar como `investigation-only`.

## Tipos de tarefa

### docs-only
1. Quando usar
- Criacao ou ajuste de specs, guias, checklist e docs sem mudanca funcional.
2. Specs obrigatorias para ler antes
- [08-agent-rules.md](specs/08-agent-rules.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
3. O que e permitido alterar
- Somente arquivos de documentacao.
4. O que e proibido alterar
- Codigo fonte, UI funcional, protocolo, sync, parser, profiles, mappings, persistencia, licensing.
5. Validacao obrigatoria
- Confirmar que apenas docs foram alteradas e que nao houve mudanca funcional.
6. Quando o agente deve parar e pedir confirmacao
- Se houver necessidade de tocar qualquer arquivo fora de docs.

### investigation-only
1. Quando usar
- Descoberta tecnica, leitura de codigo/specs, levantamento de risco e escopo.
2. Specs obrigatorias para ler antes
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
3. O que e permitido alterar
- Nenhum arquivo.
4. O que e proibido alterar
- Qualquer arquivo do repositorio.
5. Validacao obrigatoria
- Entregar analise com riscos, opcoes e proximo passo recomendado.
6. Quando o agente deve parar e pedir confirmacao
- Sempre antes de iniciar implementacao.

### ui-only
1. Quando usar
- Ajustes de interface, layout, navegacao visual e componentes de apresentacao.
2. Specs obrigatorias para ler antes
- [00-product-vision.md](specs/00-product-vision.md)
- [06-feature-inventory.md](specs/06-feature-inventory.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- Spec da feature alvo, se existir.
3. O que e permitido alterar
- Componentes visuais, estilos, estrutura de tela e wiring de UI para estado existente.
4. O que e proibido alterar
- WebSocket, parser, sync engine, profiles, mappings, sender de comandos e logica de protocolo.
5. Validacao obrigatoria
- Render correto, viewport alvo preservado e handlers existentes funcionais.
6. Quando o agente deve parar e pedir confirmacao
- Se a mudanca exigir tocar protocolo/sync ou criar estado paralelo de mixer.

### protocol-sync
1. Quando usar
- Ajustes de contrato TX/RX, boot sync, reconnect e reconciliacao de estado da mesa.
2. Specs obrigatorias para ler antes
- [03-protocol-contract.md](specs/03-protocol-contract.md)
- [04-device-profiles.md](specs/04-device-profiles.md)
- [05-sync-engine.md](specs/05-sync-engine.md)
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- Se envolver sends/stereo link: [11-sends-spec.md](specs/11-sends-spec.md), [12-stereo-link-spec.md](specs/12-stereo-link-spec.md), [13-sends-link-sync-contract.md](specs/13-sends-link-sync-contract.md)
- Se envolver DCA/Mute Groups: [14-dca-groups-spec.md](specs/14-dca-groups-spec.md), [15-mute-groups-spec.md](specs/15-mute-groups-spec.md)
- Se envolver scenes: [17-scenes-spec.md](specs/17-scenes-spec.md)
- Se envolver FX: [18-fx-spec.md](specs/18-fx-spec.md)
3. O que e permitido alterar
- Camadas de protocolo/sync estritamente dentro do escopo aprovado.
4. O que e proibido alterar
- UI, CSS, layout, licensing e features nao relacionadas.
5. Validacao obrigatoria
- Boot sync, reconnect, TX/RX e unknown params validados com checklist manual.
6. Quando o agente deve parar e pedir confirmacao
- Se houver impacto cruzado em UI/licensing ou mudanca fora do contrato aprovado.

### profile-mapping
1. Quando usar
- Ajuste de capabilities, counts, ranges e mappings por modelo.
2. Specs obrigatorias para ler antes
- [04-device-profiles.md](specs/04-device-profiles.md)
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [20-profile-detection-spec.md](specs/20-profile-detection-spec.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
3. O que e permitido alterar
- Somente pontos de profile/mapping justificados por evidencia.
4. O que e proibido alterar
- Suposicao sem evidencia real, alteracoes amplas de feature/UI/licensing.
5. Validacao obrigatoria
- Evidencia documentada (captura, doc oficial, trace ou spec previa) e impacto por AX16/AX24/AX32.
6. Quando o agente deve parar e pedir confirmacao
- Se nao houver evidencia suficiente antes da alteracao.

### feature
1. Quando usar
- Implementacao de comportamento funcional novo ou extensao funcional.
2. Specs obrigatorias para ler antes
- [08-agent-rules.md](specs/08-agent-rules.md)
- [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- Spec especifica da feature (11-20, conforme tema).
3. O que e permitido alterar
- Somente arquivos necessarios para cumprir a spec da feature.
4. O que e proibido alterar
- Refactor amplo junto com feature sem aprovacao.
5. Validacao obrigatoria
- Criterios de aceite da spec da feature + checklist manual relevante.
6. Quando o agente deve parar e pedir confirmacao
- Se a spec estiver incompleta, ambigua ou ausente.

### refactor
1. Quando usar
- Melhoria estrutural sem mudanca de comportamento funcional.
2. Specs obrigatorias para ler antes
- [02-target-architecture.md](specs/02-target-architecture.md)
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [09-refactor-roadmap.md](specs/09-refactor-roadmap.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
3. O que e permitido alterar
- Estrutura interna, organizacao e modularizacao com equivalencia funcional.
4. O que e proibido alterar
- Regras de negocio, comportamento de runtime e escopo de feature.
5. Validacao obrigatoria
- Prova de equivalencia antes/depois e roteiro de rollback.
6. Quando o agente deve parar e pedir confirmacao
- Se surgir necessidade de alterar comportamento funcional.

### licensing
1. Quando usar
- Mudancas estritamente relacionadas a fluxo de licenca/trial/purchased.
2. Specs obrigatorias para ler antes
- [08-agent-rules.md](specs/08-agent-rules.md)
- [16-licensing-trial-spec.md](specs/16-licensing-trial-spec.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
3. O que e permitido alterar
- Apenas comportamento de licensing explicitamente no escopo.
4. O que e proibido alterar
- Alterar licensing dentro de tarefas nao relacionadas.
5. Validacao obrigatoria
- Estado formal normalizado coerente com gate de conexao e UX.
6. Quando o agente deve parar e pedir confirmacao
- Se houver impacto em protocolo/sync/feature alem do escopo de licensing.

### persistence
1. Quando usar
- Mudancas de persistencia local, cache ou recuperacao de estado nao critico.
2. Specs obrigatorias para ler antes
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- Spec de dominio relacionada (ex.: scenes, custom views).
3. O que e permitido alterar
- Camadas de persistencia no escopo aprovado.
4. O que e proibido alterar
- Comportamento de mixer, protocolo ou licensing sem spec especifica.
5. Validacao obrigatoria
- Integridade de leitura/escrita e fallback sem sobrescrever estado de mesa indevidamente.
6. Quando o agente deve parar e pedir confirmacao
- Se a persistencia passar a influenciar comportamento funcional fora do escopo.

### test-only
1. Quando usar
- Inclusao/ajuste de testes, checklists de regressao e validacao.
2. Specs obrigatorias para ler antes
- [08-agent-rules.md](specs/08-agent-rules.md)
- [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
3. O que e permitido alterar
- Arquivos de teste e infraestrutura de validacao.
4. O que e proibido alterar
- Comportamento de producao, salvo ajuste minimo explicitamente justificado.
5. Validacao obrigatoria
- Evidencia de cobertura do comportamento alvo e ausencia de side effects.
6. Quando o agente deve parar e pedir confirmacao
- Se for necessario alterar codigo de producao alem do minimo justificado.

## Regras por dominio (leitura obrigatoria)
- Sends/stereo link: [11-sends-spec.md](specs/11-sends-spec.md), [12-stereo-link-spec.md](specs/12-stereo-link-spec.md), [13-sends-link-sync-contract.md](specs/13-sends-link-sync-contract.md)
- DCA/Mute Groups: [14-dca-groups-spec.md](specs/14-dca-groups-spec.md), [15-mute-groups-spec.md](specs/15-mute-groups-spec.md)
- Licensing: [16-licensing-trial-spec.md](specs/16-licensing-trial-spec.md)
- Scenes: [17-scenes-spec.md](specs/17-scenes-spec.md)
- FX: [18-fx-spec.md](specs/18-fx-spec.md)
- Custom Views: [19-custom-views-spec.md](specs/19-custom-views-spec.md)
- Profile Detection: [20-profile-detection-spec.md](specs/20-profile-detection-spec.md)