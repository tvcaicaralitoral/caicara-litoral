import { buscarNoticias, montarMenu, iniciarPagina } from './comum.js';
import { materiaHTML, esc, linkMateria, img, dataRelativa, rotulo } from './render.js';

iniciarPagina();

// O id vem do endereço: /materia/1234567890-titulo-da-materia
const id = (location.pathname.match(/\/materia\/(\d+)/) || [])[1]
  || new URLSearchParams(location.search).get('id');

const el = document.getElementById('materia');

function relacionadas(post, posts) {
  const outras = posts.filter((p) => p.id !== post.id);
  const mesmas = outras.filter((p) => p.secao && p.secao === post.secao);
  const lista = [...mesmas, ...outras.filter((p) => !mesmas.includes(p))].slice(0, 6);
  document.getElementById('relacionadas').innerHTML = lista.map((p) => `
    <a class="relacionada" href="${linkMateria(p)}">
      ${img(p.capa, '')}
      <span><span class="chapeu">${esc(rotulo(p))}</span><strong>${esc(p.titulo)}</strong>
      <time datetime="${esc(p.data)}" data-rel>${esc(dataRelativa(p.data))}</time></span>
    </a>`).join('');
}

function mostrar(post) {
  montarMenu(post.secao || '');
  // Se o servidor já montou a matéria, não precisa montar de novo
  if (!el.querySelector('.materia-titulo')) el.innerHTML = materiaHTML(post);
  document.title = `${post.titulo} | Caiçara Litoral`;
}

async function iniciar() {
  const embutido = document.getElementById('post-data');
  let post = embutido ? JSON.parse(embutido.textContent) : null;
  if (post) mostrar(post);
  try {
    const dados = await buscarNoticias();
    const posts = dados.posts || [];
    if (!post) post = posts.find((p) => p.id === id);
    if (!post) {
      montarMenu();
      el.innerHTML = `<h1 class="materia-titulo">Matéria não encontrada</h1>
        <p>Ela pode ter sido removida. <a href="/">Voltar para a página inicial</a>.</p>`;
      return;
    }
    mostrar(post);
    relacionadas(post, posts);
  } catch (e) {
    console.error(e);
    if (!post) el.innerHTML = '<p class="vazio">Não foi possível carregar a matéria agora.</p>';
  }
}

iniciar();
