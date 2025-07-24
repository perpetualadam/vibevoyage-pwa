/**
 * Dynamic Leaflet Loader Service
 * Loads Leaflet library dynamically with offline fallback capabilities
 */

interface LeafletLoadOptions {
  version?: string;
  timeout?: number;
  fallbackToLocal?: boolean;
  retryAttempts?: number;
}

class LeafletLoaderService {
  private static instance: LeafletLoaderService;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private fallbackAssets: { css: string; js: string } | null = null;

  private constructor() {}

  public static getInstance(): LeafletLoaderService {
    if (!LeafletLoaderService.instance) {
      LeafletLoaderService.instance = new LeafletLoaderService();
    }
    return LeafletLoaderService.instance;
  }

  /**
   * Load Leaflet library dynamically
   */
  public async loadLeaflet(options: LeafletLoadOptions = {}): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.performLoad(options);

    try {
      await this.loadPromise;
      this.isLoaded = true;
    } catch (error) {
      this.isLoading = false;
      this.loadPromise = null;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async performLoad(options: LeafletLoadOptions): Promise<void> {
    const {
      version = '1.9.4',
      timeout = 10000,
      fallbackToLocal = true,
      retryAttempts = 2
    } = options;

    // Check if Leaflet is already available globally
    if (typeof window !== 'undefined' && (window as any).L) {
      console.log('Leaflet already loaded globally');
      return;
    }

    let lastError: Error | null = null;

    // Try loading from CDN first
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        await this.loadFromCDN(version, timeout);
        console.log(`Leaflet ${version} loaded from CDN`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`CDN load attempt ${attempt + 1} failed:`, error);
        
        if (attempt < retryAttempts - 1) {
          await this.delay(1000 * (attempt + 1)); // Progressive delay
        }
      }
    }

    // Try fallback to local assets if enabled
    if (fallbackToLocal) {
      try {
        await this.loadFromLocal();
        console.log('Leaflet loaded from local fallback');
        return;
      } catch (error) {
        console.error('Local fallback failed:', error);
        lastError = error as Error;
      }
    }

    // Try loading from alternative CDNs
    const alternativeCDNs = [
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet',
      'https://cdn.jsdelivr.net/npm/leaflet',
      'https://unpkg.com/leaflet'
    ];

    for (const cdnBase of alternativeCDNs) {
      try {
        await this.loadFromAlternativeCDN(cdnBase, version, timeout);
        console.log(`Leaflet loaded from alternative CDN: ${cdnBase}`);
        return;
      } catch (error) {
        console.warn(`Alternative CDN ${cdnBase} failed:`, error);
        lastError = error as Error;
      }
    }

