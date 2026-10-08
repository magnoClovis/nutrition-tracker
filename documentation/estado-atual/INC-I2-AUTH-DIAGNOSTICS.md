# INC-I2-AUTH — diagnóstico do gate autenticado do PR #293

## Recorrência legado após troca de idioma — 05/10/2026

O último gate local da UIUX passou o preflight e 1.524/1.524 unitários, mas terminou no smoke legado com 160 aprovações em 161 casos. O caso desktop `temporal-field.visual.spec.js` chamou `setAppLanguage()` e, após o reload, `#loading` continuou em “Entrando...” por 15 s. Vite e cutover não foram iniciados. A imagem e o contexto foram preservados somente localmente na worktree UIUX; não se copiam dados da conta para este documento.

Essa ocorrência é anterior à lógica visual da I2, mas não demonstra uma causa em Auth, App Check, perfil, rede ou cache. O helper de reload usa uma expectativa direta e perde o diagnóstico sanitizado que `openApp()` já captura; o runtime legado tampouco expõe a fase fixa disponível no Vite. A investigação `INC-I2-LEGACY-RELOAD` acrescenta observabilidade enumerada e um único recorte controlado na branch do Principal. O prazo de 15 s e as expectativas continuam iguais; nenhum retry ou fallback será adicionado.

O marcador legado e o relatório de falha restrito ao reload passaram no teste sanitizado 9/9, no preflight com zero avisos e nos 1.525/1.525 unitários. A tentativa autenticada focada não chegou ao app: o coordenador despachou o lease `37362017398`, mas não observou sua aquisição dentro de 2 min e o cancelou. O metadado do GitHub confirma run terminado em `cancelled`; na leitura posterior não havia CI/lease ativo. A razão da transição não observada não foi comprovada, e esse timeout não conta como falha funcional da I2. Nenhum teste autenticado foi repetido automaticamente.

O primeiro `npm test` local passou preflight e 1.525 unitários, mas parou antes dos smokes: o sandbox negou (`EPERM`) escrita em três arquivos de relatório Playwright da worktree externa. Os arquivos existiam, não havia servidor do projeto nas portas 8765/8766/8775/8776 e os processos Node visíveis pertenciam ao Codex. Sem apagar relatórios nem alterar testes, a suíte foi repetida com acesso de escrita à worktree e terminou com código 0: preflight sem avisos, 1.525/1.525 unitários, smokes legado e Vite sem falha (skips autenticados esperados pela ausência de credenciais locais) e cutover 60/60. Esse gate demonstra integridade local da instrumentação, não uma reprodução autenticada nem a solução do `#loading` intermitente.

O PR #305 (commit inicial `e71e587`) passou o Quick repository sanity `37368929027` e o CI autenticado `37368928963`. No CI: preflight sem avisos, 1.525/1.525 unitários, Worker 44/44, Functions emuladas 74/74, Playwright legado 137 aprovados, Vite 147 aprovados e `SMOKE_OUTCOME: success`; nenhuma etapa falhou. O SHA documental `7b11cfb` também passou preflight `37375040780` e CI autenticado `37375040727`. As durações efetivas dos quatro jobs somam 1 h 22 min 43 s (1 min leve + 1 h 21 min 43 s pesado). O PR foi mesclado em `88ad052` em 08/10/2026 após 2 d 21 h 33 min 1 s do primeiro commit; a UIUX recebeu o commit para incorporação ao #293. Esses gates verificam a instrumentação, mas não encerram o incidente intermitente nem provam a etapa causadora, pois `#loading` não reapareceu.

**Nova recorrência local informada pela UIUX em 08/10/2026:** depois da incorporação local de `88ad052`, os recortes focados passaram 63/63 em legado e Vite. O smoke integral legado teve 145 aprovações e 16 falhas de splash persistente, 13 marcadas `auth-restore`, duas `profile-ready` e uma sem fase porque passou por uma expectativa direta; Vite integral e cutover não rodaram. O contexto de uma falha `profile-ready` mostra conteúdo da interface por trás do splash e requests Firestore abortadas após reload de idioma, mas não atribui causalidade. A inspeção do legado revela que `auth-restore` marca antes de `fbRefreshToken()`, enquanto um timer interno de 8 s pode chamar sign-out sem atualizar a fase; portanto, esse marcador sozinho não prova falha do provedor Auth. `profile-ready` é anterior à hidratação do controlador e à chamada `hideInitialLoading()`. Próximo passo restrito: instrumentar com rótulos enumerados início/fim/timeout da renovação e hidratação/ocultação da UI, testar a whitelist sanitizada e só então repetir um recorte autenticado sob lease. Não alterar tempo, retry, Auth, Firestore ou a implementação funcional I2 por inferência.

