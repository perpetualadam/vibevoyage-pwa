# Contributing to VibeVoyage 🚗✨

Thank you for your interest in contributing to VibeVoyage! We welcome contributions from developers, designers, translators, and safety advocates who share our vision of safer, smarter, and more sustainable navigation.

## 🌟 Ways to Contribute

### 🔧 Code Contributions
- **Bug fixes**: Help us identify and fix issues
- **Feature development**: Implement new features from our roadmap
- **Performance improvements**: Optimize app performance and battery usage
- **Testing**: Write and improve test coverage
- **Documentation**: Improve code documentation and comments

### 🌍 Localization
- **Translations**: Help translate VibeVoyage into new languages
- **Regional compliance**: Add country-specific safety regulations
- **Cultural adaptation**: Ensure features work well in different regions

### 🎨 Design & UX
- **UI/UX improvements**: Enhance user interface and experience
- **Accessibility**: Make the app more accessible to users with disabilities
- **Icon and asset creation**: Design new icons, badges, and visual elements

### 📚 Documentation
- **User guides**: Create tutorials and how-to guides
- **Developer documentation**: Improve technical documentation
- **Safety guidelines**: Help document safety best practices

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- React Native development environment
- Git for version control
- Code editor (VS Code recommended)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/vibevoyage-app.git
   cd vibevoyage-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd ios && pod install && cd .. # iOS only
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   ```bash
   npm run android  # Android
   npm run ios      # iOS
   ```

### Project Structure
```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── services/       # Business logic and API services
├── context/        # React Context providers
├── utils/          # Utility functions
├── tests/          # Test files
└── assets/         # Images, fonts, etc.
```

## 📝 Development Guidelines

### Code Style
- Follow ESLint configuration
- Use TypeScript for type safety
- Write meaningful commit messages
- Keep functions small and focused
- Add JSDoc comments for public APIs

### Safety First
- **Never compromise safety features**
- Test all safety-related code thoroughly
- Ensure GPS speed detection works correctly
- Verify hands-free operation compliance
- Follow legal requirements for each region

### Testing Requirements
- Write unit tests for new features
- Maintain >70% code coverage
- Test edge cases and error scenarios
- Include integration tests for critical paths
- Test on both iOS and Android

### Performance Guidelines
- Optimize for battery life
- Minimize memory usage
- Use lazy loading where appropriate
- Profile performance regularly
- Consider offline functionality

## 🔄 Contribution Workflow

### 1. Choose an Issue
- Browse [open issues](https://github.com/vibevoyage/vibevoyage-app/issues)
- Look for issues labeled `good first issue` for beginners
- Comment on the issue to claim it
- Ask questions if anything is unclear

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Make Changes
- Follow coding standards
- Write tests for new functionality
- Update documentation as needed
- Test thoroughly on both platforms

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add voice command for eco routing

- Implement eco route voice command
- Add tests for voice recognition
- Update documentation
- Fixes #123"
```

### Commit Message Format
```
type(scope): brief description

Detailed explanation of changes
- List specific changes
- Reference issues with #number

Fixes #issue_number
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

Create a pull request with:
- Clear title and description
- Link to related issues
- Screenshots/videos for UI changes
- Test results and coverage

## 🧪 Testing Guidelines

### Running Tests
```bash
npm test                    # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:coverage     # Coverage report
```

### Test Categories
- **Unit tests**: Individual functions and components
- **Integration tests**: Service interactions
- **E2E tests**: Complete user workflows
- **Safety tests**: Critical safety feature validation

### Writing Tests
```javascript
describe('SafetyService', () => {
  it('should block manual interaction when driving', () => {
    // Arrange
    SafetyService.isDriving = true;
    
    // Act
    const result = SafetyService.shouldBlockManualInteraction();
    
    // Assert
    expect(result).toBe(true);
  });
});
```

## 🌍 Localization Guidelines

### Adding New Languages

1. **Join Crowdin project**: [crowdin.com/project/vibevoyage](https://crowdin.com/project/vibevoyage)
2. **Translate strings**: Focus on safety-critical messages first
3. **Review translations**: Ensure accuracy and cultural appropriateness
4. **Test in app**: Verify translations display correctly

### Translation Priorities
1. Safety disclaimers and warnings
2. Voice commands and responses
3. Navigation instructions
4. UI labels and buttons
5. Help and documentation

### Regional Compliance
When adding support for new countries:
- Research local traffic laws
- Add appropriate safety disclaimers
- Include emergency contact information
- Verify voice command compatibility

## 🎨 Design Guidelines

### UI/UX Principles
- **Safety first**: Never distract the driver
- **Accessibility**: Support screen readers and high contrast
- **Consistency**: Follow established design patterns
- **Performance**: Smooth animations and interactions

### Design Assets
- Use vector graphics (SVG) when possible
- Provide @2x and @3x versions for raster images
- Follow platform-specific design guidelines
- Maintain consistent color scheme and typography

## 🚨 Safety Considerations

### Critical Safety Rules
1. **No manual interaction while driving** (>5 mph)
2. **Voice commands must work reliably**
3. **Emergency features must always be accessible**
4. **Legal compliance in all supported regions**
5. **Clear safety disclaimers and warnings**

### Testing Safety Features
- Test GPS speed detection accuracy
- Verify interaction blocking works correctly
- Test voice recognition in noisy environments
- Validate emergency override functionality
- Check legal disclaimer display

## 📋 Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Safety features are not compromised
- [ ] Changes work on both iOS and Android
- [ ] Performance impact is acceptable
- [ ] Accessibility is maintained
- [ ] Legal compliance is verified

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- App credits screen
- Release notes for significant contributions
- Special badges for major contributors

## 📞 Getting Help

### Communication Channels
- **Discord**: [discord.gg/vibevoyage](https://discord.gg/vibevoyage)
- **GitHub Discussions**: For feature discussions
- **GitHub Issues**: For bug reports and feature requests
- **Email**: dev@vibevoyage.app for sensitive issues

### Mentorship
New contributors can request mentorship:
- Pair programming sessions
- Code review guidance
- Architecture discussions
- Career advice

## 📜 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, experience level, or identity.

### Expected Behavior
- Be respectful and constructive
- Focus on safety and user benefit
- Help others learn and grow
- Give credit where due
- Accept feedback gracefully

### Unacceptable Behavior
- Harassment or discrimination
- Compromising safety features
- Plagiarism or copyright violation
- Spam or off-topic discussions
- Disrespectful communication

## 🎯 Roadmap Priorities

### High Priority
- [ ] Advanced AR navigation features
- [ ] Improved voice recognition accuracy
- [ ] Enhanced community moderation
- [ ] Offline map support

### Medium Priority
- [ ] Social media integration
- [ ] Premium feature expansion
- [ ] Advanced analytics
- [ ] Fleet management tools

### Low Priority
- [ ] Smartwatch integration
- [ ] CarPlay/Android Auto support
- [ ] Advanced gamification
- [ ] Third-party integrations

## 📄 License

By contributing to VibeVoyage, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make navigation safer, smarter, and more sustainable! 🚗✨**

*Questions? Reach out to us at dev@vibevoyage.app*
