# C14-F1 — Worker, tiers e observabilidade

Estado: concluído em 26/09/2026. O PR #257 foi mesclado em `6293899`; o rollout de produção e os gates abaixo foram confirmados no mesmo dia.

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

## Rollout de produção — 26/09/2026

- O perfil Wrangler `trofia` foi vinculado somente à pasta `worker` desta worktree; a conta correta foi confirmada antes de qualquer publicação. O perfil padrão de outra conta Cloudflare não foi alterado.
- O dry-run passou com `APP_CHECK_MODE=enforce` e `AI_TIER_MODE=observe`. O código da `origin/main` `312403e` foi carregado como versão sem tráfego `be24bbe4-9f96-4ede-ab9c-5c9934f612f8`; o segredo `RATE_LIMIT_PSEUDONYM_KEY` foi gerado localmente com 48 bytes aleatórios e acrescentado por versão estagiada, sem exibir, salvar no Git ou transmitir o valor no chat. A versão final estagiada foi `179df5a8-af1b-4d0a-a76a-6bedd32ed6f1`.
- Antes do corte, `cf6f8d82-566c-483f-9fb0-2a587dda0dab` recebia 100% do tráfego. O dry-run da troca confirmou o alvo; a publicação controlada colocou `179df5a8-af1b-4d0a-a76a-6bedd32ed6f1` em 100% às 10:27:06 UTC, conforme o histórico de deployments. A lista de segredos confirmou `GEMINI_API_KEY` e `RATE_LIMIT_PSEUDONYM_KEY` apenas pelos nomes. O segredo não foi instalado por `wrangler secret put` direto, que teria publicado uma versão imediatamente.
- O verificador de produção confirmou a rejeição sem App Check (`401 app-check-required`), e o verificador do endpoint de imagem confirmou o contrato não autenticado. O smoke de despensa foi repetido contra a produção com App Check e terminou verde na tentativa 2 do run `36220582228`.
- Um smoke independente criou uma conta descartável nova, trocou o debug provider por token App Check curto e chamou os endpoints de texto e imagem em produção. Ambos retornaram HTTP 200 com contratos válidos; a conta descartável foi excluída ao final com HTTP 200. Nenhuma credencial, UID, token, cabeçalho sensível, prompt ou imagem privada foi registrada. Para a imagem foi usado um JPEG público apenas em memória.
- Um evento controlado sem credenciais comprovou que o log customizado de produção contém somente `event`, `endpoint`, `status`, `scope`, `latencyMs`, `appCheck` e `tier`; o evento correspondente foi enviado ao método `recordMetric` do Durable Object. O teste não inspecionou tráfego autenticado de usuários reais. O streaming temporário foi encerrado após a conferência. Os testes de contrato proíbem identificadores/conteúdo no construtor e no armazenamento, enquanto `invocation_logs` permanece desabilitado na configuração publicada.
- Não houve regressão observada nos smokes. A versão anterior permanece identificada para resposta a incidente, mas um rollback de código não reverte dados já migrados do Durable Object; qualquer retorno exigiria avaliação específica, e a versão antiga voltaria a armazenar UID bruto.
