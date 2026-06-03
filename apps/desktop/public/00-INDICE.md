# 📑 Índice Completo - AX WebSocket Capture

## 📍 Localização de Todos os Arquivos

Todos os arquivos foram criados em: `/Volumes/SSD_Felipe/AX-Controller/apps/desktop/public/`

---

## 🔴 Comece Aqui

### 1. **LEIA-ME.md** ← Comece por aqui!
- Overview completo do sistema
- Como começar em 10 minutos
- Checklist de testes
- Troubleshooting básico

### 2. **QUICK-REF.md** ← Referência visual rápida
- Resumo em 1 página
- Decode de TX/RX
- Tabela de comandos
- Mini-troubleshooting

---

## 🔧 Scripts de Injeção

### **inject-standalone.js** ⭐ (USE ESTE)
- Script principal pronto para copiar/colar no console
- Sem dependências
- Funciona direto
- Recomendado para uso
- Copie TODO o conteúdo e cole no console DevTools de http://192.168.1.75

### **ax-capture-inject.js** (Alternativa)
- Versão com suporte a servidor externo
- Menos prático (requer HTTP)
- Backup apenas

### **copy-inject-script.js** (Helper Node.js)
- Utilitário: `node copy-inject-script.js`
- Copia script para clipboard automaticamente
- Opcional (copiar manual também funciona)

---

## 📚 Documentação Completa

### **README-CAPTURA.md** (Leitura Recomendada)
- Guia completo de 60+ linhas
- Instruções passo-a-passo
- Como interpretar logs
- Todos os cenários possíveis (3 casos de resultado)
- Análise detalhada de TX/RX
- Todos os comandos disponíveis
- Troubleshooting completo

### **CAPTURA-INSTRUCOES.md** (Guia Detalhado)
- Instruções muito detalhadas (100+ linhas)
- Inclui bookmarklet
- Interpretação de estrutura de logs
- Próximos passos após captura
- Cenários de teste

### **GUIA-RAPIDO.md** (Referência Rápida)
- Guia em markdown simplificado
- Commands de teste prontos
- Decode básico
- Troubleshooting mini

---

## 🌐 Interfaces Visuais (Opcional)

### **launcher.html**
- Página HTML visual para iniciar
- Botões bonitos com instruções
- Bookmarklet integrado
- Interface intuitiva
- Use se preferir algo visual

### **ax-capture.html** (Obsoleto)
- Versão antiga com iframe
- Não recomendada
- Mantida por compatibilidade

---

## 📊 Fluxo de Uso Recomendado

```
1. Leia: LEIA-ME.md
   ↓
2. Abra: Browser em http://192.168.1.75
   ↓
3. Copie: inject-standalone.js
   ↓
4. Cole: No console DevTools (F12)
   ↓
5. Execute: Teste A (CH1 mic)
   ↓
6. Consulte: QUICK-REF.md ou README-CAPTURA.md
   ↓
7. Execute: Teste B (CH31/32 Spotify)
   ↓
8. Analise: JSONs baixados
   ↓
9. Reporte: Parâmetros descobertos
```

---

## 📄 Resumo de Conteúdo

| Arquivo | Linhas | Função | Leitura |
|---------|--------|--------|---------|
| LEIA-ME.md | ~250 | Overview + como começar | ⭐⭐⭐ |
| QUICK-REF.md | ~120 | Referência visual rápida | ⭐⭐⭐ |
| README-CAPTURA.md | ~350 | Guia completo detalhado | ⭐⭐ |
| CAPTURA-INSTRUCOES.md | ~200 | Instruções muito detalhadas | ⭐ |
| GUIA-RAPIDO.md | ~180 | Guia rápido com código | ⭐ |
| inject-standalone.js | ~200 | Script de injeção principal | 🔴 USE |
| ax-capture-inject.js | ~130 | Versão alternativa | 🟡 Backup |
| copy-inject-script.js | ~50 | Helper Node.js | 🟢 Opcional |
| launcher.html | ~150 | Interface visual | 🟢 Opcional |
| ax-capture.html | ~120 | Interface iframe (obsoleta) | ⚫ Skip |

---

## 🚀 Quick Start (30 seg)

```bash
1. http://192.168.1.75
2. F12 → Console
3. Copy from inject-standalone.js
4. Paste & Enter
5. AX_CAPTURE.clear()
6. Speak in CH1 for 5 sec
7. AX_CAPTURE.export()
```

---

## 🎯 Objetivo Final

Após a captura, você terá:
- ✅ JSON com TX/RX completos de CH1
- ✅ JSON com TX/RX completos de CH31/32
- ✅ Identificação exata de quais parâmetros são polados para cada canal
- ✅ Informação para corrigir o app em App.tsx

---

## 📞 Variáveis de Ambiente Importantes

Na captura você verá:

```
Socket ID:  ws_8088
Mesa IP:    192.168.1.75
Port:       8088
Opcode 6:   Read params (polling)
CRC:        CRC16-Modbus
```

---

## ✅ Checklist Final

- [ ] Li LEIA-ME.md
- [ ] Abri http://192.168.1.75
- [ ] Copiei inject-standalone.js
- [ ] Colei no console (F12)
- [ ] Vi banner verde
- [ ] Executei Teste A (CH1)
- [ ] Executei Teste B (CH31/32)
- [ ] Comparei JSONs
- [ ] Identifiquei parâmetros novos
- [ ] Documentei descobertas

---

## 🔗 Ligações do Sistema

```
Mesa WebSocket ← [Capture] ← Console Injection
                    ↓
                  TX Hook (send)
                  RX Hook (onmessage)
                    ↓
                  Log Buffer
                    ↓
                  JSON Export
```

---

## 📧 Depois da Captura

Com os parâmetros descobertos, o próximo passo será voltar para:

**`/Volumes/SSD_Felipe/AX-Controller/apps/desktop/src/App.tsx`**

E atualizar:
- Linhas 8024: `maxChannelMeterParam` 
- Linhas 8208-8250: `startMeterPolling()` - adicionar novos params
- Linhas 8018-8165: `updateMetersFromResponse()` - ajustar filtering

---

**Bom captura! 🚀**

Próxima leitura: **LEIA-ME.md**
