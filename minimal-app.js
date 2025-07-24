// Minimal version to test class definition
class VibeVoyageApp {
    constructor() {
        console.log('Minimal app initializing...');
        this.test = true;
    }
    
    testMethod() {
        console.log('Test method called');
        return 'working';
    }
}

// Test initialization
try {
    console.log('Creating minimal app...');
    window.minimalApp = new VibeVoyageApp();
    console.log('✅ Minimal app created successfully');
} catch (error) {
    console.error('❌ Minimal app failed:', error);
}