**Gate da instrumentação em 08/10/2026:** os rótulos fixos `auth-refresh`, `auth-refresh-timeout`, `auth-ready`, `daily-hydration`, `daily-ready`, `daily-ready-timeout` e `splash-hide`, mais o booleano `root-content`, entraram na whitelist sanitizada. O espelho legado permanece idêntico. O teste focado passou 9/9, preflight zero avisos e `npm test` local saiu com código 0, incluindo cutover 60/60; a worktree não tinha credenciais descartáveis, então o smoke local não comprova restauração autenticada. Nenhum timeout, retry, Auth, Firestore, App Check ou UI I2 funcional foi alterado. A próxima etapa é CI autenticado e reprodução controlada; se a falha reaparecer, usar a fase exata antes de propor correção.

## Estado

Investigação em andamento na frente Trofia-Principal, separada da implementação I2 da UIUX. A branch e o PR #293 não são alterados aqui.

## Evidência inicial

- Run `36590911079`, tentativa 1: perfil retornou `unavailable` em um caso desktop; outro caso mobile permaneceu no loading de login por 15 s. Os dois casos passaram em reprodução focada sem mudança de código.
- Tentativa 2: o round trip do backup terminou funcionalmente, mas o coletor de console sinalizou HTTP 400 sem endpoint. O trace de reprodução isolada passou sem 400.
- Artefatos do CI: `11046177805` e `11052475783`. O coletor atual usa a URL do console para decidir uma exceção conhecida, mas salva somente o texto genérico; a origem do 400 não pode ser recuperada do relatório disponível.
- Não há evidência suficiente para afirmar causa comum, defeito na I2 ou que o 400 seja inofensivo.

## Plano e limites

Instrumentar somente o harness de teste para mostrar fase, domínio permitido, caminho redigido, método, status e classe segura do erro. URLs completas, queries, credenciais, UID, token, headers, corpos e dados da conta nunca entram no relatório. O 400 continua crítico. Não aumentar timeout, repetir login automaticamente, ignorar loading ou alterar Auth/Firestore/App Check sem causa objetiva.

Auditar também a restauração das fixtures no `finally`. Qualquer alteração no teardown precisa ser provada com teste; não apagar marcadores preexistentes da conta compartilhada por suposição. O gate autenticado local só roda quando o lease compartilhado estiver livre.

## Resultado da auditoria do teardown

No cenário de avaliação contextual, a limpeza anterior começava somente depois de `replaceDailyLog` e `replacePantry`. Se a preparação falhasse nesse intervalo, o `finally` não era instalado. Além disso, as três restaurações eram sequenciais sem isolamento: a primeira rejeição impedia a tentativa das outras. Isso é um defeito objetivo do harness e pode deixar fixture residual; não prova que os marcadores vistos no artefato tenham exatamente essa origem.

A correção move a preparação para dentro do `try` após capturar os snapshots e tenta as três restaurações independentemente, na ordem anterior. Se qualquer passo falhar, o gate informa apenas o número do passo; não imprime o erro bruto nem o valor da fixture. O teste unitário comprova que uma falha no primeiro passo não impede os demais.

## Validação parcial

- Teste focado do coletor/teardown: 6/6 aprovado.
- Unitários completos: 1.518/1.518 aprovados, zero skips, após instalar dependências exatas do lockfile principal e do Worker na worktree isolada.
- `npm test` integral final: preflight verde, 1.518/1.518 unitários, legado 76 aprovados + 69 skips locais por falta de credenciais nesta worktree, Vite 76 aprovados + 69 skips locais, cutover 60/60; código de saída 0.
- Recorte autenticado real Vite, com a configuração App Check completa no mesmo processo e lease distribuído: 5/5 (setup mais avaliação contextual e backup em desktop/mobile), zero falhas/skips. Lock e portas liberados no teardown. As credenciais e tokens foram lidos somente de arquivos locais ignorados/variáveis do repositório e não copiados para esta worktree.
- CI autenticado do PR técnico: primeiro ciclo falhou em asserção visual do harness; segundo ciclo sobre `00b3766` passou. Os passes não classificam o HTTP 400 original, que não reapareceu.
- O primeiro CI do PR #295 expôs uma asserção GenericDialog incompatível com o coletor agora sanitizado: o alerta controlado foi exibido, mas o teste ainda buscava texto bruto. O commit `00b3766` classifica somente o marcador estático como `controlled-export-error` e mantém falhas inesperadas críticas; o recorte autenticado passou 3/3.
- No SHA `00b3766`, o preflight documental `36654209987` passou em 27 s e o CI autenticado `36654210219` em 38 min 04 s: 1.519 unitários, Worker 44/44, Functions emuladas 74/74, legado 135 aprovados + 10 skips estruturais, Vite 145/145, `SMOKE_OUTCOME: success`. O CI não reproduziu os três sintomas originais da I2, portanto sua causa comum permanece não confirmada; não se declarou o runtime corrigido por esse resultado.

