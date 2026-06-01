# Sync Engine

## Estados esperados
- `disconnected`: sem socket ativo.
- `connecting`: tentativa de abrir conexao.
- `bootSyncing`: conectado, sincronizacao inicial em progresso.
- `ready`: conectado e sincronizado.
- `reconnecting`: tentativa de recuperar apos queda.
- `degraded`: conectado com sync parcial/falhas pontuais.
- `error`: falha bloqueante de conexao/sync.

## Regras de transicao
- `disconnected -> connecting`: user action (manual/discovery).
- `connecting -> bootSyncing`: socket open + profile resolvido.
- `bootSyncing -> ready`: etapas essenciais de sync concluidas.
- `bootSyncing -> degraded`: conectou, mas partes falharam.
- `ready -> reconnecting`: disconnect inesperado.
- `reconnecting -> ready|degraded|error`: conforme sucesso/falha.

## Quando a UI pode editar
- `disconnected`: nao.
- `connecting`: nao.
- `bootSyncing`: somente controles explicitamente permitidos por politica (default: nao).
- `ready`: sim.
- `reconnecting`: nao.
- `degraded`: sim para operacoes de baixo risco; alto risco sob bloqueio parcial.
- `error`: nao, ate recuperacao.

## Como RX atualiza estado
- Atualizacoes de RX devem passar por validacao de parametro/perfil.
- Estado derivado (links, groups, sends) deve ser recalculado apos leituras chave.
- RX antigo nao deve sobrescrever valor mais novo confirmado.

## TX otimista e reconciliacao
- UI pode refletir TX otimista para latencia baixa.
- Confirmacao por RX deve reconciliar divergencia (mesa prevalece).
- Tracking local de escrita deve evitar eco falso e expirar rapido.

## Evitar sobrescrita por mensagem antiga
- Usar timestamp/ordem de aplicacao por parametro quando possivel.
- Ignorar update remoto desatualizado dentro de janela de supressao segura.
- Em duvida, re-read pontual do parametro.

## Protecao do boot sync
- Bloquear writes automaticas nao essenciais durante `bootSyncing`.
- Separar sync em fases pequenas com controle de falha parcial.
- Nao promover para `ready` sem checklist minimo de consistencia.
