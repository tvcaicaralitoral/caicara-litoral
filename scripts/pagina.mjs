// Monta a página da matéria já com título, foto e texto no HTML.
// Isso faz o link aparecer com foto e título no WhatsApp/Facebook e ajuda o Google.
import { materiaHTML, esc, linkMateria } from '../public/js/render.js';
import { SITE } from '../public/js/config.js';

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
