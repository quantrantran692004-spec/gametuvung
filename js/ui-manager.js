import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import HomeLobby from '../src/components/HomeLobby.tsx';
import GameScreen from '../src/components/GameScreen.tsx';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const icons = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.2 4.2"/></svg>',
  add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  import: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M4 15v5h16v-5"/></svg>',
  export: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v12m0 0 4.5-4.5M12 21l-4.5-4.5M4 9V4h16v5"/></svg>',
  favorite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 20-1.4-1.3C5.5 14 2 10.8 2 6.9A4.9 4.9 0 0 1 6.9 2c2 0 3.9.9 5.1 2.4A6.6 6.6 0 0 1 17.1 2 4.9 4.9 0 0 1 22 6.9c0 3.9-3.5 7.1-8.6 11.8L12 20Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 4v5m4-5v5"/></svg>',
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a5 5 0 0 1 0 6m2.5-8.5a8.5 8.5 0 0 1 0 11"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7M8 12h12"/></svg>',
  target: '<svg viewBox="0 0 120 120" fill="none" aria-hidden="true"><circle cx="60" cy="60" r="48" stroke="currentColor" stroke-width="1.4"/><circle cx="60" cy="60" r="32" stroke="currentColor" stroke-width="1.4"/><circle cx="60" cy="60" r="16" stroke="currentColor" stroke-width="1.4"/><path d="M60 3v18m0 78v18M3 60h18m78 0h18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="currentColor"/></svg>'
};

const formatDate = value => {
  if (!value) return 'Chưa có lượt chơi';
  const date = new Date(value);
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short' }).format(date);
};

const modeNames = { survival: 'Sinh tồn', timed: 'Tính giờ', practice: 'Luyện tập' };

export class UIManager {
  constructor() {
    this.appShell = document.getElementById('app-shell');
    this.gameShell = document.getElementById('game-shell');
    this.root = document.getElementById('app-view');
    this.gameRoot = document.getElementById('game-screen');
    this.toastTimer = null;
    this.route = 'home';
    this.libraryQuery = '';
    this.libraryFilter = 'all';
    this.selectedMode = 'survival';
    this.pool = 'all';
    this.routeReactRoot = null;
    this.gameReactRoot = null;
  }

  showRoute(route, data) {
    this.routeReactRoot?.unmount();
    this.routeReactRoot = null;
    this.gameReactRoot?.unmount();
    this.gameReactRoot = null;
    this.gameRoot.replaceChildren();
    this.route = route;
    this.appShell.hidden = false;
    this.gameShell.hidden = true;
    document.body.classList.remove('game-active', 'menu-open');
    document.body.classList.toggle('home-lobby', route === 'home');
    const routeNames = { home: 'Tổng quan', vocabulary: 'Kho từ', progress: 'Tiến độ', settings: 'Cài đặt' };
    document.querySelectorAll('[data-route]').forEach(button => {
      const active = button.dataset.route === route;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.title = `${routeNames[route] || 'WORD SHOOTER'} — WORD SHOOTER`;
    this.updateProfile(data.profile, data.profiles || []);

    if (route === 'home') {
      this.routeReactRoot = createRoot(this.root);
      this.routeReactRoot.render(createElement(HomeLobby, { data, selectedMode: this.selectedMode, pool: this.pool }));
    } else if (route === 'vocabulary') this.root.innerHTML = this.vocabularyPage(data);
    else if (route === 'progress') this.root.innerHTML = this.progressPage(data);
    else if (route === 'settings') this.root.innerHTML = this.settingsPage(data);
    else this.root.innerHTML = this.homePage(data);
  }

  updateProfile(profile, profiles) {
    const name = profile?.name || 'Người chơi';
    const initial = Array.from(name.trim())[0]?.toUpperCase() || 'P';
    const shortName = name.length > 20 ? `${name.slice(0, 18)}…` : name;
    ['sidebar-profile-name', 'topbar-profile-name'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.textContent = id.startsWith('sidebar') ? name : shortName;
    });
    ['sidebar-avatar', 'topbar-avatar'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.textContent = initial;
    });
    const profileDialog = document.getElementById('profile-list');
    if (profileDialog) profileDialog.innerHTML = this.profileOptions(profiles, profile?.id);
  }

