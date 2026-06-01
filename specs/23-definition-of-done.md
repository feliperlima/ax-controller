# Definition Of Done (obrigatorio)

## 1) Qualquer tarefa
- Regra obrigatoria: specs relevantes foram lidas.
- Regra obrigatoria: tipo da tarefa foi declarado.
- Regra obrigatoria: papel do agente foi declarado.
- Regra obrigatoria: escopo foi respeitado.
- Regra obrigatoria: arquivos alterados foram listados.
- Regra obrigatoria: arquivos que nao deveriam ser alterados foram preservados.
- Regra obrigatoria: areas criticas tocadas foram declaradas.
- Regra obrigatoria: riscos foram explicados.
- Regra obrigatoria: comportamento alterado foi descrito.
- Regra obrigatoria: comportamento preservado foi descrito.
- Regra obrigatoria: checklist manual foi entregue.
- Regra obrigatoria: specs foram atualizadas se houve descoberta nova.
- Regra obrigatoria: nenhuma alteracao fora de escopo foi feita.

## 2) docs-only
- Regra obrigatoria: nenhuma logica funcional foi alterada.
- Regra obrigatoria: alteracoes limitadas a documentacao.

## 3) investigation-only
- Regra obrigatoria: nenhum arquivo foi alterado.
- Regra obrigatoria: conclusao, riscos e proxima acao recomendada foram entregues.

## 4) UI
- Regra obrigatoria: UI renderiza corretamente.
- Regra obrigatoria: layout nao quebrou viewport alvo.
- Regra obrigatoria: handlers existentes continuam funcionando.
- Regra obrigatoria: nao foi criado estado paralelo para mixer.
- Regra obrigatoria: nao foram alterados WebSocket, parser, sync, profiles, mappings ou sender.
- Regra obrigatoria: a UI consome o estado existente.

## 5) sync/protocol
- Regra obrigatoria: boot sync continua funcionando.
- Regra obrigatoria: nao ha TX automatico inesperado durante boot.
- Regra obrigatoria: RX continua atualizando estado corretamente.
- Regra obrigatoria: TX continua enviando comandos esperados.
- Regra obrigatoria: reconnect foi considerado.
- Regra obrigatoria: unknown params nao sao descartados silenciosamente.
- Regra obrigatoria: logs continuam uteis.
- Regra obrigatoria: checklist manual de conexao com a mesa foi entregue.

## 6) profile/mapping
- Regra obrigatoria: alteracao foi baseada em evidencia.
- Regra obrigatoria: AX16 foi preservada.
- Regra obrigatoria: AX24/AX32 nao foram assumidas sem evidencia.
- Regra obrigatoria: capabilities foram usadas quando aplicavel.
- Regra obrigatoria: counts, ranges e mappings foram documentados.

## 7) feature
- Regra obrigatoria: spec especifica foi seguida.
- Regra obrigatoria: criterios de aceite foram atendidos.
- Regra obrigatoria: edge cases foram considerados.
- Regra obrigatoria: features relacionadas foram checadas.
- Regra obrigatoria: nao houve refactor amplo junto com implementacao.

## 8) refactor
- Regra obrigatoria: comportamento antes/depois deve ser equivalente.
- Regra obrigatoria: arquivos movidos foram listados.
- Regra obrigatoria: imports foram atualizados com seguranca.
- Regra obrigatoria: nenhuma feature foi adicionada durante o refactor.
- Regra obrigatoria: rollback path esta claro.

## 9) licensing
- Regra obrigatoria: [16-licensing-trial-spec.md](specs/16-licensing-trial-spec.md) foi seguida.
- Regra obrigatoria: decisao funcional usa estado formal normalizado, nao status bruto.
- Regra obrigatoria: estados bloqueantes permanecem bloqueando gate de conexao.

## 10) persistence
- Regra obrigatoria: alteracao preserva comportamento de mixer e protocolo no escopo atual.
- Regra obrigatoria: nao altera licensing sem spec especifica.
- Regra obrigatoria: fallback e recuperacao de estado foram validados.

## 11) test-only
- Regra obrigatoria: nao altera comportamento de producao.
- Regra obrigatoria: se houve ajuste minimo em producao, ele foi explicitamente justificado.
- Regra obrigatoria: cobertura da regressao alvo foi demonstrada.