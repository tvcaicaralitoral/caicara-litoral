// Último vídeo do canal do YouTube na página inicial.
import { esc, dataRelativa } from './render.js';
import { SITE } from './config.js';

const capa = (id, live) => `https://i.ytimg.com/vi/${id}/hqdefault${live ? '_live' : ''}.jpg`;
let videos = [];

function player(v, tocar = false) {
  const el = document.getElementById('video-principal');
  if (tocar) {
    el.innerHTML = `<div class="video-quadro${v.short ? ' video-vertical' : ''}">
      <iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" title="${esc(v.titulo)}"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
      <h3 class="video-titulo">${esc(v.titulo)}</h3>`;
    return;
  }
  // Mostra só a capa; o vídeo carrega quando a pessoa clica (deixa o site mais rápido)
  el.innerHTML = `<button class="video-quadro video-capa" type="button" data-id="${v.id}" aria-label="Assistir: ${esc(v.titulo)}">
      <img src="${capa(v.id, v.live)}" alt="" loading="lazy" onerror="this.onerror=null;this.src=this.src.replace('_live','')"><span class="video-play" aria-hidden="true"></span>
      ${v.live ? '<span class="video-novo video-aovivo">● AO VIVO AGORA</span>' : `<span class="video-novo">${v === videos[0] ? 'Vídeo mais recente' : 'Assista'}</span>`}
    </button>
    <h3 class="video-titulo">${esc(v.titulo)}</h3>
    <p class="video-info">${v.live ? '<strong class="texto-aovivo">Transmissão ao vivo</strong>' : `<time datetime="${esc(v.data)}" data-rel>${esc(dataRelativa(v.data))}</time>`} ·
      <a href="${esc(SITE.youtube)}?sub_confirmation=1" target="_blank" rel="noopener">Inscreva-se no canal</a></p>`;
}

function lista(atual) {
  document.getElementById('video-lista').innerHTML = videos.filter((v) => v.id !== atual.id).slice(0, 4).map((v) => `
    <button class="video-item" type="button" data-id="${v.id}">
      <span class="video-item-img"><img src="${capa(v.id, v.live)}" alt="" loading="lazy">${v.short ? '<span class="video-short">Shorts</span>' : ''}</span>
      <span><strong>${esc(v.titulo)}</strong><time datetime="${esc(v.data)}" data-rel>${esc(dataRelativa(v.data))}</time></span>
    </button>`).join('') + `<a class="bt bt-youtube" href="${esc(SITE.youtube)}" target="_blank" rel="noopener">Ver todos no YouTube</a>`;
}

async function aoVivo() {
  try {
    const r = await fetch('/dados/aovivo.json?v=' + Math.floor(Date.now() / 60000));
    if (!r.ok) return null;
    const d = await r.json();
    return d.ativo && d.id ? d : null;
  } catch { return null; }
}

export async function carregarVideos() {
  try {
    const r = await fetch('/dados/youtube.json?v=' + Math.floor(Date.now() / 60000));
    if (!r.ok) return;
    videos = (await r.json()).videos || [];
    const live = await aoVivo();
    if (!videos.length && !live) return;
    // Destaque: o vídeo mais recente que não é Shorts (se não houver, o mais recente)
    const destaque = videos.find((v) => !v.short) || videos[0];
    // Na lista ao lado: vídeos normais primeiro, depois os Shorts
    const resto = videos.filter((v) => v !== destaque);
    videos = [destaque, ...resto.filter((v) => !v.short), ...resto.filter((v) => v.short)];
    // Se o canal estiver AO VIVO, a live vira o destaque e a seção sobe para o topo
    if (live) {
      const v = { id: live.id, titulo: live.titulo, data: live.inicio, live: true };
      videos = [v, ...videos.filter((x) => x.id !== v.id)];
      player(v);
      lista(v);
      const sec = document.getElementById('videos');
      sec.classList.add('videos-aovivo');
      document.getElementById('titulo-videos').textContent = 'Ao vivo agora na TV Caiçara Litoral';
      document.getElementById('destaque')?.before(sec);
    } else {
      player(destaque);
      lista(destaque);
    }
    document.getElementById('videos').hidden = false;
  } catch (e) { console.error(e); }
}

document.addEventListener('click', (e) => {
  const capaBt = e.target.closest('.video-capa');
  if (capaBt) { player(videos.find((v) => v.id === capaBt.dataset.id), true); return; }
  const item = e.target.closest('.video-item');
  if (item) {
    const v = videos.find((x) => x.id === item.dataset.id);
    player(v, true);
    lista(v);
    document.getElementById('videos').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
