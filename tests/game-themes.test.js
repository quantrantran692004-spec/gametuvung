import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTheme } from '../js/game-themes.js';
test('all ten selectable themes have distinct visual definitions', () => {
 const themes = Array.from({length:10}, (_, i) => getGameTheme(String(i+1)));
 assert.equal(new Set(themes.map(t => t.name)).size, 10);
 assert.ok(themes.every(t => t.card && t.ink && t.accent));
 assert.equal(getGameTheme('bogus').name, 'Mặc định');
});
