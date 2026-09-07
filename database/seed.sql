INSERT INTO ubs
(nome, cnes, endereco, bairro, cidade, estado, cep, latitude, longitude, telefone, email,
 horario_funcionamento, atendimento, aberta, servicos, equipe, especialidades, descricao)
VALUES
(
 'UBS Vila Nova', 'DEMO-001', 'Vila Nova, Três Lagoas - MS', 'Vila Nova', 'Três Lagoas', 'MS', '79600-000',
 -20.7909, -51.7020, '(67) 0000-0001', 'ubs.vilanova@exemplo.ms.gov.br',
 'Segunda a sexta, 07:00 às 17:00', 'Atenção primária e acompanhamento da população do território.', TRUE,
 '["Vacinação","Farmácia","Clínico Geral"]', '["Médicos","Enfermeiros","Técnicos de enfermagem"]', '["Clínica médica"]',
 'Registro demonstrativo. Substitua pelos dados oficiais.'
),
(
 'UBS Centro', 'DEMO-002', 'Centro, Três Lagoas - MS', 'Centro', 'Três Lagoas', 'MS', '79600-000',
 -20.7870, -51.7050, '(67) 0000-0002', 'ubs.centro@exemplo.ms.gov.br',
 'Segunda a sexta, 07:00 às 17:00', 'Atenção primária e serviços básicos de saúde.', TRUE,
 '["Vacinação","Clínico Geral","Telemedicina"]', '["Médicos","Enfermeiros"]', '["Cardiologia","Clínica médica"]',
 'Registro demonstrativo.'
),
(
 'UBS Parque São Carlos', 'DEMO-003', 'Parque São Carlos, Três Lagoas - MS', 'Parque São Carlos', 'Três Lagoas', 'MS', '79610-000',
 -20.7750, -51.7085, '(67) 0000-0003', 'ubs.parquesaocarlos@exemplo.ms.gov.br',
 'Segunda a sexta, 07:00 às 17:00', 'Atendimento de saúde da família e prevenção.', TRUE,
 '["Vacinação","Enfermagem","Saúde da família"]', '["Médicos","Enfermeiros","Agentes comunitários"]', '["Pediatria","Clínica médica"]',
 'Registro demonstrativo.'
);