  profileOptions(profiles, currentId) {
    if (!profiles.length) return '<p class="empty-state">Chưa có hồ sơ người chơi.</p>';
    return profiles.map(profile => {
      const active = profile.id === currentId;
      const initial = Array.from((profile.name || 'P').trim())[0]?.toUpperCase() || 'P';
      return `<button class="profile-option ${active ? 'is-current' : ''}" type="button" data-action="switch-profile" data-profile-id="${escapeHtml(profile.id)}" ${active ? 'aria-current="true"' : ''}>
        <span class="avatar avatar-sidebar">${escapeHtml(initial)}</span><span><strong>${escapeHtml(profile.name || 'Người chơi')}</strong><small>${active ? 'Đang sử dụng' : 'Đổi sang hồ sơ này'}</small></span>
      </button>`;
    }).join('');
  }

  homePage(data) {
    const profileName = escapeHtml(data.profile?.name || 'người chơi');
    const dueCount = (data.dueWords || []).length;
    const stats = data.stats || {};
    const dailyCount = data.todayWords || 0;
    const lifetimeHits = Number(stats.totalWords || 0);
    const playerLevel = Math.floor(lifetimeHits / 20) + 1;
    const levelHits = lifetimeHits % 20;
    const sessionSize = data.settings?.sessionSize || 10;
    const chosenMode = this.selectedMode;
    const totalWords = Number(data.words?.length || 0);
    const timerDuration = Number(data.settings?.timerDuration) || 60;
    const modeCards = [
      { id: 'practice', pool: 'all', icon: '◎', title: 'LUYỆN TẬP', detail: 'Bắt nhịp, nhớ từ nhanh', tone: 'blue' },
      { id: 'practice', pool: 'review', icon: '↻', title: 'ÔN TỪ SAI', detail: `${dueCount} từ đang chờ ôn`, tone: 'green' },
      { id: 'timed', pool: 'all', icon: '◷', title: 'TÍNH GIỜ', detail: `Ghi điểm trong ${timerDuration} giây`, tone: 'gold' },
      { id: 'survival', pool: 'all', icon: '∞', title: 'SINH TỒN', detail: '5 mạng · trụ càng lâu', tone: 'violet' }
    ];
    return `<section class="screen home-screen">
      <header class="lobby-topbar">
        <button class="lobby-player" type="button" data-action="open-profiles" aria-label="Đổi người chơi">
          <span class="lobby-avatar">${Array.from(profileName.trim())[0]?.toUpperCase() || 'P'}</span>
          <span class="lobby-player-copy"><strong>${profileName}</strong><small>LV. ${playerLevel} · ${levelHits}/20 TỪ TRÚNG</small><span class="lobby-xp-track"><i style="width:${levelHits * 5}%"></i></span></span>
          <span class="lobby-player-stats"><b>${totalWords}</b><small>TỪ TRONG KHO</small></span>
        </button>
        <div class="lobby-tools"><span class="lobby-daily"><span>✦</span><b>${dailyCount}</b><small>TỪ HÔM NAY</small></span><button class="lobby-icon-button" type="button" data-action="test-voice" aria-label="Kiểm tra âm thanh">◖))</button><button class="lobby-icon-button" type="button" data-route="settings" aria-label="Cài đặt">⚙</button></div>
      </header>
      <section class="lobby-hero" aria-labelledby="lobby-title">
        <div class="lobby-brand-kicker">ENGLISH VOCABULARY ARCADE</div>
        <h1 id="lobby-title">WORD <span>SHOOTER</span></h1>
        <p>Nghe từ · gõ thật nhanh · bắn trúng mục tiêu</p>
        <button class="lobby-start-button" type="button" data-action="start-game"><span class="lobby-play-icon">▶</span><span>BẮT ĐẦU CHƠI</span><span class="lobby-enter-hint">ENTER ↵</span></button>
        <span class="lobby-session-note">${sessionSize} MỤC TIÊU · ${dueCount ? `${dueCount} TỪ CẦN ÔN` : 'TIẾN ĐỘ ĐƯỢC LƯU TRÊN MÁY'}</span>
      </section>
      <section class="lobby-modes" aria-labelledby="lobby-modes-title">
        <header class="lobby-section-title"><span class="lobby-title-line"></span><h2 id="lobby-modes-title">CHỌN CHẾ ĐỘ CHƠI</h2><span class="lobby-title-line"></span></header>
        <div class="lobby-mode-grid" role="group" aria-label="Chế độ chơi">
          ${modeCards.map(mode => {
            const active = chosenMode === mode.id && this.pool === mode.pool;
            const disabled = mode.pool === 'review' && dueCount === 0;
            return `<button type="button" class="lobby-mode-card tone-${mode.tone} ${active ? 'is-selected' : ''}" data-action="select-mode" data-mode="${mode.id}" data-pool="${mode.pool}" aria-pressed="${active}" ${disabled ? 'disabled aria-disabled="true"' : ''}><span class="mode-art">${mode.icon}</span><span class="lobby-mode-copy"><strong>${mode.title}</strong><small>${mode.detail}</small></span><span class="mode-chevron">›</span></button>`;
          }).join('')}
        </div>
      </section>
      <nav class="lobby-utilities" aria-label="Tiện ích">
        <button type="button" class="lobby-utility" data-route="vocabulary"><span class="utility-art">▤</span><span><b>Kho từ vựng</b><small>Quản lý và học từ</small></span><i>›</i></button>
        <button type="button" class="lobby-utility" data-action="import-words"><span class="utility-art">⇧</span><span><b>Nhập tài liệu</b><small>Tạo bộ từ từ tệp</small></span><i>›</i></button>
        <button type="button" class="lobby-utility" data-route="progress"><span class="utility-art">🏆</span><span><b>Thành tích</b><small>${Number(stats.totalGames || 0)} lượt · ${Number(stats.totalWords || 0)} từ trúng</small></span><i>›</i></button>
        <button type="button" class="lobby-utility" data-route="settings"><span class="utility-art">⚙</span><span><b>Cài đặt</b><small>Âm thanh và trải nghiệm</small></span><i>›</i></button>
      </nav>
    </section>`;
  }

