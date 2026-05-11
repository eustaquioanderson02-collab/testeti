const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/Ernane Ramos/Downloads/Telegram Desktop/pgs slotgen/pgs/PGsoft/base/database.sqlite');

db.all("SELECT * FROM deposits", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
