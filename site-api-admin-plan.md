# Plano de Evolução — AX Control Site/Admin/API

## Contexto

O AX Control já possui um backend PHP funcional com autenticação, licenças, dispositivos, pagamento PIX via Mercado Pago e painel admin. O objetivo deste plano é evoluir esse projeto para uma arquitetura robusta que suporte planos, Founder, certificados offline assinados (.axc), controle de versão de apps, remote config, feature flags, mensagens dinâmicas e futura integração com App Store/Play Store.

**Premissa central**: a licença pertence à conta do usuário. O backend é a fonte da verdade. O app apenas consome e usa fallback local quando offline.

---

## Diagnóstico do Estado Atual

### Stack atual
- PHP puro (sem framework), procedimental + classe `Database` como wrapper MySQLi
- MySQL/MariaDB com prepared statements
- PHPMailer para e-mail
- Mercado Pago PIX (webhook + polling)
- Frontend: HTML/CSS/JS vanilla (sem React, Vue ou Blade)
- Sem ORM, sem testes automatizados, sem OpenAPI spec

### O que existe e pode ser reaproveitado

| Componente | Status | Reaproveitamento |
|---|---|---|
| `users` table | ✅ Funcional | Adicionar campos `is_founder`, `founder_granted_at` |
| `licenses` table | ✅ Funcional | Adicionar `plan`, `license_origin`, `max_devices` |
| `license_activations` table | ✅ Funcional | Renomear para `devices`; adicionar campos faltantes |
| `license_history` | ✅ Funcional | Manter como `license_events` |
| `system_logs` | ✅ Funcional | Evoluir para `admin_audit_logs` |
| `orders` + `pix_payments` | ✅ Funcional | Integrar em `payments` + `payment_events` |
| Auth (session, bcrypt, CSRF, rate limit) | ✅ Sólido | Manter, adicionar JWT para API stateless |
| Webhook Mercado Pago | ✅ Funcional | Refatorar para deduplicação idempotente |
| Admin panel (dashboard, clientes, licenças, pagamentos) | ✅ Funcional | Expandir com novas seções |
| Painel do usuário (`portal.php`) | ⚠️ Parcial | Completar com dispositivos, downloads, upgrade |
| Landing page | ✅ Funcional | Adicionar seção de planos, trial, Founder |
| `config/auth.php`, `config/functions.php` | ✅ Sólido | Manter |

### Lacunas críticas

- ❌ Nenhum sistema de certificados offline (.axc)
- ❌ Sem plano `founder`, `ax_control_plus`, `free`
- ❌ Limite de dispositivos é 2 (deve ser 3)
- ❌ `activation_count` mantido manualmente — risco de divergência
- ❌ Tags como `[TRIAL_7D]` em `notes` (coluna texto) — frágil
- ❌ Sem `app_versions` — nenhum controle de versão
- ❌ Sem `remote_configs`, `feature_flags`, `remote_messages`
- ❌ Sem endpoint `/app/bootstrap`
- ❌ Sem integração App Store / Play Store
- ❌ Sem `coupons`, `subscriptions`, `store_purchases`
- ❌ Sem visualizador de auditoria no admin
- ❌ Sem rate limiting nas APIs além de login
- ❌ `expiry_date` NOT NULL no schema mas código usa NULL — inconsistência

### Riscos técnicos

| Risco | Severidade | Mitigação |
|---|---|---|
| Webhook MP chamado múltiplas vezes libera licença duplicada | Alta | Idempotência por `mp_payment_id` (já tem índice UNIQUE) + status check antes de upgrade |
| `activation_count` divergindo da contagem real | Média | Substituir por `COUNT(*)` em queries; remover campo ou recalcular automaticamente |
| Schema `expiry_date NOT NULL` conflita com lógica | Média | Migration para `NULL` permitido + atualizar schema.sql |
| Notas como texto estruturado (`[TRIAL_7D]`) | Média | Migrar para campos reais (`plan`, `license_origin`) |
| Chave privada de certificado sem rotação | Alta | Planejar rotação + `signature_version` no certificado |
| Logs crescendo indefinidamente | Baixa | Adicionar política de retenção (90 dias) |
| Senha hardcoded no fallback de config | Alta | Remover fallback; exigir `.env` |

---

