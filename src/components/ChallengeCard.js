import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import * as Progress from 'react-native-progress';

const ChallengeCard = ({ challenge, onPress }) => {
  const progress = challenge.current / challenge.target;
  const isCompleted = progress >= 1;

  const getChallengeIcon = () => {
    switch (challenge.type) {
      case 'distance': return 'route';
      case 'count': return 'repeat';
      case 'streak': return 'trending-up';
      case 'accumulate': return 'add';
      default: return 'assignment';
    }
  };

  const getProgressColor = () => {
    if (isCompleted) return '#00FF88';
    if (progress > 0.7) return '#FFA500';
    return '#007AFF';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={
          isCompleted
            ? ['rgba(0, 255, 136, 0.2)', 'rgba(0, 255, 136, 0.1)']
            : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
        }
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon
              name={getChallengeIcon()}
              size={20}
              color={isCompleted ? '#00FF88' : '#007AFF'}
            />
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{challenge.title}</Text>
            <Text style={styles.description}>{challenge.description}</Text>
          </View>

          {isCompleted && (
            <View style={styles.completedBadge}>
              <Icon name="check-circle" size={20} color="#00FF88" />
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {challenge.current} / {challenge.target}
            </Text>
            <Text style={styles.progressPercentage}>
              {Math.round(progress * 100)}%
            </Text>
          </View>

          <Progress.Bar
            progress={progress}
            width={null}
            height={6}
            color={getProgressColor()}
            unfilledColor="rgba(255, 255, 255, 0.1)"
            borderWidth={0}
            borderRadius={3}
            style={styles.progressBar}
          />
        </View>

        {challenge.reward && (
          <View style={styles.rewardContainer}>
            <Icon name="emoji-events" size={14} color="#FFD700" />
            <Text style={styles.rewardText}>
              {challenge.reward.xp} XP
              {challenge.reward.badge && ` + ${challenge.reward.badge} badge`}
            </Text>
          </View>
        )}

        {/* Completion animation overlay */}
        {isCompleted && (
          <View style={styles.completionOverlay}>
            <Icon name="star" size={30} color="#FFD700" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  completedBadge: {
    marginLeft: 10,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  rewardText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 6,
    fontWeight: '500',
  },
  completionOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.3,
  },
});

export default ChallengeCard;
