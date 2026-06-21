# Princípios de Produto — AX Control

## 0. A operação ao vivo é sagrada

Nada — licença, internet, atualização, feature flag ou IA — pode interromper, travar ou degradar uma sessão ativa de operação na mesa. Esta é a regra que vence todas as outras quando há conflito. Ver "Premissa técnica inegociável" em `shared/ax-control-context.md`.

## 1. Menos erro ao vivo

O app deve reduzir o risco operacional em palco, culto, evento ou passagem de som.

## 2. Velocidade acima de profundidade escondida

Técnicos precisam agir rápido. Recursos avançados devem existir, mas não podem atrapalhar o fluxo principal.

## 3. Confiança antes de mágica

Qualquer recurso inteligente precisa ser previsível e explicável. A IA nunca deve parecer que tomou controle da mesa sem permissão.

## 4. UX premium, operação simples

Visual limpo, linguagem direta, hierarquia clara e ações evidentes.

## 5. Offline first sempre que fizer sentido

O uso em ambientes de áudio ao vivo pode ter internet ruim ou inexistente. Funções críticas não dependem de nuvem.

## 6. Comunidade como motor de produto

Feedbacks, vídeos, bugs e sugestões da comunidade devem alimentar roadmap, conteúdo e prova social.

## 7. Não copiar a mesa: melhorar a experiência

O objetivo não é replicar a UI oficial da mesa, mas criar uma camada melhor, mais rápida e mais confiável.

## 8. Modularidade técnica por domínio

Cada domínio do app deve evoluir sem quebrar o restante: Mixer, Aux, FX, DCA, Mute Groups, Scenes, Patching, Presets, Licenças, IEM, RTA, AI. Mudanças devem branch por perfil (AX16/AX24 vs AX32), nunca por suposição hardcoded.

## 9. Valor percebido claro

Toda feature paga precisa responder: por que alguém pagaria por isso agora?

## 10. Degradação graciosa, nunca bloqueio bruto

Quando algo falha (sem internet, sem licença, sem mesa), o app cai para um estado útil e explicado — demo, plano `free`, cache offline — em vez de uma tela morta. O usuário sempre entende o que aconteceu e o que pode fazer.
