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
  settings: { theme: 'cream', completedBehavior: 'moveDown', sound: true, autoDelete: false, windowWidth: 280, presets: [5, 15, 30, 45, 50] },
};

// 창 크기: 280px이 기본이자 최소, 가로로만 늘릴 수 있다 (높이 고정)
const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const HEIGHT = 380;
const clampWidth = (w) => Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w || MIN_WIDTH)));

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
    width: clampWidth(loadJson('settings').windowWidth),
    height: HEIGHT,
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
ipcMain.handle('save-data', (_e, kind, data) => {
  // 렌더러가 들고 있는 windowWidth가 오래됐을 수 있으니 항상 실제 창 너비로 덮어쓴다
  if (kind === 'settings' && win) data.windowWidth = win.getBounds().width;
  return saveJson(kind, data);
});
ipcMain.on('minimize', () => win?.minimize());
ipcMain.on('close', () => win?.close());
ipcMain.on('flash-frame', (_e, on) => win?.flashFrame(on));

// 가로 크기 조절: 투명 frameless 창은 OS 가장자리 리사이즈가 불안정해서
// 렌더러의 가장자리 핸들 드래그 → IPC → setBounds로 직접 처리한다
let resizeStartBounds = null;
ipcMain.on('resize-start', () => {
  resizeStartBounds = win ? win.getBounds() : null;
});
ipcMain.on('resize-move', (_e, side, dx) => {
  if (!win || !resizeStartBounds) return;
  const b = resizeStartBounds;
  const width = clampWidth(side === 'right' ? b.width + dx : b.width - dx);
  const x = side === 'left' ? b.x + b.width - width : b.x; // 왼쪽 드래그는 오른쪽 가장자리 고정
  win.setBounds({ x, y: b.y, width, height: HEIGHT });
});
ipcMain.on('resize-end', () => {
  if (!win || !resizeStartBounds) return;
  resizeStartBounds = null;
  const settings = loadJson('settings');
  settings.windowWidth = win.getBounds().width;
  saveJson('settings', settings);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
