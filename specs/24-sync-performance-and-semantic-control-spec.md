# Sync Performance And Semantic Control Spec

## 1. Purpose
Definir uma camada semantica interna, inspirada em OSC, para organizar comandos, leitura e evolucao de features no AX Control com foco em performance, seguranca de sync e extensibilidade.

Premissa principal: OSC-inspired namespace, not OSC transport.

## 2. Background: OSC-inspired, not OSC-native
- A mesa DUONN Axios usa protocolo WebSocket com param/value proprietario.
- Esta spec propoe apenas um namespace semantico interno para o app.
- O transporte real da mesa continua WebSocket.

## 3. What this is not
- Nao e troca de protocolo da mesa.
- Nao e criacao de servidor OSC externo agora.
- Nao e adicao de UDP OSC agora.
- Nao e integracao TouchOSC/Companion/QLab agora.
- Nao e alteracao de mappings agora.
- Nao e refactor amplo agora.

## 4. Relationship with existing WebSocket protocol
- A camada semantica interna resolve comandos para param/value reais conforme profile ativo.
- O encoder/protocol atual continua sendo usado para TX.
- RX continua vindo do parser/protocolo atual.
- A camada semantica nao deve alterar contrato wire atual.

## 5. Internal Semantic Control Layer
- Objetivo: expor comandos internos legiveis e estaveis para features.
- Exemplo: `setChannelFader(channelId, value)` sem expor param raw para UI.
- A camada deve depender de:
  - profile resolver
  - parameter resolver
  - protocol encoder existente
- A camada nao substitui sync engine; ela organiza o caminho de comando e leitura semantica.

## 6. Future External OSC Bridge
- Recomendacao futura: considerar uma ponte externa no futuro, separada da camada interna.
- A ponte externa nao faz parte desta implementacao inicial.
- A camada interna deve ser desenhada para tornar essa ponte possivel depois, sem acoplamento antecipado.

## 7. Namespace rules
- Namespace raiz obrigatorio: `/ax`.
- Usar enderecos semanticos estaveis.
- Separar entidade, indice e propriedade.
- Evitar endereco acoplado ao layout de UI.
- Nao expor raw param/value na UI normal.
- Reservar `/ax/raw` somente para debug/internal.
- Usar valores normalizados na camada semantica.
- Resolver para raw param/value apenas na camada de profile/protocol.
- Nao permitir payload WebSocket direto de componentes React.
- Wildcard/pattern matching: apenas possibilidade futura.

## 8. Address naming conventions
- Formato recomendado: `/ax/{domain}/{id}/{property}`.
- Indices numericos em base 1 quando aplicavel.
- Nomes devem ser curtos, semanticos e previsiveis.
- Evitar abreviacoes ambiguas.
- Evitar expor suposicoes de profile no endereco.

Namespace sugerido para app:
- `/ax/app/connected`
- `/ax/app/profile`
- `/ax/app/sync/state`
- `/ax/app/sync/progress`

Namespace sugerido para mixer:
- `/ax/mixer/model`
- `/ax/mixer/name`
- `/ax/mixer/connected`

Namespace sugerido para channels:
- `/ax/ch/{n}/name`
- `/ax/ch/{n}/fader`
- `/ax/ch/{n}/mute`
- `/ax/ch/{n}/solo`
- `/ax/ch/{n}/pan`
- `/ax/ch/{n}/input`
- `/ax/ch/{n}/phantom`
- `/ax/ch/{n}/meter`

Namespace sugerido para channel processing:
- `/ax/ch/{n}/hpf/enabled`
- `/ax/ch/{n}/hpf/freq`
- `/ax/ch/{n}/gate/enabled`
- `/ax/ch/{n}/gate/threshold`
- `/ax/ch/{n}/gate/attack`
- `/ax/ch/{n}/gate/release`
- `/ax/ch/{n}/comp/enabled`
- `/ax/ch/{n}/comp/threshold`
- `/ax/ch/{n}/comp/ratio`
- `/ax/ch/{n}/comp/attack`
- `/ax/ch/{n}/comp/release`
- `/ax/ch/{n}/comp/gain`
- `/ax/ch/{n}/eq/enabled`
- `/ax/ch/{n}/eq/band/{b}/type`
- `/ax/ch/{n}/eq/band/{b}/freq`
- `/ax/ch/{n}/eq/band/{b}/gain`
- `/ax/ch/{n}/eq/band/{b}/q`

