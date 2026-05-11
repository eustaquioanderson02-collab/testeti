const express = require('express');
const app = express();
const port = 3059;
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

console.log('Servidor conectado ao MySQL Aiven.');

// Inicialização e Correção de Tabelas (Garante que as colunas existam)
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
`, () => {
    // Garante as colunas mesmo que a tabela já exista
    db.query("ALTER TABLE fortune_data ADD COLUMN credit DOUBLE DEFAULT 0", () => {});
    db.query("ALTER TABLE fortune_data ADD COLUMN real_balance DOUBLE DEFAULT 0", () => {});
    db.query("ALTER TABLE fortune_data ADD COLUMN bonus_balance DOUBLE DEFAULT 0", () => {});
    db.query("ALTER TABLE fortune_data ADD COLUMN phone VARCHAR(20)", () => {});
    
    db.query(`
      CREATE TABLE IF NOT EXISTS deposits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(255) UNIQUE,
        user_token VARCHAR(255),
        amount DOUBLE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, () => {
        db.query("ALTER TABLE deposits ADD COLUMN user_token VARCHAR(255)", () => {});
        db.query("ALTER TABLE deposits ADD COLUMN transaction_id VARCHAR(255)", () => {});
    });

    db.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payload TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, () => {});

    db.query(`
      CREATE TABLE IF NOT EXISTS wins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255),
        amount DOUBLE,
        win_amount DOUBLE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, () => {});

    db.query(`
      CREATE TABLE IF NOT EXISTS losses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255),
        amount DOUBLE,
        bet_amount DOUBLE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, () => {});
});

// GERADORES DE DADOS PARA PAGAMENTO
function generateRandomCPF() {
    const n = () => Math.floor(Math.random() * 9);
    const n1=n(), n2=n(), n3=n(), n4=n(), n5=n(), n6=n(), n7=n(), n8=n(), n9=n();
    let d1 = n9*2+n8*3+n7*4+n6*5+n5*6+n4*7+n3*8+n2*9+n1*10;
    d1 = 11 - (d1 % 11); if (d1 >= 10) d1 = 0;
    let d2 = d1*2+n9*3+n8*4+n7*5+n6*6+n5*7+n4*8+n3*9+n2*10+n1*11;
    d2 = 11 - (d2 % 11); if (d2 >= 10) d2 = 0;
    return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

function generateRandomName() {
    const first = ["Anderson", "Bruno", "Carlos", "Daniel", "Eduardo", "Fabio", "Gabriel", "Henrique", "Igor", "Joao", "Lucas", "Mateus", "Natan", "Otavio", "Paulo", "Ricardo", "Samuel", "Tiago", "Vitor", "Yago"];
    const last = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"];
    return first[Math.floor(Math.random()*first.length)] + " " + last[Math.floor(Math.random()*last.length)];
}

// AUTH
app.post('/api/auth/register', (req, res) => {
    const { phone, password, fullName } = req.body;
    const token = require('crypto').randomUUID();
    const fakeEmail = `u${Date.now()}@sortedeouro.app`;
    db.query('INSERT INTO fortune_data (phone, email, password, fullName, token, bonus_balance, credit) VALUES (?, ?, ?, ?, ?, 25.0, 25.0)', 
        [phone, fakeEmail, password, fullName, token], (err) => {
        if (err) return res.status(200).json({ success: false, message: 'Telefone já cadastrado.' });
        res.json({ success: true, token, user: { phone, fullName, balance: 25 } });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body;
    db.query('SELECT * FROM fortune_data WHERE phone = ? AND password = ?', [phone, password], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Login inválido.' });
        const user = results[0];
        res.json({ success: true, token: user.token, user: { phone: user.phone, fullName: user.fullName, balance: user.credit } });
    });
});

app.get('/api/user/me', (req, res) => {
    const token = req.headers.authorization;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false });
        const user = results[0];
        res.json({ success: true, user: { fullName: user.fullName, real_balance: user.real_balance, bonus_balance: user.bonus_balance, balance: user.credit } });
    });
});

