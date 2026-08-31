> **Cópia documental — guia histórico, não estado atual da suíte.** Fonte: `/SMOKE_TESTS_GUIDE_PT-BR.txt`, capturada da `main` no commit `5c51fa5` em 31/08/2026 e convertida para Markdown. O corpo refere-se à versão 0.7.5 Beta; para o estado de testes atual, consulte `tests/smoke/README.md` e os workflows de CI.

TROFIA - GUIA OFICIAL DE SMOKE TESTS
Versao do app: 0.7.5 Beta
Ultima revisao: 2026-07-07

1. OBJETIVO
===========

Este documento explica como executar, interpretar e diagnosticar os smoke tests
da Trofia.

Smoke tests sao testes automaticos curtos, feitos para responder uma pergunta
simples antes de continuar trabalhando ou publicar uma versao:

  "O app ainda abre e as areas principais continuam funcionando?"

Eles nao substituem testes completos de unidade, testes de calculo nutricional
ou revisao manual de interface. O objetivo aqui e detectar rapidamente
regressoes graves, como:

- app nao renderiza;
- erro de JavaScript no boot;
- tela branca, tela preta ou loading preso;
- login quebrado;
- abas principais vazias;
- troca de idioma quebrada;
- recuperacao de senha sem resposta;
- configuracoes ou backup inacessiveis;
- logout sem retornar para a tela de login.


2. ARQUIVOS RELACIONADOS
========================

Arquivos principais:

- package.json
  Define os comandos npm usados para rodar preflight e testes.

- playwright.config.js
  Configura Playwright, navegadores, servidor local e relatorios.

- tests/smoke/app.smoke.spec.js
  Contem os testes publicos e autenticados do app.

- tests/smoke/serve-static.js
  Servidor HTTP local usado durante os testes.

- tests/smoke/README.md
  Guia curto de comandos.

- scripts/preflight-release.ps1
  Verificacoes rapidas antes dos testes de browser.

Pastas geradas automaticamente:

- playwright-report/
  Relatorio HTML do Playwright.

- test-results/
  Evidencias de falhas, screenshots e traces.

Essas pastas sao artefatos gerados por teste e nao devem ser versionadas.


3. PRE-REQUISITOS
=================

3.1. Node.js
------------

O projeto usa Playwright via Node.js. Verifique se o Node esta instalado:

  node --version

Se o comando mostrar uma versao, por exemplo:

  v24.18.0

entao o Node esta instalado.

No Windows PowerShell, pode acontecer de o comando "npm" falhar por politica
de execucao de scripts. Nesse caso, use sempre:

  npm.cmd

e, para o npx:

  npx.cmd

Exemplo:

  npm.cmd run test:smoke
  npx.cmd playwright show-report

3.2. Dependencias do projeto
----------------------------

Na primeira vez, execute dentro da pasta do projeto:

  cd C:\Users\clovi\OneDrive\GitHub\nutrition-tracker
  npm.cmd install
  npx.cmd playwright install chromium

Se o PowerShell nao encontrar o npm.cmd, adicione temporariamente o Node ao PATH
da sessao atual:

  $env:Path = "C:\Program Files\nodejs;" + $env:Path

Depois rode novamente:

  npm.cmd install


4. COMO RODAR OS TESTES
=======================

4.1. Rodar apenas os smoke tests
--------------------------------

Na pasta do projeto:

  cd C:\Users\clovi\OneDrive\GitHub\nutrition-tracker
  npm.cmd run test:smoke

Esse comando executa:

- testes publicos, sem login;
- testes autenticados, se as variaveis de ambiente de login estiverem definidas;
- testes em desktop Chromium;
- testes em mobile Chromium.

4.2. Rodar preflight + smoke tests
----------------------------------

Use este comando antes de considerar uma versao pronta:

  npm.cmd test

Esse comando roda:

1. preflight
2. smoke tests

O preflight verifica problemas baratos de detectar antes de abrir o navegador,
como sincronizacao basica de arquivos e riscos obvios de build/release.

4.3. Rodar testes autenticados
------------------------------

Os testes autenticados so rodam se estas variaveis existirem na sessao atual:

  $env:NUTRITION_TEST_EMAIL = "email-da-conta-de-teste"
  $env:NUTRITION_TEST_PASSWORD = "senha-da-conta-de-teste"
  npm.cmd run test:smoke

Use preferencialmente uma conta de teste descartavel.
Nao use credenciais pessoais em scripts, commits, arquivos .txt ou prints
publicos.

Depois de rodar, limpe as variaveis da sessao:

  Remove-Item Env:\NUTRITION_TEST_EMAIL
  Remove-Item Env:\NUTRITION_TEST_PASSWORD


5. O QUE OS TESTES COBREM
=========================

5.1. Testes publicos
--------------------

Esses testes rodam sem login.

Cobertura atual:

