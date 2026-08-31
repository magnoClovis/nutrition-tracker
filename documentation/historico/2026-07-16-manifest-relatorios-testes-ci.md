# Histórico da frente — manifest, relatórios, testes autenticados e CI

## Escopo e método

Este arquivo registra exclusivamente o trabalho implementado nesta conversa entre 15 e 16/07/2026. A atribuição do escopo vem da memória integral da própria conversa; datas, arquivos, hashes e relações com pull requests foram confirmados secundariamente no histórico Git e no PR #1 do repositório magnoClovis/nutrition-tracker.

A convenção de nome usa 16/07/2026 porque essa é a data comprovada do commit e do merge mais recentes desta frente. Os códigos C01–C28, N01–N09 e o inventário formal de bugs foram criados depois deste trabalho; por isso, as associações abaixo são retroativas e aparecem somente quando há correspondência técnica direta. Uma associação retroativa não significa que esta frente tenha concluído todo o item posterior.

O commit 5ca7a2a contém alterações de mais de uma frente. Somente o manifest/PWA, os ícones e a configuração de relatórios são atribuídos a esta conversa. Mudanças de verificação de e-mail presentes no mesmo commit não são reivindicadas aqui.

O arquivo meal-score.js e a lógica matemática de pontuação não foram modificados por esta frente.

## 1. C01 - Auditoria de encoding do manifest e restauração dos ativos PWA

- **Data (se determinável):** 15/07/2026, com evidência no commit 5ca7a2a.
- **Propósito:** Corrigir o estado quebrado da instalação PWA: o manifest precisava ser legível como UTF-8, declarado pelo HTML e capaz de resolver todos os ícones informados. A ausência dos PNGs fazia o navegador encontrar referências válidas sintaticamente, mas sem os recursos físicos correspondentes.
- **Recursos:** Web App Manifest; UTF-8; imagens PNG; carregamento estático pelo navegador, sem bundler e sem service worker.
- **Arquivos:** manifest.json (inspecionado); index.html; icon-192.png; icon-512.png.
- **O que foi feito:**
  - O conteúdo do manifest foi conferido como JSON UTF-8, preservando nome, nome curto, descrição, start URL, cores, orientação e lista de ícones.
  - O Git não mostra diferença textual em manifest.json entre o pai e o commit 5ca7a2a. Portanto, não é possível provar uma regravação textual específica; a correção exata de bytes/data é **não determinada**. O que fica comprovado é que o manifest versionado naquele ponto já continha texto correto.
  - Foram adicionados os arquivos icon-192.png e icon-512.png nos tamanhos declarados pelo manifest, eliminando referências para arquivos inexistentes.
  - index.html passou a declarar explicitamente o manifest por meio de link rel="manifest", permitindo que o navegador o descubra.
  - Não foi introduzido service worker, cache offline ou qualquer nova funcionalidade PWA.
  - A origem visual exata usada para gerar os PNGs não pode ser demonstrada apenas pelo Git e permanece **não determinada**.
