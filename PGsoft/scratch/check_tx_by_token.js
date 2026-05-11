const axios = require('axios');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const token = 'a88f4c7d-eccc-43da-94d0-7d9cad774161';

async function check() {
  try {
    const url = `${config.sigilo_pay.api_url}/gateway/transactions?identifier=${token}`;
    console.log('Checking URL:', url);
    
    const response = await axios.get(url, {
      headers: { 
        'x-public-key': config.sigilo_pay.public_key,
        'x-secret-key': config.sigilo_pay.secret_key
      }
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
  }
}

check();
