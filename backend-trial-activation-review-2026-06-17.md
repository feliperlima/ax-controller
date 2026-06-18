# Revisão: ativação de trial via app (v1.1.0) — 2026-06-17

## Contexto

Um agente de backend separado implementou, de forma independente, o
desacoplamento entre cadastro e ativação de trial exigido pelo
`app-backend-contract-v1.1.0.md` (seção 5 e 7):

- `api/auth/register.php` — passou a só criar o usuário, sem ativar trial
  automaticamente. Sempre responde `status: "free"`, `license: null`.
- `api/license/activate-trial.php` — passou a controlar "1 trial por
  conta, para sempre" via `users.trial_used_at`, em vez de inferir pela
  existência de uma licença trial (que podia ser apagada/perdida).
- `database/migrations/002_trial_used_at.sql` — nova migration adicionando
  a coluna `users.trial_used_at`.
- Ajuste bônus em `api/license/current.php` (mismatch de `state`/`code`).

O agente não tinha acesso ao `app-backend-contract-v1.1.0.md` deste repo,
então pediu revisão cruzada antes de considerar o trabalho concluído.

## O que estava correto

- `register.php` nunca retorna `trial_active` — confere com o contrato.
- Lógica de "trial usado uma vez, nunca mais" (rejeita com `409
  TRIAL_ALREADY_USED` independente de device/reinstalação/licença antiga) —
  correta e mais robusta que a versão anterior baseada em linhas de `licenses`.
- `login.php` e `validate.php` (endpoint legado v1.0.0) não foram tocados —
  compatibilidade com a versão antiga preservada.
- Padrão de dual-write (`devices` canônica + `license_activations` legada)
  usado em `devices/register.php` e `validate.php` continua intacto.

## Problemas encontrados e corrigidos

### 1. Migration nunca executada em produção (crítico)

A migration `002_trial_used_at.sql` existia só como arquivo — a coluna
`users.trial_used_at` não existia no banco. Toda chamada a
`activate-trial.php` quebrava com erro 500 genérico
(`SELECT ... trial_used_at FROM users` falhava).

**Fix:** executada a migration em produção
(`mysql axcontrol < database/migrations/002_trial_used_at.sql`).
Confirmado via `DESCRIBE users` que a coluna existe.

### 2. `activate-trial.php` não escrevia na tabela `devices`

O endpoint inseria apenas em `license_activations` (legado). Como o app
não chama nenhum outro endpoint de registro de device depois de ativar o
trial, o dispositivo nunca aparecia na tabela canônica `devices` — o que
afeta contagem de limite de dispositivos em qualquer fluxo v1.1.0 que
dependa dela (ex.: `current.php`, futuras chamadas de `devices/register.php`).

**Fix:** adicionado um `INSERT ... ON DUPLICATE KEY UPDATE` em `devices`
dentro da mesma transação, com um helper `normalizePlatformEnum()` local
para mapear a string livre de `device_platform` para o enum
(`android`/`ios`/`windows`/`macos`/`linux`) da coluna.

### 3. Shape da resposta não compatível com o parser do app

`parseLicenseSnapshot()` / `resolveLicenseFormalState()`
(`apps/desktop/src/lib/licenseState.ts`) esperam `valid`/`active` na raiz
e `license.type` / `license.expiry_date`. O endpoint retornava apenas
`status: "trial_active"` e `license.plan` / `license.trial_expires_at` —
sem os campos que o parser realmente lê. Resultado: se a resposta da
ativação fosse aplicada diretamente (hoje mascarado por dois fatores —
`startTrialNow()` aplica estado otimista local sem usar a resposta da API,
e a rede de segurança "never cut a trial short" no `App.tsx` absorve
qualquer state mais restrito vindo do servidor), o snapshot seria
interpretado como `LICENSE_BLOCKED` em vez de `TRIAL_ACTIVE`.

**Fix:** resposta agora inclui `valid: true`, `active: true`,
`license.type: "trial"`, `license.expiry_date` (mesmo valor de
`trial_expires_at`), e `code` mudou de `TRIAL_ACTIVATED` para
`TRIAL_ACTIVE` (mesmo vocabulário usado por `validate.php`). Campos
antigos (`license.plan`, `license.trial_expires_at`) foram mantidos como
adicionais, não removidos.

## Verificação

Teste ponta a ponta em produção (conta de teste descartável,
`axcontrol.qa.test+<timestamp>@example.com`, limpa ao final):

1. `register.php` → `status: free`, `license: null`.
2. `login.php` (sem licença ainda) → `LICENSE_NOT_FOUND`, `blocked`.
3. `activate-trial.php` → `TRIAL_ACTIVE`, `valid/active: true`,
   `license.type: trial`, `license.expiry_date` em 7 dias.
4. Segunda chamada a `activate-trial.php` (outro device) →
   `409 TRIAL_ALREADY_USED`.
5. Conferido no banco: `users.trial_used_at` setado, `licenses` ativa,
   linha em `devices` (`platform: macos`, `status: active`) e em
   `license_activations`.

Backup do arquivo original ficou em
`activate-trial.php.bak-<timestamp>` no servidor.

## Pendências / não bloqueantes

- `current.php` usa `devices` para contagem, mas o app ainda não chama
  esse endpoint (`apiGetCurrentLicense`/`license/current` não existe em
  `licenseService.ts`). Inconsistências nele (ex.: campo `state`) ficam
  sem efeito prático até o app passar a consumi-lo.
- Vale alinhar o outro agente de backend com o
  `app-backend-contract-v1.1.0.md` deste repo para futuras mudanças, já
  que ele não tinha acesso a esse arquivo.
