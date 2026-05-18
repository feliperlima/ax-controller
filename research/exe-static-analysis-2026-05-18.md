# DUONN EXE Static Analysis (2026-05-18)

## Arquivos analisados
- AX16: `research/AX16E.25.11.01.001.exe`
- AX24: `research/AX24E.25.11.01.001.exe`
- AX32: `research/AX32 .25.12.30.03.APP.exe`

## Resultado principal
A analise estatica de strings confirma diferencas de capacidade entre os binarios:

- AX16: `AUX1-8`, `DCA1-4`
- AX24: `AUX1-8`, `DCA1-4`
- AX32: `AUX1-8`, `AUX1-10`, `AUX1-14`, `DCA1-8`
- Canais AX24/AX32: strings de faixa como `CH17-24` (AX24) e `CH15-28`/`CH29-FX` (AX32)
- Todos: `STEREO-FX-AUX%d`, `wfx3`, `set_input`, `set_output`, `edit_input`, `edit_output`, `edit_efx`, `set_mute_group`
- Quantidade exata de motores FX (2 vs 4): nao aparece de forma explicita em strings dos EXEs

## Evidencias locais geradas
- `research/ax16_tokens.txt`
- `research/ax16_funcs.txt`
- `research/ax24_tokens.txt`
- `research/ax32_tokens.txt`
- `research/ax24_funcs.txt`
- `research/ax32_funcs.txt`
- `research/comparison.txt`
- `research/comparison-3models.txt`

## Extracao sem execucao (7z)
Os executaveis foram extraidos para:
- `research/extracted/ax24`
- `research/extracted/ax32`

Conteudo extraido e principalmente secoes PE (`.text`, `.rdata`, `.data`, `.rsrc`), sem pacote externo claro de mapa de parametros.

## Interpretacao tecnica
1. A base de funcoes parece compartilhada entre modelos.
2. AX16 e AX24 aparecem com mesma capacidade de AUX/DCA em strings estaticas.
3. O AX32 tem variacao real de contagem de barramentos/agrupamentos em relacao aos outros dois.
4. Nao foi encontrado, nesta etapa, um arquivo declarativo explicito com tabela de parametros (json/toml/bin externo) para AX24/AX32.

## Proximo passo recomendado
1. Fazer diff orientado a offsets/constantes entre `ax24/.rdata` e `ax32/.rdata` para localizar tabelas numericas candidatas.
2. Procurar padroes de strides e blocos (ex.: 62, 109, 45) dentro das secoes extraidas.
3. A partir disso, montar um mapa provisiorio AX24/AX32 em modo experimental no app.
