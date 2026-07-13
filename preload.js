const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: (kind) => ipcRenderer.invoke('load-data', kind),
  saveData: (kind, data) => ipcRenderer.invoke('save-data', kind, data),
  minimize: () => ipcRenderer.send('minimize'),
  close: () => ipcRenderer.send('close'),
  flashFrame: (on) => ipcRenderer.send('flash-frame', on),
  resizeStart: () => ipcRenderer.send('resize-start'),
  resizeMove: (side, dx) => ipcRenderer.send('resize-move', side, dx),
  resizeEnd: () => ipcRenderer.send('resize-end'),
});
