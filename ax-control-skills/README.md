# AX Control Skills

Repositório de Skills estratégicas, operacionais, técnicas e criativas da AX Control.

A proposta é centralizar a inteligência operacional da empresa para uso em CodeCogs, Claude Code, Claude AI, design, marketing, roadmap e documentação.

> **v0.2.0** — Skills revisadas e alinhadas com o código real do app em `ax-controller @ v1.1.0`
> (stack, licença/certificado, PIX, feature flags, demo, plano `free`). Cada `skill.md` agora tem
> frontmatter com `role`, `when_to_use`, `when_not_to_use` e os arquivos de `shared/` que deve ler.

## Estrutura

```txt
ax-control-skills/
├─ README.md
├─ manifest.json
├─ shared/
│  ├─ ax-control-context.md     # contexto de empresa, produto e mapa do código
│  ├─ product-principles.md     # princípios de produto (operação ao vivo é sagrada)
│  ├─ brand-voice.md            # voz de marca + ganchos honestos
│  └─ roadmap-context.md        # o que já saiu, agora, próximo e futuro
└─ skills/
   ├─ vision-chief/             { skill.md, CHANGELOG.md }
   ├─ head-of-audio-product/    { skill.md, CHANGELOG.md }
   ├─ cmo-growth/               { skill.md, CHANGELOG.md }
   ├─ coo-orchestrator/         { skill.md, CHANGELOG.md }
   ├─ cto-architect/            { skill.md, CHANGELOG.md }
   └─ ax-ai-lab/                { skill.md, CHANGELOG.md }
```

## Como cada Skill é montada

Cada `skill.md` traz:

- **Frontmatter** (`name`, `role`, `version`, `when_to_use`, `when_not_to_use`, `reads`) para roteamento.
- **Identidade e missão** do papel.
- **Quando usar** ancorado em features e domínios reais do app.
- **Estrutura de resposta** fixa, para saída consistente.
- **Critérios de priorização** e **O que evitar**.

Antes de responder, a Skill deve carregar os arquivos de `shared/` listados no campo `reads`.

## Como usar

1. Mantenha esta estrutura num repositório versionado.
2. Importe cada pasta de `skills/` como uma Skill na sua ferramenta (CodeCogs / Claude).
3. Sempre que uma Skill evoluir, atualize seu `CHANGELOG.md` e o `version`.
4. Mantenha `shared/` como fonte única de contexto — skills referenciam, não duplicam.
5. Quando o app mudar de forma relevante, sincronize `shared/ax-control-context.md` e `roadmap-context.md`.

## Regra geral

Todas as Skills existem para acelerar o crescimento sustentável da AX Control, aumentar a percepção de valor do produto e transformar comunidade em receita sem perder qualidade, simplicidade e confiança técnica — sempre respeitando a premissa inegociável: **nada interrompe a operação ao vivo.**
