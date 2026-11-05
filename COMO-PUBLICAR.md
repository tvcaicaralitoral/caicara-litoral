# Site Caiçara Litoral — como colocar no ar

O site lê os posts do Instagram **@tvcaicaralitoral** e transforma cada um em matéria.
Postou no Instagram → em até 10 minutos aparece no site. Não precisa fazer mais nada.

Hospedagem: **Cloudflare Pages** (grátis). Domínio: **caicaralitoral.com.br**.

---

## Como o post vira matéria

| No post do Instagram | No site |
|---|---|
| 1ª linha (sem o emoji) | Título da matéria |
| 1º parágrafo | Linha fina (resumo) |
| Restante do texto | Corpo da matéria |
| `📍 Cidade – SP` | Seção da cidade (Ubatuba, Caraguá, etc.) |
| `📰 Fonte:` e `📷 Foto:` | Créditos |
| Hashtags | Etiquetas; `#Esporte` coloca em **Esportes** |
| "Steven Seégol" ou "Mini Chaves" na legenda | Aparece na página do personagem |
| `#forasite` | O post **não** vai para o site |

Carrossel vira galeria; Reels vira vídeo na matéria.

---

## Passo 1 — Token do Instagram (uma vez só)

A conta precisa ser **Profissional** (Empresa ou Criador de conteúdo).

1. Entre em <https://developers.facebook.com/apps> com o Facebook ligado ao Instagram.
2. **Criar app** → caso de uso **"Gerenciar mensagens e conteúdo no Instagram"** (API do Instagram).
3. No app: **API do Instagram → Configuração da API com login do Instagram**.
4. Em **"Gerar tokens de acesso"**, clique em **Adicionar conta** e entre com o @tvcaicaralitoral.
5. Clique em **Gerar token** e copie o código (começa com `IG...`). Guarde, não mostre a ninguém.

O token vale 60 dias, mas o site **renova sozinho** toda semana.

## Passo 2 — Cloudflare (uma vez só)

Crie uma conta grátis em <https://dash.cloudflare.com/sign-up>. Depois, no terminal, dentro da pasta do site:

```bash
npx wrangler@4 login
```

```bash
npx wrangler@4 kv namespace create SITE_KV
```

Copie o `id` que aparecer e cole no arquivo `wrangler.toml`, no lugar de `COLE_AQUI_O_ID_DO_KV`.

```bash
npx wrangler@4 pages project create caicara-litoral --production-branch main
```

```bash
npx wrangler@4 pages secret put IG_TOKEN --project-name caicara-litoral
```

(cole o token do Passo 1 quando pedir)

```bash
npx wrangler@4 pages deploy
```

O site fica no ar em `https://caicara-litoral.pages.dev`.

## Passo 3 — Ligar o domínio caicaralitoral.com.br

1. No painel da Cloudflare: **Adicionar domínio** → `caicaralitoral.com.br` → plano **Free**.
2. A Cloudflare mostra **2 servidores DNS** (ex.: `xxx.ns.cloudflare.com`).
3. Entre no <https://registro.br> → seu domínio → **Alterar servidores DNS** → coloque os 2 da Cloudflare.
   (Leva de alguns minutos a algumas horas.)
4. Na Cloudflare: **Workers e Pages → caicara-litoral → Domínios personalizados** →
   adicione `caicaralitoral.com.br` e também `www.caicaralitoral.com.br`.

Pronto.

---

## Mudanças do dia a dia

- **Cores:** arquivo `public/css/style.css`, bloco "PALETA DE CORES" no topo.
- **Logo:** `public/img/logo.png` (logo oficial — não alterar).
- **Fundo da marca:** `public/img/fundo.jpg`.
- **YouTube:** o vídeo mais recente do canal aparece sozinho na página inicial (atualiza a cada 15 min).
- **Fotos dos personagens:** `public/img/personagens/steven-seegol.jpg` e `mini-chaves.jpg` (rosto) + `-corpo.jpg` (quadro de destaque).
- **Personagens, WhatsApp, frases:** `public/js/config.js`.
- Depois de mudar qualquer arquivo: `npx wrangler@4 pages deploy`.

## Testar no computador

```bash
npm run teste
```

Abre em <http://localhost:8788> com 3 matérias de exemplo (não usa o Instagram).
