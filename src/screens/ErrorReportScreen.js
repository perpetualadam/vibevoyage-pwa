import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import RoadObstacleService from '../services/RoadObstacleService';
import { useLocation } from '../context/LocationContext';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const ErrorReportScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { currentLocation } = useLocation();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [selectedType, setSelectedType] = useState(route?.params?.type || null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(route?.params?.location || currentLocation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const reportTypes = [
    {
      id: 'speed_camera',
      title: 'Speed Camera',
      icon: 'camera-alt',
      color: '#FF6B6B',
      description: 'Report a new or incorrectly mapped speed camera',
    },
    {
      id: 'red_light_camera',
      title: 'Red Light Camera',
      icon: 'traffic',
      color: '#FF6B6B',
      description: 'Report traffic light enforcement camera',
    },
    {
      id: 'police_checkpoint',
      title: 'Police Checkpoint',
      icon: 'local-police',
      color: '#9C27B0',
      description: 'Report police checkpoint or roadblock',
    },
    {
      id: 'railway_crossing',
      title: 'Railway Crossing',
      icon: 'train',
      color: '#607D8B',
      description: 'Report railway crossing not on map',
    },
    {
      id: 'toll_booth',
      title: 'Toll Booth',
      icon: 'toll',
      color: '#FFA500',
      description: 'Report new or missing toll booth',
    },
    {
      id: 'construction_zone',
      title: 'Construction',
      icon: 'construction',
      color: '#FF9800',
      description: 'Report construction zone or roadwork',
    },
    {
      id: 'road_closure',
      title: 'Road Closure',
      icon: 'block',
      color: '#F44336',
      description: 'Report temporary or permanent road closure',
    },
    {
      id: 'incorrect_data',
      title: 'Incorrect Data',
      icon: 'error',
      color: '#795548',
      description: 'Report incorrect obstacle information',
    },
  ];

  useEffect(() => {
    if (route?.params?.autoReport && selectedType) {
      handleQuickReport();
    }
  }, []);

  const handleQuickReport = () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Current location is needed to submit reports');
      return;
    }

    const reportType = reportTypes.find(type => type.id === selectedType);
    if (reportType) {
      speak(`Quick reporting ${reportType.title}`);
      setDescription(`Quick report: ${reportType.title} spotted here`);
      handleSubmitReport();
    }
  };

  const handleTypeSelection = (type) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to submit detailed reports');
      return;
    }

    setSelectedType(type.id);
    speak(`Selected ${type.title}`);
  };

  const handleSubmitReport = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location is required for reports');
      return;
    }

    if (shouldBlockInteraction() && !route?.params?.autoReport) {
      speak('Pull over safely to submit reports');
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData = {
        type: selectedType,
        description: description.trim() || 'User reported obstacle',
        reportedAt: Date.now(),
        confidence: 0.7, // User reports start with moderate confidence
        needsVerification: true,
      };

      await RoadObstacleService.reportObstacle(location, selectedType, reportData);
      
      setShowSuccessModal(true);
      speak('Report submitted successfully. Thank you for helping the community!');
      
      // Reset form
      setTimeout(() => {
        setSelectedType(null);
        setDescription('');
        setShowSuccessModal(false);
        if (route?.params?.autoReport) {
          navigation.goBack();
        }
      }, 2000);

    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
      speak('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationEdit = () => {
    if (shouldBlockInteraction()) {
      speak('Cannot edit location while driving');
      return;
    }

    Alert.alert(
      'Edit Location',
      'Use current location or manually adjust?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Current Location',
          onPress: () => {
            if (currentLocation) {
              setLocation(currentLocation);
              speak('Location updated to current position');
            }
          },
        },
        {
          text: 'Manual Edit',
          onPress: () => {
            // Would open a map picker in a real implementation
            Alert.alert('Manual Edit', 'Map picker would open here');
          },
        },
      ]
    );
  };

  const renderReportType = (type) => (
    <TouchableOpacity
      key={type.id}
      style={[
        styles.typeCard,
        selectedType === type.id && styles.selectedTypeCard,
      ]}
      onPress={() => handleTypeSelection(type)}
    >
      <LinearGradient
        colors={
          selectedType === type.id
            ? [type.color, `${type.color}CC`]
            : [`${type.color}20`, `${type.color}10`]
        }
        style={styles.typeGradient}
      >
        <Icon
          name={type.icon}
          size={30}
          color={selectedType === type.id ? '#FFF' : type.color}
        />
        <Text
          style={[
            styles.typeTitle,
            { color: selectedType === type.id ? '#FFF' : '#FFF' },
          ]}
        >
          {type.title}
        </Text>
        <Text
          style={[
            styles.typeDescription,
            { color: selectedType === type.id ? '#FFF' : '#999' },
          ]}
        >
          {type.description}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
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
          <Icon name="arrow-back" size={24} color="#FF6B6B" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Report Issue</Text>
        
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => {
            Alert.alert(
              'How to Report',
              'Select the type of issue you want to report, add a description if needed, and submit. Your reports help improve navigation for everyone!'
            );
          }}
        >
          <Icon name="help-outline" size={24} color="#00FF88" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Location</Text>
          
          <TouchableOpacity
            style={styles.locationCard}
            onPress={handleLocationEdit}
          >
            <LinearGradient
              colors={['rgba(0, 255, 136, 0.2)', 'rgba(0, 255, 136, 0.1)']}
              style={styles.locationGradient}
            >
              <Icon name="location-on" size={24} color="#00FF88" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>
                  {location ? 'Location Set' : 'No Location'}
                </Text>
                <Text style={styles.locationCoords}>
                  {location 
                    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                    : 'Tap to set location'
                  }
                </Text>
              </View>
              <Icon name="edit" size={20} color="#00FF88" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Report Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What would you like to report?</Text>
          
          <View style={styles.typesGrid}>
            {reportTypes.map(renderReportType)}
          </View>
        </View>

        {/* Description */}
        {selectedType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
            
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add any additional details about this issue..."
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!shouldBlockInteraction()}
            />
          </View>
        )}

        {/* Submit Button */}
        {selectedType && location && (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submittingButton]}
            onPress={handleSubmitReport}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={isSubmitting ? ['#666', '#444'] : ['#FF6B6B', '#FF5252']}
              style={styles.submitGradient}
            >
              {isSubmitting ? (
                <Icon name="hourglass-empty" size={24} color="#FFF" />
              ) : (
                <Icon name="send" size={24} color="#FFF" />
              )}
              <Text style={styles.submitText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Icon name="info-outline" size={20} color="#00FF88" />
          <Text style={styles.helpText}>
            Your reports help improve navigation for everyone. Reports are verified by the community before being added to the database.
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Icon name="check-circle" size={60} color="#00FF88" />
            <Text style={styles.successTitle}>Report Submitted!</Text>
            <Text style={styles.successText}>
              Thank you for helping improve navigation for everyone.
            </Text>
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
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
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
  helpButton: {
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
  locationCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  locationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 15,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  selectedTypeCard: {
    transform: [{ scale: 1.02 }],
  },
  typeGradient: {
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    minHeight: 120,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  descriptionInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    textAlignVertical: 'top',
  },
  submitButton: {
    marginVertical: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  submittingButton: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    marginLeft: 10,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ErrorReportScreen;
