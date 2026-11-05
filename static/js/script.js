/* GeoUBS — frontend do mapa. Os dados são carregados da API Flask /api/ubs. */
'use strict';

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const map = L.map('leafletMap', {
    zoomControl: false,
    preferCanvas: true
}).setView([-20.789, -51.708], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let ubsData = [];
let markers = {};
let userLayer = null;
let selectedServiceFilters = new Set();

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === '') return [];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return value.split(',').map((item) => item.trim()).filter(Boolean);
        }
    }
    return [];
}

function asNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeUbs(raw) {
    let active = raw.aberta;
    if (typeof active === 'string') {
        active = ['true', 't', '1', 'sim', 'yes'].includes(active.toLowerCase());
    } else {
        active = active === true || active === 1;
    }

    return {
        ...raw,
        id: asNumber(raw.id) ?? raw.id,
        nome: raw.nome || 'UBS sem nome',
        cnes: raw.cnes || '',
        endereco: raw.endereco || 'Endereço não informado',
        bairro: raw.bairro || '',
        cep: raw.cep || '',
        latitude: asNumber(raw.latitude ?? raw.lat),
        longitude: asNumber(raw.longitude ?? raw.lon ?? raw.lng),
        telefone: raw.telefone || '',
        email: raw.email || '',
        horario_funcionamento: raw.horario_funcionamento || 'Não informado',
        atendimento: raw.atendimento || '',
        aberta: Boolean(active),
        servicos: asArray(raw.servicos),
        equipe: asArray(raw.equipe),
        especialidades: asArray(raw.especialidades),
        descricao: raw.descricao || ''
    };
}

function hasCoordinates(ubs) {
    return Number.isFinite(ubs.latitude) &&
        Number.isFinite(ubs.longitude) &&
        ubs.latitude >= -90 && ubs.latitude <= 90 &&
        ubs.longitude >= -180 && ubs.longitude <= 180;
}

