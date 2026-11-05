# GeoUBS — Três Lagoas/MS

Aplicação web acadêmica para consultar e administrar Unidades de Saúde da Família de Três Lagoas/MS. O projeto inclui frontend responsivo com Leaflet/OpenStreetMap, API Flask e banco PostgreSQL.

> **Sobre os dados:** o `database/seed.sql` inclui 15 unidades transcritas das fichas enviadas. As coordenadas marcadas como aproximadas são pontos iniciais por região/endereço e precisam ser conferidas antes de uso público. Serviços/equipe só devem ser divulgados após confirmação com cada unidade.

## Estrutura

```text
GeoUBS_Flask_PostgreSQL/
├── app.py                       # API Flask e páginas
├── setup_database.py             # cria/atualiza o schema e importa as UBS
├── 1_CONFIGURAR_BANCO.bat        # instalação de dependências + carga SQL
├── 2_INICIAR_GEoubs.bat          # inicia o servidor local
├── .env.example                  # modelo de configuração; copie para .env
├── requirements.txt
├── database/
│   ├── schema.sql                # schema compatível e não destrutivo
│   ├── seed.sql                  # 15 unidades e campos cadastrais
│   └── consultas.sql             # consultas úteis de diagnóstico
├── templates/
│   ├── index.html                # mapa público
│   └── admin.html                # painel de cadastro
└── static/
    ├── css/style.css
    ├── css/admin.css
    └── js/
        ├── script.js
        └── admin.js
```

## Instalação no Windows (passo a passo)

### 1. Descompactar e abrir o PostgreSQL

1. Extraia o ZIP para uma pasta simples, por exemplo `C:\Projetos\GeoUBS_Flask_PostgreSQL`.
2. Abra o **pgAdmin 4** e confirme que o servidor PostgreSQL está iniciado.
3. Se ainda não houver banco do projeto, clique com o botão direito em **Databases → Create → Database...** e crie um banco chamado `geoubs`. Se já tiver um banco correto, use o nome dele em vez de criar outro.

### 2. Configurar a conexão

1. Na pasta do projeto, copie `.env.example` e renomeie a cópia para `.env`.
2. Abra `.env` no Bloco de Notas/VS Code.
3. Ajuste `DATABASE_URL` com usuário, senha e nome do banco. Exemplo para instalação local:

   ```env
   DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/geoubs
   SECRET_KEY=uma-chave-local
   FLASK_DEBUG=0
   PORT=5000
   ```

   Substitua `SUA_SENHA` pela senha do PostgreSQL. O nome `geoubs` precisa ser igual ao banco que você criou/selecionou. Se a senha tiver caracteres reservados na URL (como `@`, `:` ou `/`), use a versão codificada para URL.

### 3. Criar as tabelas e carregar as unidades

Dê dois cliques em **`1_CONFIGURAR_BANCO.bat`**. Ele cria um ambiente Python, instala as dependências, executa `schema.sql` e popula `ubs` com as 15 unidades do `seed.sql`.

O schema **não apaga nem recria a tabela**. O seed remove apenas os registros demonstrativos antigos conhecidos e substitui as versões anteriores das 15 unidades incluídas. Execute esta configuração no banco que está indicado em `.env`.

Ao final, o terminal informa quantas unidades foram cadastradas e quantas possuem coordenadas. Se houver erro de conexão, confira se o serviço PostgreSQL está ativo, se a base existe e se o `.env` está correto.

### 4. Iniciar o site

Dê dois cliques em **`2_INICIAR_GEoubs.bat`**. Deixe a janela aberta enquanto usa o projeto. No navegador, acesse:

- Mapa público: <http://127.0.0.1:5000>
- Painel administrativo: <http://127.0.0.1:5000/admin>
- Teste da API: <http://127.0.0.1:5000/api/ubs>
- Saúde da conexão: <http://127.0.0.1:5000/api/health>

A rota `/api/ubs` deve retornar uma lista JSON com as unidades, e não apenas `[]`. O endpoint `/api/health` informa o nome do banco usado pela aplicação e a quantidade de registros.

## Como adicionar ou editar unidades

Abra `/admin`, preencha os campos e salve. As alterações vão para o PostgreSQL. O botão **Localizar** consulta o serviço público Nominatim/OpenStreetMap e precisa de internet; sempre confira as coordenadas encontradas antes de salvar.

Também é possível editar os arquivos SQL em `database/` e executar novamente `1_CONFIGURAR_BANCO.bat`. O seed usa CNES para substituir registros das unidades deste conjunto, evitando duplicatas nas execuções repetidas.

## Diagnóstico quando o mapa aparece vazio

1. Acesse `http://127.0.0.1:5000/api/health`. Confirme o nome do banco e o total.
2. Abra `http://127.0.0.1:5000/api/ubs`. Se o resultado for `[]`, o banco consultado pela API está vazio.
3. Se o pgAdmin mostra unidades, mas a API retorna vazio, confira se o `.env` aponta exatamente para o mesmo banco.
4. No pgAdmin, execute `database/consultas.sql` usando o mesmo banco configurado em `.env`.
5. Se a lista aparece mas os marcadores não, confira se `latitude` e `longitude` estão preenchidas e se o navegador tem acesso à internet para carregar os mapas base do OpenStreetMap.

## Tecnologias

- Python 3.10+ / Flask
- PostgreSQL / psycopg 3
- HTML, CSS e JavaScript
- Leaflet 1.9.4 e OpenStreetMap
- Nominatim para busca de endereços (sujeito à disponibilidade e à política de uso do serviço)

## Privacidade e publicação

A versão incluída é para desenvolvimento local. Antes de publicação institucional, valide com a Secretaria Municipal de Saúde os dados, telefones, horários, serviços e posições no mapa. Não publique o painel administrativo sem autenticação/autorização adequadas.
