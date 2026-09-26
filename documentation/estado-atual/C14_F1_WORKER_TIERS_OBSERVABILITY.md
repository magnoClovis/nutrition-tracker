# C14-F1 — Worker, tiers e observabilidade

Estado: em andamento desde 25/09/2026. O PR #257 foi mesclado em `6293899` em 26/09; o Worker de produção ainda não foi atualizado. Produção só muda depois de configuração segura do novo segredo, deploy controlado e smoke real.

## Objetivos de segurança

- impedir que o UID Firebase seja persistido no Durable Object;
- separar limites antiabuso atuais de futuros limites comerciais;
- manter qualquer limite comercial apenas em observação durante a fase de testers;
- limitar tempo e volume de resposta do Gemini;
- produzir telemetria útil sem conteúdo nem identificador pessoal;
- garantir expiração de 30 dias para os agregados sanitizados mantidos pelo Trofia.

## Pseudonimização e retenção individual

Depois de Auth e App Check válidos, o Worker transforma o UID com HMAC-SHA-256 e um segredo Cloudflare exclusivo chamado `RATE_LIMIT_PSEUDONYM_KEY`. Somente o resultado base64url chega ao rate limiter. O segredo deve ter ao menos 32 caracteres, não fica no Git e não pode reutilizar a chave Gemini.

As janelas antiabuso continuam iguais: cinco chamadas gerais por pseudônimo/minuto, duas imagens por pseudônimo/minuto, 12 chamadas globais/minuto e 400 por dia do projeto. Esses limites protegem serviço e cota; não representam plano gratuito ou pago. Os registros individuais continuam expirando por alarme antes do teto público de 24 horas.

Na primeira inicialização da migração v3, as janelas individuais antigas são apagadas em vez de copiadas, porque continham UID bruto e não podem ser pseudonimizadas sem voltar a processar o identificador de origem. Isso pode reiniciar uma única janela antiabuso de um minuto no instante do deploy; o contador agregado diário do projeto é preservado. Depois do marcador v3, reinicializações normais não repetem a limpeza.

## Tiers comerciais

`AI_TIER_CONFIG` aceita um tier padrão e uma tabela extensível de tiers, cada um com limite diário opcional. O único tier publicado inicialmente é `testing`, sem limite comercial finito. Um custom claim Firebase `trofia_ai_tier` só é usado quando seu valor existe na configuração assinada pelo servidor; valor ausente ou desconhecido cai no tier padrão.

`AI_TIER_MODE` fica em `observe`. Nesse modo, uma política finita pode contabilizar e sinalizar internamente que o limite seria excedido, mas nunca nega a solicitação. O modo `enforce` já é suportado e testado, porém não deve ser publicado antes das decisões de produto e rollout do C30. Limites antiabuso permanecem obrigatórios nos dois modos.

## Fronteira do provedor

- deadline do Gemini: 40 segundos, abaixo do deadline total de 45 segundos do fluxo de imagem;
- resposta do provedor: máximo de 128 KB antes do parse;
- geração: máximo existente de 1.200 tokens;
- timeout retorna `504 provider-timeout`;
- resposta grande, JSON malformado ou contrato inválido retorna erro sanitizado e fail-closed;
- nenhum detalhe privado do provedor chega ao cliente.

## Observabilidade e retenção

Cada chamada gera somente estas dimensões: endpoint de allowlist, status HTTP, classe `success`/`client-error`/`server-error`, latência entre 0 e 120 segundos, estado sanitizado de App Check e tier validado. UID, pseudônimo, e-mail, prompt, foto, token, cabeçalho, resposta e dado nutricional são proibidos pelo construtor e pelo validador do Durable Object.

Workers Logs fica habilitado com invocation logs desativados, log customizado em 100% durante o beta e traces amostrados em 10%. A retenção nativa do produto é menor que 30 dias — atualmente 3 dias no plano Free e 7 no Paid — e não é descrita como se fosse configurável para 30 dias.

Para cumprir a política aprovada, o Durable Object mantém apenas agregados diários sem identificador: contagem, soma e máximo de latência por dimensões sanitizadas. Um alarme remove cada agregado em no máximo 30 dias. A retenção reduzida dos Workers Logs e o agregado de 30 dias são camadas distintas.

## Gates antes do deploy

1. testes Node do Worker e testes runtime do Durable Object;
2. `wrangler deploy --dry-run` com a configuração versionada;
3. suíte completa local e CI autenticado real;
4. cadastrar `RATE_LIMIT_PSEUDONYM_KEY` como secret sem expor seu valor;
5. deploy controlado do Worker;
6. smoke real dos endpoints de texto e imagem com conta descartável;
7. confirmar métricas sanitizadas e ausência de UID/conteúdo nos logs;
8. manter `AI_TIER_MODE=observe`.

Falha de pseudonimização, configuração de tier ou Durable Object é fail-closed e retorna `503 rate-limit-unavailable`; falha de telemetria, ao contrário, nunca altera a resposta funcional já calculada.

## Validação pré-PR

- preflight: aprovado sem avisos;
- unitários gerais: 1.454/1.454;
- Worker Node: 44/44;
- Durable Object no runtime Workers: 9/9;
- `wrangler deploy --dry-run`: aprovado;
- smoke local legado: 52 aprovados e 63 skips esperados por ausência deliberada de credenciais no worktree;
- smoke local Vite: 52 aprovados e os mesmos 63 skips esperados;
- matriz cutover: 60/60.

Os casos autenticados não são considerados validados pelos skips locais: o CI autenticado real continua sendo gate obrigatório do PR antes de qualquer deploy.

### Correção dos gates pós-enforcement

A primeira execução do PR #257 expôs dois contratos de CI desatualizados desde a conclusão da C14-C5. O verificador de modo ainda esperava `observe`, embora produção já opere corretamente em `enforce`; o smoke de despensa criava uma conta descartável, mas chamava o Worker sem token App Check e recebia o `401 app-check-required` esperado do serviço protegido.

O gate de PR agora prova explicitamente o modo `enforce`. O smoke de despensa recebe o segredo debug somente pelo GitHub Actions, troca-o por um token App Check curto usando o app Web registrado e envia esse token no cabeçalho protegido. O valor não é impresso nem persistido. A correção é coberta por 11/11 testes focados e não relaxa enforcement, autenticação ou contrato de resposta. Em 26/09/2026, a suíte local `npm test` terminou com código de saída zero, incluindo cutover 60/60.

O mesmo primeiro CI também registrou uma falha visual mobile no teste de câmera CAM-RED-6 (`closeHeight` 47,58 px ante mínimo de 48 px). Esse achado não foi atribuído ao Worker nem corrigido nesta fatia. A segunda execução remota no commit `e75d60d` passou integralmente: preflight documental, gate de App Check, smoke de despensa e CI autenticado, com 1.465 unitários, 44 testes Node do Worker, 74 testes de Functions, 111 casos de smoke legado (8 skips estruturais esperados) e 119 casos Vite. A terceira execução, no commit documental `bce367f`, também passou os quatro checks. A falha visual não se repetiu, mas sua causa permanece para triagem da UI/UX; configuração segura do segredo HMAC, deploy controlado e smoke real ainda são gates da C14-F1.
