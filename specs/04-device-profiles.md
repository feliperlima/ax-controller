# Device Profiles (AX16, AX24, AX32)

## Estado atual observado
- Perfil de protocolo atual principal em codigo:
  - `ax16_24` (compartilhado por AX16 e AX24)
  - `ax32`/`ax32_experimental` (dedicado AX32)

## Capabilities por modelo

### AX16
- Channel count: 16 (via `channelCount` configurado no perfil `ax16_24`).
- Aux count: 8.
- FX count: 2.
- DCA: 4 (estado atual da logica para perfil nao-AX32).
- Mute groups: 4 (estado atual da logica para perfil nao-AX32).

### AX24
- Channel count: 24 (perfil `ax16_24`).
- Aux count: 8.
- FX count: 2.
- DCA: 4.
- Mute groups: 4.

### AX32
- Channel count: 32.
- Aux count: 14.
- FX count: 4.
- DCA: 8.
- Mute groups: 6.
- Mapa de parametros dedicado (base/stride e cores distintas de AX16/24).

## Parameter maps
- AX16/AX24:
  - compartilham base map historico (`CHANNEL_STRIDE=62`, ranges e cores legacy).
- AX32:
  - usa `AX32_CHANNEL_BASE_MAP`, `AX32_CHANNEL_STRIDE=72`, params de master/fx/color dedicados.

## Ranges relevantes
- Fader/sends em varios fluxos usam faixa operacional `0..1300`.
- Conversoes de ganho/filtro/tempo seguem funcoes de codec do cliente.
- DCA segue conversoes especificas de `groupControls`.

## Diferencas criticas entre modelos
- Contagem de canais/aux/fx.
- Enderecamento de parametros.
- Quantidade de grupos DCA/Mute.
- Bitmask de membros e coverage confirmado/provisional.

## Regras obrigatorias
- Nao hardcodar AX16 em features genericas.
- Toda feature deve resolver capabilities a partir do profile ativo.
- Se um comportamento so existir em AX32, deve haver guard explicito e fallback seguro.

## Estrategia futura para deteccao de profile
- Fonte primaria: discovery/compatibilidade + handshake/sinais da mesa.
- Fonte secundaria: escolha manual do usuario (quando necessario).
- Confirmacao final: leitura de parametros sentinela por modelo.
- Persistir profile resolvido por mixer para acelerar reconexao, com invalidacao segura.
