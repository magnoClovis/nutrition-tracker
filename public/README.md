# Ativos públicos

Destino planejado para manifest, ícones e outros arquivos que precisem de URLs públicas estáveis no web build e no pacote Android. Esta pasta ainda **não** contém ativos de produção; eles continuam na raiz e são copiados explicitamente pelo build atual.

`vite.config.js` mantém `publicDir: false` durante ORG-PREP para que este README não seja publicado no `dist`. ORG-2 só poderá mudar isso depois de revisar a allowlist, URLs relativas do GitHub Pages, PWA e Android. Não colocar segredos, relatórios privados ou documentação operacional nesta pasta.

## Inventário dos arquivos migrados

Nenhum arquivo de produto foi migrado. Ao migrar, registrar: arquivo | função | origem | consumidores/URL final | prova de build.
