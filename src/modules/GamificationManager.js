/**
 * Gamification Manager Module
 * Handles user progression, achievements, and rewards
 */
class GamificationManager extends BaseModule {
    constructor() {
        super('GamificationManager');
        
        // User stats
        this.userStats = {
            totalTrips: 0,
            totalDistance: 0,
            totalTime: 0,
            hazardsAvoided: 0,
            fuelSaved: 0,
            co2Saved: 0,
            points: 0,
            level: 1,
            streakDays: 0,
            lastTripDate: null,
            achievements: []
        };
        
        // Current trip data
        this.currentTrip = null;
        
        // Achievement definitions
        this.achievements = [
            { id: 'first_trip', name: 'First Journey', description: 'Complete your first trip', icon: '🚗', points: 10, unlocked: false },
            { id: 'distance_10km', name: 'Explorer', description: 'Travel 10km total', icon: '🗺️', points: 25, unlocked: false },
            { id: 'distance_100km', name: 'Wanderer', description: 'Travel 100km total', icon: '🌍', points: 50, unlocked: false },
            { id: 'hazard_avoider', name: 'Safety First', description: 'Avoid 10 hazards', icon: '🛡️', points: 30, unlocked: false },
            { id: 'eco_warrior', name: 'Eco Warrior', description: 'Save 5L of fuel', icon: '🌱', points: 40, unlocked: false },
            { id: 'streak_7', name: 'Weekly Traveler', description: 'Use app 7 days in a row', icon: '🔥', points: 60, unlocked: false },
            { id: 'level_5', name: 'Navigator', description: 'Reach level 5', icon: '⭐', points: 100, unlocked: false }
        ];
    }

    async initialize() {
        await super.initialize();
        
        try {
            this.loadUserStats();
            this.loadAchievements();
            this.log('Gamification manager initialized successfully', 'success');
        } catch (error) {
            this.handleError(error, 'Gamification manager initialization failed');
        }
    }

    loadUserStats() {
        const saved = this.loadFromStorage('userStats');
        if (saved) {
            this.userStats = { ...this.userStats, ...saved };
        }
    }

    loadAchievements() {
        const saved = this.loadFromStorage('achievements');
        if (saved) {
            // Merge with default achievements
            this.achievements = this.achievements.map(achievement => {
                const savedAchievement = saved.find(a => a.id === achievement.id);
                return savedAchievement ? { ...achievement, ...savedAchievement } : achievement;
            });
        }
    }

    saveUserStats() {
        this.saveToStorage('userStats', this.userStats);
    }

    saveAchievements() {
        this.saveToStorage('achievements', this.achievements);
    }

    startTrip() {
        this.currentTrip = {
            startTime: Date.now(),
            startLocation: null,
            endLocation: null,
            distance: 0,
            duration: 0,
            hazardsAvoided: 0,
            routeType: 'standard'
        };
        
        this.emit('trip:started', this.currentTrip);
        this.log('Trip started for gamification tracking', 'debug');
    }

    endTrip(tripData) {
        if (!this.currentTrip) {
            this.log('No active trip to end', 'warning');
            return;
        }

        // Update trip data
        this.currentTrip = {
            ...this.currentTrip,
            ...tripData,
            endTime: Date.now(),
            duration: Date.now() - this.currentTrip.startTime
        };

        // Process the completed trip
        this.processTripCompletion(this.currentTrip);
        
        this.emit('trip:ended', this.currentTrip);
        this.currentTrip = null;
    }

    processTripCompletion(trip) {
        // Update user stats
        this.userStats.totalTrips++;
        this.userStats.totalDistance += trip.distance || 0;
        this.userStats.totalTime += Math.round(trip.duration / 60000); // Convert to minutes
        this.userStats.hazardsAvoided += trip.hazardsAvoided || 0;

        // Calculate fuel and CO2 savings
        const fuelSaved = this.calculateFuelSavings(trip.distance || 0);
        const co2Saved = fuelSaved * 2.31; // 2.31kg CO2 per liter of fuel
        
        this.userStats.fuelSaved += fuelSaved;
        this.userStats.co2Saved += co2Saved;

        // Calculate points
        const points = this.calculateTripPoints(trip);
        this.userStats.points += points;

        // Update level
        const newLevel = Math.floor(this.userStats.points / 100) + 1;
        if (newLevel > this.userStats.level) {
            this.levelUp(newLevel);
        }

        // Update streak
        this.updateStreak();

        // Check achievements
        this.checkAchievements();

        // Save progress
        this.saveUserStats();
        this.saveAchievements();

        // Show trip summary
        this.showTripSummary(trip, points);
    }

    calculateFuelSavings(distance) {
        // Estimate 10% fuel savings from route optimization
        const fuelEfficiency = 8; // L/100km default
        const fuelUsed = (distance / 1000) * (fuelEfficiency / 100);
        return fuelUsed * 0.1;
    }

