/**
 * Zion Pet Sprites - ASCII 精灵渲染
 *
 * 每个精灵 5 行高，12 宽（替换眼睛后）
 * 多帧用于 idle fidget 动画
 * 第 0 行是帽子槽 - 帧 0-1 必须为空，帧 2 可以使用
 */

import type { PetBones, Species, Eye, Hat } from './types';

// ============================================================================
// 精灵身体定义
// ============================================================================

const BODIES: Record<Species, string[][]> = {
  duck: [
    ['            ', '    __      ', '  <({E} )___  ', '   (  ._>   ', '    `--´    '],
    ['            ', '    __      ', '  <({E} )___  ', '   (  ._>   ', '    `--´~   '],
    ['            ', '    __      ', '  <({E} )___  ', '   (  .__>  ', '    `--´    '],
  ],
  goose: [
    ['            ', '     ({E}>    ', '     ||     ', '   _(__)_   ', '    ^^^^    '],
    ['            ', '    ({E}>     ', '     ||     ', '   _(__)_   ', '    ^^^^    '],
    ['            ', '     ({E}>>   ', '     ||     ', '   _(__)_   ', '    ^^^^    '],
  ],
  blob: [
    ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  (      )  ', '   `----´   '],
    ['            ', '  .------.  ', ' (  {E}  {E}  ) ', ' (        ) ', '  `------´  '],
    ['            ', '    .--.    ', '   ({E}  {E})   ', '   (    )   ', '    `--´    '],
  ],
  cat: [
    ['            ', '   /\\_/\\    ', '  ( {E}   {E})  ', '  (  ω  )   ', '  (")_(")   '],
    ['            ', '   /\\_/\\    ', '  ( {E}   {E})  ', '  (  ω  )   ', '  (")_(")~  '],
    ['            ', '   /\\-/\\    ', '  ( {E}   {E})  ', '  (  ω  )   ', '  (")_(")   '],
  ],
  dragon: [
    ['            ', '  /^\\  /^\\  ', ' <  {E}  {E}  > ', ' (   ~~   ) ', '  `-vvvv-´  '],
    ['            ', '  /^\\  /^\\  ', ' <  {E}  {E}  > ', ' (        ) ', '  `-vvvv-´  '],
    ['   ~    ~   ', '  /^\\  /^\\  ', ' <  {E}  {E}  > ', ' (   ~~   ) ', '  `-vvvv-´  '],
  ],
  octopus: [
    ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  (______)  ', '  /\\/\\/\\/\\  '],
    ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  (______)  ', '  \\/\\/\\/\\/  '],
    ['     o      ', '   .----.   ', '  ( {E}  {E} )  ', '  (______)  ', '  /\\/\\/\\/\\  '],
  ],
  owl: [
    ['            ', '   /\\  /\\   ', '  (({E})({E}))  ', '  (  ><  )  ', '   `----´   '],
    ['            ', '   /\\  /\\   ', '  (({E})({E}))  ', '  (  ><  )  ', '   .----.   '],
    ['            ', '   /\\  /\\   ', '  (({E})(-))  ', '  (  ><  )  ', '   `----´   '],
  ],
  penguin: [
    ['            ', '  .---.     ', '  ({E}>{E})     ', ' /(   )\\    ', '  `---´     '],
    ['            ', '  .---.     ', '  ({E}>{E})     ', ' |(   )|    ', '  `---´     '],
    ['  .---.     ', '  ({E}>{E})     ', ' /(   )\\    ', '  `---´     ', '   ~ ~      '],
  ],
  turtle: [
    ['            ', '   _,--._   ', '  ( {E}  {E} )  ', ' /[______]\\ ', '  ``    ``  '],
    ['            ', '   _,--._   ', '  ( {E}  {E} )  ', ' /[______]\\ ', '   ``  ``   '],
    ['            ', '   _,--._   ', '  ( {E}  {E} )  ', ' /[======]\\ ', '  ``    ``  '],
  ],
  snail: [
    ['            ', ' {E}    .--.  ', '  \\  ( @ )  ', '   \\_`--´   ', '  ~~~~~~~   '],
    ['            ', '  {E}   .--.  ', '  |  ( @ )  ', '   \\_`--´   ', '  ~~~~~~~   '],
    ['            ', ' {E}    .--.  ', '  \\  ( @  ) ', '   \\_`--´   ', '   ~~~~~~   '],
  ],
  ghost: [
    ['            ', '   .----.   ', '  / {E}  {E} \\  ', '  |      |  ', '  ~`~``~`~  '],
    ['            ', '   .----.   ', '  / {E}  {E} \\  ', '  |      |  ', '  `~`~~`~`  '],
    ['    ~  ~    ', '   .----.   ', '  / {E}  {E} \\  ', '  |      |  ', '  ~~`~~`~~  '],
  ],
  axolotl: [
    ['            ', '}~(______)~{', '}~({E} .. {E})~{', '  ( .--. )  ', '  (_/  \\_)  '],
    ['            ', '~}(______){~', '~}({E} .. {E}){~', '  ( .--. )  ', '  (_/  \\_)  '],
    ['            ', '}~(______)~{', '}~({E} .. {E})~{', '  (  --  )  ', '  ~_/  \\_~  '],
  ],
  capybara: [
    ['            ', '  n______n  ', ' ( {E}    {E} ) ', ' (   oo   ) ', '  `------´  '],
    ['            ', '  n______n  ', ' ( {E}    {E} ) ', ' (   Oo   ) ', '  `------´  '],
    ['    ~  ~    ', '  u______n  ', ' ( {E}    {E} ) ', ' (   oo   ) ', '  `------´  '],
  ],
  cactus: [
    ['            ', ' n  ____  n ', ' | |{E}  {E}| | ', ' |_|    |_| ', '   |    |   '],
    ['            ', '    ____    ', ' n |{E}  {E}| n ', ' |_|    |_| ', '   |    |   '],
    [' n        n ', ' |  ____  | ', ' | |{E}  {E}| | ', ' |_|    |_| ', '   |    |   '],
  ],
  robot: [
    ['            ', '   .[||].   ', '  [ {E}  {E} ]  ', '  [ ==== ]  ', '  `------´  '],
    ['            ', '   .[||].   ', '  [ {E}  {E} ]  ', '  [ -==- ]  ', '  `------´  '],
    ['     *      ', '   .[||].   ', '  [ {E}  {E} ]  ', '  [ ==== ]  ', '  `------´  '],
  ],
  rabbit: [
    ['            ', '   (\\__/)   ', '  ( {E}  {E} )  ', ' =(  ..  )= ', '  (")__(")  '],
    ['            ', '   (|__/)   ', '  ( {E}  {E} )  ', ' =(  ..  )= ', '  (")__(")  '],
    ['            ', '   (\\__/)   ', '  ( {E}  {E} )  ', ' =( .  . )= ', '  (")__(")  '],
  ],
  mushroom: [
    ['            ', ' .-o-OO-o-. ', '(__________)', '   |{E}  {E}|   ', '   |____|   '],
    ['            ', ' .-O-oo-O-. ', '(__________)', '   |{E}  {E}|   ', '   |____|   '],
    ['   . o  .   ', ' .-o-OO-o-. ', '(__________)', '   |{E}  {E}|   ', '   |____|   '],
  ],
  chonk: [
    ['            ', '  /\\    /\\  ', ' ( {E}    {E} ) ', ' (   ..   ) ', '  `------´  '],
    ['            ', '  /\\    /|  ', ' ( {E}    {E} ) ', ' (   ..   ) ', '  `------´  '],
    ['            ', '  /\\    /\\  ', ' ( {E}    {E} ) ', ' (   ..   ) ', '  `------´~ '],
  ],
};

