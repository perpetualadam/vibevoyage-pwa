import AsyncStorage from '@react-native-async-storage/async-storage';

class RoadRegulationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = [];
    this.currentCountry = 'US';
    this.currentLanguage = 'en';
    
    // Extended country regulations database
    this.roadRegulations = {
      // European Union Countries
      AT: { // Austria
        country: 'Österreich',
        language: 'de',
        regulation: 'Straßenverkehrsordnung (StVO)',
        phoneRule: 'Handyverbot während der Fahrt, außer Freisprecheinrichtung. [StVO §102]',
        speedLimits: { urban: 50, rural: 100, highway: 130 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      BE: { // Belgium
        country: 'België/Belgique',
        language: 'nl',
        regulation: 'Wegverkeerswet',
        phoneRule: 'Verboden om handheld telefoon te gebruiken tijdens het rijden. [Wegverkeerswet Art. 8.4]',
        speedLimits: { urban: 50, rural: 90, highway: 120 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      CH: { // Switzerland
        country: 'Schweiz',
        language: 'de',
        regulation: 'Strassenverkehrsgesetz (SVG)',
        phoneRule: 'Handyverbot während der Fahrt, nur Freisprecheinrichtung erlaubt. [SVG Art. 31]',
        speedLimits: { urban: 50, rural: 80, highway: 120 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      CZ: { // Czech Republic
        country: 'Česká republika',
        language: 'cs',
        regulation: 'Zákon o silničním provozu',
        phoneRule: 'Zákaz používání mobilního telefonu v ruce během jízdy. [Zákon č. 361/2000 Sb.]',
        speedLimits: { urban: 50, rural: 90, highway: 130 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.0,
      },
      DK: { // Denmark
        country: 'Danmark',
        language: 'da',
        regulation: 'Færdselsloven',
        phoneRule: 'Forbudt at bruge håndholdt telefon under kørsel. [Færdselsloven §56]',
        speedLimits: { urban: 50, rural: 80, highway: 130 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      FI: { // Finland
        country: 'Suomi',
        language: 'fi',
        regulation: 'Tieliikennelaki',
        phoneRule: 'Kielletty käyttää kädessä pidettävää puhelinta ajon aikana. [Tieliikennelaki 23§]',
        speedLimits: { urban: 50, rural: 80, highway: 120 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      GR: { // Greece
        country: 'Ελλάδα',
        language: 'el',
        regulation: 'Κώδικας Οδικής Κυκλοφορίας',
        phoneRule: 'Απαγορεύεται η χρήση κινητού τηλεφώνου κατά την οδήγηση. [ΚΟΚ Άρθρο 18]',
        speedLimits: { urban: 50, rural: 90, highway: 130 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      HU: { // Hungary
        country: 'Magyarország',
        language: 'hu',
        regulation: 'Közúti közlekedési szabályzat',
        phoneRule: 'Tilos kézben tartott telefont használni vezetés közben. [KRESZ 20§]',
        speedLimits: { urban: 50, rural: 90, highway: 130 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.0,
      },
      IE: { // Ireland
        country: 'Ireland',
        language: 'en',
        regulation: 'Road Traffic Acts',
        phoneRule: 'Prohibited to use handheld mobile phone while driving. [Road Traffic Act 2006]',
        speedLimits: { urban: 50, rural: 80, highway: 120 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      NL: { // Netherlands
        country: 'Nederland',
        language: 'nl',
        regulation: 'Wegenverkeerswet',
        phoneRule: 'Verboden om handheld telefoon te gebruiken tijdens het rijden. [WVW Art. 61a]',
        speedLimits: { urban: 50, rural: 80, highway: 130 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      NO: { // Norway
        country: 'Norge',
        language: 'no',
        regulation: 'Vegtrafikkloven',
        phoneRule: 'Forbudt å bruke håndholdt telefon under kjøring. [Vegtrafikkloven §22]',
        speedLimits: { urban: 50, rural: 80, highway: 110 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.2,
      },
      PL: { // Poland
        country: 'Polska',
        language: 'pl',
        regulation: 'Prawo o ruchu drogowym',
        phoneRule: 'Zakaz używania telefonu trzymanego w ręku podczas jazdy. [Ustawa o ruchu drogowym Art. 45]',
        speedLimits: { urban: 50, rural: 90, highway: 140 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.2,
      },
      PT: { // Portugal
        country: 'Portugal',
        language: 'pt',
        regulation: 'Código da Estrada',
        phoneRule: 'Proibido usar telemóvel na mão durante a condução. [Código da Estrada Art. 84º]',
        speedLimits: { urban: 50, rural: 90, highway: 120 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      RO: { // Romania
        country: 'România',
        language: 'ro',
        regulation: 'Codul rutier',
        phoneRule: 'Interzis să folosești telefonul mobil în mână în timpul conducerii. [Codul rutier Art. 69]',
        speedLimits: { urban: 50, rural: 90, highway: 130 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.0,
      },
      SE: { // Sweden
        country: 'Sverige',
        language: 'sv',
        regulation: 'Trafikförordningen',
        phoneRule: 'Förbjudet att använda handhållen telefon under körning. [Trafikförordningen 3 kap. 81§]',
        speedLimits: { urban: 50, rural: 70, highway: 120 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.2,
      },

      // Americas
      CA: { // Canada
        country: 'Canada',
        language: 'en',
        regulation: 'Provincial Motor Vehicle Acts',
        phoneRule: 'Prohibited to use handheld devices while driving in all provinces. [Provincial laws]',
        speedLimits: { urban: 50, rural: 80, highway: 110 },
        emergencyNumber: '911',
        seatBeltMandatory: true,
        alcoholLimit: 0.8,
      },
      MX: { // Mexico
        country: 'México',
        language: 'es',
        regulation: 'Reglamento de Tránsito',
        phoneRule: 'Prohibido usar teléfono móvil en mano mientras se conduce. [Reglamento de Tránsito]',
        speedLimits: { urban: 40, rural: 80, highway: 110 },
        emergencyNumber: '911',
        seatBeltMandatory: true,
        alcoholLimit: 0.8,
      },
      AR: { // Argentina
        country: 'Argentina',
        language: 'es',
        regulation: 'Ley Nacional de Tránsito',
        phoneRule: 'Prohibido usar celular en mano durante la conducción. [Ley 24.449]',
        speedLimits: { urban: 60, rural: 110, highway: 130 },
        emergencyNumber: '911',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      CL: { // Chile
        country: 'Chile',
        language: 'es',
        regulation: 'Ley de Tránsito',
        phoneRule: 'Prohibido usar teléfono móvil en mano mientras se conduce. [Ley 18.290]',
        speedLimits: { urban: 60, rural: 100, highway: 120 },
        emergencyNumber: '133',
        seatBeltMandatory: true,
        alcoholLimit: 0.3,
      },

      // Asia-Pacific
      CN: { // China
        country: '中国',
        language: 'zh',
        regulation: '道路交通安全法',
        phoneRule: '驾驶时禁止手持使用移动电话。[道路交通安全法第62条]',
        speedLimits: { urban: 60, rural: 80, highway: 120 },
        emergencyNumber: '110',
        seatBeltMandatory: true,
        alcoholLimit: 0.2,
      },
      KR: { // South Korea
        country: '대한민국',
        language: 'ko',
        regulation: '도로교통법',
        phoneRule: '운전 중 휴대전화 손에 들고 사용 금지. [도로교통법 제49조]',
        speedLimits: { urban: 60, rural: 80, highway: 110 },
        emergencyNumber: '112',
        seatBeltMandatory: true,
        alcoholLimit: 0.3,
      },
      TH: { // Thailand
        country: 'ประเทศไทย',
        language: 'th',
        regulation: 'พระราชบัญญัติการจราจรทางบก',
        phoneRule: 'ห้ามใช้โทรศัพท์มือถือขณะขับรถ [พ.ร.บ.การจราจรทางบก มาตรา 43]',
        speedLimits: { urban: 80, rural: 90, highway: 120 },
        emergencyNumber: '191',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      MY: { // Malaysia
        country: 'Malaysia',
        language: 'ms',
        regulation: 'Akta Pengangkutan Jalan 1987',
        phoneRule: 'Dilarang menggunakan telefon bimbit semasa memandu. [APJ 1987 Seksyen 79A]',
        speedLimits: { urban: 60, rural: 90, highway: 110 },
        emergencyNumber: '999',
        seatBeltMandatory: true,
        alcoholLimit: 0.8,
      },
      SG: { // Singapore
        country: 'Singapore',
        language: 'en',
        regulation: 'Road Traffic Act',
        phoneRule: 'Prohibited to use mobile phone while driving. [Road Traffic Act Section 65B]',
        speedLimits: { urban: 50, rural: 70, highway: 90 },
        emergencyNumber: '999',
        seatBeltMandatory: true,
        alcoholLimit: 0.8,
      },
      NZ: { // New Zealand
        country: 'New Zealand',
        language: 'en',
        regulation: 'Land Transport Act',
        phoneRule: 'Prohibited to use handheld mobile phone while driving. [Land Transport Rule 2.6]',
        speedLimits: { urban: 50, rural: 100, highway: 100 },
        emergencyNumber: '111',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },

      // Africa & Middle East
      ZA: { // South Africa
        country: 'South Africa',
        language: 'en',
        regulation: 'National Road Traffic Act',
        phoneRule: 'Prohibited to use handheld mobile phone while driving. [NRTA Section 308A]',
        speedLimits: { urban: 60, rural: 100, highway: 120 },
        emergencyNumber: '10111',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      },
      AE: { // UAE
        country: 'الإمارات العربية المتحدة',
        language: 'ar',
        regulation: 'قانون المرور الاتحادي',
        phoneRule: 'يُمنع استخدام الهاتف المحمول أثناء القيادة. [قانون المرور الاتحادي المادة 49]',
        speedLimits: { urban: 60, rural: 80, highway: 120 },
        emergencyNumber: '999',
        seatBeltMandatory: true,
        alcoholLimit: 0.0,
      },
      SA: { // Saudi Arabia
        country: 'المملكة العربية السعودية',
        language: 'ar',
        regulation: 'نظام المرور',
        phoneRule: 'يُمنع استخدام الهاتف المحمول أثناء القيادة. [نظام المرور المادة 58]',
        speedLimits: { urban: 50, rural: 80, highway: 120 },
        emergencyNumber: '999',
        seatBeltMandatory: true,
        alcoholLimit: 0.0,
      },

      // Default fallback
      DEFAULT: {
        country: 'International',
        language: 'en',
        regulation: 'Local Traffic Regulations',
        phoneRule: 'Check local laws regarding mobile phone use while driving.',
        speedLimits: { urban: 50, rural: 80, highway: 100 },
        emergencyNumber: 'Local Emergency',
        seatBeltMandatory: true,
        alcoholLimit: 0.5,
      }
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      this.isInitialized = true;
      console.log('RoadRegulationService initialized successfully');
    } catch (error) {
      console.error('RoadRegulationService initialization failed:', error);
      throw error;
    }
  }

  getRegulationsForCountry(countryCode) {
    return this.roadRegulations[countryCode] || this.roadRegulations.DEFAULT;
  }

  getAllCountries() {
    return Object.keys(this.roadRegulations).filter(code => code !== 'DEFAULT');
  }

  getCountriesByRegion() {
    return {
      europe: ['GB', 'DE', 'FR', 'ES', 'IT', 'AT', 'BE', 'CH', 'CZ', 'DK', 'FI', 'GR', 'HU', 'IE', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE'],
      americas: ['US', 'CA', 'MX', 'BR', 'AR', 'CL'],
      asiaPacific: ['JP', 'CN', 'KR', 'TH', 'MY', 'SG', 'AU', 'NZ', 'IN'],
      africaMiddleEast: ['ZA', 'AE', 'SA'],
    };
  }

  searchRegulations(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(this.roadRegulations).forEach(([code, regulation]) => {
      if (code === 'DEFAULT') return;

      const searchText = `${regulation.country} ${regulation.regulation} ${regulation.phoneRule}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        results.push({ code, ...regulation });
      }
    });

    return results;
  }

  compareRegulations(countryCodes) {
    return countryCodes.map(code => ({
      code,
      ...this.getRegulationsForCountry(code)
    }));
  }

  async updateRegulation(countryCode, updates) {
    if (this.roadRegulations[countryCode]) {
      this.roadRegulations[countryCode] = {
        ...this.roadRegulations[countryCode],
        ...updates,
        lastUpdated: Date.now(),
      };
      
      await this.saveSettings();
      
      this.notifyListeners('regulationUpdated', {
        countryCode,
        regulation: this.roadRegulations[countryCode],
      });
    }
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('roadRegulations', JSON.stringify(this.roadRegulations));
    } catch (error) {
      console.error('Error saving road regulations:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('roadRegulations');
      if (stored) {
        const storedRegulations = JSON.parse(stored);
        // Merge with default regulations, keeping user updates
        this.roadRegulations = { ...this.roadRegulations, ...storedRegulations };
      }
    } catch (error) {
      console.error('Error loading road regulations:', error);
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
        console.error('RoadRegulationService listener error:', error);
      }
    });
  }

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default new RoadRegulationService();
