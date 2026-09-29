# Compatibilidade UMD/ESM

Destino transitório para módulos que o runtime legado ainda carrega como UMD/globais enquanto Vite os acessa por fachadas ESM. Esta pasta não significa que a ponte possa ser apagada ou que o legado esteja desativado.

ORG-4 deverá preservar ordem de scripts, nomes globais, imports e testes de cutover. Quando um arquivo deixar de ter consumidores legados, justificar sua saída com evidência e atualizar este inventário.

## Inventário dos arquivos migrados

Nenhum arquivo de produto foi migrado. Ao migrar, registrar: arquivo | global/contrato | origem | consumidores legado/Vite | prova de cutover.
