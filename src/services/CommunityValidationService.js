import AsyncStorage from '@react-native-async-storage/async-storage';

class CommunityValidationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.pendingReports = new Map();
    this.validatedReports = new Map();
    this.userReputations = new Map();
    this.validationRules = {
      minReportsRequired: 3,
      minReputationRequired: 10,
      maxReportAge: 24 * 60 * 60 * 1000, // 24 hours
      consensusThreshold: 0.7, // 70% agreement
      autoValidateThreshold: 0.9, // 90% agreement for auto-validation
      spamDetectionEnabled: true,
      duplicateDetectionRadius: 100, // meters
    };
    this.reportTypes = {
      obstacle: ['police', 'speed_camera', 'traffic_camera', 'railway_crossing', 'toll', 'accident', 'roadwork'],
      poi: ['fuel_station', 'restaurant', 'bus_stop', 'tourist_attraction'],
      traffic: ['congestion', 'road_closure', 'construction'],
      map_error: ['incorrect_road', 'missing_road', 'wrong_speed_limit'],
    };
    this.userStats = {
      reportsSubmitted: 0,
      reportsValidated: 0,
      validationAccuracy: 0,
      reputation: 0,
      badges: [],
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadValidationData();
      await this.loadUserStats();
      this.startValidationProcessing();
      
      this.isInitialized = true;
      console.log('CommunityValidationService initialized successfully');
    } catch (error) {
      console.error('CommunityValidationService initialization failed:', error);
      throw error;
    }
  }

  async submitReport(reportData) {
    try {
      const report = {
        id: this.generateReportId(),
        ...reportData,
        submittedBy: reportData.userId || 'anonymous',
        timestamp: Date.now(),
        status: 'pending',
        validations: [],
        confidence: 0,
        location: {
          latitude: reportData.latitude,
          longitude: reportData.longitude,
        },
      };

      // Check for duplicates
      const duplicate = await this.checkForDuplicates(report);
      if (duplicate) {
        // Merge with existing report
        return await this.mergeWithExistingReport(duplicate, report);
      }

      // Add to pending reports
      this.pendingReports.set(report.id, report);
      
      // Update user stats
      this.updateUserStats(report.submittedBy, 'reportSubmitted');
      
      // Save to storage
      await this.savePendingReports();
      
      // Notify listeners
      this.notifyListeners('reportSubmitted', { report });
      
      // Check if auto-validation is possible
      await this.checkAutoValidation(report);
      
      return report;
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  }

  async validateReport(reportId, validation) {
    try {
      const report = this.pendingReports.get(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const validationData = {
        id: this.generateValidationId(),
        reportId,
        validatedBy: validation.userId || 'anonymous',
        timestamp: Date.now(),
        isValid: validation.isValid,
        confidence: validation.confidence || 0.8,
        comments: validation.comments || '',
        location: validation.location,
      };

      // Check if user already validated this report
      const existingValidation = report.validations.find(v => v.validatedBy === validationData.validatedBy);
      if (existingValidation) {
        throw new Error('User already validated this report');
      }

      // Add validation
      report.validations.push(validationData);
      
      // Update user stats
      this.updateUserStats(validationData.validatedBy, 'validationSubmitted');
      
      // Check if report can be validated
      const validationResult = await this.processValidations(report);
      
      if (validationResult.isValidated) {
        // Move to validated reports
        this.validatedReports.set(reportId, report);
        this.pendingReports.delete(reportId);
        
        // Update user reputations
        await this.updateReputations(report, validationResult);
        
        // Notify listeners
        this.notifyListeners('reportValidated', { 
          report, 
          validationResult,
          isValid: validationResult.isValid,
        });
      }
      
      // Save changes
      await this.savePendingReports();
      await this.saveValidatedReports();
      
      return validationResult;
    } catch (error) {
      console.error('Error validating report:', error);
      throw error;
    }
  }

  async checkForDuplicates(newReport) {
    const radius = this.validationRules.duplicateDetectionRadius;
    
    // Check pending reports
    for (const [id, report] of this.pendingReports) {
      if (report.type === newReport.type) {
        const distance = this.calculateDistance(
          newReport.location.latitude,
          newReport.location.longitude,
          report.location.latitude,
          report.location.longitude
        );
        
        if (distance <= radius) {
          return report;
        }
      }
    }
    
    // Check recent validated reports
    const recentTime = Date.now() - this.validationRules.maxReportAge;
    for (const [id, report] of this.validatedReports) {
      if (report.timestamp > recentTime && report.type === newReport.type) {
        const distance = this.calculateDistance(
          newReport.location.latitude,
          newReport.location.longitude,
          report.location.latitude,
          report.location.longitude
        );
        
        if (distance <= radius) {
          return report;
        }
      }
    }
    
    return null;
  }

  async mergeWithExistingReport(existingReport, newReport) {
    // Increment confidence for duplicate reports
    existingReport.duplicateCount = (existingReport.duplicateCount || 1) + 1;
    existingReport.confidence = Math.min(1.0, existingReport.confidence + 0.1);
    existingReport.lastReported = Date.now();
    
    // Add reporter to list
    if (!existingReport.reporters) {
      existingReport.reporters = [existingReport.submittedBy];
    }
    existingReport.reporters.push(newReport.submittedBy);
    
    // Update user stats
    this.updateUserStats(newReport.submittedBy, 'duplicateReportSubmitted');
    
    this.notifyListeners('reportMerged', { 
      existingReport, 
      newReport,
      duplicateCount: existingReport.duplicateCount,
    });
    
    return existingReport;
  }

  async processValidations(report) {
    const validations = report.validations;
    const totalValidations = validations.length;
    
    if (totalValidations < this.validationRules.minReportsRequired) {
      return { isValidated: false, needsMoreValidations: true };
    }
    
    // Calculate consensus
    const validCount = validations.filter(v => v.isValid).length;
    const invalidCount = totalValidations - validCount;
    const consensus = validCount / totalValidations;
    
    // Calculate weighted confidence
    const weightedConfidence = this.calculateWeightedConfidence(validations);
    
    // Determine if report is validated
    const isValidated = consensus >= this.validationRules.consensusThreshold;
    const isValid = consensus > 0.5;
    
    return {
      isValidated,
      isValid,
      consensus,
      weightedConfidence,
      validCount,
      invalidCount,
      totalValidations,
    };
  }

  calculateWeightedConfidence(validations) {
    let totalWeight = 0;
    let weightedSum = 0;
    
    validations.forEach(validation => {
      const userReputation = this.getUserReputation(validation.validatedBy);
      const weight = Math.max(0.1, userReputation / 100); // Min weight 0.1
      
      totalWeight += weight;
      weightedSum += (validation.isValid ? 1 : 0) * weight * validation.confidence;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  async checkAutoValidation(report) {
    // Auto-validate based on user reputation and report type
    const userReputation = this.getUserReputation(report.submittedBy);
    
    if (userReputation >= 90 && report.confidence >= this.validationRules.autoValidateThreshold) {
      // High reputation user with high confidence - auto-validate
      report.status = 'auto_validated';
      report.validations.push({
        id: this.generateValidationId(),
        reportId: report.id,
        validatedBy: 'system',
        timestamp: Date.now(),
        isValid: true,
        confidence: 0.95,
        comments: 'Auto-validated based on user reputation',
        type: 'automatic',
      });
      
      this.validatedReports.set(report.id, report);
      this.pendingReports.delete(report.id);
      
      this.notifyListeners('reportAutoValidated', { report });
      
      return true;
    }
    
    return false;
  }

  async updateReputations(report, validationResult) {
    // Update submitter reputation
    const submitterReputation = this.getUserReputation(report.submittedBy);
    const reputationChange = validationResult.isValid ? 5 : -2;
    this.setUserReputation(report.submittedBy, submitterReputation + reputationChange);
    
    // Update validator reputations
    report.validations.forEach(validation => {
      if (validation.validatedBy === 'system') return;
      
      const validatorReputation = this.getUserReputation(validation.validatedBy);
      const wasCorrect = validation.isValid === validationResult.isValid;
      const change = wasCorrect ? 2 : -1;
      
      this.setUserReputation(validation.validatedBy, validatorReputation + change);
    });
    
    await this.saveUserStats();
  }

  getUserReputation(userId) {
    return this.userReputations.get(userId) || 0;
  }

  setUserReputation(userId, reputation) {
    this.userReputations.set(userId, Math.max(0, Math.min(100, reputation)));
  }

  updateUserStats(userId, action) {
    if (!this.userStats[userId]) {
      this.userStats[userId] = {
        reportsSubmitted: 0,
        reportsValidated: 0,
        validationAccuracy: 0,
        reputation: 0,
        badges: [],
      };
    }
    
    const stats = this.userStats[userId];
    
    switch (action) {
      case 'reportSubmitted':
        stats.reportsSubmitted++;
        break;
      case 'validationSubmitted':
        stats.reportsValidated++;
        break;
      case 'duplicateReportSubmitted':
        // Small reputation boost for confirming existing reports
        stats.reputation += 1;
        break;
    }
    
    // Award badges
    this.checkAndAwardBadges(userId, stats);
  }

  checkAndAwardBadges(userId, stats) {
    const badges = [];
    
    if (stats.reportsSubmitted >= 10 && !stats.badges.includes('reporter')) {
      badges.push('reporter');
    }
    
    if (stats.reportsValidated >= 50 && !stats.badges.includes('validator')) {
      badges.push('validator');
    }
    
    if (stats.reputation >= 50 && !stats.badges.includes('trusted')) {
      badges.push('trusted');
    }
    
    if (badges.length > 0) {
      stats.badges.push(...badges);
      this.notifyListeners('badgesAwarded', { userId, badges });
    }
  }

  startValidationProcessing() {
    // Process pending validations every 5 minutes
    setInterval(() => {
      this.processExpiredReports();
    }, 5 * 60 * 1000);
  }

  async processExpiredReports() {
    const now = Date.now();
    const expiredReports = [];
    
    for (const [id, report] of this.pendingReports) {
      if (now - report.timestamp > this.validationRules.maxReportAge) {
        expiredReports.push(report);
      }
    }
    
    for (const report of expiredReports) {
      // Auto-reject reports with insufficient validations
      if (report.validations.length < this.validationRules.minReportsRequired) {
        report.status = 'expired';
        this.pendingReports.delete(report.id);
        
        this.notifyListeners('reportExpired', { report });
      }
    }
    
    if (expiredReports.length > 0) {
      await this.savePendingReports();
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateValidationId() {
    return `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data persistence
  async savePendingReports() {
    try {
      const data = Array.from(this.pendingReports.entries());
      await AsyncStorage.setItem('pendingReports', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving pending reports:', error);
    }
  }

  async saveValidatedReports() {
    try {
      const data = Array.from(this.validatedReports.entries());
      await AsyncStorage.setItem('validatedReports', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving validated reports:', error);
    }
  }

  async saveUserStats() {
    try {
      await AsyncStorage.setItem('userStats', JSON.stringify(this.userStats));
      const reputationData = Array.from(this.userReputations.entries());
      await AsyncStorage.setItem('userReputations', JSON.stringify(reputationData));
    } catch (error) {
      console.error('Error saving user stats:', error);
    }
  }

  async loadValidationData() {
    try {
      const pendingData = await AsyncStorage.getItem('pendingReports');
      if (pendingData) {
        const entries = JSON.parse(pendingData);
        this.pendingReports = new Map(entries);
      }

      const validatedData = await AsyncStorage.getItem('validatedReports');
      if (validatedData) {
        const entries = JSON.parse(validatedData);
        this.validatedReports = new Map(entries);
      }
    } catch (error) {
      console.error('Error loading validation data:', error);
    }
  }

  async loadUserStats() {
    try {
      const statsData = await AsyncStorage.getItem('userStats');
      if (statsData) {
        this.userStats = JSON.parse(statsData);
      }

      const reputationData = await AsyncStorage.getItem('userReputations');
      if (reputationData) {
        const entries = JSON.parse(reputationData);
        this.userReputations = new Map(entries);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  // Listener management
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
        console.error('CommunityValidationService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new CommunityValidationService();
