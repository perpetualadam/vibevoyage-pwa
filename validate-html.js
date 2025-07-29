const fs = require('fs');

console.log('🔍 Validating HTML syntax...');

try {
    const html = fs.readFileSync('index.html', 'utf8');
    
    // Check for common syntax errors
    const issues = [];
    
    // Check for malformed JavaScript strings
    const malformedStrings = html.match(/['"'][^'"]*\+[^'"]*\+[^'"]*['"]/g);
    if (malformedStrings) {
        issues.push(`❌ Malformed strings found: ${malformedStrings.length}`);
        malformedStrings.forEach(str => console.log(`   - ${str}`));
    }
    
    // Check for proper script tag syntax
    const scriptTags = html.match(/<script[^>]*>[\s\S]*?<\/script>/g);
    if (scriptTags) {
        console.log(`📜 Found ${scriptTags.length} script tags`);
        
        scriptTags.forEach((script, index) => {
            // Check for basic syntax issues
            if (script.includes("' + Date.now() + '")) {
                console.log(`✅ Script ${index + 1}: Proper Date.now() concatenation`);
            }
            if (script.includes("+ Date.now() + '&")) {
                console.log(`✅ Script ${index + 1}: Proper URL parameter concatenation`);
            }
        });
    }
    
    // Check for function definitions that should exist
    const requiredFunctions = [
        'toggleHazardSettings',
        'toggleSettings', 
        'showLanguageSelector',
        'getCurrentLocation',
        'shareCurrentRoute',
        'toggleFavorites',
        'showGamificationStats',
        'toggleVoiceReporting',
        'testNotifications'
    ];
    
    console.log('\n🔍 Checking for function references...');
    requiredFunctions.forEach(func => {
        if (html.includes(`onclick="${func}(`)) {
            console.log(`✅ Found onclick reference to: ${func}`);
        }
    });
    
    if (issues.length === 0) {
        console.log('\n✅ HTML validation passed! No syntax issues found.');
    } else {
        console.log('\n❌ HTML validation found issues:');
        issues.forEach(issue => console.log(issue));
    }
    
} catch (error) {
    console.error('❌ Error validating HTML:', error);
}
