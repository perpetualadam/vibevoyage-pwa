import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import contexts
import { useGame } from '../context/GameContext';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userStats, getUserBadges } = useGame();
  const { getSafetyMetrics, shouldBlockInteraction } = useSafety();
  const { isVoiceEnabled, toggleVoice, currentLanguage } = useVoice();

  const [badges, setBadges] = useState([]);
  const [safetyMetrics, setSafetyMetrics] = useState({});
  const [settings, setSettings] = useState({
    voiceEnabled: isVoiceEnabled,
    ecoMode: true,
    notifications: true,
    shareData: false,
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const userBadges = getUserBadges();
      const metrics = getSafetyMetrics();
      
      setBadges(userBadges);
      setSafetyMetrics(metrics);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const handleSettingToggle = (setting) => {
    if (shouldBlockInteraction()) {
      Alert.alert(
        'Safety First',
        'Use voice commands while driving to change settings',
        [{ text: 'OK' }]
      );
      return;
    }

    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));

    if (setting === 'voiceEnabled') {
      toggleVoice();
    }
  };

  const handleNavigation = (screen) => {
    if (shouldBlockInteraction()) {
      Alert.alert(
        'Safety First',
        'Pull over safely to access settings',
        [{ text: 'OK' }]
      );
      return;
    }
    navigation.navigate(screen);
  };

  const getLevelTitle = () => {
    if (userStats.level < 5) return 'Novice Navigator';
    if (userStats.level < 10) return 'Safe Driver';
    if (userStats.level < 20) return 'Road Warrior';
    if (userStats.level < 35) return 'Navigation Expert';
    if (userStats.level < 50) return 'Safety Champion';
    return 'VibeVoyage Master';
  };

  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#00FF88', '#00CC6A']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>VV</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>VibeVoyage User</Text>
              <Text style={styles.userTitle}>{getLevelTitle()}</Text>
              <Text style={styles.userLevel}>Level {userStats.level}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => handleNavigation('Settings')}
          >
            <Icon name="settings" size={24} color="#00FF88" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(0, 255, 136, 0.2)', 'rgba(0, 255, 136, 0.1)']}
                style={styles.statGradient}
              >
                <Icon name="emoji-events" size={30} color="#00FF88" />
                <Text style={styles.statValue}>{userStats.xp.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(0, 122, 255, 0.2)', 'rgba(0, 122, 255, 0.1)']}
                style={styles.statGradient}
              >
                <Icon name="security" size={30} color="#007AFF" />
                <Text style={styles.statValue}>{Math.round(safetyMetrics.safetyScore || 0)}%</Text>
                <Text style={styles.statLabel}>Safety Score</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 165, 0, 0.2)', 'rgba(255, 165, 0, 0.1)']}
                style={styles.statGradient}
              >
                <Icon name="timer" size={30} color="#FFA500" />
                <Text style={styles.statValue}>
                  {formatTime(safetyMetrics.totalDrivingTime || 0)}
                </Text>
                <Text style={styles.statLabel}>Drive Time</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                style={styles.statGradient}
              >
                <Icon name="eco" size={30} color="#4CAF50" />
                <Text style={styles.statValue}>{badges.length}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Recent Badges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Badges</Text>
            <TouchableOpacity onPress={() => handleNavigation('Game')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {badges.slice(0, 3).map((badge, index) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={[styles.badgeIcon, { backgroundColor: badge.color }]}>
                  <Icon name={badge.icon} size={20} color="#000" />
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
              </View>
            ))}
            {badges.length === 0 && (
              <View style={styles.emptyBadges}>
                <Icon name="emoji-events" size={40} color="#666" />
                <Text style={styles.emptyText}>No badges yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Quick Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="mic" size={24} color="#00FF88" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Voice Commands</Text>
                <Text style={styles.settingDescription}>
                  Enable hands-free voice control
                </Text>
              </View>
            </View>
            <Switch
              value={settings.voiceEnabled}
              onValueChange={() => handleSettingToggle('voiceEnabled')}
              trackColor={{ false: '#333', true: '#00FF88' }}
              thumbColor={settings.voiceEnabled ? '#fff' : '#666'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="eco" size={24} color="#4CAF50" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Eco Mode</Text>
                <Text style={styles.settingDescription}>
                  Prioritize fuel-efficient routes
                </Text>
              </View>
            </View>
            <Switch
              value={settings.ecoMode}
              onValueChange={() => handleSettingToggle('ecoMode')}
              trackColor={{ false: '#333', true: '#4CAF50' }}
              thumbColor={settings.ecoMode ? '#fff' : '#666'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="notifications" size={24} color="#FFA500" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get alerts and updates
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={() => handleSettingToggle('notifications')}
              trackColor={{ false: '#333', true: '#FFA500' }}
              thumbColor={settings.notifications ? '#fff' : '#666'}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Options</Text>
          
          {[
            { icon: 'help', title: 'Help & Support', screen: 'Help' },
            { icon: 'privacy-tip', title: 'Privacy Policy', screen: 'Privacy' },
            { icon: 'info', title: 'About VibeVoyage', screen: 'About' },
            { icon: 'feedback', title: 'Send Feedback', screen: 'Feedback' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigation(item.screen)}
            >
              <Icon name={item.icon} size={24} color="#666" />
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userTitle: {
    fontSize: 14,
    color: '#00FF88',
    marginBottom: 2,
  },
  userLevel: {
    fontSize: 12,
    color: '#999',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
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
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyBadges: {
    alignItems: 'center',
    paddingVertical: 20,
    width: 200,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuTitle: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 15,
    flex: 1,
  },
});

export default ProfileScreen;
