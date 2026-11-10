import test from 'node:test';
import assert from 'node:assert/strict';
import { VocabManager } from '../js/vocab-manager.js';

test('game selection uses each English word once, even across duplicate records', () => {
  const vocab = new VocabManager();
  vocab.words = [
    { english: 'Apple', unit: 'Food' },
    { english: 'apple', unit: 'Food' },
    { english: 'book', unit: 'School' },
  ];
  assert.equal(vocab.getGameWords(10, 'all').length, 2);
  assert.deepEqual(vocab.getGameWords(Infinity, 'unit:Food').map(w => w.english.toLowerCase()), ['apple']);
});
