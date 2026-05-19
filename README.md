# AX Controller

Aplicativo de controle para mixers Axios com foco em operação em desktop e iPad.

O núcleo do projeto está em `apps/desktop`, onde ficam a interface de operação, cliente de protocolo via WebSocket, camada de integração Tauri e política de licença/ativação.

## Inicio rapido

```bash
cd apps/desktop
npm install
npm run build
npm run tauri dev
```

## Estado do projeto

- Operação principal funcional para canais, auxiliares, FX e master.
- Vistas globais implementadas: AUX SENDS, FX SENDS, MUTE GROUPS, DCA GROUPS e SCENES.
- Descoberta de mixers na rede local.
- Licença com primeira ativação online obrigatória, cache offline, revalidação em background e bloqueio de segurança.
- Build web e build desktop em funcionamento.

## Estrutura do repositório

- `apps/desktop`: aplicação principal (React + Tauri).
- `apps/desktop/src`: frontend, estado global e componentes.
- `apps/desktop/src/lib/axios16Client.ts`: cliente DUONN/Axios com mapeamento de parâmetros.
- `apps/desktop/src/protocol/duonn`: mapeamentos e builders de protocolo (groups, scenes, bitmask, FX presets).
- `apps/desktop/src/services`: serviços de integração para discovery/groups/scenes.
- `apps/desktop/src-tauri`: backend Rust/Tauri.
- `research`: material de validação e engenharia reversa de protocolo.
- `docs`: documentação operacional e técnica detalhada.

## Requisitos

- Node.js 20+
- npm 10+
- Rust toolchain (`cargo`, `rustc`)
- Dependências de plataforma do Tauri
- Mixer Axios compatível acessível na rede local

## Comandos principais

```bash
# frontend dev
cd apps/desktop
npm install
npm run dev

# desktop (tauri)
npm run tauri dev

# build de produção
npm run build

# checagem auxiliar de colisão de parâmetros
npm run check:param-overlap
```

## Fluxo de desenvolvimento

1. Rodar `npm install` em `apps/desktop`.
2. Executar `npm run build` para validar TypeScript e bundle.
3. Subir `npm run tauri dev` para fluxo desktop completo.

## Funcionalidades principais

- Controle de canais (mute, solo, phantom, phase, pan, gain, fader, nome, cor e ícone).
- Controle de AUX e FX (mute, solo, fader, nome/cor e detalhe dedicado).
- Master bus com faders L/R, link estéreo, mute/solo e meters.
- Processamento por canal/aux/master com Gate, Compressor, EQ, HPF e LPF.
- DCA Groups e Mute Groups com membership e sincronização periódica.
- Scenes (call, save, rename) com fluxo visual dedicado.

## Licença e ativação

- Primeira ativação exige internet.
- Após validação, cache local permite uso offline temporário.
- Revalidação ocorre em background quando online.
- Janela de revalidação de 30 dias, com aviso in-app nos últimos 5 dias.
- Expiração de trial/licença (`expiry_date`) salva em cache e aplicada também offline.
- Bloqueio imediato em sessão quando API retorna estado inválido.

## Documentação

- Guia geral do app desktop: `apps/desktop/README.md`
- Onboarding rapido para novos devs: `docs/ONBOARDING.md`
- Documentação técnica completa: `docs/APP_DOCUMENTATION.md`
- Handoff para API/Admin: `docs/API_ADMIN_HANDOFF.md`

## Observações

- Evite múltiplos clientes simultâneos controlando a mesma mesa.
- Alguns mapeamentos para modelos acima de 16 canais estão marcados como derivados e precisam validação em hardware.
