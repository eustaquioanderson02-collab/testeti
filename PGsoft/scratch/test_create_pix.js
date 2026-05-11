const axios = require('axios');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

async function testCreate() {
  try {
    const fullUrl = `${config.sigilo_pay.api_url}/gateway/pix/receive`;
    const response = await axios.post(fullUrl, {
      identifier: 'test_token_123',
      amount: 2.00,
      client: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '11999999999',
        document: '42230309802'
      },
      callbackUrl: 'http://localhost:3059/api/webhook/sigilopay'
    }, {
      headers: { 
        'x-public-key': config.sigilo_pay.public_key,
        'x-secret-key': config.sigilo_pay.secret_key
      }
    });

    console.log('SigiloPay Response:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
  }
}

testCreate();
