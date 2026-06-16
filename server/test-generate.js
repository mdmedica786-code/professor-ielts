// Quick test script for question generation
const http = require('http');

const payload = JSON.stringify({ topic: "abroad" });

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/generate-prompts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Success:', parsed.success);
      if (parsed.data) {
        parsed.data.forEach(q => console.log(`  Part ${q.part}: ${q.text.substring(0, 80)}...`));
      } else {
        console.log('Error:', parsed.error, parsed.detail);
      }
    } catch (e) {
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.write(payload);
req.end();
