# 🎯 LEIA-ME - AX WebSocket Capture System

## ✅ O que foi criado

Sistema completo de captura de tráfego WebSocket da mesa AXIOS32 oficial para descobrir qual é o padrão real de parâmetros de meter polling, especialmente para:
- CH1-16 (funcionam no app)
- CH17-32 (NÃO funcionam no app - **PROBLEMA A RESOLVER**)
- AUX e FX (sem atualização de meter no app)

## 📂 Arquivos Criados (em `apps/desktop/public/`)

### 🔴 Arquivos Principais

| Arquivo | Função |
|---------|--------|
| **inject-standalone.js** | ⭐ Script principal. Copie/cole no console DevTools. Não precisa de servidor. |
| **README-CAPTURA.md** | ⭐ Instruções completas. Leia isto PRIMEIRO. |
| **QUICK-REF.md** | ⭐ Referência visual rápida. Cola e pronto. |

### 📚 Documentação

| Arquivo | Função |
|---------|--------|
| **CAPTURA-INSTRUCOES.md** | Instruções detalhadas com interpretação de logs |
| **GUIA-RAPIDO.md** | Guia rápido com base64 (alternativa) |
| **launcher.html** | Interface visual HTML (opcional, não necessário) |

### 🔧 Ferramentas

| Arquivo | Função |
|---------|--------|
| **copy-inject-script.js** | Helper Node.js: `node copy-inject-script.js` (copia para clipboard) |
| **ax-capture-inject.js** | Versão alternativa com suporte a servidor |

---

## 🚀 Como Começar (Rápido)

### Opção 1: Copiar/Colar Manual (Recomendado)

```bash
1. Navegador → http://192.168.1.75/
2. F12 (abre DevTools)
3. Vá para Console (Ctrl+Shift+K)
4. Abra VS Code
5. Arquivo → apps/desktop/public/inject-standalone.js
6. Ctrl+A (seleciona tudo)
7. Ctrl+C (copia)
8. Volta para Browser
9. Console → Ctrl+V (cola)
10. Enter
```

✅ Você verá um banner grande em VERDE = sucesso!

### Opção 2: Usar Helper Script

```bash
cd apps/desktop/public
node copy-inject-script.js
```

Depois:
```
Browser Console → Ctrl+V → Enter
```

---

## 🔴 Executar Testes

### Teste A: CH1 com Microfone

**No console, digite:**

```javascript
AX_CAPTURE.clear()
```

**Fale no microfone conectado a CH1 POR 5 SEGUNDOS**

```javascript
AX_CAPTURE.summary()
```

```javascript
AX_CAPTURE.export()
```

✅ Um arquivo JSON será baixado automaticamente

---

### Teste B: CH31/32 com Spotify

**No console, digite:**

```javascript
AX_CAPTURE.clear()
```

**Roteie o áudio do Spotify para CH31/32 e deixe tocar POR 5 SEGUNDOS**

```javascript
AX_CAPTURE.summary()
```

```javascript
AX_CAPTURE.export()
```

✅ Outro arquivo JSON será baixado

---

## 📊 Comparar Resultados

Abra os dois JSONs baixados. Procure por:

### Se Teste B tiver NOVOS parâmetros:
```json
"logs": [
  { "type": "TX", "hex": "80030600020003...0014..." }  ← Param 20 apareceu!
]
```

**Conclusão:** CH17-32 está sendo polado, mas o app não mapeia. Fix rápido.

### Se Teste B NÃO tiver nada de novo:
```json
"logs": [
  { "type": "TX", "hex": "80030600020003000400..." }  ← Mesmos params de sempre
]
```

**Conclusão:** App não pede CH17-32. Fix: adicionar params 10-17 ao polling.

---

## 🎮 Todos os Comandos

```javascript
AX_CAPTURE.clear()              // Limpar logs
AX_CAPTURE.summary()            // Mostrar stats em tabela
AX_CAPTURE.export()             // Salvar JSON (arquivo + clipboard)
AX_CAPTURE.toggle()             // Ativar/desativar
AX_CAPTURE.sequence()           // Ver sequência de eventos
AX_CAPTURE.stats()              // Stats avançadas
AX_CAPTURE.logs                 // Ver array bruto

AX_CAPTURE.enabled              // true/false (ler estado)
AX_CAPTURE.txCount              // Número de TX
AX_CAPTURE.rxCount              // Número de RX
```

