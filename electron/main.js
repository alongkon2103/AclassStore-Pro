const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

const { activateLicense } = require('./services/licenseService');
const { MiddlewareClient } = require('./services/middlewareClient');
const { startConnection, stopConnection } = require('./services/tiktokService');
const { getOrRequestSessionId, clearSessionId } = require('./services/tiktokAuth');
const { autoUpdater } = require('electron-updater');

const SERVER_URL = "https://api.aclassstore.com";

let mainWindow;
let middlewareClient = null;
let sessionInfo = { token: null, username: null };
let tiktokSessionId = null;

function sendStatus(connected, message, state) {
  if (mainWindow) {
    mainWindow.webContents.send('tiktok:status', { connected, message, state });
  }
}

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

  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update:available', info);
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update:downloaded');
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) mainWindow.webContents.send('update:progress', progress);
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater Error]', err.message);
});

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

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
      sendStatus(false, 'กำลังตรวจสอบ session...', 'WAIT');
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

  const callbacks = {
    onStatus: (connected, message, state = null) => {
      sendStatus(connected, message, state || (connected ? 'LIVE' : 'OFFLINE'));
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
    onError: async (message) => {
      const isSessionError =
        message.includes('Room ID') ||
        message.includes('Websocket') ||
        message.includes('401') ||
        message.includes('unauthorized') ||
        message.includes('UNAUTHORIZED');

      if (isSessionError) {
        clearSessionId();
        tiktokSessionId = null;
        stopConnection();

        try {
          sendStatus(false, 'Session หมดอายุ กำลัง login ใหม่...', 'WAIT');
          tiktokSessionId = await getOrRequestSessionId();
          startConnection(sessionInfo.username, middlewareClient, callbacks, tiktokSessionId);
        } catch (err) {
          sendStatus(false, 'Login ไม่สำเร็จ กรุณา connect ใหม่', 'OFFLINE');
        }
        return;
      }

      if (mainWindow) mainWindow.webContents.send('tiktok:error', message);
    }
  };

  startConnection(sessionInfo.username, middlewareClient, callbacks, tiktokSessionId);
  return { ok: true };
});

ipcMain.handle('tiktok:disconnect', async () => {
  stopConnection();
  tiktokSessionId = null;

  if (middlewareClient) {
    try { await middlewareClient.stop(); } catch (e) {}
    middlewareClient = null;
  }

  sessionInfo.token = null;
  sessionInfo.username = null;

  sendStatus(false, 'Stopped. Please re-activate to start again.', 'OFFLINE');
  return { ok: true };
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
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
    middlewareClient.stop().catch(() => {}).finally(() => app.quit());
  } else {
    app.quit();
  }
});