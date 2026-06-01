# Specs Index (operacional)

## Objetivo
Indice operacional da pasta `/specs` para classificar tarefas, ler specs corretas e executar com seguranca.

## Organizacao da numeracao
- `00-07`: fundacao do projeto
- `08`: regras de agentes
- `09`: roadmap de refatoracao
- `10`: checklist de validacao manual
- `11-20`: specs especificas de features, contratos e comportamentos criticos
- `21-23`: governanca operacional, workflow, Git safety e definition of done

## Leitura obrigatoria antes de qualquer tarefa
- [00-product-vision.md](specs/00-product-vision.md)
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [22-branching-and-git-safety.md](specs/22-branching-and-git-safety.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)

## Leitura por tipo de trabalho

### UI
- [00-product-vision.md](specs/00-product-vision.md)
- [06-feature-inventory.md](specs/06-feature-inventory.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)
- Spec especifica da feature, se existir

### Sync/Protocol
- [03-protocol-contract.md](specs/03-protocol-contract.md)
- [04-device-profiles.md](specs/04-device-profiles.md)
- [05-sync-engine.md](specs/05-sync-engine.md)
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [10-manual-validation-checklist.md](specs/10-manual-validation-checklist.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)

### Profiles/Mappings
- [04-device-profiles.md](specs/04-device-profiles.md)
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [20-profile-detection-spec.md](specs/20-profile-detection-spec.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)

### Sends/Stereo Link
- [11-sends-spec.md](specs/11-sends-spec.md)
- [12-stereo-link-spec.md](specs/12-stereo-link-spec.md)
- [13-sends-link-sync-contract.md](specs/13-sends-link-sync-contract.md)

### DCA/Mute Groups
- [14-dca-groups-spec.md](specs/14-dca-groups-spec.md)
- [15-mute-groups-spec.md](specs/15-mute-groups-spec.md)

### Licensing/Trial
- [16-licensing-trial-spec.md](specs/16-licensing-trial-spec.md)

### Scenes
- [17-scenes-spec.md](specs/17-scenes-spec.md)

### FX
- [18-fx-spec.md](specs/18-fx-spec.md)

### Custom Views
- [19-custom-views-spec.md](specs/19-custom-views-spec.md)

### Profile Detection
- [20-profile-detection-spec.md](specs/20-profile-detection-spec.md)

### Antes de refatorar
- [02-target-architecture.md](specs/02-target-architecture.md)
- [07-risk-map.md](specs/07-risk-map.md)
- [08-agent-rules.md](specs/08-agent-rules.md)
- [09-refactor-roadmap.md](specs/09-refactor-roadmap.md)
- [21-workflow-by-change-type.md](specs/21-workflow-by-change-type.md)
- [22-branching-and-git-safety.md](specs/22-branching-and-git-safety.md)
- [23-definition-of-done.md](specs/23-definition-of-done.md)

## Fluxo recomendado
1. Classificar tarefa.
2. Ler specs relevantes.
3. Listar arquivos provaveis.
4. Declarar riscos.
5. Implementar somente o escopo.
6. Validar manualmente.
7. Atualizar specs se descobrir algo novo.
8. Entregar resumo final.

## Regra operacional
- Regra obrigatoria: se mudanca critica nao tiver spec suficiente, atualizar/criar spec antes da alteracao funcional.
- Recomendacao futura: manter uma matriz simples de rastreabilidade tarefa -> spec no topo de PRs grandes.
