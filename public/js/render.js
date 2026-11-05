// Gera o HTML das matérias. Usado no navegador e no servidor (Cloudflare).
import { SITE, PERSONAGENS } from './config.js';
import { SECOES } from './parse.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function partesSP(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  // Horário de Brasília (UTC-3), sem depender do fuso de quem acessa
  const b = new Date(d.getTime() - 3 * 3600 * 1000);
  return { dia: b.getUTCDate(), mes: b.getUTCMonth(), ano: b.getUTCFullYear(), h: b.getUTCHours(), m: b.getUTCMinutes() };
}

export function dataCompleta(iso) {
  const p = partesSP(iso);
  if (!p) return '';
  return `${p.dia} de ${MESES[p.mes]} de ${p.ano}, às ${p.h}h${String(p.m).padStart(2, '0')}`;
}

export function dataRelativa(iso, agora = Date.now()) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const min = Math.round((agora - t) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  const p = partesSP(iso);
  return `${p.dia} de ${MESES[p.mes]}`;
}

export const linkMateria = (p) => `/materia/${p.id}-${p.slug}/`;

export function nomeSecao(slug) {
  return SECOES.find((s) => s.slug === slug)?.nome || '';
}

// Rótulo (chapéu) que aparece em cima do título
export function rotulo(p) {
  if (p.secao === 'esportes') return 'Esportes';
  return p.cidade || 'Região';
}

export function linkRotulo(p) {
  if (p.secao === 'esportes') return '/?secao=esportes';
  if (p.secao) return `/?secao=${p.secao}`;
  return '/';
}

// Imagem do Instagram. Se não carregar, mostra o fundo da marca no lugar.
export function img(url, alt, extra = '') {
  if (!url) return `<div class="sem-imagem" aria-hidden="true"></div>`;
  return `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" ${extra}
    onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'sem-imagem'}))">`;
}

export function card(p, tipo = 'normal') {
  const href = linkMateria(p);
  const video = p.tipo === 'VIDEO' ? '<span class="selo-video" aria-label="Vídeo">▶</span>' : '';
  return `<article class="card card-${tipo}">
  <a class="card-img" href="${href}" tabindex="-1" aria-hidden="true">${img(p.capa, '')}${video}</a>
  <div class="card-texto">
    <span class="chapeu">${esc(rotulo(p))}</span>
    <h3 class="card-titulo"><a href="${href}">${esc(p.titulo)}</a></h3>
    ${tipo === 'grande' && p.resumo ? `<p class="card-resumo">${esc(p.resumo)}</p>` : ''}
    <time datetime="${esc(p.data)}" data-rel>${esc(dataRelativa(p.data))}</time>
  </div>
</article>`;
}

function paragrafo(t) {
  // Mantém quebras de linha dentro do parágrafo (listas com ✅, por exemplo)
  return `<p>${esc(t).replace(/\n/g, '<br>')}</p>`;
}

function midiaHTML(p) {
  return p.midia.map((m, i) => m.tipo === 'video'
    ? `<video controls playsinline preload="metadata" ${m.capa ? `poster="${esc(m.capa)}"` : ''} src="${esc(m.url)}"></video>`
    : img(m.url, i === 0 ? p.titulo : `${p.titulo} — imagem ${i + 1}`, i === 0 ? 'fetchpriority="high"' : '')
  ).join('\n');
}

export function materiaHTML(p) {
  const url = SITE.url + linkMateria(p);
  const txt = encodeURIComponent(`${p.titulo} ${url}`);
  const personagens = PERSONAGENS.filter((x) => p.personagens?.includes(x.slug));
  return `<nav class="migalha" aria-label="Você está em">
  <a href="/">Início</a> <span>›</span> <a href="${linkRotulo(p)}">${esc(rotulo(p))}</a>
</nav>
<h1 class="materia-titulo">${esc(p.titulo)}</h1>
${p.resumo ? `<p class="materia-linha-fina">${esc(p.resumo).replace(/\n/g, '<br>')}</p>` : ''}
<div class="materia-meta">
  <span>Por <strong>${esc(SITE.nomeTv)}</strong></span>
  <time datetime="${esc(p.data)}">${esc(dataCompleta(p.data))}</time>
</div>
<figure class="materia-midia">
  ${midiaHTML(p)}
  ${p.foto ? `<figcaption>Foto: ${esc(p.foto)}</figcaption>` : ''}
</figure>
<div class="materia-corpo">
  ${p.paragrafos.map(paragrafo).join('\n  ')}
  ${p.local || p.fonte ? `<p class="materia-fonte">${p.local ? `📍 ${esc(p.local)}` : ''}${p.local && p.fonte ? '<br>' : ''}${p.fonte ? `Fonte: ${esc(p.fonte)}` : ''}</p>` : ''}
</div>
${personagens.map((x) => `<a class="materia-personagem" href="/?personagem=${x.slug}">
  <img src="${esc(x.foto)}" alt="" onerror="this.remove()"> Mais com <strong>${esc(x.nome)}</strong> →</a>`).join('')}
${p.hashtags.length ? `<ul class="materia-tags">${p.hashtags.map((h) => `<li>#${esc(h)}</li>`).join('')}</ul>` : ''}
<div class="compartilhar">
  <span>Compartilhe:</span>
  <a class="bt bt-whats" href="https://wa.me/?text=${txt}" target="_blank" rel="noopener">WhatsApp</a>
  <a class="bt bt-face" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Facebook</a>
  <button class="bt bt-copiar" type="button" data-url="${esc(url)}">Copiar link</button>
  ${p.link ? `<a class="bt bt-insta" href="${esc(p.link)}" target="_blank" rel="noopener">Ver no Instagram</a>` : ''}
</div>`;
}
