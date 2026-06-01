const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, session } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Force single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0); // Exit process immediately to prevent duplicate window spawns
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

let mainWindow = null;
let tempVbsPath = '';

const SYSTEM_PROMPTS = {
  general: `Você é um assistente de ditado inteligente. Transcreva o áudio corrigindo gagueiras, repetições, erros de concordância e vícios de linguagem. Mantenha o texto limpo, fluido e pontuado de maneira natural. Retorne APENAS o texto corrigido final.`,
  professional: `Você é um redator profissional. Transforme o áudio falado em um e-mail ou mensagem corporativa impecável. Ajuste o tom para formal, corrija pontuação, organize parágrafos e remova gagueiras/expressões informais. Retorne APENAS o texto formatado final.`,
  casual: `Você é um assistente de conversação informal. Ajuste o áudio para uma mensagem amigável e natural do WhatsApp. Remova repetições desnecessárias e gagueiras, mas mantenha a simplicidade e a informalidade natural de uma conversa. Retorne APENAS o texto final.`,
  programming: `Você é um especialista em comunicação técnica para engenharia de software. Reescreva o texto original ditado para torná-lo uma instrução técnica clara, livre de ambiguidades, bem pontuada e profissional, adequada para um programador ou ferramenta de IA (como Github Copilot/Cursor). Substitua termos informais por jargões técnicos adequados (ex: "muda o visual" por "atualizar a folha de estilo CSS"). Remova gagueiras e hesitações. Retorne APENAS o texto técnico refinado final.`,
  prompt: `Você é um engenheiro de prompts especialista. Reescreva o texto ditado para transformá-lo em uma instrução (prompt) clara, direta, bem estruturada e altamente eficaz para ser usada em ferramentas de IA (como ChatGPT, Claude, Gemini). Melhore a clareza da instrução, adicione contexto implícito relevante se necessário e mantenha o comando acionável. Retorne APENAS o prompt otimizado final.`
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 70, // Start height (capsule only)
    type: 'toolbar',
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Position centered at bottom of screen
  mainWindow.setPosition(
    Math.round((width - 380) / 2),
    Math.round(height - 120)
  );

  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  tempVbsPath = path.join(app.getPath('temp'), 'dictaflow_paste.vbs');
  fs.writeFileSync(tempVbsPath, 'Set WshShell = WScript.CreateObject("WScript.Shell")\nWshShell.SendKeys "^v"');

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, origin) => {
    return permission === 'media';
  });

  createMainWindow();

  // Register global shortcuts
  globalShortcut.register('Super+Control+Space', () => {
    if (mainWindow) mainWindow.webContents.send('toggle-record');
  });

  globalShortcut.register('Control+Super+Space', () => {
    if (mainWindow) mainWindow.webContents.send('toggle-record');
  });

  globalShortcut.register('Control+Alt+D', () => {
    if (mainWindow) mainWindow.webContents.send('toggle-record');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  try {
    if (fs.existsSync(tempVbsPath)) {
      fs.unlinkSync(tempVbsPath);
    }
  } catch (e) {
    console.error(e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.on('resize-window', (event, targetWidth, targetHeight) => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    
    // Shift Y upwards as height increases to keep the bottom aligned floating above taskbar
    const newY = bounds.y + bounds.height - targetHeight;
    
    mainWindow.setBounds({
      x: bounds.x,
      y: newY,
      width: targetWidth,
      height: targetHeight
    });
  }
});

ipcMain.on('paste-text', (event, text) => {
  clipboard.writeText(text);

  if (mainWindow) {
    mainWindow.hide();
  }

  setTimeout(() => {
    exec(`wscript.exe "${tempVbsPath}"`, (err) => {
      if (err) {
        console.error('Failed to inject paste shortcut via VBScript:', err);
      }
      
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.show();
        }
      }, 80);
    });
  }, 100);
});

// AI API Call Handler in Main Process
ipcMain.handle('call-ai-api', async (event, { provider, apiKey, mode, base64Audio, audioType }) => {
  try {
    const promptText = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;
    const buffer = Buffer.from(base64Audio, 'base64');
    
    const tempAudioPath = path.join(app.getPath('temp'), `dictaflow_input_${Date.now()}.webm`);
    fs.writeFileSync(tempAudioPath, buffer);

    if (provider === 'gemini') {
      if (!apiKey) throw new Error('Chave API do Gemini não informada.');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: audioType || 'audio/webm', data: base64Audio } },
              { text: `${promptText}\n\nInstrução adicional: Ouça o áudio fornecido e aplique a formatação pedida.` }
            ]
          }]
        })
      });

      try { fs.unlinkSync(tempAudioPath); } catch(e) {}

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini: ${errMsg}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Nenhuma resposta retornada do Gemini.');
      return { success: true, text };
    } 
    
    else if (provider === 'openai') {
      if (!apiKey) throw new Error('Chave API da OpenAI não informada.');

      const fileBlob = new Blob([buffer], { type: audioType || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', fileBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });

      if (!whisperRes.ok) {
        const errJson = await whisperRes.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${whisperRes.status}`;
        try { fs.unlinkSync(tempAudioPath); } catch(e) {}
        throw new Error(`OpenAI Whisper: ${errMsg}`);
      }

      const whisperData = await whisperRes.json();
      const rawText = whisperData.text;

      const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: promptText },
            { role: 'user', content: `Texto original ditado: "${rawText}"` }
          ],
          temperature: 0.3
        })
      });

      try { fs.unlinkSync(tempAudioPath); } catch(e) {}

      if (!chatRes.ok) {
        const errJson = await chatRes.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${chatRes.status}`;
        throw new Error(`OpenAI GPT: ${errMsg}`);
      }

      const chatData = await chatRes.json();
      return { success: true, text: chatData.choices?.[0]?.message?.content || '' };
    } 
    
    else if (provider === 'groq') {
      if (!apiKey) throw new Error('Chave API da Groq não informada.');

      const fileBlob = new Blob([fs.readFileSync(tempAudioPath)], { type: audioType || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', fileBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'pt');

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });

      if (!whisperRes.ok) {
        const errJson = await whisperRes.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${whisperRes.status}`;
        try { fs.unlinkSync(tempAudioPath); } catch(e) {}
        throw new Error(`Groq Whisper: ${errMsg}`);
      }

      const whisperData = await whisperRes.json();
      const rawText = whisperData.text;

      const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: promptText },
            { role: 'user', content: `Texto original ditado: "${rawText}"` }
          ],
          temperature: 0.3
        })
      });

      try { fs.unlinkSync(tempAudioPath); } catch(e) {}

      if (!chatRes.ok) {
        const errJson = await chatRes.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${chatRes.status}`;
        throw new Error(`Groq LLaMA: ${errMsg}`);
      }

      const chatData = await chatRes.json();
      return { success: true, text: chatData.choices?.[0]?.message?.content || '' };
    }

    try { fs.unlinkSync(tempAudioPath); } catch(e) {}
    throw new Error('Provedor desconhecido.');
  } catch (error) {
    console.error('AI API Execution Error:', error);
    return { success: false, error: error.message };
  }
});
