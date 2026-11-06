import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBulkWords } from '../js/bulk-words.js';
test('parses pairs and reports invalid lines', () => {
  assert.deepEqual(parseBulkWords('apple - quả táo\nbook : quyển sách\ninvalid\ncat\tcon mèo'), { words: [{english:'apple', vietnamese:'quả táo'}, {english:'book', vietnamese:'quyển sách'}, {english:'cat', vietnamese:'con mèo'}], invalidLines: [3] });
});
