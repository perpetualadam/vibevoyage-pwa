# VibeVoyage 🚗✨

**Budget-friendly, Waze-inspired navigation app with enhanced safety, gamification, and eco-friendly features**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React%20Native-0.72.6-blue.svg)](https://reactnative.dev/)
[![Safety First](https://img.shields.io/badge/Safety-First-green.svg)](https://github.com/vibevoyage/vibevoyage-app)

## 🌟 Features

### 🛡️ Safety-First Design
- **GPS Speed Detection**: Automatically locks manual interactions when driving >5 mph
- **Hands-Free Voice Commands**: Complete voice control with "VibeVoyage" wake word
- **Legal Compliance**: Country-specific disclaimers and regulations (US, UK, Canada, Australia, Nigeria, Mexico, Indonesia, UAE)
- **Emergency Override**: Safety controls with emergency stop functionality

### 🎮 Enhanced Gamification
- **Daily/Weekly Challenges**: Safe driving, eco-routing, community moderation tasks
- **Badge System**: Earn badges like "Safe Navigator," "Eco Warrior," "Community Guardian"
- **Level Progression**: XP-based leveling with titles from "Novice Navigator" to "VibeVoyage Master"
- **Safety Streaks**: Reward consecutive days of safe driving

### 🌱 Eco-Friendly Routing
- **Carbon Footprint Tracking**: Real-time CO₂ emissions calculation
- **Fuel-Efficient Routes**: OSRM-powered eco-routing with OpenStreetMap data
- **Sustainability Metrics**: Track carbon and fuel savings over time
- **Eco Challenges**: Gamified environmental impact reduction

### 🗣️ Advanced Voice Control
- **Comprehensive Commands**: Navigation, reporting, route options, app control
- **Multi-Language Support**: 10+ languages with community translations
- **Context-Aware**: Different responses for driving vs. stationary states
- **Voice Feedback**: Text-to-speech confirmations and instructions

### 🚨 Community Safety Features
- **Real-Time Hazard Reports**: Police, accidents, traffic, road hazards
- **Community Moderation**: Trusted user verification system
- **Upvote/Downvote System**: Community-driven report accuracy
- **AI Anomaly Detection**: Hugging Face integration for fake report filtering

### 🔮 AR Navigation (Beta)
- **Camera Overlay**: Directional arrows overlaid on real-world view
- **Distance Indicators**: Real-time distance to next turn
- **Compass Integration**: Heading-aware navigation assistance
- **ViroReact Integration**: Cross-platform AR support

### 🌍 Global Localization
- **20+ Countries**: Localized regulations and road rules
- **10+ Languages**: Community-sourced translations via Crowdin
- **Cultural Adaptation**: Region-specific safety messages and features

### 💎 Premium Features
- **Ad-Free Experience**: Uninterrupted navigation
- **Custom Themes**: Neon, retro, minimalist map styles
- **Advanced Analytics**: Detailed driving behavior reports
- **Priority Beta Access**: Early access to new features

## 🛠️ Tech Stack

### Frontend
- **React Native 0.72.6**: Cross-platform mobile development
- **React Navigation 6**: Screen navigation and routing
- **React Native Maps**: Interactive map display
- **React Native Voice**: Speech recognition
- **React Native TTS**: Text-to-speech synthesis
- **ViroReact**: AR navigation capabilities

### Backend Services
- **OSRM**: Open-source routing engine
- **OpenStreetMap**: Map data and POI information
- **Hugging Face**: AI-powered content moderation
- **Firebase**: Push notifications and in-app purchases

### Development Tools
- **Jest**: Unit and integration testing
- **GitHub Actions**: CI/CD pipeline
- **ESLint**: Code quality and consistency
- **Crowdin**: Community translation management

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vibevoyage/vibevoyage-app.git
   cd vibevoyage-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS Setup**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Start Metro bundler**
   ```bash
   npm start
   ```

5. **Run on device**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   ```

### Environment Setup

Create a `.env` file in the root directory:
```env
OSRM_BASE_URL=https://router.project-osrm.org
HUGGING_FACE_API_KEY=your_api_key_here
FIREBASE_CONFIG=your_firebase_config
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Test Coverage
- **Safety Service**: GPS speed detection, interaction blocking
- **Voice Service**: Command recognition, TTS functionality
- **Game Service**: XP calculation, badge awarding, challenge completion
- **Routing Service**: Eco-route calculation, carbon footprint tracking

## 📱 Usage

### Voice Commands
- **Navigation**: "VibeVoyage, navigate to [destination]"
- **Reporting**: "VibeVoyage, report police ahead"
- **Route Options**: "VibeVoyage, switch to eco route"
- **AR Mode**: "VibeVoyage, start AR navigation"

### Safety Features
- App automatically detects driving speed >5 mph
- Manual interactions are blocked while driving
- Voice commands remain available for hands-free operation
- Emergency override available for critical situations

### Gamification
- Complete daily challenges for XP and badges
- Maintain safe driving streaks for bonus rewards
- Participate in community moderation for special badges
- Track eco-friendly routing for environmental impact

## 🌍 Localization

### Supported Languages
- English (US, UK, AU, CA)
- Spanish (Mexico)
- French (Canada)
- German
- Portuguese (Brazil)
- Indonesian (Bahasa)
- Arabic (UAE)
- Yoruba (Nigeria)
- Thai
- Swahili

### Contributing Translations
1. Join our [Crowdin project](https://crowdin.com/project/vibevoyage)
2. Select your language
3. Translate strings and review existing translations
4. Submit for community review

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Follow ESLint configuration
- Use TypeScript for type safety
- Write comprehensive tests
- Document new features

## 📄 Legal & Safety

### Disclaimer
**It is illegal to use a handheld mobile phone while driving in most jurisdictions. VibeVoyage is designed for hands-free use only. Users must comply with local traffic laws and regulations.**

### Privacy
- Location data processed locally
- Anonymous usage analytics only
- No personal data sharing
- GDPR/CCPA compliant

### Copyright
- Original implementation using open-source tools
- No proprietary Waze code or algorithms
- Distinct UI/UX design and features
- Independent routing and safety systems

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Core navigation and safety features
- [x] Basic gamification system
- [x] Voice command integration
- [x] Community reporting

### Phase 2 (Q2 2024)
- [ ] Advanced AR navigation
- [ ] Social media integration
- [ ] Premium feature rollout
- [ ] Expanded localization

### Phase 3 (Q3 2024)
- [ ] AI-powered route optimization
- [ ] Advanced community moderation
- [ ] Offline map support
- [ ] Fleet management features

## 📞 Support

- **Documentation**: [docs.vibevoyage.app](https://docs.vibevoyage.app)
- **Community**: [Discord](https://discord.gg/vibevoyage)
- **Issues**: [GitHub Issues](https://github.com/vibevoyage/vibevoyage-app/issues)
- **Email**: support@vibevoyage.app

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenStreetMap contributors for map data
- OSRM project for routing engine
- React Native community for excellent libraries
- Beta testers and community contributors

---

**Made with ❤️ for safer, smarter, and more sustainable navigation**

*VibeVoyage - Navigate Your Way, Safely*
