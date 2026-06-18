# AX Control — Contrato App ↔ Backend (v1.1.0)

> **Para o time de API/Admin/Site:** Este documento foi gerado a partir do plano arquitetural do app (v1.1.0) e do plano de backend (`site-api-admin-plan.md`) para double-check de alinhamento. Ele descreve o que o app espera receber do backend, os contratos de cada endpoint, as regras de negócio que o app vai implementar client-side, e os pontos que precisam de confirmação ou decisão conjunta.

---

## Contexto

O AX Control é um app Tauri 2 + React 19 para controle de mesas de som DUONN Axios. A v1.0.0 já está em produção com usuários ativos. A v1.1.0 introduz:

- Home screen fora da mesa (navegação reestruturada)
- Modo demo (100% client-side, sem dependência de backend)
- Certificado offline `.axc` com validação local em Rust (Ed25519)
- Remote config, feature flags e mensagens dinâmicas via `/api/app/bootstrap`
- Version check não-bloqueante
- Plano `free` como modo limitado (em vez de bloqueio total após trial)
- Conta/licença acessível sem mesa conectada

**Premissa técnica inegociável do app:**
> O AX Control pode precisar de internet para ativar e manter a conta atualizada, mas **nunca** para operar a mesa ao vivo. Nenhuma validação de licença pode derrubar ou interromper uma sessão ativa.

---

## 1. Compatibilidade com v1.0.0 — Confirmação necessária

O app v1.0.0 usa os endpoints PHP existentes com os contratos atuais. A v1.1.0 usa endpoints novos e envia `X-App-Version: 1.1.0` em toda chamada.

**O app precisa que o backend confirme:**

| Regra | Status esperado |
|---|---|
| Endpoints `.php` existentes mantêm contrato de resposta atual | ✅ Confirmado no plano de backend |
| Novo status `free` e `licensed` **não** são retornados para v1.0.0 | ✅ Gateado por `app_version` no backend |
| v1.0.0 continua recebendo `TRIAL_EXPIRED` ao expirar trial | ✅ Confirmado no plano de backend |
| Novos endpoints `/api/app/*` e `/api/certificate/*` coexistem sem conflito | ✅ Confirmado no plano de backend |
| Aumento do limite de devices 2→3 não quebra nenhum fluxo existente | ✅ Apenas positivo |

**Header obrigatório que o app v1.1.0 enviará em toda chamada:**
```
X-App-Version: 1.1.0
X-App-Platform: desktop | ios | android
```

**Pergunta ao backend:** O roteamento por `X-App-Version` no header já está planejado para todos os endpoints que mudam de comportamento entre versões? Ou será feito por lógica interna em cada endpoint?

---

## 2. Endpoint de Bootstrap — Contrato esperado pelo app

### `GET /api/app/bootstrap`

**Headers enviados pelo app:**
```
Authorization: Bearer {token} | Cookie: session
X-App-Version: 1.1.0
X-App-Platform: desktop
X-Device-Id: {installation_uuid}
Accept-Language: pt-BR
```

**Resposta esperada (contrato completo):**
```json
{
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "is_founder": true,
    "founder_granted_at": "2025-01-10T00:00:00Z"
  },
  "license": {
    "status": "licensed",
    "plan": "founder",
    "expires_at": null,
    "max_devices": 3,
    "active_devices": 2
  },
  "certificate": {
    "needs_renewal": false,
    "valid_until": "2026-07-15T00:00:00Z",
    "token": "eyJ..."
  },
  "version": {
    "update_type": "none | optional | recommended | required",
    "latest_version": "1.2.0",
    "download_url": "https://...",
    "release_notes": "...",
    "message": "Nova versão disponível."
  },
  "feature_flags": {
    "demo_mode": true,
    "advanced_eq_beta": false,
    "store_kit_enabled": false,
    "cloud_sync": false
  },
  "messages": [
    {
      "key": "founder_badge_info",
      "title": "Você é Founder!",
      "body": "Seu acesso vitalício está ativo.",
      "severity": "info",
      "channel": "banner",
      "cta_label": null,
      "cta_url": null
    }
  ],
  "support": {
    "whatsapp_url": "https://wa.me/5592993361237",
    "email": "suporte@axcontrol.com.br",
    "docs_url": "https://docs.axcontrol.com.br"
  },
  "public_key": "base64-ed25519-public-key",
  "server_time": "2026-06-15T12:00:00Z",
  "maintenance": {
    "active": false,
    "message": null
  }
}
```

