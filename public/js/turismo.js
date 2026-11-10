// Bloco "Conheça [cidade]" dentro da aba de cada cidade: cards com foto; ao clicar, abre o detalhe ali mesmo.
import { esc } from './render.js';
import { TURISMO } from './turismo-dados.js';

const TITULO = { ubatuba: 'Ubatuba', caraguatatuba: 'Caraguatatuba', 'sao-sebastiao': 'São Sebastião', ilhabela: 'Ilhabela', bertioga: 'Bertioga', 'vale-e-serra': 'o Vale e a Serra' };

function cardHTML(p) {
  return `<button type="button" class="tur-card" data-id="${esc(p.id)}">
    <span class="tur-foto"><img src="${esc(p.foto)}" alt="${esc(p.nome)}" loading="lazy" onerror="this.parentNode.classList.add('sem-foto')"></span>
    <span class="tur-texto">
      <span class="chapeu">${esc(p.tipo)}</span>
      <strong>${esc(p.nome)}</strong>
    </span>
  </button>`;
}

function detalheHTML(p) {
  return `<button type="button" class="tur-fechar" aria-label="Fechar">×</button>
    <img class="tur-detalhe-foto" src="${esc(p.foto.replace('/640px-', '/960px-'))}" alt="${esc(p.nome)}" onerror="this.src='${esc(p.foto)}'">
    <small class="tur-credito">Foto: <a href="${esc(p.fonteFoto)}" target="_blank" rel="noopener">${esc(p.credito)}</a></small>
    <div class="tur-detalhe-corpo">
      <span class="chapeu">${esc(p.tipo)} · ${esc(p.cidade)}</span>
      <h3>${esc(p.nome)}</h3>
      <p>${esc(p.texto)}</p>
      <p class="tur-dica"><strong>Dica:</strong> ${esc(p.dica)}</p>
      <a class="bt tur-mapa" href="${esc(p.mapa)}" target="_blank" rel="noopener">📍 Como chegar</a>
    </div>`;
}

export function carregarTurismo(secao) {
  const lista = TURISMO[secao];
  const caixa = document.getElementById('turismo');
  if (!lista?.length || !caixa) return;
  const regional = secao === 'vale-e-serra';
  document.getElementById('tur-titulo').textContent = regional ? 'Conheça o Vale e a Serra' : `Conheça ${TITULO[secao]}`;

  const grade = document.getElementById('tur-grade');
  const filtros = document.getElementById('tur-filtros');
  const mostrar = (cidade) => {
    const itens = cidade ? lista.filter((p) => p.cidade === cidade) : lista;
    grade.innerHTML = itens.map((p) => cardHTML({ ...p, tipo: regional ? `${p.tipo} · ${p.cidade}` : p.tipo })).join('');
    filtros.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cidade === (cidade || '')));
  };
  // No Vale e Serra, botões para filtrar por cidade
  if (regional) {
    const cidades = [...new Set(lista.map((p) => p.cidade))];
    filtros.innerHTML = ['', ...cidades].map((c) => `<button type="button" data-cidade="${esc(c)}">${c ? esc(c) : 'Todas'}</button>`).join('');
    filtros.hidden = false;
    filtros.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) mostrar(b.dataset.cidade); });
  }
  mostrar('');

  const janela = document.getElementById('tur-detalhe');
  grade.addEventListener('click', (e) => {
    const b = e.target.closest('.tur-card');
    if (!b) return;
    const p = lista.find((x) => x.id === b.dataset.id);
    janela.innerHTML = detalheHTML(p);
    if (janela.showModal) janela.showModal(); else janela.setAttribute('open', '');
  });
  janela.addEventListener('click', (e) => {
    // Fecha no "×" ou clicando fora do quadro
    if (e.target.closest('.tur-fechar') || e.target === janela) janela.close ? janela.close() : janela.removeAttribute('open');
  });
  caixa.hidden = false;
}
