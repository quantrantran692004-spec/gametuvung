import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import shipAsset from '../../assets/player-starfighter.webp';

type PointParticle = { x: number; y: number; life: number; size?: number; color: string };
type WordTarget = { id: string; x: number; y: number; width: number; height: number; prompt: string; target: string; isHit?: boolean };
type EngineFrame = {
  canvas: HTMLCanvasElement;
  activeWords: WordTarget[];
  selectedTargetId?: string | null;
  projectiles: Array<{ x: number; y: number; x1: number; y1: number; targetX: number; targetY: number; color: string; type: string }>;
  particles: PointParticle[];
  muzzleFlashes: Array<{ x: number; y: number; life: number; color: string }>;
  scorePopups: Array<{ x: number; y: number; life: number; text: string }>;
};
type WordVisual = { root: Container; beam: Graphics; body: Graphics; prompt: Text; answer: Text };

type Star = { node: Graphics; speed: number; phase: number };

export default class PixiGameScene {
  private app: Application;
  private reduced: boolean;
  private words = new Map<string, WordVisual>();
  private stars: Star[] = [];
  private ship: Sprite | null = null;
  private boltPool: Graphics[] = [];
  private particlePool: Graphics[] = [];
  private flashPool: Graphics[] = [];
  private scorePool: Text[] = [];

  constructor(app: Application, reducedEffects = false) {
    this.app = app;
    this.reduced = reducedEffects;
  }

  async initialize() {
    const texture = await Assets.load<Texture>(shipAsset);
    this.ship = new Sprite(texture);
    this.ship.anchor.set(0.5);
    this.ship.width = 106;
    this.ship.height = 104;
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
    root.addChild(beam, body, prompt, answer);
    this.app.stage.addChild(root);
    return { root, beam, body, prompt, answer };
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
      const glow = selected ? 0xff765d : 0x65c9ff;
      const x = word.x;
      const y = word.y;
      const cut = Math.min(14, word.height / 3);
      visual.root.position.set(x, y);
      visual.beam.clear();
      visual.beam.moveTo(word.width / 2, -49).lineTo(word.width / 2, 0).stroke({ color: glow, width: 2, alpha: selected ? 0.68 : 0.36 });
      visual.body.clear();
      visual.body.roundRect(-2, -2, word.width + 4, word.height + 4, cut + 3).stroke({ color: glow, width: 2, alpha: selected ? 0.65 : 0.32 });
      visual.body.roundRect(0, 0, word.width, word.height, cut).fill({ color: selected ? 0x4a203e : 0x0d1c4a, alpha: 0.95 }).stroke({ color: glow, width: selected ? 2.2 : 1.5, alpha: 0.98 });
      visual.body.roundRect(5, 4, word.width - 10, 22, 8).fill({ color: 0xffffff, alpha: 0.06 });
      visual.prompt.text = word.prompt;
      visual.prompt.position.set(word.width / 2, 20);
      visual.prompt.style = { fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: '600', fill: selected ? 0xffc58b : 0xb5dcff, align: 'center' };
      visual.answer.text = word.target;
      visual.answer.position.set(word.width / 2, 49);
      const fontSize = Math.min(21, Math.max(14, 265 / Math.max(word.target.length, 9)));
      visual.answer.style = { fontFamily: 'DM Sans, sans-serif', fontSize, fontWeight: '700', fill: 0xffffff, align: 'center' };
    }

    frame.projectiles.forEach((bolt, index) => {
      const graphic = this.graphicAt(this.boltPool, index);
      const angle = Math.atan2(bolt.targetY - bolt.y1, bolt.targetX - bolt.x1);
      graphic.clear();
      graphic.position.set(bolt.x, bolt.y);
      graphic.rotation = angle;
      graphic.rect(-27, -3, 36, 6).fill({ color: bolt.color, alpha: 0.44 });
      graphic.ellipse(5, 0, 13, 4).fill({ color: 0xffffff, alpha: 0.98 });
      graphic.alpha = 1;
    });
    for (let i = frame.projectiles.length; i < this.boltPool.length; i++) this.boltPool[i].alpha = 0;

    frame.particles.forEach((particle, index) => {
      const graphic = this.graphicAt(this.particlePool, index);
      graphic.clear();
      graphic.position.set(particle.x, particle.y);
      graphic.circle(0, 0, Math.max(1, (particle.size || 4) * particle.life)).fill({ color: particle.color, alpha: Math.max(0, particle.life) });
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
      this.ship.position.set(width / 2, height - 76);
      this.ship.rotation = Math.atan2(targetY - this.ship.y, targetX - this.ship.x) + Math.PI / 2;
      this.ship.alpha = 1;
    }

    this.app.renderer.render({ container: this.app.stage });
  }

  destroy() {
    this.words.clear();
    this.stars.length = 0;
    this.boltPool.length = 0;
    this.particlePool.length = 0;
    this.flashPool.length = 0;
    this.scorePool.length = 0;
    this.ship = null;
  }
}
