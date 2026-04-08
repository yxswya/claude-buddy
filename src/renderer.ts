/**
 * 渲染进程 — 状态精灵显示、状态文字、窗口拖拽
 */

import type { ClaudeState, ClaudePhase, ClaudeActivity } from './types';

// Window.electronAPI 类型声明见 electron-api.d.ts

// ============================================================================
// 状态 → GIF 映射（phase + activity → 精灵动画）
// ============================================================================

/** 按 phase 选择主动画，部分 activity 有专属动画 */
const PHASE_GIFS: Record<ClaudePhase, string> = {
  idle: '/gifs/idle.gif',
  thinking: '/gifs/thinking.gif',
  executing: '/gifs/executing.gif',
  waiting: '/gifs/waiting.gif',
  compacting: '/gifs/compacting.gif',
  error: '/gifs/error.gif',
};

/** executing phase 下按 activity 细分的专属动画 */
const ACTIVITY_GIFS: Partial<Record<ClaudeActivity, string>> = {
  Read: '/gifs/executing-read.gif',
  Grep: '/gifs/executing-read.gif',
  Glob: '/gifs/executing-read.gif',
  Write: '/gifs/executing-write.gif',
  Edit: '/gifs/executing-write.gif',
  Bash: '/gifs/executing-bash.gif',
  WebFetch: '/gifs/executing-web.gif',
  WebSearch: '/gifs/executing-web.gif',
  Agent: '/gifs/executing-agent.gif',
};

/** phase 文字颜色 */
const PHASE_COLORS: Record<ClaudePhase, string> = {
  idle: '#ffb74d',
  thinking: '#ffae52',
  executing: '#4fc3f7',
  waiting: '#ce93d8',
  compacting: '#80cbc4',
  error: '#e57373',
};

// ============================================================================
// DOM 元素
// ============================================================================

const petGif = document.getElementById('pet-gif') as HTMLImageElement;
const petTxt = document.getElementById('pet-txt') as HTMLDivElement;

/** 当前显示的 phase（用于检测变化） */
let currentPhase: ClaudePhase = 'idle';

/**
 * 自动回落计时器。
 * error 是瞬时状态，显示 3 秒后自动回落到 idle。
 * （Claude 的 error 事件后会继续工作或由 Stop 事件接管，所以不需要一直显示错误动画）
 */
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

/** 需要自动回落的瞬时状态 */
const TRANSIENT_PHASES = new Set<ClaudePhase>(['error']);

function resetFallback(): void {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

function startFallback(): void {
  resetFallback();
  fallbackTimer = setTimeout(() => {
    currentPhase = 'idle';
    if (petGif) petGif.src = PHASE_GIFS.idle;
    if (petTxt) {
      petTxt.textContent = '空闲';
      petTxt.style.color = PHASE_COLORS.idle;
    }
  }, 3000);
}

// ============================================================================
// 显示更新
// ============================================================================

/** 根据 phase + activity 选择 GIF */
function selectGif(phase: ClaudePhase, activity: ClaudeActivity): string {
  if (phase === 'executing' && ACTIVITY_GIFS[activity]) {
    return ACTIVITY_GIFS[activity]!;
  }
  return PHASE_GIFS[phase];
}

/** 根据 Claude 状态切换精灵和文字 */
function displayPet(state: ClaudeState | null): void {
  const phase = state?.phase || 'idle';
  const activity = state?.activity || 'other';

  resetFallback();

  if (phase !== currentPhase && petGif) {
    currentPhase = phase;
    petGif.src = selectGif(phase, activity);
  }

  if (petTxt) {
    petTxt.textContent = state?.message || '空闲';
    petTxt.style.color = PHASE_COLORS[phase];
  }

  if (TRANSIENT_PHASES.has(phase)) {
    startFallback();
  }
}

// ============================================================================
// 状态监听
// ============================================================================

window.electronAPI?.getCurrentClaudeState().then((state) => displayPet(state));
window.electronAPI?.onClaudeStateUpdate((state) => displayPet(state));

// ============================================================================
// 窗口拖拽
// ============================================================================

let dragStart: { screenX: number; screenY: number } | null = null;

document.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    dragStart = { screenX: e.screenX, screenY: e.screenY };
  }
});

document.addEventListener('mousemove', (e) => {
  if (!dragStart) return;
  const dx = e.screenX - dragStart.screenX;
  const dy = e.screenY - dragStart.screenY;
  dragStart = { screenX: e.screenX, screenY: e.screenY };
  window.electronAPI?.dragWindow(dx, dy);
});

document.addEventListener('mouseup', () => {
  dragStart = null;
});
