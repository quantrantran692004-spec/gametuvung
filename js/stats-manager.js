import { db } from './db.js?v=18';

export class StatsManager {
  async saveSession(sessionData) {
    const record = {
      id: 'sess_' + Date.now(),
      profileId: sessionData.profileId,
      mode: sessionData.mode,
      score: sessionData.score,
      wordsShot: sessionData.wordsShot,
      missedWords: sessionData.missedWords || 0,
      accuracy: sessionData.accuracy,
      highestCombo: sessionData.highestCombo,
      duration: sessionData.duration,
      playedAt: new Date().toISOString()
    };
    await db.put('sessions', record);
    return record;
  }

  async getProfileStats(profileId) {
    const allSessions = await db.getAll('sessions');
    const userSessions = allSessions.filter(s => s.profileId === profileId);

    const totalGames = userSessions.length;
    const totalWords = userSessions.reduce((acc, s) => acc + (s.wordsShot || 0), 0);
    const highestScore = userSessions.reduce((max, s) => Math.max(max, s.score || 0), 0);
    const avgAccuracy = totalGames > 0
      ? Math.round(userSessions.reduce((acc, s) => acc + (s.accuracy || 0), 0) / totalGames)
      : 0;

    return {
      totalGames,
      totalWords,
      highestScore,
      avgAccuracy,
      recentSessions: userSessions.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 10)
    };
  }
}

export const statsManager = new StatsManager();
