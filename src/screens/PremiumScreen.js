import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import { useSafety } from '../context/SafetyContext';
import { useVoice } from '../context/VoiceContext';

const { width } = Dimensions.get('window');

const PremiumScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { shouldBlockInteraction } = useSafety();
  const { speak } = useVoice();

  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const subscriptionPlans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$4.99',
      period: '/month',
      savings: null,
      popular: false,
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '$39.99',
      period: '/year',
      savings: 'Save 33%',
      popular: true,
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: '$99.99',
      period: 'one-time',
      savings: 'Best Value',
      popular: false,
    },
  ];

  const premiumFeatures = [
    {
      icon: 'ad-units',
      title: 'Ad-Free Experience',
      description: 'Enjoy uninterrupted navigation without any advertisements',
      category: 'experience',
    },
    {
      icon: 'palette',
      title: 'Custom Themes',
      description: 'Access to neon, retro, minimalist, and exclusive map styles',
      category: 'customization',
    },
    {
      icon: 'analytics',
      title: 'Advanced Analytics',
      description: 'Detailed driving behavior reports and performance insights',
      category: 'insights',
    },
    {
      icon: 'new-releases',
      title: 'Beta Access',
      description: 'Early access to new features and experimental capabilities',
      category: 'access',
    },
    {
      icon: 'cloud-download',
      title: 'Offline Maps',
      description: 'Download maps for offline navigation in remote areas',
      category: 'navigation',
    },
    {
      icon: 'support-agent',
      title: 'Priority Support',
      description: '24/7 premium customer support with faster response times',
      category: 'support',
    },
    {
      icon: 'backup',
      title: 'Cloud Backup',
      description: 'Automatic backup of preferences, routes, and achievements',
      category: 'data',
    },
    {
      icon: 'tune',
      title: 'Advanced Settings',
      description: 'Fine-tune every aspect of your navigation experience',
      category: 'customization',
    },
  ];

  const freeFeatures = [
    'Core navigation with voice guidance',
    'Community safety reports',
    'Basic gamification system',
    'Eco-friendly route options',
    'Standard map styles',
    'Voice commands',
  ];

  useEffect(() => {
    if (shouldBlockInteraction()) {
      speak('Premium features can be explored when you stop driving');
    }
  }, []);

  const handlePlanSelection = (planId) => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to change subscription plans');
      return;
    }

    setSelectedPlan(planId);
    const plan = subscriptionPlans.find(p => p.id === planId);
    speak(`${plan.name} plan selected`);
  };

  const handleSubscribe = async () => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to complete subscription');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate subscription process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Subscription Successful! 🎉',
        'Welcome to VibeVoyage Premium! Your premium features are now active.',
        [
          {
            text: 'Explore Features',
            onPress: () => navigation.navigate('Settings'),
          },
        ]
      );
      
      speak('Welcome to VibeVoyage Premium');
      
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Subscription Failed', 'Please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (shouldBlockInteraction()) {
      speak('Pull over safely to restore purchases');
      return;
    }

    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Restore Complete', 'Your purchases have been restored');
      speak('Purchases restored successfully');
    } catch (error) {
      Alert.alert('Restore Failed', 'No previous purchases found');
    }
  };

  const renderPlanCard = (plan) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan === plan.id && styles.selectedPlanCard,
        plan.popular && styles.popularPlanCard,
      ]}
      onPress={() => handlePlanSelection(plan.id)}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}
      
      <LinearGradient
        colors={
          selectedPlan === plan.id
            ? ['#00FF88', '#00CC6A']
            : plan.popular
            ? ['#FF6B6B', '#FF5252']
            : ['#333', '#1a1a1a']
        }
        style={styles.planGradient}
      >
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planPeriod}>{plan.period}</Text>
        </View>
        {plan.savings && (
          <Text style={styles.planSavings}>{plan.savings}</Text>
        )}
        
        {selectedPlan === plan.id && (
          <Icon name="check-circle" size={24} color="#FFF" style={styles.checkIcon} />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderFeatureItem = (feature) => (
    <View key={feature.title} style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Icon name={feature.icon} size={24} color="#00FF88" />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
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
        
        <Text style={styles.headerTitle}>VibeVoyage Premium</Text>
        
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
        >
          <Icon name="restore" size={24} color="#FFA500" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['rgba(0, 255, 136, 0.2)', 'rgba(0, 255, 136, 0.05)']}
          style={styles.heroSection}
        >
          <Icon name="workspace-premium" size={64} color="#00FF88" />
          <Text style={styles.heroTitle}>Unlock Premium Features</Text>
          <Text style={styles.heroDescription}>
            Get the most out of VibeVoyage with advanced features, 
            exclusive content, and priority support.
          </Text>
        </LinearGradient>

        {/* Subscription Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.plansScroll}
          >
            {subscriptionPlans.map(renderPlanCard)}
          </ScrollView>
        </View>

        {/* Premium Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {premiumFeatures.map(renderFeatureItem)}
        </View>

        {/* Free vs Premium Comparison */}
        <View style={styles.comparisonSection}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonColumn}>
              <Text style={styles.comparisonHeader}>Free</Text>
              {freeFeatures.map((feature, index) => (
                <View key={index} style={styles.comparisonItem}>
                  <Icon name="check" size={16} color="#4CAF50" />
                  <Text style={styles.comparisonText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.comparisonDivider} />
            
            <View style={styles.comparisonColumn}>
              <Text style={[styles.comparisonHeader, { color: '#00FF88' }]}>Premium</Text>
              <View style={styles.comparisonItem}>
                <Icon name="check" size={16} color="#00FF88" />
                <Text style={styles.comparisonText}>Everything in Free</Text>
              </View>
              {premiumFeatures.slice(0, 5).map((feature, index) => (
                <View key={index} style={styles.comparisonItem}>
                  <Icon name="check" size={16} color="#00FF88" />
                  <Text style={styles.comparisonText}>{feature.title}</Text>
                </View>
              ))}
              <Text style={styles.comparisonMore}>+ 3 more features</Text>
            </View>
          </View>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, isLoading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={isLoading}
        >
          <LinearGradient
            colors={isLoading ? ['#666', '#333'] : ['#00FF88', '#00CC6A']}
            style={styles.subscribeGradient}
          >
            {isLoading ? (
              <Text style={styles.subscribeButtonText}>Processing...</Text>
            ) : (
              <>
                <Icon name="workspace-premium" size={24} color="#000" />
                <Text style={styles.subscribeButtonText}>
                  Start Premium - {subscriptionPlans.find(p => p.id === selectedPlan)?.price}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy. 
            Subscription automatically renews unless cancelled 24 hours before renewal.
          </Text>
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
  restoreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  plansSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  plansScroll: {
    flexDirection: 'row',
  },
  planCard: {
    width: width * 0.7,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedPlanCard: {
    transform: [{ scale: 1.05 }],
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  planGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  planPeriod: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
  },
  planSavings: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 5,
  },
  checkIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  comparisonSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  comparisonCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  comparisonColumn: {
    flex: 1,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 20,
  },
  comparisonHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonText: {
    fontSize: 12,
    color: '#ccc',
    marginLeft: 8,
    flex: 1,
  },
  comparisonMore: {
    fontSize: 12,
    color: '#00FF88',
    fontStyle: 'italic',
    marginLeft: 24,
    marginTop: 5,
  },
  subscribeButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 10,
  },
  termsSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PremiumScreen;
