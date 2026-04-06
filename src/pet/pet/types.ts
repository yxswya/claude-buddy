/**
 * Zion Pet Types - 宠物系统类型定义
 */

// ============================================================================
// 物种定义
// ============================================================================

export const SPECIES = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'penguin',
  'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot',
  'rabbit', 'mushroom', 'chonk'
] as const;
export type Species = typeof SPECIES[number];

// ============================================================================
// 稀有度
// ============================================================================

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = typeof RARITIES[number];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

export const RARITY_STARS: Record<Rarity, string> = {
  common: '★',
  uncommon: '★★',
  rare: '★★★',
  epic: '★★★★',
  legendary: '★★★★★',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#888888',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// ============================================================================
// 眼睛类型
// ============================================================================

export const EYES = ['·', '✦', '×', '◉', '@', '°'] as const;
export type Eye = typeof EYES[number];

// ============================================================================
// 帽子类型
// ============================================================================

export const HATS = ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck'] as const;
export type Hat = typeof HATS[number];

// ============================================================================
// 属性
// ============================================================================

export const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'] as const;
export type StatName = typeof STAT_NAMES[number];

// ============================================================================
// 宠物骨骼 (确定性生成)
// ============================================================================

export interface PetBones {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Record<StatName, number>;
}

// ============================================================================
// 宠物灵魂 (存储的)
// ============================================================================

export interface PetSoul {
  name: string;
  personality: string;
  seed?: string;
}

// ============================================================================
// 完整宠物
// ============================================================================

export interface Pet extends PetBones, PetSoul {
  hatchedAt: number;
}

// ============================================================================
// 存储格式 (只有灵魂需要存储)
// ============================================================================

export interface StoredPet extends PetSoul {
  hatchedAt: number;
}

// ============================================================================
// 宠物动作状态 (用于动画)
// ============================================================================

export const PET_ACTION_TYPES = [
  'idle',      // 空闲
  'thinking',  // 思考中
  'working',   // 工作中
  'reading',   // 读取文件
  'writing',   // 写入文件
  'browsing',  // 浏览网络
  'talking',   // 对话
  'success',   // 成功
  'error',     // 错误
] as const;
export type PetActionType = typeof PET_ACTION_TYPES[number];

export interface PetAction {
  type: PetActionType;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// 宠物动画帧
// ============================================================================

export interface PetFrame {
  sprite: string[];      // ASCII 精灵行
  blink: boolean;        // 是否眨眼
  hearts: string | null; // 爱心动画
}

// ============================================================================
// 默认名字和性格
// ============================================================================

export const SPECIES_NAMES: Record<Species, string> = {
  duck: 'Waddles',
  goose: 'Goosberry',
  blob: 'Gooey',
  cat: 'Whiskers',
  dragon: 'Ember',
  octopus: 'Inky',
  owl: 'Hoots',
  penguin: 'Waddleford',
  turtle: 'Shelly',
  snail: 'Trailblazer',
  ghost: 'Casper',
  axolotl: 'Axie',
  capybara: 'Chill',
  cactus: 'Spike',
  robot: 'Byte',
  rabbit: 'Flops',
  mushroom: 'Spore',
  chonk: 'Chonk',
};

export const SPECIES_PERSONALITY: Record<Species, string> = {
  duck: 'Quirky and easily amused. Leaves rubber duck debugging tips everywhere.',
  goose: 'Assertive and honks at bad code. Takes no prisoners in code reviews.',
  blob: 'Adaptable and goes with the flow. Sometimes splits into two when confused.',
  cat: 'Independent and judgmental. Watches you type with mild disdain.',
  dragon: 'Fiery and passionate about architecture. Hoards good variable names.',
  octopus: 'Multitasker extraordinaire. Wraps tentacles around every problem at once.',
  owl: 'Wise but verbose. Always says "let me think about that" for exactly 3 seconds.',
  penguin: 'Cool under pressure. Slides gracefully through merge conflicts.',
  turtle: 'Patient and thorough. Believes slow and steady wins the deploy.',
  snail: 'Methodical and leaves a trail of useful comments. Never rushes.',
  ghost: 'Ethereal and appears at the worst possible moments with spooky insights.',
  axolotl: 'Regenerative and cheerful. Recovers from any bug with a smile.',
  capybara: 'Zen master. Remains calm while everything around is on fire.',
  cactus: 'Prickly on the outside but full of good intentions. Thrives on neglect.',
  robot: 'Efficient and literal. Processes feedback in binary.',
  rabbit: 'Energetic and hops between tasks. Finishes before you start.',
  mushroom: 'Quietly insightful. Grows on you over time.',
  chonk: 'Big, warm, and takes up the whole couch. Prioritizes comfort over elegance.',
};
