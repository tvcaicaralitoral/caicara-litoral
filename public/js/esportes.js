// Aba Esportes: Brasileirão (Séries A e B) e notícias de esporte da Agência Brasil
import { esc } from './render.js';
import { buscarBrasil, cardBrasil } from './brasil-render.js';

// Faixas da tabela: Série A (Libertadores, Sul-Americana, rebaixamento) e Série B (acesso, rebaixamento)
const ZONAS = {
  'bra.1': [{ ate: 4, cls: 'z-liberta', nome: 'Libertadores (G4)' }, { de: 17, cls: 'z-queda', nome: 'Rebaixamento (Z4)' }],
  'bra.2': [{ ate: 4, cls: 'z-acesso', nome: 'Acesso à Série A (G4)' }, { de: 17, cls: 'z-queda', nome: 'Rebaixamento (Z4)' }],
};
function zona(liga, pos) {
  let ini = 1;
  for (const z of ZONAS[liga] || []) {
    if (z.de ? pos >= z.de : pos >= ini && pos <= z.ate) return z.cls;
    if (z.ate) ini = z.ate + 1;
  }
  return '';
}

const fuso = { timeZone: 'America/Sao_Paulo' };
const diaChave = (iso) => new Date(iso).toLocaleDateString('sv-SE', fuso);
function nomeDia(iso) {
  const hoje = new Date().toLocaleDateString('sv-SE', fuso);
  const amanha = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', fuso);
  const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', fuso);
  const k = diaChave(iso);
  const txt = new Date(iso).toLocaleDateString('pt-BR', { ...fuso, weekday: 'long', day: 'numeric', month: 'short' });
  return k === hoje ? `Hoje · ${txt}` : k === amanha ? `Amanhã · ${txt}` : k === ontem ? `Ontem · ${txt}` : txt;
}
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { ...fuso, hour: '2-digit', minute: '2-digit' });
const escudo = (t) => (t.escudo ? `<img src="${esc(t.escudo)}" alt="" width="24" height="24" loading="lazy" onerror="this.style.visibility='hidden'">` : '<span class="esc-vazio"></span>');

function jogoHTML(g) {
  const meio = g.estado === 'pre'
    ? `<span class="jogo-hora">${hora(g.data)}</span>`
    : `<span class="jogo-placar">${esc(g.casa.gols ?? '')} <small>×</small> ${esc(g.fora.gols ?? '')}</span>`;
  const status = g.estado === 'in' ? `<span class="jogo-vivo">● AO VIVO ${esc(g.relogio)}</span>` : g.estado === 'post' ? '<span class="jogo-fim">Encerrado</span>' : '';
  return `<li class="jogo ${g.estado === 'in' ? 'ao-vivo' : ''}">
    <span class="jogo-time casa">${esc(g.casa.nome)} ${escudo(g.casa)}</span>
    ${meio}
    <span class="jogo-time fora">${escudo(g.fora)} ${esc(g.fora.nome)}</span>
    ${status || g.estadio ? `<small class="jogo-info">${status}${status && g.estadio ? ' · ' : ''}${esc(g.estadio)}</small>` : ''}
  </li>`;
}

function porDia(lista) {
  const grupos = new Map();
  for (const g of lista) { const k = diaChave(g.data); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(g); }
  return [...grupos.values()].map((gs) => `<h4 class="jogos-dia">${esc(nomeDia(gs[0].data))}</h4><ul class="jogos">${gs.map(jogoHTML).join('')}</ul>`).join('');
}

function ligaHTML(l) {
  const vivos = l.jogos.filter((g) => g.estado === 'in');
  const proximos = l.jogos.filter((g) => g.estado === 'pre').slice(0, 10);
  const ultimos = l.jogos.filter((g) => g.estado === 'post').slice(-10).reverse();
  const legenda = (ZONAS[l.id] || []).map((z) => `<span><i class="${z.cls}"></i>${z.nome}</span>`).join('');
  return `<div class="br-grade">
    <div class="br-jogos">
      ${vivos.length ? `<h3 class="br-sub vivo">Ao vivo agora</h3><ul class="jogos">${vivos.map(jogoHTML).join('')}</ul>` : ''}
      <h3 class="br-sub">Próximos jogos</h3>
      ${proximos.length ? porDia(proximos) : '<p class="vazio">Sem jogos marcados para os próximos dias.</p>'}
      ${ultimos.length ? `<h3 class="br-sub">Últimos resultados</h3>${porDia(ultimos)}` : ''}
    </div>
    <div class="br-tabela-caixa">
      <h3 class="br-sub">Classificação</h3>
      <div class="br-rolagem"><table class="br-tabela">
        <thead><tr><th></th><th class="t-time">Time</th><th title="Pontos">P</th><th title="Jogos">J</th><th title="Vitórias">V</th><th title="Empates">E</th><th title="Derrotas">D</th><th title="Saldo de gols">SG</th></tr></thead>
        <tbody>${l.tabela.map((t) => `<tr class="${zona(l.id, t.pos)}">
          <td class="t-pos">${t.pos}</td>
          <td class="t-time">${escudo(t)}<span>${esc(t.nome)}</span></td>
          <td class="t-pts">${t.pts}</td><td>${t.j}</td><td>${t.v}</td><td>${t.e}</td><td>${t.d}</td><td>${t.sg > 0 ? '+' : ''}${t.sg}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <p class="br-legenda">${legenda}</p>
    </div>
  </div>`;
}

export async function carregarEsportes() {
  const caixa = document.getElementById('esportes-painel');
  if (!caixa) return;
  caixa.hidden = false;
  // Brasileirão
  try {
    const r = await fetch('/dados/futebol.json?v=' + Math.floor(Date.now() / 60000));
    const { ligas = [], atualizado } = r.ok ? await r.json() : {};
    if (ligas.length) {
      const abas = document.getElementById('br-abas');
      const corpo = document.getElementById('br-corpo');
      const mostrar = (id) => {
        const l = ligas.find((x) => x.id === id) || ligas[0];
        abas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.id === l.id));
        corpo.innerHTML = ligaHTML(l);
      };
      abas.innerHTML = ligas.map((l) => `<button type="button" role="tab" data-id="${l.id}">${esc(l.nome)}</button>`).join('');
      abas.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) mostrar(b.dataset.id); });
      mostrar(ligas[0].id);
      if (atualizado) document.getElementById('br-atualizado').textContent = 'Atualizado às ' + new Date(atualizado).toLocaleTimeString('pt-BR', { ...fuso, hour: '2-digit', minute: '2-digit' });
      document.getElementById('brasileirao').hidden = false;
    }
  } catch (e) { console.error(e); }
  // Notícias de esporte da Agência Brasil
  try {
    const lista = (await buscarBrasil()).filter((m) => m.editoria === 'Esportes');
    if (lista.length) {
      document.getElementById('esp-noticias-lista').innerHTML = lista.slice(0, 8).map((m) => cardBrasil(m)).join('');
      document.getElementById('esp-noticias').hidden = false;
    }
  } catch (e) { console.error(e); }
}
