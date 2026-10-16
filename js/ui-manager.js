import { t } from './i18n.js?v=12';
import { vocabManager } from './vocab-manager.js?v=12';
import { profileManager } from './profile-manager.js?v=12';
import { statsManager } from './stats-manager.js?v=12';

export class UIManager {
  constructor() {
    this.currentScreen = 'screen-main-menu';
    this.initToastContainer();
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
    }
  }

  initToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    this.toastContainer = container;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : (type === 'success' ? 'toast-success' : '')}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  renderVocabList(query = '') {
    const listEl = document.getElementById('vocab-list');
    if (!listEl) return;

    const words = query ? vocabManager.search(query) : vocabManager.getAll();
    if (words.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 40px;">${t('vocab_empty')}</div>`;
      return;
    }

    listEl.innerHTML = words.map(w => `
      <div class="cyber-card" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 18px; font-weight: bold; color: var(--color-neon-cyan);">${w.english} <span style="font-size: 13px; color: var(--color-text-muted); font-weight: normal;">${w.ipa || ''}</span></div>
          <div style="color: #fff; margin-top: 4px;">${w.vietnamese}</div>
          <div style="font-size: 11px; color: var(--color-neon-pink); margin-top: 4px;">Unit: ${w.unit} | Thuần thục: ${'★'.repeat(w.masteryLevel || 0)}${'☆'.repeat(5 - (w.masteryLevel || 0))}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-pink btn-del-word" data-id="${w.id}">${t('btn_delete')}</button>
        </div>
      </div>
    `).join('');

    // Attach delete listeners
    listEl.querySelectorAll('.btn-del-word').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Bạn có chắc muốn xóa từ này vào thùng rác?')) {
          await vocabManager.deleteWord(id);
          this.renderVocabList();
          this.showToast(t('toast_deleted'), 'success');
        }
      });
    });
  }

  async renderStats() {
    const statsContainer = document.getElementById('stats-content');
    if (!statsContainer) return;

    const profile = profileManager.getCurrentProfile();
    const data = await statsManager.getProfileStats(profile.id);

    statsContainer.innerHTML = `
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-label">Tổng số trận đã chơi</div>
          <div class="stat-value neon-cyan">${data.totalGames}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">${t('stat_words_shot')}</div>
          <div class="stat-value neon-pink">${data.totalWords}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Điểm kỷ lục</div>
          <div class="stat-value neon-green">${data.highestScore}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">${t('stat_accuracy')} trung bình</div>
          <div class="stat-value">${data.avgAccuracy}%</div>
        </div>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; color: var(--color-neon-cyan);">Lịch sử 10 trận gần nhất</h3>
      <div class="recent-list">
        ${data.recentSessions.length === 0 ? '<div style="color: var(--color-text-muted);">Chưa có lịch sử thi đấu.</div>' : data.recentSessions.map(s => `
          <div class="cyber-card" style="margin-bottom: 8px; display: flex; justify-content: space-between; font-size: 13px;">
            <div>
              <span style="color: var(--color-neon-pink); font-weight: bold;">[${s.mode.toUpperCase()}]</span> 
              Điểm: <span style="color: #fff; font-weight: bold;">${s.score}</span> | Bắn: ${s.wordsShot} từ
            </div>
            <div style="color: var(--color-text-muted);">
              Chính xác: ${s.accuracy}% | ${new Date(s.playedAt).toLocaleDateString('vi-VN')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderProfiles() {
    const listEl = document.getElementById('profiles-list');
    if (!listEl) return;

    const current = profileManager.getCurrentProfile();
    const all = profileManager.profiles;

    listEl.innerHTML = all.map(p => `
      <div class="cyber-card" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-color: ${p.id === current.id ? 'var(--color-neon-cyan)' : 'var(--color-border)'}">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="avatar-badge">${p.avatar || '🚀'}</div>
          <div>
            <div style="font-weight: bold; color: ${p.id === current.id ? 'var(--color-neon-cyan)' : '#fff'};">${p.name} ${p.isGuest ? `(${t('profile_guest')})` : ''}</div>
            <div style="font-size: 11px; color: var(--color-text-muted);">Tạo ngày: ${new Date(p.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div>
          ${p.id === current.id ? '<span style="color: var(--color-neon-green); font-size: 12px; font-weight: bold;">[ĐANG DÙNG]</span>' : `<button class="btn btn-sm btn-select-prof" data-id="${p.id}">CHỌN</button>`}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.btn-select-prof').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        await profileManager.switchProfile(id);
        this.renderProfiles();
        this.updateProfileBadge();
        this.showToast('Đã đổi hồ sơ!', 'success');
      });
    });
  }

  updateProfileBadge() {
    const badge = document.getElementById('nav-profile-name');
    const avatar = document.getElementById('nav-profile-avatar');
    const cur = profileManager.getCurrentProfile();
    if (badge && cur) badge.textContent = cur.name;
    if (avatar && cur) avatar.textContent = cur.avatar || '🚀';
  }
}

export const uiManager = new UIManager();
