# Manual Validation Checklist (Baseline)

## Objetivo
Estabelecer baseline manual antes de qualquer refatoracao funcional.

## Escopo
- Modelos: AX16, AX24, AX32
- Build alvo: desktop atual
- Ambiente: mesma branch de documentacao

## Regra de uso
- Marcar cada caso com: PASS | FAIL | N/A
- Registrar evidencia curta (video, print, log, observacao)
- Em caso de FAIL, registrar impacto e bloqueio para fases seguintes

## Dados da execucao
- Data: 01/07/2026
- Responsavel: Felipe Rocha
- Modelo testado: AXIOS 32
- IP da mesa: 192.168.1.75
- Firmware (se conhecido):

---

## A. Conexao e Boot Sync

1. Descoberta de mixer lista dispositivos esperados.
Resultado:
Evidencia:

2. Conexao manual por IP funciona com status correto.
Resultado:
Evidencia:

3. Sem licenca valida, conexao e bloqueada conforme regra.
Resultado:
Evidencia:

4. Com licenca/trial valida, conecta e inicia sync inicial.
Resultado:
Evidencia:

5. App chega em estado conectado sem travar UI.
Resultado:
Evidencia:

6. Sync parcial (se ocorrer) mostra status claro sem crash.
Resultado:
Evidencia:

## B. WebSocket e Reconnect

7. Queda de conexao derruba estado para desconectado com mensagem.
Resultado:
Evidencia:

8. Reconexao manual recupera operacao normal.
Resultado:
Evidencia:

9. Nao ha comportamento fantasma de timer antigo apos reconectar.
Resultado:
Evidencia:

## C. Canais Base

10. Fader de canal responde na mesa e na UI.
Resultado:
Evidencia:

11. Mute/solo de canal refletem corretamente ida e volta.
Resultado:
Evidencia:

12. Pan atualiza sem drift visivel.
Resultado:
Evidencia:

13. Gain/phantom/phase (quando aplicavel) funcionam sem regressao.
Resultado:
Evidencia:

14. Meters atualizam de forma estavel sem congelar.
Resultado:
Evidencia:

## D. Sends e Sends on Faders

15. Send channel -> aux aplica valor correto na mesa.
Resultado:
Evidencia:

16. Send channel -> fx aplica valor correto na mesa.
Resultado:
Evidencia:

17. Toggle pre/post de send reconcilia com leitura da mesa.
Resultado:
Evidencia:

18. View auxSends controla canais esperados.
Resultado:
Evidencia:

19. View fxSends controla canais esperados.
Resultado:
Evidencia:

## E. Stereo Link

20. Link de canal (par impar/par) espelha comportamento esperado.
Resultado:
Evidencia:

21. Unlink restaura comportamento independente sem estado corrompido.
Resultado:
Evidencia:

22. Sends em canais linked respeitam fanout esperado.
Resultado:
Evidencia:

23. Link de aux (quando aplicavel) afeta sends conforme regra.
Resultado:
Evidencia:

24. Link master nao gera divergencia entre L/R.
Resultado:
Evidencia:

## F. FX e Presets

25. Strips FX (mute/fader) funcionam.
Resultado:
Evidencia:

26. Preset FX seleciona e reflete estado atual.
Resultado:
Evidencia:

27. Controles A/B de preset funcionam com range correto.
Resultado:
Evidencia:

## G. DCA Groups

28. Enable/disable DCA funciona.
Resultado:
Evidencia:

29. Fader DCA atua nos membros.
Resultado:
Evidencia:

30. Alteracao de membros DCA persiste no estado da mesa.
Resultado:
Evidencia:

31. DCA clear remove membros corretamente.
Resultado:
Evidencia:

## H. Mute Groups

32. Ativar/desativar mute group funciona.
Resultado:
Evidencia:

33. Alteracao de membros mute group funciona.
Resultado:
Evidencia:

34. Aplicacao de mute gerenciado nao entra em loop.
Resultado:
Evidencia:

35. Clear de mute group funciona.
Resultado:
Evidencia:

## I. Scenes

36. Scene call aplica e forca resync pos-acao.
Resultado:
Evidencia:

37. Scene save executa sem quebrar estado da UI.
Resultado:
Evidencia:

38. Rename de scene atualiza nome esperado.
Resultado:
Evidencia:

## J. Patching e Rotas

39. Leitura de patch maps (quando aplicavel) nao quebra UI.
Resultado:
Evidencia:

40. Mudanca de rota visivel reflete estado esperado.
Resultado:
Evidencia:

## K. Custom UI e Navegacao

41. Navegacao entre views principais funciona sem erro.
Resultado:
Evidencia:

42. Detail views de channel/aux/fx/master abrem com dados consistentes.
Resultado:
Evidencia:

43. Customizacao visual de strip nao afeta controle funcional.
Resultado:
Evidencia:

## L. Licenca e Trial

44. Fluxo onboarding de licenca segue regras de bloqueio/liberacao.
Resultado:
Evidencia:

45. Trial ativo mostra estado e validade coerentes.
Resultado:
Evidencia:

46. Revalidacao/licenca expirada atualiza gate de conexao corretamente.
Resultado:
Evidencia:

## M. Persistencia Local

47. Ultimo mixer/discovery cache persistem entre reinicios.
Resultado:
Evidencia:

48. Cache de DCA (nomes/cores) por mixer funciona sem vazar entre mesas.
Resultado:
Evidencia:

49. Cache de licenca runtime e status sao carregados sem corrupcao.
Resultado:
Evidencia:

## N. Gate de aprovacao

50. Todos os casos criticos (A, D, E, G, H, L) estao PASS no modelo alvo.
Resultado:
Evidencia:

---

## Resultado final da rodada
- Total PASS:
- Total FAIL:
- Total N/A:
- Bloqueia proxima fase? (SIM/NAO):
- Observacoes gerais:
