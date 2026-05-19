# Handoff Tecnico - API e Admin

## 1. Objetivo

Garantir controle de licenca robusto para o app AX Controller com:

- ativacao por dispositivo
- limite por quantidade de UUIDs
- expiracao de trial/licenca
- respostas deterministicas para bloqueio no app

## 2. Contrato minimo da API de validacao

Endpoint atual consumido pelo app:

- `POST /api/license/validate.php`

Payload recebido da aplicacao:

- `license_key`
- `series`
- `device_id` (UUID/installation id)
- `device_name`
- `platform`
- `app_version`

Resposta obrigatoria da API:

- `code` (string)
- `valid` (boolean)
- `active` (boolean)
- `server_time` (UTC ISO ou datetime padronizado)
- `license.expiry_date` (datetime ou null)

Codigos esperados pelo app:

- `LICENSE_VALID`
- `LICENSE_NOT_FOUND`
- `LICENSE_INACTIVE`
- `LICENSE_EXPIRED`
- `LICENSE_SUSPENDED`
- `LICENSE_BLOCKED`
- `ACTIVATION_LIMIT_REACHED`
- `LICENSE_PENDING`

## 3. Regra de expiracao

- Se `expiry_date` for `null`: tratar como vitalicio.
- Se `expiry_date` existir e `server_time >= expiry_date`: retornar `LICENSE_EXPIRED`.
- Sempre enviar `server_time` para evitar dependencia do relogio local do cliente.

## 4. Regra de dispositivos por chave

Meta de negocio:

- maximo de 2 UUIDs ativos por licenca.

Fluxo recomendado:

1. Validar se licenca existe e esta ativa.
2. Verificar expiracao.
3. Buscar `device_id` atual para a licenca.
4. Se ja existe ativo: aprovar e atualizar `last_seen_at`.
5. Se nao existe:
   - contar dispositivos ativos da licenca
   - se count < 2: inserir e aprovar
   - se count >= 2: negar com `ACTIVATION_LIMIT_REACHED`

## 5. Modelo de dados sugerido

### 5.1 Tabela `licenses`

Campos sugeridos:

- `id`
- `license_key` (unique)
- `status` (active, inactive, suspended, blocked)
- `max_devices` (default 2)
- `expires_at` (nullable)
- `created_at`
- `updated_at`

### 5.2 Tabela `license_devices`

Campos sugeridos:

- `id`
- `license_id`
- `device_uuid`
- `device_name`
- `platform`
- `app_version`
- `is_active`
- `first_seen_at`
- `last_seen_at`
- `revoked_at` (nullable)
- `revoked_reason` (nullable)

Indices recomendados:

- unique(`license_id`, `device_uuid`)
- index(`license_id`, `is_active`)

## 6. Ajustes no Admin

Tela de licenca deve mostrar:

- status da licenca
- expiracao (`expires_at`)
- limite (`max_devices`)
- ativos (`active_devices`)

Lista de dispositivos por licenca:

- UUID
- nome do dispositivo
- plataforma
- versao app
- primeira ativacao
- ultimo check
- status ativo/revogado

Acoes administrativas:

- revogar dispositivo
- reativar dispositivo (opcional)
- alterar expiracao
- alterar limite de dispositivos (opcional)

## 7. Comportamento esperado no app apos ajustes

- primeira ativacao online obrigatoria
- cache offline respeitando expiracao
- bloqueio imediato quando API retornar codigo de rejeicao
- aviso in-app nos ultimos 5 dias antes da expiracao de revalidacao
- trial expirado bloqueia e orienta contato comercial

## 8. Recomendacoes de seguranca

- usar sempre `server_time` da API
- nao confiar apenas em dados locais do cliente
- registrar auditoria de validacoes (quem, quando, dispositivo, resultado)
- padronizar mensagens por codigo para suporte e observabilidade

## 9. Exemplo de resposta valida

```json
{
  "code": "LICENSE_VALID",
  "valid": true,
  "active": true,
  "server_time": "2026-05-18T20:30:00Z",
  "message": "Licenca valida.",
  "license": {
    "expiry_date": null
  }
}
```

## 10. Exemplo de resposta por limite de dispositivos

```json
{
  "code": "ACTIVATION_LIMIT_REACHED",
  "valid": false,
  "active": false,
  "server_time": "2026-05-18T20:30:00Z",
  "message": "Limite de ativacoes atingido.",
  "license": {
    "expiry_date": null
  }
}
```

## 11. Exemplo de resposta por expiracao

```json
{
  "code": "LICENSE_EXPIRED",
  "valid": false,
  "active": false,
  "server_time": "2026-05-18T20:30:00Z",
  "message": "Periodo de teste/licenca expirado.",
  "license": {
    "expiry_date": "2026-05-17T23:59:59Z"
  }
}
```
