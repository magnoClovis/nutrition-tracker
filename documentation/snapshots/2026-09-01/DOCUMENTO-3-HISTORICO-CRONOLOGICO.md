# Documento 3 — Histórico cronológico de desenvolvimento do Trofia

**Aplicativo:** Trofia (`com.hermegas.trofia`)  
**Repositório:** `github.com/magnoClovis/nutrition-tracker`  
**Branch de referência:** `main`/`origin/main`  
**Data desta consolidação:** 01/09/2026  
**Natureza:** registro histórico e documental; não representa implementação nova.

## 1. Método, fontes e regras de interpretação

Este documento consolida os 22 arquivos de `documentation/historico/`, confronta suas afirmações com `documentation/estado-atual/` e usa `git log --all` para confirmar datas, hashes e PRs. A data no nome de um relatório indica quando o relatório foi produzido, não necessariamente quando o trabalho relatado ocorreu. Quando uma conversa não contém timestamp confiável e o Git não fornece uma correspondência inequívoca, a data é registrada como **não determinada**.

Relatos sobre protótipos, planos, arquivos temporários ou trabalho revertido são mantidos, mas não apresentados como código disponível. Um código formal só aparece quando a fonte o atribui de forma direta e a correspondência não contradiz o estado real do roadmap. PRs e commits são citados em cada item; quando não existem ou não podem ser ligados com segurança à conversa, consta **não determinado**.

### 1.1 Convenção de códigos

O sistema formal de roadmap foi criado em **31/07/2026**, no documento consolidado introduzido pelo PR **#81**, merge `918d114`. A primeira versão reunia C01–C25 e N01–N09; C26–C28 foram acrescentados posteriormente. Consequentemente, trabalho de junho e da maior parte de julho normalmente não possui código contemporâneo. Aplicar um código posterior apenas por semelhança temática apagaria a diferença entre o trabalho antigo e a entrega formal ainda pendente.

- **C01–C28 (roadmap):** classe de itens consolidados do roadmap. A letra não é expandida nas fontes como uma palavra única; a classe reúne correções, segurança, infraestrutura, manutenção e capacidades existentes ou iniciadas. Exemplo: **C01 do roadmap — “Textos, datas, mojibake e bugs visuais do escopo aprovado”**.
- **N01–N09:** funcionalidades novas propostas. Exemplo: **N01 — Registro por voz**.
- **Gxx:** defeito descoberto em execução real e elevado a gate fora da sequência de produto. Exemplo: **G01 — backup restaurado sobrescrito por autosave pendente**, descoberto no run autenticado do PR #80 e corrigido no PR #82.
- **Axx–Fxx (inventário de bugs):** IDs do `BUG-INVENTORY.md`, criado em 26/07/2026 com 60 itens. A = perda/corrupção/escrita incorreta; B = races/cancelamento/ordem; C = timezone/datas/relógio; D = UX/idioma/regra de negócio; E = código morto/desconectado; F = infraestrutura e compatibilidade.
- **Pxx:** decisões deliberadamente adiadas, mantidas em `PENDENCIAS.md`.
- **S1–S9:** fatias locais da modernização de controles nativos; não pertencem à numeração geral do roadmap.
- **I1–I7:** sequência local de evolução visual derivada da análise de Foodvisor, Calz e 114 capturas; não pertence ao roadmap geral.
- **UI-1–UI-4:** agrupamento preliminar de correções visuais usado antes de S/I.
- **Sufixos A/B/C, “Fatia 1”, “6A1” etc.:** subdivisões de execução de um item pai, não novos itens do roadmap.

#### Colisão real de `Cxx`

Há duas namespaces independentes. **C01 do roadmap** significa textos/datas/mojibake/bugs visuais. **[C01] do inventário** significa especificamente “TODAY é UTC, estático e não vira o dia enquanto o app permanece aberto”. Da mesma forma, C03 do roadmap é startup/loading, enquanto [C03] do inventário é o cálculo de diferenças de datas por 86.400.000 ms nas métricas. Neste documento, toda referência ambígua é qualificada como “roadmap” ou “inventário”.

### 1.2 Por que o período anterior a 31/07 quase sempre aparece sem código

O GA de 08–09/06 é a base que mais tarde tornou possível discutir C21, mas não é “C21”: C21 continua sendo a futura adoção de porções fracionadas. O redesign One UI de 14/07 não é C01 ou C11 apenas porque alterou telas relacionadas. A extração modular de 16–28/07 e a migração Vite são **trabalho precursor posteriormente relacionado ao escopo do C15**; não constituem o C15 formal. Conforme orientação do responsável e a função do item no roadmap, **C15 ainda não foi iniciado**: é o programa futuro de 6–10 semanas/8–12 PRs destinado a concluir o cutover e limpar as pontes que a refatoração antiga deixou.

Pelo mesmo motivo, a auditoria, o documento Word e a planilha executiva produzidos em julho não são C16. **C16 formal ainda não foi iniciado** e permanece como documentação técnica/de manutenção necessária para o gate público.

## 2. Linha do tempo cronológica unificada

### 2.1 08–09/06/2026 — Algoritmo genético e recuperação do monólito

#### Sem código formal — Implementação inicial completa do GA

**Data de início:** 08/06/2026 (contexto herdado)  
**Data de conclusão:** não determinada; a sessão terminou com o HTML final corrompido  
**Propósito:** converter a despensa e as metas restantes do dia em sugestões de refeições adicionáveis ao Diário.  
**Recursos/arquivos principais envolvidos:** `index.html` standalone (~865 KB), `nutrition-tracker.jsx` (~170 KB), React 18 UMD, Babel, Firebase REST e scripts temporários Python.  
**O que foi feito:** foram criados dez estados do GA, seleção de toda a despensa ou itens individuais, limites por alimento e refeição de destino. `runGA` usava população **120**, máximo **350 gerações**, mutação **0,15**, limiar de fitness **0,08** e até **5 soluções**. O fitness combinava desvio proteico normalizado com penalidade calórica: excesso recebia fator `10`, enquanto consumo dentro do orçamento recebia fator `0,3`. Genes de alimentos em gramas/ml representavam blocos de 100; unidade `un` permanecia inteira. A população mantinha top 50%, crossover de um ponto, duas estratégias de mutação, elitismo, reset após metade das soluções e yield de UI a cada 15 gerações. `addGAResultToDiary` reconvertia genes em quantidades e reutilizava `buildEntry`.  
**Decisões relevantes tomadas:** proteína mínima restante de 10 g, calorias mínimas restantes de 50 kcal, tolerância calórica configurável e fallback para o melhor indivíduo quando nenhum atingisse o limiar.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-06-09-claude-ga-groq-recuperacao.md`.

#### Sem código formal — Falhas de injeção, tela preta e duas corrupções para 0 KB

**Data de início:** 09/06/2026  
**Data de conclusão:** não determinada  
**Propósito:** integrar o modal compilado sem quebrar o `LoginScreen` ou o return de `NutritionTracker`.  
**Recursos/arquivos principais envolvidos:** `index.html`, scripts Python de substituição textual, DevTools e contagem de parênteses.  
**O que foi feito:** o modal foi inserido no fim de `LoginScreen` porque o padrão textual também existia ali; depois surgiu `Malformed Unicode Character Escape Sequence` por `\u2b`, corrigido para `+`. Uma segunda estrutura tinha 152 fechamentos para 151 aberturas. Apesar das correções sintáticas, o `#root` permanecia vazio; foram testados timeout de 12 s, variáveis CSS, `ErrorBoundary`, banner e logs. A causa estrutural identificada foi excesso de parênteses no return, tratado com `React.Fragment`. Em duas tentativas posteriores, abrir o arquivo em modo `w` antes de codificar o surrogate `\uD83E\uDDEC` produziu `UnicodeEncodeError` e truncou o HTML para **0 KB**.  
**Decisões relevantes tomadas:** reconstruir a partir do JSX e do HTML-base com Babel; não considerar o modal concluído sem artefato válido.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-06-09-claude-ga-groq-recuperacao.md`.

#### Sem código formal — Decisão sobre metas de treino e descanso

**Data de início:** 09/06/2026  
**Data de conclusão:** 09/06/2026 (decisão; sem implementação)  
**Propósito:** evitar reduzir proteína de forma proporcional no descanso.  
**Recursos/arquivos principais envolvidos:** análise nutricional da conversa; nenhum arquivo confirmado.  
**O que foi feito:** registrou-se que a proteína deveria permanecer igual ou próxima entre treino e descanso; a redução deveria concentrar-se nas calorias e ser aproximadamente **200–400 kcal**, não os **860 kcal** observados. Foi citada distribuição aproximada de **0,4 g/kg por refeição**.  
**Decisões relevantes tomadas:** proposta aprovada conceitualmente, mas não implementada.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-06-09-claude-ga-groq-recuperacao.md`.