  vocabularyPage(data) {
    const words = data.words || [];
    const filters = [['all','Tất cả'],['review','Cần ôn'],['favorites','Yêu thích']];
    const active = this.libraryFilter;
    const filterMarkup = filters.map(([value,label]) => `<option value="${value}" ${active === value ? 'selected' : ''}>${label}</option>`).join('');
    return `<section class="screen vocabulary-screen">
      <header class="page-heading"><div><span class="eyebrow">WORD VAULT / ${String(words.length).padStart(2,'0')} TARGETS</span><h1>Bộ sưu tập từ</h1><p>Những mục tiêu đã mở khóa và từ đang chờ bạn chinh phục.</p></div><button class="button button-primary" type="button" data-action="add-word">${icons.add} Thêm từ</button></header>
      <div class="toolbar"><label class="search-field">${icons.search}<input id="library-search" type="search" value="${escapeHtml(this.libraryQuery)}" placeholder="Tìm từ tiếng Anh, nghĩa hoặc chủ đề" autocomplete="off"></label><select class="filter-select" id="library-filter" aria-label="Lọc danh sách">${filterMarkup}</select><span class="toolbar-spacer"></span><button class="button button-quiet button-small" type="button" data-action="import-words">${icons.import} Nhập</button><button class="button button-quiet button-small" type="button" data-action="export-words">${icons.export} Sao lưu</button></div>
      <div id="vocabulary-results">${this.wordRows(data.visibleWords || words)}</div>
    </section>`;
  }

  wordRows(words) {
    if (!words.length) return '<div class="empty-state"><strong>Không tìm thấy từ nào.</strong>Thử từ khóa hoặc bộ lọc khác, hoặc thêm từ mới.</div>';
    const cards = words.map(word => {
      const mastery = Math.max(0, Math.min(5, Number(word.masteryLevel) || 0));
      return `<article class="word-card" data-word-row="${escapeHtml(word.id)}"><header class="word-card-head"><div class="word-en">${escapeHtml(word.english)}${word.ipa ? `<small>${escapeHtml(word.ipa)}</small>` : ''}</div><div class="word-actions"><button class="icon-button ${word.isFavorite ? 'is-favorite' : ''}" type="button" data-action="toggle-favorite" data-word-id="${escapeHtml(word.id)}" aria-label="${word.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'} ${escapeHtml(word.english)}" aria-pressed="${Boolean(word.isFavorite)}">${icons.favorite}</button><button class="icon-button" type="button" data-action="delete-word" data-word-id="${escapeHtml(word.id)}" aria-label="Xóa ${escapeHtml(word.english)}">${icons.trash}</button></div></header><p class="word-vi">${escapeHtml(word.vietnamese)}</p><footer class="word-card-foot"><span class="word-unit">${escapeHtml(word.unit || 'Chung')}</span><div class="word-mastery"><span>NHỚ ${mastery}/5</span><div class="mastery-track" role="img" aria-label="Mức nhớ ${mastery} trên 5"><span style="width:${mastery * 20}%"></span></div></div></footer></article>`;
    }).join('');
    return `<div class="collection-grid">${cards}</div>`;
  }

