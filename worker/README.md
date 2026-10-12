# Worker de IA

Worker Cloudflare que expõe os endpoints de IA, valida Auth/App Check e aplica contratos de quota/observabilidade. O deploy e as configurações de produção são separados da simples organização do repositório.

Não registrar tokens, UID, prompts, imagens nem resposta bruta em documentação ou logs. Mudanças em código, `wrangler.jsonc` ou Durable Objects exigem seus testes e validação de produção próprios; ORG-PREP não os altera.

## Ambientes C14-H

O alvo principal de `wrangler.jsonc` é a produção e declara `DEPLOY_TARGET=production`. `env.staging` é um Worker separado (`trofia-ai-proxy-staging`) com binding próprio para `AI_RATE_LIMITER`; não aponta para o Durable Object da produção. O runtime exige `DEPLOY_TARGET` explícito e recusa configuração incompleta ou mistura de projeto, App Check e origem antes de acessar Auth, quota ou provedor.

O staging permanece propositalmente bloqueado: `FIREBASE_APP_CHECK_APP_IDS` e `ALLOWED_ORIGINS` estão vazios, e nenhum secret de IA foi configurado. Só preencher esses campos depois de registrar os apps e o host no projeto `trofia-staging`, conferir App Check e aprovar a publicação. `https://localhost` deve ser incluído somente para o cliente Android staging com App ID Android do mesmo projeto. Não copiar secrets ou origens da produção; `wrangler deploy --env staging --dry-run` valida o pacote, mas **não** comprova identidade, isolamento remoto ou autorização de deploy. O roteiro e os gates completos estão em `documentation/estado-atual/C14_H_STAGING_AUDITORIA.md`.

## Inventário dos arquivos migrados

Arquivos existentes serão catalogados na ORG-0. Ao mover: arquivo | propósito | origem | endpoint/binding consumidor | gate.
