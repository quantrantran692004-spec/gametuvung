import { Howl } from 'howler';
import laserSfx from '../assets/audio/laser.wav';
import impactSfx from '../assets/audio/impact.wav';
import missSfx from '../assets/audio/miss.wav';

// Howler effects + SpeechSynthesis pronunciation.
class AudioManager {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.voiceName = '';
    this.voiceRate = 0.68;
    this.effects = {
      laser: new Howl({ src: [laserSfx], volume: 0.3, preload: true }),
      impact: new Howl({ src: [impactSfx], volume: 0.36, preload: true }),
      miss: new Howl({ src: [missSfx], volume: 0.2, preload: true })
    };
    this.voices = [];
    this.voicesReady = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
      this.refreshVoices();
    }
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  refreshVoices() {
    if (!window.speechSynthesis) return [];
    const all = window.speechSynthesis.getVoices();
    this.voices = all
      .filter(voice => /^en(-|_)/i.test(voice.lang || ''))
      .sort((a, b) => {
        const aPreferred = /en-US|en-GB/i.test(a.lang) ? 0 : 1;
        const bPreferred = /en-US|en-GB/i.test(b.lang) ? 0 : 1;
        return aPreferred - bPreferred || a.name.localeCompare(b.name);
      });
    this.voicesReady = true;
    return this.voices;
  }

  getEnglishVoices() {
    return this.voices.length ? this.voices : this.refreshVoices();
  }

  setVoice(name, rate) {
    this.voiceName = name || '';
    const parsedRate = Number(rate);
    if (Number.isFinite(parsedRate)) this.voiceRate = Math.min(1.15, Math.max(0.45, parsedRate));
  }

  playLaser() {
    if (!this.soundEnabled) return;
    this.effects.laser.play();
  }

  playExplosion() {
    if (!this.soundEnabled) return;
    this.effects.impact.play();
  }

  playMiss() {
    if (!this.soundEnabled) return;
    this.effects.miss.play();
  }

  speak(text, lang = 'en-US') {
    if (!this.voiceEnabled || !window.speechSynthesis || !text) return;
    try {
      const synthesis = window.speechSynthesis;
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text));
      utterance.lang = lang;
      utterance.rate = this.voiceRate;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voices = this.getEnglishVoices();
      const selected = voices.find(voice => voice.name === this.voiceName)
        || voices.find(voice => voice.lang?.toLowerCase() === lang.toLowerCase())
        || voices.find(voice => /^en-US/i.test(voice.lang || ''))
        || voices.find(voice => /^en/i.test(voice.lang || ''));
      if (selected) utterance.voice = selected;
      synthesis.speak(utterance);
    } catch (error) {
      console.warn('Speech synthesis error:', error);
    }
  }
}

export const audioManager = new AudioManager();
