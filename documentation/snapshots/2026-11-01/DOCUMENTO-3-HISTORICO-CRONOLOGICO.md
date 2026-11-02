# Documento 3 — Histórico cronológico de desenvolvimento do Trofia

**Aplicativo:** Trofia (`com.hermegas.trofia`)
**Repositório:** `github.com/magnoClovis/nutrition-tracker`
**Branch de referência:** `main`/`origin/main`
**Data desta consolidação:** 01/11/2026
**Commit exato de referência:** `4e727679d8b556e89a590b2861acc1b7b53b8b72` (`origin/main`).
**Natureza:** registro histórico e documental; não representa implementação nova.

## 1. Método, fontes e regras de interpretação

Este documento preserva a consolidação anterior dos 22 arquivos de `documentation/historico/`, confronta suas afirmações com `documentation/estado-atual/` e usa `git log --all` para confirmar datas, hashes e PRs. A data no nome de um relatório indica quando o relatório foi produzido, não necessariamente quando o trabalho relatado ocorreu. Quando uma conversa não contém timestamp confiável e o Git não fornece uma correspondência inequívoca, a data é registrada como **não determinada**.

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

#### [C22-F1] — Infraestrutura administrativa separada para exclusão

- **Data de início:** 18/08/2026
- **Data de conclusão:** 18/08/2026
- **Propósito:** retirar a exclusão integral da conta do cliente e criar uma fronteira administrativa testável
- **Recursos/arquivos/serviços principais:** `functions/`, Firebase Functions 2nd gen em `europe-southwest1`, Admin SDK, emuladores, `firebase.json`, `.firebaserc` e workflow
- **O que foi feito:** a base de Functions e os emuladores foram criados com contratos próprios; o cliente continuou sem privilégio administrativo e a exclusão ainda não foi exposta até o motor existir
- **Decisão ou trade-off:** separar a operação destrutiva do Worker de IA evitou misturar segredos, quotas e responsabilidades; infraestrutura primeiro, efeito destrutivo depois
- **Validação, estado operacional e limites:** emuladores e testes de infraestrutura passaram; esta fatia não provava exclusão real nem autorizava dados de produção
- **PRs/commits relacionados:** PR #99; merge `0e033ea`
- **Fonte(s):** `RESUMO-STATUS.md` [C22-F1], `C22_ROLLOUT.md`, `git log --first-parent`
#### [C22-F2] — Motor idempotente e retomável

- **Data de início:** 18/08/2026
- **Data de conclusão:** 18/08/2026
- **Propósito:** impedir que repetição, queda intermediária ou entrega duplicada deixassem a conta parcialmente apagada
- **Recursos/arquivos/serviços principais:** `functions/src/account-deletion-engine.js`, estados/checkpoints, fixtures e testes puros
- **O que foi feito:** foi criada uma saga que persiste checkpoint por etapa e retorna o estado já existente quando o mesmo pedido é repetido; falhas passam a ser retomáveis em vez de reiniciar a exclusão
- **Decisão ou trade-off:** idempotência foi tratada como requisito de integridade, não como otimização; nenhuma etapa posterior pode ser presumida só porque a anterior foi solicitada
- **Validação, estado operacional e limites:** testes puros cobriram repetição e falha; ainda não havia lock Firestore, fila nem prova destrutiva
- **PRs/commits relacionados:** PR #100; merge `c3b7f52`
- **Fonte(s):** `RESUMO-STATUS.md` [C22-F2], `C22_ROLLOUT.md`
#### [C22-F3] — Lock de escrita e remoção recursiva

- **Data de início:** 21/08/2026
- **Data de conclusão:** 21/08/2026
- **Propósito:** evitar novas gravações enquanto a árvore canônica e suas subcoleções são removidas
- **Recursos/arquivos/serviços principais:** `firestore.rules`, `functions/src/firestore-account-deletion.js`, Admin SDK, testes de concorrência e rules
- **O que foi feito:** um documento de lock passou a negar escrita do cliente; a Function administrativa percorre e remove a árvore `nutrition/{uid}` e resíduos previstos, verificando o estado antes de avançar
- **Decisão ou trade-off:** o Auth não é apagado primeiro: manter a identidade até provar a limpeza preserva possibilidade de retry e auditoria
- **Validação, estado operacional e limites:** emuladores comprovaram owner/outro usuário, lock e recursão; a prova em produção ficou reservada às fatias F6/F7
- **PRs/commits relacionados:** PR #103; merge `f233fb4`
- **Fonte(s):** `RESUMO-STATUS.md` [C22-F3], `firestore.rules`
#### [C22-F4] — Cloud Tasks, retries e reconciliador

- **Data de início:** 21/08/2026
- **Data de conclusão:** 21/08/2026
- **Propósito:** tornar a exclusão assíncrona durável e recuperável diante de indisponibilidade transitória
- **Recursos/arquivos/serviços principais:** `account-deletion-jobs.js`, `account-deletion-task.js`, Cloud Tasks em `europe-west1`, Scheduler/reconciliador, TTL e índices
- **O que foi feito:** o callable cria job e lock em transação; Cloud Tasks processa etapas com backoff; um reconciliador procura trabalhos sem progresso e reencaminha sem duplicar o efeito
- **Decisão ou trade-off:** aceite do pedido e conclusão foram separados para não manter a interface aberta durante uma operação longa; jobs falhos são retidos para diagnóstico sanitizado
- **Validação, estado operacional e limites:** testes cobriram entrega duplicada e retries; a configuração real de invocadores e Scheduler seria endurecida posteriormente em C14-F2
- **PRs/commits relacionados:** PR #104; merge `836cead`
- **Fonte(s):** `RESUMO-STATUS.md` [C22-F4], `C22_ROLLOUT.md`
#### [C22-F5] — Cliente protegido, suspensão de autosave e limpeza local

- **Data de início:** 21/08/2026
- **Data de conclusão:** 21/08/2026
- **Propósito:** iniciar a saga com prova recente de identidade e impedir que o aparelho recriasse dados após o aceite
- **Recursos/arquivos/serviços principais:** `account-deletion-client.js`, `privacy-panel.js`, `app-check-client.js`, entrypoints web/Android, cache IndexedDB e testes
- **O que foi feito:** a pessoa confirma senha e texto, o cliente reautentica, aguarda escritas pendentes, envia Auth e App Check, suspende autosaves, sela o lifecycle e limpa cache/sessão após o aceite do job
- **Decisão ou trade-off:** idioma e tema são preservados por serem preferências locais não pertencentes à conta; dados nutricionais e sessão não são preservados
- **Validação, estado operacional e limites:** fluxo de interface e contratos passaram; esta fatia não significava que o backend já fora publicado ou que a exclusão real tivesse sido observada
- **PRs/commits relacionados:** PR #105; merge `4583eac`
- **Fonte(s):** `RESUMO-STATUS.md` [C22-F5], `C22_ROLLOUT.md`
#### [C22-F6] — Deploy e teste destrutivo com conta descartável

- **Data de início:** 21/08/2026
- **Data de conclusão:** 21/08/2026
- **Propósito:** provar a saga completa em serviços reais sem tocar em conta de usuário
- **Recursos/arquivos/serviços principais:** Functions, Cloud Tasks, App Check web/Android, scripts de teste, Auth e Firestore de produção controlada
- **O que foi feito:** Functions e fila foram publicadas; uma conta criada para o ensaio percorreu aceite, lock, remoção de Firestore/Auth, repetição idempotente e limpeza
- **Decisão ou trade-off:** usar conta descartável delimitou o risco; nenhum dado pessoal foi reutilizado como fixture
- **Validação, estado operacional e limites:** rollout controlado comprovado em produção; isso não é lançamento público nem prova de todos os estados futuros de carga
- **PRs/commits relacionados:** PR #105 e rollout associado; merge `4583eac`
- **Fonte(s):** `RESUMO-STATUS.md` [C22-F6], `C22_ROLLOUT.md`
#### [C22-F7] — Fechamento operacional, compliance e Play Integrity

- **Data de início:** 21/08/2026
- **Data de conclusão:** 21/08/2026
- **Propósito:** encerrar C22 com política, Data Safety, TTL/índices e prova no artefato Android distribuído
- **Recursos/arquivos/serviços principais:** `C22_ROLLOUT.md`, políticas PT/EN/ES, Data Safety, AAB interno, Play Integrity, índices e TTL
- **O que foi feito:** a matriz final repetiu a exclusão, confirmou atestação Android e alinhou as declarações públicas ao fluxo administrativo
- **Decisão ou trade-off:** a entrega foi considerada concluída apenas depois do artefato da faixa interna; build local isolado não era evidência suficiente
- **Validação, estado operacional e limites:** C22 ficou operacional em produção controlada; não autoriza inferir lançamento geral do Trofia
- **PRs/commits relacionados:** PR #106; merge `b15a47d`
- **Fonte(s):** `RESUMO-STATUS.md` [C22-F7], `C22_ROLLOUT.md`

#### Sequência C23 — corte do armazenamento legado

#### [C23-F1] — Inventário paginado e fail-closed

- **Data de início:** 22/08/2026
- **Data de conclusão:** 22/08/2026
- **Propósito:** conhecer todos os documentos antigos e conflitos antes de escrever ou excluir
- **Recursos/arquivos/serviços principais:** `functions/scripts/c23-legacy-dry-run.js`, `legacy-migration-inventory.js`, Admin SDK, `firebase.json` e testes
- **O que foi feito:** o dry-run classificou origem, destino e conflito de modo paginado e somente leitura; entradas inesperadas interrompem o plano
- **Decisão ou trade-off:** nenhuma migração seria executada com inventário parcial ou ambíguo
- **Validação, estado operacional e limites:** ferramenta e testes concluídos; ainda não havia cópia real
- **PRs/commits relacionados:** PR #107; commit/merge `4cd7805`
- **Fonte(s):** `RESUMO-STATUS.md` [C23-F1], `ROADMAP.md` seção C23
#### [C23-F2] — Cópia, merge e verificação de 54 documentos

- **Data de início:** 23/08/2026
- **Data de conclusão:** 23/08/2026
- **Propósito:** migrar dados reais sem apagar a fonte e detectar divergência por destino
- **Recursos/arquivos/serviços principais:** `c23-legacy-copy.js`, `legacy-migration-copy.js`, inventário e testes
- **O que foi feito:** 54 documentos legados foram copiados ou mesclados; cada destino canônico foi relido e comparado; a origem permaneceu intacta
- **Decisão ou trade-off:** cópia e exclusão foram deliberadamente separadas para permitir observação e rollback
- **Validação, estado operacional e limites:** 54 destinos verificados, zero conflito reportado; a leitura legada permaneceu ativa
- **PRs/commits relacionados:** PR #108; commit/merge `36bf24b`
- **Fonte(s):** `RESUMO-STATUS.md` [C23-F2], `ROADMAP.md` seção C23
#### [C23-F3] — Rules transitórias somente leitura

