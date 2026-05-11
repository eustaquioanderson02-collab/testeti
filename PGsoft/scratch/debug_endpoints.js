const axios = require('axios');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const db = new sqlite3.Database('./base/database.sqlite');

async function debug() {
  db.get('SELECT * FROM deposits ORDER BY created_at DESC LIMIT 1', async (err, deposit) => {
    if (!deposit) {
      console.log('No deposits found');
      process.exit(0);
    }
    
    console.log('Testing Deposit ID:', deposit.id);
    const endpoints = [
      `/gateway/transactions/${deposit.id}`,
      `/gateway/deposits/${deposit.id}`,
      `/gateway/pix/${deposit.id}`,
      `/gateway/orders/${deposit.id}`
    ];

    for (const ep of endpoints) {
      const url = `${config.sigilo_pay.api_url}${ep}`;
      console.log(`Checking ${url}...`);
      try {
        const res = await axios.get(url, {
          headers: { 
            'x-public-key': config.sigilo_pay.public_key,
            'x-secret-key': config.sigilo_pay.secret_key
          }
        });
        console.log(`SUCCESS [${ep}]:`, JSON.stringify(res.data, null, 2));
      } catch (e) {
        console.log(`FAILED [${ep}]:`, e.response ? e.response.status : e.message);
      }
    }
    db.close();
  });
}

debug();
