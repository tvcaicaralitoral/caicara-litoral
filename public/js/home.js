import { buscarNoticias, montarMenu, iniciarPagina } from './comum.js';
import { card, esc, linkMateria, nomeSecao } from './render.js';
import { semAcento, SECOES } from './parse.js';
import { PERSONAGENS } from './config.js';
import { carregarVideos } from './videos.js';
import { carregarAgora } from './agora.js';
import { buscarBrasil, cardBrasil } from './brasil-render.js';
import { carregarPrefeiturasCidade } from './prefeituras-render.js';
import { carregarEsportes } from './esportes.js';

const POR_PAGINA = 12;
const params = new URLSearchParams(location.search);
const secao = params.get('secao') || '';
const personagemSlug = params.get('personagem') || '';
const busca = (params.get('busca') || '').trim();
const personagem = PERSONAGENS.find((p) => p.slug === personagemSlug);

let todos = [];
let mostrando = 0;
let primeiroId = null;

iniciarPagina();
montarMenu(personagem ? 'p:' + personagem.slug : secao);
if (busca) document.querySelector('.busca input').value = busca;

function filtrar(posts) {
  if (personagem) return posts.filter((p) => p.personagens.includes(personagem.slug));
  if (secao) return posts.filter((p) => p.secao === secao || (secao !== 'esportes' && p.cidadeSlug === secao));
  if (busca) {
    const termos = semAcento(busca).toLowerCase().split(/\s+/);
    return posts.filter((p) => {
      const t = semAcento([p.titulo, p.resumo, p.cidade, ...p.paragrafos, ...p.hashtags].join(' ')).toLowerCase();
      return termos.every((x) => t.includes(x));
    });
  }
  return posts;
}

function tituloPagina() {
  if (personagem) return personagem.nome;
  if (secao) return nomeSecao(secao) || 'Notícias';
  if (busca) return `Busca: “${busca}”`;
  return '';
}

function renderTicker(posts) {
  const el = document.getElementById('ticker');
  const itens = posts.slice(0, 8).map((p) => `<a href="${linkMateria(p)}">${esc(p.titulo)}</a>`).join('<span class="ticker-sep">•</span>');
  if (!itens) { el.hidden = true; return; }
  // Conteúdo duplicado para a rolagem contínua
  document.getElementById('ticker-trilho').innerHTML = `<div>${itens}<span class="ticker-sep">•</span></div><div aria-hidden="true">${itens}<span class="ticker-sep">•</span></div>`;
  el.hidden = false;
}

