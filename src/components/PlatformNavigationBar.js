import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import PlatformUIService from '../services/PlatformUIService';

const PlatformNavigationBar = ({
  title,
  leftAction,
  rightAction,
  backgroundColor = '#000',
  textColor = '#FFF',
  showBackButton = false,
  onBackPress,
  style,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const [platformStyles, setPlatformStyles] = useState({});

  useEffect(() => {
    initializePlatformStyles();
    
    const unsubscribe = PlatformUIService.addListener((event, data) => {
      if (event === 'platformSettingsUpdated') {
        initializePlatformStyles();
      }
    });

    return unsubscribe;
  }, []);

  const initializePlatformStyles = async () => {
    if (!PlatformUIService.isInitialized) {
      await PlatformUIService.initialize();
    }
    
    const styles = PlatformUIService.getNavigationBarStyle();
    setPlatformStyles(styles);
  };

  const handleBackPress = () => {
    PlatformUIService.triggerHapticFeedback('light');
    if (onBackPress) {
      onBackPress();
    }
  };

  const handleLeftAction = () => {
    PlatformUIService.triggerHapticFeedback('light');
    if (leftAction?.onPress) {
      leftAction.onPress();
    }
  };

  const handleRightAction = () => {
    PlatformUIService.triggerHapticFeedback('light');
    if (rightAction?.onPress) {
      rightAction.onPress();
    }
  };

  const renderLeftContent = () => {
    if (showBackButton) {
      return (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleBackPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon 
            name={Platform.OS === 'ios' ? 'arrow-back-ios' : 'arrow-back'} 
            size={24} 
            color={textColor} 
          />
        </TouchableOpacity>
      );
    }

    if (leftAction) {
      return (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLeftAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {leftAction.icon ? (
            <Icon name={leftAction.icon} size={24} color={textColor} />
          ) : (
            <Text style={[styles.actionText, { color: textColor }]}>
              {leftAction.title}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    return <View style={styles.actionButton} />;
  };

  const renderRightContent = () => {
    if (rightAction) {
      return (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRightAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {rightAction.icon ? (
            <Icon name={rightAction.icon} size={24} color={textColor} />
          ) : (
            <Text style={[styles.actionText, { color: textColor }]}>
              {rightAction.title}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    return <View style={styles.actionButton} />;
  };

  const renderTitle = () => {
    if (typeof title === 'string') {
      return (
        <Text 
          style={[
            styles.title, 
            { color: textColor },
            Platform.OS === 'ios' && styles.titleiOS,
            Platform.OS === 'android' && styles.titleAndroid,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      );
    }

    return title;
  };

  const getContainerStyle = () => {
    const baseStyle = {
      ...styles.container,
      ...platformStyles,
      backgroundColor,
      paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0,
    };

    return [baseStyle, style];
  };

  return (
    <View style={getContainerStyle()}>
      {/* Status bar background for iOS */}
      {Platform.OS === 'ios' && (
        <View 
          style={[
            styles.statusBarBackground, 
            { 
              backgroundColor,
              height: insets.top,
            }
          ]} 
        />
      )}

      {/* Navigation bar content */}
      <View style={styles.navigationContent}>
        <View style={styles.leftContainer}>
          {renderLeftContent()}
        </View>

        <View style={styles.titleContainer}>
          {renderTitle()}
        </View>

        <View style={styles.rightContainer}>
          {renderRightContent()}
        </View>
      </View>

      {/* Custom children content */}
      {children && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}

      {/* Platform-specific border */}
      <View style={[
        styles.border,
        Platform.OS === 'ios' && styles.borderiOS,
        Platform.OS === 'android' && styles.borderAndroid,
      ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    zIndex: 1000,
  },
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  navigationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Platform.OS === 'ios' ? 44 : 56,
    paddingHorizontal: 16,
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: Platform.OS === 'ios' ? '400' : '500',
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 17 : 20,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    textAlign: 'center',
  },
  titleiOS: {
    fontFamily: 'SF Pro Display',
  },
  titleAndroid: {
    fontFamily: 'Roboto',
  },
  childrenContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  border: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#333',
  },
  borderiOS: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  borderAndroid: {
    backgroundColor: '#333',
  },
});

export default PlatformNavigationBar;
