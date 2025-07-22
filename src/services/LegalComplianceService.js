import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class LegalComplianceService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.currentCountry = 'US';
    this.currentLanguage = 'en';
    this.userLocation = null;
    this.lastDisclaimerShown = null;
    this.complianceSettings = {
      showDisclaimerOnLaunch: true,
      showBorderCrossing: true,
      requireAcknowledgment: true,
      autoDetectCountry: true,
      reminderInterval: 24 * 60 * 60 * 1000, // 24 hours
    };
    
    // Comprehensive legal disclaimer database
    this.legalDisclaimers = {
      // United Kingdom
      GB: {
        country: 'United Kingdom',
        language: 'en',
        regulation: 'The Highway Code & Road Traffic Act 1988',
        title: 'Legal Disclaimer - United Kingdom',
        mainDisclaimer: 'Users must comply with The Highway Code and Road Traffic Act 1988. It is illegal to operate a handheld mobile phone or similar device while driving. This app is intended for hands-free use only (e.g., via voice commands, CarPlay) or when stationary.',
        keyRegulations: [
          'You MUST NOT use a handheld mobile phone while driving. Use hands-free mode or stop in a safe place. [Road Traffic Act 1988]',
          'Always give way to pedestrians crossing or waiting to cross a road you are turning into. [Highway Code Rule H2]',
          'Do not exceed speed limits. Adjust speed for road conditions, such as 20 mph in some urban areas. [Highway Code Rule 146]',
          'You MUST wear a seat belt in cars, vans and other goods vehicles if one is fitted. [Highway Code Rule 99]',
          'You MUST NOT drive under the influence of drugs or alcohol. [Road Traffic Act 1988]'
        ],
        penalties: 'Failure to comply may result in fines up to £1,000, 6 penalty points, and driving disqualification.',
        emergencyNumber: '999',
        additionalInfo: 'Always prioritize road safety and follow local traffic laws.'
      },

      // Germany
      DE: {
        country: 'Deutschland',
        language: 'de',
        regulation: 'Straßenverkehrs-Ordnung (StVO)',
        title: 'Rechtlicher Haftungsausschluss - Deutschland',
        mainDisclaimer: 'Benutzer müssen die Straßenverkehrs-Ordnung (StVO) einhalten. Es ist verboten, ein Mobiltelefon während der Fahrt zu benutzen, außer in Freisprechmodus. Diese App ist nur für die Freisprechnutzung (z.B. über Sprachbefehle, CarPlay) oder im Stillstand vorgesehen.',
        keyRegulations: [
          'Es ist verboten, ein Mobiltelefon während der Fahrt zu benutzen, außer in Freisprechmodus. [StVO §23]',
          'Fußgänger haben Vorrang an Kreuzungen und Zebrastreifen. [StVO §26]',
          'Halten Sie Geschwindigkeitsbegrenzungen ein, z.B. 50 km/h in städtischen Gebieten. [StVO §3]',
          'Anschnallpflicht für alle Insassen. [StVO §21a]',
          'Fahren unter Alkohol- oder Drogeneinfluss ist verboten. [StVO §24a]'
        ],
        penalties: 'Bei Nichteinhaltung drohen Bußgelder bis zu 1.000€, Punkte in Flensburg und Fahrverbote.',
        emergencyNumber: '112',
        additionalInfo: 'Priorisieren Sie immer die Verkehrssicherheit und befolgen Sie die örtlichen Verkehrsgesetze.'
      },

      // France
      FR: {
        country: 'France',
        language: 'fr',
        regulation: 'Code de la Route',
        title: 'Avertissement Légal - France',
        mainDisclaimer: 'Les utilisateurs doivent respecter le Code de la Route. Il est interdit d\'utiliser un téléphone portable tenu en main en conduisant. Cette application est destinée à un usage mains-libres uniquement (par ex. commandes vocales, CarPlay) ou à l\'arrêt.',
        keyRegulations: [
          'Il est interdit d\'utiliser un téléphone portable tenu en main en conduisant. Utilisez un kit mains-libres. [Code de la Route R412-6]',
          'Cédez le passage aux piétons sur les passages cloutés ou aux intersections. [Code de la Route R415-11]',
          'Respectez les limites de vitesse, par exemple 50 km/h en ville. [Code de la Route R413-2]',
          'Port de la ceinture de sécurité obligatoire. [Code de la Route R412-1]',
          'Conduite sous l\'influence d\'alcool ou de drogues interdite. [Code de la Route L234-1]'
        ],
        penalties: 'Le non-respect peut entraîner des amendes jusqu\'à 1 500€, des points de pénalité et des suspensions de permis.',
        emergencyNumber: '112',
        additionalInfo: 'Priorisez toujours la sécurité routière et respectez les lois locales.'
      },

      // Spain
      ES: {
        country: 'España',
        language: 'es',
        regulation: 'Reglamento General de Circulación',
        title: 'Aviso Legal - España',
        mainDisclaimer: 'Los usuarios deben cumplir con el Reglamento General de Circulación. Está prohibido usar un teléfono móvil de mano mientras se conduce. Esta aplicación está destinada solo para uso manos libres (por ej. comandos de voz, CarPlay) o cuando esté detenido.',
        keyRegulations: [
          'Está prohibido usar un teléfono móvil de mano mientras se conduce. Use modo manos libres. [Reglamento General de Circulación Art. 13]',
          'Ceda el paso a los peatones en pasos de cebra o intersecciones. [Reglamento General de Circulación Art. 21]',
          'No exceda los límites de velocidad, como 50 km/h en zonas urbanas. [Reglamento General de Circulación Art. 48]',
          'Uso obligatorio del cinturón de seguridad. [Reglamento General de Circulación Art. 117]',
          'Prohibido conducir bajo los efectos del alcohol o drogas. [Código Penal Art. 379]'
        ],
        penalties: 'El incumplimiento puede resultar en multas de hasta 500€, puntos de penalización y suspensión del permiso.',
        emergencyNumber: '112',
        additionalInfo: 'Priorice siempre la seguridad vial y siga las leyes locales.'
      },

      // Italy
      IT: {
        country: 'Italia',
        language: 'it',
        regulation: 'Codice della Strada',
        title: 'Disclaimer Legale - Italia',
        mainDisclaimer: 'Gli utenti devono rispettare il Codice della Strada. È vietato usare un telefono cellulare durante la guida, salvo in modalità vivavoce. Questa app è destinata solo all\'uso vivavoce (ad es. comandi vocali, CarPlay) o quando fermi.',
        keyRegulations: [
          'È vietato usare un telefono cellulare durante la guida, salvo in modalità vivavoce. [Codice della Strada Art. 173]',
          'Dare la precedenza ai pedoni agli attraversamenti pedonali o agli incroci. [Codice della Strada Art. 191]',
          'Rispettare i limiti di velocità, ad esempio 50 km/h in aree urbane. [Codice della Strada Art. 142]',
          'Uso obbligatorio delle cinture di sicurezza. [Codice della Strada Art. 172]',
          'Vietato guidare sotto l\'influenza di alcol o droghe. [Codice della Strada Art. 186-187]'
        ],
        penalties: 'Il mancato rispetto può comportare multe fino a 1.000€, punti di penalità e sospensione della patente.',
        emergencyNumber: '112',
        additionalInfo: 'Dare sempre priorità alla sicurezza stradale e seguire le leggi locali.'
      },

      // United States
      US: {
        country: 'United States',
        language: 'en',
        regulation: 'State Traffic Laws & Federal Motor Vehicle Safety Standards',
        title: 'Legal Disclaimer - United States',
        mainDisclaimer: 'Users must comply with state and federal traffic laws. Texting or using a handheld phone while driving is prohibited in most states. This app is intended for hands-free use only (e.g., voice commands, CarPlay/Android Auto) or when stationary.',
        keyRegulations: [
          'Do NOT text or use a handheld phone while driving. Hands-free use is permitted in most states. [State-specific laws]',
          'Yield to pedestrians at crosswalks and intersections. [Uniform Vehicle Code]',
          'Obey speed limits, which vary by state and road type (e.g., 25 mph in residential areas). [State-specific laws]',
          'Seat belt use is mandatory in all states. [State-specific laws]',
          'Driving under the influence of alcohol or drugs is prohibited. [Federal and State laws]'
        ],
        penalties: 'Violations may result in fines, license points, and license suspension. Penalties vary by state.',
        emergencyNumber: '911',
        additionalInfo: 'Always prioritize road safety and follow local and state laws.'
      },

      // Australia
      AU: {
        country: 'Australia',
        language: 'en',
        regulation: 'Australian Road Rules',
        title: 'Legal Disclaimer - Australia',
        mainDisclaimer: 'Users must comply with Australian Road Rules and state-specific regulations. You MUST NOT use a handheld mobile phone while driving. This app is intended for hands-free use only (e.g., voice commands, CarPlay/Android Auto) or when stationary.',
        keyRegulations: [
          'You MUST NOT use a handheld mobile phone while driving. Hands-free devices are allowed. [Australian Road Rules Reg 300]',
          'Give way to pedestrians at pedestrian crossings and intersections. [Australian Road Rules Reg 65]',
          'Adhere to speed limits, such as 50 km/h in built-up areas. [Australian Road Rules Reg 20]',
          'Seat belts must be worn by all occupants. [Australian Road Rules Reg 264]',
          'Driving under the influence of alcohol or drugs is prohibited. [State-specific laws]'
        ],
        penalties: 'Penalties include fines up to $1,000, demerit points, and license suspension.',
        emergencyNumber: '000',
        additionalInfo: 'Always prioritize road safety and follow local traffic laws.'
      },

      // Japan
      JP: {
        country: '日本',
        language: 'ja',
        regulation: '道路交通法 (Road Traffic Act)',
        title: '法的免責事項 - 日本',
        mainDisclaimer: 'ユーザーは道路交通法を遵守する必要があります。運転中に携帯電話を手で持って使用することは禁止されています。このアプリはハンズフリー使用（音声コマンド、CarPlayなど）または停車時のみを対象としています。',
        keyRegulations: [
          '運転中に携帯電話を手で持って使用することは禁止されています。ハンズフリーを使用してください。[道路交通法第71条]',
          '横断歩道や交差点で歩行者に道を譲ってください。[道路交通法第38条]',
          '速度制限を守り、例えば市街地では50km/hです。[道路交通法第22条]',
          'シートベルトの着用は義務です。[道路交通法第71条の3]',
          'アルコールや薬物の影響下での運転は禁止されています。[道路交通法第65条]'
        ],
        penalties: '違反すると罰金、違反点数、免許停止の対象となる場合があります。',
        emergencyNumber: '110',
        additionalInfo: '常に道路安全を優先し、地域の法律に従ってください。'
      },

      // India
      IN: {
        country: 'भारत',
        language: 'hi',
        regulation: 'मोटर व्हीकल एक्ट, 1988',
        title: 'कानूनी अस्वीकरण - भारत',
        mainDisclaimer: 'उपयोगकर्ताओं को मोटर व्हीकल एक्ट, 1988 का पालन करना चाहिए। ड्राइविंग के दौरान हैंडहेल्ड मोबाइल फोन का उपयोग निषिद्ध है। यह ऐप केवल हैंड्स-फ्री उपयोग (जैसे वॉयस कमांड, CarPlay) या रुकने पर उपयोग के लिए है।',
        keyRegulations: [
          'ड्राइविंग के दौरान हैंडहेल्ड मोबाइल फोन का उपयोग निषिद्ध है। हैंड्स-फ्री मोड का उपयोग करें। [मोटर व्हीकल एक्ट, 1988]',
          'पैदल यात्री क्रॉसिंग या चौराहों पर पैदल यात्रियों को प्राथमिकता दें। [मोटर व्हीकल एक्ट]',
          'गति सीमा का पालन करें, जैसे शहरी क्षेत्रों में 50 किमी/घंटा। [मोटर व्हीकल एक्ट]',
          'सीट बेल्ट का उपयोग अनिवार्य है। [मोटर व्हीकल एक्ट]',
          'शराब या नशीली दवाओं के प्रभाव में गाड़ी चलाना निषिद्ध है। [मोटर व्हीकल एक्ट]'
        ],
        penalties: 'उल्लंघन पर जुर्माना, लाइसेंस पॉइंट्स और लाइसेंस निलंबन हो सकता है।',
        emergencyNumber: '112',
        additionalInfo: 'हमेशा सड़क सुरक्षा को प्राथमिकता दें और स्थानीय कानूनों का पालन करें।'
      },

      // Brazil
      BR: {
        country: 'Brasil',
        language: 'pt',
        regulation: 'Código de Trânsito Brasileiro',
        title: 'Aviso Legal - Brasil',
        mainDisclaimer: 'Os usuários devem cumprir o Código de Trânsito Brasileiro. É proibido usar telefone celular na mão enquanto dirige. Este aplicativo é destinado apenas para uso viva-voz (ex: comandos de voz, CarPlay) ou quando parado.',
        keyRegulations: [
          'É proibido usar telefone celular na mão enquanto dirige. Use modo viva-voz. [CTB Art. 252]',
          'Dê preferência aos pedestres em faixas de pedestres e cruzamentos. [CTB Art. 70]',
          'Respeite os limites de velocidade, como 60 km/h em vias urbanas. [CTB Art. 61]',
          'Uso obrigatório do cinto de segurança. [CTB Art. 65]',
          'É proibido dirigir sob influência de álcool ou drogas. [CTB Art. 165]'
        ],
        penalties: 'Violações podem resultar em multas, pontos na carteira e suspensão da habilitação.',
        emergencyNumber: '190',
        additionalInfo: 'Sempre priorize a segurança no trânsito e siga as leis locais.'
      },

      // Default fallback
      DEFAULT: {
        country: 'International',
        language: 'en',
        regulation: 'Local Traffic Regulations',
        title: 'Legal Disclaimer',
        mainDisclaimer: 'Users must comply with local traffic laws and regulations. It is illegal to use a handheld mobile phone while driving in most countries. This app is intended for hands-free use only (e.g., voice commands, vehicle integration) or when stationary.',
        keyRegulations: [
          'Do not use handheld devices while driving. Use hands-free mode or stop safely.',
          'Give way to pedestrians at crossings and intersections.',
          'Obey speed limits and adjust for road conditions.',
          'Wear seat belts and ensure all passengers are secured.',
          'Never drive under the influence of alcohol or drugs.'
        ],
        penalties: 'Violations may result in fines, penalty points, license suspension, or other legal consequences.',
        emergencyNumber: 'Local Emergency Number',
        additionalInfo: 'Always prioritize road safety and follow local traffic laws.'
      }
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadComplianceSettings();
      await this.detectUserLocation();
      
      this.isInitialized = true;
      console.log('LegalComplianceService initialized successfully');
    } catch (error) {
      console.error('LegalComplianceService initialization failed:', error);
      throw error;
    }
  }

  async detectUserLocation() {
    try {
      // This would integrate with location services
      // For now, we'll use a placeholder
      const location = await this.getCurrentLocation();
      
      if (location && this.complianceSettings.autoDetectCountry) {
        const country = await this.getCountryFromCoordinates(location.latitude, location.longitude);
        if (country && country !== this.currentCountry) {
          this.currentCountry = country;
          this.notifyListeners('countryChanged', { 
            country, 
            disclaimer: this.getCurrentDisclaimer() 
          });
        }
      }
    } catch (error) {
      console.error('Error detecting user location:', error);
    }
  }

  async getCurrentLocation() {
    // Placeholder for actual location detection
    return { latitude: 51.5074, longitude: -0.1278 }; // London as example
  }

  async getCountryFromCoordinates(latitude, longitude) {
    try {
      // Use free reverse geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`
      );
      
      const data = await response.json();
      return data.address?.country_code?.toUpperCase() || 'DEFAULT';
    } catch (error) {
      console.error('Error getting country from coordinates:', error);
      return 'DEFAULT';
    }
  }

  getCurrentDisclaimer() {
    return this.legalDisclaimers[this.currentCountry] || this.legalDisclaimers.DEFAULT;
  }

  shouldShowDisclaimer() {
    if (!this.complianceSettings.showDisclaimerOnLaunch) return false;
    
    if (!this.lastDisclaimerShown) return true;
    
    const timeSinceLastShown = Date.now() - this.lastDisclaimerShown;
    return timeSinceLastShown > this.complianceSettings.reminderInterval;
  }

  async acknowledgeDisclaimer() {
    this.lastDisclaimerShown = Date.now();
    await this.saveComplianceSettings();
    
    this.notifyListeners('disclaimerAcknowledged', {
      timestamp: this.lastDisclaimerShown,
      country: this.currentCountry,
    });
  }

  getRegulationsForCountry(countryCode) {
    return this.legalDisclaimers[countryCode] || this.legalDisclaimers.DEFAULT;
  }

  // Settings management
  async updateComplianceSettings(newSettings) {
    this.complianceSettings = { ...this.complianceSettings, ...newSettings };
    await this.saveComplianceSettings();
    
    this.notifyListeners('complianceSettingsUpdated', { 
      settings: this.complianceSettings 
    });
  }

  async saveComplianceSettings() {
    try {
      const data = {
        settings: this.complianceSettings,
        lastDisclaimerShown: this.lastDisclaimerShown,
        currentCountry: this.currentCountry,
      };
      await AsyncStorage.setItem('legalComplianceSettings', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving compliance settings:', error);
    }
  }

  async loadComplianceSettings() {
    try {
      const stored = await AsyncStorage.getItem('legalComplianceSettings');
      if (stored) {
        const data = JSON.parse(stored);
        this.complianceSettings = { ...this.complianceSettings, ...data.settings };
        this.lastDisclaimerShown = data.lastDisclaimerShown;
        this.currentCountry = data.currentCountry || 'US';
      }
    } catch (error) {
      console.error('Error loading compliance settings:', error);
    }
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
        console.error('LegalComplianceService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new LegalComplianceService();
