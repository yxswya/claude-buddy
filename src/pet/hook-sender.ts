#!/usr/bin/env bun
/**
 * Claude Code Hook Sender (简化版)
 *
 * 将宠物状态写入临时文件，由 Electron 监听
 *
 * 用法: bun hook-sender.ts <event-type>
 *       事件数据从 stdin 读取 (JSON 格式)
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// 配置
// ============================================================================

// 使用临时目录存储状态文件
const TEMP_DIR = process.env.TEMP || '/tmp';
const STATE_FILE = join(TEMP_DIR, 'zion-pet-state.json');

// ============================================================================
// 类型定义
// ============================================================================

interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
}

type HookInput = Record<string, unknown>;

// ============================================================================
// 事件处理器
// ============================================================================

function createPetState(
  type: PetState['type'],
  message: string
): PetState {
  return {
    timestamp: new Date().toISOString(),
    type,
    message,
  };
}

function processEvent(event: string, data: HookInput): PetState | null {
  switch (event) {
    case 'PreToolUse': {
      const tool_name = String(data.tool_name || 'unknown');

      switch (tool_name) {
        case 'Bash':
          return createPetState('working', '努力干活~');
        case 'Read':
          return createPetState('reading', '看书ing~');
        case 'Write':
        case 'Edit':
          return createPetState('writing', '认真码字！');
        case 'WebFetch':
        case 'WebSearch':
          return createPetState('browsing', '冲浪~');
        case 'Agent':
          return createPetState('working', '努力干活~');
        case 'Grep':
        case 'Glob':
          return createPetState('reading', '找东西~');
        default:
          return createPetState('working', '努力干活~');
      }
    }

    case 'PostToolUse': {
      const tool_response = (data.tool_response as Record<string, unknown>) || {};
      const hasError = tool_response.error;

      if (hasError) {
        return createPetState('error', '呜呜...');
      }
      return createPetState('success', '搞定啦！');
    }

    case 'PostToolUseFailure':
      return createPetState('error', '呜呜...');

    case 'UserPromptSubmit':
      return createPetState('thinking', '思考鹅生中...');

    case 'Stop':
      return createPetState('idle', '想睡觉了~');

    case 'StopFailure':
      return createPetState('error', '呜呜...');

    case 'SessionStart':
      return createPetState('idle', '嘎嘎！我来了~');

    case 'SessionEnd':
      return createPetState('idle', '拜拜啦~');

    case 'Notification': {
      const message = String(data.message || '');
      return createPetState('talking', message);
    }

    case 'SubagentStart':
      return createPetState('working', '喊帮手~');

    case 'SubagentStop':
      return createPetState('success', '帮手搞定啦！');

    case 'PreCompact':
      return createPetState('thinking', '整理记忆中...');

    case 'PostCompact':
      return createPetState('success', '整理好啦！');

    case 'PermissionDenied':
      return createPetState('error', '不让做...');

    case 'TaskCreated':
      return createPetState('working', '接新任务~');

    case 'TaskCompleted':
      return createPetState('success', '任务完成！');

    case 'InstructionsLoaded':
      return createPetState('reading', '看说明书~');

    case 'CwdChanged':
      return createPetState('working', '换地方了~');

    case 'ConfigChange':
      return createPetState('thinking', '换配置了~');

    case 'TeammateIdle':
      return createPetState('idle', '队友休息中...');

    default:
      return null;
  }
}

// ============================================================================
// 写入状态
// ============================================================================

function writeState(state: PetState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    // 静默失败，不影响 hook 执行
  }
}

// ============================================================================
// 入口
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const eventType = args[0];

  if (!eventType) {
    console.log('用法: bun hook-sender.ts <event-type>');
    process.exit(1);
  }

  try {
    // 读取 stdin (兼容 Node.js 和 Bun)
    let stdinText = '';
    for await (const chunk of process.stdin) {
      stdinText += chunk.toString();
    }

    if (!stdinText.trim()) {
      writeState(createPetState('idle', '等待中...'));
      return;
    }

    const data = JSON.parse(stdinText);
    const petState = processEvent(eventType, data);

    if (petState) {
      writeState(petState);
    }
  } catch (error) {
    // 静默失败
  }
}

main().catch(() => {});
