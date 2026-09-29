# Serviços do cliente

Destino para adaptadores de Firebase, IA e outras APIs externas usados pelo aplicativo. Regras nutricionais puras pertencem a `domain/`; infraestrutura Cloudflare e Functions continua em `worker/` e `functions/`.

Preservar erros fail-closed, contratos de Auth/App Check, cache offline-first e formatos de persistência. Não mover um módulo por seu nome sem verificar onde a fachada ESM e o legado o carregam.

## Inventário dos arquivos migrados

Nenhum arquivo de produto foi migrado. Ao migrar, registrar: arquivo | serviço/contrato | origem | consumidores | testes autenticados.