- **PRs/commits relacionados:**
  - Commit [5ca7a2a](https://github.com/magnoClovis/nutrition-tracker/commit/5ca7a2a) — email verification bug fixed (commit misto; somente o subconjunto PWA é atribuído aqui).
  - PR específico: **não determinado**.

## 2. C10 - Remoção do IP privado e do HTTP do servidor de relatórios

- **Data (se determinável):** 15/07/2026, commit 5ca7a2a.
- **Propósito:** Remover do bundle público o endpoint inseguro http://192.168.1.82:8000. O endereço só funcionava na rede local do autor, expunha uma dependência ambiental no cliente e seria bloqueado por mixed content quando o aplicativo fosse servido em HTTPS.
- **Recursos:** JavaScript no navegador; objeto global de configuração; URL API; HTTPS; servidor de relatórios externo opcional.
- **Arquivos:** firebase-storage.js; index.html.
- **O que foi feito:**
  - REPORT_SERVER_URL deixou de conter um IP ou URL HTTP fixos.
  - Foi definido um contrato de configuração anterior ao carregamento do script: window.NUTRITION_TRACKER_CONFIG.reportServerUrl.
  - A configuração é normalizada com new URL; valores ausentes, inválidos ou que não usem o protocolo https: resultam em string vazia.
  - A barra final é removida para impedir composição ambígua dos caminhos de API.
  - REPORTS_ENABLED passou a representar explicitamente se existe endpoint seguro utilizável.
  - Avisos de configuração inválida são emitidos no console sem revelar secrets nem provocar tentativa silenciosa de rede.
  - O cachebuster dos scripts em index.html foi atualizado para garantir que navegadores servissem a versão sem o IP antigo.
- **PRs/commits relacionados:**
  - Commit [5ca7a2a](https://github.com/magnoClovis/nutrition-tracker/commit/5ca7a2a).
  - PR específico: **não determinado**.

## 3. C10 - Estado de manutenção trilíngue para relatórios indisponíveis

- **Data (se determinável):** 15/07/2026, commit 5ca7a2a.
- **Propósito:** Evitar que a remoção do endpoint deixasse um botão aparentemente funcional que nada fazia ou uma chamada de rede destinada a falhar. O recurso precisava permanecer visível como capacidade planejada, mas com indisponibilidade comunicada de modo acessível.
- **Recursos:** React sem bundler; estado de UI; internacionalização PT/EN/ES; cliente fetch.
- **Arquivos:** app.js; nutrition-tracker.jsx.
- **O que foi feito:**
  - O card de relatórios passou a consultar REPORTS_ENABLED.
  - Sem servidor HTTPS configurado, o botão fica desabilitado, com opacidade e cursor coerentes com o estado indisponível.
  - O rótulo muda para “Em manutenção”, “Under maintenance” ou “En mantenimiento”.
  - O texto do card explica, nos três idiomas, que os relatórios avançados retornarão quando houver servidor seguro.
  - A função de geração também contém uma guarda defensiva: mesmo se acionada por outro caminho, interrompe antes de montar/enviar a requisição.
  - Erros reais de conectividade com um servidor HTTPS configurado receberam mensagens específicas e trilíngues, sem orientar o usuário a usar HTTP, localhost ou IP LAN.
  - app.js e nutrition-tracker.jsx foram mantidos sincronizados.
- **PRs/commits relacionados:**
  - Commit [5ca7a2a](https://github.com/magnoClovis/nutrition-tracker/commit/5ca7a2a).
  - PR específico: **não determinado**.

## 4. C02 - Credenciais locais e de CI sem versionamento

- **Data (se determinável):** 15/07/2026, commit 9b5e320.
- **Propósito:** Permitir testes autenticados reais contra Firebase Auth/Firestore sem inserir credenciais da conta descartável no repositório. O mesmo código precisava funcionar localmente e futuramente no CI.
- **Recursos:** Node.js; variáveis de ambiente; arquivo JSON local; Git ignore; GitHub Actions secrets.
- **Arquivos:** .gitignore; tests/smoke/test-credentials.js; tests/smoke/README.md; tests/test-user.local.json (arquivo local deliberadamente ignorado, não versionado).
- **O que foi feito:**
  - tests/test-user.local.json foi definido como fonte local opcional com os campos email e password, ambos inicialmente vazios.
  - O padrão foi adicionado ao .gitignore, assim como playwright/.auth/, antes que valores locais pudessem ser versionados.
  - test-credentials.js procura primeiro NUTRITION_TEST_EMAIL e NUTRITION_TEST_PASSWORD e usa o JSON local apenas como fallback.
  - O leitor valida JSON e produz erro específico para arquivo malformado, sem imprimir senha.
  - A ausência de credenciais é representada por hasCredentials=false e por uma mensagem clara orientando a preencher o arquivo ou definir as variáveis.
  - A documentação explica o uso de conta descartável e separa o fluxo local do fluxo via secrets.
- **PRs/commits relacionados:**
  - Commit [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 5. C07 - Setup autenticado reutilizável e storageState

- **Data (se determinável):** 15/07/2026, commit 9b5e320.
- **Propósito:** Evitar login repetido em cada cenário Playwright, reduzir tempo e instabilidade e garantir skip compreensível quando a conta descartável não estivesse configurada.
- **Recursos:** Playwright projects/dependencies; Firebase Auth real; storageState do navegador.
- **Arquivos:** playwright.config.js; tests/smoke/auth.setup.js; tests/smoke/test-credentials.js; playwright/.auth/user.json (gerado, ignorado).
- **O que foi feito:**
  - Foi criado o projeto auth-setup, executado antes das matrizes desktop e mobile.
  - O setup abre o app, autentica com a conta descartável e só grava o storageState após reconhecer a interface autenticada.
  - desktop-chromium e mobile-chromium dependem do setup e reutilizam a mesma sessão, evitando autenticações redundantes.
  - Quando email ou senha estão ausentes, o setup e os testes autenticados são ignorados com a mensagem “credenciais de teste não configuradas”, em vez de falharem em um seletor ou request genérico.
  - Firebase Auth/Firestore permaneceram as únicas integrações reais autorizadas; Groq, Open Food Facts e relatórios foram mantidos sob interceptação.
- **PRs/commits relacionados:**
  - Commit [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - Ajustes posteriores: [55268d1](https://github.com/magnoClovis/nutrition-tracker/commit/55268d1) e [76f7d2c](https://github.com/magnoClovis/nutrition-tracker/commit/76f7d2c).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 6. C07 - Infraestrutura compartilhada dos smoke tests

- **Data (se determinável):** 15/07/2026, commits 9b5e320 e de87edd.
- **Propósito:** Reduzir duplicação e fazer todos os testes usarem os mesmos contratos de inicialização, idioma, tutorial, APIs externas e captura de erros críticos.
- **Recursos:** Playwright; route interception; servidor HTTP estático local; JavaScript/Node.js.
- **Arquivos:** tests/smoke/test-helpers.js; tests/smoke/serve-static.js; tests/smoke/app.smoke.spec.js; tests/smoke/authenticated-flows.spec.js.
- **O que foi feito:**
  - Foram centralizadas rotinas para abrir o app, esperar o loading, trocar/persistir idioma, fechar tutorial quando presente e clicar por chave de tutorial ou texto.
  - A captura de pageerror e console errors ganhou filtragem explícita, preservando falhas críticas e ignorando somente condições conhecidas e delimitadas.
  - APIs opcionais/pagas são interceptadas em um único helper; os cenários podem solicitar respostas simuladas ou atraso controlado.
  - O servidor estático foi ajustado para comportamento reproduzível no Windows e no GitHub Actions, sem introduzir build ou bundler.
  - Os testes públicos e autenticados passaram a compartilhar os mesmos contratos de bootstrap, reduzindo divergência entre as matrizes.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - [de87edd](https://github.com/magnoClovis/nutrition-tracker/commit/de87edd).
  - [76f7d2c](https://github.com/magnoClovis/nutrition-tracker/commit/76f7d2c).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 7. C07 - Cobertura dos fluxos críticos em português, inglês e espanhol

- **Data (se determinável):** 15/07/2026, commit 9b5e320.
- **Propósito:** Fechar a lacuna em que o smoke de idioma exercitava apenas inglês, sem comprovar que navegação e persistência da preferência funcionavam em PT e ES.
- **Recursos:** Playwright; internacionalização do app; localStorage/Firestore conforme o estado autenticado; matrizes desktop e mobile.
- **Arquivos:** tests/smoke/app.smoke.spec.js; tests/smoke/test-helpers.js.
- **O que foi feito:**
  - A troca de idioma da tela pública passou a ser parametrizada para PT, EN e ES, com reload e confirmação da copy persistida.
  - O smoke autenticado percorre as abas críticas em cada idioma, usando nomes acessíveis específicos de cada tradução.
  - A cobertura é executada nas configurações Desktop Chrome e Pixel 5, evitando validar somente um viewport.
  - A estrutura parametrizada evita três blocos de teste copiados e mantém uma única definição de fluxo.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - Estabilização de seletores: [e10a8fc](https://github.com/magnoClovis/nutrition-tracker/commit/e10a8fc).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 8. C07 - Validação isolada das sub-abas de Métricas

- **Data (se determinável):** 15/07/2026, commit 9b5e320.
- **Propósito:** Substituir a asserção superficial de texto genérico por evidência de que cada seção interna de Métricas abre e exibe seu conteúdo próprio.
- **Recursos:** Playwright; acessibilidade por roles; UI React responsiva.
- **Arquivos:** tests/smoke/app.smoke.spec.js; tests/smoke/test-helpers.js.
- **O que foi feito:**
  - O teste navega até Métricas e aciona individualmente peso, composição corporal e as demais seções presentes na versão examinada.
  - Cada seleção é seguida de uma asserção específica da seção, impedindo falso positivo causado por texto comum ao contêiner.
  - Foram usados seletores visíveis e escopados para não confundir versões desktop/mobile do mesmo controle.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - [e10a8fc](https://github.com/magnoClovis/nutrition-tracker/commit/e10a8fc).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 9. C05 - Round-trip real de backup autenticado

- **Data (se determinável):** 15/07/2026, commit 9b5e320.
- **Propósito:** Comprovar o fluxo real exportar → alterar dado → visualizar importação → restaurar → comparar, que até então não possuía teste E2E.
- **Recursos:** Playwright downloads/uploads; JSON; Firebase Auth/Firestore reais; modal de backup.
- **Arquivos:** tests/smoke/authenticated-flows.spec.js; tests/smoke/test-helpers.js.
- **O que foi feito:**
  - O cenário grava um marcador controlado, exporta um backup real e lê o JSON baixado.
  - Depois altera o valor persistido para provar que a importação não está apenas confirmando o estado anterior.
  - O arquivo exportado é enviado pelo input real; o teste espera o preview, seleciona a categoria de notas, escolhe substituição e confirma a importação.
  - A verificação final consulta window.storage/Firestore e exige o valor original do backup.
  - O valor anterior da conta descartável é preservado e restaurado em finally, reduzindo impacto entre execuções.
  - Esta frente criou cobertura; não reivindica a resolução posterior de G01, concluída em outros PRs.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - Estabilizações dentro do PR: [55268d1](https://github.com/magnoClovis/nutrition-tracker/commit/55268d1) e [e10a8fc](https://github.com/magnoClovis/nutrition-tracker/commit/e10a8fc).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 10. C07 - Registro retroativo e histórico semanal

- **Data (se determinável):** 15–16/07/2026; cobertura iniciada em 9b5e320 e estabilizada até 601d7fa.
- **Propósito:** Verificar que uma refeição inserida em data passada é persistida na chave correta, aparece no diário daquela data e pode ser reaberta pela Semana.
- **Recursos:** Playwright; Firebase Auth/Firestore; datas ISO civis; UI Diário/Semana.
- **Arquivos:** tests/smoke/authenticated-flows.spec.js; app.js; nutrition-tracker.jsx.
- **O que foi feito:**
  - O teste calcula ontem, prepara alimento exclusivo e navega para a data anterior antes de registrar.
  - Após o registro, consulta log_v2_YYYY-MM-DD até encontrar o alimento, em vez de confiar somente no DOM.
  - Fecha o painel, confirma o item na data histórica, abre Semana, identifica o card pela data e reabre o histórico.
  - IDs e nomes usam timestamp para evitar colisão com execuções anteriores.
  - A implementação do teste revelou uma falha real de persistência com atualizador funcional em dias históricos; a correção correspondente está detalhada no item A09.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - [76f7d2c](https://github.com/magnoClovis/nutrition-tracker/commit/76f7d2c).
  - [0408423](https://github.com/magnoClovis/nutrition-tracker/commit/0408423).
  - [601d7fa](https://github.com/magnoClovis/nutrition-tracker/commit/601d7fa).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 11. C07 - Fluxo completo de avaliação e registro de refeição

- **Data (se determinável):** 15/07/2026, commit 9b5e320; ajustes de estabilidade em 16/07.
- **Propósito:** Cobrir a jornada completa solicitada, incluindo a decisão explícita de registrar mesmo após avaliação, em vez de testar somente a abertura do modal.
- **Recursos:** Playwright; UI de refeição; pontuação local existente; Firebase Auth/Firestore.
- **Arquivos:** tests/smoke/authenticated-flows.spec.js; tests/smoke/test-helpers.js.
- **O que foi feito:**
  - O cenário adiciona alimento da despensa à refeição em estágio com quantidade inicial de 100 g.
  - Aciona “Avaliar refeição” e captura a nota exibida.
  - Retorna à edição, altera a quantidade para 200 g e reavalia.
  - Exige que a segunda nota reflita a mudança, sem reproduzir ou alterar o algoritmo matemático.
  - Aciona “Registrar mesmo assim”, fecha o painel e confirma a refeição tanto na UI quanto no storage.
  - Valida quantidade 200 e a presença de mealScoreSnapshot com score dentro do intervalo 0–5.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - [55268d1](https://github.com/magnoClovis/nutrition-tracker/commit/55268d1).
  - [e10a8fc](https://github.com/magnoClovis/nutrition-tracker/commit/e10a8fc).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 12. C07 - IA indisponível sem bloquear pontuação e registro locais

- **Data (se determinável):** 15/07/2026, commit 9b5e320.
- **Propósito:** Garantir a separação arquitetural entre explicação por IA e nota local: indisponibilidade, atraso ou timeout do provedor não poderia impedir o usuário de avaliar nem registrar a refeição.
- **Recursos:** Playwright route interception; mock de Groq; pontuação local existente; Firebase.
- **Arquivos:** tests/smoke/authenticated-flows.spec.js; tests/smoke/test-helpers.js.
- **O que foi feito:**
  - A rota da IA é interceptada e atrasada de forma determinística; nenhuma chamada paga é realizada.
  - O mesmo cenário de avaliação/edição/reavaliação continua até o registro sem depender da conclusão da IA.
  - A asserção verifica o snapshot local persistido e a quantidade final.
  - O teste não altera meal-score.js e não simula uma nota externa: ele comprova que a nota local já existente permanece independente.
  - Não é reivindicada a resolução de B05, que descreve stale response/loading preso e foi catalogado posteriormente.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - Estabilizações: [55268d1](https://github.com/magnoClovis/nutrition-tracker/commit/55268d1) e [e10a8fc](https://github.com/magnoClovis/nutrition-tracker/commit/e10a8fc).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 13. C07 - Sugestão funcional do algoritmo genético adicionada ao diário

- **Data (se determinável):** 15/07/2026, commit 9b5e320.
- **Propósito:** Complementar o benchmark do GA com uma prova funcional de que uma sugestão produzida pela interface pode ser adicionada e mantém coerência matemática entre quantidade e nutrientes.
- **Recursos:** Playwright; algoritmo genético já existente; Firebase; cálculos proporcionais por 100 g.
- **Arquivos:** tests/smoke/authenticated-flows.spec.js; tests/smoke/test-helpers.js.
- **O que foi feito:**
  - O teste prepara um alimento controlado com valores conhecidos por 100 g.
  - Abre o gerador de sugestões, ajusta limites máximos e executa a busca.
  - Extrai do resultado a quantidade sugerida e usa o botão real “Adicionar ao diário”.
  - Consulta o log persistido e localiza a entrada pelo nome único.
  - Compara protein e kcal salvos com nutrientePor100 × quantidade / 100 usando tolerância numérica apropriada.
  - O algoritmo não foi modificado; somente seu resultado observável e a integração com o diário foram testados.
- **PRs/commits relacionados:**
  - [9b5e320](https://github.com/magnoClovis/nutrition-tracker/commit/9b5e320).
  - [55268d1](https://github.com/magnoClovis/nutrition-tracker/commit/55268d1).
  - [76f7d2c](https://github.com/magnoClovis/nutrition-tracker/commit/76f7d2c).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 14. A09 - Correção parcial da persistência funcional em dias históricos

- **Data (se determinável):** 16/07/2026, commits 76f7d2c e 0408423.
- **Propósito:** Corrigir o defeito revelado pelo teste retroativo: setActiveLog aceitava função no fluxo de hoje, mas tentava serializar/salvar essa função diretamente no fluxo histórico, impedindo que a nova refeição fosse persistida corretamente.
- **Recursos:** React state functional updates; scheduler de autosave; Firebase storage facade.
- **Arquivos:** app.js; nutrition-tracker.jsx.
- **O que foi feito:**
  - A primeira correção, em 76f7d2c, resolveu newLog dentro do callback de setHistoryLog e salvou o objeto resultante.
  - A revisão em 0408423 tornou a ordem explícita: se newLog é função, ela é aplicada a historyLog; o objeto resolvido é passado a setHistoryLog e a scheduleSave.
  - Isso impediu que uma função fosse enviada para JSON/stringificação e fez o registro retroativo chegar à chave log_v2 da data visualizada.
  - app.js e o espelho legível nutrition-tracker.jsx foram alterados em conjunto.
  - A correspondência com A09 é parcial e retroativa. Esta frente não criou a API funcional única, granular e atômica que posteriormente encerrou A09 nos PRs #118–#122.
- **PRs/commits relacionados:**
  - [76f7d2c](https://github.com/magnoClovis/nutrition-tracker/commit/76f7d2c).
  - [0408423](https://github.com/magnoClovis/nutrition-tracker/commit/0408423).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 15. A11 - Contenção de autosave e isolamento de fixtures nos testes

- **Data (se determinável):** 16/07/2026, commits 0408423 e 601d7fa.
- **Propósito:** Impedir que o estado antigo da conta descartável e o autosave atrasado da hidratação sobrescrevessem a fixture recém-preparada, produzindo falhas alternadas entre desktop e mobile.
- **Recursos:** Playwright expect.poll; Firebase Auth/Firestore reais; window.storage; debounces de hidratação/autosave.
- **Arquivos:** tests/smoke/authenticated-flows.spec.js.
- **O que foi feito:**
  - Antes dos cenários retroativo, avaliação e GA, o teste captura o documento anterior e substitui o log-alvo por objeto vazio.
  - A etapa final replaceStorage espera o debounce inicial, grava o valor controlado e consulta repetidamente até o Firestore devolver exatamente esse valor.
  - Os timeouts das confirmações remotas foram ampliados para 30 segundos, sem relaxar as asserções de conteúdo.
  - Blocos finally restauram os snapshots de log e despensa mesmo quando uma asserção falha.
  - A execução autenticada usa um worker, evitando que desktop e mobile editem simultaneamente os mesmos documentos da conta.
  - A correspondência com A11 é parcial/testual: a frente conteve o comportamento no ambiente de teste, mas não resolveu o protocolo geral de hidratação/autosave do produto.
- **PRs/commits relacionados:**
  - [0408423](https://github.com/magnoClovis/nutrition-tracker/commit/0408423).
  - [601d7fa](https://github.com/magnoClovis/nutrition-tracker/commit/601d7fa).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 16. C07 - Estabilização de seletores e controles visíveis

- **Data (se determinável):** 15–16/07/2026, commits 55268d1, e10a8fc e 76f7d2c.
- **Propósito:** Eliminar falsos negativos causados por elementos duplicados, ocultos ou presentes simultaneamente nas variantes responsivas, sem enfraquecer os fluxos testados.
- **Recursos:** Playwright locators; roles acessíveis; data attributes; layouts responsivos.
- **Arquivos:** tests/smoke/authenticated-flows.spec.js; tests/smoke/test-helpers.js; app.js; nutrition-tracker.jsx.
- **O que foi feito:**
  - Seletores foram escopados ao painel [data-app-main="adicionar"]:visible e aos cards/telas efetivamente ativos.
  - Busca de alimento passou a aceitar placeholders localizados reais e inputs visíveis.
  - Botões, checkboxes e notas foram selecionados por role/nome acessível e, quando necessário, por correspondência exata.
  - Foi adicionado data-add-meal-backdrop ao backdrop real para fechar o painel sem clicar em um nó oculto ou em cópia responsiva.
  - A navegação semanal e os tutoriais passaram a preferir chaves data-tutorial com fallback textual.
  - As correções mantiveram as mesmas asserções funcionais; não transformaram falhas reais em skips.
- **PRs/commits relacionados:**
  - [55268d1](https://github.com/magnoClovis/nutrition-tracker/commit/55268d1).
  - [e10a8fc](https://github.com/magnoClovis/nutrition-tracker/commit/e10a8fc).
  - [76f7d2c](https://github.com/magnoClovis/nutrition-tracker/commit/76f7d2c).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 17. C04 - Workflow de integração contínua para main e pull requests

- **Data (se determinável):** 15/07/2026, commit 2034a5d.
- **Propósito:** Transformar preflight, unitários e smoke tests em gate automático reproduzível para pushes e PRs, sem inventar build ou lint inexistentes no aplicativo estático.
- **Recursos:** GitHub Actions; Windows Server 2022; Node.js 24.18.0; npm ci; Playwright Chromium.
- **Arquivos:** .github/workflows/ci.yml; playwright.config.js.
- **O que foi feito:**
  - O workflow é acionado em push para main e pull_request direcionado a main.
  - actions/checkout e actions/setup-node foram fixadas por SHA, com comentários das versões, evitando latest.
  - Node foi fixado em 24.18.0 e o cache npm usa package-lock.json.
  - Dependências são instaladas com npm ci e o navegador com npx playwright install chromium.
  - A sequência executa exatamente os scripts existentes: preflight, test:unit e test:smoke.
  - NUTRITION_TEST_EMAIL e NUTRITION_TEST_PASSWORD são injetados a partir de repository secrets somente no passo Playwright.
  - O job possui timeout e permissões contents: read; nenhuma etapa de build/lint foi adicionada.
- **PRs/commits relacionados:**
  - [2034a5d](https://github.com/magnoClovis/nutrition-tracker/commit/2034a5d).
  - Correção do ambiente CI: [de87edd](https://github.com/magnoClovis/nutrition-tracker/commit/de87edd).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 18. C02/C04 - Segurança de secrets e artifacts somente em falhas

- **Data (se determinável):** 15/07/2026, commit 2034a5d.
- **Propósito:** Tornar o CI diagnosticável sem vazar credenciais e sem acumular relatórios em execuções verdes.
- **Recursos:** GitHub Actions secrets; upload-artifact; Playwright HTML report, traces e screenshots.
- **Arquivos:** .github/workflows/ci.yml; .gitignore; playwright.config.js.
- **O que foi feito:**
  - Secrets são referenciados diretamente no bloco env do passo de testes; não existem comandos echo, dump de ambiente ou logs voluntários desses valores.
  - O evento usado é pull_request, não pull_request_target, preservando o bloqueio padrão de secrets em PRs de forks.
  - O storageState e o arquivo local de credenciais são ignorados pelo Git.
  - O upload é condicionado a failure de preflight, unit ou smoke e executado com always apenas para não perder diagnóstico após uma falha.
  - O artifact reúne playwright-report, test-results e .ci-results, com if-no-files-found: ignore e retenção de sete dias.
  - Em execução verde, o passo de upload é skipped e nenhum artifact é criado.
- **PRs/commits relacionados:**
  - [2034a5d](https://github.com/magnoClovis/nutrition-tracker/commit/2034a5d).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 19. C04 - Resumo nativo e gate final do job

- **Data (se determinável):** 15/07/2026, commit 2034a5d.
- **Propósito:** Exibir rapidamente o resultado de cada grupo de verificações e, ao mesmo tempo, garantir que continue-on-error usado para coletar diagnóstico não transforme uma suíte vermelha em job verde.
- **Recursos:** GitHub Actions step summary; Node.js; resultados JSON do Playwright; PowerShell.
- **Arquivos:** scripts/write-ci-summary.js; .github/workflows/ci.yml.
- **O que foi feito:**
  - preflight, unit e smoke recebem IDs e continue-on-error para permitir que resumo e artifacts sejam produzidos mesmo após falha.
  - write-ci-summary.js lê outcomes das etapas e os resultados disponíveis, escrevendo uma tabela no GITHUB_STEP_SUMMARY.
  - A etapa final roda com if: always e verifica explicitamente se qualquer outcome é failure.
  - Se houver falha, PowerShell lança exceção e encerra o job com código diferente de zero; assim a futura branch protection pode bloquear merge.
  - O desenho separa “continuar para diagnosticar” de “aceitar a falha”, preservando o gate.
- **PRs/commits relacionados:**
  - [2034a5d](https://github.com/magnoClovis/nutrition-tracker/commit/2034a5d).
  - Ajuste do preflight/servidor: [de87edd](https://github.com/magnoClovis/nutrition-tracker/commit/de87edd).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1).

## 20. C07 - Ciclo de estabilização até o CI autenticado integralmente verde

- **Data (se determinável):** 15–16/07/2026; encerrado pelo commit 601d7fa e pela execução nº 7.
- **Propósito:** Levar a primeira execução real do CI, incluindo a conta descartável e os dois viewports, de falhas intermitentes a resultado repetível e verde sem remover cobertura.
- **Recursos:** GitHub Actions; Playwright; traces/screenshots/error-context; Firebase Auth/Firestore; testes locais Windows.
- **Arquivos:** .github/workflows/ci.yml; tests/smoke/test-helpers.js; tests/smoke/authenticated-flows.spec.js; app.js; nutrition-tracker.jsx.
- **O que foi feito:**
  - de87edd corrigiu diferenças do runner no preflight e no servidor estático.
  - 55268d1 e e10a8fc ajustaram seletores autenticados para controles reais/visíveis.
  - 76f7d2c corrigiu o registro histórico, adicionou o identificador de backdrop e refinou os fluxos reais.
  - 0408423 isolou logs da conta descartável e restaurou snapshots após cada cenário.
  - A análise dos artifacts mostrou disputa entre desktop/mobile e autosaves atrasados sobre os mesmos documentos, não falha do cálculo ou da UI.
  - 601d7fa acrescentou replaceStorage, confirmação remota por polling e timeouts proporcionais à latência do Firestore.
  - Antes do push final passaram localmente: preflight; 10/10 unitários; 9/9 autenticados; 35/35 Playwright completo.
  - A execução nº 7 do GitHub Actions terminou com preflight, unitários, Playwright, resumo e gate final em success; o upload de artifact foi corretamente skipped.
- **PRs/commits relacionados:**
  - [de87edd](https://github.com/magnoClovis/nutrition-tracker/commit/de87edd).
  - [55268d1](https://github.com/magnoClovis/nutrition-tracker/commit/55268d1).
  - [e10a8fc](https://github.com/magnoClovis/nutrition-tracker/commit/e10a8fc).
  - [76f7d2c](https://github.com/magnoClovis/nutrition-tracker/commit/76f7d2c).
  - [0408423](https://github.com/magnoClovis/nutrition-tracker/commit/0408423).
  - [601d7fa](https://github.com/magnoClovis/nutrition-tracker/commit/601d7fa).
  - [PR #1](https://github.com/magnoClovis/nutrition-tracker/pull/1), merge [f3ecd92](https://github.com/magnoClovis/nutrition-tracker/commit/f3ecd92), em 16/07/2026.
  - [GitHub Actions — execução nº 7](https://github.com/magnoClovis/nutrition-tracker/actions/runs/29460043467).

## Resultado consolidado

- Manifest descoberto pelo HTML e ativos PWA presentes.
- Nenhum IP privado ou endpoint HTTP permaneceu hardcoded no cliente de relatórios.
- Recurso de relatórios indisponível comunicado em PT/EN/ES.
- Credenciais e sessões autenticadas protegidas contra versionamento.
- Firebase Auth/Firestore usados como única integração real dos testes; APIs externas pagas interceptadas.
- Cobertura funcional criada para idiomas, Métricas, backup, retroativos, avaliação, falha de IA e GA.
- Preflight, 10 testes unitários e 35 execuções Playwright passaram localmente ao encerramento.
- Workflow do GitHub Actions terminou verde e apto a ser exigido por branch protection.
- meal-score.js e o motor de pontuação permaneceram fora do escopo.

## Fontes consultadas e limitações

- Memória integral desta conversa, usada para determinar autoria conversacional.
- Histórico Git dos commits 5ca7a2a, 9b5e320, 2034a5d, de87edd, 55268d1, e10a8fc, 76f7d2c, 0408423 e 601d7fa.
- PR #1 e execução nº 7 do GitHub Actions.
- documentation/README.md, documentation/estado-atual/ROADMAP.md e documentation/estado-atual/BUG-INVENTORY.md, consultados na main em 31/08/2026.
- Os códigos formais foram criados em 31/07/2026; associações neste documento são retroativas e delimitadas.
- O commit 5ca7a2a é misto. Alterações não ligadas aos pedidos desta conversa foram excluídas.
- A existência de texto UTF-8 correto no manifest é comprovável; uma modificação textual específica do arquivo naquele commit não é. Esse detalhe permanece **não determinado**.
