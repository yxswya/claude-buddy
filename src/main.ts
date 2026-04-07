import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import started from 'electron-squirrel-startup';

// ============================================================================
// Global state
// ============================================================================

let currentPetState: PetState | null = null;
let stateWatcher: NodeJS.Timeout | null = null;
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
}

// ============================================================================
// Pet config
// ============================================================================

const CONFIG_DIR = path.join(app.getPath('userData'), 'config');
const PET_CONFIG_FILE = path.join(CONFIG_DIR, 'pet.json');

interface PetConfig {
  name: string;
  enabled: boolean;
}

const defaultConfig: PetConfig = {
  name: 'Pickles',
  enabled: true,
};

function getPetConfig(): PetConfig {
  try {
    if (existsSync(PET_CONFIG_FILE)) {
      return JSON.parse(readFileSync(PET_CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Failed to read pet config:', error);
  }
  return { ...defaultConfig };
}

function savePetConfig(config: PetConfig): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(PET_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save pet config:', error);
  }
}

// ============================================================================
// State file watcher
// ============================================================================

const TEMP_DIR = process.env.TEMP || '/tmp';
const STATE_FILE = path.join(TEMP_DIR, 'zion-pet-state.json');

function startStateWatcher(): void {
  let lastModified = 0;

  stateWatcher = setInterval(() => {
    try {
      if (existsSync(STATE_FILE)) {
        const stats = require('fs').statSync(STATE_FILE);

        if (stats.mtimeMs > lastModified) {
          lastModified = stats.mtimeMs;

          const content = readFileSync(STATE_FILE, 'utf-8');
          const newState = JSON.parse(content) as PetState;

          if (!currentPetState ||
              currentPetState.type !== newState.type ||
              currentPetState.message !== newState.message) {
            currentPetState = newState;

            BrowserWindow.getAllWindows().forEach((window) => {
              window.webContents.send('pet-state-update', newState);
            });
          }
        }
      }
    } catch (error) {
      // Silent fail
    }
  }, 500);
}

function stopStateWatcher(): void {
  if (stateWatcher) {
    clearInterval(stateWatcher);
    stateWatcher = null;
  }
}

// ============================================================================
// Tray icon
// ============================================================================

function createTray(): void {
  const icon = nativeImage.createFromDataURL(`
    data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFVJREFUOE9jZKAQMFKon2G4D8RBE8RbOQcTMGxn//f1hYRkYP2H4D8WDEZGNgYP2L4z8DA8I8TG+o2I8Y/JqM/xkYmLk/2NgYAgQYACc0wNPd9s3FAAAAABJRU5ErkJggg==
  `);
  tray = new Tray(icon);

  const config = getPetConfig();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Pet: ${config.name}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => openSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Zion Pet');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

// ============================================================================
// Settings window
// ============================================================================

function openSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 320,
    title: 'Pet Settings',
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const settingsUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, '') + '/settings.html';
    settingsWindow.loadURL(settingsUrl);
  } else {
    settingsWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/settings.html`)
    );
  }

  if (process.env.NODE_ENV === 'development') {
    settingsWindow.webContents.openDevTools();
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ============================================================================
// Main window
// ============================================================================

if (started) {
  app.quit();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 150,
    height: 130,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  createWindow();
  createTray();
  startStateWatcher();
});

app.on('window-all-closed', () => {
  // Stay in tray
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopStateWatcher();
});

// ============================================================================
// IPC handlers
// ============================================================================

ipcMain.handle('get-current-pet-state', () => {
  return currentPetState;
});

ipcMain.handle('get-pet-config', () => {
  return getPetConfig();
});

ipcMain.handle('save-pet-config', (_event, config: PetConfig) => {
  savePetConfig(config);

  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Pet: ${config.name}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => openSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  }

  if (mainWindow) {
    mainWindow.webContents.send('pet-config-changed', config);
  }

  return { success: true };
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});
