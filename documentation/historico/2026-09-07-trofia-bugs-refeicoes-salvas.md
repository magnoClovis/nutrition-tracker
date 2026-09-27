# Histórico do chat Trofia-Bugs — ajustes de "Refeições salvas"

## Escopo e método

Este registro documenta os ajustes de comportamento e persistência no fluxo de "Registro refeição" → aba "Salvas", solicitados no chat de bugs. A evidência primária é a própria base de código local em `nutrition-tracker-new`, o histórico de `main` no Git e a suíte de testes executada nesta implementação.

### Relação com a versão de base

- Base principal atual: `origin/main` no commit `92e6722`, reaplicada em worktree limpa antes da validação final.
- PRs de referência já integrados: S9 (`#172`) e correção de IDs de refeições salvas (`#179`) no momento da implementação.
- A implementação preserva a geração de um ID novo para cada entrada diária; `foodId` continua sendo apenas referência, conforme o PR `#179`.

## 07/09/2026 — Fluxo de "Refeições salvas" sem ambiguidade

Foram implementadas três correções complementares no fluxo de templates salvos:

- **1) Feedback visual ao adicionar**
  - Em `"Adicionar"` de um template salvo, mantemos o tipo de refeição já selecionado em `staged.meal` (não sobrescrevemos com `t.meal` do modelo salvo).
  - O app fecha automaticamente o painel de templates salvos após a inserção com `setAddTemplatesOpen(false)`.
  - É realizado scroll automático para a seção de `Na refeição` (`data-add-staged-meal`) para dar evidência do efeito da ação.

- **2) Remoção de sobrescrita do tipo de refeição**
  - `loadTemplate` deixou de aplicar `meal` ao estado `staged`.
  - Ao salvar modelo editado, `meal` não é mais persistido novamente; novos templates salvos passam a ficar sem esse campo.
  - Modelos antigos com `meal` continuam legíveis para leitura e não quebram fluxo; a sobrescrita é deixada desativada desde o momento de inserção na refeição.

- **3) Edição permanente separada de adição pontual**
  - O botão **Editar** no cartão de refeição salva passou a abrir o editor persistente do próprio template, no local de montagem atual.
  - O seletor de “Refeição padrão” foi removido do editor de modelo salvo por não ter função útil nesse comportamento.
  - O botão **Adicionar** continua fazendo ajuste pontual por registro diário sem alterar o modelo salvo.

## Arquivos alterados nesta entrega

- `add-screen.js`
- `nutrition-tracker-controller.js`
- `saved-meal-card.js`
- `tests/unit/add-screen.test.js`
- `tests/unit/saved-meal-card.test.js`

## Validação executada

- `node --test tests/unit/add-screen.test.js tests/unit/saved-meal-card.test.js` — 32/32 aprovados na base atualizada.
- `npm.cmd run test:smoke:legacy` autenticado — 89 aprovados e 8 pulados por serem exclusivos do SDK Vite; desktop/mobile, claro/escuro e PT/EN/ES cobertos.
- `npm.cmd run test:smoke:vite` autenticado — build Vite verificado e 97/97 aprovados, incluindo cache, offline, segunda aba e reconhecimento por imagem.
- `npm.cmd test` completo — preflight sem avisos; 1256/1256 unitários; smoke legado com 89 aprovados e 8 exclusivos do Vite pulados; smoke Vite com 97/97 aprovados; matriz `cutover` legado/Vite com 60/60 aprovada.

### Esclarecimento do erro Vite anterior

- O erro `Access is denied / could not resolve vite.config.js` foi reproduzido anteriormente também sobre uma checkout limpa da `main`, portanto não era regressão desta entrega.
- Na worktree limpa final, com as variáveis públicas de Firebase/App Check carregadas e a execução com as permissões necessárias, o mesmo build concluiu normalmente e passou pela allowlist de 13 arquivos.
- Uma primeira execução agregada apresentou duas flutuações de carregamento em testes visuais mobile. Ambos passaram imediatamente na repetição focada (3/3 incluindo o setup) e a repetição integral posterior do `npm test` terminou verde.

## [PR-181] - Fix: corrigir comportamento de refeições salvas

**Data de início:** 2026-09-07 15:32:59 +02:00

**Data de conclusão:** 2026-09-09 20:35:34 +02:00

**Tempo decorrido:** 2 d 5 h 2 min

**Minutos de CI:** 29 min (1 leve + 28 pesado)

**Chat-Origin:** Trofia-Bugs

