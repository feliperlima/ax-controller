# ⚡ Quick Reference - AX Capture

## 🚀 Start

```
1. Browser   → http://192.168.1.75
2. F12       → Console tab
3. Ctrl+C    → Copy inject-standalone.js content
4. Ctrl+V    → Paste in console
5. Enter     → See green banner ✓
```

## 🔴 TEST A: CH1 Mic (5 sec)

```javascript
AX_CAPTURE.clear()              // Clear
// Fale no CH1...
AX_CAPTURE.export()             // Download JSON
```

## 🔴 TEST B: CH31/32 Spotify (5 sec)

```javascript
AX_CAPTURE.clear()              // Clear
// Route Spotify to CH31/32...
AX_CAPTURE.export()             // Download JSON
```

## 📊 Compare Results

| Test | CH1 Params | CH31/32 Params | Meaning |
|------|-----------|----------------|---------|
| **A** | 2-9 change | — | CH1 works |
| **B** | 2-9 same | ? change | Found new params! |
| **B** | 2-9 same | nothing | Not requested |

## 🔍 Decode TX (Request)

```
80 03 06 00 02 00 03 00 04
│  │  │  └─ Param 2 (CH1-2)
│  │  │     Param 3 (CH3-4)
│  │  └──── Opcode 6
│  └─────── Length
└────────── Header 0x80
```

## 🔍 Decode RX (Response)

```
00 02 00 50 00 03 00 41
│  │  │  │  │  │  │  └─ Value for Param 3
│  │  │  │  │  │  └───── Param 3 continued
│  │  │  └──────────── Param 2 value (0x0050 = 80 decimal)
│  │  └──────────────── Param 2 high byte
│  └──────────────────── Param 2 low byte
```

## 🎮 Commands

```javascript
AX_CAPTURE.clear()       // Clear logs
AX_CAPTURE.summary()     // Show stats
AX_CAPTURE.export()      // Save JSON
AX_CAPTURE.toggle()      // On/off
AX_CAPTURE.sequence()    // Event order
AX_CAPTURE.logs          // Raw array
```

## ❌ Help

| Problem | Solution |
|---------|----------|
| No green banner | Script didn't paste fully. Check for red errors. Try again. |
| No TX/RX data | Mesa not connected. Try `AX_CAPTURE.summary()`. |
| Export fails | Paste entire JSON manually from `AX_CAPTURE.logs` |

## 📂 Files

- **inject-standalone.js** ← Copy/paste this
- **README-CAPTURA.md** ← Full instructions
- **CAPTURA-INSTRUCOES.md** ← Detailed guide
- **copy-inject-script.js** ← `node` helper

## 🎯 Goal

Find **which params** are sent for CH1 vs CH31/32 → **Fix meter mapping** in App.tsx
