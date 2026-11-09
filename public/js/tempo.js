// Página /tempo/: previsão ao vivo de todas as cidades
import { montarMenu, iniciarPagina } from './comum.js';
import { esc } from './render.js';
import { REGIOES, CIDADES_TEMPO, buscarTempo, descrever, direcaoVento, nivelUV } from './tempo-dados.js';

iniciarPagina();
montarMenu('tempo');

const grade = document.getElementById('tempo-grade');
const detalhe = document.getElementById('tempo-detalhe');
const abas = document.getElementById('tempo-abas');
const status = document.getElementById('tempo-status');

const params = new URLSearchParams(location.search);
let cidadeAtual = params.get('cidade') || 'ubatuba';
let regiaoAtual = CIDADES_TEMPO.find((c) => c.slug === cidadeAtual)?.regiao || 'litoral';
let dados = [];

const r0 = (n) => (n == null ? '–' : Math.round(n));
const diaSemana = (iso, i) => (i === 0 ? 'Hoje' : i === 1 ? 'Amanhã'
  : new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));
const hora = (iso) => iso.slice(11, 16);

function montarAbas() {
  abas.innerHTML = REGIOES.map((r) =>
    `<button type="button" role="tab" aria-selected="${r.slug === regiaoAtual}" data-regiao="${r.slug}">${r.nome}</button>`).join('');
}

function cartao(c) {
  const a = c.atual, d = c.diario;
  const { texto, icone } = descrever(a.weather_code, a.is_day);
  return `
  <button type="button" class="tempo-card ${c.slug === cidadeAtual ? 'ativo' : ''}" data-cidade="${c.slug}">
    <span class="tempo-card-cidade">${esc(c.nome)}</span>
    <span class="tempo-card-agora"><span class="tempo-icone" aria-hidden="true">${icone}</span><strong>${r0(a.temperature_2m)}°</strong></span>
    <span class="tempo-card-texto">${texto}</span>
    <span class="tempo-card-linha"><span>↑ ${r0(d.temperature_2m_max[0])}° ↓ ${r0(d.temperature_2m_min[0])}°</span><span>💧 ${r0(d.precipitation_probability_max[0])}%</span></span>
    ${c.mar ? `<span class="tempo-card-mar">🌊 ${c.mar.ondas?.toFixed(1).replace('.', ',') ?? '–'} m · água ${r0(c.mar.agua)}°</span>` : ''}
  </button>`;
}

function painel(c) {
  const a = c.atual, d = c.diario, h = c.horario;
  const { texto, icone } = descrever(a.weather_code, a.is_day);
  const dias = d.time.map((t, i) => {
    const x = descrever(d.weather_code[i], 1);
    return `<li><span class="dia">${diaSemana(t, i)}</span><span class="ic" title="${x.texto}">${x.icone}</span>
      <span class="chuva">💧 ${r0(d.precipitation_probability_max[i])}%</span>
      <span class="max">${r0(d.temperature_2m_max[i])}°</span><span class="min">${r0(d.temperature_2m_min[i])}°</span></li>`;
  }).join('');
  const horas = h ? h.time.map((t, i) => {
    const x = descrever(h.weather_code[i], h.is_day[i]);
    return `<li><span>${i === 0 ? 'Agora' : hora(t)}</span><span class="ic" title="${x.texto}">${x.icone}</span><strong>${r0(h.temperature_2m[i])}°</strong><small>💧${r0(h.precipitation_probability[i])}%</small></li>`;
  }).join('') : '';

  return `
  <div class="tempo-painel-topo">
    <div>
      <h2>${esc(c.nome)}</h2>
      <p class="tempo-painel-texto">${texto} · sensação de ${r0(a.apparent_temperature)}°</p>
    </div>
    <div class="tempo-painel-agora"><span aria-hidden="true">${icone}</span>${r0(a.temperature_2m)}°</div>
  </div>
  <ul class="tempo-info">
    <li><small>Vento</small><strong>${r0(a.wind_speed_10m)} km/h ${direcaoVento(a.wind_direction_10m)}</strong><small>rajadas ${r0(a.wind_gusts_10m)} km/h</small></li>
    <li><small>Umidade</small><strong>${r0(a.relative_humidity_2m)}%</strong></li>
    <li><small>Chuva hoje</small><strong>${(d.precipitation_sum[0] ?? 0).toFixed(1).replace('.', ',')} mm</strong><small>chance ${r0(d.precipitation_probability_max[0])}%</small></li>
    <li><small>Índice UV</small><strong>${r0(d.uv_index_max[0])}</strong><small>${nivelUV(d.uv_index_max[0])}</small></li>
    <li><small>Sol</small><strong>☀ ${hora(d.sunrise[0])}</strong><small>pôr ${hora(d.sunset[0])}</small></li>
    ${c.mar ? `<li class="mar"><small>Mar</small><strong>🌊 ${c.mar.ondas?.toFixed(1).replace('.', ',') ?? '–'} m</strong><small>água ${r0(c.mar.agua)}° · período ${r0(c.mar.periodo)} s</small></li>` : ''}
  </ul>
  ${horas ? `<h3>Próximas 24 horas</h3><ul class="tempo-horas">${horas}</ul>` : ''}
  <h3>Próximos 7 dias</h3>
  <ul class="tempo-dias">${dias}</ul>`;
}

function desenhar() {
  montarAbas();
  const lista = dados.filter((c) => c.regiao === regiaoAtual);
  grade.innerHTML = lista.map(cartao).join('');
  const c = dados.find((x) => x.slug === cidadeAtual) || lista[0];
  if (c) detalhe.innerHTML = painel(c);
}

async function carregar() {
  try {
    dados = await buscarTempo();
    status.textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) + ' · atualiza sozinho a cada 10 min';
    desenhar();
  } catch (e) {
    console.error(e);
    if (!dados.length) grade.innerHTML = '<div class="vazio">Não foi possível carregar a previsão agora. Tente de novo em alguns minutos.</div>';
    status.textContent = 'Sem conexão com o serviço de previsão.';
  }
}

abas.addEventListener('click', (e) => {
  const b = e.target.closest('[data-regiao]');
  if (!b) return;
  regiaoAtual = b.dataset.regiao;
  cidadeAtual = CIDADES_TEMPO.find((c) => c.regiao === regiaoAtual).slug;
  history.replaceState(null, '', '?cidade=' + cidadeAtual);
  desenhar();
});

grade.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cidade]');
  if (!b) return;
  cidadeAtual = b.dataset.cidade;
  history.replaceState(null, '', '?cidade=' + cidadeAtual);
  desenhar();
  if (innerWidth < 960) detalhe.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

carregar();
setInterval(carregar, 10 * 60 * 1000);
