// Brasileirão Séries A e B: classificação, últimos resultados e próximos jogos (dados públicos da ESPN).
// A ESPN só aceita um dia por consulta, então buscamos dia a dia: 4 dias para trás e 10 para frente.
const LIGAS = [
  { id: 'bra.1', nome: 'Série A' },
  { id: 'bra.2', nome: 'Série B' },
];
const BASE = 'https://site.api.espn.com/apis';

async function pegar(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  return r.json();
}

// Dia no fuso de Brasília, no formato da ESPN (20261110)
const diaBR = (deslocamento) => new Date(Date.now() + deslocamento * 86400000 - 3 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
const stat = (entrada, nome) => entrada.stats.find((s) => s.name === nome)?.value ?? 0;
const time = (t) => ({ nome: t.shortDisplayName || t.displayName, sigla: t.abbreviation, escudo: t.logo || t.logos?.[0]?.href || '' });

async function tabela(liga) {
  const j = await pegar(`${BASE}/v2/sports/soccer/${liga}/standings`);
  const entradas = j.children?.[0]?.standings?.entries || [];
  if (!entradas.length) throw new Error(`tabela vazia (${liga})`);
  return entradas.map((e) => ({
    ...time(e.team),
    pos: stat(e, 'rank'),
    pts: stat(e, 'points'),
    j: stat(e, 'gamesPlayed'),
    v: stat(e, 'wins'),
    e: stat(e, 'ties'),
    d: stat(e, 'losses'),
    sg: stat(e, 'pointDifferential'),
  })).sort((a, b) => a.pos - b.pos);
}

async function jogos(liga) {
  const dias = Array.from({ length: 15 }, (_, i) => diaBR(i - 4));
  const resp = await Promise.allSettled(dias.map((d) => pegar(`${BASE}/site/v2/sports/soccer/${liga}/scoreboard?dates=${d}`)));
  const vistos = new Map();
  for (const r of resp) {
    if (r.status !== 'fulfilled') continue;
    for (const ev of r.value.events || []) {
      const c = ev.competitions?.[0];
      const casa = c?.competitors?.find((x) => x.homeAway === 'home');
      const fora = c?.competitors?.find((x) => x.homeAway === 'away');
      if (!casa || !fora) continue;
      vistos.set(ev.id, {
        id: ev.id,
        data: ev.date,
        estado: ev.status?.type?.state, // pre = vai acontecer, in = ao vivo, post = terminou
        detalhe: ev.status?.type?.shortDetail || '',
        relogio: ev.status?.displayClock || '',
        casa: { ...time(casa.team), gols: casa.score ?? null },
        fora: { ...time(fora.team), gols: fora.score ?? null },
        estadio: c.venue?.fullName || '',
      });
    }
  }
  return [...vistos.values()].sort((a, b) => a.data.localeCompare(b.data));
}

export async function baixarFutebol() {
  const ligas = [];
  const falhas = [];
  for (const l of LIGAS) {
    try {
      const [t, g] = await Promise.all([tabela(l.id), jogos(l.id)]);
      ligas.push({ id: l.id, nome: l.nome, tabela: t, jogos: g });
    } catch (e) { falhas.push(`${l.nome}: ${e.message}`); }
  }
  return { ligas, falhas };
}
