// Partes comuns a todas as páginas: menu, data de hoje, busca das notícias.
import { SECOES } from './parse.js';
import { PERSONAGENS } from './config.js';
import { dataRelativa } from './render.js';
import { iniciarAvisos } from './avisos.js';

export async function buscarNoticias() {
  // O "?v=" muda a cada minuto para sempre pegar a versão mais nova
  const r = await fetch('/dados/noticias.json?v=' + Math.floor(Date.now() / 60000));
  if (!r.ok) throw new Error('Falha ao carregar as notícias (' + r.status + ')');
  const dados = await r.json(); // { atualizado, posts: [...] }
  if (!dados.posts?.length) throw new Error('Nenhuma notícia ainda');
  return dados;
}

export function montarMenu(ativo = '') {
  const el = document.getElementById('menu');
  if (!el) return;
  const itens = [
    { nome: 'Início', href: '/', slug: '' },
    ...SECOES.map((s) => ({ nome: s.nome, href: `/?secao=${s.slug}`, slug: s.slug })),
    { nome: "Brasil", href: "/brasil/", slug: "brasil" },
    { nome: "Tempo", href: "/tempo/", slug: "tempo", tempo: true },
    { nome: "Surf e Marés", href: "/mar/", slug: "mar", mar: true },
    ...PERSONAGENS.map((p) => ({ nome: p.nome, href: `/?personagem=${p.slug}`, slug: 'p:' + p.slug, destaque: true })),
  ];
  el.innerHTML = itens.map((i) =>
    `<a href="${i.href}" class="${i.slug === ativo ? 'ativo' : ''} ${i.destaque ? 'menu-personagem' : ''} ${i.tempo ? 'menu-tempo' : ''} ${i.mar ? 'menu-mar' : ''}">${i.nome}</a>`).join('');
  // No celular, rola o menu até a seção atual
  const atual = el.querySelector('.ativo');
  if (atual && atual !== el.firstElementChild) el.scrollLeft = atual.offsetLeft - el.clientWidth / 2 + atual.offsetWidth / 2;
}

export function iniciarPagina() {
  iniciarAvisos();
  const hoje = document.getElementById('hoje');
  if (hoje) {
    hoje.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
    });
  }
  const ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  // Atualiza "há X min" a cada minuto
  setInterval(() => {
    document.querySelectorAll('time[data-rel]').forEach((t) => { t.textContent = dataRelativa(t.dateTime); });
  }, 60000);

  // Botão "copiar link"
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.bt-copiar');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.url); b.textContent = 'Link copiado!'; }
    catch { prompt('Copie o link:', b.dataset.url); }
  });
}
