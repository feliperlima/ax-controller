# Handoff — AX Control no Claude Code Desktop

Documento de referência para abrir o projeto completo (app desktop +
backend/admin/api) no Claude Code Desktop e trabalhar nos dois de forma
integrada, sem precisar alternar de janela/terminal.

## 1. Visão geral do projeto

Dois lados, dois lugares diferentes:

| Lado | Onde mora | Versionado? |
|---|---|---|
| App desktop (Tauri 2 + React 19) | Local, `/Volumes/SSD_Felipe/Desenvolvimento/AX-Controller` | Sim — git, GitHub |
| Backend + Admin + API (PHP 8.1 + MySQL 8.0) | Só no servidor de produção (VPS), `/var/www/html/axcontrol` | **Não** — sem git, edição direta no servidor |

O backend é mantido sem git **de propósito**: o fluxo de trabalho atual
é editar direto no servidor para testar rápido, porque a v1.0.0 (já
instalada nos clientes) e a v1.1.0 (em dev) precisam continuar
respondendo pelos mesmos endpoints ao mesmo tempo — testar contra o
servidor real é a forma mais rápida de garantir que nenhuma das duas
quebrou. Não recomendo forçar git nele agora; só ter cuidado extra (ver
seção 6).

## 2. App desktop (frontend)

- Caminho local: `/Volumes/SSD_Felipe/Desenvolvimento/AX-Controller`
- Remote: `origin` → `https://github.com/feliperlima/AX-CONTROLLER.git`
- Branch atual: `chore/claude-audit-p0-guardrails`
- Stack: Tauri 2 (Rust em `apps/desktop/src-tauri`) + React 19 (`apps/desktop/src`)

## 3. Backend / Admin / API (servidor)

- Acesso SSH: alias já configurado em `~/.ssh/config` →

  ```
  Host axcontrol-api
    HostName axcontrol.com.br
    User root
    Port 22
    IdentityFile ~/.ssh/axcontrol_api
  ```

  Basta `ssh axcontrol-api` de qualquer terminal (inclusive o do Claude
  Code Desktop) — autenticação por chave, sem senha.

- Caminho no servidor: `/var/www/html/axcontrol`

  ```
  axcontrol/
    admin/      → painel admin (licenças, clientes, pagamentos, certificados, app-versions, flags, messages)
    api/        → endpoints (auth, license, devices, certificate, payment, portal, register, app, admin)
    config/     → config.php, database.php, functions.php, auth.php, .env (segredos, não comitar)
    database/   → schema.sql, schema_v1.0.0.sql, migrations/
    public/     → telas públicas (login, registro, portal, recuperação de senha)
    vendor/     → dependências composer
  ```

- **Outros diretórios em `/var/www/html/` não são deste projeto** — são
  outras aplicações no mesmo VPS: `live/`, `sms/`, `superbingao/`. Não
  tocar.

- PHP 8.1.2, MySQL 8.0.32. Banco: `axcontrol` (acessível via `mysql
  axcontrol` direto no servidor, já autenticado por socket/root).

- Segredos ficam em `/var/www/html/axcontrol/config/.env` (no servidor,
  fora do controle de versão). Chaves existentes: `AX_ENVIRONMENT`,
  `AX_DEBUG`, `AX_APP_URL`, `AX_APP_KEY`, `AX_DB_HOST/PORT/NAME/USER/PASS`,
  `AX_MAIL_*`, `AX_MP_PUBLIC_KEY`/`AX_MP_ACCESS_TOKEN`/`AX_MP_WEBHOOK_*`
  (Mercado Pago), `AX_CERT_PRIVATE_KEY`/`AX_CERT_PUBLIC_KEY`/`AX_CERT_SIG_VERSION`.
  Para ler um valor: `ssh axcontrol-api "grep NOME_DA_CHAVE /var/www/html/axcontrol/config/.env"`.

## 4. Restrição mais importante: compatibilidade v1.0.0 x v1.1.0