    throw new Error(`Failed to load Leaflet after all attempts. Last error: ${lastError?.message}`);
  }

  private async loadFromCDN(version: string, timeout: number): Promise<void> {
    const cssUrl = `https://unpkg.com/leaflet@${version}/dist/leaflet.css`;
    const jsUrl = `https://unpkg.com/leaflet@${version}/dist/leaflet.js`;

    await Promise.all([
      this.loadCSS(cssUrl, timeout),
      this.loadJS(jsUrl, timeout)
    ]);

    // Verify Leaflet is available
    if (!(window as any).L) {
      throw new Error('Leaflet object not found after loading');
    }
  }

  private async loadFromLocal(): Promise<void> {
    // Try to load from service worker cache or local assets
    const localPaths = [
      { css: '/assets/leaflet.css', js: '/assets/leaflet.js' },
      { css: '/lib/leaflet/leaflet.css', js: '/lib/leaflet/leaflet.js' },
      { css: '/vendor/leaflet.css', js: '/vendor/leaflet.js' }
    ];

    for (const paths of localPaths) {
      try {
        await Promise.all([
          this.loadCSS(paths.css, 5000),
          this.loadJS(paths.js, 5000)
        ]);

        if ((window as any).L) {
          return;
        }
      } catch (error) {
        console.warn(`Local path ${paths.js} failed:`, error);
      }
    }

    throw new Error('No local Leaflet assets found');
  }

  private async loadFromAlternativeCDN(cdnBase: string, version: string, timeout: number): Promise<void> {
    const cssUrl = `${cdnBase}/${version}/leaflet.css`;
    const jsUrl = `${cdnBase}/${version}/leaflet.js`;

    await Promise.all([
      this.loadCSS(cssUrl, timeout),
      this.loadJS(jsUrl, timeout)
    ]);

    if (!(window as any).L) {
      throw new Error('Leaflet object not found after loading from alternative CDN');
    }
  }

  private loadCSS(url: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existingLink = document.querySelector(`link[href="${url}"]`);
      if (existingLink) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.crossOrigin = 'anonymous';

      const timeoutId = setTimeout(() => {
        reject(new Error(`CSS load timeout: ${url}`));
      }, timeout);

      link.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      link.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load CSS: ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  private loadJS(url: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.crossOrigin = 'anonymous';

      const timeoutId = setTimeout(() => {
        reject(new Error(`JS load timeout: ${url}`));
      }, timeout);

      script.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load JS: ${url}`));
      };

      document.head.appendChild(script);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if Leaflet is available
   */
  public isLeafletAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).L;
  }

  /**
   * Get Leaflet version if available
   */
  public getLeafletVersion(): string | null {
    if (this.isLeafletAvailable()) {
      return (window as any).L.version || 'unknown';
    }
    return null;
  }

  /**
   * Preload Leaflet assets for offline use
   */
  public async preloadForOffline(version: string = '1.9.4'): Promise<void> {
    try {
      const cssUrl = `https://unpkg.com/leaflet@${version}/dist/leaflet.css`;
      const jsUrl = `https://unpkg.com/leaflet@${version}/dist/leaflet.js`;

      // Fetch and cache the assets
      const [cssResponse, jsResponse] = await Promise.all([
        fetch(cssUrl),
        fetch(jsUrl)
      ]);

      if (cssResponse.ok && jsResponse.ok) {
        const cssText = await cssResponse.text();
        const jsText = await jsResponse.text();

        // Store in localStorage for offline access
        localStorage.setItem('leaflet_css_cache', cssText);
        localStorage.setItem('leaflet_js_cache', jsText);
        localStorage.setItem('leaflet_version_cache', version);

        console.log(`Leaflet ${version} cached for offline use`);
      }
    } catch (error) {
      console.warn('Failed to preload Leaflet for offline use:', error);
    }
  }

  /**
   * Load from cached assets
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cssText = localStorage.getItem('leaflet_css_cache');
      const jsText = localStorage.getItem('leaflet_js_cache');
      const version = localStorage.getItem('leaflet_version_cache');

      if (!cssText || !jsText) {
        throw new Error('No cached Leaflet assets found');
      }

      // Inject CSS
      const style = document.createElement('style');
      style.textContent = cssText;
      document.head.appendChild(style);

      // Inject JS
      const script = document.createElement('script');
      script.textContent = jsText;
      document.head.appendChild(script);

      // Verify Leaflet is available
      if (!(window as any).L) {
        throw new Error('Leaflet object not found after loading from cache');
      }

      console.log(`Leaflet ${version} loaded from cache`);
    } catch (error) {
      throw new Error(`Failed to load from cache: ${error}`);
    }
  }

  /**
   * Clear cached assets
   */
  public clearCache(): void {
    localStorage.removeItem('leaflet_css_cache');
    localStorage.removeItem('leaflet_js_cache');
    localStorage.removeItem('leaflet_version_cache');
  }

  /**
   * Get cache info
   */
  public getCacheInfo(): { hasCache: boolean; version: string | null; size: number } {
    const cssCache = localStorage.getItem('leaflet_css_cache');
    const jsCache = localStorage.getItem('leaflet_js_cache');
    const version = localStorage.getItem('leaflet_version_cache');

    const size = (cssCache?.length || 0) + (jsCache?.length || 0);

    return {
      hasCache: !!(cssCache && jsCache),
      version,
      size
    };
  }

  /**
   * Reset loader state (for testing)
   */
  public reset(): void {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
  }
}

export default LeafletLoaderService;
