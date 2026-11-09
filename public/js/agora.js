// Faixa "Agora no Litoral" no topo da página inicial: tempo, mar, maré, lua e sol — tudo ao vivo.
import { CIDADES_TEMPO, buscarTempo, descrever } from './tempo-dados.js';
import { buscarSurf, buscarMares, faseLua, agoraSP, textoNota } from './mar-dados.js';
import { curvaMare, estrelas, metros, hora, proximaMare } from './mar-render.js';
import { esc } from './render.js';

const LITORAL = CIDADES_TEMPO.filter((c) => c.mar);
let cidade = lerCidade() || 'ubatuba';
let tempo = [], mares = [], surf = [];

function lerCidade() { try { return localStorage.getItem('cidade-litoral'); } catch { return null; } }
function salvarCidade(s) { try { localStorage.setItem('cidade-litoral', s); } catch { /* sem armazenamento */ } }
const r0 = (n) => (n == null ? '–' : Math.round(n));

function desenhar() {
  const sec = document.getElementById('agora');
  const i = LITORAL.findIndex((c) => c.slug === cidade);
  const t = tempo[i], m = mares[i];
  const agora = agoraSP();
  const hoje = agora.slice(0, 10);

  document.getElementById('agora-cidades').innerHTML = LITORAL.map((c) =>
    `<button type="button" data-cidade="${c.slug}" aria-pressed="${c.slug === cidade}">${esc(c.nome)}</button>`).join('');

  const blocos = [];
  if (t) {
    const { texto, icone } = descrever(t.atual.weather_code, t.atual.is_day);
    blocos.push(`<a class="agora-bloco agora-tempo" href="/tempo/?cidade=${t.slug}">
      <small>Tempo agora</small>
      <span class="agora-grande"><span aria-hidden="true">${icone}</span>${r0(t.atual.temperature_2m)}°</span>
      <span>${texto}</span>
      <span class="agora-linha">↑ ${r0(t.diario.temperature_2m_max[0])}° ↓ ${r0(t.diario.temperature_2m_min[0])}° · 💧 ${r0(t.diario.precipitation_probability_max[0])}%</span>
      <span class="agora-mais">Previsão 7 dias ›</span></a>`);
  }
  if (t?.mar || surf.length) {
    const melhor = [...surf].sort((a, b) => (b.atual.nota ?? 0) - (a.atual.nota ?? 0))[0];
    blocos.push(`<a class="agora-bloco agora-mar" href="/mar/">
      <small>Mar</small>
      ${t?.mar ? `<span class="agora-grande"><span aria-hidden="true">🌊</span>${metros(t.mar.ondas)} m</span>
      <span>Água a ${r0(t.mar.agua)}° · ondas de ${r0(t.mar.periodo)} s</span>` : ''}
      ${melhor ? `<span class="agora-linha">🏄 Melhor agora: <b>${esc(melhor.nome)}</b> ${estrelas(melhor.atual.nota)}</span>` : ''}
      <span class="agora-mais">Surf nas praias ›</span></a>`);
  }
  if (m) {
    const prox = proximaMare(m.extremos, agora);
    const depois = prox && m.extremos[m.extremos.indexOf(prox) + 1];
    blocos.push(`<a class="agora-bloco agora-mare" href="/mar/?cidade=${cidade}">
      <small>Maré</small>
      ${prox ? `<span class="agora-grande"><span aria-hidden="true">${prox.tipo === 'alta' ? '▲' : '▼'}</span>${hora(prox.t)}</span>
      <span>Próxima maré ${prox.tipo} · ${prox.tipo === 'alta' ? 'subindo' : 'baixando'}</span>` : ''}
      ${depois ? `<span class="agora-linha">Depois: ${depois.tipo} às ${hora(depois.t)}</span>` : ''}
      <span class="agora-curva">${curvaMare(m.serie, m.extremos, hoje, agora, { altura: 120 })}</span></a>`);
  }
  const lua = faseLua();
  blocos.push(`<a class="agora-bloco agora-lua" href="/mar/?cidade=${cidade}">
    <small>Sol e lua</small>
    ${t ? `<span class="agora-grande"><span aria-hidden="true">🌇</span>${hora(t.diario.sunset[0])}</span>
    <span>Pôr do sol · nascer às ${hora(t.diario.sunrise[0])}</span>` : ''}
    <span class="agora-linha">${lua.icone} ${lua.nome} · ${lua.iluminada}% iluminada</span>
    <span class="agora-mais">${lua.tipoMare.split(' (')[0]}</span></a>`);

  document.getElementById('agora-blocos').innerHTML = blocos.join('');
  document.getElementById('agora-hora').textContent = 'atualizado ' + agora.slice(11, 16).replace(':', 'h');
  sec.hidden = false;
}

async function carregar() {
  const [rT, rM, rS] = await Promise.allSettled([
    buscarTempo(LITORAL, { detalhado: false }),
    buscarMares(LITORAL.map((c) => c.mar)),
    buscarSurf(),
  ]);
  if (rT.status === 'fulfilled') tempo = rT.value;
  if (rM.status === 'fulfilled') mares = rM.value;
  if (rS.status === 'fulfilled') surf = rS.value;
  if (tempo.length || mares.length) desenhar();
}

export function carregarAgora() {
  const sec = document.getElementById('agora');
  if (!sec) return;
  if (!LITORAL.some((c) => c.slug === cidade)) cidade = 'ubatuba';
  document.getElementById('agora-cidades').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cidade]');
    if (!b) return;
    cidade = b.dataset.cidade;
    salvarCidade(cidade);
    desenhar();
  });
  carregar();
  setInterval(carregar, 10 * 60 * 1000);
}

export { textoNota };
