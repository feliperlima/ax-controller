# Protocol Contract

## Escopo
Contrato operacional para TX/RX, boot sync, reconnect, logging e reconciliacao de estado.

## Regras de TX
- Componentes React nao devem enviar payload WebSocket direto.
- Toda escrita deve passar por camada semantica (feature/domain/protocol).
- `sendParam`/`sendRaw` devem ser chamados apenas por adapters/casos de uso autorizados.
- Valores devem ser validados e clampados antes de encode.
- Escritas derivadas (ex.: grupos/bitmask) devem carregar metadata de risco quando aplicavel.

## Regras de RX
- Decoder deve ser deterministico por opcode.
- Mensagens malformadas nao devem quebrar loop de sync.
- Respostas parciais devem ser tratadas sem sobrescrever estado valido recente.
- Parametros desconhecidos devem ser catalogados, nao descartados silenciosamente.

## Boot sync
- Estados permitidos: connecting -> bootSyncing -> ready.
- Antes de abrir caminho funcional completo, o gate de licensing deve ter resolvido o estado formal normalizado.
- Nada deve ser enviado automaticamente durante boot sync sem autorizacao explicita.
- Ordem recomendada de bootstrap:
  1. licensing e gate de conexao
  2. conectividade e perfil
  3. leitura de estado base (channels/aux/fx/master/links)
  4. grupos
  5. sends visiveis
  6. nomes/persistencia nao critica
- Writes durante boot devem ser minimizadas e justificadas.

## Reconnect
- Ao reconectar:
  - limpar timers pendentes de escrita antiga
  - reinicializar tracking de eco local
  - reexecutar sync incremental seguro
- Nao assumir que estado local continua valido apos queda.

## Mensagens desconhecidas
- Logar opcode/payload com nivel de debug controlado.
- Catalogar em backlog de protocolo com contexto (quando, origem, impacto).
- Nunca quebrar UX por opcode desconhecido isolado.

## Envio seguro de parametros
- Aplicar throttle/debounce em writes de alta frequencia (ex.: fader/sends).
- Proibir burst cego sem feedback de conectividade.
- Validar range por parametro/perfil antes do envio.

## Logging
- Nivel INFO: mudancas de estado de conexao/sync.
- Nivel WARN: fallbacks, leituras parciais, respostas inconsistentes.
- Nivel ERROR: falhas de conexao, parse irrecuperavel, timeout critico.
- Evitar log com spam em loop de polling.

## Contrato de licensing dentro do protocolo operacional
- Status bruto de licensing vindo do backend nao deve dirigir comportamento funcional diretamente.
- Gate de conexao, UI funcional e boot devem operar sobre estado formal normalizado.
- Estados formais bloqueantes nao podem abrir socket funcional para a mesa.

## Reconciliacao: otimista x estado real da mesa
- UI pode aplicar estado otimista para responsividade.
- RX confirmado da mesa prevalece em divergencia.
- Janela de supressao de eco local deve ser curta e controlada.
- Releituras pos-toggle critico (ex.: tap point) sao obrigatorias para convergencia.