### 2.2 10–11/06/2026 — Perfil, Mifflin–St Jeor e saudação

#### Sem código formal — Wizard de perfil e metas automáticas

**Data de início:** 10/06/2026 09:26Z  
**Data de conclusão:** não determinada; parte do painel foi revertida  
**Propósito:** obter nascimento, gênero, atividade e objetivo para metas personalizadas.  
**Recursos/arquivos principais envolvidos:** `index.html`, Firebase, React e fórmula Mifflin–St Jeor.  
**O que foi feito:** nascimento/gênero foram retirados do login e preservados no cadastro. O wizard passou por arquitetura dentro de `NutritionTracker` e depois foi movido para `App`, em três passos. A TMB definida foi `10P + 6,25A - 5I + 5` para homens e `10P + 6,25A - 5I - 161` para mulheres. Fatores de atividade: **1,20; 1,375; 1,55; 1,725; 1,90**. Proteína: manutenção **1,6 g/kg**, perda **2,0 g/kg**, ganho **1,8 g/kg**. O prazo mudou de semanas para meses e o ajuste passou de `(kg × 7700)/(semanas × 7)` para `(kg × 7700)/(meses × 30)`. O painel de quatro cards — meta, proteína, TMB e TDEE — foi removido após regressões de tela preta.  
**Decisões relevantes tomadas:** manter o wizard no componente pai; registrar explicitamente que a causa final da tela preta foi resolvida externamente e não determinada pela conversa.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-06-11-claude-wizard-perfil-saudacao.md`.

#### Sem código formal — Saudação personalizada

**Data de início:** não determinado, após 10/06  
**Data de conclusão:** não determinado  
**Propósito:** contextualizar o Diário com nome e período do dia.  
**Recursos/arquivos principais envolvidos:** `nutrition-tracker.jsx`, `index.html`, chave Firebase `userName`.  
**O que foi feito:** apenas no dia atual, `getGreeting` escolhia manhã 05:00–11:59, tarde 12:00–17:59 e noite 18:00–04:59. Cada período possuía cinco frases em PT e EN, selecionadas por `diaDoMês % 5`. O JSX foi recompilado com Babel para um HTML de **864.421 bytes**.  
**Decisões relevantes tomadas:** variação determinística diária, sem aleatoriedade por render.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-06-11-claude-wizard-perfil-saudacao.md`.

### 2.3 18/06–01/07/2026 — Redesign inicial, 0.7.5 e hardening

#### Sem código formal — Especificação inicial de UI/UX e naming

**Data de início:** capturas de 18/06/2026  
**Data de conclusão:** não determinado  
**Propósito:** revisar todas as telas e estudar uma identidade comercial além de “Diário Nutricional/Nutrition Tracker”.  
**Recursos/arquivos principais envolvidos:** capturas do app, análise de navegação, Métricas, Diário, IA, PWA e pesquisa de nomes.  
**O que foi feito:** foram descritas prioridades de arquitetura de informação, hierarquia, consistência mobile e separação entre acompanhamento e configuração. O bloco de naming avaliou candidatos e traduções, sem implementação ou escolha final atribuível à sessão.  
**Decisões relevantes tomadas:** produzir primeiro especificação/mockup; adoção pelo responsável não determinada.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-06-19-claude-guia-redesign-inicial.md`.

#### Sem código formal — Notificações, composição corporal e sugestões da 0.7.5

**Data de início:** 19/06/2026  
**Data de conclusão:** 01/07/2026  
**Propósito:** estabilizar a beta e recuperar funcionalidades de recomendação.  
**Recursos/arquivos principais envolvidos:** monólito HTML/JSX, gráficos corporais, GA e notificações locais do navegador.  
**O que foi feito:** gráficos de gordura/músculo foram adicionados no commit `aecd280`. Toasts de objetivos chegaram em `7903687`, seguidos de som/vibração em `1ef0cc4`, com controle diário contra duplicação. Em 01/07, `39b5ef7` e `8b4004b` restauraram resultados, detalhamento nutricional, limites dinâmicos e bancada de comparação do GA. Os commits `6af9fc1` e `ca16b5c` registraram o hardening 0.7.5.  
**Decisões relevantes tomadas:** separar aviso, estímulo sensorial e deduplicação; preservar testes de algoritmos fora do fluxo principal.  
**PRs/commits relacionados:** commits `aecd280`, `7903687`, `1ef0cc4`, `39b5ef7`, `8b4004b`, `6af9fc1`, `ca16b5c`; PRs não determinados.  
**Fonte(s):** `2026-07-15-hardening-backup-i18n.md`; `git log --all`.

### 2.4 13–15/07/2026 — 0.8.0 Beta, score inicial e One UI

#### Sem código formal — Marco 0.8.0 Beta

**Data de início:** 13/07/2026  
**Data de conclusão:** 13/07/2026  
**Propósito:** consolidar perfil obrigatório, internacionalização, score, avaliação e UX da beta.  
**Recursos/arquivos principais envolvidos:** `app.js`, `nutrition-tracker.jsx`, `firebase-storage.js`, `meal-score.js`, Playwright e scripts de i18n/preflight.  
**O que foi feito:** o commit `1162456` criou `meal-score-v1.1`, testes unitários/smoke, configuração Playwright e auditoria i18n. Também reuniu perfil obrigatório, subabas de Métricas, espanhol, avaliação opcional com explicação de IA, score/limites no GA, banco semanal de calorias, TMB persistida por medição, feedback externo, reorganização de refeições e tutoriais diferenciados para usuários novos/existentes. Esse motor é precursor do futuro `meal-score-v2`, não a conclusão do C20 formal.  
**Decisões relevantes tomadas:** a IA explicaria, mas não calcularia a nota; dados históricos de TMB seriam persistidos, não recalculados retroativamente apenas com o perfil atual.  
**PRs/commits relacionados:** commit `1162456`; PR não determinado.  
**Fonte(s):** `2026-07-13-chat-versao-080.md`; `2026-07-15-hardening-backup-i18n.md`.

#### Sem código formal — Especificação matemática paralela de pontuação

**Data de início:** não determinado, associada ao período de julho  
**Data de conclusão:** não determinado  
**Propósito:** testar uma alternativa matemática independente para nota 0–5.  
**Recursos/arquivos principais envolvidos:** `pontuacao_refeicao.py`, `.docx` e `.pdf`, não versionados no app.  
**O que foi feito:** nutrientes foram divididos em “maximizar” e “orçamento”; a cota por refeição foi formalizada como `max(meta-consumido,0)/refeiçõesRestantes`. O protótipo deu **4,28/5** para refeição equilibrada e **1,23/5** para refeição hipercalórica, usando o snapshot descrito na fonte. A conversa também revisou o changelog e corrigiu uma orientação inicialmente errada sobre HTML no Developer Mode YAML do Brevo.  
**Decisões relevantes tomadas:** não ligar esse protótipo ao C20 implementado posteriormente sem evidência; registrar o erro factual do Brevo.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-07-13-claude-especificacao-meal-score.md`.

