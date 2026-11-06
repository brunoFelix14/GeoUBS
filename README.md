# GeoUBS — Três Lagoas/Mato Grosso do Sul

O GeoUBS é um sistema de geoprocessamento voltado ao gerenciamento e visualização de Unidades Básicas de Saúde, utilizando dados georreferenciados para representar espacialmente as UBS de Três Lagoas/MS.

## O que foi atualizado:

- Interface principal redesenhada com painel lateral e mapa predominante.
- Busca em dois modos: **Endereço** e **Unidade**.
- Busca por endereço com geocodificação e indicação das UBS mais próximas.
- Geolocalização do usuário pelo navegador.
- Filtros por serviço e status da unidade.
- Marcadores personalizados e popups com endereço, telefone, horário e serviços.
- Botão para abrir rota no Google Maps.
- Painel administrativo para cadastrar, editar e excluir UBS.
- Banco PostgreSQL organizado em arquivos SQL visíveis.
- `setup_database.py` para criar o banco, tabela e dados demonstrativos automaticamente.
- `queries.sql` com consultas de apoio.
- API `/api/ubs`, `/api/geocode`, `/api/nearest`, `/api/estatisticas` e `/health`.

## Estrutura

```text
GeoUBS_Flask_PostgreSQL/
├── app.py
├── setup_database.py
├── requirements.txt
├── .env.example
├── README.md
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── queries.sql
├── templates/
│   ├── index.html
│   └── admin.html
└── static/
    ├── css/
    │   ├── style.css
    │   └── admin.css
    └── js/
        ├── script.js
        └── admin.js
```

## Instalação no Windows

### 1. Ambiente virtual

```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Dependências

```bash
pip install -r requirements.txt
```

### 3. PostgreSQL

Crie o arquivo `.env` copiando `.env.example` e coloque a senha do PostgreSQL.

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/geoubs
DB_NAME=geoubs
SECRET_KEY=uma-chave-local
```

### 4. Criar banco, tabelas e dados demonstrativos

Com o PostgreSQL instalado e em execução:

```bash
python setup_database.py
```

O script verifica se o banco existe, cria o banco caso necessário, executa `schema.sql` e depois `seed.sql`.

Para criar somente a estrutura, sem dados demonstrativos:

```bash
python setup_database.py --sem-seed
```

> `schema.sql` usa `DROP TABLE IF EXISTS ubs` porque foi pensado para a preparação inicial do projeto. **Não execute o setup em uma base com dados reais sem antes fazer backup.**

### 5. Executar

```bash
python app.py
```

Acesse:

- Site: `http://127.0.0.1:5000`
- Administração: `http://127.0.0.1:5000/admin`
- Health check: `http://127.0.0.1:5000/health`

## Dados reais

Os três registros do `seed.sql` são demonstrativos. Antes da apresentação/uso real, substitua-os pelos dados oficiais das UBS de Três Lagoas/MS.

A geocodificação usa Nominatim/OpenStreetMap. Para produção, respeite os limites e a política de uso do serviço ou substitua por um provedor adequado.

## Tecnologias

- HTML5, CSS3 e JavaScript
- Leaflet 1.9.4
- OpenStreetMap
- Python + Flask
- PostgreSQL + Psycopg 3
- Nominatim para geocodificação