function markerIcon(active = true) {
    return L.divIcon({
        className: '',
        html: `<div class="custom-marker ${active ? '' : 'closed-marker'}"><span class="marker-cross">✚</span></div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -35]
    });
}

function makePopup(ubs) {
    const services = ubs.servicos.length ? ubs.servicos.join(' · ') : 'Não informado';
    const specialties = ubs.especialidades.length ? ubs.especialidades.join(' · ') : '';
    const coordinates = hasCoordinates(ubs);
    const mapsUrl = coordinates
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ubs.latitude},${ubs.longitude}`)}`
        : '#';

    return `
        <div class="popup">
            <h3>${escapeHtml(ubs.nome)}</h3>
            <p>📍 ${escapeHtml(ubs.endereco)}${ubs.bairro ? `, ${escapeHtml(ubs.bairro)}` : ''}</p>
            ${ubs.cep ? `<p>✉ CEP: ${escapeHtml(ubs.cep)}</p>` : ''}
            ${ubs.cnes ? `<p>🪪 CNES: ${escapeHtml(ubs.cnes)}</p>` : ''}
            <p>☎ ${escapeHtml(ubs.telefone || 'Telefone não informado')}</p>
            <p>🕒 ${escapeHtml(ubs.horario_funcionamento)}</p>
            <p>🩺 ${escapeHtml(services)}</p>
            ${specialties ? `<p>Especialidades: ${escapeHtml(specialties)}</p>` : ''}
            <p class="${ubs.aberta ? 'open' : 'closed'}">● ${ubs.aberta ? 'Unidade ativa' : 'Unidade inativa'}</p>
            ${ubs.coordenadas_aproximadas ? '<p style="color:#a66a00;font-size:10px">Localização aproximada — confirme antes de se deslocar.</p>' : ''}
            <div class="popup-actions">
                <a class="primary-action" href="${mapsUrl}" ${coordinates ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>Como chegar</a>
                <button class="secondary-action" type="button" onclick="window.abrirDetalhes(${Number(ubs.id) || 0})">Detalhes</button>
            </div>
        </div>`;
}

function clearMarkers() {
    Object.values(markers).forEach((marker) => map.removeLayer(marker));
    markers = {};
}

function drawMap(data, fit = false) {
    clearMarkers();
    const points = [];

    data.forEach((ubs) => {
        if (!hasCoordinates(ubs)) {
            console.warn('[GeoUBS] Coordenadas ausentes ou inválidas:', ubs.nome, ubs.latitude, ubs.longitude);
            return;
        }
        const marker = L.marker([ubs.latitude, ubs.longitude], {
            icon: markerIcon(ubs.aberta),
            title: ubs.nome,
            alt: ubs.nome,
            riseOnHover: true
        }).addTo(map);
        marker.bindPopup(makePopup(ubs), { maxWidth: 330 });
        markers[String(ubs.id)] = marker;
        points.push([ubs.latitude, ubs.longitude]);
    });

    if (fit && points.length > 1) {
        map.fitBounds(points, { padding: [50, 50], maxZoom: 14 });
    } else if (fit && points.length === 1) {
        map.setView(points[0], 15);
    }

    window.setTimeout(() => map.invalidateSize(), 120);
    console.info(`[GeoUBS] ${data.length} registros recebidos; ${points.length} marcadores desenhados.`);
    return points.length;
}

function renderList(data) {
    const list = $('unitList');
    if (!list) return;
    $('resultCount').textContent = String(data.length);
    $('summaryText').textContent = `${data.length} unidade${data.length === 1 ? '' : 's'} exibida${data.length === 1 ? '' : 's'} no mapa`;
    list.innerHTML = '';

    if (!data.length) {
        list.innerHTML = '<p class="empty-state">Nenhuma unidade encontrada com esses critérios.</p>';
        return;
    }

    data.forEach((ubs) => {
        const card = document.createElement('article');
        card.className = 'unit-card';
        card.dataset.id = String(ubs.id);
        const address = [ubs.bairro, ubs.endereco].filter(Boolean).join(' · ');
        card.innerHTML = `
            <div class="unit-icon">✚</div>
            <div class="unit-info">
                <div class="unit-name">${escapeHtml(ubs.nome)}</div>
                <div class="unit-meta">${escapeHtml(address || 'Endereço não informado')}</div>
                ${ubs.cnes ? `<div class="unit-meta">CNES ${escapeHtml(ubs.cnes)}</div>` : ''}
                <div class="status ${ubs.aberta ? 'open' : 'closed'}">● ${ubs.aberta ? 'Unidade ativa' : 'Unidade inativa'}</div>
                ${!hasCoordinates(ubs) ? '<div class="unit-meta missing-coords">Localização não cadastrada</div>' : ''}
            </div>`;
        card.addEventListener('click', () => focusUnit(ubs));
        list.appendChild(card);
    });
}

function filteredUnits() {
    const query = ($('searchInput')?.value || '').trim().toLocaleLowerCase('pt-BR');
    const checkedFilters = [...document.querySelectorAll('[data-filter]:checked')].map((item) => item.dataset.filter);

    return ubsData.filter((ubs) => {
        const searchable = `${ubs.nome} ${ubs.cnes} ${ubs.bairro} ${ubs.endereco} ${ubs.cep}`.toLocaleLowerCase('pt-BR');
        const textMatches = !query || searchable.includes(query);
        const filtersMatch = checkedFilters.every((filter) => {
            if (filter === 'open') return ubs.aberta;
            return ubs.servicos.includes(filter);
        });
        return textMatches && filtersMatch;
    });
}

function applyFilters() {
    const data = filteredUnits();
    drawMap(data, false);
    renderList(data);
}

function focusUnit(ubs) {
    document.querySelectorAll('.unit-card').forEach((card) => {
        card.classList.toggle('active', card.dataset.id === String(ubs.id));
    });
    if (!hasCoordinates(ubs)) {
        alert('Esta UBS ainda não possui coordenadas válidas cadastradas.');
        return;
    }
    map.flyTo([ubs.latitude, ubs.longitude], 16, { duration: 0.55 });
    markers[String(ubs.id)]?.openPopup();
}

function showApiError(message) {
    $('summaryText').textContent = 'Não foi possível carregar as unidades';
    $('unitList').innerHTML = `<p class="error-state">${escapeHtml(message)}<br><br>Confira o PostgreSQL e a rota <code>/api/ubs</code>.</p>`;
    console.error('[GeoUBS]', message);
}

async function loadUnits() {
    $('summaryText').textContent = 'Carregando dados do PostgreSQL…';
    try {
        const response = await fetch('/api/ubs', {
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.detalhe || payload.erro || `Erro HTTP ${response.status}`);
        }
        if (!Array.isArray(payload)) {
            throw new Error(payload.erro || 'A API não retornou uma lista de UBS.');
        }
        ubsData = payload.map(normalizeUbs);
        const count = drawMap(ubsData, true);
        renderList(ubsData);
        if (!ubsData.length) {
            showApiError('A API respondeu, mas a tabela está vazia. Execute 1_CONFIGURAR_BANCO.bat.');
        } else if (count === 0) {
            $('summaryText').textContent = `${ubsData.length} UBS carregadas, mas nenhuma possui coordenadas válidas.`;
        } else {
            $('summaryText').textContent = `${ubsData.length} UBS carregadas · ${count} marcadores no mapa`;
        }
    } catch (error) {
        showApiError(error.message || 'Erro ao consultar Flask/PostgreSQL.');
    }
}

async function showNearest(latitude, longitude) {
    const response = await fetch(`/api/nearest?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.erro || payload.detalhe || 'Falha ao buscar as UBS mais próximas.');
    return Array.isArray(payload) ? payload.map(normalizeUbs) : [];
}

$('searchInput').addEventListener('input', applyFilters);
document.querySelectorAll('[data-filter]').forEach((input) => input.addEventListener('change', applyFilters));
$('clearFilters').addEventListener('click', () => {
    $('searchInput').value = '';
    document.querySelectorAll('[data-filter]').forEach((input) => { input.checked = false; });
    applyFilters();
});
$('zoomIn').addEventListener('click', () => map.zoomIn());
$('zoomOut').addEventListener('click', () => map.zoomOut());
$('fitMap').addEventListener('click', () => drawMap(filteredUnits(), true));