    calculateTripPoints(trip) {
        let points = 0;
        
        // Base points for distance (2 points per km)
        points += Math.round((trip.distance || 0) / 1000) * 2;
        
        // Bonus points for route type
        if (trip.routeType === 'scenic') points += 5;
        if (trip.routeType === 'shortest') points += 3;
        if (trip.routeType === 'eco') points += 4;
        
        // Bonus points for hazard avoidance
        points += (trip.hazardsAvoided || 0) * 2;
        
        return Math.max(1, points); // Minimum 1 point per trip
    }

    levelUp(newLevel) {
        const oldLevel = this.userStats.level;
        this.userStats.level = newLevel;
        
        this.emit('level:up', {
            from: oldLevel,
            to: newLevel
        });
        
        this.log(`Level up! ${oldLevel} -> ${newLevel}`, 'success');
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastTrip = this.userStats.lastTripDate;

        if (!lastTrip) {
            this.userStats.streakDays = 1;
        } else {
            const lastTripDate = new Date(lastTrip).toDateString();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

            if (lastTripDate === today) {
                // Same day, no change
            } else if (lastTripDate === yesterday) {
                // Consecutive day
                this.userStats.streakDays++;
            } else {
                // Streak broken
                this.userStats.streakDays = 1;
            }
        }

        this.userStats.lastTripDate = Date.now();
    }

    checkAchievements() {
        const newAchievements = [];
        
        this.achievements.forEach(achievement => {
            if (achievement.unlocked) return;

            let shouldUnlock = false;

            switch (achievement.id) {
                case 'first_trip':
                    shouldUnlock = this.userStats.totalTrips >= 1;
                    break;
                case 'distance_10km':
                    shouldUnlock = this.userStats.totalDistance >= 10000;
                    break;
                case 'distance_100km':
                    shouldUnlock = this.userStats.totalDistance >= 100000;
                    break;
                case 'hazard_avoider':
                    shouldUnlock = this.userStats.hazardsAvoided >= 10;
                    break;
                case 'eco_warrior':
                    shouldUnlock = this.userStats.fuelSaved >= 5;
                    break;
                case 'streak_7':
                    shouldUnlock = this.userStats.streakDays >= 7;
                    break;
                case 'level_5':
                    shouldUnlock = this.userStats.level >= 5;
                    break;
            }

            if (shouldUnlock) {
                achievement.unlocked = true;
                achievement.unlockedAt = Date.now();
                this.userStats.achievements.push(achievement.id);
                this.userStats.points += achievement.points;
                newAchievements.push(achievement);
            }
        });

        // Emit achievement unlocks
        newAchievements.forEach(achievement => {
            this.emit('achievement:unlocked', achievement);
        });
    }

    showTripSummary(trip, points) {
        const summary = {
            distance: (trip.distance / 1000).toFixed(1),
            duration: Math.round(trip.duration / 60000),
            points: points,
            routeType: trip.routeType,
            hazardsAvoided: trip.hazardsAvoided || 0
        };
        
        this.emit('trip:summary', summary);
    }

    // Public API methods
    getUserStats() {
        return { ...this.userStats };
    }

    getAchievements() {
        return [...this.achievements];
    }

    getUnlockedAchievements() {
        return this.achievements.filter(a => a.unlocked);
    }

    getLockedAchievements() {
        return this.achievements.filter(a => !a.unlocked);
    }

    getCurrentTrip() {
        return this.currentTrip ? { ...this.currentTrip } : null;
    }

    addPoints(points, reason = 'Manual') {
        this.userStats.points += points;
        
        // Check for level up
        const newLevel = Math.floor(this.userStats.points / 100) + 1;
        if (newLevel > this.userStats.level) {
            this.levelUp(newLevel);
        }
        
        this.saveUserStats();
        
        this.emit('points:added', {
            points,
            reason,
            totalPoints: this.userStats.points
        });
    }

    resetStats() {
        this.userStats = {
            totalTrips: 0,
            totalDistance: 0,
            totalTime: 0,
            hazardsAvoided: 0,
            fuelSaved: 0,
            co2Saved: 0,
            points: 0,
            level: 1,
            streakDays: 0,
            lastTripDate: null,
            achievements: []
        };
        
        this.achievements.forEach(achievement => {
            achievement.unlocked = false;
            delete achievement.unlockedAt;
        });
        
        this.saveUserStats();
        this.saveAchievements();
        
        this.emit('stats:reset');
        this.log('User stats reset', 'info');
    }

    destroy() {
        if (this.currentTrip) {
            this.endTrip({});
        }
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamificationManager;
} else {
    window.GamificationManager = GamificationManager;
}
