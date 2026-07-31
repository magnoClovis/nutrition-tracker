# Trofia — Changelog de Design e UX

Este documento registra continuamente rodadas de ajustes visuais e de
experiência do usuário. Bugs técnicos continuam catalogados separadamente em
`bug-inventory.txt`.

Cada rodada deve receber uma seção datada, um título curto e uma tabela com o
escopo, os principais arquivos afetados e a referência de implementação.

## 2026-07-31 — Correções visuais e refinamentos de uso

Referência geral: este PR draft.

| Item | Mudança | Arquivos principais | Referência |
|---:|---|---|---|
| 1 | Eliminada a duplicação do tooltip de ontem nos gráficos semanais de proteína e calorias. | `week-screen.js`, `tests/unit/week-screen.test.js` | Este PR, Fatia 1 |
| 2 | Reposicionado o botão contextual de ajuda para não sobrepor a navegação de data, o botão Hoje ou o fechamento do modal Adicionar; a navegação de data passou a acomodar duas linhas. | `nutrition-tracker-controller.js`, `add-screen.js`, `meal-review-modal.js` e testes correspondentes | Este PR, Fatia 2 |
| 3 | Centralizados “Nutrientes” e a seta de expansão como um único bloco horizontal no Diário. | `diary-screen.js`, `tests/unit/diary-screen.test.js` | Este PR, Fatia 1 |
| 4 | Adicionado o item “Trofia IA” sem remover “Configurações”. O novo modal apresenta o estado da última chamada da sessão sem round-trip adicional; o Worker passou a distinguir limites por usuário, globais e diários no contrato 429. O deploy dessa alteração do Worker fica para depois do merge. | `nutrition-tracker-controller.js`, `ai-client.js`, `worker/src/ai-worker.js`, `src/composite/android-back-navigation.js`, `app.js`, `nutrition-tracker.jsx` e testes correspondentes | Este PR, Fatia 7 |
| 5 | Auditados o fluxo e os requisitos da futura tela “Dados de usuário”. A implementação de nome, sobrenome e troca confirmada de e-mail foi separada desta rodada por envolver reautenticação real e terá PR próprio. | Nenhum arquivo de produto alterado nesta rodada | PR separado — Tarefa 0 pendente |
| 6 | O modal de registro de refeição agora fecha somente após persistência bem-sucedida e retorna à aba, data e posição de rolagem de origem. Erros de validação, IA ou persistência mantêm o fluxo aberto. | `nutrition-tracker-controller.js`, `meal-review-modal.js` e testes correspondentes | Este PR, Fatia 4 |
| 7 | O Diário passou a ocultar categorias vazias, exibir um único botão global “+ Adicionar” e ordenar categorias preenchidas pelo horário real mais antigo, com a ordem histórica como fallback e desempate. | `diary-screen.js`, `nutrition-tracker-controller.js` e testes correspondentes | Este PR, Fatia 5 |
| 8 | Compactado o registro de água em um resumo colapsável com total, meta e barra fina; valores rápidos, valor personalizado, registros e ajuste de meta permanecem disponíveis ao expandir. | `diary-screen.js`, `nutrition-tracker-controller.js`, `tests/unit/diary-screen.test.js` | Este PR, Fatia 6 |
| 9 | Adicionado o controle discreto “+ Informar horário” ao registro de refeição. Quando aberto, o horário escolhido é aplicado a todos os itens; quando não utilizado, permanece o horário do sistema no momento da gravação. | `add-screen.js`, `nutrition-tracker-controller.js` e testes correspondentes | Este PR, Fatia 3 |
