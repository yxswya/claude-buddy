/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

export type Species =
  | 'duck' | 'goose' | 'blob' | 'cat' | 'dragon' | 'octopus'
  | 'owl' | 'penguin' | 'turtle' | 'snail' | 'ghost' | 'axolotl'
  | 'capybara' | 'cactus' | 'robot' | 'rabbit' | 'mushroom' | 'chonk';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Eye = '·' | '✦' | '×' | '◉' | '@' | '°';
export type Hat = 'none' | 'crown' | 'tophat' | 'propeller' | 'halo' | 'wizard' | 'beanie' | 'tinyduck';
export type Status = 'idle' | 'thinking' | 'responding' | 'tool_use' | 'waiting';

export interface Pet {
  name: string;
  species: Species;
  rarity: Rarity;
  eye: Eye;
  hat: Hat;
}

// Render pet for web
function renderPetWeb(frame: number): string {
  const frames = [
    ['}~(______)~{', '}~(E .. E)~{', '  ( .--. )  ', '  (_/  \\_)  '],
    ['~}(______){~', '~}(E .. E){~', '  ( .--. )  ', '  (_/  \\_)  '],
    ['}~(______)~{', '}~(E .. E)~{', '  (  --  )  ', '  ~_/  \\_~  '],
  ];
  const sprite = frames?.[frame % frames.length] ?? [];
  let lines = sprite.map(line => line.replace(/E/g, '@'));

  return lines.join('\n');
}

// Display pet and status
function displayPet(frame: number): void {
  const petContainer = document.getElementById('pet-container');
  const petTxt = document.getElementById('pet-txt');

  if (petContainer) {
    petContainer.style.color = '#ff8800';
    petContainer.textContent = renderPetWeb(frame);
  }

  if (petTxt) {
    const statuses = ['想睡觉了', '正在思考...', '正在回复...', '使用工具中...', '等待中...'];
    petTxt.textContent = statuses[frame % statuses.length]!;
    petTxt.style.color = '#ffae52';
  }
}

displayPet(0)

// Animation loop with cleanup
let frame = 0;
const animationInterval = setInterval(() => {
  frame = (frame + 1) % 1000;
  displayPet(frame);
}, 500);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(animationInterval);
});