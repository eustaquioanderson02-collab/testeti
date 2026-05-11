const axios = require('axios');

async function testWebhook() {
  try {
    const payload = {
      token: 'VALID_TOKEN_789',
      transaction: {
        id: 'FAKE_TX_123',
        status: 'COMPLETED',
        amount: 10
      }
    };

    console.log('Sending fake webhook...');
    const response = await axios.post('http://localhost:3059/api/webhook/sigilopay', payload);
    console.log('Server response:', response.status, response.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }
}

testWebhook();
