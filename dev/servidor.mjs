// Servidor para testar o site no computador, sem Instagram.
// Usa posts de exemplo de dev/demo/instagram-exemplo.json.
// Rodar: node dev/servidor.mjs   →   http://localhost:8788
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePost, ehMateria } from '../public/js/parse.js';
import { paginaMateria } from '../scripts/pagina.mjs';
import { baixarVideos } from '../scripts/youtube.mjs';
import { baixarBrasil } from '../scripts/agenciabrasil.mjs';
import { paginaBrasil } from '../scripts/pagina.mjs';
import { baixarPrefeituras } from '../scripts/prefeituras.mjs';

let cachePref = null;

let cacheBrasil = null;
async function brasil() {
  if (!cacheBrasil || Date.now() - cacheBrasil.t > 600000) cacheBrasil = { t: Date.now(), lista: await baixarBrasil(60) };
  return cacheBrasil.lista;
}

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PORTA = Number(process.env.PORT) || 8788;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.txt': 'text/plain' };

async function noticias() {
  const bruto = JSON.parse(await readFile(join(raiz, 'dev/demo/instagram-exemplo.json'), 'utf8'));
  return { atualizado: Date.now(), exemplo: true, posts: bruto.data.filter(ehMateria).map(parsePost) };
}

async function arquivo(res, caminho, status = 200) {
  try {
    const dados = await readFile(caminho);
    res.writeHead(status, { 'content-type': TIPOS[extname(caminho)] || 'application/octet-stream' });
    res.end(dados);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/dados/noticias.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(await noticias()));
    }
    if (p === '/dados/youtube.json') {
      // No teste também usa o canal de verdade
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ atualizado: Date.now(), videos: await baixarVideos() }));
    }
    if (p === '/dados/prefeituras.json') {
      if (!cachePref || Date.now() - cachePref.t > 600000) cachePref = { t: Date.now(), manchetes: (await baixarPrefeituras()).manchetes };
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ atualizado: cachePref.t, manchetes: cachePref.manchetes }));
    }
    if (p === '/dados/brasil.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ atualizado: Date.now(), noticias: (await brasil()).map(({ corpo, ...m }) => m) }));
    }
    const bm = p.match(/^\/brasil\/([^/]+)\/?$/);
    if (bm) {
      const m = (await brasil()).find((x) => x.slug === bm[1]);
      const modelo = await readFile(join(raiz, 'public/noticia.html'), 'utf8');
      res.writeHead(m ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(m ? paginaBrasil(modelo, m) : modelo);
    }
    if (p === '/dados/aovivo.json') {
      // Para testar a faixa AO VIVO: AOVIVO=1 node dev/servidor.mjs
      res.writeHead(200, { 'content-type': 'application/json' });
      const v = process.env.AOVIVO === '1' ? (await baixarVideos())[0] : null;
      return res.end(JSON.stringify(v ? { ativo: true, id: v.id, titulo: '(teste) ' + v.titulo, inicio: new Date().toISOString() } : { ativo: false }));
    }
    if (p.startsWith('/materia/')) {
      const id = (p.match(/^\/materia\/(\d+)/) || [])[1];
      const modelo = await readFile(join(raiz, 'public/noticia.html'), 'utf8');
      const post = (await noticias()).posts.find((x) => x.id === id);
      res.writeHead(post ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(post ? paginaMateria(modelo, post) : modelo);
    }
    if (p.startsWith('/dev-demo/')) return arquivo(res, join(raiz, 'dev/demo', normalize(p.slice(10))));
    const seguro = normalize(p.endsWith('/') ? p + 'index.html' : p).replace(/^([/\\]*\.\.[/\\])+/, '');
    return arquivo(res, join(raiz, 'public', seguro));
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end(String(e));
  }
}).listen(PORTA, () => console.log(`Site de teste em http://localhost:${PORTA}`));
