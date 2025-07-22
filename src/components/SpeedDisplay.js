import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const SpeedDisplay = ({ speed, isDriving, unit = 'mph' }) => {
  const getSpeedColor = () => {
    if (!isDriving) return '#666';
    if (speed < 25) return '#00FF88';
    if (speed < 45) return '#FFA500';
    if (speed < 65) return '#FF6B6B';
    return '#FF0000';
  };

  const getSpeedStatus = () => {
    if (!isDriving) return 'Stationary';
    if (speed < 5) return 'Slow';
    if (speed < 25) return 'City';
    if (speed < 45) return 'Suburban';
    if (speed < 65) return 'Highway';
    return 'Fast';
  };

  const speedColor = getSpeedColor();
  const speedStatus = getSpeedStatus();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[`${speedColor}20`, `${speedColor}10`]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.speedContainer}>
            <Text style={[styles.speedValue, { color: speedColor }]}>
              {Math.round(speed)}
            </Text>
            <Text style={[styles.speedUnit, { color: speedColor }]}>
              {unit}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <Icon 
              name={isDriving ? "speed" : "pause"} 
              size={12} 
              color={speedColor} 
            />
            <Text style={[styles.statusText, { color: speedColor }]}>
              {speedStatus}
            </Text>
          </View>
        </View>
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
    alignItems: 'center',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  speedValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  speedUnit: {
    fontSize: 10,
    marginLeft: 2,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default SpeedDisplay;
