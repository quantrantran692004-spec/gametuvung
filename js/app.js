import { db } from './db.js?v=17';
import { profileManager } from './profile-manager.js?v=17';
import { vocabManager } from './vocab-manager.js?v=17';
import { statsManager } from './stats-manager.js?v=17';
import { uiManager } from './ui-manager.js?v=17';
import { GameEngine } from './game-engine.js?v=17';
import { t, setLanguage } from './i18n.js?v=17';
import { FileImporter } from './importer.js?v=17';
import { DocExporter } from './doc-exporter.js?v=17';
import { SpacedRepetition } from './spaced-repetition.js?v=17';
import { getPracticeSentences } from './sentence-manager.js?v=17';
import { audioManager } from './audio-manager.js?v=17';

class App {
  constructor() {
    this.game = null;
    this.pendingGame = null;
  }

  async init() {
    try {
      // 1. Initialize IndexedDB
      await db.init();

      // 2. Initialize Profiles
      const currentProfile = await profileManager.init();
      audioManager.soundEnabled = currentProfile.settings?.soundEnabled === true;
      audioManager.voiceEnabled = currentProfile.settings?.voiceEnabled === true;

      // 3. Initialize Vocabulary
      await vocabManager.init();

      // 4. Register Service Worker for PWA
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
          registration.update().catch(() => {});
          if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            const refreshKey = 'ws-sw-refreshed-v12';
            if (!sessionStorage.getItem(refreshKey)) {
              sessionStorage.setItem(refreshKey, '1');
              window.location.reload();
            }
          });
        } catch (err) {
          console.log('ServiceWorker registration error:', err);
        }
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
      if (db.usingFallback) {
        uiManager.showToast('Thiết bị đang chặn IndexedDB; game vẫn chơi được nhưng dữ liệu chỉ giữ trong phiên này.', 'info');
      }

    } catch (err) {
      console.error('Fatal initialization error:', err);
      alert('Không thể khởi chạy cơ sở dữ liệu cục bộ. Vui lòng thử lại!');
    }
  }

  setupNavigation() {
    // Menu buttons
    const modeSelect = document.getElementById('game-mode-select');
    const modeHelp = document.getElementById('mode-help');
    const modeDescriptions = {
      survival: 'Bắn từ: nhìn nghĩa tiếng Việt, gõ từ tiếng Anh; sai bị trừ điểm và mất combo.',
      practice: 'Luyện tập tự do: tốc độ nhẹ, tập trung vào việc nhớ từ và phản xạ.',
      timed: 'Tính giờ: ghi điểm nhiều nhất trong thời gian đã chọn ở Cài đặt.',
      unit: 'Theo Unit: chơi các từ thuộc bài học/Unit đã chọn trong kho từ.',
      missed: 'Ôn từ sai: ưu tiên những từ bạn đã trả lời sai hoặc thường quên.',
      favorites: 'Từ yêu thích: chỉ chơi các từ bạn đã đánh dấu yêu thích.',
      srs: 'Ôn thông minh: ưu tiên các từ đã đến lịch ôn lặp lại ngắt quãng.',
      two_players: 'Hai người: luân phiên trên cùng thiết bị; mỗi người có lượt riêng.',
      high_score: 'Điểm cao: tốc độ tăng dần, thử phá kỷ lục của chính bạn.',
      dictation: 'Nghe chép chính tả: nghe câu tiếng Anh, gõ đủ cả câu để tự động bắn.'
    };
    const updateModeHelp = () => {
      if (modeHelp && modeSelect) modeHelp.textContent = modeDescriptions[modeSelect.value] || modeDescriptions.survival;
    };
    modeSelect?.addEventListener('change', updateModeHelp);
    updateModeHelp();

    document.getElementById('btn-to-game')?.addEventListener('click', () => {
      this.prepareGame();
    });

    document.getElementById('btn-begin-round')?.addEventListener('click', () => {
      this.startNewGame();
    });

    document.getElementById('btn-ready-back')?.addEventListener('click', () => {
      this.pendingGame = null;
      uiManager.showScreen('screen-main-menu');
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
    if (this.game) {
      this.game.destroy?.();
      this.game = null;
    }

    const profile = profileManager.getCurrentProfile();
    const settings = profile.settings || {};

    const canvas = document.getElementById('game-canvas');
    const input = document.getElementById('game-input');
    
    // Choose mode
    const modeSelect = document.getElementById('game-mode-select');
    const pendingGame = this.pendingGame;
    const selectedMode = pendingGame?.mode || (modeSelect ? modeSelect.value : 'survival');
    const allWords = vocabManager.getAll();

    if (selectedMode !== 'dictation' && allWords.length === 0) {
      uiManager.showToast('Chưa có từ vựng. Hãy thêm ít nhất một từ trước khi chơi.', 'error');
      uiManager.showScreen('screen-vocab');
      return;
    }

    // Game Engine instance
    this.game = new GameEngine(canvas, {
      lives: settings.lives || 5,
      speed: settings.speed || 'normal',
      duration: settings.timerDuration || 60,
      wordDirection: settings.wordDirection || 'en-vi',
      voiceEnabled: settings.voiceEnabled === true,
      autoSpeak: settings.voiceEnabled === true,
      missPenalty: 25,
      caseSensitive: settings.caseSensitive || false,
      acceptTypos: settings.acceptTypos !== false,
      onHudUpdate: (hud) => {
        if (hud.score !== undefined) document.getElementById('hud-score').textContent = hud.score;
        if (hud.lives !== undefined) {
          const heartsContainer = document.getElementById('hud-lives-container');
          if (heartsContainer) {
            const maxLives = settings.lives || 5;
            heartsContainer.innerHTML = Array.from({ length: maxLives }).map((_, i) => 
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
        if (hud.weapon !== undefined) {
          const weapon = document.getElementById('hud-weapon-val');
          if (weapon) weapon.textContent = hud.weapon;
        }
      },
      onAnswerFeedback: ({ correct, penalty, autoMiss, upgraded, weapon }) => {
        const arena = document.querySelector('.game-container');
        arena?.classList.remove('feedback-correct', 'feedback-wrong');
        void arena?.offsetWidth;
        arena?.classList.add(correct ? 'feedback-correct' : 'feedback-wrong');
        if (correct) {
          uiManager.showToast(upgraded ? `NÂNG CẤP! Vũ khí: ${weapon}` : 'ĐÚNG! Mục tiêu đã bị bắn.', 'success');
        } else {
          uiManager.showToast(autoMiss
            ? 'SAI! Mục tiêu đã biến mất, hãy chuyển sang mục tiêu tiếp theo.'
            : `Sai đáp án: -${penalty} điểm, combo đã reset.`, 'error');
        }
      },
      onGameOver: async (result) => {
        // Save session stats
        await statsManager.saveSession({
          profileId: profile.id,
          mode: selectedMode,
          score: result.score,
          wordsShot: result.wordsShot,
          missedWords: result.missedWords,
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
    
    // Resize canvas to match screen after display block
    setTimeout(() => {
      this.game.resizeCanvas();
    }, 50);

    // Focus input
    setTimeout(() => {
      input.value = '';
      input.focus();
    }, 150);

    // Get vocab words based on mode (Section 5)
    let gameWords = pendingGame?.words || [];

    if (gameWords.length === 0 && selectedMode === 'srs') {
      const dueWords = SpacedRepetition.getDueWords(allWords);
      gameWords = dueWords.length >= 5 ? dueWords : vocabManager.getGameWords(30);
    } else if (gameWords.length === 0 && selectedMode === 'favorites') {
      const favs = allWords.filter(w => w.isFavorite);
      gameWords = favs.length > 0 ? favs : vocabManager.getGameWords(30);
    } else if (gameWords.length === 0 && selectedMode === 'missed') {
      const missed = allWords.filter(w => w.needsReview || (w.incorrectCount && w.incorrectCount > 0));
      gameWords = missed.length > 0 ? missed : vocabManager.getGameWords(30);
    } else if (gameWords.length === 0 && selectedMode === 'dictation') {
      gameWords = getPracticeSentences(10);
    } else if (gameWords.length === 0 && selectedMode !== 'dictation') {
      gameWords = vocabManager.getGameWords(30);
    }

    this.pendingGame = null;

    // Pass custom effects config to engine
    this.game.effectsConfig = {
      neon: settings.effectNeon !== false,
      laser: settings.effectLaser !== false,
      particles: settings.effectParticles !== false,
      shake: settings.effectShake !== false
    };

    this.game.start(gameWords, selectedMode);
  }

  prepareGame() {
    const profile = profileManager.getCurrentProfile();
    const modeSelect = document.getElementById('game-mode-select');
    const mode = modeSelect ? modeSelect.value : 'survival';
    const allWords = vocabManager.getAll();

    if (mode !== 'dictation' && allWords.length === 0) {
      uiManager.showToast('Chưa có từ vựng để tạo đề.', 'error');
      uiManager.showScreen('screen-vocab');
      return;
    }

    const dictation = mode === 'dictation';
    const words = dictation ? getPracticeSentences(10) : vocabManager.getGameWords(30);
    const item = words[0];
    const direction = profile.settings?.wordDirection || 'en-vi';
    const prompt = dictation
      ? 'NGHE CÂU TIẾNG ANH RỒI GÕ LẠI'
      : (direction === 'en-vi' ? item.vietnamese : item.english);
    const answer = dictation ? item.english : (direction === 'en-vi' ? item.english : item.vietnamese);
    const mask = dictation
      ? '•'.repeat(Math.min(answer.length, 42))
      : (answer.length > 1 ? `${answer[0]}${'.'.repeat(answer.length - 1)}` : answer);

    this.pendingGame = { mode, words };
    const modeTitles = {
      dictation: 'NGHE CÂU & CHÉP CHÍNH TẢ',
      survival: 'BẮN TỪ VỰNG · SINH TỒN',
      practice: 'BẮN TỪ VỰNG · LUYỆN TẬP',
      timed: 'BẮN TỪ VỰNG · TÍNH GIỜ'
    };
    document.querySelector('#screen-ready .ready-card > h2').textContent = modeTitles[mode] || 'SẴN SÀNG VÀO CHƠI';
    document.getElementById('ready-prompt').textContent = prompt;
    document.getElementById('ready-mask').textContent = mask;
    uiManager.showScreen('screen-ready');
  }

  setupGameControls() {
    const input = document.getElementById('game-input');
    const fireBtn = document.getElementById('game-fire-btn');
    const speakBtn = document.getElementById('game-speak-btn');

    speakBtn?.addEventListener('click', () => {
      this.game?.speakActiveTarget();
    });

    // Realtime typing check (Parroto Chép Chính Tả Style)
    input?.addEventListener('input', () => {
      if (!this.game) return;
      const text = input.value;
      const hit = this.game.updateTypingProgress(text);
      if (hit) {
        input.value = ''; // Auto clear when word is shot!
      }
    });

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
          input.value = '';
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

    // Global keyboard listener for PC (gõ trực tiếp bất cứ lúc nào trên máy tính)
    window.addEventListener('keydown', (e) => {
      // Chỉ kích hoạt khi đang ở màn hình game và không mở modal
      if (uiManager.currentScreen !== 'screen-game' || !this.game || !this.game.isRunning) return;
      if (e.target && e.target.tagName === 'INPUT') return; // Đã có input listener xử lý

      // Bắt phím chữ cái a-z, space, backspace
      if (/^[a-zA-Z0-9]$/.test(e.key) || e.key === ' ' || e.key === 'Backspace') {
        if (!input) return;
        if (e.key === 'Backspace') {
          input.value = input.value.slice(0, -1);
        } else {
          input.value += e.key;
        }
        const hit = this.game.updateTypingProgress(input.value);
        if (hit) input.value = '';
      }
    });

    // Virtual Keyboard buttons (Dành cho điện thoại / máy tính bảng cảm ứng)
    document.querySelectorAll('.vk-key').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!this.game || !this.game.isRunning || !input) return;

        const key = btn.getAttribute('data-key');
        if (key === 'backspace') {
          input.value = input.value.slice(0, -1);
        } else if (key === 'space') {
          input.value += ' ';
        } else if (key) {
          input.value += key;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        const hit = this.game.updateTypingProgress(input.value);
        if (hit) input.value = '';
      });
    });

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
    setVal('setting-timer', s.timerDuration || 60);
    setVal('setting-strictness', s.strictness || 'lenient');
    setChecked('effect-neon', s.effectNeon !== false);
    setChecked('effect-laser', s.effectLaser !== false);
    setChecked('effect-particles', s.effectParticles !== false);
    setChecked('effect-shake', s.effectShake !== false);
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
        timerDuration: parseInt(document.getElementById('setting-timer').value, 10) || 60,
        strictness: document.getElementById('setting-strictness').value,
        effectNeon: document.getElementById('effect-neon').checked,
        effectLaser: document.getElementById('effect-laser').checked,
        effectParticles: document.getElementById('effect-particles').checked,
        effectShake: document.getElementById('effect-shake').checked,
        voiceEnabled: document.getElementById('setting-voice').checked,
        soundEnabled: document.getElementById('setting-sound').checked
      };

      await profileManager.updateSettings(newSettings);
      audioManager.soundEnabled = newSettings.soundEnabled;
      audioManager.voiceEnabled = newSettings.voiceEnabled;
      setLanguage(newSettings.language);

      // Apply performance class to body
      document.body.className = `perf-${newSettings.perfProfile}`;

      uiManager.showToast('Đã lưu cài đặt chi tiết!', 'success');
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
