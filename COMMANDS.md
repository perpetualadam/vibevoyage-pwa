# 🚀 VibeVoyage PWA - Command Reference

## 📋 Quick Start

```bash
# Start development (most common command)
npm run dev

# Fix cache issues (if you see old errors)
npm run fix-cache

# Get help with all commands
npm run help
```

## 📱 Development Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run dev` | Start development server | **Daily development** - Use this most often |
| `npm run serve` | Same as dev | Alternative command name |
| `npm start` | Alias for dev | Standard npm convention |

**🎯 Recommended**: Always use `npm run dev` for development to avoid cache issues!

## 🔧 Cache Management Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run fix-cache` | Show all cache fix options | **When you see old errors** |
| `npm run cache-bust` | Force refresh cached files | **Quick fix for cache issues** |
| `npm run clear-cache` | Same as cache-bust | Alternative name |

**🆘 Emergency Cache Fixes**:
1. `npm run fix-cache` - Shows all options
2. `npm run cache-bust` - Quick command fix
3. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Open `test-fixed.html` directly in browser
5. Open `hotfix.html` for emergency patch

## 🏗️ Build Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run build` | Build PWA for production | **Before deployment** |
| `npm run build:pwa` | Same as build | Alternative name |
| `npm run build:web` | Build web version with Expo | For web deployment |
| `npm run build:web-app` | Build + optimize web app | Full web build process |
| `npm run build:android` | Build Android APK | For Android release |
| `npm run build:ios` | Build iOS app | For iOS release |

## 🧪 Testing & Quality Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm test` | Run all tests | **Before committing code** |
| `npm run lint` | Check code quality | **Before committing code** |
| `npm run analyze:bundle` | Analyze bundle size | Performance optimization |

## 🚀 Deployment Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run deploy:vercel` | Deploy to Vercel | **Production deployment** |
| `npm run deploy:netlify` | Deploy to Netlify | **Production deployment** |

## 📱 Mobile Development Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run android` | Run on Android device/emulator | **Mobile development** |
| `npm run ios` | Run on iOS device/simulator | **Mobile development** |
| `npm run mobile:start` | Start React Native metro | Mobile development |

## 🌐 Web Development Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run web` | Start Expo web development | Alternative web development |
| `npm run web:serve` | Same as dev | Web-specific development |

## 🔧 Utility Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run help` | Show all available commands | **When you need help** |
| `npm run cost:report` | Generate cost analysis | Budget monitoring |
| `npm run free:check` | Check free tier usage | Resource monitoring |
| `npm run optimize:web` | Optimize web build | Performance improvement |

## 🎯 Most Common Workflows

### **Daily Development**
```bash
npm run dev          # Start development server
# Open http://localhost:3000
# Make your changes
# Refresh browser to see changes
```

### **Fix Cache Issues**
```bash
npm run fix-cache    # See all options
npm run cache-bust   # Quick fix
# OR hard refresh: Ctrl+Shift+R
```

### **Before Committing**
```bash
npm test            # Run tests
npm run lint        # Check code quality
npm run build       # Ensure it builds
```

### **Deployment**
```bash
npm run build       # Build for production
npm run deploy:vercel  # Deploy to Vercel
# OR
npm run deploy:netlify # Deploy to Netlify
```

## 🆘 Troubleshooting

### **Problem: Old errors still showing**
**Solution**: 
```bash
npm run fix-cache   # Shows all options
npm run cache-bust  # Quick fix
```

### **Problem: App won't load**
**Solutions**:
1. `npm run dev` - Use development server
2. Open `test-fixed.html` directly
3. Open `hotfix.html` for emergency fix

### **Problem: Scripts not working**
**Solution**:
```bash
npm install         # Reinstall dependencies
npm run dev         # Start fresh
```

### **Problem: Need help**
**Solution**:
```bash
npm run help        # Show all commands
```

## 📁 Important Files

- `index-modern.html` - Modern version with cache busting
- `test-fixed.html` - Always works, no cache issues
- `hotfix.html` - Emergency fix page
- `App-Fixed.js` - Working version of the app
- `dev-server-new.js` - Development server

## 🔗 Quick Links

- **Development**: `npm run dev` → `http://localhost:3000`
- **Test Page**: Open `test-fixed.html` in browser
- **Emergency Fix**: Open `hotfix.html` in browser
- **Help**: `npm run help`

---

**💡 Pro Tip**: Bookmark this file and always start with `npm run dev` for the best development experience!
