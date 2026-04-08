/**
 * 设置页面 — 宠物命名
 */

import type { PetConfig } from './types';

// Window.electronAPI 类型声明见 electron-api.d.ts

// 当前配置
let currentConfig: PetConfig = {
  name: 'Pickles',
  enabled: true,
};

// ============================================================================
// 配置操作
// ============================================================================

/** 从主进程加载配置 */
async function loadConfig(): Promise<void> {
  try {
    const config = await window.electronAPI.getPetConfig();
    if (config) currentConfig = config;
  } catch (error) {
    console.error('加载配置失败:', error);
  }

  (document.getElementById('pet-name') as HTMLInputElement).value = currentConfig.name;
}

/** 保存配置并关闭窗口 */
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
    console.error('保存配置失败:', error);
    alert('保存失败');
  }
}

/** 关闭设置窗口 */
function closeWindow(): void {
  window.electronAPI.closeSettings();
}

// ============================================================================
// 初始化
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();

  document.getElementById('btn-save')!.addEventListener('click', saveConfig);
  document.getElementById('btn-cancel')!.addEventListener('click', closeWindow);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWindow();
  });
});
