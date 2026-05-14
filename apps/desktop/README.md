# AX Controller

Aplicativo para controle da mesa Axios 16 em desktop e iPad.

**Stack:**
- Tauri v2 (desktop/iOS)
- React 19
- TypeScript
- Vite

## Scripts

```bash
npm run dev        # UI em modo desenvolvimento (Vite)
npm run build      # Type-check + build de produção
npm run preview    # Preview local da build
npm run tauri dev  # Executa o app desktop via Tauri
```

## Fluxo recomendado

```bash
npm install
npm run build
npm run tauri dev
```

## Organização principal

- `src/App.tsx`: estado global, sincronização com mesa e orquestração da UI.
- `src/components/TopNavigation.tsx`: header com navegação de abas, IP input e status tag.
- `src/lib/axios16Client.ts`: cliente WebSocket/protocolo com mapeamento de parâmetros.
- `src/components/ChannelStrip.tsx`: strips de canal/auxiliar.
- `src/components/ChannelProcessors.tsx`: Gate/Comp/EQ e gráfico interativo.
- `src/components/MasterBus.tsx`: seção master e medição principal.

## Recursos atuais

**Header redesenhado:**
- Navegação por abas (INPUTS, AUX SENDS, FX SENDS, DCA).
- IP input com label e botão desconectar.
- Status tag (Connected/Connecting/Disconnected).

**Controle mixer:**
- Controle de canais de entrada e auxiliares.
- Gate, Compressor e EQ com gráfico interativo.
- HPF/LPF com domínio visual expandido e ação real no range ativo.
- Sincronização de bypass/estado com foco na seção selecionada para reduzir carga de rede.
- Medição em tempo real e operações de link/sync dentro das restrições da mesa.

## Nota de estabilidade

Evite múltiplos clientes controlando a mesma mesa ao mesmo tempo para minimizar contenção de leitura/escrita no WebSocket.

## Build iOS/iPad

O app está compilado e pronto para iPad como **AX Controller**.

**Arquivo gerado:**
- `.ipa` release: `src-tauri/gen/apple/build/outputs/ios/release/desktop.ipa`

**Para compilar novamente:**

```bash
npm run tauri ios build
```