#### Sem código formal — Redesign One UI 8 do Diário

**Data de início:** 14/07/2026  
**Data de conclusão:** 14/07/2026  
**Propósito:** substituir a apresentação anterior por hierarquia One UI/Glass moderada e corrigir Diário, Semana e Métricas.  
**Recursos/arquivos principais envolvidos:** `one-ui.css`, `app.js`, `nutrition-tracker.jsx`, `index.html`, screenshots e Playwright.  
**O que foi feito:** 18 commits lineares entre `6e21f4d` e `985673c` implementaram responsividade, gradiente, glass, opacidade definitiva **50%**, cards separados de refeição, lista expansível de alimentos, backup fora da lista, acesso a refeições salvas, cards da Semana, Métricas, grid de previsão, tema persistente aplicado antes do React, migração para escuro, ticker, temporização/direção, header unificado, ordem Nutrientes/Sugestão, calendário mensal e macros/micros unificados. A especificação Claude registra 35 passos de pesquisa, prompts, seis PDFs, rodadas de 7/10 screenshots e investigação autenticada até confirmar os 50%.  
**Decisões relevantes tomadas:** glass sutil; diferenças mobile/desktop explícitas; 50% escolhido pelo responsável apesar de proposta intermediária de 88%.  
**PRs/commits relacionados:** `6e21f4d`, `f662282`, `31bfdfd`, `023691a`, `b5e2da9`, `cf9a470`, `b325ab5`, `1eb3bc8`, `a0d0b13`, `ebc413d`, `95a29cc`, `985673c` e demais commits citados no relatório; nenhum PR associado encontrado.  
**Fonte(s):** `2026-07-14-redesign-one-ui-e-diario.md`; `2026-07-14-claude-one-ui-8-especificacao.md`; `2026-07-14-claude-redesign-diario-ticker.md`.

#### Sem código formal — Confirmação de e-mail, idiomas e senha

**Data de início:** 15/07/2026  
**Data de conclusão:** 15/07/2026  
**Propósito:** corrigir autenticação e simplificar controles de login.  
**Recursos/arquivos principais envolvidos:** telas de login/verificação e testes.  
**O que foi feito:** confirmação de e-mail foi endurecida em `a5d498f`; bandeiras e rótulos de idioma foram refinados em `7b63225` e `bbe11a7`; o toggle de senha foi adicionado em `6cb145f`. O commit `a5d498f` é misto, e somente os trechos atribuíveis a esta conversa são reclamados.  
**Decisões relevantes tomadas:** não atribuir códigos retrospectivos nem PR inexistente.  
**PRs/commits relacionados:** `a5d498f`, `7b63225`, `bbe11a7`, `6cb145f`; PRs não determinados.  
**Fonte(s):** `2026-07-15-confirmacao-email-idiomas-senha.md`.

### 2.5 Meados de julho — auditoria técnica, roadmap Word e planilha

#### Sem código formal — Auditoria retrospectiva da 0.8.0 e artefatos executivos

**Data de início:** não determinada; evidências internas apontam para meados de julho  
**Data de conclusão:** aproximadamente 19/07/2026; data exata não determinada  
**Propósito:** comparar o estado real da beta com necessidades futuras e produzir materiais de manutenção/coordenação.  
**Recursos/arquivos principais envolvidos:** auditoria do repositório então existente, documento Word de roadmap técnico e planilha executiva/operacional.  
**O que foi feito:** foi inventariado o estado funcional e técnico, reordenado o roadmap por dependências e produzidos documentos para leitura técnica e executiva. A data `31/08` pertence ao arquivo histórico que documentou a conversa posteriormente; não é usada como data do trabalho original. O repositório descrito tinha poucos commits e o artefato interno era datado de 19/07, sustentando o reposicionamento cronológico, mas não uma hora/dia exatos para todas as etapas.  
**Decisões relevantes tomadas:** estes artefatos **não são C16**; C16 formal permanece futuro e não iniciado.  
**PRs/commits relacionados:** não determinado.  
**Fonte(s):** `2026-08-31-auditoria-roadmap-tecnico.md`; correção expressa do responsável nesta tarefa.

### 2.6 15–16/07/2026 — Manifest, relatórios, testes e CI

#### Sem código formal — Suite autenticada e CI inicial

**Data de início:** 15/07/2026  
**Data de conclusão:** 16/07/2026  
**Propósito:** tornar os fluxos críticos reproduzíveis e retirar configuração insegura dos relatórios.  
**Recursos/arquivos principais envolvidos:** manifest/PWA, servidor Python de relatórios, Playwright, `storageState`, PowerShell e GitHub Actions.  
**O que foi feito:** o manifest foi auditado; IP privado/HTTP dos relatórios foi removido e substituído por manutenção trilíngue. Secrets e artifacts foram excluídos do versionamento. Smokes cobriram PT/EN/ES, Métricas, round-trip de backup, histórico semanal, avaliação/refeição, IA indisponível e GA. A09 recebeu correção apenas parcial; A11 foi contido nas fixtures. O workflow adicionou resumo nativo e artifacts somente em falhas, até obter execução autenticada verde.  
**Decisões relevantes tomadas:** skips locais sem credenciais não equivaleriam a sucesso autenticado.  
**PRs/commits relacionados:** commits `5ca7a2a`, `9b5e320`, `2034a5d`, `de87edd`, `55268d1`, `e10a8fc`, `76f7d2c`, `0408423`, `601d7fa`; PR #1 e run #7 conforme a fonte.  
**Fonte(s):** `2026-07-16-manifest-relatorios-testes-ci.md`.

### 2.7 16–25/07/2026 — Refatoração incremental precursora, sem código formal

#### Sem código formal — Extração de domínio e componentes React

**Data de início:** 16/07/2026  
**Data de conclusão:** 16/07/2026  
**Propósito:** reduzir o monólito sem alterar comportamento observável.  
**Recursos/arquivos principais envolvidos:** módulos de data, metas, food entry, i18n, perfil, UI, modais e telas de autenticação.  
**O que foi feito:** após extrações iniciais de ticker/data/metas, os PRs #5–#18 extraíram transformação de alimentos, documentação de contratos, i18n, perfil obrigatório, `Ring`/`Bar`/`ErrorBoundary`, aviso, tutorial, perfil, configurações, backup, verificação, login e privacidade. As operações destrutivas receberam validação de resposta HTTP, mas não a saga administrativa futura.  
**Decisões relevantes tomadas:** preservar compatibilidade byte/comportamento sempre que possível. Trabalho precursor relacionado ao futuro C15, que permanece não iniciado.  
**PRs/commits relacionados:** PRs #5–#18; merges `eaf6a14`, `1536d07`, `bd24d40`, `560a834`, `7922dfd`, `b8c84c4`, `4be4990`, `7736d11`, `0db00eb`, `1c55340`, `7ddf414`, `16aec58`, `d2dffb7`, `620fb5c`.  
**Fonte(s):** `2026-07-25-modularizacao-incremental-do-monolito.md`; `git log --all`.

