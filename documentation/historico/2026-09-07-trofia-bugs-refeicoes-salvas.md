# Histórico do chat Trofia-Bugs — ajustes de "Refeições salvas"

## Escopo e método

Este registro documenta os ajustes de comportamento e persistência no fluxo de "Registro refeição" → aba "Salvas", solicitados no chat de bugs. A evidência primária é a própria base de código local em `nutrition-tracker-new`, o histórico de `main` no Git e a suíte de testes executada nesta implementação.

### Relação com a versão de base

- Base principal atual: `origin/main` em 2026-09-07.
- PRs de referência já integrados: S9 (`#172`) e correção de IDs de refeições salvas (`#179`) no momento da implementação.
- Esta entrega é local até abertura de PR de conclusão desta frente.

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

- `npm.cmd run test:unit` — 1195 testes, 1193 aprovados, 2 falhas pré-existentes em `tests/unit/android-release-signing.test.js`.
- `npm.cmd run test:smoke` — suíte legacy passou com parte pública; testes autenticados com credenciais locais permaneceram pulados por configuração de ambiente ausente.
- `npm.cmd run test:cutover` e `npm.cmd run test:smoke:vite` não puderam ser concluídos neste ambiente por erro de build do Vite (`Access is denied` ao resolver `vite.config.js`).
