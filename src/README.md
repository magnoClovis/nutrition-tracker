# Código do cliente

Esta árvore abriga o cliente Vite/React e, durante a reorganização, receberá módulos hoje carregados da raiz pelo runtime legado e por fachadas ESM. As fronteiras propostas são `app/`, `components/`, `features/`, `domain/`, `services/`, `platform/`, `styles/` e `compat/`; elas não significam que os arquivos já tenham sido migrados.

Preservar os contratos de bootstrap Auth/App Check, ordem de scripts UMD, imports Vite, hidratação, autosave e empacotamento Android. Mudanças estruturais exigem teste focado, suíte completa e CI autenticado. Diretórios transitórios existentes (`leaf/`, `composite/`, `controller/`, `firebase/`) permanecem até ORG-5 decidir seu destino com base no grafo de imports.

## Inventário dos arquivos migrados

Atualizar o README do subdiretório de destino no mesmo PR da movimentação: arquivo | função | origem | consumidores | validação. Arquivos anteriores à ORG-PREP serão catalogados pela ORG-0; não recebem funções presumidas aqui.
