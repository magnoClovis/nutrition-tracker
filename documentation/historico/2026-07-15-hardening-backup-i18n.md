# Histórico da frente — hardening 0.7.5, backup seletivo e internacionalização 0.8.0

## Escopo, fonte e critério de atribuição

Este documento registra somente o trabalho que pode ser atribuído a esta conversa específica, iniciada durante a estabilização da versão `0.7.5-beta` e encerrada, para fins desta cronologia, após os ajustes de idioma de 15/07/2026. A fonte primária para determinar **o que foi tratado nesta frente** é a memória preservada da própria conversa. Datas, arquivos e detalhes verificáveis foram cruzados com `git log`, `git show`, o conteúdo atual de `documentation/estado-atual/ROADMAP.md` e `documentation/estado-atual/BUG-INVENTORY.md`.

O histórico anterior a 16/07/2026 foi desenvolvido majoritariamente no aplicativo monolítico. Por isso, muitos recursos aparecem simultaneamente em `app.js` e `nutrition-tracker.jsx`, que funcionavam como implementações espelhadas, além de pequenos ajustes de cache em `index.html`. A presença de um arquivo na lista de um item significa que ele foi criado ou alterado no commit histórico citado; não significa que esse arquivo continue sendo a localização atual do recurso após as refatorações posteriores.

Uma pequena parte do trabalho neste projeto pode ter sido realizada em sessões do Codex executadas em outro computador e sincronizadas posteriormente via Git. Nesses casos raros, nenhuma conversa específica consegue confirmar autoria com certeza apenas pela própria memória; somente o commit serve como evidência de que a mudança ocorreu. Isso aconteceu poucas vezes e tem impacto limitado nesta cronologia. Sempre que houver esse tipo de incerteza, ela é declarada, nunca inferida silenciosamente.

Os commits desta fase são commits diretos, anteriores ao fluxo consistente de pull requests usado mais tarde no projeto. Não foi identificado PR específico para eles. O commit consolidado `1162456` foi criado em 13/07/2026 às 22:11:46 UTC+2 e reúne diversas entregas da versão `0.8.0-beta`; sua amplitude não prova que todas as linhas foram escritas por esta conversa. Por isso, cada seção distingue contribuição conversacional, evidência do Git e eventual sobreposição com outras frentes.

## Linha do tempo resumida

- **18–20/06/2026:** estabilização da `0.7.5-beta`, métricas corporais e notificações de metas.
- **01/07/2026:** correções das sugestões, bancada independente do algoritmo genético, proteção de encoding e hardening da `0.7.5`.
- **13/07/2026:** consolidação da `0.8.0-beta`, backup seletivo, internacionalização, smoke tests e documentação operacional.
- **14–15/07/2026:** correções visuais, loading, Métricas e acabamento do seletor de idiomas.

---

## C01 - Correções iniciais de renderização e layout

**Data (se determinável):** não determinada com precisão; trabalho anterior ou concomitante à estabilização de 18–20/06/2026.

**Propósito:** restaurar superfícies essenciais que apareciam vazias ou visualmente corrompidas, principalmente Semana, Métricas e o acesso a alimentos salvos. O objetivo era impedir que dados existentes parecessem ausentes por falha de renderização e devolver uma hierarquia visual utilizável ao painel de itens salvos.

**Recursos:** React carregado no navegador, JavaScript/JSX, CSS embutido e persistência Firebase já existente.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`; em ajustes posteriores de apresentação, `one-ui.css`.

**O que foi feito:** foram investigados os caminhos de troca de abas e os blocos condicionais responsáveis por montar cada tela. A frente corrigiu estados em que Semana e Métricas permaneciam montadas sem conteúdo visível e reorganizou o painel de alimentos/refeições salvos, cujos controles e itens se espalhavam horizontalmente ou perdiam a estrutura ao expandir. A correção preservou os dados e concentrou-se na montagem e na composição visual. O acabamento posterior do acesso a refeições salvas e do espaçamento dos cards aparece no commit `f662282`; o Git, porém, não permite separar com certeza absoluta quais ajustes iniciais já estavam nos commits genéricos da `0.7.5`.

**PRs/commits relacionados:** commits de base `374fb82` (`v0.7.5 Beta`) e `36a1cc7` (`v0.7.5 updated (stable)`), com acabamento identificável em `f662282` (`Fix meal card spacing and saved meal access`). PR não identificado.

## C03 - Continuidade visual do loading e prevenção de flicker

**Data (se determinável):** 13–14/07/2026; correção final identificável em 14/07/2026 às 12:22:38 UTC+2.

**Propósito:** evitar a tela preta ou a troca abrupta de fundo entre o bootstrap, a autenticação, a aplicação do tema e a primeira renderização do aplicativo. A animação de carregamento deveria permanecer contínua até a interface estar pronta.

**Recursos:** HTML de bootstrap, CSS, `localStorage`, inicialização React e preferência de tema persistida.

**Arquivos:** `index.html`; partes do estado de inicialização em `app.js` e `nutrition-tracker.jsx` foram consolidadas no commit da `0.8.0-beta`.

**O que foi feito:** a preferência visual passou a ser aplicada antes de a tela de loading ser pintada, reduzindo a janela em que o navegador exibia um fundo incompatível com o tema salvo. O fluxo foi organizado para não desmontar prematuramente o indicador de carregamento enquanto autenticação, dados e interface ainda estavam sendo preparados. A correção final, isolada em `023691a`, modificou apenas `index.html`, tornando o tema disponível antes do primeiro paint; isso corresponde ao item C03 hoje marcado como concluído no roadmap.

**PRs/commits relacionados:** `1162456` (`Version 0.8.0 Beta`) e `023691a` (`Apply saved theme before loading screen paints`). PR não identificado.

## C26 - Toasts de conquista para metas nutricionais

**Data (se determinável):** 20/06/2026 às 19:33:46 UTC+2.

**Propósito:** fornecer retorno imediato e não bloqueante quando o usuário atingisse uma meta diária, sem interromper a entrada de refeições nem exigir confirmação em modal.

**Recursos:** React, CSS animations/transitions, estado local do navegador, dados de metas e totais nutricionais calculados pelo aplicativo.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`.

