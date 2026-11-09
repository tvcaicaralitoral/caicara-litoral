// Manchetes das prefeituras da região (só título e link para o site oficial — o texto fica lá).
// Cada prefeitura usa um sistema diferente: algumas têm RSS, nas outras lemos a lista de notícias.
import { decodificar } from './agenciabrasil.mjs';

const UA = 'CaicaraLitoralBot/1.0 (+https://caicaralitoral.com.br; manchetes com link para a prefeitura)';

// padrao = como é o endereço de uma notícia naquele site
export const FONTES = [
  { cidade: 'ubatuba', nome: 'Prefeitura de Ubatuba', url: 'https://www.ubatuba.sp.gov.br/noticias', padrao: /^https:\/\/www\.ubatuba\.sp\.gov\.br\/noticias\/[\w-]+$/ },
  { cidade: 'caraguatatuba', nome: 'Prefeitura de Caraguatatuba', url: 'https://www.caraguatatuba.sp.gov.br/pmc/category/noticias/', padrao: /^https:\/\/www\.caraguatatuba\.sp\.gov\.br\/pmc\/20\d\d\/\d\d\/[\w-]+\/?$/ },
  { cidade: 'sao-sebastiao', nome: 'Prefeitura de São Sebastião', url: 'https://www.saosebastiao.sp.gov.br/portal_noticias.asp', padrao: /^noticia\.asp\?id=N\d+$/ },
  { cidade: 'ilhabela', nome: 'Prefeitura de Ilhabela', url: 'https://www.ilhabela.sp.gov.br/portal/noticias', padrao: /^\/portal\/noticias\/0\/3\/\d+\/[\w-]+\/?$/, tituloNaFoto: true },
  { cidade: 'sao-jose-dos-campos', nome: 'Prefeitura de São José dos Campos', rss: 'https://www.sjc.sp.gov.br/rss' },
  { cidade: 'taubate', nome: 'Prefeitura de Taubaté', url: 'https://www.taubate.sp.gov.br/noticias', padrao: /^\/noticias\/[\w-]+\/[\w-]+$/ },
  { cidade: 'jacarei', nome: 'Prefeitura de Jacareí', rss: 'https://www.jacarei.sp.gov.br/feed/' },
  { cidade: 'cacapava', nome: 'Prefeitura de Caçapava', url: 'https://www.cacapava.sp.gov.br/noticias', padrao: /^\/noticias\/[\w-]+\/[\w-]+$/ },
  { cidade: 'pindamonhangaba', nome: 'Prefeitura de Pindamonhangaba', url: 'https://www.pindamonhangaba.sp.gov.br/noticias', padrao: /^\/noticias\/[\w-]+\/[\w-]+$/ },
  { cidade: 'guaratingueta', nome: 'Prefeitura de Guaratinguetá', rss: 'https://guaratingueta.sp.gov.br/feed/' },
  { cidade: 'aparecida', nome: 'Prefeitura de Aparecida', url: 'https://www.aparecida.sp.gov.br/portal/noticias/3', padrao: /^\/portal\/noticias\/0\/3\/\d+\/[\w-]+\/?$/, tituloNaFoto: true },
  { cidade: 'lorena', nome: 'Prefeitura de Lorena', rss: 'https://www.lorena.sp.gov.br/wordpress/index.php/feed/' },
  { cidade: 'paraibuna', nome: 'Prefeitura de Paraibuna', url: 'https://www.paraibuna.sp.gov.br/', padrao: /^(https:\/\/www\.paraibuna\.sp\.gov\.br)?\/?noticias\/([\w-]+\/)?[\w-]{25,}$/ },
  { cidade: 'campos-do-jordao', nome: 'Prefeitura de Campos do Jordão', url: 'https://www.camposdojordao.sp.gov.br/noticias/', padrao: /^noticias\/\?i=\d+&(amp;)?c=\d+$/ },
  { cidade: 'santo-antonio-do-pinhal', nome: 'Prefeitura de Santo Antônio do Pinhal', url: 'https://www.santoantoniodopinhal.sp.gov.br/noticias', padrao: /^\/noticias\/[\w-]+\/[\w-]+$/ },
  { cidade: 'sao-bento-do-sapucai', nome: 'Prefeitura de São Bento do Sapucaí', rss: 'https://www.saobentodosapucai.sp.gov.br/feed/' },
];

