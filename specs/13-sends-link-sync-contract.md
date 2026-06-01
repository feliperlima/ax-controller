# Sends + Stereo Link Sync Contract

## Objetivo
Definir o contrato de sincronizacao entre sends, stereo link e estado remoto da mesa.

## Escopo
- Ordem de sync entre link e sends
- Regras de leitura remota
- Regras de escrita otimista
- Reconciliacao e convergencia
- Protecao contra condicoes de corrida

## Fora de escopo
- Mudanca de UI
- Refatoracao de parser global
- Mudanca no transporte WebSocket

## Problema central
Sends e stereo link nao sao areas independentes.
O valor final que a mesa deve receber depende de:
- canal de origem
- bus de destino
- estado de link do canal
- estado de link do AUX
- tap point atual
- profile ativo

Por isso, qualquer sync ou write nessa area precisa respeitar uma ordem e um resolvedor central.

## Princípios obrigatórios
- Link state deve ser conhecido antes de interpretar ou escrever sends dependentes de pares.
- Releitura remota da mesa prevalece sobre estado otimista em caso de divergencia.
- Escritas locais devem ser rastreadas por janela curta apenas para evitar eco falso, nao para mascarar divergencia real.
- O resolvedor central de writes deve ser a unica fonte para expandir send writes em cenarios linked.

## Ordem canônica de sincronização

### Boot sync
1. Conectar socket e resolver profile.
2. Ler estado base de canais/aux/master necessario para contexto.
3. Ler link state.
4. Ler sends.
5. Aplicar reconciliacao final na UI.

### Sync incremental
1. Se link state mudou, atualizar link state primeiro.
2. Recalcular alvos linked.
3. Ler ou revalidar sends dependentes desse contexto.

## Contrato de leitura

### syncLinkStates
- Deve atualizar a fonte canonica de link state.
- Nao deve depender de estado anterior da UI para concluir verdade remota.

### syncChannelSendsState
- Deve ler sends do canal considerando o contexto linked atual.
- Se o canal estiver linked, a leitura de referencia deve seguir a regra canonica ja adotada pela implementacao atual.
- Se AUX linked afetar representacao visual, a UI deve ser derivada a partir do link state ja resolvido.

### syncBusInputSendsState
- Deve ler contribuicoes de canais para um bus alvo.
- A interpretacao visual posterior precisa respeitar channel links e aux links ja conhecidos.

## Contrato de escrita

### Escrita otimista
- Pode atualizar UI imediatamente.
- Deve ser limitada ao slice afetado.
- Nao deve assumir sucesso final sem reconciliacao.

### Escrita real
- Deve passar por throttle/agendamento quando area for de alta frequencia.
- Deve usar o resolvedor central para expandir writes quando houver link.

### Toggle de tap point
- Sempre exige releitura curta pos-escrita.
- Divergencia entre UI e mesa apos releitura deve favorecer a mesa.

## Regras de reconciliacao

### Caso 1: estado remoto igual ao otimista
- Consolidar e limpar tracking local.

### Caso 2: estado remoto diferente do otimista
- Aplicar estado remoto.
- Limpar tracking local.
- Nao insistir reenviando automaticamente sem decisao explicita de camada superior.

### Caso 3: link mudou entre escrita e releitura
- Recalcular targets com o novo link state.
- Reaplicar representacao de UI a partir da mesa.
- Nao reaproveitar matriz de fanout calculada antes da mudanca de link.

## Condições de corrida que precisam ser protegidas
- Mudanca de link durante drag de send.
- Toggle de tap point durante sync parcial.
- Reconnect no meio de write throttled.
- Sync remoto chegando durante transition lock de link.

## Guardrails obrigatórios
- Cancelar writes agendadas obsoletas em disconnect/reconnect.
- Nao aplicar leitura remota intermediaria se ela estiver claramente dentro de janela de transicao protegida e sem confirmar novo estado final.
- Toda reconciliacao deve passar por timestamp/ordem local minima quando existir tracking disponivel.

## Diferenças por profile

### AX16 / AX24
- Maior dependencia de inferencia de link.
- Sync de sends deve ser mais conservador quando a evidencia de link for fraca.

### AX32
- Com link mask dedicado, o estado linked deve ser resolvido de forma mais objetiva antes da leitura/escrita de sends.

## Anti-patterns proibidos
- Componente React calculando sozinho fanout de send.
- Sync de sends rodando sem conhecer link state atual.
- Persistir valor otimista como se fosse verdade confirmada da mesa.
- Reescrever estado de send por heuristica sem releitura remota em acao critica.

## Resultado esperado
- UI responsiva.
- Mesa como fonte final da verdade.
- Baixo drift visual.
- Mesmo comportamento funcional entre profiles, respeitando limites de cada modelo.

## Pré-requisitos antes de refatorar
- Spec de sends aprovada.
- Spec de stereo link aprovada.
- Checklist manual minimo definido.
- Mapeamento de pontos de corrida conhecido.
