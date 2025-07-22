import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import contexts
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const { width } = Dimensions.get('window');

const CommunityScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [activeTab, setActiveTab] = useState('reports');
  const [nearbyReports, setNearbyReports] = useState([
    {
      id: 1,
      type: 'police',
      location: 'Highway 101, Mile 45',
      distance: '0.5 km',
      upvotes: 12,
      downvotes: 1,
      timestamp: Date.now() - 300000, // 5 minutes ago
      verified: true,
    },
    {
      id: 2,
      type: 'accident',
      location: 'Main St & Oak Ave',
      distance: '1.2 km',
      upvotes: 8,
      downvotes: 0,
      timestamp: Date.now() - 600000, // 10 minutes ago
      verified: false,
    },
  ]);

  const handleTabPress = (tab) => {
    if (shouldBlockInteraction()) {
      Alert.alert(
        'Safety First',
        'Use voice commands while driving.\n\nSay "VibeVoyage, show community reports"',
        [{ text: 'OK' }]
      );
      return;
    }
    setActiveTab(tab);
  };

  const handleReportVote = (reportId, voteType) => {
    if (shouldBlockInteraction()) {
      speak('Use voice commands to vote on reports while driving');
      return;
    }

    // Update report votes
    setNearbyReports(prev => prev.map(report => {
      if (report.id === reportId) {
        return {
          ...report,
          upvotes: voteType === 'up' ? report.upvotes + 1 : report.upvotes,
          downvotes: voteType === 'down' ? report.downvotes + 1 : report.downvotes,
        };
      }
      return report;
    }));

    speak(`Vote ${voteType === 'up' ? 'up' : 'down'} recorded`);
  };

  const getReportIcon = (type) => {
    switch (type) {
      case 'police': return 'local-police';
      case 'accident': return 'car-crash';
      case 'hazard': return 'warning';
      case 'traffic': return 'traffic';
      default: return 'report';
    }
  };

  const getReportColor = (type) => {
    switch (type) {
      case 'police': return '#007AFF';
      case 'accident': return '#FF6B6B';
      case 'hazard': return '#FFA500';
      case 'traffic': return '#9C27B0';
      default: return '#666';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderReports = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby Reports</Text>
        {nearbyReports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <LinearGradient
              colors={[`${getReportColor(report.type)}20`, `${getReportColor(report.type)}10`]}
              style={styles.reportGradient}
            >
              <View style={styles.reportHeader}>
                <View style={styles.reportIconContainer}>
                  <Icon
                    name={getReportIcon(report.type)}
                    size={24}
                    color={getReportColor(report.type)}
                  />
                  {report.verified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={12} color="#00FF88" />
                    </View>
                  )}
                </View>
                
                <View style={styles.reportInfo}>
                  <Text style={styles.reportType}>
                    {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                  </Text>
                  <Text style={styles.reportLocation}>{report.location}</Text>
                  <Text style={styles.reportDistance}>
                    {report.distance} • {formatTimeAgo(report.timestamp)}
                  </Text>
                </View>

                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => handleReportVote(report.id, 'up')}
                  >
                    <Icon name="thumb-up" size={16} color="#00FF88" />
                    <Text style={styles.voteCount}>{report.upvotes}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => handleReportVote(report.id, 'down')}
                  >
                    <Icon name="thumb-down" size={16} color="#FF6B6B" />
                    <Text style={styles.voteCount}>{report.downvotes}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderModeration = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Moderation</Text>
        <View style={styles.comingSoonCard}>
          <Icon name="shield" size={60} color="#666" />
          <Text style={styles.comingSoonText}>Moderation Tools Coming Soon!</Text>
          <Text style={styles.comingSoonSubtext}>
            Help verify reports and maintain community trust
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderLeaderboard = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Leaders</Text>
        <View style={styles.comingSoonCard}>
          <Icon name="leaderboard" size={60} color="#666" />
          <Text style={styles.comingSoonText}>Leaderboard Coming Soon!</Text>
          <Text style={styles.comingSoonSubtext}>
            See top contributors and safety champions
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
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSubtitle}>
              {nearbyReports.length} nearby reports
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (shouldBlockInteraction()) {
                speak('Use voice commands to report hazards while driving');
                return;
              }
              Alert.alert('Add Report', 'Feature coming soon!');
            }}
          >
            <Icon name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {[
          { key: 'reports', label: 'Reports', icon: 'report' },
          { key: 'moderation', label: 'Moderation', icon: 'shield' },
          { key: 'leaderboard', label: 'Leaders', icon: 'leaderboard' },
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
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'moderation' && renderModeration()}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  reportCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  reportGradient: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIconContainer: {
    position: 'relative',
    marginRight: 15,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  reportLocation: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  reportDistance: {
    fontSize: 12,
    color: '#999',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  voteCount: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  comingSoonCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00FF88',
    marginTop: 15,
    marginBottom: 10,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default CommunityScreen;
