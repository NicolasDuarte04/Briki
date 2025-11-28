require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const net = require('net');
const { URL } = require('url');

function parseUrl(connectionString) {
    try {
        const url = new URL(connectionString);
        return { host: url.hostname, port: url.port || 5432 };
    } catch (e) {
        return null;
    }
}

function checkPort(name, connectionString) {
    return new Promise((resolve) => {
        const params = parseUrl(connectionString);
        if (!params) {
            console.log(`❌ ${name}: Invalid URL or not set`);
            resolve();
            return;
        }

        console.log(`Testing ${name}: ${params.host}:${params.port}...`);
        const socket = new net.Socket();
        socket.setTimeout(5000);

        socket.on('connect', () => {
            console.log(`✅ ${name}: TCP Connection Successful!`);
            socket.destroy();
            resolve();
        });

        socket.on('timeout', () => {
            console.log(`❌ ${name}: Timeout`);
            socket.destroy();
            resolve();
        });

        socket.on('error', (err) => {
            console.log(`❌ ${name}: Error - ${err.message}`);
            resolve();
        });

        socket.connect(params.port, params.host);
    });
}

async function main() {
    console.log('--- TCP CONNECTION TEST ---');
    await checkPort('DATABASE_URL', process.env.DATABASE_URL);
    await checkPort('DIRECT_URL', process.env.DIRECT_URL);
    console.log('---------------------------');
}

main();