- **Data de início:** 23/08/2026
- **Data de conclusão:** 23/08/2026
- **Propósito:** retirar do cliente a capacidade de apagar legados antes do corte de leitura
- **Recursos/arquivos/serviços principais:** `firestore.rules`, emuladores Auth/Firestore e testes owner/outro usuário/lock
- **O que foi feito:** delete legado foi negado, leitura temporária preservada e caminhos canônicos mantidos; o Admin SDK continuou responsável pelas operações administrativas
- **Decisão ou trade-off:** fechar exclusão antes da leitura reduziu o risco de perda enquanto versões antigas ainda consultavam os dados
- **Validação, estado operacional e limites:** rules publicadas e testadas; não era ainda o fechamento definitivo
- **PRs/commits relacionados:** PR #109; commit/merge `4338629`
- **Fonte(s):** `RESUMO-STATUS.md` [C23-F3], `firestore.rules`
#### [C23-F4] — Cutover do cliente para armazenamento canônico

- **Data de início:** 27/08/2026
- **Data de conclusão:** 27/08/2026
- **Propósito:** parar normalização e exclusão automáticas do legado sem quebrar importação de backups antigos
- **Recursos/arquivos/serviços principais:** `firebase-firestore-internal.js`, `firebase-account-data-internal.js`, módulos de backup/migração e três entrypoints
- **O que foi feito:** os caminhos runtime legados foram retirados; helpers de leitura/importação retrocompatível foram isolados da persistência ativa
- **Decisão ou trade-off:** compatibilidade de recuperação foi mantida, mas compatibilidade operacional de leitura/escrita legada foi encerrada
- **Validação, estado operacional e limites:** testes de entrada e backup passaram; usuários foram observados antes da exclusão física
- **PRs/commits relacionados:** PR #110; commit/merge `5c6b337`
- **Fonte(s):** `RESUMO-STATUS.md` [C23-F4], `ROADMAP.md` seção C23
#### [C23-F5] — Janela observacional de sete dias

- **Data de início:** 27/08/2026
- **Data de conclusão:** data exata não determinada; a fonte registra sete dias completos
- **Propósito:** detectar ausência, duplicação ou regressão tardia antes de uma exclusão irreversível
- **Recursos/arquivos/serviços principais:** AAB intermediário, Play Console, aba Semana, dados canônicos e relatos dos testers
- **O que foi feito:** o build intermediário foi distribuído e os fluxos de dados foram observados sem nova escrita legada
- **Decisão ou trade-off:** tempo de observação foi usado como gate explícito, não como espera informal
- **Validação, estado operacional e limites:** a fonte registra ausência de erro, duplicação ou dado faltante; data final exata não foi preservada
- **PRs/commits relacionados:** sem PR funcional próprio determinado
- **Fonte(s):** `RESUMO-STATUS.md` [C23-F5], `ROADMAP.md` seção C23
#### [C23-F6] — Export, exclusão transacional e fechamento das rules

- **Data de início:** 27/08/2026
- **Data de conclusão:** 27/08/2026
- **Propósito:** eliminar apenas origens já verificadas e manter recuperação externa temporária
- **Recursos/arquivos/serviços principais:** `c23-legacy-delete.js`, `legacy-migration-delete.js`, `firestore.rules`, export gerenciado e bucket Madrid
- **O que foi feito:** o export `gs://trofia-firestore-exports-128834310181/c23-before-legacy-delete-20260827T163200Z` foi confirmado; os 54 legados foram excluídos e a contagem final ficou em zero; rules negaram leitura e escrita antigas
- **Decisão ou trade-off:** a exclusão só avançou depois de reconfirmar destinos e export; paths ativos não foram reabertos
- **Validação, estado operacional e limites:** zero documentos legados após a execução; lifecycle do export foi tratado em F7
- **PRs/commits relacionados:** PR #111; commit/merge `b8935be`
- **Fonte(s):** `RESUMO-STATUS.md` [C23-F6], `ROADMAP.md` seção C23
#### [C23-F7] — Documentação, compatibilidade de importação e retenção

- **Data de início:** 27/08/2026
- **Data de conclusão:** 28/08/2026
- **Propósito:** registrar o corte e limitar no tempo a cópia externa
- **Recursos/arquivos/serviços principais:** `ROADMAP.md`, inventário de bugs, importador de backup e lifecycle do bucket
- **O que foi feito:** novos backups passaram a exportar apenas `root` e `data`; importações antigas continuam promovendo `legacy`; C22 mantém busca defensiva por órfãos; o export recebeu retenção automática de 90 dias
- **Decisão ou trade-off:** compatibilidade foi mantida apenas na entrada de backup e na defesa administrativa, sem reabrir runtime legado
- **Validação, estado operacional e limites:** A01/A02/A03 foram encerrados; o bucket e sua política ficaram documentados
- **PRs/commits relacionados:** PR #112; merge `b7e0785`
- **Fonte(s):** `RESUMO-STATUS.md` [C23-F7], `ROADMAP.md` seção C23

#### Sequência C28 — SDK modular, cache e escrita offline

#### [C28-F1] — Coalescência imediata e CI uma vez por SHA

- **Data de início:** 28/08/2026
- **Data de conclusão:** 28/08/2026
- **Propósito:** reduzir leituras redundantes e evitar duplicar a suíte autenticada
- **Recursos/arquivos/serviços principais:** `.github/workflows/ci.yml`, `pages.yml`, `firebase-firestore-internal.js`
- **O que foi feito:** leituras óbvias foram coalescidas e os workflows passaram a compartilhar o resultado autenticado por SHA
- **Decisão ou trade-off:** quick wins foram separados do cutover para gerar baseline mensurável
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #113; merge `c9c5662`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F2] — Firebase App, Auth modular e ponte App Check

- **Data de início:** 28/08/2026
- **Data de conclusão:** 28/08/2026
- **Propósito:** criar instância modular compartilhada antes de trocar persistência
- **Recursos/arquivos/serviços principais:** `firebase-app-client.js`, `firebase-auth-sdk.js`, `app-check-client.js`, ESM
- **O que foi feito:** Auth modular, reCAPTCHA web e ponte Play Integrity foram preparados sem ativar ainda todo o cutover
- **Decisão ou trade-off:** fundação sem mudança prematura do contrato público
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #114; merge `cffec94`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F3] — Adaptador Firestore SDK mantendo a fachada

- **Data de início:** 28/08/2026
- **Data de conclusão:** 28/08/2026
- **Propósito:** substituir REST pelo SDK oficial sem exigir reescrita simultânea das telas
- **Recursos/arquivos/serviços principais:** `firebase-firestore-sdk.js`, cópia ESM e testes
- **O que foi feito:** get/set/delete/list foram implementados sobre o schema C23 atrás da API pública existente
- **Decisão ou trade-off:** fachada estável reduziu o risco do cutover
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #115; merge `ef19822`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F4] — IndexedDB e lifecycle de conta

- **Data de início:** 28/08/2026
- **Data de conclusão:** 28/08/2026
- **Propósito:** oferecer cache persistente sem replay entre contas
- **Recursos/arquivos/serviços principais:** `firebase-firestore-lifecycle.js`, IndexedDB multi-tab, limite 100 MB
- **O que foi feito:** Android e navegador confiável usam persistência; navegador não confiável usa memória; logout/troca/exclusão bloqueiam escrita, coordenam abas e limpam cache
- **Decisão ou trade-off:** fail-closed na limpeza foi preferido a expor dados da conta anterior
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #116; merge `04e8137`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F5] — Loaders cache-first e subscriptions deduplicadas

- **Data de início:** 29/08/2026
- **Data de conclusão:** 29/08/2026
- **Propósito:** não refazer Semana, calendário e recentes já carregados
- **Recursos/arquivos/serviços principais:** `history-loaders.js`, SDK e controlador
- **O que foi feito:** promessas por chave, TTL e subscriptions compartilhadas passaram a servir telas sobrepostas
- **Decisão ou trade-off:** cache é otimização observável; atualização do servidor continua chegando
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #117; merge `c8c2ac6`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F6A] — Identidade estável para mutações offline

- **Data de início:** 29/08/2026
- **Data de conclusão:** 29/08/2026
- **Propósito:** impedir duplicação ao repetir uma escrita
- **Recursos/arquivos/serviços principais:** `daily-entry-model.js`, controlador, `src/App.jsx`
- **O que foi feito:** entradas receberam IDs idempotentes e transformação pura por data/tipo
- **Decisão ou trade-off:** identidade foi criada antes da granularização
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #118; merge `3677181`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F6B] — Documentos granulares e rules

- **Data de início:** 29/08/2026
- **Data de conclusão:** 29/08/2026
- **Propósito:** evitar sobrescrita de um dia inteiro por autosaves concorrentes
- **Recursos/arquivos/serviços principais:** `firebase-firestore-sdk.js`, `firestore.rules`, subcoleções `meals/water/supplements`
- **O que foi feito:** cada entrada passou a documento com `schemaVersion`, `id`, `date`, `entry`, `updatedAt` e, para refeições, `mealKey`; lote atômico aplica diffs
- **Decisão ou trade-off:** granularidade aumenta documentos, mas reduz colisão e perda
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #119; merge `3178f3d`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F6C] — Leitura híbrida durante migração

- **Data de início:** 29/08/2026
- **Data de conclusão:** 29/08/2026
- **Propósito:** manter dados agregados antigos visíveis até a primeira mutação granular
- **Recursos/arquivos/serviços principais:** SDK, rules e `mergeCompatibleDailyEntries()`
- **O que foi feito:** leitor combina legado e granular por ID, preferindo o documento granular; marcador de migração impede ressurreição
- **Decisão ou trade-off:** retrocompatibilidade de leitura foi temporária e determinística
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #120; merge `8983ee4`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F6D] — Estados de sincronização e retry

- **Data de início:** 29/08/2026
- **Data de conclusão:** 29/08/2026
- **Propósito:** mostrar pendente/sincronizado/erro e permitir recuperação segura
- **Recursos/arquivos/serviços principais:** `firebase-sync-state.js`, lifecycle, SDK
- **O que foi feito:** operações são indexadas por `kind:date:entryId`; retries limitados preservam atomicidade e ignoram conclusão antiga quando nova escrita começou
- **Decisão ou trade-off:** não fingir sucesso durante desconexão
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PR #121; merge `b472acf`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot
#### [C28-F6E/F7/F8] — Cutover, backup e rollout offline-first

- **Data de início:** 29/08/2026
- **Data de conclusão:** 29/08/2026
- **Propósito:** retirar autosave agregado, integrar operações globais e provar o conjunto
- **Recursos/arquivos/serviços principais:** `daily-entry-persistence.js`, `meal-ga.js`, backup, lifecycle, emuladores e Android
- **O que foi feito:** consumidores migraram para diffs granulares; export online espera pending writes, offline declara fila; backup/restauração/exclusão coordenam o SDK; matriz cobriu meia-noite, multi-aba, reconexão, troca e aparelho
- **Decisão ou trade-off:** offline-first não significa que IA, busca externa ou exclusão funcionem sem rede
- **Validação, estado operacional e limites:** gates unitários/emuladores/CI e, no fechamento, medição/validação física; os limites descritos permanecem
- **PRs/commits relacionados:** PRs #122–#124; merges `0378cb9`, `52033be`, `9e19575`
- **Fonte(s):** `RESUMO-STATUS.md` C28, `ROADMAP.md`, Documento 2 deste snapshot

