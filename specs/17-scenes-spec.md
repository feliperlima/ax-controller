# Scenes Spec

## Objetivo
Documentar o comportamento atual e esperado de scenes antes de qualquer refatoracao.

## Escopo
- Call scene
- Save scene
- Rename scene
- Metadata/listagem
- Resync pos-acao

## Estado atual observado
- O protocolo de scenes esta parcialmente mapeado.
- `call`, `save` e `rename` existem.
- A recuperacao de nome de cena ja existe por leitura direta por slot.
- Metadata/import/export ainda possuem TODOs relevantes.
- Pos-acao de scene aciona resync importante no `App.tsx`.

## Fontes atuais
- `protocol/duonn/scenes.ts`
- `services/duonn/scenesService.ts`
- `components/ScenesView.tsx`
- `lib/axios16Client.ts`: `readSceneName` e `readSceneNames`
- `App.tsx`: `handleSceneCall`, `handleSceneSave`, `refreshMixerStateAfterSceneAction`

## Regras obrigatorias
- Chamada e salvamento de scene devem ser tratados como operacoes de alto risco.
- Pos-acao deve existir reconciliacao explicita com a mesa.
- Rename deve ser sanitizado para ASCII seguro.
- Recuperacao de nome de cena nao deve depender exclusivamente de metadata chunked enquanto esse parser permanecer parcial.
- Leitura direta de nome por slot deve ser tratada como caminho atual principal para convergencia de nomes.
- TODOs de import/export nao podem ser tratados como funcionalidade pronta.

## Comportamento esperado

### Call
- Envia opcode de call.
- Aguarda janela curta.
- Executa resync do estado relevante da mesa.

### Save
- Envia opcode de save.
- Executa reconciliacao mais leve, ainda suficiente para evitar drift.

### Rename
- Sanitiza nome.
- Faz update otimista local.
- Futuramente deve preferir ack real quando mapeado.

### Recuperacao de nomes de cena
- Na implementacao atual, a recuperacao correta de nomes usa leitura direta por slot (`readSceneName`/`readSceneNames`).
- A UI tenta sincronizar os 12 slots ao conectar/abrir a view.
- Quando a leitura retorna nome valido, esse nome passa a ser o valor canonico exibido para o slot.
- `localStorage` funciona como fallback de UX e persistencia local entre sessoes, nao como fonte definitiva acima da mesa.
- Se a leitura remota falhar, a UI pode continuar mostrando cache local ou valor default, mas isso deve ser tratado como estado potencialmente incompleto.

### Metadatabo
- Solicita blocos/chunks conhecidos.
- Enquanto parser completo nao existir, comportamento deve permanecer explicitamente parcial.
- Metadata nao substitui o fluxo ja existente de recuperacao direta de nome por slot.

## Riscos principais
- Drift de UI apos scene call.
- Perder nomes corretos por regressao no fluxo de leitura direta por slot.
- Tratar cache local de nome como verdade acima da mesa.
- Perder nomes ou estados por metadata incompleta.
- Tratar import/export experimental como confiavel.

## Checklist minimo antes de alterar codigo
- Scene call reflete estado real apos sync.
- Scene save nao quebra estado corrente.
- Rename funciona com nome seguro.
- Recuperacao de nome por slot continua trazendo o nome correto da mesa.
- Cache local nao sobrepoe nome remoto correto quando a leitura funciona.
- Falhas de metadata nao derrubam UI.
