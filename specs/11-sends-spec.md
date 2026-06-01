# Sends Spec

## Objetivo
Documentar o comportamento esperado da camada de sends no AX Control antes de qualquer refatoracao funcional.

## Escopo
- Sends de canal para AUX
- Sends de canal para FX
- Bus input sends em views de AUX e FX
- Toggle de tap point pre/post
- Reconciliacao com link stereo
- Reconciliacao entre estado otimista e leitura real da mesa

## Fora de escopo
- Refatoracao de UI
- Refatoracao do protocolo base
- Mudancas de parser global
- Mudancas no transporte WebSocket

## Estado atual observado
- O estado de sends esta fortemente centralizado em App.tsx.
- Existem dois fluxos principais:
  - sends por canal, exibidos no processor/detail view
  - bus input sends, exibidos nas views auxSends e fxSends
- Escritas usam throttling e agendamento para evitar burst excessivo.
- Toggle de tap point faz releitura curta depois da escrita para convergencia.
- Regras de link stereo influenciam o fanout de writes.

## Fontes atuais de implementacao
- App.tsx
  - syncChannelSendsState
  - syncBusInputSendsState
  - syncVisibleSendsState
  - handleSendValueChange
  - handleSendTapPointToggle
  - handleBusInputSendValueChange
  - handleBusInputSendTapPointToggle
  - resolveLinkedSendWrites
  - scheduleSendParamWrite
- components/ChannelProcessors.tsx
  - renderizacao e interacao de sends na UI
- lib/axios16Client.ts
  - envio de parametros para mesa
  - funcoes auxiliares de encode/decode ligadas ao protocolo de sends

## Conceitos canonicos

### Send source
- Canal de entrada de origem

### Send target
- AUX N
- FX N

### Send value
- Valor numerico operacional usado pela app para representar nivel de envio
- Deve ser validado e clampado antes de virar payload

### Tap point
- pre
- post

## Regras obrigatorias
- UI React nao envia payload direto para WebSocket.
- Toda escrita de send passa por camada semantica.
- Toda escrita de send deve respeitar profile ativo.
- Toda escrita deve ser reconciliada com leitura da mesa em pontos criticos.
- Nenhuma mudanca de send pode ignorar link stereo ativo.

## Fluxos funcionais

### 1. Send por canal
- Usuario abre detail view de canal e modulo de sends.
- App carrega sends ativos para aquele canal.
- Usuario muda valor de AUX ou FX.
- Estado otimista atualiza imediatamente a UI.
- Escrita real e agendada via throttle.
- Se houver link aplicavel, write fanout deve ser resolvido antes do envio.

### 2. Toggle de tap point por canal
- Usuario alterna pre/post.
- UI reflete estado otimista imediatamente.
- App envia valor codificado correspondente.
- App faz releitura curta para evitar drift entre UI e mesa.

### 3. Bus input sends
- Usuario entra em auxSends ou fxSends.
- App mostra contribuicao de cada canal para o bus alvo.
- Alteracoes seguem a mesma regra de estado otimista + throttle + reconciliacao.

## Integracao com stereo link

### Link de canal
- Se dois canais estiverem linked, writes de send podem precisar ser espelhadas para o par.

### Link de AUX
- Se o bus AUX alvo estiver linked, fanout precisa considerar odd/even conforme regra atual da mesa.

### Matriz canal linked + AUX linked
- Este e o caso de maior risco.
- A regra atual observada no codigo e escrita cruzada controlada pelo resolvedor de writes.
- Qualquer refatoracao deve preservar exatamente esse comportamento ate existir validacao de hardware em sentido contrario.

## Reconciliacao de estado

### Estado otimista
- Permitido para responsividade.
- Nao e fonte final da verdade.

### Estado confirmado
- Leitura da mesa prevalece em caso de divergencia.

### Releitura obrigatoria
- Toggle de tap point exige releitura curta apos escrita.
- Em casos de link ou drift observado, pode haver releitura adicional do slice afetado.

## Regras de seguranca
- Nunca disparar escrita automatica de send durante boot sync sem autorizacao explicita.
- Nao sobrescrever estado recente da mesa com cache local antigo.
- Nao assumir que canal linked implica sempre mesmo write pattern em todos os targets sem passar pelo resolvedor central.

## Diferencas por profile

### AX16 e AX24
- Compartilham perfil ax16_24.
- Quantidade de AUX e FX menor que AX32.

### AX32
- Mais buses e mais pontos de interacao.
- Toda regra de range, loop e fanout deve considerar capabilities do AX32.

## Riscos principais
- Drift entre UI e mesa apos toggle de tap point.
- Fanout incorreto em combinacao de channel link com aux link.
- Regressao entre AX16/AX24 e AX32 por diferenca de contagem.
- Burst de escrita sem throttle adequado.

## Requisitos para futura refatoracao
- Extrair resolvedor semantico unico de send writes.
- Separar estado de sends do App.tsx em modulo dedicado.
- Definir contrato explicito de encode/decode de send raw value.
- Cobrir cenarios de link com checklist manual dedicado.

## Checklist minimo antes de alterar codigo
- Confirmar send channel para AUX funcionando.
- Confirmar send channel para FX funcionando.
- Confirmar toggle pre/post com releitura coerente.
- Confirmar aux linked + channel linked sem regressao.
- Confirmar comportamento nos modelos alvo.
