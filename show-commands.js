#!/usr/bin/env node

/**
 * VibeVoyage PWA - Command Helper
 * Shows organized list of all available commands
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function showCommands() {
    console.log(colorize('\n🚀 VibeVoyage PWA - Available Commands\n', 'cyan'));
    
    // Development Commands
    console.log(colorize('📱 DEVELOPMENT (Start Here!)', 'green'));
    console.log('  npm run dev        - Start development server (RECOMMENDED)');
    console.log('  npm run serve      - Same as dev');
    console.log('  npm start          - Standard npm start');
    console.log('');
    
    // Cache Management
    console.log(colorize('🔧 CACHE MANAGEMENT (Fix Issues)', 'yellow'));
    console.log('  npm run fix-cache  - Show all cache fix options');
    console.log('  npm run cache-bust - Force refresh cached files');
    console.log('  npm run clear-cache- Same as cache-bust');
    console.log('');
    
    // Build Commands
    console.log(colorize('🏗️  BUILD COMMANDS', 'blue'));
    console.log('  npm run build      - Build PWA for production');
    console.log('  npm run build:pwa  - Same as build');
    console.log('  npm run build:web  - Build web version');
    console.log('  npm run build:android - Build Android APK');
    console.log('  npm run build:ios  - Build iOS app');
    console.log('');
    
    // Testing
    console.log(colorize('🧪 TESTING & QUALITY', 'magenta'));
    console.log('  npm test           - Run all tests');
    console.log('  npm run lint       - Check code quality');
    console.log('  npm run analyze:bundle - Analyze bundle size');
    console.log('');
    
    // Deployment
    console.log(colorize('🚀 DEPLOYMENT', 'cyan'));
    console.log('  npm run deploy:vercel  - Deploy to Vercel');
    console.log('  npm run deploy:netlify - Deploy to Netlify');
    console.log('');
    
    // Mobile
    console.log(colorize('📱 MOBILE DEVELOPMENT', 'green'));
    console.log('  npm run android    - Run on Android');
    console.log('  npm run ios        - Run on iOS');
    console.log('  npm run mobile:start - Start React Native metro');
    console.log('');
    
    // Utilities
    console.log(colorize('🔧 UTILITIES', 'white'));
    console.log('  npm run help       - Show this help');
    console.log('  npm run cost:report- Generate cost analysis');
    console.log('  npm run free:check - Check free tier usage');
    console.log('');
    
    // Quick Start Guide
    console.log(colorize('⚡ QUICK START GUIDE', 'bright'));
    console.log(colorize('  1. npm run dev', 'green') + '     - Start development (most common)');
    console.log(colorize('  2. npm run fix-cache', 'yellow') + ' - If you see old errors');
    console.log(colorize('  3. npm run help', 'cyan') + '      - Get help anytime');
    console.log('');
    
    // Emergency Procedures
    console.log(colorize('🆘 EMERGENCY CACHE FIXES', 'red'));
    console.log('  1. npm run cache-bust');
    console.log('  2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    console.log('  3. Open test-fixed.html directly in browser');
    console.log('  4. Open hotfix.html for emergency patch');
    console.log('');
    
    // Important Files
    console.log(colorize('📁 IMPORTANT FILES', 'blue'));
    console.log('  • index-modern.html  - Modern version with cache busting');
    console.log('  • test-fixed.html    - Always works, no cache issues');
    console.log('  • hotfix.html        - Emergency fix page');
    console.log('  • App-Fixed.js       - Working version of the app');
    console.log('  • COMMANDS.md        - Full command documentation');
    console.log('');
    
    console.log(colorize('💡 Pro Tip: Always start with "npm run dev" for the best experience!', 'bright'));
    console.log('');
}

// Show commands
showCommands();

module.exports = { showCommands };
