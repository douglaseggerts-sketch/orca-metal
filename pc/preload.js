const { contextBridge, ipcRenderer } = require('electron');

// Mesma "ponte" que o app Android oferece à tela (window.Android)
contextBridge.exposeInMainWorld('Android', {
  plataforma: () => 'pc',
  fetch: (url) => ipcRenderer.invoke('fetch', url),
  verificarAgora: () => ipcRenderer.invoke('verificarAgora'),
  sincronizar: () => ipcRenderer.invoke('sincronizar'),
  load: (k) => ipcRenderer.sendSync('load', k),
  save: (k, v) => ipcRenderer.sendSync('save', k, v),
  alertas: () => ipcRenderer.sendSync('alertas'),
  addAlerta: (j) => ipcRenderer.sendSync('addAlerta', j),
  removerAlerta: (id) => ipcRenderer.sendSync('removerAlerta', id),
  ativarAlerta: (id, on) => ipcRenderer.sendSync('ativarAlerta', id, on),
  notificacoesLiberadas: () => ipcRenderer.sendSync('notificacoesLiberadas')
});
