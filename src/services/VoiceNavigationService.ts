/**
 * Voice Navigation Service using Web Speech API SpeechSynthesis
 * Provides turn-by-turn voice guidance and hazard alerts
 */

interface VoiceSettings {
  enabled: boolean;
  volume: number;
  rate: number;
  pitch: number;
  voice: string | null;
  language: string;
  hazardAlerts: boolean;
  navigationInstructions: boolean;
}

interface NavigationInstruction {
  type: 'turn' | 'continue' | 'arrive' | 'depart' | 'roundabout';
  direction?: 'left' | 'right' | 'straight' | 'slight_left' | 'slight_right' | 'sharp_left' | 'sharp_right';
  distance: number;
  street?: string;
  instruction: string;
  maneuver: string;
}

class VoiceNavigationService {
  private static instance: VoiceNavigationService;
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private settings: VoiceSettings;
  private isInitialized = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: string[] = [];
  private isPlaying = false;
  private storageKey = 'vibevoyage_voice_settings';

  private constructor() {
    this.synth = window.speechSynthesis;
    this.settings = this.loadSettings();
    this.initialize();
  }

  public static getInstance(): VoiceNavigationService {
    if (!VoiceNavigationService.instance) {
      VoiceNavigationService.instance = new VoiceNavigationService();
    }
    return VoiceNavigationService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Wait for voices to be loaded
      if (this.synth.getVoices().length === 0) {
        await new Promise<void>((resolve) => {
          this.synth.addEventListener('voiceschanged', () => {
            this.loadVoices();
            resolve();
          }, { once: true });
        });
      } else {
        this.loadVoices();
      }

      this.isInitialized = true;
      console.log('Voice Navigation Service initialized');
    } catch (error) {
      console.error('Failed to initialize Voice Navigation Service:', error);
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    
    // Prefer English voices
    const englishVoices = this.voices.filter(voice => 
      voice.lang.startsWith('en') && !voice.name.includes('Google')
    );
    
    if (englishVoices.length > 0 && !this.settings.voice) {
      // Prefer female voices for navigation
      const femaleVoice = englishVoices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen')
      );
      
      this.settings.voice = (femaleVoice || englishVoices[0]).name;
      this.saveSettings();
    }
  }

  private loadSettings(): VoiceSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load voice settings:', error);
    }
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): VoiceSettings {
    return {
      enabled: true,
      volume: 0.8,
      rate: 0.9,
      pitch: 1.0,
      voice: null,
      language: 'en-US',
      hazardAlerts: true,
      navigationInstructions: true
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save voice settings:', error);
    }
  }

  public async speak(text: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    if (!this.settings.enabled || !this.isInitialized) {
      return;
    }

    // Handle priority
    if (priority === 'high') {
      this.stop();
      this.queue.unshift(text);
    } else {
      this.queue.push(text);
    }

    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const text = this.queue.shift()!;

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings
      utterance.volume = this.settings.volume;
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.lang = this.settings.language;

      // Set voice if available
      if (this.settings.voice) {
        const selectedVoice = this.voices.find(voice => voice.name === this.settings.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
        this.processQueue();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        this.currentUtterance = null;
        resolve();
        this.processQueue();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  public stop(): void {
    this.synth.cancel();
    this.queue = [];
    this.currentUtterance = null;
    this.isPlaying = false;
  }

  public pause(): void {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  public announceNavigation(instruction: NavigationInstruction): void {
    if (!this.settings.navigationInstructions) {
      return;
    }

    const announcement = this.formatNavigationInstruction(instruction);
    this.speak(announcement, 'normal');
  }

  private formatNavigationInstruction(instruction: NavigationInstruction): string {
    const distance = this.formatDistance(instruction.distance);
    const street = instruction.street ? ` onto ${instruction.street}` : '';
    
    switch (instruction.type) {
      case 'turn':
        return `In ${distance}, turn ${instruction.direction?.replace('_', ' ')}${street}`;
      
      case 'continue':
        return `Continue ${instruction.direction === 'straight' ? 'straight' : instruction.direction?.replace('_', ' ')} for ${distance}`;
      
      case 'roundabout':
        return `In ${distance}, enter the roundabout and take the ${this.getOrdinal(instruction.maneuver)} exit${street}`;
      
      case 'arrive':
        return `In ${distance}, you will arrive at your destination`;
      
      case 'depart':
        return `Head ${instruction.direction?.replace('_', ' ')}${street}`;
      
      default:
        return instruction.instruction;
    }
  }

  private formatDistance(meters: number): string {
    if (meters < 100) {
      return `${Math.round(meters / 10) * 10} meters`;
    } else if (meters < 1000) {
      return `${Math.round(meters / 50) * 50} meters`;
    } else {
      const km = meters / 1000;
      if (km < 10) {
        return `${km.toFixed(1)} kilometers`;
      } else {
        return `${Math.round(km)} kilometers`;
      }
    }
  }

  private getOrdinal(num: string | number): string {
    const n = typeof num === 'string' ? parseInt(num) : num;
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  public announceHazard(hazardType: string, distance: number, severity: string): void {
    if (!this.settings.hazardAlerts) {
      return;
    }

    const hazardNames = {
      speed_camera: 'speed camera',
      red_light_camera: 'traffic light camera',
      roadwork: 'road works',
      average_speed_camera: 'average speed check zone'
    };

    const hazardName = hazardNames[hazardType as keyof typeof hazardNames] || 'hazard';
    const distanceText = this.formatDistance(distance);
    const urgency = severity === 'high' ? 'Warning! ' : '';
    
    const message = `${urgency}${hazardName} ahead in ${distanceText}`;
    this.speak(message, severity === 'high' ? 'high' : 'normal');
  }

  public announceSpeedLimit(speedLimit: number, currentSpeed?: number): void {
    if (!this.settings.navigationInstructions) {
      return;
    }

    let message = `Speed limit ${speedLimit}`;
    
    if (currentSpeed && currentSpeed > speedLimit + 5) {
      message = `Warning! Speed limit ${speedLimit}. You are exceeding the limit.`;
      this.speak(message, 'high');
    } else {
      this.speak(message, 'low');
    }
  }

  public announceArrival(): void {
    this.speak('You have arrived at your destination', 'normal');
  }

  public announceRerouting(): void {
    this.speak('Recalculating route', 'normal');
  }

  public announceOffRoute(): void {
    this.speak('You have left the planned route. Recalculating.', 'high');
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public testVoice(): void {
    this.speak('This is a test of the voice navigation system', 'normal');
  }

  public isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  public isReady(): boolean {
    return this.isInitialized && this.voices.length > 0;
  }
}

export default VoiceNavigationService;
export type { VoiceSettings, NavigationInstruction };
