# Firebase Functions

Código, dependências e testes das Functions do projeto Firebase. Esta fronteira é separada do cliente `src/`, do Worker Cloudflare e dos arquivos declarativos de rules/índices destinados a `/firebase/`.

Mudança estrutural deve preservar exports, gatilhos, permissões, emuladores e deploy. Não implantar funções nem alterar IAM como consequência implícita de reorganizar pastas.

## Contrato C14-H para staging

`.firebaserc` nomeia os projetos `production`, `staging` e `emulator`, sem alias `default`. `src/config.js` mantém produção como alvo das execuções existentes e aceita staging somente com `TROFIA_DEPLOY_TARGET=staging` **e** `GCLOUD_PROJECT=trofia-staging`. Alvo desconhecido, projeto trocado ou staging sem alvo explícito aborta a descoberta das Functions; não há fallback para contas de serviço de produção. O emulador `demo-trofia-c22` continua isolado.

O código apenas prepara as identidades com domínio do projeto staging. Elas ainda não foram criadas nem receberam IAM; Task, Scheduler OIDC, invocadores e rollback exigem provisão e auditoria separados antes de qualquer deploy. Não executar `firebase deploy` por causa deste contrato. A validação da matriz e os gates de publicação estão em `documentation/estado-atual/C14_H_STAGING_AUDITORIA.md`.

## Inventário dos arquivos migrados

Arquivos pré-existentes serão mapeados na ORG-0. Ao mover: arquivo | função | origem | export/consumidores | emulador/gate.
