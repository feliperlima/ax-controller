# FX Spec

## Objetivo
Documentar o comportamento esperado da area de FX antes de qualquer refatoracao funcional.

## Escopo
- FX strips
- FX processors basicos
- FX colors
- FX presets
- Sync de estado FX

## Estado atual observado
- AX16/AX24 usam 2 FX; AX32 usa 4.
- Existe modulo dedicado de presets em `protocol/duonn/fxPresets.ts`.
- Sync de FX e controlado no `App.tsx` por `syncFxState`, `syncAllFxState`, `syncFxColors`, `syncFxPresetState`.

## Fontes atuais
- `App.tsx`
- `components/FxStrip.tsx`
- `components/FxPresetPanel.tsx`
- `protocol/duonn/fxPresets.ts`
- `lib/axios16Client.ts`

## Regras obrigatorias
- Contagem de FX deve respeitar profile ativo.
- Preset e controles A/B devem passar por contrato semantico, nao por payload bruto saindo da UI.
- Sync de FX nao pode assumir ranges identicos entre perfis sem passar por capabilities.

## Comportamento esperado
- FX strip exibe mute, fader, nome e cor coerentes.
- Preset ativo e refletido corretamente na UI.
- Controles A/B refletem e escrevem valores validos.
- Sync de FX deve convergir com a mesa apos alteracoes.

## Riscos principais
- Preset/control mapping divergente por profile.
- Drift entre preset visivel e estado real da mesa.
- Contagem de FX incorreta em AX32.

## Checklist minimo antes de alterar codigo
- Mute/fader FX funcionando.
- Preset seleciona corretamente.
- Controles A/B respeitam range.
- AX16/24 e AX32 cobertos.