**O que foi feito:** foi criado um sistema de notificação que observa a passagem de cada métrica de um valor abaixo da meta para um valor igual ou superior. O aviso desliza do topo, permanece visível por aproximadamente cinco segundos e retorna para fora da tela, mantendo o restante da aplicação interativo. Foram elaborados conjuntos de cinco frases por contexto, misturando tom natural, positivo e humor discreto, com escolha aleatória para reduzir repetição. O conteúdo apresenta a métrica, o valor atual, a meta e o percentual atingido. A implementação adicionou aproximadamente 507 linhas combinadas aos dois espelhos do aplicativo.

**PRs/commits relacionados:** `7903687` (`Objectives Notifications v0.7.5beta`). PR não identificado.

## C26 - Som discreto e vibração das notificações de meta

**Data (se determinável):** 20/06/2026 às 19:52:46 UTC+2.

**Propósito:** reforçar a percepção de conquista em dispositivos móveis e em situações em que o usuário não estivesse olhando diretamente para o toast, sem transformar a notificação em uma interrupção agressiva.

**Recursos:** Web Audio API, `navigator.vibrate` quando disponível, detecção de capacidades do navegador e fallbacks silenciosos.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`.

**O que foi feito:** foi adicionado um tom curto gerado localmente, sem arquivo de áudio externo, e uma vibração breve condicionada ao suporte do dispositivo. Os efeitos são disparados junto com a notificação visual e não bloqueiam o thread de interação. Navegadores sem permissão, sem Web Audio ou sem API de vibração simplesmente seguem sem esses sinais, preservando a funcionalidade principal.

**PRs/commits relacionados:** `1ef0cc4` (`Notification sounda v0.7.5 beta`). PR não identificado.

## C26 - Controle local diário contra notificações duplicadas

**Data (se determinável):** 20/06/2026, incorporado ao ciclo dos commits `7903687` e `1ef0cc4`.

**Propósito:** impedir que editar, remover e recolocar alimentos ou recarregar a página gerasse repetidamente a mesma celebração no mesmo dia, sem criar uma coleção diária adicional no Firestore.

**Recursos:** armazenamento local do navegador, chave civil do dia e estado React.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`.

**O que foi feito:** o navegador passou a registrar quais categorias já haviam disparado naquele dia. A chave inclui a data, de modo que o mesmo conjunto é naturalmente renovado na mudança do dia sem criar variáveis permanentes ou documentos no banco. Essa decisão foi tomada explicitamente para manter o recurso local, simples e sem custo de escrita remota; a consequência é que dispositivos ou navegadores diferentes possuem controles independentes.

**PRs/commits relacionados:** `7903687` e `1ef0cc4`. PR não identificado.

## Restauração dos resultados de sugestões alimentares

**Data (se determinável):** 01/07/2026 às 12:00:01 UTC+2.

**Propósito:** corrigir o fluxo em que a barra de progresso terminava, mas nenhuma sugestão aparecia, fazendo uma busca concluída parecer vazia.

**Recursos:** JavaScript, React, algoritmo genético local e estado assíncrono da interface.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`.

**O que foi feito:** a frente revisou a transição entre execução do algoritmo, atualização do progresso e armazenamento/renderização das soluções. O resultado deixou de ser descartado ao término da barra e voltou a alimentar os cards de sugestões. Também foram reforçados os estados de conclusão e ausência real de solução, evitando confundir falha de apresentação com resultado matematicamente vazio.

**PRs/commits relacionados:** `39b5ef7` (`fixing recomendations`) e pequeno complemento `8b4004b` (`small fixes`). PR não identificado.

## Detalhamento nutricional das opções sugeridas

**Data (se determinável):** 01/07/2026.

**Propósito:** devolver ao usuário os dados necessários para comparar sugestões, em vez de apresentar somente nomes e quantidades de alimentos.

**Recursos:** totais nutricionais calculados localmente, metas diárias, estado do diário e cards React.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`.

