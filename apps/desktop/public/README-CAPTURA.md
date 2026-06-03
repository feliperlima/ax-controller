# 🎯 AX WebSocket Capture - Como Executar

## TL;DR - Comece em 60 segundos

### 1. Abrir Mesa
```
Navegador → http://192.168.1.75
```

### 2. Abrir DevTools
```
Pressione F12
Vá para aba "Console"
```

### 3. Injetar Script
Abra este arquivo no VS Code:
```
apps/desktop/public/inject-standalone.js
```

Selecione TODO o conteúdo (Ctrl+A), copie (Ctrl+C), volte para a abaSS do console, cole (Ctrl+V), pressione Enter.

✅ Você verá um banner grande em VERDE = sucesso!

---

## 📊 Executar Teste A: CH1 Microfone

No console, execute em sequência:

```javascript
AX_CAPTURE.clear()
```

**Fale no CH1 por 5 segundos...**

```javascript
AX_CAPTURE.summary()
```

```javascript
AX_CAPTURE.export()
```

✅ Um arquivo JSON será baixado automaticamente com o nome `ax-capture-*.json`

---

## 📊 Executar Teste B: CH31/32 Spotify

No console, execute:

```javascript
AX_CAPTURE.clear()
```

**Roteie Spotify para CH31/32 e deixe tocar 5 segundos...**

```javascript
AX_CAPTURE.summary()
```

```javascript
AX_CAPTURE.export()
```

✅ Outro arquivo JSON será baixado

---

## 🔍 Como Interpretar os Logs

Abra os dois arquivos JSON em um editor. Procure pela estrutura:

```json
{
  "txCount": 45,
  "rxCount": 45,
  "logs": [
    {
      "at": 234,
      "type": "TX",
      "hex": "80030600020003000400050006...",
      "bytes": [128, 3, 6, 0, 2, 0, 3, 0, 4, ...]
    },
    {
      "at": 245,
      "type": "RX",
      "hex": "00020050000300410004003f0005...",
      "bytes": [0, 2, 0, 80, 0, 3, 0, 65, ...]
    }
  ]
}
```

### Decode TX (Envio de Polagem)

```
Bytes [0]:   0x80 = Header DUONN
Bytes [1]:   Length of payload
Bytes [2]:   0x06 = Opcode 6 (read params)
Bytes [3-4]: Param 1 (big-endian)
Bytes [5-6]: Param 2 (big-endian)
...
```

**Exemplo:**
```
80 03 06 00 02 00 03
```

Meaning:
- `80` = Header
- `03 06` = Opcode 6
- `00 02` = Param 2 (CH1-2 meters)
- `00 03` = Param 3 (CH3-4 meters)

### Decode RX (Resposta com Valores)

Cada parâmetro retorna 4 bytes:
```
Bytes [0-1]: Param (big-endian)
Bytes [2-3]: Value (big-endian)
```

**Exemplo:**
```
00 02 00 50 00 03 00 A0
```

Meaning:
- Param 0x0002 (2), Value 0x0050 (80 decimal) = CH1-2 meter = 80
- Param 0x0003 (3), Value 0x00A0 (160 decimal) = CH3-4 meter = 160

---

## 📈 Comparação Teste A vs Teste B

### Cenário 1: CH17-32 NÃO é polado (mais provável)
```
Teste A (CH1):
  TX contém: 00 02 00 03 00 04 00 05 ... 00 09 (params 2-9)
  RX valores mudam para CH1

Teste B (CH31/32):
  TX contém: 00 02 00 03 00 04 00 05 ... 00 09 (MESMO!)
  RX valores NÃO mudam para CH31/32 (ou continuam os mesmos que antes)
  
CONCLUSÃO: App não pede CH17-32. Fix = adicionar params 10-17 ao polling
```

### Cenário 2: CH17-32 É polado mas não decodificado
```
Teste A (CH1):
  TX: params 2-9

Teste B (CH31/32):
  TX: params 2-9, 10-17 (NOVOS!)
  RX: params 10-17 com valores que mudam
  
CONCLUSÃO: App pede, mas App.tsx não mapeia para a UI. Fix = ajustar filtering
```

### Cenário 3: CH17-32 usa encoding completamente diferente
```
Teste B (CH31/32):
  TX: params diferentes (ex: 50-60)
  RX: estrutura diferente
  
CONCLUSÃO: AX32 usa layout diferente. Fix = descubrir novo layout
```

---

## 🎮 Todos os Comandos Disponíveis

```javascript
// Controle de captura
AX_CAPTURE.clear()              // Apaga todos os logs
AX_CAPTURE.toggle()             // Ativar/desativar captura
AX_CAPTURE.enabled              // true/false (ler estado)

// Visualização
AX_CAPTURE.summary()            // Resumo em tabela
AX_CAPTURE.sequence()           // Sequência de TX/RX
AX_CAPTURE.stats()              // Stats avançadas

// Dados
AX_CAPTURE.logs                 // Array completo (leitura)
AX_CAPTURE.txCount              // Número de TX
AX_CAPTURE.rxCount              // Número de RX
AX_CAPTURE.export()             // Salva JSON (arquivo + clipboard)

// Debug
AX_CAPTURE.sessionStart         // Timestamp de início
AX_CAPTURE.initialized          // true se hooks estão ativos
```

---

## ❌ Troubleshooting

### "Não vejo nenhuma mensagem de sucesso"
1. Confirme que o script foi colado COMPLETAMENTE
2. Procure por erros vermelhos no console
3. Tente: `console.log(AX_CAPTURE)` - deve mostrar object

### "Não aparece nenhuma captura"
1. Confirme mesa está respondendo: `ping 192.168.1.75`
2. Tente: `AX_CAPTURE.summary()` - deve mostrar TX/RX > 0
3. Pode ser que WebSocket da mesa fecha rapidamente - tente fazer noise no CH1 enquanto injeta

### "Export não funciona"
1. Tente manualmente: `JSON.stringify(AX_CAPTURE.export())`
2. Deve aparecer JSON gigante no console
3. Copie manualmente: Ctrl+C em cima do JSON

### "Preciso de mais detalhes"
```javascript
// Ver todos os logs brutos
console.table(AX_CAPTURE.logs)

// Ver primeiro log de cada tipo
console.log(AX_CAPTURE.logs.find(l => l.type === 'TX'))
console.log(AX_CAPTURE.logs.find(l => l.type === 'RX'))
```

---

## 📂 Arquivos Inclusos

- **inject-standalone.js** → Script principal para copiar/colar no console
- **ax-capture-inject.js** → Versão para servidor (alternativa)
- **launcher.html** → Launcher visual (opcional)
- **ax-capture.html** → Wrapper iframe (obsoleto)
- **CAPTURA-INSTRUCOES.md** → Instruções detalhadas completas
- **GUIA-RAPIDO.md** → Guia rápido (referência)
- **README.md** → Este arquivo

---

## ✅ Próximos Passos

1. **Execute os testes A e B** acima
2. **Compare os JSON** exportados
3. **Identifique os parâmetros** que aparecem em cada caso
4. **Volte para `/Volumes/SSD_Felipe/AX-Controller/apps/desktop/src/App.tsx`**
5. **Ajuste o polling** com os novos parâmetros descobertos
6. **Recompile e teste** o app localmente

---

**Bom captura! 🚀**
