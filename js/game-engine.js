import { AnswerChecker } from './answer-checker.js?v=18';
import { audioManager } from './audio-manager.js?v=18';
import { SpacedRepetition } from './spaced-repetition.js?v=18';
import { vocabManager } from './vocab-manager.js?v=18';

export class GameEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    
    // Game State
    this.isRunning = false;
    this.isPaused = false;
    this.words = [];
    this.activeWords = [];
    this.lasers = [];
    this.projectiles = [];
    this.particles = [];
    
    this.score = 0;
    this.lives = options.lives || 5;
    this.combo = 0;
    this.highestCombo = 0;
    this.wordsShot = 0;
    this.missedWords = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.timeRemaining = options.duration || 60;
    this.startTime = 0;
    
    this.spawnTimer = null;
    this.gameTimer = null;
    this.lastFrameTime = 0;
    
    // Callbacks
    this.onHudUpdate = options.onHudUpdate || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onAnswerFeedback = options.onAnswerFeedback || (() => {});
    this.missPenalty = Number.isFinite(options.missPenalty) ? options.missPenalty : 25;
    
    this.handleResize = () => this.resizeCanvas();
    this.resizeCanvas();
    window.addEventListener('resize', this.handleResize);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
    this.canvas.width = (rect && rect.width > 50) ? rect.width : window.innerWidth;
    this.canvas.height = (rect && rect.height > 50) ? rect.height : (window.innerHeight - 150);
  }

  start(vocabList, mode = 'survival') {
    this.resizeCanvas();
    this.mode = mode;
    this.words = [...vocabList];
    this.activeWords = [];
    this.selectedTargetId = null;
    this.lasers = [];
    this.projectiles = [];
    this.particles = [];
    
    this.score = 0;
    this.combo = 0;
    this.highestCombo = 0;
    this.wordsShot = 0;
    this.missedWords = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.lives = this.options.lives || 5;
    this.timeRemaining = this.options.duration || 60;
    this.startTime = Date.now();
    
    this.isRunning = true;
    this.isPaused = false;

    this.onHudUpdate({
      score: this.score,
      lives: this.lives,
      combo: this.combo,
      time: this.timeRemaining,
      weapon: this.getWeaponLabel()
    });

    this.startTimers();
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  startTimers() {
    clearInterval(this.spawnTimer);
    clearInterval(this.gameTimer);

    // Spawn words interval
    const spawnRate = this.mode === 'dictation'
      ? 9000
      : (this.options.speed === 'fast' ? 3500 : (this.options.speed === 'slow' ? 6000 : 4500));
    this.spawnTimer = setInterval(() => {
      if (!this.isPaused && this.isRunning) {
        this.spawnWord();
      }
    }, spawnRate);

    // Initial word
    this.spawnWord();

    // Mode Timed countdown
    if (this.mode === 'timed') {
      this.gameTimer = setInterval(() => {
        if (!this.isPaused && this.isRunning) {
          this.timeRemaining--;
          this.onHudUpdate({ time: this.timeRemaining });
          if (this.timeRemaining <= 0) {
            this.endGame('time_up');
          }
        }
      }, 1000);
    }
  }

  getWeaponLevel() {
    if (this.wordsShot >= 8) return 3;
    if (this.wordsShot >= 3) return 2;
    return 1;
  }

  getWeaponLabel() {
    return ['ĐẠN ĐƠN', 'ĐẠN ĐƠN', '2 NÒNG', 'TÊN LỬA'][this.getWeaponLevel()];
  }

  spawnWord() {
    const maxActive = this.canvas.width < 500 ? 3 : 6;
    if (this.activeWords.length >= (this.mode === 'dictation' ? 1 : maxActive)) return;
    if (!this.words || this.words.length === 0) return;

    // Pick random word
    const item = this.words[Math.floor(Math.random() * this.words.length)];
    const direction = this.options.wordDirection || 'en-vi';
    const isEnToVi = direction === 'en-vi';

    // Parroto Style:
    // If direction is en-vi: Prompt is Vietnamese meaning, Target is English word to type
    // If direction is vi-en: Prompt is English word, Target is Vietnamese meaning
    const isDictation = this.mode === 'dictation';
    const displayPrompt = isDictation
      ? 'NGHE VÀ GÕ LẠI CÂU TIẾNG ANH'
      : (isEnToVi ? item.vietnamese : item.english);
    const targetWord = isDictation ? item.english : (isEnToVi ? item.english : item.vietnamese);
    const subHint = isEnToVi ? (item.ipa ? `${item.ipa}` : '') : '';

    const approxWidth = isDictation
      ? Math.min(this.canvas.width - 40, 420)
      : Math.max(180, Math.max(displayPrompt.length, targetWord.length) * 13 + 40);
    const padding = 20;
    const maxX = Math.max(20, this.canvas.width - approxWidth - padding);
    const x = padding + Math.random() * maxX;
    
    const speedBase = this.options.speed === 'fast' ? 0.7 : (this.options.speed === 'slow' ? 0.25 : 0.4);

    const highestExistingY = this.activeWords.length
      ? Math.min(...this.activeWords.map(word => word.y))
      : null;
    const spawnY = highestExistingY === null ? 18 : highestExistingY - 92;
    const wordEntity = {
      id: Math.random().toString(36).substring(2, 8),
      prompt: displayPrompt,     // Nghĩa tiếng Việt hiển thị to ở trên
      target: targetWord,       // Từ tiếng Anh cần gõ
      subHint: subHint,         // Phiên âm IPA
      typedText: '',             // Các ký tự người chơi đã nhập, hiển thị trực tiếp
      typedProgress: 0,         // Số ký tự đã gõ khớp
      rawItem: item,
      x: x,
      y: spawnY,
      vy: speedBase * (0.8 + Math.random() * 0.3),
      width: approxWidth,
      height: 60,
      glow: '#4DE2D0'
    };

    this.activeWords.push(wordEntity);

    if (this.options.autoSpeak) {
      audioManager.speak(item.english, 'en-US');
    }
  }

  // Realtime update while user is typing in the box
  updateTypingProgress(input) {
    if (!this.isRunning || this.isPaused) return false;
    const clean = input.trim().toLowerCase();

    // Khóa cứng một mục tiêu: ký tự đầu chọn thẻ, các ký tự sau không được nhảy sang thẻ khác.
    let targetIndex = this.activeWords.findIndex(w => w.id === this.selectedTargetId);
    if (targetIndex === -1 && clean) {
      targetIndex = this.activeWords.findIndex(w => {
        const target = w.target.trim().toLowerCase();
        const prompt = w.prompt.trim().toLowerCase();
        return target.startsWith(clean) || prompt.startsWith(clean);
      });
      if (targetIndex === -1) targetIndex = 0;
      this.selectedTargetId = this.activeWords[targetIndex]?.id || null;
    }

    const w = this.activeWords[targetIndex];
    if (!w) return false;
    const targetClean = w.target.trim().toLowerCase();
    const promptClean = w.prompt.trim().toLowerCase();

    // Mọi ký tự đã gõ đều thay dấu chấm trên đúng thẻ đang chọn.
    w.typedText = clean;
    w.typedProgress = clean.length;
    w.isPrefixCorrect = !clean || targetClean.startsWith(clean) || promptClean.startsWith(clean);
    if (clean && w.isPrefixCorrect) {
      w.glow = '#67E8A5';
    } else {
      w.glow = clean ? '#FF6B91' : '#49D7C5';
      w.errorUntil = performance.now() + 450;
    }

    // Exact match reached -> AUTO SHOOT!
    if (clean && (targetClean === clean || promptClean === clean)) {
      this.triggerHit(targetIndex);
      return true;
    }

    // Đã nhập đủ độ dài nhưng sai: mục tiêu tự rời sân, báo sai và mở khóa mục tiêu kế tiếp.
    if (clean.length >= targetClean.length && clean !== targetClean && clean !== promptClean) {
      this.missTarget(targetIndex);
      return true;
    }
    return false;
  }

  missTarget(targetIndex) {
    const missedTarget = this.activeWords[targetIndex];
    if (!missedTarget) return;
    this.missedWords++;
    this.combo = 0;
    this.lives = Math.max(0, this.lives - 1);
    this.createExplosion(missedTarget.x + missedTarget.width / 2, missedTarget.y + missedTarget.height / 2, '#FF718B');
    audioManager.playMiss();
    this.activeWords.splice(targetIndex, 1);
    this.selectedTargetId = null;
    this.onHudUpdate({ score: this.score, combo: 0, lives: this.lives });
    this.onAnswerFeedback({ correct: false, penalty: this.missPenalty, autoMiss: true });
    if (this.lives <= 0) this.endGame('out_of_lives');
  }

  submitAnswer(input) {
    if (!this.isRunning || this.isPaused || !input.trim()) return false;

    this.totalAttempts++;
    let hitIndex = -1;

    for (let i = 0; i < this.activeWords.length; i++) {
      const w = this.activeWords[i];
      let checkRes = AnswerChecker.check(input, w.target, {
        caseSensitive: this.options.caseSensitive,
        acceptTypos: this.options.acceptTypos
      });

      if (!checkRes.correct) {
        checkRes = AnswerChecker.check(input, w.prompt, {
          caseSensitive: this.options.caseSensitive,
          acceptTypos: this.options.acceptTypos
        });
      }

      if (checkRes.correct) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      this.triggerHit(hitIndex);
      return true;
    } else {
      // MISS!
      this.missedWords++;
      this.combo = 0;
      this.score = Math.max(0, this.score - this.missPenalty);
      audioManager.playMiss();
      this.onHudUpdate({ score: this.score, combo: 0 });
      this.onAnswerFeedback({ correct: false, penalty: this.missPenalty });
      return false;
    }
  }

  speakActiveTarget() {
    const activeTarget = this.activeWords.find(w => w.typedProgress > 0) || this.activeWords[0];
    if (activeTarget?.rawItem?.english) {
      audioManager.speak(activeTarget.rawItem.english, 'en-US');
    }
  }

  triggerHit(hitIndex) {
    this.correctAttempts++;
    const hitWord = this.activeWords[hitIndex];
    
    this.combo++;
    if (this.combo > this.highestCombo) this.highestCombo = this.combo;

    const comboBonus = Math.min(this.combo * 10, 100);
    this.score += (100 + comboBonus);
    this.wordsShot++;

    this.fireWeaponAt(hitWord);

    // Explosion Particles
    this.createExplosion(hitWord.x + hitWord.width / 2, hitWord.y + hitWord.height / 2);

    audioManager.playLaser();
    setTimeout(() => audioManager.playExplosion(), 50);

    // Update Spaced Repetition mastery
    if (hitWord.rawItem && hitWord.rawItem.id) {
      const updatedWord = SpacedRepetition.reviewWord(hitWord.rawItem, true, 1.5);
      vocabManager.updateWord(hitWord.rawItem.id, updatedWord);
    }

    // Remove word
    this.activeWords.splice(hitIndex, 1);
    this.selectedTargetId = null;

    if (this.mode === 'dictation' && this.isRunning) {
      setTimeout(() => {
        if (this.isRunning && this.activeWords.length === 0) this.spawnWord();
      }, 250);
    }

    this.onHudUpdate({
      score: this.score,
      combo: this.combo,
      lives: this.lives,
      weapon: this.getWeaponLabel()
    });
    this.onAnswerFeedback({
      correct: true,
      score: this.score,
      combo: this.combo,
      upgraded: this.wordsShot === 3 || this.wordsShot === 8,
      weapon: this.getWeaponLabel()
    });
  }

  fireWeaponAt(target) {
    const level = this.getWeaponLevel();
    const targetX = target.x + target.width / 2;
    const targetY = target.y + target.height / 2;
    const base = { x1: this.canvas.width / 2, y1: this.canvas.height - 28, targetX, targetY };
    const offsets = level === 2 ? [-12, 12] : [0];
    offsets.forEach(offset => {
      this.projectiles.push({
        ...base,
        x1: base.x1 + offset,
        progress: 0,
        speed: level === 3 ? 0.065 : 0.11,
        type: level === 3 ? 'missile' : 'bullet',
        color: level === 3 ? '#FF9F43' : (level === 2 ? '#67E8A5' : '#FF5C8A')
      });
    });
    this.lasers.push({
      x1: base.x1, y1: base.y1, x2: targetX, y2: targetY,
      alpha: level === 3 ? 0.35 : 0.65,
      color: level === 3 ? '#FF9F43' : '#FF5C8A'
    });
  }

  createExplosion(x, y, forcedColor = null) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.2);
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02,
        color: forcedColor || (Math.random() > 0.5 ? '#4DE2D0' : '#FF5C8A')
      });
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      this.update();
      this.render();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update() {
    // Update active words position
    for (let i = this.activeWords.length - 1; i >= 0; i--) {
      const w = this.activeWords[i];
      w.y += w.vy;

      // Word reached bottom
      if (w.y + w.height >= this.canvas.height) {
        this.activeWords.splice(i, 1);
        this.combo = 0;
        audioManager.playMiss();

        if (w.rawItem?.id) {
          const updatedWord = SpacedRepetition.reviewWord(w.rawItem, false);
          vocabManager.updateWord(w.rawItem.id, updatedWord);
        }

        if (this.mode === 'survival') {
          this.lives--;
          this.onHudUpdate({ lives: this.lives, combo: 0 });
          if (this.lives <= 0) {
            this.endGame('out_of_lives');
            return;
          }
        } else {
          this.onHudUpdate({ combo: 0 });
        }
      }
    }

    // Update lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].alpha -= 0.1;
      if (this.lasers[i].alpha <= 0) {
        this.lasers.splice(i, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += p.speed;
      if (p.progress >= 1) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.x = p.x1 + (p.targetX - p.x1) * p.progress;
      p.y = p.y1 + (p.targetY - p.y1) * p.progress;
      if (p.type === 'missile' && Math.random() > 0.45) {
        this.particles.push({ x: p.x, y: p.y, vx: (Math.random() - .5), vy: 1.5, life: .7, decay: .08, color: '#FF9F43' });
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Lasers
    for (const l of this.lasers) {
      this.ctx.save();
      this.ctx.strokeStyle = l.color;
      this.ctx.lineWidth = 4;
      this.ctx.globalAlpha = l.alpha;
      this.ctx.shadowColor = l.color;
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.moveTo(l.x1, l.y1);
      this.ctx.lineTo(l.x2, l.y2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Draw physical projectiles on top of the beam.
    for (const p of this.projectiles) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.targetY - p.y1, p.targetX - p.x1);
      this.ctx.rotate(angle);
      this.ctx.fillStyle = p.color;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = p.type === 'missile' ? 20 : 12;
      if (p.type === 'missile') {
        this.ctx.beginPath();
        this.ctx.moveTo(13, 0);
        this.ctx.lineTo(-9, -6);
        this.ctx.lineTo(-6, 0);
        this.ctx.lineTo(-9, 6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = '#FFE08A';
        this.ctx.fillRect(-13, -3, 6, 6);
      } else {
        this.ctx.beginPath();
        this.ctx.roundRect(-11, -3, 22, 6, 3);
        this.ctx.fill();
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Draw Words as Target Cards (Parroto Style)
    for (const w of this.activeWords) {
      this.ctx.save();
      
      // Card Box with Neon Border
      this.ctx.fillStyle = 'rgba(10, 14, 30, 0.9)';
      this.ctx.strokeStyle = w.glow;
      this.ctx.lineWidth = w.typedProgress > 0 ? 3 : 2;
      this.ctx.shadowColor = w.glow;
      this.ctx.shadowBlur = w.typedProgress > 0 ? 15 : 8;

      const r = 8;
      this.ctx.beginPath();
      this.ctx.roundRect(w.x, w.y, w.width, w.height, r);
      this.ctx.fill();
      this.ctx.stroke();

      const cx = w.x + w.width / 2;

      // 1. Vietnamese Meaning / Prompt (Top, bright yellow or white)
      this.ctx.fillStyle = '#ffea00';
      this.ctx.font = 'bold 15px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 0;
      this.ctx.fillText(w.prompt, cx, w.y + 24);

      // 2. Chỉ hiển thị chữ đầu và dấu chấm, không làm lộ toàn bộ đáp án
      const targetStr = w.target;
      const typedText = w.typedText || '';
      const typedLen = w.typedProgress || 0;

      this.ctx.font = 'bold 17px "Share Tech Mono", monospace';
      const showFirstCharacter = this.mode !== 'dictation';
      const maskedStr = showFirstCharacter && targetStr.length > 1
        ? `${targetStr[0]}${'.'.repeat(targetStr.length - 1)}`
        : '.'.repeat(targetStr.length);
      const totalTextWidth = this.ctx.measureText(maskedStr).width;
      let startX = cx - totalTextWidth / 2;

      this.ctx.textAlign = 'left';
      for (let c = 0; c < targetStr.length; c++) {
        const char = c < typedText.length
          ? typedText[c]
          : (showFirstCharacter && c === 0 ? targetStr[0] : '.');
        const charWidth = this.ctx.measureText(char).width;

        if (c < typedLen && w.isPrefixCorrect !== false) {
          // Ký tự đã nhập đúng: xanh thành công
          this.ctx.fillStyle = '#67E8A5';
          this.ctx.shadowColor = '#67E8A5';
          this.ctx.shadowBlur = 8;
        } else if (c < typedLen) {
          // Ký tự sai vẫn giữ trên thẻ để người chơi nhìn thấy và sửa
          this.ctx.fillStyle = '#FF718B';
          this.ctx.shadowColor = '#FF718B';
          this.ctx.shadowBlur = 8;
        } else {
          // Unmatched character: Soft Gray / Cyan
          this.ctx.fillStyle = w.errorUntil > performance.now() ? '#FF6B91' : '#AEBBD0';
          this.ctx.shadowBlur = 0;
        }

        this.ctx.fillText(char, startX, w.y + 48);
        startX += charWidth;
      }

      this.ctx.restore();
    }

    // Draw Shooter Cannon / Turret (Parroto / Space Shooter Style)
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height - 10;
    
    // Find active target angle (aim at currently typed word or center)
    let aimX = cx;
    let aimY = 50;
    const activeTarget = this.activeWords.find(w => w.typedProgress > 0) || this.activeWords[0];
    if (activeTarget) {
      aimX = activeTarget.x + activeTarget.width / 2;
      aimY = activeTarget.y + activeTarget.height / 2;
    }
    const angle = Math.atan2(aimY - cy, aimX - cx);

    this.ctx.save();
    this.ctx.translate(cx, cy);

    // 1. Base Platform
    this.ctx.fillStyle = '#101827';
    this.ctx.strokeStyle = '#4DE2D0';
    this.ctx.lineWidth = 4;
    this.ctx.shadowColor = '#4DE2D0';
    this.ctx.shadowBlur = 18;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 46, Math.PI, 0, false);
    this.ctx.fill();
    this.ctx.stroke();

    // 2. Rotating Turret Barrel
    this.ctx.rotate(angle + Math.PI / 2); // Rotate towards target

    const weaponLevel = this.getWeaponLevel();
    // Barrel upgrades: single shot -> twin cannon -> missile launcher.
    this.ctx.fillStyle = weaponLevel === 3 ? '#FF9F43' : '#FF5C8A';
    this.ctx.shadowColor = this.ctx.fillStyle;
    this.ctx.shadowBlur = 16;
    if (weaponLevel === 1) {
      this.ctx.fillRect(-5, -62, 10, 48);
    } else if (weaponLevel === 2) {
      this.ctx.fillRect(-14, -58, 9, 44);
      this.ctx.fillRect(5, -58, 9, 44);
    } else {
      this.ctx.fillRect(-13, -54, 26, 30);
      this.ctx.fillStyle = '#FFE08A';
      this.ctx.fillRect(-8, -62, 16, 8);
    }

    // Turret Core Body
    this.ctx.fillStyle = '#4DE2D0';
    this.ctx.shadowColor = '#4DE2D0';
    this.ctx.beginPath();
    this.ctx.arc(0, -7, 22, 0, Math.PI * 2);
    this.ctx.fill();

    // Core Glowing Energy Light
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.arc(0, -7, 8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#B0BDD0';
    this.ctx.font = '600 11px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('LASER', cx, this.canvas.height - 56);
    this.ctx.restore();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  destroy() {
    this.isRunning = false;
    clearInterval(this.spawnTimer);
    clearInterval(this.gameTimer);
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  endGame(reason) {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.spawnTimer);
    clearInterval(this.gameTimer);

    const accuracy = this.totalAttempts > 0 
      ? Math.round((this.correctAttempts / this.totalAttempts) * 100) 
      : 0;

    const result = {
      score: this.score,
      wordsShot: this.wordsShot,
      missedWords: this.missedWords,
      highestCombo: this.highestCombo,
      accuracy: accuracy,
      duration: Math.round((Date.now() - this.startTime) / 1000),
      reason: reason
    };

    this.onGameOver(result);
  }
}
