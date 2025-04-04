// =====================
// 1️⃣ IMPORTAÇÃO DE MÓDULOS
// =====================
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const swaggerUI = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const port = 3000;

const users = []; // Simulação de banco de dados
const SECRET_KEY = 'seu_segredo_super_secreto';

// =====================
// 2️⃣ CONFIGURAÇÃO DO EXPRESS E MIDDLEWARES
// =====================
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// =====================
// 3️⃣ CONEXÃO COM O MONGODB
// =====================
const MONGO_URI = "mongodb+srv://Fabio:Fabio4040@users.hcegzhv.mongodb.net/estoque?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

const ProdutoSchema = new mongoose.Schema({
    nome: { type: String, required: true, minlength: 2 },
    quantidade: { type: Number, required: true, min: 0 },
    imagem: { type: String }
});

const Produto = mongoose.model('Produto', ProdutoSchema);



// =====================
// 4️⃣ CONFIGURAÇÃO DO SWAGGER
// =====================
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
    apis: ["./index.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

console.log("📄 Documentação disponível em http://localhost:3000/api-docs");



// =====================
// 5️⃣ ROTAS - CRUD DE PRODUTOS (ATUALIZADO)
// =====================

const LIMITE_ESTOQUE_BAIXO = 5;

const validarProduto = [
    check('nome').trim().notEmpty().withMessage('O nome do produto é obrigatório').isLength({ min: 2 }).withMessage('O nome deve ter pelo menos 2 caracteres'),
    check('quantidade').isInt({ min: 0 }).withMessage('A quantidade deve ser um número inteiro não negativo'),
];

async function enviarEmailAlerta(produto) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'seuemail@gmail.com',
            pass: 'suasenha'
        }
    });

    const mailOptions = {
        from: 'seuemail@gmail.com',
        to: 'admin@empresa.com',
        subject: 'Alerta de Estoque Baixo',
        text: `O produto ${produto.nome} está com estoque baixo (${produto.quantidade} unidades restantes).`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Email de alerta enviado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
    }
}
/**
 * @swagger
 * /produtos:
 *   post:
 *     summary: Adiciona um novo produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               quantidade:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Produto adicionado com sucesso
 */

app.post('/produtos', validarProduto, async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
        // Verificar se o produto já existe pelo nome
        const produtoExistente = await Produto.findOne({ nome: req.body.nome });
        if (produtoExistente) {
            return res.status(400).json({ message: 'Produto já cadastrado no sistema.' });
        }

        // Criar um novo produto
        const produto = new Produto(req.body);
        await produto.save();

        // Emitir alerta caso o estoque esteja baixo
        if (produto.quantidade < LIMITE_ESTOQUE_BAIXO) {
            io.emit('estoqueBaixo', produto);
            await enviarEmailAlerta(produto);
        }

        res.status(201).json(produto);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /produtos:
 *   get:
 *     summary: Retorna todos os produtos
 *     responses:
 *       200:
 *         description: Lista de produtos
 */

app.get('/produtos', (req, res) => {
    let { page = 1, limit = 10, nome, quantidade_min } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    quantidade_min = quantidade_min ? parseInt(quantidade_min) : 0;
    
    let query = 'SELECT * FROM produtos WHERE 1=1';
    let params = [];

    if (nome) {
        query += ' AND nome LIKE ?';
        params.push(`%${nome}%`);
    }
    if (quantidade_min) {
        query += ' AND quantidade >= ?';
        params.push(quantidade_min);
    }
    
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ page, limit, produtos: rows });
    });
});


/**
 * @swagger
 * /produtos/{id}:
 *   put:
 *     summary: Atualiza um produto existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               quantidade:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Produto atualizado com sucesso
 */
app.put('/produtos/:id', validarProduto, (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
        return res.status(400).json({ erros: erros.array() });
    }
    const { id } = req.params;
    const { nome, quantidade } = req.body;
    db.run('UPDATE produtos SET nome = ?, quantidade = ? WHERE id = ?', [nome, quantidade, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto atualizado com sucesso' });
    });
});

/**
 * @swagger
 * /produtos/{id}:
 *   delete:
 *     summary: Exclui um produto pelo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produto excluído com sucesso
 */


app.delete('/produtos/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM produtos WHERE id = ?', id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Produto não encontrado" });
        res.json({ message: 'Produto excluído com sucesso' });
    });
});







// =====================
// 6️⃣ CONFIGURAÇÃO DE UPLOAD DE IMAGENS (ATUALIZADO)
// =====================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/';
        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('📂 Pasta de uploads criada com sucesso!');
            } catch (error) {
                console.error('❌ Erro ao criar a pasta de uploads:', error);
                return cb(new Error('Erro ao criar diretório de upload.')); 
            }
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'));
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

app.post('/upload', upload.single('imagem'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado ou tipo de arquivo inválido.' });
    }
    res.json({ message: 'Upload realizado com sucesso!', file: req.file });
});

// Nova rota para servir imagens
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// =====================
// 7️⃣ AUTENTICAÇÃO - LOGIN E REGISTRO (ATUALIZADO)
// =====================

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios' });
    }

    try {
        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Nome de usuário já está em uso.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao registrar usuário', error: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao realizar login', error: error.message });
    }
});

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Acesso negado' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
};

app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Você acessou uma rota protegida!', user: req.user });
});



// =====================
// 8️⃣ SOCKET.IO PARA NOTIFICAÇÕES
// =====================

io.on('connection', (socket) => {
    console.log('Novo cliente conectado');
    socket.on('disconnect', () => console.log('Cliente desconectado'));
});

// =====================
// 9️⃣ INICIALIZAÇÃO DO SERVIDOR
// =====================

server.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