  renderWordResults(words) {
    const target = document.getElementById('vocabulary-results');
    if (target) target.innerHTML = this.wordRows(words);
  }

  progressPage(data) {
    const stats = data.stats || {};
    const levels = data.masteryCounts || [0,0,0,0,0,0];
    const max = Math.max(1, ...levels);
    const recent = (stats.recentSessions || []).map(session => `<div class="data-row"><div class="data-row-main"><strong>${escapeHtml(modeNames[session.mode] || 'Luyện từ')} · ${Number(session.wordsShot || 0)} từ trúng</strong><span>${formatDate(session.playedAt)} · ${Math.round(session.accuracy || 0)}% chính xác · combo ${Number(session.highestCombo || 0)}</span></div><b class="row-meta">${Number(session.score || 0).toLocaleString('vi-VN')} điểm</b></div>`).join('');
    const total = Number(data.words?.length || 0);
    return `<section class="screen progress-screen"><header class="page-heading"><div><h1>Tiến độ luyện tập</h1><p>Kết quả lấy từ các lượt đã lưu trong hồ sơ hiện tại. Không có dữ liệu nào được đồng bộ lên mạng.</p></div></header>
      <div class="progress-summary"><div class="progress-stat"><span>Lượt chơi</span><strong>${Number(stats.totalGames || 0)}</strong></div><div class="progress-stat"><span>Từ bắn trúng</span><strong>${Number(stats.totalWords || 0)}</strong></div><div class="progress-stat"><span>Chính xác trung bình</span><strong>${Number(stats.avgAccuracy || 0)}%</strong></div><div class="progress-stat"><span>Điểm cao nhất</span><strong>${Number(stats.highestScore || 0).toLocaleString('vi-VN')}</strong></div></div>
      <div class="progress-columns"><section><div class="section-heading"><h2>Cấp độ ghi nhớ</h2><p>${total} mục tiêu</p></div><div class="mastery-list">${levels.map((count, level) => `<div class="mastery-row"><span>${level === 0 ? 'Chưa luyện' : level < 3 ? `Mức ${level}` : `Vững ${level}`}</span><div class="mastery-meter" role="img" aria-label="${count} từ ở mức ${level}"><span style="width:${Math.round((count/max)*100)}%"></span></div><b>${count}</b></div>`).join('')}</div></section><section><div class="section-heading"><h2>Nhật ký trận</h2><p>10 lượt gần nhất</p></div>${recent ? `<div class="data-list">${recent}</div>` : '<div class="empty-state"><strong>Chưa có dữ liệu.</strong>Hoàn thành lượt đầu tiên để xem điểm và độ chính xác.</div>'}</section></div>
    </section>`;
  }

