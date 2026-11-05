import { useLayoutEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Application } from 'pixi.js';
import PixiGameScene from '../game/PixiGameScene';

type Props = { profile?: { name?: string }; state: Record<string, any>; options: Record<string, any> };
const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export default function GameScreen({ profile, state, options }: Props) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const pixiMountRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let disposed = false;
    let app: Application | null = null;
    let scene: PixiGameScene | null = null;

    const boot = async () => {
      if (!arenaRef.current || !pixiMountRef.current) return;
      try {
        app = new Application();
        const reduce = options.reducedEffects === true || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        await app.init({
          resizeTo: arenaRef.current,
          backgroundAlpha: 0,
          antialias: !reduce,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 1.75),
          powerPreference: reduce ? 'low-power' : 'high-performance',
          autoStart: false,
        });
        if (disposed || !pixiMountRef.current) {
          app.destroy({ removeView: true }, { children: true });
          return;
        }
        app.canvas.className = 'pixi-game-canvas';
        pixiMountRef.current.appendChild(app.canvas);
        scene = new PixiGameScene(app, reduce);
        await scene.initialize();
        if (disposed) return;
        window.__wordShooterPixi = scene;
        arenaRef.current?.classList.add('pixi-ready');
      } catch (error) {
        console.warn('PixiJS unavailable; continuing with the 2D fallback.', error);
        if (app && !disposed) app.destroy({ removeView: true }, { children: true });
      }
    };

    void boot();
    return () => {
      disposed = true;
      if (window.__wordShooterPixi === scene) delete window.__wordShooterPixi;
      arenaRef.current?.classList.remove('pixi-ready');
      scene?.destroy();
      if (app) app.destroy({ removeView: true }, { children: true });
    };
  }, [options.reducedEffects]);

  const keyboard = (letters: string, extra = '') => (
    <div className={`key-row ${extra}`}>
      {[...letters].map(letter => <button key={letter} type="button" className="virtual-key" data-action="virtual-key" data-key={letter} aria-label={letter}>{letter}</button>)}
    </div>
  );

  return (
    <section className="game-screen" aria-label="Lượt chơi WORD SHOOTER">
      <div className="game-playfield">
        <div className="arena-wrap" id="arena-wrap" ref={arenaRef}>
          <canvas id="game-canvas" aria-label="Từ vựng rơi xuống sân chơi" />
          <div className="pixi-stage" id="pixi-stage" ref={pixiMountRef} aria-hidden="true" />
          <div className="game-status-row">
            <div className="hud-card hud-score"><span>ĐIỂM</span><strong id="hud-score">0</strong></div>
            <div className="hud-card hud-hp"><span>HP</span><strong className="hud-lives" id="hud-lives" aria-label="Mạng còn lại" /></div>
            <div className="hud-card hud-combo"><span>COMBO</span><strong id="hud-combo">0×</strong></div>
            <div className="hud-card hud-timer"><span>GIỜ</span><strong id="hud-time">{state.timeLabel || '∞'}</strong></div>
            <div className="hud-card hud-progress"><div><span id="hud-progress-label">{state.remaining ?? '—'} MỤC TIÊU</span><b id="hud-progress-value">0%</b></div><div className="hud-track"><span id="hud-progress" /></div></div>
          </div>
          <div className="arena-controls">
            <motion.button className="round-icon-button" type="button" data-action="pause-game" id="pause-game-button" aria-label="Tạm dừng" whileHover={{ scale: 1.08 }} whileTap={{ scale: .9 }}>Ⅱ</motion.button>
            <motion.button className="round-icon-button" type="button" data-action="quit-game" aria-label="Thoát lượt" whileHover={{ x: 2 }} whileTap={{ scale: .9 }}>↗</motion.button>
          </div>
          <div className="game-feedback" id="game-feedback" role="status" aria-live="polite" />
          <div className="game-overlay" id="game-overlay" hidden />
        </div>
      </div>
      <footer className="game-footer">
        <div className="answer-deck">
          <div className="answer-guidance"><span className="guidance-orbit">⌖</span><span><b>KHÓ TỪ</b><small id="game-clue">Gõ từ tiếng Anh đang rơi</small></span></div>
          <form className="answer-form" id="game-answer-form">
            <input id="game-input" type="text" inputMode="none" enterKeyHint="send" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Gõ từ mục tiêu…" aria-label="Gõ đáp án từ vựng" />
            <motion.button className="fire-button" type="submit" whileHover={{ scale: 1.035 }} whileTap={{ scale: .96 }}><span>⊙</span> BẮN <small>↵</small></motion.button>
          </form>
          <div className="answer-tools"><button className="utility-button" type="button" data-action="game-hint" aria-label="Gợi ý">GỢI Ý <kbd>Tab</kbd></button><button className="utility-button" type="button" data-action="replay-word" aria-label="Nghe lại từ">◖)) NGHE</button></div>
        </div>
        <div className="virtual-keyboard" role="group" aria-label="Bàn phím ảo trong game">
          {keyboard(rows[0])}{keyboard(rows[1], 'key-row-middle')}
          <div className="key-row key-row-last">{keyboard(rows[2]).props.children}<button type="button" className="virtual-key key-delete" data-action="virtual-key" data-key="backspace" aria-label="Xóa ký tự">⌫</button></div>
          <div className="key-row key-row-bottom"><button type="button" className="virtual-key key-space" data-action="virtual-key" data-key="space">KHOẢNG TRẮNG</button><button type="button" className="virtual-key key-enter" data-action="virtual-key" data-key="enter" aria-label="Bắn">BẮN &nbsp;↵</button></div>
        </div>
      </footer>
    </section>
  );
}