---

## 🔍 Como Ler os Logs JSON

### Estrutura básica:
```json
{
  "capturedAt": "2026-06-03T10:30:45.123Z",
  "sessionDuration": 45000,
  "txCount": 205,
  "rxCount": 205,
  "logs": [
    {
      "at": 1234,
      "type": "TX",
      "socketId": "ws_8088",
      "byteLength": 20,
      "hex": "80030600020003000400050006000700080009...",
      "bytes": [128, 3, 6, 0, 2, 0, 3, 0, 4, ...]
    }
  ]
}
```

### Decoding do hex (TX - Polling Request):

```
80 03 06 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 09
│  │  │  └─ Param 2   └─ Param 3   └─ Param 4   └─ Param 5 ...
│  │  └──── Opcode 6 (read params)
│  └─────── Length
└────────── Header 0x80
```

**Meaning:**
- Está enviando um read-params de CH1-2, CH3-4, CH5-6, CH7-8, CH9-...

### Decoding do RX (Response com Valores):

```
00 02 00 50  00 03 00 A0
│  │  │  │   │  │  │  └─ Valor param 3
│  │  │  └─ Valor param 2 (0x0050 = 80 decimal)
│  │  └──── Param 2
│  └─────── Param 2 (continued from left)
└────────── Param 1 (if exists)
```

**Meaning:**
- Param 2 = 80 (CH1-2)
- Param 3 = 160 (CH3-4)

---

## ❓ Troubleshooting

| Problema | Solução |
|----------|---------|
| Não vejo banner verde | Script não colou completamente. F12 → Console, procure por erros vermelhos. Tente novamente. |
| `AX_CAPTURE is undefined` | Script não foi executado. Confirme que apareceu o banner verde. |
| Nenhuma TX/RX capturada | Mesa não está conectada ou não está enviando. Tente fazer noise no CH1 enquanto coloca o script. |
| Export não funciona | Tente: `JSON.stringify(AX_CAPTURE.export())` e copie manualmente |

---

## 📋 Checklist

- [ ] Injeti o script (vi banner verde)
- [ ] Executei Teste A (CH1 mic)
- [ ] Executei Teste B (CH31/32 Spotify)
- [ ] Baixei os dois JSON
- [ ] Comparei os dois arquivos
- [ ] Identifiquei os parâmetros novos/diferentes
- [ ] Documentei os parâmetros descobertos

---

## 🎯 Próximos Passos (Após captura)

1. **Anote os parâmetros descobertos** (ex: params 10-17 para CH17-32, params 100+ para AUX, etc)
2. **Volte para o App.tsx** em `/Volumes/SSD_Felipe/AX-Controller/apps/desktop/src/App.tsx`
3. **Ajuste o polling loop** (linhas 8208-8250) com os novos parâmetros
4. **Ajuste o filtering** (linhas 8018-8165) se necessário
5. **Recompile e teste** o app Tauri localmente
6. **Veja se os metros aparecem** para CH17-32 e AUX/FX

---

## 📞 Reference

- **Mesa IP:** 192.168.1.75
- **WebSocket Port:** 8088
- **Opcode 6:** Read parameters
- **CRC:** CRC16-Modbus (implementado em axios16Client.ts:608)
- **Meter decode:** meterByteToDb() e meterDbToLevel() em App.tsx

---

## ✨ Que funciona agora

```
✓ WebSocket TX/RX intercept (sem alterar protocolo)
✓ Real-time console coloring (verde TX, magenta RX)
✓ JSON export com timestamp
✓ Clipboard auto-copy
✓ Max 200 logs (sem memory leak)
✓ Seguro (não modifica UI da mesa)
✓ Rápido (overhead mínimo)
```

---

## ❌ O que NÃO foi feito

```
✗ Não modifica App AX Control
✗ Não altera protocolo DUONN
✗ Não cria novo WebSocket
✗ Não tenta "corrigir" meter ainda
✗ Apenas captura dados da mesa real
```

---

**Bom captura! 🚀**

Para mais detalhes, leia: **README-CAPTURA.md**
