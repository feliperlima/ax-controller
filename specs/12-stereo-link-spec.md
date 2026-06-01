# Stereo Link Spec

## Objetivo
Documentar o comportamento esperado de stereo link no AX Control antes de qualquer refatoracao funcional.

## Escopo
- Link de canais de entrada
- Link de AUX
- Link de master
- Efeitos de link sobre UI, sends, grupos e sync
- Protecoes contra transicoes instaveis

## Fora de escopo
- Refatoracao do protocolo base
- Redesign visual de strips
- Mudancas de parser global

## Estado atual observado
- A logica de stereo link esta concentrada principalmente em `App.tsx`.
- O estado atual usa mapas de pares linked e locks temporarios de transicao.
- Ha diferenca de estrategia entre AX16/AX24 e AX32:
  - AX32 usa leitura explicita de link mask dedicada.
  - AX16/AX24 dependem mais de inferencia por evidencias de espelhamento/pan.

## Fontes atuais de implementacao
- `App.tsx`
  - `getChannelPair`
  - `getAuxPair`
  - `pairKey`
  - `syncChannelPairContext`
  - `syncChannelPairVisualState`
  - `syncLinkStates`
  - `applyLinkStateFromRead`
  - `applyLinkStateFrom3056`
  - `getLinkedChannelTargets`
  - `getLinkedAuxTargets`
  - `resolveLinkedSendWrites`
  - locks de transicao de channel/aux/master

## Conceitos canonicos

### Channel pair
- Par logico impar/par: 1-2, 3-4, 5-6, etc.

### Aux pair
- Par logico impar/par de AUX.

### Master link
- Relacao entre os lados left/right do master.

### Link state
- Estado booleano de associacao entre membros de um par.

### Transition lock
- Janela curta para impedir que leitura remota intermediaria sobrescreva transicao local recem iniciada.

## Regras obrigatorias
- Nenhuma feature pode assumir link por heuristica fora da camada central de link.
- Toda feature dependente de link deve consultar resolvedor central.
- Writes que dependem de link nao podem duplicar logica de fanout em varios lugares.
- AX16/AX24 e AX32 devem continuar com comportamento equivalente no nivel funcional, respeitando diferencas de implementacao.

## Comportamento esperado por area

### 1. Link de canais
- Quando um par de canais esta linked:
  - UI deve refletir o estado visual de link.
  - Cores e alguns estados visuais podem ser espelhados conforme regra atual observada.
  - Operacoes dependentes de link devem tratar o par como unidade quando exigido.

### 2. Link de AUX
- Quando um par de AUX esta linked:
  - Views e sends que apontam para esses buses devem respeitar o par.
  - Writes para sends devem usar resolucao central para odd/even.

### 3. Link master
- Master linked implica tratamento coordenado entre left e right.
- Features de grupos que envolvem master devem considerar par completo quando aplicavel.

## Diferencas entre perfis

### AX32
- Usa mascara de link dedicada.
- Leitura do estado linked deve priorizar param dedicado quando disponivel.

### AX16/AX24
- Link e inferido a partir de evidencias observadas na mesa.
- A inferencia atual depende de assinatura de pan e espelhamento de controles.
- Essa heuristica nao deve ser alterada sem validacao de hardware.

## Integracao com sends
- Sends sao a principal area impactada por link.
- Se canal e bus estiverem linked ao mesmo tempo, o resolvedor central deve determinar a matriz final de writes.
- Nenhum componente de sends deve implementar sua propria regra de espelhamento.

## Integracao com grupos
- DCA e Mute Groups precisam normalizar membros quando targets linked entram em jogo.
- Selecionar apenas um lado de um par linked pode exigir ajuste automatico para manter consistencia.

## Integracao com sync
- Sync de link deve ocorrer cedo o suficiente para que sends e grupos usem estado correto.
- Sync parcial nao deve limpar link state valido sem evidencia remota forte.

## Riscos principais
- AX16/AX24: heuristica fraca ou alterada causar falso positivo/falso negativo de link.
- AX32: leitura incorreta de bitmask de link.
- Drift entre estado visual e estado funcional.
- Fanout incorreto em sends ou grupos.
- Corrida entre transicao local e releitura remota.

## Protecoes obrigatorias
- Manter transition locks durante mudancas locais de link.
- Centralizar interpretacao de link state.
- Reconciliar sempre contra estado da mesa em pontos criticos.
- Nao permitir que features derivadas sobrescrevam link state diretamente sem passar pela camada central.

## Requisitos para futura refatoracao
- Extrair modulo dedicado de link state.
- Padronizar API de leitura de targets linked.
- Isolar heuristicas AX16/24 de inferencia em modulo proprio.
- Separar efeitos visuais de efeitos funcionais.

## Checklist minimo antes de alterar codigo
- Confirmar link/unlink de canal sem regressao.
- Confirmar link/unlink de AUX sem regressao.
- Confirmar link master sem drift.
- Confirmar sends com pares linked.
- Confirmar DCA/Mute Groups com targets linked.