#### Sem código formal — Algoritmo, IA, scanner e Firebase internos

**Data de início:** 18/07/2026  
**Data de conclusão:** 19/07/2026  
**Propósito:** isolar integrações e armazenamento atrás de contratos testáveis.  
**Recursos/arquivos principais envolvidos:** GA, Open Food Facts, Groq, módulos de IA, ZXing e Firebase REST.  
**O que foi feito:** PRs #19–#34 extraíram GA, Open Food Facts, Groq, explicação de avaliação, autofill, descrição, feedback, padrões, scanner, testes contratuais de storage, configuração, Auth, Firestore, backup, migração e exclusão. Open Food Facts preservou unidade `g`, porção 100, energia acima de 1000 convertida por **4,184** e valores existentes quando o provedor omitisse dados. Várias dívidas — B03, B05, F01–F03 — foram congeladas por teste, não resolvidas.  
**Decisões relevantes tomadas:** separar extração mecânica de correção funcional; não confundir os precursores de exclusão/migração com C22/C23 concluídos posteriormente.  
**PRs/commits relacionados:** PRs #19–#34; merges `52f8c39`, `50abe50`, `1595b9c`, `d51d193`, `d1cd1f4`, `505456b`, `631b134`, `a332c69`, `3e50602`, `683ae98`, `6727eea`, `14f2479`, `4f44329`, `6f084db`, `cd9d2b4`, `45f3c11`.  
**Fonte(s):** `2026-07-25-modularizacao-incremental-do-monolito.md`.

#### Sem código formal — Modelos, loaders, telas e controlador

**Data de início:** 22/07/2026  
**Data de conclusão:** 25/07/2026  
**Propósito:** decompor o controlador e as telas restantes.  
**Recursos/arquivos principais envolvidos:** calendário, métricas, metas históricas, semana, loaders, hidratação/autosave e telas.  
**O que foi feito:** PRs #35–#48 e #50–#51 extraíram calendário, composição corporal, metas, agregadores, loaders, autosave, modelos residuais, cinco componentes, Semana, Métricas, Despensa, Adicionar e Diário; depois cabeçalho/navegação e o `NutritionTrackerController`. O PR #41 alinhou timeout Playwright ao fallback de hidratação. PR #49 foi deliberadamente excluído da atribuição desta conversa.  
**Decisões relevantes tomadas:** bugs preservados foram inventariados em 26/07; relatórios avançados não foram extraídos porque a superfície estava desconectada. Trabalho precursor do futuro C15, não C15 executado.  
**PRs/commits relacionados:** PRs #35–#48, #50–#51; merges `eb3af84`, `b1d10d1`, `7a36098`, `8cde41f`, `783e417`, `5221311`, `b4638e4`, `a301162`, `b5f35cb`, `bd02739`, `e7413ec`, `fc76035`, `503703e`, `8ede748`, `a184f72`, `0431748`.  
**Fonte(s):** `2026-07-25-modularizacao-incremental-do-monolito.md`; `2026-07-20-claude-diagnostico-status-refatoracao.md`.

### 2.8 26–28/07/2026 — Migração Vite/ESM precursora, sem código formal

#### Sem código formal — Cutover Vite, ESM e GitHub Pages

**Data de início:** 26/07/2026  
**Data de conclusão:** 28/07/2026  
**Propósito:** substituir o carregamento clássico por build Vite sem perder equivalência.  
**Recursos/arquivos principais envolvidos:** Vite, npm React/Recharts, facades ESM, GitHub Actions/Pages e matriz visual.  
**O que foi feito:** PRs #53–#66 criaram baseline paralelo, runtime npm, facades de módulos folha/compostos/Firebase/storage, quatro lotes de componentes, dois lotes de telas, facade do controlador e entrada JSX. O PR #67 publicou `dist/`, fixou SHA completo de `upload-artifact`, usou `pwsh`, serializou workflows autenticados e manteve matriz legado/Vite. O PR #68 corrigiu navegação do smoke no subpath do Pages.  
**Decisões relevantes tomadas:** manter loader clássico e matriz de equivalência até o cutover final futuro; esse trabalho é precursor relacionado ao escopo de C15, não execução do C15 formal.  
**PRs/commits relacionados:** PRs #53–#68; implementações `0d4c820`, `1d10ac2`, `c724e4d`, `afb43ae`, `1c8ae5e`, `d2f7370`, `bdd3fee`, `274f561`, `d47bba5`, `d7a0ffa`, `f2ea92a`, `a397eb8`, `ce94b58`, `bf05dd8`, `a923910`, `af1e3b6`, `66094e1`, `a01fa6b`, `f972ce4`; merges `370afab` a `e2f4234`.  
**Fonte(s):** `2026-07-28-vite-esm-cutover-pages.md`; `2026-07-30-claude-naming-trofia-capacitor-play.md`.

### 2.9 28–30/07/2026 — Capacitor Android e identidade Trofia

#### Sem código formal — Android, scanner, backup e release interna

**Data de início:** 28/07/2026  
**Data de conclusão:** 30/07/2026  
**Propósito:** empacotar o web app, validar hardware e publicar teste interno.  
**Recursos/arquivos principais envolvidos:** Capacitor, Android, ML Kit barcode scanning, share/document picker e Play Console.  
**O que foi feito:** PR #69 criou a base; #70 formalizou APK debug; #71 registrou teste físico e A12/D15/D16/D17; #72 adicionou assets/câmera opcional; #73 integrou scanner; #74 despachou Voltar; #75 exportou/importou backups e evitou `TransactionTooLargeException`; #76 tratou safe areas/status bar; #77 renomeou Phrona para Trofia; #78 preparou assinatura. A conversa também registra primeiro AAB e publicação no teste interno.  
**Decisões relevantes tomadas:** câmera opcional; fallback manual; upload key fora do Git; nome final Trofia.  
**PRs/commits relacionados:** PRs #69–#78; merges `0e69aee`, `29a5369`, `49cbea7`, `67d295c`, `933d2be`, `e4802f2`, `4ad2435`, `c6ca197`, `7cee3e4`, `84acdaa`.  
**Fonte(s):** `2026-07-30-capacitor-android-trofia.md`; `2026-07-30-claude-naming-trofia-capacitor-play.md`.

### 2.10 30–31/07/2026 — C09, G01 e criação do roadmap

#### [C09 — roadmap] Backend gerenciado de IA

**Data de início:** planejamento em 30/07/2026  
**Data de conclusão:** 30/07/2026  
**Propósito:** retirar a chave Groq do cliente e eliminar BYOK obrigatório.  
**Recursos/arquivos principais envolvidos:** Cloudflare Worker, Gemini, Firebase JWT e módulos `callAI`.  
**O que foi feito:** PR #79 migrou as seis superfícies de IA para proxy gerenciado. O plano definiu validação RS256 de `kid/aud/iss/exp/iat/sub`, segredo no Worker, prompt de ~40.000 caracteres, rate limit por UID **5/min** e global **25 RPM**, sem persistir prompts/respostas. O modo único gerenciado substituiu a opção BYOK.  
**Decisões relevantes tomadas:** Cloudflare + Gemini Flash/Flash-Lite; escolha exata do modelo foi confirmada em conversa posterior por capturas do AI Studio.  
**PRs/commits relacionados:** PR #79, merge `a4f398e`.  
**Fonte(s):** `2026-07-30-claude-naming-trofia-capacitor-play.md`; `2026-08-01-claude-escolha-modelo-gemini.md`; `2026-08-31-principal-arquitetura-ia-dados.md`.

#### [G01] Autosave sobrescrevia backup restaurado

