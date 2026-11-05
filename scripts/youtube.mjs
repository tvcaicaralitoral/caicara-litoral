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