## Proposta de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        AX Control Backend                        │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │  Site/Portal │  │ Admin Panel │  │       REST API           │ │
│  │ (PHP/HTML)  │  │ (PHP/HTML)  │  │  /api/* (JSON)           │ │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Core Services (PHP)                       │ │
│  │  AuthService │ LicenseService │ DeviceService               │ │
│  │  CertificateService │ PaymentService │ VersionService        │ │
│  │  BootstrapService │ ConfigService │ FlagService              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    MySQL/MariaDB                             │ │
│  │  users │ licenses │ devices │ issued_certificates           │ │
│  │  payments │ payment_events │ store_purchases                │ │
│  │  app_versions │ remote_configs │ feature_flags              │ │
│  │  remote_messages │ admin_audit_logs │ coupons               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

App (Tauri/Android/iOS) ──► /api/app/bootstrap (autenticado)
                         ──► /api/license/renew-certificate
                         ──► /api/app/version-check
                         (offline: valida .axc localmente com chave pública)
```

---

## Modelo de Dados Completo

### Tabela `users` (evoluir existente)

```sql
ALTER TABLE users
  ADD COLUMN is_founder TINYINT(1) NOT NULL DEFAULT 0 AFTER role,
  ADD COLUMN founder_granted_at TIMESTAMP NULL AFTER is_founder,
  ADD COLUMN email_verified_at TIMESTAMP NULL AFTER founder_granted_at;
```

### Tabela `licenses` (evoluir existente)

```sql
-- Substituir campo de notas por campos estruturados
ALTER TABLE licenses
  ADD COLUMN plan ENUM('free','trial','founder','ax_control_plus') NOT NULL DEFAULT 'free' AFTER license_type,
  ADD COLUMN license_origin ENUM('beta_founder','mercado_pago','app_store','play_store','admin_grant','coupon') NULL AFTER plan,
  ADD COLUMN max_devices INT NOT NULL DEFAULT 3 AFTER max_activations,
  ADD COLUMN trial_started_at TIMESTAMP NULL AFTER activated_at,
  ADD COLUMN trial_expires_at TIMESTAMP NULL AFTER trial_started_at,
  ADD COLUMN trial_extended_at TIMESTAMP NULL AFTER trial_expires_at,
  ADD COLUMN trial_extension_days INT DEFAULT 0 AFTER trial_extended_at,
  MODIFY COLUMN expiry_date TIMESTAMP NULL DEFAULT NULL;
  -- activation_count se torna coluna calculada ou removida; usar COUNT(*) em queries
```

### Tabela `devices` (substitui/evolui `license_activations`)

```sql
CREATE TABLE devices (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id     VARCHAR(255) NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  license_id    BIGINT UNSIGNED NOT NULL,
  platform      ENUM('android','ios','windows','macos','linux') NOT NULL,
  app_version   VARCHAR(20) NULL,
  build_number  VARCHAR(20) NULL,
  device_name   VARCHAR(255) NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  TIMESTAMP NULL,
  last_validation_at TIMESTAMP NULL,
  status        ENUM('active','removed','revoked','expired') NOT NULL DEFAULT 'active',
  revoked_at    TIMESTAMP NULL,
  revoked_by    BIGINT UNSIGNED NULL,   -- admin user_id
  revoke_reason VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_device_license (device_id, license_id),
  INDEX idx_license   (license_id),
  INDEX idx_user      (user_id),
  INDEX idx_status    (status),
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `issued_certificates`

```sql
CREATE TABLE issued_certificates (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  certificate_id   VARCHAR(36) NOT NULL UNIQUE,  -- UUID v4
  user_id          BIGINT UNSIGNED NOT NULL,
  license_id       BIGINT UNSIGNED NOT NULL,
  device_id        VARCHAR(255) NOT NULL,
  plan             ENUM('free','trial','founder','ax_control_plus') NOT NULL,
  issued_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until      TIMESTAMP NOT NULL,
  revoked_at       TIMESTAMP NULL,
  revoked_reason   VARCHAR(255) NULL,
  signature_version TINYINT UNSIGNED NOT NULL DEFAULT 1,
  payload_hash     CHAR(64) NOT NULL,   -- SHA256 do payload para auditoria
  status           ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device        (device_id),
  INDEX idx_license       (license_id),
  INDEX idx_status        (status),
  INDEX idx_valid_until   (valid_until),
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `payments` (substitui/consolida `orders` + `pix_payments`)

```sql
CREATE TABLE payments (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_ref      VARCHAR(32) NOT NULL UNIQUE,  -- AX-{8hex}
  user_id          BIGINT UNSIGNED NULL,
  license_id       BIGINT UNSIGNED NULL,
  amount           DECIMAL(10,2) NOT NULL,
  currency         CHAR(3) NOT NULL DEFAULT 'BRL',
  description      VARCHAR(255) NULL,
  payment_method   ENUM('pix','credit_card','boleto','app_store','play_store','admin_grant') NOT NULL,
  payment_provider ENUM('mercado_pago','app_store','play_store','manual') NOT NULL,
  provider_payment_id VARCHAR(255) NULL,   -- mp_payment_id / apple transaction / google order
  status           ENUM('pending','approved','rejected','refunded','chargeback','cancelled') NOT NULL DEFAULT 'pending',
  plan_purchased   ENUM('founder','ax_control_plus') NULL,
  billing_period   ENUM('lifetime','monthly','annual') NULL,
  approved_at      TIMESTAMP NULL,
  expires_at       TIMESTAMP NULL,  -- para PIX expirar QR code
  qr_code          TEXT NULL,
  qr_code_base64   MEDIUMTEXT NULL,
  provider_payload LONGTEXT NULL,   -- JSON raw da resposta do provider
  notes            TEXT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user     (user_id),
  INDEX idx_license  (license_id),
  INDEX idx_status   (status),
  INDEX idx_provider (provider_payment_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `payment_events`

```sql
CREATE TABLE payment_events (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id  BIGINT UNSIGNED NOT NULL,
  event_type  VARCHAR(60) NOT NULL,  -- webhook_received, status_changed, license_upgraded
  old_status  VARCHAR(30) NULL,
  new_status  VARCHAR(30) NULL,
  payload     LONGTEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment (payment_id),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `store_purchases`

```sql
CREATE TABLE store_purchases (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT UNSIGNED NOT NULL,
  license_id          BIGINT UNSIGNED NULL,
  store               ENUM('app_store','play_store') NOT NULL,
  product_id          VARCHAR(100) NOT NULL,   -- com.ax.axcontrol.pro_lifetime
  transaction_id      VARCHAR(255) NOT NULL,
  original_transaction_id VARCHAR(255) NULL,   -- Apple renewal chain
  purchase_token      TEXT NULL,               -- Google Play
  receipt_data        LONGTEXT NULL,           -- Apple base64 receipt
  plan                ENUM('founder','ax_control_plus') NOT NULL,
  billing_period      ENUM('lifetime','monthly','annual') NOT NULL,
  status              ENUM('active','cancelled','expired','refunded','pending') NOT NULL DEFAULT 'active',
  purchased_at        TIMESTAMP NOT NULL,
  expires_at          TIMESTAMP NULL,
  cancelled_at        TIMESTAMP NULL,
  refunded_at         TIMESTAMP NULL,
  last_verified_at    TIMESTAMP NULL,
  server_notification LONGTEXT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_transaction (store, transaction_id),
  INDEX idx_user    (user_id),
  INDEX idx_license (license_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `app_versions`

```sql
CREATE TABLE app_versions (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  platform             ENUM('android','ios','windows','macos') NOT NULL,
  version              VARCHAR(20) NOT NULL,    -- 1.2.3
  build_number         VARCHAR(20) NOT NULL,
  status               ENUM('active','deprecated','blocked') NOT NULL DEFAULT 'active',
  is_latest            TINYINT(1) NOT NULL DEFAULT 0,
  min_supported_version VARCHAR(20) NULL,
  update_type          ENUM('none','optional','recommended','required') NOT NULL DEFAULT 'none',
  download_url         VARCHAR(500) NULL,
  release_notes        TEXT NULL,
  release_notes_en     TEXT NULL,
  created_by           BIGINT UNSIGNED NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_platform_version (platform, version),
  INDEX idx_platform   (platform),
  INDEX idx_is_latest  (is_latest),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `remote_configs`

```sql
CREATE TABLE remote_configs (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  config_key       VARCHAR(100) NOT NULL,
  scope            ENUM('app','site','admin','all') NOT NULL DEFAULT 'app',
  environment      ENUM('dev','staging','production','all') NOT NULL DEFAULT 'production',
  platform         VARCHAR(50) NULL,   -- JSON array: ["android","ios"] ou NULL para todos
  min_version      VARCHAR(20) NULL,
  max_version      VARCHAR(20) NULL,
  payload          LONGTEXT NOT NULL,  -- JSON
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  priority         SMALLINT NOT NULL DEFAULT 0,  -- maior = ganha em conflito
  starts_at        TIMESTAMP NULL,
  ends_at          TIMESTAMP NULL,
  created_by       BIGINT UNSIGNED NULL,
  updated_by       BIGINT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key    (config_key),
  INDEX idx_scope  (scope),
  INDEX idx_status (status),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `feature_flags`

```sql
CREATE TABLE feature_flags (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  flag_key            VARCHAR(100) NOT NULL UNIQUE,
  description         VARCHAR(255) NULL,
  enabled             TINYINT(1) NOT NULL DEFAULT 0,
  rollout_percentage  TINYINT UNSIGNED NOT NULL DEFAULT 100,  -- 0-100
  target_platforms    JSON NULL,   -- ["android","ios"]
  target_plans        JSON NULL,   -- ["founder","ax_control_plus"]
  target_roles        JSON NULL,   -- ["admin","user"]
  target_user_ids     JSON NULL,   -- [1,2,42]
  target_versions     JSON NULL,   -- {"min":"1.2.0","max":"2.0.0"}
  fallback_value      TINYINT(1) NOT NULL DEFAULT 0,
  starts_at           TIMESTAMP NULL,
  ends_at             TIMESTAMP NULL,
  created_by          BIGINT UNSIGNED NULL,
  updated_by          BIGINT UNSIGNED NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `remote_messages`

```sql
CREATE TABLE remote_messages (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_key      VARCHAR(100) NOT NULL,
  locale           CHAR(5) NOT NULL DEFAULT 'pt-BR',
  title            VARCHAR(255) NULL,
  body             TEXT NOT NULL,
  cta_label        VARCHAR(100) NULL,
  cta_url          VARCHAR(500) NULL,
  severity         ENUM('info','warning','error','critical') NOT NULL DEFAULT 'info',
  channel          ENUM('toast','modal','banner','inline') NOT NULL DEFAULT 'toast',
  target_context   VARCHAR(60) NULL,   -- license, payment, update, maintenance, demo, onboarding
  target_platforms JSON NULL,
  target_plans     JSON NULL,
  target_roles     JSON NULL,
  target_versions  JSON NULL,          -- {"min":"1.0.0","max":"2.0.0"}
  active           TINYINT(1) NOT NULL DEFAULT 1,
  priority         SMALLINT NOT NULL DEFAULT 0,
  starts_at        TIMESTAMP NULL,
  ends_at          TIMESTAMP NULL,
  created_by       BIGINT UNSIGNED NULL,
  updated_by       BIGINT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key    (message_key),
  INDEX idx_locale (locale),
  INDEX idx_active (active),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `admin_audit_logs`

```sql
CREATE TABLE admin_audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action        VARCHAR(100) NOT NULL,   -- user.plan_changed, device.revoked, flag.enabled
  entity_type   VARCHAR(60) NOT NULL,    -- user, license, device, certificate, flag, config, message
  entity_id     VARCHAR(36) NOT NULL,    -- PK ou UUID do registro alterado
  old_value     LONGTEXT NULL,           -- JSON snapshot anterior
  new_value     LONGTEXT NULL,           -- JSON snapshot novo
  reason        VARCHAR(255) NULL,
  ip_address    VARCHAR(45) NULL,
  user_agent    VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin   (admin_user_id),
  INDEX idx_entity  (entity_type, entity_id),
  INDEX idx_action  (action),
  INDEX idx_created (created_at),
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `coupons`

```sql
CREATE TABLE coupons (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30) NOT NULL UNIQUE,
  description     VARCHAR(255) NULL,
  plan            ENUM('trial','founder','ax_control_plus') NOT NULL,
  discount_type   ENUM('percent','fixed','free') NOT NULL DEFAULT 'free',
  discount_value  DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses        INT NULL,   -- NULL = ilimitado
  uses_count      INT NOT NULL DEFAULT 0,
  valid_from      TIMESTAMP NULL,
  valid_until     TIMESTAMP NULL,
  status          ENUM('active','inactive','exhausted') NOT NULL DEFAULT 'active',
  created_by      BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Tabela `license_events` (evolui `license_history`)

```sql
-- Manter license_history existente; criar license_events como alias semântico via migration
-- ou renomear e adaptar referências
ALTER TABLE license_history RENAME TO license_events;
ALTER TABLE license_events ADD COLUMN metadata JSON NULL AFTER notes;
```

---

## Certificado Offline .axc

### Formato recomendado: JWT compacto assinado (JWS)

**Algoritmo**: Ed25519 (EdDSA) — chave menor (32 bytes), mais rápido que RSA, seguro.  
Alternativa compatível com OpenSSL antigo: RS256 (RSA 2048).  
**Recomendação final**: Ed25519 com a lib `firebase/php-jwt` (suporta EdDSA desde v6.3).

**Payload do certificado** (claims JWT):
```json
{
  "jti":  "uuid-v4-do-certificado",
  "sub":  "user_id",
  "lid":  "license_id",
  "did":  "device_id",
  "plan": "ax_control_plus",
  "role": "user",
  "perms": ["operate_table","download_app","use_cloud"],
  "max_devices": 3,
  "sig_v": 1,
  "iat":  1718400000,
  "exp":  1721000000
}
```

**Header**: `{ "alg": "EdDSA", "typ": "AXC" }`  
**Extensão do arquivo**: `.axc` (é um JWT compacto = string `header.payload.signature`)

**Chave privada**: armazenada em `AX_CERT_PRIVATE_KEY` no `.env` (base64 encoded). Nunca no banco.  
**Chave pública**: distribuída com o app e também disponível em `GET /api/app/public-key`.

**Rotação de chaves**:
- `signature_version` (campo `sig_v`) permite múltiplas chaves ativas simultaneamente
- Backend mantém map `sig_v → chave_publica` — todas as versões ativas podem validar
- App embarca a(s) chave(s) pública(s) e sempre baixa a mais recente no `/app/bootstrap`
- Rotação: incrementar `sig_v`, adicionar nova chave no env, manter antiga até todos certificados expirarem (30 dias)

**Endpoints de certificados**:

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/certificate/issue` | Emite certificado para device autenticado |
| POST | `/api/certificate/renew` | Renova certificado (valida device ativo) |
| POST | `/api/certificate/revoke` | Admin: revoga certificado por device/license |
| GET  | `/api/certificate/list` | Admin/user: lista certificados emitidos |
| GET  | `/api/app/public-key` | Retorna chave pública atual (sem auth) |

**Regras**:
- `issue` e `renew` verificam `devices.status = 'active'` antes de gerar
- Dispositivo `removed` ou `revoked` → API retorna `403 DEVICE_NOT_ELIGIBLE`
- `valid_until = NOW() + 30 dias`
- Ao renovar, o certificado anterior é marcado como `expired` na tabela

---

## Endpoints da API

### Auth
```
POST /api/auth/register          -- signup + trial opcional
POST /api/auth/login             -- login + retorna license_status
POST /api/auth/logout
GET  /api/auth/me                -- perfil + license resumida
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Licenças
```
GET  /api/license/current        -- licença ativa do usuário autenticado
POST /api/license/validate       -- valida + registra device (existente, evoluir)
POST /api/license/activate-trial -- ativa trial (se ainda não iniciado)
POST /api/license/upgrade        -- inicia upgrade (retorna checkout URL/data)
GET  /api/license/entitlements   -- permissões resolvidas para o plano atual
```

### Dispositivos
```
POST /api/devices/register       -- registra device (cria ou atualiza last_seen)
GET  /api/devices                -- lista devices da licença autenticada
DELETE /api/devices/{device_id}  -- usuário remove device
GET  /api/devices/{device_id}    -- status de um device específico
PATCH /api/devices/{device_id}/last-seen  -- atualiza last_seen_at silenciosamente
```

### Certificados
```
POST /api/certificate/issue      -- emite .axc para device
POST /api/certificate/renew      -- renova .axc (device ativo)
GET  /api/app/public-key         -- chave pública para validação offline
```

### Pagamentos (Mercado Pago)
```
POST /api/payment/create-pix     -- cria pagamento PIX (existente)
GET  /api/payment/status         -- status do pagamento (existente)
POST /api/payment/webhook/mercadopago  -- webhook (existente, refatorar)
GET  /api/payment/history        -- histórico do usuário autenticado
```

### Lojas (futuro)
```
POST /api/store/apple/validate-receipt    -- valida App Store receipt
POST /api/store/apple/server-notification -- APNS server notifications
POST /api/store/google/validate-token     -- valida Play Store purchase token
POST /api/store/google/rtdn               -- Real-Time Developer Notifications
POST /api/store/restore                   -- restaura compras por user
```

### Versões do App
```
GET  /api/app/version-check              -- verifica versão + update_type
```

### Bootstrap / Config
```
GET  /api/app/bootstrap                  -- chamada única ao abrir o app
GET  /api/app/config                     -- remote configs resolvidos
GET  /api/app/feature-flags              -- flags resolvidas para o contexto
GET  /api/app/messages                   -- mensagens dinâmicas para o contexto
```

### Admin
```
GET    /api/admin/users                  -- listar usuários (filtros)
GET    /api/admin/users/{id}             -- detalhes + license + devices
PATCH  /api/admin/users/{id}/plan        -- alterar plano
PATCH  /api/admin/users/{id}/founder     -- marcar/desmarcar Founder
PATCH  /api/admin/users/{id}/trial       -- estender trial

GET    /api/admin/licenses               -- listar licenças
POST   /api/admin/licenses               -- criar licença manual
PATCH  /api/admin/licenses/{id}          -- editar licença
DELETE /api/admin/licenses/{id}/revoke   -- revogar licença

GET    /api/admin/devices                -- listar devices (filtros)
DELETE /api/admin/devices/{id}           -- remover device
POST   /api/admin/devices/{id}/revoke    -- revogar device
POST   /api/admin/devices/{id}/reset     -- resetar limite

GET    /api/admin/certificates           -- listar certificados
POST   /api/admin/certificates/{id}/revoke  -- revogar renovação

GET    /api/admin/payments               -- listar pagamentos
PATCH  /api/admin/payments/{id}          -- atualizar status/notas

GET    /api/admin/app-versions           -- listar versões
POST   /api/admin/app-versions           -- cadastrar versão
PATCH  /api/admin/app-versions/{id}      -- editar versão
PATCH  /api/admin/app-versions/{id}/set-latest  -- marcar como latest

GET    /api/admin/remote-configs         -- listar configs
POST   /api/admin/remote-configs         -- criar config
PATCH  /api/admin/remote-configs/{id}    -- editar config

GET    /api/admin/feature-flags          -- listar flags
POST   /api/admin/feature-flags          -- criar flag
PATCH  /api/admin/feature-flags/{id}     -- editar flag

GET    /api/admin/remote-messages        -- listar mensagens
POST   /api/admin/remote-messages        -- criar mensagem
PATCH  /api/admin/remote-messages/{id}   -- editar mensagem

GET    /api/admin/audit-logs             -- logs de auditoria
```

---

## Fluxo de Bootstrap (recomendação: endpoint único)

**Recomendação**: usar `/api/app/bootstrap` como chamada principal ao abrir o app, combinado com TTL de cache local (5 minutos). Endpoints separados existem para atualizações pontuais.

**Razão**: reduz latência no startup; o app já tem conexão aberta para `/api/certificate/renew`; uma chamada = uma resposta completa.

**Response de `/api/app/bootstrap`**:
```json
{
  "user": { "id": 1, "name": "João", "email": "...", "is_founder": true },
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
    "token": "eyJ..."   -- novo .axc se renovado
  },
  "version": {
    "update_type": "recommended",
    "latest_version": "1.3.0",
    "download_url": "https://...",
    "message": "Nova versão disponível com melhorias de performance"
  },
  "feature_flags": {
    "cloud_sync": true,
    "ai_assistant": false,
    "advanced_presets": true
  },
  "messages": [
    {
      "key": "founder_badge_info",
      "title": "Você é Founder!",
      "body": "Obrigado por apoiar o AX Control desde o início. Seu acesso vitalício está ativo.",
      "severity": "info",
      "channel": "banner",
      "cta_label": null,
      "cta_url": null
    },
    {
      "key": "trial_active_reminder",
      "title": "Trial ativo — {{days_remaining}} dias restantes",
      "body": "Você está testando o AX Control+ completo. Assine para manter o acesso após o período.",
      "severity": "info",
      "channel": "banner",
      "cta_label": "Assinar agora",
      "cta_url": "https://axcontrol.com.br/upgrade"
    }
  ],
  "support": {
    "whatsapp_url": "https://wa.me/...",
    "email": "suporte@axcontrol.com.br",
    "docs_url": "https://docs.axcontrol.com.br"
  },
  "maintenance": {
    "active": false,
    "message": null
  },
  "public_key": "base64-ed25519-public-key",
  "server_time": "2026-06-15T12:00:00Z"
}
```

**Interpolação de mensagens**: `{{days_remaining}}`, `{{plan_name}}`, `{{valid_until}}` — processadas no backend antes do envio, nunca HTML raw.

---

## Hierarquia de Planos

| Plano | Acesso | Dispositivos | Duração |
|---|---|---|---|
| `free` | Ações limitadas no app (operar mesa de forma básica) | 1 | Indefinido |
| `trial` | AX Control+ completo por 7 dias para avaliação | 1 | 7 dias |
| `ax_control_plus` | Recursos avançados completos, serviços atuais e futuros | 3 | Enquanto pago |
| `founder` | AX Control+ vitalício, badge especial | 3 | Vitalício |

**Free**: não é bloqueio total. O usuário continua usando o app com as funcionalidades básicas da mesa. O que fica restrito são recursos avançados do AX Control+ (definidos via entitlements/feature flags por plano).

**Trial**: janela de 7 dias com acesso AX Control+ completo para avaliar. Ao expirar, o plano volta automaticamente para `free` — sem cobrar, sem bloquear, apenas restringe os recursos avançados até o usuário assinar.

**Demo mode**: feature exclusivamente in-app para demonstrar o funcionamento da mesa. Não requer controle remoto no backend. O app gerencia isso localmente.

## Fluxo de Planos e Licenças

```
Novo usuário
    │
    ├─► Registro → plan='free' por padrão
    │                  │
    │                  └─► Ativa trial → plan='trial', trial_started_at=NOW(), trial_expires_at=+7d
    │                                         │
    │                                         ├─► 7 dias passam → plan='free' (volta, não bloqueia)
    │                                         └─► Paga durante trial → plan='ax_control_plus'
    │
    ├─► Após pagamento confirmado (webhook MP) → plan='ax_control_plus', origin='mercado_pago'
    │
    ├─► Admin marca Founder → users.is_founder=1, license.plan='founder', origin='beta_founder'
    │
    └─► Cupom → plan conforme cupom, origin='coupon'

Regras de dispositivos:
  - free / trial: max 1 device
  - founder / ax_control_plus: max 3 devices
  - admin_grant: max definido pelo admin (padrão 3)

Ativação do 4º device (em planos com limite 3):
  - API retorna HTTP 409 com code='MAX_DEVICES_REACHED'
  - Payload inclui lista de devices ativos para o usuário escolher qual remover
  - Usuário remove via DELETE /api/devices/{device_id}
  - Tenta novamente POST /api/devices/register
```

**Status da API para licença** (compatível com existente, expandido):
```
free               → plano free, acesso limitado
trial_active       → trial válido, acesso AX Control+ completo por N dias restantes
trial_expired      → trial vencido, voltou ao free — mostrar oferta de upgrade
licensed           → plano ativo pago (ax_control_plus ou founder)
needs_validation   → certificado próximo de vencer, precisa ir online
revoked            → licença revogada pelo admin
max_devices_reached → limite atingido (retorna lista de devices para escolha)
```

---

## Plano de Migração dos Usuários Beta → Founder

### Script de migração (executar via admin ou CLI)

```
1. Identificar usuários com pagamento real registrado (orders.status='paid' ou pix_payments.status='approved')
   E licença do tipo 'purchased' criada antes de [data_corte_beta]

2. Para cada usuário identificado:
   - Definir users.is_founder = 1, founder_granted_at = NOW()
   - Definir licenses.plan = 'founder', license_origin = 'beta_founder'
   - Definir licenses.max_devices = 3
   - Definir licenses.expiry_date = NULL (vitalício)
   - Inserir em license_events: action='founder_migration'
   - Inserir em admin_audit_logs: action='license.founder_migration'

3. Enviar e-mail de boas-vindas como Founder (PHPMailer existente)

4. Admin valida lista antes de confirmar execução
```

**Critério de segurança**: migração só é executada por admin autenticado. Resultado é auditado linha a linha.

---

## Fluxo de Versionamento dos Apps

```
Admin cadastra versão no painel:
  platform=windows, version=1.3.0, status=active, is_latest=true,
  update_type=recommended, download_url=https://cdn.axcontrol.com/AXControl-1.3.0.exe

App abre → GET /api/app/version-check?platform=windows&version=1.2.0&build_number=42

Backend:
  1. Busca latest version para platform
  2. Compara com versão enviada pelo app
  3. Checa min_supported_version
  4. Retorna update_type conforme configuração

Response:
  { update_type: "recommended", latest_version: "1.3.0", download_url: "...", message: "..." }

Fase beta (agora):
  - Nunca retornar update_type=required (não bloquear)
  - Registrar device.app_version na tabela devices para visibilidade admin
  
Futuramente:
  - Versões com status=blocked → update_type=required
  - Admin bloqueia versões com vulnerabilidades
```

---

## Fluxo de Remote Config / Feature Flags / Mensagens

```
Admin cria flag: key='ai_assistant', enabled=true, target_plans=['ax_control_plus']

App chama GET /api/app/bootstrap (ou GET /api/app/feature-flags)

Backend resolve flags:
  1. Busca todas flags ativas dentro de starts_at/ends_at
  2. Filtra por platform, plan, role, user_id, version
  3. Aplica rollout_percentage (hash de user_id para determinismo)
  4. Retorna map key→bool

App:
  - Guarda em localStorage/storage como fallback
  - Usa flag para habilitar/desabilitar feature
  - Feature flags críticas: não mudar durante sessão ativa (verificar só no startup)

Mensagens:
  - Backend filtra por target_context, platform, plan, locale
  - Interpola variáveis {{days_remaining}} antes de enviar
  - App renderiza por channel (toast, modal, banner, inline)
  - Nunca renderiza HTML raw — apenas texto com interpolação controlada
```

---

## Segurança

| Aspecto | Abordagem |
|---|---|
| Autenticação API app | Bearer token JWT (stateless) ou session existente |
| Autorização admin | Role='admin' na session + `admin_audit_logs` em toda ação |
| Rate limiting | Implementar por IP em `/api/*` além do login (5 req/s por IP) |
| Certificados | Ed25519, chave privada em env var, nunca no banco |
| Rotação de chaves | `sig_v` no certificado, map de versões de chave pública |
| Webhook Mercado Pago | Token HMAC + idempotência por `mp_payment_id` único |
| Webhook Apple/Google | Validação de assinatura conforme documentação oficial |
| Deduplicação pagamentos | `UNIQUE KEY` em `provider_payment_id`; verificar status antes de upgrade |
| Remote config segura | Sem HTML bruto; interpolação controlada server-side |
| Feature flags críticas | Não ler mid-session; só aplicar no próximo startup |
| LGPD | Coletar apenas dados necessários; `phone` opcional; exportação/deleção de conta |
| Logs | Retenção de 90 dias para system_logs; `admin_audit_logs` permanente |
| Anti-abuso trial | Associar trial ao e-mail verificado + device_id; 1 trial por e-mail |
| Offline seguro | App nunca executa `eval()` ou renderiza HTML de config remota |
| Secrets | Remover fallback de senha hardcoded; exigir `.env` válido em produção |

---

## Compatibilidade com App v1.0.0

Usuários que não atualizarem para v1.1.0 **não serão impactados** pelas mudanças de backend nas Fases 1–6, desde que a estratégia abaixo seja seguida:

| Mudança | Impacto na v1.0.0 | Estratégia |
|---|---|---|
| Migrations de schema (adicionar colunas) | Nenhum — server-side | Apenas ALTER TABLE ADD COLUMN, nunca DROP |
| Novos endpoints (`/bootstrap`, `/certificate/*`) | Nenhum — v1.0.0 não chama | Coexistem com endpoints antigos |
| Aumento do limite de devices 2→3 | Positivo | Nenhuma ação especial |
| Novos status codes (`free`, `licensed`) | Potencial quebra | Usar `app_version` da request para retornar contrato antigo se versão < 1.1.0 |
| Plano "free" após trial expirar | Requer v1.1.0 | v1.0.0 continua recebendo `TRIAL_EXPIRED` e bloqueia como hoje — comportamento sem regressão |
| Certificados .axc | Invisível para v1.0.0 | v1.0.0 continua validando online normalmente |
| Remote config / feature flags | Invisível para v1.0.0 | v1.0.0 não chama esses endpoints |

**Regra de ouro**: todos os endpoints existentes (`/api/license/validate.php`, `/api/license/status.php`, etc.) devem manter seus contratos de resposta atuais. Novos comportamentos entram em endpoints novos ou gateados por `app_version`.

---

## Plano de Implementação por Fases

### Fase 1 — Schema e Fundação (1 semana)
**Prioridade máxima. Sem isso nada mais funciona.**
1. Migration: evoluir `users` (`is_founder`, `founder_granted_at`)
2. Migration: evoluir `licenses` (`plan`, `license_origin`, `max_devices`, `trial_started_at`, `trial_expires_at`, corrigir `expiry_date NULL`)
3. Migration: criar tabela `devices` (substitui `license_activations` com campos novos)
4. Migration: criar `issued_certificates`
5. Migration: criar `payments` (consolidar `orders` + `pix_payments`)
6. Migration: criar `payment_events`
7. Migration: criar `admin_audit_logs`
8. Migration: renomear `license_history` → `license_events` + adicionar `metadata`
9. Remover fallback de senha hardcoded
10. Corrigir `activation_count`: substituir por `COUNT(*)` dinâmico em todas as queries

### Fase 2 — Planos, Founder e Dispositivos (1 semana)
11. Implementar hierarquia de planos: free → trial (7d AX Control+) → ax_control_plus / founder
12. Atualizar limite de dispositivos para 3 (ax_control_plus/founder)
13. Evoluir endpoint de registro de device para tabela `devices` nova
14. Implementar endpoint `DELETE /api/devices/{device_id}` (remoção pelo usuário)
15. Resposta `MAX_DEVICES_REACHED` com lista de devices para escolha
16. Script de migração beta → Founder (com validação admin antes de executar)
17. Admin: atualizar UI de dispositivos para novos campos

### Fase 3 — Certificados Offline .axc (1 semana)
18. Instalar `firebase/php-jwt` (suporte EdDSA)
19. Gerar par de chaves Ed25519, configurar em `.env`
20. Implementar `POST /api/certificate/issue`
21. Implementar `POST /api/certificate/renew`
22. Implementar `GET /api/app/public-key`
23. Integrar renovação automática no fluxo de validate/bootstrap
24. Admin: visualização de certificados emitidos e revogação

### Fase 4 — Controle de Versão dos Apps (3 dias)
25. Criar tabela `app_versions`
26. Implementar `GET /api/app/version-check`
27. Admin: UI para cadastrar/editar versões por plataforma
28. Registrar `app_version` e `build_number` na tabela `devices` em cada validação

### Fase 5 — Bootstrap e Config Remota (1 semana)
29. Criar tabelas `remote_configs`, `feature_flags`, `remote_messages`
30. Implementar `GET /api/app/bootstrap` (endpoint unificado)
31. Implementar `GET /api/app/config`, `GET /api/app/feature-flags`, `GET /api/app/messages`
32. Lógica de resolução de flags por contexto (plan, platform, rollout_percentage)
33. Interpolação server-side de variáveis nas mensagens
34. Admin: UI para gerenciar configs, flags e mensagens com auditoria

### Fase 6 — Pagamentos e Webhook (3 dias)
35. Migrar `pix_payments` + `orders` para tabela `payments` unificada
36. Refatorar webhook Mercado Pago para usar nova tabela + idempotência forte
37. Adicionar `payment_events` para log de cada mudança de status
38. Implementar `GET /api/payment/history` para o usuário
39. Admin: visualização de payment_events por pagamento

### Fase 7 — Site e Portal do Usuário (1 semana)
40. Página de planos e preços
41. Fluxo de upgrade direto no site (criar PIX, exibir QR, polling)
42. Portal: exibir licença, plano, status Founder
43. Portal: listar e remover devices
44. Portal: baixar app com links por plataforma + versão mais recente
45. Portal: histórico de pagamentos
46. Portal: mensagens de status vindas do backend
47. Área de suporte com links configuráveis via remote_config

### Fase 8 — Admin Avançado e Auditoria (3 dias)
48. UI admin: log de auditoria com filtros (quem, quando, entidade, antes/depois)
49. UI admin: gestão de coupons
50. Rate limiting nas APIs públicas (por IP, além do login)
51. Exportação CSV de users/licenses para o admin

### Fase 9 — App Store / Play Store (futuro, após lançamento)
52. Implementar `POST /api/store/apple/validate-receipt`
53. Implementar `POST /api/store/apple/server-notification`
54. Implementar `POST /api/store/google/validate-token`
55. Implementar `POST /api/store/google/rtdn`
56. Implementar `POST /api/store/restore`
57. Criar tabela `store_purchases`
58. Mapear produtos: `ax_control.pro_lifetime`, `ax_control.plus_monthly`, `ax_control.plus_annual`

---

## Checklist de Testes

### Licenças e planos
- [ ] Novo usuário cria trial de 7 dias
- [ ] Trial expira corretamente após 7 dias
- [ ] Pagamento PIX → webhook → plan upgradado para `ax_control_plus`
- [ ] Admin marca Founder → plan vira `founder`, vitalício
- [ ] Admin estende trial → nova data de expiração

### Dispositivos
- [ ] 1º device registrado: OK
- [ ] 2º device registrado: OK
- [ ] 3º device registrado: OK
- [ ] 4º device → `MAX_DEVICES_REACHED` com lista de devices
- [ ] Usuário remove device → 4º device passa a ser aceito
- [ ] Device `revoked` → não consegue renovar certificado
- [ ] Device offline → certificado válido até `valid_until`

### Certificados
- [ ] App online → emite .axc com `valid_until = +30 dias`
- [ ] App valida .axc localmente com chave pública (sem internet)
- [ ] App abre depois de 29 dias → renova .axc automaticamente
- [ ] Device removido → API nega renovação do .axc
- [ ] .axc expirado + app offline → app bloqueia acesso

### Versões
- [ ] `version-check` retorna `update_type=none` para versão atual
- [ ] `version-check` retorna `recommended` para versão antiga
- [ ] `version-check` nunca retorna `required` durante beta
- [ ] Admin cadastra nova versão → app recebe `recommended`

### Remote config e flags
- [ ] Flag `demo_mode=true` para plano `trial` → app exibe modo demo
- [ ] Mensagem de trial expirado aparece no contexto correto
- [ ] Interpolação `{{days_remaining}}` funciona corretamente
- [ ] Alteração de flag pelo admin → reflete no próximo bootstrap

### Pagamentos
- [ ] Webhook duplicado do Mercado Pago não duplica upgrade
- [ ] Webhook com status `rejected` → licença não é liberada
- [ ] Pagamento `approved` após atraso (retry) → licença atualizada corretamente

### Segurança
- [ ] Endpoint admin bloqueado para role `user`
- [ ] CSRF token inválido → 403
- [ ] Rate limit login: 6ª tentativa → bloqueio
- [ ] Certificado com `sig_v` desconhecido → app rejeita
- [ ] Remote config com HTML → nunca renderizado

---

## Ordem Ideal de Implementação

```
Fase 1 (schema)  →  Fase 2 (planos/devices)  →  Fase 3 (certificados)
     ↓
Fase 4 (versões)  →  Fase 5 (bootstrap/config)  →  Fase 6 (pagamentos)
     ↓
Fase 7 (site)  →  Fase 8 (admin avançado)  →  Fase 9 (lojas, futuro)
```

**Itens de maior risco que devem ser resolvidos primeiro**:
1. Correção do `activation_count` (risco de divergência em produção)
2. Schema `expiry_date NULL` (risco de erro de inserção)
3. Certificado offline .axc (fundação do modelo de licença offline)
4. Idempotência do webhook de pagamento (risco financeiro)
