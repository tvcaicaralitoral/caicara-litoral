// Lê os vídeos mais recentes do canal pelo feed público do YouTube (não precisa de senha nem token).
import { SITE } from '../public/js/config.js';

const decodificar = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function lerFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const pega = (re) => decodificar((e.match(re) || [])[1] || '');
    const id = pega(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const link = pega(/<link rel="alternate" href="([^"]+)"/);
    return {
      id,
      titulo: pega(/<title>([^<]*)<\/title>/),
      data: pega(/<published>([^<]+)<\/published>/),
      short: link.includes('/shorts/'),
      link: link || `https://www.youtube.com/watch?v=${id}`,
    };
  }).filter((v) => v.id);
}

export async function baixarVideos() {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${SITE.youtubeCanalId}`);
  if (!r.ok) throw new Error(`YouTube respondeu ${r.status}`);
  return lerFeed(await r.text());
}

// Descobre se o canal está AO VIVO agora (ou com live marcada) pela API oficial do YouTube.
// Precisa da chave grátis YT_KEY. Gasta 2 unidades por consulta (limite grátis: 10.000/dia).
export async function verificarAoVivo(chave) {
  const api = 'https://www.googleapis.com/youtube/v3';
  const uploads = 'UU' + SITE.youtubeCanalId.slice(2); // lista de envios do canal
  const r1 = await fetch(`${api}/playlistItems?part=contentDetails&maxResults=8&playlistId=${uploads}&key=${chave}`);
  if (!r1.ok) throw new Error(`YouTube API respondeu ${r1.status}`);
  const ids = (await r1.json()).items.map((i) => i.contentDetails.videoId).join(',');
  if (!ids) return { ativo: false };
  const r2 = await fetch(`${api}/videos?part=snippet,liveStreamingDetails&id=${ids}&key=${chave}`);
  if (!r2.ok) throw new Error(`YouTube API respondeu ${r2.status}`);
  const videos = (await r2.json()).items;
  const live = videos.find((v) => v.snippet.liveBroadcastContent === 'live');
  if (live) return { ativo: true, id: live.id, titulo: live.snippet.title, inicio: live.liveStreamingDetails?.actualStartTime };
  // Próxima live agendada (nas próximas 24 h)
  const proxima = videos
    .filter((v) => v.snippet.liveBroadcastContent === 'upcoming' && v.liveStreamingDetails?.scheduledStartTime)
    .map((v) => ({ id: v.id, titulo: v.snippet.title, inicio: v.liveStreamingDetails.scheduledStartTime }))
    .filter((v) => Date.parse(v.inicio) - Date.now() < 86400000 && Date.parse(v.inicio) > Date.now() - 3600000)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  return { ativo: false, agendada: proxima || null };
}
