import AsyncStorage from '@react-native-async-storage/async-storage';

class GameService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.userStats = {
      level: 1,
      xp: 0,
      badges: [],
      achievements: [],
      streaks: {
        safeDriving: 0,
        ecoRoutes: 0,
        communityReports: 0,
      },
      challenges: {
        daily: [],
        weekly: [],
      },
      leaderboard: {
        rank: 0,
        score: 0,
      },
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadUserStats();
      await this.initializeChallenges();
      this.isInitialized = true;
      console.log('GameService initialized successfully');
    } catch (error) {
      console.error('GameService initialization failed:', error);
      throw error;
    }
  }

  async loadUserStats() {
    try {
      const savedStats = await AsyncStorage.getItem('userGameStats');
      if (savedStats) {
        this.userStats = { ...this.userStats, ...JSON.parse(savedStats) };
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async saveUserStats() {
    try {
      await AsyncStorage.setItem('userGameStats', JSON.stringify(this.userStats));
    } catch (error) {
      console.error('Error saving user stats:', error);
    }
  }

  async initializeChallenges() {
    const today = new Date().toDateString();
    const thisWeek = this.getWeekString();

    // Check if we need new daily challenges
    const lastDailyUpdate = await AsyncStorage.getItem('lastDailyUpdate');
    if (lastDailyUpdate !== today) {
      this.userStats.challenges.daily = this.generateDailyChallenges();
      await AsyncStorage.setItem('lastDailyUpdate', today);
    }

    // Check if we need new weekly challenges
    const lastWeeklyUpdate = await AsyncStorage.getItem('lastWeeklyUpdate');
    if (lastWeeklyUpdate !== thisWeek) {
      this.userStats.challenges.weekly = this.generateWeeklyChallenges();
      await AsyncStorage.setItem('lastWeeklyUpdate', thisWeek);
    }

    await this.saveUserStats();
  }

  generateDailyChallenges() {
    const challenges = [
      {
        id: 'safe_drive_10km',
        title: 'Safe Navigator',
        description: 'Drive 10km without manual interactions',
        target: 10,
        current: 0,
        reward: { xp: 50, badge: 'safe_navigator' },
        type: 'distance',
      },
      {
        id: 'eco_route_3',
        title: 'Eco Warrior',
        description: 'Use eco routes 3 times',
        target: 3,
        current: 0,
        reward: { xp: 30, badge: 'eco_warrior' },
        type: 'count',
      },
      {
        id: 'voice_commands_5',
        title: 'Voice Master',
        description: 'Use 5 voice commands',
        target: 5,
        current: 0,
        reward: { xp: 25 },
        type: 'count',
      },
    ];

    return challenges;
  }

  generateWeeklyChallenges() {
    const challenges = [
      {
        id: 'safe_week',
        title: 'Safety Champion',
        description: 'Complete 7 days of safe driving',
        target: 7,
        current: 0,
        reward: { xp: 200, badge: 'safety_champion' },
        type: 'streak',
      },
      {
        id: 'community_guardian',
        title: 'Community Guardian',
        description: 'Moderate 10 hazard reports',
        target: 10,
        current: 0,
        reward: { xp: 150, badge: 'community_guardian' },
        type: 'count',
      },
      {
        id: 'eco_master',
        title: 'Eco Master',
        description: 'Save 5kg of CO2 emissions',
        target: 5,
        current: 0,
        reward: { xp: 100, badge: 'eco_master' },
        type: 'accumulate',
      },
    ];

    return challenges;
  }

  // Progress tracking methods
  trackSafeDriving(distance) {
    this.updateChallenge('safe_drive_10km', distance);
    this.userStats.streaks.safeDriving++;
    this.addXP(5); // Base XP for safe driving
    this.checkAchievements();
    this.saveUserStats();
  }

  trackEcoRoute() {
    this.updateChallenge('eco_route_3', 1);
    this.userStats.streaks.ecoRoutes++;
    this.addXP(10);
    this.checkAchievements();
    this.saveUserStats();
  }

  trackVoiceCommand() {
    this.updateChallenge('voice_commands_5', 1);
    this.addXP(2);
    this.saveUserStats();
  }

  trackCommunityModeration() {
    this.updateChallenge('community_guardian', 1);
    this.addXP(15);
    this.checkAchievements();
    this.saveUserStats();
  }

  trackCarbonSaved(amount) {
    this.updateChallenge('eco_master', amount);
    this.addXP(Math.floor(amount * 5));
    this.saveUserStats();
  }

  updateChallenge(challengeId, progress) {
    // Update daily challenges
    const dailyChallenge = this.userStats.challenges.daily.find(c => c.id === challengeId);
    if (dailyChallenge && dailyChallenge.current < dailyChallenge.target) {
      dailyChallenge.current = Math.min(
        dailyChallenge.current + progress,
        dailyChallenge.target
      );

      if (dailyChallenge.current >= dailyChallenge.target) {
        this.completeChallenge(dailyChallenge);
      }
    }

    // Update weekly challenges
    const weeklyChallenge = this.userStats.challenges.weekly.find(c => c.id === challengeId);
    if (weeklyChallenge && weeklyChallenge.current < weeklyChallenge.target) {
      weeklyChallenge.current = Math.min(
        weeklyChallenge.current + progress,
        weeklyChallenge.target
      );

      if (weeklyChallenge.current >= weeklyChallenge.target) {
        this.completeChallenge(weeklyChallenge);
      }
    }
  }

  completeChallenge(challenge) {
    // Award XP
    if (challenge.reward.xp) {
      this.addXP(challenge.reward.xp);
    }

    // Award badge
    if (challenge.reward.badge) {
      this.awardBadge(challenge.reward.badge);
    }

    // Notify listeners
    this.notifyListeners('challengeCompleted', {
      challenge,
      reward: challenge.reward,
    });
  }

  addXP(amount) {
    this.userStats.xp += amount;
    
    // Check for level up
    const newLevel = this.calculateLevel(this.userStats.xp);
    if (newLevel > this.userStats.level) {
      const oldLevel = this.userStats.level;
      this.userStats.level = newLevel;
      this.notifyListeners('levelUp', {
        oldLevel,
        newLevel,
        totalXP: this.userStats.xp,
      });
    }

    this.notifyListeners('xpGained', {
      amount,
      totalXP: this.userStats.xp,
      level: this.userStats.level,
    });
  }

  calculateLevel(xp) {
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  awardBadge(badgeId) {
    if (!this.userStats.badges.includes(badgeId)) {
      this.userStats.badges.push(badgeId);
      this.notifyListeners('badgeAwarded', {
        badgeId,
        badge: this.getBadgeInfo(badgeId),
      });
    }
  }

  getBadgeInfo(badgeId) {
    const badges = {
      safe_navigator: {
        name: 'Safe Navigator',
        description: 'Completed safe driving challenge',
        icon: 'security',
        color: '#00FF88',
      },
      eco_warrior: {
        name: 'Eco Warrior',
        description: 'Champion of eco-friendly routes',
        icon: 'eco',
        color: '#4CAF50',
      },
      safety_champion: {
        name: 'Safety Champion',
        description: 'Week of perfect safe driving',
        icon: 'emoji-events',
        color: '#FFD700',
      },
      community_guardian: {
        name: 'Community Guardian',
        description: 'Trusted community moderator',
        icon: 'shield',
        color: '#2196F3',
      },
      eco_master: {
        name: 'Eco Master',
        description: 'Master of carbon footprint reduction',
        icon: 'nature',
        color: '#8BC34A',
      },
    };

    return badges[badgeId] || { name: 'Unknown Badge', description: '', icon: 'star', color: '#666' };
  }

  checkAchievements() {
    // Check for streak achievements
    if (this.userStats.streaks.safeDriving === 7) {
      this.awardBadge('safety_champion');
    }

    // Check for XP milestones
    if (this.userStats.xp >= 1000 && !this.userStats.badges.includes('xp_master')) {
      this.awardBadge('xp_master');
    }
  }

  getWeekString() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return startOfWeek.toDateString();
  }

  // Getters
  getUserStats() {
    return { ...this.userStats };
  }

  getDailyChallenges() {
    return [...this.userStats.challenges.daily];
  }

  getWeeklyChallenges() {
    return [...this.userStats.challenges.weekly];
  }

  getBadges() {
    return this.userStats.badges.map(badgeId => ({
      id: badgeId,
      ...this.getBadgeInfo(badgeId),
    }));
  }

  // Listeners
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('GameService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new GameService();
