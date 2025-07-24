#!/usr/bin/env node

/**
 * Build script for TypeScript files
 * Compiles TypeScript to JavaScript for the PWA
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building VibeVoyage TypeScript...');

try {
  // Ensure dist directory exists
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Compile TypeScript
  console.log('📦 Compiling TypeScript files...');
  execSync('npx tsc', { stdio: 'inherit' });

  // Copy any additional assets if needed
  console.log('📋 Copying assets...');
  
  // Copy hazards.geojson to dist if it doesn't exist there
  const hazardsSource = path.join(__dirname, 'public', 'hazards.geojson');
  const hazardsDest = path.join(__dirname, 'dist', 'hazards.geojson');
  
  if (fs.existsSync(hazardsSource) && !fs.existsSync(hazardsDest)) {
    fs.copyFileSync(hazardsSource, hazardsDest);
    console.log('✅ Copied hazards.geojson to dist');
  }

  console.log('✅ TypeScript build completed successfully!');
  console.log('📁 Output directory: ./dist/');
  
  // List generated files
  const files = fs.readdirSync(distDir);
  console.log('📄 Generated files:');
  files.forEach(file => {
    console.log(`   - ${file}`);
  });

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
