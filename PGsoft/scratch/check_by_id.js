const axios = require('axios');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const transactionId = 'cmoujb9n200gb1yrydxe3wzul';

async function check() {
  try {
    // Tentando por ID direto no path se a API suportar
    const url = `${config.sigilo_pay.api_url}/gateway/deposits/${transactionId}`;
    console.log('Checking URL:', url);
    
    const response = await axios.get(url, {
      headers: { 
        'x-public-key': config.sigilo_pay.public_key,
        'x-secret-key': config.sigilo_pay.secret_key
      }
    });

    console.log('API Response:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
  }
}

check();
