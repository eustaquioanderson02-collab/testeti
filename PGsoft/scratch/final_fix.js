const axios = require('axios');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const db = new sqlite3.Database('./base/database.sqlite');

const transactionId = 'cmoujb9n200gb1yrydxe3wzul';
const token = 'a88f4c7d-eccc-43da-94d0-7d9cad774161';

async function check() {
  try {
    // Usando o endpoint correto de transações
    const url = `${config.sigilo_pay.api_url}/gateway/transactions/${transactionId}`;
    console.log('Checking URL:', url);
    
    const response = await axios.get(url, {
      headers: { 
        'x-public-key': config.sigilo_pay.public_key,
        'x-secret-key': config.sigilo_pay.secret_key
      }
    });

    const tx = response.data;
    console.log('API Response:', JSON.stringify(tx, null, 2));
    
    if (tx && (tx.status === 'PAID' || tx.status === 'COMPLETED')) {
      console.log('PAYMENT CONFIRMED! Updating database...');
      
      db.serialize(() => {
        // Busca o valor real no banco
        db.get('SELECT amount FROM deposits WHERE id = ?', [transactionId], (err, dRow) => {
          const amount = dRow ? dRow.amount : 10;
          console.log('Amount to credit:', amount);
          
          db.run('UPDATE deposits SET status = "COMPLETED" WHERE id = ?', [transactionId]);
          
          db.get('SELECT real_balance FROM fortune_data WHERE token = ?', [token], (err, row) => {
            if (row) {
              const newBalance = row.real_balance + amount;
              db.run('UPDATE fortune_data SET real_balance = ?, credit = credit + ?, is_first_deposit = 1 WHERE token = ?', [newBalance, amount, token], () => {
                console.log('Balance updated to:', newBalance);
                process.exit(0);
              });
            } else {
              console.log('User not found');
              process.exit(1);
            }
          });
        });
      });
    } else {
      console.log('Transaction not paid yet according to API. Status:', tx?.status);
      process.exit(0);
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
    process.exit(1);
  }
}

check();
