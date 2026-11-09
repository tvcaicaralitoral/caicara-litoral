// Página /prefeituras/: últimas notícias oficiais de cada prefeitura da região (com link para o site delas)
import { montarMenu, iniciarPagina } from './comum.js';
import { esc } from './render.js';
import { buscarPrefeituras, itemPrefeitura, nomeCidade } from './prefeituras-render.js';
import { CIDADES_TEMPO } from './tempo-dados.js';

iniciarPagina();
montarMenu('prefeituras');

const params = new URLSearchParams(location.search);
let cidade = params.get('cidade') || '';
let todas = [];
const el = (id) => document.getElementById(id);

function desenhar() {
  const presentes = CIDADES_TEMPO.filter((c) => todas.some((m) => m.cidade === c.slug));
  el('pref-abas').innerHTML = [{ slug: '', nome: 'Todas' }, ...presentes].map((c) =>
    `<button type="button" role="tab" data-cidade="${c.slug}" aria-selected="${c.slug === cidade}">${esc(c.nome)}</button>`).join('');
  const lista = cidade ? todas.filter((m) => m.cidade === cidade) : todas;
  el('pref-lista-pagina').innerHTML = lista.length
    ? lista.map((m) => itemPrefeitura(m, { mostrarCidade: !cidade })).join('')
    : '<li class="vazio">Nenhuma notícia desta prefeitura agora.</li>';
  el('pref-subtitulo').textContent = cidade ? `Prefeitura de ${nomeCidade(cidade)}` : 'Todas as cidades';
}

async function carregar() {
  try { todas = await buscarPrefeituras(); desenhar(); }
  catch (e) { console.error(e); el('pref-lista-pagina').innerHTML = '<li class="vazio">Não foi possível carregar agora.</li>'; }
}

el('pref-abas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cidade]');
  if (!b) return;
  cidade = b.dataset.cidade;
  history.replaceState(null, '', cidade ? '?cidade=' + cidade : location.pathname);
  desenhar();
});

carregar();
setInterval(carregar, 10 * 60 * 1000);
