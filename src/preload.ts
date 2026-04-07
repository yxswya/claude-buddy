import { contextBridge, ipcRenderer } from 'electron';

// 宠物状态接口
interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
  details?: Record<string, unknown>;
}

// 宠物配置接口
interface PetConfig {
  species: string;
  name: string;
  enabled: boolean;
}

// 暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取当前宠物状态
  getCurrentPetState: (): Promise<PetState | null> => {
    return ipcRenderer.invoke('get-current-pet-state');
  },

  // 监听宠物状态更新
  onPetStateUpdate: (callback: (state: PetState) => void): void => {
    ipcRenderer.on('pet-state-update', (_event, state) => {
      callback(state as PetState);
    });
  },

  // 监听宠物配置变化
  onPetConfigChange: (callback: (config: PetConfig) => void): void => {
    ipcRenderer.on('pet-config-changed', (_event, config) => {
      callback(config as PetConfig);
    });
  },

  // 取消监听
  removePetStateListener: (): void => {
    ipcRenderer.removeAllListeners('pet-state-update');
  },

  // 获取宠物配置
  getPetConfig: (): Promise<PetConfig> => {
    return ipcRenderer.invoke('get-pet-config');
  },

  // 保存宠物配置
  savePetConfig: (config: PetConfig): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('save-pet-config', config);
  },

  // 关闭设置窗口
  closeSettings: (): void => {
    ipcRenderer.send('close-settings');
  },

  // 最小化到托盘
  minimizeToTray: (): void => {
    ipcRenderer.send('minimize-to-tray');
  },
});
