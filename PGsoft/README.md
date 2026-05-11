# 🐯 Fortune Tiger - Plataforma Completa

Este projeto contém a integração completa do jogo Fortune Tiger com uma Dashboard de usuário e sistema de pagamentos via SigiloPay.

## 🚀 Como Inicializar o Sistema

Para rodar o projeto localmente ou em sua VPS, siga os passos abaixo:

### 1. Instalar Dependências
O sistema utiliza bibliotecas externas para comunicação com a API de pagamentos. Instale-as executando:
```bash
npm install axios express cors sqlite3 mysql2 helmet
```

### 2. Configurar Credenciais
Abra o arquivo `PGsoft/config.json` e insira suas chaves da SigiloPay:
- `public_key`: Sua chave pública (x-public-key)
- `secret_key`: Sua chave privada (x-secret-key)

### 3. Iniciar o Servidor
Execute o servidor Node.js:
```bash
node server.js
```
O sistema estará disponível em: `http://localhost:3059`

## 🛠️ Estrutura do Projeto
- `server.js`: Núcleo do backend (API, Banco de Dados, Pagamentos, Webhook).
- `public/`: Interface da Dashboard (Landing Page, Login, Saldo, Depósitos).
- `FortuneTiger/`: Motor do jogo com notificações injetadas de saldo real/bônus.
- `base/database.sqlite`: Banco de dados local para usuários e sessões.

## 💰 Sistema de Pagamentos (SigiloPay)
- **Depósitos:** Gerados via PIX QR Code diretamente na Dashboard.
- **Webhook:** O servidor está pronto para receber confirmações automáticas em `/api/webhook/sigilopay`.
- **Saques:** Bloqueados até o primeiro depósito de R$ 50,00 e limitados ao Saldo Real.

---
*Desenvolvido com foco em alta performance e experiência premium.*
