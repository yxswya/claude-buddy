#!/usr/bin/env bun
/**
 * Claude Code 钩子发送器
 *
 * 将 Claude Code 的 hook 事件转换为结构化状态（phase + activity），
 * 通过 HTTP POST 实时推送到 Electron 主进程的 HTTP 状态服务。
 *
 * 工作原理：
 *   1. Claude Code 在每个事件触发时调用: bun hook-sender.ts <事件类型>
 *   2. 本脚本从 stdin 读取事件数据（JSON 格式）
 *   3. 将事件映射为 ClaudeState（phase + activity + message）
 *   4. POST 到 Electron 主进程的 HTTP 状态服务（默认 127.0.0.1:21345）
 *
 * 用法: bun hook-sender.ts <事件类型>
 */

import { request, type ClientRequest } from 'node:http';
import type { ClaudeState, ClaudePhase, ClaudeActivity } from '../types';

// ============================================================================
// 常量
// ============================================================================

/** Electron 主进程 HTTP 状态服务地址，端口可通过 PET_PORT 环境变量覆盖 */
const STATE_URL = `http://127.0.0.1:${process.env.PET_PORT || '21345'}/state`;

// ============================================================================
// 工具函数
// ============================================================================

/** 创建 Claude 状态对象 */
function createState(phase: ClaudePhase, activity: ClaudeActivity, message: string): ClaudeState {
  return { timestamp: new Date().toISOString(), phase, activity, message };
}

// ============================================================================
// 事件处理 — 将 Claude Code hook 事件映射为结构化状态
// ============================================================================

/**
 * 将 Claude Code 事件映射为 ClaudeState。
 *
 * 映射原则：
 *   - phase 反映 Claude 当前的宏观阶段（idle/thinking/executing/waiting/compacting/error）
 *   - activity 标识具体动作（对应工具名或动作类型）
 *   - message 是给用户看的中文描述
 *
 * 重要区分：
 *   PostToolUse / SubagentStop / PostCompact / TaskCompleted 这些事件
 *   都是「中间步骤完成」，Claude 还在继续工作，属于 executing 阶段，
 *   不是「整个响应完成」。只有 Stop 事件才表示 Claude 真正结束响应。
 */
