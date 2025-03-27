const express = require('express');
const helmet = require('helmet'); //importa Helmet 
const { check, validationResult } = require('express-validator'); // Importa express-validator
const sqlite3 = require('sqlite3').verbose();
const morgan = require('morgan');
const swaggerUI = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');


const app = express();
const port = 3000;

app.use(express.json());
app.use(helmet()); // aplica segurança nos cabeçalhos http 
app.use(morgan('dev'));

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

// Middleware de validação
const validarProduto = [
    check('nome')
        .trim()
        .notEmpty().withMessage('O nome do produto é obrigatório')
        .isLength({ min: 2 }).withMessage('O nome deve ter pelo menos 2 caracteres'),

    check('quantidade')
        .isInt({ min: 0 }).withMessage('A quantidade deve ser um número inteiro não negativo'),
];




// Configuração do Swagger
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API de Estoque",
            version: "1.0.0",
            description: "Documentação da API para gerenciamento de estoque"
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Servidor Local"
            }
        ]
    },
    apis: ["./index.js"], // Arquivo onde estarão as anotações das rotas
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));


console.log("📄 Documentação disponível em http://localhost:3000/api-docs");




/**
 * @swagger
 * /produtos:
 *   get:
 *     summary: Retorna todos os produtos
 *     description: Endpoint para listar todos os produtos cadastrados no estoque.
 *     responses:
 *       200:
 *         description: Lista de produtos retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   nome:
 *                     type: string
 *                     example: "Teclado"
 *                   quantidade:
 *                     type: integer
 *                     example: 10
 */
app.get('/produtos', (req, res) => {
    db.all('SELECT * FROM produtos', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});




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

// Rota para adicionar um novo produto com validação
app.post('/produtos', validarProduto, (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
        return res.status(400).json({ erros: erros.array() });
    }

    const { nome, quantidade } = req.body;
    db.run('INSERT INTO produtos (nome, quantidade) VALUES (?, ?)', [nome, quantidade], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, nome, quantidade });
    });
});

// Rota para atualizar um produto com validação
app.put('/produtos/:id', validarProduto, (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
        return res.status(400).json({ erros: erros.array() });
    }

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

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
