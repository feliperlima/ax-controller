# Licensing and Trial Spec

## Objetivo
Documentar o comportamento de licenciamento, trial, purchased, cache runtime e gate de conexao.

## Escopo
- Onboarding de licenca
- Validacao de licenca
- Trial
- Purchased
- Cache local e revalidacao
- Gate de conexao com mixer

## Estado atual observado
- O gating de licenca e critico e acontece antes da conexao em `connectToMixer`.
- `App.tsx` concentra UI, cache e decisao de boot.
- `lib/licenseState.ts` e `lib/licenseEngine.ts` concentram normalizacao e decisoes formais.
- O codigo atual separa claramente:
	- tipo da licenca (`trial`, `purchased`, `unknown`)
	- estado formal normalizado usado pela app
	- status/codes brutos retornados pelo backend

## Fontes atuais
- `App.tsx`: fluxo onboarding, connect gate, cache local, API URLs e runtime cache.
- `lib/licenseState.ts`: parse e formal state.
- `lib/licenseEngine.ts`: boot decision, expiracao e runtime cache.

## Regras obrigatorias
- Sem licenca valida ou trial permitido, nao conectar ao mixer.
- Mesa nao deve abrir caminho funcional fora do gate de licenca.
- Cache local acelera boot, mas nao pode violar regra de bloqueio formal.
- Runtime cache e estado formal precisam permanecer coerentes.

## Modelo canônico de estados

### 1. Tipo de licenca
- `trial`
- `purchased`
- `unknown`

### 2. Estados formais normalizados da app
- `TRIAL_ACTIVE`
- `TRIAL_EXPIRED`
- `PURCHASED_ACTIVE`
- `PURCHASED_REVALIDATION_DUE`
- `PURCHASED_REVALIDATION_EXPIRED`
- `LICENSE_SUSPENDED`
- `LICENSE_REVOKED`
- `LICENSE_BLOCKED`
- `LICENSE_NOT_FOUND`

### 3. Status/codes brutos relevantes do backend
- `active`
- `pending`
- `suspended`
- `revoked`
- `blocked`
- `inactive`
- `LICENSE_NOT_FOUND`
- `LICENSE_EXPIRED`
- `LICENSE_INACTIVE`
- `LICENSE_PENDING`
- `ACTIVATION_LIMIT_REACHED`
- `LICENSE_REVOKED`
- `LICENSE_SUSPENDED`
- `LICENSE_BLOCKED`

## Regra de normalizacao
- O backend pode devolver `status` e `code` em formatos diferentes.
- A app deve sempre converter isso para o conjunto fixo de estados formais normalizados acima.
- UI, gate de conexao e boot decision devem trabalhar somente com o estado formal normalizado.

## Mapeamento de estados

### Trial
- `trial` com validade futura ou sem expiry confiavel: `TRIAL_ACTIVE`
- `trial` expirado ou `LICENSE_EXPIRED`: `TRIAL_EXPIRED`

### Purchased
- `purchased` valido e ativo, dentro da janela de revalidacao: `PURCHASED_ACTIVE`
- `purchased` valido e ativo, mas proximo da revalidacao: `PURCHASED_REVALIDATION_DUE`
- `purchased` com revalidacao vencida: `PURCHASED_REVALIDATION_EXPIRED`

### Estados bloqueantes vindos do backend
- `pending` ou `LICENSE_PENDING`: `LICENSE_BLOCKED`
- `inactive` ou `LICENSE_INACTIVE`: `LICENSE_BLOCKED`
- `blocked` ou `LICENSE_BLOCKED`: `LICENSE_BLOCKED`
- `ACTIVATION_LIMIT_REACHED`: `LICENSE_BLOCKED`
- `suspended` ou `LICENSE_SUSPENDED`: `LICENSE_SUSPENDED`
- `revoked` ou `LICENSE_REVOKED`: `LICENSE_REVOKED`
- ausencia de snapshot valido: `LICENSE_NOT_FOUND`

## Estados que bloqueiam conexao
- `TRIAL_EXPIRED`
- `PURCHASED_REVALIDATION_EXPIRED`
- `LICENSE_SUSPENDED`
- `LICENSE_REVOKED`
- `LICENSE_BLOCKED`
- `LICENSE_NOT_FOUND`

## Estados que permitem conexao
- `TRIAL_ACTIVE`
- `PURCHASED_ACTIVE`
- `PURCHASED_REVALIDATION_DUE`

## Comportamento esperado

### Boot
- App carrega installation id, chaves e caches.
- Resolve estado formal via cache + runtime + politica de revalidacao.
- Se bloqueado, conexao deve ser impedida.

### Trial
- Trial ativo pode permitir conexao mesmo sem chave, conforme decisao formal do motor.
- Trial expirado deve bloquear conexao.
- Expiracao e proxima revalidacao devem ser refletidas na UI.

### Purchased
- Purchased ativa deve permitir conexao.
- Purchased com revalidacao proxima continua funcional, mas com aviso.
- Purchased com revalidacao expirada deve bloquear conexao ate nova validacao.

### Estados administrativos
- `pending` deve ser tratado como bloqueado, nao como estado ativo parcial.
- `suspended` deve bloquear com prioridade alta.
- `revoked` deve bloquear com prioridade alta.
- `inactive` deve ser tratado como bloqueado.
- `active` so libera caminho quando snapshot tambem estiver consistente em `valid` e `active`.

### Validacao de licenca
- Resultado da API deve ser normalizado antes de atualizar estado local.
- Cache salvo deve ser vinculado ao installation id correto.
- Tipo da licenca e estado formal devem ser persistidos de forma coerente.

### Revalidacao
- Revalidacao em background nao deve quebrar UX nem liberar estado indevido.
- Mudanca de estado formal para bloqueado deve prevalecer.
- Purchased `due` nao deve ser promovida para `expired` antes do prazo real.

## Persistencia local
- Installation id
- Ultima license key
- Status cacheado
- Runtime cache versionado
- Flags auxiliares de onboarding/ativacao

## Contrato de UI
- UI deve exibir o estado formal, nao o status bruto do backend como fonte principal.
- Mensagens amigaveis podem usar `status`/`message` como apoio, mas sem mudar a regra formal.
- Fluxo de conexao deve consultar o estado formal bloqueante antes de abrir socket.

## Riscos principais
- Permitir conexao indevida por cache stale.
- Bloquear usuario valido por parsing inconsistente.
- Divergencia entre estado formal, UI e gate real.
- Tratar `pending`, `inactive` ou `suspended` como equivalentes a ativo por erro de normalizacao.
- Confundir expiracao de trial com expiracao de revalidacao purchased.

## Checklist minimo antes de alterar codigo
- Sem licenca valida, conexao bloqueia.
- Trial ativo comporta-se como esperado.
- Trial expirado bloqueia.
- Licenca valida libera conexao.
- Purchased ativa libera conexao.
- Purchased em janela `due` continua funcionando com aviso.
- Purchased com revalidacao expirada bloqueia.
- Estados `pending`, `suspended`, `revoked`, `blocked` e `inactive` bloqueiam corretamente.
- Cache invalido nao libera estado indevido.
- Revalidacao nao causa regressao de UX ou de seguranca.
