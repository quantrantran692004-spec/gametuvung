// Procedural Audio Engine via Web Audio API + SpeechSynthesis
class AudioManager {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.voiceName = '';
    this.voiceRate = 0.68;
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
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.15);
  }

  playExplosion() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.3);
  }

  playMiss() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.setValueAtTime(180, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.2);
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