**Data de início:** 31/07/2026  
**Data de conclusão:** 01/08/2026; estabilização adicional em 08/08  
**Propósito:** impedir perda silenciosa imediatamente após importação.  
**Recursos/arquivos principais envolvidos:** backup modal, scheduler, reidratação e smoke autenticado.  
**O que foi feito:** o run do PR #80 mostrou estado pendente gravando valor antigo/vazio sobre o backup. PR #82 suspendeu autosaves e reidratou com segurança; PR #88 estabilizou o round-trip e #93 isolou fixture histórica.  
**Decisões relevantes tomadas:** G01 ficou fora da numeração de produto e bloqueou C05/C07 até execução verde.  
**PRs/commits relacionados:** PR #80 merge `74b3c0e`; PR #82 merge `13e16b8`; PR #88 `d853899`; PR #93 `4acaae0`.  
**Fonte(s):** `ROADMAP.md`; `2026-08-31-principal-arquitetura-ia-dados.md`.

#### Sem código formal — Criação do sistema de roadmap

**Data de início:** 31/07/2026  
**Data de conclusão:** 31/07/2026  
**Propósito:** ordenar trabalho por gates, dependências e risco.  
**Recursos/arquivos principais envolvidos:** `ROADMAP.md`.  
**O que foi feito:** PR #81 introduziu C01–C25, N01–N09 e G01, com 34 itens de produto e o gate externo.  
**Decisões relevantes tomadas:** segurança/conformidade antes de expansão; C15 não bloqueador universal, mas necessário antes de expansões profundas.  
**PRs/commits relacionados:** PR #81, merge `918d114`.  
**Fonte(s):** `git show 918d114:ROADMAP.md`; `2026-08-31-principal-arquitetura-ia-dados.md`.

### 2.11 01–17/08/2026 — C01, C05–C07 e C24

#### [C01 — roadmap] Encoding e datas civis

**Data de início:** 01/08/2026  
**Data de conclusão:** 01/08/2026  
**Propósito:** encerrar mojibake, UTC indevido e `TODAY` estático.  
**Recursos/arquivos principais envolvidos:** domínio de data civil, textos e relógio reativo.  
**O que foi feito:** C01-A corrigiu encoding/textos; C01-B criou data civil sem conversão UTC; C01-C fez a virada de meia-noite reativa.  
**Decisões relevantes tomadas:** este C01 é o roadmap; resolveu partes dos bugs [C01]/[C02] do inventário sem fundir namespaces.  
**PRs/commits relacionados:** PRs #83–#85; merges `49813c8`, `da4b905`, `f88d5f9`.  
**Fonte(s):** `ROADMAP.md`; `2026-08-31-principal-arquitetura-ia-dados.md`.

#### [C06/C05/C07 — roadmap] Privacidade e backup autenticado

**Data de início:** 01/08/2026  
**Data de conclusão:** 08/08/2026  
**Propósito:** publicar termos verificáveis e fechar recuperação de dados.  
**Recursos/arquivos principais envolvidos:** Worker, políticas PT/EN/ES, Data Safety e smoke.  
**O que foi feito:** PR #86 implementou limpeza do rate limiter em **23 horas**, abaixo do teto público de 24 h; #87 publicou política trilíngue; #88 fechou round-trip. Firestore foi confirmado em `europe-southwest1` (Madrid).  
**Decisões relevantes tomadas:** fotos/prompts/respostas não persistidos pelo Worker no contrato atual; política atualizada novamente durante C24.  
**PRs/commits relacionados:** PRs #86–#88; merges `4acc8af`, `425d57c`, `d853899`.  
**Fonte(s):** `PENDENCIAS.md`; `RESUMO-STATUS.md`; `2026-08-31-principal-arquitetura-ia-dados.md`.

#### [C24 — roadmap] Reconhecimento de refeição por imagem

**Data de início:** 01/08/2026  
**Data de conclusão:** 17/08/2026  
**Propósito:** capturar câmera/galeria, estimar nutrientes e exigir revisão antes de persistir.  
**Recursos/arquivos principais envolvidos:** editor compartilhado, Worker multimodal, Capacitor Camera, pré-processamento, compliance e validação física.  
**O que foi feito:** PRs #89–#97 cobriram contrato/editor, endpoint multimodal, captura, tela dedicada, persistência sem guardar imagem, políticas/Data Safety, teste físico e correção da navegação real. PR #93 foi estabilização de backup intercalada, não fatia funcional da foto.  
**Decisões relevantes tomadas:** imagem não seria persistida; estimativas sempre editáveis; Cloud Billing confirmado antes de testers no EEE/Suíça/Reino Unido.  
**PRs/commits relacionados:** #89 merge `8520085`/implementação `9721b2c`; #90 merge `661d232`/implementação `972b173`; #91 merge `7776fb4`/implementação `7e8f583`; #92 merge `eb0c162`/implementação `5767d2c`; #93 merge `4acaae0`/implementação `816d9c7`; #94 merge `a9ca72e`/implementação `8c77ca2`; #95 merge `904f5f9`/documentação `d0043a9`; #96 merge `2fb3aeb`/validação `8ffb247`; #97 merge `abc00c7`/implementação `a688686`.  
**Fonte(s):** `2026-08-31-principal-arquitetura-ia-dados.md`; `C24_FATIA_7_VALIDACAO.md`; compliance.

### 2.12 18–29/08/2026 — C22, C23, C28 e 0.10.0-beta

#### [C22 — roadmap] Exclusão completa e idempotente da conta

**Data de início:** 18/08/2026  
**Data de conclusão:** 21/08/2026  
**Propósito:** garantir exclusão administrativa completa, repetível e verificável.  
**Recursos/arquivos principais envolvidos:** Cloud Functions, Cloud Tasks, App Check, lock, recursive delete e reconciliação.  
**O que foi feito:** #99 criou infraestrutura; #100 engine idempotente; #103 lock/recursive delete; #104 fila/reconciliação; #105 UX; #106 rollout e validação destrutiva. A release 0.9.0-beta ocorreu no #102.  
**Decisões relevantes tomadas:** não excluir Auth antes de confirmar limpeza; retries idempotentes; bloqueio de novas escritas durante saga.  
**PRs/commits relacionados:** PRs #99–#100, #103–#106; merges `0e033ea`, `c3b7f52`, `f233fb4`, `836cead`, `4583eac`, `b15a47d`.  
**Fonte(s):** `2026-08-31-principal-arquitetura-ia-dados.md`; `2026-08-31-claude-coordenacao-roadmap.md`.

#### [C23 — roadmap] Corte do armazenamento legado

**Data de início:** 22/08/2026  
**Data de conclusão:** 28/08/2026  
**Propósito:** migrar administrativamente todo documento legado e fechar as rules antigas.  
**Recursos/arquivos principais envolvidos:** inventário paginado, migração, export gerenciado, rules e importação de backups históricos.  
**O que foi feito:** #107 inventariou fail-closed; #108 copiou/mesclou e verificou **54 documentos**; #109 tornou legado read-only; #110 cortou o cliente; #111, após **7 dias** de observação, confirmou export, excluiu transacionalmente os 54 e verificou zero restantes; #112 documentou. Export: `gs://trofia-firestore-exports-128834310181/c23-before-legacy-delete-20260827T163200Z`, bucket Madrid e lifecycle **90 dias**.  
**Decisões relevantes tomadas:** novos backups só exportam `root`/`data`; importação aceita formatos antigos; C22 ainda procura órfãos legados defensivamente.  
**PRs/commits relacionados:** PRs #107–#112; commits/merges `4cd7805`, `36bf24b`, `4338629`, `5c6b337`, `b8935be`, `b7e0785`.  
**Fonte(s):** `ROADMAP.md`; `BUG-INVENTORY.md`; `2026-08-31-principal-arquitetura-ia-dados.md`.

