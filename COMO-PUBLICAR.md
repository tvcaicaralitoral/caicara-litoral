# Site Caiçara Litoral — como funciona e como publicar

Hospedagem: **GitHub Pages** (grátis). Domínio: **caicaralitoral.com.br**.

O GitHub roda sozinho a cada 15 minutos (às vezes demora um pouco mais):
busca os posts do Instagram **@tvcaicaralitoral** e os vídeos do YouTube e republica o site.

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

O vídeo mais recente do YouTube aparece sozinho na página inicial.

---

## 1. GitHub (uma vez só)

1. Crie uma conta grátis em <https://github.com/signup>.
2. Crie um repositório **público** chamado `caicara-litoral` (vazio, sem README).
3. Envie esta pasta para ele (o Claude faz isso).
4. No repositório: **Settings → Pages → Source: GitHub Actions**.

## 2. Domínio caicaralitoral.com.br

**No GitHub:** Settings → Pages → Custom domain → `caicaralitoral.com.br` → Save.
Depois que o certificado ficar pronto, marque **Enforce HTTPS**.

**No Registro.br** (<https://registro.br> → seu domínio → DNS → Editar zona / modo avançado):

| Tipo | Nome | Valor |
|---|---|---|
| A | (vazio) | 185.199.108.153 |
| A | (vazio) | 185.199.109.153 |
| A | (vazio) | 185.199.110.153 |
| A | (vazio) | 185.199.111.153 |
| CNAME | www | SEU-USUARIO.github.io |

Leva de alguns minutos a algumas horas para funcionar.

## 3. Ligar o Instagram (quando conseguir entrar na Meta)

1. <https://developers.facebook.com/apps> → **Criar app** → caso de uso **API do Instagram**.
2. **Configuração da API com login do Instagram** → **Adicionar conta** (@tvcaicaralitoral) → **Gerar token**.
3. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `IG_TOKEN` — Valor: o token.
4. Para o token se renovar sozinho toda semana, crie também o segredo `GH_PAT`:
   - <https://github.com/settings/personal-access-tokens/new> → acesso só ao repositório `caicara-litoral`
     → permissão **Secrets: Read and write** e **Contents: Read and write** → gere e cole como segredo `GH_PAT`.

Pronto: as notícias aparecem na próxima atualização (até ~15 min).
Para atualizar na hora: aba **Actions → Atualizar site → Run workflow**.

---

## Mudanças do dia a dia

- **Cores:** `public/css/style.css`, bloco "PALETA DE CORES" no topo.
- **Logo:** `public/img/logo.png` (logo oficial — não alterar).
- **Fundo da marca:** `public/img/fundo.jpg`.
- **Fotos dos personagens:** `public/img/personagens/` (rosto e `-corpo.jpg`).
- **Personagens, WhatsApp, YouTube, frases:** `public/js/config.js`.

## Testar no computador

```bash
npm run teste
```

Abre em <http://localhost:8788> com 3 matérias de exemplo (não usa o Instagram).
