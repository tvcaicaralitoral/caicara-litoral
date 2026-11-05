// Transforma um post do Instagram (legenda + mídia) em uma matéria do site.
// Usado no navegador, nas funções do Cloudflare e no servidor de teste local.
import { PERSONAGENS } from './config.js';

export const CIDADES = [
  { nome: 'Ubatuba', slug: 'ubatuba', regiao: 'litoral' },
  { nome: 'Caraguatatuba', slug: 'caraguatatuba', regiao: 'litoral' },
  { nome: 'São Sebastião', slug: 'sao-sebastiao', regiao: 'litoral' },
  { nome: 'Ilhabela', slug: 'ilhabela', regiao: 'litoral' },
  { nome: 'Bertioga', slug: 'bertioga', regiao: 'litoral' },
  { nome: 'São José dos Campos', slug: 'sao-jose-dos-campos', regiao: 'vale' },
  { nome: 'Taubaté', slug: 'taubate', regiao: 'vale' },
  { nome: 'Jacareí', slug: 'jacarei', regiao: 'vale' },
  { nome: 'Pindamonhangaba', slug: 'pindamonhangaba', regiao: 'vale' },
  { nome: 'Guaratinguetá', slug: 'guaratingueta', regiao: 'vale' },
  { nome: 'Lorena', slug: 'lorena', regiao: 'vale' },
  { nome: 'Caçapava', slug: 'cacapava', regiao: 'vale' },
  { nome: 'Aparecida', slug: 'aparecida', regiao: 'vale' },
  { nome: 'Paraibuna', slug: 'paraibuna', regiao: 'vale' },
  { nome: 'Campos do Jordão', slug: 'campos-do-jordao', regiao: 'serra' },
  { nome: 'São Bento do Sapucaí', slug: 'sao-bento-do-sapucai', regiao: 'serra' },
  { nome: 'Santo Antônio do Pinhal', slug: 'santo-antonio-do-pinhal', regiao: 'serra' },
  { nome: 'Paraty', slug: 'paraty', regiao: 'litoral' },
];

export const SECOES = [
  { nome: 'Ubatuba', slug: 'ubatuba' },
  { nome: 'Caraguatatuba', slug: 'caraguatatuba' },
  { nome: 'São Sebastião', slug: 'sao-sebastiao' },
  { nome: 'Ilhabela', slug: 'ilhabela' },
  { nome: 'Bertioga', slug: 'bertioga' },
  { nome: 'Vale e Serra', slug: 'vale-e-serra' },
  { nome: 'Esportes', slug: 'esportes' },
];

const ESPORTE = /esporte|futebol|surf|v[oô]lei|basquete|corrida|maratona|jiu|canoa|remo|skate|campeonato|atleta|torneio|copa\b/i;

export function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function slugify(s, max = 80) {
  return semAcento(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

const chave = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Tira emojis/símbolos do começo da linha ("🚧 TÍTULO" -> "TÍTULO")
const limparInicio = (s) => s.replace(/^[^\p{L}\p{N}"“'(]+/u, '').trim();

function acharCidade(texto, local, hashtags) {
  const candidatos = [local, ...hashtags, texto].filter(Boolean).map(chave);
  for (const fonte of candidatos) {
    for (const c of CIDADES) if (fonte.includes(chave(c.nome))) return c;
  }
  return null;
}

export function parsePost(raw) {
  const legenda = String(raw.caption || '').replace(/\r/g, '').trim();
  const linhas = legenda.split('\n');

  // Título: primeira linha com texto
  let i = linhas.findIndex((l) => limparInicio(l).length > 0);
  let titulo = i >= 0 ? limparInicio(linhas[i]) : '';
  titulo = titulo.replace(/(\s#[\p{L}\p{N}_]+)+\s*$/u, '').trim();
  let resto = i >= 0 ? linhas.slice(i + 1) : [];
  if (titulo.length > 160) {
    // Legenda sem quebra de linha: usa a primeira frase como título
    const corte = titulo.search(/[.!?](\s|$)/);
    const fim = corte > 20 && corte < 160 ? corte + 1 : 120;
    resto = [titulo.slice(fim).trim(), ...resto];
    titulo = titulo.slice(0, fim).trim() + (corte > 20 && corte < 160 ? '' : '…');
  }

  let local = '', fonte = '', foto = '';
  const hashtags = [];
  const corpo = [];
  for (const l of resto) {
    const t = l.trim();
    if (/^📍/u.test(t)) { local = limparInicio(t); continue; }
    if (/^📰/u.test(t)) { fonte = limparInicio(t).replace(/^fonte\s*:\s*/i, ''); continue; }
    if (/^(📷|📸)/u.test(t)) { foto = limparInicio(t).replace(/^fotos?\s*:\s*/i, ''); continue; }
    if (t && /^(#[\p{L}\p{N}_]+[\s,]*)+$/u.test(t)) {
      hashtags.push(...t.match(/#[\p{L}\p{N}_]+/gu).map((h) => h.slice(1)));
      continue;
    }
    corpo.push(l.replace(/\s+$/, ''));
  }

  // Parágrafos separados por linha em branco
  const paragrafos = corpo.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const cidade = acharCidade(legenda, local, hashtags);
  const esportes = hashtags.some((h) => ESPORTE.test(h));
  let secao = null;
  if (esportes) secao = 'esportes';
  else if (cidade && cidade.regiao !== 'litoral') secao = 'vale-e-serra';
  else if (cidade) secao = cidade.slug;

  const filhos = raw.children?.data || [];
  const midiaBruta = raw.media_type === 'CAROUSEL_ALBUM' && filhos.length ? filhos : [raw];
  const midia = midiaBruta
    .map((m) => m.media_type === 'VIDEO'
      ? { tipo: 'video', url: m.media_url, capa: m.thumbnail_url || '' }
      : { tipo: 'imagem', url: m.media_url })
    .filter((m) => m.url || m.capa);
  const capa = midia[0] ? (midia[0].tipo === 'video' ? midia[0].capa || '' : midia[0].url) : '';

  const legendaChave = chave(legenda);
  const personagens = PERSONAGENS
    .filter((p) => p.termos.some((t) => legendaChave.includes(t)))
    .map((p) => p.slug);

  return {
    id: String(raw.id),
    personagens,
    slug: slugify(titulo) || 'materia',
    titulo,
    resumo: paragrafos[0] || '',
    paragrafos: paragrafos.slice(1),
    cidade: cidade ? cidade.nome : '',
    cidadeSlug: cidade ? cidade.slug : '',
    secao,
    local,
    fonte,
    foto,
    hashtags,
    capa,
    midia,
    tipo: raw.media_type,
    link: raw.permalink || '',
    data: raw.timestamp || '',
  };
}

// Posts que não viram matéria: sem legenda ou marcados com #forasite
export function ehMateria(raw) {
  const c = String(raw.caption || '');
  return c.trim().length >= 20 && !/#forasite\b/i.test(c);
}
