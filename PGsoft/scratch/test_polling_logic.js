const axios = require('axios');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const db = new sqlite3.Database('./base/database.sqlite');

async function testPolling() {
  db.get('SELECT * FROM deposits WHERE status = "PENDING" ORDER BY created_at DESC LIMIT 1', async (err, deposit) => {
    if (!deposit) {
      console.log('No pending deposits found');
      process.exit(0);
    }
    
    const transactionId = deposit.id;
    const token = deposit.token;
    console.log('Testing polling logic for ID:', transactionId);

    try {
      const fullUrl = `${config.sigilo_pay.api_url}/gateway/transactions?id=${transactionId}`;
      const response = await axios.get(fullUrl, {
        headers: { 
          'x-public-key': config.sigilo_pay.public_key,
          'x-secret-key': config.sigilo_pay.secret_key
        }
      });

      const tx = Array.isArray(response.data) ? response.data[0] : response.data;
      console.log('SigiloPay Status:', tx?.status);
      
      if (tx && (tx.status === 'PAID' || tx.status === 'COMPLETED')) {
        console.log('Match! Attempting DB update...');
        
        db.get('SELECT * FROM deposits WHERE id = ? AND status = "PENDING"', [transactionId], (err, results) => {
          if (err) console.error('DB Error 1:', err);
          if (!results) {
            console.log('Deposit not found in PENDING state. Current status in DB?');
            db.get('SELECT status FROM deposits WHERE id = ?', [transactionId], (err, r) => console.log('Status in DB:', r?.status));
            return;
          }

          console.log('Deposit found. Updating...');
          const depositAmount = deposit.amount;
          
          db.run('UPDATE deposits SET status = "COMPLETED" WHERE id = ?', [transactionId], (err) => {
            if (err) console.error('Update Error:', err);
            else console.log('Deposit marked as COMPLETED');
          });
          
          db.get('SELECT * FROM fortune_data WHERE token = ?', [token], (uErr, user) => {
            if (!user) {
              console.log('User not found for token:', token);
              return;
            }
            const newBalance = user.real_balance + depositAmount;
            console.log(`Current Balance: ${user.real_balance}. New Balance: ${newBalance}`);
            
            db.run('UPDATE fortune_data SET real_balance = ?, credit = credit + ?, is_first_deposit = 1 WHERE token = ?', 
              [newBalance, depositAmount, token], (err) => {
                if (err) console.error('Balance Update Error:', err);
                else console.log('Balance updated successfully!');
                db.close();
              });
          });
        });
      } else {
        console.log('Status is still:', tx?.status);
        db.close();
      }
    } catch (e) {
      console.error('API Error:', e.message);
      db.close();
    }
  });
}

testPolling();
