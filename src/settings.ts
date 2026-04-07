/**
 * Pet settings page — name customization.
 */

interface PetConfig {
  name: string;
  enabled: boolean;
}

let currentConfig: PetConfig = {
  name: 'Pickles',
  enabled: true,
};

async function loadConfig(): Promise<void> {
  try {
    const config = await window.electronAPI.getPetConfig();
    if (config) {
      currentConfig = config;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }

  (document.getElementById('pet-name') as HTMLInputElement).value = currentConfig.name;
}

async function saveConfig(): Promise<void> {
  const name = (document.getElementById('pet-name') as HTMLInputElement).value.trim();

  if (!name) {
    alert('请输入宠物名字');
    return;
  }

  const newConfig: PetConfig = { ...currentConfig, name, enabled: true };

  try {
    await window.electronAPI.savePetConfig(newConfig);
    currentConfig = newConfig;
    closeWindow();
  } catch (error) {
    console.error('Failed to save config:', error);
    alert('保存失败');
  }
}

function closeWindow(): void {
  window.electronAPI.closeSettings();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();

  document.getElementById('btn-save')!.addEventListener('click', saveConfig);
  document.getElementById('btn-cancel')!.addEventListener('click', closeWindow);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWindow();
  });
});

declare global {
  interface Window {
    electronAPI: {
      getPetConfig: () => Promise<PetConfig>;
      savePetConfig: (config: PetConfig) => Promise<{ success: boolean }>;
      closeSettings: () => void;
    };
  }
}
