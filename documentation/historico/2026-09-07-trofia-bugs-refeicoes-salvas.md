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

## Métricas retroativas

| PR | Tempo decorrido | Minutos de CI | Chat-Origin |
|---:|---:|---:|---|
| [#181](https://github.com/magnoClovis/nutrition-tracker/pull/181) | 2 d 5 h 2 min | 29 min (1 leve + 28 pesado) | Trofia-Bugs |
| [#199](https://github.com/magnoClovis/nutrition-tracker/pull/199) | 1 min 27 s | 1 min (1 leve + 0 pesado) | Trofia-Bugs |
| [#264](https://github.com/magnoClovis/nutrition-tracker/pull/264) | 1 h 28 min 37 s | 1 h 10 min 23 s (46 s leve + 1 h 9 min 37 s pesado) | Trofia-Bugs |
| [#267](https://github.com/magnoClovis/nutrition-tracker/pull/267) | 21 min 10 s | 25 s (25 s leve + 0 s pesado) | Trofia-Bugs |