### 2.13 29–31/08/2026 — Controles S1–S8, C20, C19 e C08

#### [S1–S8] — Controles próprios de formulário

- **Data de início:** 29/08/2026
- **Data de conclusão:** 31/08/2026 para S8; S9 ainda não fazia parte
- **Propósito:** retirar aparência e idioma impostos por navegador/Android sem substituir o IME global
- **Recursos/arquivos/serviços principais:** `ChoiceField`, `SearchableChoiceField`, `TemporalField`, `DateField`, `NumericField`, `CheckboxField`, `SliderField`, testes Playwright
- **O que foi feito:** a sequência criou famílias reutilizáveis para seleção, busca, data, hora, quantidade, checkbox e range; cada migração preservou semântica HTML, foco, teclado, Escape, live regions e PT/EN/ES
- **Decisão ou trade-off:** keypad controlado ficou restrito aos campos específicos; o sistema não tentou trocar o teclado Android do aparelho
- **Validação, estado operacional e limites:** matriz desktop/mobile, claro/escuro e legado/Vite passou; commits `9a7194b`, `597457b` e PRs #126/#130/#133/#136/#138/#141/#144/#146/#148
- **PRs/commits relacionados:** PRs e commits citados; data/merge individual conforme `git log`
- **Fonte(s):** `2026-08-31-ui-campos-customizados.md`, `RESUMO-STATUS.md`
#### [C20-A–E] — Motor determinístico `meal-score-v2`

- **Data de início:** 30/08/2026
- **Data de conclusão:** 30/08/2026
- **Propósito:** calibrar uma nota 0–5 reproduzível, versionada e separada de texto generativo
- **Recursos/arquivos/serviços principais:** `meal-score.js`, `NUTRITION_SCORE.md`, snapshots, UI trilíngue e smoke autenticado
- **O que foi feito:** PR #129 definiu contrato e pesos; #131 calibrou curvas e parcela temporal; #132 integrou ao fluxo; #134 explicou cobertura/provisoriedade; #135 executou a matriz final. kcal e proteína pesam 25% cada, fibra 16%, sal 12%, carboidrato 12% e gordura 10%, com renormalização apenas entre componentes disponíveis
- **Decisão ou trade-off:** a IA pode explicar um snapshot, mas não recalcular a nota; uma revisão nutricional futura exige nova versão incompatível em vez de reinterpretar histórico
- **Validação, estado operacional e limites:** matriz PT/EN/ES, desktop/mobile e runtime duplo verde; merges `68d5e62`, `2af6cb4`, `e34a6f6`, `aaf4b16`, `24432cf`
- **PRs/commits relacionados:** PRs #129, #131, #132, #134 e #135
- **Fonte(s):** `NUTRITION_SCORE.md`, `RESUMO-STATUS.md` C20, histórico Principal

#### Sequência C19 — avaliação opcional e snapshot aceito

#### [C19-A] — Integridade e invalidação conservadora

- **Data de início:** 30/08/2026
- **Data de conclusão:** 30/08/2026
- **Propósito:** tornar a avaliação consultável sem comprometer a integridade do registro ou obrigar o uso de IA
- **Recursos/arquivos/serviços principais:** `meal-score.js`, `meal-review-ai.js`, modal, controlador, foto, Diário e testes
- **O que foi feito:** contrato agrupou itens por `mealEvaluationId`, exige snapshot comparável, esconde malformado, invalida o grupo ao editar/remover e duplica sem metadados de avaliação
- **Decisão ou trade-off:** preservar uma nota antiga para composição nova seria enganoso; a ausência do snapshot válido fecha a exibição
- **Validação, estado operacional e limites:** gates descritos na fatia passaram; o resultado permanece orientação contextual, não diagnóstico
- **PRs/commits relacionados:** PR #137; merge `16233c8`
- **Fonte(s):** `RESUMO-STATUS.md` C19, `NUTRITION_SCORE.md`, histórico Principal
#### [C19-B] — Avaliação opcional e retry contextual

- **Data de início:** 30/08/2026
- **Data de conclusão:** 30/08/2026
- **Propósito:** tornar a avaliação consultável sem comprometer a integridade do registro ou obrigar o uso de IA
- **Recursos/arquivos/serviços principais:** `meal-score.js`, `meal-review-ai.js`, modal, controlador, foto, Diário e testes
- **O que foi feito:** Registrar refeição continuou disponível; retry aparece apenas se a explicação da IA falhar, sem transformar a avaliação em gate
- **Decisão ou trade-off:** falha narrativa não invalida score local nem impede o registro
- **Validação, estado operacional e limites:** gates descritos na fatia passaram; o resultado permanece orientação contextual, não diagnóstico
- **PRs/commits relacionados:** PR #139; merge `34d3a1f`
- **Fonte(s):** `RESUMO-STATUS.md` C19, `NUTRITION_SCORE.md`, histórico Principal
#### [C19-C] — Integração no fluxo de fotografia

- **Data de início:** 30/08/2026
- **Data de conclusão:** 30/08/2026
- **Propósito:** tornar a avaliação consultável sem comprometer a integridade do registro ou obrigar o uso de IA
- **Recursos/arquivos/serviços principais:** `meal-score.js`, `meal-review-ai.js`, modal, controlador, foto, Diário e testes
- **O que foi feito:** a ação opcional foi adicionada à revisão C24, preservando Confirmar refeição como caminho direto
- **Decisão ou trade-off:** foto reconhecida e montagem manual compartilham score, mas a origem e o editor permanecem explícitos
- **Validação, estado operacional e limites:** gates descritos na fatia passaram; o resultado permanece orientação contextual, não diagnóstico
- **PRs/commits relacionados:** PR #140; merge `7d15f1d`
- **Fonte(s):** `RESUMO-STATUS.md` C19, `NUTRITION_SCORE.md`, histórico Principal
#### [C19-D] — Badge e detalhe somente leitura no Diário

- **Data de início:** 30/08/2026
- **Data de conclusão:** 30/08/2026
- **Propósito:** tornar a avaliação consultável sem comprometer a integridade do registro ou obrigar o uso de IA
- **Recursos/arquivos/serviços principais:** `meal-score.js`, `meal-review-ai.js`, modal, controlador, foto, Diário e testes
- **O que foi feito:** itens com o mesmo identificador são agrupados, recebem badge e abrem o snapshot aceito sem edição acidental
- **Decisão ou trade-off:** persistência serve como registro do que foi mostrado no aceite; não há recálculo silencioso posterior
- **Validação, estado operacional e limites:** gates descritos na fatia passaram; o resultado permanece orientação contextual, não diagnóstico
- **PRs/commits relacionados:** PR #142; merge `2d6be5b`
- **Fonte(s):** `RESUMO-STATUS.md` C19, `NUTRITION_SCORE.md`, histórico Principal
#### [C19-E] — Matriz final

- **Data de início:** 30/08/2026
- **Data de conclusão:** 30/08/2026
- **Propósito:** tornar a avaliação consultável sem comprometer a integridade do registro ou obrigar o uso de IA
- **Recursos/arquivos/serviços principais:** `meal-score.js`, `meal-review-ai.js`, modal, controlador, foto, Diário e testes
- **O que foi feito:** a integração foi repetida em PT/EN/ES, desktop/mobile e legado/Vite com CI autenticado
- **Decisão ou trade-off:** conclusão funcional não equivale a validação clínica externa do modelo
- **Validação, estado operacional e limites:** gates descritos na fatia passaram; o resultado permanece orientação contextual, não diagnóstico
- **PRs/commits relacionados:** PR #145; merge `623f63f`
- **Fonte(s):** `RESUMO-STATUS.md` C19, `NUTRITION_SCORE.md`, histórico Principal

#### Sequência C08 — política única para sete superfícies de IA

#### [C08-A] — Política versionada e matriz executável

- **Data de início:** 30/08/2026
- **Data de conclusão:** 30/08/2026
- **Propósito:** impedir que saídas generativas substituíssem regras nutricionais determinísticas ou inventassem dados ausentes
- **Recursos/arquivos/serviços principais:** `AI_NUTRITION_POLICY.md`, módulos `*-ai.js`, `ai-client.js`, Worker, schemas, fixtures e testes
- **O que foi feito:** PR #147 criou `c08-ai-nutrition-policy-v1`, definiu autoridade local, nutrientes, cobertura, idiomas e fronteiras dos sete usos
- **Decisão ou trade-off:** contratos estruturados são usados quando a saída alimenta dados; narrativos recebem contexto calculado e limites, sem autoridade sobre score/metas
- **Validação, estado operacional e limites:** gates unitários e autenticados passaram; a prova real foi controlada e não implica aconselhamento clínico nem disponibilidade offline
- **PRs/commits relacionados:** PR #147; merge `67514dd`
- **Fonte(s):** `AI_NUTRITION_POLICY.md`, `RESUMO-STATUS.md` C08, histórico Principal
#### [C08-B] — Ausente não é zero

- **Data de início:** 31/08/2026
- **Data de conclusão:** 31/08/2026
- **Propósito:** impedir que saídas generativas substituíssem regras nutricionais determinísticas ou inventassem dados ausentes
- **Recursos/arquivos/serviços principais:** `AI_NUTRITION_POLICY.md`, módulos `*-ai.js`, `ai-client.js`, Worker, schemas, fixtures e testes
- **O que foi feito:** PR #149 preservou `null`/desconhecido, separou zero declarado e passou a relatar cobertura exata em PT/EN/ES
- **Decisão ou trade-off:** contratos estruturados são usados quando a saída alimenta dados; narrativos recebem contexto calculado e limites, sem autoridade sobre score/metas
- **Validação, estado operacional e limites:** gates unitários e autenticados passaram; a prova real foi controlada e não implica aconselhamento clínico nem disponibilidade offline
- **PRs/commits relacionados:** PR #149; merge `dd27571`
- **Fonte(s):** `AI_NUTRITION_POLICY.md`, `RESUMO-STATUS.md` C08, histórico Principal
#### [C08-C] — Contratos estruturados de estimativa

- **Data de início:** 31/08/2026
- **Data de conclusão:** 31/08/2026
- **Propósito:** impedir que saídas generativas substituíssem regras nutricionais determinísticas ou inventassem dados ausentes
- **Recursos/arquivos/serviços principais:** `AI_NUTRITION_POLICY.md`, módulos `*-ai.js`, `ai-client.js`, Worker, schemas, fixtures e testes
- **O que foi feito:** PR #151 alinhou preenchimento por nome, descrição textual e foto ao `MealEstimate`, com schemas no Worker e hidratação/validação no cliente
- **Decisão ou trade-off:** contratos estruturados são usados quando a saída alimenta dados; narrativos recebem contexto calculado e limites, sem autoridade sobre score/metas
- **Validação, estado operacional e limites:** gates unitários e autenticados passaram; a prova real foi controlada e não implica aconselhamento clínico nem disponibilidade offline
- **PRs/commits relacionados:** PR #151; merge `d0914b1`
- **Fonte(s):** `AI_NUTRITION_POLICY.md`, `RESUMO-STATUS.md` C08, histórico Principal
#### [C08-D] — Feedback e padrões com minimização

