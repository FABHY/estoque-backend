API de Gerenciamento de Produtos Introdução

Esta API foi desenvolvida para gerenciar um estoque de produtos, permitindo operações de criação, leitura, atualização e remoção de produtos em um banco de dados SQLite.

Tecnologias Utilizadas

Node.js

Express.js

SQLite3

Estrutura do Projeto

/api |-- index.js |-- package.json |-- estoque.db

Como Rodar o Projeto

1 Instalar Dependências npm install

2 Executar a API node index.js

A API rodará no endereço: http://localhost:3000

Endpoints Disponíveis

Listar Todos os Produtos Exemplo de Resposta:

[ { "id": 1, "nome": "Teclado", "quantidade": 10 }, { "id": 2, "nome": "Mouse", "quantidade": 5 } ]

Adicionar um Novo Produto

Rota: POST /produtos

Requisição (JSON): { "nome": "Monitor", "quantidade": 3 } Exemplo de Resposta: { "id": 3, "nome": "Monitor", "quantidade": 3 }

Atualizar um Produto

Rota: PUT /produtos/:id

Requisição (JSON):

{ "nome": "Teclado Mecânico", "quantidade": 7 } Exemplo de Resposta:

{ "message": "Produto atualizado com sucesso" }

Remover um Produto

Rota: DELETE /produtos/:id

Exemplo de Resposta:

{ "message": "Produto removido com sucesso" }

Estrutura do Banco de Dados

A API utiliza um banco SQLite e cria a seguinte tabela:

CREATE TABLE IF NOT EXISTS produtos ( id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, quantidade INTEGER NOT NULL );

Para maiores informações entrar em contato FABIO HYPOLITO TEL/WHATSAPP (11)93218-5499 E-MAIL: FABIOHYPOLITO2021@OUTLOOK.COM


  




    




