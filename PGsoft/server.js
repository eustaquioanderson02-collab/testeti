const express = require('express');
const app = express();
const port = 3059;
const mysql = require('mysql2');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const config = require('./config.json');
const fs = require('fs');
const path = require('path');

app.use(cors());

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser.text({ limit: '10mb' })); // Removido o */* para não capturar tudo agressivamente

// Servir o Jogo e a Dashboard Standalone
app.use('/FortuneTiger', express.static(path.join(__dirname, '../FortuneTiger')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});


let db;
const useMysql = config.useMysql === true;

if (useMysql) {
  db = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: process.env.DB_PASSWORD || config.mysql.password,
    database: config.mysql.database,
    ssl: config.mysql.ssl ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  console.log('Pool de conexões MySQL Aiven inicializado.');

    const initQueries = `
      CREATE TABLE IF NOT EXISTS fortune_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_name VARCHAR(255) DEFAULT 'Guest',
        fullName VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        cpf VARCHAR(20),
        phone VARCHAR(20),
        credit DOUBLE DEFAULT 0,
        real_balance DOUBLE DEFAULT 0,
        bonus_balance DOUBLE DEFAULT 0,
        is_first_deposit INT DEFAULT 0,
        num_line INT DEFAULT 5,
        line_num INT DEFAULT 5,
        bet_amount INT DEFAULT 2,
        free_num INT DEFAULT 0,
        free_total INT DEFAULT -1,
        free_amount INT DEFAULT 18000,
        free_multi INT DEFAULT 0,
        freespin_mode INT DEFAULT 0,
        multiple_list TEXT DEFAULT NULL,
        credit_line INT DEFAULT 10,
        buy_feature INT DEFAULT 50,
        buy_max INT DEFAULT 1300,
        feature TEXT DEFAULT NULL,
        total_way INT DEFAULT 27,
        multipy INT DEFAULT 0,
        token VARCHAR(255) UNIQUE,
        freemode INT DEFAULT 0,
        jackpot INT DEFAULT 0,
        free_spin INT DEFAULT 0,
        losses INT DEFAULT 0,
        scaler INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS icon_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        icon_name VARCHAR(255) NOT NULL,
        token VARCHAR(255),
        feature_symbol VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS losses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        amount INT NOT NULL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        bet_amount INT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        amount INT NOT NULL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        win_amount INT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deposits (
        id VARCHAR(255) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        amount DOUBLE NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        qr_code TEXT,
        copy_paste TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        webhook_token VARCHAR(255)
      );
    `;

    db.query(initQueries, (err) => {
      if (err) console.error("Erro ao criar tabelas MySQL:", err);
      else {
        // Garante que a coluna webhook_token exista (tratamento silencioso para MySQL 8)
        db.query("ALTER TABLE deposits ADD COLUMN webhook_token VARCHAR(255)", (err) => {
            // Ignora erro de coluna duplicada
        });

        db.query("SELECT count(*) as count FROM fortune_data", (err, results) => {
          if (!err && results[0] && results[0].count === 0) {
            db.query(`INSERT INTO fortune_data (user_name, credit, num_line, line_num, bet_amount, free_num, free_total, free_amount, free_multi, freespin_mode, credit_line, buy_feature, buy_max, total_way, multipy, token, freemode, jackpot, free_spin, losses) 
            VALUES ('Guest', 43923, 5, 5, 32, 0, -1, 5000, 0, 0, 10, 50, 1300, 27, 0, '10a2d98d-daa5-47f4-ab58-593767798ba1', 0, 0, 0, 0)`);
          }
        });
      }
    });
} else {
  const sqlite3 = require('sqlite3').verbose();
  const isVercel = process.env.VERCEL === '1';
  const baseDir = isVercel ? '/tmp/base' : path.join(__dirname, 'base');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  const dbPath = path.join(baseDir, 'database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados SQLite:', err);
      throw err;
    }
    console.log('Conexão com SQLite estabelecida em', dbPath);
  });
  
  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS fortune_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT DEFAULT 'Guest',
      fullName TEXT,
      email TEXT UNIQUE,
      password TEXT,
      cpf TEXT,
      phone TEXT,
      credit REAL DEFAULT 0,
      real_balance REAL DEFAULT 0,
      bonus_balance REAL DEFAULT 0,
      is_first_deposit INTEGER DEFAULT 0,
      num_line INTEGER DEFAULT 5,
      line_num INTEGER DEFAULT 5,
      bet_amount INTEGER DEFAULT 2,
      free_num INTEGER DEFAULT 0,
      free_total INTEGER DEFAULT -1,
      free_amount INTEGER DEFAULT 18000,
      free_multi INTEGER DEFAULT 0,
      freespin_mode INTEGER DEFAULT 0,
      multiple_list TEXT DEFAULT NULL,
      credit_line INTEGER DEFAULT 10,
      buy_feature INTEGER DEFAULT 50,
      buy_max INTEGER DEFAULT 1300,
      feature TEXT DEFAULT NULL,
      total_way INTEGER DEFAULT 27,
      multipy INTEGER DEFAULT 0,
      token TEXT UNIQUE,
      freemode INTEGER DEFAULT 0,
      jackpot INTEGER DEFAULT 0,
      free_spin INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      scaler INTEGER DEFAULT 0
    )`);
    
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS icon_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      icon_name TEXT NOT NULL,
      token TEXT,
      feature_symbol TEXT
    )`);
    
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS losses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      bet_amount INTEGER NOT NULL
    )`);
    
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS wins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      win_amount INTEGER NOT NULL
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'PENDING',
      qr_code TEXT,
      copy_paste TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )`);

    sqliteDb.get("SELECT count(*) as count FROM fortune_data", (err, row) => {
      if (row && row.count === 0) {
        sqliteDb.run(`INSERT INTO fortune_data (user_name, credit, num_line, line_num, bet_amount, free_num, free_total, free_amount, free_multi, freespin_mode, credit_line, buy_feature, buy_max, total_way, multipy, token, freemode, jackpot, free_spin, losses) 
        VALUES ('Guest', 43923, 5, 5, 32, 0, -1, 5000, 0, 0, 10, 50, 1300, 27, 0, '10a2d98d-daa5-47f4-ab58-593767798ba1', 0, 0, 0, 0)`);
      }
    });
    
    sqliteDb.get("SELECT count(*) as count FROM icon_data", (err, row) => {
      if (row && row.count === 0) {
        const insertIcons = sqliteDb.prepare("INSERT INTO icon_data (icon_name, token) VALUES (?, ?)");
        const token = '10a2d98d-daa5-47f4-ab58-593767798ba1';
        const icons = ['Symbol_2', 'Symbol_0', 'Symbol_4', 'Symbol_4', 'Symbol_0', 'Symbol_5', 'Symbol_4', 'Symbol_5', 'Symbol_3'];
        icons.forEach(icon => insertIcons.run(icon, token));
        insertIcons.finalize();
      }
    });
  });

  db = {
    query: function(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        sqliteDb.all(sql, params, callback);
      } else {
        sqliteDb.run(sql, params, function(err) {
          if (callback) {
            callback(err, { insertId: this.lastID, affectedRows: this.changes });
          }
        });
      }
    }
  };
}