function processEvent(event: string, data: Record<string, unknown>): ClaudeState | null {
  switch (event) {

    // ==========================================================================
    // 会话生命周期
    // ==========================================================================

    case 'SessionStart':
      // Claude Code 会话刚启动或从暂停中恢复
      return createState('idle', 'session', '会话已启动，等待输入');

    case 'SessionEnd':
      // Claude Code 会话结束（用户退出）
      return createState('idle', 'session', '会话已结束');

    // ==========================================================================
    // 用户交互
    // ==========================================================================

    case 'UserPromptSubmit':
      // 用户提交了提示词，Claude 开始思考和规划如何响应
      // 在 Claude 决定调用第一个工具之前，会有一段思考时间
      return createState('thinking', 'other', '收到提示词，正在思考');

    // ==========================================================================
    // 工具调用
    //
    // Claude 在一个 turn 中可能连续调用多个工具。
    // PreToolUse = 即将调用某个工具（Claude 主动发起）
    // PostToolUse = 该工具调用结束（Claude 继续决策下一步）
    // PostToolUseFailure = 工具调用本身失败（非工具返回错误，而是调用过程出错）
    // ==========================================================================

    case 'PreToolUse': {
      // Claude 决定调用某个工具，根据工具类型映射到具体的 activity
      const tool_name = (typeof data.tool_name === 'string' && data.tool_name) || 'unknown';
      switch (tool_name) {
        case 'Read':
          // 读取文件内容
          return createState('executing', 'Read', '正在读取文件');
        case 'Write':
          // 写入新文件（完整内容）
          return createState('executing', 'Write', '正在写入文件');
        case 'Edit':
          // 编辑已有文件（局部替换）
          return createState('executing', 'Write', '正在编辑文件');
        case 'Bash':
          // 执行 shell 命令
          return createState('executing', 'Bash', '正在执行命令');
        case 'Grep':
          // 按内容搜索文件
          return createState('executing', 'Grep', '正在搜索文件内容');
        case 'Glob':
          // 按文件名模式匹配文件
          return createState('executing', 'Glob', '正在搜索文件名');
        case 'WebFetch':
          // 抓取网页内容
          return createState('executing', 'WebFetch', '正在抓取网页');
        case 'WebSearch':
          // 网络搜索
          return createState('executing', 'WebSearch', '正在搜索网络');
        case 'Agent':
          // 启动子代理处理子任务
          return createState('executing', 'Agent', '正在启动子代理');
        case 'NotebookEdit':
          // 编辑 Jupyter notebook 单元格
          return createState('executing', 'NotebookEdit', '正在编辑笔记本');
        case 'AskUserQuestion':
          // Claude 向用户提问以澄清需求
          return createState('executing', 'AskUserQuestion', '正在向用户提问');
        default:
          // 其他未知工具
          return createState('executing', 'other', `正在使用工具 ${tool_name}`);
      }
    }

    case 'PostToolUse': {
      // 单个工具调用完成。
      // 注意：这只是其中一个工具调用的结果，Claude 很可能会继续调用下一个工具。
      // 所以 phase 是 executing（Claude 仍在工作中），不是 done。
      const tool_name = (typeof data.tool_name === 'string' && data.tool_name) || 'unknown';
      const resp = typeof data.tool_response === 'object' && data.tool_response
        ? (data.tool_response as Record<string, unknown>)
        : {};

      if (resp.error) {
        // 工具返回了错误结果，Claude 会根据错误决定是否重试或换策略
        return createState('error', 'other', `工具 ${tool_name} 返回错误`);
      }
      // 工具成功完成，Claude 继续处理下一步
      return createState('executing', 'other', `工具 ${tool_name} 调用完成，继续工作`);
    }

    case 'PostToolUseFailure':
      // 工具调用本身失败（不是工具返回错误，而是调用过程出错，如超时、权限等）
      // Claude 会处理这个失败并决定下一步
      return createState('error', 'other', '工具调用失败，Claude 正在处理');

    // ==========================================================================
    // 权限
    //
    // Claude Code 的权限系统会在工具执行前检查是否需要用户授权。
    // PermissionRequest = 弹出权限对话框等待用户点击
    // PermissionDenied = 自动模式分类器拒绝了该工具调用
    // ==========================================================================

    case 'PermissionRequest':
      // 弹出了权限对话框，Claude 等待用户批准或拒绝
      return createState('waiting', 'permission', '等待用户授权操作');

    case 'PermissionDenied':
      // 权限被自动模式分类器拒绝（不是用户手动拒绝）。
      // Claude 收到拒绝通知后会调整策略
      return createState('error', 'permission', '操作权限被拒绝，Claude 正在调整');

    // ==========================================================================
    // 响应结束
    //
    // 这才是 Claude 一个 turn 的真正结束。
    // Stop = Claude 完成了对用户的完整响应
    // StopFailure = API 调用出错导致响应中断
    // ==========================================================================

    case 'Stop':
      // Claude 完成了完整的响应，回到空闲状态等待用户下一次输入
      return createState('idle', 'other', '响应完成，等待输入');

    case 'StopFailure':
      // API 出错导致响应中断（如 rate limit、网络错误等）
      return createState('error', 'other', 'API 错误，响应中断');

    // ==========================================================================
    // 通知
    // ==========================================================================

    case 'Notification':
      // Claude Code 发送了系统通知（如任务完成提醒等）
      return createState('idle', 'notification', String(data.message || ''));

    // ==========================================================================
    // 子代理
    //
    // 子代理是 Claude 为处理子任务而启动的独立代理进程。
    // SubagentStart = 子代理被创建并开始执行
    // SubagentStop = 子代理执行完毕返回结果给主代理
    // 注意：子代理完成后主代理 Claude 仍在工作中
    // ==========================================================================

    case 'SubagentStart':
      return createState('executing', 'subagent', '子代理已启动，正在执行子任务');

    case 'SubagentStop':
      // 子代理完成，结果返回给主代理，Claude 继续工作
      return createState('executing', 'subagent', '子代理执行完毕，Claude 继续工作');

    // ==========================================================================
    // 上下文压缩
    //
    // 当对话上下文接近 token 上限时，Claude Code 会自动压缩历史消息。
    // PreCompact = 即将开始压缩
    // PostCompact = 压缩完成，Claude 继续响应
    // ==========================================================================

    case 'PreCompact':
      return createState('compacting', 'compact', '正在压缩上下文窗口');

    case 'PostCompact':
      // 压缩完成，Claude 会继续刚才被中断的响应
      return createState('executing', 'compact', '上下文压缩完成，继续工作');

    // ==========================================================================
    // 任务管理
    //
    // 任务是 Claude 内部的 todo 跟踪系统。
    // TaskCreated = 新任务被创建
    // TaskCompleted = 任务被标记为完成
    // 注意：任务完成不等于 Claude 响应完成
    // ==========================================================================

    case 'TaskCreated':
      return createState('executing', 'task', '创建了新任务');

    case 'TaskCompleted':
      // 任务标记完成，但 Claude 还在继续处理其他工作
      return createState('executing', 'task', '任务已完成，Claude 继续工作');

    // ==========================================================================
    // 环境变化
    // ==========================================================================

    case 'InstructionsLoaded':
      // CLAUDE.md 或 .claude/rules/*.md 被加载到上下文中
      // 会在会话启动时和懒加载时触发
      return createState('executing', 'instructions', '正在加载项目指令');

    case 'CwdChanged':
      // 工作目录变化（如 Claude 执行了 cd 命令）
      return createState('executing', 'cwd', '工作目录已变更');

    case 'ConfigChange':
      // 配置文件在会话过程中发生了变化
      return createState('executing', 'config', '配置文件已变更');

    case 'FileChanged':
      // 被监视的文件在磁盘上发生了变化
      return createState('executing', 'file', '文件已变更');

    case 'TeammateIdle':
      // Agent 团队中的队友即将进入空闲状态
      return createState('idle', 'other', '队友已进入空闲');

    // ==========================================================================
    // 工作树
    //
    // 工作树是 git worktree 的管理功能，用于隔离工作环境。
    // ==========================================================================

    case 'WorktreeCreate':
      return createState('executing', 'worktree', '正在创建工作树');

    case 'WorktreeRemove':
      return createState('executing', 'worktree', '正在移除工作树');

    // ==========================================================================
    // MCP 用户输入（Elicitation）
    //
    // MCP 服务器在工具调用过程中需要用户输入时的交互流程。
    // Elicitation = MCP 服务器请求用户输入
    // ElicitationResult = 用户已响应，结果将返回给 MCP 服务器
    // ==========================================================================

    case 'Elicitation':
      return createState('waiting', 'elicitation', 'MCP 服务器请求用户输入');

    case 'ElicitationResult':
      // 用户已响应，Claude 会继续处理 MCP 工具调用
      return createState('executing', 'elicitation', '用户已响应，继续执行');

    // ==========================================================================
    // 未知事件
    // ==========================================================================

    default:
      return null;
  }
}

// ============================================================================
// 状态推送
// ============================================================================

/** 通过 HTTP POST 将 Claude 状态推送到 Electron 主进程的状态服务 */
function sendState(state: ClaudeState): void {
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
    // 静默失败 — Electron 应用可能尚未启动，状态服务不可用
  });

  req.setTimeout(3000, () => {
    req.destroy();
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
    process.exit(1);
  }

  try {
    // 从 stdin 读取 Claude Code 传入的事件数据（JSON 格式）
    let stdinText = '';
    for await (const chunk of process.stdin) {
      stdinText += chunk.toString();
    }

    // 如果 stdin 为空（某些事件不携带数据），跳过处理
    if (!stdinText.trim()) {
      return;
    }

    const data = JSON.parse(stdinText);
    const state = processEvent(eventType, data);
    if (state) sendState(state);
  } catch (err) {
    console.error('[hook-sender] 事件处理失败:', err instanceof Error ? err.message : err);
  }
}

main().catch((err) => {
  console.error('[hook-sender] 启动失败:', err instanceof Error ? err.message : err);
});
