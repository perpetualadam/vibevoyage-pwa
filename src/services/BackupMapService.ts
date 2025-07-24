/**
 * Backup Map Service
 * Provides a lightweight fallback map using Canvas when Leaflet fails to load
 */

interface MapTile {
  x: number;
  y: number;
  z: number;
  url: string;
  loaded: boolean;
  image?: HTMLImageElement;
}

interface BackupMapOptions {
  center: { lat: number; lng: number };
  zoom: number;
  width: number;
  height: number;
  tileSize: number;
}

class BackupMapService {
  private static instance: BackupMapService;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private options: BackupMapOptions;
  private tiles: Map<string, MapTile> = new Map();
  private userLocation: { lat: number; lng: number } | null = null;
  private destination: { lat: number; lng: number } | null = null;
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };

  private constructor() {
    this.options = {
      center: { lat: 51.5074, lng: -0.1278 }, // London default
      zoom: 13,
      width: 800,
      height: 600,
      tileSize: 256
    };
  }

  public static getInstance(): BackupMapService {
    if (!BackupMapService.instance) {
      BackupMapService.instance = new BackupMapService();
    }
    return BackupMapService.instance;
  }

  public async initializeBackupMap(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('Map container not found');
    }

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'backupMapCanvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'grab';
    
    // Set canvas size
    const rect = container.getBoundingClientRect();
    this.options.width = rect.width || 800;
    this.options.height = rect.height || 600;
    
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(this.canvas);

    // Add event listeners
    this.setupEventListeners();

    // Initial render
    await this.render();

    console.log('Backup map initialized');
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;

    // Mouse events for panning
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas!.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.lastMousePos.x;
      const deltaY = e.clientY - this.lastMousePos.y;

      this.pan(deltaX, deltaY);
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas!.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas!.style.cursor = 'grab';
    });

    // Zoom with mouse wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -1 : 1;
      this.zoom(zoomDelta);
    });

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.isDragging || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - this.lastMousePos.x;
      const deltaY = e.touches[0].clientY - this.lastMousePos.y;

      this.pan(deltaX, deltaY);
      this.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    this.canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private pan(deltaX: number, deltaY: number): void {
    const scale = Math.pow(2, this.options.zoom);
    const worldSize = this.options.tileSize * scale;
    
    // Convert pixel movement to lat/lng movement
    const lngDelta = (deltaX / worldSize) * 360;
    const latDelta = -(deltaY / worldSize) * 360;

    this.options.center.lng += lngDelta;
    this.options.center.lat += latDelta;

    // Clamp coordinates
    this.options.center.lng = Math.max(-180, Math.min(180, this.options.center.lng));
    this.options.center.lat = Math.max(-85, Math.min(85, this.options.center.lat));

    this.render();
  }

  private zoom(delta: number): void {
    this.options.zoom = Math.max(1, Math.min(18, this.options.zoom + delta));
    this.render();
  }

  private async render(): Promise<void> {
    if (!this.ctx) return;

    // Clear canvas
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, this.options.width, this.options.height);

    // Load and draw tiles
    await this.loadTiles();
    this.drawTiles();

    // Draw markers
    this.drawMarkers();

    // Draw attribution
    this.drawAttribution();
  }

  private async loadTiles(): Promise<void> {
    const zoom = Math.floor(this.options.zoom);
    const scale = Math.pow(2, zoom);
    
    // Calculate tile bounds
    const centerTileX = Math.floor((this.options.center.lng + 180) / 360 * scale);
    const centerTileY = Math.floor((1 - Math.log(Math.tan(this.options.center.lat * Math.PI / 180) + 1 / Math.cos(this.options.center.lat * Math.PI / 180)) / Math.PI) / 2 * scale);

    const tilesX = Math.ceil(this.options.width / this.options.tileSize) + 2;
    const tilesY = Math.ceil(this.options.height / this.options.tileSize) + 2;

    const startX = centerTileX - Math.floor(tilesX / 2);
    const startY = centerTileY - Math.floor(tilesY / 2);

    const promises: Promise<void>[] = [];

    for (let x = startX; x < startX + tilesX; x++) {
      for (let y = startY; y < startY + tilesY; y++) {
        const tileKey = `${zoom}-${x}-${y}`;
        
        if (!this.tiles.has(tileKey)) {
          const tile: MapTile = {
            x,
            y,
            z: zoom,
            url: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
            loaded: false
          };
          
          this.tiles.set(tileKey, tile);
          promises.push(this.loadTile(tile));
        }
      }
    }

    await Promise.allSettled(promises);
  }

  private loadTile(tile: MapTile): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        tile.image = img;
        tile.loaded = true;
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`Failed to load tile: ${tile.url}`);
        resolve();
      };
      
      img.src = tile.url;
    });
  }

  private drawTiles(): void {
    if (!this.ctx) return;

    const zoom = Math.floor(this.options.zoom);
    const scale = Math.pow(2, zoom);
    
    // Calculate offset
    const centerTileX = (this.options.center.lng + 180) / 360 * scale;
    const centerTileY = (1 - Math.log(Math.tan(this.options.center.lat * Math.PI / 180) + 1 / Math.cos(this.options.center.lat * Math.PI / 180)) / Math.PI) / 2 * scale;

    const offsetX = (centerTileX - Math.floor(centerTileX)) * this.options.tileSize;
    const offsetY = (centerTileY - Math.floor(centerTileY)) * this.options.tileSize;

    this.tiles.forEach((tile) => {
      if (!tile.loaded || !tile.image || tile.z !== zoom) return;

      const x = (tile.x - Math.floor(centerTileX)) * this.options.tileSize + this.options.width / 2 - offsetX;
      const y = (tile.y - Math.floor(centerTileY)) * this.options.tileSize + this.options.height / 2 - offsetY;

      this.ctx!.drawImage(tile.image, x, y, this.options.tileSize, this.options.tileSize);
    });
  }

  private drawMarkers(): void {
    if (!this.ctx) return;

    // Draw user location
    if (this.userLocation) {
      const pos = this.latLngToPixel(this.userLocation.lat, this.userLocation.lng);
      this.drawMarker(pos.x, pos.y, '#00FF88', '📍');
    }

    // Draw destination
    if (this.destination) {
      const pos = this.latLngToPixel(this.destination.lat, this.destination.lng);
      this.drawMarker(pos.x, pos.y, '#FF6B6B', '🎯');
    }
  }

  private drawMarker(x: number, y: number, color: string, emoji: string): void {
    if (!this.ctx) return;

    // Draw marker background
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 15, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw emoji
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, x, y);
  }

  private drawAttribution(): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(this.options.width - 200, this.options.height - 20, 200, 20);

    this.ctx.fillStyle = '#333';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('© OpenStreetMap contributors', this.options.width - 5, this.options.height - 5);
  }

  private latLngToPixel(lat: number, lng: number): { x: number; y: number } {
    const zoom = this.options.zoom;
    const scale = Math.pow(2, zoom);
    
    const worldX = (lng + 180) / 360 * scale * this.options.tileSize;
    const worldY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale * this.options.tileSize;

    const centerWorldX = (this.options.center.lng + 180) / 360 * scale * this.options.tileSize;
    const centerWorldY = (1 - Math.log(Math.tan(this.options.center.lat * Math.PI / 180) + 1 / Math.cos(this.options.center.lat * Math.PI / 180)) / Math.PI) / 2 * scale * this.options.tileSize;

    return {
      x: worldX - centerWorldX + this.options.width / 2,
      y: worldY - centerWorldY + this.options.height / 2
    };
  }

  public setCenter(lat: number, lng: number): void {
    this.options.center = { lat, lng };
    this.render();
  }

  public setZoom(zoom: number): void {
    this.options.zoom = Math.max(1, Math.min(18, zoom));
    this.render();
  }

  public setUserLocation(lat: number, lng: number): void {
    this.userLocation = { lat, lng };
    this.render();
  }

  public setDestination(lat: number, lng: number): void {
    this.destination = { lat, lng };
    this.render();
  }

  public getCenter(): { lat: number; lng: number } {
    return { ...this.options.center };
  }

  public getZoom(): number {
    return this.options.zoom;
  }
}

export default BackupMapService;
