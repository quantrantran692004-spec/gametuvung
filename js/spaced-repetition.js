// Spaced Repetition System (SRS) based on SM-2 algorithm
export class SpacedRepetition {
  /**
   * Cập nhật chỉ số nhớ từ sau mỗi câu trả lời
   * @param {Object} word - Bản ghi từ vựng
   * @param {Boolean} isCorrect - Đúng hay sai
   * @param {Number} responseTimeSec - Thời gian phản hồi
   */
  static reviewWord(word, isCorrect, responseTimeSec = 2) {
    const now = Date.now();
    let mastery = word.masteryLevel || 0;
    let repetitions = word.repetitions || 0;
    let intervalDays = word.intervalDays || 1;
    let easeFactor = word.easeFactor || 2.5;

    if (isCorrect) {
      repetitions++;
      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 3;
      } else {
        // Fast answer bonus
        if (responseTimeSec < 2) {
          easeFactor = Math.min(3.0, easeFactor + 0.15);
        }
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      mastery = Math.min(5, mastery + 1);
    } else {
      repetitions = 0;
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      mastery = Math.max(0, mastery - 1);
    }

    const nextReviewDate = new Date(now + intervalDays * 24 * 60 * 60 * 1000).toISOString();

    return {
      ...word,
      masteryLevel: mastery,
      repetitions,
      intervalDays,
      easeFactor,
      lastReviewedAt: new Date(now).toISOString(),
      nextReviewDate,
      needsReview: !isCorrect || mastery < 2
    };
  }

  /**
   * Lọc các từ cần ôn tập hôm nay
   */
  static getDueWords(vocabList) {
    const now = new Date().toISOString();
    return vocabList.filter(w => {
      if (!w.nextReviewDate) return true; // Chưa học lần nào
      return w.nextReviewDate <= now || w.needsReview;
    });
  }
}