$('locationBtn').addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('A geolocalização não está disponível neste navegador.');
        return;
    }
    $('locationBtn').disabled = true;
    $('locationBtn').textContent = 'Localizando…';
    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const { latitude, longitude } = position.coords;
            if (userLayer) map.removeLayer(userLayer);
            userLayer = L.circleMarker([latitude, longitude], {
                radius: 8, color: '#ffffff', weight: 3,
                fillColor: '#2563eb', fillOpacity: 1
            }).addTo(map).bindPopup('Você está aqui').openPopup();
            map.flyTo([latitude, longitude], 14, { duration: 0.6 });
            const nearest = await showNearest(latitude, longitude);
            renderList(nearest);
            drawMap(nearest, true);
            $('summaryText').textContent = nearest.length
                ? `Mostrando ${nearest.length} UBS mais próximas de você`
                : 'Nenhuma UBS georreferenciada encontrada.';
        } catch (error) {
            alert(error.message || 'Não foi possível consultar as UBS próximas.');
        } finally {
            $('locationBtn').disabled = false;
            $('locationBtn').innerHTML = '<span>◎</span> Usar minha localização';
        }
    }, () => {
        $('locationBtn').disabled = false;
        $('locationBtn').innerHTML = '<span>◎</span> Usar minha localização';
        alert('Não foi possível acessar sua localização. Permita o acesso no navegador e tente novamente.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
});

$('fullscreenBtn')?.addEventListener('click', () => {
    const mapWrap = document.querySelector('.map-area');
    if (!mapWrap) return;
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (mapWrap.requestFullscreen) {
        mapWrap.requestFullscreen();
    }
    window.setTimeout(() => map.invalidateSize(), 200);
});

document.addEventListener('fullscreenchange', () => window.setTimeout(() => map.invalidateSize(), 150));

window.abrirDetalhes = (id) => {
    const ubs = ubsData.find((item) => String(item.id) === String(id));
    if (!ubs) return;
    const lines = [
        ubs.nome,
        `CNES: ${ubs.cnes || 'Não informado'}`,
        `Endereço: ${ubs.endereco || 'Não informado'}`,
        `Bairro: ${ubs.bairro || 'Não informado'}`,
        `CEP: ${ubs.cep || 'Não informado'}`,
        `Telefone: ${ubs.telefone || 'Não informado'}`,
        `E-mail: ${ubs.email || 'Não informado'}`,
        `Funcionamento: ${ubs.horario_funcionamento || 'Não informado'}`,
        `Serviços: ${ubs.servicos.join(', ') || 'Não informado'}`,
        `Equipe: ${ubs.equipe.join(', ') || 'Não informado'}`,
        `Especialidades: ${ubs.especialidades.join(', ') || 'Não informado'}`,
        `Atendimento: ${ubs.atendimento || 'Não informado'}`,
        `Nome empresarial: ${ubs.nome_empresarial || 'Não informado'}`,
        `CNPJ: ${ubs.cnpj || 'Não informado'}`,
        `Natureza jurídica: ${ubs.natureza_juridica || 'Não informado'}`,
        `Número: ${ubs.numero || 'Não informado'}`,
        `Complemento: ${ubs.complemento || 'Não informado'}`,
        `Dependência: ${ubs.dependencia || 'Não informado'}`,
        `Regional de saúde: ${ubs.regional_saude || 'Não informado'}`,
        `Tipo de estabelecimento: ${ubs.tipo_estabelecimento || 'Não informado'}`,
        `Subtipo: ${ubs.subtipo_estabelecimento || 'Não informado'}`,
        `Gestão: ${ubs.gestao || 'Não informado'}`,
        `Classificação: ${ubs.classificacao_estabelecimento || 'Não informado'}`,
        `Tipo de estrutura: ${ubs.tipo_estrutura || 'Não informado'}`,
        `Responsável técnico: ${ubs.responsavel_tecnico || 'Não informado'}`,
        `Data de cadastro: ${ubs.data_cadastrado || 'Não informado'}`,
        `Atualização da base local: ${ubs.atualizacao_base_local || 'Não informado'}`,
        `Última atualização nacional: ${ubs.ultima_atualizacao_nacional || 'Não informado'}`,
        `Descrição: ${ubs.descricao || 'Não informado'}`,
        ubs.coordenadas_aproximadas ? 'Observação: as coordenadas são aproximadas e devem ser conferidas.' : ''
    ].filter(Boolean);
    alert(lines.join('\n'));
};

const modal = $('modal');
$('aboutBtn').addEventListener('click', () => modal.classList.remove('hidden'));
$('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.classList.add('hidden');
});

const menuButton = $('menuBtn');
menuButton?.addEventListener('click', () => {
    $('sidebar').classList.toggle('sidebar-open');
});

loadUnits();
window.addEventListener('resize', () => map.invalidateSize());