**Como o app usa cada campo:**

| Campo | Uso no app |
|---|---|
| `user` | Atualiza cache de perfil local — substitui chamada separada a `/api/auth/me` |
| `license.status` | Determina estado da UI (modo free, trial ativo, licenciado, revogado) |
| `license.plan` | Determina entitlements e badge de plano |
| `certificate.token` | Se presente, salva imediatamente em secure storage (Tauri keychain/Stronghold) |
| `certificate.valid_until` | Exibe data de renovação no AccountScreen |
| `version.update_type` | Controla exibição de badge/banner de atualização na Home |
| `feature_flags` | Habilita/desabilita funcionalidades na UI; verificado apenas no startup, nunca durante sessão ativa de mesa |
| `messages` | Renderizados conforme `channel` (banner, toast, modal, inline); textos já interpolados, app não processa templates |
| `public_key` | Armazenado em cache seguro para validação offline do `.axc`; atualiza mapa de chaves por `sig_v` |
| `server_time` | Referência para clock drift no validador Rust do certificado (tolerância ±5 min) |
| `maintenance.active` | Se `true`, app exibe aviso de manutenção na Home (não bloqueia operação da mesa) |

**Pergunta ao backend:** O campo `certificate.token` deve ser retornado apenas quando há renovação pendente, ou sempre? O app está preparado para ambos os casos, mas queremos alinhar para não processar um token desnecessariamente.

**Pergunta ao backend:** Quando o usuário está offline e o bootstrap não foi chamado ainda, qual é o comportamento esperado para o campo `license.status` no cache local? O app vai usar `"unknown"` como fallback — está ok?

---

## 3. Certificado Offline `.axc` — Contrato esperado pelo app

### Formato

JWT compacto padrão (JWS), algoritmo **Ed25519 (EdDSA)**.

**Header:** `{ "alg": "EdDSA", "typ": "AXC" }`

**Payload:**
```json
{
  "jti":  "uuid-v4-do-certificado",
  "sub":  "1",
  "lid":  "42",
  "did":  "device-uuid",
  "plan": "founder",
  "role": "user",
  "perms": ["operate_table", "demo_mode", "advanced_presets"],
  "max_devices": 3,
  "sig_v": 1,
  "iat":  1718400000,
  "exp":  1721000000
}
```

**Validação feita no app (Rust, via comando Tauri):**
1. Extrai `sig_v` do payload.
2. Seleciona chave pública Ed25519 correspondente no mapa embutido no binário.
3. Verifica assinatura Ed25519.
4. Verifica `did` == `installation_uuid` local (device binding).
5. Verifica `exp` com tolerância de ±5 min usando `server_time` do último bootstrap.
6. Retorna: `valid | expired | invalid | device_mismatch | unknown_key_version | not_found`.

**Endpoints esperados:**

| Endpoint | Quando o app chama |
|---|---|
| `POST /api/certificate/issue` | Primeira ativação do dispositivo |
| `POST /api/certificate/renew` | Renovação automática quando há internet (ou via bootstrap) |
| `GET /api/app/public-key` | Fallback para obter chave pública atual caso bootstrap falhe |

**Pergunta ao backend:** A renovação do certificado via bootstrap (`certificate.token`) substitui completamente a chamada a `POST /api/certificate/renew`, ou os dois coexistem como rotas alternativas? Preferimos que o bootstrap seja suficiente para o fluxo normal, com `renew` como fallback explícito.

