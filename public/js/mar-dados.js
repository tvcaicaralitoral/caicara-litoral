// Surf, marés e lua — tudo calculado no navegador com dados do Open-Meteo (grátis, sem chave).
import { direcaoVento } from './tempo-dados.js';

const TZ = 'America%2FSao_Paulo';

// frente = para onde a praia "olha" (graus, 0 = norte, 90 = leste, 180 = sul)
export const PRAIAS = [
  { nome: 'Itamambuca', cidade: 'Ubatuba', lat: -23.404, lon: -45.009, frente: 110 },
  { nome: 'Praia Grande', cidade: 'Ubatuba', lat: -23.471, lon: -45.064, frente: 150 },
  { nome: 'Massaguaçu', cidade: 'Caraguatatuba', lat: -23.598, lon: -45.339, frente: 80 },
  { nome: 'Maresias', cidade: 'São Sebastião', lat: -23.793, lon: -45.564, frente: 180 },
  { nome: 'Camburi', cidade: 'São Sebastião', lat: -23.772, lon: -45.648, frente: 175 },
  { nome: 'Juquehy', cidade: 'São Sebastião', lat: -23.769, lon: -45.743, frente: 180 },
  { nome: 'Castelhanos', cidade: 'Ilhabela', lat: -23.860, lon: -45.290, frente: 90 },
  { nome: 'Bonete', cidade: 'Ilhabela', lat: -23.940, lon: -45.335, frente: 180 },
  { nome: 'Riviera de São Lourenço', cidade: 'Bertioga', lat: -23.790, lon: -46.030, frente: 160 },
];

// Ponto no mar ~4 km em frente à praia (onde o modelo de ondas tem dado)
function pontoMar(p, km = 4) {
  const r = (p.frente * Math.PI) / 180;
  const graus = km / 111;
  return [p.lat + Math.cos(r) * graus, p.lon + (Math.sin(r) * graus) / Math.cos((p.lat * Math.PI) / 180)];
}

async function pegar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Serviço indisponível (' + r.status + ')');
  const j = await r.json();
  return Array.isArray(j) ? j : [j];
}

const fix = (n) => n.toFixed(3);

// ---------- Surf ----------
// Nota de 0 a 5: tamanho e período da onda, e vento (terral é bom, maral forte estraga)
export function notaSurf(onda, periodo, ventoKmh, ventoDir, frente) {
  if (onda == null) return null;
  let nota = 0;
  if (onda >= 0.5) nota += 1;
  if (onda >= 0.9) nota += 1;
  if (onda >= 1.4 && onda <= 3) nota += 1;
  if (onda > 3.5) nota -= 1;
  if (periodo >= 8) nota += 1;
  if (periodo >= 11) nota += 0.5;
  // diferença entre o lado de onde vem o vento e o lado do mar
  const dif = Math.abs(((ventoDir - frente + 540) % 360) - 180); // 180 = vento vindo da terra (terral)
  if (ventoKmh < 8) nota += 1;
  else if (dif > 110) nota += ventoKmh < 25 ? 1 : 0.5; // terral
  else if (dif < 70 && ventoKmh > 15) nota -= 1; // maral forte
  return Math.max(0, Math.min(5, Math.round(nota * 2) / 2));
}

export function textoNota(n) {
  if (n == null) return 'Sem dados';
  if (n < 1.5) return 'Flat / fraco';
  if (n < 2.5) return 'Fraco';
  if (n < 3.5) return 'Bom';
  if (n < 4.5) return 'Muito bom';
  return 'Clássico';
}

export function tipoVento(ventoDir, frente, kmh) {
  if (kmh < 8) return 'fraco';
  const dif = Math.abs(((ventoDir - frente + 540) % 360) - 180);
  if (dif > 110) return 'terral';
  if (dif < 70) return 'maral';
  return 'lateral';
}

