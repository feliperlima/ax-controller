# Target Architecture (documentation only)

## Objetivo
Definir uma arquitetura futura mais modular sem implementar nada agora.

## Camadas propostas

### UI
- Componentes React puros e views.
- Sem envio direto de payload WS.
- Interage apenas com camada de features/use-cases.

### Features
- Casos de uso por dominio funcional:
  - channels
  - sends
  - links
  - fx
  - groups
  - scenes
  - patching
  - licensing
- Responsavel por orquestrar intents de UI e chamar domain/protocol.

### Domain
- Regras de negocio e modelos canonicos:
  - estados de strip, sends, grupo, link, cena, licenca.
- Nenhuma dependencia de React/Tauri.

### Profiles
- Catalogo de capabilities e mapas por modelo.
- Separar claramente:
  - AX16
  - AX24
  - AX32
- Interface unica para resolver contagens, ranges e parametros.

### Protocol
- Builders/parsers por opcode e contrato.
- Validacao de payload TX/RX.
- Registro de mensagens desconhecidas.

### Sync
- State machine explicita:
  - disconnected
  - connecting
  - bootSyncing
  - ready
  - reconnecting
  - degraded
  - error
- Reconciliacao de estado otimista x estado confirmado da mesa.

### Infra
- Transporte WebSocket, Tauri adapters, timers, retry/reconnect, logging.
- Abstracoes para clock, storage e network.

### Persistence
- Chaves versionadas e escopo por mixer/profile.
- Politica de expiracao/migracao de cache local.

### Licensing
- Modulo isolado para validacao, cache runtime, trial/revalidation e bloqueios.
- Interface de decisao de boot reutilizavel.

## Diretrizes de dependencia
- UI -> Features -> Domain -> Protocol/Profiles -> Infra.
- Persistence e Licensing expostos via interfaces para Features/Domain.
- Domain nao depende de UI/Infra concretos.

## Sequencia de migracao recomendada
- Isolar Profiles e Protocol antes de mover UI.
- Isolar Sync engine antes de quebrar `App.tsx` em fatias.
- Migrar feature por feature com parity comportamental.