**Pergunta ao backend:** Qual é o formato exato do `public_key` retornado? Base64 padrão ou base64url? O crate `ed25519-dalek` do Rust espera bytes raw — precisamos confirmar o encoding para não ter surpresa na integração.

**Pergunta ao backend:** O mapa de chaves por `sig_v` — quantas versões precisamos embarcar inicialmente no binário? Sugerimos embarcar `sig_v: 1` no binário de lançamento e atualizar via bootstrap a partir daí.

---

## 4. Endpoints de Dispositivos — Contrato esperado pelo app

### `POST /api/devices/register`

Chamado pelo app ao conectar com internet pela primeira vez, ou ao detectar que o dispositivo não está registrado no servidor.

**Body:**
```json
{
  "device_id": "installation-uuid",
  "platform": "desktop",
  "app_version": "1.1.0",
  "build_number": "42",
  "device_name": "MacBook Pro de João"
}
```

**Resposta esperada — sucesso (HTTP 200):**
```json
{
  "status": "registered",
  "device": { "id": 7, "device_id": "...", "status": "active" }
}
```

**Resposta esperada — 4º dispositivo (HTTP 409):**
```json
{
  "code": "MAX_DEVICES_REACHED",
  "message": "Limite de 3 dispositivos atingido.",
  "devices": [
    { "device_id": "...", "device_name": "iPhone de João", "platform": "ios", "last_seen_at": "2026-05-01T..." },
    { "device_id": "...", "device_name": "iPad", "platform": "ios", "last_seen_at": "2026-04-10T..." },
    { "device_id": "...", "device_name": "MacBook Antigo", "platform": "desktop", "last_seen_at": "2026-01-20T..." }
  ]
}
```

O app exibe a lista de devices ao usuário para que ele escolha qual remover antes de tentar registrar novamente.

### `DELETE /api/devices/{device_id}`

Chamado quando o usuário remove um dispositivo no AccountScreen.

**Resposta esperada (HTTP 200):**
```json
{ "status": "removed" }
```

### `PATCH /api/devices/{device_id}/last-seen`

Heartbeat silencioso — chamado uma vez por sessão quando há internet, sem impacto na UI.

**Body:** `{}` (sem payload necessário — device_id e timestamp vêm do contexto autenticado)

**Resposta esperada (HTTP 200):**
```json
{ "status": "ok" }
```

**Pergunta ao backend:** O `device_id` que o app usa é o `installation_uuid` gerado localmente (UUID v4 salvo em secure storage). Está alinhado com o campo `device_id` da tabela `devices` no schema? Não há conflito com um `id` autoincrementado?

---

## 5. Autenticação — Contrato esperado pelo app

O app v1.1.0 mantém compatibilidade com os endpoints existentes. As chamadas de auth que o app faz:

| Endpoint | Quando |
|---|---|
| `POST /api/auth/register` | Novo usuário (cria conta como `free`, **não inicia trial automaticamente**) |
| `POST /api/auth/login` | Login com email/senha |
| `POST /api/auth/logout` | Logout explícito |
| `GET /api/auth/me` | Fallback quando bootstrap não responde |
| `POST /api/license/activate-trial` (**novo, a confirmar**) | Inicia o trial de 7 dias para uma conta já existente — ação separada e explícita do usuário |

