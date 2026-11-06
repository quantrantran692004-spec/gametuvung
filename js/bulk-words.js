export function parseBulkWords(text) {
  const words = [], invalidLines = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const match = line.match(/^\s*(.+?)\s*(?:\t|\s*[-:=–—]\s*)\s*(.+?)\s*$/);
    if (!match || !match[1].trim() || !match[2].trim()) invalidLines.push(index + 1);
    else words.push({ english: match[1].trim(), vietnamese: match[2].trim() });
  });
  return { words, invalidLines };
}
