import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const SafetyIndicator = ({ isDriving, speed }) => {
  const getSafetyStatus = () => {
    if (!isDriving) {
      return {
        status: 'safe',
        color: '#00FF88',
        icon: 'check-circle',
        text: 'Safe',
        description: 'Manual interaction allowed'
      };
    }

    if (speed > 5) {
      return {
        status: 'driving',
        color: '#FF6B6B',
        icon: 'drive-eta',
        text: 'Driving',
        description: 'Voice commands only'
      };
    }

    return {
      status: 'moving',
      color: '#FFA500',
      icon: 'warning',
      text: 'Moving',
      description: 'Slow speed detected'
    };
  };

  const safetyInfo = getSafetyStatus();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          `${safetyInfo.color}20`,
          `${safetyInfo.color}10`
        ]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Icon 
            name={safetyInfo.icon} 
            size={20} 
            color={safetyInfo.color} 
          />
          <View style={styles.textContainer}>
            <Text style={[styles.statusText, { color: safetyInfo.color }]}>
              {safetyInfo.text}
            </Text>
            <Text style={styles.descriptionText}>
              {safetyInfo.description}
            </Text>
          </View>
        </View>
        
        {/* Pulsing animation for driving state */}
        {isDriving && (
          <View style={[styles.pulseRing, { borderColor: safetyInfo.color }]} />
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
  pulseRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 2,
    opacity: 0.6,
  },
});

export default SafetyIndicator;
