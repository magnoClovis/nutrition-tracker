# Scripts do repositório

Scripts de preflight, build, verificação, geração de páginas e operação vivem aqui. As referências em `package.json`, CI e guias são contratos: mover um script exige atualizar todos os chamadores no mesmo PR.

`admin/` é o destino previsto para utilitários administrativos hoje na raiz. Scripts com capacidade de exclusão exigem dry-run e confirmação explícita; nenhum script daqui deve conter credenciais ou dados exportados.

## Inventário dos arquivos migrados

Os scripts existentes serão descritos individualmente na matriz ORG-0. A cada novo arquivo movido: arquivo | propósito | origem | comando/chamadores | pré-condições de segurança.
