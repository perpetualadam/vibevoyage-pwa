import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import VoiceService from '../services/VoiceService';

const ReportButton = ({ type, onPress, isDriving }) => {
  const [isPressed, setIsPressed] = useState(false);

  const getReportConfig = () => {
    const configs = {
      police: {
        icon: 'local-police',
        label: 'Police',
        color: '#007AFF',
        voiceHint: 'Say "Report police"'
      },
      accident: {
        icon: 'car-crash',
        label: 'Accident',
        color: '#FF6B6B',
        voiceHint: 'Say "Report accident"'
      },
      hazard: {
        icon: 'warning',
        label: 'Hazard',
        color: '#FFA500',
        voiceHint: 'Say "Report hazard"'
      },
      traffic: {
        icon: 'traffic',
        label: 'Traffic',
        color: '#9C27B0',
        voiceHint: 'Say "Report traffic"'
      }
    };
    return configs[type] || configs.hazard;
  };

  const config = getReportConfig();

  const handlePress = () => {
    if (isDriving) {
      // Show voice command hint for driving users
      Alert.alert(
        'Voice Command Required',
        `While driving, use voice commands to report safely.\n\n${config.voiceHint}`,
        [
          {
            text: 'Use Voice',
            onPress: () => {
              VoiceService.speak(`Say: VibeVoyage, ${config.voiceHint.toLowerCase()}`);
              VoiceService.startListening();
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      onPress(type);
    }
  };

  const handlePressIn = () => setIsPressed(true);
  const handlePressOut = () => setIsPressed(false);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      style={styles.container}
    >
      <LinearGradient
        colors={
          isDriving 
            ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
            : isPressed
            ? [config.color, `${config.color}CC`]
            : [`${config.color}40`, `${config.color}20`]
        }
        style={[
          styles.gradient,
          {
            borderColor: isDriving ? '#666' : config.color,
            transform: [{ scale: isPressed ? 0.95 : 1 }]
          }
        ]}
      >
        <Icon
          name={config.icon}
          size={20}
          color={isDriving ? '#999' : config.color}
        />
        <Text
          style={[
            styles.label,
            { color: isDriving ? '#999' : config.color }
          ]}
        >
          {config.label}
        </Text>

        {/* Driving mode indicator */}
        {isDriving && (
          <View style={styles.voiceIndicator}>
            <Icon name="mic" size={12} color="#999" />
          </View>
        )}
      </LinearGradient>

      {/* Voice hint for non-driving users */}
      {!isDriving && (
        <Text style={styles.hintText}>
          Tap or voice
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  hintText: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  voiceIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReportButton;
