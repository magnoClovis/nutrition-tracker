# I8 — Redesenho de Alimentos/Despensa

## Estado

- **Fatia ativa:** I8-A — shell, abas e categorias.
- **Status:** em andamento desde 11/10/2026.
- **Futuras:** I8-B — cartões/ações; I8-C — busca unificada/base aberta.
- **Referência aprovada:** `UI_visuals/trofia-foods-tabs-categories/`, auditada fora da árvore versionada com FLOW, referência interativa e 26 PNGs claro/escuro.

## Contrato da I8-A

A I8-A substitui a composição de acordeões da Despensa por uma biblioteca com:

1. cabeçalho e contagens reais de alimentos, refeições salvas e suplementos;
2. ação `+ Novo` que continua abrindo o formulário existente;
3. busca sempre visível, sem implementar ainda a base aberta da I8-C;
4. segmentos Alimentos, Refeições, Suplementos e Categorias;
5. filtros locais de Alimentos quando os metadados correspondentes existirem;
6. grade de categorias derivada dos dados reais e lista interna por categoria;
7. estados vazios, claro/escuro, PT/EN/ES, mobile e composição larga;
8. barra inferior compartilhada sem duplicar o FAB/menu central da I4-A.

## Limites

- A I8-A não redesenha os formulários `+ Novo`, edição ou scanner.
- Expansão rica, porções, favoritos, ações e Undo pertencem à I8-B.
- Busca na base aberta, ranking, debounce e salvar resultado externo pertencem à I8-C.
- Dados sem categoria permanecem visíveis em `Sem categoria`/`Uncategorized`/`Sin categoría`; nenhum valor é inferido pelo nome do alimento.
- Não há schema, migração, alteração de Auth/Firestore ou endpoint novo por motivo visual.
- A navegação compartilhada consome o contrato vigente e será reconciliada com a I4-A antes do gate integral.

## Validação obrigatória

- unitários de contrato para quatro segmentos, filtros, categorias e estados vazios;
- regressão dos formulários, scanner, refeições salvas e suplementos existentes;
- recorte visual dedicado em legado e Vite, claro/escuro, mobile/desktop e PT/EN/ES;
- gate integral e CI autenticado serializados pelo coordenador compartilhado;
- atualização dos helpers e seletores no mesmo PR.

## Evidência local atual

- `origin/main` incorporada por merge explícito em 13/10/2026 e atualizada novamente até `364eb4d` pelo merge `3dda34e`;
- preflight com 0 avisos, 1.571/1.571 testes unitários e build Vite de 848 módulos/allowlist de 14 arquivos verdes na base integrada mais recente;
- 94/94 contratos focados do controlador, da tela de Alimentos e dos consumidores afetados;
- recortes corrigidos verdes em 11/11 no legado e 11/11 no Vite;
- smoke legado integral com 185 aprovados e 10 skips estruturais esperados;
- smoke Vite integral com 195/195, CSP verde e build de 848 módulos com allowlist de 14 arquivos;
- cutover visual integral com 60/60;
- `git diff --check` e verificações sintáticas verdes;
- PR draft #340 aberto no commit funcional `aeea32f`;
- CI documental 38334194988 verde em 23 s e CI funcional 38334194827 verde em 51 min 14 s, totalizando 51 min 37 s de CI real;
- run extra 38339743752, disparado pelo commit documental, cancelado no limite global de uma hora após 186 casos Vite aprovados; interrupção durante bootstrap, sem retry e sem inclusão nas métricas;
- como a atualização para `364eb4d` trouxe mudanças de runtime/CSP, o gate autenticado final será repetido antes de aprovação, merge e fechamento documental.

Os `npm ci` da raiz e do Worker instalaram exatamente os lockfiles na worktree isolada; nenhum manifesto ou lockfile foi alterado.

Chat-Origin: Trofia-UIUX
