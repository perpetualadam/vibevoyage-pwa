import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

class OfflineMapService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.downloadedRegions = [];
    this.downloadQueue = [];
    this.isDownloading = false;
    this.maxCacheSize = 500 * 1024 * 1024; // 500MB default
    this.tileServerUrl = 'https://tile.openstreetmap.org';
    this.mapCacheDir = `${RNFS.DocumentDirectoryPath}/maps`;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.createCacheDirectory();
      await this.loadDownloadedRegions();
      await this.loadSettings();
      this.isInitialized = true;
      console.log('OfflineMapService initialized successfully');
    } catch (error) {
      console.error('OfflineMapService initialization failed:', error);
      throw error;
    }
  }

  async createCacheDirectory() {
    try {
      const exists = await RNFS.exists(this.mapCacheDir);
      if (!exists) {
        await RNFS.mkdir(this.mapCacheDir);
      }
    } catch (error) {
      console.error('Error creating cache directory:', error);
      throw error;
    }
  }

  async downloadRegion(region, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      name = 'Unnamed Region',
      minZoom = 10,
      maxZoom = 16,
      priority = 'normal',
    } = options;

    const regionData = {
      id: Date.now(),
      name,
      bounds: region,
      minZoom,
      maxZoom,
      priority,
      status: 'queued',
      progress: 0,
      totalTiles: 0,
      downloadedTiles: 0,
      createdAt: Date.now(),
      size: 0,
    };

    // Calculate total tiles needed
    regionData.totalTiles = this.calculateTotalTiles(region, minZoom, maxZoom);

    // Add to download queue
    this.downloadQueue.push(regionData);
    this.downloadedRegions.push(regionData);
    
    await this.saveDownloadedRegions();
    this.notifyListeners('regionQueued', { region: regionData });

    // Start download if not already downloading
    if (!this.isDownloading) {
      this.processDownloadQueue();
    }

    return regionData;
  }

  calculateTotalTiles(bounds, minZoom, maxZoom) {
    let totalTiles = 0;

    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      const tileBounds = this.getTileBounds(bounds, zoom);
      const tilesX = tileBounds.maxX - tileBounds.minX + 1;
      const tilesY = tileBounds.maxY - tileBounds.minY + 1;
      totalTiles += tilesX * tilesY;
    }

    return totalTiles;
  }

  getTileBounds(bounds, zoom) {
    const { north, south, east, west } = bounds;
    
    return {
      minX: this.lonToTileX(west, zoom),
      maxX: this.lonToTileX(east, zoom),
      minY: this.latToTileY(north, zoom),
      maxY: this.latToTileY(south, zoom),
    };
  }

  lonToTileX(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  }

  latToTileY(lat, zoom) {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  }

  async processDownloadQueue() {
    if (this.isDownloading || this.downloadQueue.length === 0) return;

    this.isDownloading = true;
    this.notifyListeners('downloadStarted', {});

    // Sort queue by priority
    this.downloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    while (this.downloadQueue.length > 0) {
      const region = this.downloadQueue.shift();
      await this.downloadRegionTiles(region);
    }

    this.isDownloading = false;
    this.notifyListeners('downloadCompleted', {});
  }

  async downloadRegionTiles(region) {
    region.status = 'downloading';
    this.notifyListeners('regionDownloadStarted', { region });

    try {
      let downloadedTiles = 0;
      let totalSize = 0;

      for (let zoom = region.minZoom; zoom <= region.maxZoom; zoom++) {
        const tileBounds = this.getTileBounds(region.bounds, zoom);

        for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
          for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
            try {
              const tileSize = await this.downloadTile(x, y, zoom);
              downloadedTiles++;
              totalSize += tileSize;

              // Update progress
              region.progress = (downloadedTiles / region.totalTiles) * 100;
              region.downloadedTiles = downloadedTiles;
              region.size = totalSize;

              // Notify progress every 10 tiles
              if (downloadedTiles % 10 === 0) {
                this.notifyListeners('regionDownloadProgress', { region });
              }

              // Check cache size limit
              if (await this.getCacheSize() > this.maxCacheSize) {
                await this.cleanupOldTiles();
              }

            } catch (error) {
              console.error(`Error downloading tile ${x},${y},${zoom}:`, error);
              // Continue with next tile
            }
          }
        }
      }

      region.status = 'completed';
      region.completedAt = Date.now();
      await this.saveDownloadedRegions();
      
      this.notifyListeners('regionDownloadCompleted', { region });

    } catch (error) {
      region.status = 'failed';
      region.error = error.message;
      this.notifyListeners('regionDownloadFailed', { region, error });
    }
  }

  async downloadTile(x, y, zoom) {
    const tileUrl = `${this.tileServerUrl}/${zoom}/${x}/${y}.png`;
    const tilePath = `${this.mapCacheDir}/${zoom}/${x}`;
    const tileFile = `${tilePath}/${y}.png`;

    // Create directory if it doesn't exist
    const dirExists = await RNFS.exists(tilePath);
    if (!dirExists) {
      await RNFS.mkdir(tilePath, { recursive: true });
    }

    // Check if tile already exists
    const fileExists = await RNFS.exists(tileFile);
    if (fileExists) {
      const stat = await RNFS.stat(tileFile);
      return stat.size;
    }

    // Download tile
    const downloadResult = await RNFS.downloadFile({
      fromUrl: tileUrl,
      toFile: tileFile,
      headers: {
        'User-Agent': 'VibeVoyage/1.0.0',
      },
    }).promise;

    if (downloadResult.statusCode === 200) {
      const stat = await RNFS.stat(tileFile);
      return stat.size;
    } else {
      throw new Error(`Failed to download tile: ${downloadResult.statusCode}`);
    }
  }

  async getTileFromCache(x, y, zoom) {
    const tileFile = `${this.mapCacheDir}/${zoom}/${x}/${y}.png`;
    
    try {
      const exists = await RNFS.exists(tileFile);
      if (exists) {
        return `file://${tileFile}`;
      }
    } catch (error) {
      console.error('Error checking cached tile:', error);
    }
    
    return null;
  }

  async isRegionAvailableOffline(bounds, zoom) {
    const tileBounds = this.getTileBounds(bounds, zoom);
    let availableTiles = 0;
    let totalTiles = 0;

    for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
      for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
        totalTiles++;
        const tileFile = `${this.mapCacheDir}/${zoom}/${x}/${y}.png`;
        const exists = await RNFS.exists(tileFile);
        if (exists) {
          availableTiles++;
        }
      }
    }

    const coverage = (availableTiles / totalTiles) * 100;
    return {
      available: coverage > 80, // Consider available if >80% coverage
      coverage,
      availableTiles,
      totalTiles,
    };
  }

  async deleteRegion(regionId) {
    const region = this.downloadedRegions.find(r => r.id === regionId);
    if (!region) return;

    try {
      // Delete tiles for this region
      for (let zoom = region.minZoom; zoom <= region.maxZoom; zoom++) {
        const tileBounds = this.getTileBounds(region.bounds, zoom);
        
        for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
          for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
            const tileFile = `${this.mapCacheDir}/${zoom}/${x}/${y}.png`;
            const exists = await RNFS.exists(tileFile);
            if (exists) {
              await RNFS.unlink(tileFile);
            }
          }
        }
      }

      // Remove from downloaded regions
      this.downloadedRegions = this.downloadedRegions.filter(r => r.id !== regionId);
      await this.saveDownloadedRegions();
      
      this.notifyListeners('regionDeleted', { regionId });

    } catch (error) {
      console.error('Error deleting region:', error);
      throw error;
    }
  }

  async getCacheSize() {
    try {
      const files = await this.getAllCachedFiles();
      let totalSize = 0;

      for (const file of files) {
        try {
          const stat = await RNFS.stat(file);
          totalSize += stat.size;
        } catch (error) {
          // File might have been deleted, continue
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  async getAllCachedFiles() {
    const files = [];
    
    try {
      const zoomDirs = await RNFS.readDir(this.mapCacheDir);
      
      for (const zoomDir of zoomDirs) {
        if (zoomDir.isDirectory()) {
          const xDirs = await RNFS.readDir(zoomDir.path);
          
          for (const xDir of xDirs) {
            if (xDir.isDirectory()) {
              const tileFiles = await RNFS.readDir(xDir.path);
              
              for (const tileFile of tileFiles) {
                if (tileFile.isFile() && tileFile.name.endsWith('.png')) {
                  files.push(tileFile.path);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading cached files:', error);
    }
    
    return files;
  }

  async cleanupOldTiles() {
    try {
      const files = await this.getAllCachedFiles();
      
      // Sort by modification time (oldest first)
      const fileStats = await Promise.all(
        files.map(async (file) => {
          try {
            const stat = await RNFS.stat(file);
            return { path: file, mtime: stat.mtime, size: stat.size };
          } catch (error) {
            return null;
          }
        })
      );

      const validFiles = fileStats.filter(f => f !== null);
      validFiles.sort((a, b) => new Date(a.mtime) - new Date(b.mtime));

      // Delete oldest 20% of files
      const filesToDelete = validFiles.slice(0, Math.floor(validFiles.length * 0.2));
      
      for (const file of filesToDelete) {
        try {
          await RNFS.unlink(file.path);
        } catch (error) {
          console.error('Error deleting old tile:', error);
        }
      }

      this.notifyListeners('cacheCleanup', { 
        deletedFiles: filesToDelete.length,
        freedSpace: filesToDelete.reduce((sum, f) => sum + f.size, 0)
      });

    } catch (error) {
      console.error('Error cleaning up old tiles:', error);
    }
  }

  async clearAllCache() {
    try {
      await RNFS.unlink(this.mapCacheDir);
      await this.createCacheDirectory();
      
      this.downloadedRegions = [];
      await this.saveDownloadedRegions();
      
      this.notifyListeners('cacheCleared', {});
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  // Storage methods
  async loadDownloadedRegions() {
    try {
      const stored = await AsyncStorage.getItem('downloadedMapRegions');
      if (stored) {
        this.downloadedRegions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading downloaded regions:', error);
    }
  }

  async saveDownloadedRegions() {
    try {
      await AsyncStorage.setItem('downloadedMapRegions', JSON.stringify(this.downloadedRegions));
    } catch (error) {
      console.error('Error saving downloaded regions:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('offlineMapSettings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.maxCacheSize = settings.maxCacheSize || this.maxCacheSize;
        this.tileServerUrl = settings.tileServerUrl || this.tileServerUrl;
      }
    } catch (error) {
      console.error('Error loading offline map settings:', error);
    }
  }

  async saveSettings(settings) {
    try {
      const currentSettings = {
        maxCacheSize: this.maxCacheSize,
        tileServerUrl: this.tileServerUrl,
        ...settings,
      };
      
      await AsyncStorage.setItem('offlineMapSettings', JSON.stringify(currentSettings));
      
      // Update instance variables
      this.maxCacheSize = currentSettings.maxCacheSize;
      this.tileServerUrl = currentSettings.tileServerUrl;
      
    } catch (error) {
      console.error('Error saving offline map settings:', error);
    }
  }

  // Getters
  getDownloadedRegions() {
    return [...this.downloadedRegions];
  }

  getDownloadQueue() {
    return [...this.downloadQueue];
  }

  isDownloadInProgress() {
    return this.isDownloading;
  }

  // Listener management
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('OfflineMapService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.downloadQueue = [];
    this.isDownloading = false;
    this.isInitialized = false;
  }
}

export default new OfflineMapService();
