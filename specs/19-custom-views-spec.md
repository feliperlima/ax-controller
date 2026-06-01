# Custom Views Spec

## Objetivo
Documentar regras de custom UI e views especializadas sem alterar comportamento atual.

## Escopo
- Customizacao de strips
- Navegacao entre views principais
- Detail views
- Consistencia entre UI customizada e estado funcional

## Estado atual observado
- `App.tsx` controla `mainView`, `detailView` e `customizationView`.
- `ChannelCustomizer.tsx` e componentes de strip participam do fluxo de customizacao visual.
- A UI usa cores, nomes e indicadores por escopo de strip.

## Regras obrigatorias
- Customizacao visual nunca deve alterar semantica funcional de protocolo/sync.
- Navegacao de views nao deve perder estado critico sem decisao explicita.
- Detail view deve refletir estado canonico atual, nao um snapshot stale.

## Comportamento esperado
- Views principais trocam sem crash ou perda de contexto essencial.
- Abrir detail view mostra dados coerentes com estado atual.
- Customizacoes visuais preservam operacao de controle.

## Riscos principais
- UI mascarar estado funcional real.
- Mudanca de view no meio de sync causar inconsistencias.
- Customizacao visual vazar para logica de negocio.

## Checklist minimo antes de alterar codigo
- Navegacao entre views estavel.
- Detail views coerentes.
- Customizacao nao quebra controle.
