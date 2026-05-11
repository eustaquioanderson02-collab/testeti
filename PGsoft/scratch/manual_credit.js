const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./base/database.sqlite');

const transactionId = 'cmoujb9n200gb1yrydxe3wzul';
const token = 'a88f4c7d-eccc-43da-94d0-7d9cad774161';

db.serialize(() => {
  db.run('UPDATE deposits SET status = "COMPLETED" WHERE id = ?', [transactionId]);
  db.run('UPDATE fortune_data SET real_balance = real_balance + 10, credit = credit + 10, is_first_deposit = 1 WHERE token = ?', [token], (err) => {
    if (err) console.error(err);
    else console.log('CREDITED SUCCESSFULLY');
    db.close();
  });
});