- **Data de início:** 31/08/2026
- **Data de conclusão:** 31/08/2026
- **Propósito:** impedir que saídas generativas substituíssem regras nutricionais determinísticas ou inventassem dados ausentes
- **Recursos/arquivos/serviços principais:** `AI_NUTRITION_POLICY.md`, módulos `*-ai.js`, `ai-client.js`, Worker, schemas, fixtures e testes
- **O que foi feito:** PR #152 enviou metas/totais/cobertura necessários, retirando nome, idade, sexo e antropometria dos prompts narrativos quando não precisos
- **Decisão ou trade-off:** contratos estruturados são usados quando a saída alimenta dados; narrativos recebem contexto calculado e limites, sem autoridade sobre score/metas
- **Validação, estado operacional e limites:** gates unitários e autenticados passaram; a prova real foi controlada e não implica aconselhamento clínico nem disponibilidade offline
- **PRs/commits relacionados:** PR #152; merge `5c51fa5`
- **Fonte(s):** `AI_NUTRITION_POLICY.md`, `RESUMO-STATUS.md` C08, histórico Principal
#### [C08-E] — Despensa validada por IDs e explicação C19

- **Data de início:** 31/08/2026
- **Data de conclusão:** 31/08/2026
- **Propósito:** impedir que saídas generativas substituíssem regras nutricionais determinísticas ou inventassem dados ausentes
- **Recursos/arquivos/serviços principais:** `AI_NUTRITION_POLICY.md`, módulos `*-ai.js`, `ai-client.js`, Worker, schemas, fixtures e testes
- **O que foi feito:** PR #165 extraiu prompts, criou `/v1/ai/pantry-suggestions`, recusou IDs não existentes e alinhou a explicação ao snapshot definitivo
- **Decisão ou trade-off:** contratos estruturados são usados quando a saída alimenta dados; narrativos recebem contexto calculado e limites, sem autoridade sobre score/metas
- **Validação, estado operacional e limites:** gates unitários e autenticados passaram; a prova real foi controlada e não implica aconselhamento clínico nem disponibilidade offline
- **PRs/commits relacionados:** PR #165; merge `e12b464`
- **Fonte(s):** `AI_NUTRITION_POLICY.md`, `RESUMO-STATUS.md` C08, histórico Principal
#### [C08-F] — Prova adversarial e Gemini real

- **Data de início:** 31/08/2026
- **Data de conclusão:** 31/08/2026
- **Propósito:** impedir que saídas generativas substituíssem regras nutricionais determinísticas ou inventassem dados ausentes
- **Recursos/arquivos/serviços principais:** `AI_NUTRITION_POLICY.md`, módulos `*-ai.js`, `ai-client.js`, Worker, schemas, fixtures e testes
- **O que foi feito:** PR #167 cobriu idiomas, ausentes, respostas malformadas, injeção de prompt e quatro chamadas reais controladas; o Worker guarda apenas status/validade sanitizados
- **Decisão ou trade-off:** contratos estruturados são usados quando a saída alimenta dados; narrativos recebem contexto calculado e limites, sem autoridade sobre score/metas
- **Validação, estado operacional e limites:** gates unitários e autenticados passaram; a prova real foi controlada e não implica aconselhamento clínico nem disponibilidade offline
- **PRs/commits relacionados:** PR #167; merge `2547a19`
- **Fonte(s):** `AI_NUTRITION_POLICY.md`, `RESUMO-STATUS.md` C08, histórico Principal
#### [F06] — Incidente de conectividade em domínio compartilhado

- **Data de início:** não determinado, durante C19-D
- **Data de conclusão:** não resolvido na captura original
- **Propósito:** separar indisponibilidade de rede/ISP de regressão no score ou nos contratos C08
- **Recursos/arquivos/serviços principais:** domínio `workers.dev`, diagnóstico web e PR #143 draft
- **O que foi feito:** o incidente foi preservado separadamente e a migração para domínio próprio permaneceu proposta P02
- **Decisão ou trade-off:** não mascarar falha de transporte como defeito nutricional
- **Validação, estado operacional e limites:** causa específica do usuário/ISP não determinada; PR #143 não estava mesclado no recorte original
- **PRs/commits relacionados:** PR #143 draft na captura; sem merge associado
- **Fonte(s):** histórico Principal e `RESUMO-STATUS.md`

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

### 2.15 01–10/09/2026 — 0.11.0-beta, diálogos e edição do Diário

#### [C14-A] — Leituras e backup fail-closed

- **Data de início:** 01/09/2026
- **Data de conclusão:** 01/09/2026
- **Propósito:** impedir que erro de fetch/listagem aparecesse como coleção vazia e que export parcial fosse anunciado como sucesso
- **Recursos/arquivos/serviços principais:** `firebase-firestore-sdk.js`, `firebase-backup-internal.js`, testes UMD/ESM e histórico da build 12
- **O que foi feito:** erros passaram a ser propagados; exportação exige completude comprovada e mantém estado recuperável quando uma leitura falha
- **Decisão ou trade-off:** conteúdo incompleto é tratado como falha explícita, mesmo quando seria possível produzir um arquivo parcial
- **Validação, estado operacional e limites:** testes de runtime duplo passaram; PR #174 não encerrou toda C14
- **PRs/commits relacionados:** PR #174; implementação `bd62a32`, merge `141da41`
- **Fonte(s):** `RESUMO-STATUS.md` C14-A, `git log --first-parent`
#### [C14-B1] — Primeira barreira de rules

- **Data de início:** 01/09/2026
- **Data de conclusão:** 01/09/2026
- **Propósito:** negar delete da raiz pelo cliente e limitar envelopes canônicos sem fechar um schema ainda não inventariado
- **Recursos/arquivos/serviços principais:** `firestore.rules`, emuladores e CI
- **O que foi feito:** delete client-side foi removido; raiz/data receberam limite de 128 campos e o envelope `{value: string}` ficou limitado a 900.000 caracteres
- **Decisão ou trade-off:** endurecimento incremental foi escolhido para não bloquear dados legítimos antes do inventário Admin
- **Validação, estado operacional e limites:** rules e emuladores passaram; C22 continuou como único caminho administrativo de exclusão
- **PRs/commits relacionados:** PR #175; merge `8d2ddae`
- **Fonte(s):** `RESUMO-STATUS.md` C14-B1, `firestore.rules`
#### [C14-B2] — Schema completo com orçamento de expressões

- **Data de início:** 01/09/2026
- **Data de conclusão:** 07/09/2026
- **Propósito:** aplicar allowlists, tipos e tamanhos baseados nos dados reais
- **Recursos/arquivos/serviços principais:** `firestore.rules`, `C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`, Admin SDK, testes de emulador e leitor C19/C20
- **O que foi feito:** o primeiro deploy precisou rollback; a versão final valida somente chaves alteradas com `diff().affectedKeys()`, remove nutrientes duplicados de `foodSnapshot` e faz o leitor rejeitar componente malformado
- **Decisão ou trade-off:** a validação profunda dos seis componentes saiu das rules porque excedia o teto de 1.000 expressões; a fronteira foi dividida entre orçamento estrutural nas rules e validação fail-closed no leitor
- **Validação, estado operacional e limites:** run pós-deploy `33575611133` verde; segurança aumentou sem afirmar que todo documento histórico foi reescrito
- **PRs/commits relacionados:** PR #178; merge `80bc2ca`
- **Fonte(s):** `RESUMO-STATUS.md` C14-B2, `C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`
#### [S9] — Diálogo genérico acessível

- **Data de início:** 01/09/2026
- **Data de conclusão:** 01/09/2026
- **Propósito:** substituir cinco usos ativos de `alert`, `confirm` e `prompt`
- **Recursos/arquivos/serviços principais:** `GenericDialog`, portal, foco, Escape, Enter, Android Back e testes visuais
- **O que foi feito:** os cinco diálogos passaram a componente próprio com foco contido, estados bloqueados e comportamento responsivo
- **Decisão ou trade-off:** o componente unifica interação sem alterar contratos de dados
- **Validação, estado operacional e limites:** claro/escuro, responsividade e navegação passaram
- **PRs/commits relacionados:** PR #172; merge `f612de2`
- **Fonte(s):** `RESUMO-STATUS.md` S9, histórico UIUX
#### [DIARY-MENU-A/B/C + PHOTO-03] — Detalhes, edição, movimentação e recálculo proporcional

- **Data de início:** 09/09/2026
- **Data de conclusão:** 10/09/2026
- **Propósito:** permitir corrigir um item preservando sua identidade e sem manter avaliação incompatível
- **Recursos/arquivos/serviços principais:** `diary-screen.js`, menus de item, `meal-estimate-editor.js`, domínio proporcional e testes
- **O que foi feito:** PRs #182/#184 adicionaram detalhe somente leitura, edição e mudança de tipo/data; #186/#188 centralizaram recálculo de foto e descrição no mesmo domínio proporcional
- **Decisão ou trade-off:** edição invalida snapshot C19 quando a composição muda; quantidade altera nutrientes proporcionalmente, sem pedir nova estimativa generativa
- **Validação, estado operacional e limites:** gates funcionais passaram; o trabalho não inclui timeline I6 nem redesign integral do Diário
- **PRs/commits relacionados:** PRs #182, #184, #186, #188; merges `842b7de`, `cadad17`, `3cfe038`, `7069d4d`
- **Fonte(s):** `RESUMO-STATUS.md`, `git log --first-parent`

### 2.16 10–27/09/2026 — câmera contínua, resultado compartilhado e desktop

#### [CAM-RED-1] — Proposta A e protótipo sem runtime

- **Data de início:** não determinado
- **Data de conclusão:** 15/09/2026
- **Propósito:** decidir continuidade visual antes de alterar o fluxo físico
- **Recursos/arquivos/serviços principais:** protótipo externo HTML/CSS/JS, exports claro/escuro e referências One UI 8
- **O que foi feito:** foi aprovada a continuidade preview → foto congelada → análise → sheet, com reaproveitamento do resultado na busca manual
- **Decisão ou trade-off:** separar protótipo do hotfix evitou confundir aprovação visual com prova técnica
- **Validação, estado operacional e limites:** nenhum arquivo de runtime mudou; código de barras e base aberta ficaram fora
- **PRs/commits relacionados:** PR documental #202; merge `daa2140`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED-1, histórico UIUX
#### [CAM-RED-2] — Foto congelada antes de parar a câmera

