/**
 * 全局类型声明 — Electron IPC API
 *
 * preload.ts 通过 contextBridge.exposeInMainWorld 暴露的方法签名。
 * renderer.ts 和 settings.ts 共享此声明，避免重复定义导致类型冲突。
 */

import type { ClaudeState, PetConfig } from './types';

declare global {
  interface Window {
    electronAPI: {
      /** 获取当前 Claude 状态 */
      getCurrentClaudeState: () => Promise<ClaudeState | null>;
      /** 监听 Claude 状态更新 */
      onClaudeStateUpdate: (callback: (state: ClaudeState) => void) => void;
      /** 拖拽窗口（传递鼠标偏移量） */
      dragWindow: (dx: number, dy: number) => void;
      /** 获取宠物配置 */
      getPetConfig: () => Promise<PetConfig>;
      /** 保存宠物配置 */
      savePetConfig: (config: PetConfig) => Promise<{ success: boolean }>;
      /** 监听宠物配置变化 */
      onPetConfigChange: (callback: (config: PetConfig) => void) => void;
      /** 关闭设置窗口 */
      closeSettings: () => void;
      /** 最小化到托盘 */
      minimizeToTray: () => void;
    };
  }
}

export {};
