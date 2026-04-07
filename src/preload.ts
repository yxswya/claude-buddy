import { contextBridge, ipcRenderer } from 'electron';

interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
  details?: Record<string, unknown>;
}

interface PetConfig {
  name: string;
  enabled: boolean;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getCurrentPetState: (): Promise<PetState | null> => {
    return ipcRenderer.invoke('get-current-pet-state');
  },

  onPetStateUpdate: (callback: (state: PetState) => void): void => {
    ipcRenderer.on('pet-state-update', (_event, state) => {
      callback(state as PetState);
    });
  },

  onPetConfigChange: (callback: (config: PetConfig) => void): void => {
    ipcRenderer.on('pet-config-changed', (_event, config) => {
      callback(config as PetConfig);
    });
  },

  getPetConfig: (): Promise<PetConfig> => {
    return ipcRenderer.invoke('get-pet-config');
  },

  savePetConfig: (config: PetConfig): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('save-pet-config', config);
  },

  closeSettings: (): void => {
    ipcRenderer.send('close-settings');
  },

  minimizeToTray: (): void => {
    ipcRenderer.send('minimize-to-tray');
  },
});
