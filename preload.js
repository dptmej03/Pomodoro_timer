const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: (kind) => ipcRenderer.invoke('load-data', kind),
  saveData: (kind, data) => ipcRenderer.invoke('save-data', kind, data),
  // 창이 닫히는 중에는 invoke가 배달되기 전에 렌더러가 죽을 수 있어 동기 저장을 쓴다
  saveDataSync: (kind, data) => ipcRenderer.sendSync('save-data-sync', kind, data),
  minimize: () => ipcRenderer.send('minimize'),
  close: () => ipcRenderer.send('close'),
  flashFrame: (on) => ipcRenderer.send('flash-frame', on),
  resizeStart: () => ipcRenderer.send('resize-start'),
  resizeMove: (side, dx) => ipcRenderer.send('resize-move', side, dx),
  resizeEnd: () => ipcRenderer.send('resize-end'),
});
