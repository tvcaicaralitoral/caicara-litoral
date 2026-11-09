// Faixas no topo de todas as páginas: AO VIVO, live agendada e alertas do INMET.
import { esc } from './render.js';
import { CIDADES_TEMPO } from './tempo-dados.js';

const CODIGOS = new Map(CIDADES_TEMPO.map((c) => [String(c.ibge), c.nome]));

function caixa() {
  let el = document.getElementById('faixas-avisos');
  if (!el) {
    el = document.createElement('div');
    el.id = 'faixas-avisos';
    el.className = 'faixas-avisos';
    el.setAttribute('aria-live', 'polite');
    (document.querySelector('nav.menu') || document.body.firstElementChild).after(el);
  }
  return el;
}

function colocar(id, html) {
  const el = caixa();
  let f = document.getElementById(id);
  if (!html) { f?.remove(); return; }
  if (!f) { f = document.createElement('div'); f.id = id; id === 'faixa-aovivo' ? el.prepend(f) : el.append(f); }
  f.innerHTML = html;
}

const horaSP = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace(':', 'h');

// ---------- AO VIVO ----------
async function aoVivo() {
  try {
    const r = await fetch('/dados/aovivo.json?v=' + Math.floor(Date.now() / 60000));
    if (!r.ok) return;
    const d = await r.json();
    const naHome = location.pathname === '/';
    if (d.ativo && d.id) {
      const link = naHome ? '#videos' : '/#videos';
      colocar('faixa-aovivo', `<a class="faixa faixa-aovivo" href="${link}">
        <span class="container faixa-linha"><span class="selo-aovivo"><span class="ponto"></span>AO VIVO</span>
        <span class="faixa-texto">${esc(d.titulo)}</span><span class="faixa-acao">Assistir agora ›</span></span></a>`);
    } else if (d.agendada) {
      const hoje = new Date().toDateString() === new Date(d.agendada.inicio).toDateString();
      colocar('faixa-aovivo', `<a class="faixa faixa-agendada" href="https://www.youtube.com/watch?v=${esc(d.agendada.id)}" target="_blank" rel="noopener">
        <span class="container faixa-linha"><span class="selo-agendada">📺 ${hoje ? 'Hoje' : 'Amanhã'} às ${horaSP(d.agendada.inicio)}</span>
        <span class="faixa-texto">Ao vivo na TV Caiçara: ${esc(d.agendada.titulo)}</span><span class="faixa-acao">Lembrar ›</span></span></a>`);
    } else colocar('faixa-aovivo', '');
  } catch { /* sem faixa */ }
}

// ---------- Alertas do INMET ----------
const EXEMPLO = { hoje: [{ descricao: 'Acumulado de Chuva', severidade: 'Perigo', inicio: '2026-11-09 10:00', fim: '2026-11-10 10:00', geocodes: '3555406,3510500,3550704,3520400', riscos: ['Chuva entre 30 e 60 mm/h ou 50 e 100 mm/dia. Risco de alagamentos e deslizamentos.'], instrucoes: ['Não enfrente o mau tempo.', 'Evite áreas de encosta.'] }], futuro: [] };
const GRAU = { 'Grande Perigo': 3, Perigo: 2, 'Perigo Potencial': 1 };

async function alertas() {
  try {
    // No computador de teste, ?alerta=teste mostra um alerta de exemplo
    const teste = location.hostname === 'localhost' && location.search.includes('alerta=teste');
    const r = teste ? null : await fetch('https://apiprevmet3.inmet.gov.br/avisos/ativos');
    if (r && !r.ok) return;
    const d = teste ? EXEMPLO : await r.json();
    const lista = [...(d.hoje || []).map((a) => ({ ...a, quando: 'hoje' })), ...(d.futuro || []).map((a) => ({ ...a, quando: 'futuro' }))]
      .map((a) => ({ ...a, cidades: String(a.geocodes || '').split(',').filter((g) => CODIGOS.has(g.trim())).map((g) => CODIGOS.get(g.trim())) }))
      .filter((a) => a.cidades.length && !a.encerrado)
      .sort((a, b) => (GRAU[b.severidade] || 0) - (GRAU[a.severidade] || 0) || (a.quando === 'hoje' ? -1 : 1));
    if (!lista.length) { colocar('faixa-alerta', ''); return; }

    const principal = lista[0];
    const nivel = GRAU[principal.severidade] || 1;
    const cidadesTxt = (c) => (c.length > 4 ? c.slice(0, 4).join(', ') + ` e mais ${c.length - 4}` : c.join(', '));
    const periodo = (a) => `${a.quando === 'hoje' ? 'até' : 'de ' + a.inicio.slice(8, 10) + '/' + a.inicio.slice(5, 7) + ' ' + a.inicio.slice(11, 16).replace(':', 'h') + ' até'} ${a.fim.slice(8, 10)}/${a.fim.slice(5, 7)} ${a.fim.slice(11, 16).replace(':', 'h')}`;
    const detalhes = lista.map((a) => `
      <div class="alerta-item">
        <strong>${esc(a.descricao)} — ${esc(a.severidade)}</strong> <small>${esc(periodo(a))}</small>
        <p><b>Cidades:</b> ${esc(a.cidades.join(', '))}</p>
        ${(a.riscos || []).map((t) => `<p>${esc(t)}</p>`).join('')}
        ${(a.instrucoes || []).length ? `<ul>${a.instrucoes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      </div>`).join('');

    colocar('faixa-alerta', `<details class="faixa faixa-alerta nivel-${nivel}">
      <summary class="container faixa-linha"><span class="selo-alerta">⚠ Alerta INMET</span>
        <span class="faixa-texto"><b>${esc(principal.descricao)}</b> (${esc(principal.severidade)}) ${principal.quando === 'hoje' ? 'hoje' : 'a partir de ' + principal.inicio.slice(8, 10) + '/' + principal.inicio.slice(5, 7)} em ${esc(cidadesTxt(principal.cidades))}${lista.length > 1 ? ` <small>+${lista.length - 1} aviso${lista.length > 2 ? 's' : ''}</small>` : ''}</span>
        <span class="faixa-acao">Detalhes</span></summary>
      <div class="container alerta-detalhes">${detalhes}
        <p class="alerta-fonte">Fonte: <a href="https://alertas2.inmet.gov.br/" target="_blank" rel="noopener">INMET</a> · Emergências: Defesa Civil 199 · Bombeiros 193</p></div>
    </details>`);
  } catch { /* INMET fora do ar: sem faixa */ }
}

export function iniciarAvisos() {
  aoVivo();
  alertas();
  setInterval(aoVivo, 2 * 60 * 1000);
  setInterval(alertas, 10 * 60 * 1000);
}
