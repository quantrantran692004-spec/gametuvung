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
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  start(vocabList, mode = 'survival') {
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
    if (this.words.length === 0) return;

    // Pick random word
    const item = this.words[Math.floor(Math.random() * this.words.length)];
    
    const direction = this.options.wordDirection || 'en-vi';
    const isEnToVi = direction === 'en-vi';

    // Measure text width approx
    const displayPrompt = isEnToVi ? item.english : item.vietnamese;
    const targetAnswer = isEnToVi ? item.vietnamese : item.english;
    const subPrompt = isEnToVi ? (item.ipa || '') : '';

    const padding = 20;
    // Dynamic width based on text length
    const approxWidth = Math.max(160, Math.max(displayPrompt.length, targetAnswer.length) * 11 + 30);
    const maxX = Math.max(20, this.canvas.width - approxWidth - padding);
    const x = padding + Math.random() * maxX;
    
    const speedBase = this.options.speed === 'fast' ? 1.4 : (this.options.speed === 'slow' ? 0.6 : 0.9);

    const wordEntity = {
      id: Math.random().toString(36).substring(2, 8),
      prompt: displayPrompt,
      subPrompt: isEnToVi ? `[Nhập nghĩa: ${targetAnswer}]` : `[Gõ từ: ${targetAnswer}]`,
      target: targetAnswer,
      rawItem: item,
      x: x,
      y: -50, // Start slightly above screen and fall down smoothly
      vy: speedBase * (0.8 + Math.random() * 0.4),
      width: approxWidth,
      height: 52,
      glow: '#00ffff'
    };

    this.activeWords.push(wordEntity);
  }

  submitAnswer(input) {
    if (!this.isRunning || this.isPaused || !input.trim()) return false;

    this.totalAttempts++;
    let hitIndex = -1;

    for (let i = 0; i < this.activeWords.length; i++) {
      const w = this.activeWords[i];
      // Check target answer first
      let checkRes = AnswerChecker.check(input, w.target, {
        caseSensitive: this.options.caseSensitive,
        acceptTypos: this.options.acceptTypos
      });

      // Also allow typing the english word directly or vietnamese meaning
      if (!checkRes.correct && w.rawItem) {
        checkRes = AnswerChecker.check(input, w.rawItem.english, {
          caseSensitive: this.options.caseSensitive,
          acceptTypos: this.options.acceptTypos
        });
      }
      if (!checkRes.correct && w.rawItem) {
        checkRes = AnswerChecker.check(input, w.rawItem.vietnamese, {
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
      // HIT!
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
      return true;
    } else {
      // MISS!
      this.combo = 0;
      audioManager.playMiss();
      this.onHudUpdate({ combo: 0 });
      return false;
    }
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

    // Draw Words as Cyberpunk Target Cards
    for (const w of this.activeWords) {
      this.ctx.save();
      
      // Card Box
      this.ctx.fillStyle = 'rgba(13, 17, 35, 0.85)';
      this.ctx.strokeStyle = w.glow;
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = w.glow;
      this.ctx.shadowBlur = 10;

      // Rounded Rect
      const r = 6;
      this.ctx.beginPath();
      this.ctx.roundRect(w.x, w.y, w.width, w.height, r);
      this.ctx.fill();
      this.ctx.stroke();

      // Text Prompt
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 16px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 0;
      this.ctx.fillText(w.prompt, w.x + w.width / 2, w.y + 24);

      // SubPrompt (Hint / Translation)
      if (w.subPrompt) {
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = '12px "Share Tech Mono", monospace';
        this.ctx.fillText(w.subPrompt, w.x + w.width / 2, w.y + 42);
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
