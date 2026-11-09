// Página /mar/: surf nas praias, marés e lua
import { montarMenu, iniciarPagina } from './comum.js';
import { esc } from './render.js';
import { CIDADES_TEMPO, buscarTempo } from './tempo-dados.js';
import { buscarSurf, buscarMares, faseLua, agoraSP, direcaoVento, textoNota } from './mar-dados.js';
import { curvaMare, listaMares, estrelas, metros, hora, proximaMare } from './mar-render.js';

iniciarPagina();
montarMenu('mar');

const LITORAL = CIDADES_TEMPO.filter((c) => c.mar);
const el = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
let cidade = LITORAL.find((c) => c.slug === params.get('cidade'))?.slug || lerCidade() || 'ubatuba';
let mares = [], sol = [], surf = [];

function lerCidade() { try { return localStorage.getItem('cidade-litoral'); } catch { return null; } }
function salvarCidade(s) { try { localStorage.setItem('cidade-litoral', s); } catch { /* sem armazenamento */ } }

const diaTxt = (iso) => new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const diaCurto = (iso, i) => (i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', ''));

function desenharMares() {
  el('mare-cidades').innerHTML = LITORAL.map((c) =>
    `<button type="button" data-cidade="${c.slug}" aria-pressed="${c.slug === cidade}">${esc(c.nome)}</button>`).join('');
  const i = LITORAL.findIndex((c) => c.slug === cidade);
  const m = mares[i];
  if (!m) return;
  const agora = agoraSP();
  const hoje = agora.slice(0, 10);
  const amanha = new Date(Date.parse(hoje + 'T12:00Z') + 86400000).toISOString().slice(0, 10);
  const prox = proximaMare(m.extremos, agora);
  const s = sol[i];
  const lua = faseLua();
  el('mare-conteudo').innerHTML = `
    <div class="mare-topo">
      <div class="mare-prox">
        ${prox ? `<small>Próxima</small><strong>Maré ${prox.tipo} às ${hora(prox.t)}</strong>
        <span>${prox.tipo === 'alta' ? 'A maré está subindo' : 'A maré está baixando'}</span>` : ''}
      </div>
      <div class="mare-lua"><span class="lua-icone" aria-hidden="true">${lua.icone}</span>
        <span><strong>${lua.nome}</strong><small>${lua.iluminada}% iluminada · ${lua.tipoMare}</small></span></div>
      ${s ? `<div class="mare-sol"><span aria-hidden="true">🌅</span><span><strong>${hora(s.sunrise[0])} · ${hora(s.sunset[0])}</strong><small>nascer e pôr do sol</small></span></div>` : ''}
    </div>
    <div class="mare-dias">
      <div class="mare-dia"><h3>Hoje <small>${diaTxt(hoje)}</small></h3>${curvaMare(m.serie, m.extremos, hoje, agora)}${listaMares(m.extremos, hoje)}</div>
      <div class="mare-dia"><h3>Amanhã <small>${diaTxt(amanha)}</small></h3>${curvaMare(m.serie, m.extremos, amanha, agora)}${listaMares(m.extremos, amanha)}</div>
    </div>
    <p class="nota-fonte">Lua: ${lua.nome === 'Lua cheia' ? 'hoje' : 'próxima cheia em ' + lua.proximaCheia.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · próxima lua nova em ${lua.proximaNova.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}.
    Alturas em relação ao nível médio do mar.</p>`;
}

function cartaoPraia(p) {
  const a = p.atual;
  const dias = p.dias.slice(0, 4).map((d, i) => `
    <tr><th>${diaCurto(d.dia, i)}</th>
      ${['manha', 'tarde'].map((k) => d[k] ? `<td><strong>${metros(d[k].ondaMax)} m</strong>${estrelas(d[k].nota)}</td>` : '<td>–</td>').join('')}</tr>`).join('');
  return `
  <article class="praia">
    <header><h3>${esc(p.nome)}</h3><small>${esc(p.cidade)}</small></header>
    <div class="praia-nota">${estrelas(a.nota)}<span>${textoNota(a.nota)}</span></div>
    <ul class="praia-dados">
      <li><small>Ondas</small><strong>${metros(a.onda)} m</strong></li>
      <li><small>Período</small><strong>${Math.round(a.periodo ?? 0)} s</strong></li>
      <li><small>Vento</small><strong>${Math.round(a.vento)} km/h</strong><small>${direcaoVento(a.ventoDir)} · ${a.tipoVento}</small></li>
      <li><small>Água</small><strong>${Math.round(a.agua ?? 0)}°</strong></li>
    </ul>
    <table class="praia-dias"><thead><tr><th></th><th>Manhã</th><th>Tarde</th></tr></thead><tbody>${dias}</tbody></table>
  </article>`;
}

function desenharSurf() {
  const ordem = [...surf].sort((a, b) => (b.atual.nota ?? 0) - (a.atual.nota ?? 0));
  el('surf-grade').innerHTML = ordem.map(cartaoPraia).join('');
}

async function carregar() {
  const pontos = LITORAL.map((c) => c.mar);
  const [rMares, rSol, rSurf] = await Promise.allSettled([
    buscarMares(pontos), buscarTempo(LITORAL, { detalhado: false }), buscarSurf(),
  ]);
  if (rMares.status === 'fulfilled') mares = rMares.value;
  if (rSol.status === 'fulfilled') sol = rSol.value.map((c) => c.diario);
  if (rSurf.status === 'fulfilled') surf = rSurf.value;
  if (mares.length) desenharMares(); else el('mare-conteudo').innerHTML = '<div class="vazio">Previsão de marés indisponível agora. Tente de novo em alguns minutos.</div>';
  if (surf.length) desenharSurf(); else el('surf-grade').innerHTML = '<div class="vazio">Previsão de ondas indisponível agora.</div>';
  el('mar-status').textContent = 'Atualizado às ' + agoraSP().slice(11, 16) + ' · atualiza sozinho a cada 15 min';
}

el('mare-cidades').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cidade]');
  if (!b) return;
  cidade = b.dataset.cidade;
  salvarCidade(cidade);
  history.replaceState(null, '', '?cidade=' + cidade);
  desenharMares();
});

carregar();
setInterval(carregar, 15 * 60 * 1000);