**Propósito:** corrigir o fluxo de carregamento e edição permanente de refeições salvas.

**Recursos/arquivos principais envolvidos:** componentes e modelos de refeições salvas, composições legado/Vite, testes unitários, smoke autenticado e documentação.

**O que foi feito:** o painel passou a fechar e rolar para a refeição carregada, o tipo escolhido pelo usuário passou a ser preservado e a edição permanente de nome, ingredientes e quantidades foi separada do ajuste pontual ao adicionar.

**PRs/commits relacionados:** PR [#181](https://github.com/magnoClovis/nutrition-tracker/pull/181); head ed7d85f6; merge db01a1a5.

## [DOC-BUG-SAVED-MEALS-STATUS] - Padronização do registro no resumo

**Data de início:** 2026-09-14 20:18:57 +02:00

**Data de conclusão:** 2026-09-14 20:20:24 +02:00

**Tempo decorrido:** 1 min 27 s

**Minutos de CI:** 1 min (1 leve + 0 pesado)

**Chat-Origin:** Trofia-Bugs

**Propósito:** adequar a entrada do PR #181 no `RESUMO-STATUS.md` ao padrão detalhado obrigatório usado pelas fatias C14.

**O que se planeja fazer:** substituir o registro compacto por cabeçalho próprio e campos separados de status, datas, propósito, planejamento, recursos, entrega e alinhamento, preservando as evidências técnicas já registradas.

**Recursos/arquivos principais envolvidos:** `documentation/estado-atual/RESUMO-STATUS.md`, histórico Git, metadados dos PRs #179, #181 e #199 e workflow `Documentation preflight`.

**O que foi feito:** o PR [#199](https://github.com/magnoClovis/nutrition-tracker/pull/199), commit `5800a5e2` e merge `31bc44dd`, reformulou a entrada como `[BUG-SAVED-MEALS]`, acrescentou todos os campos obrigatórios e manteve explícitas a compatibilidade com IDs novos e a validação da entrega original.

**Alinhamento:** 100% — o formato e os campos solicitados foram entregues integralmente; a mudança permaneceu exclusivamente documental, com impacto positivo para a rastreabilidade do projeto.

## [BUG-BACKUP-D08-D09] - Integridade fail-closed de exportação e preview de backup

**Status:** concluído.

**Data de início:** 26/09/2026.

**Data de conclusão:** 26/09/2026.

**Tempo decorrido:** 1 h 28 min 37 s.

**Minutos de CI:** 1 h 10 min 23 s (46 s leve + 1 h 9 min 37 s pesado).

**Propósito:** corrigir conjuntamente D08 e D09 para que a exportação “Diário — hoje” prove que o snapshot pertence à data civil local atual e para que o preview de importação só permita continuidade quando o contrato real do adaptador e suas contagens forem integralmente válidos.

**O que se planeja fazer:** resolver o snapshot de `log`, tipo do dia e metas especificamente para `TODAY`, revalidar `localToday()` no clique e falhar sem arquivo em virada civil não reidratada; eliminar ou endurecer o bridge `_exportAndDownload`; consumir exclusivamente `existingItems`, validar tipos e `newItems + existingItems === total`, encerrar explicitamente falhas de leitura e impedir importação após preview inválido; preservar backups planos antigos, backups versionados suportados, promoção de `legacy`, append/replace e paridade UMD/ESM entre legado e Vite.

**Recursos/arquivos principais envolvidos:** `backup-modal.js`, `firebase-backup-internal.js`, `nutrition-tracker-controller.js`, `tests/unit/backup-modal.test.js`, `tests/unit/firebase-backup-internal.test.js`, `tests/unit/nutrition-tracker-controller.test.js`, Playwright legado/Vite e matriz cutover, `documentation/estado-atual/BUG-INVENTORY.md`, `documentation/estado-atual/RESUMO-STATUS.md` e este histórico.

**O que foi feito:** Tarefa 0 aprovada como uma única fatia; o gate do PR #257 foi cumprido e uma worktree isolada com a branch `codex/bug-backup-d08-d09` foi criada sem alterar o checkout principal sujo ou as branches dos PRs #256/#258. Em D08, o controller passou a publicar um snapshot hidratado de `TODAY`, com `log`, tipo do dia e metas calculados especificamente para a data civil atual; o modal revalida `localToday()` no clique, usa exclusivamente esse snapshot e não cria arquivo se a data virou ou o contrato não estiver pronto. A implementação duplicada `_exportAndDownload` foi removida. Em D09, o modal passou a aceitar somente `existingItems`, exigir categorias únicas com contagens inteiras não negativas e coerência `newItems + existingItems === total`, limpar qualquer preview anterior antes da leitura e revalidá-lo antes da importação; o adaptador agora propaga falhas de leitura do estado existente em vez de convertê-las em ausência silenciosa. Os contratos de backups planos antigos, versionados, promoção de `legacy` e estratégias append/replace permaneceram inalterados.

Na preparação dos gates, foi comprovado que a primeira falha da suíte completa vinha de uma junction de `node_modules` apontando para dependências incompletas do checkout principal; somente o vínculo da worktree foi removido e `npm ci` foi executado pelos lockfiles da raiz e de `worker/`, confirmando `@capacitor-community/camera-preview` e `jose`. Uma tentativa seguinte foi interrompida antes do smoke porque a porta 8765 e o lease pertenciam legitimamente à frente `.codex-ui-cam-red-7`; nenhum processo alheio foi encerrado e a execução aguardou passivamente a liberação. O gate local definitivo passou com 115/115 testes focados, preflight verde, 1475/1475 unitários, smoke autenticado legado com 111 aprovados e 8 skips intencionais de casos exclusivos do runtime Vite, smoke Vite 119/119 e cutover 60/60. Os relatórios confirmam zero falhas; nenhum skip foi causado por falta de credenciais. Antes do commit, a branch foi avançada por fast-forward até `origin/main` em `b9ae9ff`, incorporando os PRs #262 e #258 e preservando as entradas documentais das outras frentes. O PR draft #264 foi aberto no commit `d033663`; os dois ciclos de CI passaram integralmente. Os gates pesados `36245598218` e `36247694731` somaram 1 h 9 min 37 s e confirmaram 1475/1475 unitários, Worker e Functions verdes, smoke legado com 111 aprovados e os mesmos 8 skips intencionais, e smoke Vite 119/119. Os gates leves `36245598213` e `36247694749` somaram 46 s. Após aprovação explícita, o PR foi mesclado em `d617840` às 17:02:06 CEST de 26/09/2026.

**Alinhamento:** 100% — a entrega correspondeu integralmente ao escopo aprovado para D08 e D09; backups planos antigos, backups versionados, promoção de `legacy` e estratégias append/replace foram preservados. Os incidentes de dependência e disputa legítima do lease não mudaram o produto nem o escopo e tiveram impacto final neutro.

**PRs/commits relacionados:** PR [#264](https://github.com/magnoClovis/nutrition-tracker/pull/264); commits `d033663` e `11dcfaa`; merge `d617840`; base reconciliada `b9ae9ff`; runs leves `36245598213`/`36247694749` e pesados `36245598218`/`36247694731`; PRs de precedência #257, #261, #262 e #258.

## [BUG-BACKUP-PREVIEW-VITE] - Coalescência das leituras diárias no preview Vite

**Status:** concluído.

**Data de início:** 26/09/2026.

**Data de conclusão:** 27/09/2026.

**Tempo decorrido:** 3 h 3 min 43 s.

**Minutos de CI:** 83,13 min totais (leve: 0,75 min/45 s; pesado: 82,38 min/82 min 23 s).

**Propósito:** reduzir as leituras Firestore redundantes por data durante o preview autenticado de um backup real no runtime Vite, mantendo a tarefa independente de D08/D09, D13 e do PR #265 e sem declarar artificialmente resolvida a intermitência observada no CI.

**O que se planeja fazer:** preservar os artefatos e o diagnóstico já obtidos; compartilhar, exclusivamente dentro de cada chamada de preview, uma única Promise e um único resultado de `fbReadDailyStateCompatible3(date)` entre as chaves de refeições, água e suplementos da mesma data; manter datas distintas independentes; descartar o estado temporário após sucesso ou falha; preservar fail-closed, conteúdo, contagens, formatos, retrocompatibilidade e estratégias de importação; cobrir sucesso, falha, limpeza e nova leitura em preview posterior; medir antes/depois com a conta descartável e executar testes focados, `npm test` completo e CI autenticado real sem timeout maior nem retry.

**Recursos/arquivos principais envolvidos:** `firebase-backup-internal.js`, `src/firebase/firebase-sdk-runtime.js`, testes unitários do runtime e do backup, `tests/smoke/backup-preview-diagnostic.spec.js`, `tests/smoke/authenticated-flows.spec.js`, Playwright Vite, screenshots/contextos/JSON do run #36257846855 e a conta descartável autenticada.

**O que foi feito:** o CI do PR #265, run `36257846855`, job `108464899999`, falhou duas vezes no mesmo ponto de `tests/smoke/authenticated-flows.spec.js`: após `setInputFiles`, `getByRole('heading', {name: /Revisar importação/i})` não apareceu no limite existente de 20 segundos. Na tentativa 1, desktop passou em 63.128 s e mobile falhou em 78.197 s; na tentativa 2, desktop falhou em 78.680 s e mobile passou em 64.223 s. Os dois screenshots e snapshots de acessibilidade mostram somente a tela “Backup e restaurar”, sem modal e sem mensagem de erro, o que é compatível com o `await previewFullAccountBackupImport(rawBackup)` ainda pendente, não com rejeição tratada pelo `catch`.

O código atual confirma uma amplificação específica do runtime Vite: `previewFullAccountBackupImport3` processa cada chave importável e chama `readBackupValue(targetKey)`; para cada `log_v2_DATA`, `waterIntake_DATA` e `suppLog_DATA`, `readBackupValue` chama novamente `fbReadDailyStateCompatible3(DATA)`. Essa leitura recompõe simultaneamente refeições, água e suplementos e cada categoria consulta migração/coleção, portanto as três chaves da mesma data repetem o mesmo estado completo. A execução diagnóstica anterior registrada no chat passou isoladamente em desktop/mobile e observou 1.775 requisições de servidor para um backup com 102 datas, mas o arquivo diagnóstico permaneceu não commitado e o snapshot físico arquivado não pôde ser restaurado; por isso esse número é indício forte, não artefato suficiente para declarar causalidade encerrada.

O diagnóstico reconstruído foi executado sob o lease autenticado em 27/09/2026 sem importar dados: autenticação, desktop e mobile passaram (3/3). O desktop apresentou o preview em 2.626 ms e o mobile em 2.366 ms; cada viewport contabilizou 413 chaves importáveis, 298 chaves diárias, 103 datas, 1.793 requisições de servidor e 918 documentos. Isso confirma e quantifica a amplificação, mas não prova que ela seja a causa exclusiva do timeout intermitente. A implementação funcional foi aprovada em 27/09/2026 sobre a `origin/main` `3e2932a`, permanece sem commit/push/PR e deve manter explicitamente separadas as conclusões “leituras redundantes corrigidas e medidas” e “timeout intermitente resolvido”.

A implementação adicionou ao serviço interno uma fábrica de leitor específica de preview, mantendo como padrão o leitor existente para não alterar legado, importação ou exportação. O runtime modular Vite fornece um leitor com `Map` privado de Promises por data: a primeira chave diária inicia `fbReadDailyStateCompatible3(date)` e refeições, água e suplementos da mesma data compartilham o resultado; chaves não diárias continuam em `fbGet3`. O mapa pertence somente à chamada de preview e fica inacessível ao término, inclusive em rejeição, de modo que um novo preview cria outro leitor e consulta o estado atual. Erros compartilhados continuam rejeitando o preview e são convertidos pelo serviço na falha explícita já existente, sem habilitar importação parcial.

Os testes focados passaram 32/32 em UMD/ESM e no helper do runtime. Cobrem três chaves da mesma data com uma leitura completa, datas distintas, uma rejeição compartilhada, novo preview após sucesso e após falha, delegação de chave não diária, criação de leitor por operação e igualdade integral de conteúdo/contagens. A medição autenticada pós-correção passou 3/3 em execução terminal verde: desktop apresentou o modal em 1.082 ms e mobile em 1.328 ms; ambos mantiveram 413 chaves importáveis, 298 chaves diárias e 103 datas, mas caíram para 623 requests e 310 documentos. Frente à base de 1.793/918, a redução foi de 1.170 requests (-65,3%) e 608 documentos (-66,2%). Uma execução anterior obteve a mesma contagem e tempos de 1.068/1.091 ms, porém encerrou com timeout apenas na liberação do lease remoto; o run de lease `36310228970` depois ficou `completed/cancelled`, com lease e porta locais liberados.

O primeiro `npm test` não alcançou os smokes porque `worker/node_modules/jose` não existia na worktree; `npm --prefix worker ci` instalou deterministicamente 87 pacotes pelo lockfile e a importação de `firebase-id-token.js` confirmou `jose`. Na repetição, preflight passou, 1.496/1.496 unitários passaram, a matriz de smoke legado percorreu 135 casos com apenas os skips Vite esperados, o smoke Vite passou 135/135 — incluindo round trip real de backup e o diagnóstico nos dois viewports — e o cutover passou 60/60. Nenhuma credencial, UID ou conteúdo nutricional foi registrado. Uma segunda execução integral anterior ao commit documental final repetiu todos esses resultados verdes; o timeout intermitente não é declarado resolvido somente pela redução de leituras.

O commit `cb2e46e` abriu o PR draft #274 e o commit documental `60831fa` reconciliou as evidências antes da revisão. No primeiro ciclo, o gate leve #36316725199 passou em 23 s e o CI pesado #36316725209 em 40 min 51 s. No ciclo final, o gate leve #36323176142 passou em 22 s e o CI pesado #36323176182 em 41 min 32 s. Os dois ciclos confirmaram 1.496/1.496 unitários, Worker 44/44 no Node e 9/9 no runtime, Functions emulator verde e duas matrizes Playwright autenticadas de 135 testes por ciclo, sem skip por falta de credenciais. Os quatro gates somaram 83,13 min, divididos em 0,75 min/45 s de gates leves e 82,38 min/82 min 23 s de gates pesados. Após revisão e autorização explícita do usuário, o PR #274 foi retirado do draft e mesclado em `2d40a10` às 16:47:53 CEST de 27/09/2026; o tempo exato do primeiro commit ao merge foi 3 h 3 min 43 s. A worktree funcional estava limpa, sem processo ativo, e foi arquivada após o merge.

**Alinhamento:** 100% — a entrega correspondeu ao escopo aprovado: coalescência restrita a um único preview, descarte do estado após sucesso ou falha, nova leitura em previews posteriores, propagação fail-closed e conteúdo/contagens preservados. A redução de leituras foi corrigida e medida sem timeout maior nem retry; coerentemente com o plano, os ciclos verdes não foram tratados como prova definitiva de resolução do timeout intermitente. O impacto final foi positivo para desempenho e estabilidade, sem alteração de dados persistidos ou contratos de backup.

**PRs/commits relacionados:** PR [#274](https://github.com/magnoClovis/nutrition-tracker/pull/274), commits `cb2e46e`/`60831fa`, merge `2d40a10`, gates leves [#36316725199](https://github.com/magnoClovis/nutrition-tracker/actions/runs/36316725199)/[#36323176142](https://github.com/magnoClovis/nutrition-tracker/actions/runs/36323176142) e CIs pesados [#36316725209](https://github.com/magnoClovis/nutrition-tracker/actions/runs/36316725209)/[#36323176182](https://github.com/magnoClovis/nutrition-tracker/actions/runs/36323176182); run de origem [#36257846855](https://github.com/magnoClovis/nutrition-tracker/actions/runs/36257846855), job `108464899999`, artefatos `playwright-failure-36257846855-1`/`-2`; lease local [#36310228970](https://github.com/magnoClovis/nutrition-tracker/actions/runs/36310228970); PR de origem #265; correção D08/D09 anterior no PR #264.

## [BUG-D01-AUDIT] - Revalidação do idioma na verificação de e-mail

**Status:** concluído.

**Data de início:** 26/09/2026.

**Data de conclusão:** 26/09/2026.

**Tempo decorrido:** 21 min 10 s.

**Minutos de CI:** 25 s (25 s leve + 0 s pesado).

**Propósito:** reauditar D01 na `origin/main` atual para determinar por evidência se a tela de verificação de e-mail ainda apresentava português quando o idioma selecionado era espanhol, sem criar uma alteração funcional artificial para um defeito já resolvido.

**O que se planeja fazer:** inspecionar a composição da tela e a origem do idioma, confirmar o contrato PT/EN/ES para título, instruções, estado de espera, sucesso/erro de reenvio e retorno ao login, executar os testes UMD/ESM de verificação e reenvio, rastrear o commit/PR responsável e reconciliar inventário, resumo e histórico se a correção já existisse. Auth, App Check, polling, sessão e os demais bugs permaneceriam fora do escopo.

**Recursos/arquivos principais envolvidos:** `verify-email-screen.js`, fachada `src/components/verify-email-screen.js`, composição em `nutrition-tracker.jsx`, `tests/unit/verify-email-screen.test.js`, histórico Git, PR #83, `documentation/estado-atual/BUG-INVENTORY.md`, `documentation/estado-atual/RESUMO-STATUS.md` e este histórico.

**O que foi feito:** a auditoria partiu da `origin/main` `0af7a14` em worktree isolada, preservando o checkout principal sujo e as worktrees C14-F2/CAM-RED-7. O defeito original foi confirmado historicamente no contrato binário `en`/“não-en”, mas já havia sido removido pelo PR [#83](https://github.com/magnoClovis/nutrition-tracker/pull/83), commit `f6f73c0` e merge `49813c8`, em 01/08/2026. O componente atual reduz variantes regionais ao prefixo, aceita `pt`, `en` e `es`, prioriza o `lang` recebido, usa `appLang` como fallback e reserva português para idioma desconhecido. A cópia espanhola cobre título com e sem nome, instruções, espera, sucesso/erro de reenvio, botão de reenvio e retorno ao login. O teste focado passou 10/10 em UMD/ESM e comprovou PT, EN, ES, precedência/fallback, polling de verificação, reenvio espanhol e cleanup. Nenhum arquivo funcional, Auth, App Check ou comportamento de sessão foi alterado; esta fatia é exclusivamente de reconciliação documental.

**Alinhamento:** 100% — o plano previa confirmar o estado real antes de codar e evitar uma correção artificial; a auditoria comprovou que D01 já estava resolvido e limitou a entrega à reconciliação documental. O impacto do desvio entre o inventário antigo e o runtime atual foi positivo para a rastreabilidade, sem impacto funcional no produto.

**PRs/commits relacionados:** PR documental [#267](https://github.com/magnoClovis/nutrition-tracker/pull/267), commit `7000da8`, merge `7c68229`, run leve `36251757027`; correção histórica PR #83, commit `f6f73c0`, merge `49813c8`; base auditada `0af7a14`.

## [BUG-D13] - Normalização das chaves históricas na leitura analítica

**Status:** concluído.

**Data de início:** 26/09/2026.

**Data de conclusão:** 27/09/2026.

**Tempo decorrido:** 1 h 57 min 34 s.

**Minutos de CI:** 1 h 7 min (47 s leve + 1 h 6 min 13 s pesado).

**Propósito:** verificar por evidência se logs com chaves de refeição históricas ou traduzidas deixam de participar das médias por refeição, da cobertura nutricional e do contexto enviado à IA e corrigir somente a leitura analítica comprovadamente afetada, sem tocar em documentos ou contas reais.

**O que se planeja fazer:** partir da `origin/main` atualizada em worktree isolada; auditar agregadores, loaders, call sites e normalizador; depois da aprovação, normalizar exclusivamente a cópia lida por `loadMealAnalysisData`, reutilizando o mapeamento PT/EN/ES existente. A implementação não deve alterar `eating-patterns-ai.js` em produção, regravar documentos nem deduplicar por ID. A regressão deve cobrir chave canônica, EN, ES, log misto, chave desconhecida, imutabilidade e paridade UMD/ESM, seguida de teste focado, `npm test` completo e CI autenticado real.

**Recursos/arquivos principais envolvidos:** `week-aggregator.js`, `eating-patterns-ai.js`, `history-loaders.js`, `nutrition-tracker-controller.js`, `i18n.js`, `tests/unit/week-aggregator.test.js`, `tests/unit/eating-patterns-ai.test.js`, `tests/unit/history-loaders.test.js`, `tests/unit/i18n.test.js`, histórico Git, `documentation/estado-atual/BUG-INVENTORY.md`, `documentation/estado-atual/RESUMO-STATUS.md` e este histórico.

**O que foi feito:** a auditoria usou a `origin/main` `7c682291d61868fec5958464975e7bd39d0b9986` numa worktree isolada, sem alterar o checkout principal sujo ou as worktrees C14-F2/UIUX. O histórico Git demonstrou que versões anteriores usavam os rótulos localizados como chaves: oito valores PT, oito EN (`Breakfast`, `Pre-workout`, `Post-workout`, `Lunch`, `Afternoon snack`, `Dinner`, `Supper`, `Other`) e oito ES (`Desayuno`, `Pre-entreno`, `Post-entreno`, `Almuerzo`, `Merienda`, `Cena`, `Colación`, `Otro`). A implementação atual estabiliza as oito chaves portuguesas em `MEAL_KEYS`; `normalizeMealKeys` converte exatamente as listas EN/ES por posição e concatena aliases no destino canônico, mas `loadMealAnalysisData` e `loadEatingPatternDays` solicitam parsing sem essa normalização.

Uma fixture local somente em memória deu a cada variante de café da manhã 10 g de proteína, 100 kcal e 10 g de carboidratos. Em `aggregateMealAverages`, a chave canônica `Café da manhã` produziu `count: 1`, médias 10/100/10, enquanto `Breakfast` e `Desayuno` produziram objeto vazio. Num log misto com as três chaves, somente a entrada canônica contribuiu. Isso confirma perda real na análise de médias por refeição e corresponde ao teste existente que deliberadamente congela aliases como ignorados.

No outro caminho de `week-aggregator.js`, `aggregateWeekRows` já percorre `Object.values(dayLog).flat()`: fixtures PT, EN e ES produziram, cada uma, 10 g de proteína, 100 kcal, `hasData: true` e cobertura proteica completa de 1/1 item. Portanto, totais e cobertura da visão semanal não reproduzem o defeito; ele está restrito à agregação categorizada por refeição.

Já em `generateEatingPatterns`, as mesmas fixtures PT, EN e ES produziram, sem diferença, média diária de 10 g de proteína, 100 kcal e 10 g de carboidratos, cobertura proteica 1/1 e o mesmo detalhe diário. O log misto somou as três ocorrências para 30 g/300 kcal/30 g. A causa é `Object.values(dayLog).flat()`, usado para médias, cobertura e detalhes do prompt. O filtro por `MEALS` existe somente no acumulador `acc`, hoje não consumido pelo prompt. Assim, a afirmação anterior de que chaves traduzidas eram omitidas do contexto atual da IA não se confirmou e não deve provocar correção artificial nesse módulo.

Os quatro arquivos focados passaram em 62/62 testes UMD/ESM: agregador semanal, padrões alimentares, loaders históricos e i18n. Nenhum smoke autenticado, escrita de storage, importação, alteração funcional ou acesso a conta foi executado. O PR documental #268 foi mesclado em `0dcc32f`; a branch avançou por fast-forward até essa base e reaplicou automaticamente os registros D13, sem conflito e sem sobrescrever o fechamento D01. A implementação funcional foi então iniciada dentro do escopo aprovado.

A implementação alterou somente `loadMealAnalysisData`: cada documento válido é parseado e entregue ao `normalizeMealKeys` já injetado antes de entrar em `dailyLogs`. A normalização acontece numa cópia em memória e mantém o contrato do normalizador existente: chaves canônicas permanecem canônicas; aliases EN/ES são concatenados no destino PT por posição; chave desconhecida permanece presente; nenhum documento é regravado e nenhum item é deduplicado por `id`. `loadEatingPatternDays` e `eating-patterns-ai.js` não foram alterados em produção. O teste do loader roda contra UMD e ESM e congela chave canônica, EN, ES, log misto, chave desconhecida e imutabilidade do valor armazenado.

O teste focado passou 62/62. Na primeira tentativa integral, preflight, 1.475 unitários e o smoke legado (111 aprovados + 8 skips estruturais de casos Vite-only) passaram; antes de abrir o navegador Vite, o coordenador fail-closed detectou o CI D2 `36288512798` e encerrou a execução sem colisão de conta. Na repetição, os mesmos unitários passaram, mas o legado encontrou uma falha visual intermitente e fora do diff: `searchable-choice-field.visual.spec.js` tentou clicar na aba Diário fora do viewport depois de deixar o editor de refeição salva expandido. A reprodução isolada imediata, sem retry configurado nem aumento de timeout, passou 2/2 e confirmou que o arquivo funcional D13 não participava da falha.

A terceira execução integral terminou verde: preflight sem avisos; 1.475/1.475 unitários; smoke legado com 111 aprovados e 8 skips estruturais esperados; smoke Vite 119/119; matriz cutover 60/60. Nenhum skip ocorreu por falta de credenciais, e a conta usada foi a descartável configurada localmente. Após o gate, a branch avançou por fast-forward de `0dcc32f` até a `origin/main` `c4612ef`, incorporando CAM-RED-7 e os registros de protótipos UI/UX; o stash D13 reaplicou sem conflito e preservou integralmente as entradas das outras frentes. O preflight e o foco UMD/ESM foram repetidos sobre essa base final e passaram, respectivamente, sem avisos e em 62/62 testes.

O commit funcional `e373216` abriu o PR draft #271. Os dois gates remotos passaram no primeiro ciclo: o Documentation preflight `36295928604` em 23 s e o CI pesado `36295928606` em 35 min 3 s, totalizando 35 min 26 s. Sobre a base final, o CI executou 1.483/1.483 unitários, 44/44 testes do Worker, 74/74 testes de Functions, smoke legado com 121 aprovados e 8 skips estruturais e smoke Vite 129/129. A variável da conta descartável estava presente e mascarada no log; nenhuma suíte foi ignorada por falta de credenciais. A matriz cutover 60/60 permanece comprovada pelo gate local integral, pois não é uma etapa separada do workflow remoto atual.

O commit documental `e896852` registrou a primeira rodada e iniciou o ciclo final. O Documentation preflight `36299451500` passou em 24 s e o CI pesado `36299451483` passou em 31 min 10 s, repetindo 1.483/1.483 unitários, Worker 44/44, Functions 74/74, legado 121 aprovados + 8 skips estruturais e Vite 129/129 com credenciais descartáveis presentes. Os dois ciclos somaram exatamente 1 h 7 min: 47 s leves e 1 h 6 min 13 s pesados. Após autorização explícita, o PR #271 foi mesclado em `adc4dcf` às 06:57:17 UTC de 27/09/2026, 1 h 57 min 34 s depois do primeiro commit `e373216` às 04:59:43 UTC. A descrição do PR recebeu os mesmos valores pós-merge.

O contrato de leitura recomendado é manter `MEAL_KEYS` e as chaves persistidas intactos, aplicar a conversão posicional PT/EN/ES apenas à cópia em memória da janela que alimenta `aggregateMealAverages` e concatenar cada ocorrência armazenada sob o destino canônico. Não se recomenda deduplicação por `id`: além de não haver prova de que duas ocorrências em chaves diferentes sejam o mesmo lançamento, versões anteriores reutilizaram identificadores em contextos distintos. A consequência esperada é que médias históricas de contas com chaves EN/ES passem a refletir refeições antes omitidas; isso é mudança analítica intencional, não migração de dados. Para a IA, o contrato deve ser congelado por teste de equivalência PT/EN/ES e o runtime deve permanecer inalterado enquanto o prompt continuar independente da categoria.

A complexidade estimada da correção é baixa a média. Recomenda-se uma única fatia funcional futura, restrita ao loader/normalização da média por refeição e aos testes UMD/ESM de loader/agregador, com regressão explícita no prompt de IA para provar ausência de mudança. Separar em dois PRs criaria uma segunda correção sem defeito efetivo em `eating-patterns-ai.js`; a alternativa segura é um PR único que corrija somente o caminho comprovadamente afetado e atualize a documentação do D13.

**Alinhamento:** 100% — a fatia entregou exatamente a normalização somente em leitura aprovada, reutilizando o mapeamento PT/EN/ES e preservando documentos, chaves persistidas, IDs e `eating-patterns-ai.js`. Os bloqueios de lease e a falha visual intermitente foram tratados por evidência sem ampliar o escopo; o impacto final desses incidentes foi neutro para o projeto.

**PRs/commits relacionados:** base auditada `7c682291d61868fec5958464975e7bd39d0b9986`; PR documental #268, commit `68bac91`, merge `0dcc32f`, run leve `36253079974`; base final reconciliada `c4612ef`; CI concorrente evitado `36288512798`; PR [#271](https://github.com/magnoClovis/nutrition-tracker/pull/271), commits `e373216`/`e896852`, merge `adc4dcf`, runs leves `36295928604`/`36299451500` e pesados `36295928606`/`36299451483`.

## Métricas retroativas

| PR | Tempo decorrido | Minutos de CI | Chat-Origin |
|---:|---:|---:|---|
| [#181](https://github.com/magnoClovis/nutrition-tracker/pull/181) | 2 d 5 h 2 min | 29 min (1 leve + 28 pesado) | Trofia-Bugs |
| [#199](https://github.com/magnoClovis/nutrition-tracker/pull/199) | 1 min 27 s | 1 min (1 leve + 0 pesado) | Trofia-Bugs |
| [#264](https://github.com/magnoClovis/nutrition-tracker/pull/264) | 1 h 28 min 37 s | 1 h 10 min 23 s (46 s leve + 1 h 9 min 37 s pesado) | Trofia-Bugs |
| [#267](https://github.com/magnoClovis/nutrition-tracker/pull/267) | 21 min 10 s | 25 s (25 s leve + 0 s pesado) | Trofia-Bugs |
| [#268](https://github.com/magnoClovis/nutrition-tracker/pull/268) | 8 h 2 min 3 s | 24 s (24 s leve + 0 s pesado) | Trofia-Bugs |
| [#271](https://github.com/magnoClovis/nutrition-tracker/pull/271) | 1 h 57 min 34 s | 1 h 7 min (47 s leve + 1 h 6 min 13 s pesado) | Trofia-Bugs |
