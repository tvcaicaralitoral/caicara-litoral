// Página /brasil/: notícias do Brasil e do governo federal (Agência Brasil)
import { montarMenu, iniciarPagina } from './comum.js';
import { esc } from './render.js';
import { buscarBrasil, cardBrasil } from './brasil-render.js';

iniciarPagina();
montarMenu('brasil');

const POR_PAGINA = 15;
const params = new URLSearchParams(location.search);
let editoria = params.get('editoria') || '';
let todas = [], mostrando = 0;

const el = (id) => document.getElementById(id);

function filtradas() { return editoria ? todas.filter((m) => m.editoria === editoria) : todas; }

function abas() {
  const contagem = {};
  for (const m of todas) contagem[m.editoria] = (contagem[m.editoria] || 0) + 1;
  const nomes = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a]);
  el('brasil-abas').innerHTML = ['', ...nomes].map((n) =>
    `<button type="button" role="tab" data-editoria="${esc(n)}" aria-selected="${n === editoria}">${n ? esc(n) : 'Todas'}</button>`).join('');
}

function desenhar() {
  abas();
  const lista = filtradas();
  if (!lista.length) { el('brasil-destaque').innerHTML = ''; el('brasil-lista').innerHTML = '<div class="vazio">Nenhuma notícia nesta editoria agora.</div>'; return; }
  const [primeira, ...resto] = lista;
  el('brasil-destaque').innerHTML = cardBrasil(primeira, 'grande');
  mostrando = Math.min(POR_PAGINA, resto.length);
  el('brasil-lista').innerHTML = resto.slice(0, mostrando).map((m) => cardBrasil(m)).join('');
  el('brasil-mais').hidden = mostrando >= resto.length;
}

async function carregar() {
  try {
    todas = await buscarBrasil();
    desenhar();
  } catch (e) {
    console.error(e);
    el('brasil-lista').innerHTML = '<div class="vazio">Não foi possível carregar as notícias agora.</div>';
  }
}

el('brasil-abas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-editoria]');
  if (!b) return;
  editoria = b.dataset.editoria;
  history.replaceState(null, '', editoria ? '?editoria=' + encodeURIComponent(editoria) : location.pathname);
  desenhar();
});

el('brasil-mais').addEventListener('click', () => {
  const resto = filtradas().slice(1);
  el('brasil-lista').insertAdjacentHTML('beforeend', resto.slice(mostrando, mostrando + POR_PAGINA).map((m) => cardBrasil(m)).join(''));
  mostrando += POR_PAGINA;
  el('brasil-mais').hidden = mostrando >= resto.length;
});

carregar();
setInterval(carregar, 10 * 60 * 1000);
