// Página de uma notícia do Brasil: o texto já vem pronto no HTML; aqui só menu e "Mais do Brasil".
import { montarMenu, iniciarPagina } from './comum.js';
import { buscarBrasil, itemBrasil } from './brasil-render.js';

iniciarPagina();
montarMenu('brasil');

const slug = (location.pathname.match(/\/brasil\/([^/]+)/) || [])[1];

buscarBrasil().then((todas) => {
  const atual = todas.find((m) => m.slug === slug);
  const outras = todas.filter((m) => m.slug !== slug);
  const mesmas = atual ? outras.filter((m) => m.editoria === atual.editoria) : [];
  const lista = [...mesmas, ...outras.filter((m) => !mesmas.includes(m))].slice(0, 6);
  document.getElementById('relacionadas').innerHTML = lista.map(itemBrasil).join('');
}).catch((e) => console.error(e));
