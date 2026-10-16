// Answer Checker with fuzzy matching and punctuation normalizer

export class AnswerChecker {
  static normalize(text, caseSensitive = false) {
    if (!text) return '';
    let res = text.trim();
    if (!caseSensitive) {
      res = res.toLowerCase();
    }
    // Remove extra spaces
    res = res.replace(/\s+/g, ' ');
    // Remove edge punctuation
    res = res.replace(/^[.,/#!$%^&*;:{}=\-_`~()]+|[.,/#!$%^&*;:{}=\-_`~()]+$/g, '');
    return res;
  }

  // Levenshtein distance for typo tolerance
  static levenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],    // Deletion
            dp[i][j - 1],    // Insertion
            dp[i - 1][j - 1] // Substitution
          );
        }
      }
    }
    return dp[m][n];
  }

  static check(userInput, targetWord, options = {}) {
    const {
      caseSensitive = false,
      acceptTypos = true,
      maxTypos = 1
    } = options;

    const inputNorm = this.normalize(userInput, caseSensitive);
    if (!inputNorm) return { correct: false, matched: false };

    // Target options (could have multiple meanings separated by comma or semicolon)
    const targets = targetWord.split(/[,;/]/).map(t => this.normalize(t, caseSensitive)).filter(Boolean);

    for (const target of targets) {
      if (inputNorm === target) {
        return { correct: true, exact: true, target };
      }
      if (acceptTypos && target.length >= 4) {
        const dist = this.levenshteinDistance(inputNorm, target);
        if (dist <= maxTypos) {
          return { correct: true, exact: false, typo: true, target };
        }
      }
    }

    return { correct: false, matched: false };
  }
}
