# Semantic Full Coverage Rollout Plan

Task type:
docs-only

Agent role:
Docs/SDD Agent + Architect Agent + QA/Reviewer Agent

## Purpose
Definir o rollout completo da camada semantica interna para todas as funcionalidades relevantes, sem perder controle de risco.

## Guiding rule
Migrar incrementalmente, com piloto unico por vez, fallback imediato e validacao manual obrigatoria.

## Phase map after setChannelFader pilot

### Phase 4B - low/medium risk controls
- CH/AUX/FX/MASTER: mute, name, color
- CH: phantom
- Objetivo: aumentar cobertura sem tocar logicas complexas de fanout.

### Phase 4C - processing controls (medium)
- CH/AUX/MASTER: comp enable + parametros
- CH/FX/MASTER: eq enable + bandas
- CH: gate
- Objetivo: validar comandos com ranges e conversoes sem tocar link/sends.

### Phase 4D - sends and link (high)
- Sends level + tap point
- Channel/Aux/Master link
- Objetivo: migrar fanout semantic com protecao de sync e reconciliacao.

### Phase 4E - groups/scenes/presets (high)
- DCA/mute groups
- Scenes recall/save/rename
- FX preset + controls
- Objetivo: migrar comandos de estado agregado com pos-sync garantido.

### Phase 4F - patching/routing (very high)
- USB input/return patching
- AX32 output patching
- Objetivo: migrar comandos de maior impacto e maior risco de regressao.

## Cross-cutting constraints
- Nao alterar parser/protocolo wire.
- Nao alterar mapping tables sem spec dedicada.
- Nao acoplar semantic layer ao layout de UI.
- Nao introduzir writes automaticos durante boot sync.

## Validation gates per rollout step
1. Typecheck sem erro.
2. Zero regressao funcional no dominio do passo.
3. Reconciliacao otimista vs RX real confirmada.
4. Rollback por flag ou caminho legado comprovado.
5. Validacao manual em mesa real (quando hardware disponivel).

## Hardware limitation policy
- Se um profile nao estiver disponivel fisicamente, registrar confianca condicional baseada em:
  - profile resolver
  - path de params existente
  - typecheck e verificacoes estaticas
- Fechamento formal multi-profile ocorre quando houver validacao real.

## Stop condition
Pausar e pedir confirmacao ao final de cada subfase antes de expandir para o proximo lote de comandos.