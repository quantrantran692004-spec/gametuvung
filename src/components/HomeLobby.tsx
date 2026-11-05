import { motion } from 'motion/react';

type HomeData = {
  profile?: { name?: string };
  stats?: { totalWords?: number; totalGames?: number };
  dueWords?: unknown[];
  todayWords?: number;
  settings?: { sessionSize?: number; timerDuration?: number; lives?: number };
  words?: unknown[];
};

type Props = { data: HomeData; selectedMode: string; pool: string };

const modes = [
  { id: 'practice', pool: 'all', icon: '◎', title: 'LUYỆN TẬP', detail: 'Bắt nhịp, nhớ từ nhanh', tone: 'blue' },
  { id: 'practice', pool: 'review', icon: '↻', title: 'ÔN TỪ SAI', detail: '', tone: 'green' },
  { id: 'timed', pool: 'all', icon: '◷', title: 'TÍNH GIỜ', detail: '', tone: 'gold' },
  { id: 'survival', pool: 'all', icon: '∞', title: 'SINH TỒN', detail: '5 mạng · trụ càng lâu', tone: 'violet' },
];

export default function HomeLobby({ data, selectedMode, pool }: Props) {
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

  return (
    <section className="screen home-screen">
      <header className="lobby-topbar">
        <button className="lobby-player" type="button" data-action="open-profiles" aria-label="Đổi người chơi">
          <span className="lobby-avatar">{Array.from(profileName.trim())[0]?.toUpperCase() || 'P'}</span>
          <span className="lobby-player-copy">
            <strong>{profileName}</strong>
            <small>LV. {level} · {levelHits}/20 TỪ TRÚNG</small>
            <span className="lobby-xp-track"><i style={{ width: `${levelHits * 5}%` }} /></span>
          </span>
          <span className="lobby-player-stats"><b>{totalWords}</b><small>TỪ TRONG KHO</small></span>
        </button>
        <div className="lobby-tools">
          <span className="lobby-daily"><span>✦</span><b>{dailyCount}</b><small>TỪ HÔM NAY</small></span>
          <motion.button className="lobby-icon-button" type="button" data-action="test-voice" aria-label="Kiểm tra âm thanh" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>◖))</motion.button>
          <motion.button className="lobby-icon-button" type="button" data-route="settings" aria-label="Cài đặt" whileHover={{ rotate: 14 }} whileTap={{ scale: 0.94 }}>⚙</motion.button>
        </div>
      </header>

      <section className="lobby-hero" aria-labelledby="lobby-title">
        <div className="lobby-brand-kicker">ENGLISH VOCABULARY ARCADE</div>
        <h1 id="lobby-title">WORD <span>SHOOTER</span></h1>
        <p>Nghe từ · gõ thật nhanh · bắn trúng mục tiêu</p>
        <motion.button className="lobby-start-button" type="button" data-action="start-game" whileHover={{ y: -3, scale: 1.025 }} whileTap={{ y: 2, scale: 0.98 }}>
          <span className="lobby-play-icon">▶</span><span>BẮT ĐẦU CHƠI</span><span className="lobby-enter-hint">ENTER ↵</span>
        </motion.button>
        <span className="lobby-session-note">{sessionSize} MỤC TIÊU · {dueCount ? `${dueCount} TỪ CẦN ÔN` : 'TIẾN ĐỘ ĐƯỢC LƯU TRÊN MÁY'}</span>
      </section>

      <section className="lobby-modes" aria-labelledby="lobby-modes-title">
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
      </section>

      <nav className="lobby-utilities" aria-label="Tiện ích">
        <button type="button" className="lobby-utility" data-route="vocabulary"><span className="utility-art">▤</span><span><b>Kho từ vựng</b><small>Quản lý và học từ</small></span><i>›</i></button>
        <button type="button" className="lobby-utility" data-action="import-words"><span className="utility-art">⇧</span><span><b>Nhập tài liệu</b><small>Tạo bộ từ từ tệp</small></span><i>›</i></button>
        <button type="button" className="lobby-utility" data-route="progress"><span className="utility-art">🏆</span><span><b>Thành tích</b><small>{Number(stats.totalGames || 0)} lượt · {hits} từ trúng</small></span><i>›</i></button>
        <button type="button" className="lobby-utility" data-route="settings"><span className="utility-art">⚙</span><span><b>Cài đặt</b><small>Âm thanh và trải nghiệm</small></span><i>›</i></button>
      </nav>
    </section>
  );
}
