#!/usr/bin/env bun
/**
 * Claude Code Hook Logger (Bun + TypeScript)
 *
 * 接收 Claude Code 的 hook 事件并记录到日志文件
 * 数据通过 stdin 传入（JSON 格式）
 *
 * 用法: bun hook-logger.ts <event-type>
 *       数据从 stdin 读取
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// 类型定义
// ============================================================================

// 基础 Hook 输入
interface BaseHookInput {
  hook_event_name: string;
}

// PreToolUse 输入
interface PreToolUseInput extends BaseHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

// PostToolUse 输入
interface PostToolUseInput extends BaseHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: {
    content?: unknown;
    error?: string;
    [key: string]: unknown;
  };
}

// PostToolUseFailure 输入
interface PostToolUseFailureInput extends BaseHookInput {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  error: string;
  error_type: string;
  is_interrupt?: boolean;
  is_timeout?: boolean;
}

// UserPromptSubmit 输入
interface UserPromptSubmitInput extends BaseHookInput {
  prompt: string;
}

// SessionStart 输入
interface SessionStartInput extends BaseHookInput {
  source: 'startup' | 'resume' | 'clear' | 'compact';
}

// Stop 输入
interface StopInput extends BaseHookInput {
  reason?: string;
}

// StopFailure 输入
interface StopFailureInput extends BaseHookInput {
  error: string;
  error_type: 'rate_limit' | 'authentication_failed' | 'billing_error' | 'invalid_request' | 'server_error' | 'max_output_tokens' | 'unknown';
}

// Notification 输入
interface NotificationInput extends BaseHookInput {
  message: string;
  notification_type: string;
}

// SubagentStart 输入
interface SubagentStartInput extends BaseHookInput {
  agent_id: string;
  agent_type: string;
}

// SubagentStop 输入
interface SubagentStopInput extends BaseHookInput {
  agent_id: string;
  agent_type: string;
  agent_transcript_path?: string;
}

// PreCompact 输入
interface PreCompactInput extends BaseHookInput {
  trigger: 'manual' | 'auto';
  message_count?: number;
}

// PostCompact 输入
interface PostCompactInput extends BaseHookInput {
  trigger: 'manual' | 'auto';
  summary?: string;
  tokens_saved?: number;
}

// PermissionDenied 输入
interface PermissionDeniedInput extends BaseHookInput {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  reason: string;
}

// TaskCreated 输入
interface TaskCreatedInput extends BaseHookInput {
  task_id: string;
  task_description?: string;
}

// TaskCompleted 输入
interface TaskCompletedInput extends BaseHookInput {
  task_id: string;
  task_description?: string;
  success: boolean;
}

// 通用输入
type HookInput =
  | PreToolUseInput
  | PostToolUseInput
  | PostToolUseFailureInput
  | UserPromptSubmitInput
  | SessionStartInput
  | StopInput
  | StopFailureInput
  | NotificationInput
  | SubagentStartInput
  | SubagentStopInput
  | PreCompactInput
  | PostCompactInput
  | PermissionDeniedInput
  | TaskCreatedInput
  | TaskCompletedInput
  | BaseHookInput;

// 日志条目
interface LogEntry {
  timestamp: string;
  event: string;
  data: HookInput;
  pet_action?: PetAction;
}

// 宠物动作（后续用于控制宠物状态）
interface PetAction {
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// 配置
// ============================================================================

const LOG_DIR = join(import.meta.dir, 'logs');
const LOG_FILE = join(LOG_DIR, 'claude-events.log');
const PET_STATE_FILE = join(LOG_DIR, 'pet-state.json');

// ============================================================================
// 工具函数
// ============================================================================

function timestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(event: string, data: HookInput, petAction?: PetAction): string {
  const entry: LogEntry = {
    timestamp: timestamp(),
    event,
    data,
    pet_action: petAction,
  };
  return JSON.stringify(entry) + '\n';
}

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function updatePetState(action: PetAction): void {
  ensureLogDir();
  const state = {
    timestamp: timestamp(),
    ...action,
  };
  // 同步写入宠物状态文件（供 Electron 读取）
  writeFileSync(PET_STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================================================
// 事件处理器
// ============================================================================

function handlePreToolUse(data: PreToolUseInput): PetAction {
  const { tool_name, tool_input } = data;

  let action: PetAction = {
    type: 'working',
    message: `准备执行: ${tool_name}`,
    details: { tool_name, tool_input },
  };

  switch (tool_name) {
    case 'Bash':
      const cmd = (tool_input?.command as string) || '';
      action = {
        type: 'working',
        message: `执行命令: ${cmd.substring(0, 50)}${cmd.length > 50 ? '...' : ''}`,
        details: { tool_name, command: cmd },
      };
      break;

    case 'Read':
      action = {
        type: 'reading',
        message: `读取文件: ${(tool_input?.file_path as string)?.split('/').pop()}`,
        details: { tool_name, file_path: tool_input?.file_path },
      };
      break;

    case 'Write':
    case 'Edit':
      action = {
        type: 'writing',
        message: `编辑文件: ${(tool_input?.file_path as string)?.split('/').pop()}`,
        details: { tool_name, file_path: tool_input?.file_path },
      };
      break;

    case 'WebFetch':
    case 'WebSearch':
      action = {
        type: 'browsing',
        message: `搜索/访问网络`,
        details: { tool_name, url: tool_input?.url },
      };
      break;

    case 'Agent':
      action = {
        type: 'working',
        message: `启动子代理: ${tool_input?.subagent_type || 'unknown'}`,
        details: { tool_name, agent_type: tool_input?.subagent_type },
      };
      break;

    case 'Grep':
      action = {
        type: 'reading',
        message: `搜索代码: ${tool_input?.pattern}`,
        details: { tool_name, pattern: tool_input?.pattern },
      };
      break;

    case 'Glob':
      action = {
        type: 'reading',
        message: `查找文件: ${tool_input?.pattern}`,
        details: { tool_name, pattern: tool_input?.pattern },
      };
      break;

    default:
      action = {
        type: 'working',
        message: `使用工具: ${tool_name}`,
        details: { tool_name },
      };
  }

  console.log(`🔧 ${action.message}`);
  return action;
}

function handlePostToolUse(data: PostToolUseInput): PetAction {
  const { tool_name, tool_response } = data;

  const hasError = tool_response?.error;
  const action: PetAction = hasError
    ? {
        type: 'error',
        message: `${tool_name} 失败`,
        details: { tool_name, error: tool_response?.error },
      }
    : {
        type: 'success',
        message: `${tool_name} 完成`,
        details: { tool_name },
      };

  console.log(`${hasError ? '❌' : '✅'} ${action.message}`);
  return action;
}

function handlePostToolUseFailure(data: PostToolUseFailureInput): PetAction {
  const { tool_name, error, error_type, is_interrupt, is_timeout } = data;

  let message = `${tool_name} 失败`;
  if (is_interrupt) message += ' (被中断)';
  if (is_timeout) message += ' (超时)';

  const action: PetAction = {
    type: 'error',
    message,
    details: { tool_name, error, error_type, is_interrupt, is_timeout },
  };

  console.log(`❌ ${message}`);
  console.log(`   错误: ${error}`);
  return action;
}

function handleUserPromptSubmit(data: UserPromptSubmitInput): PetAction {
  const prompt = data.prompt || '';
  const preview = prompt.substring(0, 100);

  const action: PetAction = {
    type: 'talking',
    message: `用户说: ${preview}${prompt.length > 100 ? '...' : ''}`,
    details: { prompt_length: prompt.length, prompt_preview: preview },
  };

  console.log(`💬 用户消息 (${prompt.length} 字符)`);
  console.log(`   "${preview}${prompt.length > 100 ? '...' : ''}"`);
  return action;
}

function handleStop(_data: StopInput): PetAction {
  const action: PetAction = {
    type: 'idle',
    message: '等待用户输入',
    details: {},
  };

  console.log(`🛑 Claude 响应结束，等待中...`);
  return action;
}

function handleStopFailure(data: StopFailureInput): PetAction {
  const { error, error_type } = data;

  const action: PetAction = {
    type: 'error',
    message: `API 错误: ${error_type}`,
    details: { error, error_type },
  };

  console.log(`⚠️ API 错误 [${error_type}]: ${error}`);
  return action;
}

function handleSessionStart(data: SessionStartInput): PetAction {
  const sourceMap: Record<string, string> = {
    startup: '新会话',
    resume: '恢复会话',
    clear: '清空后重新开始',
    compact: '压缩后继续',
  };

  const action: PetAction = {
    type: 'idle',
    message: sourceMap[data.source] || `会话开始: ${data.source}`,
    details: { source: data.source },
  };

  console.log(`🚀 ${action.message}`);
  return action;
}

function handleNotification(data: NotificationInput): PetAction {
  const action: PetAction = {
    type: 'talking',
    message: data.message,
    details: { notification_type: data.notification_type },
  };

  console.log(`🔔 [${data.notification_type}] ${data.message}`);
  return action;
}

function handleSubagentStart(data: SubagentStartInput): PetAction {
  const action: PetAction = {
    type: 'working',
    message: `子代理启动: ${data.agent_type}`,
    details: { agent_id: data.agent_id, agent_type: data.agent_type },
  };

  console.log(`🤖 子代理启动: ${data.agent_type} (${data.agent_id})`);
  return action;
}

function handleSubagentStop(data: SubagentStopInput): PetAction {
  const action: PetAction = {
    type: 'success',
    message: `子代理完成: ${data.agent_type}`,
    details: { agent_id: data.agent_id, agent_type: data.agent_type },
  };

  console.log(`🤖 子代理完成: ${data.agent_type} (${data.agent_id})`);
  return action;
}

function handlePreCompact(data: PreCompactInput): PetAction {
  const action: PetAction = {
    type: 'thinking',
    message: `准备压缩对话 (${data.trigger})`,
    details: { trigger: data.trigger, message_count: data.message_count },
  };

  console.log(`🗜️ 准备压缩对话 (${data.trigger})`);
  return action;
}

function handlePostCompact(data: PostCompactInput): PetAction {
  const action: PetAction = {
    type: 'success',
    message: `对话压缩完成，节省 ${data.tokens_saved || 0} tokens`,
    details: { trigger: data.trigger, tokens_saved: data.tokens_saved },
  };

  console.log(`🗜️ 压缩完成 (${data.trigger})`);
  if (data.tokens_saved) console.log(`   节省 ${data.tokens_saved} tokens`);
  return action;
}

function handlePermissionDenied(data: PermissionDeniedInput): PetAction {
  const action: PetAction = {
    type: 'error',
    message: `权限被拒绝: ${data.tool_name}`,
    details: { tool_name: data.tool_name, reason: data.reason },
  };

  console.log(`🚫 权限被拒绝: ${data.tool_name}`);
  console.log(`   原因: ${data.reason}`);
  return action;
}

function handleTaskCreated(data: TaskCreatedInput): PetAction {
  const action: PetAction = {
    type: 'working',
    message: `创建任务: ${data.task_description || data.task_id}`,
    details: { task_id: data.task_id, task_description: data.task_description },
  };

  console.log(`📋 创建任务: ${data.task_id}`);
  return action;
}

function handleTaskCompleted(data: TaskCompletedInput): PetAction {
  const action: PetAction = {
    type: data.success ? 'success' : 'error',
    message: `任务${data.success ? '完成' : '失败'}: ${data.task_description || data.task_id}`,
    details: { task_id: data.task_id, success: data.success },
  };

  console.log(`📋 任务${data.success ? '完成' : '失败'}: ${data.task_id}`);
  return action;
}

// ============================================================================
// 主处理函数
// ============================================================================

function processEvent(event: string, data: HookInput): void {
  ensureLogDir();

  let petAction: PetAction | undefined;

  // 根据事件类型分发处理
  switch (event) {
    case 'PreToolUse':
      petAction = handlePreToolUse(data as PreToolUseInput);
      break;
    case 'PostToolUse':
      petAction = handlePostToolUse(data as PostToolUseInput);
      break;
    case 'PostToolUseFailure':
      petAction = handlePostToolUseFailure(data as PostToolUseFailureInput);
      break;
    case 'UserPromptSubmit':
      petAction = handleUserPromptSubmit(data as UserPromptSubmitInput);
      break;
    case 'Stop':
      petAction = handleStop(data as StopInput);
      break;
    case 'StopFailure':
      petAction = handleStopFailure(data as StopFailureInput);
      break;
    case 'SessionStart':
      petAction = handleSessionStart(data as SessionStartInput);
      break;
    case 'Notification':
      petAction = handleNotification(data as NotificationInput);
      break;
    case 'SubagentStart':
      petAction = handleSubagentStart(data as SubagentStartInput);
      break;
    case 'SubagentStop':
      petAction = handleSubagentStop(data as SubagentStopInput);
      break;
    case 'PreCompact':
      petAction = handlePreCompact(data as PreCompactInput);
      break;
    case 'PostCompact':
      petAction = handlePostCompact(data as PostCompactInput);
      break;
    case 'PermissionDenied':
      petAction = handlePermissionDenied(data as PermissionDeniedInput);
      break;
    case 'TaskCreated':
      petAction = handleTaskCreated(data as TaskCreatedInput);
      break;
    case 'TaskCompleted':
      petAction = handleTaskCompleted(data as TaskCompletedInput);
      break;
    default:
      console.log(`📝 未知事件: ${event}`);
      petAction = {
        type: 'thinking',
        message: `未知事件: ${event}`,
        details: { event, data },
      };
  }

  // 写入主日志
  const logEntry = formatLogEntry(event, data, petAction);
  appendFileSync(LOG_FILE, logEntry);

  // 更新宠物状态文件
  if (petAction) {
    updatePetState(petAction);
  }

  // 打印分隔线
  console.log('---');
}

// ============================================================================
// 入口
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const eventType = args[0];

  if (!eventType) {
    console.log('用法: bun hook-logger.ts <event-type>');
    console.log('   数据从 stdin 读取 (JSON 格式)');
    console.log('\n可用事件类型:');
    console.log('  PreToolUse, PostToolUse, PostToolUseFailure');
    console.log('  UserPromptSubmit, Stop, StopFailure');
    console.log('  SessionStart, Notification');
    console.log('  SubagentStart, SubagentStop');
    console.log('  PreCompact, PostCompact');
    console.log('  PermissionDenied, TaskCreated, TaskCompleted');
    process.exit(1);
  }

  // 从 stdin 读取 JSON 数据（Claude Code hook 通过 stdin 传递数据）
  try {
    const stdinText = await Bun.stdin.text();

    if (!stdinText.trim()) {
      console.log('⚠️ stdin 为空');
      processEvent(eventType, { hook_event_name: eventType });
      return;
    }

    const data = JSON.parse(stdinText);
    processEvent(eventType, data);
  } catch (error) {
    console.error('❌ 解析 stdin 失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