**Mudança de regra v1.1.0 — trial não é mais automático no cadastro:** Antes, criar conta sempre iniciava o trial de 7 dias. Agora isso muda: `register` cria a conta em modo `free` (sem trial). O usuário decide depois, numa ação separada, se quer iniciar o trial — o app chama `activate-trial` nesse momento. Isso significa:
- O `register` **nunca** deve retornar `trial_active` — sempre `free` no sucesso.
- Precisamos do endpoint `POST /api/license/activate-trial` (nome sugerido, backend decide o final): recebe `device_id` (installationId), identifica a conta logada (sessão/cookie atual ou pelo `device_id` já associado via login/registro anterior), e retorna o mesmo contrato de licença usado por login/registro (`status: trial_active`, `trial_expires_at`, etc.).
- **Regra inegociável:** uma vez que uma conta usa seu trial (ativo ou expirado), o `activate-trial` deve **rejeitar** uma segunda ativação para a mesma conta (e o backend nunca deve voltar a retornar `free` pra essa conta depois — ver seção 7).
- **Cadastro sempre exige internet** (não há fluxo de criação de conta offline). O início do trial em si **pode acontecer offline** — o app marca o trial como ativo localmente e sincroniza com esse endpoint silenciosamente quando a internet voltar. Se o `activate-trial` rejeitar por já ter sido usado, o app deixa o trial local em andamento terminar normalmente (não interrompe no meio), só bloqueia uma nova tentativa depois.

**Pergunta ao backend:** O token de autenticação retornado no login deve ser Bearer JWT stateless ou session cookie? O app v1.0.0 usa o mecanismo atual — a v1.1.0 precisa continuar compatível. Se houver mudança para JWT stateless, precisa ser feita de forma aditiva (ambos aceitos por um período).

---

## 6. Version Check — Contrato esperado pelo app

O app lê `version.update_type` direto do bootstrap. Comportamento esperado:

| `update_type` | Comportamento no app (v1.1.0) |
|---|---|
| `none` | Silencioso |
| `optional` | Silencioso |
| `recommended` | Badge discreto no ícone de configurações na Home; banner não-bloqueante |
| `required` | Aviso suave por enquanto (beta); futuramente modal bloqueante |

**Regra para o beta (agora):** O backend **nunca** deve retornar `required` para versões ativas. Somente `none`, `optional` ou `recommended`.

**Pergunta ao backend:** O `download_url` retornado apontará para o GitHub Releases, CDN próprio ou site? O app abrirá esse link via `tauri-plugin-opener` — qualquer URL funciona.

---

## 7. Status de Licença — Mapeamento App ↔ Backend

O app v1.1.0 mapeia os status recebidos do backend para estados de UI:

| Status do backend | Plano | UI no app v1.1.0 |
|---|---|---|
| `free` | `free` | Modo limitado funcional; banner de upgrade não-bloqueante |
| `trial_active` | `trial` | Banner de dias restantes; acesso AX Control+ completo |
| `trial_expired` | `free` | Igual ao `free`; mensagem de trial expirado; oferta de upgrade |
| `licensed` | `ax_control_plus` ou `founder` | Acesso completo; badge de plano |
| `needs_validation` | qualquer | Badge de renovação pendente; aviso discreto |
| `revoked` | — | Tela de conta bloqueada; instruções de suporte |
| `max_devices_reached` | — | Tela de seleção de dispositivo para remover |

**Regra inegociável do app:** Nenhum desses estados, incluindo `revoked`, pode interromper uma sessão ativa com a mesa. A verificação ocorre apenas no startup (transição `splash → home`) ou ao navegar para o AccountScreen, **nunca** durante `appStage === "mixer"`.

**Regra inegociável adicional (v1.1.0):** Uma vez que uma conta usou seu trial (`trial_active` em algum momento), o backend **nunca mais** pode voltar a retornar `free` para essa conta — mesmo em outro dispositivo, reinstalação, ou logout/login. Depois do trial, o status correto é `trial_expired` (que também mapeia para modo `free` na UI, mas sinaliza pro app que aquela conta já não pode iniciar um novo trial). O app usa essa distinção (`free` = nunca usou trial vs. `trial_expired` = já usou) para decidir se oferece o botão "Iniciar teste grátis" — então isso precisa ser por conta, não por dispositivo.

**Pergunta ao backend:** O status `needs_validation` é retornado quando o certificado está próximo de vencer (ex.: <7 dias) ou é baseado em outra condição? O app precisa dessa distinção para exibir o aviso no momento certo.

---

## 8. Feature Flags — Flags que o app vai consumir

