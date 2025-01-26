const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Load settings
const settingsPath = path.join(__dirname, '../config/settings.decrypted.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

const PORT = 4000;
const oauth2Client = new google.auth.OAuth2(
  settings.gmail.clientId,
  settings.gmail.clientSecret,
  `http://localhost:${PORT}/oauth2callback`,
);

// Generate authentication URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: settings.gmail.scopes,
  prompt: 'consent',
});

console.log('\n=== Gmail OAuth2 Authentication ===');
console.log('\n1. Copy and paste this URL into your browser:');
console.log('\x1b[36m%s\x1b[0m', authUrl);
console.log('\n2. Follow the Google sign-in process');
console.log('3. You will be redirected to localhost after authorization');
console.log('4. Copy the credentials shown in the console to update your settings\n');

// Create server to handle the OAuth2 callback
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/oauth2callback') {
      const code = parsedUrl.query.code;
      if (!code) {
        throw new Error('No code provided');
      }

      // Get tokens
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authentication successful!</h1><p>You can close this window now.</p>');

      // Print the credentials in a format easy to copy
      console.log('\n✅ Authentication successful! Here are your credentials:\n');
      console.log('Add this to your settings.decrypted.json under gmail.credentials:\n');
      console.log('\x1b[32m%s\x1b[0m', JSON.stringify(tokens, null, 2));

      process.exit(0);
    } else {
      // Handle other routes
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>Authentication failed!</h1><p>Please check the console for more details.</p>');
  }
});

server.listen(PORT, () => {
  console.log(`Server ready and listening on port ${PORT}...`);
});
