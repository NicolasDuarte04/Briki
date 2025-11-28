require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { URL } = require('url');

function compareUrls() {
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    if (!dbUrl || !directUrl) {
        console.log('One or both URLs are missing.');
        return;
    }

    const u1 = new URL(dbUrl);
    const u2 = new URL(directUrl);

    console.log('--- URL COMPARISON ---');
    console.log(`Host match: ${u1.hostname === u2.hostname}`);
    console.log(`Port match: ${u1.port === u2.port}`);
    console.log(`Path match: ${u1.pathname === u2.pathname}`);

    console.log('\nQuery Params (DATABASE_URL):');
    u1.searchParams.forEach((value, key) => console.log(`  ${key}: ${value}`));

    console.log('\nQuery Params (DIRECT_URL):');
    u2.searchParams.forEach((value, key) => console.log(`  ${key}: ${value}`));

    if (u1.toString() === u2.toString()) {
        console.log('\n✅ URLs are IDENTICAL');
    } else {
        console.log('\n❌ URLs are DIFFERENT');
    }
}

compareUrls();
