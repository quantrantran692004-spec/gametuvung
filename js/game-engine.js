import { AnswerChecker } from './answer-checker.js?v=31';
import { audioManager } from './audio-manager.js?v=31';
import { SpacedRepetition } from './spaced-repetition.js?v=31';
import { vocabManager } from './vocab-manager.js?v=31';

export class GameEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    this.reducedEffects = options.reducedEffects === true
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    this.shipSprite = new Image();
    this.shipSprite.src = './assets/player-starfighter.webp';
    
    // Game State
    this.isRunning = false;
    this.isPaused = false;
    this.words = [];
    this.activeWords = [];
    this.projectiles = [];
    this.particles = [];
    this.muzzleFlashes = [];
    this.scorePopups = [];
    
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
    const previousHeight = this.canvas.height;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
    this.canvas.width = (rect && rect.width > 50) ? rect.width : window.innerWidth;
    this.canvas.height = (rect && rect.height > 50) ? rect.height : (window.innerHeight - 150);
    if (previousHeight > 50 && this.activeWords?.length) {
      for (const word of this.activeWords) {
        word.width = Math.min(this.canvas.width - 24, word.width);
        word.x = Math.max(12, Math.min(this.canvas.width - word.width - 12, word.x));
        const oldTravel = Math.max(1, previousHeight - 18 - word.height);
        const progress = Math.max(0, Math.min(0.98, (word.y - 18) / oldTravel));
        const newTravel = Math.max(1, this.canvas.height - 18 - word.height);
        word.y = 18 + progress * newTravel;
        word.vy = newTravel / (word.fallSeconds || 14);
      }
    }
  }

  start(vocabList, mode = 'survival') {
    this.resizeCanvas();
    this.mode = mode;
    this.words = [...vocabList];
    // Rút từ từ một túi đã xáo trộn, không random lại cùng một từ liên tục.
    this.wordQueue = [...this.words].sort(() => Math.random() - 0.5);
    this.activeWords = [];
    this.selectedTargetId = null;
    this.projectiles = [];
    this.particles = [];
    this.muzzleFlashes = [];
    this.scorePopups = [];
    
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
    const baseSpawnRate = this.options.speed === 'fast' ? 3500 : (this.options.speed === 'slow' ? 6000 : 4500);
    const spawnRate = this.mode === 'practice' ? Math.round(baseSpawnRate * 1.45) : baseSpawnRate;
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
    if (this.activeWords.length >= maxActive) return;
    if (!this.words || this.words.length === 0) return;

    // Dùng hết một lượt danh sách rồi mới xáo trộn lại cho lượt kế tiếp.
    const activeKeys = new Set(this.activeWords.map(word => this.getWordKey(word.rawItem)));
    let item = this.wordQueue.find(candidate => !activeKeys.has(this.getWordKey(candidate)));
    if (!item) {
      this.wordQueue = [...this.words].sort(() => Math.random() - 0.5);
      item = this.wordQueue.find(candidate => !activeKeys.has(this.getWordKey(candidate)));
    }
    if (!item) return;
    this.wordQueue.splice(this.wordQueue.indexOf(item), 1);
    const displayPrompt = item.vietnamese;
    const targetWord = item.english;
    const subHint = item.ipa || '';
    const approxWidth = Math.min(this.canvas.width - 24, Math.max(210, Math.max(displayPrompt.length, targetWord.length) * 14 + 48));
    const padding = 12;
    const maxX = Math.max(padding, this.canvas.width - approxWidth - padding);
    // HUD is now a slim overlay inside the arena, so keep new targets clear of it.
    const y = this.canvas.width < 500 ? 58 : 66;
    let x = padding;
    let bestOverlap = Infinity;
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidateX = padding + Math.random() * (maxX - padding);
      const overlap = this.activeWords.reduce((sum, active) => {
        const verticalOverlap = y < active.y + active.height + 18 && y + 90 > active.y;
        const horizontalOverlap = candidateX < active.x + active.width + 18
          && candidateX + approxWidth + 18 > active.x;
        return sum + (verticalOverlap && horizontalOverlap ? 1 : 0);
      }, 0);
      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        x = candidateX;
      }
      if (overlap === 0) break;
    }
    if (bestOverlap > 0) return;
    
    // Keep a readable reaction window across phone and desktop. Speeds are
    // derived from the actual arena height instead of fixed screen pixels.
    const fallSeconds = Math.max(5, Math.min(60, Number(this.options.fallSeconds) || (this.mode === 'practice' ? 22 : (this.options.speed === 'fast' ? 9 : (this.options.speed === 'slow' ? 18 : 14)))));
    const spawnY = y;
    const targetHeight = 72;
    const speedBase = Math.max(1, (this.canvas.height - spawnY - targetHeight) / fallSeconds);
    const wordEntity = {
      id: Math.random().toString(36).substring(2, 8),
      prompt: displayPrompt,     // Nghĩa tiếng Việt hiển thị to ở trên
      target: targetWord,       // Từ tiếng Anh cần gõ
      subHint: subHint,         // Phiên âm IPA
      rawItem: item,
      x: x,
      y: spawnY,
      vy: speedBase,
      fallSeconds,
      width: approxWidth,
      height: targetHeight,
    };

    this.activeWords.push(wordEntity);

    if (this.options.autoSpeak) {
      audioManager.speak(item.english, 'en-US');
    }
  }

  getWordKey(item) {
    return String(item?.id || item?.english || item?.vietnamese || '').trim().toLowerCase();
  }

  // Check the live answer without writing typed characters onto a falling target.
  updateTypingProgress(input) {
    if (!this.isRunning || this.isPaused) return false;
    const clean = input.trim().toLowerCase();

    // Gõ xóa sạch ô nhập thì bỏ khóa mục tiêu để lượt gõ kế tiếp tự chọn từ mới.
    if (!clean) {
      this.selectedTargetId = null;
      return false;
    }

    // Khóa mục tiêu trong lúc gõ, nhưng không sửa nội dung hay hình thức thẻ mục tiêu.
    let targetIndex = this.activeWords.findIndex(w => w.id === this.selectedTargetId && !w.isHit);
    if (targetIndex === -1 && clean) {
      targetIndex = this.activeWords.findIndex(w => !w.isHit && w.target.trim().toLowerCase().startsWith(clean));
      if (targetIndex === -1) targetIndex = this.activeWords.findIndex(w => !w.isHit);
      this.selectedTargetId = this.activeWords[targetIndex]?.id || null;
    }

    const w = this.activeWords[targetIndex];
    if (!w) return false;
    const targetClean = w.target.trim().toLowerCase();

    // Exact match reached -> AUTO SHOOT!
    if (clean && targetClean === clean) {
      this.triggerHit(targetIndex);
      return true;
    }

    if (clean && clean.length >= targetClean.length) {
      const accepted = AnswerChecker.check(clean, w.target, {
        caseSensitive: this.options.caseSensitive,
        acceptTypos: this.options.acceptTypos
      });
      if (accepted.correct) {
        this.triggerHit(targetIndex);
        return true;
      }
    }

    // Đã nhập đủ độ dài nhưng sai: mục tiêu tự rời sân, báo sai và mở khóa mục tiêu kế tiếp.
    if (clean.length >= targetClean.length && clean !== targetClean) {
      this.missTarget(targetIndex);
      return true;
    }
    return false;
  }

  missTarget(targetIndex) {
    const missedTarget = this.activeWords[targetIndex];
    if (!missedTarget) return;
    this.totalAttempts++;
    this.missedWords++;
    this.combo = 0;
    if (this.mode === 'survival') this.lives = Math.max(0, this.lives - 1);
    this.createExplosion(missedTarget.x + missedTarget.width / 2, missedTarget.y + missedTarget.height / 2, '#7bdcb5');
    if (missedTarget.rawItem?.id) {
      const updatedWord = SpacedRepetition.reviewWord(missedTarget.rawItem, false);
      vocabManager.updateWord(missedTarget.rawItem.id, updatedWord);
    }
    audioManager.playMiss();
    this.activeWords.splice(targetIndex, 1);
    this.selectedTargetId = null;
    this.onHudUpdate({ score: this.score, combo: 0, lives: this.lives });
    this.onAnswerFeedback({ correct: false, penalty: this.missPenalty, autoMiss: true });
    if (this.mode === 'survival' && this.lives <= 0) this.endGame('out_of_lives');
  }

  submitAnswer(input) {
    if (!this.isRunning || this.isPaused || !input.trim()) return false;

    let hitIndex = -1;

    for (let i = 0; i < this.activeWords.length; i++) {
      const w = this.activeWords[i];
      if (w.isHit) continue;
      let checkRes = AnswerChecker.check(input, w.target, {
        caseSensitive: this.options.caseSensitive,
        acceptTypos: this.options.acceptTypos
      });

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
      this.totalAttempts++;
      this.missedWords++;
      this.combo = 0;
      this.score = Math.max(0, this.score - this.missPenalty);
      audioManager.playMiss();
      this.onHudUpdate({ score: this.score, combo: 0 });
      this.onAnswerFeedback({ correct: false, penalty: this.missPenalty });
      this.selectedTargetId = null;
      return false;
    }
  }

  triggerHit(hitIndex) {
    const hitWord = this.activeWords[hitIndex];
    if (!hitWord || hitWord.isHit) return;
    this.totalAttempts++;
    this.correctAttempts++;
    
    this.combo++;
    if (this.combo > this.highestCombo) this.highestCombo = this.combo;

    const comboBonus = Math.min(this.combo * 10, 100);
    this.score += (100 + comboBonus);
    this.wordsShot++;
    this.scorePopups.push({
      x: hitWord.x + hitWord.width / 2,
      y: hitWord.y - 8,
      text: this.combo > 1 ? `+${100 + comboBonus}  COMBO ×${this.combo}` : `+${100 + comboBonus}`,
      life: 1
    });

    hitWord.isHit = true;
    this.fireWeaponAt(hitWord);

    audioManager.playLaser();

    // Update Spaced Repetition mastery
    if (hitWord.rawItem && hitWord.rawItem.id) {
      const updatedWord = SpacedRepetition.reviewWord(hitWord.rawItem, true, 1.5);
      vocabManager.updateWord(hitWord.rawItem.id, updatedWord);
    }

    this.selectedTargetId = null;

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
    const cannonX = this.canvas.width / 2;
    const cannonY = this.canvas.height - 112;
    const angle = Math.atan2(targetY - cannonY, targetX - cannonX);
    const muzzleX = cannonX + Math.cos(angle) * 14;
    const muzzleY = cannonY + Math.sin(angle) * 14;
    const color = level === 3 ? '#ff9b57' : (level === 2 ? '#9d88ff' : '#66eaff');
    const offsets = level === 2 ? [-12, 12] : [0];
    offsets.forEach(offset => {
      this.projectiles.push({
        targetId: target.id,
        x1: muzzleX - Math.sin(angle) * offset,
        y1: muzzleY + Math.cos(angle) * offset,
        targetX,
        targetY,
        x: muzzleX,
        y: muzzleY,
        progress: 0,
        speed: level === 3 ? 0.032 : 0.04,
        type: level === 3 ? 'missile' : 'bullet',
        color
      });
    });
    this.muzzleFlashes.push({
      x: muzzleX, y: muzzleY, life: 1, color,
    });
  }

  createExplosion(x, y, forcedColor = null) {
    const count = this.reducedEffects ? 12 : 32;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.2);
      const speed = 2.5 + Math.random() * 6;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02,
        color: forcedColor || ['#65e8ff', '#b9a0ff', '#ffb35f', '#fff2cf'][i % 4],
        size: 3 + Math.floor(Math.random() * 6)
      });
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - this.lastFrameTime) / 1000));
      this.update(deltaSeconds);
      this.render();
    }
    this.lastFrameTime = timestamp;

    requestAnimationFrame((t) => this.loop(t));
  }

  update(deltaSeconds = 1 / 60) {
    const frameScale = deltaSeconds * 60;
    // Update active words position
    for (let i = this.activeWords.length - 1; i >= 0; i--) {
      const w = this.activeWords[i];
      if (w.isHit) continue;
      w.y += w.vy * deltaSeconds;

      // Word reached bottom
      if (w.y + w.height >= this.canvas.height) {
        this.totalAttempts++;
        this.missedWords++;
        this.activeWords.splice(i, 1);
        if (w.id === this.selectedTargetId) {
          this.selectedTargetId = null;
          this.onAnswerFeedback({ correct: false, autoMiss: true });
        }
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

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += p.speed * frameScale;
      if (p.progress >= 1) {
        const targetIndex = this.activeWords.findIndex(word => word.id === p.targetId);
        if (targetIndex !== -1) {
          const [target] = this.activeWords.splice(targetIndex, 1);
          this.createExplosion(target.x + target.width / 2, target.y + target.height / 2, p.color);
          audioManager.playExplosion();
        }
        this.projectiles.splice(i, 1);
        continue;
      }
      p.x = p.x1 + (p.targetX - p.x1) * p.progress;
      p.y = p.y1 + (p.targetY - p.y1) * p.progress;
      if (p.type === 'missile' && Math.random() > 0.45) {
        this.particles.push({ x: p.x, y: p.y, vx: (Math.random() - .5), vy: 1.5, life: .7, decay: .08, color: '#7bdcb5', size: 4 });
      }
    }

    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      this.muzzleFlashes[i].life -= deltaSeconds * 8;
      if (this.muzzleFlashes[i].life <= 0) this.muzzleFlashes.splice(i, 1);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;
      p.life -= p.decay * frameScale;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const popup = this.scorePopups[i];
      popup.y -= 28 * deltaSeconds;
      popup.life -= deltaSeconds * 0.72;
      if (popup.life <= 0) this.scorePopups.splice(i, 1);
    }
  }

  render() {
    if (window.__wordShooterPixi) {
      window.__wordShooterPixi.render(this);
      return;
    }
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Fine star glints sit above the illustrated arena background.
    const now = performance.now() / 1000;
    for (let i = 0; i < (this.reducedEffects ? 20 : 64); i++) {
      const x = (i * 137.5 + 19) % width;
      const y = (i * 239.7 + 31) % height;
      const pulse = this.reducedEffects ? .5 : 0.36 + Math.sin(now * 1.7 + i) * 0.2;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = i % 7 === 0 ? '#9ef7ff' : '#e8e8ff';
      ctx.beginPath(); ctx.arc(x, y, i % 11 === 0 ? 1.5 : .8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Beam trails make each falling vocabulary capsule read as an incoming target.
    for (const w of this.activeWords) {
      const selected = w.id === this.selectedTargetId;
      ctx.save();
      const beam = ctx.createLinearGradient(0, w.y - 48, 0, w.y + 2);
      beam.addColorStop(0, 'rgba(95,211,255,0)'); beam.addColorStop(1, selected ? 'rgba(255,127,80,.62)' : 'rgba(88,193,255,.45)');
      ctx.fillStyle = beam; ctx.fillRect(w.x + w.width / 2 - 1, Math.max(0, w.y - 50), 2, 50);
      const cut = Math.min(16, w.height / 3);
      ctx.beginPath(); ctx.moveTo(w.x + cut, w.y); ctx.lineTo(w.x + w.width - cut, w.y); ctx.lineTo(w.x + w.width, w.y + cut); ctx.lineTo(w.x + w.width, w.y + w.height - cut); ctx.lineTo(w.x + w.width - cut, w.y + w.height); ctx.lineTo(w.x + cut, w.y + w.height); ctx.lineTo(w.x, w.y + w.height - cut); ctx.lineTo(w.x, w.y + cut); ctx.closePath();
      ctx.fillStyle = selected ? 'rgba(90,25,56,.94)' : 'rgba(11,28,72,.91)';
      ctx.shadowColor = selected ? '#ff654f' : '#60bfff'; ctx.shadowBlur = this.reducedEffects ? 0 : (selected ? 26 : 14); ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = selected ? 2.2 : 1.4; ctx.strokeStyle = selected ? '#ff8967' : '#79cbff'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 11px "DM Sans", sans-serif'; ctx.fillStyle = selected ? '#ffe1b1' : '#bdefff';
      ctx.fillText(w.prompt, w.x + w.width / 2, w.y + 18, w.width - 18);
      const targetSize = Math.min(21, Math.max(14, 265 / Math.max(w.target.length, 9)));
      ctx.font = `800 ${targetSize}px "DM Sans", sans-serif`; ctx.fillStyle = selected ? '#fff5cf' : '#fff1a6';
      ctx.shadowColor = '#87caff'; ctx.shadowBlur = this.reducedEffects ? 0 : 8;
      ctx.fillText(w.target, w.x + w.width / 2, w.y + 48, w.width - 20);
      ctx.restore();
    }

    // A bright physical bolt travels from the fighter to the exact target.
    for (const p of this.projectiles) {
      ctx.save();
      const angle = Math.atan2(p.targetY - p.y1, p.targetX - p.x1);
      ctx.translate(p.x, p.y); ctx.rotate(angle);
      ctx.globalAlpha = .42; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = this.reducedEffects ? 0 : 22;
      ctx.fillRect(-26, -3, 36, 6);
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(5, 0, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    for (const flash of this.muzzleFlashes) {
      ctx.save(); ctx.globalAlpha = flash.life; ctx.fillStyle = '#fff'; ctx.shadowColor = flash.color; ctx.shadowBlur = 28;
      ctx.beginPath(); ctx.arc(flash.x, flash.y, 9 + (1 - flash.life) * 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    for (const p of this.particles) {
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.4, (p.size || 4) * p.life), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    for (const popup of this.scorePopups) {
      ctx.save(); ctx.globalAlpha = Math.max(0, popup.life); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `800 ${popup.text.includes('COMBO') ? 19 : 22}px "Barlow Condensed", sans-serif`;
      ctx.fillStyle = '#ffe38c'; ctx.shadowColor = '#ff9046'; ctx.shadowBlur = this.reducedEffects ? 0 : 16;
      ctx.fillText(popup.text, popup.x, popup.y); ctx.restore();
    }

    const cx = width / 2;
    const shipY = height - 76;
    const activeTarget = this.activeWords.find(w => !w.isHit);
    let aimX = cx; let aimY = 0;
    if (activeTarget) { aimX = activeTarget.x + activeTarget.width / 2; aimY = activeTarget.y + activeTarget.height / 2; }
    const angle = Math.atan2(aimY - shipY, aimX - cx);
    ctx.save(); ctx.translate(cx, shipY); ctx.rotate(angle + Math.PI / 2);
    ctx.shadowColor = '#30cfff'; ctx.shadowBlur = this.reducedEffects ? 4 : 24;
    if (this.shipSprite.complete && this.shipSprite.naturalWidth) ctx.drawImage(this.shipSprite, -48, -61, 96, 96);
    else {
      ctx.fillStyle = '#dcecff'; ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(33, 31); ctx.lineTo(0, 18); ctx.lineTo(-33, 31); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
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