function formatSessionData(sessionData) {
    if (!sessionData) return {};
    sessionData.bet_size_list = [0.1, 0.2, 0.5, 0.8, 1, 2, 5, 10, 20, 50];
    sessionData.multiple_list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    sessionData.currency_prefix = "R$ ";
    sessionData.currency_decimal = ",";
    sessionData.currency_thousand = ".";
    sessionData.bet_amount = sessionData.bet_amount || 1.00;
    sessionData.credit_line = sessionData.credit_line || 1;
    sessionData.num_line = sessionData.num_line || 5;
    return sessionData;
}

app.get('/api/data/:token/session', (req, res) => {
    const token = req.params.token;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err) return res.status(200).json({ success: false });
        
        if (!results || results.length === 0) {
            if (token && token.startsWith('guest_')) {
                const guestName = 'Convidado_' + token.split('_')[1];
                db.query('INSERT INTO fortune_data (token, fullName, user_name, real_balance, bonus_balance, credit) VALUES (?, ?, ?, ?, ?, ?)', 
                    [token, guestName, guestName, 0, 50.0, 50.0], () => {
                    res.json({ success: true, data: formatSessionData({ token, credit: 50.0, real_balance: 0, bonus_balance: 50.0, fullName: guestName }) });
                });
                return;
            }
            return res.status(200).json({ success: false, message: 'Sessão não encontrada' });
        }
        
        const data = formatSessionData(results[0]);
        console.log(`[DEBUG] Token: ${token} | Saldo: R$ ${data.real_balance + data.bonus_balance}`);
        res.json({ success: true, data });
    });
});

app.post('/api/game/launch', (req, res) => {
    const { token } = req.body;
    res.json({ success: true, url: `/FortuneTiger/index.html?token=${token}` });
});

app.get('/api/data/:token/icons', (req, res) => {
    const defaultIcons = [];
    for (let i = 0; i < 9; i++) defaultIcons.push({ icon_name: 'Symbol_' + Math.floor(Math.random() * 8 + 1), feature_symbol: null });
    res.json({ success: true, data: defaultIcons });
});

app.post('/api/data/:token/spin', (req, res) => {
    const token = req.params.token;
    let { cs, ml } = req.body;
    if (!cs) {
        const raw = JSON.stringify(req.body);
        const matchCs = raw.match(/cs=([\d\.]+)/);
        const matchMl = raw.match(/ml=(\d+)/);
        cs = matchCs ? parseFloat(matchCs[1]) : 0.1;
        ml = matchMl ? parseInt(matchMl[1]) : 1;
    }
    const betAmount = parseFloat(cs) * parseInt(ml) * 5;

    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'Sessão expirada' });
        const user = results[0];
        const totalBalance = user.real_balance + user.bonus_balance;

        if (totalBalance < betAmount) return res.json({ success: false, message: 'Saldo insuficiente', data: { credit: totalBalance } });

        const isWin = Math.random() < 0.25;
        let winAmount = 0;
        let syms = [];
        for(let i=0; i<9; i++) syms.push('Symbol_' + Math.floor(Math.random() * 8 + 1));

        if (isWin) {
            const mult = (Math.random() * 5 + 1.2).toFixed(2);
            winAmount = parseFloat((betAmount * mult).toFixed(2));
            const winSym = 'Symbol_' + Math.floor(Math.random() * 7 + 1);
            syms[3] = winSym; syms[4] = winSym; syms[5] = winSym;
        }

        const newBalance = totalBalance - betAmount + winAmount;
        db.query('UPDATE fortune_data SET real_balance = real_balance - ? + ? WHERE token = ?', [betAmount, winAmount, token], () => {
            // REGISTRA NO HISTÓRICO
            if (winAmount > 0) {
                db.query('INSERT INTO wins (token, amount, win_amount) VALUES (?, ?, ?)', [token, betAmount, winAmount]);
            } else {
                db.query('INSERT INTO losses (token, amount, bet_amount) VALUES (?, ?, ?)', [token, betAmount, betAmount]);
            }
            
            res.json({
                success: true,
                data: {
                    credit: newBalance,
                    balance: newBalance,
                    bet_amount: betAmount,
                    pull: {
                        WinAmount: winAmount,
                        WinOnDrop: winAmount,
                        TotalWay: winAmount > 0 ? 5 : 0,
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
                        ActiveIcons: winAmount > 0 ? [3, 4, 5] : [],
                        ActiveLines: winAmount > 0 ? [{ index: 1, active_icon: [3, 4, 5] }] : [],
                        WinLogs: [],
                        DropLine: 0,
                        DropLineData: [],
                        MultipleList: [],
                        FeatureResult: null
                    }
                }
            });
        });
    });
});

