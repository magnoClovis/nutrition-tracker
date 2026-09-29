# INC-I2-AUTH — diagnóstico do gate autenticado do PR #293

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
- CI autenticado do PR técnico: pendente. Os passes isolados não permitem classificar o HTTP 400 original: a tentativa isolada não o reproduziu.

## Ocorrência paralela C14-G

No run `36621844513` do draft PR #294, preflight, unitários, Worker e Functions passaram, mas 54 testes Vite mobile falharam com `#loading` visível; o screenshot público mostrou “Entrando...”. O artefato `11060633336` não contém a origem de rede/console do bloqueio antes do timeout. A recorrência reforça a necessidade da instrumentação, mas não demonstra que CSP, I2, App Check ou Firestore sejam a causa. A C14-G continua draft e sem deploy.
