import { parseBulkWords } from './bulk-words.js';
import { db } from './db.js?v=31';
import { profileManager } from './profile-manager.js?v=31';
import { vocabManager } from './vocab-manager.js?v=31';
import { statsManager } from './stats-manager.js?v=31';
import { uiManager } from './ui-manager.js?v=31';
import { GameEngine } from './game-engine.js?v=31';
import { FileImporter } from './importer.js?v=31';
import { SpacedRepetition } from './spaced-repetition.js?v=31';
import { audioManager } from './audio-manager.js?v=32';

class App {
  constructor() { this.game = null; this.mode = 'survival'; this.pool = 'all'; this.startedAt = 0; this.currentRoute = 'home'; this.routeStack = []; }

  async init() {
    try {
      await db.init();
      const profile = await profileManager.init();
      await vocabManager.init();
      this.applyAudioSettings(profile.settings || {});
      this.bindEvents();
      await this.navigate('home');
      if (db.usingFallback) uiManager.showToast('Lưu trữ tạm thời không giữ dữ liệu sau khi đóng trang.', 'info');
    } catch (error) {
      console.error('Khởi chạy thất bại:', error);
      uiManager.showToast('Không mở được dữ liệu trên thiết bị. Tải lại trang để thử lại.', 'error');
    }
  }

  applyAudioSettings(settings) {
    audioManager.soundEnabled = settings.soundEnabled !== false;
    audioManager.musicEnabled = settings.musicEnabled === true;
    if (!audioManager.musicEnabled) audioManager.stopMusic();
    audioManager.voiceEnabled = settings.voiceEnabled === true;
    audioManager.setVoice(settings.voiceName || '', settings.voiceRate ?? 0.72);
  }

