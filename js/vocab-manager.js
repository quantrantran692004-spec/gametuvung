import { db } from './db.js';

export const SAMPLE_VOCAB = [
  { english: 'laser', vietnamese: 'tia la-de', ipa: '/ˈleɪ.zər/', unit: 'Tech', masteryLevel: 1 },
  { english: 'cyber', vietnamese: 'không gian mạng', ipa: '/ˈsaɪ.bər/', unit: 'Tech', masteryLevel: 0 },
  { english: 'matrix', vietnamese: 'ma trận', ipa: '/ˈmeɪ.trɪks/', unit: 'Tech', masteryLevel: 2 },
  { english: 'neon', vietnamese: 'đèn neon', ipa: '/ˈniː.ɒn/', unit: 'Tech', masteryLevel: 1 },
  { english: 'glitch', vietnamese: 'sự cố kỹ thuật', ipa: '/ɡlɪtʃ/', unit: 'Tech', masteryLevel: 0 },
  { english: 'speed', vietnamese: 'tốc độ', ipa: '/spiːd/', unit: 'General', masteryLevel: 3 },
  { english: 'future', vietnamese: 'tương lai', ipa: '/ˈfjuː.tʃər/', unit: 'General', masteryLevel: 2 },
  { english: 'target', vietnamese: 'mục tiêu', ipa: '/ˈtɑː.ɡɪt/', unit: 'Action', masteryLevel: 1 },
  { english: 'strike', vietnamese: 'tấn công', ipa: '/straɪk/', unit: 'Action', masteryLevel: 2 },
  { english: 'shield', vietnamese: 'lá chắn', ipa: '/ʃiːld/', unit: 'Action', masteryLevel: 0 },
  { english: 'energy', vietnamese: 'năng lượng', ipa: '/ˈen.ə.dʒi/', unit: 'Science', masteryLevel: 1 },
  { english: 'galaxy', vietnamese: 'thiên hà', ipa: '/ˈɡæl.ək.si/', unit: 'Science', masteryLevel: 1 },
  { english: 'orbit', vietnamese: 'quỹ đạo', ipa: '/ˈɔː.bɪt/', unit: 'Science', masteryLevel: 0 },
  { english: 'system', vietnamese: 'hệ thống', ipa: '/ˈsɪs.təm/', unit: 'Tech', masteryLevel: 2 },
  { english: 'hacker', vietnamese: 'tin tặc', ipa: '/ˈhæk.ər/', unit: 'Tech', masteryLevel: 3 }
];

export class VocabManager {
  constructor() {
    this.words = [];
  }

  async init() {
    this.words = await db.getAll('vocabulary');
    if (this.words.length === 0) {
      // Seed initial sample vocabulary
      for (const item of SAMPLE_VOCAB) {
        const word = {
          id: 'w_' + Math.random().toString(36).substring(2, 9),
          english: item.english,
          vietnamese: item.vietnamese,
          ipa: item.ipa,
          unit: item.unit || 'Default',
          masteryLevel: item.masteryLevel || 0,
          isFavorite: false,
          needsReview: false,
          addedAt: new Date().toISOString()
        };
        await db.put('vocabulary', word);
        this.words.push(word);
      }
    }
    return this.words;
  }

  getAll() {
    return this.words;
  }

  async addWord(wordData) {
    const newWord = {
      id: 'w_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      english: wordData.english.trim().toLowerCase(),
      vietnamese: wordData.vietnamese.trim(),
      ipa: wordData.ipa ? wordData.ipa.trim() : '',
      unit: wordData.unit ? wordData.unit.trim() : 'General',
      example: wordData.example || '',
      masteryLevel: 0,
      isFavorite: false,
      needsReview: false,
      addedAt: new Date().toISOString()
    };
    await db.put('vocabulary', newWord);
    this.words.push(newWord);
    return newWord;
  }

  async updateWord(id, updates) {
    const idx = this.words.findIndex(w => w.id === id);
    if (idx !== -1) {
      this.words[idx] = { ...this.words[idx], ...updates };
      await db.put('vocabulary', this.words[idx]);
      return this.words[idx];
    }
    return null;
  }

  async deleteWord(id) {
    const word = this.words.find(w => w.id === id);
    if (word) {
      // Soft delete: move to trash
      await db.put('trash', { ...word, deletedAt: new Date().toISOString(), originalStore: 'vocabulary' });
      await db.delete('vocabulary', id);
      this.words = this.words.filter(w => w.id !== id);
      return true;
    }
    return false;
  }

  getGameWords(count = 10, mode = 'all') {
    let pool = [...this.words];
    if (mode === 'favorites') {
      pool = pool.filter(w => w.isFavorite);
    } else if (mode === 'review') {
      pool = pool.filter(w => w.needsReview || w.masteryLevel < 2);
    }
    if (pool.length === 0) pool = [...this.words]; // Fallback
    
    // Shuffle
    pool.sort(() => Math.random() - 0.5);
    return pool.slice(0, count);
  }
}

export const vocabManager = new VocabManager();
