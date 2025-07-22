import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import CrashDetectionService from '../services/CrashDetectionService';
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const EmergencyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [settings, setSettings] = useState({
    autoCallEmergencyServices: false,
    crashSensitivity: 'medium',
    shareAnalytics: true,
  });
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: '',
  });

  useEffect(() => {
    initializeEmergencyFeatures();
    setupCrashDetectionListeners();
    
    return () => {
      cleanupListeners();
    };
  }, []);

  const initializeEmergencyFeatures = async () => {
    try {
      await CrashDetectionService.initialize();
      const contacts = CrashDetectionService.getEmergencyContacts();
      const crashSettings = CrashDetectionService.getSettings();
      
      setEmergencyContacts(contacts);
      setSettings({ ...settings, ...crashSettings });
      setIsMonitoring(CrashDetectionService.isMonitoringActive());
      
    } catch (error) {
      console.error('Error initializing emergency features:', error);
    }
  };

  const setupCrashDetectionListeners = () => {
    const unsubscribe = CrashDetectionService.addListener((event, data) => {
      switch (event) {
        case 'crashDetected':
          handleCrashDetected(data);
          break;
        case 'emergencyCountdown':
          handleEmergencyCountdown(data);
          break;
        case 'emergencyResponseExecuted':
          handleEmergencyResponseExecuted(data);
          break;
        case 'emergencyContactAdded':
          setEmergencyContacts(CrashDetectionService.getEmergencyContacts());
          break;
        case 'emergencyContactRemoved':
          setEmergencyContacts(CrashDetectionService.getEmergencyContacts());
          break;
      }
    });

    this.crashDetectionUnsubscribe = unsubscribe;
  };

  const cleanupListeners = () => {
    if (this.crashDetectionUnsubscribe) {
      this.crashDetectionUnsubscribe();
    }
  };

  const handleCrashDetected = (crashData) => {
    speak(`Crash detected. Type: ${crashData.type}. Emergency countdown started.`);
    
    Alert.alert(
      '🚨 CRASH DETECTED',
      `Possible ${crashData.type} detected.\n\nEmergency services will be contacted in 10 seconds.\n\nPress "I'm OK" if this is a false alarm.`,
      [
        {
          text: "I'm OK",
          onPress: () => {
            CrashDetectionService.cancelEmergencyResponse();
            speak('Emergency response cancelled');
          },
          style: 'cancel',
        },
        {
          text: 'Call Now',
          onPress: () => {
            CrashDetectionService.executeEmergencyResponse(crashData);
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleEmergencyCountdown = (data) => {
    if (data.countdown <= 3) {
      speak(`Emergency response in ${data.countdown}`);
    }
  };

  const handleEmergencyResponseExecuted = (data) => {
    speak('Emergency response executed. Help is on the way.');
    Alert.alert(
      'Emergency Response Activated',
      'Emergency contacts have been notified and emergency services contacted.',
      [{ text: 'OK' }]
    );
  };

  const toggleCrashMonitoring = () => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change emergency settings');
      return;
    }

    if (isMonitoring) {
      CrashDetectionService.stopMonitoring();
      setIsMonitoring(false);
      speak('Crash detection disabled');
    } else {
      CrashDetectionService.startMonitoring();
      setIsMonitoring(true);
      speak('Crash detection enabled');
    }
  };

  const handleSettingChange = async (setting, value) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change emergency settings');
      return;
    }

    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);
    await CrashDetectionService.saveSettings(newSettings);
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }

    try {
      await CrashDetectionService.addEmergencyContact(newContact);
      setNewContact({ name: '', phone: '', relationship: '' });
      setShowAddContactModal(false);
      speak('Emergency contact added');
    } catch (error) {
      Alert.alert('Error', 'Failed to add emergency contact');
    }
  };

  const handleRemoveContact = (contactId) => {
    Alert.alert(
      'Remove Contact',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await CrashDetectionService.removeEmergencyContact(contactId);
            speak('Emergency contact removed');
          },
        },
      ]
    );
  };

  const testCrashDetection = () => {
    if (shouldBlockInteraction()) {
      speak('Cannot test crash detection while driving');
      return;
    }

    Alert.alert(
      'Test Crash Detection',
      'This will simulate a crash detection event. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test',
          onPress: () => {
            const mockCrashData = {
              type: 'test',
              magnitude: 2.5,
              timestamp: Date.now(),
              confidence: 85,
              location: null,
            };
            handleCrashDetected(mockCrashData);
          },
        },
      ]
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
          <Icon name="arrow-back" size={24} color="#FF6B6B" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Emergency Features</Text>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={testCrashDetection}
        >
          <Icon name="bug-report" size={24} color="#FFA500" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Crash Detection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crash Detection</Text>
          
          <View style={styles.statusCard}>
            <LinearGradient
              colors={isMonitoring ? ['rgba(255, 107, 107, 0.2)', 'rgba(255, 107, 107, 0.1)'] : ['rgba(102, 102, 102, 0.2)', 'rgba(102, 102, 102, 0.1)']}
              style={styles.statusGradient}
            >
              <View style={styles.statusHeader}>
                <Icon 
                  name={isMonitoring ? "security" : "security-update-warning"} 
                  size={30} 
                  color={isMonitoring ? "#FF6B6B" : "#666"} 
                />
                <View style={styles.statusText}>
                  <Text style={styles.statusTitle}>
                    {isMonitoring ? 'Active Monitoring' : 'Monitoring Disabled'}
                  </Text>
                  <Text style={styles.statusDescription}>
                    {isMonitoring 
                      ? 'Crash detection is actively monitoring for accidents'
                      : 'Enable crash detection for automatic emergency response'
                    }
                  </Text>
                </View>
                <Switch
                  value={isMonitoring}
                  onValueChange={toggleCrashMonitoring}
                  trackColor={{ false: '#333', true: '#FF6B6B' }}
                  thumbColor={isMonitoring ? '#fff' : '#666'}
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddContactModal(true)}
            >
              <Icon name="add" size={20} color="#00FF88" />
            </TouchableOpacity>
          </View>

          {emergencyContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="contact-emergency" size={60} color="#666" />
              <Text style={styles.emptyText}>No emergency contacts added</Text>
              <Text style={styles.emptySubtext}>
                Add contacts to be notified in case of emergency
              </Text>
            </View>
          ) : (
            emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Icon name="person" size={24} color="#00FF88" />
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                    <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveContact(contact.id)}
                >
                  <Icon name="delete" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="local-hospital" size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto-Call Emergency Services</Text>
                <Text style={styles.settingDescription}>
                  Automatically call 911 after crash detection
                </Text>
              </View>
            </View>
            <Switch
              value={settings.autoCallEmergencyServices}
              onValueChange={(value) => handleSettingChange('autoCallEmergencyServices', value)}
              trackColor={{ false: '#333', true: '#FF6B6B' }}
              thumbColor={settings.autoCallEmergencyServices ? '#fff' : '#666'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="analytics" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Share Crash Analytics</Text>
                <Text style={styles.settingDescription}>
                  Help improve crash detection accuracy
                </Text>
              </View>
            </View>
            <Switch
              value={settings.shareAnalytics}
              onValueChange={(value) => handleSettingChange('shareAnalytics', value)}
              trackColor={{ false: '#333', true: '#007AFF' }}
              thumbColor={settings.shareAnalytics ? '#fff' : '#666'}
            />
          </View>
        </View>

        {/* Emergency Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Icon name="sensors" size={20} color="#FFA500" />
              <Text style={styles.infoText}>
                Uses accelerometer to detect sudden impacts and unusual motion patterns
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="timer" size={20} color="#FFA500" />
              <Text style={styles.infoText}>
                10-second countdown allows you to cancel false alarms
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="contact-phone" size={20} color="#FFA500" />
              <Text style={styles.infoText}>
                Automatically contacts your emergency contacts with location
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="location-on" size={20} color="#FFA500" />
              <Text style={styles.infoText}>
                Shares precise GPS coordinates for faster emergency response
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#666"
              value={newContact.name}
              onChangeText={(text) => setNewContact({ ...newContact, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#666"
              value={newContact.phone}
              onChangeText={(text) => setNewContact({ ...newContact, phone: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g., Spouse, Parent)"
              placeholderTextColor="#666"
              value={newContact.relationship}
              onChangeText={(text) => setNewContact({ ...newContact, relationship: text })}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddContactModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addContactButton]}
                onPress={handleAddContact}
              >
                <Text style={styles.addButtonText}>Add Contact</Text>
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
  testButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
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
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  statusGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    flex: 1,
    marginLeft: 15,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactDetails: {
    marginLeft: 15,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#00FF88',
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    padding: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
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
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 15,
    flex: 1,
    lineHeight: 18,
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
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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
  addContactButton: {
    backgroundColor: '#00FF88',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmergencyScreen;
