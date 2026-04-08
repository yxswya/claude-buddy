/**
 * 预加载脚本 — 安全桥接主进程与渲染进程的 IPC 通信
 */

import { contextBridge, ipcRenderer } from 'electron';

/** 宠物状态 */
interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
}

/** 宠物配置 */
interface PetConfig {
  name: string;
  enabled: boolean;
}

// 向渲染进程暴露 IPC 接口
contextBridge.exposeInMainWorld('electronAPI', {
  /** 获取当前宠物状态 */
  getCurrentPetState: (): Promise<PetState | null> =>
    ipcRenderer.invoke('get-current-pet-state'),

  /** 监听宠物状态更新 */
  onPetStateUpdate: (callback: (state: PetState) => void): void => {
    ipcRenderer.on('pet-state-update', (_event, state) => callback(state as PetState));
  },

  /** 监听宠物配置变化 */
  onPetConfigChange: (callback: (config: PetConfig) => void): void => {
    ipcRenderer.on('pet-config-changed', (_event, config) => callback(config as PetConfig));
  },

  /** 获取宠物配置 */
  getPetConfig: (): Promise<PetConfig> =>
    ipcRenderer.invoke('get-pet-config'),

  /** 保存宠物配置 */
  savePetConfig: (config: PetConfig): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-pet-config', config),

  /** 关闭设置窗口 */
  closeSettings: (): void =>
    ipcRenderer.send('close-settings'),

  /** 最小化到托盘 */
  minimizeToTray: (): void =>
    ipcRenderer.send('minimize-to-tray'),

  /** 拖拽窗口（传递鼠标偏移量） */
  dragWindow: (dx: number, dy: number): void =>
    ipcRenderer.send('drag-window', dx, dy),
});
