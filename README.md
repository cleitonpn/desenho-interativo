# O Quintal do Vital

Aplicativo onde o cliente monta sua própria galinha com os acessórios
desenhados à mão pelo Vital Monteiro (@vitalmonteirotattoo) e leva o desenho
pronto para tatuar.

## Como funciona

Os 99 acessórios são camadas exportadas do Procreate, todas alinhadas no mesmo
canvas de 2480×3508. Cada PNG foi recortado ao seu contorno e o offset original
ficou guardado em `public/pecas/catalogo.json` — é isso que faz o encaixe sair
sozinho, sem nenhum posicionamento manual por acessório.

A versão em preto não duplica arquivo nenhum: é o mesmo PNG vermelho sob um
filtro CSS que preserva os dois tons do traço do Vital.

## Trocar o nome do projeto

Tudo que carrega a marca (telas, título da aba, texto do WhatsApp, marca d'água
das imagens) lê de `src/config/marca.ts`. Mudar o nome é mexer só nesse arquivo.

## Rodar

```bash
npm install
npm run dev
```

## Publicar

- **GitHub Pages** — automático a cada push (`.github/workflows/pages.yml`).
- **Firebase Hosting** — manual pela aba Actions, até o site definitivo existir
  (`.github/workflows/firebase.yml`). Usa a secret `FIREBASE_SERVICE_ACCOUNT`.

## Painel do Vital

Em `/vital`: mailing dos cadastrados com exportação em CSV, galeria do que a
galera montou e conferência das peças no ar. O acesso depende do campo
`admin: true` no documento do usuário em `usuarios/{uid}` no Firestore.
