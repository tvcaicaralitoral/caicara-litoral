// Monta a página da matéria já com título, foto e texto no HTML.
// Isso faz o link aparecer com foto e título no WhatsApp/Facebook e ajuda o Google.
import { materiaHTML, esc, linkMateria } from '../public/js/render.js';
import { SITE } from '../public/js/config.js';
import { materiaBrasilHTML, linkBrasil, CREDITO } from '../public/js/brasil-render.js';

export function paginaMateria(modelo, post) {
  const url = SITE.url + linkMateria(post);
  const titulo = `${post.titulo} | ${SITE.nome}`;
  const descricao = (post.resumo || SITE.descricao).replace(/\s+/g, ' ').slice(0, 200);
  const imagem = post.capa || '';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.titulo.slice(0, 110),
    datePublished: post.data,
    image: imagem ? [imagem] : undefined,
    mainEntityOfPage: url,
    publisher: { '@type': 'Organization', name: SITE.nomeTv },
  };
  const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

  const meta = `
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(SITE.nome)}">
  <meta property="og:title" content="${esc(post.titulo)}">
  <meta property="og:description" content="${esc(descricao)}">
  <meta property="og:url" content="${esc(url)}">
  ${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta property="article:published_time" content="${esc(post.data)}">
  <script type="application/ld+json">${json(jsonLd)}</script>`;

  return modelo
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(descricao)}">`)
    .replace('</head>', `${meta}\n</head>`)
    .replace(/(<article class="materia" id="materia">)[\s\S]*?(<\/article>)/, `$1\n${materiaHTML(post)}\n$2`)
    .replace('</body>', `<script id="post-data" type="application/json">${json(post)}</script>\n</body>`);
}

// Notícia da Agência Brasil. O "canonical" aponta para a matéria original (boa prática de republicação).
export function paginaBrasil(modelo, m) {
  const url = SITE.url + linkBrasil(m);
  const descricao = (m.resumo || '').replace(/\s+/g, ' ').slice(0, 200);
  const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: m.titulo.slice(0, 110),
    datePublished: m.data, image: m.imagem ? [m.imagem] : undefined, mainEntityOfPage: m.link,
    author: { '@type': 'Organization', name: CREDITO }, isBasedOn: m.link,
  };
  const meta = `
  <link rel="canonical" href="${esc(m.link)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(SITE.nome)}">
  <meta property="og:title" content="${esc(m.titulo)}">
  <meta property="og:description" content="${esc(descricao)}">
  <meta property="og:url" content="${esc(url)}">
  ${m.imagem ? `<meta property="og:image" content="${esc(m.imagem)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${json(jsonLd)}</script>`;
  return modelo
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.titulo)} | ${esc(SITE.nome)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(descricao)}">`)
    .replace('</head>', `${meta}\n</head>`)
    .replace(/(<article class="materia" id="materia">)[\s\S]*?(<\/article>)/, `$1\n${materiaBrasilHTML(m)}\n$2`)
    .replace('<h2 id="titulo-relacionadas">Leia também</h2>', '<h2 id="titulo-relacionadas">Mais do Brasil</h2>')
    .replace('src="/js/materia.js"', 'src="/js/brasil-materia.js"');
}
