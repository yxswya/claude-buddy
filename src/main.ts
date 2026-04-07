import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import started from 'electron-squirrel-startup';

// ============================================================================
// 全局状态
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
// 宠物配置
// ============================================================================

const CONFIG_DIR = path.join(app.getPath('userData'), 'config');
const PET_CONFIG_FILE = path.join(CONFIG_DIR, 'pet.json');

interface PetConfig {
  species: string;
  name: string;
  enabled: boolean;
}

const defaultConfig: PetConfig = {
  species: 'axolotl',
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
// 状态文件监听
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
      // 静默失败
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
// 托盘图标
// ============================================================================

function createTray(): void {
  // 创建简单的托盘图标 (16x16 白色方块)
  const icon = nativeImage.createFromDataURL(`
    data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFVJREFUOE9jZKAQMFKon2G4D8RBE8RbOQcTMGxn//f1hYRkYP2H4D8WDEZGNgYP2L4z8DA8I8TG+o2I8Y/JqM/xkYmLk/2NgYAgQYACc0wNPd9s3FAAAAABJRU5ErkJggg==
  `);
  tray = new Tray(icon);

  const config = getPetConfig();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `宠物: ${config.name}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '宠物设置',
      click: () => openSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Zion 宠物');
  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示/隐藏主窗口
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
// 设置窗口
// ============================================================================

function openSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 480,
    height: 520,
    title: '宠物设置',
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 加载设置页面
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // 开发环境：使用 vite 开发服务器
    const settingsUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, '') + '/settings.html';
    console.log('Loading settings from:', settingsUrl);
    settingsWindow.loadURL(settingsUrl);
  } else {
    // 生产环境：从打包后的文件加载
    settingsWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/settings.html`)
    );
  }

  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    settingsWindow.webContents.openDevTools();
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ============================================================================
// 主窗口创建
// ============================================================================

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 150,
    height: 150,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true, // 从任务栏隐藏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  createWindow();
  createTray();
  startStateWatcher();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // 不退出，保持在托盘
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 清理
app.on('before-quit', () => {
  stopStateWatcher();
});

// ============================================================================
// IPC 处理
// ============================================================================

ipcMain.handle('get-current-pet-state', () => {
  return currentPetState;
});

ipcMain.handle('get-pet-config', () => {
  return getPetConfig();
});

ipcMain.handle('save-pet-config', (_event, config: PetConfig) => {
  savePetConfig(config);

  // 更新托盘菜单
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `宠物: ${config.name}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '宠物设置',
        click: () => openSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  }

  // 通知主窗口重新加载
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