**O que foi feito:** cada item da combinação voltou a mostrar calorias e proteína; cada opção passou a expor total de energia e proteína, percentual do restante usado, situação projetada do dia após o consumo e excedentes absolutos quando alguma meta seria ultrapassada. As opções também receberam indicação relativa de qualidade, como melhor opção ou uma das melhores, com base no ajuste calculado. O objetivo não foi declarar uma refeição clinicamente boa, mas tornar transparente a relação entre a combinação e as metas configuradas.

**PRs/commits relacionados:** `39b5ef7` e `8b4004b`. PR não identificado.

## Limites dinâmicos por alimento no algoritmo de sugestões

**Data (se determinável):** 01/07/2026.

**Propósito:** impedir soluções absurdas quando o usuário informasse um máximo global extremamente alto e, ao mesmo tempo, evitar um teto fixo arbitrário para todos os alimentos.

**Recursos:** algoritmo genético em JavaScript, dados nutricionais da despensa, limites de calorias/proteína e unidade de medida dos alimentos.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`; infraestrutura comparativa em `tests/ga/algorithms.js`, `tests/ga/scenarios.js` e `tests/ga/benchmark.js`.

**O que foi feito:** antes de gerar combinações, o algoritmo passou a calcular um máximo individual para cada alimento. O máximo definido pelo usuário continua sendo o limite superior desejado, mas é reduzido quando aquela quantidade, sozinha, estouraria os limites absolutos relevantes. Para cadastros com calorias ou proteína ausentes/zeradas, foi mantida uma proteção de último recurso de 2.000 g/ml ou 100 unidades, aplicada somente quando os dados não permitiam derivar um limite nutricional confiável. O fracionamento abaixo do passo de porção existente foi deliberadamente adiado; o teto foi implementado sem acoplar a futura estratégia de porções fracionadas.

**PRs/commits relacionados:** `39b5ef7` e `8b4004b`. PR não identificado.

## Bancada isolada para comparação de algoritmos de recomendação

**Data (se determinável):** 01/07/2026.

**Propósito:** permitir testes rápidos, repetíveis e estatisticamente comparáveis sem modificar nem arriscar o algoritmo em produção.

**Recursos:** JavaScript executável em Node.js e navegador, HTML estático, cenários determinísticos e exportação de resultados.

**Arquivos:** `tests/ga/README.md`, `tests/ga/algorithms.js`, `tests/ga/benchmark-browser.html`, `tests/ga/benchmark.js`, `tests/ga/scenarios.js`.

**O que foi feito:** foram implementados cenários normais, prioridade de proteína, déficit agressivo, despensa escassa, despensa com pouca proteína, máximo global hostil e limites impossíveis. A bancada compara baseline, algoritmo genético com tetos e beam search, registrando taxa de sucesso, soluções absurdas, ausência de solução, tempo médio, erro de calorias, erro de proteína, pior valor calórico e exemplo de combinação. A página HTML tornou os testes acessíveis sem depender da UI principal e recebeu correções para que os botões de executar e baixar funcionassem em contexto local.

**PRs/commits relacionados:** `39b5ef7`. PR não identificado.

## C01 - Proteção de encoding e correção de mojibake

**Data (se determinável):** 01/07/2026, consolidada em 13/07/2026.

**Propósito:** interromper a recorrência de mojibake, títulos corrompidos e caracteres acentuados convertidos incorretamente quando bytes UTF-8 eram interpretados como Latin-1 por editores ou scripts.

**Recursos:** UTF-8, Git attributes, EditorConfig, PowerShell de auditoria e script JavaScript de inspeção de i18n.

**Arquivos:** `.editorconfig`, `.gitattributes`, `scripts/check-encoding.ps1`, `scripts/audit-i18n.js`, `.gitignore`, `app.js`, `nutrition-tracker.jsx`; o temporário `app.js.encoding-backup-20260630-191340.bak` foi criado em `39b5ef7` e removido em `1162456`.

**O que foi feito:** o repositório passou a declarar codificação e finais de linha esperados, ganhou uma verificação dedicada para padrões conhecidos de mojibake e recebeu correções nas strings já corrompidas. A tradução posterior foi estruturada em mapas e função de resolução de texto, reduzindo substituições binárias espalhadas pelo código. O arquivo de backup usado durante a recuperação foi explicitamente removido antes da consolidação da `0.8.0-beta`, evitando manter uma cópia de 14 mil linhas no produto.

**PRs/commits relacionados:** `39b5ef7`, `1162456`. Este trabalho corresponde ao C01 hoje concluído; PR não identificado.

## Recalculo de metas ao editar treino/descanso em datas passadas

**Data (se determinável):** não determinada com precisão; consolidado antes ou no commit `1162456`.

**Propósito:** garantir que alterar um dia histórico entre treino e descanso reajustasse as metas daquele dia, sem aplicar cegamente as metas atuais.

**Recursos:** histórico do perfil, peso/altura aplicáveis, cálculo de gasto energético, snapshots de metas e chaves de data civil.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `firebase-storage.js`.

**O que foi feito:** o fluxo histórico passou a recalcular proteína e energia ao mudar o tipo do dia e a persistir o resultado para a data visualizada. A implementação buscou usar os dados disponíveis para aquele período e preservar snapshots existentes quando apropriado. Ela não deve ser confundida com o problema histórico posterior catalogado como `A10`, no qual determinadas arquiteturas podiam gravar uma meta visualizada em `goalHistory[TODAY]`; esse risco foi identificado depois e não é reivindicado como integralmente resolvido por esta frente.

**PRs/commits relacionados:** `1162456`; commits anteriores exatos não determinados. PR não identificado.

## C01 - Datas sem duplicação e estatísticas retroativas

**Data (se determinável):** consolidado em 13/07/2026; ajuste adicional de histórico em 14/07/2026 às 17:36:59 UTC+2.

**Propósito:** exibir uma única data no formato `dd-mm-aaaa`, atualizar linhas de meta e fazer registros adicionados retroativamente participarem novamente das médias e estatísticas.

**Recursos:** objetos `Date`, chaves civis `YYYY-MM-DD` para persistência, formatação localizada e agregadores semanais/mensais.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`; posteriormente, o carregamento mensal foi ajustado nos mesmos arquivos.