function renderPersonagens(posts) {
  const el = document.getElementById('personagens');
  if (personagem || secao || busca || !PERSONAGENS.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<h2 class="titulo-secao">Personagens da TV</h2>
  <div class="personagens-grade">${PERSONAGENS.map((x) => {
    const deles = posts.filter((p) => p.personagens.includes(x.slug));
    const ultimo = deles[0];
    return `<a class="personagem" href="/?personagem=${x.slug}">
      <span class="personagem-foto"><img src="${esc(x.fotoCorpo || x.foto)}" alt="${esc(x.nome)}" loading="lazy"
        onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'personagem-inicial',textContent:'${esc(x.nome[0])}'}))"></span>
      <span class="personagem-texto">
        <span class="personagem-nome">${esc(x.nome)}</span>
        <span class="personagem-chamada">${esc(x.chamada)}</span>
        ${ultimo ? `<span class="personagem-ultimo">Último: ${esc(ultimo.titulo)}</span>` : ''}
        <span class="personagem-ver">${deles.length ? `Ver ${deles.length} ${deles.length === 1 ? 'matéria' : 'matérias'}` : 'Ver matérias'} →</span>
      </span>
    </a>`;
  }).join('')}</div>`;
}

function renderCidades(posts) {
  const el = document.getElementById('cidades');
  el.innerHTML = SECOES.map((s) => {
    const n = posts.filter((p) => p.secao === s.slug || (s.slug !== 'esportes' && p.cidadeSlug === s.slug)).length;
    return `<li><a href="/?secao=${s.slug}">${esc(s.nome)}</a><span>${n}</span></li>`;
  }).join('');
}

function renderLista() {
  const lista = document.getElementById('lista');
  const filtrados = filtrar(todos);
  const temTopo = !tituloPagina();
  const resto = temTopo ? filtrados.slice(4) : filtrados;
  lista.innerHTML = resto.slice(0, mostrando).map((p) => card(p)).join('');
  document.getElementById('mais').hidden = mostrando >= resto.length;
  if (!resto.length && !temTopo) {
    lista.innerHTML = secao === 'esportes' ? '' : `<p class="vazio">Nenhuma notícia encontrada${personagem ? ` com ${esc(personagem.nome)} ainda` : ''}.</p>`;
  }
}

function render(dados) {
  todos = dados.posts || [];
  const filtrados = filtrar(todos);
  const titulo = tituloPagina();
  const destaque = document.getElementById('destaque');

  if (titulo) {
    // Página de seção, personagem ou busca: cabeçalho + lista
    const foto = personagem ? `<img class="secao-foto" src="${esc(personagem.foto)}" alt="" onerror="this.remove()">` : '';
    destaque.innerHTML = `<div class="secao-cabecalho">${foto}<div><h1>${esc(titulo)}</h1>
      ${personagem ? `<p>${esc(personagem.chamada)}</p>` : ''}
      <p class="secao-contagem">${filtrados.length} ${filtrados.length === 1 ? 'notícia' : 'notícias'}</p></div></div>`;
    document.getElementById('titulo-lista').hidden = true;
    document.title = `${titulo} | Caiçara Litoral`;
  } else if (filtrados.length) {
    const [principal, ...lado] = filtrados;
    destaque.innerHTML = `<div class="destaque-grade">
      ${card(principal, 'grande')}
      <div class="destaque-lado">${lado.slice(0, 3).map((p) => card(p, 'lado')).join('')}</div>
    </div>`;
  } else {
    destaque.innerHTML = '<p class="vazio">Nenhuma notícia publicada ainda.</p>';
  }

  if (dados.exemplo && !document.querySelector('.aviso-teste')) {
    destaque.insertAdjacentHTML('beforebegin', `<p class="aviso-teste"><strong>Modo de teste:</strong>
      estas matérias são só exemplos. No site publicado, aparecem automaticamente os posts do Instagram @tvcaicaralitoral.</p>`);
  }
  renderTicker(todos);
  renderPersonagens(todos);
  renderCidades(todos);
  if (!mostrando) mostrando = POR_PAGINA;
  renderLista();
  primeiroId = todos[0]?.id || null;
}

document.getElementById('mais').addEventListener('click', () => {
  mostrando += POR_PAGINA;
  renderLista();
});

async function carregar() {
  try {
    render(await buscarNoticias());
  } catch (e) {
    console.error(e);
    // Enquanto o Instagram não estiver ligado (ou fora do ar), mostra um convite em vez de erro
    document.getElementById('destaque').innerHTML = `<div class="em-breve">
      <h2>As notícias da TV Caiçara Litoral estão chegando por aqui</h2>
      <p>Enquanto isso, acompanhe tudo em primeira mão no nosso Instagram.</p>
      <a class="bt bt-insta" href="https://www.instagram.com/tvcaicaralitoral/" target="_blank" rel="noopener">Seguir @tvcaicaralitoral</a>
    </div>`;
    document.getElementById('titulo-lista').hidden = true;
    renderPersonagens([]);
  }
}

// Procura novas matérias a cada 5 minutos, sem recarregar a página
setInterval(async () => {
  try {
    const dados = await buscarNoticias();
    if (dados.posts?.[0]?.id && dados.posts[0].id !== primeiroId) render(dados);
  } catch { /* tenta de novo na próxima */ }
}, 5 * 60 * 1000);

carregar();
// Vídeos só na página inicial (não em seções, personagens ou busca)
if (!secao && !personagem && !busca) carregarVideos();
if (!secao && !personagem && !busca) { carregarAgora(); carregarBrasil(); }
// Na aba de cada cidade, as notícias da prefeitura dela
if (secao && !personagem && !busca) carregarPrefeiturasCidade(secao);
// Aba Esportes: Brasileirão e notícias de esporte
if (secao === 'esportes' && !personagem && !busca) carregarEsportes();

async function carregarBrasil() {
  try {
    const lista = await buscarBrasil();
    if (!lista.length) return;
    document.getElementById('brasil-home-lista').innerHTML = lista.slice(0, 4).map((m) => cardBrasil(m)).join('');
    document.getElementById('brasil-home').hidden = false;
  } catch (e) { console.error(e); }
}
