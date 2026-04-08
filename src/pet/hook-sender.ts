#!/usr/bin/env bun
/**
 * Claude Code 钩子发送器
 *
 * 将 Claude Code 事件转换为宠物状态，通过 HTTP POST 实时推送到 Electron 主进程。
 *
 * 用法: bun hook-sender.ts <事件类型>
 *       事件数据从 stdin 读取（JSON 格式）
 */

import { request, type ClientRequest } from 'node:http';

// ============================================================================
// 类型定义
// ============================================================================

/** 宠物状态 */
interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
}

/** 钩子输入数据 */
type HookInput = Record<string, unknown>;

// ============================================================================
// 常量
// ============================================================================

/** Electron 主进程 HTTP 服务地址 */
const STATE_URL = 'http://127.0.0.1:21345/state';

// ============================================================================
// 工具函数
// ============================================================================

/** 创建宠物状态 */
function createPetState(type: PetState['type'], message: string): PetState {
  return { timestamp: new Date().toISOString(), type, message };
}

// ============================================================================
// 事件处理 — 将 Claude Code 事件映射为宠物状态
// ============================================================================

function processEvent(event: string, data: HookInput): PetState | null {
  switch (event) {
    // ---- 工具调用 ----
    case 'PreToolUse': {
      const tool_name = String(data.tool_name || 'unknown');
      switch (tool_name) {
        case 'Bash': return createPetState('working', '执行命令');
        case 'Read': return createPetState('reading', '读取文件');
        case 'Write':
        case 'Edit': return createPetState('writing', '编辑文件');
        case 'WebFetch':
        case 'WebSearch': return createPetState('browsing', '搜索网络');
        case 'Agent': return createPetState('working', '运行子代理');
        case 'Grep':
        case 'Glob': return createPetState('reading', '搜索代码');
        default: return createPetState('working', `使用 ${tool_name}`);
      }
    }

    case 'PostToolUse': {
      const resp = (data.tool_response as Record<string, unknown>) || {};
      return resp.error
        ? createPetState('error', '执行失败')
        : createPetState('success', '执行完成');
    }

    case 'PostToolUseFailure':
      return createPetState('error', '执行失败');

    // ---- 用户交互 ----
    case 'UserPromptSubmit':
      return createPetState('thinking', '思考中');

    case 'Stop':
      return createPetState('idle', '空闲');

    case 'StopFailure':
      return createPetState('error', 'API 错误');

    // ---- 会话 ----
    case 'SessionStart':
      return createPetState('idle', '会话已启动');

    case 'SessionEnd':
      return createPetState('idle', '会话已结束');

    case 'Notification':
      return createPetState('talking', String(data.message || ''));

    // ---- 子代理 ----
    case 'SubagentStart':
      return createPetState('working', '子代理已启动');

    case 'SubagentStop':
      return createPetState('success', '子代理已完成');

    // ---- 上下文压缩 ----
    case 'PreCompact':
      return createPetState('thinking', '压缩上下文');

    case 'PostCompact':
      return createPetState('success', '压缩完成');

    // ---- 权限与任务 ----
    case 'PermissionDenied':
      return createPetState('error', '权限被拒绝');

    case 'TaskCreated':
      return createPetState('working', '任务已创建');

    case 'TaskCompleted':
      return createPetState('success', '任务已完成');

    // ---- 其他 ----
    case 'InstructionsLoaded':
      return createPetState('reading', '加载指令');

    case 'CwdChanged':
      return createPetState('working', '切换目录');

    case 'ConfigChange':
      return createPetState('thinking', '配置已变更');

    case 'TeammateIdle':
      return createPetState('idle', '队友空闲');

    default:
      return null;
  }
}

// ============================================================================
// 状态推送
// ============================================================================

/** 通过 HTTP POST 将宠物状态推送到 Electron 主进程 */
function sendState(state: PetState): void {
  const body = JSON.stringify(state);

  const url = new URL(STATE_URL);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const req: ClientRequest = request(options, (res) => {
    // 消费响应体以释放连接
    res.resume();
  });

  req.on('error', () => {
    // 静默失败 — Electron 可能尚未启动
  });

  req.write(body);
  req.end();
}

// ============================================================================
// 入口
// ============================================================================

async function main(): Promise<void> {
  const eventType = process.argv[2];
  if (!eventType) {
    console.log('用法: bun hook-sender.ts <事件类型>');
    process.exit(1);
  }

  try {
    // 从 stdin 读取事件数据
    let stdinText = '';
    for await (const chunk of process.stdin) {
      stdinText += chunk.toString();
    }

    if (!stdinText.trim()) {
      sendState(createPetState('idle', '空闲'));
      return;
    }

    const data = JSON.parse(stdinText);
    const petState = processEvent(eventType, data);
    if (petState) sendState(petState);
  } catch {
    // 静默失败
  }
}

main().catch(() => {});
