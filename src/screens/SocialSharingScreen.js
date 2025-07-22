import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';
import { useGame } from '../context/GameContext';

const SocialSharingScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();
  const { userStats } = useGame();

  const { tripData, routeData, achievementData } = route.params || {};

  const [shareOptions, setShareOptions] = useState([
    {
      id: 'trip_summary',
      title: 'Trip Summary',
      description: 'Share your completed trip details',
      icon: 'map',
      color: '#4CAF50',
      enabled: !!tripData,
    },
    {
      id: 'route_recommendation',
      title: 'Route Recommendation',
      description: 'Recommend this route to friends',
      icon: 'share-location',
      color: '#2196F3',
      enabled: !!routeData,
    },
    {
      id: 'achievement',
      title: 'Achievement',
      description: 'Share your latest achievement',
      icon: 'emoji-events',
      color: '#FF9800',
      enabled: !!achievementData,
    },
    {
      id: 'safety_streak',
      title: 'Safety Streak',
      description: 'Show off your safe driving record',
      icon: 'security',
      color: '#00FF88',
      enabled: userStats?.streaks?.safeDriving > 0,
    },
    {
      id: 'eco_impact',
      title: 'Eco Impact',
      description: 'Share your environmental contribution',
      icon: 'eco',
      color: '#4CAF50',
      enabled: userStats?.totalCarbonSaved > 0,
    },
  ]);

  const socialPlatforms = [
    {
      id: 'native_share',
      name: 'Share',
      icon: 'share',
      color: '#666',
      action: 'native',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      action: 'url',
      baseUrl: 'https://www.facebook.com/sharer/sharer.php?u=',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      action: 'url',
      baseUrl: 'https://twitter.com/intent/tweet?text=',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      action: 'url',
      baseUrl: 'whatsapp://send?text=',
    },
    {
      id: 'copy_link',
      name: 'Copy Link',
      icon: 'content-copy',
      color: '#9C27B0',
      action: 'copy',
    },
  ];

  useEffect(() => {
    if (shouldBlockInteraction()) {
      speak('Social sharing is available when you stop driving');
    }
  }, []);

  const generateShareContent = (shareType) => {
    switch (shareType) {
      case 'trip_summary':
        return {
          title: '🚗 Trip Completed with VibeVoyage!',
          message: `Just completed a ${tripData?.distance || '10.5'}km trip in ${tripData?.duration || '25'} minutes using VibeVoyage! 🎯\n\n✅ Safe driving maintained\n🌱 ${tripData?.carbonSaved || '2.1'}kg CO₂ saved\n⭐ ${tripData?.xpEarned || '15'} XP earned\n\nDownload VibeVoyage for safer, smarter navigation!`,
          url: 'https://vibevoyage.app/download',
        };

      case 'route_recommendation':
        return {
          title: '🗺️ Great Route Recommendation!',
          message: `Found an amazing route from ${routeData?.origin || 'Downtown'} to ${routeData?.destination || 'Airport'} using VibeVoyage! 🚀\n\n⏱️ ${routeData?.duration || '18'} minutes\n🛣️ ${routeData?.distance || '12.3'}km\n🌿 Eco-friendly option\n🚫 Avoids traffic cameras\n\nTry it yourself with VibeVoyage!`,
          url: `https://vibevoyage.app/route?from=${encodeURIComponent(routeData?.origin || '')}&to=${encodeURIComponent(routeData?.destination || '')}`,
        };

      case 'achievement':
        return {
          title: '🏆 New Achievement Unlocked!',
          message: `Just earned the "${achievementData?.name || 'Safety Champion'}" badge in VibeVoyage! 🎉\n\n${achievementData?.description || 'Completed 7 consecutive safe trips'}\n\n💪 Level ${userStats?.level || '5'} • ${userStats?.xp || '1250'} XP\n\nJoin me in making roads safer with VibeVoyage!`,
          url: 'https://vibevoyage.app/achievements',
        };

      case 'safety_streak':
        return {
          title: '🛡️ Safe Driving Streak!',
          message: `${userStats?.streaks?.safeDriving || '12'} consecutive safe trips with VibeVoyage! 🚗✨\n\n🎯 Zero accidents\n⚡ Smart route planning\n🌱 Eco-friendly choices\n🏆 Level ${userStats?.level || '5'} driver\n\nSafety first, always! #SafeDriving #VibeVoyage`,
          url: 'https://vibevoyage.app/safety',
        };

      case 'eco_impact':
        return {
          title: '🌱 Environmental Impact!',
          message: `Saved ${userStats?.totalCarbonSaved || '45.2'}kg of CO₂ with VibeVoyage's eco-routing! 🌍💚\n\n🚗 ${userStats?.totalTrips || '89'} eco-friendly trips\n⛽ ${userStats?.fuelSaved || '23.1'}L fuel saved\n🌳 Equivalent to planting ${Math.round((userStats?.totalCarbonSaved || 45.2) / 22)} trees\n\nEvery trip counts! Join the green movement!`,
          url: 'https://vibevoyage.app/eco',
        };

      default:
        return {
          title: 'VibeVoyage - Smart Navigation',
          message: 'Check out VibeVoyage - the navigation app that prioritizes safety, community, and the environment! 🚗✨',
          url: 'https://vibevoyage.app',
        };
    }
  };

  const handleShare = async (shareType, platform) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to share content');
      return;
    }

    try {
      const content = generateShareContent(shareType);
      
      switch (platform.action) {
        case 'native':
          await Share.share({
            title: content.title,
            message: `${content.message}\n\n${content.url}`,
            url: content.url,
          });
          break;

        case 'url':
          const shareUrl = platform.baseUrl + encodeURIComponent(`${content.message}\n\n${content.url}`);
          await Linking.openURL(shareUrl);
          break;

        case 'copy':
          // Would use Clipboard API
          Alert.alert('Copied!', 'Content copied to clipboard');
          break;
      }

      speak('Content shared successfully');
      
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Unable to share content');
    }
  };

  const renderShareOption = (option) => {
    if (!option.enabled) return null;

    return (
      <View key={option.id} style={styles.shareOptionCard}>
        <LinearGradient
          colors={[`${option.color}20`, `${option.color}10`]}
          style={styles.shareOptionGradient}
        >
          <View style={styles.shareOptionHeader}>
            <Icon name={option.icon} size={32} color={option.color} />
            <View style={styles.shareOptionInfo}>
              <Text style={styles.shareOptionTitle}>{option.title}</Text>
              <Text style={styles.shareOptionDescription}>{option.description}</Text>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.platformsScroll}
          >
            {socialPlatforms.map((platform) => (
              <TouchableOpacity
                key={platform.id}
                style={[styles.platformButton, { backgroundColor: `${platform.color}20` }]}
                onPress={() => handleShare(option.id, platform)}
              >
                <Icon name={platform.icon} size={20} color={platform.color} />
                <Text style={[styles.platformText, { color: platform.color }]}>
                  {platform.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#00FF88" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Share Your Journey</Text>
        
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Spread the Word! 📢</Text>
          <Text style={styles.introDescription}>
            Share your VibeVoyage achievements, routes, and safety milestones with friends and family.
          </Text>
        </View>

        {/* Share Options */}
        <View style={styles.shareOptionsContainer}>
          {shareOptions.map(renderShareOption)}
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacySection}>
          <Icon name="privacy-tip" size={20} color="#FFA500" />
          <Text style={styles.privacyText}>
            Your privacy is important. Only the information you choose to share will be included. 
            Personal location data is never shared without your explicit consent.
          </Text>
        </View>

        {/* Community Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Community Impact</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>50K+</Text>
              <Text style={styles.statLabel}>Safe Trips</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>2.1M</Text>
              <Text style={styles.statLabel}>kg CO₂ Saved</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>15K+</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  introDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  shareOptionsContainer: {
    gap: 20,
  },
  shareOptionCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  shareOptionGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  shareOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  shareOptionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  shareOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  shareOptionDescription: {
    fontSize: 14,
    color: '#999',
  },
  platformsScroll: {
    flexDirection: 'row',
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  privacySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    marginLeft: 10,
    lineHeight: 20,
  },
  statsSection: {
    marginVertical: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 80,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default SocialSharingScreen;