app.post('/api/data/:token/histories', (req, res) => {
    const token = req.params.token;
    const query = `
        SELECT id, token, win_amount as win, amount as bet, timestamp, 'win' as type FROM wins WHERE token = ?
        UNION ALL
        SELECT id, token, 0 as win, amount as bet, timestamp, 'loss' as type FROM losses WHERE token = ?
        ORDER BY timestamp DESC LIMIT 20
    `;
    db.query(query, [token, token], (err, results) => {
        if (err) return res.json({ success: true, data: { items: [] } });
        const items = results.map(r => ({
            id: r.id,
            spin_date: new Date(r.timestamp).toISOString().split('T')[0],
            spin_hour: new Date(r.timestamp).toTimeString().split(' ')[0],
            total_bet: r.bet,
            win_amount: r.win,
            profit: r.win - r.bet
        }));
        res.json({ success: true, data: { items, totalRecord: items.length } });
    });
});

app.get('/api/data/history/:id', (req, res) => {
    res.json({ success: true, data: { result_data: [] } }); // Placeholder para não quebrar o motor
});

// MOTOR DO JOGO
app.post('/api/game/launch', (req, res) => {
    const { token } = req.body;
    res.json({ success: true, url: `/FortuneTiger/index.html?token=${token}` });
});

app.get('/api/data/:token/icons', (req, res) => {
    const defaultIcons = [];
    for (let i = 0; i < 9; i++) defaultIcons.push({ icon_name: 'Symbol_' + Math.floor(Math.random() * 8 + 1), feature_symbol: null });
    res.json({ success: true, data: defaultIcons });
});

