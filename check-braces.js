// Simple brace checker for App.js
const fs = require('fs');

try {
    const content = fs.readFileSync('App.js', 'utf8');
    const lines = content.split('\n');
    
    let braceBalance = 0;
    let problemLines = [];
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        braceBalance += openBraces - closeBraces;
        
        // Check for lines with only closing braces
        if (line.trim() === '}' && braceBalance < 0) {
            problemLines.push({
                line: lineNum,
                content: line,
                balance: braceBalance
            });
        }
        
        // Check for lines with multiple closing braces
        if (closeBraces > 1) {
            problemLines.push({
                line: lineNum,
                content: line,
                balance: braceBalance,
                type: 'multiple_close'
            });
        }
    });
    
    console.log('=== BRACE ANALYSIS ===');
    console.log('Final balance:', braceBalance);
    console.log('Problem lines found:', problemLines.length);
    
    if (problemLines.length > 0) {
        console.log('\n=== PROBLEM LINES ===');
        problemLines.forEach(problem => {
            console.log(`Line ${problem.line}: "${problem.content.trim()}" (balance: ${problem.balance}) ${problem.type || ''}`);
        });
    }
    
} catch (error) {
    console.error('Error reading file:', error.message);
}