const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
// Com hora: data e hora completas (horário de Brasília). Sem hora: só o dia, "2026-11-09".
const iso = (a, m, d, h, mi) => (h == null
  ? `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  : new Date(Date.UTC(+a, +m - 1, +d, +h + 3, +(mi || 0))).toISOString());

// Tira datas e rótulos que alguns sites colocam junto do título
function limparTitulo(t) {
  let data = null;
  let m = t.match(/(\d{1,2}) (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.? (20\d\d)/i);
  if (m) data = iso(m[3], MESES[m[2].toLowerCase()], m[1]);
  m = !data && t.match(/(\d{2})\/(\d{2})\/(20\d\d)/);
  if (m) data = iso(m[3], m[2], m[1]);
  const titulo = t
    .replace(/^(Notícias\s+)?\d{1,2} (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.? 20\d\d\s*/i, '')
    .replace(/^[A-ZÀ-Úa-zà-ú ,]{0,40}?\s*\d{2}\/\d{2}\/20\d\d\s*/, '')
    .replace(/\s*(Leia mais|Saiba mais|Ver mais)\s*»?$/i, '')
    .replace(/\s+há \d+ (minutos?|horas?|dias?|semanas?)$/i, '')
    .trim();
  return { titulo, data };
}

// São Sebastião põe a data no endereço: noticia.asp?id=N8112026164711 = 8/11/2026 16:47
function dataDoEndereco(href) {
  const m = href.match(/id=N(\d{1,2})(\d{2})(20\d\d)(\d{2})(\d{2})\d{2}$/);
  return m ? iso(m[3], m[2], m[1], m[4], m[5]) : null;
}

// Datas do RSS: o padrão em inglês ou em português ("seg., 09 nov. 2026 12:04:54")
function lerData(txt) {
  if (!txt) return null;
  const m = txt.match(/(\d{1,2}) (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.? (20\d\d)(?: (\d{2}):(\d{2}))?/i);
  if (m) return iso(m[3], MESES[m[2].toLowerCase()], m[1], m[4], m[5]);
  const br = txt.match(/^(\d{2})\/(\d{2})\/(20\d\d)(?: (\d{2}):(\d{2}))?/); // 09/11/2026 11:42
  if (br) return iso(br[3], br[2], br[1], br[4], br[5]);
  const d = new Date(txt);
  return isNaN(d) ? null : d.toISOString();
}

async function baixar(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}

async function lerRSS(f) {
  const xml = await baixar(f.rss);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, x]) => {
    const pega = (tag) => decodificar((x.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || '').trim();
    return { titulo: pega('title'), link: pega('link'), data: lerData(pega('pubDate')) };
  });
}

async function lerPagina(f) {
  const html = await baixar(f.url);
  const base = (html.match(/<base[^>]+href="([^"]+)"/i) || [])[1];
  const raizLinks = base ? (base.endsWith('/') ? base : base + '/') : f.url;
  const achados = new Map();
  for (const [, href, conteudo] of html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const h = decodificar(href).trim();
    if (!f.padrao.test(h)) continue;
    // Em alguns portais o título só aparece certinho no texto alternativo da foto
    const alt = f.tituloNaFoto && (conteudo.match(/<img[^>]+alt="([^"]+)"/i) || [])[1];
    const texto = alt ? decodificar(alt).replace(/_foto\d+$/i, '').trim()
      : decodificar(conteudo.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const link = new URL(h, raizLinks).href;
    const { titulo, data } = limparTitulo(texto);
    const antes = achados.get(link);
    // O mesmo link pode aparecer na foto (sem texto) e no título: fica o texto mais completo
    if (titulo.length >= 20 && (!antes || titulo.length > antes.titulo.length)) {
      achados.set(link, { titulo, link, data: data || dataDoEndereco(h) || antes?.data || null });
    } else if (!antes && titulo.length < 20) {
      achados.set(link, { titulo: '', link, data: data || dataDoEndereco(h) });
    }
  }
  return [...achados.values()].filter((x) => x.titulo);
}

// anteriores = lista publicada antes (para lembrar quando cada manchete apareceu pela primeira vez)
export async function baixarPrefeituras(anteriores = [], porCidade = 8) {
  const vistoAntes = new Map(anteriores.map((x) => [x.link, x.visto]));
  const agora = new Date().toISOString();
  const resultados = await Promise.allSettled(FONTES.map(async (f) => {
    const lista = (f.rss ? await lerRSS(f) : await lerPagina(f))
      .filter((x) => x.titulo && /^https?:\/\//.test(x.link))
      .slice(0, porCidade)
      // "visto" = quando a manchete apareceu pela primeira vez (só vale a partir da segunda atualização)
      .map((x) => ({ ...x, cidade: f.cidade, fonte: f.nome, visto: vistoAntes.get(x.link) || (anteriores.length ? agora : null) }));
    if (!lista.length) throw new Error('nenhuma manchete');
    return lista;
  }));
  const manchetes = [], falhas = [];
  resultados.forEach((r, i) => (r.status === 'fulfilled' ? manchetes.push(...r.value) : falhas.push(`${FONTES[i].cidade} (${r.reason?.message})`)));
  return { manchetes, falhas };
}
