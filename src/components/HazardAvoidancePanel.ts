/**
 * Hazard Avoidance Panel Component
 * Provides toggle switches for different hazard types with localStorage persistence
 */

interface HazardAvoidanceSettings {
  avoidSpeedCameras: boolean;
  avoidRedLightCameras: boolean;
  avoidRoadworks: boolean;
  avoidAverageSpeedCameras: boolean;
  alertDistance: number;
  voiceAlerts: boolean;
  visualAlerts: boolean;
}

class HazardAvoidancePanel {
  private container: HTMLElement;
  private settings: HazardAvoidanceSettings;
  private listeners: Array<(settings: HazardAvoidanceSettings) => void> = [];
  private storageKey = 'vibevoyage_hazard_settings';

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.settings = this.loadSettings();
    this.render();
    this.attachEventListeners();
  }

  private loadSettings(): HazardAvoidanceSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load hazard avoidance settings:', error);
    }
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): HazardAvoidanceSettings {
    return {
      avoidSpeedCameras: true,
      avoidRedLightCameras: true,
      avoidRoadworks: false,
      avoidAverageSpeedCameras: true,
      alertDistance: 500,
      voiceAlerts: true,
      visualAlerts: true
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to save hazard avoidance settings:', error);
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="hazard-avoidance-panel">
        <div class="panel-header">
          <h3>🚨 Hazard Avoidance</h3>
          <p>Choose which hazards to avoid during navigation</p>
        </div>
        
        <div class="hazard-toggles">
          <div class="toggle-group">
            <h4>📸 Camera Avoidance</h4>
            
            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-icon">📷</span>
                <div class="toggle-text">
                  <strong>Speed Cameras</strong>
                  <small>Avoid fixed and mobile speed cameras</small>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="avoidSpeedCameras" ${this.settings.avoidSpeedCameras ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-icon">🚦</span>
                <div class="toggle-text">
                  <strong>Red Light Cameras</strong>
                  <small>Avoid traffic light enforcement cameras</small>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="avoidRedLightCameras" ${this.settings.avoidRedLightCameras ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-icon">📊</span>
                <div class="toggle-text">
                  <strong>Average Speed Cameras</strong>
                  <small>Avoid average speed check zones</small>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="avoidAverageSpeedCameras" ${this.settings.avoidAverageSpeedCameras ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="toggle-group">
            <h4>🚧 Road Conditions</h4>
            
            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-icon">🚧</span>
                <div class="toggle-text">
                  <strong>Road Works</strong>
                  <small>Avoid construction zones and lane closures</small>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="avoidRoadworks" ${this.settings.avoidRoadworks ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="toggle-group">
            <h4>🔔 Alert Settings</h4>
            
            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-icon">🔊</span>
                <div class="toggle-text">
                  <strong>Voice Alerts</strong>
                  <small>Spoken warnings for upcoming hazards</small>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="voiceAlerts" ${this.settings.voiceAlerts ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-icon">👁️</span>
                <div class="toggle-text">
                  <strong>Visual Alerts</strong>
                  <small>On-screen notifications for hazards</small>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="visualAlerts" ${this.settings.visualAlerts ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="range-item">
              <div class="range-info">
                <span class="range-icon">📏</span>
                <div class="range-text">
                  <strong>Alert Distance</strong>
                  <small>How far ahead to warn about hazards</small>
                </div>
              </div>
              <div class="range-control">
                <input type="range" id="alertDistance" min="100" max="1000" step="50" value="${this.settings.alertDistance}">
                <span class="range-value">${this.settings.alertDistance}m</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <button class="btn btn-secondary" onclick="this.resetToDefaults()">Reset to Defaults</button>
          <div class="settings-info">
            <small>Settings are saved automatically</small>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  private addStyles(): void {
    if (document.getElementById('hazard-avoidance-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'hazard-avoidance-styles';
    styles.textContent = `
      .hazard-avoidance-panel {
        background: #1a1a1a;
        border-radius: 12px;
        padding: 20px;
        color: #fff;
        border: 1px solid #333;
      }

      .panel-header {
        margin-bottom: 20px;
        text-align: center;
      }

      .panel-header h3 {
        margin: 0 0 8px 0;
        color: #00FF88;
        font-size: 18px;
      }

      .panel-header p {
        margin: 0;
        color: #ccc;
        font-size: 14px;
      }

      .hazard-toggles {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .toggle-group {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid #333;
      }

      .toggle-group h4 {
        margin: 0 0 15px 0;
        color: #00FF88;
        font-size: 14px;
        font-weight: bold;
      }

      .toggle-item, .range-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #333;
      }

      .toggle-item:last-child, .range-item:last-child {
        border-bottom: none;
      }

      .toggle-info, .range-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .toggle-icon, .range-icon {
        font-size: 20px;
        min-width: 24px;
        text-align: center;
      }

      .toggle-text, .range-text {
        flex: 1;
      }

      .toggle-text strong, .range-text strong {
        display: block;
        color: #fff;
        font-size: 14px;
        margin-bottom: 2px;
      }

      .toggle-text small, .range-text small {
        color: #ccc;
        font-size: 12px;
      }

      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
      }

      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #333;
        transition: 0.3s;
        border-radius: 24px;
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: #666;
        transition: 0.3s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: #00FF88;
      }

      input:checked + .slider:before {
        transform: translateX(26px);
        background-color: #000;
      }

      .range-control {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .range-control input[type="range"] {
        width: 120px;
        height: 4px;
        border-radius: 2px;
        background: #333;
        outline: none;
        -webkit-appearance: none;
      }

      .range-control input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00FF88;
        cursor: pointer;
      }

      .range-control input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00FF88;
        cursor: pointer;
        border: none;
      }

      .range-value {
        color: #00FF88;
        font-weight: bold;
        font-size: 12px;
        min-width: 40px;
      }

      .panel-footer {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .settings-info small {
        color: #666;
        font-size: 11px;
      }

      @media (max-width: 768px) {
        .hazard-avoidance-panel {
          padding: 15px;
        }

        .toggle-item, .range-item {
          padding: 10px 0;
        }

        .toggle-info, .range-info {
          gap: 8px;
        }

        .toggle-icon, .range-icon {
          font-size: 18px;
        }

        .range-control input[type="range"] {
          width: 100px;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  private attachEventListeners(): void {
    // Toggle switches
    const toggles = ['avoidSpeedCameras', 'avoidRedLightCameras', 'avoidRoadworks', 'avoidAverageSpeedCameras', 'voiceAlerts', 'visualAlerts'];
    
    toggles.forEach(toggleId => {
      const element = document.getElementById(toggleId) as HTMLInputElement;
      if (element) {
        element.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          (this.settings as any)[toggleId] = target.checked;
          this.saveSettings();
        });
      }
    });

    // Alert distance range
    const alertDistanceElement = document.getElementById('alertDistance') as HTMLInputElement;
    if (alertDistanceElement) {
      alertDistanceElement.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.settings.alertDistance = parseInt(target.value);
        const valueDisplay = this.container.querySelector('.range-value');
        if (valueDisplay) {
          valueDisplay.textContent = `${this.settings.alertDistance}m`;
        }
        this.saveSettings();
      });
    }
  }

  public resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
    this.render();
    this.attachEventListeners();
  }

  public getSettings(): HazardAvoidanceSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<HazardAvoidanceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.render();
    this.attachEventListeners();
  }

  public onSettingsChange(callback: (settings: HazardAvoidanceSettings) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.settings));
  }

  public show(): void {
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public toggle(): void {
    if (this.container.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }
}

export default HazardAvoidancePanel;
export type { HazardAvoidanceSettings };