#### [C28 — roadmap] Arquitetura offline-first

**Data de início:** 28/08/2026  
**Data de conclusão:** 29/08/2026  
**Propósito:** substituir REST/agregados ativos por SDK modular, cache persistente e escrita granular.  
**Recursos/arquivos principais envolvidos:** Firebase Auth/App Check/Firestore modular, persistence, loaders e sync state.  
**O que foi feito:** #113 reduziu leituras/serializou CI; #114 compartilhou Auth/App Check; #115 adapter Firestore; #116 cache persistente; #117 cache-first/subscriptions; #118 mutações idempotentes/conflitos; #119 schema granular; #120 compatibilidade; #121 status/retry; #122 autosaves granulares; #123 backup/lifecycle; #124 rollout. A09 foi resolvido pelas fatias 6A–6E. #125 preparou `0.10.0-beta`; #127 autenticou CI com App Check.  
**Decisões relevantes tomadas:** um batch atômico para operações multi-item; estado pendente/sincronizado/erro; leitura retrocompatível durante migração.  
**PRs/commits relacionados:** PRs #113–#125 e #127; merges `c9c5662` a `dc0852c`, mais `e95686b`.  
**Fonte(s):** `ROADMAP.md`; `BUG-INVENTORY.md`; `2026-08-31-principal-arquitetura-ia-dados.md`.

### 2.13 29–31/08/2026 — Controles S1–S8, C20, C19 e C08

#### [S1–S8] Componentes próprios de formulário

**Data de início:** auditoria em 29/08/2026  
**Data de conclusão:** S8 em 31/08/2026; S9 permanece futura  
**Propósito:** retirar aparência/idioma impostos pelo navegador/Android e padronizar acessibilidade.  
**Recursos/arquivos principais envolvidos:** `ChoiceField`, `SearchableChoiceField`, `TemporalField`, `NumericField`, checkbox/range, Playwright e App Check.  
**O que foi feito:** #126 criou `ChoiceField`; #130 ampliou refeições; #133 perfil; #136 Métricas; #138 Despensa; #141 listas dinâmicas; #144 horário; #146 nascimento; #148 quantidade; #150/commits associados trabalharam Métricas; #164? não, PRs de documentação não são código; S8 foi implementada por `9a7194b` e corrigida por `597457b`, preservando o alvo nativo interativo. A matriz verificou desktop/mobile, claro/escuro, legado/Vite, PT/EN/ES, roles, foco, Escape, live regions e pointer events.  
**Decisões relevantes tomadas:** não substituir o IME Android global; keypad apenas dentro de campos específicos; protótipo antes de cada família.  
**PRs/commits relacionados:** PRs #126, #130, #133, #136, #138, #141, #144, #146, #148 e draft #150; commits `9a7194b`, `597457b`, `0c9ee63`, `3602275`, `b5c6237`, `4ea5a18`, `73f24c7`.  
**Fonte(s):** `2026-08-31-ui-campos-customizados.md`; `2026-08-31-claude-coordenacao-roadmap.md`; `git log --all`.

#### [C20 — roadmap] `meal-score-v2`

**Data de início:** 30/08/2026  
**Data de conclusão:** 30/08/2026  
**Propósito:** calibrar, versionar e integrar a nota 0–5.  
**Recursos/arquivos principais envolvidos:** contrato nutricional, score v2, snapshots e UI trilíngue.  
**O que foi feito:** #129 definiu contrato; #131 calibrou v2; #132 integrou; #134 esclareceu apresentação/ajuda; #135 validou. O score explicita cobertura e provisoriedade, evitando reinterpretar silenciosamente snapshots.  
**Decisões relevantes tomadas:** contrato versionado `meal-score-v2`; revisão nutricional externa posterior exige nova versão incompatível.  
**PRs/commits relacionados:** PRs #129, #131, #132, #134, #135; merges `68d5e62`, `2af6cb4`, `e34a6f6`, `aaf4b16`, `24432cf`.  
**Fonte(s):** `ROADMAP.md`; `2026-08-31-principal-arquitetura-ia-dados.md`; `NUTRITION_SCORE.md`.

#### [C19 — roadmap] Avaliação opcional e aceite UX

**Data de início:** 30/08/2026  
**Data de conclusão:** 30/08/2026  
**Propósito:** permitir explicação opcional sem comprometer integridade do score aceito.  
**Recursos/arquivos principais envolvidos:** snapshots, retry, foto/manual, Diário e matriz PT/EN/ES.  
**O que foi feito:** #137 protegeu snapshots; #139 estabilizou retry opcional; #140 integrou fotos; #142 exibiu badge/agrupamento; #145 validou desktop/mobile e legado/Vite.  
**Decisões relevantes tomadas:** falha da IA não impede score/registro local; snapshot aceito é conservador e versionado.  
**PRs/commits relacionados:** PRs #137, #139, #140, #142, #145; merges `16233c8`, `34d3a1f`, `7d15f1d`, `2d6be5b`, `623f63f`.  
**Fonte(s):** `ROADMAP.md`; `2026-08-31-claude-coordenacao-roadmap.md`.

#### [C08 — roadmap] Critérios nutricionais e contratos de IA

**Data de início:** 30/08/2026  
**Data de conclusão:** não determinada; validação final estava fora de `origin/main` na captura  
**Propósito:** alinhar prompts a C19/C20 e impedir inferências falsas a partir de dados ausentes.  
**Recursos/arquivos principais envolvidos:** `AI_NUTRITION_POLICY.md`, context builders, estimativas estruturadas, feedback/padrões, despensa e verificação de produção.  
**O que foi feito:** #147 versionou política; #149 preservou ausente em vez de zero; #151 estruturou estimativas; #152 alinhou feedback/padrões; #165 endureceu sugestões da despensa e explicações. `2e99ee3` verificou endpoint implantado; `92b48cf` registrou validação. A branch `codex/c08-final-validation` continha `2490f91`, mas não estava mesclada em `origin/main`; portanto, fechamento final não é afirmado.  
**Decisões relevantes tomadas:** P07 adiou troca/comparação de modelo; P08 exige revisão externa posterior sem reinterpretar `meal-score-v2`.  
**PRs/commits relacionados:** PRs #147, #149, #151, #152, #165; merges `67514dd`, `dd27571`, `d0914b1`, `5c51fa5`, `e12b464`; commits `2e99ee3`, `92b48cf`, `2490f91` não mesclado.  
**Fonte(s):** `2026-08-31-principal-arquitetura-ia-dados.md`; `2026-08-31-claude-coordenacao-roadmap.md`; `git log --all`.

#### [F06] Bloqueio de conectividade em `workers.dev`

**Data de início:** não determinado, durante C19-D  
**Data de conclusão:** não resolvido na captura  
**Propósito:** separar falha de rede/ISP de regressão do C19/C08.  
**Recursos/arquivos principais envolvidos:** domínio compartilhado `workers.dev`, diagnóstico web e draft #143.  
**O que foi feito:** a falha foi documentada como incidente separado; migração para domínio próprio permaneceu ligada a P02.  
**Decisões relevantes tomadas:** não mascarar o incidente como bug nutricional; causa específica do usuário/ISP não determinada.  
**PRs/commits relacionados:** PR #143 draft, não mesclado na captura.  
**Fonte(s):** `2026-08-31-principal-arquitetura-ia-dados.md`; `2026-08-31-claude-coordenacao-roadmap.md`.

