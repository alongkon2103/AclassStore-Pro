const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

const { activateLicense } = require('./services/licenseService');
const { MiddlewareClient } = require('./services/middlewareClient');
const { startConnection, stopConnection } = require('./services/tiktokService');
const { getOrRequestSessionId, clearSessionId } = require('./services/tiktokAuth');

const SERVER_URL = "https://api.aclassstore.com";

let mainWindow;
let middlewareClient = null;
let sessionInfo = { token: null, username: null };
let tiktokSessionId = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    resizable: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/LogoV.ico'),
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('license:activate', async (event, licenseKey) => {
  try {
    const result = await activateLicense(licenseKey);
    sessionInfo.token = result.token;
    sessionInfo.username = result.tiktokUsername;
    return { ok: true, username: result.tiktokUsername };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('tiktok:connect', async () => {
  if (!sessionInfo.token || !sessionInfo.username) {
    return { ok: false, error: 'Not authenticated. Please activate license first.' };
  }

  if (!tiktokSessionId) {
    try {
      if (mainWindow) mainWindow.webContents.send('tiktok:status', {
        connected: false,
        message: 'กำลังตรวจสอบ session...'
      });
      tiktokSessionId = await getOrRequestSessionId();
    } catch (err) {
      console.warn('TikTok login skipped, connecting without sessionid');
    }
  }

  middlewareClient = new MiddlewareClient(SERVER_URL, sessionInfo.token, sessionInfo.username);
  const registered = await middlewareClient.register();

  if (!registered) {
    return { ok: false, error: 'Connection rejected by server (Token revoked). Please re-activate.' };
  }

  startConnection(sessionInfo.username, middlewareClient, {
    onStatus: (connected, message) => {
      if (mainWindow) mainWindow.webContents.send('tiktok:status', { connected, message });
    },
    onGift: (data) => {
      if (mainWindow) mainWindow.webContents.send('tiktok:gift', data);
    },
    onChat: (data) => {
      if (mainWindow) mainWindow.webContents.send('tiktok:chat', data);
    },
    onLike: (data) => {
      if (mainWindow) mainWindow.webContents.send('tiktok:like', data);
    },
    onFollow: (data) => {
      if (mainWindow) mainWindow.webContents.send('tiktok:follow', data);
    },
    onError: (message) => {
      if (mainWindow) mainWindow.webContents.send('tiktok:error', message);
    }
  }, tiktokSessionId);

  return { ok: true };
});

ipcMain.handle('tiktok:disconnect', async () => {
  stopConnection();
  tiktokSessionId = null;
  // ไม่ clearSessionId() เพื่อให้ครั้งต่อไปไม่ต้อง login ใหม่

  if (middlewareClient) {
    try { await middlewareClient.stop(); } catch (e) {}
    middlewareClient = null;
  }

  sessionInfo.token = null;
  sessionInfo.username = null;

  if (mainWindow) mainWindow.webContents.send('tiktok:status', {
    connected: false,
    message: 'Stopped. Please re-activate to start again.'
  });
  return { ok: true };
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (middlewareClient) middlewareClient.stop();
  stopConnection();
  app.quit();
});

ipcMain.handle('app:close', () => {
  stopConnection();
  if (middlewareClient) {
    middlewareClient.stop().catch(() => {}).finally(() => {
      app.quit();
    });
  } else {
    app.quit();
  }
});