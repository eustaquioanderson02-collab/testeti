const express = require('express');
const app = express();
const mysql = require('mysql2');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const config = require('./config.json');
const path = require('path');
const axios = require('axios');

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Estáticos
app.use('/FortuneTiger', express.static(path.join(__dirname, '../FortuneTiger')));
app.use(express.static(path.join(__dirname, 'public')));

// CONEXÃO AIVEN (MYSQL)
const db = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: process.env.DB_PASSWORD || config.mysql.password,
    database: config.mysql.database,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10
});

// Inicialização de Tabelas
db.query(`
  CREATE TABLE IF NOT EXISTS fortune_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    password VARCHAR(255),
    fullName VARCHAR(255),
    credit DOUBLE DEFAULT 0,
    real_balance DOUBLE DEFAULT 0,
    bonus_balance DOUBLE DEFAULT 0,
    token VARCHAR(255) UNIQUE
  );
  CREATE TABLE IF NOT EXISTS deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE,
    user_token VARCHAR(255),
    amount DOUBLE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS webhook_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS wins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255),
    amount DOUBLE,
    win_amount DOUBLE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS losses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255),
    amount DOUBLE,
    bet_amount DOUBLE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function formatSessionData(s) {
    if (!s) return {};
    return {
        ...s,
        bet_size_list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        multiple_list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        currency_prefix: "R$ ",
        currency_decimal: ",",
        currency_thousand: ".",
        bet_amount: s.bet_amount || 1,
        credit_line: s.credit_line || 1,
        num_line: s.num_line || 5,
        credit: s.real_balance + s.bonus_balance,
        balance: s.real_balance + s.bonus_balance
    };
}

// AUTH
app.post('/api/auth/register', (req, res) => {
    const { phone, password, fullName } = req.body;
    const token = require('crypto').randomUUID();
    db.query('INSERT INTO fortune_data (phone, email, password, fullName, token, bonus_balance, credit) VALUES (?, ?, ?, ?, ?, 25.0, 25.0)', 
        [phone, `u${Date.now()}@sortedeouro.app`, password, fullName, token], (err) => {
        if (err) return res.status(200).json({ success: false, message: 'Telefone já cadastrado.' });
        res.json({ success: true, token, user: { phone, fullName, balance: 25 } });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body;
    db.query('SELECT * FROM fortune_data WHERE phone = ? AND password = ?', [phone, password], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Login inválido.' });
        const user = results[0];
        res.json({ success: true, token: user.token, user: { phone: user.phone, fullName: user.fullName, balance: user.real_balance + user.bonus_balance } });
    });
});

app.get('/api/user/me', (req, res) => {
    const token = req.headers.authorization;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false });
        const user = results[0];
        res.json({ success: true, user: { fullName: user.fullName, real_balance: user.real_balance, bonus_balance: user.bonus_balance, balance: user.real_balance + user.bonus_balance } });
    });
});

// MOTOR DO JOGO
app.get('/api/data/:token/session', (req, res) => {
    const token = req.params.token;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err) return res.status(200).json({ success: false });
        if (!results || results.length === 0) {
            if (token && token.startsWith('guest_')) {
                const name = 'Guest_' + token.split('_')[1];
                db.query('INSERT INTO fortune_data (token, fullName, bonus_balance, credit) VALUES (?, ?, 50.0, 50.0)', [token, name], () => {
                    res.json({ success: true, message: 'OK', data: formatSessionData({ token, real_balance: 0, bonus_balance: 50.0 }) });
                });
                return;
            }
            return res.json({ success: false, message: 'Sessão não encontrada' });
        }
        res.json({ success: true, message: 'OK', Action: "Session", EventName: "Session", data: formatSessionData(results[0]) });
    });
});

app.post('/api/game/launch', (req, res) => {
    res.json({ success: true, url: `/FortuneTiger/index.html?token=${req.body.token}` });
});

app.get('/api/data/:token/icons', (req, res) => {
    const icons = [];
    for (let i = 0; i < 9; i++) icons.push({ icon_name: 'Symbol_' + Math.floor(Math.random() * 8 + 1), feature_symbol: null });
    res.json({ success: true, data: icons });
});

app.post('/api/data/:token/spin', (req, res) => {
    const token = req.params.token;
    let { cs, ml } = req.body;
    if (!cs) {
        const raw = JSON.stringify(req.body);
        const mCs = raw.match(/cs=([\d\.]+)/);
        const mMl = raw.match(/ml=(\d+)/);
        cs = mCs ? parseFloat(mCs[1]) : 1;
        ml = mMl ? parseInt(mMl[1]) : 1;
    }
    const bet = parseFloat(cs) * parseInt(ml) * 5;

    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'Sessão expirada' });
        const user = results[0];
        const balance = user.real_balance + user.bonus_balance;
        if (balance < bet) return res.json({ success: false, message: 'Saldo insuficiente' });

        const isWin = Math.random() < 0.25;
        let win = 0, syms = [];
        for(let i=0; i<9; i++) syms.push('Symbol_' + Math.floor(Math.random() * 8 + 1));
        if (isWin) {
            win = parseFloat((bet * (Math.random() * 5 + 1.2)).toFixed(2));
            const s = 'Symbol_' + Math.floor(Math.random() * 7 + 1);
            syms[3] = s; syms[4] = s; syms[5] = s;
        }

        db.query('UPDATE fortune_data SET real_balance = real_balance - ? + ? WHERE token = ?', [bet, win, token], () => {
            if (win > 0) db.query('INSERT INTO wins (token, amount, win_amount) VALUES (?, ?, ?)', [token, bet, win]);
            else db.query('INSERT INTO losses (token, amount, bet_amount) VALUES (?, ?, ?)', [token, bet, bet]);

            res.json({
                success: true, message: 'OK',
                Action: "Spin",
                EventName: "Spin",
                data: {
                    credit: balance - bet + win,
                    balance: balance - bet + win,
                    bet_amount: bet,
                    pull: {
                        WinAmount: win, WinOnDrop: win, TotalWay: win > 0 ? 5 : 0,
                        FreeSpin: 0, HasNewSpawn: false, HasPlaceHolder: false, LastMultiply: 0,
                        WildFixedIcons: [], HasJackpot: false, HasScatter: false, CountScatter: 0,
                        MultipyScatter: 0, MultiplyCount: 0, SlotIcons: syms,
                        ActiveIcons: win > 0 ? [3, 4, 5] : [],
                        ActiveLines: win > 0 ? [{ index: 1, active_icon: [3, 4, 5] }] : [],
                        WinLogs: [], DropLine: 0, DropLineData: [], MultipleList: [], FeatureResult: null,
                        HasFreeSpin: false,
                        HasRespin: false,
                        IsFeature: false,
                        NextStep: "Spin"
                    }
                }
            });
        });
    });
});

app.post('/api/data/:token/histories', (req, res) => {
    const t = req.params.token;
    const q = `SELECT id, win_amount as win, amount as bet, timestamp FROM wins WHERE token = ? UNION ALL SELECT id, 0 as win, amount as bet, timestamp FROM losses WHERE token = ? ORDER BY timestamp DESC LIMIT 20`;
    db.query(q, [t, t], (err, results) => {
        if (err) return res.json({ success: true, data: { items: [] } });
        const items = results.map(r => ({ id: r.id, spin_date: new Date(r.timestamp).toISOString().split('T')[0], spin_hour: new Date(r.timestamp).toTimeString().split(' ')[0], total_bet: r.bet, win_amount: r.win, profit: r.win - r.bet }));
        res.json({ success: true, data: { items, totalRecord: items.length } });
    });
});

// PAGAMENTO
app.post('/api/payment/deposit', async (req, res) => {
    const token = req.headers.authorization;
    const { amount } = req.body;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], async (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'Usuário não encontrado.' });
        const user = results[0];
        const txId = `FT_${Date.now()}`;
        try {
            const resp = await axios.post(`${config.sigilo_pay.api_url}/gateway/pix/receive`, {
                identifier: token, external_id: txId, amount: amount,
                client: { name: user.fullName || 'User', email: `cl_${Date.now()}@sortedeouro.app`, phone: user.phone || '11999999999', document: '48612850118' },
                callbackUrl: `https://${req.get('host')}/api/payment/webhook`
            }, { headers: { 'x-public-key': config.sigilo_pay.public_key, 'x-secret-key': config.sigilo_pay.secret_key } });

            if (resp.data && (resp.data.pix || resp.data.qrcode)) {
                const p = resp.data.pix || {};
                db.query('INSERT INTO deposits (transaction_id, user_token, amount, status) VALUES (?, ?, ?, ?)', [txId, token, amount, 'pending']);
                res.json({ success: true, qr_code: p.base64 ? `data:image/png;base64,${p.base64}` : (resp.data.qrcode || resp.data.pix_qr_code), copy_paste: p.code || resp.data.copy_paste || resp.data.pix_copy_paste, transactionId: txId });
            } else res.json({ success: false, message: 'Erro na SigiloPay' });
        } catch (e) { res.json({ success: false, message: 'Erro ao gerar PIX' }); }
    });
});

