/**
 * Simple Build System for VibeVoyage PWA
 * Automatically versions files and updates references
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BuildSystem {
    constructor() {
        this.version = new Date().toISOString().replace(/[:.]/g, '-');
        this.fileHashes = new Map();
    }

    // Generate file hash for cache busting
    generateFileHash(filePath) {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    }

    // Update HTML file with new script versions
    updateHTMLReferences(htmlPath) {
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        // Find all script tags and update with version
        html = html.replace(
            /<script\s+src="([^"]+\.js)"/g,
            (match, src) => {
                if (!src.startsWith('http')) {
                    const hash = this.generateFileHash(src);
                    const versionedSrc = `${src}?v=${this.version}&h=${hash}`;
                    console.log(`📝 Updated: ${src} -> ${versionedSrc}`);
                    return `<script src="${versionedSrc}"`;
                }
                return match;
            }
        );

        // Write updated HTML
        fs.writeFileSync(htmlPath, html);
        console.log(`✅ Updated ${htmlPath}`);
    }

    // Build the project
    build() {
        console.log(`🚀 Building VibeVoyage PWA v${this.version}...`);
        
        try {
            // Update main HTML file
            this.updateHTMLReferences('index.html');
            
            // Update test HTML file if it exists
            if (fs.existsSync('test-fixed.html')) {
                this.updateHTMLReferences('test-fixed.html');
            }
            
            console.log('✅ Build completed successfully!');
            console.log(`📦 Version: ${this.version}`);
            
        } catch (error) {
            console.error('❌ Build failed:', error);
        }
    }
}

// Run build if called directly
if (require.main === module) {
    const builder = new BuildSystem();
    builder.build();
}

module.exports = BuildSystem;
