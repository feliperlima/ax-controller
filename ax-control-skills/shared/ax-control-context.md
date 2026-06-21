# Contexto Compartilhado — AX Control

> Arquivo base de contexto. Toda Skill deste repositório assume o que está aqui.
> Atualizado para o momento da release **v1.1.0** (junho/2026).

A AX Control é uma empresa brasileira de software especializada em áudio profissional, começando pelo ecossistema das mesas digitais DUONN Axios.

O produto principal é o app **AX Control**, criado por **Felipe Rocha Lima**, Product Designer com experiência em UX/UI, produtos digitais, desenvolvimento assistido por IA, produção musical, operação de áudio ao vivo e mesas digitais.

## Momento atual (v1.1.0)

- **v1.0.0 em produção**, com usuários ativos pagantes.
- **v1.1.0 em release**, introduzindo:
  - Home screen fora da mesa (navegação reestruturada).
  - Modo demo 100% client-side (sem backend) para experimentação e prova social.
  - Plano `free` como modo limitado (em vez de bloqueio total após o trial).
  - Certificado offline `.axc` validado localmente (Ed25519 em Rust).
  - Remote config, feature flags e mensagens dinâmicas via `/api/app/bootstrap`.
  - Version check não-bloqueante (banner de versão) e sistema de toasts.
  - Conta/licença acessível sem mesa conectada.
- Comunidade orgânica crescendo via WhatsApp, Instagram e beta testers.
- App disponível para **Android Tablet, macOS e Windows** (iOS no contrato técnico, ainda não lançado).
- Foco inicial em **DUONN Axios 16, 24 e 32**.
- Potencial de parceria estratégica com a DUONN.
- **Fundador solo**, recursos limitados, priorização forte e obrigatória.

## Premissa técnica inegociável

> O AX Control pode precisar de internet para **ativar** e **manter a conta atualizada**, mas **nunca** para **operar a mesa ao vivo**. Nenhuma validação de licença, feature flag ou recurso de IA pode derrubar, travar ou interromper uma sessão ativa de operação.

Essa premissa vale para todas as decisões de produto, técnicas, de IA e de negócio.

## Visão

Construir o principal ecossistema independente para controle, monitoramento e inteligência aplicada às mesas DUONN Axios e, futuramente, a outras soluções de áudio profissional.

## Posicionamento desejado

AX Control não deve ser comunicado apenas como "um app de controle de mesa".

Deve ser posicionado como:

> Um ecossistema profissional que potencializa a experiência das mesas DUONN Axios.

Isso abre caminho para Mixer, Personal Monitor, RTA, Feedback Alert, presets inteligentes, Auto EQ, diagnóstico, analytics e recursos futuros.

## Premissas de negócio

- Bootstrap.
- Baixo custo operacional.
- Crescimento orgânico.
- Comunidade antes de mídia paga.
- Monetização simples e clara (hoje: licença via PIX, R$ 99,90).
- Produto confiável antes de produto grande.
- UX premium, mas sem complexidade desnecessária.
- A confiança técnica da comunidade é um ativo central.

## Personas principais

- Técnicos de som.
- Operadores voluntários de igreja.
- Músicos que usam IEM.
- Donos de mesas DUONN Axios.
- Integradores e técnicos freelancers.
- Pequenas igrejas, eventos e bandas.

## Produtos e frentes possíveis

1. AX Control Mixer (núcleo atual).
2. AX Control+ (plano pago / recursos avançados).
3. AX Personal Monitor / IEM.
4. AX RTA.
5. AX Feedback Alert.
6. AX AI / Sound Check Assist.
7. AX Cloud / Licenças / Admin.
8. AX Diagnostics.
9. AX Analytics.

## Regra de decisão

Priorize iniciativas com:

1. Alto valor percebido pelo usuário.
2. Baixo ou médio esforço técnico.
3. Potencial de conversão ou retenção.
4. Capacidade de gerar prova social.
5. Redução de suporte ou bugs.

Evite iniciativas que parecem impressionantes, mas aumentam muito manutenção, risco ou dispersão antes da validação comercial.

## Mapa rápido do código (para skills técnicas)

- App principal: `apps/desktop` (Tauri 2 + React 19 + TypeScript + Vite).
- Cliente de protocolo: `apps/desktop/src/lib/axios16Client.ts` (WebSocket, reads batched, writes, raw).
- Protocolo DUONN: `apps/desktop/src/protocol/duonn` (groups, scenes, bitmask, FX presets).
- Registry de parâmetros por perfil: `apps/desktop/src/lib/profileAwareParameterRegistry.ts` + `universalRawParamStore.ts`.
- Licença: `apps/desktop/src/lib/licenseEngine.ts`, `licenseState.ts`, `services/licenseService.ts`, `services/certificateService.ts`.
- Bootstrap / feature flags: `apps/desktop/src/services/bootstrapService.ts`, `services/featureFlags.ts`.
- Pagamento PIX: `apps/desktop/src/lib/pixPaymentApi.ts`, `services/paymentService.ts`.
- Demo: `apps/desktop/src/adapters/DemoMixerAdapter.ts`.
- Backend Rust: `apps/desktop/src-tauri/src`.
- Docs de referência: `docs/ARCHITECTURE.md`, `docs/DO_NOT_BREAK.md`, `docs/PROTOCOL_NOTES.md`, `docs/PARAMETER_MAPS.md`, `app-backend-contract-v1.1.0.md`, `site-api-admin-plan.md`.