O app v1.1.0 consumirá estas flags via bootstrap. O backend precisa criá-las no sistema de `feature_flags`:

| Flag Key | Descrição | Valor padrão sugerido |
|---|---|---|
| `demo_mode` | Habilita botão "Modo Demo" na Home | `true` para todos |
| `advanced_eq_beta` | EQ avançado em beta | `false` — liberar só para `founder` |
| `cloud_sync` | Sincronização de cenas/presets na nuvem (futuro) | `false` |
| `store_kit_enabled` | Habilita fluxo de compra via App Store | `false` até integração |
| `play_store_enabled` | Habilita fluxo de compra via Google Play | `false` até integração |
| `maintenance_mode` | Força banner de manutenção no app | `false` |

**Importante:** Feature flags que mudam comportamento da operação da mesa **não** serão verificadas durante sessão ativa. Apenas verificadas no startup ou na Home.

**Pergunta ao backend:** O campo `rollout_percentage` das flags é suportado desde o início? O app não precisa implementar lógica de rollout — apenas recebe o valor resolvido (`true`/`false`) e usa. O rollout é transparente para o app?

---

## 9. Mensagens Dinâmicas — Keys que o app vai consumir

O app espera mensagens com estas keys via bootstrap (`messages[]`). O backend deve cadastrar os textos correspondentes:

| Message Key | Contexto | Channel sugerido |
|---|---|---|
| `trial_active_reminder` | Trial ativo com dias restantes | `banner` |
| `trial_expired_offer` | Trial expirado, oferta de upgrade | `banner` |
| `founder_badge_info` | Usuário Founder, boas-vindas | `banner` |
| `needs_validation_warning` | Certificado próximo de vencer | `toast` |
| `maintenance_active` | Manutenção em andamento | `modal` |
| `update_recommended` | Nova versão disponível | `banner` |
| `update_required` | Atualização obrigatória (futuro) | `modal` |
| `device_limit_warning` | Próximo do limite de dispositivos | `toast` |
| `license_revoked` | Licença revogada, procurar suporte | `modal` |

**Regra:** O app **não processa templates** — o backend interpola as variáveis (`{{days_remaining}}`, `{{plan_name}}`, `{{valid_until}}`) antes de enviar. O app apenas renderiza o texto recebido como string.

**Pergunta ao backend:** Mensagens com `channel: "modal"` serão armazenadas em cache local e exibidas mesmo offline (se já estavam em cache)? Ou o app deve ignorar mensagens de modal quando offline? Sugerimos ignorar modais quando offline para não assustar o usuário sem contexto.

---

## 10. Migração Beta → Founder — Alinhamento necessário

O app v1.1.0 vai exibir badge "Founder" para usuários com `is_founder: true` e `plan: "founder"` no bootstrap.

**O que o app precisa do backend:**
- `is_founder: true` no objeto `user` do bootstrap.
- `plan: "founder"` no objeto `license` do bootstrap.
- `expires_at: null` para indicar acesso vitalício.

**Pergunta ao backend:** O script de migração de usuários beta → Founder está planejado para rodar antes do lançamento da v1.1.0 ou pode rodar depois? O app exibe o badge a partir da próxima vez que o bootstrap for chamado — sem dependência de timing específico.

---

## 11. Demo Mode — Confirmação de que é 100% Client-Side

O modo demo **não requer nenhum endpoint de backend**. É implementado inteiramente no app:

- `DemoMixerAdapter` simula comandos localmente.
- `DemoDataProvider` pré-popula estado com mesa AX32 simulada.
- Nenhum WebSocket é aberto.
- Nenhuma chamada HTTP é feita durante a sessão demo.

A feature flag `demo_mode` (via bootstrap) controla apenas a visibilidade do botão na Home. O backend não precisa implementar nada para o demo mode funcionar.

**Confirmação ao backend:** Demo mode não requer endpoint, tabela, log, nem qualquer suporte server-side. ✅

---

## 12. Pagamentos — Manutenção do Fluxo PIX Atual

