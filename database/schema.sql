-- GeoUBS | Três Lagoas - MS
-- Schema idempotente: pode ser executado mais de uma vez sem apagar os dados.
-- IMPORTANTE: este arquivo NÃO contém DROP TABLE.

CREATE TABLE IF NOT EXISTS ubs (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(180) NOT NULL,
    cnes VARCHAR(30),
    endereco VARCHAR(255) NOT NULL,
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL DEFAULT 'Três Lagoas',
    estado CHAR(2) NOT NULL DEFAULT 'MS',
    cep VARCHAR(12),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    telefone VARCHAR(30),
    email VARCHAR(150),
    horario_funcionamento VARCHAR(200),
    atendimento TEXT,
    aberta BOOLEAN NOT NULL DEFAULT TRUE,
    servicos JSONB NOT NULL DEFAULT '[]'::jsonb,
    equipe JSONB NOT NULL DEFAULT '[]'::jsonb,
    especialidades JSONB NOT NULL DEFAULT '[]'::jsonb,
    descricao TEXT,
    imagem_url VARCHAR(500),
    nome_empresarial VARCHAR(180),
    cnpj VARCHAR(20),
    natureza_juridica VARCHAR(100),
    numero VARCHAR(30),
    complemento VARCHAR(180),
    dependencia VARCHAR(60),
    regional_saude VARCHAR(100),
    tipo_estabelecimento VARCHAR(150),
    subtipo_estabelecimento VARCHAR(150),
    gestao VARCHAR(60),
    classificacao_estabelecimento VARCHAR(180),
    tipo_estrutura VARCHAR(80),
    responsavel_tecnico VARCHAR(180),
    data_cadastrado DATE,
    atualizacao_base_local DATE,
    ultima_atualizacao_nacional DATE,
    coordenadas_aproximadas BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Compatibilidade com instalações que já tenham uma versão antiga da tabela ubs.
ALTER TABLE ubs
    ADD COLUMN IF NOT EXISTS cnes VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cep VARCHAR(12),
    ADD COLUMN IF NOT EXISTS atendimento TEXT,
    ADD COLUMN IF NOT EXISTS especialidades JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS imagem_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS nome_empresarial VARCHAR(180),
    ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
    ADD COLUMN IF NOT EXISTS natureza_juridica VARCHAR(100),
    ADD COLUMN IF NOT EXISTS numero VARCHAR(30),
    ADD COLUMN IF NOT EXISTS complemento VARCHAR(180),
    ADD COLUMN IF NOT EXISTS dependencia VARCHAR(60),
    ADD COLUMN IF NOT EXISTS regional_saude VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tipo_estabelecimento VARCHAR(150),
    ADD COLUMN IF NOT EXISTS subtipo_estabelecimento VARCHAR(150),
    ADD COLUMN IF NOT EXISTS gestao VARCHAR(60),
    ADD COLUMN IF NOT EXISTS classificacao_estabelecimento VARCHAR(180),
    ADD COLUMN IF NOT EXISTS tipo_estrutura VARCHAR(80),
    ADD COLUMN IF NOT EXISTS responsavel_tecnico VARCHAR(180),
    ADD COLUMN IF NOT EXISTS data_cadastrado DATE,
    ADD COLUMN IF NOT EXISTS atualizacao_base_local DATE,
    ADD COLUMN IF NOT EXISTS ultima_atualizacao_nacional DATE,
    ADD COLUMN IF NOT EXISTS coordenadas_aproximadas BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_ubs_bairro ON ubs(bairro);
CREATE INDEX IF NOT EXISTS idx_ubs_nome ON ubs(nome);
CREATE INDEX IF NOT EXISTS idx_ubs_cnes ON ubs(cnes);
CREATE INDEX IF NOT EXISTS idx_ubs_aberta ON ubs(aberta);
CREATE INDEX IF NOT EXISTS idx_ubs_coordenadas ON ubs(latitude, longitude);

CREATE OR REPLACE FUNCTION atualizar_ubs_data() RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ubs_atualizado ON ubs;
CREATE TRIGGER trg_ubs_atualizado
BEFORE UPDATE ON ubs
FOR EACH ROW EXECUTE FUNCTION atualizar_ubs_data();
INSERT INTO ubs (cnes, nome, endereco, bairro, cidade, uf, cep, horario_funcionamento) 
VALUES (
    '3453766', 
    'USF CHACARA ELDORADO', 
    'Rua Rogaciano Garcia Moreira, S/N', 
    'Chácara Eldorado', 
    'Três Lagoas', 
    'MS', 
    '79601-000', 
    'Segunda-Feira a Sexta-Feira, das 06:00 às 18:00'
);
