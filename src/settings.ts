/**
 * Pet settings page — species selection and naming.
 * Uses the shared pet module for sprite previews.
 */

import type { Species, Eye, Hat, PetBones } from './pet/pet/types';
import { SPECIES } from './pet/pet/types';
import { renderSpriteFull } from './pet/pet/sprites';

interface PetConfig {
  species: string;
  name: string;
  enabled: boolean;
}

// Default bones for preview rendering
function makePreviewBones(species: Species): PetBones {
  return {
    species,
    rarity: 'common',
    eye: '@' as Eye,
    hat: 'none' as Hat,
    shiny: false,
    stats: { DEBUGGING: 50, PATIENCE: 50, CHAOS: 50, WISDOM: 50, SNARK: 50 },
  };
}

// Chinese species name mapping
const SPECIES_NAMES_CN: Record<Species, string> = {
  duck: '鸭子',
  goose: '鹅',
  blob: '史莱姆',
  cat: '猫咪',
  dragon: '龙',
  octopus: '章鱼',
  owl: '猫头鹰',
  penguin: '企鹅',
  turtle: '乌龟',
  snail: '蜗牛',
  ghost: '幽灵',
  axolotl: '蝾螈',
  capybara: '卡皮巴拉',
  cactus: '仙人掌',
  robot: '机器人',
  rabbit: '兔子',
  mushroom: '蘑菇',
  chonk: '肥肥',
};

let currentConfig: PetConfig = {
  species: 'axolotl',
  name: 'Pickles',
  enabled: true,
};

// Load config
async function loadConfig(): Promise<void> {
  try {
    const config = await window.electronAPI.getPetConfig();
    if (config) {
      currentConfig = config;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }

  (document.getElementById('pet-name') as HTMLInputElement).value = currentConfig.name;
  updateSpeciesSelection();
}

// Save config
async function saveConfig(): Promise<void> {
  const name = (document.getElementById('pet-name') as HTMLInputElement).value.trim();

  if (!name) {
    alert('请输入宠物名字');
    return;
  }

  const newConfig: PetConfig = {
    ...currentConfig,
    name,
    enabled: true,
  };

  try {
    await window.electronAPI.savePetConfig(newConfig);
    currentConfig = newConfig;
    closeWindow();
  } catch (error) {
    console.error('Failed to save config:', error);
    alert('保存失败');
  }
}

function closeWindow(): void {
  window.electronAPI.closeSettings();
}

function isValidSpecies(s: string): s is Species {
  return (SPECIES as readonly string[]).includes(s);
}

// Build species grid using shared renderSprite
function updateSpeciesSelection(): void {
  const grid = document.getElementById('species-grid');

  if (!grid) {
    console.error('species-grid element not found');
    return;
  }

  grid.innerHTML = '';

  for (const speciesId of SPECIES) {
    const bones = makePreviewBones(speciesId);
    const preview = renderSpriteFull(bones, 0);

    const div = document.createElement('div');
    div.className = 'species-option';
    if (speciesId === currentConfig.species) {
      div.classList.add('selected');
    }

    const previewDiv = document.createElement('div');
    previewDiv.className = 'species-preview';
    previewDiv.textContent = preview.join('\n');

    const nameDiv = document.createElement('div');
    nameDiv.className = 'species-name';
    nameDiv.textContent = SPECIES_NAMES_CN[speciesId];

    div.appendChild(previewDiv);
    div.appendChild(nameDiv);

    div.addEventListener('click', () => {
      document.querySelectorAll('.species-option').forEach(el => {
        el.classList.remove('selected');
      });
      div.classList.add('selected');
      currentConfig.species = speciesId;
    });

    grid.appendChild(div);
  }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  updateSpeciesSelection();
  await loadConfig();

  document.getElementById('btn-save')!.addEventListener('click', saveConfig);
  document.getElementById('btn-cancel')!.addEventListener('click', closeWindow);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeWindow();
    }
  });
});

declare global {
  interface Window {
    electronAPI: {
      getPetConfig: () => Promise<PetConfig>;
      savePetConfig: (config: PetConfig) => Promise<{ success: boolean }>;
      closeSettings: () => void;
    };
  }
}