O fluxo de pagamento PIX atual (`POST /api/payment/create-pix` + polling de status) deve continuar funcionando na v1.1.0. A diferença é que o app v1.1.0 acessará o fluxo de pagamento a partir do `AccountScreen` (sem precisar da mesa conectada), não mais via modal dentro do estágio `mixer`.

Não há mudança nos endpoints de pagamento para a v1.1.0. Fases posteriores adicionarão endpoints de App Store / Play Store.

**Pergunta ao backend:** O endpoint de PIX atual retorna o `license_key` ou atualiza o status diretamente? O app v1.1.0 precisará chamar o bootstrap logo após a confirmação de pagamento para obter o certificado atualizado — isso é suficiente, ou há um endpoint específico de ativação pós-pagamento?

---

## 13. Pontos em Aberto — ✅ Todos Resolvidos

| # | Questão | Decisão |
|---|---|---|
| 1 | Formato do `public_key` | **base64url sem padding** (padrão JWT/JWK). Rust: `base64::URL_SAFE_NO_PAD` → raw bytes → `ed25519_dalek::VerifyingKey` |
| 2 | `certificate.token` sempre ou só na renovação | **Só quando renovado** — `null` se `valid_until >= NOW() + 7 dias`. Threshold de renovação = 7 dias |
| 3 | Bootstrap suficiente ou precisa de `/renew` separado | **Bootstrap é o fluxo normal**; `POST /api/certificate/renew` existe como fallback explícito |
| 4 | `needs_validation` — threshold | **`valid_until < NOW() + 7 dias`** — alinhado com `REVALIDATION_WARNING_DAYS` existente |
| 5 | Token de auth | **Session cookie** mantido (v1.0.0 compat); Bearer JWT adicionado futuramente, aditivo |
| 6 | `rollout_percentage` resolvido server-side | **Sim** — app recebe apenas `true`/`false`; rollout é transparente |
| 7 | Modais offline (cache) | **Ignorar modals offline**; banners e toasts em cache são exibidos normalmente |
| 8 | Timing da migração beta → Founder | **Qualquer momento** — badge aparece no próximo bootstrap |
| 9 | `device_id` nos paths da API | **`installation_uuid`** do app (UUID v4 gerado no primeiro boot), não o `id` autoincrementado |
| 10 | `download_url` origem | **Configurado por versão no admin** ao cadastrar cada release |
| 11 | Roteamento por `X-App-Version` | **Lógica interna em cada endpoint** que muda comportamento; helper `getRequestAppVersion()` centralizado |
| 12 | `sig_v` — versões no binário | **Apenas `sig_v: 1`** no binário de lançamento; novas versões chegam via `public_key` do bootstrap |
| 13 | Heartbeat `PATCH /last-seen` body | **Body vazio aceito** — `device_id` vem da URL, timestamp gerado pelo servidor |

---

## Resumo das Dependências por Fase do App

| Fase do App | Dependências de Backend |
|---|---|
| Fase 0 — Extração interna (sem UI) | Nenhuma — refatoração puramente client-side |
| Fase 1 — Home + Account + Rotas | Endpoints existentes mantidos; `X-App-Version` aceito (sem obrigatoriedade) |
| Fase 2 — Remote Config + Flags + Version Check | `GET /api/app/bootstrap` funcional com resposta completa; tabelas `feature_flags`, `remote_messages`, `app_versions` criadas |
| Fase 3 — Demo Mode | Nenhuma — 100% client-side |
| Fase 4 — Certificado Offline | `POST /api/certificate/issue`, `POST /api/certificate/renew`, `GET /api/app/public-key`; chave Ed25519 gerada e configurada |
| Fase 5 — App Store / Play Store | Endpoints `/api/store/*` (planejados como Fase 9 no backend) |

A ordem natural sugere que **Fase 3 do backend** (certificados) deve estar pronta quando o app chegar na **Fase 4**, o que dá tempo para as Fases 1 e 2 do app rodarem sem dependência de certificado.
