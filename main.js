const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const DATA_DIR = app.getPath('userData');
const FILES = {
  todos: path.join(DATA_DIR, 'todos.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
};

const DEFAULTS = {
  todos: { todos: [] },
  settings: { theme: 'cream', completedBehavior: 'moveDown', sound: true, autoDelete: false },
};

function loadJson(kind) {
  try {
    return { ...DEFAULTS[kind], ...JSON.parse(fs.readFileSync(FILES[kind], 'utf8')) };
  } catch {
    return { ...DEFAULTS[kind] };
  }
}

function saveJson(kind, data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILES[kind], JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 280,
    height: 380,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', (_e, kind) => loadJson(kind));
ipcMain.handle('save-data', (_e, kind, data) => saveJson(kind, data));
ipcMain.on('minimize', () => win?.minimize());
ipcMain.on('close', () => win?.close());
ipcMain.on('flash-frame', (_e, on) => win?.flashFrame(on));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
