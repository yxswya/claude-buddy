/**
 * Zion Pet State - 宠物状态管理
 *
 * 监控 Claude Code 事件，更新宠物状态
 */

import type { PetAction, PetActionType, PetBones, Species } from './types';
import { renderSprite, renderFace, renderWithEffect, renderHearts } from './sprites';

// ============================================================================
// 工具函数
// ============================================================================

function timestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// 事件到宠物动作的映射
// ============================================================================

interface ToolEvent {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  tool_response?: { error?: string; [key: string]: unknown };
}

interface UserEvent {
  prompt: string;
}

interface SessionEvent {
  source?: string;
}

interface TaskEvent {
  task_id?: string;
  task_description?: string;
  success?: boolean;
}

/**
 * 处理 PreToolUse 事件
 */
export function handlePreToolUse(data: ToolEvent): PetAction {
  const { tool_name, tool_input } = data;
  let type: PetActionType = 'working';
  let message = `准备执行: ${tool_name}`;

  switch (tool_name) {
    case 'Bash':
      type = 'working';
      const cmd = (tool_input?.command as string) || '';
      message = `执行命令: ${cmd.substring(0, 40)}${cmd.length > 40 ? '...' : ''}`;
      break;

    case 'Read':
      type = 'reading';
      const readFile = (tool_input?.file_path as string)?.split('/').pop() || 'file';
      message = `读取: ${readFile}`;
      break;

    case 'Write':
    case 'Edit':
      type = 'writing';
      const writeFile = (tool_input?.file_path as string)?.split('/').pop() || 'file';
      message = `编辑: ${writeFile}`;
      break;

    case 'WebFetch':
    case 'WebSearch':
      type = 'browsing';
      message = `搜索网络...`;
      break;

    case 'Grep':
    case 'Glob':
      type = 'reading';
      message = `搜索: ${tool_input?.pattern || '?'}`;
      break;

    case 'Agent':
      type = 'working';
      message = `启动子代理: ${tool_input?.subagent_type || 'unknown'}`;
      break;

    default:
      type = 'working';
      message = `使用: ${tool_name}`;
  }

  return { type, message, timestamp: timestamp() };
}

/**
 * 处理 PostToolUse 事件
 */
export function handlePostToolUse(data: ToolEvent): PetAction {
  const { tool_name, tool_response } = data;
  const hasError = tool_response?.error;

  return {
    type: hasError ? 'error' : 'success',
    message: hasError ? `${tool_name} 失败` : `${tool_name} 完成`,
    details: hasError ? { error: tool_response!.error } : undefined,
    timestamp: timestamp(),
  };
}

/**
 * 处理 PostToolUseFailure 事件
 */
export function handlePostToolUseFailure(data: ToolEvent & { error: string; error_type: string }): PetAction {
  const { tool_name, error, error_type, is_interrupt, is_timeout } = data as any;

  let message = `${tool_name} 失败`;
  if (is_interrupt) message += ' (中断)';
  if (is_timeout) message += ' (超时)';

  return {
    type: 'error',
    message,
    details: { error, error_type },
    timestamp: timestamp(),
  };
}

/**
 * 处理 UserPromptSubmit 事件
 */
export function handleUserPromptSubmit(data: UserEvent): PetAction {
  const prompt = data.prompt || '';
  const preview = prompt.substring(0, 50);

  return {
    type: 'talking',
    message: `用户: "${preview}${prompt.length > 50 ? '...' : ''}"`,
    details: { prompt_length: prompt.length },
    timestamp: timestamp(),
  };
}

/**
 * 处理 Stop 事件
 */
export function handleStop(): PetAction {
  return {
    type: 'idle',
    message: '等待中...',
    timestamp: timestamp(),
  };
}

/**
 * 处理 StopFailure 事件
 */
export function handleStopFailure(data: { error: string; error_type: string }): PetAction {
  return {
    type: 'error',
    message: `API 错误: ${data.error_type}`,
    details: { error: data.error },
    timestamp: timestamp(),
  };
}

