import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Progress from 'react-native-progress';

// Import services and contexts
import OfflineMapService from '../services/OfflineMapService';
import { useLocation } from '../context/LocationContext';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const OfflineMapScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentLocation } = useLocation();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [downloadedRegions, setDownloadedRegions] = useState([]);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [maxCacheSize, setMaxCacheSize] = useState(500 * 1024 * 1024); // 500MB
  const [showAddRegionModal, setShowAddRegionModal] = useState(false);
  const [newRegion, setNewRegion] = useState({
    name: '',
    radius: 5, // km
    minZoom: 10,
    maxZoom: 16,
  });

  useEffect(() => {
    initializeOfflineMapService();
    loadCacheInfo();
  }, []);

  const initializeOfflineMapService = async () => {
    try {
      await OfflineMapService.initialize();
      setupOfflineMapListeners();
      loadRegions();
    } catch (error) {
      console.error('Error initializing offline map service:', error);
    }
  };

  const setupOfflineMapListeners = () => {
    const unsubscribe = OfflineMapService.addListener((event, data) => {
      switch (event) {
        case 'regionQueued':
          loadRegions();
          speak(`${data.region.name} queued for download`);
          break;
        case 'downloadStarted':
          setIsDownloading(true);
          speak('Map download started');
          break;
        case 'regionDownloadProgress':
          updateRegionProgress(data.region);
          break;
        case 'regionDownloadCompleted':
          loadRegions();
          speak(`${data.region.name} download completed`);
          break;
        case 'regionDownloadFailed':
          loadRegions();
          speak(`${data.region.name} download failed`);
          break;
        case 'downloadCompleted':
          setIsDownloading(false);
          loadCacheInfo();
          speak('All downloads completed');
          break;
        case 'regionDeleted':
          loadRegions();
          loadCacheInfo();
          break;
        case 'cacheCleared':
          loadRegions();
          loadCacheInfo();
          speak('Map cache cleared');
          break;
      }
    });

    this.offlineMapUnsubscribe = unsubscribe;
  };

  const loadRegions = () => {
    const regions = OfflineMapService.getDownloadedRegions();
    const queue = OfflineMapService.getDownloadQueue();
    setDownloadedRegions(regions);
    setDownloadQueue(queue);
    setIsDownloading(OfflineMapService.isDownloadInProgress());
  };

  const loadCacheInfo = async () => {
    try {
      const size = await OfflineMapService.getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Error loading cache info:', error);
    }
  };

  const updateRegionProgress = (region) => {
    setDownloadedRegions(prev =>
      prev.map(r => r.id === region.id ? region : r)
    );
  };

  const handleDownloadCurrentArea = () => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to download maps');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Location Required', 'Current location is needed to download maps');
      return;
    }

    const radius = 5; // 5km radius
    const bounds = calculateBounds(currentLocation, radius);
    
    Alert.alert(
      'Download Current Area',
      `Download maps for ${radius}km around your current location?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => downloadRegion(bounds, {
            name: 'Current Area',
            minZoom: 10,
            maxZoom: 16,
          }),
        },
      ]
    );
  };

  const calculateBounds = (center, radiusKm) => {
    const latDelta = radiusKm / 111.32; // Approximate km per degree latitude
    const lonDelta = radiusKm / (111.32 * Math.cos(center.latitude * Math.PI / 180));
    
    return {
      north: center.latitude + latDelta,
      south: center.latitude - latDelta,
      east: center.longitude + lonDelta,
      west: center.longitude - lonDelta,
    };
  };

  const downloadRegion = async (bounds, options) => {
    try {
      await OfflineMapService.downloadRegion(bounds, options);
    } catch (error) {
      console.error('Error downloading region:', error);
      Alert.alert('Download Error', 'Failed to start download');
    }
  };

  const handleAddCustomRegion = () => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to add custom regions');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Location Required', 'Current location is needed to add regions');
      return;
    }

    setShowAddRegionModal(true);
  };

  const handleCreateCustomRegion = async () => {
    if (!newRegion.name.trim()) {
      Alert.alert('Error', 'Please enter a region name');
      return;
    }

    const bounds = calculateBounds(currentLocation, newRegion.radius);
    
    try {
      await downloadRegion(bounds, {
        name: newRegion.name,
        minZoom: newRegion.minZoom,
        maxZoom: newRegion.maxZoom,
      });
      
      setNewRegion({ name: '', radius: 5, minZoom: 10, maxZoom: 16 });
      setShowAddRegionModal(false);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to create custom region');
    }
  };

  const handleDeleteRegion = (region) => {
    Alert.alert(
      'Delete Region',
      `Delete "${region.name}" and free up ${formatFileSize(region.size)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfflineMapService.deleteRegion(region.id);
              speak(`${region.name} deleted`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete region');
            }
          },
        },
      ]
    );
  };

  const handleClearAllCache = () => {
    Alert.alert(
      'Clear All Maps',
      `This will delete all downloaded maps (${formatFileSize(cacheSize)}) and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfflineMapService.clearAllCache();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#00FF88';
      case 'downloading': return '#FFA500';
      case 'queued': return '#007AFF';
      case 'failed': return '#FF6B6B';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'downloading': return 'download';
      case 'queued': return 'schedule';
      case 'failed': return 'error';
      default: return 'help';
    }
  };

  const renderRegionCard = (region) => (
    <View key={region.id} style={styles.regionCard}>
      <LinearGradient
        colors={[`${getStatusColor(region.status)}20`, `${getStatusColor(region.status)}10`]}
        style={styles.regionGradient}
      >
        <View style={styles.regionHeader}>
          <View style={styles.regionInfo}>
            <View style={styles.regionTitleRow}>
              <Text style={styles.regionName}>{region.name}</Text>
              <Icon
                name={getStatusIcon(region.status)}
                size={20}
                color={getStatusColor(region.status)}
              />
            </View>
            
            <Text style={styles.regionDetails}>
              Zoom: {region.minZoom}-{region.maxZoom} • Size: {formatFileSize(region.size)}
            </Text>
            
            {region.status === 'downloading' && (
              <View style={styles.progressContainer}>
                <Progress.Bar
                  progress={region.progress / 100}
                  width={null}
                  height={4}
                  color={getStatusColor(region.status)}
                  unfilledColor="rgba(255, 255, 255, 0.1)"
                  borderWidth={0}
                  borderRadius={2}
                />
                <Text style={styles.progressText}>
                  {Math.round(region.progress)}% ({region.downloadedTiles}/{region.totalTiles} tiles)
                </Text>
              </View>
            )}
          </View>

          {region.status === 'completed' && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteRegion(region)}
            >
              <Icon name="delete" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );

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
        
        <Text style={styles.headerTitle}>Offline Maps</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddCustomRegion}
        >
          <Icon name="add" size={24} color="#00FF88" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Usage</Text>
          
          <View style={styles.storageCard}>
            <LinearGradient
              colors={['rgba(0, 122, 255, 0.2)', 'rgba(0, 122, 255, 0.1)']}
              style={styles.storageGradient}
            >
              <View style={styles.storageInfo}>
                <Icon name="storage" size={30} color="#007AFF" />
                <View style={styles.storageText}>
                  <Text style={styles.storageUsed}>
                    {formatFileSize(cacheSize)} used
                  </Text>
                  <Text style={styles.storageLimit}>
                    of {formatFileSize(maxCacheSize)} limit
                  </Text>
                </View>
              </View>
              
              <Progress.Bar
                progress={cacheSize / maxCacheSize}
                width={null}
                height={6}
                color="#007AFF"
                unfilledColor="rgba(255, 255, 255, 0.1)"
                borderWidth={0}
                borderRadius={3}
                style={styles.storageProgress}
              />
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadCurrentArea}
            >
              <LinearGradient
                colors={['rgba(0, 255, 136, 0.2)', 'rgba(0, 255, 136, 0.1)']}
                style={styles.actionGradient}
              >
                <Icon name="my-location" size={24} color="#00FF88" />
                <Text style={styles.actionText}>Download Current Area</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearAllCache}
            >
              <LinearGradient
                colors={['rgba(255, 107, 107, 0.2)', 'rgba(255, 107, 107, 0.1)']}
                style={styles.actionGradient}
              >
                <Icon name="clear-all" size={24} color="#FF6B6B" />
                <Text style={styles.actionText}>Clear All Maps</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Downloaded Regions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Downloaded Regions ({downloadedRegions.length})
          </Text>
          
          {downloadedRegions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="cloud-download" size={60} color="#666" />
              <Text style={styles.emptyText}>No offline maps downloaded</Text>
              <Text style={styles.emptySubtext}>
                Download maps to use navigation without internet
              </Text>
            </View>
          ) : (
            downloadedRegions.map(renderRegionCard)
          )}
        </View>

        {/* Download Status */}
        {isDownloading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Download Status</Text>
            <View style={styles.downloadStatus}>
              <Icon name="download" size={20} color="#FFA500" />
              <Text style={styles.downloadText}>
                Downloading maps... ({downloadQueue.length} in queue)
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Region Modal */}
      <Modal
        visible={showAddRegionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddRegionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Region</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Region Name"
              placeholderTextColor="#666"
              value={newRegion.name}
              onChangeText={(text) => setNewRegion({ ...newRegion, name: text })}
            />
            
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Radius: {newRegion.radius} km</Text>
              {/* Slider would go here - using buttons for now */}
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setNewRegion({ ...newRegion, radius: Math.max(1, newRegion.radius - 1) })}
                >
                  <Icon name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setNewRegion({ ...newRegion, radius: Math.min(20, newRegion.radius + 1) })}
                >
                  <Icon name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddRegionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateCustomRegion}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  storageCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  storageGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  storageText: {
    marginLeft: 15,
    flex: 1,
  },
  storageUsed: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  storageLimit: {
    fontSize: 12,
    color: '#999',
  },
  storageProgress: {
    width: '100%',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 15,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  regionCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  regionGradient: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionInfo: {
    flex: 1,
  },
  regionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  regionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  regionDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  downloadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  downloadText: {
    fontSize: 14,
    color: '#FFA500',
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  sliderContainer: {
    marginBottom: 25,
  },
  sliderLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#00FF88',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OfflineMapScreen;
