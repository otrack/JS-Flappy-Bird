const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const STORAGE_SERVER = 'http://172.26.236.18:26657'; // Address of the key-value store

// Load SSL certificates
const options = {
    key: fs.readFileSync('key.pem'),  // Path to private key
    cert: fs.readFileSync('cert.pem') // Path to certificate
};

// Create HTTPS server
https.createServer(options, (req, res) => {
    const requested = req.url === '/' ? 'index.html' : req.url.slice(1); // Default to index.html    

    // Check if the request matches the proxy endpoints
    if (requested.startsWith('broadcast_tx_commit') || requested.startsWith('abci_query') || requested.startsWith('tx_search')) {

	// Proxy the request to the storage server
        const storageUrl = `${STORAGE_SERVER}/${requested}`;
        http.get(storageUrl, (proxyRes) => {
            let data = '';

            // Collect response data from the storage server
            proxyRes.on('data', (chunk) => {
                data += chunk;
            });
	    console.log(data);

            proxyRes.on('end', () => {
                // Forward the response back to the client
                res.writeHead(proxyRes.statusCode, { 'Content-Type': proxyRes.headers['content-type'] || 'application/json' });
                res.end(data);
            });
        }).on('error', (err) => {
            // Handle errors when communicating with the storage server
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Error communicating with storage server: ${err.message}`);
        });
	
    } else {
        // Serve static files for other requests
        const filePath = path.join(__dirname, requested);
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
        }[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    }
}).listen(PORT, () => {
    console.log(`HTTPS server running on https://localhost:${PORT}`);
});
