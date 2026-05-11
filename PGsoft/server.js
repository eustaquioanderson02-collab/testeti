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

app.use('/FortuneTiger', express.static(path.join(__dirname, '../FortuneTiger')));
app.use(express.static(path.join(__dirname, 'public')));

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

function formatSessionData(s) {
    if (!s) return {};
    const totalReal = parseFloat(s.real_balance || 0) + parseFloat(s.bonus_balance || 0);
    return {
        ...s,
        // Apostas em Reais - valores que o motor exibe na HUD
        bet_size_list: [0.5, 1, 2, 3, 5, 10, 20, 50, 100, 200],
        multiple_list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        currency_prefix: "R$ ",
        currency_decimal: ",",
        currency_thousand: ".",
        bet_amount: 1,
        credit_line: 1,
        num_line: 5,
        // Saldo em Reais (decimal) - o motor exibe com currency_decimal
        credit: parseFloat(totalReal.toFixed(2)),
        balance: parseFloat(totalReal.toFixed(2)),
        real_balance: parseFloat((s.real_balance || 0).toFixed(2)),
        bonus_balance: parseFloat((s.bonus_balance || 0).toFixed(2))
    };
}

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
        res.json({ success: true, message: 'OK', data: formatSessionData(results[0]) });
    });
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
    // cs e ml em Reais, bet = cs * ml * 5 linhas
    const bet = parseFloat((parseFloat(cs) * parseInt(ml) * 5).toFixed(2));

    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'Sessão expirada' });
        const user = results[0];
        const totalReal = parseFloat((parseFloat(user.real_balance || 0) + parseFloat(user.bonus_balance || 0)).toFixed(2));
        if (totalReal < bet) return res.json({ success: false, message: 'Saldo insuficiente' });

        const isWin = Math.random() < 0.25;
        let win = 0;
        // SlotIcons DEVEM ser inteiros (índice do símbolo), não strings
        const syms = Array.from({length: 9}, () => Math.floor(Math.random() * 8) + 1);
        if (isWin) {
            win = parseFloat((bet * (Math.random() * 5 + 1.2)).toFixed(2));
            const winSym = Math.floor(Math.random() * 7) + 1;
            syms[3] = winSym; syms[4] = winSym; syms[5] = winSym;
        }

        const newBalance = parseFloat((totalReal - bet + win).toFixed(2));

        db.query('UPDATE fortune_data SET real_balance = real_balance - ? + ? WHERE token = ?', [bet, win, token], () => {
            if (win > 0) db.query('INSERT INTO wins (token, amount, win_amount) VALUES (?, ?, ?)', [token, bet, win]);
            else db.query('INSERT INTO losses (token, amount, bet_amount) VALUES (?, ?, ?)', [token, bet, bet]);

            res.json({
                success: true, message: 'OK',
                data: {
                    credit: newBalance,
                    balance: newBalance,
                    bet_amount: bet,
                    pull: {
                        WinAmount: win,
                        WinOnDrop: win,
                        TotalWay: win > 0 ? 5 : 0,
                        FreeSpin: 0,
                        HasNewSpawn: false,
                        HasPlaceHolder: false,
                        LastMultiply: 0,
                        WildFixedIcons: [],
                        HasJackpot: false,
                        HasScatter: false,
                        CountScatter: 0,
                        MultipyScatter: 0,
                        MultiplyCount: 0,
                        SlotIcons: syms,
                        ActiveIcons: win > 0 ? [3, 4, 5] : [],
                        ActiveLines: win > 0 ? [{ index: 1, active_icon: [3, 4, 5] }] : [],
                        WinLogs: [],
                        DropLine: 0,
                        DropLineData: [],
                        MultipleList: [],
                        FeatureResult: null,
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
    const userToken = tx.identifier || p.identifier;
    const amount = parseFloat(tx.amount || 0);
    if (p.event === 'TRANSACTION_PAID' || tx.status === 'PAID' || tx.status === 'COMPLETED') {
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

app.post('/api/data/:token/histories', (req, res) => {
    const t = req.params.token;
    const q = `SELECT id, win_amount as win, amount as bet, timestamp FROM wins WHERE token = ? UNION ALL SELECT id, 0 as win, amount as bet, timestamp FROM losses WHERE token = ? ORDER BY timestamp DESC LIMIT 20`;
    db.query(q, [t, t], (err, results) => {
        if (err) return res.json({ success: true, data: { items: [] } });
        const items = results.map(r => ({ id: r.id, spin_date: new Date(r.timestamp).toISOString().split('T')[0], spin_hour: new Date(r.timestamp).toTimeString().split(' ')[0], total_bet: r.bet, win_amount: r.win, profit: r.win - r.bet }));
        res.json({ success: true, data: { items, totalRecord: items.length } });
    });
});

const PORT = process.env.PORT || 3059;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
