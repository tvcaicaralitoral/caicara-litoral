// Configurações fáceis de mudar do site.

export const SITE = {
  nome: 'Caiçara Litoral',
  nomeTv: 'TV Caiçara Litoral',
  url: 'https://caicaralitoral.com.br',
  instagram: 'https://www.instagram.com/tvcaicaralitoral/',
  whatsapp: '5512988413676',
  whatsappTexto: '(12) 98841-3676',
  youtube: 'https://www.youtube.com/@Tvcai%C3%A7aralitoral',
  youtubeCanalId: 'UCt6vtPxhXizz6UEh5CldfyQ',
  descricao: 'Notícias do Litoral Norte, Vale do Paraíba e Serra da Mantiqueira.',
};

// Personagens da TV. As fotos ficam em public/img/personagens/
// (foto = rosto, para o círculo; fotoCorpo = da cabeça à cintura, para o quadro de destaque).
// "termos": palavras/hashtags que, se aparecerem na legenda do post,
// colocam o post na página do personagem (sem acento, sem espaço).
export const PERSONAGENS = [
  {
    nome: 'Steven Seégol',
    slug: 'steven-seegol',
    foto: '/img/personagens/steven-seegol.jpg',
    fotoCorpo: '/img/personagens/steven-seegol-corpo.jpg',
    chamada: 'O justiceiro do Litoral Norte',
    termos: ['stevenseegol', 'seegol', 'stevenseagal', 'seagol'],
  },
  {
    nome: 'Mini Chaves',
    slug: 'mini-chaves',
    foto: '/img/personagens/mini-chaves.jpg',
    fotoCorpo: '/img/personagens/mini-chaves-corpo.jpg',
    chamada: 'Direto das ruas da região',
    termos: ['minchaves', 'minichaves'],
  },
];