/**
 * 处理 SessionStart 事件
 */
export function handleSessionStart(data: SessionEvent): PetAction {
  const sourceMap: Record<string, string> = {
    startup: '新会话',
    resume: '恢复会话',
    clear: '清空重启',
    compact: '压缩继续',
  };

  return {
    type: 'idle',
    message: sourceMap[data.source || ''] || '会话开始',
    timestamp: timestamp(),
  };
}

/**
 * 处理 Notification 事件
 */
export function handleNotification(data: { message: string; notification_type: string }): PetAction {
  return {
    type: 'talking',
    message: data.message,
    details: { type: data.notification_type },
    timestamp: timestamp(),
  };
}

/**
 * 处理 SubagentStart 事件
 */
export function handleSubagentStart(data: { agent_id: string; agent_type: string }): PetAction {
  return {
    type: 'working',
    message: `子代理: ${data.agent_type}`,
    details: { agent_id: data.agent_id },
    timestamp: timestamp(),
  };
}

/**
 * 处理 SubagentStop 事件
 */
export function handleSubagentStop(data: { agent_id: string; agent_type: string }): PetAction {
  return {
    type: 'success',
    message: `子代理完成: ${data.agent_type}`,
    details: { agent_id: data.agent_id },
    timestamp: timestamp(),
  };
}

/**
 * 处理 PreCompact 事件
 */
export function handlePreCompact(data: { trigger: string }): PetAction {
  return {
    type: 'thinking',
    message: `压缩对话...`,
    details: { trigger: data.trigger },
    timestamp: timestamp(),
  };
}

/**
 * 处理 PostCompact 事件
 */
export function handlePostCompact(data: { trigger: string; tokens_saved?: number }): PetAction {
  return {
    type: 'success',
    message: `压缩完成${data.tokens_saved ? ` (${data.tokens_saved} tokens)` : ''}`,
    details: { tokens_saved: data.tokens_saved },
    timestamp: timestamp(),
  };
}

/**
 * 处理 TaskCreated 事件
 */
export function handleTaskCreated(data: TaskEvent): PetAction {
  return {
    type: 'working',
    message: `任务: ${data.task_description || data.task_id}`,
    details: { task_id: data.task_id },
    timestamp: timestamp(),
  };
}

/**
 * 处理 TaskCompleted 事件
 */
export function handleTaskCompleted(data: TaskEvent): PetAction {
  return {
    type: data.success ? 'success' : 'error',
    message: `任务${data.success ? '完成' : '失败'}`,
    details: { task_id: data.task_id },
    timestamp: timestamp(),
  };
}

// ============================================================================
// 动画状态
// ============================================================================

export interface PetAnimationState {
  bones: PetBones;
  action: PetAction;
  frame: number;
  petting: boolean;
  petFrame: number;
}

/**
 * 获取当前帧的精灵渲染
 */
export function getCurrentFrame(state: PetAnimationState): {
  sprite: string[];
  effect: string | null;
  hearts: string | null;
} {
  const { bones, action, frame, petting, petFrame } = state;

  // 如果正在 pet，显示爱心
  const hearts = petting ? renderHearts(petFrame) : null;

  // 渲染带效果的精灵
  const { sprite, effect } = renderWithEffect(bones, frame, action.type);

  return { sprite, effect, hearts };
}

/**
 * 获取单行表情（窄终端）
 */
export function getCompactDisplay(state: PetAnimationState): string {
  const { bones, action, petting } = state;
  const face = renderFace(bones);
  const prefix = petting ? '❤️ ' : '';
  return `${prefix}${face} ${action.message.substring(0, 20)}`;
}

// ============================================================================
// 动作类型到表情的映射
// ============================================================================

export const ACTION_EMOJIS: Record<PetActionType, string> = {
  idle: '😴',
  thinking: '💭',
  working: '🔧',
  reading: '📖',
  writing: '✍️',
  browsing: '🌐',
  talking: '💬',
  success: '✨',
  error: '💦',
};
