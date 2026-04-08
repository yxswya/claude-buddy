/**
 * 共享类型定义 — Claude 状态监控
 *
 * Claude Code 的生命周期：
 *
 *   会话开始 (SessionStart)
 *     ↓
 *   等待用户输入 ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
 *     ↓                                                  ↑
 *   用户提交提示词 (UserPromptSubmit)                      ↑
 *     ↓                                                  ↑
 *   Claude 思考 → 可能需要权限 (PermissionRequest)        ↑
 *     ↓              ↓                                   ↑
 *   调用工具 (PreToolUse)  等待用户授权                    ↑
 *     ↓                                                  ↑
 *   工具调用完成 (PostToolUse) — 单个工具完成，继续循环     ↑
 *     ↓                                                  ↑
 *   Claude 决定下一步：继续调工具？还是结束响应？            ↑
 *     ↓              ↓                                   ↑
 *   更多工具调用    响应结束 (Stop) — 回到等待用户输入  →→→→
 *
 * 关键理解：
 * - PostToolUse = 单个工具调用完毕，Claude 仍在工作中
 * - SubagentStop = 子代理完毕，Claude 仍在工作中
 * - PostCompact = 压缩完毕，Claude 仍在工作中
 * - TaskCompleted = 任务标记完成，Claude 仍在工作中
 * - Stop = 整个响应结束，Claude 真正空闲
 *
 * 因此不存在真正的 "done" 阶段，所有中间完成事件都属于 executing 阶段。
 */

/** Claude 运行阶段 */
export type ClaudePhase =
  | 'idle'            // 等待用户输入（Stop、SessionStart、SessionEnd、TeammateIdle）
  | 'thinking'        // Claude 正在思考如何回应用户（UserPromptSubmit）
  | 'executing'       // Claude 正在执行工具或中间步骤完成仍在继续工作
  | 'waiting'         // Claude 等待用户操作（PermissionRequest、Elicitation）
  | 'compacting'      // Claude 正在压缩上下文窗口（PreCompact）
  | 'error';          // 出错（StopFailure、PostToolUse 失败、PermissionDenied）

/** 具体活动（对应工具名或动作类型） */
export type ClaudeActivity =
  | 'Read' | 'Write' | 'Edit' | 'Bash'
  | 'Grep' | 'Glob'
  | 'WebFetch' | 'WebSearch'
  | 'Agent' | 'NotebookEdit' | 'AskUserQuestion'
  | 'compact' | 'notification' | 'subagent'
  | 'session' | 'permission' | 'config'
  | 'cwd' | 'file' | 'worktree'
  | 'elicitation' | 'task' | 'instructions'
  | 'other';

/** Claude 实时状态（由 hook-sender 通过 HTTP POST 发送到 Electron 主进程） */
export interface ClaudeState {
  timestamp: string;
  phase: ClaudePhase;
  activity: ClaudeActivity;
  message: string;
}

/** 宠物配置（持久化到 userData） */
export interface PetConfig {
  name: string;
  enabled: boolean;
}
