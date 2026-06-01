# Branching And Git Safety (obrigatorio)

## Regras de branch
- Regra obrigatoria: nao trabalhar diretamente na `main` para mudancas de feature, sync, UI, refactor ou mapping.
- Regra obrigatoria: antes de qualquer tarefa, rodar:
  - `git branch --show-current`
  - `git status`
- Regra obrigatoria: se estiver na `main`, criar branch especifica antes de alterar arquivos.
- Regra obrigatoria: nao fazer merge na `main` sem aprovacao explicita.

## Regras de seguranca
- Regra obrigatoria: nao descartar alteracoes existentes.
- Regra obrigatoria: nao apagar arquivos sem autorizacao.
- Regra obrigatoria: nao usar comandos destrutivos sem autorizacao explicita.

## Branch names recomendados
- `docs/nome-da-mudanca`
- `ui/nome-da-mudanca`
- `feature/nome-da-feature`
- `fix/nome-do-ajuste`
- `sync/nome-da-mudanca`
- `protocol/nome-da-mudanca`
- `profile/nome-da-mudanca`
- `refactor/nome-do-refactor`
- `test/nome-do-teste`

## Exemplos de branch
- `docs/agent-operational-guidelines`
- `ui/channel-tabs`
- `feature/custom-views`
- `feature/rta-analyzer`
- `fix/stereo-linked-sends`
- `sync/boot-state-reconciliation`
- `protocol/tx-rx-logging`
- `profile/ax32-capabilities`
- `refactor/extract-device-profiles`
- `test/sends-regression-checks`

## Comandos e acoes proibidas sem autorizacao explicita
- `git reset --hard`
- `git checkout .`
- `git clean -fd`
- `git push --force`
- Deletar branches
- Descartar alteracoes nao commitadas
- Reescrever historico
- Rebase em trabalho compartilhado

## Regra de checkpoint
- Regra obrigatoria: antes de mudancas grandes, arriscadas ou estruturais, sugerir commit de checkpoint.
- Exemplo:
  - `git add .`
  - `git commit -m "checkpoint: stable AX Control before [task]"`

## Padrao de commit message
- `docs:`
- `ui:`
- `feature:`
- `fix:`
- `sync:`
- `protocol:`
- `profile:`
- `refactor:`
- `test:`
- `chore:`

## Exemplos de commit message
- `docs: add operational workflow specs`
- `ui: add channel tab navigation`
- `feature: add custom views foundation`
- `fix: preserve stereo linked send routing`
- `sync: improve boot sync reconciliation`
- `protocol: improve tx rx logging`
- `profile: add ax32 capability placeholders`
- `refactor: extract profile helpers`
- `test: add sends regression checklist`
- `chore: update specs readme`