import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Progress from 'react-native-progress';

// Import contexts
import { useGame } from '../context/GameContext';
import { useSafety } from '../context/SafetyContext';

// Import components
import BadgeCard from '../components/BadgeCard';
import ChallengeCard from '../components/ChallengeCard';
import LevelProgress from '../components/LevelProgress';
import SafetyStats from '../components/SafetyStats';

const { width } = Dimensions.get('window');

const GameScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    userStats,
    challenges,
    notifications,
    getUserBadges,
    getDailyChallenges,
    getWeeklyChallenges,
    getLevelProgress,
    getXPToNextLevel,
    removeNotification,
  } = useGame();

  const { getSafetyMetrics, shouldBlockInteraction } = useSafety();

  const [activeTab, setActiveTab] = useState('overview');
  const [badges, setBadges] = useState([]);
  const [safetyMetrics, setSafetyMetrics] = useState({});

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      const userBadges = getUserBadges();
      const metrics = getSafetyMetrics();
      
      setBadges(userBadges);
      setSafetyMetrics(metrics);
    } catch (error) {
      console.error('Error loading game data:', error);
    }
  };

  const handleTabPress = (tab) => {
    if (shouldBlockInteraction()) {
      Alert.alert(
        'Safety First',
        'Use voice commands while driving.\n\nSay "VibeVoyage, show game stats"',
        [{ text: 'OK' }]
      );
      return;
    }
    setActiveTab(tab);
  };

  const handleNotificationPress = (notification) => {
    if (shouldBlockInteraction()) return;
    
    Alert.alert(
      notification.title,
      notification.message,
      [
        { text: 'Dismiss', onPress: () => removeNotification(notification.id) },
        { text: 'OK' }
      ]
    );
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Level Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <LevelProgress
          level={userStats.level}
          xp={userStats.xp}
          progress={getLevelProgress()}
          xpToNext={getXPToNextLevel()}
        />
      </View>

      {/* Safety Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Performance</Text>
        <SafetyStats metrics={safetyMetrics} />
      </View>

      {/* Recent Badges */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Badges</Text>
          <TouchableOpacity onPress={() => setActiveTab('badges')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {badges.slice(0, 3).map((badge, index) => (
            <BadgeCard key={badge.id} badge={badge} style={styles.badgeCard} />
          ))}
          {badges.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="emoji-events" size={40} color="#666" />
              <Text style={styles.emptyText}>Complete challenges to earn badges!</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Active Challenges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Challenges</Text>
        {getDailyChallenges().slice(0, 2).map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onPress={() => setActiveTab('challenges')}
          />
        ))}
      </View>
    </ScrollView>
  );

  const renderChallenges = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Challenges</Text>
        {getDailyChallenges().map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Challenges</Text>
        {getWeeklyChallenges().map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </View>
    </ScrollView>
  );

  const renderBadges = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Badges ({badges.length})</Text>
        <View style={styles.badgeGrid}>
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} style={styles.gridBadge} />
          ))}
          {badges.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="emoji-events" size={60} color="#666" />
              <Text style={styles.emptyText}>No badges yet</Text>
              <Text style={styles.emptySubtext}>
                Complete challenges and drive safely to earn badges!
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderLeaderboard = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Leaderboard</Text>
        <View style={styles.leaderboardCard}>
          <Text style={styles.comingSoonText}>Coming Soon!</Text>
          <Text style={styles.comingSoonSubtext}>
            Compete with other VibeVoyage users for the top safety score
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Game Center</Text>
            <Text style={styles.headerSubtitle}>
              Level {userStats.level} • {userStats.xp} XP
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={24} color="#00FF88" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Notifications */}
      {notifications.length > 0 && (
        <ScrollView
          horizontal
          style={styles.notificationBar}
          showsHorizontalScrollIndicator={false}
        >
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={styles.notification}
              onPress={() => handleNotificationPress(notification)}
            >
              <Icon
                name={notification.type === 'levelUp' ? 'trending-up' : 'emoji-events'}
                size={16}
                color="#00FF88"
              />
              <Text style={styles.notificationText}>{notification.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: 'dashboard' },
          { key: 'challenges', label: 'Challenges', icon: 'assignment' },
          { key: 'badges', label: 'Badges', icon: 'emoji-events' },
          { key: 'leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => handleTabPress(tab.key)}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? '#00FF88' : '#666'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'challenges' && renderChallenges()}
        {activeTab === 'badges' && renderBadges()}
        {activeTab === 'leaderboard' && renderLeaderboard()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#00FF88',
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  notificationText: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00FF88',
  },
  tabLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#00FF88',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: '500',
  },
  badgeCard: {
    marginRight: 15,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridBadge: {
    width: (width - 60) / 2,
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    marginTop: 5,
    textAlign: 'center',
  },
  leaderboardCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  comingSoonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00FF88',
    marginBottom: 10,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default GameScreen;
