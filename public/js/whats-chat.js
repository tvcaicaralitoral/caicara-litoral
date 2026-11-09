// Chat do robô no canto da tela: dá boas-vindas e leva a pessoa ao WhatsApp da TV
// com a mensagem já escrita (o atendimento continua com a equipe, no WhatsApp).
const NUMERO = '5512988413676';
const OPCOES = [
  { rotulo: '📰 Enviar notícia ou denúncia', resposta: 'Ótimo! Mande texto, fotos ou vídeos para a nossa redação. 📸', msg: 'Olá, TV Caiçara Litoral! Vim pelo site e quero enviar uma notícia/denúncia:' },
  { rotulo: '📣 Divulgar evento ou negócio', resposta: 'Show! Nossa equipe te explica como divulgar com a gente. 🙌', msg: 'Olá, TV Caiçara Litoral! Vim pelo site e quero divulgar meu evento/negócio.' },
  { rotulo: '💬 Falar com a equipe', resposta: 'Claro! Nossa equipe responde pelo WhatsApp. 😉', msg: 'Olá, TV Caiçara Litoral! Vim pelo site e quero falar com a equipe.' },
];

const linkWhats = (msg) => `https://wa.me/${NUMERO}?text=${encodeURIComponent(msg)}`;
const ICONE_WHATS = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8C29 8.7 23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.8-1.7l-.4-.2-3.8 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.7-5.8C5.2 10 10 5.3 16 5.3S26.8 10 26.8 15.8 22 26.4 16 26.4zm5.9-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.8.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.7 1.2 3.2 1.4 3.4 2.4 3.6 5.8 5c2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5s.3-1.4.2-1.5-.3-.2-.6-.4z"/></svg>';
const ROBO = '<span class="wchat-robo" aria-hidden="true">🤖</span>';

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const lido = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

export function iniciarChatWhats() {
  if (document.getElementById('wchat')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <div class="wchat" id="wchat">
    <div class="wchat-balao" id="wchat-balao" hidden>
      <button class="wchat-fechar-balao" type="button" aria-label="Fechar">×</button>
      ${ROBO}<span>Oi! 👋 Posso te ajudar?</span>
    </div>
    <section class="wchat-janela" id="wchat-janela" role="dialog" aria-label="Fale com a TV Caiçara Litoral" hidden>
      <header class="wchat-topo">
        ${ROBO}
        <div><strong>Assistente da TV Caiçara</strong><small><span class="wchat-online"></span> online agora</small></div>
        <button class="wchat-x" type="button" aria-label="Fechar o chat">×</button>
      </header>
      <div class="wchat-conversa" id="wchat-conversa" aria-live="polite"></div>
      <form class="wchat-escrever" id="wchat-form" hidden>
        <input type="text" id="wchat-texto" placeholder="Escreva sua mensagem…" aria-label="Sua mensagem" maxlength="500">
        <button type="submit" aria-label="Enviar pelo WhatsApp">➤</button>
      </form>
    </section>
    <button class="wchat-botao" id="wchat-botao" type="button" aria-label="Falar com a TV Caiçara pelo WhatsApp">${ICONE_WHATS}</button>
  </div>`);

  const el = (id) => document.getElementById(id);
  const conversa = el('wchat-conversa');
  let comecou = false;

  const rolar = () => { conversa.scrollTop = conversa.scrollHeight; };
  async function robo(html, pausa = 900) {
    conversa.insertAdjacentHTML('beforeend', '<div class="wchat-msg robo digitando"><span></span><span></span><span></span></div>');
    rolar();
    await espera(pausa);
    const ultimo = conversa.lastElementChild;
    ultimo.classList.remove('digitando');
    ultimo.innerHTML = html;
    rolar();
  }
  const voce = (texto) => {
    const d = document.createElement('div');
    d.className = 'wchat-msg voce';
    d.textContent = texto;
    conversa.append(d);
    rolar();
  };
  const botaoIr = (msg) => {
    conversa.insertAdjacentHTML('beforeend', `<a class="wchat-ir" href="${linkWhats(msg)}" target="_blank" rel="noopener">${ICONE_WHATS} Continuar no WhatsApp</a>`);
    rolar();
  };

  async function iniciarConversa() {
    comecou = true;
    await robo('Olá! 👋 Seja bem-vindo à <strong>TV Caiçara Litoral</strong>!', 700);
    await robo('Sou o assistente virtual da redação. Como posso te ajudar?', 1100);
    conversa.insertAdjacentHTML('beforeend', `<div class="wchat-opcoes">${OPCOES.map((o, i) => `<button type="button" data-i="${i}">${o.rotulo}</button>`).join('')}</div>`);
    el('wchat-form').hidden = false;
    rolar();
  }

  function abrir() {
    el('wchat-balao').hidden = true;
    el('wchat-janela').hidden = false;
    el('wchat').classList.add('aberto');
    guardar('wchat-visto', '1');
    if (!comecou) iniciarConversa();
  }
  function fechar() {
    el('wchat-janela').hidden = true;
    el('wchat').classList.remove('aberto');
  }

  el('wchat-botao').addEventListener('click', () => (el('wchat-janela').hidden ? abrir() : fechar()));
  el('wchat-balao').addEventListener('click', (e) => {
    if (e.target.closest('.wchat-fechar-balao')) { el('wchat-balao').hidden = true; guardar('wchat-visto', '1'); return; }
    abrir();
  });
  el('wchat-janela').querySelector('.wchat-x').addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el('wchat-janela').hidden) fechar(); });

  conversa.addEventListener('click', async (e) => {
    const b = e.target.closest('.wchat-opcoes button');
    if (!b) return;
    const o = OPCOES[+b.dataset.i];
    conversa.querySelector('.wchat-opcoes')?.remove();
    voce(o.rotulo);
    await robo(o.resposta, 800);
    await robo('Toque no botão abaixo para continuar no nosso WhatsApp 👇', 700);
    botaoIr(o.msg);
  });

  el('wchat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = el('wchat-texto').value.trim();
    if (!texto) return;
    el('wchat-texto').value = '';
    conversa.querySelector('.wchat-opcoes')?.remove();
    voce(texto);
    await robo('Recebi! Toque abaixo para mandar essa mensagem para a nossa equipe no WhatsApp 👇', 800);
    botaoIr(`Olá, TV Caiçara Litoral! ${texto}`);
  });

  // Na primeira visita, o robô chama a atenção depois de alguns segundos
  if (!lido('wchat-visto')) setTimeout(() => { if (el('wchat-janela').hidden) el('wchat-balao').hidden = false; }, 6000);
}
