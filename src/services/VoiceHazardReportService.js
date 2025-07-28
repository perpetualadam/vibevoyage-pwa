/**
 * Voice Hazard Report Service - Voice-controlled hazard reporting system
 * Integrates with existing VoiceNavigationService and HazardDetectionService
 */

class VoiceHazardReportService {
    constructor() {
        this.isActive = false;
        this.currentStep = null;
        this.reportData = {};
        this.listeners = [];
        this.recognition = null;
        this.voiceService = null;
        this.currentLocation = null;
        
        // Predefined hazard categories
        this.hazardTypes = {
            'speed camera': { type: 'speed_camera', icon: '📷', severity: 'medium' },
            'police': { type: 'police', icon: '👮', severity: 'high' },
            'accident': { type: 'accident', icon: '🚗💥', severity: 'high' },
            'roadworks': { type: 'roadwork', icon: '🚧', severity: 'medium' },
            'road work': { type: 'roadwork', icon: '🚧', severity: 'medium' },
            'construction': { type: 'roadwork', icon: '🚧', severity: 'medium' },
            'traffic jam': { type: 'traffic', icon: '🚦', severity: 'low' },
            'heavy traffic': { type: 'traffic', icon: '🚦', severity: 'low' },
            'pothole': { type: 'road_hazard', icon: '🕳️', severity: 'medium' },
            'debris': { type: 'road_hazard', icon: '🪨', severity: 'medium' },
            'animal': { type: 'animal_hazard', icon: '🦌', severity: 'high' },
            'weather': { type: 'weather_hazard', icon: '🌧️', severity: 'medium' },
            'fog': { type: 'weather_hazard', icon: '🌫️', severity: 'high' },
            'ice': { type: 'weather_hazard', icon: '🧊', severity: 'high' }
        };

        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 3;

            this.recognition.onresult = (event) => {
                this.handleSpeechResult(event);
            };

            this.recognition.onerror = (event) => {
                console.error('🎙️ Voice hazard report recognition error:', event.error);
                this.handleError(`Speech recognition error: ${event.error}`);
            };

            this.recognition.onend = () => {
                // Don't auto-restart during hazard reporting flow
            };
        }
    }

    setVoiceService(voiceService) {
        this.voiceService = voiceService;
    }

    setCurrentLocation(location) {
        this.currentLocation = location;
    }

    async startHazardReporting() {
        if (this.isActive) {
            console.log('🎙️ Hazard reporting already in progress');
            return;
        }

        if (!this.currentLocation) {
            await this.speak('Cannot report hazard: location not available', 'high');
            return;
        }

        this.isActive = true;
        this.currentStep = 'asking_type';
        this.reportData = {
            timestamp: Date.now(),
            location: { ...this.currentLocation },
            userId: this.generateUserId()
        };

        console.log('🎙️ Starting hazard reporting flow');
        this.notifyListeners('reportingStarted', this.reportData);

        // Ask for hazard type
        await this.askForHazardType();
    }

    async askForHazardType() {
        const hazardList = Object.keys(this.hazardTypes).slice(0, 6).join(', ');
        const prompt = `What type of hazard do you want to report? You can say: ${hazardList}, or other hazards.`;
        
        await this.speak(prompt, 'high');
        this.startListening();
    }

    startListening() {
        if (!this.recognition) {
            this.handleError('Speech recognition not available');
            return;
        }

        try {
            this.recognition.start();
            this.notifyListeners('listeningStarted', { step: this.currentStep });
        } catch (error) {
            console.error('🎙️ Failed to start listening:', error);
            this.handleError('Failed to start voice recognition');
        }
    }

    handleSpeechResult(event) {
        const results = Array.from(event.results);
        const transcript = results[0][0].transcript.toLowerCase().trim();
        const confidence = results[0][0].confidence;

        console.log('🎙️ Hazard report speech result:', transcript, 'confidence:', confidence);

        if (confidence < 0.6) {
            this.handleLowConfidence(transcript);
            return;
        }

        switch (this.currentStep) {
            case 'asking_type':
                this.handleHazardTypeResponse(transcript);
                break;
            case 'confirming':
                this.handleConfirmationResponse(transcript);
                break;
            default:
                console.warn('🎙️ Unexpected speech result in step:', this.currentStep);
        }
    }

    async handleHazardTypeResponse(transcript) {
        // Find matching hazard type
        let matchedType = null;
        let matchedKey = null;

        for (const [key, hazardInfo] of Object.entries(this.hazardTypes)) {
            if (transcript.includes(key)) {
                matchedType = hazardInfo;
                matchedKey = key;
                break;
            }
        }

        if (!matchedType) {
            // Try partial matches
            for (const [key, hazardInfo] of Object.entries(this.hazardTypes)) {
                const words = key.split(' ');
                if (words.some(word => transcript.includes(word))) {
                    matchedType = hazardInfo;
                    matchedKey = key;
                    break;
                }
            }
        }

        if (matchedType) {
            this.reportData.hazardType = matchedType.type;
            this.reportData.hazardName = matchedKey;
            this.reportData.icon = matchedType.icon;
            this.reportData.severity = matchedType.severity;

            await this.confirmHazardReport();
        } else {
            await this.handleUnknownHazardType(transcript);
        }
    }

    async handleUnknownHazardType(transcript) {
        // Create generic hazard for unknown types
        this.reportData.hazardType = 'unknown_hazard';
        this.reportData.hazardName = transcript;
        this.reportData.icon = '⚠️';
        this.reportData.severity = 'medium';

        await this.speak(`I didn't recognize "${transcript}" as a known hazard type. I'll report it as a general hazard.`, 'normal');
        await this.confirmHazardReport();
    }

    async confirmHazardReport() {
        this.currentStep = 'confirming';
        const hazardName = this.reportData.hazardName;
        const confirmPrompt = `Report a ${hazardName} at your current location? Say yes to confirm or no to cancel.`;
        
        await this.speak(confirmPrompt, 'high');
        this.startListening();
    }

    async handleConfirmationResponse(transcript) {
        const isConfirmed = transcript.includes('yes') || transcript.includes('confirm') || 
                           transcript.includes('okay') || transcript.includes('sure');
        const isCancelled = transcript.includes('no') || transcript.includes('cancel') || 
                           transcript.includes('stop');

        if (isConfirmed) {
            await this.submitHazardReport();
        } else if (isCancelled) {
            await this.cancelHazardReport();
        } else {
            await this.speak('Please say yes to confirm or no to cancel the hazard report.', 'normal');
            this.startListening();
        }
    }

    async submitHazardReport() {
        try {
            // Create GeoJSON feature
            const hazardFeature = this.createGeoJSONFeature();
            
            // Save to localStorage
            await this.saveHazardLocally(hazardFeature);
            
            // Emit event for map updates
            this.notifyListeners('hazardReported', {
                feature: hazardFeature,
                reportData: this.reportData
            });

            // Provide feedback
            await this.speak(`${this.reportData.hazardName} reported successfully. Thank you for keeping other drivers safe!`, 'normal');
            
            // Play success chime
            this.playSuccessChime();
            
            this.resetReportingState();
            
        } catch (error) {
            console.error('🎙️ Failed to submit hazard report:', error);
            await this.speak('Sorry, failed to submit the hazard report. Please try again.', 'high');
            this.resetReportingState();
        }
    }

    createGeoJSONFeature() {
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [this.reportData.location.lng, this.reportData.location.lat]
            },
            properties: {
                id: `user_report_${this.reportData.timestamp}`,
                type: this.reportData.hazardType,
                name: this.reportData.hazardName,
                severity: this.reportData.severity,
                timestamp: this.reportData.timestamp,
                userId: this.reportData.userId,
                source: 'user_voice_report',
                verified: false,
                icon: this.reportData.icon
            }
        };
    }

    async saveHazardLocally(hazardFeature) {
        try {
            // Get existing user reports
            const existingReports = JSON.parse(localStorage.getItem('userHazardReports') || '[]');
            
            // Add new report
            existingReports.push(hazardFeature);
            
            // Keep only last 100 reports to prevent storage bloat
            if (existingReports.length > 100) {
                existingReports.splice(0, existingReports.length - 100);
            }
            
            // Save back to localStorage
            localStorage.setItem('userHazardReports', JSON.stringify(existingReports));
            
            console.log('✅ Hazard report saved locally:', hazardFeature.properties.id);
            
        } catch (error) {
            console.error('❌ Failed to save hazard report locally:', error);
            throw error;
        }
    }

    async cancelHazardReport() {
        await this.speak('Hazard report cancelled.', 'normal');
        this.resetReportingState();
    }

    resetReportingState() {
        this.isActive = false;
        this.currentStep = null;
        this.reportData = {};
        this.notifyListeners('reportingEnded', {});
    }

    async handleLowConfidence(transcript) {
        await this.speak(`I'm not sure I understood. Did you say "${transcript}"? Please speak clearly.`, 'normal');
        this.startListening();
    }

    async handleError(errorMessage) {
        console.error('🎙️ Voice hazard report error:', errorMessage);
        await this.speak(`Error: ${errorMessage}. Hazard reporting cancelled.`, 'high');
        this.resetReportingState();
        this.notifyListeners('reportingError', { error: errorMessage });
    }

    async speak(text, priority = 'normal') {
        if (this.voiceService && this.voiceService.speak) {
            await this.voiceService.speak(text, priority);
        } else if (window.speechSynthesis) {
            // Fallback to direct speech synthesis
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        } else {
            console.log('🎙️ TTS not available, would say:', text);
        }
    }

    playSuccessChime() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Success melody: C-E-G
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            let time = audioContext.currentTime;

            notes.forEach((freq, index) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                osc.frequency.setValueAtTime(freq, time);
                gain.gain.setValueAtTime(0.2, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
                
                osc.start(time);
                osc.stop(time + 0.3);
                
                time += 0.2;
            });
        } catch (error) {
            console.warn('⚠️ Could not play success chime:', error);
        }
    }

    generateUserId() {
        // Generate a simple anonymous user ID
        let userId = localStorage.getItem('vibeVoyageUserId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('vibeVoyageUserId', userId);
        }
        return userId;
    }

    // Event listener management
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('🎙️ Voice hazard report listener error:', error);
            }
        });
    }

    // Public API
    isReportingActive() {
        return this.isActive;
    }

    getCurrentStep() {
        return this.currentStep;
    }

    getSupportedHazardTypes() {
        return Object.keys(this.hazardTypes);
    }

    getReportData() {
        return { ...this.reportData };
    }

    async getUserReports() {
        try {
            return JSON.parse(localStorage.getItem('userHazardReports') || '[]');
        } catch (error) {
            console.error('❌ Failed to get user reports:', error);
            return [];
        }
    }

    async clearUserReports() {
        try {
            localStorage.removeItem('userHazardReports');
            this.notifyListeners('reportsCleared', {});
        } catch (error) {
            console.error('❌ Failed to clear user reports:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceHazardReportService;
} else {
    window.VoiceHazardReportService = VoiceHazardReportService;
}
