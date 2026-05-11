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

// ROTA DE DADOS DO JOGO (ESSENCIAL PARA O OVERLAY)
app.get('/api/data/:token/session', (req, res) => {
    const token = req.params.token;
    db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) return res.status(200).json({ success: false });
        res.json({ success: true, data: results[0] });
    });
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
