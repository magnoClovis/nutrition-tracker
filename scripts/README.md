# Scripts do repositório

Scripts de preflight, build, verificação, geração de páginas e operação vivem aqui. As referências em `package.json`, CI e guias são contratos: mover um script exige atualizar todos os chamadores no mesmo PR.

`admin/` é o destino previsto para utilitários administrativos hoje na raiz. Scripts com capacidade de exclusão exigem dry-run e confirmação explícita; nenhum script daqui deve conter credenciais ou dados exportados.

## Inventário dos arquivos migrados

Os scripts existentes serão descritos individualmente na matriz ORG-0. A cada novo arquivo movido: arquivo | propósito | origem | comando/chamadores | pré-condições de segurança.

## Arquivos acrescentados pela C14-G

| Arquivo | Propósito | Comando/chamadores | Pré-condições de segurança |
|---|---|---|---|
| `verify-csp-policy.js` | Conferir a posição da meta CSP e os hashes dos blocos inline no HTML final. | `vite.config.js` no encerramento do build e `tests/unit/csp-policy.test.js`. | Somente leitura do HTML; não incluir dados pessoais ou segredos em mensagens de erro. |
| `verify-csp-browser.mjs` | Validar no Chromium que o bootstrap funciona sob a CSP e que um script inline não autorizado é bloqueado. | `npm run test:smoke:vite`, dentro do gate `npm test` e do CI. | Servidor efêmero em `127.0.0.1` com porta dinâmica; relatar violações sem URL completa, cabeçalhos ou tokens. |
