# AX WebSocket Capture - Guia Rápido

## ⚡ Começar em 30 segundos

### Passo 1: Abrir mesa
```
Abra navegador → http://192.168.1.75
```

### Passo 2: Injetar capturador
```
Pressione F12 (DevTools)
Vá para aba Console
Cole o código abaixo e pressione Enter:
```

**COPIE TUDO ISTO:**
```javascript
(function(){const s=document.createElement('script');const c=document.head||document.body;const t=Date.now();s.src='data:text/javascript;base64,KGZ1bmN0aW9uKCl7J3VzZSBzdHJpY3QnO3dpbmRvdy5BWF9DQVBUVVJFPSB7ZW5hYmxlZDp0cnVlLGxvZ3M6W10sdHhDb3VudDowLHJ4Q291bnQ6MCxzZXNzaW9uU3RhcnQ6RGF0ZS5ub3coKSxsb2coKSt0eXBlLHNvY2tldElkLGJ5dGVMZW5ndGgsYXJhd0RhdGEpe2lmKCF0aGlzLmVuYWJsZWQpcmV0dXJuO2NvbnN0IGVudHJ5PXthdDpEYXRlLm5vdygpLXRoaXMuc2Vzc2lvblN0YXJ0LHR5cGU6dHlwZSxzb2NrZXRJZDpzb2NrZXRJZCxieXRlTGVuZ3RoOmJ5dGVMZW5ndGgsaGV4OnRoaXMuX3RvSGV4KGFyYXdEYXRhKS5zbGljZSgwLDEyOCksYnl0ZXM6QXJyYXkuZnJvbShuZXcgVWludDhBcnJheShhcmF3RGF0YSkpLnNsaWNlKDAsMzIpfTt0aGlzLmxvZ3MucHVzaChlbnRyeSk7aWYodGhpcy5sb2dzLmxlbmd0aD4yMDApdGhpcy5sb2dzLnNoaWZ0KCk7aWYodHlwZT09PSdUWCcpdGhpcy50eENvdW50Kz0xO2Vsc2UgdGhpcy5yeENvdW50Kz0xO3RoaXMuX2xvZ1RvQ29uc29sZShlbnRyeSl9LF90b0hleCgoKXtidWZmZXIpe3JldHVybiBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpLm1hcCgoYik9Pignmdow'+btG3RvU3RyaW5nKDE2KSkuc2xpY2UoLTIpKS5qb2luKCcnKX0sX2xvZ1RvQ29uc29sZWVudHJ5KXt2YXIgcHJlZml4PWVudHJ5LnR5cGU9PT0nVFgnPycweEZGMDAwMCc6JzB4MDAwMDAyRjYnO2NvbnNvbGUubG9nKCclYycrcHJlZml4KycgJytlbnRyeS50eXBlKycgWyclK2VudHJ5LmF0Kydtc10gICAgY2Lh9XJEYXRhOiclLCdmb250OiBjb2xvcjogI0U4RkVGQjsgZm9udC13ZWlnaHQ6IGJvbGQ7JyxgJHtlbnRyeS5ieXRlTGVuZ3RofSBieXRlcyAgICAkJntlbnRyeS5oZXh9YCl9LHN1bW1hcnkoKXtjb25zb2xlLnRhYmxlKHsnVFggQ291bnQnOnRoaXMudHhDb3VudCwnUlggQ291bnQnOnRoaXMucnhDb3VudCwnVG90YWwgTG9ncycfdGhpcy5sb2dzLmxlbmd0aH0pfSxjbGVhcigpfnRoaXMubG9ncz1bXSx0aGlzLnR4Q291bnQ9MCx0aGlzLnJ4Q291bnQ9MCx0aGlzLnNlc3Npb25TdGFydD1EYXRlLm5vdygpLGNvbnNvbGUubG9nKCclY1tBWF9DQVBUVVJFXSBDZS9sZWFyZWQnLCdjb2xvcjogIzBmMDsnKX0sdG9nZ2xlKCl7dGhpcy5lbmFibGVkPSF0aGlzLmVuYWJsZWQsY29uc29sZS5sb2coJyVjW0FYX0NQVFVSRVNdICconsolZW5hYmxlZD8nRU5BQkxFRCc6J0RJU0FCTEVEJz8sJ2NvbG9yOiAjMGYwOycpfSxleHBvcnQoKXt2YXIgZGF0YT17Y2FwdHVyZWRBdDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksc2Vzc2lvbkR1cmF0aW9uOkRhdGUubm93KCktdGhpcy5zZXNzaW9uU3RhcnQsdHhDb3VudDp0aGlzLnR4Q291bnQscnhDb3VudDp0aGlzLnJ4Q291bnQsbG9nczp0aGlzLmxvZ3N9O3ZhciBqc29uPUpTT04uc3RyaW5naWZ5KGRhdGEsbnVsbCwyKTtjb25zb2xlLmxvZygnJWNbQVhfQ0FQVFVSRVNDIEVYUE9SVEVEI1snLCdjb2xvcjogIzBmMDsnKTtjb25zb2xlLmxvZyhqc29uKTtpZihuYXZpZ2F0b3IuY2xpcGJvYXJkKXtuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChqc29uKS50aGVuKCgpPT57Y29uc29sZS5sb2coJyVjW0FYX0NQVFVSRVNdIENvcGllZCB0byBjbGlwYm9hcmQhJywnY29sb3I6ICMwZjA7Jyl9KX1yZXR1cm4gZGF0YX0sc2VxdWVuY2UoKXtyZXR1cm4gdGhpcy5sb2dzLm1hcCgobG9nKT0+YCR7bG9nLnR5cGV9WyR7bG9nLmF0fV1gKS5qb2luKCcghuOLCGlmaih0eXBlb2YgV2ViU29ja2V0IT09J3VuZGVmaW5lZCcpe3ZhciBvcmlnU2VuZD1XZWJTb2NrZXQucHJvdG90eXBlLnNlbmQ7V2ViU29ja2V0LnByb3RvdHlwZS5zZW5kPWZ1bmN0aW9uKGRhdGEpe2lmKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fCBkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSl7dmFyIGJ5dGVzPWRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcj9uZXcgVWludDhBcnJheShkYXRhKTpkYXRhO3ZhciBzb2NrZXRJZD1gd3NfJHt0aGlzLnVybD90aGlzLnVybC5zcGxpdCgnOicpLnBvcCgpOid1bmtub3duJ31gO3dpbmRvdy5BWF9DQVBUVVJFLS5sb2coJ1RYJyxzb2NrZXRJZCxieXRlcy5sZW5ndGgsYnl0ZXMpfXJldHVybiBvcmlnU2VuZC5jYWxsKHRoaXMsZGF0YSl9O3ZhciBPcmlnT25NZXNzYWdlPVdlYlNvY2tldC5wcm90b3R5cGUub25tZXNzYWdlO09iamVjdC5kZWZpbmVQcm9wZXJ0eShXZWJTb2NrZXQucHJvdG90eXBlLCdvbm1lc3NhZ2UnLHtnZXQoKXtyZXR1cm4gdGhpcy5fb3JpZ09uTWVzc2FnZX0sc2V0KGhhbmRsZXIpe3RoaXMuX29yaWdPbk1lc3NhZ2U9ZnVuY3Rpb24oZXZlbnQpe2lmKGV2ZW50LmRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcil7dmFyIGJ5dGVzPW5ldyBVaW50OEFycmF5KGV2ZW50LmRhdGEpO3ZhciBzb2NrZXRJZD1gd3NfJHt0aGlzLnVybD90aGlzLnVybC5zcGxpdCgnOicpLnBvcCgpOid1bmtub3duJ31gO3dpbmRvdy5BWF9DQVBUVVJFLS5sb2coJ1JYJyxzb2NrZXRJZCxieXRlcy5sZW5ndGgsYnl0ZXMpfXJldHVybiBoYW5kbGVyLmNhbGwodGhpcyxldmVudCl9fX0pO2NvbnNvbGUubG9nKCclY1tBWF9DQVBUVVJFXSBXZWJZWFJLZSR0IFJ1bnMgQUsgUG9ydGF0aW9uIEhvb2sgTGRDIERAJ1svImNvbG9yOiAjMGYwOyBmb250LXdlaWdodDogYm9sZDsifSk7Y29uc29sZS5sb2coJyVjROFnUG9ZzZ2QlJ6N86M9SiBENDwEWFBZwOsSBPBY/MUwUzBkPbP1RBtpYzwMIDBFIFBJyODRwOE5CODs+PScsJ2NvbG9yOiAjMGYwOyBmb250LWZhbWlseTogY291cmllcjsgd2hpdGUtc3BhY2U6IHByZTsgZm9udC1zaXplOiAxMXB4Jyk7Y29uc29sZS5sb2coJyVjQ29tbWFuZHM6ICBBWF9DQVBUVVJFKQ5pc3VbbV1hcnkoKSAgIFJlc3VtaW8gb2YgVFgvUnggICAgIFxuICBBWF9DQVBUVVJFLF9kZWFyKCkgICAgICBMaW1wYXIgbG9ncyAgICAgICAgIFxuICBBWF9DQVBUVVJFKL9leHBvcnQoKSAgIEV4cG9ydGEgSlNPTiAgICAgICAgICBcbiAgQVhfQ0FQVFVSRS5fdG9nZ2xlKCkgICBQaWx0ZXIKICAnLCdjb2xvcjogIzBmMDsnKX0pKSk7';s.onload=function(){console.log('%c✓ AX_CAPTURE ready!','color: #0f0; font-weight: bold;');};c.appendChild(s);})();
```