class SuccessResponse {
  constructor(data, message) {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

class ErrorResponse {
  constructor(message) {
    this.success = false;
    this.message = message;
  }
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatSessionData(sessionData) {
    // Parse ou default das opções de aposta (Bet Sizes) para a tela não ficar vazia
    if (typeof sessionData.multiple_list === 'string' && sessionData.multiple_list.length > 0) {
        try {
            sessionData.multiple_list = JSON.parse(sessionData.multiple_list);
        } catch(e) {
            sessionData.multiple_list = [0.08, 0.80, 8.00];
        }
    } else {
        sessionData.multiple_list = [0.08, 0.80, 8.00];
    }
    
    // O jogo espera um bet_size_list, então vamos injetar
    sessionData.bet_size_list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    sessionData.multiple_list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Bet Levels
    
    // Configuração de Moeda Brasileira (R$)
    sessionData.currency_prefix = "R$ ";
    sessionData.currency_decimal = ",";
    sessionData.currency_thousand = ".";
    
    // Garante que o valor da aposta inicial bata com a lista para não quebrar a tela de Bet Amount
    sessionData.bet_amount = 1.00;  // Bet Size inicial
    sessionData.credit_line = 1;    // Bet Level inicial
    sessionData.num_line = 5;       // Base Bet Lines
    
    // Parse feature se for string
    if (typeof sessionData.feature === 'string' && sessionData.feature.length > 0) {
        try { sessionData.feature = JSON.parse(sessionData.feature); } catch(e) {}
    }
    return sessionData;
}

app.get('/api/data/:token/session', (req, res) => {
  const token = req.params.token;
  const query = 'SELECT * FROM fortune_data WHERE token = ?';

  db.query(query, [token], (err, results) => {
    if (err) {
      console.error('Erro ao buscar dados da sessão:', err);
      return res.status(500).json({ success: false, message: 'Erro no Banco: ' + err.message });
    }

    if (!results || results.length === 0) {
      if (token && token.startsWith('guest_')) {
          console.log('Criando conta de convidado para:', token);
          const insertGuest = `INSERT INTO fortune_data (token, user_name, real_balance, bonus_balance, credit, bet_amount, num_line, line_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
          db.query(insertGuest, [token, 'Convidado', 0, 25.00, 25.00, 2, 5, 5], (insErr) => {
              if (insErr) {
                  console.error('Erro ao criar convidado:', insErr);
                  return res.status(500).json(new ErrorResponse('Erro ao criar convidado.'));
              }
              const guestData = {
                  token: token,
                  user_name: 'Convidado',
                  real_balance: 0,
                  bonus_balance: 25.00,
                  credit: 25.00,
                  bet_amount: 2,
                  num_line: 5,
                  line_num: 5
              };
              return res.json(new SuccessResponse(formatSessionData(guestData), 'Sessão convidado criada'));
          });
          return;
      }
      const errorResponse = new ErrorResponse('Sessão não encontrada.');
      return res.status(404).json(errorResponse);
    }

    try {
        const sessionData = formatSessionData(results[0]);
        res.json(new SuccessResponse(sessionData, 'Dados da sessão carregados com sucesso'));
    } catch (e) {
        console.error('Erro ao formatar sessão:', e);
        res.status(500).json({ success: false, message: 'Erro ao formatar dados: ' + e.message });
    }
  });
});

app.post('/api/data/:token/spin', (req, res) => {
  try {
    const token = req.params.token;

    // ==========================================
    // CONFIGURAÇÕES DE GANHOS (WIN) - EDITE AQUI
    // ==========================================
    const CHANCE_DE_GANHO = 0.25; // 25% de chance
    const MULTIPLICADOR_PEQUENO_MIN = 1.2;
    const MULTIPLICADOR_PEQUENO_MAX = 5.0;
    const MULTIPLICADOR_GRANDE_MIN = 10.0;
    const MULTIPLICADOR_GRANDE_MAX = 50.0;

    let betAmount = 0;
    let cs = req.query.cs || req.body.cs;
    let ml = req.query.ml || req.body.ml;

    // Extração robusta de dados brutos do motor do jogo
    let raw = '';
    if (typeof req.body === 'string') {
        raw = req.body;
    } else if (req.body && typeof req.body === 'object') {
        raw = Object.keys(req.body).join('&');
    }
    raw += '&' + req.url;
    
    const matchCs = raw.match(/cs=([\d\.\,]+)/i);
    const matchMl = raw.match(/ml=([\d\.\,]+)/i);
    const matchB = raw.match(/b=([\d\.\,]+)/i);
    const matchBet = raw.match(/betamount=([\d\.\,]+)/i);
    const matchCpl = raw.match(/cpl=([\d\.\,]+)/i);
    const matchNumline = raw.match(/numline=([\d\.\,]+)/i);
    
    if (matchCs) cs = matchCs[1];
    if (matchMl) ml = matchMl[1];
    
    let extractedAmount = null;
    if (matchB) extractedAmount = parseFloat(matchB[1]);
    else if (matchBet) extractedAmount = parseFloat(matchBet[1]);
    else if (req.body && req.body.betamount) extractedAmount = parseFloat(req.body.betamount);

    let cpl = matchCpl ? parseInt(matchCpl[1]) : (req.body && req.body.cpl ? parseInt(req.body.cpl) : 1);
    let numline = matchNumline ? parseInt(matchNumline[1]) : (req.body && req.body.numline ? parseInt(req.body.numline) : 5);

    if (extractedAmount !== null) {
        if (extractedAmount < 50 && cpl > 0) { 
            betAmount = extractedAmount * cpl * numline;
        } else {
            betAmount = extractedAmount;
        }
    }

    if (!betAmount && cs && ml) {
        betAmount = parseFloat(cs.toString().replace(',', '.')) * parseInt(ml) * 5;
    }
    
    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
        betAmount = 2.00;
    }

    const rtp = config.rtp;
    const query = 'SELECT * FROM fortune_data WHERE token = ?';

    db.query(query, [token], (err, results) => {
      if (err) {
        console.error('Erro ao buscar spin:', err);
        return res.status(200).json({ success: false, message: 'Erro no Banco: ' + err.message });
      }

      if (!results || results.length === 0) {
        return res.status(200).json({ success: false, message: 'Sessão expirada. Recarregue.' });
      }

      const fortuneData = results[0];
      const totalBalance = fortuneData.real_balance + fortuneData.bonus_balance;

      if (totalBalance < betAmount) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            success: false, 
            message: 'Saldo insuficiente para a aposta.',
            version: '3.0.5',
            data: { credit: totalBalance } 
        }));
      }

      // Lógica de dedução e vitória...
      let newReal = fortuneData.real_balance;
      let newBonus = fortuneData.bonus_balance;
      let betFromBonus = 0;
      let isBonusPlay = false;

      if (newBonus >= betAmount) {
          newBonus -= betAmount;
          betFromBonus = betAmount;
          isBonusPlay = true;
      } else {
          betFromBonus = newBonus;
          const remaining = betAmount - newBonus;
          newBonus = 0;
          newReal -= remaining;
          isBonusPlay = (betFromBonus > 0);
      }

      const featureSymbol = 'Symbol_' + getRandomNumber(1, 9);
      db.query('UPDATE icon_data SET feature_symbol = ? WHERE token = ?', [featureSymbol, token]);

      const winChance = isBonusPlay ? 0.40 : CHANCE_DE_GANHO;
      const isWin = Math.random() < winChance;
      let winAmount = 0;
      
      if (isWin) {
          let mult = 0;
          if (Math.random() < 0.90) mult = getRandomNumber(12, 50) / 10;
          else mult = getRandomNumber(100, 500) / 10;
          if (isBonusPlay) mult *= 0.4;
          winAmount = parseFloat((betAmount * mult).toFixed(2));
      }

      let syms = [];
      for(let i=0; i<9; i++) syms.push('Symbol_' + getRandomNumber(1, 8));
      
      if (winAmount > 0) {
          let winSym = 'Symbol_' + getRandomNumber(1, 7);
          syms[3] = winSym; syms[4] = winSym; syms[5] = winSym;
          newReal += winAmount;
      }

      const finalCredit = newReal + newBonus;
      db.query('UPDATE fortune_data SET real_balance = ?, bonus_balance = ?, credit = ?, bet_amount = ? WHERE token = ?', 
        [newReal, newBonus, finalCredit, betAmount, token]);

      res.json(new SuccessResponse({
        credit: finalCredit,
        freemode: fortuneData.freemode,
        jackpot: 0,
        free_spin: 0,
        free_num: 0,
        scaler: 0,
        num_line: 5,
        bet_amount: betAmount,
        feature_symbol: null,
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
          WildColumIcon: "",
          MultipyScatter: 0,
          MultiplyCount: 0,
          SlotIcons: syms,
          ActiveIcons: winAmount > 0 ? [4, 5, 6] : [],
          ActiveLines: winAmount > 0 ? [{ index: 1, active_icon: [4, 5, 6] }] : [],
          WinLogs: [],
          DropLine: 0,
          DropLineData: [],
          MultipleList: [],
          FeatureResult: null
        }
      }));
    });
  } catch (e) {
    console.error('CRITICAL SPIN ERROR:', e);
    res.status(200).json({ success: false, message: 'Erro interno. Tente novamente.' });
  }
});

app.post('/api/data/:token/histories', (req, res) => {
  const token = req.params.token;
  
  // Unifica as vitórias e derrotas para montar o histórico real
  const query = `
    SELECT id, token, win_amount, amount as bet_amount, bet_size, bet_level, timestamp, 'win' as type FROM wins WHERE token = ?
    UNION ALL
    SELECT id, token, 0 as win_amount, bet_amount, bet_size, bet_level, timestamp, 'loss' as type FROM losses WHERE token = ?
    ORDER BY timestamp DESC LIMIT 30
  `;
  
  db.query(query, [token, token], (err, results) => {
      if (err) {
          return res.json(new SuccessResponse({ items: [], totalRecord: 0, perPage: 10, currentPage: 1, displayTotal: 0, totalPage: 0, totalBet: 0, totalProfit: 0 }, 'Erro ao buscar históricos.'));
      }
      
      const items = results.map((row) => {
          const dateObj = new Date(row.timestamp + "Z");
          dateObj.setHours(dateObj.getHours() - 3);

          const isWin = row.type === 'win';
          const totalBet = row.bet_amount || 0;
          const winAmount = row.win_amount || 0;
          
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          const seconds = String(dateObj.getSeconds()).padStart(2, '0');

          const spinDate = `${year}-${month}-${day}`;
          const spinHour = `${hours}:${minutes}:${seconds}`;

          return {
              id: row.id,
              spin_date: spinDate,
              spin_hour: spinHour,
              transaction: 'TX' + dateObj.getTime() + row.id,
              total_bet: totalBet,
              win_amount: isWin ? winAmount : 0,
              credit_line: row.bet_size || (totalBet / 5), 
              bet_amount: row.bet_level || 1,
              profit: isWin ? (winAmount - totalBet) : -totalBet,
              balance: 0,
              free_num: 0,
              multipy: 1
          };
      });
      
      res.json(new SuccessResponse({
        totalRecord: items.length,
        perPage: 30,
        currentPage: 1,
        displayTotal: items.length,
        totalPage: 1,
        totalBet: items.reduce((sum, i) => sum + i.total_bet, 0),
        totalProfit: items.reduce((sum, i) => sum + i.profit, 0),
        items: items
      }, 'Históricos carregados com sucesso'));
  });
});


app.get('/api/data/history/:id', (req, res) => {
  const idStr = req.params.id;
  const id = idStr.split(':')[0];
  
  const processResult = (row, type) => {
    const isWin = type === 'win';
    const dateObj = new Date(row.timestamp + "Z");
    dateObj.setHours(dateObj.getHours() - 3);
    
    const spinDate = dateObj.toISOString().split('T')[0];
    const spinHour = dateObj.toTimeString().split(' ')[0];

    return {
        success: true,
        data: {
            spin_date: spinDate,
            spin_hour: spinHour,
            special_symbols: [],
            result_data: [{
                spin_title: isWin ? "Vitória" : "Aposta Normal",
                bet_amount: isWin ? row.amount : row.bet_amount,
                win_amount: isWin ? row.win_amount : 0,
                profit: isWin ? (row.win_amount - row.amount) : -row.bet_amount,
                credit_line: row.bet_size || 1,
                bet_amount_level: row.bet_level || 1,
                icons: ["Symbol_1", "Symbol_2", "Symbol_3", "Symbol_4", "Symbol_5", "Symbol_6", "Symbol_7", "Symbol_8", "Symbol_1"],
                active_icons: isWin ? [3, 4, 5] : [],
                active_lines: isWin ? [{ index: 1, active_icon: [3, 4, 5] }] : []
            }]
        }
    };
  };

  db.query('SELECT * FROM wins WHERE id = ?', [id], (err, results) => {
    if (!err && results.length > 0) {
        return res.json(processResult(results[0], 'win'));
    }
    
    db.query('SELECT * FROM losses WHERE id = ?', [id], (err, results) => {
        if (!err && results.length > 0) {
            return res.json(processResult(results[0], 'loss'));
        }
        
        res.json({ success: true, data: { result_data: [], special_symbols: [] } });
    });
  });
});

// Adiciona também versão POST caso o motor use POST
app.post('/api/data/history/:id', (req, res) => {
    res.redirect(307, '/api/data/history/' + req.params.id);
});
app.post('/api/auth/register', (req, res) => {
  try {
    const { phone, password, fullName } = req.body;
    if (!phone || !password || !fullName) {
        return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando.' });
    }
    
    const token = require('crypto').randomUUID();
    const displayName = fullName.split(' ')[0] || 'Jogador';
    
    // R$ 25 de bônus inicial
    const query = `INSERT INTO fortune_data 
      (email, phone, password, fullName, bonus_balance, credit, token, user_name, bet_amount, num_line, line_num) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [phone, phone, password, fullName, 25.00, 25.00, token, displayName, 2, 5, 5], (err) => {
      if (err) {
        console.error('Erro no Registro:', err);
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });
        }
        return res.status(500).json({ success: false, message: 'Erro ao salvar no banco de dados.' });
      }
      
      res.json({ success: true, token, user: { phone, fullName, real_balance: 0, bonus_balance: 25.00, is_first_deposit: 0 } });
    });
  } catch (error) {
    console.error('Erro Fatal no Registro:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  const query = 'SELECT * FROM fortune_data WHERE email = ? AND password = ?';
  
  db.query(query, [phone, password], (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }
    const user = results[0];
    res.json({ success: true, token: user.token, user: { phone: user.phone, fullName: user.fullName, balance: user.credit } });
  });
});

app.get('/api/user/me', (req, res) => {
  const token = req.headers.authorization;
  const query = 'SELECT * FROM fortune_data WHERE token = ?';
  db.query(query, [token], (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ success: false });
    const user = results[0];
    res.json({ 
      success: true, 
      user: { 
        email: user.email, 
        fullName: user.fullName, 
        balance: user.credit,
        real_balance: user.real_balance,
        bonus_balance: user.bonus_balance,
        is_first_deposit: user.is_first_deposit
      } 
    });
  });
});

// SigiloPay Integration (Real)
const axios = require('axios');

// CONFIGURAÇÃO DE PAGAMENTO
const MIN_DEPOSIT = 2.00; // Valor mínimo configurável para depósitos (R$)

app.post('/api/payment/deposit', async (req, res) => {
  const { amount } = req.body;
  const token = req.headers.authorization;
  
  if (!amount || amount < MIN_DEPOSIT) {
    return res.status(400).json({ success: false, message: `O valor mínimo para depósito é R$ ${MIN_DEPOSIT.toFixed(2).replace('.', ',')}.` });
  }

  // Busca os dados reais do usuário no banco para enviar à SigiloPay
  db.query('SELECT * FROM fortune_data WHERE token = ?', [token], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
    }
    const user = results[0];

    try {
      const baseUrl = config.sigilo_pay.webhook_domain || `${req.protocol}://${req.get('host')}`;
      const callbackUrl = `${baseUrl}/api/webhook/sigilopay`;
      
      const fullUrl = `${config.sigilo_pay.api_url}/gateway/pix/receive`;
      console.log('Chamando SigiloPay API (Oficial):', fullUrl);
      
      // SigiloPay API (Rota Oficial de Recebimento PIX)
      const response = await axios.post(fullUrl, {
        identifier: token,
        amount: amount,
        client: {
          name: user.fullName || 'Jogador Fortune', 
          email: user.email || 'jogador@fortune.com',
          phone: user.phone || '11999999999',
          document: user.cpf || '42230309802' // CPF cadastrado pelo usuário
        },
        callbackUrl: callbackUrl
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
        const transactionId = response.data.transactionId || response.data.id;
        const webhookToken = response.data.webhookToken || response.data.token || response.data.webhook_token; // Token de validação oficial

        // Salva o depósito no histórico para consulta posterior
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        console.log('Salvando depósito no banco:', { transactionId, token, amount, webhookToken });
        db.query('INSERT INTO deposits (id, token, amount, qr_code, copy_paste, expires_at, webhook_token) VALUES (?, ?, ?, ?, ?, ?, ?)', 
          [transactionId, token, amount, qrCode, copyPaste, expiresAt.toISOString(), webhookToken], (insErr) => {
            if (insErr) console.error('Erro ao salvar depósito no banco:', insErr);
            else console.log('Depósito salvo com sucesso no banco.');
          });

        res.json({ 
          success: true, 
          qr_code: qrCode, 
          copy_paste: copyPaste 
        });
      } else {
        console.log('Resposta SigiloPay sem dados de PIX:', response.data);
        throw new Error(response.data.message || 'Erro na SigiloPay ao extrair PIX');
      }
    } catch (err) {
      console.error('Erro SigiloPay Depósito:', err.response ? err.response.data : err.message);
      res.status(500).json({ success: false, message: 'Erro ao gerar PIX. Verifique se seu CPF e dados estão corretos no cadastro.' });
    }
  });
});

