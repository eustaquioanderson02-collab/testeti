const axios = require('axios');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const db = new sqlite3.Database('./base/database.sqlite');

const transactionId = 'cmoujb9n200gb1yrydxe3wzul';
const token = 'a88f4c7d-eccc-43da-94d0-7d9cad774161';

async function check() {
  try {
    // SigiloPay API docs suggest searching by identifier (which is our token)
    const url = `${config.sigilo_pay.api_url}/gateway/deposits?identifier=${token}`;
    console.log('Checking URL:', url);
    
    const response = await axios.get(url, {
      headers: { 
        'x-public-key': config.sigilo_pay.public_key,
        'x-secret-key': config.sigilo_pay.secret_key
      }
    });

    const data = response.data;
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    const depositsList = Array.isArray(data) ? data : (data.data || []);
    const tx = depositsList.find(t => t.id === transactionId || t.identifier === transactionId);
    
    if (tx) {
      console.log('Transaction Found:', tx.id, 'Status:', tx.status);
      if (tx.status === 'PAID' || tx.status === 'COMPLETED') {
        console.log('PAYMENT CONFIRMED! Updating database...');
        
        db.serialize(() => {
          db.run('UPDATE deposits SET status = "COMPLETED" WHERE id = ?', [transactionId]);
          
          db.get('SELECT real_balance FROM fortune_data WHERE token = ?', [token], (err, row) => {
            if (row) {
              const newBalance = row.real_balance + 10; // 10 was the amount
              db.run('UPDATE fortune_data SET real_balance = ?, is_first_deposit = 1 WHERE token = ?', [newBalance, token], () => {
                console.log('Balance updated to:', newBalance);
                process.exit(0);
              });
            } else {
              console.log('User not found');
              process.exit(1);
            }
          });
        });
      } else {
        console.log('Transaction not paid yet. Status:', tx.status);
        process.exit(0);
      }
    } else {
      console.log('Transaction NOT FOUND in SigiloPay list for this identifier.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
    process.exit(1);
  }
}

check();
