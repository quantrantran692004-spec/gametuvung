export function characterStates(target, input) {
  const typed = Array.from(input.toLocaleLowerCase());
  return Array.from(target.toLocaleLowerCase()).map((letter, i) => i >= typed.length ? 'pending' : letter === typed[i] ? 'correct' : 'wrong');
}