// Consultar status de um depósito específico e atualizar se pago
app.get('/api/payment/check-status/:id', async (req, res) => {
  const transactionId = req.params.id;
  const token = req.headers.authorization;

  try {
    // A SigiloPay exige o ID via query param ?id= em vez de path param
    const fullUrl = `${config.sigilo_pay.api_url}/gateway/transactions?id=${transactionId}`;
    const response = await axios.get(fullUrl, {
      headers: { 
        'x-public-key': config.sigilo_pay.public_key,
        'x-secret-key': config.sigilo_pay.secret_key
      }
    });

    // Se vier uma lista, pegamos o primeiro. Se vier objeto direto, usamos ele.
    const tx = Array.isArray(response.data) ? response.data[0] : response.data;
    
    if (tx && (tx.status === 'PAID' || tx.status === 'COMPLETED')) {
      db.query('SELECT * FROM deposits WHERE id = ? AND status = "PENDING"', [transactionId], (err, results) => {
        if (!err && results.length > 0) {
          const deposit = results[0];
          const depositAmount = deposit.amount;
          
          db.query('UPDATE deposits SET status = "COMPLETED" WHERE id = ?', [transactionId]);
          
          db.query('SELECT * FROM fortune_data WHERE token = ?', [token], (uErr, uResults) => {
            if (!uErr && uResults.length > 0) {
              const user = uResults[0];
              const newBalance = user.real_balance + depositAmount;
              // No Fortune Tiger, o 'credit' também deve ser atualizado para refletir no jogo
              db.query('UPDATE fortune_data SET real_balance = ?, credit = credit + ?, is_first_deposit = 1 WHERE token = ?', 
                [newBalance, depositAmount, token]);
              console.log(`✅ Pagamento detectado via Polling: R$ ${depositAmount} para ${user.email}`);
            }
          });
          return res.json({ success: true, status: 'PAID', balance_updated: true });
        } else {
          return res.json({ success: true, status: 'PAID', balance_updated: false });
        }
      });
    } else {
      res.json({ success: true, status: tx ? tx.status : 'PENDING' });
    }
  } catch (err) {
    console.error('Erro ao consultar status:', err.response?.data || err.message);
    res.status(500).json({ success: false });
  }
});

