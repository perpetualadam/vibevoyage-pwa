/**
 * Dynamic Cache Buster for VibeVoyage PWA
 * Automatically handles cache invalidation
 */

class CacheBuster {
    constructor() {
        this.version = Date.now();
        this.scripts = new Map();
    }

    // Load script with automatic cache busting
    loadScript(src, options = {}) {
        return new Promise((resolve, reject) => {
            // Remove existing script if it exists
            const existingScript = document.querySelector(`script[data-src="${src}"]`);
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            const cacheBustedSrc = this.addCacheBuster(src);
            
            script.src = cacheBustedSrc;
            script.defer = options.defer || false;
            script.async = options.async || false;
            script.setAttribute('data-src', src);
            
            script.onload = () => {
                console.log(`✅ Script loaded: ${src}`);
                resolve(script);
            };
            
            script.onerror = () => {
                console.error(`❌ Failed to load script: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            document.head.appendChild(script);
            this.scripts.set(src, script);
        });
    }

    // Add cache busting parameters
    addCacheBuster(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${this.version}&t=${Date.now()}&cb=${Math.random()}`;
    }

    // Reload a specific script
    async reloadScript(src) {
        console.log(`🔄 Reloading script: ${src}`);
        const existingScript = this.scripts.get(src);
        if (existingScript) {
            existingScript.remove();
        }
        return await this.loadScript(src);
    }

    // Force reload all scripts
    async reloadAllScripts() {
        console.log('🔄 Reloading all scripts...');
        const promises = Array.from(this.scripts.keys()).map(src => this.reloadScript(src));
        return await Promise.all(promises);
    }
}

// Global cache buster instance
window.cacheBuster = new CacheBuster();

// Auto-reload scripts on error
window.addEventListener('error', (event) => {
    if (event.target.tagName === 'SCRIPT') {
        const src = event.target.getAttribute('data-src');
        if (src) {
            console.warn(`⚠️ Script error detected, reloading: ${src}`);
            window.cacheBuster.reloadScript(src);
        }
    }
});

console.log('🔧 Cache Buster initialized');