Namespace sugerido para sends:
- `/ax/ch/{n}/send/aux/{a}/level`
- `/ax/ch/{n}/send/aux/{a}/pan`
- `/ax/ch/{n}/send/aux/{a}/prepost`
- `/ax/ch/{n}/send/fx/{f}/level`

Namespace sugerido para auxes:
- `/ax/aux/{a}/name`
- `/ax/aux/{a}/fader`
- `/ax/aux/{a}/mute`
- `/ax/aux/{a}/solo`
- `/ax/aux/{a}/pan`
- `/ax/aux/{a}/meter`

Namespace sugerido para FX:
- `/ax/fx/{f}/preset`
- `/ax/fx/{f}/param/1`
- `/ax/fx/{f}/param/2`
- `/ax/fx/{f}/return/fader`
- `/ax/fx/{f}/return/mute`
- `/ax/fx/{f}/return/solo`

Namespace sugerido para DCA:
- `/ax/dca/{d}/name`
- `/ax/dca/{d}/fader`
- `/ax/dca/{d}/enabled`
- `/ax/dca/{d}/member/ch/{n}`

Namespace sugerido para Mute Groups:
- `/ax/mutegroup/{g}/active`
- `/ax/mutegroup/{g}/member/ch/{n}`
- `/ax/mutegroup/{g}/member/aux/{a}`
- `/ax/mutegroup/{g}/member/fx/{f}`
- `/ax/mutegroup/{g}/member/master/l`
- `/ax/mutegroup/{g}/member/master/r`

Namespace sugerido para Scenes:
- `/ax/scene/{s}/name`
- `/ax/scene/{s}/recall`
- `/ax/scene/{s}/save`
- `/ax/scene/{s}/export`
- `/ax/scene/{s}/import`

Namespace sugerido para Presets:
- `/ax/preset/ch/{n}/apply`
- `/ax/preset/ch/{n}/save`
- `/ax/preset/ch/{n}/name`

Namespace sugerido para RTA futuro:
- `/ax/rta/source`
- `/ax/rta/enabled`
- `/ax/rta/band/{b}/level`
- `/ax/rta/overlay/ch/{n}/enabled`
- `/ax/rta/overlay/master/enabled`

Namespace raw/debug internal only:
- `/ax/raw/param/{id}`

Regra obrigatoria de raw/debug:
- `/ax/raw` e somente debug e diagnostico interno.
- `/ax/raw` nao e para UI normal.
- `/ax/raw` nao e API publica futura por padrao.

## 9. Value normalization rules
Tipos recomendados:
- fader: float 0.0-1.0
- send level: float 0.0-1.0
- mute: boolean
- solo: boolean
- enabled: boolean
- pan: float -1.0-1.0
- frequency: float em Hz
- gain: float em dB
- q: float
- name: string
- preset: int ou string, dependendo do contexto
- meter: dBFS ou normalized, documentado por endpoint
- scene action: command/event
- membership: boolean ou explicit set/unset command

Regras obrigatorias:
- Normalizacao semantica deve ser estavel entre profiles.
- Conversao para raw ocorre somente em resolvers de profile/protocol.
- Qualquer endpoint de meter deve declarar unidade explicitamente.

## 10. RX lifecycle
Arquitetura conceitual:

WebSocket RX
-> parser
-> normalized param/value
-> param store
-> domain selectors
-> feature state
-> UI render

Regras:
- RX real da mesa e fonte final da verdade.
- Camada semantica nao deve mascarar RX real.
- Unknown/unsupported deve falhar de forma segura e logavel.

## 11. TX lifecycle
Arquitetura conceitual:

User action
-> semantic command
-> active device profile
-> parameter resolver
-> protocol encoder
-> WebSocket TX

