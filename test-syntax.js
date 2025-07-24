// Simple test to check if the class definition works
class VibeVoyageApp {
    constructor() {
        console.log('Test app initializing...');
        this.test = true;
    }
    
    testMethod() {
        console.log('Test method called');
        return 'working';
    }
}

// Test initialization
try {
    console.log('Creating test app...');
    const testApp = new VibeVoyageApp();
    console.log('Test app created successfully:', testApp);
    console.log('Test method result:', testApp.testMethod());
    window.testApp = testApp;
    console.log('✅ Test successful - class definition works');
} catch (error) {
    console.error('❌ Test failed:', error);
}