### Passo 3: Confirmação
Você verá mensagens em **verde** no console:
- ✓ AX_CAPTURE ready!
- Mensagens de captura em tempo real

---

## 🔴 Teste A: CH1 com Microfone

```javascript
// 1. Limpar logs anteriores
AX_CAPTURE.clear()

// 2. FALE NO MICROFONE POR 5 SEGUNDOS (ch1)

// 3. Ver resumo
AX_CAPTURE.summary()

// 4. Exportar
AX_CAPTURE.export()
```

✅ Você verá arquivo JSON baixado com todos os pacotes TX/RX.

---

## 🔴 Teste B: CH31/32 com Spotify

```javascript
// 1. Limpar logs
AX_CAPTURE.clear()

// 2. Roteie Spotify para CH31/32 da mesa e deixe tocar 5 segundos

// 3. Ver resumo
AX_CAPTURE.summary()

// 4. Exportar
AX_CAPTURE.export()
```

✅ Você verá se os parâmetros mudam quando compara com o Teste A.

---

## 📊 Interpretar os Logs

Abra o arquivo JSON baixado. Procure por:

### TX (envio - setas azuis →):
```json
{
  "type": "TX",
  "hex": "80030600020003..."
}
```

Decode:
- Byte 0: `80` = protocolo
- Byte 2: `06` = read params (polagem)
- Byte 3-4: `0002` = param 2 (CH1-2)
- Byte 5-6: `0003` = param 3 (CH3-4)

