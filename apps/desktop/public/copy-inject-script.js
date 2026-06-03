#!/usr/bin/env node

/**
 * AX Capture - Helper Script
 * 
 * USO:
 *   node copy-inject-script.js
 * 
 * Isso copia o script de injeção para o clipboard do seu sistema,
 * pronto para colar no console DevTools da mesa.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const scriptPath = path.join(__dirname, 'inject-standalone.js');

console.log('📋 AX Capture - Copy Inject Script to Clipboard\n');

// Ler script
fs.readFile(scriptPath, 'utf8', (err, data) => {
  if (err) {
    console.error('❌ Error reading script:', err.message);
    process.exit(1);
  }

  // Copiar para clipboard usando xclip (Linux) ou pbcopy (macOS)
  const platform = process.platform;
  let cmd;

  if (platform === 'darwin') {
    // macOS
    cmd = 'pbcopy';
  } else if (platform === 'linux') {
    // Linux - tenta xclip primeiro, depois xsel
    cmd = 'command -v xclip >/dev/null 2>&1 && xclip -selection clipboard || xsel --clipboard --input';
  } else if (platform === 'win32') {
    // Windows
    cmd = 'clip';
  } else {
    console.error('❌ Unsupported platform:', platform);
    process.exit(1);
  }

  // Executar comando
  const proc = exec(cmd, (error) => {
    if (error) {
      console.error('❌ Error copying to clipboard:', error.message);
      console.log('\n📄 Fallback: Script copied to console output instead:\n');
      console.log(data);
      process.exit(1);
    }

    console.log('✅ Script copied to clipboard!\n');
    console.log('📋 Next steps:');
    console.log('   1. Open http://192.168.1.75 in browser');
    console.log('   2. Press F12 (DevTools)');
    console.log('   3. Go to "Console" tab');
    console.log('   4. Paste (Ctrl+V)');
    console.log('   5. Press Enter\n');
    console.log('✓ You should see a green banner with "AX WebSocket Capture - Ready"\n');
    console.log('Then run:');
    console.log('   AX_CAPTURE.clear()');
    console.log('   // Fale no CH1 por 5s');
    console.log('   AX_CAPTURE.export()\n');
  });

  // Enviar script para stdin do comando
  proc.stdin.write(data);
  proc.stdin.end();
});
