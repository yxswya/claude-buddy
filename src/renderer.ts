/**
 * 渲染进程 — 宠物 GIF 显示、状态文字、窗口拖拽
 */

// ============================================================================
// 类型声明
// ============================================================================

declare global {
  interface Window {
    electronAPI: {
      getCurrentPetState: () => Promise<PetState | null>;
      onPetStateUpdate: (callback: (state: PetState) => void) => void;
      dragWindow: (dx: number, dy: number) => void;
    };
  }
}

/** 宠物状态 */
interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
}

// ============================================================================
// 状态 → GIF 映射
// ============================================================================

const STATE_GIFS: Record<string, string> = {
  idle: '/gifs/idle.gif',
  thinking: '/gifs/writing.gif',
  working: '/gifs/working.gif',
  reading: '/gifs/idle.gif',
  writing: '/gifs/writing.gif',
  browsing: '/gifs/browsing.gif',
  talking: '/gifs/talking.gif',
  success: '/gifs/success.gif',
  error: '/gifs/error.gif',
};

/** 状态文字颜色 */
const STATE_COLORS: Record<string, string> = {
  thinking: '#ffae52',
  working: '#4fc3f7',
  success: '#81c784',
  error: '#e57373',
  idle: '#ffb74d',
  reading: '#9575cd',
  writing: '#f06292',
  browsing: '#64b5f6',
  talking: '#ffd54f',
};

// ============================================================================
// DOM 元素
// ============================================================================

const petGif = document.getElementById('pet-gif') as HTMLImageElement;
const petTxt = document.getElementById('pet-txt') as HTMLDivElement;

/** 当前显示的状态类型（用于检测变化） */
let currentType = 'idle';

/**
 * 自动回落计时器。
 *
 * Claude Code hooks 是一次性命令，没有 "Claude 正在思考" 的事件。
 * PostToolUse 触发后，到下一个事件之间有空白期。
 * 因此 success/error 状态显示 3 秒后自动回落到 idle。
 */
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

/** 需要自动回落的瞬时状态 */
const TRANSIENT_STATES = new Set(['success', 'error']);

/** 重置回落计时器 */
function resetFallback(): void {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

/** 启动回落计时器（3 秒后回到 idle） */
function startFallback(): void {
  resetFallback();
  fallbackTimer = setTimeout(() => {
    currentType = 'idle';
    if (petGif) petGif.src = STATE_GIFS.idle!;
    if (petTxt) {
      petTxt.textContent = '空闲';
      petTxt.style.color = STATE_COLORS.idle;
    }
  }, 3000);
}

// ============================================================================
// 显示更新
// ============================================================================

/** 根据宠物状态切换 GIF 和文字 */
function displayPet(state: PetState | null): void {
  const type = state?.type || 'idle';

  // 收到新事件时重置回落计时器
  resetFallback();

  // 状态变化时切换 GIF（切换 src 会重新播放动画）
  if (type !== currentType && petGif) {
    currentType = type;
    petGif.src = STATE_GIFS[type] || STATE_GIFS.idle!;
  }

  // 更新状态文字
  if (petTxt) {
    petTxt.textContent = state?.message || '空闲';
    petTxt.style.color = STATE_COLORS[type] ?? '#ffb74d';
  }

  // 瞬时状态（success/error）3 秒后自动回落到 idle
  if (TRANSIENT_STATES.has(type)) {
    startFallback();
  }
}

// ============================================================================
// 状态监听
// ============================================================================

// 初始化：获取当前状态
window.electronAPI?.getCurrentPetState().then(state => displayPet(state));

// 监听实时状态更新
window.electronAPI?.onPetStateUpdate(state => displayPet(state));

// ============================================================================
// 窗口拖拽（通过 IPC 传递鼠标偏移量给主进程）
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
