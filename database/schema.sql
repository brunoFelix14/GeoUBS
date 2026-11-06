DROP TABLE IF EXISTS ubs CASCADE;

CREATE TABLE ubs (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
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
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ubs_bairro ON ubs(bairro);
CREATE INDEX idx_ubs_nome ON ubs(nome);
CREATE INDEX idx_ubs_cnes ON ubs(cnes);
CREATE INDEX idx_ubs_aberta ON ubs(aberta);
CREATE INDEX idx_ubs_coordenadas ON ubs(latitude, longitude);

CREATE OR REPLACE FUNCTION atualizar_ubs_data() RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ubs_atualizado
BEFORE UPDATE ON ubs
FOR EACH ROW EXECUTE FUNCTION atualizar_ubs_data();
