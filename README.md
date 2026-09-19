# FitCraft

App Android **offline** de ciclos metabólicos (preparação, treino e intervalo). Sem loja, sem servidor. Você instala o APK no celular.

Versão atual do código: **001** (esqueleto visual).

## Como testar no celular (sem emulador)

1. Entre em **github.com** no seu repositório FitCraft.
2. Clique na aba **Actions**.
3. Abra a execução mais recente de **Build APK**.
4. Espere o ✓ verde (a primeira vez pode levar até 15 minutos).
5. No final da página, em **Artifacts**, baixe `fitcraft-001`.
6. Abra o zip, pegue o `.apk`, mande para o celular (Telegram, Drive ou cabo).
7. Instale permitindo fontes desconhecidas só para este arquivo.

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
- `002` — SQLite + planos 7/15/30
- `003` — exercícios
- `004` — timer de verdade
- `005` — playlist local (até 15 faixas)
- `006` — polimento

O `main` só avança quando aquela versão rodou no seu aparelho.

## Git no dia a dia

```bash
git add .
git commit -m "001: descreva o que mudou"
git push
```

Depois: Actions → verde → baixar APK.
