# DCA Groups Spec

## Objetivo
Documentar o comportamento esperado de DCA Groups antes de qualquer refatoracao funcional.

## Escopo
- Enable/disable de DCA
- Fader de DCA
- Membros de DCA
- Normalizacao com stereo link
- Sync de leitura e escrita

## Estado atual observado
- DCA e controlado por configuracoes de protocolo em `protocol/duonn/groups.ts`.
- O estado em runtime vive em `App.tsx` e `lib/groupControls.ts`.
- AX16/AX24 usam 4 DCAs; AX32 usa 8.
- Alteracoes de membros passam por normalizacao para pares linked.

## Fontes atuais
- `App.tsx`: `syncAllGroupStates`, `handleDcaGroupToggleEnabled`, `handleDcaGroupFaderChange`, `handleDcaGroupMembersChange`, `handleDcaGroupClear`, `normalizeDcaMembersForLinkedChannels`.
- `protocol/duonn/groups.ts`: params, builders e perfil.
- `lib/groupControls.ts`: tipos, ranges, conversoes e defaults.
- `components/DcaGroupsView.tsx`: UI.

## Regras obrigatorias
- DCA so pode escrever via builders semanticos de grupo.
- Fader DCA deve respeitar range operacional atual da mesa.
- Selecao de membros deve considerar stereo link antes do envio.
- Nao hardcodar contagem de DCA fora da resolucao por profile.

## Comportamento esperado

### Enable/disable
- Toggle deve refletir estado otimista local.
- Mesa continua sendo fonte final da verdade apos sync.

### Fader
- Mudanca deve usar scheduler de write para evitar burst desnecessario.
- UI deve refletir posicao imediatamente.

### Membros
- Lista de membros deve ser validada contra membros mapeados para o profile ativo.
- Em pares linked, selecao parcial deve ser normalizada segundo a regra central atual.

### Clear
- Clear remove todos os membros do grupo sem efeitos colaterais em outros grupos.

## Integracao com stereo link
- Se canais linked pertencerem ao universo de membros selecionaveis, a normalizacao deve tratar o par como unidade quando aplicavel.
- DCA nao deve duplicar logica de link fora do normalizador central.

## Sync
- Sync de DCA ocorre dentro de `syncAllGroupStates`.
- Leituras devem cobrir on/off, fader e bitmask de membros.
- Falha total de cobertura de parametros DCA deve ser tratada como erro relevante de sync.

## Riscos principais
- Mapeamento incorreto de params por profile.
- Normalizacao errada de membros linked.
- Divergencia entre estado otimista e leitura real da mesa.

## Checklist minimo antes de alterar codigo
- Toggle enabled funcionando.
- Fader DCA atuando corretamente.
- Add/remove de membros funcionando.
- Pares linked normalizados corretamente.
- Coverage validada em AX16/AX24 e AX32.
