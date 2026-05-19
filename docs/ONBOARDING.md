# Onboarding Rapido - AX Controller

## Objetivo

Este guia acelera o setup e a primeira validacao local do app desktop.

## Pre-requisitos

- Node.js 20+
- npm 10+
- Rust toolchain (`cargo`, `rustc`)
- Dependencias de sistema para Tauri

## Setup inicial

```bash
cd apps/desktop
npm install
```

## Validacao minima

```bash
npm run build
npm run tauri dev
```

Se `npm run tauri dev` falhar por ambiente:

- Verifique se `cargo` esta disponivel no PATH.
- Verifique se a porta 1420 nao esta ocupada.

## Estrutura minima para entender o app

- `src/App.tsx`: orquestracao geral de telas, conexao e licenca.
- `src/lib/axios16Client.ts`: cliente DUONN/Axios via WebSocket.
- `src/components`: UI de canais, AUX, FX, master, grupos e scenes.
- `src-tauri/src/lib.rs`: comandos backend para discovery e validacao de licenca.

## Fluxo de trabalho recomendado

1. Fazer mudanca pequena e focada.
2. Rodar `npm run build` apos a mudanca.
3. Validar no app com `npm run tauri dev` quando houver impacto de runtime.
4. Atualizar docs em `docs/` quando houver mudanca funcional.

## Leitura complementar

- `README.md`
- `apps/desktop/README.md`
- `docs/APP_DOCUMENTATION.md`
- `docs/API_ADMIN_HANDOFF.md`
