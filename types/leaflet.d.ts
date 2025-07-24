// Leaflet type definitions
declare global {
  interface Window {
    L: typeof import('leaflet');
    app: VibeVoyageApp;
  }
}

// Leaflet basic types
declare const L: {
  map(id: string, options?: any): any;
  tileLayer(url: string, options?: any): any;
  marker(latlng: [number, number], options?: any): any;
  polyline(latlngs: [number, number][], options?: any): any;
  divIcon(options: any): any;
  layerGroup(): any;
  featureGroup(layers?: any[]): any;
  control: {
    attribution(options?: any): any;
  };
};

export {};
