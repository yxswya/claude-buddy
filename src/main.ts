/**
 * 主进程 — Electron 窗口管理、托盘、HTTP 状态服务、IPC 通信
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import started from 'electron-squirrel-startup';

// ============================================================================
// 类型定义
// ============================================================================

/** 宠物状态（由 hook-sender 通过 HTTP POST 发送） */
interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
}

/** 宠物配置（持久化到 userData） */
interface PetConfig {
  name: string;
  enabled: boolean;
}

// ============================================================================
// 全局状态
// ============================================================================

let currentPetState: PetState | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

// ============================================================================
// 配置读写
// ============================================================================

const CONFIG_DIR = path.join(app.getPath('userData'), 'config');
const PET_CONFIG_FILE = path.join(CONFIG_DIR, 'pet.json');

const defaultConfig: PetConfig = {
  name: 'Pickles',
  enabled: true,
};

/** 读取宠物配置 */
function getPetConfig(): PetConfig {
  try {
    if (existsSync(PET_CONFIG_FILE)) {
      return JSON.parse(readFileSync(PET_CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('读取配置失败:', error);
  }
  return { ...defaultConfig };
}

/** 保存宠物配置 */
function savePetConfig(config: PetConfig): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(PET_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

// ============================================================================
// HTTP 状态服务 — 接收 hook-sender 的实时状态推送
// ============================================================================

/** HTTP 服务监听端口（hook-sender 向此端口 POST 状态） */
const STATE_PORT = 21345;

/** 广播宠物状态到所有渲染进程 */
function broadcastState(state: PetState): void {
  currentPetState = state;
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('pet-state-update', state);
  });
}

/** 读取请求体 JSON */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
  });
}

/** 启动 HTTP 状态服务 */
function startStateServer(): void {
  httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // POST /state — 接收 hook-sender 推送的宠物状态
    if (req.method === 'POST' && req.url === '/state') {
      try {
        const body = await readBody(req);
        const state = JSON.parse(body) as PetState;
        broadcastState(state);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"ok":false,"error":"invalid json"}');
      }
      return;
    }

    // GET /state — 返回当前状态（调试用）
    if (req.method === 'GET' && req.url === '/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentPetState));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  httpServer.listen(STATE_PORT, '127.0.0.1', () => {
    console.log(`状态服务已启动: http://127.0.0.1:${STATE_PORT}`);
  });
}

/** 停止 HTTP 状态服务 */
function stopStateServer(): void {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}

// ============================================================================
// 系统托盘
// ============================================================================

/** 创建托盘图标和右键菜单 */
function createTray(): void {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFVJREFUOE9jZKAQMFKon2G4D8RBE8RbOQcTMGxn//f1hYRkYP2H4D8WDEZGNgYP2L4z8DA8I8TG+o2I8Y/JqM/xkYmLk/2NgYAgQYACc0wNPd9s3FAAAAABJRU5ErkJggg=='
  );
  tray = new Tray(icon);

  const config = getPetConfig();
  updateTrayMenu(config.name);

  tray.setToolTip('桌面宠物');
  tray.on('double-click', () => {
    if (!mainWindow) return;
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

/** 更新托盘菜单（保存配置后调用） */
function updateTrayMenu(petName: string): void {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: `宠物: ${petName}`, enabled: false },
    { type: 'separator' },
    { label: '设置', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
}

// ============================================================================
// 设置窗口
// ============================================================================

/** 打开设置窗口（单例） */
function openSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 320,
    title: '宠物设置',
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, '') + '/settings.html');
  } else {
    settingsWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/settings.html`));
  }

  if (process.env.NODE_ENV === 'development') {
    settingsWindow.webContents.openDevTools();
  }

  settingsWindow.on('closed', () => { settingsWindow = null; });
}

// ============================================================================
// 主窗口（宠物显示）
// ============================================================================

// Squirrel 安装处理
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

  // 强制窗口置顶（Windows 下 transparent + alwaysOnTop 需要显式设置）
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
};

// ============================================================================
// 应用生命周期
// ============================================================================

app.on('ready', () => {
  createWindow();
  createTray();
  startStateServer();
});

// 关闭所有窗口后保持在托盘
app.on('window-all-closed', () => {});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  stopStateServer();
});

// ============================================================================
// IPC 通信处理
// ============================================================================

/** 获取当前宠物状态 */
ipcMain.handle('get-current-pet-state', () => currentPetState);

/** 获取宠物配置 */
ipcMain.handle('get-pet-config', () => getPetConfig());

/** 保存宠物配置 */
ipcMain.handle('save-pet-config', (_event, config: PetConfig) => {
  savePetConfig(config);
  updateTrayMenu(config.name);
  mainWindow?.webContents.send('pet-config-changed', config);
  return { success: true };
});

/** 关闭设置窗口 */
ipcMain.on('close-settings', () => { settingsWindow?.close(); });

/** 最小化到托盘 */
ipcMain.on('minimize-to-tray', () => { mainWindow?.hide(); });

/** 拖拽窗口（由渲染进程 mousemove 触发） */
ipcMain.on('drag-window', (_event, dx: number, dy: number) => {
  if (!mainWindow) return;
  const pos = mainWindow.getPosition();
  mainWindow.setPosition((pos[0] ?? 0) + dx, (pos[1] ?? 0) + dy);
});
