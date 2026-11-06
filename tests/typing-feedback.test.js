import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characterStates } from '../js/typing-feedback.js';
test('marks typed letters green or red without coloring the remaining letters',()=>assert.deepEqual(characterStates('apple','ax'),['correct','wrong','pending','pending','pending']));
