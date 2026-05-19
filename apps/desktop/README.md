# AX Controller Desktop

Aplicação desktop do AX Controller.

Stack principal:

- Tauri v2
- React 19
- TypeScript
- Vite

## Inicio rapido

```bash
npm install
npm run build
npm run tauri dev
```

## Scripts

```bash
npm run dev                # UI em desenvolvimento (Vite)
npm run build              # Type-check + build produção
npm run preview            # Preview da build
npm run tauri dev          # Executa app desktop via Tauri
npm run check:param-overlap
```

## Fluxo recomendado

```bash
npm install
npm run build
npm run tauri dev
```

## Fluxo de desenvolvimento

1. Execute `npm run build` antes de abrir PR para validar tipagem e bundle.
2. Use `npm run tauri dev` para validar integração frontend + backend Tauri.
3. Execute `npm run check:param-overlap` ao alterar mapeamentos de protocolo.

## Arquitetura de navegação

### Stages de app

- `splash`
- `device-selection`
- `mixer`

### Main views (stage mixer)

- `mixer`
- `auxSends`
- `fxSends`
- `muteGroups`
- `dcaGroups`
- `scenes`

### Detail views

- `channel`
- `aux`
- `fx`
- `master`

## Domínios funcionais

### Conectividade e descoberta

- Descoberta de mixers por LAN via comando Tauri `discover_mixers`.
- Conexão manual por IP.
- Filtro de compatibilidade de modelo por colisão de parâmetros.

### Mixer core

- Canais de entrada com mute, solo, phantom, phase, pan, gain, fader.
- AUX 1-8 e FX 1-2 com strip dedicado.
- Master bus com faders L/R, mute/solo, link e medição.
- Links por par em canais e auxiliares.

### Processamento

- Gate, Compressor e EQ por canal.
- EQ/Comp em auxiliares e master conforme mapeamento disponível.
- HPF/LPF com tipo e inclinação.

### Grupos e cenas

- DCA Groups (4 grupos) com enable, fader e membros.
- Mute Groups (4 grupos) com ativação, membros, clear e all-muted.
- Scenes (12 slots): call, save e rename.

## Licença no app

- Primeiro uso requer validação online.
- Cache local permite uso offline após ativação válida.
- Revalidação em background quando online.
- Bloqueio após expiração da janela de revalidação.
- Aviso in-app nos últimos 5 dias antes do vencimento.
- `expiry_date` persistido em cache e aplicado offline para trial/licença.
- Bloqueio imediato de sessão ao receber código de licença inválida da API.

## Arquivos-chave

- `src/App.tsx`: orquestração de estado e fluxo completo de UI/licença.
- `src/lib/axios16Client.ts`: protocolo WebSocket e conversões de parâmetros.
- `src/components/*`: módulos de UI (strips, processadores, grupos, scenes).
- `src/protocol/duonn/*`: builders e contratos de protocolo.
- `src/services/*`: serviços de integração para discovery, groups e scenes.
- `src-tauri/src/lib.rs`: comandos `discover_mixers` e `validate_license`.

## Build iOS/iPad

Para compilar novamente:

```bash
npm run tauri ios build
```

Saída padrão:

- `src-tauri/gen/apple/build/outputs/ios/release/desktop.ipa`

## Nota operacional

Evite múltiplos clientes simultâneos no mesmo mixer para reduzir contenção de leitura/escrita no WebSocket.

## Documentacao complementar

- Onboarding rapido para novos devs: `../../docs/ONBOARDING.md`
- Documentacao tecnica completa: `../../docs/APP_DOCUMENTATION.md`
- Handoff de ajustes API/Admin: `../../docs/API_ADMIN_HANDOFF.md`
