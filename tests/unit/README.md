# Contratos unitários

Testes Node de módulos, adapters, configuração e barreiras contra regressão. Mantê-los independentes de credenciais e dados reais; integração externa fica nos gates apropriados.

O teste `vite-build-verifier.test.js` também protege a allowlist de publicação e, em ORG-PREP, comprova que `public/README.md` não entra no build antes de ORG-2.

## Inventário dos arquivos migrados

Arquivos anteriores à ORG-PREP serão catalogados na ORG-0. Ao mover: arquivo | contrato | origem | módulo coberto | comando de teste.
