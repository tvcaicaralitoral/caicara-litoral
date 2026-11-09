// Gera o site completo na pasta _site:
//  - busca os posts do Instagram e os vídeos do YouTube
//  - cria uma página para cada matéria (com foto e título para WhatsApp/Facebook/Google)
// Roda sozinho no GitHub a cada 15 minutos. Para testar no computador: npm run gerar
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePost, ehMateria } from '../public/js/parse.js';
import { linkMateria, esc } from '../public/js/render.js';
import { SITE } from '../public/js/config.js';
import { paginaMateria } from './pagina.mjs';
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

async function main() {
  await rm(saida, { recursive: true, force: true });
  await cp(join(raiz, 'public'), saida, { recursive: true });
  if (DEMO) await cp(join(raiz, 'dev/demo'), join(saida, 'dev-demo'), { recursive: true });

  const [noticias, youtube, aovivo] = await Promise.all([pegarPosts(), pegarVideos(), pegarAoVivo()]);
  const agora = Date.now();
  await mkdir(join(saida, 'dados'), { recursive: true });
  await writeFile(join(saida, 'dados/noticias.json'), json({ atualizado: agora, ...noticias }));
  await writeFile(join(saida, 'dados/youtube.json'), json({ atualizado: agora, ...youtube }));
  await writeFile(join(saida, 'dados/aovivo.json'), json({ atualizado: agora, ...aovivo }));

  // Uma página por matéria: /materia/<id>-<titulo>/
  const modelo = await readFile(join(raiz, 'public/noticia.html'), 'utf8');
  for (const post of noticias.posts) {
    const pasta = join(saida, linkMateria(post));
    await mkdir(pasta, { recursive: true });
    await writeFile(join(pasta, 'index.html'), paginaMateria(modelo, post));
  }
  // Endereço que não existe (ou matéria nova ainda não gerada): a página tenta achar sozinha
  await writeFile(join(saida, '404.html'), modelo);

  const urls = [
    `<url><loc>${SITE.url}/</loc><changefreq>hourly</changefreq></url>`,
    `<url><loc>${SITE.url}/tempo/</loc><changefreq>hourly</changefreq></url>`,
    `<url><loc>${SITE.url}/mar/</loc><changefreq>hourly</changefreq></url>`,
    ...noticias.posts.map((p) => `<url><loc>${esc(SITE.url + linkMateria(p))}</loc><lastmod>${esc(p.data)}</lastmod></url>`),
  ];
  await writeFile(join(saida, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  await writeFile(join(saida, 'CNAME'), new URL(SITE.url).hostname + '\n');
  await writeFile(join(saida, '.nojekyll'), '');

  console.log(`✓ Site gerado em _site (${noticias.posts.length} matérias)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
