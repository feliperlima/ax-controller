# Mute Groups Spec

## Objetivo
Documentar o comportamento esperado de Mute Groups antes de qualquer refatoracao funcional.

## Escopo
- Ativar/desativar mute group
- Membros do grupo
- Aplicacao de mute gerenciado
- Normalizacao com channel/aux/master link
- Sync e convergencia

## Estado atual observado
- Mute Groups usam configuracao dedicada em `protocol/duonn/groups.ts`.
- Estado runtime e aplicacao funcional vivem em `App.tsx`.
- Existe assinatura para evitar reaplicar mutes gerenciados em loop.
- AX16/AX24 usam 4 grupos; AX32 usa 6.

## Fontes atuais
- `App.tsx`: `syncAllGroupStates`, `applyManagedMutes`, `handleMuteGroupToggleActive`, `handleMuteGroupMembersChange`, `handleMuteGroupClear`, `normalizeMuteGroupMembersForLinkedTargets`.
- `protocol/duonn/groups.ts`: params e builders.
- `lib/groupControls.ts`: universo de membros e aplicacao de mute.
- `components/MuteGroupsView.tsx`: UI.

## Regras obrigatorias
- Mute group so escreve via builders semanticos.
- Aplicacao de mute gerenciado deve ser idempotente no ciclo atual.
- Selecoes com targets linked devem ser normalizadas antes de persistir/escrever.
- Nao mutar membros fora do universo mapeado para o profile ativo.

## Comportamento esperado

### Ativo/inativo
- `active=true` significa que o grupo participa da aplicacao de mutes gerenciados.
- `active=false` remove sua influencia do estado agregado.

### Membros
- Membros podem incluir canais, AUX, FX e master conforme mapa disponivel.
- Selecoes parciais em pares linked devem ser normalizadas pela regra central atual.

### Aplicacao de mute gerenciado
- O resultado efetivo depende da uniao dos grupos ativos.
- O algoritmo nao deve entrar em loop de reescrita.
- Assinatura de estado atual deve bloquear reaplicacao redundante.

## Integracao com stereo link
- Channel links impactam normalizacao de `CH_n`.
- Aux links impactam normalizacao de `AUX_n`.
- Master linked impacta `MASTER_L`/`MASTER_R`.

## Sync
- Sync de mute groups e feito em conjunto com DCA em `syncAllGroupStates`.
- Leitura deve cobrir flag de ativo e palavras de membros.
- Aplicacao de mute gerenciado pode ser suprimida em boot sync/control flow especifico.

## Riscos principais
- Loop de mute gerenciado.
- Normalizacao incorreta com pares linked.
- Bitmask mapeada parcialmente em perfis legacy.

## Checklist minimo antes de alterar codigo
- Toggle active funcionando.
- Add/remove de membros funcionando.
- Aplicacao efetiva de mute gerenciado correta.
- Nenhum loop de reescrita.
- Master/aux linked tratados corretamente.
