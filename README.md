# FitCraft

App Android **offline** de ciclos metabólicos (preparação, treino e intervalo). Sem loja, sem servidor. Você instala o APK no celular.

Versão atual do código: **024** (arquivo FitCraft que o WhatsApp anexa).

## Como testar no celular (sem emulador)

1. Abra **https://github.com/pvitorv/FitCraft**.
2. Clique na aba **Actions** (ao lado de Code, Issues, Pull requests).
3. Na esquerda, clique em **Build APK**.
4. Abra a execução mais recente da branch **024**.
5. Espere o ✓ verde (pode levar até 15 minutos). Se estiver X vermelho, avise.
6. No final da página, em **Artifacts**, baixe `fitcraft-024`.
7. O GitHub manda um **zip**. Abra, pegue o `fitcraft-024.apk`.
8. Mande o APK para o celular (WhatsApp, Telegram, Drive ou cabo).
9. No celular: abra o arquivo → **Instalar**. Se pedir, permita **fontes desconhecidas** só para este app.

Se a 015 ou a 016 já estiver instalada, **apague o FitCraft antigo primeiro**. A partir da 017 o certificado é o da CriaSysWeb; a 018 atualiza em cima da 017.

Se aparecer X vermelho, abra o log e me avise. Você não precisa mexer no Actions.

## No PC (só o visual, no Chrome)

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Isso não gasta RAM de emulador.

## Versões

Sempre sequenciais: `001`, `002`, `003`…

- `001` — telas e navegação
- `002` — amarelo, vermelho e azul das fases
- `003` — SQLite + planos 7/15/30
- `004` — exercícios
- `005` — timer de verdade
- `006` — repetições da sequência
- `007` — mobile sem corte lateral; preparação só no início
- `008` — nomes longos e botão editar nos cards
- `009` — +/− de tempo sem voltar ao topo
- `010` — aproveitar treino de outro dia ou plano
- `011` — grava nome e exercícios ao digitar
- `012` — botão Salvar ciclo
- `013` — playlists Summer Eletrohits 1, 2 e 3
- `014` — dia de hoje, foto de perfil e frase
- `015` — arquivo `.fitcraft` para enviar um ciclo
- `016` — fornecedor CriaSysWeb / Paulo Vitor Vaz no APK
- `017` — endereço, telefone e e-mail do fornecedor no APK
- `018` — mapa de treino, nutrição, gastos e envio de playlist
- `019` — fundo azul, cards amarelos
- `020` — azul vivo e escuro; card da foto azul
- `021` — planejador de domingo a sábado
- `022` — ciclos de 7, 14 e 28 dias
- `023` — tentativa de mandar .fitcraft no WhatsApp
- `024` — arquivo `.fitcraft.json` que o WhatsApp anexa de verdade

O `main` só avança quando aquela versão rodou no seu aparelho.

## Git no dia a dia

```bash
git add .
git commit -m "001: descreva o que mudou"
git push
```

Depois: Actions → verde → baixar APK.
