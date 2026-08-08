const http = require('http');
const { server } = require('./backend/src/server.js');

setTimeout(() => {
  http.get('http://localhost:5000/api/v1/society-management/my-role', (res) => {
    console.log('Status code:', res.statusCode);
    if (res.statusCode === 401) {
      console.log('Smoke test passed: returns 401 (no token)');
    } else {
      console.error(`Smoke test failed: expected 401, got ${res.statusCode}`);
      process.exitCode = 1;
    }
    
    // Read the body just to clear the stream
    res.on('data', () => {});
    res.on('end', () => {
      server.close(() => {
        console.log('Server closed');
        process.exit();
      });
    });
  }).on('error', (e) => {
    console.error('Error fetching:', e.message);
    server.close();
    process.exit(1);
  });
}, 3000);
