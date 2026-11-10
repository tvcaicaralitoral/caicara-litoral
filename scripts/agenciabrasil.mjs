// Notícias do Brasil pela Agência Brasil (EBC, agência pública do governo federal).
// O conteúdo é livre para republicar com crédito (Creative Commons Atribuição 4.0).
const FEEDS = ['ultimasnoticias', 'politica', 'economia', 'geral', 'saude', 'educacao', 'justica', 'internacional', 'esportes', 'direitos-humanos', 'meio-ambiente'];
const BASE = 'https://agenciabrasil.ebc.com.br/rss/';

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodificar(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);
}

const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Deixa só o texto da matéria: parágrafos, negrito, itálico, listas, intertítulos e links.
// Tira imagens, logos, contadores, "notícias relacionadas", scripts e estilos.
export function limparHTML(html) {
  let h = decodificar(html);
  h = h.replace(/<h3>\s*Notícias relacionadas:?\s*<\/h3>\s*<ul>[\s\S]*?<\/ul>/gi, '');
  h = h.replace(/<(script|style|iframe|noscript|figure|table)[\s\S]*?<\/\1>/gi, '');
  h = h.replace(/<img[^>]*>/gi, '');
  const PERMITIDAS = new Set(['p', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'br', 'a']);
  h = h.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag, nome, attrs) => {
    nome = nome.toLowerCase();
    if (!PERMITIDAS.has(nome)) return '';
    if (tag.startsWith('</')) return `</${nome}>`;
    if (nome === 'a') {
      const href = (attrs.match(/href\s*=\s*"([^"]*)"/i) || [])[1] || '';
      return /^https?:\/\//i.test(href) ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">` : '<a>';
    }
    return nome === 'br' ? '<br>' : `<${nome}>`;
  });
  // Links vazios (era o logo) e remonta os parágrafos (o feed tem <p> dentro de <p> e texto solto)
  h = h.replace(/<a[^>]*>\s*<\/a>/g, '').replace(/<a>([\s\S]*?)<\/a>/g, '$1');
  const blocos = h.split(/<\/?p>|\n\s*\n/)
    .map((s) => s.replace(/\s+/g, ' ').replace(/^(<br>\s*)+|(\s*<br>)+$/g, '').trim())
    .filter((s) => s && textoPuro(s));
  return blocos.map((b) => (/^<(ul|ol|h[2-4]|blockquote)>/.test(b) ? b : `<p>${b}</p>`)).join('\n');
}

const textoPuro = (html) => decodificar(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function lerItem(x) {
  const pega = (tag) => (x.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || '';
  const link = decodificar(pega('link')).trim();
  const corpo = limparHTML(pega('description'));
  const editoria = decodificar((x.match(/<category domain="https:\/\/agenciabrasil\.ebc\.com\.br\/(?!tags\/)[^"]*">([^<]*)<\/category>/) || [])[1] || '');
  const slug = link.split('/').pop().replace(/[^a-z0-9-]/gi, '').slice(0, 90);
  let resumo = textoPuro((corpo.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || corpo);
  if (resumo.length > 260) resumo = resumo.slice(0, 260).replace(/\s+\S*$/, '') + '…';
  return {
    id: slug,
    slug,
    titulo: decodificar(pega('title')).trim(),
    link,
    data: new Date(pega('pubDate')).toISOString(),
    imagem: decodificar(pega('imagem-destaque')).trim(),
    autor: decodificar(pega('dc:creator')).replace(/\*+$/, '').trim(),
    editoria: editoria.trim() || 'Geral',
    resumo,
    corpo,
  };
}

export async function baixarBrasil(limite = 60) {
  const resultados = await Promise.allSettled(FEEDS.map(async (f) => {
    const r = await fetch(`${BASE}${f}/feed.xml`, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`${f}: ${r.status}`);
    return [...(await r.text()).matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => lerItem(m[1]));
  }));
  const vistos = new Map();
  for (const r of resultados) {
    if (r.status !== 'fulfilled') continue;
    for (const m of r.value) if (m.slug && m.titulo && m.corpo && !vistos.has(m.slug)) vistos.set(m.slug, m);
  }
  if (!vistos.size) throw new Error('nenhuma notícia da Agência Brasil');
  const todas = [...vistos.values()].sort((a, b) => b.data.localeCompare(a.data));
  const lista = todas.slice(0, limite);
  // A aba Esportes mostra as de esporte: inclui até 12 mesmo que fiquem fora das mais recentes
  const esportes = todas.filter((m) => m.editoria === 'Esportes' && !lista.includes(m)).slice(0, Math.max(0, 12 - lista.filter((m) => m.editoria === 'Esportes').length));
  return [...lista, ...esportes];
}
