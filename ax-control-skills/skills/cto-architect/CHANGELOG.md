# Changelog — Cto Architect

Todas as mudanças relevantes desta Skill devem ser documentadas neste arquivo.

## [0.2.0] — 2026-06-21

### Refinado

- Alinhamento com o código real do app `ax-controller @ v1.1.0`.
- **Correção de stack:** removido Supabase (não usado) e Mercado Pago como camada direta; backend é API HTTP (PHP legado + `/api/app/*`, `/api/certificate/*`, `/api/payment/*.php`) e pagamento é PIX.
- Inclusão da realidade v1.1.0: certificado `.axc` (Ed25519 em Rust), bootstrap/feature flags, demo client-side, planos `trial`/`free`/`licensed` e perfis AX16/AX24 vs AX32.
- Referência a `docs/DO_NOT_BREAK.md` e `check:param-overlap`.
- Adição de frontmatter (`role`, `version`, `when_to_use`, `when_not_to_use`, `reads`).
- Reforço da premissa inegociável: nada interrompe a operação ao vivo.
- Referências cruzadas aos arquivos de `shared/` e às outras skills.
- Linguagem mais enxuta e decisiva, sem perder a estrutura de resposta.

## [0.1.0] — 2026-06-21

### Criado

- Criação inicial da Skill `cto-architect` para o repositório `ax-control-skills`.
- Adaptação do conceito de C-Level Squad para o contexto específico da AX Control.
- Inclusão de identidade, missão, quando usar, princípios, estrutura de resposta e critérios de decisão.
- Ajuste para empresa bootstrap, fundador solo, comunidade em crescimento e produto focado em áudio profissional.
