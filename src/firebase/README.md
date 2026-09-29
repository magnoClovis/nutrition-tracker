# Adaptadores Firebase atuais do cliente

Este diretório existente abriga a camada Firebase usada pelo cliente Vite. Não confundir com [`/firebase/`](../../firebase/README.md), destino planejado somente para rules e índices declarativos, nem com `functions/`.

ORG-5 decidirá se módulos daqui passam a `services/`, mantendo Auth, App Check, leituras confirmadas no servidor, cache e erros fail-closed. Nenhum arquivo é movido nesta preparação.

## Inventário dos arquivos migrados

Arquivos pré-existentes serão catalogados na ORG-0. Para cada movimento: arquivo | contrato | origem | consumidores | teste autenticado.
