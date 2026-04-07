/**
 * Pet renderer — displays GIF companion in the Electron window.
 * Switches GIF based on Claude Code activity state.
 */

// ============================================================================
// Type declarations for Electron IPC
// ============================================================================

declare global {
  interface Window {
    electronAPI: {
      getCurrentPetState: () => Promise<PetState | null>;
      onPetStateUpdate: (callback: (state: PetState) => void) => void;
    };
  }
}

interface PetState {
  timestamp: string;
  type: 'thinking' | 'working' | 'success' | 'error' | 'idle' | 'reading' | 'writing' | 'browsing' | 'talking';
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// GIF state mapping
// ============================================================================

const STATE_GIFS: Record<string, string> = {
  idle: '/gifs/idle.gif',
  thinking: '/gifs/thinking.gif',
  working: '/gifs/working.gif',
  reading: '/gifs/idle.gif',
  writing: '/gifs/writing.gif',
  browsing: '/gifs/browsing.gif',
  talking: '/gifs/talking.gif',
  success: '/gifs/success.gif',
  error: '/gifs/error.gif',
};

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
// Display
// ============================================================================

const petGif = document.getElementById('pet-gif') as HTMLImageElement;
const petTxt = document.getElementById('pet-txt') as HTMLDivElement;

let currentType = 'idle';

function displayPet(state: PetState | null): void {
  const type = state?.type || 'idle';

  // Switch GIF when state changes (changing src on same GIF restarts it)
  if (type !== currentType && petGif) {
    currentType = type;
    petGif.src = STATE_GIFS[type] || STATE_GIFS.idle!;
  }

  if (petTxt) {
    petTxt.textContent = state?.message || '想睡觉了~';
    petTxt.style.color = STATE_COLORS[type] || '#ffb74d';
  }
}

// ============================================================================
// State listeners
// ============================================================================

window.electronAPI?.getCurrentPetState().then((state) => {
  displayPet(state);
});

window.electronAPI?.onPetStateUpdate((state) => {
  displayPet(state);
});
