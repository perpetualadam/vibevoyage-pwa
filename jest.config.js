module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|react-native-maps|react-native-voice|react-native-tts|react-native-share|react-native-linear-gradient|react-native-svg|react-native-animatable|react-native-progress|react-native-modal|react-native-chart-kit|react-native-sound|react-native-camera|react-native-permissions|react-native-device-info|react-native-background-timer|react-native-async-storage|react-native-geolocation-service|react-native-haptic-feedback|react-native-orientation-locker|react-native-keep-awake|react-native-splash-screen|react-native-config|react-native-localize|react-native-keychain|react-native-uuid|react-native-netinfo|react-native-slider|react-navigation|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
