import { motion } from 'motion/react';
import { useState } from 'react';

type HomeData = {
  profile?: { name?: string; avatar?: string };
  stats?: { totalWords?: number; totalGames?: number };
  dueWords?: unknown[];
  todayWords?: number;
  settings?: { sessionSize?: number; timerDuration?: number; lives?: number };
  words?: { unit?: string }[];
};

type Props = { data: HomeData; selectedMode: string; pool: string };

const modes = [
  { id: 'practice', pool: 'all', icon: '🎯', title: 'LUYỆN TẬP', detail: 'Từ kho · hết lượt khi hoàn thành', tone: 'blue' },
  { id: 'survival', pool: 'all', icon: '🏆', title: 'SINH TỒN', detail: 'Kho từ · hết mạng mới dừng', tone: 'rose' },
  { id: 'timed', pool: 'all', icon: '⏱️', title: 'TÍNH GIỜ', detail: '', tone: 'gold' },
  { id: 'practice', pool: 'lesson', icon: '📖', title: 'THỬ THÁCH BÀI HỌC', detail: 'Chỉ từ bộ bạn chọn · dán cả 100 từ', tone: 'violet' },
  { id: 'practice', pool: 'review', icon: '🔄', title: 'ÔN TẬP TỪ SAI', detail: '', tone: 'green' },
];

function TopbarIcon({ kind }: { kind: 'garden' | 'mountain' | 'daily' | 'sound' | 'settings' }) {
  return <i className={`lobby-topbar-icon icon-${kind}`} aria-hidden="true" />;
}

