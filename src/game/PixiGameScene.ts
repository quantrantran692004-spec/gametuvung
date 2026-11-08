// @ts-ignore shared theme data
import { getGameTheme } from '../../js/game-themes.js';
// @ts-ignore JS helper shared with engine tests
import { characterStates } from '../../js/typing-feedback.js';
import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import projectileAsset from '../../assets/game-themes/projectile.webp';
import shipAsset from '../../assets/player-starfighter.webp';
import swordAsset from '../../assets/game-themes/flying-sword.webp';
import ornateFlyingSword from '../../assets/game-themes/flying-ornate.webp';
import ornateCardAsset from '../../assets/game-themes/word-ornate.webp';
import player1 from '../../assets/game-themes/player-1.webp';
import player3 from '../../assets/game-themes/player-3.webp';
import player4 from '../../assets/game-themes/player-4.webp';
import player5 from '../../assets/game-themes/player-5.webp';
import player6 from '../../assets/game-themes/player-6.webp';
import player7 from '../../assets/game-themes/player-7.webp';
import player8 from '../../assets/game-themes/player-8.webp';
import player9 from '../../assets/game-themes/player-9.webp';
import player10 from '../../assets/game-themes/player-10.webp';
import card1 from '../../assets/game-themes/card-1.webp';
import card3 from '../../assets/game-themes/card-3.webp';
import card4 from '../../assets/game-themes/card-4.webp';
import card5 from '../../assets/game-themes/card-5.webp';
import card6 from '../../assets/game-themes/card-6.webp';
import card7 from '../../assets/game-themes/card-7.webp';
import card8 from '../../assets/game-themes/card-8.webp';
import card9 from '../../assets/game-themes/card-9.webp';
import card10 from '../../assets/game-themes/card-10.webp';

type PointParticle = { x: number; y: number; life: number; size?: number; color: string };
type WordTarget = { id: string; x: number; y: number; width: number; height: number; prompt: string; target: string; typedInput?: string; isHit?: boolean };
type EngineFrame = {
  canvas: HTMLCanvasElement;
  activeWords: WordTarget[];
  selectedTargetId?: string | null;
  projectiles: Array<{ x: number; y: number; x1: number; y1: number; targetX: number; targetY: number; color: string; type: string }>;
  particles: PointParticle[];
  muzzleFlashes: Array<{ x: number; y: number; life: number; color: string }>;
  scorePopups: Array<{ x: number; y: number; life: number; text: string }>;
};
type WordVisual = { root: Container; beam: Graphics; body: Graphics; prompt: Text; answer: Text; letters: Container; art: Sprite | null; letterKey: string };

type Star = { node: Graphics; speed: number; phase: number };

export default class PixiGameScene {
  private app: Application;
  private reduced: boolean;
  private theme = getGameTheme('0');
  private words = new Map<string, WordVisual>();
  private stars: Star[] = [];
  private ship: Sprite | null = null;
  private cardTexture: Texture | null = null;
  private floral = false;
  private boltPool: Graphics[] = [];
  private projectileTexture: Texture | null = null;
  private projectileSprites: Sprite[] = [];
  private particlePool: Graphics[] = [];
  private flashPool: Graphics[] = [];
  private scorePool: Text[] = [];

  constructor(app: Application, reducedEffects = false) {
    this.app = app;
    this.reduced = reducedEffects;
  }

  async initialize() {
    let theme = '0';
    try { theme = localStorage.getItem('word-shooter-game-theme') || '0'; } catch { /* Default. */ }
    this.theme = getGameTheme(theme);
    this.projectileTexture = await Assets.load<Texture>(projectileAsset);
    this.floral = ['1', '2', '3'].includes(theme);
    const cardAssets: Record<string, string> = { '1': card1, '2': ornateCardAsset, '3': card3, '4': card4, '5': card5, '6': card6, '7': card7, '8': card8, '9': card9, '10': card10 };
    if (cardAssets[theme]) this.cardTexture = await Assets.load<Texture>(cardAssets[theme]);
    const players: Record<string, string> = { '1': player1, '2': ornateFlyingSword, '3': player3, '4': player4, '5': player5, '6': player6, '7': player7, '8': player8, '9': player9, '10': player10 };
    const texture = await Assets.load<Texture>(players[theme] || (theme === '0' ? shipAsset : swordAsset));
    this.ship = new Sprite(texture);
    this.ship.anchor.set(0.5);
    this.ship.width = theme === '0' ? 106 : (Number(theme) <= 6 ? 220 : 110);
    this.ship.height = theme === '0' ? 104 : (Number(theme) <= 6 ? 148 : 160);
    this.app.stage.addChild(this.ship);

    const starCount = this.reduced ? 20 : 58;
    for (let i = 0; i < starCount; i++) {
      const star = new Graphics();
      const radius = i % 9 === 0 ? 1.45 : 0.75;
      star.circle(0, 0, radius).fill(i % 5 === 0 ? 0x94eaff : 0xe7eaff);
      star.x = Math.random() * this.app.screen.width;
      star.y = Math.random() * this.app.screen.height;
      this.app.stage.addChildAt(star, 0);
      this.stars.push({ node: star, speed: 5 + Math.random() * 14, phase: Math.random() * Math.PI * 2 });
    }
  }