- o app inicia sem erros criticos de browser;
- a tela de login renderiza email, senha e botao de entrada;
- a troca de idioma altera o texto da tela de login;
- o idioma escolhido persiste depois de recarregar a pagina;
- o botao de recuperacao de senha valida email vazio, em vez de falhar sem
  retorno visual.

5.2. Testes autenticados
------------------------

Esses testes rodam somente quando as variaveis de email e senha estao
configuradas.

Cobertura atual:

- login com conta de teste;
- abertura das abas principais sem secoes em branco;
- aba Diario;
- aba Alimentos;
- aba Semana;
- aba Metricas;
- abertura de Configuracoes;
- abertura do modal de Backup/Restauracao;
- logout e retorno para a tela de login.

5.3. Ambientes simulados
------------------------

A suite roda em dois projetos do Playwright:

- desktop-chromium;
- mobile-chromium.

Isso nao substitui teste manual em celular real, mas ajuda a detectar quebras
obvias de renderizacao e fluxo em viewport mobile.


6. COMO INTERPRETAR OS RESULTADOS
=================================

6.1. Resultado ideal
--------------------

Com credenciais configuradas corretamente, o resultado esperado e:

  12 passed

Exemplo:

  12 passed (32.1s)

Isso significa que:

- 6 testes passaram em desktop Chromium;
- 6 testes passaram em mobile Chromium;
- nenhum teste falhou;
- nenhum teste foi pulado.

6.2. Resultado sem credenciais
------------------------------

Se voce nao configurou email e senha, o resultado esperado e:

  6 passed
  6 skipped

Isso nao e erro.

Significa que:

- os testes publicos rodaram;
- os testes autenticados foram ignorados de proposito.

6.3. Resultado com falhas
-------------------------

Se aparecer:

  failed

ou uma linha vermelha no relatorio, abra o relatorio HTML:

  npx.cmd playwright show-report

No relatorio:

- "Passed" indica testes que passaram;
- "Failed" indica testes que falharam;
- "Flaky" indica testes que falharam e depois passaram em nova tentativa;
- "Skipped" indica testes pulados;
- cada teste mostra o navegador usado, desktop ou mobile;
- falhas podem conter screenshot, trace e contexto do DOM.

6.4. Quando considerar o app bloqueado
--------------------------------------

Considere a versao bloqueada para release se qualquer um destes casos ocorrer:

- erro de JavaScript no boot;
- app nao sai da tela de loading;
- tela de login nao aparece;
- login autenticado falha sem motivo conhecido;
- aba principal abre vazia;
- backup/configuracoes nao abre;
- logout nao retorna para login;
- relatorio mostra "Failed" em qualquer teste essencial.


7. RELATORIO HTML
=================

Depois de rodar os testes, abra o relatorio com:

  npx.cmd playwright show-report

Se o PowerShell bloquear "npx", use:

  npx.cmd playwright show-report

O relatorio fica em:

  C:\Users\clovi\OneDrive\GitHub\nutrition-tracker\playwright-report

O relatorio e util para:

- confirmar visualmente quais testes passaram;
- filtrar por Passed, Failed, Flaky e Skipped;
- abrir detalhes de uma falha;
- consultar tempo de execucao por teste;
- verificar se a falha aconteceu em desktop ou mobile.


8. EVIDENCIAS DE FALHA
======================

Quando um teste falha, Playwright pode gerar arquivos em:

  C:\Users\clovi\OneDrive\GitHub\nutrition-tracker\test-results

Possiveis evidencias:

- screenshot da falha;
- trace;
- error-context.md;
- detalhes do seletor que falhou;
- mensagem de console ou erro de pagina.

Esses arquivos ajudam a entender se o problema foi:

- bug real do app;
- overlay bloqueando clique;
- seletor desatualizado no teste;
- lentidao de rede/Firebase;
- problema local do ambiente.


9. PROBLEMAS COMUNS E SOLUCOES
==============================

9.1. "npm nao e reconhecido"
----------------------------

Sintoma:

  npm : O termo 'npm' nao se reconhece...

Solucao:

  $env:Path = "C:\Program Files\nodejs;" + $env:Path
  npm.cmd --version

Depois:

  npm.cmd run test:smoke

9.2. PowerShell bloqueia npm.ps1 ou npx.ps1
-------------------------------------------

Sintoma:

  No se puede cargar el archivo C:\Program Files\nodejs\npm.ps1
  porque la ejecucion de scripts esta deshabilitada...

Solucao:

Use "npm.cmd" em vez de "npm":

  npm.cmd run test:smoke

Use "npx.cmd" em vez de "npx":

  npx.cmd playwright show-report

Nao e necessario alterar a politica global do PowerShell apenas para rodar os
testes.

9.3. Testes autenticados aparecem como skipped
----------------------------------------------

