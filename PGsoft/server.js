const express = require('express');
const app = express();
const mysql = require('mysql2');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const config = require('./config.json');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Headers que isolam a página de extensões do browser (impede lockdown-install.js de extensões)
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

app.use('/FortuneTiger', express.static(path.join(__dirname, '../FortuneTiger')));
app.use(express.static(path.join(__dirname, 'public')));

// ─── BANCO DE DADOS AIVEN ───────────────────────────────────────────────────
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

// Garante que todas as tabelas existam ao iniciar
db.query(`
    CREATE TABLE IF NOT EXISTS fortune_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20),
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
`, (err) => {
    if (err) console.error('Erro ao criar tabelas:', err.message);
    else console.log('Tabelas verificadas com sucesso.');
});

// ─── HELPERS ────────────────────────────────────────────────────────────────
function formatSessionData(s) {
    if (!s) return {};
    const totalReal = parseFloat((parseFloat(s.real_balance || 0) + parseFloat(s.bonus_balance || 0)).toFixed(2));
    return {
        user_name: s.fullName || s.token || 'Guest',
        credit: totalReal,
        num_line: 5,
        line_num: 5,
        bet_amount: 0.2,
        free_num: 0,
        free_total: -1,
        free_amount: 0,
        free_multi: 0,
        freespin_mode: 0,
        multiple_list: [],
        credit_line: 1,
        buy_feature: 0,
        buy_max: 0,
        feature: {},
        total_way: 5,
        multipy: 0,
        currency_prefix: "R$ ",
        currency_suffix: "",
        currency_thousand: ".",
        currency_decimal: ",",
        bet_size_list: ["0.2", "2", "20", "100"],
        previous_session: false,
        game_state: "",
        feature_symbol: "",
        feature_result: {
            left_feature: 9,
            select_count: 0,
            right_feature: 9,
            select_finish: false,
            access_feature: false
        },
        icon_data: [
            "Symbol_2","Symbol_0","Symbol_2",
            "Symbol_0","Symbol_0","Symbol_0",
            "Symbol_0","Symbol_0","Symbol_0"
        ],
        active_lines: [],
        drop_line: [],
        real_balance: parseFloat((s.real_balance || 0).toFixed(2)),
        bonus_balance: parseFloat((s.bonus_balance || 0).toFixed(2))
    };
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
    const { phone, password, fullName } = req.body;
    if (!phone || !password || !fullName)
        return res.json({ success: false, message: 'Campos obrigatórios ausentes.' });
    const token = crypto.randomUUID();
    db.query(
        'INSERT INTO fortune_data (phone, email, password, fullName, token, bonus_balance, credit) VALUES (?, ?, ?, ?, ?, 25.0, 25.0)',
        [phone, `u${Date.now()}@sortedeouro.app`, password, fullName, token],
        (err) => {
            if (err) return res.json({ success: false, message: 'Telefone já cadastrado.' });
            res.json({ success: true, token, user: { phone, fullName, balance: 25 } });
        }
    );
});

app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password)
        return res.json({ success: false, message: 'Campos obrigatórios ausentes.' });
    db.query('SELECT * FROM fortune_data WHERE phone = ? AND password = ?', [phone, password], (err, results) => {
        if (err || results.length === 0)
            return res.status(401).json({ success: false, message: 'Login inválido.' });
        const u = results[0];
        res.json({ success: true, token: u.token, user: { phone: u.phone, fullName: u.fullName, balance: u.real_balance + u.bonus_balance } });
    });
});

app.get('/api/user/me', (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ success: false });
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false });
        const u = results[0];
        res.json({ success: true, user: { fullName: u.fullName, real_balance: u.real_balance, bonus_balance: u.bonus_balance, balance: u.real_balance + u.bonus_balance } });
    });
});

// ─── MOTOR DO JOGO ───────────────────────────────────────────────────────────
app.post('/api/game/launch', (req, res) => {
    const { token } = req.body;
    if (!token) return res.json({ success: false, message: 'Token ausente' });
    res.json({ success: true, url: `/FortuneTiger/index.html?token=${token}` });
});

