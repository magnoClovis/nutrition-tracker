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
