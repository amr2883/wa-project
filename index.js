const express = require('express');
const QRCode = require('qrcode');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const app = express();
const port = process.env.PORT || 3000;

let qrData = '';
let isConnected = false;

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            // Generate QR code image
            try {
                qrData = await QRCode.toDataURL(qr);
            } catch (e) {
                console.error('QR generation error:', e);
            }
        }
        if (connection === 'open') {
            console.log('Connected successfully');
            isConnected = true;
            qrData = '';
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                startSock();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startSock();

app.get('/', (req, res) => {
    if (isConnected) {
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
