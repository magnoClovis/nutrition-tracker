# Worker de IA

Worker Cloudflare que expõe os endpoints de IA, valida Auth/App Check e aplica contratos de quota/observabilidade. O deploy e as configurações de produção são separados da simples organização do repositório.

Não registrar tokens, UID, prompts, imagens nem resposta bruta em documentação ou logs. Mudanças em código, `wrangler.jsonc` ou Durable Objects exigem seus testes e validação de produção próprios; ORG-PREP não os altera.

## Inventário dos arquivos migrados

Arquivos existentes serão catalogados na ORG-0. Ao mover: arquivo | propósito | origem | endpoint/binding consumidor | gate.
