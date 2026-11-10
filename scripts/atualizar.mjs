// Gera o site completo na pasta _site:
//  - busca os posts do Instagram e os vídeos do YouTube
//  - cria uma página para cada matéria (com foto e título para WhatsApp/Facebook/Google)
// Roda sozinho no GitHub a cada 15 minutos. Para testar no computador: npm run gerar
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePost, ehMateria } from '../public/js/parse.js';
import { linkMateria, esc } from '../public/js/render.js';
import { SITE } from '../public/js/config.js';
import { paginaMateria, paginaBrasil } from './pagina.mjs';
import { baixarBrasil } from './agenciabrasil.mjs';
import { baixarPrefeituras } from './prefeituras.mjs';
import { baixarFutebol } from './futebol.mjs';
import { linkBrasil } from '../public/js/brasil-render.js';
import { baixarPosts } from './instagram.mjs';
import { baixarVideos, verificarAoVivo } from './youtube.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const saida = join(raiz, '_site');
const DEMO = process.env.DEMO === '1';

async function versaoNoAr(arquivo) {
  // Se algo falhar, reaproveita o que já está publicado (o site nunca fica vazio)
  try {
    const r = await fetch(`${SITE.url}/dados/${arquivo}`, { signal: AbortSignal.timeout(15000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function pegarPosts() {
  if (DEMO) {
    const bruto = JSON.parse(await readFile(join(raiz, 'dev/demo/instagram-exemplo.json'), 'utf8'));
    return { exemplo: true, posts: bruto.data.filter(ehMateria).map(parsePost) };
  }
  const token = process.env.IG_TOKEN;
  if (!token) {
    console.warn('⚠ IG_TOKEN não configurado: o site vai sem notícias do Instagram.');
    return { posts: [] };
  }
  try {
    const brutos = await baixarPosts(token, Number(process.env.MAX_POSTS) || 150);
    const posts = brutos.filter(ehMateria).map(parsePost).filter((p) => p.titulo);
    console.log(`✓ Instagram: ${posts.length} matérias`);
    return { posts };
  } catch (e) {
    console.error('✗ Instagram falhou:', e.message);
    const antes = await versaoNoAr('noticias.json');
    if (antes?.posts?.length) console.log(`  usando a versão publicada (${antes.posts.length} matérias)`);
    return { posts: antes?.posts || [], desatualizado: true };
  }
}

async function pegarVideos() {
  try {
    const videos = await baixarVideos();
    console.log(`✓ YouTube: ${videos.length} vídeos`);
    return { videos };
  } catch (e) {
    console.error('✗ YouTube falhou:', e.message);
    const antes = await versaoNoAr('youtube.json');
    return { videos: antes?.videos || [] };
  }
}

async function pegarBrasil() {
  try {
    const noticias = await baixarBrasil(60);
    console.log(`✓ Agência Brasil: ${noticias.length} notícias`);
    return noticias;
  } catch (e) {
    console.error('✗ Agência Brasil falhou:', e.message);
    return null; // as páginas antigas somem, mas a lista publicada continua (sem o texto)
  }
}

async function pegarPrefeituras() {
  const antes = (await versaoNoAr('prefeituras.json'))?.manchetes || [];
  try {
    const { manchetes, falhas } = await baixarPrefeituras(antes);
    // Prefeitura que falhou desta vez: mantém as manchetes de antes
    const ok = new Set(manchetes.map((m) => m.cidade));
    const mantidas = antes.filter((m) => !ok.has(m.cidade));
    console.log(`✓ Prefeituras: ${manchetes.length} manchetes${falhas.length ? ' (falharam: ' + falhas.join(', ') + ')' : ''}`);
    return [...manchetes, ...mantidas];
  } catch (e) {
    console.error('✗ Prefeituras falharam:', e.message);
    return antes;
  }
}

async function pegarFutebol() {
  const antes = (await versaoNoAr('futebol.json'))?.ligas || [];
  try {
    const { ligas, falhas } = await baixarFutebol();
    // Série que falhou desta vez: mantém a versão anterior
    const ok = new Set(ligas.map((l) => l.id));
    const mantidas = antes.filter((l) => !ok.has(l.id));
    console.log(`✓ Brasileirão: ${ligas.map((l) => l.nome + ' ' + l.jogos.length + ' jogos').join(', ')}${falhas.length ? ' (falharam: ' + falhas.join('; ') + ')' : ''}`);
    return [...ligas, ...mantidas].sort((x, y) => x.id.localeCompare(y.id));
  } catch (e) {
    console.error('✗ Brasileirão falhou:', e.message);
    return antes;
  }
}

async function pegarAoVivo() {
  const chave = process.env.YT_KEY;
  if (!chave || DEMO) return { ativo: false, configurado: false };
  try {
    const r = await verificarAoVivo(chave);
    console.log(r.ativo ? `✓ AO VIVO: ${r.titulo}` : `✓ YouTube: sem live agora${r.agendada ? " (agendada " + r.agendada.inicio + ")" : ""}`);
    return { configurado: true, ...r };
  } catch (e) {
    console.error("✗ Verificação de live falhou:", e.message);
    return { ativo: false, configurado: true, erro: true };
  }
}

const json = (o) => JSON.stringify(o);

// Coloca "?v=<versão>" em todos os .js e .css do site. A versão só muda quando o código muda,
// então o navegador de quem visita nunca mistura arquivos novos com antigos guardados.
async function carimbarVersao() {
  const arquivos = async (pasta) => (await readdir(pasta, { recursive: true, withFileTypes: true }))
    .filter((d) => d.isFile()).map((d) => join(d.parentPath ?? d.path, d.name));
  const todos = await arquivos(saida);
  const codigo = todos.filter((a) => /\.(js|css)$/.test(a)).sort();
  const hash = createHash('sha1');
  for (const a of codigo) hash.update(await readFile(a));
  const v = hash.digest('hex').slice(0, 8);
  for (const a of todos.filter((x) => /\.(js|html)$/.test(x))) {
    const antes = await readFile(a, 'utf8');
    const depois = antes
      .replace(/(from\s+['"]\.{1,2}\/[\w./-]+\.js)(['"])/g, `$1?v=${v}$2`)
      .replace(/(import\(\s*['"]\.{1,2}\/[\w./-]+\.js)(['"])/g, `$1?v=${v}$2`)
      .replace(/((?:src|href)="\/(?:js|css)\/[\w./-]+\.(?:js|css))(")/g, `$1?v=${v}$2`);
    if (depois !== antes) await writeFile(a, depois);
  }
  return v;
}

async function main() {
  await rm(saida, { recursive: true, force: true });
  await cp(join(raiz, 'public'), saida, { recursive: true });
  if (DEMO) await cp(join(raiz, 'dev/demo'), join(saida, 'dev-demo'), { recursive: true });

  const [noticias, youtube, aovivo, brasilNovo, prefeituras, futebol] = await Promise.all([pegarPosts(), pegarVideos(), pegarAoVivo(), pegarBrasil(), DEMO ? baixarPrefeituras().then((r) => r.manchetes).catch(() => []) : pegarPrefeituras(), DEMO ? baixarFutebol().then((r) => r.ligas).catch(() => []) : pegarFutebol()]);
  const brasil = brasilNovo || [];
  const agora = Date.now();
  await mkdir(join(saida, 'dados'), { recursive: true });
  await writeFile(join(saida, 'dados/noticias.json'), json({ atualizado: agora, ...noticias }));
  await writeFile(join(saida, 'dados/youtube.json'), json({ atualizado: agora, ...youtube }));
  await writeFile(join(saida, 'dados/aovivo.json'), json({ atualizado: agora, ...aovivo }));
  await writeFile(join(saida, 'dados/prefeituras.json'), json({ atualizado: agora, manchetes: prefeituras }));
  await writeFile(join(saida, 'dados/futebol.json'), json({ atualizado: agora, fonte: 'ESPN', ligas: futebol }));
  // Lista leve (sem o texto) para as páginas; o texto vai direto na página de cada notícia
  await writeFile(join(saida, 'dados/brasil.json'), json({ atualizado: agora, fonte: 'Agência Brasil', noticias: brasil.map(({ corpo, ...m }) => m) }));

  // Uma página por matéria: /materia/<id>-<titulo>/
  const modelo = await readFile(join(raiz, 'public/noticia.html'), 'utf8');
  for (const post of noticias.posts) {
    const pasta = join(saida, linkMateria(post));
    await mkdir(pasta, { recursive: true });
    await writeFile(join(pasta, 'index.html'), paginaMateria(modelo, post));
  }
  // Uma página por notícia do Brasil: /brasil/<titulo>/
  for (const m of brasil) {
    const pasta = join(saida, linkBrasil(m));
    await mkdir(pasta, { recursive: true });
    await writeFile(join(pasta, 'index.html'), paginaBrasil(modelo, m));
  }
  // Endereço que não existe (ou matéria nova ainda não gerada): a página tenta achar sozinha
  await writeFile(join(saida, '404.html'), modelo);

  const urls = [
    `<url><loc>${SITE.url}/</loc><changefreq>hourly</changefreq></url>`,
    `<url><loc>${SITE.url}/tempo/</loc><changefreq>hourly</changefreq></url>`,
    `<url><loc>${SITE.url}/mar/</loc><changefreq>hourly</changefreq></url>`,
    `<url><loc>${SITE.url}/brasil/</loc><changefreq>hourly</changefreq></url>`,
    ...noticias.posts.map((p) => `<url><loc>${esc(SITE.url + linkMateria(p))}</loc><lastmod>${esc(p.data)}</lastmod></url>`),
  ];
  await writeFile(join(saida, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  await writeFile(join(saida, 'CNAME'), new URL(SITE.url).hostname + '\n');
  await writeFile(join(saida, '.nojekyll'), '');

  const versao = await carimbarVersao();
  console.log(`✓ Site gerado em _site (${noticias.posts.length} matérias, versão ${versao})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
