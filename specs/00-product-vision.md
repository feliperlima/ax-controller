# AX Control - Product Vision

## Objetivo do produto
AX Control e um app desktop para controle remoto de mixers da linha AX via protocolo DUONN/WebSocket, com foco em operacao rapida, previsivel e segura em contexto de audio ao vivo.

## Modelos suportados
- AX16
- AX24
- AX32

Observacao atual de implementacao:
- AX16 e AX24 compartilham perfil de protocolo `ax16_24` com variacao de `channelCount`.
- AX32 usa perfil dedicado (`ax32`/`ax32_experimental`).

## Principios do produto
- Nao quebrar show: estabilidade e previsibilidade acima de novidade.
- Operacao de baixo atrito: acesso rapido a canal, sends, grupos, FX e cenas.
- Feedback claro: status de conexao/sync, estados de solo/mute/meter e erros visiveis.
- Compatibilidade progressiva: evoluir AX32 sem regredir AX16/AX24.

## Principios de seguranca
- Nunca enviar escrita cega durante boot sync.
- Priorizar leitura da mesa antes de aplicar estado local em areas criticas.
- Bloquear conexao em qualquer estado formal bloqueante de licensing.
- Permitir conexao apenas em estados formais explicitamente liberados, incluindo trial ativo e purchased valida conforme contrato de licensing.
- Tratar queda de conexao com cleanup consistente de estado e timers.

## Visao premium de experiencia
- Controle completo de strips (channel/aux/fx/master) com resposta rapida.
- Views especializadas para sends, grupos, patching, scenes e customizacao.
- Indicacao visual consistente de link stereo, cores de strip e estados de processor.
- Fluxo de conexao com discovery/manual e sync inicial em background com status.

## Regra SDD obrigatoria
Toda feature critica (protocolo, sync, parser, sends, stereo link, FX, grupos, licenciamento, persistencia) deve nascer e evoluir guiada por spec antes de qualquer alteracao funcional.

## Regra de terminologia para licensing
- O pacote de specs deve distinguir claramente:
	- tipo de licenca: `trial`, `purchased`, `unknown`
	- estado formal normalizado da app
	- status/code bruto retornado pelo backend
- O estado formal normalizado e a unica referencia valida para gate de conexao e comportamento funcional.