// ============================================================================
// 帽子定义
// ============================================================================

const HAT_LINES: Record<Hat, string> = {
  none: '',
  crown: '   \\^^^/    ',
  tophat: '   [___]    ',
  propeller: '    -+-     ',
  halo: '   (   )    ',
  wizard: '    /^\\     ',
  beanie: '   (___)    ',
  tinyduck: '    ,>      ',
};

// ============================================================================
// 渲染函数
// ============================================================================

/**
 * 渲染完整的精灵
 */
export function renderSprite(bones: PetBones, frame = 0): string[] {
  const frames = BODIES[bones.species];
  const body = frames[frame % frames.length].map(line =>
    line.replaceAll('{E}', bones.eye)
  );
  const lines = [...body];

  // 如果有帽子且第 0 行为空，替换为帽子
  if (bones.hat !== 'none' && !lines[0].trim()) {
    lines[0] = HAT_LINES[bones.hat];
  }

  // 如果所有帧的第 0 行都为空，移除空行（节省空间）
  if (!lines[0].trim() && frames.every(f => !f[0].trim())) {
    lines.shift();
  }

  return lines;
}

/**
 * 获取物种的帧数
 */
export function spriteFrameCount(species: Species): number {
  return BODIES[species].length;
}

/**
 * 渲染单行表情（用于窄终端）
 */