app.get('/api/payment/pending-deposits', (req, res) => {
  const token = req.headers.authorization;
  // Mostra depósitos PENDING das últimas 24 horas usando o relógio do banco de dados (mais confiável)
  const query = `
    SELECT * FROM deposits 
    WHERE token = ? 
    AND status = 'PENDING' 
    AND created_at >= NOW() - INTERVAL 1 DAY 
    ORDER BY created_at DESC 
    LIMIT 10
  `;
  db.query(query, [token], (err, results) => {
    if (err) {
      console.error('Erro ao buscar pendentes:', err);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true, deposits: results });
  });
});

// WEBHOOK SIGILOPAY - Processamento Oficial conforme Documentação
app.post('/api/webhook/sigilopay', (req, res) => {
  const payload = req.body;
  const receivedToken = payload.token; // Token de validação enviado pela SigiloPay
  
  if (!payload.transaction || !payload.transaction.id) {
    console.error('Webhook: Payload inválido recebido.');
    return res.status(400).send('Invalid payload');
  }

  const sigiloId = payload.transaction.id;
  const status = payload.transaction.status;

  // 1. Localiza o depósito no nosso banco para validar o webhookToken
  db.query('SELECT * FROM deposits WHERE id = ?', [sigiloId], (err, results) => {
    if (err || results.length === 0) {
      console.error(`Webhook: Transação ${sigiloId} não encontrada no banco.`);
      return res.status(404).send('Transaction not found');
    }

    const deposit = results[0];

    // 2. Validação de Segurança: O token recebido deve bater com o token gerado na criação
    if (deposit.webhook_token && receivedToken !== deposit.webhook_token) {
      console.error(`Webhook: Token de validação incorreto para ${sigiloId}.`);
      return res.status(401).send('Unauthorized Token');
    }

    // 3. Verifica se a transação foi concluída
    if (status === 'COMPLETED' || status === 'PAID' || payload.event === 'TRANSACTION_PAID') {
      if (deposit.status === 'COMPLETED') {
        return res.status(200).send('Already processed');
      }

      const userToken = deposit.token;
      const amount = deposit.amount;

      // 4. Atualiza status do depósito
      db.query('UPDATE deposits SET status = "COMPLETED" WHERE id = ?', [sigiloId]);

      // 5. Credita o saldo do usuário
      db.query('SELECT * FROM fortune_data WHERE token = ?', [userToken], (uErr, uResults) => {
        if (!uErr && uResults.length > 0) {
          const user = uResults[0];
          const newReal = user.real_balance + amount;
          const newCredit = user.credit + amount;
          
          db.query('UPDATE fortune_data SET real_balance = ?, credit = ?, is_first_deposit = 1 WHERE token = ?', 
            [newReal, newCredit, userToken], (upErr) => {
              if (!upErr) {
                console.log(`✅ Webhook: Saldo creditado (R$ ${amount}) para ${user.email}`);
              }
            });
        }
      });
      
      return res.status(200).send('OK');
    } else {
      console.log(`Webhook: Transação ${sigiloId} com status: ${status}.`);
      return res.status(200).send('Status updated');
    }
  });
});

