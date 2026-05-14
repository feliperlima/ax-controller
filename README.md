# AX Controller

Controle para mesa Axios 16 em desktop (macOS) e iPad via Tauri v2 + React + TypeScript.

O foco do repositório está no app em `apps/desktop`, com interface de mixagem (header redesenhado + abas de navegação), cliente WebSocket do protocolo da mesa e empacotamento desktop/mobile via Tauri v2.

## Estado atual

- ✅ Header com navegação, IP input e status tag redesenhado.
- ✅ App funcional para operação de canais, auxiliares e master.
- ✅ Sincronização de estado com foco no contexto ativo para reduzir carga no WebSocket.
- ✅ Meters em tempo real com tratamento de hold/clip e atualização contínua.
- ✅ Build desktop com Tauri funcional.
- ✅ Build iOS para iPad completo e nomeado como **AX Controller**.

## Estrutura

- `apps/desktop`: aplicacao principal (UI React, cliente de protocolo, Tauri).
- `apps/desktop/src`: componentes e estado global do mixer.
- `apps/desktop/src/lib/axios16Client.ts`: mapeamento de parametros e comunicacao WebSocket.
- `apps/desktop/src-tauri`: backend Rust/Tauri e configuracao de bundle.
- `research/duonn-web`: materiais de pesquisa de protocolo/roteamento.

## Requisitos

- Node.js 20+
- npm 10+
- Rust toolchain (cargo/rustc)
- Ambiente Tauri (incluindo dependencias de plataforma)
- Mesa Axios 16 acessivel na rede (ou endpoint WebSocket compativel)

## Desenvolvimento

```bash
cd apps/desktop
npm install
npm run dev
```

## Execucao Desktop (Tauri)

```bash
cd apps/desktop
npm run tauri dev
```

## Build

```bash
cd apps/desktop
npm run build
```

## Recursos implementados

- Controle de entradas (1-16) e auxiliares (1-8).
- Canal strip com mute, solo, pan, gain, fader, nome, icone e cor.
- Processadores por canal (Gate, Compressor, EQ) com grafico interativo.
- HPF/LPF com tipo/inclinacao e atuacao no range ativo.
- Link estereo por pares em canais e auxiliares, com espelhamento de ajustes.
- Master com dois faders (L/R), mute independente e opcao de link.

## iOS/macOS

- ✅ **App AX Controller compilado e pronto para iPad**
- ✅ `.ipa` gerado: `apps/desktop/src-tauri/gen/apple/build/outputs/ios/release/desktop.ipa`
- ✅ Projeto Xcode em `apps/desktop/src-tauri/gen/apple`
- ✅ Patch local de `swift-rs` aplicado para compatibilidade
- 🔄 Ícone da app será adicionado em breve

## Scripts principais (apps/desktop)

```bash
npm run dev              # Desenvolvimento UI
npm run build            # Build de produção
npm run preview          # Preview build
npm run tauri dev        # Executa app desktop
```

## Build iOS/iPad

O app foi compilado como **AX Controller** e está instalado no iPad. Para futuras compilações:

```bash
npm run tauri ios build
```

## Notas

- Evite multiplos clientes controlando a mesma mesa ao mesmo tempo.
- Para detalhes do app desktop, consulte `apps/desktop/README.md`.
