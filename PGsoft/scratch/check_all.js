const axios = require('axios');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

async function check() {
  try {
    const url = `${config.sigilo_pay.api_url}/gateway/deposits`;
    console.log('Checking URL:', url);
    
    const response = await axios.get(url, {
      headers: { 
        'x-public-key': config.sigilo_pay.public_key,
        'x-secret-key': config.sigilo_pay.secret_key
      }
    });

    console.log('API Response (first 2):', JSON.stringify(response.data.slice(0, 2), null, 2));
    const tx = response.data.find(t => t.id === 'cmoujb9n200gb1yrydxe3wzul');
    if (tx) console.log('Found it in the full list!', tx);
    else console.log('Not found in the full list.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
