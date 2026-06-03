# AX WebSocket Capture - Instruções Completas

## Objetivo
Capturar o tráfego TX/RX de WebSocket da mesa AXIOS32 oficial para mapear quais parâmetros são enviados para:
- CH1 (teste com microfone)
- CH31-32 (teste com Spotify)

Isso vai ajudar a descobrir qual a differença entre os parâmetros de CH1-16 (que funcionam no app AX Control) e CH17-32 (que não funcionam).

## Preparação

### A. Via Bookmarklet (Recomendado - uma clique)

1. Abra seu navegador
2. Crie um novo bookmark em qualquer lugar (Menu → Bookmarks → Bookmark Manager, ou Ctrl+Shift+B)
3. Cole este URL no campo "URL":

```
javascript:(function(){const s=document.createElement('script');s.src='http://192.168.1.75:8000/ax-capture-inject.js';document.head.appendChild(s);})();
```

4. Salve com o nome "AX Capture"
5. Quando quiser ativar: 
   - Abra http://192.168.1.75/
   - Clique no bookmark "AX Capture"
   - O injetor carrega automaticamente

### B. Via Console (Manual)

1. Abra http://192.168.1.75/
2. Pressione F12 para abrir DevTools
3. Vá para a aba "Console"
4. Copie TODO o conteúdo do arquivo `ax-capture-inject.js`
5. Cole no console e pressione Enter
6. Você verá a mensagem de sucesso em verde

### C. Via Script Tag Direto (Se tiver acesso ao HTML)

Se conseguir modificar o HTML da mesa (não recomendado, mas possível se estiver em desenvolvimento local):
```html
<script src="http://192.168.1.75:8000/ax-capture-inject.js"></script>
```

## Execução do Teste

### Teste A: CH1 com Microfone

```
1. AX_CAPTURE.clear()              // Limpa qualquer captura anterior
2. AX_CAPTURE.summary()            // Verifica estado
3. Fale direto no microfone conectado a CH1 por 5 segundos
4. AX_CAPTURE.summary()            // Verifica quantas TX/RX capturou
5. const data_ch1 = AX_CAPTURE.export() // Salva os dados
6. Abra o arquivo JSON baixado e procure por:
   - Parâmetros = bytes [1] e [2] da resposta
   - Se CH1 está em param 2, deve ver valores que aumentam quando fala
```

### Teste B: CH31/32 com Spotify

```
1. AX_CAPTURE.clear()              // Limpa captura de CH1
2. AX_CAPTURE.summary()            // Verifica estado
3. Abra Spotify e comece uma música
4. Roteie o áudio de Spotify para CH31/32 da mesa (via patch de roteamento)
5. Deixe tocar por 5 segundos
6. AX_CAPTURE.summary()            // Verifica quantas TX/RX capturou
7. const data_ch31 = AX_CAPTURE.export() // Salva os dados
8. Abra o arquivo JSON e procure por:
   - Parâmetros altos (20+?) que antes não apareciam
   - Diferença no padrão de TX/RX comparado com CH1
```

## Interpretação dos Logs

### Estrutura de cada log:
```json
{
  "at": 1234,                    // Tempo em ms desde o início da captura
  "type": "TX",                  // TX = envio, RX = recebimento
  "socketId": "ws_8088",         // ID do socket (para referência)
  "byteLength": 20,              // Tamanho do pacote em bytes
  "hex": "80030600020003...",    // Dados em hexadecimal
  "bytes": [128, 3, 6, 0, 2, ...] // Primeiros 32 bytes em decimal
}
```

### Decodificar parâmetros de TX:
Cada TX de poll geralmente tem este formato:
```
Byte 0: 0x80      (protocolo DUONN)
Byte 1: length    (tamanho do payload)
Byte 2: 0x06      (opcode 6 = read params)
Byte 3-4: param1_hi, param1_lo
Byte 5-6: param2_hi, param2_lo
...
```

Se você vê `80 03 06 00 02 ...`, significa:
- Está enviando opcode 6
- Primeiro parâmetro = 0x0002 = 2 (CH1-2)

Se depois vê `80 03 06 00 14 ...`, significa:
- Primeiro parâmetro = 0x0014 = 20 (algum canal alto)

### Decodificar RX:
As respostas vêm como 4-byte blocks:
```
Byte 0-1: param (big-endian)
Byte 2-3: value (big-endian)
```

Exemplo resposta: `00 02 00 50 00 03 00 A0`
- Param 0x0002 = 2, valor = 0x0050 = 80 (ch1-2 com valor 80)
- Param 0x0003 = 3, valor = 0x00A0 = 160 (ch3-4 com valor 160)

## Análise Esperada

### Se CH17-32 NÃO é polado:
- Teste A (CH1): Verá params 2-9 com valores que mudam
- Teste B (CH31/32): Verá NENHUMA mudança ou continuará vendo params 2-9
- **Conclusão:** O app não está pedindo os parâmetros de CH17-32

### Se CH17-32 É polado mas não decodificado:
- Teste A (CH1): Verá params 2-9 mudando
- Teste B (CH31/32): Verá params 10-17 (ou números altos) mudando
- **Conclusão:** O app pede mas não mapeia corretamente para a UI

### Se CH17-32 usa encoding diferente:
- Teste A (CH1): Verá o padrão esperado
- Teste B (CH31/32): Verá padrão DIFERENTE (talvez mais long, encoding especial)
- **Conclusão:** AX32 usa layout diferente de AX16/24

## Controles Disponíveis

```javascript
AX_CAPTURE.enabled               // true/false - ativa/desativa captura
AX_CAPTURE.logs                  // Array completo de logs
AX_CAPTURE.txCount              // Número de TX capturados
AX_CAPTURE.rxCount              // Número de RX capturados

AX_CAPTURE.clear()              // Limpa todos os logs
AX_CAPTURE.toggle()             // Alterna ativar/desativar
AX_CAPTURE.summary()            // Resumo no console
AX_CAPTURE.export()             // Exporta JSON para arquivo + clipboard
AX_CAPTURE.sequence()           // String da sequência de eventos
AX_CAPTURE.filter(fn)           // Filtra logs por função
```

## Troubleshooting

### Injetor carregou mas não vejo mensagens
- Verifique que a página está conectada na mesa (procure por ícone de rede)
- Abra DevTools (F12) e procure por erros em vermelho
- Tente `AX_CAPTURE.summary()` manualmente no console

### Exportar está vazio
- Confirme que ativou a captura antes do teste
- Use `AX_CAPTURE.enabled` para verificar estado
- Confirme que a mesa está enviando tráfego (procure por mensagens em DevTools)

### Bookmarklet não funciona
- Verifique que a mesa está respondendo em http://192.168.1.75/
- Certifique-se que o arquivo `ax-capture-inject.js` está servido em http://192.168.1.75:8000/
- Se não está, copie para um servidor local acessível

## Próximos Passos Após a Captura

1. Compare os dois JSONs (CH1 vs CH31/32)
2. Identifique quais parâmetros aparecem em cada teste
3. Mapeie os parâmetros para identificar o padrão
4. Com a informação do padrão, volte para o `App.tsx` no AX Control e ajuste:
   - `maxChannelMeterParam` ou
   - Lógica de mapeamento de parâmetros ou
   - Adicione suporte para AUX/FX params
5. Recompile e teste o app localmente

Boa captura!