### 2.14 31/08/2026 — Organização documental

#### Sem código formal — Históricos, referência atual e CI de documentação

**Data de início:** 31/08/2026  
**Data de conclusão:** 31/08/2026  
**Propósito:** centralizar estado verificável e preservar conversas antigas.  
**Recursos/arquivos principais envolvidos:** `documentation/estado-atual/`, `documentation/historico/` e filtro de CI.  
**O que foi feito:** #153 centralizou referência; #154 documentou UI; #155 pulou suíte pesada em alterações só documentais; #156–#164 adicionaram históricos de Vite, autenticação, CI, auditoria, 0.8.0, One UI, chat antigo e Capacitor. O branch Claude adicionou outros dez históricos no commit `e795053`, cuja integração à main deve ser avaliada pelo commit real, não apenas pelo nome de branch.  
**Decisões relevantes tomadas:** documentos históricos não provam que o trabalho ocorreu em 31/08; suas datas internas prevalecem.  
**PRs/commits relacionados:** PRs #153–#164; merges `f5f4193`, `871ae56`, `0635488`, `d203be5`, `5c7c365`, `427ae36`, `90b65fd`, `6416dce`, `d5e81bc`, `3d776db`, `9be99dc`, `104b771`; commit `e795053`.  
**Fonte(s):** todos os 22 relatórios; `git log --all`.

## 3. IMPLEMENTAÇÕES FUTURAS (PLANEJADAS, AINDA NÃO REALIZADAS)

### [C08 — roadmap] Validação final residual

**Status:** planejado  
**Propósito:** concluir a validação integral depois das sugestões da despensa.  
**Recursos/arquivos principais envolvidos:** política, endpoints, matriz autenticada e branch de validação.  
**O que deve ser feito:** confirmar merge/estado de `2490f91`, execução verde e atualização consistente de roadmap/versionamento; não declarar C08 concluído só pela existência da branch.  
**Decisões relevantes conhecidas:** manter o modelo atual até tarefa própria P07; revisão nutricional externa posterior em P08.  
**PRs/commits relacionados:** futuro; `2490f91` é evidência existente, não conclusão na main.  
**Fonte(s):** `git log --all`; `ROADMAP.md`; `PENDENCIAS.md`.

### [C14 — roadmap] Revisão geral de segurança

**Status:** planejado  
**Propósito:** auditar Auth, App Check, Worker, exclusão, rules, armazenamento offline e pontes nativas sobre a arquitetura pós-C28.  
**Recursos/arquivos principais envolvidos:** Firebase/Firestore, Cloud Functions/Tasks, Worker, Android, CI e compliance.  
**O que deve ser feito:** threat model, validação de autorização/tenancy, secrets, supply chain, logs, rate limit, exclusão/retention, import/export, WebView e superfícies de arquivo/câmera.  
**Decisões relevantes conhecidas:** indispensável antes do lançamento público; não confundir auditorias antigas com sua execução.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`; `RESUMO-STATUS.md`.

### [C16 — roadmap] Documentação técnica e de manutenção

**Status:** planejado  
**Propósito:** documentar contratos finais após C14, incluindo operação, segurança, recuperação e arquitetura.  
**Recursos/arquivos principais envolvidos:** documentação de arquitetura, runbooks, schemas, releases, CI e incidentes.  
**O que deve ser feito:** fechar documentação suficiente para outra pessoa operar, investigar, restaurar e publicar o Trofia. Os artefatos Word/planilha de julho são antecedentes, não C16.  
**Decisões relevantes conhecidas:** indispensável e predecessor do C25.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`; correção expressa do responsável.

### [C25 — roadmap] Gate da versão pública

**Status:** planejado  
**Propósito:** decidir release candidate e abertura ao público após C14/C16.  
**Recursos/arquivos principais envolvidos:** CI, versão, políticas, Play Console e checklist.  
**O que deve ser feito:** confirmar gates, smoke autenticado, backup/exclusão, compliance, release notes e ausência de bloqueadores.  
**Decisões relevantes conhecidas:** produz `1.0.0-rc.1` antes de `1.0.0`.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`; `VERSIONING.md`.

### [C26 — roadmap] Notificações locais

**Status:** planejado  
**Propósito:** melhorar conquistas e oferecer lembretes sem servidor.  
**Recursos/arquivos principais envolvidos:** safe area, `@capacitor/haptics`, `@capacitor/local-notifications`.  
**O que deve ser feito:** C26-A revisa posição/animação, volume seguro e vibração nativa; C26-B acrescenta opt-in, tipos, janela silenciosa, água por déficit/horário restante, motivação matinal, check-ins, reagendamento por água/meta/idioma/fuso e deep link. Preferir agendamento inexato. C26-C — FCM/tokens/backend — permanece deliberadamente adiado.  
**Decisões relevantes conhecidas:** toast antigo não torna C26 completo; push exige nova tarefa, política e retenção de tokens.  
**PRs/commits relacionados:** futuros.  
**Fonte(s):** `ROADMAP.md`.

### [N01] Registro por voz

**Status:** planejado  
**Propósito:** registrar refeição por fala reutilizando C09 e descrição estruturada.  
**Recursos/arquivos principais envolvidos:** captura/transcrição, Worker e editor de estimativas.  
**O que deve ser feito:** consentimento, limites, idiomas PT/EN/ES, edição antes de salvar, falhas offline e privacidade do áudio.  
**Decisões relevantes conhecidas:** baixa/média complexidade; pós-lançamento.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [C21 — roadmap] Porções fracionadas no GA

**Status:** planejado  
**Propósito:** eliminar a limitação de genes inteiros/blocos fixos.  
**Recursos/arquivos principais envolvidos:** `meal-ga`, unidades/porções e meal-score-v2.  
**O que deve ser feito:** definir passos coerentes por unidade, limites, deduplicação/fitness e UI de revisão sem quebrar a base histórica de 100 g/unidade.  
**Decisões relevantes conhecidas:** depende de C20; GA de junho é precursor, não esta entrega.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`; relatório GA.

### [N03] Leitura de rótulo nutricional por foto

**Status:** planejado  
**Propósito:** preencher alimento a partir de embalagem/rótulo.  
**Recursos/arquivos principais envolvidos:** captura/pré-processamento/Worker/editor do C24.  
**O que deve ser feito:** OCR/multimodal, distinção por 100 g/porção, unidades, revisão obrigatória, tratamento de baixa confiança e ausência de campos.  
**Decisões relevantes conhecidas:** reutilizar C24 sem reabri-lo.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [N09] Jejum intermitente

**Status:** planejado  
**Propósito:** registrar janelas e impedir lembretes inadequados.  
**Recursos/arquivos principais envolvidos:** relógio local, notificações e Diário.  
**O que deve ser feito:** tipos/janelas, timezone/DST, início/fim/cancelamento e integração futura com C26.  
**Decisões relevantes conhecidas:** não tem dependência bloqueante; pós-lançamento.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [C17 — roadmap] E-mails automáticos por idioma

**Status:** planejado  
**Propósito:** comunicações transacionais/localizadas.  
**Recursos/arquivos principais envolvidos:** provedor, domínio, consentimento e preferências.  
**O que deve ser feito:** definir necessidade transacional, opt-in/out, templates PT/EN/ES, horários, exclusão e relação com C26.  
**Decisões relevantes conhecidas:** depende de ação externa; não avançar sem necessidade clara.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [C13 — roadmap] Feedback nativo com anexos

