# Refactor Roadmap (incremental e seguro)

## Fase 1 - Documentacao SDD
- Objetivo: consolidar contexto tecnico e regras de mudanca.
- Escopo: arquivos `00..09` em `/specs`.
- Fora de escopo: qualquer alteracao funcional.
- Riscos: lacunas de mapeamento inicial.
- Criterio para avancar: specs base aprovadas e versionadas.

## Fase 2 - Checklists e testes manuais
- Objetivo: criar baseline de regressao manual.
- Escopo: roteiros para conexao, sync, sends, link, FX, grupos, scenes e licenca.
- Fora de escopo: refatorar implementacao.
- Riscos: cobertura incompleta de edge cases.
- Criterio para avancar: checklist executavel e reproduzivel em AX16/AX24/AX32.

## Fase 3 - Isolar profiles
- Objetivo: separar capabilities e maps por modelo.
- Escopo: camada `profiles` com API unica para counts/ranges/params.
- Fora de escopo: mudanca de UI.
- Riscos: regressao de enderecamento de parametro.
- Criterio para avancar: parity funcional validada nos 3 modelos.

## Fase 4 - Isolar protocol
- Objetivo: separar builders/parsers do transporte e da UI.
- Escopo: contratos TX/RX por opcode + catalogo de mensagens desconhecidas.
- Fora de escopo: redesign de fluxo de tela.
- Riscos: quebra de parse silenciosa.
- Criterio para avancar: decoders com validacao e logs claros.

## Fase 5 - Isolar sync
- Objetivo: criar sync engine com state machine explicita.
- Escopo: transicoes disconnected/connecting/bootSyncing/ready/reconnecting/degraded/error.
- Fora de escopo: mudancas visuais.
- Riscos: corridas entre writes otimistas e reads.
- Criterio para avancar: boot/reconnect estaveis e sem regressao comportamental.

## Fase 6 - Migrar features uma por vez
- Objetivo: reduzir risco por fatia funcional.
- Escopo: migracao incremental (channels -> sends -> groups -> scenes -> patching etc).
- Fora de escopo: big-bang rewrite.
- Riscos: estado duplicado temporario.
- Criterio para avancar: cada feature migrada com parity comprovada.

## Fase 7 - Organizar UI apos domain/protocol seguros
- Objetivo: desacoplar UI de regras de dominio/protocolo.
- Escopo: componentes consumindo casos de uso claros.
- Fora de escopo: alterar semantica de controle da mesa.
- Riscos: perda de responsividade/perf.
- Criterio para avancar: UI funcionalmente equivalente e mais simples de manter.

## Fase 8 - Specs especificas por tema critico
- Objetivo: detalhar contratos dedicados antes de mudancas maiores.
- Escopo: criar specs proprias para:
  - sends
  - stereo link
  - FX
  - DCA
  - mute groups
  - licensing
  - custom views
- Fora de escopo: implementacao completa no mesmo ciclo.
- Riscos: specs desalinhadas com firmware real.
- Criterio para avancar: cada tema com spec validada e checklist de teste aprovado.
