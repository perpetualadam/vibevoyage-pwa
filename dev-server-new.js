/**
 * Development Server for VibeVoyage PWA
 * Serves files with proper cache headers and auto-reload
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

class DevServer {
    constructor(port = 3000) {
        this.port = port;
        this.mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
    }

    // Get MIME type for file
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.mimeTypes[ext] || 'application/octet-stream';
    }

    // Set cache headers
    setCacheHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        if (ext === '.js' || ext === '.css') {
            // No cache for JS/CSS files during development
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else if (ext === '.html') {
            // No cache for HTML files
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            // Short cache for other assets
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        }
    }

    // Handle requests
    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        let filePath = parsedUrl.pathname;

        // Default to index.html
        if (filePath === '/') {
            filePath = '/index.html';
        }

        // Remove leading slash and resolve path
        const fullPath = path.join(__dirname, filePath.substring(1));

        // Check if file exists
        fs.access(fullPath, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
                console.log(`❌ 404: ${filePath}`);
                return;
            }

            // Read and serve file
            fs.readFile(fullPath, (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal server error');
                    console.log(`❌ 500: ${filePath}`);
                    return;
                }

                const mimeType = this.getMimeType(fullPath);
                this.setCacheHeaders(res, fullPath);
                
                res.writeHead(200, { 
                    'Content-Type': mimeType,
                    'Access-Control-Allow-Origin': '*' // Enable CORS
                });
                res.end(data);
                
                console.log(`✅ ${req.method} ${filePath} (${mimeType})`);
            });
        });
    }

    // Start server
    start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        server.listen(this.port, () => {
            console.log(`🚀 VibeVoyage Dev Server running at http://localhost:${this.port}`);
            console.log(`📁 Serving files from: ${__dirname}`);
            console.log(`🔧 Cache headers: Disabled for development`);
            console.log(`🌐 CORS: Enabled`);
            console.log(`\n📋 Available pages:`);
            console.log(`   • http://localhost:${this.port}/ (Main app)`);
            console.log(`   • http://localhost:${this.port}/test-fixed.html (Test page)`);
            console.log(`   • http://localhost:${this.port}/hotfix.html (Hotfix page)`);
        });

        return server;
    }
}

// Start server if called directly
if (require.main === module) {
    const server = new DevServer();
    server.start();
}

module.exports = DevServer;
