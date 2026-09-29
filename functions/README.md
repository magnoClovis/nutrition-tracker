# Firebase Functions

Código, dependências e testes das Functions do projeto Firebase. Esta fronteira é separada do cliente `src/`, do Worker Cloudflare e dos arquivos declarativos de rules/índices destinados a `/firebase/`.

Mudança estrutural deve preservar exports, gatilhos, permissões, emuladores e deploy. Não implantar funções nem alterar IAM como consequência implícita de reorganizar pastas.

## Inventário dos arquivos migrados

Arquivos pré-existentes serão mapeados na ORG-0. Ao mover: arquivo | função | origem | export/consumidores | emulador/gate.