app.get('/api/data/:token/session', (req, res) => {
    const token = req.params.token;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err) return res.json({ success: false, message: 'DB Error' });
        if (!results || results.length === 0) {
            if (token && token.startsWith('guest_')) {
                const name = 'Guest_' + token.split('_')[1];
                db.query(
                    'INSERT INTO fortune_data (token, fullName, bonus_balance, credit) VALUES (?, ?, 50.0, 50.0)',
                    [token, name],
                    () => {
                        res.json({ success: true, message: 'OK', data: formatSessionData({ token, real_balance: 0, bonus_balance: 50.0 }) });
                    }
                );
                return;
            }
            return res.json({ success: false, message: 'Sessão não encontrada' });
        }
        res.json({ success: true, message: 'OK', data: formatSessionData(results[0]) });
    });
});

app.get('/api/data/:token/icons', (req, res) => {
    const icons = [
        { icon_name: 'Symbol_0', win_1:0, win_2:0, win_3:300, win_4:0, win_5:0, win_6:0, wild_card:null, free_spin:null, free_num:0, scaler_spin:null },
        { icon_name: 'Symbol_1', win_1:0, win_2:0, win_3:50,  win_4:0, win_5:0, win_6:0, wild_card:null, free_spin:null, free_num:0, scaler_spin:null },
        { icon_name: 'Symbol_2', win_1:0, win_2:0, win_3:30,  win_4:0, win_5:0, win_6:0, wild_card:null, free_spin:null, free_num:0, scaler_spin:null },
        { icon_name: 'Symbol_3', win_1:0, win_2:0, win_3:15,  win_4:0, win_5:0, win_6:0, wild_card:null, free_spin:null, free_num:0, scaler_spin:null },
        { icon_name: 'Symbol_4', win_1:0, win_2:0, win_3:10,  win_4:0, win_5:0, win_6:0, wild_card:null, free_spin:null, free_num:0, scaler_spin:null },
        { icon_name: 'Symbol_5', win_1:0, win_2:0, win_3:5,   win_4:0, win_5:0, win_6:0, wild_card:null, free_spin:null, free_num:0, scaler_spin:null },
        { icon_name: 'Symbol_6', win_1:0, win_2:0, win_3:4,   win_4:0, win_5:0, win_6:0, wild_card:null, free_spin:null, free_num:0, scaler_spin:null }
    ];
    res.json({ success: true, data: icons, message: 'List icons success' });
});

