/**
 * Wake Word Service - Polyfilled wake word detection for voice-activated hazard reporting
 * Simulates background wake word detection using continuous SpeechRecognition
 */

class WakeWordService {
    constructor() {
        this.wakeWords = ['hey navbuddy', 'report hazard', 'navbuddy'];
        this.isListening = false;
        this.isEnabled = false;
        this.recognition = null;
        this.listeners = [];
        this.restartDelay = 1000; // 1 second delay between restarts
        this.lastDetectionTime = 0;
        this.detectionCooldown = 3000; // 3 seconds cooldown between detections
        
        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        // Cross-browser compatibility
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('⚠️ SpeechRecognition not supported in this browser');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        // Event handlers
        this.recognition.onstart = () => {
            console.log('🎙️ Wake word detection started');
        };

        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.recognition.onend = () => {
            // Restart recognition if still enabled
            if (this.isEnabled && this.isListening) {
                setTimeout(() => {
                    if (this.isEnabled && this.isListening) {
                        this.startRecognition();
                    }
                }, this.restartDelay);
            }
        };

        this.recognition.onerror = (event) => {
            console.warn('🎙️ Wake word recognition error:', event.error);
            
            // Handle specific errors
            if (event.error === 'not-allowed') {
                this.notifyListeners('permissionDenied', { error: event.error });
                this.stop();
            } else if (event.error === 'network') {
                // Increase restart delay on network errors
                this.restartDelay = Math.min(this.restartDelay * 1.5, 5000);
            }
        };
    }

    handleSpeechResult(event) {
        const now = Date.now();
        
        // Check cooldown period
        if (now - this.lastDetectionTime < this.detectionCooldown) {
            return;
        }

        // Get the latest result
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1];
        
        if (!latestResult) return;

        const transcript = latestResult[0].transcript.toLowerCase().trim();
        const confidence = latestResult[0].confidence;

        console.log('🎙️ Wake word transcript:', transcript, 'confidence:', confidence);

        // Check for wake words
        const detectedWakeWord = this.wakeWords.find(wakeWord => 
            transcript.includes(wakeWord)
        );

        if (detectedWakeWord && confidence > 0.5) {
            this.lastDetectionTime = now;
            console.log('✅ Wake word detected:', detectedWakeWord);
            
            // Stop current recognition
            this.recognition.stop();
            this.isListening = false;
            
            // Notify listeners
            this.notifyListeners('wakeWordDetected', {
                wakeWord: detectedWakeWord,
                transcript: transcript,
                confidence: confidence,
                timestamp: now
            });

            // Provide audio feedback
            this.playDetectionChime();
        }
    }

    playDetectionChime() {
        try {
            // Create a simple audio chime using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('⚠️ Could not play detection chime:', error);
        }
    }

    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    isSafariOrIOS() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('safari') && !userAgent.includes('chrome') ||
               /ipad|iphone|ipod/.test(userAgent);
    }

    start() {
        if (!this.isSupported()) {
            this.notifyListeners('notSupported', {
                message: 'Wake word detection not supported in this browser',
                fallback: 'Use manual mic button instead'
            });
            return false;
        }

        if (this.isSafariOrIOS()) {
            this.notifyListeners('safariWarning', {
                message: 'Wake word detection may not work reliably in Safari/iOS',
                recommendation: 'Use Chrome or Edge for best experience'
            });
        }

        this.isEnabled = true;
        this.isListening = true;
        this.restartDelay = 1000; // Reset delay
        
        this.startRecognition();
        this.notifyListeners('started', { wakeWords: this.wakeWords });
        
        return true;
    }

    startRecognition() {
        if (!this.recognition || !this.isEnabled) return;

        try {
            this.recognition.start();
        } catch (error) {
            if (error.name === 'InvalidStateError') {
                // Recognition is already running, ignore
                return;
            }
            console.error('🎙️ Failed to start wake word recognition:', error);
        }
    }

    stop() {
        this.isEnabled = false;
        this.isListening = false;
        
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.warn('⚠️ Error stopping wake word recognition:', error);
            }
        }
        
        this.notifyListeners('stopped', {});
    }

    pause() {
        this.isListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        this.notifyListeners('paused', {});
    }

    resume() {
        if (this.isEnabled) {
            this.isListening = true;
            this.startRecognition();
            this.notifyListeners('resumed', {});
        }
    }

    setWakeWords(wakeWords) {
        this.wakeWords = wakeWords.map(word => word.toLowerCase());
        this.notifyListeners('wakeWordsUpdated', { wakeWords: this.wakeWords });
    }

    addWakeWord(wakeWord) {
        const normalizedWord = wakeWord.toLowerCase();
        if (!this.wakeWords.includes(normalizedWord)) {
            this.wakeWords.push(normalizedWord);
            this.notifyListeners('wakeWordAdded', { wakeWord: normalizedWord });
        }
    }

    removeWakeWord(wakeWord) {
        const normalizedWord = wakeWord.toLowerCase();
        const index = this.wakeWords.indexOf(normalizedWord);
        if (index > -1) {
            this.wakeWords.splice(index, 1);
            this.notifyListeners('wakeWordRemoved', { wakeWord: normalizedWord });
        }
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
                console.error('🎙️ Wake word listener error:', error);
            }
        });
    }

    // Status and configuration
    getStatus() {
        return {
            isSupported: this.isSupported(),
            isEnabled: this.isEnabled,
            isListening: this.isListening,
            wakeWords: this.wakeWords,
            isSafariOrIOS: this.isSafariOrIOS()
        };
    }

    getConfiguration() {
        return {
            wakeWords: this.wakeWords,
            restartDelay: this.restartDelay,
            detectionCooldown: this.detectionCooldown
        };
    }

    updateConfiguration(config) {
        if (config.wakeWords) this.setWakeWords(config.wakeWords);
        if (config.restartDelay) this.restartDelay = config.restartDelay;
        if (config.detectionCooldown) this.detectionCooldown = config.detectionCooldown;
        
        this.notifyListeners('configurationUpdated', this.getConfiguration());
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WakeWordService;
} else {
    window.WakeWordService = WakeWordService;
}
