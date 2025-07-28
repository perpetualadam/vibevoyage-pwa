#!/usr/bin/env node

/**
 * 🚀 VibeVoyage PWA - Simple Build and Deploy Script
 * This script prepares the PWA for GitHub Pages deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🌟 Building VibeVoyage PWA for GitHub Pages...');
console.log('================================================');

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
    console.error('❌ Error: public directory not found!');
    console.error('Please ensure your PWA files are in the public/ directory');
    process.exit(1);
}

// Check essential files
const essentialFiles = ['index.html', 'manifest.json'];
const missingFiles = [];

essentialFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
    }
});

if (missingFiles.length > 0) {
    console.error('❌ Missing essential files:', missingFiles.join(', '));
    process.exit(1);
}

// Verify app.html exists (our main app)
const appHtmlPath = path.join(publicDir, 'app.html');
if (!fs.existsSync(appHtmlPath)) {
    console.warn('⚠️ app.html not found - creating redirect');
    
    // Update index.html to redirect to app.html or show error
    const indexPath = path.join(publicDir, 'index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Add fallback if app.html doesn't exist
    if (!indexContent.includes('app.html')) {
        console.log('📝 Adding app.html fallback to index.html');
        
        const fallbackScript = `
        <script>
        // Fallback if app.html doesn't exist
        setTimeout(() => {
            fetch('/app.html')
                .then(response => {
                    if (response.ok) {
                        window.location.href = '/app.html';
                    } else {
                        console.log('app.html not found, staying on index.html');
                        document.body.innerHTML += '<div style="text-align:center;margin-top:50px;"><h2>VibeVoyage</h2><p>Navigation app loading...</p></div>';
                    }
                })
                .catch(() => {
                    console.log('Network error, staying on index.html');
                });
        }, 3000);
        </script>
        `;
        
        indexContent = indexContent.replace('</body>', fallbackScript + '</body>');
        fs.writeFileSync(indexPath, indexContent);
    }
}

// Check service worker
const swPath = path.join(publicDir, 'sw.js');
if (!fs.existsSync(swPath)) {
    console.log('📝 Creating basic service worker...');
    
    const basicSW = `
// VibeVoyage Basic Service Worker
const CACHE_NAME = 'vibevoyage-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.html',
    '/app.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

console.log('VibeVoyage Service Worker loaded');
`;
    
    fs.writeFileSync(swPath, basicSW.trim());
}

// Verify manifest.json is valid
try {
    const manifestPath = path.join(publicDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Ensure required fields
    if (!manifest.name) manifest.name = 'VibeVoyage';
    if (!manifest.short_name) manifest.short_name = 'VibeVoyage';
    if (!manifest.start_url) manifest.start_url = '/';
    if (!manifest.display) manifest.display = 'standalone';
    if (!manifest.theme_color) manifest.theme_color = '#00FF88';
    if (!manifest.background_color) manifest.background_color = '#000000';
    
    // Write back the updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Manifest.json validated and updated');
    
} catch (error) {
    console.error('❌ Error validating manifest.json:', error.message);
    process.exit(1);
}

// Create .nojekyll file for GitHub Pages
const nojekyllPath = path.join(publicDir, '.nojekyll');
if (!fs.existsSync(nojekyllPath)) {
    fs.writeFileSync(nojekyllPath, '');
    console.log('📝 Created .nojekyll file for GitHub Pages');
}

// Create 404.html for SPA routing
const html404Path = path.join(publicDir, '404.html');
if (!fs.existsSync(html404Path)) {
    const html404 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>VibeVoyage - Redirecting...</title>
    <script>
        // GitHub Pages SPA redirect
        const path = window.location.pathname.slice(1);
        if (path && path !== '404.html') {
            window.location.replace(window.location.origin + '/#/' + path);
        } else {
            window.location.replace(window.location.origin);
        }
    </script>
</head>
<body>
    <div style="text-align:center;margin-top:100px;font-family:Arial,sans-serif;">
        <h1>🧭 VibeVoyage</h1>
        <p>Redirecting to navigation app...</p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(html404Path, html404);
    console.log('📝 Created 404.html for SPA routing');
}

// List all files that will be deployed
console.log('');
console.log('📋 Files ready for deployment:');
console.log('==============================');

function listFiles(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            console.log(`${prefix}📁 ${file}/`);
            listFiles(filePath, prefix + '  ');
        } else {
            const size = (stat.size / 1024).toFixed(1);
            console.log(`${prefix}📄 ${file} (${size} KB)`);
        }
    });
}

listFiles(publicDir);

console.log('');
console.log('✅ VibeVoyage PWA build complete!');
console.log('🚀 Ready for GitHub Pages deployment!');
console.log('');
console.log('📋 Next steps:');
console.log('1. Commit and push changes to GitHub');
console.log('2. Enable GitHub Pages in repository settings');
console.log('3. Your PWA will be live at: https://perpetualadam.github.io/vibevoyage-pwa');
console.log('4. Install it as an app on your devices!');
console.log('');
console.log('🎉 Happy navigating with VibeVoyage! 🗺️✨');
