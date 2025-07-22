import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import * as Progress from 'react-native-progress';

const LevelProgress = ({ level, xp, progress, xpToNext }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for level indicator
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation for progress bar
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [scaleAnim, glowAnim]);

  const getLevelTitle = () => {
    if (level < 5) return 'Novice Navigator';
    if (level < 10) return 'Safe Driver';
    if (level < 20) return 'Road Warrior';
    if (level < 35) return 'Navigation Expert';
    if (level < 50) return 'Safety Champion';
    return 'VibeVoyage Master';
  };

  const getLevelColor = () => {
    if (level < 5) return '#007AFF';
    if (level < 10) return '#00FF88';
    if (level < 20) return '#FFA500';
    if (level < 35) return '#FF6B6B';
    if (level < 50) return '#9C27B0';
    return '#FFD700';
  };

  const levelColor = getLevelColor();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[`${levelColor}20`, `${levelColor}10`]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.levelContainer,
              {
                backgroundColor: levelColor,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.levelNumber}>{level}</Text>
          </Animated.View>

          <View style={styles.titleContainer}>
            <Text style={styles.levelTitle}>{getLevelTitle()}</Text>
            <Text style={styles.xpText}>{xp.toLocaleString()} XP</Text>
          </View>

          <View style={styles.nextLevelContainer}>
            <Icon name="trending-up" size={20} color={levelColor} />
            <Text style={styles.nextLevelText}>
              {xpToNext.toLocaleString()} to next
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Level Progress</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(progress * 100)}%
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <Progress.Bar
              progress={progress}
              width={null}
              height={8}
              color={levelColor}
              unfilledColor="rgba(255, 255, 255, 0.1)"
              borderWidth={0}
              borderRadius={4}
              style={styles.progressBar}
            />

            {/* Animated glow effect */}
            <Animated.View
              style={[
                styles.progressGlow,
                {
                  backgroundColor: levelColor,
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.3],
                  }),
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Level milestones */}
        <View style={styles.milestonesContainer}>
          <Text style={styles.milestonesTitle}>Next Milestones</Text>
          <View style={styles.milestones}>
            {[
              { level: level + 1, reward: 'New Badge' },
              { level: level + 5, reward: 'Special Theme' },
              { level: level + 10, reward: 'Premium Feature' },
            ].map((milestone, index) => (
              <View key={index} style={styles.milestone}>
                <View style={[styles.milestoneIcon, { backgroundColor: levelColor }]}>
                  <Text style={styles.milestoneLevel}>{milestone.level}</Text>
                </View>
                <Text style={styles.milestoneReward}>{milestone.reward}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Decorative elements */}
        <View style={styles.decorativeElements}>
          <Icon name="star" size={16} color={`${levelColor}40`} style={styles.star1} />
          <Icon name="star" size={12} color={`${levelColor}60`} style={styles.star2} />
          <Icon name="star" size={14} color={`${levelColor}30`} style={styles.star3} />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  titleContainer: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: '#999',
  },
  nextLevelContainer: {
    alignItems: 'center',
  },
  nextLevelText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  progressBarContainer: {
    position: 'relative',
  },
  progressBar: {
    width: '100%',
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 8,
    borderRadius: 4,
  },
  milestonesContainer: {
    marginTop: 10,
  },
  milestonesTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 10,
  },
  milestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestone: {
    alignItems: 'center',
    flex: 1,
  },
  milestoneIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  milestoneLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  milestoneReward: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  star1: {
    position: 'absolute',
    top: 20,
    right: 30,
  },
  star2: {
    position: 'absolute',
    top: 50,
    right: 60,
  },
  star3: {
    position: 'absolute',
    bottom: 30,
    left: 40,
  },
});

export default LevelProgress;
