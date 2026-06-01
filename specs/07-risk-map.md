# Risk Map

## Arquivos de alto risco
- `apps/desktop/src/App.tsx`
  - Motivo: concentracao de estado global, sync, link logic, sends, groups, scenes, licensing.
- `apps/desktop/src/lib/axios16Client.ts`
  - Motivo: transporte WS, encode/decode, mapa de parametros, comandos.
- `apps/desktop/src/protocol/duonn/groups.ts`
  - Motivo: mapeamento de params DCA/Mute por profile.
- `apps/desktop/src/protocol/duonn/bitmask.ts`
  - Motivo: mapeamento de bits com partes provisoria/derivada.
- `apps/desktop/src/lib/licenseState.ts` e `apps/desktop/src/lib/licenseEngine.ts`
  - Motivo: regras de bloqueio, cache de trial/licenca e decisao de boot.
- `apps/desktop/src/services/duonn/scenesService.ts` e `apps/desktop/src/protocol/duonn/scenes.ts`
  - Motivo: acoes de cena + lacunas TODO de protocolo.

## Funcoes de alto risco
- `connectToMixer` (boot + validacao + sync inicial).
- `syncAllChannels` e cadeia `sync*` associada.
- `syncLinkStates`, `syncChannelPairContext`, `syncChannelPairVisualState`.
- `resolveLinkedSendWrites`, `handleSendValueChange`, `handleBusInputSendTapPointToggle`.
- `syncAllGroupStates`, `applyManagedMutes`.
- `sendParam`/`readParams`/decoders em `Axios16Client`.

## Pontos que nao devem ser refatorados sem teste
- Qualquer logica de perfil/param map em `axios16Client`.
- Qualquer logica de link stereo e fanout de sends.
- Fluxo de boot sync e reconnect.
- Aplicacao de mutes gerenciados por grupos.
- Regras de licenca/trial e bloqueio de conexao.

## Riscos especificos por tema

### Risco de quebrar AX16/AX24/AX32
- Misturar ranges ou counts entre perfis.
- Reuso indevido de mapa AX16/24 em AX32.
- Hardcode de capacidades em feature generica.

### Risco de quebrar sync inicial
- Enviar writes antes de leitura minima.
- Ordem de sync incorreta (links/sends/grupos fora de sequencia).
- Falha parcial sem fallback de estado.

### Risco de quebrar sends/stereo link
- Fanout incorreto em pares linked.
- Tap point alternado sem reconciliacao.
- Condicoes de corrida entre escrita otimista e releitura.

### Risco de quebrar licenca/trial
- Interpretacao incorreta de cache/expiry/revalidation.
- Fluxo de conexao sem gate de licenca.
- Inconsistencia entre estado de UI e decisao de boot.

## Recomendacoes de protecao
- Criar testes manuais obrigatorios por area critica antes/depois de mudanca.
- Introduzir guardrails por profile e asserts de range.
- Adicionar logs estruturados para transicoes de sync/licensa/link.
- Alterar uma area critica por vez, com rollback simples.
- Atualizar specs antes de tocar no codigo critico.
