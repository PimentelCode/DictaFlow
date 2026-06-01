const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onToggleRecord: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('toggle-record', subscription);
    return () => ipcRenderer.removeListener('toggle-record', subscription);
  },
  openSettings: () => ipcRenderer.send('open-settings'),
  closeSettings: () => ipcRenderer.send('close-settings'),
  pasteText: (text) => ipcRenderer.send('paste-text', text),
  callAiApi: (params) => ipcRenderer.invoke('call-ai-api', params),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height)
});
