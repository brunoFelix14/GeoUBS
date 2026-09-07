-- Consultas úteis do GeoUBS

-- Todas as unidades
SELECT * FROM ubs ORDER BY nome;

-- Somente unidades ativas
SELECT id, nome, bairro, endereco, telefone
FROM ubs
WHERE aberta = TRUE
ORDER BY nome;

-- Unidades por bairro
SELECT bairro, COUNT(*) AS quantidade
FROM ubs
GROUP BY bairro
ORDER BY quantidade DESC, bairro;

-- Unidades com determinado serviço
SELECT id, nome, bairro, servicos
FROM ubs
WHERE servicos @> '["Vacinação"]'::jsonb
ORDER BY nome;

-- Unidades com coordenadas cadastradas
SELECT id, nome, latitude, longitude
FROM ubs
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ORDER BY nome;
