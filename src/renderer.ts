/**
 * Pet renderer — displays ASCII companion sprite in the Electron window.
 * Uses the shared pet module (sprites.ts + types.ts) for rendering.
 */

// ============================================================================
// Type declarations for Electron IPC
// ============================================================================

declare global {
  interface Window {
    electronAPI: {
      getCurrentPetState: () => Promise<PetState | null>;
      onPetStateUpdate: (callback: (state: PetState) => void) => void;
      onPetConfigChange: (callback: (config: { species: string }) => void) => void;
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
// Imports from shared pet module
// ============================================================================

import type { Species, Eye, Hat, PetBones } from './pet/pet/types';
import { SPECIES } from './pet/pet/types';
import { renderSpriteFull } from './pet/pet/sprites';

// ============================================================================
// Default bones for manual species selection
// ============================================================================

function makeDefaultBones(species: Species): PetBones {
  return {
    species,
    rarity: 'common',
    eye: '@' as Eye,
    hat: 'none' as Hat,
    shiny: false,
    stats: { DEBUGGING: 50, PATIENCE: 50, CHAOS: 50, WISDOM: 50, SNARK: 50 },
  };
}

// ============================================================================
// Rendering
// ============================================================================

// Pet color cycle
const petColors = [
  '#ff8800', // orange
  '#ff6b6b', // red
  '#4ecdc4', // cyan
  '#a66cff', // purple
  '#ffd93d', // yellow
  '#6bcb77', // green
  '#ff9ff3', // pink
];
let colorIndex = 0;

let currentBones: PetBones = makeDefaultBones('axolotl');

function renderPetWeb(frame: number, actionType?: string): string {
  // Use renderSpriteFull to preserve full 5-line height (for Electron display)
  const sprite = renderSpriteFull(currentBones, frame);

  // Blink every 10 frames when idle
  if ((!actionType || actionType === 'idle') && frame % 10 === 0) {
    return sprite.map(line => line.replaceAll(currentBones.eye, '-')).join('\n');
  }

  // Success: add stars on first line
  if (actionType === 'success') {
    return sprite.map((line, i) => i === 0 ? `✨ ${line}` : line).join('\n');
  }

  return sprite.join('\n');
}

function displayPet(frame: number, petState: PetState | null = null): void {
  const petContainer = document.getElementById('pet-container');
  const petTxt = document.getElementById('pet-txt');

  if (petContainer) {
    petContainer.style.color = petColors[colorIndex] || '#ff8800';
    petContainer.textContent = renderPetWeb(frame, petState?.type);
  }

  if (petTxt) {
    const colorMap: Record<string, string> = {
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

    if (petState) {
      petTxt.textContent = petState.message || '发呆中...';
      petTxt.style.color = colorMap[petState.type] || '#ffae52';
    } else {
      petTxt.textContent = '想睡觉了~';
      petTxt.style.color = petColors[colorIndex] || '#ffb74d';
    }
  }
}

// ============================================================================
// State management
// ============================================================================

let currentPetState: PetState | null = null;

function isValidSpecies(s: string): s is Species {
  return (SPECIES as readonly string[]).includes(s);
}

// Color cycle every 3 seconds
setInterval(() => {
  colorIndex = (colorIndex + 1) % petColors.length;
}, 3000);

// Init: load current state
window.electronAPI?.getCurrentPetState().then((state) => {
  currentPetState = state;
  displayPet(0, currentPetState);
});

// Listen for state updates
window.electronAPI?.onPetStateUpdate((state) => {
  currentPetState = state;
  displayPet(0, currentPetState);
});

// Listen for config changes (species selection)
window.electronAPI?.onPetConfigChange((config: { species: string }) => {
  if (isValidSpecies(config.species)) {
    currentBones = makeDefaultBones(config.species);
  }
  displayPet(0, currentPetState);
});

// Animation loop
let frame = 0;
const animationInterval = setInterval(() => {
  frame = (frame + 1) % 1000;
  displayPet(frame, currentPetState);
}, 500);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(animationInterval);
});
