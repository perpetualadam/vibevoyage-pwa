const fs = require('fs');

console.log('🔧 Fixing malformed strings in HTML...');

try {
    let html = fs.readFileSync('index.html', 'utf8');
    let fixCount = 0;
    
    // Fix 1: Ensure proper string concatenation in script src
    const originalSrcPattern = /appScript\.src = 'App\.js\?v=[^']*' \+ Date\.now\(\) \+ '[^']*';/g;
    if (html.match(originalSrcPattern)) {
        html = html.replace(originalSrcPattern, 
            "appScript.src = 'App.js?v=' + Date.now() + '&fixed=true&nocache=true&force=reload&cachebuster=v3';");
        fixCount++;
        console.log('✅ Fixed appScript.src concatenation');
    }
    
    // Fix 2: Fix script.src patterns
    const scriptSrcPattern = /script\.src = 'App\.js\?v=[^']*' \+ Date\.now\(\) \+ '[^']*';/g;
    if (html.match(scriptSrcPattern)) {
        html = html.replace(scriptSrcPattern, 
            "script.src = 'App.js?v=' + Date.now() + '&fixed=true&nocache=true&force=reload';");
        fixCount++;
        console.log('✅ Fixed script.src concatenation');
    }
    
    // Fix 3: Fix any broken template literals
    const brokenTemplateLiterals = /`[^`]*\$\{[^}]*\}[^`]*\n[^`]*`/g;
    const matches = html.match(brokenTemplateLiterals);
    if (matches) {
        console.log('⚠️ Found potentially broken template literals:', matches.length);
        matches.forEach((match, index) => {
            console.log(`   ${index + 1}: ${match.substring(0, 50)}...`);
        });
    }
    
    // Fix 4: Ensure all console.log statements are properly closed
    const brokenConsoleLog = /console\.log\('[^']*\n[^']*'\)/g;
    if (html.match(brokenConsoleLog)) {
        console.log('⚠️ Found broken console.log statements');
        // This would need manual fixing as it's complex
    }
    
    // Fix 5: Clean up any malformed URL parameters
    html = html.replace(/App\.js\?v=\d+&t=\d+&fixed=true \+ Date\.now\(\) \+ '&/g, 
                       "App.js?v=' + Date.now() + '&t=' + Date.now() + '&fixed=true&");
    
    // Fix 6: Standardize all App.js loading patterns
    html = html.replace(/App\.js\?v=[^']*&t=[^']*&fixed=true[^']*'/g, 
                       "App.js?v=' + Date.now() + '&t=' + Date.now() + '&fixed=true&nocache=true'");
    
    // Write the fixed HTML back
    fs.writeFileSync('index.html', html);
    
    console.log(`✅ Fixed ${fixCount} malformed string patterns`);
    console.log('🔄 Please refresh your browser to see the changes');
    
    // Validate the fixes
    console.log('\n🔍 Validating fixes...');
    const remainingIssues = html.match(/['"'][^'"]*\+[^'"]*\+[^'"]*['"']/g);
    if (remainingIssues) {
        console.log(`⚠️ ${remainingIssues.length} potential issues remain:`);
        remainingIssues.forEach((issue, index) => {
            if (index < 5) { // Show first 5
                console.log(`   ${index + 1}: ${issue}`);
            }
        });
        if (remainingIssues.length > 5) {
            console.log(`   ... and ${remainingIssues.length - 5} more`);
        }
    } else {
        console.log('✅ No obvious malformed string patterns found');
    }
    
} catch (error) {
    console.error('❌ Error fixing malformed strings:', error);
}
