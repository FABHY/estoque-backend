const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.json());

// Conectar ao banco de dados
const db = new sqlite3.Database('./estoque.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criar tabela se não existir
db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL
)`);

// Rota para listar produtos
app.get('/produtos', (req, res) => {
    db.all('SELECT * FROM produtos', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Rota para adicionar um novo produto
app.post('/produtos', (req, res) => {
    const { nome, quantidade } = req.body;
    db.run('INSERT INTO produtos (nome, quantidade) VALUES (?, ?)', [nome, quantidade], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, nome, quantidade });
    });
});

// Rota para atualizar um produto
app.put('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, quantidade } = req.body;
    db.run('UPDATE produtos SET nome = ?, quantidade = ? WHERE id = ?', [nome, quantidade, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Produto atualizado com sucesso' });
    });
});

// Rota para deletar um produto
app.delete('/produtos/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM produtos WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Produto removido com sucesso' });
    });
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
