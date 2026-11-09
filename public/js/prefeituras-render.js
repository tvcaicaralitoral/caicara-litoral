// Manchetes das prefeituras: só título e link para o site oficial
import { esc, dataRelativa } from './render.js';
import { CIDADES_TEMPO } from './tempo-dados.js';

export const nomeCidade = (slug) => CIDADES_TEMPO.find((c) => c.slug === slug)?.nome || slug;
export const quando = (m) => m.data || m.visto;

export async function buscarPrefeituras() {
  const r = await fetch('/dados/prefeituras.json?v=' + Math.floor(Date.now() / 60000));
  if (!r.ok) throw new Error('Falha ao carregar manchetes das prefeituras');
  // Esconde manchetes com data conhecida de mais de 30 dias (sites que quase não atualizam)
  const limite = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  return misturar(((await r.json()).manchetes || []).filter((m) => !m.data || m.data.slice(0, 10) >= limite));
}

// Nem todo site informa a data: mantém a ordem de cada prefeitura (mais nova primeiro)
// e intercala as cidades, começando pela que publicou por último.
function misturar(lista) {
  const grupos = new Map();
  for (const m of lista) { if (!grupos.has(m.cidade)) grupos.set(m.cidade, []); grupos.get(m.cidade).push(m); }
  const recente = (g) => g.map(quando).filter(Boolean).sort().pop() || '';
  const ordem = [...grupos.values()].sort((a, b) => recente(b).localeCompare(recente(a)));
  const saida = [];
  for (let i = 0; ordem.some((g) => g[i]); i++) for (const g of ordem) if (g[i]) saida.push(g[i]);
  return saida;
}

// Quando o site só informa o dia (sem hora), mostra "9 de nov." em vez de "há X min"
function tempoHTML(q) {
  if (!q) return '';
  if (q.length === 10) {
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const txt = q === hoje ? 'hoje' : new Date(q + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `<time datetime="${esc(q)}">${esc(txt)}</time> · `;
  }
  return `<time datetime="${esc(q)}" data-rel>${esc(dataRelativa(q))}</time> · `;
}

export function itemPrefeitura(m, { mostrarCidade = true } = {}) {
  return `<li><a href="${esc(m.link)}" target="_blank" rel="noopener">
    ${mostrarCidade ? `<span class="chapeu">${esc(nomeCidade(m.cidade))}</span>` : ''}
    <strong>${esc(m.titulo)}</strong>
    <small>${tempoHTML(quando(m))}site da prefeitura ↗</small>
  </a></li>`;
}

// Na aba de cada cidade: as notícias da prefeitura dela.
// Na aba "Vale e Serra": as prefeituras dessas cidades juntas, com o nome de cada uma.
export async function carregarPrefeiturasCidade(secao) {
  const caixa = document.getElementById('pref-cidade');
  if (!caixa) return;
  const regional = secao === 'vale-e-serra';
  const daqui = regional
    ? new Set(CIDADES_TEMPO.filter((c) => c.regiao === 'vale' || c.regiao === 'serra').map((c) => c.slug))
    : new Set(CIDADES_TEMPO.some((c) => c.slug === secao) ? [secao] : []);
  if (!daqui.size) return;
  try {
    const lista = (await buscarPrefeituras()).filter((m) => daqui.has(m.cidade));
    if (!lista.length) return;
    document.getElementById('pref-titulo').textContent = regional ? 'Notícias das prefeituras do Vale e da Serra' : `Notícias da Prefeitura de ${nomeCidade(secao)}`;
    document.getElementById('pref-lista').innerHTML = lista.slice(0, regional ? 12 : 6).map((m) => itemPrefeitura(m, { mostrarCidade: regional })).join('');
    if (!regional) {
      const site = document.getElementById('pref-site');
      try { site.href = new URL(lista[0].link).origin; site.hidden = false; } catch { /* sem link */ }
    }
    caixa.hidden = false;
  } catch (e) { console.error(e); }
}
