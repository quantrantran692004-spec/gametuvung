import { AnswerChecker } from './answer-checker.js';
import { audioManager } from './audio-manager.js';
import { SpacedRepetition } from './spaced-repetition.js';
import { vocabManager } from './vocab-manager.js';

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
    this.particles = [];
    
    this.score = 0;
    this.lives = options.lives || 5;
    this.combo = 0;
    this.highestCombo = 0;
    this.wordsShot = 0;
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
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
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
    this.lasers = [];
    this.particles = [];
    
    this.score = 0;
    this.combo = 0;
    this.highestCombo = 0;
    this.wordsShot = 0;
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
      time: this.timeRemaining
    });

    this.startTimers();
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  startTimers() {
    clearInterval(this.spawnTimer);
    clearInterval(this.gameTimer);

    // Spawn words interval
    const spawnRate = this.options.speed === 'fast' ? 2000 : (this.options.speed === 'slow' ? 3500 : 2500);
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

  spawnWord() {
    if (this.activeWords.length >= 6) return; // Cap maximum words on screen
    if (!this.words || this.words.length === 0) return;

    // Pick random word
    const item = this.words[Math.floor(Math.random() * this.words.length)];
    const direction = this.options.wordDirection || 'en-vi';
    const isEnToVi = direction === 'en-vi';

    // Parroto Style:
    // If direction is en-vi: Prompt is Vietnamese meaning, Target is English word to type
    // If direction is vi-en: Prompt is English word, Target is Vietnamese meaning
    const displayPrompt = isEnToVi ? item.vietnamese : item.english;
    const targetWord = isEnToVi ? item.english : item.vietnamese;
    const subHint = isEnToVi ? (item.ipa ? `${item.ipa}` : '') : '';

    const approxWidth = Math.max(180, Math.max(displayPrompt.length, targetWord.length) * 13 + 40);
    const padding = 20;
    const maxX = Math.max(20, this.canvas.width - approxWidth - padding);
    const x = padding + Math.random() * maxX;
    
    const speedBase = this.options.speed === 'fast' ? 1.2 : (this.options.speed === 'slow' ? 0.5 : 0.75);

    const wordEntity = {
      id: Math.random().toString(36).substring(2, 8),
      prompt: displayPrompt,     // Nghĩa tiếng Việt hiển thị to ở trên
      target: targetWord,       // Từ tiếng Anh cần gõ
      subHint: subHint,         // Phiên âm IPA
      typedProgress: 0,         // Số ký tự đã gõ khớp
      rawItem: item,
      x: x,
      y: -60,
      vy: speedBase * (0.8 + Math.random() * 0.3),
      width: approxWidth,
      height: 60,
      glow: '#00ffff'
    };

    this.activeWords.push(wordEntity);
  }

  // Realtime update while user is typing in the box
  updateTypingProgress(input) {
    if (!this.isRunning || this.isPaused) return false;
    const clean = input.trim().toLowerCase();

    // Check if any word completely matches -> auto shoot!
    for (let i = 0; i < this.activeWords.length; i++) {
      const w = this.activeWords[i];
      const targetClean = w.target.trim().toLowerCase();
      const promptClean = w.prompt.trim().toLowerCase();

      // Check prefix match to highlight letters
      if (clean && targetClean.startsWith(clean)) {
        w.typedProgress = clean.length;
        w.glow = '#ffff00'; // Yellow glow while typing correctly
      } else {
        w.typedProgress = 0;
        w.glow = '#00ffff';
      }

      // Exact match reached -> AUTO SHOOT!
      if (clean && (targetClean === clean || promptClean === clean)) {
        this.triggerHit(i);
        return true;
      }
    }
    return false;
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
      this.combo = 0;
      audioManager.playMiss();
      this.onHudUpdate({ combo: 0 });
      return false;
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

    // Laser Beam from bottom center to word
    this.lasers.push({
      x1: this.canvas.width / 2,
      y1: this.canvas.height - 20,
      x2: hitWord.x + hitWord.width / 2,
      y2: hitWord.y + hitWord.height / 2,
      alpha: 1.0,
      color: '#ff007f'
    });

    // Explosion Particles
    this.createExplosion(hitWord.x + hitWord.width / 2, hitWord.y + hitWord.height / 2);

    audioManager.playLaser();
    setTimeout(() => audioManager.playExplosion(), 50);

    // Voice Pronounce target or english word
    if (this.options.voiceEnabled) {
      audioManager.speak(hitWord.rawItem.english);
    }

    // Update Spaced Repetition mastery
    if (hitWord.rawItem && hitWord.rawItem.id) {
      const updatedWord = SpacedRepetition.reviewWord(hitWord.rawItem, true, 1.5);
      vocabManager.updateWord(hitWord.rawItem.id, updatedWord);
    }

    // Remove word
    this.activeWords.splice(hitIndex, 1);

    this.onHudUpdate({
      score: this.score,
      combo: this.combo,
      lives: this.lives
    });
  }

  createExplosion(x, y) {
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
        color: Math.random() > 0.5 ? '#00ffff' : '#ff007f'
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

      // 2. English Target with Typed Character Highlight (Bottom)
      const targetStr = w.target;
      const typedLen = w.typedProgress || 0;

      this.ctx.font = 'bold 17px "Share Tech Mono", monospace';
      const totalTextWidth = this.ctx.measureText(targetStr).width;
      let startX = cx - totalTextWidth / 2;

      this.ctx.textAlign = 'left';
      for (let c = 0; c < targetStr.length; c++) {
        const char = targetStr[c];
        const charWidth = this.ctx.measureText(char).width;

        if (c < typedLen) {
          // Matched character: Glowing Green / Cyan
          this.ctx.fillStyle = '#00ff66';
          this.ctx.shadowColor = '#00ff66';
          this.ctx.shadowBlur = 8;
        } else {
          // Unmatched character: Soft Gray / Cyan
          this.ctx.fillStyle = '#8a99ad';
          this.ctx.shadowBlur = 0;
        }

        this.ctx.fillText(char, startX, w.y + 48);
        startX += charWidth;
      }

      this.ctx.restore();
    }

    // Draw Shooter Base Cannon at bottom center
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height;
    this.ctx.save();
    this.ctx.fillStyle = '#00ffff';
    this.ctx.shadowColor = '#00ffff';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 25, Math.PI, 0, false);
    this.ctx.fill();
    this.ctx.restore();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  endGame(reason) {
    this.isRunning = false;
    clearInterval(this.spawnTimer);
    clearInterval(this.gameTimer);

    const accuracy = this.totalAttempts > 0 
      ? Math.round((this.correctAttempts / this.totalAttempts) * 100) 
      : 0;

    const result = {
      score: this.score,
      wordsShot: this.wordsShot,
      highestCombo: this.highestCombo,
      accuracy: accuracy,
      duration: Math.round((Date.now() - this.startTime) / 1000),
      reason: reason
    };

    this.onGameOver(result);
  }
}
