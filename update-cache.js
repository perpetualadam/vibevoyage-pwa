const fs = require('fs');

console.log('🔧 Updating cache...');

try {
    const version = Date.now();

    // Read index.html
    let html = fs.readFileSync('index.html', 'utf8');

    // Replace App.js references with proper syntax - be more careful with the replacement
    html = html.replace(/App\.js\?v=[^'"]*/g, `App.js?v=${version}&t=' + Date.now() + '&fixed=true`);

    // Fix any malformed URLs that might have been created
    html = html.replace(/App\.js\?[^']*\+ Date\.now\(\) \+[^']*'/g, `App.js?v=${version}&t=' + Date.now() + '&fixed=true&nocache=true'`);

    // Write back to file
    fs.writeFileSync('index.html', html);

    console.log(`✅ Cache updated with version: ${version}`);
    console.log('🔄 Please refresh your browser to see the changes');

} catch (error) {
    console.error('❌ Error updating cache:', error);
}
