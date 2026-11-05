-- Confira o banco e a quantidade de unidades cadastradas.
SELECT current_database() AS banco_atual;
SELECT COUNT(*) AS total_ubs FROM public.ubs;

-- Liste as unidades, endereços e coordenadas que alimentam o mapa.
SELECT id, nome, cnes, endereco, bairro, cep, latitude, longitude,
       coordenadas_aproximadas
FROM public.ubs
ORDER BY nome;

-- Confira unidades sem coordenadas.
SELECT nome, endereco, bairro
FROM public.ubs
WHERE latitude IS NULL OR longitude IS NULL
ORDER BY nome;
