const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./base/database.sqlite');

const transactionId = 'cmoukpzka01wq1rry09mtl1cc';
const token = 'a88f4c7d-eccc-43da-94d0-7d9cad774161';
const amount = 2.00;

db.serialize(() => {
  db.run('UPDATE deposits SET status = "COMPLETED" WHERE id = ?', [transactionId]);
  db.run('UPDATE fortune_data SET real_balance = real_balance + ?, credit = credit + ?, is_first_deposit = 1 WHERE token = ?', [amount, amount, token], (err) => {
    if (err) console.error(err);
    else console.log('CREDITED SUCCESSFULLY: R$ 2,00');
    db.close();
  });
});
