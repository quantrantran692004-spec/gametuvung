import test from 'node:test';
import assert from 'node:assert/strict';
import { setFeedback } from '../js/feedback-display.js';
test('temporary feedback clears both visibility and content', async () => {
 const node={textContent:'',className:'',style:{opacity:'1',visibility:'visible'}};
 setFeedback(node,'Sai','bad',10);
 assert.match(node.className,/is-visible/);
 await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(node.className,'game-feedback'); assert.equal(node.textContent,''); assert.equal(node.style.opacity,'');
});
