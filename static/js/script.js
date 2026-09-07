const map = L.map('leafletMap',{zoomControl:false,preferCanvas:true}).setView([-20.789,-51.708],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);

let ubsData=[], markers={}, userLayer=null, searchMode='address', activeServices=new Set();
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function markerIcon(active=true){return L.divIcon({className:'',html:`<div class="marker-pin ${active?'active':''}"><span class="cross">✚</span></div>`,iconSize:[30,30],iconAnchor:[15,30],popupAnchor:[0,-27]})}
function popup(u){
 const services=(u.servicos||[]).join(' · ')||'Não informado';
 const maps=u.latitude&&u.longitude?`https://www.google.com/maps/dir/?api=1&destination=${u.latitude},${u.longitude}`:'#';
 return `<div class="popup"><h3>${esc(u.nome)}</h3><p>📍 ${esc(u.endereco)}</p><p>☎ ${esc(u.telefone||'Não informado')}</p><p>🕒 ${esc(u.horario_funcionamento||'Não informado')}</p><p>🩺 ${esc(services)}</p><p class="popup-status ${u.aberta?'open':'closed'}">● ${u.aberta?'Unidade ativa':'Unidade inativa'}</p><div class="popup-actions"><a class="primary-action" href="${maps}" target="_blank" rel="noopener">Como chegar</a><button class="secondary-action" onclick="abrirDetalhes(${u.id})">Detalhes</button></div></div>`;
}
function clearMarkers(){Object.values(markers).forEach(m=>map.removeLayer(m));markers={}}
function drawMap(data,fit=false){clearMarkers();const points=[];data.forEach(u=>{if(u.latitude==null||u.longitude==null)return;const m=L.marker([u.latitude,u.longitude],{icon:markerIcon(u.aberta)}).addTo(map).bindPopup(popup(u));markers[u.id]=m;points.push([u.latitude,u.longitude]);});if(fit&&points.length){map.fitBounds(points,{padding:[45,45],maxZoom:14})}}
function renderList(data){
 $('resultCount').textContent=data.length;
 $('summaryText').textContent=`${data.length} unidade${data.length===1?'':'s'} exibida${data.length===1?'':'s'} no mapa`;
 const list=$('unitList');list.innerHTML='';
 if(!data.length){list.innerHTML='<div style="font-size:10px;color:#7b8998;padding:12px 3px">Nenhuma unidade encontrada para estes critérios.</div>';return}
 data.forEach(u=>{const card=document.createElement('article');card.className='unit-card';card.dataset.id=u.id;card.innerHTML=`<div class="unit-icon">✚</div><div><div class="unit-name">${esc(u.nome)}</div><div class="unit-meta">${esc(u.bairro||u.endereco||'Endereço não informado')}</div><div class="unit-status ${u.aberta?'open':'closed'}">● ${u.aberta?'Aberta/ativa':'Fechada/inativa'}</div></div>${u.distancia_km!=null?`<span class="distance">${u.distancia_km.toFixed(1)} km</span>`:''}`;card.onclick=()=>focusUnit(u);list.appendChild(card)})
}
function focusUnit(u){document.querySelectorAll('.unit-card').forEach(c=>c.classList.toggle('active',Number(c.dataset.id)===u.id));if(u.latitude!=null){map.flyTo([u.latitude,u.longitude],16,{duration:.55});markers[u.id]?.openPopup()}}
function filtered(){const text=$('searchInput').value.trim().toLowerCase();const open=$('openOnly').checked;return ubsData.filter(u=>{const hay=`${u.nome} ${u.bairro||''} ${u.endereco||''} ${u.cnes||''}`.toLowerCase();return (!text||hay.includes(text))&&(!open||u.aberta)&&[...activeServices].every(s=>(u.servicos||[]).includes(s))})}
function applyFilters(){const data=filtered();drawMap(data);renderList(data)}

async function load(){try{const r=await fetch('/api/ubs');if(!r.ok)throw new Error();ubsData=await r.json();drawMap(ubsData,true);renderList(ubsData)}catch(e){$('summaryText').textContent='Não foi possível carregar as unidades';$('unitList').innerHTML='<div style="font-size:10px;color:#d65353;padding:12px 3px">Verifique o Flask e o PostgreSQL.</div>'}}