**O que foi feito:** a data ISO técnica deixou de ser exibida ao lado da data formatada ao usuário. A coleta de dados da Semana passou a reler os registros persistidos, em vez de depender apenas de um fechamento congelado do dia, e as linhas/legendas de metas foram recalculadas quando o valor aplicável mudava. O commit `95a29cc` corrigiu especificamente o carregamento do histórico mensal depois da reorganização visual.

**PRs/commits relacionados:** `1162456`, `95a29cc` (`Fix monthly calendar history loading`). PR não identificado.

## C02 e C04 - Hardening da versão 0.7.5

**Data (se determinável):** 01/07/2026 às 13:10:52 e 18:03:15 UTC+2.

**Propósito:** reduzir riscos de vazamento acidental, impedir releases com artefatos sensíveis ou encoding inválido e tornar falhas de inicialização mais seguras e compreensíveis.

**Recursos:** Git, `.gitignore`, PowerShell, validação estática, Firebase/Firestore e DOM seguro.

**Arquivos:** `.gitignore`, `STABILITY_TODO.md`, `firebase-storage.js`, `index.html`, `scripts/preflight-release.ps1`, `app.js`, `nutrition-tracker.jsx`; um backup JSON sensível foi removido do repositório no commit `6af9fc1`.

**O que foi feito:** foram adicionadas exclusões para chaves, backups, CSVs, exports, relatórios e artefatos locais; um export real de depuração deixou de ser versionado; o preflight passou a verificar arquivos proibidos, encoding e condições mínimas de release. A tela de erro inicial deixou de montar conteúdo externo por `innerHTML` inseguro e passou a usar criação/atribuição segura de nós/texto. Também foram registradas pendências de estabilidade e reforçadas validações do armazenamento. Esses commits constituem o núcleo histórico do hardening `0.7.5` e correspondem a C02 e à base inicial de C04.

**PRs/commits relacionados:** `6af9fc1` e `ca16b5c`, ambos `Hardening 0.7.5`. PR não identificado.

## C05 - Preview e importação seletiva de backup

**Data (se determinável):** 13/07/2026 às 22:11:46 UTC+2.

**Propósito:** impedir importações cegas e permitir que uma pessoa confira e escolha quais categorias restaurar antes de qualquer escrita.

**Recursos:** Firebase/Firestore, leitura de JSON, React, comparação entre dados atuais e backup, operações de merge/substituição.

**Arquivos:** `firebase-storage.js`, `app.js`, `nutrition-tracker.jsx`, `index.html`.

**O que foi feito:** o arquivo selecionado passou por validação e preview antes da aplicação. O modal passou a organizar categorias como perfil nutricional permitido, configurações nutricionais, despensa, registros diários e métricas corporais. Cada categoria selecionada exige estratégia explícita: anexar/completar ou substituir. As contagens distinguem registros novos de existentes e a conta de origem não é exposta como informação operacional. Campos como `userName`, `birthDate`, `gender`, idioma, tema, tutoriais vistos, identificadores da conta e metadados internos ficaram fora da restauração. O trabalho foi uma primeira versão segura de UX; não reivindica ter resolvido a não atomicidade posteriormente catalogada em `A07` nem o desacordo de campo do preview catalogado em `D09`.

**PRs/commits relacionados:** `1162456`. PR não identificado.

## C05 - Exportação focada em dados restauráveis

**Data (se determinável):** 13/07/2026.

**Propósito:** reduzir exposição e ruído no arquivo de backup, exportando somente dados que o fluxo de importação realmente sabe restaurar.

