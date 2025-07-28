/**
 * Module Loader
 * Dynamically loads and initializes application modules
 */
class ModuleLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.dependencies = new Map();
        
        // Define module dependencies
        this.setupDependencies();
    }

    setupDependencies() {
        // Define which modules depend on others
        this.dependencies.set('MapManager', []);
        this.dependencies.set('LocationManager', []);
        this.dependencies.set('SettingsManager', []);
        this.dependencies.set('LanguageManager', ['SettingsManager']);
        this.dependencies.set('RouteManager', ['SettingsManager']);
        this.dependencies.set('NavigationManager', ['RouteManager', 'LocationManager']);
        this.dependencies.set('UIManager', []);
        this.dependencies.set('GamificationManager', ['SettingsManager']);
        this.dependencies.set('HazardManager', ['SettingsManager', 'LocationManager']);
    }

    async loadModule(moduleName) {
        // Return cached module if already loaded
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        // Start loading process
        const loadingPromise = this.doLoadModule(moduleName);
        this.loadingPromises.set(moduleName, loadingPromise);

        try {
            const module = await loadingPromise;
            this.loadedModules.set(moduleName, module);
            this.loadingPromises.delete(moduleName);
            return module;
        } catch (error) {
            this.loadingPromises.delete(moduleName);
            throw error;
        }
    }

    async doLoadModule(moduleName) {
        console.log(`📦 Loading module: ${moduleName}`);

        try {
            // Load dependencies first
            await this.loadDependencies(moduleName);

            // Load the module
            const ModuleClass = await this.importModule(moduleName);
            
            if (!ModuleClass) {
                throw new Error(`Module class not found: ${moduleName}`);
            }

            // Create instance
            const instance = new ModuleClass();
            
            console.log(`✅ Module loaded: ${moduleName}`);
            return instance;

        } catch (error) {
            console.error(`❌ Failed to load module ${moduleName}:`, error);
            throw error;
        }
    }

    async loadDependencies(moduleName) {
        const deps = this.dependencies.get(moduleName) || [];
        
        if (deps.length === 0) {
            return;
        }

        console.log(`🔗 Loading dependencies for ${moduleName}: ${deps.join(', ')}`);
        
        const depPromises = deps.map(dep => this.loadModule(dep));
        await Promise.all(depPromises);
    }

    async importModule(moduleName) {
        // Try to get from global scope first (for browser)
        if (typeof window !== 'undefined' && window[moduleName]) {
            return window[moduleName];
        }

        // Try dynamic import (ES6 modules)
        try {
            const modulePath = this.getModulePath(moduleName);
            const module = await import(modulePath);
            return module.default || module[moduleName];
        } catch (error) {
            console.warn(`Dynamic import failed for ${moduleName}:`, error);
        }

        // Try require (Node.js/CommonJS)
        if (typeof require !== 'undefined') {
            try {
                const modulePath = this.getModulePath(moduleName);
                return require(modulePath);
            } catch (error) {
                console.warn(`Require failed for ${moduleName}:`, error);
            }
        }

        // Try loading via script tag (browser fallback)
        if (typeof document !== 'undefined') {
            return this.loadModuleViaScript(moduleName);
        }

        throw new Error(`Could not import module: ${moduleName}`);
    }

    getModulePath(moduleName) {
        const moduleMap = {
            'BaseModule': './src/core/BaseModule.js',
            'MapManager': './src/modules/MapManager.js',
            'LocationManager': './src/modules/LocationManager.js',
            'RouteManager': './src/modules/RouteManager.js',
            'NavigationManager': './src/modules/NavigationManager.js',
            'UIManager': './src/modules/UIManager.js',
            'SettingsManager': './src/modules/SettingsManager.js',
            'LanguageManager': './src/modules/LanguageManager.js',
            'GamificationManager': './src/modules/GamificationManager.js',
            'HazardManager': './src/modules/HazardManager.js'
        };

        return moduleMap[moduleName] || `./src/modules/${moduleName}.js`;
    }

    async loadModuleViaScript(moduleName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.getModulePath(moduleName);
            
            script.onload = () => {
                // Check if module is now available in global scope
                if (window[moduleName]) {
                    resolve(window[moduleName]);
                } else {
                    reject(new Error(`Module ${moduleName} not found in global scope after loading`));
                }
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script for module: ${moduleName}`));
            };
            
            document.head.appendChild(script);
        });
    }

    async loadAllModules() {
        const moduleNames = Array.from(this.dependencies.keys());
        const loadPromises = moduleNames.map(name => this.loadModule(name));
        
        try {
            const modules = await Promise.all(loadPromises);
            console.log('✅ All modules loaded successfully');
            return modules;
        } catch (error) {
            console.error('❌ Failed to load all modules:', error);
            throw error;
        }
    }

    getLoadedModule(moduleName) {
        return this.loadedModules.get(moduleName);
    }

    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    getLoadedModules() {
        return Array.from(this.loadedModules.keys());
    }

    unloadModule(moduleName) {
        const module = this.loadedModules.get(moduleName);
        if (module && typeof module.destroy === 'function') {
            module.destroy();
        }
        
        this.loadedModules.delete(moduleName);
        console.log(`🗑️ Module unloaded: ${moduleName}`);
    }

    unloadAllModules() {
        for (const [name, module] of this.loadedModules) {
            if (typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    console.error(`Error destroying module ${name}:`, error);
                }
            }
        }
        
        this.loadedModules.clear();
        this.loadingPromises.clear();
        console.log('🗑️ All modules unloaded');
    }

    /**
     * Module health checking
     */
    checkModuleHealth() {
        const health = {
            total: this.loadedModules.size,
            healthy: 0,
            unhealthy: 0,
            modules: {}
        };

        for (const [name, module] of this.loadedModules) {
            try {
                const status = module.getStatus ? module.getStatus() : { isInitialized: true };
                health.modules[name] = {
                    status: 'healthy',
                    ...status
                };
                health.healthy++;
            } catch (error) {
                health.modules[name] = {
                    status: 'unhealthy',
                    error: error.message
                };
                health.unhealthy++;
            }
        }

        return health;
    }

    /**
     * Development helpers
     */
    listAvailableModules() {
        return Array.from(this.dependencies.keys());
    }

    getDependencyGraph() {
        const graph = {};
        for (const [module, deps] of this.dependencies) {
            graph[module] = deps;
        }
        return graph;
    }

    validateDependencies() {
        const errors = [];
        
        for (const [module, deps] of this.dependencies) {
            for (const dep of deps) {
                if (!this.dependencies.has(dep)) {
                    errors.push(`Module ${module} depends on unknown module: ${dep}`);
                }
            }
        }
        
        return errors;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleLoader;
} else {
    window.ModuleLoader = ModuleLoader;
}