app.post('/api/payment/withdraw', async (req, res) => {
  const token = req.headers.authorization;
  const { amount, pixKey, keyType } = req.body;
  
  const query = 'SELECT * FROM fortune_data WHERE token = ?';
  db.query(query, [token], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ success: false });
    const user = results[0];
    
    if (user.is_first_deposit === 0) {
      return res.status(400).json({ success: false, message: 'O saque só é permitido após o primeiro depósito de R$ 50,00.' });
    }
    
    if (amount > user.real_balance) {
      return res.status(400).json({ success: false, message: 'Saldo real insuficiente para saque (Bônus não é sacável).' });
    }

    try {
      // SigiloPay API (Rota Oficial de Transferência)
      const response = await axios.post(`${config.sigilo_pay.api_url}/gateway/transfers`, {
        amount: amount,
        pix_key: pixKey,
        key_type: keyType,
        identifier: token + '_out_' + Date.now()
      }, {
        headers: { 
          'x-public-key': config.sigilo_pay.public_key,
          'x-secret-key': config.sigilo_pay.secret_key
        }
      });

      if (response.data && response.data.success) {
        const newReal = user.real_balance - amount;
        const newCredit = (user.credit || (user.real_balance + user.bonus_balance)) - amount;
        db.query('UPDATE fortune_data SET real_balance = ?, credit = ? WHERE token = ?', [newReal, newCredit, token]);
        
        res.json({ success: true, message: 'Saque processado com sucesso via SigiloPay.' });
      } else {
        throw new Error(response.data.message || 'Erro na SigiloPay');
      }
    } catch (error) {
      console.error('Erro SigiloPay Saque:', error.response ? error.response.data : error.message);
      res.status(500).json({ success: false, message: 'Erro ao processar saque. Verifique se o saldo da conta SigiloPay é suficiente.' });
    }
  });
});

