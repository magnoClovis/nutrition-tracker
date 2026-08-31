# Documento Histórico — Sessão Claude "Trofia" (parte da conversa revisada)

**Nota de proveniência**: este documento cobre exclusivamente o que
está escrito na conversa revisada. Não houve acesso a repositório Git
nem a `ROADMAP.md`/`BUG-INVENTORY.md` externos (tentativa de busca na
web não retornou esses arquivos). Códigos formais (ex: `A12`, `D17`)
são usados apenas quando apareceram explicitamente no texto da
conversa — nunca inferidos ou inventados. Onde a convenção de código
do projeto não pôde ser confirmada, o item aparece sem código.

**Nota sobre os três documentos gerados por Claude nesta conversa**
(`ESTADO_PROJETO_TROFIA.md`, `METODOLOGIA_DE_TRABALHO.md`,
`Filosofia_Produto_Bakwa.md`): busca na web não encontrou evidência de
que tenham sido commitados ao repositório. Com base no próprio texto
da conversa, eles foram gerados na ferramenta de criação de arquivos
do Claude (ambiente isolado do repositório) e entregues como download
ao usuário — em nenhum momento houve instrução ao Codex para
adicioná-los ao Git. **Conclusão: permaneceram como artefatos desta
conversa, não versionados.**

---

## Fatia combinada 9+10 do Vite — investigação e correção de flakiness visual