**Status:** planejado  
**Propósito:** substituir formulário externo por fluxo do app.  
**Recursos/arquivos principais envolvidos:** picker/upload, backend, política e exclusão C22.  
**O que deve ser feito:** tipos/tamanho, consentimento, retenção, autorização, exclusão e anexos seguros.  
**Decisões relevantes conhecidas:** posterior a C06/C22; envolve novos dados.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [C10 — roadmap] Relatórios Python/HTTPS em produção

**Status:** planejado  
**Propósito:** reativar relatórios avançados em serviço operável.  
**Recursos/arquivos principais envolvidos:** servidor Python, HTTPS, autenticação e runbook.  
**O que deve ser feito:** infraestrutura, autorização, minimização de payload, timeouts/erros, deploy e monitoramento; remover definitivamente código morto se o serviço não for aprovado.  
**Decisões relevantes conhecidas:** prepara N07 e depende de coordenação externa.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`; `BUG-INVENTORY.md` [E02].

### [N07] Compartilhamento profissional mínimo

**Status:** planejado  
**Propósito:** compartilhar relatório com profissional mediante ação explícita.  
**Recursos/arquivos principais envolvidos:** C10, consentimento, export e revogação.  
**O que deve ser feito:** escopo mínimo, período/dados selecionáveis, aviso de privacidade, expiração e auditoria.  
**Decisões relevantes conhecidas:** depende de C10; C06 já fornece base de política.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [N02] Banco nutricional mais profundo

**Status:** planejado  
**Propósito:** ampliar cobertura e qualidade além do mapeamento atual.  
**Recursos/arquivos principais envolvidos:** fonte/licença, normalização, cache e Open Food Facts.  
**O que deve ser feito:** selecionar fonte licenciável, provenance, normalização de porções/unidades, micronutrientes, atualização/cache e resolução de conflitos.  
**Decisões relevantes conhecidas:** aprimora C24/N03; não é pré-requisito para reabrir C24.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [N05] Recalibração dinâmica do gasto calórico

**Status:** planejado  
**Propósito:** ajustar gasto/metas pelo histórico confiável.  
**Recursos/arquivos principais envolvidos:** peso, ingestão, metas históricas, datas civis e modelo longitudinal.  
**O que deve ser feito:** modelagem, UX explicável, limites de alteração, qualidade mínima e validação longitudinal sem dupla contagem.  
**Decisões relevantes conhecidas:** G01, C01 e C05 já atendidos; trabalho restante é modelagem/UX/validação.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [C15 — roadmap] Refatoração, modularização e limpeza final do legado

**Status:** planejado — ainda não iniciado  
**Propósito:** concluir o que a refatoração de 16–28/07 deixou pela metade e remover pontes/duplicações após C28.  
**Recursos/arquivos principais envolvidos:** loader clássico, facades ESM, controlador, Firebase REST/modular, matriz legado/Vite e importação antiga.  
**O que deve ser feito:** programa estimado em **6–10 semanas e 8–12 PRs**; tarefa zero deve definir fronteiras. Ao fechar, aposentar loader clássico e matriz legado/Vite. Importação de backups antigos permanece por **duas versões públicas** e depois é removida com anúncio/teste.  
**Decisões relevantes conhecidas:** pós-lançamento; predecessor de C27/N04/N06/C12/C18/N08; nenhum trabalho histórico deste documento deve ser rotulado como C15 executado.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`; correção expressa do responsável.

### [C27 — roadmap] Widgets

**Status:** planejado  
**Propósito:** oferecer acesso rápido Android.  
**Recursos/arquivos principais envolvidos:** `AppWidgetProvider`, `RemoteViews` e deep link Capacitor.  
**O que deve ser feito:** versão A apenas abre área específica, sem ler/escrever nutrição fora da WebView. Versão B (`+250 ml`) permanece adiada até C15, contrato de reagendamento C26 e fonte de verdade compartilhada.  
**Decisões relevantes conhecidas:** concluir A não autoriza B.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [N04/N06] Receitas, planejamento e compras

**Status:** planejado  
**Propósito:** modelar receitas/porções e derivar plano/lista de compras.  
**Recursos/arquivos principais envolvidos:** N02, C21, C15 e novo domínio persistente.  
**O que deve ser feito:** N04 cria ingredientes, rendimento, nutrientes por porção e edição; N06 usa receitas para calendário alimentar e agregação de compras.  
**Decisões relevantes conhecidas:** N04 espera N02/C21/C15; N06 espera N04.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`.

### [C12/C18/N08] iOS, saúde e atividade

**Status:** planejado  
**Propósito:** expandir plataformas e integrar dados sem dupla contagem.  
**Recursos/arquivos principais envolvidos:** Capacitor iOS, Apple signing, Health Connect, HealthKit, Samsung Health e hábitos.  
**O que deve ser feito:** C12 prepara/build/publica iOS; C18 integra por plataforma e identifica origem/deduplicação; N08 acrescenta exercícios/rotinas/hábitos apenas depois de N05/C18.  
**Decisões relevantes conhecidas:** HealthKit depende de C12; Health Connect é via preferencial Android; Trofia não deve virar plataforma fitness genérica.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `ROADMAP.md`; `2026-07-18-claude-health-connect.md`.

### [S9/I1–I7] Planejamento adicional de UI fora do roadmap geral

**Status:** planejado  
**Propósito:** encerrar componentes e evoluir loading, registro, FAB, criação, configurações, home e gamificação.  
**Recursos/arquivos principais envolvidos:** diálogo genérico, protótipos, `prefers-reduced-motion`, tema e testes visuais.  
**O que deve ser feito:** S9 conclui a arquitetura de controles. I1–I7 só começa após seletores; inclui logo/loading, registro progressivo, FAB/menu, configurações full-screen, hierarquia da home e gamificação desativável. Alergias/intolerâncias continuam adiadas por serem dados de saúde sensíveis.  
**Decisões relevantes conhecidas:** migração futura de tema deve atingir todos os usuários, não somente instalações novas; marcos AAB sugeridos após S9/I3/I5/I6/I7.  
**PRs/commits relacionados:** não existem.  
**Fonte(s):** `2026-08-31-ui-campos-customizados.md`; `2026-08-31-claude-coordenacao-roadmap.md`.

## 4. Contradições e limites não resolvidos

1. Datas de relatórios com prefixo `2026-08-31` frequentemente são datas de documentação, não do trabalho. A auditoria Word/planilha foi reposicionada em julho, mas o dia inicial exato continua não determinado.
2. Alguns relatórios antigos aplicavam C15/C16 retrospectivamente. Conforme decisão do responsável, essas etiquetas foram removidas dos blocos antigos; C15 e C16 permanecem futuros.
3. A causa final de determinadas telas pretas de 10/06 foi resolvida externamente e não está documentada; não foi reconstruída por inferência.
4. C08 possuía branch/commit de validação final, mas `origin/main` observado terminava no PR #165; portanto, o fechamento formal é não determinado.
5. PR #143/F06 e PR #150 foram drafts nas capturas documentais. Commits de UI posteriores existem, mas a equivalência administrativa final do draft #150 não é inferida.
6. O `versionCode` Android efetivamente enviado ao Play Console não é determinado pelo Git, pois era alterado localmente antes do upload.

## 5. Fontes históricas consolidadas

Foram usados todos os 22 arquivos existentes em `documentation/historico/`, todos os documentos relevantes em `documentation/estado-atual/`, `ROADMAP.md`, `bug-inventory.txt` e `git log --all`. Para detalhes operacionais atuais, prevalecem `ROADMAP.md`, `RESUMO-STATUS.md`, `BUG-INVENTORY.md`, `VERSIONING.md`, `PENDENCIAS.md`, `AI_NUTRITION_POLICY.md`, `NUTRITION_SCORE.md`, os documentos C22/C24 e compliance.