## Ocorrência paralela C14-G

No run `36621844513` do então draft PR #294, preflight, unitários, Worker e Functions passaram, mas 54 testes Vite mobile falharam com `#loading` visível; o screenshot público mostrou “Entrando...”. O artefato `11060633336` não contém a origem de rede/console do bloqueio antes do timeout. A recorrência reforça a necessidade da instrumentação, mas não demonstra que CSP, I2, App Check ou Firestore sejam a causa. O PR #294 foi mesclado posteriormente, mas a validação Pages da C14-G continua aberta.

## Nova recorrência no PR #295 — 30/09/2026

O SHA `f2bae8a` altera somente documentação em relação ao `00b3766` funcional que passara no CI. Mesmo assim, o run autenticado `36694910642` falhou em dois casos desktop consecutivos de `authenticated-flows.spec.js` no bootstrap, com `#loading` exibindo “Entrando…” por 15 s. O Vite terminou com 143 aprovações e duas falhas; legado, unitários, Worker e Functions passaram. A evidência sanitizada capturou GETs Firestore com `net::ERR_ABORTED`, caminho redigido e sem status; isso não estabelece qual Promise prendeu o bootstrap, nem se o aborto ocorreu antes ou depois da navegação do teste. O artefato `11090173098` preserva screenshots/relatório localmente; não reproduzir dados da conta na documentação.

Como passo diagnóstico restrito ao harness, `openApp()` agora informa estados booleanos da camada de loading e seus timers, além de presença da interface e `document.readyState` em enumeração fixa. O teste focado passou 8/8 e prova que um valor de página malicioso não entra no erro. A causa segue **não confirmada**; não há correção de runtime, retry ou relaxamento do timeout, e o PR #293 da UIUX continua bloqueado para decisão após novo gate confiável.

**Integração da main e gate local — 30/09/2026:** a instrumentação foi commitada em `bac6c36` e a `origin/main` foi integrada sem conflitos no merge local `93c6516`, preservando C14-F2 e C14-G. `npm test` na base integrada terminou com código 0: preflight sem avisos, 1.524/1.524 unitários, smokes locais sem falhas funcionais e com skips autenticados esperados pela ausência de credenciais nesta worktree, e cutover 60/60. Isso valida integração local, **não** reproduz a falha autenticada nem substitui um novo CI real. O PR #295 segue draft e o #293 não foi alterado.

## Continuação após o merge #295 — 04/10/2026

O PR de instrumentação anterior #295 foi mesclado em `0823472`, com 4 d 14 h 9 min 6 s até o merge e 2 h 28 min 15 s de CI (2 min 24 s leve + 2 h 25 min 51 s pesado), valores idênticos no histórico da frente e na descrição do PR. Esse merge não resolveu a causa de `#loading`.

No CI `37213604958` do PR UIUX #293, o HEAD `3df7607` passou 160 cenários e falhou um caso Vite mobile antes de sua lógica funcional: `openApp()` encontrou `#loading` presente, sem pedido de ocultação e sem `[data-app-main]`, embora `document.readyState` fosse `complete`. O UIUX preservou o PR draft e classificou corretamente a etapa assíncrona exata como desconhecida; não repetiu o CI nem alterou Auth. Nenhuma evidência atribui a falha à I2.

Para a próxima reprodução, a frente Principal propõe `INC-I2-BOOTSTRAP-PHASE`: o runtime escreve apenas um identificador fixo da etapa no DOM (`auth-restore`, `app-check`, `email-verification`, `preferences`, `profile-gate` e resultados/erros enumerados). O harness só emite membros de uma whitelist; texto desconhecido vira `not-reported`. Não há e-mail, UID, token, URL, corpo, perfil nem temporização nova. O recorte final passou 28/28; o `npm test` integral passou com 1.524 unitários, legado e Vite 78 aprovados + 69 skips locais esperados cada e cutover 60/60. O CI autenticado real ainda é obrigatório antes de integrar. A prova no Pages que encerrou C14-G não invalida a intermitência do CI #293.

**Integração da fase fixa — 04/10/2026:** o preflight `37222460203` e o CI autenticado `37222460191` passaram no PR #303, mesclado em `bf4ea77`. A frente UIUX recebeu esse commit para incorporá-lo ao PR #293 e repetir o gate. Isso conclui a instrumentação, não a investigação da causa: se `#loading` reaparecer, o estado de fase agora deve ser preservado de forma sanitizada, sem retry, mudança de timeout ou aceitação de tela intermediária como sucesso. A falha seguinte ocorreu no legado e é tratada em `INC-I2-LEGACY-RELOAD`.