**Recursos:** Firebase/Firestore, JSON versionado, classificação de chaves e download pelo navegador.

**Arquivos:** `firebase-storage.js`, `app.js`, `nutrition-tracker.jsx`.

**O que foi feito:** o export deixou de copiar indiscriminadamente todas as chaves da conta. Permaneceram dados de despensa, refeições, notas e registros diários relevantes, métricas corporais e configurações nutricionais restauráveis. Preferências de interface, flags de migração/schema, datas de login, tutoriais vistos e UID foram excluídos. A separação reduziu a possibilidade de transferir estado técnico ou identificadores entre contas e manteve a portabilidade do histórico nutricional.

**PRs/commits relacionados:** `1162456`. PR não identificado.

## C11 - Layout mobile da aba Métricas

**Data (se determinável):** 13–14/07/2026; correção estrutural em 14/07/2026 às 13:36:39 UTC+2.

**Propósito:** tornar acompanhamento corporal, gráficos, histórico e metas utilizáveis em telas estreitas, sem sobreposição, colunas espremidas ou cards fora do viewport.

**Recursos:** CSS responsivo, grids/flexbox, React e gráficos já usados pelo aplicativo.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`, `one-ui.css`.

**O que foi feito:** os formulários e cards passaram a reorganizar colunas conforme a largura disponível; gráficos e tabela histórica receberam limites e rolagem adequados; as subabas Acompanhamento e Metas recuperaram a estrutura esperada. O commit `b5e2da9` corrigiu especificamente a marcação da grade de progresso e adicionou regras responsivas, sem reescrever a lógica nutricional. O item corresponde a C11, atualmente concluído no roadmap.

**PRs/commits relacionados:** `1162456`, `b5e2da9` (`Fix metrics progress grid structure`). PR não identificado.

## C08 - Prompt mais rigoroso para estimativa por descrição de prato

**Data (se determinável):** consolidado em 13/07/2026; data inicial da discussão não determinada.

**Propósito:** melhorar consistência e auditabilidade das estimativas nutricionais geradas por IA a partir de texto livre.

**Recursos:** provedor LLM disponível na época, prompt estruturado, JSON e referências nutricionais TACO, USDA e INSA.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`.

**O que foi feito:** o prompt passou a exigir identificação dos ingredientes, prioridade para quantidades explícitas, porções padrão realistas quando necessário e distinção rigorosa entre peso cru e cozido. Ingredientes adicionais assumidos, como óleo, manteiga, creme, molho ou açúcar, precisam aparecer na nota com quantidade aproximada; nenhum nutriente pode vir de ingrediente omitido da nota. O retorno foi limitado a JSON válido com nome, proteína, calorias, carboidratos, gorduras, fibra, sal, confiança e nota objetiva contendo as principais quantidades usadas. Esse trabalho é uma versão histórica do C08; o item continuou evoluindo posteriormente em outra frente.

**PRs/commits relacionados:** `1162456`; commit granular específico não identificado. PR não identificado.

## C07 - Smoke tests automáticos com Playwright

**Data (se determinável):** 13/07/2026; estabilizações de CI em 15/07/2026.

**Propósito:** detectar rapidamente regressões de inicialização, autenticação, idioma e navegação antes de distribuir uma nova versão aos testers.

**Recursos:** Node.js, npm, Playwright, Chromium, servidor HTTP estático local e variáveis de ambiente para conta de teste.

**Arquivos:** `package.json`, `package-lock.json`, `playwright.config.js`, `tests/smoke/app.smoke.spec.js`, `tests/smoke/serve-static.js`, `tests/smoke/README.md`; posteriormente `.github/workflows/ci.yml`, `tests/smoke/test-helpers.js` e `scripts/write-ci-summary.js`.

**O que foi feito:** foi criada uma suíte de 12 execuções cobrindo desktop e mobile. Ela verifica boot sem erros fatais, controles de login, troca e persistência do idioma, validação da recuperação de senha, abertura das abas principais sem conteúdo vazio, acesso a configurações e backup e logout com retorno à tela pública. A configuração usa um worker para evitar concorrência sobre a mesma conta. O comando `npm.cmd` foi documentado para contornar a política do PowerShell que bloqueava `npm.ps1`. A suíte foi executada pelo usuário com 12/12 testes aprovados em aproximadamente 32 segundos. Os commits de 15/07 integraram e estabilizaram a execução em CI; essa parte é evidência complementar, embora o pedido original desta conversa tenha sido a suíte de smoke tests.

**PRs/commits relacionados:** `1162456`, `76d84e1` (`Add GitHub Actions CI workflow`) e `c4a7608` (`Fix CI preflight and smoke stability`). PR não identificado.

## C16 - Guias bilíngues de execução dos smoke tests

**Data (se determinável):** 13/07/2026.

**Propósito:** transformar a suíte em ferramenta operacional repetível, inclusive para pessoas que não participaram da implementação.

**Recursos:** documentação de Node.js/npm, Playwright, PowerShell e relatório HTML.

