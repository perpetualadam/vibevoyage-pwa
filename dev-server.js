#!/usr/bin/env node

/**
 * Simple development server for VibeVoyage PWA
 * Serves files with proper MIME types and CORS headers
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.geojson': 'application/geo+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Default to index.html for root
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Try to serve from multiple locations
  const possiblePaths = [
    path.join(__dirname, pathname),
    path.join(__dirname, 'public', pathname),
    path.join(__dirname, 'dist', pathname),
    path.join(__dirname, 'src', pathname)
  ];

  let fileFound = false;
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      console.log(`📄 Serving: ${pathname} -> ${filePath}`);
      serveFile(res, filePath);
      fileFound = true;
      break;
    }
  }

  if (!fileFound) {
    // Try serving index.html for SPA routing
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log(`🔄 SPA fallback: ${pathname} -> index.html`);
      serveFile(res, indexPath);
    } else {
      console.log(`❌ Not found: ${pathname}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log('🚀 VibeVoyage Development Server');
  console.log(`📍 Server running at http://${HOST}:${PORT}/`);
  console.log('🗂️  Serving files from:');
  console.log(`   - Root: ${__dirname}`);
  console.log(`   - Public: ${path.join(__dirname, 'public')}`);
  console.log(`   - Dist: ${path.join(__dirname, 'dist')}`);
  console.log(`   - Src: ${path.join(__dirname, 'src')}`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   - Run "node build-typescript.js" to compile TypeScript');
  console.log('   - Access the app at http://localhost:3000');
  console.log('   - Press Ctrl+C to stop the server');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
