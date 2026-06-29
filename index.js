const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const app = express();
const port = process.env.PORT || 3000;

let qrData = '';
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    }
});

client.on('qr', async (qr) => {
    console.log('QR Code generated');
    try {
        qrData = await QRCode.toDataURL(qr);
    } catch (e) {
        console.error('Error generating QR:', e);
    }
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isReady = true;
    qrData = '';
});

client.on('disconnected', () => {
    isReady = false;
    qrData = '';
    client.initialize();
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) {
        res.send('<h1>Connected successfully.</h1>');
    } else if (qrData) {
        res.send(`
<!DOCTYPE html>
<html>
<head><title>WhatsApp Web</title>
<style>
body{background:#f0f2f5;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:Arial}
.container{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center}
img{max-width:280px}
</style></head>
<body>
<div class="container">
<h2>WhatsApp Web</h2>
<p>Please scan the QR code with your phone</p>
<img src="${qrData}" alt="QR Code"/>
</div>
</body>
</html>`);
    } else {
        res.send('<h1>Loading QR code... Please wait.</h1>');
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