Regras:
- Componentes React nao devem enviar payload raw direto.
- Comando semantico deve ser validado antes da resolucao.
- Sem profile confiavel, resolver nao deve enviar comando.

## 12. Semantic command examples
- `setChannelFader(channelId, value)`
- `setChannelMute(channelId, muted)`
- `setChannelPan(channelId, value)`
- `setAuxSend(sourceId, auxId, value)`
- `setLinkedStereoSend(sourcePair, auxPair, value)`
- `setFxParameter(fxId, parameterId, value)`
- `setDcaFader(dcaId, value)`
- `setMuteGroupActive(groupId, active)`
- `recallScene(sceneId)`
- `saveScene(sceneId)`

## 13. Profile resolver responsibilities
- Resolver profile ativo confiavel (AX16/AX24/AX32).
- Expor capabilities por dominio (counts, limits, features).
- Bloquear resolucao quando profile nao estiver confiavel.
- Nao assumir AX24/AX32 como AX16 sem evidencia.

## 14. Parameter resolver responsibilities
- Traduzir comando semantico para param/value raw por profile.
- Validar ranges e clamp conforme contrato atual.
- Retornar erro explicito quando parametro nao existir no profile.
- Nao modificar mapeamentos nesta fase; usar mapeamentos existentes.

## 15. Batching and command groups
- Permitir agrupamento interno de comandos quando seguro.
- Inspiracao em bundles OSC apenas no nivel interno.
- Regra: nao criar fila que introduza latencia perceptivel.
- Regra: comandos de alta frequencia (ex.: fader) devem priorizar baixa latencia.

## 16. Performance considerations
- Evitar render amplo a cada RX.
- Usar selectors por dominio/feature.
- Batching de RX quando seguro.
- Nao atrasar operacao de fader.
- Nao criar fila que adicione latencia perceptivel.
- Usar optimistic update para acoes do usuario.
- Reconciliar com RX real da mesa.
- Evitar writes duplicados.
- Preservar boot sync.
- Nao enviar nada automaticamente durante boot sync.
- Manter logs uteis para diagnostico.
- Medir antes de otimizar.

## 17. Sync safety rules
- Semantic layer nao deve escrever automaticamente durante boot sync.
- Semantic layer nao deve sobrescrever estado real mais recente da mesa.
- Semantic layer nao deve mascarar RX real.
- Semantic layer nao deve assumir profile errado.
- Semantic layer nao deve resolver comandos sem active profile confiavel.
- Semantic layer nao deve modificar mappings.
- Semantic layer deve falhar de forma segura quando parametro nao existir no profile.

## 18. Boot sync protections
- Sem comandos automaticos de escrita por default durante boot.
- Qualquer excecao futura deve ser explicitamente documentada e justificada.
- A ordem de sync existente deve ser preservada.
- Promocao para estado pronto nao deve depender de writes da semantic layer.

## 19. Error handling
- Erros de resolucao semantica devem ser explicitos e rastreaveis.
- Erros de profile invalido devem bloquear TX com mensagem clara.
- Falhas de parametro ausente devem degradar com seguranca, sem crash.
- Falhas transientes de leitura nao devem corromper estado confirmado.

## 20. Logging and debugging
- Logar caminho de decisao do comando: semantic -> profile -> param.
- Logar falhas de resolucao sem spam.
- Logar mismatch entre estado otimista e RX confirmado quando relevante.
- Garantir modo debug para investigar latencia e burst de comandos.

## 21. Raw/debug namespace
- Namespace interno: `/ax/raw/param/{id}`.
- Uso: diagnostico e suporte tecnico.
- Proibicao: UI normal nao deve depender de `/ax/raw`.
- Proibicao: `/ax/raw` nao deve ser contrato publico externo nesta fase.

## 22. Out of scope
- Implementacao imediata completa.
- Servidor OSC externo.
- UDP OSC.
- Integracao TouchOSC/Companion/QLab agora.
- Alteracao de protocolo da mesa.
- Alteracao de mappings.
- Refactor amplo.
- Mudanca visual de UI.
- Alteracao de sync real nesta task.
- Alteracao de parser nesta task.
- Alteracao de profiles nesta task.