export default function HomeLobby({ data, selectedMode, pool }: Props) {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('word-shooter-lobby-theme') || 'meadow'; } catch { return 'meadow'; } });
  const changeTheme = (value: string) => { setTheme(value); try { localStorage.setItem('word-shooter-lobby-theme', value); } catch { /* The theme remains active for this session. */ } };
  const [gameTheme, setGameTheme] = useState(() => { try { return localStorage.getItem('word-shooter-game-theme') || '0'; } catch { return '0'; } });
  const changeGameTheme = (value: string) => { setGameTheme(value); try { localStorage.setItem('word-shooter-game-theme', value); } catch { /* Session only. */ } };
  const profileName = data.profile?.name || 'người chơi';
  const dueCount = data.dueWords?.length || 0;
  const totalWords = data.words?.length || 0;
  const stats = data.stats || {};
  const hits = Number(stats.totalWords || 0);
  const level = Math.floor(hits / 20) + 1;
  const levelHits = hits % 20;
  const dailyCount = data.todayWords || 0;
  const sessionSize = data.settings?.sessionSize || 10;
  const timer = data.settings?.timerDuration || 60;
  const units = [...new Set((data.words || []).map(word => String(word.unit || 'General').trim() || 'General'))].sort((a,b) => a.localeCompare(b));
  const gameThemeNames = ['Tiên sơn','Đào tiên','Trúc lâm','Tiên giới 3D','Thủy mặc','Chibi','Điện ảnh','Cung đình','Cực quang','Biển trời'];
  const lobbyThemeLabel = theme === 'meadow' ? 'Vườn' : theme === 'academy' ? 'Học viện' : 'Vũ trụ từ vựng';
  const gameThemeLabel = gameTheme === '0' ? 'Không gian' : gameThemeNames[Number(gameTheme) - 1] || 'Không gian';

  return (
    <section className="screen home-screen" data-theme={theme}>
      <header className="lobby-topbar">
        <button className="lobby-player" type="button" data-action="open-profiles" aria-label="Đổi người chơi">
          <span className={`lobby-avatar ${/^avatar-(?:[1-9]|1[0-2])$/.test(data.profile?.avatar || '') ? 'has-custom-avatar' : ''}`}>{/^avatar-(?:[1-9]|1[0-2])$/.test(data.profile?.avatar || '') ? <i className={`profile-avatar-art ${data.profile?.avatar}`} aria-hidden="true" /> : !data.profile?.avatar || data.profile.avatar === '🚀' ? <i className="lobby-sprite-icon sprite-avatar" aria-hidden="true" /> : data.profile.avatar}</span>
          <span className="lobby-player-copy">
            <strong>{profileName}</strong>
            <small>LV. {level} · {levelHits}/20 TỪ TRÚNG</small>
            <span className="lobby-xp-track"><i style={{ width: `${levelHits * 5}%` }} /></span>
          </span>
          <span className="lobby-player-stats"><i className="lobby-sprite-icon sprite-book" aria-hidden="true"/><b>{totalWords}</b><small>TỪ TRONG KHO</small></span>
        </button>
        <div className="lobby-tools">
          <label className="lobby-theme-picker"><TopbarIcon kind="garden"/><span>Giao diện</span><b className="lobby-picker-current">{lobbyThemeLabel}</b><select aria-label="Chọn giao diện trang chủ" value={theme} onChange={event => changeTheme(event.target.value)}><option value="meadow">Vườn từ vựng</option><option value="academy">Học viện</option><option value="space">Không gian</option></select></label>
          <label className="lobby-theme-picker"><TopbarIcon kind="mountain"/><span>Màn chơi</span><b className="lobby-picker-current">{gameThemeLabel}</b><select aria-label="Chọn giao diện màn chơi" value={gameTheme} onChange={event => changeGameTheme(event.target.value)}><option value="0">Không gian mặc định</option>{gameThemeNames.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}</select></label>
          <span className="lobby-daily"><TopbarIcon kind="daily"/><b>{dailyCount}</b><small>TỪ HÔM NAY</small></span>
          <motion.button className="lobby-icon-button" type="button" data-action="test-voice" aria-label="Kiểm tra âm thanh" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}><TopbarIcon kind="sound"/></motion.button>
          <motion.button className="lobby-icon-button" type="button" data-route="settings" aria-label="Cài đặt" whileHover={{ rotate: 14 }} whileTap={{ scale: 0.94 }}><TopbarIcon kind="settings"/></motion.button>
        </div>
      </header>

      <section className="lobby-hero" aria-labelledby="lobby-title">
        <div className="lobby-floating-words" aria-hidden="true"><span>Vocabulary!</span><span>English</span><span>Learn</span><span>Practice</span><span>Challenge</span></div>
        <div className="lobby-brand-kicker">ENGLISH VOCABULARY ARCADE</div>
        <h1 id="lobby-title" aria-label="WORD SHOOTER"><span className="lobby-word-line">WORD</span><span>SHO<span className="lobby-logo-target" aria-hidden="true">O</span>TER</span></h1>
        <p>Nghe từ · gõ thật nhanh · bắn trúng mục tiêu</p>
        <motion.button className="lobby-start-button" type="button" data-action="start-game" whileHover={{ y: -3, scale: 1.025 }} whileTap={{ y: 2, scale: 0.98 }}>
          <span className="lobby-play-icon">▶</span><span>BẮT ĐẦU CHƠI</span><span className="lobby-enter-hint">ENTER ↵</span>
        </motion.button>
        <span className="lobby-session-note">{sessionSize} MỤC TIÊU · {dueCount ? `${dueCount} TỪ CẦN ÔN` : 'TIẾN ĐỘ ĐƯỢC LƯU TRÊN MÁY'}</span>
      </section>

      <div className="lobby-bottom-panel"><section className="lobby-modes" aria-labelledby="lobby-modes-title">
        <header className="lobby-section-title"><span className="lobby-title-line" /><h2 id="lobby-modes-title">CHỌN CHẾ ĐỘ CHƠI</h2><span className="lobby-title-line" /></header>
        <div className="lobby-mode-grid" role="group" aria-label="Chế độ chơi">
          {modes.map(mode => {
            const active = selectedMode === mode.id && pool === mode.pool;
            const disabled = mode.pool === 'review' && dueCount === 0;
            const detail = mode.pool === 'review' ? `${dueCount} từ đang chờ ôn` : mode.id === 'timed' ? `Ghi điểm trong ${timer} giây` : mode.id === 'survival' ? `${data.settings?.lives || 5} mạng · trụ càng lâu` : mode.detail;
            return (
              <motion.button key={`${mode.id}-${mode.pool}`} type="button" className={`lobby-mode-card tone-${mode.tone} ${active ? 'is-selected' : ''}`} data-action="select-mode" data-mode={mode.id} data-pool={mode.pool} aria-pressed={active} disabled={disabled} whileHover={disabled ? undefined : { y: -3 }} whileTap={disabled ? undefined : { scale: 0.98 }}>
                <span className="mode-art">{mode.icon}</span><span className="lobby-mode-copy"><strong>{mode.title}</strong><small>{detail}</small></span><span className="mode-chevron">›</span>
              </motion.button>
            );
          })}
        </div>
        <div id="lesson-choice" className="lobby-lesson-choice" hidden={pool !== 'lesson'}><label>Chọn bộ từ <select id="lesson-unit" aria-label="Chọn bộ từ">{units.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></label><button type="button" data-action="play-all-lesson">Chơi toàn bộ bộ từ</button></div>
      </section>

      <section className="lobby-utilities-section"><header className="lobby-section-title"><span className="lobby-title-line" /><h2>TIỆN ÍCH HỌC TẬP</h2><span className="lobby-title-line" /></header><nav className="lobby-utilities" aria-label="Tiện ích">
        <button type="button" className="lobby-utility" data-route="vocabulary"><span className="utility-art">📘</span><span><b>Kho từ vựng</b><small>Quản lý và học từ</small></span><i>›</i></button>
        <button type="button" className="lobby-utility" data-action="open-bulk-words"><span className="utility-art">📄</span><span><b>Dán bộ từ</b><small>Dán cả danh sách một lần</small></span><i>›</i></button>
        <button type="button" className="lobby-utility" data-route="progress"><span className="utility-art">🏆</span><span><b>Thành tích</b><small>{Number(stats.totalGames || 0)} lượt · {hits} từ trúng</small></span><i>›</i></button>
        <button type="button" className="lobby-utility" data-route="settings"><span className="utility-art">⚙️</span><span><b>Cài đặt</b><small>Âm thanh và trải nghiệm</small></span><i>›</i></button>
      </nav></section></div>
    </section>
  );
}
