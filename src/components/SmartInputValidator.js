import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SmartInputValidator = ({
  value,
  onChangeText,
  placeholder,
  validationType = 'text', // 'text', 'address', 'coordinates', 'phone', 'email'
  required = false,
  style,
  inputStyle,
  errorStyle,
  onValidationChange,
  showSuggestions = true,
  autoCorrect = true,
  multiline = false,
  maxLength,
  accessibilityLabel,
}) => {
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const errorAnim = useRef(new Animated.Value(0)).current;
  const suggestionAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    validateInput(value);
  }, [value, validationType, required]);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValid, errorMessage);
    }
  }, [isValid, errorMessage]);

  const validateInput = (text) => {
    if (!text && required) {
      setValidationError('This field is required');
      return false;
    }

    if (!text) {
      clearValidationError();
      return true;
    }

    switch (validationType) {
      case 'address':
        return validateAddress(text);
      case 'coordinates':
        return validateCoordinates(text);
      case 'phone':
        return validatePhone(text);
      case 'email':
        return validateEmail(text);
      case 'text':
      default:
        return validateText(text);
    }
  };

  const validateText = (text) => {
    if (text.length < 2) {
      setValidationError('Please enter at least 2 characters');
      return false;
    }
    
    clearValidationError();
    return true;
  };

  const validateAddress = (text) => {
    // Basic address validation
    if (text.length < 5) {
      setValidationError('Please enter a more complete address');
      return false;
    }

    // Check for common address patterns
    const addressPattern = /^[a-zA-Z0-9\s,.-]+$/;
    if (!addressPattern.test(text)) {
      setValidationError('Address contains invalid characters');
      return false;
    }

    // Generate address suggestions
    generateAddressSuggestions(text);
    
    clearValidationError();
    return true;
  };

  const validateCoordinates = (text) => {
    // Validate latitude,longitude format
    const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
    
    if (!coordPattern.test(text)) {
      setValidationError('Please enter coordinates in format: latitude,longitude');
      return false;
    }

    const [lat, lng] = text.split(',').map(coord => parseFloat(coord.trim()));
    
    if (lat < -90 || lat > 90) {
      setValidationError('Latitude must be between -90 and 90');
      return false;
    }
    
    if (lng < -180 || lng > 180) {
      setValidationError('Longitude must be between -180 and 180');
      return false;
    }

    clearValidationError();
    return true;
  };

  const validatePhone = (text) => {
    // Basic phone number validation
    const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
    
    if (!phonePattern.test(text.replace(/[\s\-\(\)]/g, ''))) {
      setValidationError('Please enter a valid phone number');
      return false;
    }

    clearValidationError();
    return true;
  };

  const validateEmail = (text) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(text)) {
      setValidationError('Please enter a valid email address');
      return false;
    }

    clearValidationError();
    return true;
  };

  const setValidationError = (message) => {
    setIsValid(false);
    setErrorMessage(message);
    
    // Animate error message
    Animated.spring(errorAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const clearValidationError = () => {
    setIsValid(true);
    setErrorMessage('');
    
    // Animate error message out
    Animated.timing(errorAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const generateAddressSuggestions = (text) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    // Simulate address suggestions (in real app, would use geocoding API)
    const mockSuggestions = [
      `${text} Street, City, State`,
      `${text} Avenue, City, State`,
      `${text} Road, City, State`,
      `${text} Boulevard, City, State`,
    ].filter(suggestion => 
      suggestion.toLowerCase().includes(text.toLowerCase())
    ).slice(0, 3);

    setSuggestions(mockSuggestions);
    
    if (mockSuggestions.length > 0 && showSuggestions) {
      setShowSuggestions(true);
      
      Animated.timing(suggestionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    
    if (suggestions.length > 0 && showSuggestions) {
      setShowSuggestions(true);
      
      Animated.timing(suggestionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Hide suggestions after a delay to allow for selection
    setTimeout(() => {
      setShowSuggestions(false);
      
      Animated.timing(suggestionAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 150);
  };

  const handleSuggestionPress = (suggestion) => {
    onChangeText(suggestion);
    setShowSuggestions(false);
    
    Animated.timing(suggestionAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const clearInput = () => {
    onChangeText('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getInputIcon = () => {
    switch (validationType) {
      case 'address':
        return 'location-on';
      case 'coordinates':
        return 'gps-fixed';
      case 'phone':
        return 'phone';
      case 'email':
        return 'email';
      default:
        return 'text-fields';
    }
  };

  const getKeyboardType = () => {
    switch (validationType) {
      case 'coordinates':
        return 'numeric';
      case 'phone':
        return 'phone-pad';
      case 'email':
        return 'email-address';
      default:
        return 'default';
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        !isValid && styles.inputContainerError,
      ]}>
        <Icon 
          name={getInputIcon()} 
          size={20} 
          color={isFocused ? '#00FF88' : '#666'} 
          style={styles.inputIcon}
        />
        
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#666"
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={getKeyboardType()}
          autoCorrect={autoCorrect}
          multiline={multiline}
          maxLength={maxLength}
          accessibilityLabel={accessibilityLabel || placeholder}
          accessibilityRole="text"
          accessibilityHint={`Enter ${validationType} here`}
        />
        
        {value.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearInput}
            accessibilityLabel="Clear input"
            accessibilityRole="button"
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
        
        {/* Validation Status Icon */}
        <View style={styles.validationIcon}>
          {value.length > 0 && (
            <Icon 
              name={isValid ? 'check-circle' : 'error'} 
              size={20} 
              color={isValid ? '#00FF88' : '#FF6B6B'} 
            />
          )}
        </View>
      </View>

      {/* Error Message */}
      {errorMessage && (
        <Animated.View 
          style={[
            styles.errorContainer,
            {
              opacity: errorAnim,
              transform: [{
                translateY: errorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              }],
            },
          ]}
        >
          <Icon name="error-outline" size={16} color="#FF6B6B" />
          <Text style={[styles.errorText, errorStyle]}>{errorMessage}</Text>
        </Animated.View>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Animated.View 
          style={[
            styles.suggestionsContainer,
            {
              opacity: suggestionAnim,
              transform: [{
                translateY: suggestionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              }],
            },
          ]}
        >
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
              accessibilityLabel={`Suggestion: ${suggestion}`}
              accessibilityRole="button"
            >
              <Icon name="location-on" size={16} color="#666" />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: '#00FF88',
    backgroundColor: '#1e1e1e',
  },
  inputContainerError: {
    borderColor: '#FF6B6B',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  validationIcon: {
    marginLeft: 8,
    width: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 6,
    flex: 1,
  },
  suggestionsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  suggestionText: {
    fontSize: 14,
    color: '#CCC',
    marginLeft: 8,
    flex: 1,
  },
});

export default SmartInputValidator;