app.post('/api/payment/webhook', (req, res) => {
    const p = req.body;
    db.query('INSERT INTO webhook_logs (payload) VALUES (?)', [JSON.stringify(p)]);
    const tx = p.transaction || {};
    const status = tx.status;
    const userToken = tx.identifier || p.identifier;
    const amount = parseFloat(tx.amount || 0);

    if (p.event === 'TRANSACTION_PAID' || status === 'COMPLETED' || status === 'PAID') {
        db.query('SELECT * FROM deposits WHERE (transaction_id = ? OR transaction_id = ?) AND status = "pending"', [tx.external_id, tx.id], (err, results) => {
            if (!err && results.length > 0) {
                const d = results[0];
                db.query('UPDATE fortune_data SET real_balance = real_balance + ?, credit = credit + ? WHERE token = ?', [d.amount, d.amount, d.user_token], () => {
                    db.query('UPDATE deposits SET status = "paid" WHERE transaction_id = ? OR transaction_id = ?', [tx.external_id, tx.id]);
                });
            } else if (userToken && amount > 0) {
                db.query('UPDATE fortune_data SET real_balance = real_balance + ?, credit = credit + ? WHERE token = ?', [amount, amount, userToken]);
            }
        });
    }
    res.status(200).send('OK');
});

app.get('/api/payment/check-status/:id', (req, res) => {
    db.query('SELECT status FROM deposits WHERE transaction_id = ? OR transaction_id = ?', [req.params.id, req.params.id], (err, results) => {
        if (!err && results.length > 0) res.json({ success: true, status: results[0].status.toUpperCase() });
        else res.json({ success: false });
    });
});

const PORT = process.env.PORT || 3059;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