// Redirecionamento via POST para o jogo
app.post('/api/game/launch', (req, res) => {
    const { token } = req.body;
    // Aqui poderíamos validar o token ou gerar um temporário
    // Retornamos a URL com o token injetado (via POST seria via form submit no front)
    res.json({ success: true, url: `/FortuneTiger/index.html?token=${token}` });
});

app.get('/api/data/:token/icons', (req, res) => {
  const token = req.params.token;
  const query = 'SELECT * FROM icon_data WHERE token = ?';

  db.query(query, [token], (err, results) => {
    if (err) {
      console.error('Erro ao buscar ícones:', err);
      const errorResponse = new ErrorResponse('Erro ao buscar ícones.');
      return res.status(500).json(errorResponse);
    }

    if (results.length === 0) {
      const defaultIcons = [];
      for (let i = 0; i < 9; i++) {
        defaultIcons.push({ icon_name: 'Symbol_' + Math.floor(Math.random() * 8 + 1), feature_symbol: null });
      }
      return res.json(new SuccessResponse(defaultIcons, 'Ícones padrão gerados com sucesso'));
    }

    const iconsData = results;
    const successResponse = new SuccessResponse(iconsData, 'Ícones carregados com sucesso');
    res.json(successResponse);
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API está rodando em http://localhost:${port}`);
  });
}

module.exports = app;
