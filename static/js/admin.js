'use strict';
let unidades = [];
const $ = (id) => document.getElementById(id);
const split = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function showMessage(text, type = 'success') {
    $('message').className = type;
    $('message').textContent = text;
    window.setTimeout(() => { $('message').textContent = ''; }, 5000);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    let body;
    try { body = await response.json(); } catch (_) { body = {}; }
    if (!response.ok) throw new Error(body.detalhe || body.erro || `Erro HTTP ${response.status}`);
    return body;
}

async function carregar() {
    $('adminList').innerHTML = '<p>Carregando unidades…</p>';
    try {
        const data = await fetchJson('/api/ubs', { cache: 'no-store' });
        unidades = Array.isArray(data) ? data : [];
        render();
        await carregarEstatisticas();
    } catch (error) {
        $('adminList').innerHTML = `<p class="error-message">Não foi possível carregar: ${escapeHtml(error.message)}</p>`;
        $('stats').innerHTML = '';
    }
}

async function carregarEstatisticas() {
    try {
        const data = await fetchJson('/api/estatisticas', { cache: 'no-store' });
        $('stats').innerHTML = `
            <div class="stat"><b>${Number(data.resumo?.total || 0)}</b><span>Total de UBS</span></div>
            <div class="stat"><b>${Number(data.resumo?.ativas || 0)}</b><span>Unidades ativas</span></div>`;
    } catch (_) {
        $('stats').innerHTML = `<div class="stat"><b>${unidades.length}</b><span>Unidades carregadas</span></div>`;
    }
}

function render() {
    $('adminList').innerHTML = '';
    if (!unidades.length) {
        $('adminList').innerHTML = '<p>Nenhuma UBS cadastrada. Execute primeiro o arquivo 1_CONFIGURAR_BANCO.bat.</p>';
        return;
    }
    unidades.forEach((ubs) => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <h3>${escapeHtml(ubs.nome)}</h3>
            <p>${escapeHtml(ubs.bairro || 'Sem bairro')} · ${escapeHtml(ubs.endereco || 'Sem endereço')}</p>
            <p>${ubs.cnes ? `CNES ${escapeHtml(ubs.cnes)} · ` : ''}${escapeHtml(ubs.telefone || 'Sem telefone')}</p>
            <div class="item-actions"><button class="edit" type="button">Editar</button><button class="delete" type="button">Excluir</button></div>`;
        item.querySelector('.edit').addEventListener('click', () => editar(ubs));
        item.querySelector('.delete').addEventListener('click', () => excluir(ubs.id, ubs.nome));
        $('adminList').appendChild(item);
    });
}

function editar(ubs) {
    $('formTitle').textContent = 'Editar UBS';
    $('id').value = ubs.id ?? '';
    $('nome').value = ubs.nome || '';
    $('cnes').value = ubs.cnes || '';
    $('endereco').value = ubs.endereco || '';
    $('bairro').value = ubs.bairro || '';
    $('cep').value = ubs.cep || '';
    $('latitude').value = ubs.latitude ?? '';
    $('longitude').value = ubs.longitude ?? '';
    $('telefone').value = ubs.telefone || '';
    $('email').value = ubs.email || '';
    $('horario').value = ubs.horario_funcionamento || '';
    $('atendimento').value = ubs.atendimento || '';
    $('servicos').value = (ubs.servicos || []).join(', ');
    $('equipe').value = (ubs.equipe || []).join(', ');
    $('especialidades').value = (ubs.especialidades || []).join(', ');
    $('descricao').value = ubs.descricao || '';
    $('imagem_url').value = ubs.imagem_url || '';
    $('aberta').checked = Boolean(ubs.aberta);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpar() {
    $('ubsForm').reset();
    $('id').value = '';
    $('aberta').checked = true;
    $('formTitle').textContent = 'Cadastrar nova UBS';
}

function dadosDoFormulario() {
    const latitude = $('latitude').value.trim();
    const longitude = $('longitude').value.trim();
    return {
        nome: $('nome').value.trim(),
        cnes: $('cnes').value.trim(),
        endereco: $('endereco').value.trim(),
        bairro: $('bairro').value.trim(),
        cep: $('cep').value.trim(),
        cidade: 'Três Lagoas',
        estado: 'MS',
        latitude: latitude === '' ? null : Number(latitude),
        longitude: longitude === '' ? null : Number(longitude),
        telefone: $('telefone').value.trim(),
        email: $('email').value.trim(),
        horario_funcionamento: $('horario').value.trim(),
        atendimento: $('atendimento').value.trim(),
        aberta: $('aberta').checked,
        servicos: split($('servicos').value),
        equipe: split($('equipe').value),
        especialidades: split($('especialidades').value),
        descricao: $('descricao').value.trim(),
        imagem_url: $('imagem_url').value.trim()
    };
}

$('ubsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('id').value;
    const button = $('ubsForm').querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Salvando…';
    try {
        await fetchJson(id ? `/api/ubs/${id}` : '/api/ubs', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosDoFormulario())
        });
        showMessage(id ? 'UBS atualizada com sucesso!' : 'UBS cadastrada com sucesso!');
        limpar();
        await carregar();
    } catch (error) {
        showMessage(error.message || 'Erro ao salvar UBS.', 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Salvar UBS';
    }
});

async function excluir(id, nome) {
    if (!confirm(`Tem certeza de que deseja excluir "${nome}"?`)) return;
    try {
        await fetchJson(`/api/ubs/${id}`, { method: 'DELETE' });
        showMessage('UBS removida.');
        await carregar();
    } catch (error) {
        showMessage(error.message || 'Não foi possível excluir.', 'error');
    }
}

$('geocodeBtn').addEventListener('click', async () => {
    const address = $('endereco').value.trim();
    if (!address) { showMessage('Digite o endereço primeiro.', 'error'); return; }
    const button = $('geocodeBtn');
    button.disabled = true;
    button.textContent = 'Buscando…';
    try {
        const data = await fetchJson(`/api/geocode?endereco=${encodeURIComponent(address + ', Três Lagoas, MS, Brasil')}`);
        $('latitude').value = data.latitude;
        $('longitude').value = data.longitude;
        showMessage('Coordenadas encontradas. Confira a posição antes de salvar.');
    } catch (error) {
        showMessage(error.message || 'Endereço não encontrado. Preencha as coordenadas manualmente.', 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Localizar';
    }
});

$('cancelBtn').addEventListener('click', limpar);
$('reloadBtn').addEventListener('click', carregar);
carregar();
