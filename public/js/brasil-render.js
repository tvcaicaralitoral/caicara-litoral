// Cartões e página das notícias do Brasil (Agência Brasil)
import { esc, dataCompleta, dataRelativa, img } from './render.js';
import { SITE } from './config.js';

export const linkBrasil = (m) => `/brasil/${m.slug}/`;
export const CREDITO = 'Agência Brasil';
export const LICENCA = 'https://creativecommons.org/licenses/by/4.0/deed.pt-br';

// Mesmo formato dos cartões das matérias da TV
export function cardBrasil(m, tipo = 'normal') {
  const href = linkBrasil(m);
  return `<article class="card card-${tipo} card-brasil">
  <a class="card-img" href="${href}" tabindex="-1" aria-hidden="true">${img(m.imagem, '')}</a>
  <div class="card-texto">
    <span class="chapeu">${esc(m.editoria)}</span>
    <h3 class="card-titulo"><a href="${href}">${esc(m.titulo)}</a></h3>
    ${tipo === 'grande' && m.resumo ? `<p class="card-resumo">${esc(m.resumo)}</p>` : ''}
    <time datetime="${esc(m.data)}" data-rel>${esc(dataRelativa(m.data))}</time>
  </div>
</article>`;
}

export function itemBrasil(m) {
  return `<a class="relacionada" href="${linkBrasil(m)}">
    ${img(m.imagem, '')}
    <span><span class="chapeu">${esc(m.editoria)}</span><strong>${esc(m.titulo)}</strong>
    <time datetime="${esc(m.data)}" data-rel>${esc(dataRelativa(m.data))}</time></span>
  </a>`;
}

// m.corpo já vem limpo pelo script de atualização (só texto, negrito, listas e links)
export function materiaBrasilHTML(m) {
  const url = SITE.url + linkBrasil(m);
  const txt = encodeURIComponent(`${m.titulo} ${url}`);
  return `<nav class="migalha" aria-label="Você está em">
  <a href="/">Início</a> <span>›</span> <a href="/brasil/">Brasil</a> <span>›</span> <a href="/brasil/?editoria=${encodeURIComponent(m.editoria)}">${esc(m.editoria)}</a>
</nav>
<h1 class="materia-titulo">${esc(m.titulo)}</h1>
<div class="materia-meta">
  <span>${m.autor ? esc(m.autor) : CREDITO}</span>
  <time datetime="${esc(m.data)}">${esc(dataCompleta(m.data))}</time>
</div>
${m.imagem ? `<figure class="materia-midia">${img(m.imagem, m.titulo)}<figcaption>Imagem: ${CREDITO}</figcaption></figure>` : ''}
<div class="materia-corpo">
  ${m.corpo}
  <p class="materia-fonte">Fonte: <a href="${esc(m.link)}" target="_blank" rel="noopener">${CREDITO}</a> ·
  conteúdo publicado sob a licença <a href="${LICENCA}" target="_blank" rel="noopener">Creative Commons Atribuição 4.0</a>.</p>
</div>
<div class="compartilhar">
  <span>Compartilhe:</span>
  <a class="bt bt-whats" href="https://wa.me/?text=${txt}" target="_blank" rel="noopener">WhatsApp</a>
  <a class="bt bt-face" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Facebook</a>
  <button class="bt bt-copiar" type="button" data-url="${esc(url)}">Copiar link</button>
</div>`;
}

export async function buscarBrasil() {
  const r = await fetch('/dados/brasil.json?v=' + Math.floor(Date.now() / 60000));
  if (!r.ok) throw new Error('Falha ao carregar notícias do Brasil');
  return (await r.json()).noticias || [];
}
