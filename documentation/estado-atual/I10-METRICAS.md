# I10 — Redesenho da aba Métricas

## Fonte aprovada

O contrato visual e comportamental vem de `UI_visuals/trofia-metrics-journey/FLOW.md` e de seus 46 PNGs claro/escuro. A referência é especificação, não código a copiar. A implementação reutiliza os componentes, tokens, modelos e serviços do Trofia.

## Sequência aprovada

### I10-A — Jornada e estado atual

- **Status:** em andamento.
- **Escopo:** frame da tela, cabeçalho, Progresso/Metas, jornada, plano/previsão, CTA de pesagem, tiles de Peso/IMC/TMB e estados skeleton/sem pesagens/uma pesagem/altura ausente.
- **Preservar:** `bodyMetrics`, `bodyComposition`, `normalizedWeightEntries`, `weeklyProgress`, `weightTrend`, persistência e hooks `data-tutorial` equivalentes.
- **Fora desta subfatia:** gráficos detalhados, composição corporal, sheets, histórico editável e listas completas de metas.

### I10-B — Gráficos e composição corporal

- **Status:** não iniciado.
- **Escopo:** seleção/range persistentes, gráficos de peso/TMB/gordura/cintura/músculo, alvos, estados insuficientes, composição corporal e previsão.

### I10-C — Pesagens e histórico

- **Status:** não iniciado.
- **Escopo:** registrar/editar pesagem em sheet, keypad, validações existentes, histórico compacto, exclusão e Undo.

### I10-D — Metas, perfil e nutrientes

- **Status:** não iniciado.
- **Escopo:** alvos diários, lista de perfil, seletores, editores numéricos e metas Auto/Personalizado sobre a matemática atual.

## Compatibilidade com trabalho paralelo

I10-A é compatível com a I4-A porque trabalha em `metrics-screen.js`, modelos/estilos com namespace de Métricas e testes próprios. Ela consome a navegação e o botão central existentes, mas não modifica os arquivos do menu de criação da I4-A. Qualquer suíte autenticada permanece serializada pelo coordenador compartilhado.

## Gate

Preflight, unitários focados e completos, recortes Playwright legado/Vite, `npm test` integral, CI autenticado real e documentação conforme `documentation/PADRAO-DOCUMENTACAO.md`. Os testes devem refletir a interface entregue antes do commit final.

## Evidência local atual da I10-A

- preflight com 0 avisos;
- 16/16 contratos focados da tela de Métricas;
- 1.565/1.565 testes unitários completos na base dos recortes autenticados `7f218c7`;
- build Vite com 848 módulos e allowlist de 14 arquivos;
- recorte Playwright dedicado verde no legado 5/5 e no Vite 5/5 para claro/escuro, Progresso/Metas, jornada, tiles e geometria;
- helpers preexistentes reconciliados com a interface entregue e comprovados por 18/18 casos no legado e 18/18 no Vite;
- o CTA novo revela e abre o formulário de pesagem existente como transição até a I10-C, mantendo peso, gordura corporal, cintura, massa muscular e salvamento acessíveis sem alterar persistência.
- `main` incorporada até `63b7bbd` sem conflito de runtime; o tutorial foi alinhado aos nomes entregues Progresso/Progress/Progreso e protegido por contrato UMD/ESM; nessa base passaram novamente sintaxe, `git diff --check`, preflight com 0 avisos, 16/16 focados de Métricas, 11/11 do tutorial, 1.567/1.567 unitários e build Vite com 848 módulos/allowlist de 14 arquivos;
- gate integral autenticado verde com smoke legado em 185 aprovações e 10 skips estruturais esperados, smoke Vite 195/195, CSP verde e cutover 60/60.

Uma tentativa anterior havia passado 184 casos e mantido 10 skips estruturais no legado antes de parar por `auth-refresh-timeout` no bootstrap isolado do GenericDialog mobile. Os artefatos foram preservados e nenhum retry automático foi feito; a execução final acima comprovou a fatia integralmente na base integrada.

Os `npm ci` da raiz e do Worker instalaram exatamente os lockfiles na worktree isolada; nenhum manifesto ou lockfile foi alterado. Lock, lease remoto e portas foram liberados após a execução.