### RX (recebimento - setas magenta ←):
```json
{
  "type": "RX",
  "hex": "0002005000030041..."
}
```

Decode (4 bytes por param):
- `0002 0050` = param 2, valor 0x0050 = 80 (CH1-2)
- `0003 0041` = param 3, valor 0x0041 = 65 (CH3-4)

---

## ✅ O que Esperar

| Teste | CH1 Ativo | CH17-32 Ativo |
|-------|-----------|--------------|
| **Teste A (CH1)** | Params 2-9 mudam | Nada muda |
| **Teste B (CH31/32)** | Params continuam iguais | Params ? mudam |

### Se Teste B não muda nada:
→ App **não pede** CH31/32 (falta no polling)

### Se Teste B muda diferentes params:
→ App **pede mas decodifica errado** (precisa mapear os novos params)

### Se Teste B muda params 10-17:
→ App **pede corretamente**, bug está no `App.tsx` (filtering ou mapeamento)

---

## 🎮 Controles Disponíveis

```javascript
AX_CAPTURE.enabled             // true/false
AX_CAPTURE.logs                // Array completo
AX_CAPTURE.txCount             // Número de TX
AX_CAPTURE.rxCount             // Número de RX

AX_CAPTURE.clear()             // Limpa tudo
AX_CAPTURE.toggle()            // Ativar/desativar
AX_CAPTURE.summary()           // Mostra resumo
AX_CAPTURE.export()            // Baixa JSON
AX_CAPTURE.sequence()          // Sequência de eventos
```

---

## ❓ Troubleshooting

**Não vejo captura:**
```javascript
AX_CAPTURE.enabled              // Deve ser true
AX_CAPTURE.summary()            // Deve mostrar TX/RX > 0
```

**Injetor não carregou:**
```javascript
// Coloque manualmente o script inteiro do arquivo ax-capture-inject.js
// via copy/paste no console
```

**WebSocket não conecta:**
- Abra http://192.168.1.75 em aba diferente
- Confirme que mesa responde
- Tente F5 (refresh)

---

**Próximo passo:** Compare os dois JSONs (CH1 vs CH31/32) e mapeie os parâmetros.