- **Data de início:** 15/09/2026
- **Data de conclusão:** 15/09/2026
- **Propósito:** comprovar no Android que a primeira pintura ocorre antes de `stop()`
- **Recursos/arquivos/serviços principais:** `image-meal-flow.js`, `embedded-camera-preview.js`, Camera Preview 8.0.1, Galaxy e AAB Play v16
- **O que foi feito:** foto congelada, modos `off/auto/on/torch`, cancelamento, background e orientação passaram; dois crashes deixaram de ocorrer em três repetições por cenário
- **Decisão ou trade-off:** serialização anticrash foi preservada mesmo com foco em continuidade
- **Validação, estado operacional e limites:** prova física na instalação Play; não era ainda o palco final
- **PRs/commits relacionados:** PR #203; merge `caeb515`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED, `CAM-RED-9-AUDITORIA.md`, histórico UIUX
#### [CAM-RED-3] — Palco centralizado

- **Data de início:** 15/09/2026
- **Data de conclusão:** 16/09/2026
- **Propósito:** substituir card embutido pela composição aprovada
- **Recursos/arquivos/serviços principais:** componente de captura UMD/ESM, `image-meal-screen.js`, fluxo, controlador, CSS e i18n
- **O que foi feito:** backdrop aplica-se ao app, scroll é bloqueado, X da câmera e do reconhecimento são distintos e reduced-motion é respeitado
- **Decisão ou trade-off:** código de barras permaneceu fora; transparência e foco foram tratados sem reabrir C24
- **Validação, estado operacional e limites:** AAB Play v19 passou 6/6; bloqueio intermitente da v18 ficou sem causa confirmada
- **PRs/commits relacionados:** PR #207; merge `449ab9a`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED, `CAM-RED-9-AUDITORIA.md`, histórico UIUX
#### [CAM-RED-4] — Flash real, estado e reset

- **Data de início:** 16/09/2026
- **Data de conclusão:** 21/09/2026
- **Propósito:** evitar um botão de flash apenas decorativo
- **Recursos/arquivos/serviços principais:** plugin Camera Preview, `getSupportedFlashModes()`, `setFlashMode()`, fluxo, CSS, testes e Galaxy
- **O que foi feito:** o cliente detecta modos, anuncia estado e restaura `off` em captura, cancelamento, Back, background, timeout e desmontagem
- **Decisão ou trade-off:** acabamento residual fora das curvas foi explicitamente transferido à CAM-RED-5; função não foi adiada por estética
- **Validação, estado operacional e limites:** AAB Play v24 validou flash, reset e fechamento em claro/escuro
- **PRs/commits relacionados:** PR #227; merge `95a08bd`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED, `CAM-RED-9-AUDITORIA.md`, histórico UIUX
#### [CAM-RED-5] — Análise sobre a fotografia em tela cheia

- **Data de início:** 21/09/2026
- **Data de conclusão:** 22/09/2026
- **Propósito:** eliminar processamento inline e texto de fases não observadas
- **Recursos/arquivos/serviços principais:** componente de análise UMD/ESM, foto, overlay, safe areas, máscaras do preview e testes
- **O que foi feito:** máscaras ficaram opacas; análise inicia somente após primeira pintura e `stop()`; progresso é indeterminado e Cancelar permanece fixo
- **Decisão ou trade-off:** o Worker não informa fases, portanto a UI não inventa percentuais ou etapas
- **Validação, estado operacional e limites:** 1.440 unitários, matrizes, cutover 60/60, CI e AAB Play v25 passaram
- **PRs/commits relacionados:** PR #244; merge `087647f`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED, `CAM-RED-9-AUDITORIA.md`, histórico UIUX
#### [CAM-RED-6] — Timeout, erros acionáveis e retry

- **Data de início:** 22/09/2026
- **Data de conclusão:** 25/09/2026
- **Propósito:** encerrar carregamento infinito e permitir repetir sem nova captura
- **Recursos/arquivos/serviços principais:** `image-meal-client.js`, fluxo, AbortController/timers, i18n e testes
- **O que foi feito:** transport, timeout, indisponibilidade, resposta inválida, sessão e quota recebem categorias diferentes; retry reutiliza a foto e respostas tardias são ignoradas
- **Decisão ou trade-off:** nenhuma alteração de Worker/Auth/Firestore foi feita; a reautenticação usa contrato público
- **Validação, estado operacional e limites:** gates locais e dois HEADs de CI passaram
- **PRs/commits relacionados:** PR #246; merge `3b8bac0`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED, `CAM-RED-9-AUDITORIA.md`, histórico UIUX
#### [CAM-RED-7] — `MealResultSheet` e edição proporcional

- **Data de início:** 25/09/2026
- **Data de conclusão:** 27/09/2026
- **Propósito:** criar resultado reutilizável, acessível e editável
- **Recursos/arquivos/serviços principais:** `meal-result-sheet.js`, controlador de gesto, safe areas, editor/estimate, NumericField, ChoiceField
- **O que foi feito:** sheet abre em cerca de 68% e pode expandir; gesto e rolagem são coordenados; porção/ingredientes recalculam kcal e nutrientes imediatamente
- **Decisão ou trade-off:** o AAB v26 revelou contenção e recorte; a correção foi exigida no v27 antes do merge
- **Validação, estado operacional e limites:** CI e repetição física v27 claro/escuro passaram
- **PRs/commits relacionados:** PR #256; merge `fc8d4d0`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED, `CAM-RED-9-AUDITORIA.md`, histórico UIUX
#### [CAM-RED-8] — Busca manual no mesmo resultado

- **Data de início:** 27/09/2026
- **Data de conclusão:** 27/09/2026
- **Propósito:** eliminar duas UIs de revisão para foto e alimento salvo
- **Recursos/arquivos/serviços principais:** `add-screen.js`, adaptador manual, `meal-result-sheet.js`, controlador, i18n e testes
- **O que foi feito:** alimento salvo abre o mesmo sheet, preserva procedência, porção proporcional, avaliação, registro direto e montagem em lote
- **Decisão ou trade-off:** busca aberta e código de barras não foram incorporados por semelhança visual
- **Validação, estado operacional e limites:** preflight, 1.505 unitários, legado 129+10 skips, Vite 139 e cutover 60/60; CI autenticado passou
- **PRs/commits relacionados:** PR #277; merge `89f3c3b`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED, `CAM-RED-9-AUDITORIA.md`, histórico UIUX
#### [D1/D2] — Shell e Diário em telas largas

- **Data de início:** 09/09/2026
- **Data de conclusão:** 27/09/2026
- **Propósito:** usar espaço de desktop sem alterar a composição móvel
- **Recursos/arquivos/serviços principais:** shell, navegação, `diary-screen.js`, `one-ui.css`, breakpoints e Playwright
- **O que foi feito:** D1 retirou sobreposição do cabeçalho/navegação; D2 criou quatro cartões e trilho contextual em 1280/1440/1920 px
- **Decisão ou trade-off:** desktop recebeu composição própria, mas reutiliza domínio e dados do mobile
- **Validação, estado operacional e limites:** gates responsivos passaram; não equivale ao redesign I6
- **PRs/commits relacionados:** PRs #187, #270 e #272; merges `3ccb852`, `9d3eb03`, `dc41ad1`
- **Fonte(s):** `RESUMO-STATUS.md`, histórico UIUX, `git log`

### 2.17 12–26/09/2026 — hardening de Auth, App Check, Android e Worker

#### [C14-C1] — App Check em observação no Worker

- **Data de início:** 10/09/2026
- **Data de conclusão:** 10/09/2026
- **Propósito:** validar tokens e medir clientes antes de bloquear
- **Recursos/arquivos/serviços principais:** `firebase-app-check-token.js`, Worker, Wrangler e métricas sanitizadas
- **O que foi feito:** modo `observe` verificou assinatura/app permitido e registrou apenas resultado sanitizado
- **Decisão ou trade-off:** observar antes de exigir reduziu risco de bloquear clientes legítimos
- **Validação, estado operacional e limites:** smoke externo passou; sem enforcement
- **PRs/commits relacionados:** rollout C14-C; commit exato não determinado nesta fonte
- **Fonte(s):** `RESUMO-STATUS.md` C14, documentos C14 específicos, `git log --first-parent`
#### [C14-C2/C3] — Tokens nos sete clientes e provider de debug no CI

- **Data de início:** 10/09/2026
- **Data de conclusão:** 12/09/2026
- **Propósito:** anexar atestação sem transmitir conteúdo quando ela falha e preservar CI autenticado
- **Recursos/arquivos/serviços principais:** `app-check-client.js`, `ai-client.js`, imagem, sete superfícies, workflows e secret de debug
- **O que foi feito:** clientes passaram a enviar `X-Firebase-AppCheck`; o CI usa provider debug serializado e não token de produção
- **Decisão ou trade-off:** falha de atestação fecha antes da transmissão; debug existe apenas no lane autenticado
- **Validação, estado operacional e limites:** run `34478874949` verde
- **PRs/commits relacionados:** PR #189; merge `323610e`
- **Fonte(s):** `RESUMO-STATUS.md` C14, documentos C14 específicos, `git log --first-parent`
#### [C14-C4] — Prova Pages e AAB Play antes do bloqueio

- **Data de início:** 12/09/2026
- **Data de conclusão:** 15/09/2026
- **Propósito:** confirmar clientes reais sob modo observe
- **Recursos/arquivos/serviços principais:** Pages, AAB versionCode 16, Galaxy SM-S938B, ADB/logcat e App Check
- **O que foi feito:** login, descrição, foto e avaliação foram repetidos no web e no app instalado por `com.android.vending`, sem persistir refeição
- **Decisão ou trade-off:** o mesmo AAB já distribuído foi reutilizado para reduzir uploads; prova criptográfica de rejeição ficou para C5
- **Validação, estado operacional e limites:** Pages e aparelho passaram; sem inferir lançamento público
- **PRs/commits relacionados:** PR #191; merge `e118872`
- **Fonte(s):** `RESUMO-STATUS.md` C14, documentos C14 específicos, `git log --first-parent`
#### [C14-C5] — Enforcement obrigatório

- **Data de início:** 15/09/2026
- **Data de conclusão:** 15/09/2026
- **Propósito:** rejeitar IA sem atestação somente depois dos gates
- **Recursos/arquivos/serviços principais:** `worker/wrangler.jsonc`, verificador, workflow, Worker e AAB v16
- **O que foi feito:** `APP_CHECK_MODE=enforce` foi publicado; ausência retorna `401 app-check-required`; três fluxos legítimos passaram via ADB
- **Decisão ou trade-off:** rollback imediato estava preparado; rotação automática do aparelho não foi restaurada e gerou correção de checklist
- **Validação, estado operacional e limites:** run `35024249874`, Worker `cf6f8d82-...`; objetivo atingido com limite operacional documentado
- **PRs/commits relacionados:** PR #210; merge `f799a93`
- **Fonte(s):** `RESUMO-STATUS.md` C14, documentos C14 específicos, `git log --first-parent`
#### [C14-D] — Android release fail-closed

