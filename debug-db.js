require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testConnection(name, url) {
    console.log(`\nTesting ${name}...`);
    if (!url) {
        console.log(`❌ ${name} is not set`);
        return;
    }
    // Mask password for output
    const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
    console.log(`URL: ${maskedUrl}`);

    const client = new Client({
        connectionString: url,
        connectionTimeoutMillis: 5000,
    });
    try {
        await client.connect();
        console.log(`✅ ${name} Connected successfully!`);
        const res = await client.query('SELECT version()');
        console.log(`   Version: ${res.rows[0].version}`);
        await client.end();
    } catch (e) {
        console.log(`❌ ${name} Failed: ${e.message}`);
    }
}

async function main() {
    console.log('--- DATABASE CONNECTION TEST ---');
    await testConnection('DATABASE_URL', process.env.DATABASE_URL);
    await testConnection('DIRECT_URL', process.env.DIRECT_URL);
    console.log('\n--------------------------------');
}

main();