app.post('/api/data/:token/spin', (req, res) => {
    const token = req.params.token;
    let cs = parseFloat(req.body.cs) || 1;
    let ml = parseInt(req.body.ml) || 1;

    // Fallback para body urlencoded/string
    if (!req.body.cs && typeof req.body === 'string') {
        const mCs = req.body.match(/cs=([\d\.]+)/);
        const mMl = req.body.match(/ml=(\d+)/);
        cs = mCs ? parseFloat(mCs[1]) : 1;
        ml = mMl ? parseInt(mMl[1]) : 1;
    }

    const bet = parseFloat((cs * ml * 5).toFixed(2));
    if (!bet || bet <= 0) return res.json({ success: false, message: 'Aposta inválida' });

    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'Sessão expirada' });
        const user = results[0];
        const totalReal = parseFloat((parseFloat(user.real_balance || 0) + parseFloat(user.bonus_balance || 0)).toFixed(2));
        if (totalReal < bet) return res.json({ success: false, message: 'Saldo insuficiente' });

        const isWin = Math.random() < 0.25;
        let win = 0;
        // SlotIcons DEVE ter 12 elementos como no api1 original
        // Índices 0-8: símbolos visíveis, índice 9: _blank, índice 10: símbolo extra, índice 11: _blank
        const symNames = ['Symbol_0','Symbol_1','Symbol_2','Symbol_3','Symbol_4','Symbol_5','Symbol_6'];
        const rSym = () => symNames[Math.floor(Math.random() * symNames.length)];
        const syms = [
            rSym(), rSym(), rSym(),  // linha 1 (índices 0,1,2)
            rSym(), rSym(), rSym(),  // linha 2 (índices 3,4,5)
            rSym(), rSym(), rSym(),  // linha 3 (índices 6,7,8)
            '_blank', rSym(), '_blank' // posições extras para animação (índices 9,10,11)
        ];
        let activeIcons = [];
        let activeLines = [];
        let winLogs = [`[BET] betLevel: ${cs}, betSize:${ml}, baseBet:${bet} => 0`];

        if (isWin) {
            win = parseFloat((bet * (Math.random() * 5 + 1.2)).toFixed(2));
            const winSym = symNames[Math.floor(Math.random() * 5) + 1];
            // Linha do meio ganha (índices 3,4,5)
            syms[3] = winSym; syms[4] = winSym; syms[5] = winSym;
            activeIcons = [3, 4, 5];
            activeLines = [{ name: winSym, index: 1, payout: win, combine: 3, way_243: 1, multiply: 0, win_amount: win, active_icon: [3, 4, 5] }];
            winLogs = [`[BET] betLevel: ${cs}, betSize:${ml}, baseBet:${bet} => ${win}`];
        }

        const newBalance = parseFloat((totalReal - bet + win).toFixed(2));

        // Desconta do bonus primeiro, depois do real
        const bonusBal = parseFloat(user.bonus_balance || 0);
        const realBal  = parseFloat(user.real_balance  || 0);
        let deductBonus = Math.min(bonusBal, bet);
        let deductReal  = parseFloat((bet - deductBonus).toFixed(2));
        const addReal   = win > 0 ? win : 0;

        db.query(
            'UPDATE fortune_data SET bonus_balance = bonus_balance - ?, real_balance = real_balance - ? + ? WHERE token = ?',
            [deductBonus, deductReal, addReal, token],
            () => {
                if (win > 0) db.query('INSERT INTO wins (token, amount, win_amount) VALUES (?, ?, ?)', [token, bet, win]);
                else db.query('INSERT INTO losses (token, amount, bet_amount) VALUES (?, ?, ?)', [token, bet, bet]);

                res.json({
                    success: true,
                    message: 'Spin success',
                    data: {
                        credit: newBalance,
                        freemode: false,
                        jackpot: 0,
                        free_spin: 0,
                        free_num: 0,
                        scaler: 0,
                        num_line: 5,
                        bet_amount: bet,
                        feature_symbol: '',
                        pull: {
                            WinAmount: win,
                            WinOnDrop: win,
                            TotalWay: win > 0 ? 5 : 0,
                            FreeSpin: -1,
                            HasNewSpawn: false,
                            HasPlaceHolder: false,
                            LastMultiply: 0,
                            WildFixedIcons: [],
                            HasJackpot: false,
                            HasScatter: false,
                            CountScatter: 0,
                            WildColumIcon: '',
                            MultipyScatter: 0,
                            MultiplyCount: 1,
                            SlotIcons: syms,
                            ActiveIcons: activeIcons,
                            ActiveLines: activeLines,
                            WinLogs: winLogs,
                            DropLine: 0,
                            DropLineData: [],
                            MultipleList: [],
                            FeatureResult: {
                                left_feature: 9,
                                select_count: 0,
                                right_feature: 9,
                                select_finish: false,
                                access_feature: false
                            }
                        }
                    }
                });
            }
        );

    });
});

app.post('/api/data/:token/histories', (req, res) => {
    const t = req.params.token;
    const q = `
        SELECT id, win_amount as win, amount as bet, timestamp FROM wins WHERE token = ?
        UNION ALL
        SELECT id, 0 as win, amount as bet, timestamp FROM losses WHERE token = ?
        ORDER BY timestamp DESC LIMIT 20
    `;
    db.query(q, [t, t], (err, results) => {
        if (err) return res.json({ success: true, data: { items: [], totalRecord: 0 } });
        const items = results.map(r => ({
            id: r.id,
            spin_date: new Date(r.timestamp).toISOString().split('T')[0],
            spin_hour: new Date(r.timestamp).toTimeString().split(' ')[0],
            total_bet: r.bet,
            win_amount: r.win,
            profit: parseFloat((r.win - r.bet).toFixed(2))
        }));
        res.json({ success: true, data: { items, totalRecord: items.length } });
    });
});

app.get('/api/data/history/:id', (req, res) => {
    // Placeholder necessário para o motor não quebrar ao abrir detalhe de histórico
    res.json({ success: true, data: { result_data: [] } });
});