Existem clientes reais ainda na v1.0.0. Qualquer mudança no backend
**não pode quebrar os endpoints que essa versão usa**. O padrão hoje:

- `api/license/validate.php` é o endpoint legado, compatível com
  v1.0.0 e v1.1.0 ao mesmo tempo. Ele lê o header `X-App-Version` e
  decide o shape da resposta (`$isNewApp = version_compare($appVersionHeader, '1.1.0', '>=')`).
  É a referência de "como não quebrar a versão antiga".
- `devices` é a tabela canônica v1.1.0 para contagem/limite de
  dispositivos; `license_activations` é a tabela legada v1.0.0,
  mantida só por compatibilidade. Qualquer endpoint que registre
  dispositivo deve escrever nas duas (dual-write) — ver
  `api/devices/register.php` e `api/license/validate.php` (função
  `upsertDeviceEntry()`) como referência.

Leia antes de qualquer mudança de contrato:
- [app-backend-contract-v1.1.0.md](app-backend-contract-v1.1.0.md) — contrato app↔backend v1.1.0.
- [site-api-admin-plan.md](site-api-admin-plan.md) — arquitetura completa de tabelas/admin/portal.
- [backend-trial-activation-review-2026-06-17.md](backend-trial-activation-review-2026-06-17.md) — revisão/correções feitas hoje em `activate-trial.php` (exemplo de como testar contra produção com segurança).

## 5. Lado app: arquivos-chave do contrato de licença

- `apps/desktop/src/lib/licenseState.ts` — `parseLicenseSnapshot()` /
  `resolveLicenseFormalState()`: única fonte de verdade de como o JSON
  do backend vira estado de licença na UI. Espera `valid`/`active`/`code`/`status`
  na raiz e `license.type`/`license.expiry_date` dentro de `license`.
- `apps/desktop/src/services/licenseService.ts` — normaliza a resposta
  crua da API antes de passar pro parser acima (`normalizeLicenseApiPayload`,
  `apiActivateTrial`, `apiGetMe`, etc.).
- `apps/desktop/src/App.tsx` — fluxo de trial (`startTrialNow()`) e o
  efeito de sincronização em background que nunca deixa um trial local
  ser cortado por um estado mais restrito vindo do servidor.

Qualquer mudança de shape de resposta no backend precisa ser checada
contra esses três arquivos.

## 6. Cuidados ao editar o backend direto no servidor

Sem git lá, então a rede de segurança é manual:

1. Antes de editar um arquivo, faça backup: `cp arquivo.php arquivo.php.bak-$(date +%Y%m%d%H%M%S)`.
2. Depois de editar, valide sintaxe: `ssh axcontrol-api "php -l /caminho/arquivo.php"`.
3. Para testar um endpoint sem afetar usuários reais, use uma conta
   descartável e limpe ao final (ver script de teste em
   `backend-trial-activation-review-2026-06-17.md`, seção "Verificação").
4. **Chamar o domínio público (`https://axcontrol.com.br`) de dentro do
   próprio servidor trava/dá timeout** (provável CDN/proxy na frente).
   Para testar local, use `127.0.0.1` com header `Host`:
   ```
   curl -sk --resolve axcontrol.com.br:443:127.0.0.1 -H "Host: axcontrol.com.br" https://127.0.0.1/api/...
   ```
5. Mudanças de schema: só `ADD COLUMN`/migrations aditivas. Nunca
   `DROP`/`RENAME` em produção.

## 7. Sugestão de primeira mensagem no Claude Code Desktop

Abra o Claude Code Desktop na pasta `/Volumes/SSD_Felipe/Desenvolvimento/AX-Controller`
(é onde estão tanto o app quanto este documento e os outros `.md` de
contrato/plano) e cole algo como:

> Lê o `claude-code-desktop-handoff.md` deste repo pra entender a
> estrutura do projeto (app local + backend no servidor via SSH
> `axcontrol-api`). A partir de agora vou trabalhar nos dois lados por
> aqui.