async function geocodeAndNearest(query){
 $('searchHint').textContent='Localizando endereço...';
 try{const r=await fetch(`/api/geocode?endereco=${encodeURIComponent(query+', Três Lagoas, MS, Brasil')}`);const d=await r.json();if(!r.ok)throw new Error(d.erro);const point=[d.latitude,d.longitude];if(userLayer)map.removeLayer(userLayer);userLayer=L.marker(point,{icon:L.divIcon({className:'',html:'<div class="user-pin"></div>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map).bindPopup(`<b>Local pesquisado</b><br><small>${esc(d.display_name)}</small>`);map.flyTo(point,14,{duration:.6});const nr=await fetch(`/api/nearest?lat=${d.latitude}&lon=${d.longitude}`);const nearest=await nr.json();$('nearestBanner').classList.remove('hidden');$('nearestBanner').innerHTML=nearest.length?`<b>Mais próxima:</b> ${esc(nearest[0].nome)} · ${nearest[0].distancia_km.toFixed(1)} km`: 'Nenhuma UBS georreferenciada encontrada.';renderList(nearest);drawMap(nearest);$('summaryText').textContent='Resultado por proximidade';}catch(e){$('nearestBanner').classList.remove('hidden');$('nearestBanner').textContent=e.message||'Endereço não encontrado.';$('searchHint').textContent='Tente informar rua e número ou um CEP.'}}

$('searchBtn').onclick=()=>{const q=$('searchInput').value.trim();if(!q)return;searchMode==='address'?geocodeAndNearest(q):applyFilters()};
$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('searchBtn').click()});
$('searchInput').addEventListener('input',()=>{if(searchMode==='unit')applyFilters()});

document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');searchMode=tab.dataset.mode; $('searchLabel').textContent=searchMode==='address'?'Digite o CEP ou endereço de residência:':'Digite o nome da unidade';$('searchInput').placeholder=searchMode==='address'?'Ex: Rua Maracaju, 10':'Ex: UBS Vila Nova';$('searchHint').textContent=searchMode==='address'?'A busca por endereço encontra as UBS mais próximas.':'Pesquise pelo nome, bairro, endereço ou CNES.';$('searchInput').value='';$('nearestBanner').classList.add('hidden');drawMap(ubsData);renderList(ubsData)});

document.querySelectorAll('.chip').forEach(chip=>chip.onclick=()=>{const s=chip.dataset.service;if(activeServices.has(s)){activeServices.delete(s);chip.classList.remove('active')}else{activeServices.add(s);chip.classList.add('active')}applyFilters()});
$('openOnly').onchange=applyFilters;
$('clearFilters').onclick=()=>{activeServices.clear();document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));$('openOnly').checked=false;$('searchInput').value='';$('nearestBanner').classList.add('hidden');drawMap(ubsData,true);renderList(ubsData)};
$('zoomIn').onclick=()=>map.zoomIn();$('zoomOut').onclick=()=>map.zoomOut();$('fitMap').onclick=()=>drawMap(filtered(),true);
$('locationBtn').onclick=()=>{if(!navigator.geolocation){alert('Geolocalização não disponível neste navegador.');return}navigator.geolocation.getCurrentPosition(async p=>{const {latitude,longitude}=p.coords;if(userLayer)map.removeLayer(userLayer);userLayer=L.marker([latitude,longitude],{icon:L.divIcon({className:'',html:'<div class="user-pin"></div>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map).bindPopup('Você está aqui').openPopup();map.flyTo([latitude,longitude],14,{duration:.6});const r=await fetch(`/api/nearest?lat=${latitude}&lon=${longitude}`);const nearest=await r.json();$('nearestBanner').classList.remove('hidden');$('nearestBanner').innerHTML=nearest.length?`<b>Mais próxima:</b> ${esc(nearest[0].nome)} · ${nearest[0].distancia_km.toFixed(1)} km`:'';renderList(nearest);drawMap(nearest)},()=>alert('Não foi possível acessar sua localização.'))};
$('fullscreenBtn').onclick=()=>{const el=$('.map-wrap');if(document.fullscreenElement)document.exitFullscreen();else el.requestFullscreen?.()};

window.abrirDetalhes=async id=>{const u=ubsData.find(x=>x.id===id);if(!u)return;alert(`${u.nome}\n\n${u.endereco}\n${u.telefone||''}\n${u.horario_funcionamento||''}\n\nServiços: ${(u.servicos||[]).join(', ')||'Não informado'}`)};

const modal=$('modal');$('aboutBtn').onclick=()=>modal.classList.remove('hidden');$('closeModal').onclick=()=>modal.classList.add('hidden');modal.onclick=e=>{if(e.target===modal)modal.classList.add('hidden')};
load();
