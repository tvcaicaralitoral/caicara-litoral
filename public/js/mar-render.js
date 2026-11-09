// Desenhos usados na página Surf e Marés e na faixa "Agora no Litoral"
import { textoNota } from './mar-dados.js';

export const hora = (iso) => iso.slice(11, 16).replace(':', 'h');
export const metros = (n, casas = 1) => (n == null ? '–' : n.toFixed(casas).replace('.', ','));

export function estrelas(nota) {
  if (nota == null) return '';
  let s = '';
  for (let i = 1; i <= 5; i++) s += nota >= i - 0.25 ? '★' : '☆';
  return `<span class="estrelas" title="${textoNota(nota)} (${String(nota).replace('.', ',')} de 5)" aria-label="${textoNota(nota)}">${s}</span>`;
}

// Curva da maré de um dia (00h–24h) com marcação de agora
export function curvaMare(serie, extremos, dia, agora, { altura = 130 } = {}) {
  const pts = serie.filter((x) => x.t.startsWith(dia));
  if (pts.length < 10) return '';
  const L = 400, A = altura, M = 16;
  const todos = serie.map((x) => x.n);
  const min = Math.min(...todos), max = Math.max(...todos);
  const y = (n) => M + (1 - (n - min) / (max - min || 1)) * (A - 2 * M);
  const x = (iso) => ((+iso.slice(11, 13) * 60 + +iso.slice(14, 16)) / 1440) * L;
  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.n).toFixed(1)}`).join(' ');
  const area = `${linha} L${x(pts[pts.length - 1].t).toFixed(1)},${A} L0,${A} Z`;
  const marcas = extremos.filter((e) => e.t.startsWith(dia)).map((e) => {
    const cx = x(e.t), cy = y(e.n), acima = e.tipo === 'alta';
    const ty = acima ? cy - 6 : cy + 16;
    const anc = cx < 40 ? 'start' : cx > L - 40 ? 'end' : 'middle';
    return `<circle cx="${cx}" cy="${cy}" r="4.5"/><text x="${cx}" y="${Math.max(11, Math.min(A - 3, ty))}" text-anchor="${anc}">${hora(e.t)}</text>`;
  }).join('');
  const agoraMarca = agora.startsWith(dia)
    ? `<line class="agora" x1="${x(agora)}" x2="${x(agora)}" y1="0" y2="${A}"/><text class="agora-txt" x="${x(agora) + 4}" y="${A - 4}">agora</text>` : '';
  const grade = [6, 12, 18].map((h) => `<line class="grade" x1="${(h / 24) * L}" x2="${(h / 24) * L}" y1="0" y2="${A}"/>`).join('');
  return `<svg class="curva-mare" viewBox="0 0 ${L} ${A}" role="img" aria-label="Curva da maré do dia">
    ${grade}<path class="area" d="${area}"/><path class="linha" d="${linha}"/>${agoraMarca}<g class="pontos">${marcas}</g></svg>
    <div class="curva-eixo"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>`;
}

export function listaMares(extremos, dia) {
  const lista = extremos.filter((e) => e.t.startsWith(dia));
  if (!lista.length) return '<p class="sem-dado">Sem previsão para este dia.</p>';
  return `<ul class="lista-mares">${lista.map((e) => `
    <li class="${e.tipo}"><span class="seta" aria-hidden="true">${e.tipo === 'alta' ? '▲' : '▼'}</span>
      <span>Maré ${e.tipo}</span><strong>${hora(e.t)}</strong><small>${e.n >= 0 ? '+' : ''}${metros(e.n, 2)} m</small></li>`).join('')}</ul>`;
}

export function proximaMare(extremos, agora) {
  return extremos.find((e) => e.t > agora);
}