Sintoma:

  6 passed
  6 skipped

Causa provavel:

As variaveis de login nao foram configuradas.

Solucao:

  $env:NUTRITION_TEST_EMAIL = "email-da-conta-de-teste"
  $env:NUTRITION_TEST_PASSWORD = "senha-da-conta-de-teste"
  npm.cmd run test:smoke

9.4. Erro "ERR_CONNECTION_REFUSED"
----------------------------------

Sintoma:

  page.goto: net::ERR_CONNECTION_REFUSED

Causas possiveis:

- servidor local de teste nao iniciou;
- servidor local encerrou antes do fim da suite;
- porta 8765 estava ocupada ou bloqueada;
- processo antigo ficou preso.

Solucoes:

1. Feche processos antigos de Node, se necessario.
2. Rode novamente:

   npm.cmd run test:smoke

3. Se continuar, confirme se a porta 8765 nao esta presa por outro processo.

9.5. Overlay ou tutorial bloqueia clique
----------------------------------------

O teste tenta fechar tutoriais e notas de versao automaticamente.

Se ainda assim houver falha por elemento interceptando clique, veja no relatorio
qual overlay ficou aberto. Pode ser necessario atualizar a funcao
"dismissTutorialIfVisible" em:

  tests/smoke/app.smoke.spec.js

9.6. Falha em texto traduzido
-----------------------------

Se um teste falhar depois de alterar textos do app, verifique se os seletores do
teste ainda cobrem:

- portugues;
- ingles;
- textos com acentos;
- textos sem acentos quando usados por regex tolerante.

Os testes devem evitar depender de uma frase longa que muda com frequencia.


10. CRITERIOS DE ACEITACAO
==========================

Antes de considerar uma versao estavel para teste publico:

1. Rodar preflight:

   npm.cmd run preflight

2. Rodar smoke tests publicos:

   npm.cmd run test:smoke

3. Rodar smoke tests autenticados:

   $env:NUTRITION_TEST_EMAIL = "email-da-conta-de-teste"
   $env:NUTRITION_TEST_PASSWORD = "senha-da-conta-de-teste"
   npm.cmd run test:smoke

4. Confirmar no relatorio:

   - 12 passed;
   - 0 failed;
   - 0 flaky;
   - 0 skipped, quando credenciais foram configuradas.

5. Fazer uma verificacao manual rapida no navegador:

   - login;
   - troca de abas;
   - adicionar alimento;
   - registrar refeicao;
   - gerar/abrir backup;
   - logout.


11. COMO MANTER ESTES TESTES
============================

11.1. O que deve entrar no smoke test
-------------------------------------

Inclua no smoke test apenas fluxos curtos e criticos, como:

- app inicia;
- login funciona;
- abas principais renderizam;
- configuracoes abrem;
- backup abre;
- logout funciona;
- idioma persiste.

11.2. O que nao deve entrar no smoke test
-----------------------------------------

Evite colocar aqui:

- testes exaustivos de calculo nutricional;
- muitos cenarios de algoritmo genetico;
- fluxos longos de IA;
- testes visuais detalhados;
- verificacoes que dependem de muitos dados especificos de uma conta real.

Esses casos devem virar testes separados, para nao transformar o smoke test em
uma suite lenta, fragil e dificil de manter.

11.3. Boa pratica
-----------------

Quando uma funcionalidade importante quebra mais de uma vez, adicione um teste
curto que detecte exatamente esse tipo de regressao.

Exemplo:

- se a aba Metricas ja ficou vazia antes, manter um teste que abre Metricas e
  procura conteudo real;
- se idioma ja deixou de persistir, manter um teste que alterna idioma e
  recarrega a pagina;
- se logout ja apenas mudava tela sem encerrar sessao, manter um teste que
  confirma retorno para login.


12. COMANDOS RAPIDOS
====================

Instalar dependencias:

  npm.cmd install

Instalar Chromium do Playwright:

  npx.cmd playwright install chromium

Rodar smoke tests:

  npm.cmd run test:smoke

Rodar preflight + smoke:

  npm.cmd test

Abrir relatorio:

  npx.cmd playwright show-report

Rodar com credenciais:

  $env:NUTRITION_TEST_EMAIL = "email-da-conta-de-teste"
  $env:NUTRITION_TEST_PASSWORD = "senha-da-conta-de-teste"
  npm.cmd run test:smoke

Limpar credenciais da sessao:

  Remove-Item Env:\NUTRITION_TEST_EMAIL
  Remove-Item Env:\NUTRITION_TEST_PASSWORD


13. ESTADO ATUAL ESPERADO
=========================

Na versao atual, quando as credenciais de teste estao configuradas corretamente,
o resultado esperado e:

  12 passed
  0 failed
  0 flaky
  0 skipped

Esse resultado indica que o app passou nos smoke tests essenciais em desktop e
mobile.
