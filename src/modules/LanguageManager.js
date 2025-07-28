/**
 * Language Manager Module
 * Handles internationalization and localization
 */
class LanguageManager extends BaseModule {
    constructor() {
        super('LanguageManager');
        
        // Current language
        this.currentLanguage = 'en';
        
        // Available languages
        this.supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru'];
        
        // Translation data
        this.translations = {};
        
        // Language detection
        this.autoDetect = true;
    }

    async initialize() {
        await super.initialize();
        
        try {
            this.loadLanguage();
            this.loadTranslations();
            this.applyLanguage();
            this.log('Language manager initialized successfully', 'success');
        } catch (error) {
            this.handleError(error, 'Language manager initialization failed');
        }
    }

    loadLanguage() {
        // Try to load from storage first
        const saved = this.loadFromStorage('language');
        if (saved && this.supportedLanguages.includes(saved)) {
            this.currentLanguage = saved;
            return;
        }

        // Auto-detect from browser if enabled
        if (this.autoDetect) {
            const browserLang = navigator.language || navigator.userLanguage;
            const langCode = browserLang.split('-')[0].toLowerCase();
            
            if (this.supportedLanguages.includes(langCode)) {
                this.currentLanguage = langCode;
                this.saveLanguage();
            }
        }
    }

    loadTranslations() {
        this.translations = {
            en: {
                // Navigation
                startNavigation: 'Start Navigation',
                stopNavigation: 'Stop Navigation',
                currentLocation: 'Current Location',
                destination: 'Destination',
                calculating: 'Calculating route...',
                routeFound: 'Route found',
                navigationStarted: 'Navigation started',
                navigationStopped: 'Navigation stopped',
                
                // Directions
                turnLeft: 'Turn left',
                turnRight: 'Turn right',
                goStraight: 'Go straight',
                arrive: 'You have arrived',
                
                // Features
                favorites: 'Favorites',
                recentSearches: 'Recent Searches',
                settings: 'Settings',
                achievements: 'Achievements'
            },
            es: {
                // Navigation
                startNavigation: 'Iniciar Navegación',
                stopNavigation: 'Detener Navegación',
                currentLocation: 'Ubicación Actual',
                destination: 'Destino',
                calculating: 'Calculando ruta...',
                routeFound: 'Ruta encontrada',
                navigationStarted: 'Navegación iniciada',
                navigationStopped: 'Navegación detenida',
                
                // Directions
                turnLeft: 'Gire a la izquierda',
                turnRight: 'Gire a la derecha',
                goStraight: 'Siga recto',
                arrive: 'Ha llegado',
                
                // Features
                favorites: 'Favoritos',
                recentSearches: 'Búsquedas Recientes',
                settings: 'Configuración',
                achievements: 'Logros'
            },
            fr: {
                // Navigation
                startNavigation: 'Démarrer Navigation',
                stopNavigation: 'Arrêter Navigation',
                currentLocation: 'Position Actuelle',
                destination: 'Destination',
                calculating: 'Calcul de l\'itinéraire...',
                routeFound: 'Itinéraire trouvé',
                navigationStarted: 'Navigation démarrée',
                navigationStopped: 'Navigation arrêtée',
                
                // Directions
                turnLeft: 'Tournez à gauche',
                turnRight: 'Tournez à droite',
                goStraight: 'Continuez tout droit',
                arrive: 'Vous êtes arrivé',
                
                // Features
                favorites: 'Favoris',
                recentSearches: 'Recherches Récentes',
                settings: 'Paramètres',
                achievements: 'Succès'
            },
            de: {
                // Navigation
                startNavigation: 'Navigation Starten',
                stopNavigation: 'Navigation Stoppen',
                currentLocation: 'Aktueller Standort',
                destination: 'Ziel',
                calculating: 'Route wird berechnet...',
                routeFound: 'Route gefunden',
                navigationStarted: 'Navigation gestartet',
                navigationStopped: 'Navigation gestoppt',
                
                // Directions
                turnLeft: 'Links abbiegen',
                turnRight: 'Rechts abbiegen',
                goStraight: 'Geradeaus fahren',
                arrive: 'Sie sind angekommen',
                
                // Features
                favorites: 'Favoriten',
                recentSearches: 'Letzte Suchen',
                settings: 'Einstellungen',
                achievements: 'Erfolge'
            }
        };
    }

    translate(key, params = {}) {
        const translations = this.translations[this.currentLanguage] || this.translations['en'];
        let translation = translations[key] || key;
        
        // Replace parameters
        for (const [param, value] of Object.entries(params)) {
            translation = translation.replace(`{${param}}`, value);
        }
        
        return translation;
    }

    changeLanguage(language) {
        if (!this.supportedLanguages.includes(language)) {
            throw new Error(`Unsupported language: ${language}`);
        }
        
        const oldLanguage = this.currentLanguage;
        this.currentLanguage = language;
        
        this.saveLanguage();
        this.applyLanguage();
        
        this.emit('language:changed', {
            from: oldLanguage,
            to: language
        });
        
        this.log(`Language changed to: ${language}`, 'info');
    }

    saveLanguage() {
        this.saveToStorage('language', this.currentLanguage);
    }

    applyLanguage() {
        // Update document language
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('lang', this.currentLanguage);
        }
        
        this.emit('language:applied', this.currentLanguage);
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }

    getLanguageInfo(language = null) {
        const lang = language || this.currentLanguage;
        
        const languageNames = {
            en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
            es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
            fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
            de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
            it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
            pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
            nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
            pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
            ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
        };
        
        return languageNames[lang] || languageNames['en'];
    }

    isRTL(language = null) {
        const lang = language || this.currentLanguage;
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        return rtlLanguages.includes(lang);
    }

    formatNumber(number, options = {}) {
        try {
            return new Intl.NumberFormat(this.currentLanguage, options).format(number);
        } catch (error) {
            return number.toString();
        }
    }

    formatDate(date, options = {}) {
        try {
            return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
        } catch (error) {
            return date.toString();
        }
    }

    formatCurrency(amount, currency = 'USD') {
        try {
            return new Intl.NumberFormat(this.currentLanguage, {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (error) {
            return `${currency} ${amount}`;
        }
    }

    destroy() {
        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageManager;
} else {
    window.LanguageManager = LanguageManager;
}
