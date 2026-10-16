export const SAMPLE_SENTENCES = [
  {
    id: 's_apple',
    english: 'I eat an apple every morning.',
    vietnamese: 'Tôi ăn một quả táo mỗi buổi sáng.',
    ipa: '',
    unit: 'Basic',
    difficulty: 1
  },
  {
    id: 's_school',
    english: 'The students go to school by bus.',
    vietnamese: 'Các học sinh đi đến trường bằng xe buýt.',
    ipa: '',
    unit: 'Basic',
    difficulty: 1
  },
  {
    id: 's_learning',
    english: 'Practice makes progress every day.',
    vietnamese: 'Luyện tập tạo ra tiến bộ mỗi ngày.',
    ipa: '',
    unit: 'Learning',
    difficulty: 1
  },
  {
    id: 's_computer',
    english: 'My computer is on the small table.',
    vietnamese: 'Máy tính của tôi ở trên chiếc bàn nhỏ.',
    ipa: '',
    unit: 'Technology',
    difficulty: 1
  },
  {
    id: 's_challenge',
    english: 'Every challenge is a chance to learn.',
    vietnamese: 'Mỗi thử thách là một cơ hội để học hỏi.',
    ipa: '',
    unit: 'Learning',
    difficulty: 2
  }
];

export function getPracticeSentences(count = 10) {
  return [...SAMPLE_SENTENCES]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
