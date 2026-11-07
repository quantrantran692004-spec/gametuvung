import { db } from './db.js?v=31';

export class ProfileManager {
  constructor() {
    this.currentProfile = null;
    this.profiles = [];
  }

  async init() {
    this.profiles = await db.getAll('profiles');
    if (this.profiles.length === 0) {
      // Create default Guest profile
      const defaultProfile = {
        id: 'guest_' + Date.now(),
        name: 'Guest Player',
        avatar: '🚀',
        isGuest: true,
        createdAt: new Date().toISOString(),
        settings: {
          language: 'vi',
          perfProfile: 'balanced',
          reducedEffects: false,
          soundEnabled: true,
          voiceEnabled: true,
          voiceName: '',
          voiceRate: 0.68,
          wordDirection: 'en-vi',
          speed: 'normal',
          lives: 5,
          timerDuration: 60,
          caseSensitive: false,
          acceptTypos: true
        }
      };
      await db.put('profiles', defaultProfile);
      this.profiles = [defaultProfile];
    }

    // Earlier releases created every player with speech disabled by default.
    // Speech is now part of the selected game loop; migrate that old default once.
    for (const profile of this.profiles) {
      profile.settings ||= {};
      if (!profile.settings.voicePreferenceVersion) {
        profile.settings.voiceEnabled = true;
        profile.settings.voicePreferenceVersion = 1;
        await db.put('profiles', profile);
      }
    }

    const savedId = localStorage.getItem('ws_active_profile');
    this.currentProfile = this.profiles.find(p => p.id === savedId) || this.profiles[0];
    localStorage.setItem('ws_active_profile', this.currentProfile.id);
    return this.currentProfile;
  }

  getCurrentProfile() {
    return this.currentProfile;
  }

  async switchProfile(profileId) {
    const found = this.profiles.find(p => p.id === profileId);
    if (found) {
      this.currentProfile = found;
      localStorage.setItem('ws_active_profile', found.id);
      return found;
    }
    return null;
  }

  async createProfile(name, avatar = '👾') {
    const newProfile = {
      id: 'prof_' + Date.now(),
      name: name.trim() || 'Pilot',
      avatar: avatar,
      isGuest: false,
      createdAt: new Date().toISOString(),
      settings: { ...this.currentProfile.settings }
    };
    await db.put('profiles', newProfile);
    this.profiles.push(newProfile);
    await this.switchProfile(newProfile.id);
    return newProfile;
  }

  async setAvatar(avatar) {
    if (!this.currentProfile || !(avatar === '🚀' || /^avatar-(?:[1-9]|1[0-2])$/.test(avatar))) return false;
    this.currentProfile.avatar = avatar;
    await db.put('profiles', this.currentProfile);
    return true;
  }

  async updateSettings(newSettings) {
    if (!this.currentProfile) return;
    this.currentProfile.settings = { ...this.currentProfile.settings, ...newSettings };
    await db.put('profiles', this.currentProfile);
  }
}

export const profileManager = new ProfileManager();