  settingsPage(data) {
    const settings = data.settings || {};
    const checked = (value, fallback = false) => (value ?? fallback) ? 'checked' : '';
    const selected = (value, option) => value === option ? 'selected' : '';
    return `<section class="screen settings-screen"><header class="page-heading"><div><span class="eyebrow">LOADOUT / PLAYER SETTINGS</span><h1>Cấu hình trận</h1><p>Chỉnh nhịp rơi, số mạng sinh tồn và âm thanh của hồ sơ hiện tại.</p></div></header>
      <form id="settings-form" class="settings-list">
        <section class="settings-section"><div class="settings-copy"><h2>Độ khó</h2><p>Điều chỉnh tốc độ từ rơi và số cơ hội trong chế độ sinh tồn.</p></div><div class="settings-fields"><label class="field"><span>Tốc độ rơi</span><select name="speed"><option value="slow" ${selected(settings.speed,'slow')}>Chậm</option><option value="normal" ${selected(settings.speed,'normal')}>Vừa</option><option value="fast" ${selected(settings.speed,'fast')}>Nhanh</option></select></label><div class="field-row"><label class="field"><span>Số mạng sinh tồn</span><select name="lives"><option value="3" ${selected(Number(settings.lives),3)}>3 mạng</option><option value="5" ${selected(Number(settings.lives),5)}>5 mạng</option><option value="7" ${selected(Number(settings.lives),7)}>7 mạng</option></select></label><label class="field"><span>Thời gian tính giờ</span><select name="timerDuration"><option value="45" ${selected(Number(settings.timerDuration),45)}>45 giây</option><option value="60" ${selected(Number(settings.timerDuration),60)}>60 giây</option><option value="90" ${selected(Number(settings.timerDuration),90)}>90 giây</option></select></label></div><label class="field"><span>Số từ trong một lượt luyện</span><select name="sessionSize"><option value="5" ${selected(Number(settings.sessionSize),5)}>5 từ</option><option value="10" ${selected(Number(settings.sessionSize),10)}>10 từ</option><option value="15" ${selected(Number(settings.sessionSize),15)}>15 từ</option></select></label></div></section>
        <section class="settings-section"><div class="settings-copy"><h2>Gợi ý & đáp án</h2><p>Mỗi mục tiêu đọc tiếng Anh; nghĩa tiếng Việt hiện trên từ đang rơi.</p></div><div class="settings-fields"><p class="settings-hint">Nghe từ tiếng Anh · gõ đúng từ đó · phá mục tiêu trước khi chạm vạch.</p><label class="switch-row"><span class="switch-copy"><strong>Cho phép sai một ký tự</strong><small>Nhận đáp án gần đúng cho từ dài từ 4 ký tự trở lên.</small></span><span class="switch"><input type="checkbox" name="acceptTypos" ${checked(settings.acceptTypos,true)}><span></span></span></label></div></section>
        <section class="settings-section"><div class="settings-copy"><h2>Âm thanh</h2><p>Từ tiếng Anh được đọc khi mục tiêu xuất hiện; có thể nghe lại bất cứ lúc nào.</p></div><div class="settings-fields"><label class="switch-row"><span class="switch-copy"><strong>Đọc từ mục tiêu tự động</strong><small>Dùng giọng đọc tiếng Anh có sẵn trên thiết bị.</small></span><span class="switch"><input type="checkbox" name="voiceEnabled" ${checked(settings.voiceEnabled,true)}><span></span></span></label><label class="switch-row"><span class="switch-copy"><strong>Hiệu ứng âm thanh</strong><small>Âm báo ngắn khi bắn trúng, hụt hoặc lên cấp vũ khí.</small></span><span class="switch"><input type="checkbox" name="soundEnabled" ${checked(settings.soundEnabled,true)}><span></span></span></label><label class="switch-row"><span class="switch-copy"><strong>Giảm hiệu ứng</strong><small>Giảm số hạt và ánh sáng để máy yếu chạy mượt hơn.</small></span><span class="switch"><input type="checkbox" name="reducedEffects" ${checked(settings.reducedEffects,false)}><span></span></span></label><div class="field-row"><label class="field"><span>Tốc độ đọc</span><select name="voiceRate"><option value="0.72" ${selected(Number(settings.voiceRate),0.72)}>Chậm, rõ</option><option value="0.9" ${selected(Number(settings.voiceRate),0.9)}>Tự nhiên</option><option value="1.05" ${selected(Number(settings.voiceRate),1.05)}>Nhanh</option></select></label><div class="field"><span>Kiểm tra</span><button class="button button-quiet button-small" type="button" data-action="test-voice">${icons.volume} Nghe thử</button></div></div></div></section>
        <div class="settings-actions"><button class="button button-primary" type="submit">Lưu cài đặt</button></div>
      </form></section>`;
  }

  async startGame(profile, state, options = {}) {
    document.title = 'Sân đấu — WORD SHOOTER';
    this.appShell.hidden = true;
    this.gameShell.hidden = false;
    document.body.classList.add('game-active');
    document.body.classList.remove('home-lobby');
    this.routeReactRoot?.unmount();
    this.routeReactRoot = null;
    this.root.replaceChildren();
    this.gameReactRoot?.unmount();
    this.gameRoot.replaceChildren();
    this.gameReactRoot = createRoot(this.gameRoot);
    this.gameReactRoot.render(createElement(GameScreen, { profile, state, options }));
    await new Promise(resolve => requestAnimationFrame(resolve));
    this.updateGameHud(state);
    this.gameInput = document.getElementById('game-input');
    this.gameInput?.focus({ preventScroll: true });
  }

