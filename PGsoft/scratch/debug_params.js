const axios = require('axios');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const db = new sqlite3.Database('./base/database.sqlite');

async function debug() {
  db.get('SELECT * FROM deposits ORDER BY created_at DESC LIMIT 1', async (err, deposit) => {
    const params = [
      `id=${deposit.id}`,
      `identifier=${deposit.id}`,
      `externalId=${deposit.id}`,
      `transactionId=${deposit.id}`,
      `reference=${deposit.id}`
    ];

    for (const p of params) {
      const url = `${config.sigilo_pay.api_url}/gateway/transactions?${p}`;
      console.log(`Checking ${url}...`);
      try {
        const res = await axios.get(url, {
          headers: { 
            'x-public-key': config.sigilo_pay.public_key,
            'x-secret-key': config.sigilo_pay.secret_key
          }
        });
        console.log(`SUCCESS [${p}]:`, JSON.stringify(res.data, null, 2));
      } catch (e) {
        console.log(`FAILED [${p}]:`, e.response ? e.response.status : e.message, e.response ? e.response.data : '');
      }
    }
    db.close();
  });
}

debug();
