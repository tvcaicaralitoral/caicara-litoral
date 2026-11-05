// Busca os posts do Instagram pela API oficial da Meta (precisa do token IG_TOKEN).
const API = 'https://graph.instagram.com/v23.0';
const CAMPOS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}';

export async function baixarPosts(token, limite = 150) {
  const posts = [];
  let url = `${API}/me/media?fields=${encodeURIComponent(CAMPOS)}&limit=50&access_token=${encodeURIComponent(token)}`;
  while (url && posts.length < limite) {
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error?.message || `Instagram respondeu ${r.status}`);
    posts.push(...(j.data || []));
    url = j.paging?.next || null;
  }
  return posts.slice(0, limite);
}
