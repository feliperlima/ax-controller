# Universal Raw Param Store And Selectors Spec

Task type:
protocol-sync + feature foundation

Agent role:
Protocol/Sync Agent + Architect Agent + QA/Reviewer Agent

## 1. Objetivo
Criar a fundacao de dados para sync/performance do AX Control sem trocar protocolo e sem quebrar o fluxo atual:
- Universal Raw Param Store
- Profile-Aware Parameter Registry inicial
- Domain Selectors
- UI Rendering Isolation incremental

Regra principal:
nao otimizar apenas controles isolados; preparar base para todos os parametros recebidos da mesa em AX16, AX24 e AX32, incluindo desconhecidos.

## 2. Fora de escopo nesta fase
- Nao criar novos comandos semantic/OSC-like.
- Nao criar ponte OSC externa.
- Nao trocar protocolo DUONN/WebSocket.
- Nao alterar parser estruturalmente.
- Nao alterar mappings sem evidencia.
- Nao remover fallback atual.
- Nao fazer migracao total de UI.

OSC-inspired permanece apenas como trilha futura.

## 3. Arquitetura alvo incremental
WebSocket RX
-> parser atual
-> fluxo atual continua
-> Universal Raw Param Store recebe param/value
-> Profile-Aware Registry classifica known/partial/unknown
-> Domain Selectors expõem leitura por dominio
-> UI migra gradualmente para selectors

## 4. Universal Raw Param Store
Cada entrada deve conter no minimo:
- paramId
- value
- activeProfile/model: AX16 | AX24 | AX32 | unknown
- timestamp
- source: bootSync | runtime | userTxEcho | reconnect | unknown
- knownStatus: known | partiallyKnown | unknown
- lastSeenAtBoot?
- lastSeenRuntime?
- decodedEntity?
- decodedProperty?

API minima:
- upsertRawParam(entry)
- getRawParam(paramId)
- getAllRawParams()
- getKnownParams()
- getUnknownParams()
- getParamsByProfile(profile)
- getRawParamStoreSnapshot()

Regras:
- Unknown params devem ser armazenados, nunca descartados.
- Store deve ficar isolado de React state global para evitar re-render amplo.

## 5. Profile-Aware Parameter Registry (inicial)
Objetivo:
classificar parametros com base no profile ativo usando mappings existentes, sem alterar mappings.

Estados:
- known
- partiallyKnown
- unknown

Comportamento:
- known: conhecido no profile ativo
- partiallyKnown: conhecido em outro profile ja registrado
- unknown: nao identificado no registry atual

## 6. Unknown Param Catalog
Objetivo:
catalogar parametros nao mapeados durante boot e runtime para investigacao futura.

Minimo esperado:
- contagem total unknown
- lista de unknown vistos recentemente
- profile/source/timestamp associados

## 7. Domain Selectors (fase inicial)
Selectors iniciais:
- selectChannelStrip(channelId)
- selectChannelFader(channelId)
- selectChannelMute(channelId)
- selectChannelSolo(channelId)
- selectChannelPan(channelId)

Regras:
- usar somente parametros com evidência atual
- se nao for seguro, retornar null e manter fallback atual

## 8. UI Rendering Isolation (fase inicial)
Objetivo:
evitar depender de objeto global gigante para toda renderizacao.

Estratégia inicial:
- migrar somente pequena parte de ChannelStrip para leitura por selector granular
- preservar layout e comportamento visual
- manter fallback completo para estado atual

## 9. Rollout incremental
1. Criar store/registry/selectors isolados.
2. Alimentar store no fluxo de RX parseado e userTxEcho.
3. Validar debug metrics internas.
4. Migrar pequena parte da UI com fallback.
5. Expandir gradualmente por dominio.

## 10. Guardrails de performance e seguranca
- Nao adicionar await no caminho critico RX/TX.
- Nao bloquear parser nem transporte.
- Nao enviar comandos novos para a mesa.
- Nao alterar comportamento funcional existente durante rollout inicial.
- Nao introduzir re-render global obvio por update de param.

## 11. Debug/metricas minimas
- total de params vistos
- total known
- total unknown
- updates por segundo (simples)
- ultimos params atualizados
- snapshot interno acessivel para diagnostico

## 12. Criterio de sucesso desta fase
A fundacao universal de dados existe e funciona com fallback preservado.
Uma migracao pequena de UI por selector foi feita de forma segura; se arriscada, entregar ao menos store + selectors + debug sem quebra funcional.

## 13. Futuro (nao prioridade agora)
OSC-inspired/semantic command expansion deve ficar em backlog futuro apos consolidacao da base de sync/performance.
