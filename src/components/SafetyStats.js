import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const SafetyStats = ({ metrics }) => {
  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getSafetyScoreColor = (score) => {
    if (score >= 90) return '#00FF88';
    if (score >= 70) return '#FFA500';
    if (score >= 50) return '#FF6B6B';
    return '#FF0000';
  };

  const safetyScoreColor = getSafetyScoreColor(metrics.safetyScore || 0);

  const stats = [
    {
      icon: 'security',
      label: 'Safety Score',
      value: `${Math.round(metrics.safetyScore || 0)}%`,
      color: safetyScoreColor,
      description: 'Overall safety rating',
    },
    {
      icon: 'timer',
      label: 'Safe Driving Time',
      value: formatTime(metrics.totalDrivingTime || 0),
      color: '#007AFF',
      description: 'Total time driving safely',
    },
    {
      icon: 'trending-up',
      label: 'Current Streak',
      value: `${metrics.safeDrivingStreak || 0} days`,
      color: '#00FF88',
      description: 'Days without violations',
    },
    {
      icon: 'warning',
      label: 'Violations',
      value: `${metrics.violationCount || 0}`,
      color: metrics.violationCount > 0 ? '#FF6B6B' : '#00FF88',
      description: 'Safety violations recorded',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <LinearGradient
              colors={[`${stat.color}20`, `${stat.color}10`]}
              style={styles.statGradient}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                <Icon name={stat.icon} size={20} color="#000" />
              </View>
              
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statDescription}>{stat.description}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* Safety Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Safety Tips</Text>
        <View style={styles.tips}>
          {[
            'Use voice commands while driving',
            'Keep your phone mounted safely',
            'Take breaks on long journeys',
            'Report hazards to help others',
          ].map((tip, index) => (
            <View key={index} style={styles.tip}>
              <Icon name="lightbulb-outline" size={14} color="#FFA500" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 12,
  },
  tipsContainer: {
    marginTop: 10,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  tips: {
    gap: 10,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
  },
  tipText: {
    fontSize: 12,
    color: '#ccc',
    marginLeft: 10,
    flex: 1,
  },
});

export default SafetyStats;
