#!/usr/bin/env node

/**
 * 🚀 VibeVoyage PWA Build Script
 * Simple build script to prepare PWA for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🌟 Building VibeVoyage PWA...');
console.log('================================');

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
const buildDir = path.join(__dirname, 'build');

if (!fs.existsSync(publicDir)) {
    console.error('❌ Error: public directory not found!');
    console.error('Please ensure your PWA files are in the public/ directory');
    process.exit(1);
}

// Create build directory
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
    console.log('📁 Created build directory');
}

// Copy files from public to build
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        files.forEach(file => {
            copyRecursive(
                path.join(src, file),
                path.join(dest, file)
            );
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

try {
    console.log('📋 Copying PWA files...');
    copyRecursive(publicDir, buildDir);
    
    // Verify required files
    const requiredFiles = ['index.html', 'manifest.json', 'sw.js'];
    const missingFiles = [];
    
    requiredFiles.forEach(file => {
        const filePath = path.join(buildDir, file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
        }
    });
    
    if (missingFiles.length > 0) {
        console.warn('⚠️  Warning: Missing optional files:', missingFiles.join(', '));
        console.warn('   PWA will still work, but some features may be limited');
    }
    
    // Update manifest with correct paths if needed
    const manifestPath = path.join(buildDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Ensure start_url is correct for GitHub Pages
        if (!manifest.start_url || manifest.start_url === '/') {
            manifest.start_url = './';
        }
        
        // Update scope for GitHub Pages
        if (!manifest.scope || manifest.scope === '/') {
            manifest.scope = './';
        }
        
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('📝 Updated manifest.json for GitHub Pages');
    }
    
    // Create a simple 404.html for GitHub Pages SPA routing
    const html404 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>VibeVoyage - Redirecting...</title>
    <script>
        // GitHub Pages SPA redirect
        const path = window.location.pathname.slice(1);
        if (path) {
            window.location.replace(window.location.origin + '/#/' + path);
        } else {
            window.location.replace(window.location.origin);
        }
    </script>
</head>
<body>
    <p>Redirecting to VibeVoyage...</p>
</body>
</html>`;
    
    fs.writeFileSync(path.join(buildDir, '404.html'), html404);
    console.log('📄 Created 404.html for SPA routing');
    
    // Create CNAME file if custom domain is specified
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.homepage && !packageJson.homepage.includes('github.io')) {
            const domain = packageJson.homepage.replace(/^https?:\/\//, '').replace(/\/$/, '');
            fs.writeFileSync(path.join(buildDir, 'CNAME'), domain);
            console.log('🌐 Created CNAME file for custom domain:', domain);
        }
    }
    
    console.log('✅ PWA build completed successfully!');
    console.log('📁 Build files are ready in: ./build/');
    console.log('🚀 Ready for deployment to GitHub Pages!');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

console.log('');
console.log('🎉 Next steps:');
console.log('1. Commit and push your changes to GitHub');
console.log('2. Enable GitHub Pages in repository settings');
console.log('3. Your PWA will be live at: https://yourusername.github.io/vibevoyage-pwa');
console.log('4. Install it as an app on your devices!');