- **Data de início:** 16/09/2026
- **Data de conclusão:** 16/09/2026
- **Propósito:** proteger dados locais e tornar o AAB auditável
- **Recursos/arquivos/serviços principais:** AndroidManifest, `file_paths.xml`, Gradle, google-services, assinatura/hash e testes
- **O que foi feito:** Auto Backup, transferência de conta e cleartext foram negados; FileProvider ficou no cache privado; configuração, versão, assinatura e hash são verificados
- **Decisão ou trade-off:** não houve incremento de versionCode nem geração de AAB sem autorização
- **Validação, estado operacional e limites:** CI autenticado `35109617209` verde
- **PRs/commits relacionados:** PR #213; merge `fbb8486`
- **Fonte(s):** `RESUMO-STATUS.md` C14, documentos C14 específicos, `git log --first-parent`
#### [C14-E] — Sessão explícita e onboarding recuperável

- **Data de início:** 16/09/2026
- **Data de conclusão:** 16/09/2026
- **Propósito:** evitar conta parcial e persistência de sessão implícita
- **Recursos/arquivos/serviços principais:** `login-screen.js`, `profile-validation.js`, Firebase Auth modular, i18n e console
- **O que foi feito:** web usa `SESSION` por padrão e `LOCAL` apenas com Manter logado; Android preserva sessão; novas senhas exigem 12 caracteres; perfil incompleto retoma o fluxo
- **Decisão ou trade-off:** contas antigas permanecem compatíveis; Firebase ficou em modo Notificar, com enforcement futuro P11
- **Validação, estado operacional e limites:** CI final verde
- **PRs/commits relacionados:** PR #215; merge `b307d29`
- **Fonte(s):** `RESUMO-STATUS.md` C14, documentos C14 específicos, `git log --first-parent`
#### [C14-F1] — Tiers observados e telemetria sem conteúdo

- **Data de início:** 25/09/2026
- **Data de conclusão:** 26/09/2026
- **Propósito:** preparar limites comerciais e diagnóstico antes de cobrar ou abrir ao público
- **Recursos/arquivos/serviços principais:** Worker, Durable Object SQLite, HMAC, Analytics Engine, timeouts e Wrangler
- **O que foi feito:** UID recebeu pseudônimo HMAC; tiers foram observados, não cobrados; Gemini tem 40 s e 128 KB; métricas sanitizadas têm retenção documentada de até 30 dias
- **Decisão ou trade-off:** instrumentação não registra prompt/resposta; enforcement comercial ficou desligado até C30
- **Validação, estado operacional e limites:** versão `179df5a8` chegou a 100%, texto/imagem/despensa passaram com conta descartável e App Check
- **PRs/commits relacionados:** PR #257; merge `6293899`; rollout #262 `859f6fb`
- **Fonte(s):** `RESUMO-STATUS.md` C14, documentos C14 específicos, `git log --first-parent`

### 2.18 17–27/09/2026 — incidentes, backups e análises históricas

#### Incidentes autenticados e recuperação