  private createWord(word: WordTarget): WordVisual {
    const root = new Container();
    const beam = new Graphics();
    const body = new Graphics();
    const prompt = new Text({ text: word.prompt, style: { fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: '600', fill: 0xb5dcff, align: 'center' } });
    const answer = new Text({ text: word.target, style: { fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: '700', fill: 0xffffff, align: 'center' } });
    prompt.anchor.set(0.5);
    answer.anchor.set(0.5);
    const letters = new Container();
    const art = this.cardTexture ? new Sprite(this.cardTexture) : null;
    root.addChild(beam, body);
    if (art) root.addChild(art);
    root.addChild(prompt, answer, letters);
    this.app.stage.addChild(root);
    return { root, beam, body, prompt, answer, letters, art, letterKey: '' };
  }

  private graphicAt(pool: Graphics[], index: number) {
    if (!pool[index]) {
      pool[index] = new Graphics();
      this.app.stage.addChild(pool[index]);
    }
    return pool[index];
  }

  render(frame: EngineFrame) {
    const width = this.app.screen.width || frame.canvas.width;
    const height = this.app.screen.height || frame.canvas.height;
    const time = performance.now() / 1000;

    for (const [index, star] of this.stars.entries()) {
      star.node.alpha = this.reduced ? 0.48 : 0.28 + (Math.sin(time * 1.4 + star.phase) + 1) * 0.23;
      if (!this.reduced) {
        star.node.y += star.speed / 60;
        if (star.node.y > height) star.node.y = 0;
      }
      if (star.node.x > width) star.node.x = 0;
    }

    const activeIds = new Set(frame.activeWords.map(word => word.id));
    for (const [id, visual] of this.words) {
      if (!activeIds.has(id)) {
        this.app.stage.removeChild(visual.root);
        visual.root.destroy({ children: true });
        this.words.delete(id);
      }
    }

    for (const word of frame.activeWords) {
      const visual = this.words.get(word.id) || this.createWord(word);
      this.words.set(word.id, visual);
      const selected = word.id === frame.selectedTargetId;
      const themed = this.theme.name !== "Mặc định";
      const glow = selected ? (themed ? 0x38ba85 : 0xff765d) : this.theme.accent;
      const x = word.x;
      const y = word.y;
      const cut = Math.min(14, word.height / 3);
      visual.root.position.set(x, y);
      visual.beam.clear();
      visual.beam.moveTo(word.width / 2, -49).lineTo(word.width / 2, 0).stroke({ color: glow, width: 2, alpha: selected ? 0.68 : 0.36 });
      visual.body.clear();
      if (visual.art) { visual.art.position.set(-16, -22); visual.art.width = word.width + 32; visual.art.height = word.height + 45; }
      if (!visual.art) {
      visual.body.roundRect(-2, -2, word.width + 4, word.height + 4, cut + 3).stroke({ color: glow, width: 2, alpha: selected ? 0.65 : 0.32 });
      visual.body.roundRect(0, 0, word.width, word.height, cut).fill({ color: themed ? this.theme.card : (selected ? 0x4a203e : 0x0d1c4a), alpha: 0.97 }).stroke({ color: glow, width: selected ? 2.2 : 1.5, alpha: 0.98 });
      visual.body.roundRect(5, 4, word.width - 10, 22, 8).fill({ color: 0xffffff, alpha: themed ? 0.22 : 0.06 });
      if (themed) {
        visual.body.roundRect(4, 4, word.width - 8, word.height - 8, Math.max(4, cut - 3)).stroke({ color: this.theme.accent, width: 1.3, alpha: .8 });
        visual.body.circle(6, 6, 4).fill({ color: this.theme.accent });
        visual.body.circle(word.width - 6, 6, 4).fill({ color: this.theme.accent });
        visual.body.circle(6, word.height - 6, 4).fill({ color: this.theme.accent });
        visual.body.circle(word.width - 6, word.height - 6, 4).fill({ color: this.theme.accent });
      }
      }
      visual.prompt.text = word.prompt;
      const floralCard = Boolean(visual.art && this.floral);
      const promptWidth = floralCard ? (word.width + 32) * 0.64 : word.width - 24;
      const answerWidth = floralCard ? (word.width + 32) * 0.57 : word.width - 24;
      const answerY = visual.art && !this.floral ? 27 : floralCard ? 61 : 49;
      visual.prompt.position.set(word.width / 2, visual.art && !this.floral ? 6 : 20);
      visual.prompt.style = { fontFamily: 'DM Sans, sans-serif', fontSize: themed ? 15 : 11, fontWeight: '700', fill: themed ? this.theme.ink : (selected ? 0xffc58b : 0xb5dcff), align: 'center' };
      visual.prompt.scale.set(1);
      visual.prompt.scale.x = Math.min(1, promptWidth / Math.max(1, visual.prompt.width));
      visual.answer.text = '•'.repeat(Array.from(word.target).length);
      visual.answer.position.set(word.width / 2, answerY);
      const fontSize = Math.min(themed ? 27 : 21, Math.max(14, (themed ? 330 : 265) / Math.max(word.target.length, 9)));
      visual.answer.style = { fontFamily: 'DM Sans, sans-serif', fontSize, fontWeight: '700', fill: this.floral ? 0xffffff : this.theme.ink, align: 'center' };
      visual.answer.scale.set(1);
      visual.answer.scale.x = Math.min(1, answerWidth / Math.max(1, visual.answer.width));
      const letterKey = `${selected ? word.typedInput || '' : ''}|${word.target}|${fontSize}`;
      visual.answer.visible = !selected || !word.typedInput;
      if (visual.letterKey !== letterKey) {
        visual.letterKey = letterKey;
        visual.letters.removeChildren().forEach(child => child.destroy());
      if (selected && word.typedInput) {
        const chars = Array.from(word.target);
        const statuses = characterStates(word.target, word.typedInput);
        const nodes = chars.map((_, index) => new Text({ text: Array.from(word.typedInput || '')[index] || '•', style: { fontFamily: 'DM Sans, sans-serif', fontSize, fontWeight: '700', fill: statuses[index] === 'correct' ? 0x54e69a : statuses[index] === 'wrong' ? 0xffa3ae : (this.floral ? 0xffffff : this.theme.ink) } }));
        const total = nodes.reduce((sum, node) => sum + node.width, 0);
        let left = (word.width - total) / 2;
        for (const node of nodes) { node.position.set(left, answerY - node.height / 2); visual.letters.addChild(node); left += node.width; }
        visual.letters.pivot.x = word.width / 2;
        visual.letters.position.x = word.width / 2;
        visual.letters.scale.x = Math.min(1, answerWidth / Math.max(1, total));
      }
      }
    }

    frame.projectiles.forEach((bolt, index) => {
      const graphic = this.graphicAt(this.boltPool, index);
      const angle = Math.atan2(bolt.targetY - bolt.y1, bolt.targetX - bolt.x1);
      graphic.clear();
      graphic.position.set(bolt.x, bolt.y);
      graphic.rotation = angle;
      // Layered luminous trail, blade, guard and sparks.
      graphic.moveTo(-75, 0).lineTo(-8, -7).lineTo(-8, 7).closePath().fill({ color: 0x67eaff, alpha: .20 });
      graphic.moveTo(-62, 0).lineTo(-8, -3).lineTo(-8, 3).closePath().fill({ color: 0xffffff, alpha: .72 });
      graphic.ellipse(0, 0, 25, 11).fill({ color: 0x8cefff, alpha: .25 });
      graphic.moveTo(-9, -5).lineTo(24, 0).lineTo(-9, 5).closePath().fill({ color: 0xd8ffff, alpha: 1 });
      graphic.moveTo(-9, -2).lineTo(24, 0).lineTo(-9, 1).closePath().fill({ color: 0x51d8ff, alpha: .95 });
      graphic.moveTo(-12, -11).lineTo(-7, -5).lineTo(-7, 5).lineTo(-12, 11).lineTo(-15, 8).lineTo(-12, 0).lineTo(-15, -8).closePath().fill({ color: 0xffd46d });
      graphic.roundRect(-24, -2, 12, 4, 2).fill({ color: 0xe3b44b });
      graphic.circle(-34, -9, 2).fill({ color: 0xfaf7bd, alpha: .9 });
      graphic.circle(-51, 6, 1.5).fill({ color: 0xc3ffff, alpha: .9 });
      graphic.alpha = 1;
      if (this.projectileTexture) {
        let sprite = this.projectileSprites[index];
        if (!sprite) { sprite = new Sprite(this.projectileTexture); sprite.anchor.set(.65, .5); this.app.stage.addChild(sprite); this.projectileSprites[index] = sprite; }
        sprite.position.set(bolt.x, bolt.y); sprite.rotation = angle; sprite.width = 122; sprite.height = 42; sprite.alpha = 1;
      }
    });
    for (let i = frame.projectiles.length; i < this.boltPool.length; i++) this.boltPool[i].alpha = 0;
    for (let i = frame.projectiles.length; i < this.projectileSprites.length; i++) this.projectileSprites[i].alpha = 0;

    frame.particles.forEach((particle, index) => {
      const graphic = this.graphicAt(this.particlePool, index);
      graphic.clear();
      graphic.position.set(particle.x, particle.y);
      const radius = Math.max(1, (particle.size || 4) * particle.life);
      graphic.circle(0, 0, radius * 2.2).fill({ color: particle.color, alpha: Math.max(0, particle.life * .18) });
      graphic.moveTo(0, -radius * 2).lineTo(radius * .5, 0).lineTo(0, radius * 2).lineTo(-radius * .5, 0).closePath().fill({ color: 0xeaffff, alpha: Math.max(0, particle.life) });
      graphic.moveTo(-radius * 2, 0).lineTo(0, -radius * .5).lineTo(radius * 2, 0).lineTo(0, radius * .5).closePath().fill({ color: particle.color, alpha: Math.max(0, particle.life) });
    });
    for (let i = frame.particles.length; i < this.particlePool.length; i++) this.particlePool[i].alpha = 0;

    frame.muzzleFlashes.forEach((flash, index) => {
      const graphic = this.graphicAt(this.flashPool, index);
      graphic.clear();
      graphic.position.set(flash.x, flash.y);
      graphic.alpha = Math.max(0, flash.life);
      graphic.circle(0, 0, 8 + (1 - flash.life) * 10).fill({ color: 0xffffff, alpha: 0.95 });
      graphic.circle(0, 0, 16).stroke({ color: flash.color, width: 3, alpha: 0.65 });
    });
    for (let i = frame.muzzleFlashes.length; i < this.flashPool.length; i++) this.flashPool[i].alpha = 0;

    frame.scorePopups.forEach((popup, index) => {
      let text = this.scorePool[index];
      if (!text) {
        text = new Text({ text: '', style: { fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: '800', fill: 0xffe38c, align: 'center' } });
        text.anchor.set(0.5);
        this.app.stage.addChild(text);
        this.scorePool[index] = text;
      }
      text.text = popup.text;
      text.position.set(popup.x, popup.y);
      text.alpha = Math.max(0, popup.life);
    });
    for (let i = frame.scorePopups.length; i < this.scorePool.length; i++) this.scorePool[i].alpha = 0;

    if (this.ship) {
      const target = frame.activeWords.find(word => !word.isHit);
      const targetX = target ? target.x + target.width / 2 : width / 2;
      const targetY = target ? target.y + target.height / 2 : 0;
      this.ship.position.set(width / 2, height - (this.theme.name === 'Mặc định' ? 76 : Math.min(180, height * .20)));
      this.ship.rotation = this.theme.name !== 'Mặc định' ? 0 : Math.atan2(targetY - this.ship.y, targetX - this.ship.x) + Math.PI / 2;
      this.ship.alpha = 1;
    }

    this.app.renderer.render({ container: this.app.stage });
  }

  destroy() {
    this.words.clear();
    this.stars.length = 0;
    this.boltPool.length = 0;
    this.projectileSprites.length = 0;
    this.projectileTexture = null;
    this.particlePool.length = 0;
    this.flashPool.length = 0;
    this.scorePool.length = 0;
    this.ship = null;
  }
}
