// Previsão do tempo e do mar em tempo real (Open-Meteo, grátis e sem chave).
// O navegador de quem visita busca direto no Open-Meteo: sempre o dado mais novo.

export const REGIOES = [
  { slug: 'litoral', nome: 'Litoral Norte' },
  { slug: 'vale', nome: 'Vale do Paraíba' },
  { slug: 'serra', nome: 'Serra da Mantiqueira' },
];

// lat/lon = centro da cidade; mar = ponto no mar em frente (ondas e temperatura da água)
export const CIDADES_TEMPO = [
  { nome: 'Ubatuba', slug: 'ubatuba', regiao: 'litoral', lat: -23.4336, lon: -45.0838, mar: [-23.45, -45.04] },
  { nome: 'Caraguatatuba', slug: 'caraguatatuba', regiao: 'litoral', lat: -23.6203, lon: -45.4131, mar: [-23.63, -45.39] },
  { nome: 'São Sebastião', slug: 'sao-sebastiao', regiao: 'litoral', lat: -23.7951, lon: -45.4143, mar: [-23.81, -45.40] },
  { nome: 'Ilhabela', slug: 'ilhabela', regiao: 'litoral', lat: -23.7785, lon: -45.3581, mar: [-23.80, -45.33] },
  { nome: 'Bertioga', slug: 'bertioga', regiao: 'litoral', lat: -23.8486, lon: -46.1396, mar: [-23.87, -46.13] },
  { nome: 'Paraty', slug: 'paraty', regiao: 'litoral', lat: -23.2178, lon: -44.7131, mar: [-23.22, -44.68] },
  { nome: 'São José dos Campos', slug: 'sao-jose-dos-campos', regiao: 'vale', lat: -23.1791, lon: -45.8872 },
  { nome: 'Taubaté', slug: 'taubate', regiao: 'vale', lat: -23.0264, lon: -45.5553 },
  { nome: 'Jacareí', slug: 'jacarei', regiao: 'vale', lat: -23.3053, lon: -45.9658 },
  { nome: 'Caçapava', slug: 'cacapava', regiao: 'vale', lat: -23.1008, lon: -45.7069 },
  { nome: 'Pindamonhangaba', slug: 'pindamonhangaba', regiao: 'vale', lat: -22.9246, lon: -45.4613 },
  { nome: 'Guaratinguetá', slug: 'guaratingueta', regiao: 'vale', lat: -22.8162, lon: -45.1925 },
  { nome: 'Aparecida', slug: 'aparecida', regiao: 'vale', lat: -22.8495, lon: -45.2341 },
  { nome: 'Lorena', slug: 'lorena', regiao: 'vale', lat: -22.7334, lon: -45.1197 },
  { nome: 'Paraibuna', slug: 'paraibuna', regiao: 'vale', lat: -23.3872, lon: -45.6639 },
  { nome: 'Campos do Jordão', slug: 'campos-do-jordao', regiao: 'serra', lat: -22.7394, lon: -45.5914 },
  { nome: 'Santo Antônio do Pinhal', slug: 'santo-antonio-do-pinhal', regiao: 'serra', lat: -22.8270, lon: -45.6631 },
  { nome: 'São Bento do Sapucaí', slug: 'sao-bento-do-sapucai', regiao: 'serra', lat: -22.6888, lon: -45.7307 },
];

// Códigos de tempo da OMM -> texto e ícone
const CODIGOS = {
  0: ['Céu limpo', '☀️', '🌙'],
  1: ['Poucas nuvens', '🌤️', '🌙'],
  2: ['Parcialmente nublado', '⛅', '☁️'],
  3: ['Nublado', '☁️', '☁️'],
  45: ['Neblina', '🌫️', '🌫️'],
  48: ['Neblina', '🌫️', '🌫️'],
  51: ['Garoa fraca', '🌦️', '🌧️'],
  53: ['Garoa', '🌦️', '🌧️'],
  55: ['Garoa forte', '🌧️', '🌧️'],
  56: ['Garoa gelada', '🌧️', '🌧️'],
  57: ['Garoa gelada', '🌧️', '🌧️'],
  61: ['Chuva fraca', '🌦️', '🌧️'],
  63: ['Chuva', '🌧️', '🌧️'],
  65: ['Chuva forte', '🌧️', '🌧️'],
  66: ['Chuva gelada', '🌧️', '🌧️'],
  67: ['Chuva gelada', '🌧️', '🌧️'],
  71: ['Neve fraca', '🌨️', '🌨️'],
  73: ['Neve', '🌨️', '🌨️'],
  75: ['Neve forte', '🌨️', '🌨️'],
  77: ['Granizo fino', '🌨️', '🌨️'],
  80: ['Pancadas de chuva', '🌦️', '🌧️'],
  81: ['Pancadas de chuva', '🌧️', '🌧️'],
  82: ['Temporal', '⛈️', '⛈️'],
  85: ['Neve', '🌨️', '🌨️'],
  86: ['Neve', '🌨️', '🌨️'],
  95: ['Trovoadas', '⛈️', '⛈️'],
  96: ['Trovoadas com granizo', '⛈️', '⛈️'],
  99: ['Trovoadas com granizo', '⛈️', '⛈️'],
};

export function descrever(codigo, dia = 1) {
  const c = CODIGOS[codigo] || ['—', '🌡️', '🌡️'];
  return { texto: c[0], icone: dia ? c[1] : c[2] };
}

export function direcaoVento(graus) {
  if (graus == null) return '';
  return ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(graus / 45) % 8];
}

export function nivelUV(uv) {
  if (uv == null) return '';
  if (uv < 3) return 'baixo';
  if (uv < 6) return 'moderado';
  if (uv < 8) return 'alto';
  if (uv < 11) return 'muito alto';
  return 'extremo';
}

const TZ = 'America%2FSao_Paulo';

async function pegar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Previsão indisponível (' + r.status + ')');
  const j = await r.json();
  return Array.isArray(j) ? j : [j];
}

// Busca tudo de uma vez: 1 pedido para o tempo, 1 para o mar
export async function buscarTempo(cidades = CIDADES_TEMPO, { detalhado = true } = {}) {
  const lat = cidades.map((c) => c.lat).join(',');
  const lon = cidades.map((c) => c.lon).join(',');
  const atual = 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation';
  const diario = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset';
  const horario = 'temperature_2m,weather_code,precipitation_probability,is_day';
  let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${atual}&daily=${diario}&timezone=${TZ}&forecast_days=7`;
  if (detalhado) url += `&hourly=${horario}&forecast_hours=24`;

  const comMar = cidades.filter((c) => c.mar);
  const pedidoMar = comMar.length
    ? pegar(`https://marine-api.open-meteo.com/v1/marine?latitude=${comMar.map((c) => c.mar[0]).join(',')}&longitude=${comMar.map((c) => c.mar[1]).join(',')}&current=wave_height,wave_period,sea_surface_temperature&timezone=${TZ}`).catch(() => [])
    : Promise.resolve([]);

  const [tempo, mar] = await Promise.all([pegar(url), pedidoMar]);
  return cidades.map((c, i) => {
    const t = tempo[i];
    const m = mar[comMar.indexOf(c)]?.current;
    return { ...c, atual: t.current, diario: t.daily, horario: t.hourly, mar: m ? { ondas: m.wave_height, periodo: m.wave_period, agua: m.sea_surface_temperature } : null };
  });
}