- **O que foi feito:** a data civil do smoke autenticado foi corrigida (#222/#223); bootstrap, limpeza após idioma e perfil incompleto receberam diagnósticos e gates. Parte do perfil permaneceu em monitoramento e o incidente de reload continua aberto no resumo.
- **Evidência:** PRs #222–#242 e documentos `INC-*` no estado atual.

#### [BUG-BACKUP-D08/D09, PREVIEW-VITE e D13]

- **Data de conclusão:** 26–27/09/2026.
- **O que foi feito:** exportação/preview passaram a falhar fechado; leituras por data foram coalescidas, reduzindo a medição documentada de 1.793 para 623 requests; chaves históricas PT/EN/ES foram normalizadas apenas em memória para análise.
- **Evidência:** PRs #264, #274 e #271; merges `d617840`, `2d40a10` e `adc4dcf`.

### 2.19 28/09–09/10/2026 — carregamento, cadastro progressivo e C14-F2

#### [I1] — Carregamento com identidade e prontidão explícita

- **Data de início:** 22/09/2026
- **Data de conclusão:** 28/09/2026
- **Propósito:** tornar bootstrap visível sem esconder falha
- **Recursos/arquivos/serviços principais:** `index.html`, loading, CSS, i18n, Playwright e reduced-motion
- **O que foi feito:** marca, aura e progresso indeterminado aparecem por no mínimo 900 ms; erro inicial continua fail-closed. Uma falha Vite móvel foi atribuída ao harness que não aguardava `#loading`
- **Decisão ou trade-off:** corrigir o teste, não reduzir a duração aprovada nem esconder o estado
- **Validação, estado operacional e limites:** 1.513 unitários, legado 135+10 skips, Vite 145 e cutover 60/60; PR #280
- **PRs/commits relacionados:** PR #280; merge `b0e20f4`
- **Fonte(s):** `RESUMO-STATUS.md` I1
#### [I2] — Registro progressivo e recuperação de perfil

- **Data de início:** 22/09/2026
- **Data de conclusão:** 09/10/2026
- **Propósito:** apresentar uma decisão por etapa e criar conta só após revisão
- **Recursos/arquivos/serviços principais:** `login-screen.js`, `required-profile-modal.js`, ChoiceField/TemporalField, i18n e Playwright
- **O que foi feito:** credenciais e sete decisões — nome, nascimento, opção de cálculo, medidas, atividade, objetivo e revisão — foram separadas; checkpoint recupera perfil autenticado incompleto
- **Decisão ou trade-off:** nenhuma pergunta nova de restrição/preferência foi adicionada por suposição; backend não mudou
- **Validação, estado operacional e limites:** cinco recortes 63/63 em legado e Vite; CI real verde, sem alegar causa definitiva para incidentes antigos de loading
- **PRs/commits relacionados:** PR #293; merge `f09ac0b`
- **Fonte(s):** `RESUMO-STATUS.md` I2, `I2-REGISTRO-PROGRESSIVO.md`
#### [C14-F2] — IAM, identidades dedicadas e dependências

- **Data de início:** 26/09/2026
- **Data de conclusão:** 09/10/2026
- **Propósito:** reduzir privilégios com baseline, rollout por consumidor e rollback
- **Recursos/arquivos/serviços principais:** Cloud IAM/Run/Scheduler/Tasks/Artifact Registry, três Functions, `functions/src/config.js`, lockfiles e inventário
- **O que foi feito:** inventário encontrou Editor compartilhado e sete moderadas nas Functions; PRs #292/#298 isolaram processador/callable; reconciliador usa `trofia-del-reconcile`, Scheduler `trofia-scheduler-oidc`; as três builds migraram para `trofia-functions-build`; retry induzido, callable e execução natural do Scheduler foram comprovados; invocador Compute residual foi retirado
- **Decisão ou trade-off:** `roles/editor` não foi revogado sem decisão separada; deploy que alterou invocadores foi revertido à baseline antes de continuar
- **Validação, estado operacional e limites:** HTTP 200 sem 401/403, retry/limpeza com contas descartáveis e CI autenticado; residual Editor virou `SEC-IAM-EDITOR-RESIDUAL`
- **PRs/commits relacionados:** PRs #258, #265, #288, #292, #298–#300 e #311; merges até `75c5c0e`
- **Fonte(s):** `RESUMO-STATUS.md` C14-F2, `C14_F2_PRE_INVENTARIO_IAM_DEPENDENCIAS.md`
#### [C14-G] — CSP e remoção de debug global

- **Data de início:** 29/09/2026
- **Data de conclusão:** 04/10/2026
- **Propósito:** reduzir impacto de XSS sem quebrar Firebase, reCAPTCHA ou transporte do Worker
- **Recursos/arquivos/serviços principais:** `index.html`, storage, Vite, `verify-csp-policy.js`, Pages e testes browser
- **O que foi feito:** CSP meta restringiu destinos; helpers de debug foram condicionados; prova publicada confirmou login, Firestore, App Check e WebChannel sem violação
- **Decisão ou trade-off:** cabeçalho HTTP não era a fonte da meta CSP; o transporte WebChannel codifica cabeçalhos iniciais no POST, evitando falso negativo
- **Validação, estado operacional e limites:** CI autenticado e desktop/mobile no domínio real passaram
- **PRs/commits relacionados:** PR #294; merge `5dfff2a`
- **Fonte(s):** `RESUMO-STATUS.md` C14-G, `C14_G_CSP_DEBUG_ROLLOUT.md`

### 2.20 10–12/10/2026 — tema, criação e robustez final da câmera

#### [I3] — Política local de tema versão 2

- **Data de início:** 22/09/2026
- **Data de conclusão:** 10/10/2026
- **Propósito:** tornar claro o padrão sem retirar escolhas posteriores
- **Recursos/arquivos/serviços principais:** `theme-policy.js`, entrypoints, Configurações, localStorage, `prefers-color-scheme` e testes
- **O que foi feito:** a política aplica claro antes da primeira pintura, migra uma única vez instalações antigas e depois respeita `light`, `dark` ou `system`; Firebase não recebe a preferência
- **Decisão ou trade-off:** migração automática é única e versionada; o antigo `appDarkMode` deixou de ser autoridade
- **Validação, estado operacional e limites:** 68 focados, 1.529 completos, legado 177+10 skips, Vite 187, CSP e cutover 60/60; AAB interno 28 publicado
- **PRs/commits relacionados:** PR #321; merge `76b71eb`
- **Fonte(s):** `RESUMO-STATUS.md` I3, `I3-POLITICA-MIGRACAO-TEMA.md`
#### [CAM-RED-9] — Primeira pintura paralela e auditoria extrema

- **Data de início:** 10/10/2026
- **Data de conclusão:** 11/10/2026
- **Propósito:** reduzir latência percebida sem enfraquecer serialização anticrash
- **Recursos/arquivos/serviços principais:** captura, `meal-image-capture.js`, preview, trace monotônico, Playwright, Galaxy e AAB v29
- **O que foi feito:** a foto bruta passou a alimentar a primeira pintura enquanto JPEG 80%, 1280 px e limite 1,5 MB são processados em paralelo para IA; lifecycle, dois frames e `stop()` permaneceram
- **Decisão ou trade-off:** otimizar apenas o pré-processamento evitável; o trace não guarda conteúdo do usuário
- **Validação, estado operacional e limites:** 1.533 unitários, legado/Vite/cutover verdes e seis capturas físicas por tema; feedback visível em 1,256 s e análise com foto em 2,099 s delimitam, não decompõem, a percepção
- **PRs/commits relacionados:** PR #323; merge `9537a9d`
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED-9, `CAM-RED-9-AUDITORIA.md`
#### [I4-A] — Ação global, quatro caminhos e identidade instalada

- **Data de início:** 22/09/2026
- **Data de conclusão:** 12/10/2026
- **Propósito:** tornar criação encontrável e explicar a escolha antes de abrir o fluxo
- **Recursos/arquivos/serviços principais:** menu mobile/desktop, navegação, SVG `T + folha`, 19 PNGs Android/web, manifest, i18n e Playwright
- **O que foi feito:** foto, descrição, montagem manual e refeição salva abrem contratos existentes; fechamento cobre X, fundo, Escape e Back; foco retorna à origem. O mesmo PR gerou ícones legados, redondos, adaptativos e monocromáticos
- **Decisão ou trade-off:** código de barras não foi adicionado ao menu; identidade visual estática não recebeu texto/aura/animação
- **Validação, estado operacional e limites:** 125 focados, 1.556 unitários, legado 181+10, Vite 191, CSP, cutover 60/60 e recursos Android compilados
- **PRs/commits relacionados:** PR #332; merge `b00f7e5`
- **Fonte(s):** `RESUMO-STATUS.md` I4-A, `UI-VISUALS-FATIAMENTO.md`

### 2.21 09–30/10/2026 — staging parcial e fail-closed

#### [C14-H/T0] — Inventário e criação do projeto isolado

- **Data de início:** 09/10/2026
- **Data de conclusão:** não concluído em 01/11/2026
- **Propósito:** construir um ambiente separado sem permitir que configuração incompleta alcance produção
- **Recursos/arquivos/serviços principais:** `trofia-staging` número `31822846339`, auditoria, manifesto, verificadores, billing e Firebase/Cloud
- **O que foi feito:** a auditoria encontrou somente produção; foi criado projeto sem Analytics/Gemini opcionais, ligado à mesma conta pagadora, com alerta mensal de €1 em 50/90/100%. O build recusa staging enquanto origem, chave ou projeto ainda apontarem à produção
- **Decisão ou trade-off:** alerta não é teto de gasto; criar projeto não equivale a provisionar ambiente
- **Validação, estado operacional e limites:** preflight/CI e cutover passaram nas entregas; nenhum deploy de staging na T0
- **PRs/commits relacionados:** PRs #315, #317–#320; merge funcional #320 `240d4d4`
- **Fonte(s):** `C14_H_STAGING_AUDITORIA.md`, `RESUMO-STATUS.md` C14-H
#### [C14-H-WEB/FUNCTIONS/WORKER] — Fronteiras parametrizadas sem deploy

- **Data de início:** 11/10/2026
- **Data de conclusão:** 12/10/2026 para os recortes; C14-H aberta
- **Propósito:** impedir mistura de projeto em build, callable e Worker antes de criar recursos
- **Recursos/arquivos/serviços principais:** resolver Firebase/Vite, `.firebaserc`, Functions, `wrangler.jsonc`, scripts de fronteira e testes
- **O que foi feito:** Web recusa alvo e divergência build/runtime; Functions exige alvo e `GCLOUD_PROJECT` coerentes e conta local ao projeto; Worker declara ambientes/DO separados e rejeita origem/app ID de produção. Campos remotos ausentes continuam vazios
- **Decisão ou trade-off:** código de isolamento foi mesclado antes de recursos; fail-closed é o resultado esperado até completar o manifesto
- **Validação, estado operacional e limites:** PR #330 e #334 passaram CI; PR #336 comprovou Functions no CI. Nenhum Worker, DO, Function, Task, Scheduler ou IAM staging foi publicado
- **PRs/commits relacionados:** PRs #330, #334 e #336; merges `74a988a`, `6499845`; #336 estado/merge conforme fontes, sem deploy
- **Fonte(s):** `RESUMO-STATUS.md` C14-H, `C14_H_STAGING_AUDITORIA.md`
#### [C14-H-CSP] — CSP derivada do manifesto de staging

- **Data de início:** 12/10/2026
- **Data de conclusão:** 13/10/2026
- **Propósito:** garantir que o HTML staging não permita Worker, callable ou Auth de produção
- **Recursos/arquivos/serviços principais:** `index.html`, Vite, `verify-csp-policy.js`, `verify-staging-boundaries.js` e manifesto
- **O que foi feito:** Vite substitui destinos por origens exatas e rejeita vazio, wildcard ou mistura; verificador examina HTML transformado e vínculos fora da CSP
- **Decisão ou trade-off:** CSP concluída não desbloqueia build com manifesto incompleto
- **Validação, estado operacional e limites:** 12 focados, build, `npm test`, CSP Chromium, CI PR/main verdes; staging permaneceu sem deploy
- **PRs/commits relacionados:** PR #341; merge `364eb4d`
- **Fonte(s):** `RESUMO-STATUS.md` C14-H-CSP, `C14_G_CSP_DEBUG_ROLLOUT.md`
#### [C14-H-APPS] — Apps Web/Android, Auth e App Check próprios

- **Data de início:** 13/10/2026
- **Data de conclusão:** em andamento em 01/11/2026
- **Propósito:** criar identidades públicas exclusivas antes de qualquer publicação
- **Recursos/arquivos/serviços principais:** Firebase staging, apps, Hosting, Auth, reCAPTCHA Enterprise, App Check e manifesto
- **O que foi feito:** apps Web/Android e Hosting padrão foram registrados; chave pública, IDs, origem e site key restrita entraram no manifesto; Auth e-mail/senha foi inicializado; App Check web ficou sem enforcement
- **Decisão ou trade-off:** segredos/recursos ausentes continuam ausentes; Play Integrity Android não tem fingerprint/artefato distribuído
- **Validação, estado operacional e limites:** PR #343 e CI/main verdes; nenhum Worker/callable/Functions/IAM/enforcement/deploy
- **PRs/commits relacionados:** PR #343; merge `04a77bc`
- **Fonte(s):** `RESUMO-STATUS.md` C14-H-APPS
#### [C14-H-ANDROID/ISOLAMENTO] — Artefato e matriz remota ainda não iniciados

- **Data de início:** não iniciado
- **Data de conclusão:** não concluído
- **Propósito:** provar separação física e cross-account antes de rollout
- **Recursos/arquivos/serviços principais:** Gradle, google-services staging, Play Integrity, Worker/DO, Functions/Tasks/Scheduler/IAM, lane CI e runbooks
- **O que foi feito:** nenhum código/artefato final foi executado para estas subfatias no recorte
- **Decisão ou trade-off:** não reutilizar credenciais, dados ou recursos de produção; a matriz inclui App Check, payload, quota, cache, backup, exclusão e rollback
- **Validação, estado operacional e limites:** status planejado; ausência de prova é registrada como bloqueio, não como sucesso
- **PRs/commits relacionados:** sem PR funcional concluído
- **Fonte(s):** `RESUMO-STATUS.md` C14-H-ANDROID/ISOLAMENTO, `C14_H_STAGING_AUDITORIA.md`

### 2.22 01/11/2026 — correção de limite, folha Adicionar e Despensa

#### [BUG-DISH-DESCRIPTION-BOUNDARY] — Limites independentes para foto e descrição

- **Data de início:** não determinado
- **Data de conclusão:** 01/11/2026
- **Propósito:** impedir que descrição textual herdasse limite de itens da fotografia
- **Recursos/arquivos/serviços principais:** contratos de `dish-estimate`, validação Worker/cliente e testes
- **O que foi feito:** o máximo de itens passou a ser definido por superfície; descrição longa e foto deixaram de compartilhar restrição menor
- **Decisão ou trade-off:** separar limites preserva os schemas comuns sem assumir que as duas entradas têm a mesma ambiguidade
- **Validação, estado operacional e limites:** gates e documentação pós-merge passaram
- **PRs/commits relacionados:** PRs #345/#346; merges `f025e47`, `6f796b1`
- **Fonte(s):** `git log --first-parent`, Documento 2, histórico Principal
#### [I4-B] — Folha Adicionar, repetição recente e Undo

- **Data de início:** 12/10/2026
- **Data de conclusão:** 01/11/2026
- **Propósito:** coordenar destino, hora e atalhos depois da escolha do menu I4-A
- **Recursos/arquivos/serviços principais:** `add-screen.js`, sheet, ChoiceField, TemporalField, i18n, persistência e Playwright autenticado
- **O que foi feito:** cabeçalho recebe refeição/horário; repetição cria cópia com identidade própria e Undo remove somente a cópia; entrada manual e retorno ao contexto foram preservados. Fixture passou a exigir `time` e a provar fonte D−11/destino D−12
- **Decisão ou trade-off:** barcode continuou fora; o teste isola escritor, verificador e UI para não confundir cache com efeito
- **Validação, estado operacional e limites:** PR #337 passou preflight e CI com 1.571 unitários, legado 187+10 e Vite 197; CI da main também verde
- **PRs/commits relacionados:** PR #337 merge `3657dde`; closeout #347 merge `9ba057d`
- **Fonte(s):** `RESUMO-STATUS.md` I4-B, histórico Principal
#### [I8-A] — Shell navegável de Alimentos/Despensa

- **Data de início:** 11/10/2026
- **Data de conclusão:** 01/11/2026 no Git; documentação viva ainda contraditória
- **Propósito:** substituir acordeões por biblioteca com busca, segmentos e categorias sem alterar schema
- **Recursos/arquivos/serviços principais:** `pantry-screen.js`, controlador, modelos atuais, CSS, i18n, 26 PNGs, Playwright e Open Food Facts opcional
- **O que foi feito:** foram implementados cabeçalho/contagens reais, busca permanente, segmentos Alimentos/Refeições/Suplementos/Categorias, filtros locais, categorias derivadas e estados vazios; três consumidores de teste foram atualizados semanticamente. Um 503 deliberado do mock Open Food Facts foi filtrado somente para origem/status exatos
- **Decisão ou trade-off:** nenhuma persistência, editor ou fonte aberta nova foi criada; I8-B/C continuam separadas
- **Validação, estado operacional e limites:** preflight, 1.572 unitários, legado 185+10, Vite 195, CSP, cutover 60/60 e build 848 módulos passaram; PR #340 está mesclada, mas `RESUMO-STATUS.md`/`I8-ALIMENTOS-DESPENSA.md` ainda dizem em andamento
- **PRs/commits relacionados:** PR #340; merge/base `4e72767`
- **Fonte(s):** `RESUMO-STATUS.md` I8-A, `I8-ALIMENTOS-DESPENSA.md`, `git log --first-parent`

## 3. IMPLEMENTAÇÕES FUTURAS (PLANEJADAS OU AINDA NÃO CONCLUÍDAS EM 01/11/2026)

Esta seção separa rigorosamente código já mesclado de trabalho ainda aberto. Um item parcial descreve somente o restante comprovado; itens pós-lançamento não são apresentados como parte da versão atual.

### [C14-H] — Isolamento completo de staging e gate de segurança

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** terminar a revisão geral de segurança em ambiente separado antes do candidato público
- **Recursos/arquivos/serviços previstos:** Firebase staging, Worker/DO, Functions/Tasks/Scheduler/IAM, lane CI, Android staging, App Check, runbooks
- **Requisitos conhecidos:** provisionar recursos próprios; impedir mistura com produção; executar matriz cross-account, payload, quota, cache, backup, exclusão, IAM e rollback; produzir AAB distinguível e prova Play Integrity
- **Decisões e trade-offs já registrados:** o estado deve permanecer fail-closed enquanto qualquer campo remoto estiver ausente; apps/CSP parciais não contam como ambiente completo
- **Dependências, gates e limites:** C14-H-APPS, ANDROID e ISOLAMENTO; nenhum deploy público; C14 precisa fechar antes de C30/C16/C25
- **PRs/commits relacionados:** PRs #315–#343 cobrem preparação parcial; nenhum PR de fechamento
- **Fonte(s):** `C14_H_STAGING_AUDITORIA.md`, `RESUMO-STATUS.md`, `ROADMAP.md`
### [C26-A] — Toast interno seguro

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** corrigir posição, animação e feedback sensorial sem servidor
- **Recursos/arquivos/serviços previstos:** toast de conquista, safe areas, áudio, `@capacitor/haptics`, fila atual e web
- **Requisitos conhecidos:** respeitar notch/barra, elevar áudio dentro de limite seguro, vibração nativa com fallback silencioso e preservar fila
- **Decisões e trade-offs já registrados:** não transformar feedback local em notificação remota nem ignorar volume/acessibilidade do aparelho
- **Dependências, gates e limites:** pré-lançamento; depende de auditoria do toast existente, não de backend
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `ROADMAP.md` C26-A
### [C26-B] — Lembretes locais

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** oferecer água e check-ins no próprio aparelho com consentimento e reagendamento coerente
- **Recursos/arquivos/serviços previstos:** `@capacitor/local-notifications`, preferências, metas, água, idioma, fuso e deep links
- **Requisitos conhecidos:** consentimento por tipo; janela ativa/silenciosa; distribuir água pelo déficit/tempo; mensagens início/meio/fim do dia; cancelar/reagendar em toda mudança; preferir alarme inexato
- **Decisões e trade-offs já registrados:** push/FCM e tokens por dispositivo ficam fora; auditoria já concluiu que não existe implementação funcional atual
- **Dependências, gates e limites:** depende de C26-A e de contrato de reagendamento; gate pré-lançamento
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `ROADMAP.md` C26-B, `C26_B_LEMBRETES_LOCAIS_AUDITORIA.md`
### [C30-A–E] — Planos, cobrança e entitlements

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** formalizar monetização sem confiar no cliente ou no aparelho como fonte de verdade
- **Recursos/arquivos/serviços previstos:** Google Play Billing, backend de verificação, conta Trofia, notificações de ciclo de vida, reconciliação, política/Data Safety e testes
- **Requisitos conhecidos:** definir planos/preços/testers; verificar compra no servidor; estados idempotentes de pendência, grace, hold, expiração, revogação/reembolso; restaurar por conta; tratar duplicação/reordenação; validar faixa interna e rollback
- **Decisões e trade-offs já registrados:** benefício nunca é concedido por alegação do cliente; token de compra não entra no storage geral; tiers observados de C14-F1 não são cobrança ativa
- **Dependências, gates e limites:** só começa após C14 e Tarefa 0 comercial; bloqueia C16/C25 se monetização fizer parte do lançamento
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `ROADMAP.md` C30-A–E
### [C16/C25] — Documentação final e gate público

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** consolidar contratos operacionais e decidir a abertura pública somente com dependências fechadas
- **Recursos/arquivos/serviços previstos:** runbooks, segurança, suporte, CI, políticas, Android/Play, rollback e evidência de C14/C26/C30
- **Requisitos conhecidos:** C16 deve registrar arquitetura, manutenção, incidentes e operação; C25 verifica gates funcionais, compliance, candidato distribuído e rollback
- **Decisões e trade-offs já registrados:** documentação não substitui prova; release interna ou produção controlada de serviço não é lançamento público
- **Dependências, gates e limites:** dependem de C14, C26-A/B, C30 e documentos reconciliados; status parcial
- **PRs/commits relacionados:** sem PR de fechamento
- **Fonte(s):** `ROADMAP.md` posições 17–18
### [I4-C] — Pesquisa e bandeja de composição

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** montar refeição cumulativa sem duplicar o resultado nutricional
- **Recursos/arquivos/serviços previstos:** busca/filtros locais, bandeja, totais, `MealResultSheet`, i18n e testes
- **Requisitos conhecidos:** selecionar itens, revisar totais e abrir o sheet CAM-RED-8; barcode continua fora
- **Decisões e trade-offs já registrados:** reutilizar domínio de resultado em vez de criar um quinto editor
- **Dependências, gates e limites:** não iniciado; coordenação UIUX/Principal
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `RESUMO-STATUS.md` I4-C, `UI-VISUALS-FATIAMENTO.md`
### [I6-A–F] — Redesign completo do Diário

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** transformar a aba em cabeçalho, timeline, histórico e leitura detalhada sem misturar regras de domínio com aparência
- **Recursos/arquivos/serviços previstos:** Diário, calendário, loaders, água, suplementos, notas, macros/micros, sheets, sync e i18n
- **Requisitos conhecidos:** A: cabeçalho/resumo; B: timeline/água/Undo; C: semana/mês; D: nutrientes/atalhos IA; E: doses/notas temporizadas após auditoria de schema; F: detalhe expansível reutilizando edição/score
- **Decisões e trade-offs já registrados:** qualquer schema/rules necessário é pré-requisito da frente Principal; uma expansão por vez e contratos existentes devem ser reutilizados
- **Dependências, gates e limites:** I6-A constava em andamento documental, mas sem código iniciado; demais não iniciadas
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `RESUMO-STATUS.md` I6, `UI-VISUALS-FATIAMENTO.md`
### [I7] — Gamificação opcional

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** tornar consistência visível sem impor julgamento ou coleta nova
- **Recursos/arquivos/serviços previstos:** classificação diária, agregados semanais/mensais, Configurações, metas e i18n
- **Requisitos conhecidos:** contador ativo por padrão com opção de desligar; estados meta/parcial/sem registros; mensagens derivadas das metas existentes
- **Decisões e trade-offs já registrados:** regras de domínio não podem ser implementadas como detalhe visual do calendário
- **Dependências, gates e limites:** protótipo e aprovação ainda pendentes
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `RESUMO-STATUS.md` I7
### [I8-B/C] — Ações da biblioteca e busca unificada

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** completar a Despensa além do shell já mesclado
- **Recursos/arquivos/serviços previstos:** `pantry-screen.js`, cards, stepper, recálculo, favoritos, Undo, base aberta e persistência
- **Requisitos conhecidos:** I8-B: expansão, porções, editar/excluir/Undo e ações; I8-C: local imediato + base aberta debounced, salvar externo e estados de erro
- **Decisões e trade-offs já registrados:** barcode e redesign de `+ Novo` permanecem fora; fonte aberta é opcional e não deve esconder itens locais
- **Dependências, gates e limites:** I8-A precisa ter documentação reconciliada; B/C não iniciadas
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `RESUMO-STATUS.md` I8, `I8-ALIMENTOS-DESPENSA.md`
### [I9/I10] — Redesign de Semana e Métricas

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** reorganizar análise semanal e corporal sem alterar fórmulas silenciosamente
- **Recursos/arquivos/serviços previstos:** agregadores, metas históricas, gráficos, medidas, previsões, i18n e pacotes UI
- **Requisitos conhecidos:** I9 preserva sete dias concluídos e banco por meta de cada data; I10 separa acompanhamento, metas e relatórios
- **Decisões e trade-offs já registrados:** hoje não deve contaminar médias fechadas; relatório em manutenção não pode ser apresentado como disponível
- **Dependências, gates e limites:** não iniciadas no recorte
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `RESUMO-STATUS.md`, `UI-VISUALS-FATIAMENTO.md`
### [CAM-RED-10] — Validação final pela Play

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** encerrar o redesenho somente no mesmo artefato entregue aos testers
- **Recursos/arquivos/serviços previstos:** Gradle/Capacitor, AAB assinado, faixa interna, Galaxy, CI e lifecycle
- **Requisitos conhecidos:** repetir câmera, flash, captura, análise, retry, resultado, registro, temas e background após gates completos
- **Decisões e trade-offs já registrados:** as provas das fatias anteriores não substituem o gate final conjunto
- **Dependências, gates e limites:** não iniciado; depende do estado final das superfícies integradas
- **PRs/commits relacionados:** sem PR funcional
- **Fonte(s):** `RESUMO-STATUS.md` CAM-RED-10
### [C15] — Refatoração e remoção das pontes UMD/ESM

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** concluir a limpeza que a modularização de julho deixou incompleta
- **Recursos/arquivos/serviços previstos:** composition root, controlador, módulos UMD/ESM, suíte legado/Vite e importação de backups
- **Requisitos conhecidos:** vários PRs pequenos; aposentar loader/matriz legado somente no cutover final; manter import antigo por duas versões públicas e remover com anúncio/teste
- **Decisões e trade-offs já registrados:** o trabalho de 16–28/07 é precursor, não execução de C15; não iniciar por inferência
- **Dependências, gates e limites:** pós-lançamento e estimativa histórica 6–10 semanas/8–12 PRs; depende de Tarefa 0
- **PRs/commits relacionados:** sem PR funcional de C15
- **Fonte(s):** `ROADMAP.md` C15, históricos de julho
### [PÓS-LANÇAMENTO 19–39] — Recursos e plataformas do grupo B

- **Status:** planejado ou ainda aberto em 01/11/2026.
- **Propósito:** preservar a sequência futura sem confundir planejamento com funcionalidade atual
- **Recursos/arquivos/serviços previstos:** N01 voz; C21 porções GA; C29 reclassificação; N03 rótulo; N09 jejum; C17 e-mail; C13 feedback; C10/N07 relatórios/compartilhamento; N02 base; N05 recalibração; C27 widget; N04/N06 receitas/planejamento; C12 iOS; C18 saúde; N08 exercícios
- **Requisitos conhecidos:** cada item exige Tarefa 0, fonte/licença/privacidade quando aplicável e dependências descritas na sequência 19–39
- **Decisões e trade-offs já registrados:** não transportar automaticamente contratos Android/web para voz, iOS, saúde ou billing; não criar persistência nova sem schema/rules/exclusão
- **Dependências, gates e limites:** todos permanecem pós-lançamento, não iniciados ou parciais conforme `ROADMAP.md`; não pertencem à versão retratada
- **PRs/commits relacionados:** PRs futuros não determinados
- **Fonte(s):** `ROADMAP.md` sequência única, posições 19–39

## 4. Contradições e limites não resolvidos

1. I8-A está mesclada no Git, mas a documentação viva ainda a classifica como em andamento.
2. `VERSIONING.md` preserva rótulos históricos de “estado atual” da 0.9.0-beta, enquanto `package.json` e Android nomeiam 0.11.0-beta.
3. `versionCode` distribuído internamente não é determinável apenas pelo `android/app/build.gradle` versionado.
4. Alguns incidentes de reload/sessão e perfil permanecem em investigação ou monitoramento; testes verdes não provam causa eliminada.
5. Staging parcial não equivale a ambiente operacional completo, e rollouts controlados de serviços não equivalem a lançamento público.

## 5. Fontes históricas consolidadas

- snapshot imutável de 01/09/2026;
- `documentation/estado-atual/`, especialmente `RESUMO-STATUS.md`, `ROADMAP.md`, `BUG-INVENTORY.md`, `C14_*`, `I2-*`, `I3-*`, `I8-*` e `UI-VISUALS-FATIAMENTO.md`;
- `documentation/historico/2026-08-31-principal-arquitetura-ia-dados.md`, `2026-08-31-ui-campos-customizados.md` e histórico de bugs;
- `git log --first-parent`, 165 merges posteriores à PR #176 e os commits citados em cada marco;
- metadados das PRs mescladas e checks registrados nos documentos pós-merge.
