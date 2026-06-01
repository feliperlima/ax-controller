# Profile Detection Spec

## Objetivo
Documentar como perfis e capacidades de device devem ser tratados antes de refatoracoes maiores.

## Escopo
- Resolucao de profile
- Channel count e capabilities
- Compatibilidade por mixer descoberto
- Persistencia futura da decisao de profile

## Estado atual observado
- O projeto usa `ax16_24` e `ax32`/`ax32_experimental`.
- `resolveProfileCapabilities` vive em `lib/axios16Client.ts`.
- `lib/mixerCompatibility.ts` protege contra alguns cenarios invalidos.
- Fluxo de conexao resolve profile no `App.tsx` antes do boot sync.

## Regras obrigatorias
- Nenhuma feature generica deve deduzir profile por hardcode local.
- Capabilities devem ser resolvidas centralmente.
- Compatibilidade deve falhar de forma segura quando houver colisao/mapa invalido.

## Comportamento esperado
- AX16 e AX24 compartilham protocolo, mas nao necessariamente mesma contagem de canais.
- AX32 usa mapa dedicado e nao deve cair em validacoes reservadas de AX16/AX24.
- Profile resolvido deve orientar counts, groups, sends, FX e ranges.

## Estrategia futura recomendada
- Discovery + sinais da mesa + parametros sentinela.
- Persistencia por identidade de mixer para acelerar reconnect.
- Invalidacao segura se sinais do device mudarem.

## Riscos principais
- Resolver profile errado e contaminar todo o dominio.
- Misturar AX16 e AX24, e AX32 em paths comuns sem guardas.
- Aplicar ranges ou counts incorretos em features criticas.

## Checklist minimo antes de alterar codigo
- AX16 abre com 16 canais esperados, 8 AUX e 2 FX.
- AX24 abre com 24 canais esperados, 8 AUX e 2 FX.
- AX32 abre com 32 canais, 14 AUX e 4 FX.
- DCA/Mute/FX seguem counts corretos por profile.
