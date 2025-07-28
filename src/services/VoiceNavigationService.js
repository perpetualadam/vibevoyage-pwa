/**
 * JavaScript Voice Navigation Service
 * Replaces the TypeScript version with pure JavaScript implementation
 */

class VoiceNavigationService {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.recognition = null;
        this.isListening = false;
        this.isSpeaking = false;
        this.voices = [];
        this.currentVoice = null;
        this.settings = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            language: 'en-US'
        };
        
        this.initializeVoices();
        this.initializeSpeechRecognition();
    }

    initializeVoices() {
        const loadVoices = () => {
            this.voices = this.synthesis.getVoices();
            
            // Find a suitable default voice
            this.currentVoice = this.voices.find(voice => 
                voice.lang.startsWith(this.settings.language)
            ) || this.voices[0];
            
            console.log(`VoiceNavigationService: Loaded ${this.voices.length} voices`);
        };

        // Load voices immediately if available
        loadVoices();
        
        // Also load when voices change (some browsers load them asynchronously)
        this.synthesis.addEventListener('voiceschanged', loadVoices);
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.settings.language;

        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('Voice recognition started');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log('Voice recognition ended');
        };

        this.recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            this.isListening = false;
        };
    }

    // Text-to-Speech methods
    speak(text, priority = 'normal') {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            // Cancel current speech if high priority
            if (priority === 'high' && this.isSpeaking) {
                this.synthesis.cancel();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Apply settings
            utterance.voice = this.currentVoice;
            utterance.rate = this.settings.rate;
            utterance.pitch = this.settings.pitch;
            utterance.volume = this.settings.volume;

            utterance.onstart = () => {
                this.isSpeaking = true;
                console.log(`Speaking: "${text}"`);
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                resolve();
            };

            utterance.onerror = (event) => {
                this.isSpeaking = false;
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };

            this.synthesis.speak(utterance);
        });
    }

    // Navigation-specific speech methods
    async announceDirection(instruction, distance = null, streetName = null) {
        let announcement = instruction;
        
        if (distance) {
            const distanceText = this.formatDistance(distance);
            announcement = `In ${distanceText}, ${instruction}`;
        }
        
        if (streetName) {
            announcement += ` onto ${streetName}`;
        }

        await this.speak(announcement, 'high');
    }

    async announceSpeedLimit(speedLimit) {
        await this.speak(`Speed limit ${speedLimit} miles per hour`, 'normal');
    }

    async announceSpeedWarning() {
        await this.speak('Reduce speed', 'high');
    }

    async announceHazard(hazardType, distance) {
        const distanceText = this.formatDistance(distance);
        const hazardName = this.getHazardAnnouncement(hazardType);
        await this.speak(`${hazardName} ahead in ${distanceText}`, 'high');
    }

    async announceArrival(destination) {
        await this.speak(`You have arrived at ${destination}`, 'high');
    }

    async announceRouteRecalculation() {
        await this.speak('Route recalculating', 'normal');
    }

    // Speech Recognition methods
    startListening() {
        if (!this.recognition || this.isListening) {
            return Promise.reject(new Error('Speech recognition not available or already listening'));
        }

        return new Promise((resolve, reject) => {
            this.recognition.onresult = (event) => {
                const result = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                resolve({
                    transcript: result,
                    confidence: confidence
                });
            };

            this.recognition.onerror = (event) => {
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            this.recognition.start();
        });
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Voice command processing
    async processVoiceCommand(transcript) {
        const command = transcript.toLowerCase().trim();
        
        // Navigation commands
        if (command.includes('navigate to') || command.includes('go to')) {
            const destination = command.replace(/navigate to|go to/g, '').trim();
            return { type: 'navigate', destination: destination };
        }
        
        if (command.includes('stop navigation') || command.includes('cancel route')) {
            return { type: 'stop_navigation' };
        }
        
        if (command.includes('repeat') || command.includes('say again')) {
            return { type: 'repeat_instruction' };
        }
        
        if (command.includes('mute') || command.includes('quiet')) {
            return { type: 'mute_voice' };
        }
        
        if (command.includes('unmute') || command.includes('voice on')) {
            return { type: 'unmute_voice' };
        }
        
        // Speed and hazard commands
        if (command.includes('speed limit') || command.includes('what is the speed limit')) {
            return { type: 'query_speed_limit' };
        }
        
        if (command.includes('hazards') || command.includes('dangers ahead')) {
            return { type: 'query_hazards' };
        }
        
        // General commands
        if (command.includes('help') || command.includes('what can you do')) {
            return { type: 'help' };
        }
        
        return { type: 'unknown', transcript: transcript };
    }

    // Utility methods
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} meters`;
        } else {
            const km = (meters / 1000).toFixed(1);
            return `${km} kilometers`;
        }
    }

    getHazardAnnouncement(hazardType) {
        const announcements = {
            'speed_camera': 'Speed camera',
            'red_light_camera': 'Red light camera',
            'roadwork': 'Road work',
            'average_speed_camera': 'Average speed camera',
            'traffic_light': 'Traffic light',
            'school_zone': 'School zone',
            'hospital_zone': 'Hospital zone'
        };
        
        return announcements[hazardType] || 'Hazard';
    }

    // Settings management
    setVoice(voiceIndex) {
        if (voiceIndex >= 0 && voiceIndex < this.voices.length) {
            this.currentVoice = this.voices[voiceIndex];
            console.log(`Voice changed to: ${this.currentVoice.name}`);
        }
    }

    setRate(rate) {
        this.settings.rate = Math.max(0.1, Math.min(10, rate));
    }

    setPitch(pitch) {
        this.settings.pitch = Math.max(0, Math.min(2, pitch));
    }

    setVolume(volume) {
        this.settings.volume = Math.max(0, Math.min(1, volume));
    }

    setLanguage(language) {
        this.settings.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
        
        // Update voice to match language
        const matchingVoice = this.voices.find(voice => 
            voice.lang.startsWith(language)
        );
        if (matchingVoice) {
            this.currentVoice = matchingVoice;
        }
    }

    // Status methods
    isSpeechSupported() {
        return !!this.synthesis;
    }

    isRecognitionSupported() {
        return !!this.recognition;
    }

    getCurrentStatus() {
        return {
            isSpeaking: this.isSpeaking,
            isListening: this.isListening,
            voicesAvailable: this.voices.length,
            currentVoice: this.currentVoice ? this.currentVoice.name : null,
            settings: { ...this.settings }
        };
    }

    // Cleanup
    stop() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isSpeaking = false;
        this.isListening = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceNavigationService;
} else {
    window.VoiceNavigationService = VoiceNavigationService;
}