  bindEvents() {
    document.addEventListener('click', event => this.handleClick(event));
    document.addEventListener('submit', event => this.handleSubmit(event));
    document.addEventListener('input', event => this.handleInput(event));
    document.addEventListener('compositionend', event => { if (event.target.id === 'game-input') { const input = event.target; window.setTimeout(() => { if (input.isConnected && input.value) this.handleInput({ target: input, isComposing: false }); }, 0); } });
    document.addEventListener('change', event => this.handleChange(event));
    window.speechSynthesis?.addEventListener('voiceschanged', () => this.populateVoices());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.game?.isRunning) this.pauseGame();
      if (event.key === 'Tab' && this.game?.isRunning && !this.game.isPaused) {
        event.preventDefault(); this.showHint();
      }
    });
  }

  async snapshot() {
    const profile = profileManager.getCurrentProfile();
    const words = vocabManager.getAll();
    const stats = await statsManager.getProfileStats(profile.id);
    const todayWords = stats.todayWords || 0;
    const masteryCounts = Array.from({ length: 6 }, (_, level) => words.filter(word => Math.min(5, Number(word.masteryLevel) || 0) === level).length);
    const visibleWords = words.filter(word => {
      const query = uiManager.libraryQuery.trim().toLowerCase();
      const matchesQuery = !query || [word.english, word.vietnamese, word.unit].some(value => String(value || '').toLowerCase().includes(query));
      const matchesFilter = uiManager.libraryFilter === 'all' || (uiManager.libraryFilter === 'favorites' ? word.isFavorite : word.needsReview || SpacedRepetition.getDueWords([word]).length > 0);
      return matchesQuery && matchesFilter;
    });
    return { profile, profiles: profileManager.profiles, settings: profile.settings || {}, words, visibleWords, stats, dueWords: SpacedRepetition.getDueWords(words), todayWords, masteryCounts };
  }

  async navigate(route, remember = true) {
    if (remember && route !== this.currentRoute) this.routeStack.push(this.currentRoute);
    this.currentRoute = route;
    const state = await this.snapshot();
    uiManager.showRoute(route, state);
    if (route === 'settings') this.populateVoices();
    if (route === 'vocabulary') document.querySelector('#library-search')?.focus({ preventScroll: true });
  }

  populateVoices() {
    const select = document.getElementById('voice-select');
    if (!select) return;
    const selected = select.value || profileManager.getCurrentProfile()?.settings?.voiceName || '';
    select.replaceChildren(new Option('Giọng mặc định của thiết bị', ''));
    for (const voice of audioManager.getEnglishVoices()) select.add(new Option(`${voice.name} (${voice.lang})`, voice.name));
    if (selected && !Array.from(select.options).some(option => option.value === selected)) select.add(new Option(`${selected} (không có trên thiết bị này)`, selected));
    select.value = selected;
  }

  async handleClick(event) {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) { event.preventDefault(); await this.navigate(routeButton.dataset.route); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'go-back') { await this.navigate(this.routeStack.pop() || 'home', false); return; }
    if (action === 'toggle-menu') {
      document.body.classList.toggle('menu-open');
      button.setAttribute('aria-expanded', document.body.classList.contains('menu-open'));
    } else if (action === 'select-mode') {
      this.mode = button.dataset.mode;
      this.pool = button.dataset.pool || 'all';
      uiManager.selectedMode = this.mode;
      uiManager.pool = this.pool;
      const lessonChoice = document.getElementById('lesson-choice'); if (lessonChoice) lessonChoice.hidden = this.pool !== 'lesson';
      document.querySelectorAll('[data-action="select-mode"]').forEach(node => {
        const active = node.dataset.mode === this.mode && (node.dataset.pool || 'all') === this.pool;
        node.classList.toggle('is-selected', active);
        node.setAttribute('aria-pressed', String(active));
      });
    } else if (action === 'start-game') this.startGame();
    else if (action === 'play-all-lesson') this.startGame(true);
    else if (action === 'pause-game') this.pauseGame();
    else if (action === 'resume-game') { this.game?.resume(); audioManager.startMusic(); document.getElementById('game-overlay').hidden = true; document.getElementById('game-input')?.focus({ preventScroll: true }); }
    else if (action === 'quit-game') this.finishEarly();
    else if (action === 'exit-game') { this.destroyGame(); await this.navigate('home'); }
    else if (action === 'replay-game') { this.destroyGame(); this.startGame(this.playAllLesson); }
    else if (action === 'virtual-key') this.pressVirtualKey(button.dataset.key);
    else if (action === 'game-hint') this.showHint();
    else if (action === 'replay-word') { const target = this.game?.activeWords?.find(item => item.id === this.game.selectedTargetId) || this.game?.activeWords?.find(item => !item.isHit); if (target) audioManager.speak(target.target, 'en-US'); }
    else if (action === 'go-vocabulary') await this.navigate('vocabulary');
    else if (action === 'add-word') this.openWordDialog();
    else if (action === 'open-bulk-words') { document.getElementById('word-dialog')?.close(); document.getElementById('bulk-word-dialog')?.showModal(); document.querySelector('#bulk-word-form textarea')?.focus(); }
    else if (action === 'close-dialog') button.closest('dialog')?.close();
    else if (action === 'import-words') document.getElementById('file-import-input')?.click();
    else if (action === 'export-words') this.exportWords();
    else if (action === 'toggle-favorite') await this.toggleFavorite(button.dataset.wordId);
    else if (action === 'delete-word') await this.deleteWord(button.dataset.wordId);
    else if (action === 'open-profiles') document.getElementById('profile-dialog')?.showModal();
    else if (action === 'switch-profile') await this.switchProfile(button.dataset.profileId);
    else if (action === 'set-avatar') { if (await profileManager.setAvatar(button.dataset.avatar)) { await this.navigate('home', false); uiManager.updateProfile(profileManager.getCurrentProfile(), profileManager.profiles); } }
    else if (action === 'test-voice') { const form = document.getElementById('settings-form'); const enabled = audioManager.voiceEnabled; const name = audioManager.voiceName; const rate = audioManager.voiceRate; if (form) audioManager.setVoice(form.elements.voiceName.value, form.elements.voiceRate.value); audioManager.voiceEnabled = true; audioManager.speak('Ready. Type the word before it falls.', 'en-US'); audioManager.voiceEnabled = enabled; audioManager.setVoice(name, rate); }
  }

  async handleSubmit(event) {
    const form = event.target;
    if (form.id === 'game-answer-form') {
      event.preventDefault();
      const input = document.getElementById('game-input');
      const submitted = input?.value.trim();
      if (submitted && this.game?.isRunning) {
        const hit = this.game.submitAnswer(submitted);
        if (!hit) uiManager.setGameFeedback('Chưa đúng — thử lại trước khi từ chạm vạch.', 'wrong');
        if (input) input.value = '';
      }
    } else if (form.id === 'word-form') {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      await vocabManager.addWord(values); form.reset(); form.closest('dialog').close();
      uiManager.showToast(`Đã thêm “${values.english}” vào kho từ.`, 'success'); await this.navigate('vocabulary');
    } else if (form.id === 'bulk-word-form') {
      event.preventDefault();
      const { words, invalidLines } = parseBulkWords(form.elements.words.value);
      const error = document.getElementById('bulk-word-error');
      if (invalidLines.length || !words.length) { error.textContent = invalidLines.length ? `Kiểm tra dòng ${invalidLines.join(', ')}: mỗi dòng cần có từ và nghĩa.` : 'Hãy nhập ít nhất một từ và nghĩa.'; error.hidden = false; return; }
      error.hidden = true;
      const unit = form.elements.unit.value.trim();
      const added = await vocabManager.addMultipleWords(words.map(word => ({ ...word, unit })));
      form.reset(); form.closest('dialog').close();
      uiManager.showToast(`Đã thêm ${added.length} từ vào kho.`, 'success'); await this.navigate('vocabulary');
    } else if (form.id === 'profile-form') {
      event.preventDefault(); const values = new FormData(form);
      await profileManager.createProfile(values.get('name')); form.reset(); form.closest('dialog').close();
      this.applyAudioSettings(profileManager.getCurrentProfile().settings || {}); await this.navigate('home');
    } else if (form.id === 'settings-form') {
      event.preventDefault(); const values = new FormData(form);
      const settings = Object.fromEntries(values.entries());
      ['acceptTypos', 'voiceEnabled', 'soundEnabled', 'musicEnabled', 'reducedEffects'].forEach(key => settings[key] = form.elements[key].checked);
      ['lives', 'timerDuration', 'sessionSize'].forEach(key => settings[key] = Number(settings[key]));
      settings.voiceRate = Number(settings.voiceRate);
      settings.fallSeconds = Math.max(5, Math.min(60, Number(settings.fallSeconds) || 14));
      await profileManager.updateSettings(settings); this.applyAudioSettings(profileManager.getCurrentProfile().settings);
      uiManager.showToast('Đã lưu cài đặt cho hồ sơ này.', 'success'); await this.navigate('settings');
    }
  }

  handleInput(event) {
    if (event.target.id === 'game-input' && this.game?.isRunning && !this.game.isPaused) {
      if (event.isComposing || event.inputType === 'insertCompositionText') return;
      if (this.game.updateTypingProgress(event.target.value)) event.target.value = '';
    } else if (event.target.id === 'library-search') {
      uiManager.libraryQuery = event.target.value;
      this.snapshot().then(state => uiManager.renderWordResults(state.visibleWords));
    }
  }

  handleChange(event) {
    if (event.target.id === 'difficulty-preset') {
      const presets = { new: { sessionSize: 5, fallSeconds: 26, lives: 8 }, normal: { sessionSize: 10, fallSeconds: 14, lives: 5 }, fast: { sessionSize: 20, fallSeconds: 9, lives: 3 } };
      const values = presets[event.target.value];
      const form = document.getElementById('settings-form');
      if (values && form) Object.entries(values).forEach(([key, value]) => { form.elements[key].value = value; });
    }
    if (event.target.id === 'home-pool-select') this.pool = event.target.value;
    if (event.target.id === 'library-filter') {
      uiManager.libraryFilter = event.target.value;
      this.snapshot().then(state => uiManager.renderWordResults(state.visibleWords));
    }
    if (event.target.id === 'file-import-input') this.importFile(event.target.files?.[0]);
  }

  async startGame(playAllLesson = false) {
    this.playAllLesson = playAllLesson;
    const settings = profileManager.getCurrentProfile().settings || {};
    const lessonUnit = document.getElementById('lesson-unit')?.value || '';
    let words = this.pool === 'lesson'
      ? vocabManager.getGameWords(playAllLesson ? Infinity : Number(settings.sessionSize) || 10, `unit:${lessonUnit}`)
      : vocabManager.getGameWords(Number(settings.sessionSize) || 10, this.pool);
    if (this.mode === 'survival' || this.mode === 'practice' || this.mode === 'timed') {
      if (!words.length) { uiManager.showToast(this.pool === 'review' ? 'Không có từ cần ôn trong kho.' : this.pool === 'lesson' ? 'Bài học này chưa có từ.' : 'Thêm ít nhất một từ để bắt đầu.', 'error'); await this.navigate('vocabulary'); return; }
    }
    this.destroyGame();
    const configuredLives = Number(settings.lives) || 5;
    await uiManager.startGame(profileManager.getCurrentProfile(), { remaining: words.length, progress: 0, progressLabel: `${words.length} từ trong lượt`, timeLabel: this.mode === 'timed' ? `${settings.timerDuration || 60}s` : '', score: 0, combo: 0, lives: configuredLives, maxLives: this.mode === 'survival' ? configuredLives : undefined }, { poolLabel: this.pool === 'lesson' ? lessonUnit : this.pool === 'all' ? 'Kho từ' : this.pool === 'review' ? 'Từ cần ôn' : 'Từ yêu thích', mode: this.mode, modeLabel: { survival: 'Sinh tồn', timed: `${Number(settings.timerDuration) || 60} giây`, practice: 'Luyện tập' }[this.mode] || 'Sinh tồn', reducedEffects: settings.reducedEffects === true });
    const keyboard = document.querySelector('.virtual-keyboard');
    if (keyboard) keyboard.dataset.size = settings.keyboardSize || 'normal';
    const canvas = document.getElementById('game-canvas');
    const gameInput = document.getElementById('game-input');
    if (gameInput) gameInput.readOnly = window.matchMedia('(pointer: coarse)').matches;
    this.startedAt = Date.now();
    this.game = new GameEngine(canvas, {
      lives: Number(settings.lives) || 5, speed: settings.speed || 'normal', fallSeconds: (Number(settings.fallSeconds) || ({ slow: 18, normal: 14, fast: 9 }[settings.speed] || 14)) * (this.mode === 'practice' && this.pool === 'all' ? 1.5 : 1), duration: Number(settings.timerDuration) || 60,
      wordDirection: 'en-vi', autoSpeak: settings.voiceEnabled === true, voiceEnabled: settings.voiceEnabled === true,
      acceptTypos: settings.acceptTypos !== false, caseSensitive: false, missPenalty: 15,
      reducedEffects: settings.reducedEffects === true,
      pool: this.pool,
      onHudUpdate: hud => this.updateHud(hud, words.length),
      onAnswerFeedback: feedback => {
        if (feedback.correct) {
          const input = document.getElementById('game-input'); if (input) input.value = '';
          uiManager.setGameFeedback(feedback.wave ? `Đợt ${feedback.wave} — từ rơi nhanh hơn!` : feedback.checkpoint ? `Đã qua ${feedback.checkpoint} từ!` : '', feedback.wave || feedback.checkpoint ? 'good' : '');
        } else {
          if (feedback.autoMiss) { const input = document.getElementById('game-input'); if (input) input.value = ''; }
          uiManager.setGameFeedback('Từ đã chạm vạch — giữ nhịp nhé.', 'wrong');
        }
      },
      onGameOver: async result => {
        audioManager.stopMusic();
        await statsManager.saveSession({ profileId: profileManager.getCurrentProfile().id, mode: this.mode, score: result.score, wordsShot: result.wordsShot, missedWords: result.missedWords, accuracy: result.accuracy, highestCombo: result.highestCombo, duration: result.duration });
        uiManager.showResults(result);
      }
    });
    this.game.start(words, this.mode);
    audioManager.startMusic();
    window.setTimeout(() => document.getElementById('game-input')?.focus({ preventScroll: true }), 60);
  }

  updateHud(hud, total) {
    const state = {};
    if (hud.score !== undefined) state.score = hud.score;
    if (hud.combo !== undefined) state.combo = hud.combo;
    if (hud.lives !== undefined) state.lives = hud.lives;
    if (hud.time !== undefined && this.mode === 'timed') state.timeLabel = `${hud.time}s`;
    state.progress = Math.min(100, ((this.game?.resolvedWords || 0) / Math.max(1, total)) * 100);
    state.progressLabel = this.mode === 'survival' ? `${this.game?.wordsShot || 0} từ trúng` : this.mode === 'timed' ? 'Đua điểm' : `${this.game?.resolvedWords || 0} / ${total} từ`;
    state.progressPercent = Math.round(state.progress);
    uiManager.updateGameHud(state);
  }

  pauseGame() { if (!this.game?.isRunning) return; this.game.pause(); audioManager.stopMusic(); uiManager.showPause(); }
  finishEarly() { this.game?.endGame('aborted'); }
  destroyGame() { audioManager.stopMusic(); this.game?.destroy(); this.game = null; }
  showHint() { const word = this.game?.activeWords?.find(item => item.id === this.game.selectedTargetId) || this.game?.activeWords?.[0]; if (word) uiManager.setGameFeedback(`Gợi ý: ${word.target.slice(0, 1)}${'·'.repeat(Math.max(1, word.target.length - 1))}`, 'hint'); }

  pressVirtualKey(key) {
    const input = document.getElementById('game-input');
    if (!input || !this.game?.isRunning || this.game.isPaused) return;
    if (key === 'enter') { document.getElementById('game-answer-form')?.requestSubmit(); return; }
    if (key === 'backspace') input.value = input.value.slice(0, -1);
    else input.value += key === 'space' ? ' ' : key;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  openWordDialog() { const dialog = document.getElementById('word-dialog'); dialog?.showModal(); dialog?.querySelector('[name="english"]')?.focus(); }
  async toggleFavorite(id) { const word = vocabManager.getAll().find(item => item.id === id); if (!word) return; await vocabManager.updateWord(id, { isFavorite: !word.isFavorite }); await this.navigate('vocabulary'); }
  async deleteWord(id) { if (!confirm('Xóa từ này khỏi kho?')) return; await vocabManager.deleteWord(id); await this.navigate('vocabulary'); }
  async switchProfile(id) { this.destroyGame(); await profileManager.switchProfile(id); await vocabManager.init(); this.applyAudioSettings(profileManager.getCurrentProfile().settings || {}); document.getElementById('profile-dialog')?.close(); await this.navigate('home'); }

  exportWords() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), vocabulary: vocabManager.getAll() }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'word-shooter-vocabulary.json'; link.click(); URL.revokeObjectURL(link.href);
  }

  async importFile(file) {
    if (!file) return;
    try {
      let words;
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(await file.text()); words = Array.isArray(parsed) ? parsed : parsed.vocabulary;
      } else if (/\.xlsx?$/i.test(file.name)) words = FileImporter.parseExcel(await file.arrayBuffer());
      else { const text = await file.text(); words = file.name.toLowerCase().endsWith('.csv') ? FileImporter.parseCSV(text) : FileImporter.parseTXT(text); }
      const added = await vocabManager.addMultipleWords(words || []);
      uiManager.showToast(`Đã nhập ${added.length} từ.`, added.length ? 'success' : 'info'); await this.navigate('vocabulary');
    } catch (error) { uiManager.showToast(`Không đọc được tệp: ${error.message}`, 'error'); }
    finally { const input = document.getElementById('file-import-input'); if (input) input.value = ''; }
  }
}

const app = new App();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => app.init(), { once: true });
else void app.init();