**Arquivos:** `SMOKE_TESTS_GUIDE_PT-BR.txt`, `SMOKE_TESTS_GUIDE_EN.txt`, `tests/smoke/README.md`.

**O que foi feito:** foram escritos guias completos em português e inglês explicando pré-requisitos, instalação, configuração segura das credenciais por variáveis de ambiente, execução, leitura de aprovado/falhou/flaky/skipped, abertura do relatório e solução dos erros mais comuns. O guia registra o uso de `npm.cmd` e `npx.cmd` quando a Execution Policy do Windows bloqueia wrappers `.ps1`. Esse material corresponde retrospectivamente ao objetivo do C16, embora o código formal ainda não existisse quando os arquivos foram criados.

**PRs/commits relacionados:** `1162456`. PR não identificado.

## C06 - Política de privacidade e instruções de exclusão de dados

**Data (se determinável):** não determinada; produzida durante o ciclo entre hardening e `0.8.0-beta`.

**Propósito:** explicar de forma pública quais dados nutricionais e de conta são tratados, por que são usados, como são protegidos e como o titular pode solicitar exclusão.

**Recursos:** documentação Markdown, Firebase Authentication, Firestore e princípios de minimização/portabilidade.

**Arquivos:** `PRIVACY_POLICY_PT-BR.md`, `PRIVACY_POLICY_EN.md`; os documentos foram criados nesta conversa, mas permaneceram fora do commit histórico desta frente. As políticas publicadas e trilíngues atuais evoluíram depois em outra frente.

**O que foi feito:** foram redigidas versões em português e inglês, com categorias de dados, finalidades, armazenamento, terceiros, retenção, segurança, direitos, exportação e procedimento de exclusão. A documentação distinguiu exclusão da conta e remoção dos dados associados. Não se reivindica nesta seção a implementação administrativa completa e idempotente de exclusão C22, que foi realizada posteriormente por outra conversa; aqui o escopo foi política pública e instrução operacional inicial, correspondente ao C06.

**PRs/commits relacionados:** nenhum commit desta frente confirmado para os dois arquivos; publicação posterior não atribuída a esta conversa. PR não identificado.

## Integração de formulários externos de feedback

**Data (se determinável):** não determinada; anterior à consolidação da internacionalização.

**Propósito:** disponibilizar um canal de feedback de baixo custo durante a fase de testes, sem introduzir imediatamente armazenamento nativo de anexos ou uma nova superfície de dados pessoais.

**Recursos:** Google Forms, `window.open`, seleção de URL por idioma e aviso modal.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`.

**O que foi feito:** foram incorporados links distintos para formulários em português e inglês no menu de configurações. Antes da navegação, o aplicativo informa que o usuário será redirecionado ao Google Forms e que uma nova aba será aberta; a aba do diário permanece ativa. Esta entrega não corresponde ao C13, que exige feedback nativo com anexos e permanece um recurso separado no roadmap.

**PRs/commits relacionados:** conteúdo consolidado em `1162456`; commit granular não identificado. PR não identificado.

## C01 - Internacionalização completa em espanhol

**Data (se determinável):** 13/07/2026 às 22:11:46 UTC+2.

**Propósito:** acrescentar espanhol sem degradar português e inglês, incluindo textos dinâmicos, tutoriais e fluxos autenticados.

**Recursos:** mapas de strings JavaScript, função central de resolução `text(...)`, `localStorage`, dados de idioma do perfil e auditoria automatizada de i18n.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`, `scripts/audit-i18n.js`.

**O que foi feito:** a lógica binária português/inglês foi substituída por seleção explícita entre `pt`, `en` e `es`. Textos de navegação, diário, alimentos, semana, métricas, metas, modais, tutoriais, backup e mensagens de estado receberam variantes em espanhol. A função `text(...)` centralizou a escolha do idioma e fallbacks, em vez de espalhar ternários e substituições ad hoc. O script de auditoria foi incluído para detectar chaves ausentes e reduzir telas parcialmente traduzidas. Este trabalho integra o escopo histórico de C01 relacionado a textos e encoding.

**PRs/commits relacionados:** `1162456`. PR não identificado.

## C01 - Seletor expansível de idioma com bandeiras

**Data (se determinável):** 13–15/07/2026; acabamento em 15/07/2026 às 22:18:54 e 22:23:26 UTC+2.

**Propósito:** substituir a alternância cíclica e ambígua entre idiomas por uma escolha direta, identificável e imediatamente aplicada.

**Recursos:** React, CSS transitions, persistência local e emojis de bandeira.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `tests/smoke/app.smoke.spec.js`.

**O que foi feito:** o menu de configurações ganhou uma entrada “Idioma/Language/Idioma” que expande suavemente uma lista com `🇧🇷 Português`, `🇺🇸 English` e `🇪🇸 Español`. O idioma ativo recebe destaque visual. A seleção atualiza o estado e a persistência, fecha o submenu e dispara a atualização da interface sem exigir reload manual. Os commits de 15/07 restauraram as bandeiras e refinaram os rótulos depois que ajustes intermediários haviam degradado a apresentação.

