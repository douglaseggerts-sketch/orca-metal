# Orça Metal: gerar o APK para Android

Este projeto compila o app em um arquivo `.apk` que o seu cliente baixa no celular e instala. O GitHub faz a compilação de graça, você não precisa instalar nada no computador.

## Passo a passo

1. Crie uma conta grátis em github.com (se ainda não tiver).
2. Clique em **New repository**, dê o nome `orca-metal`, deixe como **Private** e crie.
3. Na página do repositório, clique em **uploading an existing file** (ou Add file > Upload files).
4. Descompacte este zip e arraste **todo o conteúdo da pasta** para a página, incluindo a pasta `www`, a pasta `tools` e a pasta `.github`. Depois clique em **Commit changes**.
   - Se a pasta `.github` não subir (ela é oculta em alguns computadores), clique em Add file > Create new file, digite o nome `.github/workflows/build-apk.yml` e cole dentro o conteúdo do arquivo `build-apk.yml`.
5. Abra a aba **Actions**. A compilação começa sozinha. Se não começar, clique em **Gerar APK** e depois em **Run workflow**.
6. Espere uns 5 a 10 minutos até aparecer um ícone verde. Clique nessa execução e, no fim da página, em **Artifacts**, baixe **OrcaMetal-apk**. É um zip com o arquivo `app-debug.apk` dentro.
7. Envie o `app-debug.apk` para o celular do cliente (WhatsApp, Drive, e-mail ou cabo).

## Instalar no celular

1. Toque no arquivo `app-debug.apk`.
2. O Android vai pedir para permitir instalar apps de fora da loja. Permita só para o app que você usou para abrir o arquivo (WhatsApp, Drive, Arquivos).
3. Se aparecer um aviso do Google Play Protect, toque em Instalar mesmo assim. O aviso aparece porque o app não está na Play Store.

## Importante

- Os dados ficam dentro do app, no celular. Se o app for desinstalado, os dados somem. Use Ajustes > Ver e copiar backup de vez em quando.
- Para atualizar o app depois: instale o novo `.apk` por cima do antigo, sem desinstalar. Os dados ficam.
- Se a compilação falhar (ícone vermelho), abra a execução, copie a mensagem de erro e me mande.
- Se você já usou a versão PWA, copie o backup de lá e restaure em Ajustes deste app.
