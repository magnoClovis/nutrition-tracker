# Testes e evidências automatizadas

Esta árvore contém contratos unitários, fixtures, smokes Playwright e testes do algoritmo genético. O gate completo é `npm test`; execução autenticada usa conta descartável e lease compartilhado para evitar interferência entre frentes.

Manter testes funcionais rígidos: não corrigir falhas com timeout maior, retry oculto ou `force:true` sem diagnóstico. Artefatos que contenham dados de teste e credenciais locais ficam fora do Git.

## Inventário dos arquivos migrados

Arquivos existentes serão mapeados pela ORG-0. Ao mover um teste: arquivo | contrato | origem | runtime/projeto | fixture | gate.