## 23. Phased implementation plan
- Fase 1: criar spec e revisar arquitetura.
- Fase 2: adicionar diagnostico/logs/metricas sem mudar comportamento.
- Fase 3: criar tipos/interfaces da camada semantica sem conectar ao fluxo de producao.
- Fase 4: migrar uma acao de baixo risco, como `setChannelMute` ou `setChannelFader`.
- Fase 5: validar na mesa real.
- Fase 6: expandir para sends.
- Fase 7: expandir para stereo link.
- Fase 8: avaliar External OSC Bridge no futuro.

### Fase 4 (piloto recomendado) - setChannelFader
- Regra obrigatoria: iniciar com um unico comando piloto (`setChannelFader`) para reduzir superficie de risco.
- Regra obrigatoria: manter caminho de fallback para escrita atual durante validacao inicial.
- Regra obrigatoria: preservar throttle/RAF e fluxo otimista ja existentes.
- Regra obrigatoria: nao incluir sends, stereo link, groups, scenes ou patching neste piloto.
- Mitigacoes minimas:
  - validar equivalencia semantic -> raw em AX16, AX24 e AX32
  - medir latencia de resposta de fader antes/depois
  - validar reconciliação com RX real da mesa
  - validar que boot sync nao recebeu novos writes automaticos
  - rollback simples: desativar path semantic do comando piloto

### Fase 3 (escopo minimo) - definition of closure
- Regra obrigatoria: nao conectar a camada semantica ao fluxo de producao.
- Regra obrigatoria: nao alterar comportamento funcional.
- Regra obrigatoria: nao alterar protocolo, parser, sync engine, profile mapping, persistencia ou licensing.
- Entregaveis minimos esperados:
  - contrato de tipos para comando semantico interno
  - contrato de tipos para endereco semantico interno
  - interface de profile resolver para uso semantico
  - interface de parameter resolver para traducao semantica -> raw
  - erro tipado para comando nao suportado por profile
- Criterios de saida da Fase 3:
  - contratos compilam sem acoplamento de runtime
  - nenhum path de UI chama esses contratos em producao ainda
  - checklist de risco atualizado para Fase 4 (primeira migracao funcional)

## 24. Acceptance criteria
- Spec criada.
- Nenhum comportamento funcional alterado.
- Namespace `/ax` documentado.
- Valores normalizados definidos.
- Lifecycle RX/TX documentado.
- Responsabilidades de profile resolver e parameter resolver documentadas.
- Fases futuras definidas.
- Riscos documentados.
- Checklist manual criado.
- Fechamento minimo da Fase 3 documentado com entregaveis e criterios de saida.

## 25. Manual validation checklist
- Confirmar que nao houve alteracao funcional ao introduzir artefatos de spec.
- Confirmar mapeamento semantic command -> resolver -> protocol encoder para comando piloto.
- Confirmar que profile ativo e obrigatorio antes de resolver TX.
- Confirmar que semantic layer nao envia writes automaticos no boot sync.
- Confirmar latencia sem regressao perceptivel em comandos de fader.
- Confirmar reconciliacao otimista com RX real em caso de divergencia.
- Confirmar ausencia de writes duplicados em cenarios de slider/sends.
- Confirmar comportamento coerente em AX16, AX24 e AX32 para escopo migrado.
- Confirmar logging suficiente para diagnosticar falhas de resolucao.

## 26. Risks and mitigations
- Risco: acoplamento excessivo com App monolitico.
  - Mitigacao: migracao por casos pequenos e API semantica minima primeiro.
- Risco: regressao de latencia em controles continuos.
  - Mitigacao: preservar throttle/RAF existentes e medir antes/depois.
- Risco: divergencia cross-profile.
  - Mitigacao: resolver por profile ativo + validacao em mesa real por fase.
- Risco: mistura de escopo (sync, parser, UI) em um unico passo.
  - Mitigacao: fases curtas, com isolamento estrito por dominio.
- Risco: confusao entre namespace semantico e protocolo de transporte.
  - Mitigacao: reforcar regra: semantic namespace interno, transporte WebSocket atual.