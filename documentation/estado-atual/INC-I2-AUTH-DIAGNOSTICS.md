# INC-I2-AUTH — diagnóstico do gate autenticado do PR #293

## Recorrência legado após troca de idioma — 05/10/2026

O último gate local da UIUX passou o preflight e 1.524/1.524 unitários, mas terminou no smoke legado com 160 aprovações em 161 casos. O caso desktop `temporal-field.visual.spec.js` chamou `setAppLanguage()` e, após o reload, `#loading` continuou em “Entrando...” por 15 s. Vite e cutover não foram iniciados. A imagem e o contexto foram preservados somente localmente na worktree UIUX; não se copiam dados da conta para este documento.

Essa ocorrência é anterior à lógica visual da I2, mas não demonstra uma causa em Auth, App Check, perfil, rede ou cache. O helper de reload usa uma expectativa direta e perde o diagnóstico sanitizado que `openApp()` já captura; o runtime legado tampouco expõe a fase fixa disponível no Vite. A investigação `INC-I2-LEGACY-RELOAD` acrescenta observabilidade enumerada e um único recorte controlado na branch do Principal. O prazo de 15 s e as expectativas continuam iguais; nenhum retry ou fallback será adicionado.

O marcador legado e o relatório de falha restrito ao reload passaram no teste sanitizado 9/9, no preflight com zero avisos e nos 1.525/1.525 unitários. A tentativa autenticada focada não chegou ao app: o coordenador despachou o lease `37362017398`, mas não observou sua aquisição dentro de 2 min e o cancelou. O metadado do GitHub confirma run terminado em `cancelled`; na leitura posterior não havia CI/lease ativo. A razão da transição não observada não foi comprovada, e esse timeout não conta como falha funcional da I2. Nenhum teste autenticado foi repetido automaticamente.

O primeiro `npm test` local passou preflight e 1.525 unitários, mas parou antes dos smokes: o sandbox negou (`EPERM`) escrita em três arquivos de relatório Playwright da worktree externa. Os arquivos existiam, não havia servidor do projeto nas portas 8765/8766/8775/8776 e os processos Node visíveis pertenciam ao Codex. Sem apagar relatórios nem alterar testes, a suíte foi repetida com acesso de escrita à worktree e terminou com código 0: preflight sem avisos, 1.525/1.525 unitários, smokes legado e Vite sem falha (skips autenticados esperados pela ausência de credenciais locais) e cutover 60/60. Esse gate demonstra integridade local da instrumentação, não uma reprodução autenticada nem a solução do `#loading` intermitente.

O draft PR #305 (commit inicial `e71e587`) passou o Quick repository sanity `37368929027` e o CI autenticado `37368928963`. No CI: preflight sem avisos, 1.525/1.525 unitários, Worker 44/44, Functions emuladas 74/74, Playwright legado 137 aprovados, Vite 147 aprovados e `SMOKE_OUTCOME: success`; nenhuma etapa falhou. O job pesado executou de 20:25:41 a 21:05:49 UTC em 05/10/2026 (40 min 8 s); o leve de 20:18:46 a 20:19:22 UTC (36 s). Um único CI verde verifica a instrumentação sob autenticação real, mas não encerra o incidente intermitente nem prova a etapa causadora, pois `#loading` não reapareceu nesse run. O PR permanece draft até revisão; a UIUX deve incorporar a instrumentação após a integração aprovada e repetir seu gate.

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

O PR #303 entregou `INC-I2-BOOTSTRAP-PHASE`: o runtime Vite escreve apenas um identificador fixo da etapa no DOM (`auth-restore`, `app-check`, `email-verification`, `preferences`, `profile-gate` e resultados/erros enumerados). O harness só emite membros de uma whitelist; texto desconhecido vira `not-reported`. Não há e-mail, UID, token, URL, corpo, perfil nem temporização nova. O recorte 28/28, o `npm test` integral com 1.524 unitários e o CI autenticado real passaram; o merge foi `bf4ea77`. A prova no Pages que encerrou C14-G e esse CI verde não invalidam a intermitência do PR #293. A falha seguinte ocorreu no legado e é tratada em `INC-I2-LEGACY-RELOAD`.
