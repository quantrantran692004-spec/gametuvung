import { db } from './db.js';
import { profileManager } from './profile-manager.js';
import { vocabManager } from './vocab-manager.js';
import { statsManager } from './stats-manager.js';
import { uiManager } from './ui-manager.js';
import { GameEngine } from './game-engine.js';
import { t, setLanguage } from './i18n.js';
import { FileImporter } from './importer.js';
import { DocExporter } from './doc-exporter.js';
import { SpacedRepetition } from './spaced-repetition.js';

class App {
  constructor() {
    this.game = null;
  }

  async init() {
    try {
      // 1. Initialize IndexedDB
      await db.init();

      // 2. Initialize Profiles
      const currentProfile = await profileManager.init();

      // 3. Initialize Vocabulary
      await vocabManager.init();

      // 4. Register Service Worker for PWA
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('ServiceWorker registration error:', err);
        });
      }

      // 5. Setup Event Listeners
      this.setupNavigation();
      this.setupGameControls();
      this.setupVocabActions();
      this.setupSettingsActions();
      this.setupProfileActions();

      // 6. Init UI
      uiManager.updateProfileBadge();
      uiManager.showScreen('screen-main-menu');

    } catch (err) {
      console.error('Fatal initialization error:', err);
      alert('Không thể khởi chạy cơ sở dữ liệu cục bộ. Vui lòng thử lại!');
    }
  }

  setupNavigation() {
    // Menu buttons
    document.getElementById('btn-to-game')?.addEventListener('click', () => {
      this.startNewGame();
    });

    document.getElementById('btn-to-vocab')?.addEventListener('click', () => {
      uiManager.renderVocabList();
      uiManager.showScreen('screen-vocab');
    });

    document.getElementById('btn-to-stats')?.addEventListener('click', () => {
      uiManager.renderStats();
      uiManager.showScreen('screen-stats');
    });

    document.getElementById('btn-to-settings')?.addEventListener('click', () => {
      this.populateSettingsForm();
      uiManager.showScreen('screen-settings');
    });

    document.getElementById('nav-profile-btn')?.addEventListener('click', () => {
      uiManager.renderProfiles();
      uiManager.showScreen('screen-profiles');
    });

    // Back to Menu buttons
    document.querySelectorAll('.btn-back-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.game && this.game.isRunning) {
          this.game.endGame('aborted');
        }
        uiManager.showScreen('screen-main-menu');
      });
    });
  }

  startNewGame() {
    const profile = profileManager.getCurrentProfile();
    const settings = profile.settings || {};

    const canvas = document.getElementById('game-canvas');
    const input = document.getElementById('game-input');
    
    // Choose mode
    const modeSelect = document.getElementById('game-mode-select');
    const selectedMode = modeSelect ? modeSelect.value : 'survival';

    // Game Engine instance
    this.game = new GameEngine(canvas, {
      lives: settings.lives || 5,
      speed: settings.speed || 'normal',
      duration: settings.timerDuration || 60,
      wordDirection: settings.wordDirection || 'en-vi',
      voiceEnabled: settings.voiceEnabled !== false,
      caseSensitive: settings.caseSensitive || false,
      acceptTypos: settings.acceptTypos !== false,
      onHudUpdate: (hud) => {
        if (hud.score !== undefined) document.getElementById('hud-score').textContent = hud.score;
        if (hud.lives !== undefined) {
          const heartsContainer = document.getElementById('hud-lives-container');
          if (heartsContainer) {
            heartsContainer.innerHTML = Array.from({ length: settings.lives || 5 }).map((_, i) => 
              `<span class="heart-icon ${i >= hud.lives ? 'heart-lost' : ''}">♥</span>`
            ).join('');
          }
        }
        if (hud.combo !== undefined) {
          document.getElementById('hud-combo-val').textContent = hud.combo;
          const bar = document.getElementById('hud-combo-bar');
          if (bar) bar.style.width = Math.min(hud.combo * 10, 100) + '%';
        }
        if (hud.time !== undefined) {
          document.getElementById('hud-time-val').textContent = hud.time + 's';
        }
      },
      onGameOver: async (result) => {
        // Save session stats
        await statsManager.saveSession({
          profileId: profile.id,
          mode: selectedMode,
          score: result.score,
          wordsShot: result.wordsShot,
          accuracy: result.accuracy,
          highestCombo: result.highestCombo,
          duration: result.duration
        });

        // Show Game Over Overlay
        document.getElementById('res-score').textContent = result.score;
        document.getElementById('res-words').textContent = result.wordsShot;
        document.getElementById('res-accuracy').textContent = result.accuracy + '%';
        document.getElementById('res-combo').textContent = result.highestCombo;
        document.getElementById('game-overlay-result').classList.add('active');
      }
    });

    // Hide overlay
    document.getElementById('game-overlay-result').classList.remove('active');
    
    // Switch Screen
    uiManager.showScreen('screen-game');
    
    // Focus input
    setTimeout(() => {
      input.value = '';
      input.focus();
    }, 150);

    // Get vocab words based on mode
    let gameWords = [];
    if (selectedMode === 'srs') {
      const allWords = vocabManager.getAll();
      const dueWords = SpacedRepetition.getDueWords(allWords);
      gameWords = dueWords.length >= 5 ? dueWords : vocabManager.getGameWords(30);
    } else {
      gameWords = vocabManager.getGameWords(30);
    }

    this.game.start(gameWords, selectedMode);
  }

  setupGameControls() {
    const input = document.getElementById('game-input');
    const fireBtn = document.getElementById('game-fire-btn');

    const handleFire = () => {
      if (!this.game || !input) return;
      const text = input.value;
      if (text.trim()) {
        const hit = this.game.submitAnswer(text);
        if (hit) {
          input.value = '';
        } else {
          // Visual shake on input
          input.style.borderColor = 'var(--color-neon-pink)';
          setTimeout(() => input.style.borderColor = 'var(--color-neon-cyan)', 300);
        }
      }
    };

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFire();
      }
    });

    fireBtn?.addEventListener('click', handleFire);

    // Result buttons
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      document.getElementById('game-overlay-result').classList.remove('active');
      this.startNewGame();
    });

    document.getElementById('btn-result-menu')?.addEventListener('click', () => {
      document.getElementById('game-overlay-result').classList.remove('active');
      uiManager.showScreen('screen-main-menu');
    });
  }

  setupVocabActions() {
    // Add Word Modal
    const modal = document.getElementById('modal-add-word');
    document.getElementById('btn-open-add-word')?.addEventListener('click', () => {
      modal.classList.add('active');
    });

    document.getElementById('btn-cancel-add-word')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    document.getElementById('form-add-word')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const en = document.getElementById('input-word-en').value;
      const vi = document.getElementById('input-word-vi').value;
      const ipa = document.getElementById('input-word-ipa').value;
      const unit = document.getElementById('input-word-unit').value;

      if (en && vi) {
        await vocabManager.addWord({ english: en, vietnamese: vi, ipa, unit });
        uiManager.renderVocabList();
        uiManager.showToast('Đã thêm từ mới!', 'success');
        modal.classList.remove('active');
        e.target.reset();
      }
    });

    // Search filter
    document.getElementById('vocab-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value;
      uiManager.renderVocabList(q);
    });

    // File Import Button
    const fileInput = document.getElementById('file-import-input');
    document.getElementById('btn-open-import')?.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const ext = file.name.split('.').pop().toLowerCase();
        let parsed = [];

        if (ext === 'csv') {
          const text = await file.text();
          parsed = FileImporter.parseCSV(text);
        } else if (ext === 'txt') {
          const text = await file.text();
          parsed = FileImporter.parseTXT(text);
        } else if (ext === 'xlsx' || ext === 'xls') {
          const buffer = await file.arrayBuffer();
          parsed = FileImporter.parseExcel(buffer);
        } else {
          alert('Định dạng tệp không được hỗ trợ. Hãy chọn .txt, .csv, hoặc .xlsx!');
          return;
        }

        if (parsed.length > 0) {
          if (confirm(`Tìm thấy ${parsed.length} từ vựng từ tệp "${file.name}". Bạn có muốn nhập vào hệ thống?`)) {
            await vocabManager.addMultipleWords(parsed);
            uiManager.renderVocabList();
            uiManager.showToast(`Đã nhập thành công ${parsed.length} từ vựng!`, 'success');
          }
        } else {
          uiManager.showToast('Không trích xuất được từ nào từ tệp!', 'error');
        }
      } catch (err) {
        console.error('Import error:', err);
        uiManager.showToast('Lỗi khi đọc file: ' + err.message, 'error');
      } finally {
        fileInput.value = '';
      }
    });

    // Export Word .docx
    document.getElementById('btn-export-word')?.addEventListener('click', async () => {
      const words = vocabManager.getAll();
      if (words.length === 0) {
        uiManager.showToast('Không có từ vựng để xuất tài liệu!', 'error');
        return;
      }
      try {
        uiManager.showToast('Đang tạo tài liệu Word...', 'info');
        await DocExporter.exportWord(words);
        uiManager.showToast('Tạo tài liệu Word thành công!', 'success');
      } catch (err) {
        console.error('Export Word error:', err);
        uiManager.showToast('Lỗi khi tạo file Word: ' + err.message, 'error');
      }
    });

    // Export CSV
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      const words = vocabManager.getAll();
      DocExporter.exportCSV(words);
      uiManager.showToast('Đã xuất file CSV!', 'success');
    });

    // Export JSON Backup
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const words = vocabManager.getAll();
      DocExporter.exportJSON(words);
      uiManager.showToast('Đã tải bản sao lưu JSON!', 'success');
    });
  }

  populateSettingsForm() {
    const profile = profileManager.getCurrentProfile();
    const s = profile.settings || {};

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };

    setVal('setting-lang', s.language || 'vi');
    setVal('setting-perf', s.perfProfile || 'balanced');
    setVal('setting-direction', s.wordDirection || 'en-vi');
    setVal('setting-speed', s.speed || 'normal');
    setVal('setting-lives', s.lives || 5);
    setChecked('setting-voice', s.voiceEnabled !== false);
    setChecked('setting-sound', s.soundEnabled !== false);
  }

  setupSettingsActions() {
    document.getElementById('form-settings')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newSettings = {
        language: document.getElementById('setting-lang').value,
        perfProfile: document.getElementById('setting-perf').value,
        wordDirection: document.getElementById('setting-direction').value,
        speed: document.getElementById('setting-speed').value,
        lives: parseInt(document.getElementById('setting-lives').value, 10) || 5,
        voiceEnabled: document.getElementById('setting-voice').checked,
        soundEnabled: document.getElementById('setting-sound').checked
      };

      await profileManager.updateSettings(newSettings);
      setLanguage(newSettings.language);

      // Apply performance class to body
      document.body.className = `perf-${newSettings.perfProfile}`;

      uiManager.showToast('Đã lưu cài đặt!', 'success');
    });
  }

  setupProfileActions() {
    document.getElementById('btn-create-profile')?.addEventListener('click', async () => {
      const name = prompt('Nhập tên hồ sơ mới:');
      if (name && name.trim()) {
        const avatars = ['🤖', '⚡', '🛸', '🎯', '👾', '🌟'];
        const avatar = avatars[Math.floor(Math.random() * avatars.length)];
        await profileManager.createProfile(name, avatar);
        uiManager.renderProfiles();
        uiManager.updateProfileBadge();
        uiManager.showToast('Tạo hồ sơ thành công!', 'success');
      }
    });
  }
}

// Instantiate App
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
