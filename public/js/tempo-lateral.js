// Caixinha "Tempo agora" na lateral da página inicial (cidades do litoral)
import { CIDADES_TEMPO, buscarTempo, descrever } from './tempo-dados.js';

export async function carregarTempoLateral() {
  const caixa = document.getElementById('tempo-lateral');
  const lista = document.getElementById('tempo-mini');
  if (!caixa || !lista) return;
  const cidades = CIDADES_TEMPO.filter((c) => c.regiao === 'litoral');

  async function atualizar() {
    try {
      const dados = await buscarTempo(cidades, { detalhado: false });
      lista.innerHTML = dados.map((c) => {
        const { texto, icone } = descrever(c.atual.weather_code, c.atual.is_day);
        return `<li><a href="/tempo/?cidade=${c.slug}">
          <span class="nome">${c.nome}</span>
          <span class="ic" title="${texto}">${icone}</span>
          <strong>${Math.round(c.atual.temperature_2m)}°</strong>
          ${c.mar ? `<small title="Altura das ondas">🌊 ${c.mar.ondas?.toFixed(1).replace('.', ',') ?? '–'} m</small>` : '<small></small>'}
        </a></li>`;
      }).join('');
      caixa.hidden = false;
    } catch (e) {
      console.error(e); // sem previsão: a caixa continua escondida
    }
  }
  await atualizar();
  setInterval(atualizar, 10 * 60 * 1000);
}
