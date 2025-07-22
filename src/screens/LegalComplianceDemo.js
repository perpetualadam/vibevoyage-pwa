import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';

import PlatformNavigationBar from '../components/PlatformNavigationBar';
import DynamicLegalPrompt from '../components/DynamicLegalPrompt';
import LegalComplianceService from '../services/LegalComplianceService';
import RoadRegulationService from '../services/RoadRegulationService';

const LegalComplianceDemo = ({ navigation }) => {
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptType, setPromptType] = useState('border_crossing');
  const [selectedCountry, setSelectedCountry] = useState('GB');
  const [fromCountry, setFromCountry] = useState('FR');
  const [regulations, setRegulations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [currentDisclaimer, setCurrentDisclaimer] = useState(null);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      await LegalComplianceService.initialize();
      await RoadRegulationService.initialize();
      
      // Load current disclaimer
      const disclaimer = LegalComplianceService.getCurrentDisclaimer();
      setCurrentDisclaimer(disclaimer);
      
      // Load all regulations
      const allCountries = RoadRegulationService.getAllCountries();
      const allRegulations = allCountries.map(code => ({
        code,
        ...RoadRegulationService.getRegulationsForCountry(code)
      }));
      setRegulations(allRegulations);
      
      // Listen for changes
      const unsubscribe = LegalComplianceService.addListener((event, data) => {
        if (event === 'countryChanged') {
          setCurrentDisclaimer(data.disclaimer);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error initializing legal compliance services:', error);
    }
  };

  const showLegalPrompt = (type) => {
    setPromptType(type);
    setPromptVisible(true);
  };

  const handlePromptClose = (acknowledged) => {
    setPromptVisible(false);
    
    if (acknowledged) {
      Alert.alert('Legal Compliance', 'Thank you for acknowledging the legal requirements.');
    }
  };

  const searchRegulations = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = RoadRegulationService.searchRegulations(query);
    setSearchResults(results);
  };

  const compareCountries = () => {
    const comparison = RoadRegulationService.compareRegulations([fromCountry, selectedCountry]);
    
    Alert.alert(
      'Country Comparison',
      `${comparison[0].country} vs ${comparison[1].country}\n\n` +
      `Speed Limits (Urban):\n${comparison[0].speedLimits.urban} vs ${comparison[1].speedLimits.urban} km/h\n\n` +
      `Alcohol Limits:\n${comparison[0].alcoholLimit}‰ vs ${comparison[1].alcoholLimit}‰\n\n` +
      `Emergency Numbers:\n${comparison[0].emergencyNumber} vs ${comparison[1].emergencyNumber}`
    );
  };

  const promptTypes = [
    { key: 'border_crossing', title: 'Border Crossing', icon: 'flag' },
    { key: 'navigation_start', title: 'Navigation Start', icon: 'navigation' },
    { key: 'reminder', title: 'Legal Reminder', icon: 'info-outline' },
  ];

  const renderRegulationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.regulationItem}
      onPress={() => {
        Alert.alert(
          item.country,
          `Regulation: ${item.regulation}\n\n` +
          `Phone Rule: ${item.phoneRule}\n\n` +
          `Speed Limits: Urban ${item.speedLimits.urban}, Rural ${item.speedLimits.rural}, Highway ${item.speedLimits.highway} km/h\n\n` +
          `Emergency: ${item.emergencyNumber}`
        );
      }}
    >
      <View style={styles.regulationHeader}>
        <Text style={styles.regulationCountry}>{item.country}</Text>
        <Text style={styles.regulationCode}>{item.code}</Text>
      </View>
      <Text style={styles.regulationRule} numberOfLines={2}>
        {item.phoneRule}
      </Text>
      <View style={styles.regulationFooter}>
        <Text style={styles.regulationSpeed}>
          Urban: {item.speedLimits.urban} km/h
        </Text>
        <Text style={styles.regulationEmergency}>
          Emergency: {item.emergencyNumber}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PlatformNavigationBar
        title="Legal Compliance Demo"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'gavel',
          onPress: () => Alert.alert('Legal Info', 'This demo showcases comprehensive legal compliance features including country-specific regulations, dynamic prompts, and multilingual support.'),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Disclaimer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Legal Disclaimer</Text>
          {currentDisclaimer && (
            <View style={styles.currentDisclaimer}>
              <Text style={styles.disclaimerCountry}>{currentDisclaimer.country}</Text>
              <Text style={styles.disclaimerRegulation}>{currentDisclaimer.regulation}</Text>
              <Text style={styles.disclaimerText} numberOfLines={3}>
                {currentDisclaimer.mainDisclaimer}
              </Text>
            </View>
          )}
        </View>

        {/* Dynamic Legal Prompts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dynamic Legal Prompts</Text>
          <Text style={styles.sectionDescription}>
            Test different types of legal prompts that appear based on user actions
          </Text>
          
          <View style={styles.promptGrid}>
            {promptTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={styles.promptButton}
                onPress={() => showLegalPrompt(type.key)}
              >
                <Icon name={type.icon} size={24} color="#00FF88" />
                <Text style={styles.promptButtonText}>{type.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Country Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Country Regulations</Text>
          <Text style={styles.sectionDescription}>
            Select countries to compare regulations and test border crossing prompts
          </Text>
          
          <View style={styles.countrySelectors}>
            <View style={styles.countrySelector}>
              <Text style={styles.selectorLabel}>From Country:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={fromCountry}
                  onValueChange={setFromCountry}
                  style={styles.picker}
                  dropdownIconColor="#00FF88"
                >
                  {regulations.map((reg) => (
                    <Picker.Item 
                      key={reg.code} 
                      label={`${reg.country} (${reg.code})`} 
                      value={reg.code}
                      color="#FFF"
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.countrySelector}>
              <Text style={styles.selectorLabel}>To Country:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCountry}
                  onValueChange={setSelectedCountry}
                  style={styles.picker}
                  dropdownIconColor="#00FF88"
                >
                  {regulations.map((reg) => (
                    <Picker.Item 
                      key={reg.code} 
                      label={`${reg.country} (${reg.code})`} 
                      value={reg.code}
                      color="#FFF"
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.compareButton}
            onPress={compareCountries}
          >
            <Icon name="compare-arrows" size={20} color="#000" />
            <Text style={styles.compareButtonText}>Compare Regulations</Text>
          </TouchableOpacity>
        </View>

        {/* Regulations Database Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regulations Database</Text>
          <Text style={styles.sectionDescription}>
            Browse comprehensive road regulations for {regulations.length} countries
          </Text>
          
          <FlatList
            data={regulations.slice(0, 6)} // Show first 6 for demo
            renderItem={renderRegulationItem}
            keyExtractor={(item) => item.code}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
          
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => Alert.alert('Full Database', `Complete database contains regulations for ${regulations.length} countries with multilingual support.`)}
          >
            <Text style={styles.viewAllText}>View All {regulations.length} Countries</Text>
            <Icon name="arrow-forward" size={16} color="#00FF88" />
          </TouchableOpacity>
        </View>

        {/* Features Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Compliance Features</Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Comprehensive legal disclaimers for 25+ countries</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Dynamic location-based legal prompts</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Multilingual support with local regulations</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Border crossing legal notifications</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Country-specific road regulation database</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.featureText}>Automatic compliance reminders</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Dynamic Legal Prompt */}
      <DynamicLegalPrompt
        visible={promptVisible}
        onClose={handlePromptClose}
        promptType={promptType}
        fromCountry={fromCountry}
        toCountry={selectedCountry}
        autoHide={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 16,
    lineHeight: 20,
  },
  currentDisclaimer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF88',
  },
  disclaimerCountry: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00FF88',
    marginBottom: 4,
  },
  disclaimerRegulation: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
  },
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promptButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  promptButtonText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  countrySelectors: {
    marginBottom: 16,
  },
  countrySelector: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  picker: {
    color: '#FFF',
    backgroundColor: 'transparent',
  },
  compareButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  regulationItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  regulationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  regulationCountry: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  regulationCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  regulationRule: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
    lineHeight: 18,
  },
  regulationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regulationSpeed: {
    fontSize: 12,
    color: '#999',
  },
  regulationEmergency: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 16,
    color: '#00FF88',
    marginRight: 8,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#CCC',
    marginLeft: 12,
    flex: 1,
  },
});

export default LegalComplianceDemo;
