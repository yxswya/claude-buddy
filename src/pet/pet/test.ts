#!/usr/bin/env bun
import { hatchPet } from './companion';
import { renderSprite, renderFace, renderWithEffect, renderHearts } from './sprites';
import { getCurrentFrame, getCompactDisplay, ACTION_EMOJIS, type PetAnimationState } from './state';

// 孵化一个新宠物
const pet = hatchPet('user-123');
console.log('Hatched:', pet.name);
console.log('Species:', pet.species);
console.log('Rarity:', pet.rarity);
console.log('Stats:', pet.stats);

console.log('\nSprite:');
const sprite = renderSprite(pet, 0);
sprite.forEach(line => console.log(line));

console.log('\nCompact face:');
console.log(renderFace(pet));

console.log('\nShiny:', pet.shiny ? '✨ SHINY!' : '');

// 测试动画状态
const animState: PetAnimationState = {
  bones: pet,
  action: {
    type: 'working',
    message: 'Testing...',
    timestamp: new Date().toISOString(),
  },
  frame: 0,
  petting: false,
  petFrame: 0,
};

console.log('\nAnimation frame:');
const frame = getCurrentFrame(animState);
console.log('Sprite:', frame.sprite);
console.log('Effect:', frame.effect);
console.log('Hearts:', frame.hearts);

console.log('\nCompact display:');
console.log(getCompactDisplay(animState));

console.log('\nAction emojis:', ACTION_EMOJIS);