**Data**: não determinado (evidência indireta de datas próximas a 26/07/2026, vista em runs de CI mencionados)
**Propósito**: eliminar intermitências na matriz de 60 combinações visuais de comparação legado-vs-Vite antes de autorizar o cutover de produção.
**Recursos**: Playwright, Chromium (flag `--disable-gpu`), Recharts, CSS.
**Arquivos/documentos produzidos**: nenhum arquivo gerado por Claude; revisão de trabalho do Codex.
**Pesquisas/análises realizadas**: nenhuma pesquisa externa; análise de causa raiz conduzida pelo Codex e revisada por Claude.
**O que foi feito**: Revisão crítica de relato do Codex sobre quatro causas de flakiness identificadas e corrigidas sequencialmente: (1) animação JS do Recharts ainda mutando o SVG no instante da captura; (2) hover acidental em `[data-header-status-chip="true"]:hover` após mudança de layout pós-clique; (3) transição CSS (`button:hover { translateY(-1px) }`) não resolvida por perda de especificidade contra regra `!important` do tema One UI; (4) rasterização não-determinística de GPU, resolvida com `--disable-gpu` no config de teste. Após as correções, 3 casos críticos passaram 30/30 execuções independentes; matriz completa de 60 casos revalidada do zero.
**Conclusões/decisões tomadas**: matriz de 60 casos aprovada como estável; autorização para prosseguir ao cutover.
**PRs/commits relacionados**: não determinado (nenhum número de PR citado nesta parte específica da conversa; PR #67 mencionado nas etapas seguintes como o PR já em curso desta fatia).

---

## Correções pontuais de workflow `pages.yml` (SHA truncado; `pwsh` vs `powershell`)

**Data**: não determinado
**Propósito**: destravar a execução do workflow `pages.yml` recém-criado, que falhava antes de rodar qualquer teste.
**Recursos**: GitHub Actions, `actions/upload-artifact@v7.0.1`, PowerShell/`pwsh`.
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: nenhuma; diagnóstico feito pelo Codex via log de erro.
**O que foi feito**: Aprovadas duas correções: (1) SHA de `actions/upload-artifact@v7.0.1` estava truncado em um caractere (`043fb46d1a93c77aae656e7c1c64a875d1fc6a0` faltando o `a` final); (2) preflight executado via `powershell -File` não tinha `Get-FileHash` disponível no runner Windows deste workflow específico — corrigido usando `pwsh -NoProfile`, reaproveitando padrão já validado em `ci.yml`.
**Conclusões/decisões tomadas**: ambas as correções aprovadas e aplicadas.
**PRs/commits relacionados**: PR #67 (mencionado explicitamente como o PR em questão).

---

## Correção de disputa de concorrência entre workflows `ci.yml` e `pages.yml`

**Data**: não determinado
**Propósito**: corrigir falha em smoke autenticado de GA causada por dois workflows rodando simultaneamente e usando a mesma conta Firebase descartável.
**Recursos**: GitHub Actions (`concurrency` group), Firebase (conta de teste compartilhada).
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: nenhuma externa.
**O que foi feito**: Aprovada serialização via grupo de `concurrency` compartilhado entre `ci.yml` e `pages.yml`, com `cancel-in-progress: false`.
**Conclusões/decisões tomadas**: aprovado e implementado.
**PRs/commits relacionados**: PR #67.

---

## Merge do PR #67 e cutover de produção (mudança do mecanismo de deploy do GitHub Pages)

**Data**: não determinado (dashboards mostraram execuções datadas "Jul 26, 22:07 GMT+2" e "Jul 26, 21:49 GMT+2" referentes a este mesmo PR)
**Propósito**: publicar definitivamente a migração Vite, trocando o Pages de "Deploy from a branch" para "GitHub Actions".
**Recursos**: GitHub Pages, GitHub Actions, Settings → Pages.
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: nenhuma.
**O que foi feito**: Claude guiou passo a passo: revisão do diff, mudança de configuração de Source do Pages, merge do PR, acompanhamento do workflow (quality gate → build → deploy) via prints enviados pelo usuário.
**Conclusões/decisões tomadas**: PR #67 mesclado; workflow confirmado rodando com sucesso.
**PRs/commits relacionados**: PR #67.

---

## Diagnóstico e correção de smoke pós-deploy falhando (bug de barra inicial em URL)

**Data**: não determinado (log de erro trazido pelo usuário traz timestamp `2026-07-27T00:06:48`)
**Propósito**: investigar por que o smoke automático pós-deploy falhava mesmo com o site confirmado funcionando manualmente.
**Recursos**: Playwright, `URL()` (semântica de resolução de baseURL), HTTP.
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: nenhuma pesquisa externa; hipótese formulada por Claude, confirmada pelo Codex via teste HTTP direto (`new URL('/index.html', baseURL)` resolvendo para a raiz do domínio, HTTP 404, versus a URL correta sem barra inicial, HTTP 200).
**O que foi feito**: Claude formulou a hipótese da barra inicial em `page.goto('/index.html')`; Codex confirmou a causa exata e aplicou a correção de uma linha em `tests/smoke/test-helpers.js`, linha 27 (`page.goto('/index.html', ...)` → `page.goto('index.html', ...)`).
**Conclusões/decisões tomadas**: correção aprovada, validada (smoke legado e Vite: 20 aprovados cada; Pages real desktop/mobile aprovados; hash de `app.js`/`nutrition-tracker.jsx` idêntico) e mesclada.
**PRs/commits relacionados**: PR #68.

---

## Sub-fatia 1 do Capacitor — base do empacotamento Android

**Data**: não determinado
**Propósito**: iniciar formalmente o empacotamento do app como aplicativo Android nativo via Capacitor, tendo concluído toda a migração Vite.
**Recursos**: Capacitor 8.4.2, Android Studio, Node.js v24.18.0.
**Arquivos/documentos produzidos**: nenhum arquivo gerado por Claude (prompt de Tarefa 0 escrito no corpo da conversa, não salvo como arquivo separado).
**Pesquisas/análises realizadas**: Codex confirmou compatibilidade de versões (Node, Android Studio 2026.1.2) com os requisitos do Capacitor 8; mapeou APIs de navegador em uso (localStorage, getUserMedia/BarcodeDetector, fetch, FileReader, Blob/downloads, clipboard, window.open) quanto ao risco de comportamento diferente em WebView; investigou histórico de bugs do scanner (identificado bug de verificação insuficiente de `BarcodeDetector`, documentado pela própria Chrome como insuficiente); avaliou risco de autenticação Firebase via REST em WebView (concluiu que deveria funcionar sem alteração de código, mas exigindo teste físico obrigatório).
**O que foi feito**: Claude redigiu prompt de Tarefa 0 cobrindo confirmação de ambiente, mapeamento de riscos, decisões pendentes de aprovação (Application ID, nome, versionamento, ícone/splash, permissões), explicação do processo de assinatura, e proposta de sequência de 8 sub-fatias. Após resposta do Codex, aprovação final consolidada: Application ID `com.hermegas.phrona` (nome vigente neste momento da conversa — posteriormente revertido, ver seção de naming), versionamento conforme proposto, câmera como recurso opcional, decisão de minSdk 26 adiada, Play App Signing com "Let Google manage and protect the app signing key".
**Conclusões/decisões tomadas**: Sub-fatia 1 aprovada e implementada. Resultado relatado pelo Codex: Capacitor 8.4.2 instalado e fixado; projeto Android gerado com API 24–36; `versionCode 1`/`versionName 0.8.1-beta`; Manifest só com `INTERNET`; 689 testes unitários; matriz cutover com duas divergências intermitentes que passaram ao repetir isoladamente.
**PRs/commits relacionados**: PR #69.

---

## Validação manual informal no emulador Android e formalização da Sub-fatia 2

**Data**: não determinado
**Propósito**: primeira execução real do app dentro do ambiente Capacitor, e posterior formalização em PR.
**Recursos**: Android Studio, emulador Pixel 8 (API 36).
**Arquivos/documentos produzidos**: nenhum (relatório `CAPACITOR_ANDROID_SUBFATIA_2.md` gerado pelo Codex, não por Claude).
**Pesquisas/análises realizadas**: nenhuma externa; diagnóstico do Codex sobre bloqueio de build local por regra de permissão (ACL) do Windows herdada pela pasta.
**O que foi feito**: Usuário testou manualmente (app compilou; splash placeholder do Capacitor apareceu; tela de login carregou em três idiomas; login Firebase funcionou com dados reais; navegação entre abas funcionou). Claude esclareceu que isso confirmava a base mas não encerrava formalmente a sub-fatia, e escreveu prompt de formalização.
**Conclusões/decisões tomadas**: Sub-fatia 2 formalizada e aprovada. APK de debug gerado (SHA-256 `C28C173A...`); 689 unitários; smoke legado/Vite 20/20 cada; cutover 60/60.
**PRs/commits relacionados**: PR #70.

---

## Sub-fatia 3 — validação funcional em aparelho físico real

**Data**: não determinado
**Propósito**: validar Firebase, persistência de dados, backup, e diagnosticar (sem corrigir) o scanner web atual num aparelho Android físico.
**Recursos**: Android físico, ADB, Android Studio.
**Arquivos/documentos produzidos**: nenhum arquivo gerado por Claude (roteiro e relatório gerados pelo Codex).
**Pesquisas/análises realizadas**: nenhuma externa; roteiro de teste estruturado em 9 seções elaborado pelo Codex a pedido de Claude.
**O que foi feito**: Claude escreveu prompt de Tarefa 0; Codex respondeu com roteiro cobrindo preparação do aparelho, autenticação Firebase completa, persistência/conectividade, backup/importação/clipboard, links externos, scanner (diagnóstico apenas), e comportamento geral do Android.
**Conclusões/decisões tomadas**: quatro achados registrados no inventário de bugs do projeto (atualizado para 60 itens pelo Codex): **A12** (perda silenciosa de refeições offline), **D15** (exportação inoperante no Android), **D16** (ausência de permissão de câmera — esperado nesta fase), **D17** (botão Voltar minimiza o app incorretamente).
**PRs/commits relacionados**: PR #71.

---

## Brainstorm e geração de ícone/logo provisório (primeira rodada, sob o nome "Phrona")

**Data**: não determinado
**Propósito**: destravar a Sub-fatia 4 (assets/manifest) gerando um ícone provisório via IA de imagem, já que o usuário ainda não tinha logo definitiva.
**Recursos**: gerador de imagem externo (mencionado como "GPT" pelo usuário, fora do escopo de ferramentas do Claude).
**Arquivos/documentos produzidos**: nenhum arquivo de imagem gerado por Claude — apenas prompts de texto em inglês, redigidos na conversa, para o usuário testar externamente.
**Pesquisas/análises realizadas**: Claude explicou princípios de design de ícone (evitar saturação de cor azul/verde no setor de saúde, contraste de forma arredondada vs. angular, teste de legibilidade a 60px, restrição técnica de camadas foreground/background do ícone adaptativo Android).
**O que foi feito**: Três prompts de imagem gerados (letra "P" estilizada; forma orgânica de broto; monograma geométrico duotone). Refinamentos pedidos pelo usuário (fugir do "T"/"P" em bloco reto; tentar esconder uma letra dentro da forma abstrata — esta tentativa específica não teve sucesso, com o usuário relatando que a ferramenta de imagem externa afirmou falsamente ter escondido a letra).
**Conclusões/decisões tomadas**: escolhida a versão abstrata de broto/folha, sem letra escondida, como ícone provisório.
**PRs/commits relacionados**: não determinado (a implementação técnica do ícone ocorreu na Sub-fatia 4, PR #72).

---

## Sub-fatia 4 — ícones/splash provisórios e permissão de câmera

**Data**: não determinado
**Propósito**: gerar assets nativos a partir do placeholder de imagem e declarar formalmente a permissão de câmera.
**Recursos**: Capacitor (geração de ícone adaptativo Android), `AndroidManifest.xml`.
**Arquivos/documentos produzidos**: nenhum gerado por Claude.
**Pesquisas/análises realizadas**: nenhuma externa.
**O que foi feito**: Prompt de Tarefa 0 cobrindo geração de ícone/splash a partir de imagem única (sem camadas foreground/background separadas), e permissões finais (`CAMERA` opcional, com os três `uses-feature` relacionados também marcados `required=false`).
**Conclusões/decisões tomadas**: aprovado. Resultado: ícones provisórios (Web e Android) gerados; splash regenerada retrato/paisagem; permissões de câmera declaradas como opcionais; três ícones web antigos removidos e substituídos; `background_color` do manifest atualizado para `#0D3F2A`; 689 unitários; build Android com 93 tarefas.
**PRs/commits relacionados**: PR #72.

---

## Sub-fatia 5 — scanner de código de barras nativo

**Data**: não determinado
**Propósito**: substituir a fragilidade histórica do scanner web por solução nativa confiável, preservando compatibilidade web integral.
**Recursos**: `@capacitor-mlkit/barcode-scanning@8.1.0` (ML Kit/Capawesome), avaliado contra `@capacitor/barcode-scanner` (plugin oficial).
**Arquivos/documentos produzidos**: nenhum gerado por Claude.
**Pesquisas/análises realizadas**: comparação detalhada entre os dois plugins, incluindo dado quantitativo de impacto de minSdk 26 (API 24+25 somam 0,8% dos dispositivos ativos, segundo dado oficial de distribuição do Android Studio referenciado como de dezembro/2025). Constatação de que o plugin oficial carece de `stopScan()` público.
**O que foi feito**: Claude escreveu Tarefa 0 solicitando comparação; Codex recomendou `@capacitor-mlkit/barcode-scanning@8.1.0` com justificativa técnica; Claude aprovou. Spike isolado testado fisicamente revelou câmera funcionando mas prévia visualmente encoberta; investigação em camadas identificou causa raiz (regra CSS do tema escuro do One UI mantendo fundo do `body` opaco) e correção cirúrgica aplicada.
**Conclusões/decisões tomadas**: scanner nativo integrado ao fluxo real de "Alimentos", testado fisicamente com sucesso (câmera abre, lê código real, cancela corretamente, lanterna funciona, tema claro/escuro ok).
**PRs/commits relacionados**: PR #73.

---

## Saga de naming/branding (múltiplos ciclos dentro desta conversa)

**Data**: não determinado
**Propósito**: decidir e validar o nome comercial definitivo do app.
**Recursos**: nenhum recurso técnico; pesquisa de disponibilidade via busca na web.
**Arquivos/documentos produzidos**: `Nomes_App_Parte1_Grego_Portugues_Tupi.md` (50 nomes gregos, 50 portugueses, 50 tupi, com etimologia e justificativa individual); `Nomes_App_Parte2_Japones_Inventado_Hibridos.md` (50 japoneses, 50 inventados/fonéticos, 15 híbridos, resumo executivo com top 5 favoritos).
**Pesquisas/análises realizadas** (lista completa dos nomes checados nesta conversa, com resultado):
- **Hercules/Héracles**: descartado — 8+ apps de fitness já usando o nome.
- **Athena**: descartado — saturação em múltiplas categorias, incluindo a empresa de saúde clínica `athenahealth`.
- **Nutrix**: descartado — 4+ apps diretos já usando.
- **Askia**: favorito temporário; descartado pelo próprio usuário por soar foneticamente como "asco" em português/espanhol.
- **Eudia**: descartado — colisão com empresa de tecnologia jurídica avaliada em US$105 milhões.
- **Areta**: bem avaliada, mas preterida por outras escolhas do usuário.
- **Bakwa/Bakwara** (de *baquara*/*mbaekwara*, tupi): favorito por tempo considerável; descartado após confirmação independente de quatro problemas: (1) "bak kwa"/"bakkwa" é petisco de carne seca tradicional em Singapura/Malásia/Taiwan/Filipinas; (2) associação em suaíli confirmada em dois dicionários independentes ("-bakwa" como forma passiva do verbo "-baka", que significa "estuprar/molestar"); (3) coincidência com sobrenome do futebolista francês Dilane Bakwa; (4) variação "Bakwara" associada em hindi a "tagarelice/discurso sem sentido" e é nome de localidades indianas.
- **Trofia** (grego, *trophê*, "nutrição/crescimento"): escolha final. Riscos identificados e conscientemente aceitos: "Trofia S.A." (distribuidora de alimentos congelados, categoria adjacente); "Trofi Foods" (app concorrente direto confirmado, mesma categoria de diário alimentar com foto+IA).
- **Troffia** (variação com dois Fs): avaliada e descartada — mesma pronúncia de "Trofia", e é grafia histórica de massa italiana ligur ("trofie").
**O que foi feito**: Framework de avaliação estabelecido (fonossemântica — vogais anteriores/posteriores, plosivas vs. líquidas; fluência cognitiva — 2-3 sílabas, 5-8 letras; adaptabilidade translinguística PT/ES/EN; espectro de distintividade legal — fantasia/arbitrário/sugestivo/descritivo/genérico). Pesquisa extensa de 265+ nomes produzida a pedido do usuário. Checagem de disponibilidade feita em lotes, com tabela de resultado (🟢/🟡/🔴).
**Conclusões/decisões tomadas**: nome comercial definitivo fixado como **Trofia**. Esclarecimentos adicionais dados durante o processo: nome legal de empresa/desenvolvedor pode diferir do nome do app; registro de marca precisa corresponder ao nome realmente exibido ao público; nome do app pode variar por país/região via ficha personalizada de loja; formato "Nome: Subtítulo" na ficha da loja é prática comum (exemplos citados: Calm, Notion, Todoist).
**PRs/commits relacionados**: não determinado (a implementação técnica da renomeação ocorreu em PR próprio, ver seção correspondente).

---

## Discussões diversas sobre conta de desenvolvedor Google Play e questões de negócio

**Data**: não determinado
**Propósito**: dúvidas pontuais do usuário sobre a conta de desenvolvedor, arquitetura de dados e cadastro do app.
**Recursos**: Google Play Console, Firebase, Firestore.
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: pesquisa sobre alteração de endereço vinculado à conta de desenvolvedor (fácil no mesmo país; exige recriar perfil de pagamento se mudar de país); pesquisa sobre exibição pública de dados do desenvolvedor na ficha da loja (nome civil/país/e-mail sempre visíveis; endereço completo só se houver monetização); pesquisa sobre viabilidade de endereço virtual/PO Box (inviável em conta Individual, só Organização permite endereço de empresa).
**O que foi feito**: Respostas pontuais, incluindo avaliação de viabilidade de migração futura do Firebase (Firestore comportaria escala; migração de autenticação exigiria redefinição de senha pelos usuários, mitigado pela camada de abstração já existente em `firebase-storage.js`) e validação da estratégia de cache local/offline-first sugerida pelo próprio usuário.
**Conclusões/decisões tomadas**: nenhuma migração de Firebase decidida (discussão especulativa); campos de cadastro da conta de desenvolvedor preenchidos pelo usuário com orientação de Claude.
**PRs/commits relacionados**: não determinado / não aplicável (decisões de conta, não de código).

---

## Sub-fatia 6A1 — correção do botão Voltar do Android

**Data**: não determinado
**Propósito**: corrigir o item **D17** do inventário de bugs (botão/gesto Voltar minimizando o app em quase qualquer estado).
**Recursos**: `@capacitor/app` (plugin de listener de `backButton`).
**Arquivos/documentos produzidos**: nenhum gerado por Claude.
**Pesquisas/análises realizadas**: nenhuma externa; causa raiz diagnosticada pelo Codex (ausência de histórico de URL/`window.history`, navegação inteiramente baseada em estado React).
**O que foi feito**: Hierarquia de interceptação de 7 níveis proposta e aprovada (submodal → modal/painel → menus/edições contextuais → tela secundária/Adicionar → data histórica no Diário → aba anterior → só minimizar no Diário de hoje sem nada aberto), com proteção explícita para telas obrigatórias (perfil). Arquitetura de dispatcher central com listener único e consumidores em cadeia de responsabilidade.
**Conclusões/decisões tomadas**: implementado, testado fisicamente e iterado (ajustes: Diário limpa histórico ao toque explícito; Voltar no Diário de hoje minimiza imediatamente; Semana→data histórica retorna corretamente).
**PRs/commits relacionados**: PR #74.

---

## Sub-fatia 6A2 — exportação/importação nativa e correção de crash

**Data**: não determinado
**Propósito**: corrigir o item **D15** (exportação inoperante) e investigar falha de importação encontrada durante teste físico.
**Recursos**: `@capacitor/filesystem`, `@capacitor/share`, `logcat` (Android).
**Arquivos/documentos produzidos**: nenhum gerado por Claude.
**Pesquisas/análises realizadas**: nenhuma externa; causa raiz confirmada pelo Codex via `logcat` (exceção `TransactionTooLargeException`, originada de duplicação de um backup de 1,66 MB no estado da Activity, totalizando 3,32 MB, excedendo o limite do binder do Android).
**O que foi feito**: Adaptador `exportFile()` assíncrono aprovado (web inalterado; Android usando `Directory.Cache` + `@capacitor/share`). Após teste físico do usuário, quatro problemas reportados: ausência de opção "salvar no aparelho"; arquivo não aparecendo em "Recentes"; importação completando sem refletir dados no app (registrado como **D18**); botão Voltar aparentemente minimizando (posteriormente identificado como não-regressão, já que o APK testado era anterior ao merge do PR #74). Correção do crash: preparar conteúdo em cache antes de abrir o seletor, evitando a duplicação em memória.
**Conclusões/decisões tomadas**: corrigido e validado; fallbacks locais antigos não sobrepõem mais dados importados; mensagem de sucesso deixou de ser falsa; botão "Atualizar dados" passou a recarregar visivelmente.
**PRs/commits relacionados**: PR #75.

---

## Sub-fatia 6B — teclado, safe areas, retomada, e barra de status contínua

**Data**: não determinado
**Propósito**: completar o polimento de Android restante do plano original.
**Recursos**: SystemBars (nativo do `@capacitor/core` 8), CSS (`env()`/`--safe-area-inset-*`), `viewport-fit=cover`.
**Arquivos/documentos produzidos**: nenhum gerado por Claude.
**Pesquisas/análises realizadas**: nenhuma externa.
**O que foi feito**: Teste físico de teclado feito primeiro, sem revelar necessidade de correção preventiva. Safe areas implementadas via variáveis CSS centrais priorizando `--safe-area-inset-*` (fallback do Capacitor 8) com fallback adicional para `env()`, aplicadas seletivamente. Melhoria adicional pedida pelo usuário durante o teste físico e implementada no mesmo PR: barra de status transparente/contínua com o fundo do app em ambos os temas.
**Conclusões/decisões tomadas**: aprovado, testado fisicamente sem bugs. Falhas de CI observadas no PR foram diagnosticadas como pré-existentes na `main` (não causadas por este PR).
**PRs/commits relacionados**: PR #76.

---

## Renomeação completa: Phrona → Trofia

**Data**: não determinado
**Propósito**: aplicar tecnicamente, em todo o projeto, o nome comercial definitivo decidido na saga de naming.
**Recursos**: Application ID Android, `strings.xml`, `manifest.json`, `i18n`.
**Arquivos/documentos produzidos**: nenhum gerado por Claude (novo ícone provisório, com forma de broto/folha, fornecido pelo usuário a partir de geração externa).
**Pesquisas/análises realizadas**: nenhuma externa; auditoria interna do Codex encontrando 27 arquivos versionados com referências a "Phrona"/"phrona", incluindo nomes residuais ainda mais antigos ("Diário Nutricional", "Nutrition Tracker").
**O que foi feito**: Decisões de escopo deliberadas pelo usuário, com input de Claude: (1) atualizar todo texto/nome visível; (2) **não** atualizar classes CSS internas com prefixo "phrona-" no scanner (decisão explícita, tratada como "legado de arquitetura interna" sem benefício real); (3) **não** renomear os arquivos `nutrition-tracker.jsx`/`nutrition-tracker-controller.js` em si (mesma categoria de decisão, comparada por Claude a práticas reais de empresas — Instagram/codinome "Burbn", Slack/codinome "Glitch" — citadas como exemplo de prática de mercado); (4) regeneração completa de 26 PNGs Android + 4 arquivos web a partir do novo ícone; (5) Application ID alterado para `com.hermegas.trofia`; (6) textos de justificativa de câmera atualizados em PT/EN/ES.
**Conclusões/decisões tomadas**: implementado, testado fisicamente (app instalado como aplicativo separado do "Phrona" antigo, já que o Application ID mudou) e mesclado.
**PRs/commits relacionados**: PR #77.

---

## Sub-fatia 7 — geração da chave de assinatura (upload key) e primeiro `.aab`

**Data**: **30 de julho de 2026** (data explícita, confirmada por saída do comando `keytool` mostrando "Fecha de Creación: 30 de jul. de 2026" e pela Play Console mostrando "Data do lançamento: 30 de jul. 02:38")
**Propósito**: gerar a chave de assinatura de upload e o primeiro pacote `.aab` assinado, necessário para publicação no Google Play.
**Recursos**: Android Studio (`Generate Signed Bundle/APK`), formato PKCS12, RSA 2048 bits, `keytool`.
**Arquivos/documentos produzidos**: nenhum arquivo gerado por Claude; `keystore.properties.example` e configuração de `build.gradle` gerados pelo Codex; `keystore.properties` real criado localmente pelo usuário (nunca enviado ao chat).
**Pesquisas/análises realizadas**: nenhuma externa nesta etapa específica.
**O que foi feito**: Parte 1 (estrutura, sem chave real): `build.gradle` configurado para ler credenciais de `keystore.properties` não commitado, falhando com mensagem clara em builds de release sem esse arquivo; `versionCode` incrementado de 1 para 2; teste automatizado adicionado comparando `versionName` do Gradle com `package.json`. Parte 2 (manual, guiada passo a passo por Claude): geração da keystore via Android Studio, com campos do certificado preenchidos ("Clóvis Magno Gonçalves", organização "Hermegas", cidade Sevilha, país ES — esclarecido que esses dados não aparecem publicamente e são independentes da conta de desenvolvedor). Problemas técnicos diagnosticados e resolvidos durante o processo: assistente fechado no meio do processo na primeira tentativa (keystore criado mas `.aab` não gerado, confirmado e resolvido via `keytool -list -v`); Android Studio mostrando Application ID desatualizado por estar numa branch antiga não sincronizada com a `main` mesclada (resolvido trocando de branch); geração inicial de **APK** em vez do **AAB** correto (identificado e corrigido repetindo o assistente com "Android App Bundle" selecionado explicitamente); arquivo `.aab` inicialmente não localizado no caminho esperado (localizado por busca `*.aab` no sistema).
**Conclusões/decisões tomadas**: chave gerada com sucesso (alias `upload`, validade de 25 anos); `.aab` de release gerado com sucesso; backup da chave realizado pelo usuário no Google Drive, após Claude corrigir seu próprio tom inicial (esclarecendo que, com Play App Signing habilitado, a perda da upload key é recuperável via reset pelo Google, reduzindo a urgência do backup duplicado inicialmente recomendado).
**PRs/commits relacionados**: PR #78 (parte 1, estrutura). A geração da chave e do `.aab` em si não corresponde a um PR (ação local/manual, fora do fluxo de código versionado).

---

## Sub-fatia 8 — publicação na faixa de teste interno do Google Play

**Data**: **30 de julho de 2026** (mesma data da Sub-fatia 7, sequência imediata conforme timestamp da Play Console)
**Propósito**: publicar de fato o app na Google Play Console, faixa de teste interno.
**Recursos**: Google Play Console, faixa de teste interno, Play App Signing.
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: confirmação de que a regra de 12 testadores/14 dias bloqueia apenas a faixa de produção, não a de teste interno; confirmação de que o Google Play não notifica testadores automaticamente — o link de opt-in precisa ser compartilhado manualmente.
**O que foi feito**: Claude guiou passo a passo: criação do app na Play Console (nome "Trofia", nome de pacote `com.hermegas.trofia`); aceite dos Termos de Serviço da Assinatura de Apps; escolha de idioma padrão (português); criação de versão de teste interno; upload do `.aab`; esclarecimento de três avisos não-bloqueantes (ausência de testadores especificados; ausência de arquivo de desofuscação; ausência de símbolos de depuração nativa); criação de lista de e-mails de testadores; diagnóstico de erro "item não encontrado" na primeira tentativa de instalação (atribuído a demora de propagação da primeira publicação, não a erro de configuração).
**Conclusões/decisões tomadas**: **app publicado com sucesso**; testadores confirmados recebendo e instalando o app.
**PRs/commits relacionados**: não aplicável (ação realizada inteiramente na interface web do Google Play Console, sem código).

---

## Atualização cosmética do "Project name" no Firebase Console

**Data**: não determinado (posterior à Sub-fatia 8)
**Propósito**: atualizar o nome de exibição do projeto Firebase, ainda mostrando "Nutrition Tracker".
**Recursos**: Firebase Console.
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: nenhuma (esclarecimento baseado em conhecimento já estabelecido em conversa anterior sobre a diferença entre "Project name" cosmético e "Project ID" técnico).
**O que foi feito**: Claude confirmou que a alteração é segura e puramente cosmética; usuário confirmou ter feito a mudança para "Trofia".
**Conclusões/decisões tomadas**: alterado.
**PRs/commits relacionados**: não aplicável.

---

## Planejamento de arquitetura de IA nativa: migração de Groq (BYOK) para proxy gerenciado

**Data**: não determinado (posterior à publicação na Play Store)
**Propósito**: eliminar a exigência de cada usuário configurar manualmente uma chave de API para as funcionalidades de IA, sem expor uma chave fixa e extraível no código cliente.
**Recursos**: Groq API (`llama-3.3-70b-versatile`, estado atual), Cloudflare Workers (proxy escolhido), Gemini API (Flash/Flash-Lite, provedor de destino escolhido), Firebase Authentication (validação de token RS256 sem Admin SDK).
**Arquivos/documentos produzidos**: nenhum arquivo de código; prompts de Tarefa 0 redigidos no corpo da conversa.
**Pesquisas/análises realizadas**:
- Limites da camada gratuita do Groq confirmados (30 RPM, 1.000 RPD, 12.000 TPM, 100.000 TPD, por organização inteira, não por usuário) — busca datada como referente a "junho de 2026" pelo próprio Claude durante a pesquisa.
- Comparação de custo-benefício entre provedores de IA para tarefas de extração/classificação estruturada: DeepSeek V3.2/V4 (~US$0,14/US$0,28 por milhão de tokens), Gemini 2.5 Flash-Lite (~US$0,10/US$0,40 por milhão de tokens, com camada gratuita), GPT-4.1 Nano (~US$0,10 por milhão de tokens) — pesquisa datada como referente a "julho de 2026".
- Limites da camada gratuita do Gemini Flash/Flash-Lite confirmados (~1.500 RPD, 15 RPM, 1.000.000 TPM, sem cartão de crédito) — com ressalva encontrada de que ativar cobrança em qualquer parte do projeto Google Cloud remove a camada gratuita inteiramente daquele projeto.
- Consulta ao Codex sobre a integração atual do Groq no código (chave salva em `localStorage` como `groq_key`; consumida por `groq-client.js`; usada por 6 módulos de funcionalidade de IA através do contrato único `callAI(prompt, maxTokens)` — identificados nominalmente como `meal-review-ai.js`, `food-autofill-ai.js`, `dish-description-ai.js`, `nutrition-feedback-ai.js`, `eating-patterns-ai.js`, e a função "Sugerir o que comer" implementada em `nutrition-tracker-controller.js`).
- Estimativa de volume de uso real esperado, feita pelo Codex: o gargalo real seria o limite de 100.000 tokens/dia do Groq, não o de 1.000 requisições/dia, com estimativa de 50 a 200 chamadas reais possíveis por dia dependendo do tamanho médio do prompt (considerado suficiente para ~10-20 testadores moderados nesta fase).
**O que foi feito**: Claude recomendou arquitetura de proxy serverless (Cloudflare Workers, 100.000 requisições/dia gratuitas, sem cartão) para esconder a chave real de IA, em vez de embuti-la no código cliente. Prompt de Tarefa 0 escrito e respondido pelo Codex, propondo: endpoint restrito (`POST /v1/ai/completion`); validação de token Firebase via RS256 (checando `kid`, `aud`, `iss`, `exp`, `iat`, `sub`), sem exigir o Admin SDK; rate limit por UID (5/min) e global (25 RPM, abaixo do limite do Groq); chave real como Cloudflare Secret; limite de tamanho de prompt (~40.000 caracteres); ausência de logging de prompts/dados nutricionais/respostas; manutenção do BYOK como opção avançada para usuários já configurados (proposta original do Codex). O usuário decidiu alterar esse último ponto: **todos** os usuários, sem exceção, passariam a usar o modo gerenciado único, eliminando a alternância BYOK — decisão consciente de que isso concentraria todo o uso na cota compartilhada desde já (mitigado pelo fato de que, na prática, todos os testadores já usavam a mesma chave Groq compartilhada manualmente). Posteriormente, decisão de trocar o provedor de Groq para Gemini Flash/Flash-Lite, com prompt final reescrito incorporando ambas as mudanças (modo único + Gemini).
**Conclusões/decisões tomadas**: arquitetura aprovada (Cloudflare Workers + validação Firebase + rate limiting); modo único gerenciado aprovado (sem alternância BYOK); provedor definido como Gemini Flash/Flash-Lite; prompt final consolidado escrito e enviado ao Codex. **A resposta desta Tarefa 0 (plano detalhado do Codex) não está registrada nesta conversa** — o usuário decidiu abrir uma sessão nova, tanto no Claude quanto no Codex, para dar continuidade a este trabalho específico. Portanto, este item corresponde apenas a **especificação e decisão de arquitetura**, sem implementação de código registrada nesta conversa.
**PRs/commits relacionados**: não determinado — nenhum PR foi mencionado nesta conversa em relação a este trabalho específico; a implementação real, se e quando ocorrer, provavelmente aconteceu ou acontecerá em conversa/sessão separada, não coberta por este documento.

---

## Consulta sobre consumo de minutos do GitHub Actions (decisão futura sobre privacidade do repositório)

**Data**: não determinado (consulta feita nos últimos 30 dias a partir do momento da pergunta, sem data-base explícita)
**Propósito**: avaliar se a cota de 3.000 minutos/mês do GitHub Pro seria suficiente, no caso de o usuário decidir tornar o repositório privado no futuro (motivação declarada: privacidade para código proprietário).
**Recursos**: GitHub Actions, GitHub Pro (plano pago).
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: consulta direta ao Codex sobre uso histórico de CI (não pesquisa externa).
**O que foi feito**: Pergunta incluída no mesmo prompt de Tarefa 0 da arquitetura de IA (item anterior). Codex reportou: 305 execuções de workflow nos últimos 30 dias antes da checagem, aproximadamente 1.884,6 minutos acumulados (CI: 177 runs/1.194,9 min; Build/deploy Pages: 36 runs/612,8 min; Pages automático: 92 runs/76,9 min). Custo atual confirmado como zero, já que o repositório é público (runners padrão gratuitos). Recomendação explícita do Codex de **não confiar** que os 3.000 minutos/mês do plano Pro seriam suficientes nas condições atuais, dado que as duas suítes principais rodam em Windows (custo dobrado na cota paga) e há verificação duplicada entre `ci.yml` e `pages.yml`; sugestão de consolidar checagens duplicadas ou migrar mais suíte para Ubuntu antes de tornar o repositório privado.
**Conclusões/decisões tomadas**: nenhuma decisão final tomada sobre tornar o repositório privado — informação registrada para decisão futura.
**PRs/commits relacionados**: não aplicável.

---

## Discussão sobre renomear o repositório GitHub de "nutrition-tracker" para "trofia"

**Data**: não determinado
**Propósito**: usuário perguntou se poderia renomear o repositório sem causar problemas técnicos.
**Recursos**: GitHub (mecanismo de renomeação de repositório), GitHub Pages, GitHub Actions (`PAGES_BASE_URL`).
**Arquivos/documentos produzidos**: nenhum.
**Pesquisas/análises realizadas**: nenhuma externa; raciocínio baseado em conhecimento já estabelecido do projeto sobre a variável `PAGES_BASE_URL` usada em testes.
**O que foi feito**: Claude explicou que a URL de produção do GitHub Pages mudaria e a forma antiga deixaria de funcionar; listou o que precisaria ser atualizado (`PAGES_BASE_URL` no CI, pasta local do repositório, remote do Git); confirmou que histórico de commits/PRs/issues não seria afetado, e que o Application ID Android é tecnicamente independente do nome do repositório.
**Conclusões/decisões tomadas**: usuário decidiu adiar essa mudança para depois, tratando-a como tarefa própria de auditoria antes de executar. **Não foi implementada nesta conversa.**
**PRs/commits relacionados**: não aplicável (discussão não implementada).

---

## Formalização da filosofia de produto do Trofia

**Data**: não determinado (discutido durante o período em que "Bakwa" ainda era o nome vigente do app)
**Propósito**: o usuário articulou que a proposta do app vai além de contagem de calorias/macros — é sobre ajudar a pessoa a compreender os próprios padrões alimentares e decidir por conta própria, sem tom prescritivo ou de cobrança.
**Recursos**: nenhum recurso técnico.
**Arquivos/documentos produzidos**: `Filosofia_Produto_Bakwa.md` (nome do arquivo reflete o nome do app vigente no momento em que foi gerado; conteúdo permanece conceitualmente válido independentemente da mudança de nome posterior para Trofia). **Confirmado por busca na web: não commitado ao repositório — artefato apenas desta conversa.**
**Pesquisas/análises realizadas**: nenhuma externa.
**O que foi feito**: Claude ajudou a formalizar o posicionamento, contrastando exemplos de linguagem prescritiva ("Você excedeu sua meta de carboidratos") com linguagem de compreensão ("Nos últimos 5 dias, seus carboidratos ficaram acima da média — vale dar uma olhada no que mudou?"); propôs um critério de decisão para funcionalidades futuras ("Isso ajuda a pessoa a entender melhor, ou só a cumprir uma meta?"); sugeriu implicações práticas (priorizar tendência sobre meta batida/não batida em gráficos, evitar vermelho como "cor de erro", mensagens que observam e perguntam em vez de medir e cobrar); redigiu taglines candidatas para a ficha da loja.
**Conclusões/decisões tomadas**: documento salvo como esboço de referência, para "refinar quando necessário" (palavras do próprio usuário) — não uma decisão final e fechada, mas um ponto de partida documentado.
**PRs/commits relacionados**: não aplicável (documento conceitual, não código; não versionado).

---

## Produção de documentos de handoff para novas conversas (Claude e Codex)

**Data**: não determinado (última parte cronológica desta conversa)
**Propósito**: o usuário decidiu abrir conversas novas, tanto no Claude quanto no Codex, para continuar o trabalho de arquitetura de IA, dado o tamanho desta conversa; solicitou documentos de continuidade para ambas.
**Recursos**: ferramenta de criação de arquivos do Claude (ambiente isolado, não o repositório).
**Arquivos/documentos produzidos**: `ESTADO_PROJETO_TROFIA.md` e `METODOLOGIA_DE_TRABALHO.md`. **Confirmado por busca na web: nenhum dos dois foi commitado ao repositório — ambos são artefatos apenas desta conversa**, entregues como download ao usuário para colar manualmente na próxima conversa.
**Pesquisas/análises realizadas**: nenhuma; documentos redigidos a partir do conteúdo já discutido nesta própria conversa.
**O que foi feito**: `ESTADO_PROJETO_TROFIA.md` cobriu: visão geral do app, stack técnico, metodologia de trabalho resumida, linha do tempo completa (do monólito original até a publicação), identidade técnica definitiva, pendências conhecidas organizadas por prioridade (incluindo os achados `A12`, `D15`, `D16`, `D17`, `D18` do inventário de bugs), estado exato da arquitetura de IA em andamento, resumo da saga de nomes, e uma nota final avisando que a ferramenta de memória persistente de longo prazo do Claude esteve indisponível durante toda a sessão. `METODOLOGIA_DE_TRABALHO.md` cobriu: papéis de cada participante, o padrão de "Tarefa 0" com exemplos reais de prompt e de aprovação, disciplina de branch/PR, formato de relato de teste físico por seção, a regra de segredos nunca passarem pelo chat, como bugs viram entradas de inventário, estilo de comunicação observado, e o método de pesquisa/verificação de fatos usado ao longo da conversa (com o caso Bakwa/suaíli citado como exemplo de rigor).
**Conclusões/decisões tomadas**: ambos os documentos entregues ao usuário para uso na conversa seguinte, com instrução explícita de colar (não commitar) o conteúdo na primeira mensagem da nova sessão.
**PRs/commits relacionados**: não aplicável — confirmado que nenhum dos dois documentos foi versionado no Git.

---

## Nota final sobre continuidade entre conversas

Esta conversa começou já em andamento, com um resumo de compactação
referenciando uma sessão anterior específica — identificada no início
da conversa como o arquivo de transcrição
`2026-07-29-09-45-54-diario-nutricional-refactor-capacitor.txt` — que
cobriu a refatoração completa do monólito original, toda a migração
Vite, e o início/progresso das sub-fatias 1–5 do Capacitor (das 8
planejadas), além de brainstorm inicial de naming e configuração da
conta de desenvolvedor Google Play. Uma referência a um arquivo
`journal.txt` catalogando outras transcrições também apareceu no início
desta conversa, indicando histórico de múltiplas sessões anteriores
além dessa.

Ao final desta conversa, o próprio usuário solicitou e recebeu dois
documentos de handoff para dar continuidade em uma **conversa futura
nova**, tanto no Claude quanto no Codex — confirmando que o trabalho
de arquitetura de IA nativa (Groq → Gemini via Cloudflare) permanece
**em aberto**, com apenas a especificação e as decisões de arquitetura
registradas nesta conversa, sem confirmação de implementação de código
até o momento em que este documento foi produzido.