export async function buscarSurf(praias = PRAIAS) {
  const mar = praias.map(pontoMar);
  const urlMar = `https://marine-api.open-meteo.com/v1/marine?latitude=${mar.map((m) => fix(m[0])).join(',')}&longitude=${mar.map((m) => fix(m[1])).join(',')}`
    + `&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period&current=wave_height,wave_period,wave_direction,sea_surface_temperature&timezone=${TZ}&forecast_days=4`;
  const urlVento = `https://api.open-meteo.com/v1/forecast?latitude=${praias.map((p) => p.lat).join(',')}&longitude=${praias.map((p) => p.lon).join(',')}`
    + `&hourly=wind_speed_10m,wind_direction_10m&current=wind_speed_10m,wind_direction_10m&timezone=${TZ}&forecast_days=4`;
  const [ondas, ventos] = await Promise.all([pegar(urlMar), pegar(urlVento)]);

  return praias.map((p, i) => {
    const o = ondas[i], v = ventos[i];
    const atual = {
      onda: o.current.wave_height, periodo: o.current.wave_period, direcao: o.current.wave_direction,
      agua: o.current.sea_surface_temperature,
      vento: v.current.wind_speed_10m, ventoDir: v.current.wind_direction_10m,
    };
    atual.nota = notaSurf(atual.onda, atual.periodo, atual.vento, atual.ventoDir, p.frente);
    atual.tipoVento = tipoVento(atual.ventoDir, p.frente, atual.vento);

    // Por hora (as horas das duas consultas são iguais)
    const horas = o.hourly.time.map((t, k) => {
      const h = {
        t, onda: o.hourly.wave_height[k], periodo: o.hourly.wave_period[k], direcao: o.hourly.wave_direction[k],
        vento: v.hourly.wind_speed_10m[k], ventoDir: v.hourly.wind_direction_10m[k],
      };
      h.nota = notaSurf(h.onda, h.periodo, h.vento, h.ventoDir, p.frente);
      return h;
    });

    // Resumo por dia (manhã 6–11h e tarde 12–17h)
    const dias = [];
    for (const h of horas) {
      const dia = h.t.slice(0, 10), hr = +h.t.slice(11, 13);
      if (hr < 6 || hr > 17) continue;
      let d = dias.find((x) => x.dia === dia);
      if (!d) dias.push((d = { dia, manha: [], tarde: [] }));
      (hr < 12 ? d.manha : d.tarde).push(h);
    }
    const resumo = (lista) => {
      if (!lista.length) return null;
      const melhor = lista.reduce((a, b) => ((b.nota ?? -1) > (a.nota ?? -1) ? b : a));
      return { ...melhor, ondaMax: Math.max(...lista.map((x) => x.onda ?? 0)) };
    };
    return { ...p, atual, horas, dias: dias.map((d) => ({ dia: d.dia, manha: resumo(d.manha), tarde: resumo(d.tarde) })) };
  });
}

// ---------- Marés ----------
// Nível do mar previsto pelo modelo (maré astronômica + efeito do tempo), a cada 15 minutos
export async function buscarMares(pontos) {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${pontos.map((p) => fix(p[0])).join(',')}&longitude=${pontos.map((p) => fix(p[1])).join(',')}`
    + `&minutely_15=sea_level_height_msl&timezone=${TZ}&past_days=1&forecast_days=3`;
  const res = await pegar(url);
  return res.map((r) => {
    const tempos = r.minutely_15.time, nivel = r.minutely_15.sea_level_height_msl;
    const serie = tempos.map((t, i) => ({ t, n: nivel[i] })).filter((x) => x.n != null);
    // Picos: maior/menor valor numa janela de 3 horas para cada lado
    const extremos = [];
    const J = 12;
    for (let i = J; i < serie.length - J; i++) {
      const janela = serie.slice(i - J, i + J + 1).map((x) => x.n);
      const v = serie[i].n;
      const tipo = v === Math.max(...janela) ? 'alta' : v === Math.min(...janela) ? 'baixa' : null;
      if (!tipo) continue;
      const ultimo = extremos[extremos.length - 1];
      if (ultimo && ultimo.tipo === tipo) continue; // platô: fica com o primeiro
      extremos.push({ tipo, t: serie[i].t, n: v });
    }
    return { serie, extremos };
  });
}

export function nivelAgora(serie, agoraIso) {
  let a = serie[0];
  for (const x of serie) { if (x.t <= agoraIso) a = x; else break; }
  return a;
}

// ---------- Lua ----------
const NOVA_REF = Date.UTC(2000, 0, 6, 18, 14); // lua nova de referência
const CICLO = 29.530588853;

export function faseLua(data = new Date()) {
  const idade = (((data - NOVA_REF) / 86400000) % CICLO + CICLO) % CICLO;
  const fracao = idade / CICLO;
  const iluminada = Math.round(((1 - Math.cos(2 * Math.PI * fracao)) / 2) * 100);
  let nome, icone;
  if (idade < 1.85) [nome, icone] = ['Lua nova', '🌑'];
  else if (idade < 5.54) [nome, icone] = ['Crescente', '🌒'];
  else if (idade < 9.23) [nome, icone] = ['Quarto crescente', '🌓'];
  else if (idade < 12.92) [nome, icone] = ['Crescente gibosa', '🌔'];
  else if (idade < 16.61) [nome, icone] = ['Lua cheia', '🌕'];
  else if (idade < 20.30) [nome, icone] = ['Minguante gibosa', '🌖'];
  else if (idade < 23.99) [nome, icone] = ['Quarto minguante', '🌗'];
  else if (idade < 27.68) [nome, icone] = ['Minguante', '🌘'];
  else [nome, icone] = ['Lua nova', '🌑'];
  // Próxima cheia e próxima nova
  const dias = (alvo) => ((alvo - idade + CICLO) % CICLO) || CICLO;
  const proxima = (d) => new Date(data.getTime() + d * 86400000);
  return { nome, icone, iluminada, idade, proximaCheia: proxima(dias(14.77)), proximaNova: proxima(dias(0)),
    // Lua cheia e nova = marés de sizígia (maiores); quartos = marés de quadratura (menores)
    tipoMare: (idade < 3 || idade > 26.5 || (idade > 11.8 && idade < 17.8)) ? 'Marés de sizígia (mais fortes)' : (Math.abs(idade - 7.4) < 2.5 || Math.abs(idade - 22.1) < 2.5) ? 'Marés de quadratura (mais fracas)' : 'Marés médias' };
}

export { direcaoVento };

// Hora local de São Paulo no formato do Open-Meteo ("2026-11-09T14:30")
export function agoraSP() {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  return p.replace(' ', 'T');
}
