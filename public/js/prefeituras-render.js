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

// Caixa na lateral da página inicial (ou da página de uma cidade)
export async function carregarPrefeiturasLateral(cidade = '') {
  const caixa = document.getElementById('pref-lateral');
  if (!caixa) return;
  try {
    let lista = await buscarPrefeituras();
    if (cidade) lista = lista.filter((m) => m.cidade === cidade);
    if (!lista.length) return;
    document.getElementById('pref-titulo').textContent = cidade ? `Prefeitura de ${nomeCidade(cidade)}` : 'Das prefeituras';
    document.getElementById('pref-lista').innerHTML = lista.slice(0, cidade ? 6 : 8).map((m) => itemPrefeitura(m, { mostrarCidade: !cidade })).join('');
    document.getElementById('pref-ver').href = '/prefeituras/' + (cidade ? '?cidade=' + cidade : '');
    caixa.hidden = false;
  } catch (e) { console.error(e); }
}
