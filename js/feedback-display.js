const timers = new WeakMap();
export function setFeedback(node, message, kind = '', duration = 850) {
  clearTimeout(timers.get(node));
  node.style.opacity = '';
  node.style.visibility = '';
  node.textContent = message || '';
  node.className = `game-feedback${message ? ' is-visible' : ''}${kind ? ` is-${kind}` : ''}`;
  if (message) timers.set(node, setTimeout(() => { node.className = 'game-feedback'; node.textContent = ''; node.style.opacity = ''; node.style.visibility = ''; timers.delete(node); }, duration));
}