// PAGAMENTO VIP GOLD (AIVEN)
app.post('/api/payment/deposit', async (req, res) => {
    const token = req.headers.authorization;
    const { amount } = req.body;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], async (err, results) => {
        if (err || results.length === 0) return res.status(200).json({ success: false, message: 'Usuário não encontrado.' });
        const user = results[0];
        const transactionId = `FT_${Date.now()}`;
        const randomCPF = generateRandomCPF();
        const randomName = generateRandomName();
        try {
            const baseUrl = config.sigilo_pay.api_url;
            const fullUrl = `${baseUrl}/gateway/pix/receive`;
            
            const response = await axios.post(fullUrl, {
                identifier: token,
                external_id: transactionId,
                amount: amount,
                client: {
                    name: randomName, 
                    email: `cl_${Date.now()}@sortedeouro.app`,
                    phone: user.phone || '11999999999',
                    document: randomCPF
                },
                callbackUrl: `https://${req.get('host')}/api/payment/webhook`
            }, {
                headers: { 
                    'x-public-key': config.sigilo_pay.public_key,
                    'x-secret-key': config.sigilo_pay.secret_key
                }
            });

            if (response.data && (response.data.pix || response.data.qrcode)) {
                const pixData = response.data.pix || {};
                const qrCode = pixData.base64 ? `data:image/png;base64,${pixData.base64}` : (response.data.qrcode || response.data.pix_qr_code);
                const copyPaste = pixData.code || response.data.copy_paste || response.data.pix_copy_paste;
                
                db.query('INSERT INTO deposits (transaction_id, user_token, amount, status) VALUES (?, ?, ?, ?)', [transactionId, token, amount, 'pending']);
                res.json({ success: true, qr_code: qrCode, copy_paste: copyPaste, transactionId });
            } else {
                res.status(200).json({ success: false, message: response.data.message || 'Erro na SigiloPay' });
            }
        } catch (e) { 
            console.error('Erro SigiloPay:', e.response ? e.response.data : e.message);
            res.status(200).json({ success: false, message: 'Erro ao gerar PIX' }); 
        }
    });
});

  app.post('/api/payment/webhook', (req, res) => {
    const payload = req.body;
    db.query('INSERT INTO webhook_logs (payload) VALUES (?)', [JSON.stringify(payload)]);

    const transaction = payload.transaction || {};
    const sigiloId = transaction.id;
    const externalId = transaction.external_id;
    const status = transaction.status;
    const userToken = transaction.identifier || payload.identifier;
    const amount = parseFloat(transaction.amount || 0);

    if (payload.event === 'TRANSACTION_PAID' || status === 'COMPLETED' || status === 'PAID') {
        // 1. Verifica se já foi pago (Trava de Crédito Duplo)
        db.query('SELECT status FROM deposits WHERE (transaction_id = ? OR transaction_id = ?) AND status = "paid"', [externalId, sigiloId], (err, check) => {
            if (!err && check.length > 0) {
                console.log(`⚠️ Webhook ignorado: Transação ${externalId || sigiloId} já creditada.`);
                return res.status(200).send('Already processed');
            }

            // 2. Procura o depósito pendente
            db.query('SELECT * FROM deposits WHERE (transaction_id = ? OR transaction_id = ?) AND status = "pending"', [externalId, sigiloId], (err, results) => {
                if (!err && results.length > 0) {
                    const deposit = results[0];
                    const finalAmount = parseFloat(deposit.amount);
                    
                    db.query('UPDATE fortune_data SET real_balance = real_balance + ?, credit = credit + ? WHERE token = ?', 
                        [finalAmount, finalAmount, deposit.user_token], (upErr) => {
                        if (!upErr) {
                            db.query('UPDATE deposits SET status = "paid" WHERE transaction_id = ? OR transaction_id = ?', [externalId, sigiloId]);
                            console.log(`✅ Saldo creditado: R$ ${finalAmount}`);
                        }
                    });
                } else if (userToken && amount > 0) {
                    // Backup: Credita pelo identifier se não achar o depósito, mas marca como processado
                    db.query('UPDATE fortune_data SET real_balance = real_balance + ?, credit = credit + ? WHERE token = ?', 
                        [amount, amount, userToken], () => {
                        db.query('INSERT INTO deposits (transaction_id, token, amount, status) VALUES (?, ?, ?, "paid")', [sigiloId, userToken, amount]);
                        console.log(`✅ Saldo creditado via identifier: R$ ${amount}`);
                    });
                }
            });
        });
    }
    res.status(200).send('OK');
});

app.get('/api/payment/check-status/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT status FROM deposits WHERE transaction_id = ? OR transaction_id = ?', [id, id], (err, results) => {
        if (!err && results.length > 0) {
            res.json({ success: true, status: results[0].status.toUpperCase() });
        } else {
            res.json({ success: false });
        }
    });
});


app.get('/api/payment/pending-deposits', (req, res) => {
    const token = req.headers.authorization;
    db.query('SELECT * FROM deposits WHERE token = ? AND status = "pending" ORDER BY created_at DESC LIMIT 5', [token], (err, results) => {
        if (err) return res.status(200).json({ success: false });
        res.json({ success: true, deposits: results });
    });
});

const PORT = process.env.PORT || 3059;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
