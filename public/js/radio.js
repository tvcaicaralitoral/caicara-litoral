// Rádio Caiçara: toca a programação "ao vivo" — todo mundo ouve a mesma música no mesmo momento.
// A posição vem do relógio: a lista inteira se repete, 24 horas por dia.
import { FAIXAS, CREDITO } from './radio-lista.js';

const total = FAIXAS.reduce((s, f) => s + f.dur, 0);
const audio = new Audio();
audio.preload = 'auto';
const el = (id) => document.getElementById(id);
let atual = -1;
let ligado = false;

function posicaoAgora() {
  let t = (Date.now() / 1000) % total;
  for (let i = 0; i < FAIXAS.length; i++) {
    if (t < FAIXAS[i].dur) return { i, pos: t };
    t -= FAIXAS[i].dur;
  }
  return { i: 0, pos: 0 };
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function mostrar(i) {
  const f = FAIXAS[i];
  const prox = FAIXAS[(i + 1) % FAIXAS.length];
  el('estilo').textContent = f.estilo;
  el('titulo').textContent = f.titulo;
  el('artista').textContent = f.artista;
  el('seguir').textContent = `${prox.titulo} · ${prox.estilo}`;
  document.title = `▶ ${f.titulo} | Rádio Caiçara`;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: f.titulo, artist: f.artista, album: 'Rádio Caiçara — TV Caiçara Litoral',
      artwork: [{ src: '/img/logo.png', sizes: '512x512', type: 'image/png' }],
    });
  }
}

// Sempre entra no ponto em que a programação está agora
async function sintonizar() {
  const { i, pos } = posicaoAgora();
  atual = i;
  mostrar(i);
  audio.src = '/radio/musicas/' + FAIXAS[i].arquivo;
  await new Promise((ok) => audio.addEventListener('loadedmetadata', ok, { once: true }));
  audio.currentTime = Math.min(pos, Math.max(0, audio.duration - 1));
  await audio.play();
}

async function ligar() {
  ligado = true;
  document.body.classList.add('tocando');
  el('bt-play').setAttribute('aria-label', 'Parar a rádio');
  el('status').textContent = 'Conectando…';
  try {
    await sintonizar();
    el('status').textContent = 'Ao vivo';
  } catch (e) {
    console.error(e);
    desligar();
    el('status').textContent = 'Não foi possível tocar. Toque no play de novo.';
  }
}

function desligar() {
  ligado = false;
  audio.pause();
  document.body.classList.remove('tocando');
  el('bt-play').setAttribute('aria-label', 'Ouvir a rádio');
  el('status').textContent = 'Parada — toque no play para ouvir';
}

el('bt-play').addEventListener('click', () => (ligado ? desligar() : ligar()));
el('volume').addEventListener('input', (e) => { audio.volume = +e.target.value; });
audio.addEventListener('ended', () => { if (ligado) sintonizar().catch(console.error); });
audio.addEventListener('waiting', () => { if (ligado) el('status').textContent = 'Carregando…'; });
audio.addEventListener('playing', () => { el('status').textContent = 'Ao vivo'; });
audio.addEventListener('timeupdate', () => {
  const d = FAIXAS[atual]?.dur || audio.duration || 1;
  el('barra').style.width = `${Math.min(100, (audio.currentTime / d) * 100)}%`;
  el('tempo').textContent = `${mmss(audio.currentTime)} / ${mmss(d)}`;
});
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', ligar);
  navigator.mediaSession.setActionHandler('pause', desligar);
  navigator.mediaSession.setActionHandler('stop', desligar);
}

el('credito').textContent = CREDITO;
mostrar(posicaoAgora().i);
// Antes de ligar, o nome da música acompanha o relógio
setInterval(() => { if (!ligado) mostrar(posicaoAgora().i); }, 5000);
// Aberta pelo botão do site: tenta já começar a tocar (alguns navegadores pedem um toque no play)
if (new URLSearchParams(location.search).has('tocar')) ligar();