// ─── PAGAMENTO ───────────────────────────────────────────────────────────────
app.post('/api/payment/deposit', async (req, res) => {
    const token = req.headers.authorization;
    const { amount } = req.body;
    if (!token || !amount) return res.json({ success: false, message: 'Parâmetros ausentes.' });
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], async (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'Usuário não encontrado.' });
        const user = results[0];
        const txId = `FT_${Date.now()}`;
        try {
            const resp = await axios.post(
                `${config.sigilo_pay.api_url}/gateway/pix/receive`,
                {
                    identifier: token, external_id: txId, amount: amount,
                    client: { name: user.fullName || 'User', email: `cl_${Date.now()}@sortedeouro.app`, phone: user.phone || '11999999999', document: '48612850118' },
                    callbackUrl: `https://${req.get('host')}/api/payment/webhook`
                },
                { headers: { 'x-public-key': config.sigilo_pay.public_key, 'x-secret-key': config.sigilo_pay.secret_key } }
            );
            if (resp.data && (resp.data.pix || resp.data.qrcode)) {
                const p = resp.data.pix || {};
                db.query('INSERT INTO deposits (transaction_id, user_token, amount, status) VALUES (?, ?, ?, ?)', [txId, token, amount, 'pending']);
                res.json({
                    success: true,
                    qr_code: p.base64 ? `data:image/png;base64,${p.base64}` : (resp.data.qrcode || resp.data.pix_qr_code),
                    copy_paste: p.code || resp.data.copy_paste || resp.data.pix_copy_paste,
                    transactionId: txId
                });
            } else {
                res.json({ success: false, message: resp.data?.message || 'Erro na SigiloPay' });
            }
        } catch (e) {
            console.error('Erro SigiloPay:', e.response?.data || e.message);
            res.json({ success: false, message: 'Erro ao gerar PIX' });
        }
    });
});

app.post('/api/payment/webhook', (req, res) => {
    const p = req.body;
    db.query('INSERT INTO webhook_logs (payload) VALUES (?)', [JSON.stringify(p)]);
    const tx = p.transaction || {};
    const userToken = tx.identifier || p.identifier;
    const amount = parseFloat(tx.amount || 0);

    if (p.event === 'TRANSACTION_PAID' || tx.status === 'PAID' || tx.status === 'COMPLETED') {
        db.query(
            'SELECT * FROM deposits WHERE (transaction_id = ? OR transaction_id = ?) AND status = "pending"',
            [tx.external_id, tx.id],
            (err, results) => {
                if (!err && results.length > 0) {
                    const d = results[0];
                    db.query(
                        'UPDATE fortune_data SET real_balance = real_balance + ?, credit = credit + ? WHERE token = ?',
                        [d.amount, d.amount, d.user_token],
                        () => db.query('UPDATE deposits SET status = "paid" WHERE transaction_id = ? OR transaction_id = ?', [tx.external_id, tx.id])
                    );
                } else if (userToken && amount > 0) {
                    db.query('UPDATE fortune_data SET real_balance = real_balance + ?, credit = credit + ? WHERE token = ?', [amount, amount, userToken]);
                }
            }
        );
    }
    res.status(200).send('OK');
});

app.get('/api/payment/check-status/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT status FROM deposits WHERE transaction_id = ? OR transaction_id = ?', [id, id], (err, results) => {
        if (!err && results.length > 0)
            res.json({ success: true, status: results[0].status.toUpperCase() });
        else
            res.json({ success: false, status: 'PENDING' });
    });
});

app.post('/api/payment/withdraw', (req, res) => {
    const token = req.headers.authorization;
    const { amount, pixKey } = req.body;
    if (!token || !amount || !pixKey)
        return res.json({ success: false, message: 'Parâmetros ausentes.' });
    db.query('SELECT real_balance FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'Usuário não encontrado.' });
        const realBal = parseFloat(results[0].real_balance || 0);
        if (amount < 10) return res.json({ success: false, message: 'Saque mínimo R$ 10,00' });
        if (amount > realBal) return res.json({ success: false, message: 'Saldo real insuficiente.' });
        // Deduz saldo e registra (integração futura com gateway de saque)
        db.query('UPDATE fortune_data SET real_balance = real_balance - ? WHERE token = ?', [amount, token], () => {
            res.json({ success: true, message: 'Saque solicitado com sucesso!' });
        });
    });
});

app.get('/api/payment/pending-deposits', (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.json({ success: false, deposits: [] });
    db.query('SELECT * FROM deposits WHERE user_token = ? AND status = "pending" ORDER BY created_at DESC LIMIT 5', [token], (err, results) => {
        if (err) return res.json({ success: false, deposits: [] });
        res.json({ success: true, deposits: results });
    });
});

// ─── SERVIDOR ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3059;
app.listen(PORT, () => console.log(`✅ Servidor Fortune Tiger rodando na porta ${PORT}`));