  updateGameHud(state) {
    const score = document.getElementById('hud-score');
    const combo = document.getElementById('hud-combo');
    const time = document.getElementById('hud-time');
    const progress = document.getElementById('hud-progress');
    const progressLabel = document.getElementById('hud-progress-label');
    const lives = document.getElementById('hud-lives');
    const progressValue = document.getElementById('hud-progress-value');
    if (score) score.textContent = Number(state.score || 0).toLocaleString('vi-VN');
    if (combo) combo.textContent = `${Number(state.combo || 0)}×`;
    if (time) time.textContent = state.timeLabel || '∞';
    if (progressLabel) progressLabel.textContent = state.progressLabel || '';
    if (progress) progress.style.width = `${Math.max(0, Math.min(100, Number(state.progress || 0)))}%`;
    if (progressValue && state.progressPercent !== undefined) progressValue.textContent = `${state.progressPercent}%`;
    if (lives && Number.isFinite(state.maxLives)) {
      lives.innerHTML = Array.from({ length: state.maxLives }, (_, index) => `<span class="hud-life ${index >= state.lives ? 'is-lost' : ''}" aria-hidden="true"></span>`).join('');
      lives.setAttribute('aria-label', `Còn ${state.lives} trên ${state.maxLives} mạng`);
    }
  }

  setGameFeedback(message, kind = '') {
    const node = document.getElementById('game-feedback');
    if (!node) return;
    node.textContent = message || '';
    const state = kind === 'correct' ? 'good' : kind === 'wrong' ? 'bad' : kind;
    node.className = `game-feedback ${message ? 'is-visible' : ''} ${state ? `is-${state}` : ''}`;
    if (message) {
      gsap.killTweensOf(node);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(node, { autoAlpha: 0 }, { autoAlpha: 1, duration: .18, ease: 'power2.out' });
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = setTimeout(() => { node.className = 'game-feedback'; }, 850);
    }
  }

  showPause(onResume) {
    const overlay = document.getElementById('game-overlay');
    if (!overlay) return;
    overlay.hidden = false;
    overlay.innerHTML = `<section class="overlay-panel"><span class="pause-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg></span><h1>Tạm nghỉ một nhịp.</h1><p>Sân chơi đang dừng. Khi sẵn sàng, quay lại bắt những từ đang rơi.</p><div class="overlay-actions"><button class="button button-primary" type="button" data-action="resume-game">Tiếp tục</button><button class="button button-quiet" type="button" data-action="quit-game">Kết thúc lượt</button></div></section>`;
  }

  showResults(result, onReplay) {
    const overlay = document.getElementById('game-overlay');
    if (!overlay) return;
    overlay.hidden = false;
    const message = result.reason === 'out_of_lives' ? 'Ván này khép lại.' : result.reason === 'time_up' ? 'Hết giờ.' : result.reason === 'completed' ? 'Bạn đã dọn sạch sân.' : 'Lượt chơi đã kết thúc.';
    const accuracy = Math.round(result.accuracy || 0);
    overlay.innerHTML = `<section class="overlay-panel" aria-labelledby="result-title"><h1 id="result-title">${message}</h1><p>${result.wordsShot ? `${result.wordsShot} mục tiêu trúng đích` : 'Lần sau mình bắt đầu từ một từ nhé.'} · combo cao nhất ${result.highestCombo || 0}×</p><div class="result-score"><div><strong>${Number(result.score || 0).toLocaleString('vi-VN')}</strong><span>điểm</span></div><div><strong>${accuracy}%</strong><span>chính xác</span></div><div><strong>${Number(result.missedWords || 0)}</strong><span>từ hụt</span></div></div><div class="overlay-actions"><button class="button button-primary" type="button" data-action="replay-game">Chơi lượt nữa</button><button class="button button-quiet" type="button" data-action="exit-game">Về tổng quan</button></div></section>`;
  }

  showToast(message, kind = 'info') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    region.innerHTML = `<div class="toast" data-kind="${escapeHtml(kind)}">${escapeHtml(message)}</div>`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { region.innerHTML = ''; }, 3500);
  }
}

export const uiManager = new UIManager();