**PRs/commits relacionados:** `1162456`, `7b63225` (`fix: restore language flags`) e `bbe11a7` (`fix: refine language labels`). PR não identificado.

## C01 - Correções de regressões pós-tradução

**Data (se determinável):** 13–15/07/2026.

**Propósito:** corrigir regressões em que nomes de refeições eram tratados como sequências de caracteres e abas inteiras deixavam de renderizar após a introdução do terceiro idioma.

**Recursos:** React, mapas i18n, identificadores persistidos de refeições, CSS e smoke tests.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`, `one-ui.css`, `tests/smoke/app.smoke.spec.js`.

**O que foi feito:** a frente separou identificadores estáveis das labels traduzidas, corrigiu iterações que percorriam strings letra por letra e restaurou a montagem de Alimentos, Semana e Métricas em PT/EN/ES. Também foram recuperadas as subabas Acompanhamento e Metas e ajustada a estrutura visual dos formulários/cards de metas. O risco de alterar a ordem de chaves persistidas de refeições, formalizado mais tarde como `F05`, foi respeitado: labels de apresentação foram traduzidas sem redefinir silenciosamente o schema das contas existentes.

**PRs/commits relacionados:** consolidação em `1162456`; acabamento visual relacionado em `b5e2da9`, `7b63225` e `bbe11a7`. A associação linha a linha entre cada regressão e um único commit é não determinada. PR não identificado.

## C16 - Planilha de acompanhamento do roadmap

**Data (se determinável):** não determinada.

**Propósito:** permitir gestão prática das pendências levantadas na revisão de segurança, estabilidade e funcionalidades.

**Recursos:** Microsoft Excel/OpenXML, classificação por estado, prioridade, complexidade e responsabilidade.

**Arquivos:** `Roadmap_Diario_Nutricional.xlsx`.

**O que foi feito:** a lista detalhada discutida na conversa foi transformada em planilha gerenciável, com item, estado, importância de 0 a 10, complexidade, capacidade de execução autônoma e ação necessária do responsável. O arquivo serviu como precursor informal do roadmap consolidado posterior. Ele não recebeu código C01–C28 na época e não deve ser confundido com o `ROADMAP.md` atual.

**PRs/commits relacionados:** nenhum commit confirmado; arquivo local não rastreado no checkout histórico. PR não identificado.

## C16 - Documento técnico de handoff da sessão

**Data (se determinável):** não determinada; criado ao fim da rodada de correções de tradução/Métricas.

**Propósito:** preservar contexto técnico suficiente para outra sessão continuar sem repetir investigações, especialmente depois de regressões de renderização e encoding.

**Recursos:** Markdown, Git status/diff e registro manual de investigação.

**Arquivos:** `PROJECT_HANDOFF.md`.

**O que foi feito:** o handoff registrou objetivo, problema, investigações, decisões, arquivos modificados/analisados, comportamento anterior e atual, hipóteses, testes, erros restantes, prioridades, restrições e estado do Git. O documento foi criado por solicitação explícita de interromper qualquer outra implementação. Ele permaneceu local/não rastreado e não é a mesma coisa que esta cronologia consolidada em `documentation/historico/`.

**PRs/commits relacionados:** nenhum commit confirmado. PR não identificado.

## C20 - Discussão e planejamento do motor matemático de pontuação 0–5

**Data (se determinável):** 13/07/2026.

**Propósito:** definir uma pontuação determinística e explicável para avaliar quanto uma refeição ajuda a cumprir as metas restantes do dia, evitando delegar a nota numérica diretamente ao modelo de IA.

**Recursos:** modelagem matemática/fitness, metas de calorias, proteína, carboidratos, gorduras, fibra e sal, progresso diário e tempo restante.

**Arquivos:** nenhum arquivo de código é atribuído a esta conversa neste item. A implementação apareceu em `meal-score.js` e `tests/unit/meal-score.test.js`, mas é atribuída a outra conversa com confiança moderada.

**O que foi feito:** nesta conversa foi discutida a separação entre cálculo e explicação: o aplicativo deveria calcular uma nota de `0,00` a `5,00`, com duas casas decimais, usando nutrientes da refeição, consumo acumulado, metas restantes, excesso/deficiência e distribuição esperada pelo tempo restante do dia. Foram discutidos subescores como proteína e calorias, pesos e uma função fitness calibrável. Evidência externa fornecida pelo responsável confirma que a especificação matemática completa foi formalizada nessa data. Entretanto, o Git e a comparação com outra conversa indicam que a implementação em código foi feita por outra sessão.

**PRs/commits relacionados:** discussão nesta conversa em 13/07/2026; implementação por outra conversa no commit `1162456`, que criou `meal-score.js` e `tests/unit/meal-score.test.js`. Nível de confiança da atribuição externa: moderado, pois o Git prova data/conteúdo, não autoria por conversa. PR não identificado.

## C19 - Planejamento da avaliação explicativa de refeição por IA

**Data (se determinável):** 13/07/2026.

**Propósito:** combinar a nota matemática com uma explicação útil antes do registro, mantendo a decisão final com o usuário.

**Recursos:** motor de pontuação C20, LLM, dados da refeição, totais do dia e metas nutricionais.

**Arquivos:** nenhum arquivo de implementação é reivindicado por esta conversa.

**O que foi feito:** foi especificado um fluxo em que o usuário monta a refeição, solicita avaliação e recebe nota, pontos positivos, excessos ou lacunas, impacto projetado nas metas e sugestões de ajustes. A refeição poderia ser editada, reavaliada ou registrada mesmo assim. A decisão técnica principal foi manter a nota sob controle do algoritmo determinístico e usar a IA apenas para explicar e sugerir, evitando variação arbitrária da pontuação. A implementação inicial associada à `0.8.0-beta` é atribuída a outra conversa, com confiança moderada; esta frente reivindica somente discussão e planejamento.

**PRs/commits relacionados:** planejamento nesta conversa em 13/07/2026; implementação correlata no commit `1162456`, atribuída a outra conversa. PR não identificado.

## Evolução de gordura corporal e massa muscular — atribuição provável

**Data (se determinável):** 19/06/2026 às 17:40:35 UTC+2.

**Propósito:** ampliar o acompanhamento além de peso e IMC, exibindo tendências de composição corporal quando houvesse dados suficientes.

**Recursos:** React, dados de métricas corporais, gráficos SVG/HTML já usados no aplicativo e cálculos derivados.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `index.html`.

**O que foi feito:** foram acrescentados campos e séries para percentual de gordura e massa muscular, com gráficos condicionais que aparecem somente quando existem registros. O histórico passou a exibir medidas adicionais e cálculos relacionados. A atribuição a esta conversa é **provável, mas não confirmada com certeza absoluta**, com base no commit específico e em memória parcial desta frente. Nenhuma outra conversa consultada reivindicou o item, mas o Git não identifica a sessão que escreveu as linhas.

**PRs/commits relacionados:** `aecd280` (`graficos gordura e musculo`). PR não identificado. Confiança de atribuição: moderada.

## Registro de água e botão de medida personalizada — atribuição provável

**Data (se determinável):** não determinada; implementação presente no ciclo da `0.7.5-beta`/`0.8.0-beta`.

**Propósito:** restaurar o registro rápido de hidratação e permitir que o usuário configure uma medida recorrente, como sua garrafa pessoal.

**Recursos:** React, armazenamento local/Firebase, meta diária de água e botões de quantidade em mililitros.

**Arquivos:** `app.js`, `nutrition-tracker.jsx`, `firebase-storage.js`, `index.html`.

**O que foi feito:** o painel de água voltou a registrar quantidades predefinidas e ganhou um botão configurável para uma medida pessoal, além da entrada manual. O total é comparado com a meta diária e participa das notificações de conquista. A atribuição a esta conversa é **provável, mas não confirmada com certeza absoluta**, baseada em memória parcial e na ausência de reivindicação conflitante por outra conversa. Não foi localizado um commit granular cujo título identifique exclusivamente esse recurso; por isso não se força uma associação a C26, que cobre notificações e não o domínio completo de hidratação.

**PRs/commits relacionados:** provável presença nos commits amplos `36a1cc7`, `c033542` e/ou `1162456`; commit exato não determinado. PR não identificado. Confiança de atribuição: moderada.

---

## Resultado consolidado da frente

Esta conversa contribuiu diretamente para a transição entre uma `0.7.5-beta` funcional, porém frágil, e a base da `0.8.0-beta`: notificações de metas, correções do recomendador, testes comparativos do GA, hardening, backup seletivo, smoke tests, documentação operacional e internacionalização em espanhol. Também produziu documentação de privacidade, feedback externo e artefatos de gestão que permaneceram locais ou foram posteriormente absorvidos por frentes mais novas.

O motor matemático e a avaliação explicativa de refeições aparecem no mesmo commit consolidado da `0.8.0-beta`, mas não são reivindicados como implementação desta conversa. A contribuição aqui foi a especificação e discussão; a escrita do código é atribuída a outra conversa com confiança moderada. Da mesma forma, gráficos de composição corporal e hidratação permanecem registrados com confiança intermediária, conforme a evidência disponível.

## Fontes consultadas

- Memória integral desta conversa, usada para delimitar autoria conversacional.
- `git log origin/main` e `git show` dos commits entre `374fb82` e `c4a7608`.
- `documentation/README.md` no commit-base consultado em 31/08/2026.
- `documentation/estado-atual/ROADMAP.md` e seus códigos C01–C28/N01–N09.
- `documentation/estado-atual/BUG-INVENTORY.md`, especialmente A07, A10, D09 e F05 como limites que não devem ser declarados resolvidos por entregas históricas parciais.
- Confirmação externa fornecida pelo responsável sobre a formalização do motor matemático em 13/07/2026 e sua provável implementação por outra conversa.