export function renderFace(bones: PetBones): string {
  const eye: Eye = bones.eye;
  switch (bones.species) {
    case 'duck':
    case 'goose':
      return `(${eye}>`;
    case 'blob':
      return `(${eye}${eye})`;
    case 'cat':
      return `=${eye}ω${eye}=`;
    case 'dragon':
      return `<${eye}~${eye}>`;
    case 'octopus':
      return `~(${eye}${eye})~`;
    case 'owl':
      return `(${eye})(${eye})`;
    case 'penguin':
      return `(${eye}>)`;
    case 'turtle':
      return `[${eye}_${eye}]`;
    case 'snail':
      return `${eye}(@)`;
    case 'ghost':
      return `/${eye}${eye}\\`;
    case 'axolotl':
      return `}${eye}.${eye}{`;
    case 'capybara':
      return `(${eye}oo${eye})`;
    case 'cactus':
      return `|${eye}  ${eye}|`;
    case 'robot':
      return `[${eye}${eye}]`;
    case 'rabbit':
      return `(${eye}..${eye})`;
    case 'mushroom':
      return `|${eye}  ${eye}|`;
    case 'chonk':
      return `(${eye}.${eye})`;
  }
}

/**
 * 渲染眨眼状态
 */
export function renderBlink(bones: PetBones, frame: number): string[] {
  const sprite = renderSprite(bones, frame);
  // 每 10 帧眨一次眼
  const shouldBlink = frame % 10 === 0;
  if (shouldBlink) {
    return sprite.map(line => line.replaceAll(bones.eye, '-'));
  }
  return sprite;
}

/**
 * 渲染带状态效果的精灵
 */
export function renderWithEffect(
  bones: PetBones,
  frame: number,
  actionType: string
): { sprite: string[]; effect: string | null } {
  let sprite = renderSprite(bones, frame);
  let effect: string | null = null;

  switch (actionType) {
    case 'thinking':
      // 思考时添加气泡
      effect = '💭';
      break;
    case 'working':
      // 工作时添加齿轮
      effect = '⚙️';
      break;
    case 'success':
      // 成功时添加星星
      sprite = sprite.map((line, i) =>
        i === 0 ? `✨ ${line}` : line
      );
      break;
    case 'error':
      // 错误时添加汗滴
      effect = '💦';
      break;
    case 'idle':
    default:
      // 空闲时可能眨眼
      sprite = renderBlink(bones, frame);
      break;
  }

  return { sprite, effect };
}

/**
 * 渲染爱心动画（petting）
 */
export function renderHearts(frame: number): string | null {
  const hearts = ['   ❤    ❤   ', '  ❤  ❤   ❤  ', ' ❤   ❤  ❤   ', '❤  ❤      ❤ ', '·    ·   ·  '];
  if (frame < hearts.length) {
    return hearts[frame % hearts.length];
  }
  return null;
}
