# Histórico da frente — Capacitor Android, identidade Trofia e preparação de release

## Escopo, atribuição e método

Este registro cobre exclusivamente a frente executada nesta conversa entre 28 e 30/07/2026: introdução do Capacitor 8 e do projeto Android, validações em emulador e aparelho físico, assets provisórios, scanner nativo, navegação pelo botão Voltar, exportação/importação nativas, safe areas, identidade definitiva Trofia e preparação da estrutura de assinatura de release. A atribuição conversacional foi confirmada pelo responsável após comparação com os índices de outras sete conversas do projeto.

As datas foram cruzadas entre a memória integral desta conversa, os relatórios versionados das subfatias, os commits de implementação e os commits de merge. A data do arquivo é 30/07/2026, data local do merge do último PR desta frente, o #78. Quando uma validação manual ocorreu antes do merge, as duas datas são distinguidas explicitamente.

Os códigos A12 e D15–D18 são usados porque os achados ou correções correspondem diretamente às entradas atuais de `documentation/estado-atual/BUG-INVENTORY.md`. B09–B11 aparecem apenas como contexto preservado: esta frente não os declarou resolvidos no scanner web. Nenhum código C01–C28 ou N01–N09 foi forçado retrospectivamente, pois o roadmap codificado foi criado depois desta frente e não contém um item específico para a implantação Android já concluída.

Os APKs citados eram artefatos locais de debug, ignorados pelo Git. Seus caminhos, tamanhos e hashes são evidência dos relatórios versionados; eles não são releases do Google Play. As correções posteriores do armazenamento offline, da infraestrutura de IA ou de outros itens do roadmap pertencem a outras frentes e não são reivindicadas aqui.

---

## Base Capacitor e projeto Android

**Data (se determinável):** 28/07/2026.

**Propósito:** criar um wrapper Android nativo para a aplicação web já migrada para Vite, sem reimplementar a lógica do produto nem substituir o caminho de produção web. A base precisava consumir exatamente o conteúdo de `dist/`, preservar Firebase REST, navegação, persistência e módulos existentes, e estabelecer um projeto Android compilável que pudesse evoluir em fatias pequenas até um Android App Bundle publicável.

**Recursos:** Capacitor Core 8.4.2; Capacitor CLI 8.4.2; Capacitor Android 8.4.2; Vite 7.3.6; Gradle Wrapper; Android Gradle Plugin; Android SDK 36; Java/Android Studio; npm; aplicação React existente.

**Arquivos:**

- `package.json` e `package-lock.json` — dependências Capacitor com versões exatas;
- `capacitor.config.json` — configuração inicial com `appId: "com.hermegas.phrona"`, `appName: "Phrona"` e `webDir: "dist"`;
- `android/settings.gradle`, `android/build.gradle`, `android/variables.gradle`, `android/gradle.properties`, `android/gradlew`, `android/gradlew.bat` e `android/gradle/wrapper/*` — estrutura Gradle gerada para a plataforma;
- `android/capacitor.settings.gradle` e `android/app/capacitor.build.gradle` — ligação dos módulos Capacitor;
- `android/app/build.gradle` e `android/app/proguard-rules.pro` — configuração da aplicação Android;
- `android/app/src/main/AndroidManifest.xml` — Activity principal, `FileProvider` e permissão `INTERNET`;
- `android/app/src/main/java/com/hermegas/phrona/MainActivity.java` — Activity mínima baseada em `BridgeActivity`;
- `android/app/src/main/res/layout/activity_main.xml`, `res/values/*`, `res/xml/file_paths.xml`, `res/drawable*/*` e `res/mipmap*/*` — recursos Android iniciais e placeholders gerados;
- `android/app/src/test/**` e `android/app/src/androidTest/**` — testes-modelo do projeto Android;
- `android/.gitignore` e `android/app/.gitignore` — exclusões dos artefatos locais Android.

**O que foi feito:**

- Foram instalados somente os três pacotes necessários à base: `@capacitor/core` e `@capacitor/android` como dependências de produção, e `@capacitor/cli` como dependência de desenvolvimento, todos fixados em `8.4.2`.
- O Capacitor foi inicializado com `dist` como diretório web. Isso conectou o wrapper ao mesmo artefato verificado usado pela produção Vite, em vez de criar uma segunda cópia manual ou apontar para `src/`.
- A plataforma Android foi gerada integralmente, incluindo Gradle Wrapper, Activity, manifest, resources, testes-modelo e arquivos de composição produzidos pelo Capacitor.
- O baseline adotou `minSdkVersion 24`, `compileSdkVersion 36` e `targetSdkVersion 36`. A discussão sobre elevar o mínimo por causa do scanner ficou deliberadamente adiada; a base não antecipou essa decisão.
- O único acesso declarado foi `INTERNET`, suficiente para Firebase REST e demais APIs web já utilizadas. Câmera, assinatura, ícones definitivos e plugins funcionais ficaram fora desta primeira fatia.
- O código de domínio, os módulos extraídos, `barcode-scanner.js`, `app.js`, `nutrition-tracker.jsx` e a configuração existente de Vite/Pages não foram modificados para acomodar o wrapper.
- O build Vite foi gerado, sincronizado para o projeto Android e inspecionado. A plataforma resultante constituiu a fundação dos PRs Android seguintes.

**PRs/commits relacionados:** [PR #69](https://github.com/magnoClovis/nutrition-tracker/pull/69); implementação [`14dd0ce`](https://github.com/magnoClovis/nutrition-tracker/commit/14dd0ce6bacebde6e10de995d2381e2571af674f); merge [`0e69aee`](https://github.com/magnoClovis/nutrition-tracker/commit/0e69aeef2cc4217094a39b04e2a413897bb887f1).

---

## Primeiro APK de debug e validação no emulador

**Data (se determinável):** 28/07/2026.

**Propósito:** comprovar que a base Capacitor não era apenas estruturalmente compilável, mas conseguia executar o Trofia completo dentro da WebView Android antes de qualquer integração nativa funcional. A validação precisava cobrir a parte crítica já identificada na auditoria: login Firebase REST, carregamento de dados reais e navegação entre as áreas principais.

**Recursos:** Android Studio; emulador Pixel 8 com API 36; Gradle `assembleDebug`; Capacitor `sync`; Vite; Firebase Authentication REST; Firestore REST; suíte Node/Playwright existente; assinatura automática de debug Android.

**Arquivos:**

- `CAPACITOR_ANDROID_SUBFATIA_2.md` — relatório versionado da compilação, ambiente, validação manual, regressão web e APK;
- `android/app/build/outputs/apk/debug/app-debug.apk` — artefato local gerado e deliberadamente ignorado pelo Git; nenhum arquivo funcional do aplicativo foi alterado neste PR.

**O que foi feito:**

- O conteúdo web foi reconstruído com `build:vite`, sincronizado com `cap sync android` e compilado pela tarefa `assembleDebug`.
- O wrapper foi executado no Pixel 8/API 36. Foram confirmados o splash placeholder do Capacitor, login em tema escuro, os três idiomas disponíveis e as abas Diário, Alimentos, Semana e Métricas.
- O login por e-mail/senha usando diretamente a API REST do Firebase funcionou dentro da WebView sem ajuste de CORS, cookies, CSP ou Google Cloud. Após a autenticação, dados reais de proteína, calorias e água foram carregados.
- Nenhum ajuste de configuração do aplicativo foi considerado necessário após a execução. Os avisos de `flatDir`, Java, anotação `/*#__PURE__*/` e tamanho do bundle foram classificados como não bloqueantes.
- O Android Studio aberto e a sincronização do OneDrive mantiveram arquivos intermediários do Gradle bloqueados. A solução operacional foi redirecionar temporariamente apenas as saídas do Gradle para `%TEMP%`; nenhuma configuração transitória foi versionada.
- O APK documentado tinha 5.452.557 bytes e SHA-256 `C28C173A093035228643C161ECB30D225B5C6EDB4F1B776105C6C5E0031614AD`. Era assinado pela chave automática de debug e inadequado para publicação.
- A regressão web passou: preflight sem avisos, 689 testes unitários, 20 smokes públicos em cada loader e matriz de cutover 60/60. Os 17 casos autenticados de cada smoke foram ignorados somente pela ausência deliberada das credenciais locais.

**PRs/commits relacionados:** [PR #70](https://github.com/magnoClovis/nutrition-tracker/pull/70); implementação [`8627920`](https://github.com/magnoClovis/nutrition-tracker/commit/862792071b5daf1b7b9ae76836a61e819ee244ab); merge [`29a5369`](https://github.com/magnoClovis/nutrition-tracker/commit/29a53699c74c06d64f02b5ff6d7895f6e17c112d).

---

## A12, D15, D16 e D17 - Validação funcional em aparelho físico

**Data (se determinável):** validação em 28/07/2026; merge do relatório em 29/07/2026 no horário local.

**Propósito:** verificar o comportamento real do primeiro wrapper fora do emulador, especialmente autenticação, sessão, persistência, conectividade, arquivos, clipboard, links externos, câmera e convenções de navegação Android. Esta fatia era primariamente de teste e documentação; os defeitos encontrados deveriam ser reproduzidos e catalogados sem iniciar correções prematuras.

**Recursos:** aparelho Samsung `SM_S938B`; Android Debug Bridge; APK de debug; Firebase Authentication REST; Firestore REST; seletor de arquivos Android; clipboard; navegador do sistema; scanner web existente; modos conectado/offline; `bug-inventory.txt` e checklist de estabilidade.

**Arquivos:**

- `CAPACITOR_ANDROID_SUBFATIA_3.md` — roteiro, resultados e limites da validação física;
- `bug-inventory.txt` — inventário consolidado incorporado ao repositório e acrescido dos achados A12 e D15–D17;
- `STABILITY_TODO.md` — registro das necessidades de estabilidade observadas;
- `android/app/build/outputs/apk/debug/app-debug.apk` — APK local instalado por `adb install -r`, não versionado.

**O que foi feito:**

- O aparelho foi preparado com opções do desenvolvedor e depuração USB, reconhecido como `device` pelo ADB e recebeu o APK preservando a instalação existente.
- O fluxo Firebase foi exercitado de ponta a ponta: login existente, persistência de sessão após forçar parada, logout persistente, recuperação e alteração de senha, cadastro, bloqueio antes da verificação de e-mail, abertura dos links no navegador e login posterior. Não houve CORS, `403` ou falha de cookies na WebView.
- A persistência online foi aprovada: uma refeição permaneceu após fechar e reabrir o app. Offline, dados já persistidos continuaram visíveis, mas gráficos da Semana desapareceram até sair e voltar à aba depois da reconexão.
- Foi reproduzido **A12**: uma refeição criada offline aparecia normalmente, alterava os totais nutricionais e não exibia erro ou estado pendente, mas não era persistida e desaparecia depois. A correção foi explicitamente adiada e pertenceu posteriormente a outra frente offline-first.
- Foi reproduzido **D15**: todas as opções de exportação foram acionadas sem arquivo, seletor, compartilhamento, sucesso ou erro. Como não existia backup confiável, a importação não foi improvisada e ficou bloqueada até a correção.
- Clipboard e links externos funcionaram; o retorno ao aplicativo preservou o estado observado.
- Foi reproduzido **D16**: o Android não solicitava câmera, a ficha do app declarava nenhuma permissão e o scanner mostrava o fallback de câmera indisponível. A busca manual pelo código funcionava, isolando o defeito no acesso à câmera.
- Foi reproduzido **D17**: Voltar minimizava o app mesmo com modal, Configurações ou tela interna aberta. Rotação, minimizar e retomar foram aprovados.
- O resultado geral foi “passou com ressalvas”. Nenhuma correção funcional, permissão, plugin ou alteração do scanner foi incluída neste PR; os quatro achados foram preservados como backlog rastreável.

**PRs/commits relacionados:** [PR #71](https://github.com/magnoClovis/nutrition-tracker/pull/71); implementação [`ddbb805`](https://github.com/magnoClovis/nutrition-tracker/commit/ddbb805eeafa8dcb2e9ae533642c2b7d452a4d46); merge [`49cbea7`](https://github.com/magnoClovis/nutrition-tracker/commit/49cbea7f323f76bbb2be4d9c43828218d45ce57b).

---

## D16 - Assets provisórios e capacidade opcional de câmera

**Data (se determinável):** 29/07/2026.

**Propósito:** substituir os placeholders visuais do projeto Android e da aplicação web por uma identidade provisória coerente, além de remover o bloqueio estrutural que impedia o Android de oferecer a permissão de câmera. A câmera precisava continuar opcional para não excluir dispositivos sem hardware compatível nem declarar uma exigência indevida no Google Play.

**Recursos:** Android adaptive icons; recursos `mipmap` por densidade; splash screens AndroidX; Web App Manifest; favicon/apple-touch icon; PNG; Android Manifest; Vite; câmera Android opcional.

**Arquivos:**

- `icon-placeholder.png` — imagem-fonte provisória desta etapa;
- `android/app/src/main/AndroidManifest.xml` — `CAMERA` e três declarações `uses-feature` opcionais;
- `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher*.png` — 15 ícones launcher/round/foreground;
- `android/app/src/main/res/drawable/splash.png` e `drawable-{port,land}-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash.png` — 11 splash screens;
- `android/app/src/main/res/values/ic_launcher_background.xml` e `mipmap-anydpi-v26/ic_launcher*.xml` — composição do ícone adaptativo;
- `phrona-icon-192.png`, `phrona-icon-512.png`, `phrona-favicon-32.png` e `phrona-apple-touch-icon.png` — assets web provisórios;
- `icon-192.png`, `icon-512.png` e `icone.png` — assets anteriores removidos;
- `manifest.json`, `index.html`, `vite.config.js`, `scripts/verify-vite-build.js` e `tests/fixtures/index.legacy.html` — referências e allowlist atualizadas.

**O que foi feito:**

- Todos os assets Android provisórios foram gerados para as densidades e orientações exigidas; os arquivos web receberam nomes específicos da marca Phrona para evitar referências ambíguas.
- O ícone adaptativo usou a arte como foreground e uma cor sólida coerente como background. A splash reutilizou proporcionalmente a mesma fonte, mantendo uma solução mínima e explicitamente provisória.
- Os três ícones web antigos foram fisicamente removidos, não apenas desconectados. Todas as referências em manifest, HTML, fixture e verificador do build foram migradas, e o histórico Git preservou a reversibilidade.
- O `background_color` do Web App Manifest foi ajustado à arte provisória. O Vite passou a copiar e verificar os novos nomes.
- Para resolver a barreira estrutural de **D16**, o manifest recebeu `android.permission.CAMERA`. `android.hardware.camera.any`, `android.hardware.camera` e `android.hardware.camera.autofocus` foram declarados com `android:required="false"`.
- Nenhum código abriu a câmera nesta fatia. O texto trilíngue de justificativa foi preparado conceitualmente, mas sua apresentação permaneceu reservada à integração do scanner.
- O scanner web e toda a lógica funcional permaneceram inalterados.

**PRs/commits relacionados:** [PR #72](https://github.com/magnoClovis/nutrition-tracker/pull/72); implementação [`6ef00bc`](https://github.com/magnoClovis/nutrition-tracker/commit/6ef00bc82f713ae53d3608f900f276160ae08685); merge [`67d295c`](https://github.com/magnoClovis/nutrition-tracker/commit/67d295c1eea1caeb8243452f9f3aae105078c786).

---

## Scanner nativo isolado e integração completa ao fluxo de alimentos

**Data (se determinável):** 29/07/2026.

**Propósito:** oferecer captura confiável de EAN/UPC no Android usando uma biblioteca nativa, sem modificar o scanner web historicamente frágil nem duplicar a lógica de busca de produtos. A estratégia precisava provar câmera, permissão, lanterna, cancelamento e ciclo de vida em uma superfície sem persistência antes de entregar qualquer código ao `lookupBarcode` existente.

**Recursos:** `@capacitor-mlkit/barcode-scanning@8.1.0`; Capacitor 8; ML Kit do Google; React portal; Android Camera; EAN-13, EAN-8, UPC-A, UPC-E e Code 128; CSS transparente sobre preview nativo; Open Food Facts apenas depois da captura; testes Node com dependências injetadas.

**Arquivos:**

- `src/composite/native-barcode-scanner.js` — serviço nativo de permissão, scan, lanterna e cleanup;
- `src/composite/barcode-scanner-adapter.js` — contrato comum e seleção entre implementação web e Android;
- `src/composite/barcode-scanner-runtime.js` — detecção do runtime Capacitor e composição do plugin;
- `src/native-barcode-scanner.css` — transparência da WebView, bloqueio de scroll e apresentação dos controles;
- `src/App.jsx` e `src/main.jsx` — injeção do adaptador e portal do painel no `document.body`;
- `nutrition-tracker-controller.js` e `pantry-screen.js` — ligação do botão real, estado e controles, sem alterar o lookup;
- `package.json`, `package-lock.json`, `android/app/capacitor.build.gradle` e `android/capacitor.settings.gradle` — plugin e sincronização Android;
- `tests/unit/barcode-scanner-adapter.test.js`, `native-barcode-scanner.test.js`, `pantry-screen.test.js`, `app-entry.test.js` e `nutrition-tracker-controller.test.js` — contratos de runtime, UI e ciclo de vida;
- `CAPACITOR_ANDROID_SUBFATIA_5.md` — roteiro e seis iterações de validação física.

**O que foi feito:**

- A primeira entrega foi um spike deliberadamente isolado: mostrava somente código e formato, sem executar `lookupBarcode`, consultar produto ou persistir dados. A integração real permaneceu bloqueada até o usuário validar leitura, permissão, cancelamento, reinício, lanterna e liberação em segundo plano.
- O adaptador preservou o contrato `createBarcodeScanner(dependencies)`. Navegadores e PWA continuaram recebendo integralmente o controller criado pelo `barcode-scanner.js` existente; somente `Capacitor.isNativePlatform() && getPlatform() === "android"` selecionava ML Kit.
- A implementação nativa passou a solicitar/verificar permissão, iniciar `startScan`, observar códigos suportados, controlar lanterna e executar `stopScan` com remoção de listeners.
- Um identificador de sessão compartilhado descarta concessões ou resultados tardios depois do cancelamento. Fechar modal, desmontar, minimizar e cancelar convergem para cleanup idempotente; a câmera é parada antes de entregar o código ao fluxo de produto.
- Depois do spike, o código lido passou aos callbacks existentes `setInput(code)` e `lookupBarcode(code)`. `lookupBarcode`, `fetchBarcodeProduct`, Open Food Facts e `barcode-scanner.js` permaneceram inalterados.
- A câmera capturava e a lanterna funcionava, mas o tema escuro deixava a prévia preta. A causa foi localizada na regra One UI `body:has([data-one-ui-root][data-theme="dark"])`, cuja especificidade mantinha background opaco. Um seletor limitado às classes de scan tornou somente `background-color` e `background-image` transparentes, preservando o tema.
- No fluxo real, o `<video>` usado como âncora exibia um ícone de reprodução e a árvore permanecia rolável. O vídeo foi mantido montado, porém invisível no modo nativo; scroll e overscroll foram bloqueados, e a moldura decorativa foi removida porque não limitava a área efetivamente lida pelo ML Kit.
- Transformações/animations ancestrais ainda deslocavam o painel `fixed`. Em vez de acumular overrides frágeis, o mesmo painel React foi renderizado diretamente no `document.body` por portal enquanto a sessão nativa estivesse ativa. Os callbacks permaneceram únicos e os tokens de tema continuaram sendo herdados.
- A validação física final confirmou preview, leitura real, lookup do produto, lanterna, cancelamento, reabertura e estabilidade de tema. B09–B11 continuaram documentados como problemas do scanner web; a implementação Android não os herdou, mas não os declarou corrigidos.

**PRs/commits relacionados:** [PR #73](https://github.com/magnoClovis/nutrition-tracker/pull/73); spike [`8d1f466`](https://github.com/magnoClovis/nutrition-tracker/commit/8d1f466279e79af662933892e2cb630ddde8eefe); preview [`259ddbb`](https://github.com/magnoClovis/nutrition-tracker/commit/259ddbbdbeeb6c4109808fbc5b24abbc05dfcca5), [`ee618fd`](https://github.com/magnoClovis/nutrition-tracker/commit/ee618fdb327de596fc82595ca4baea55d534466c) e [`0799913`](https://github.com/magnoClovis/nutrition-tracker/commit/07999130139da313adcfd238ad57d0e206d1e10c); integração [`e99548a`](https://github.com/magnoClovis/nutrition-tracker/commit/e99548a065dff74e161e58f07a917f91bd79344a); apresentação [`fa46e0d`](https://github.com/magnoClovis/nutrition-tracker/commit/fa46e0d0aa79e4a94390edd8c64e40a39b1861db), [`45d98cb`](https://github.com/magnoClovis/nutrition-tracker/commit/45d98cb9eddb7811c1ed6d3a019f096997feaab1) e [`53b38f9`](https://github.com/magnoClovis/nutrition-tracker/commit/53b38f950bdce444f0ca69ad247e2c111f81354d); merge [`933d2be`](https://github.com/magnoClovis/nutrition-tracker/commit/933d2be18a30029747cc3ea24c685dbba42a206f).

---

## D17 - Navegação pelo botão e gesto Voltar do Android

**Data (se determinável):** 29/07/2026.

**Propósito:** substituir a semântica padrão que enviava imediatamente a WebView ao fundo por navegação Android previsível, reutilizando os mesmos setters e callbacks da interface. O tratamento precisava fechar primeiro o estado mais interno e evitar listeners duplicados entre navegador, WebView e plugin nativo.

**Recursos:** `@capacitor/app@8.1.1`; evento Android `backButton`; dispatcher injetável; prioridades determinísticas; estado React; lifecycle Capacitor; testes unitários.

**Arquivos:**

- `src/composite/android-app-runtime.js` — adaptador inerte fora do Android e ligação com o plugin App;
- `src/composite/android-back-navigation.js` — dispatcher, prioridades, registro/remoção e exclusão mútua do evento;
- `src/App.jsx` — composição do listener e estados globais;
- `nutrition-tracker-controller.js` — resolução dos estados nutricionais e histórico de abas;
- `settings-panel.js` e `backup-modal.js` — handlers aninhados de maior prioridade;
- `package.json`, `package-lock.json`, `android/app/capacitor.build.gradle` e `android/capacitor.settings.gradle` — plugin oficial;
- `tests/unit/android-app-runtime.test.js`, `android-back-navigation.test.js`, `settings-panel.test.js`, `backup-modal.test.js`, `nutrition-tracker-controller.test.js` e `app-entry.test.js` — ordem e integração;
- `CAPACITOR_ANDROID_SUBFATIA_6A1.md` — contrato e roteiro físico.

**O que foi feito:**

- O evento nativo passou por um dispatcher central; navegador e PWA permanecem sem listener Capacitor. Quando nenhum handler consome o evento, o adaptador chama a ação nativa de enviar o app ao fundo.
- Foi definida uma ordem de sete níveis: painel aninhado; modal; menu/formulário/edição contextual; tela secundária; tela Adicionar; data histórica voltando a hoje; aba secundária voltando pela pilha visitada.
- Estados globais — Configurações, Backup, Privacidade, avisos e tutorial — foram registrados acima da navegação nutricional. Confirmação de feedback e prévia de importação receberam prioridade sobre seus painéis pais.
- O dispatcher reutiliza os callbacks existentes. Fechar o scanner pelo Voltar executa o mesmo cleanup idempotente da câmera; abrir um dia pela Semana preserva a origem contextual.
- Um evento adicional é ignorado enquanto o anterior ainda está em processamento, evitando duas transições concorrentes. Empates na mesma prioridade têm ordem determinística e os listeners são removidos no cleanup.
- A validação física aprovou estados aninhados, modais, scanner, edições, telas secundárias, Adicionar, histórico, data e retomada. Restou um caso: tocar explicitamente em Diário depois de visitar outras abas mantinha a pilha antiga.
- O segundo commit passou a limpar a pilha somente quando Diário é escolhido explicitamente. A navegação contextual Semana → Diário histórico continuou produzindo Diário histórico → hoje → Semana, enquanto a raiz escolhida pelo usuário passou a minimizar imediatamente.

**PRs/commits relacionados:** [PR #74](https://github.com/magnoClovis/nutrition-tracker/pull/74); dispatcher [`d0eca7d`](https://github.com/magnoClovis/nutrition-tracker/commit/d0eca7db921bbe32cc6ecb52b78bcae1f4575cf3); correção da raiz [`35400fc`](https://github.com/magnoClovis/nutrition-tracker/commit/35400fc3ab718f0ce3b93965d3ddc0f26152759f); merge [`e4802f2`](https://github.com/magnoClovis/nutrition-tracker/commit/e4802f2cb9f80b95320b1f43de3634f465fe2adf).

---

## D15 e D18 - Exportação e importação nativas de backups

**Data (se determinável):** 29/07/2026.

**Propósito:** corrigir a exportação silenciosamente inoperante na WebView Android sem modificar o download do navegador/PWA, e fechar o ciclo real de portabilidade ao reimportar o arquivo. A confirmação de sucesso precisava ocorrer somente após criação/compartilhamento efetivo, e a importação não poderia anunciar atualização enquanto fallbacks locais antigos ainda prevalecessem.

**Recursos:** `@capacitor/filesystem@8.1.2`; `@capacitor/share@8.0.1`; Android Storage Access Framework; `ACTION_CREATE_DOCUMENT`; `Directory.Cache`; URI `content://`; plugin Capacitor Java próprio; Firebase/Firestore existente; UTF-8; seletor e folha de compartilhamento Android.

**Arquivos:**

- `src/composite/file-export-adapter.js` — contrato `exportFile({ content, filename, mimeType, destination })` e implementações web/nativa;
- `src/composite/file-export-runtime.js` — seleção do caminho Capacitor e injeção dos plugins;
- `android/app/src/main/java/com/hermegas/phrona/DocumentSaverPlugin.java` — ponte para criação/cópia de documento;
- `android/app/src/main/java/com/hermegas/phrona/MainActivity.java` — registro do plugin;
- `backup-modal.js` — exportações completas/por categoria, escolha Salvar/Compartilhar, confirmação assíncrona, importação e recarga;
- `firebase-backup-internal.js` e `firebase-storage.js` — limpeza dirigida dos fallbacks após escrita importada;
- `nutrition-tracker-controller.js` e `src/App.jsx` — injeção de exportação e recarga;
- `package.json`, `package-lock.json`, `android/app/capacitor.build.gradle` e `android/capacitor.settings.gradle` — plugins oficiais;
- `tests/unit/file-export-adapter.test.js`, `document-saver-android.test.js`, `backup-modal.test.js`, `firebase-backup-internal.test.js` e `firebase-storage.contract.test.js` — contratos e regressões;
- `bug-inventory.txt` — diagnóstico D18 e evolução do D15;
- `CAPACITOR_ANDROID_SUBFATIA_6A2.md` — iterações, causa raiz, APK combinado e roteiro.

**O que foi feito:**

- Foi criado um contrato assíncrono único. No navegador/PWA, o comportamento `data:`/`Blob` existente foi preservado; no Android, o conteúdo UTF-8 era escrito no cache pelo Filesystem e compartilhado pelo Share.
- Backup completo, Diário, 7 dias, 30 dias, Alimentos e Histórico de peso migraram para o adaptador. O CSV da despensa, que copia para o clipboard, e relatórios que só exibiam texto permaneceram fora do escopo.
- A UI deixou de anunciar “Arquivo baixado” antes da Promise. Cancelamento e erro não produzem sucesso falso.
- A primeira validação comprovou Compartilhar, mas não oferecia um destino local claro. Foi acrescentada a ação **Salvar no aparelho**, implementada por `ACTION_CREATE_DOCUMENT`, com nome e MIME sugeridos e sem solicitar permissão ampla de armazenamento.
- A primeira versão do salvamento fechava o app e criava arquivo vazio. O `logcat` revelou `TransactionTooLargeException`: o estado salvo continha duas cópias do backup de 1.660.548 bytes, totalizando parcel de 3.324.676 bytes.
- A ponte passou a gravar primeiro em arquivo temporário no cache, remover `content` do `PluginCall`, abrir o seletor e só depois copiar o temporário para a URI escolhida. O temporário é removido em sucesso, erro ou cancelamento, evitando transportar megabytes no estado serializado do Capacitor.
- Na importação, a prévia e as escritas funcionavam, mas a UI e reaberturas podiam mostrar dados antigos. A causa de **D18** era o fallback local “mais rico” vencer o valor restaurado e voltar a gravá-lo.
- Após cada escrita confirmada, passaram a ser removidas somente as variantes local e namespaced da chave importada para o UID atual. Essa escolha evitou limpeza ampla de `localStorage` ou impacto em outra conta.
- A mensagem final passou a informar somente a contagem real importada. O botão **Atualizar dados** executa recarga completa e visível; pull-to-refresh foi conscientemente adiado.
- Um APK combinado #74+#75 confirmou Compartilhar, Salvar, retorno correto pelo botão Voltar e o ciclo exportar → localizar → importar → persistir. A validação final desta conversa considerou exportação e importação funcionais; o refinamento semântico de “anexar” versus “substituir” ficou fora do escopo.

**PRs/commits relacionados:** [PR #75](https://github.com/magnoClovis/nutrition-tracker/pull/75); compartilhamento [`9bb747e`](https://github.com/magnoClovis/nutrition-tracker/commit/9bb747e5889cf9448a5344aa0796755722c902eb); salvar/rehidratar [`0eca1f4`](https://github.com/magnoClovis/nutrition-tracker/commit/0eca1f48cb7b296452ba7959b9a3fbee34fff27a); documentação do APK combinado [`32181c2`](https://github.com/magnoClovis/nutrition-tracker/commit/32181c2130e4d6fec19064dcece5a744255c72ae); correção `TransactionTooLargeException` e fallbacks [`92bc25c`](https://github.com/magnoClovis/nutrition-tracker/commit/92bc25c0024e307be20b49a2d1b4098846216965); relatório corrigido [`c53a646`](https://github.com/magnoClovis/nutrition-tracker/commit/c53a6462a81ade35a168edabf1af583cb5e9b949); resolução de conflitos com #74 [`1d16bad`](https://github.com/magnoClovis/nutrition-tracker/commit/1d16bad7d3abb24cbcbb181bb91f475cba69d6b4); merge [`4ad2435`](https://github.com/magnoClovis/nutrition-tracker/commit/4ad243579430fc14632aa185c4380c5195ef1eb5).

---

## Safe areas, barra de status e validação de retomada

**Data (se determinável):** 29/07/2026.

**Propósito:** adaptar o layout às áreas ocupadas por notch, câmera frontal, barra de status e navegação por gestos/três botões, sem adicionar padding global que deslocasse toda a aplicação. A mesma etapa deveria decidir correções de teclado somente com evidência física e confirmar que segundo plano e links externos não perdiam estado.

**Recursos:** Capacitor 8 SystemBars; CSS custom properties; `env(safe-area-inset-*)`; `viewport-fit=cover`; `data-theme`; WebView Android; navegação por gestos e três botões; rotação; testes físicos de teclado e lifecycle.

**Arquivos:**

- `one-ui.css` — aliases de safe area e aplicação seletiva nos componentes;
- `index.html` — viewport com `viewport-fit=cover`;
- `src/composite/android-system-bars-runtime.js` — sincronização nativa de aparência da barra;
- `src/App.jsx` — injeção e observação do tema;
- `add-screen.js`, `backup-modal.js`, `login-screen.js`, `meal-review-modal.js`, `metrics-screen.js`, `nutrition-tracker-controller.js`, `privacy-panel.js`, `release-notice.js`, `required-profile-modal.js`, `settings-panel.js` e `visual-update-notice.js` — marcação/estilos pontuais para insets;
- `tests/unit/android-safe-areas.test.js` e `android-system-bars-runtime.test.js` — cobertura estrutural e do adaptador;
- `CAPACITOR_ANDROID_SUBFATIA_6B.md` — matriz e resultados físicos.

**O que foi feito:**

- Foram definidos `--app-safe-top`, `--app-safe-right`, `--app-safe-bottom` e `--app-safe-left`. Cada alias prefere `--safe-area-inset-*`, fornecido pelo SystemBars, e usa `env(safe-area-inset-*, 0px)` como fallback web.
- Os insets foram aplicados seletivamente ao shell, conteúdo, header sticky, navegação inferior, Adicionar, rodapé/Métricas, Backup, Configurações, login, perfil obrigatório e diálogos relevantes. `html` e `body` não receberam padding global.
- `viewport-fit=cover` permitiu que o fundo temático continuasse sob a barra de status, enquanto os controles permaneciam abaixo da área insegura.
- Um adaptador injetável e inerte no navegador observa `data-theme`: tema escuro solicita ícones claros; tema claro solicita ícones escuros. Nenhuma dependência nova foi instalada para isso.
- O teste físico de login, cadastro, perfil, alimentos, refeição, métricas, configurações e template não encontrou campo ou ação inacessível por causa do teclado. Portanto, `@capacitor/keyboard`, `adjustResize`, listeners globais e `scrollIntoView` não foram adicionados preventivamente.
- Safe areas foram aprovadas em temas claro/escuro, retrato/paisagem, gestos e três botões. Retomada quente preservou aba, data, formulários/edições, retorno do compartilhamento e retorno do navegador; links externos continuaram corretos.
- A única ressalva inicial era a barra de status cinza. A combinação de `viewport-fit=cover` e sincronização de contraste removeu a quebra visual; a revalidação física posterior confirmou funcionamento correto.
- O scanner, Firebase, Open Food Facts, exportação/importação e domínio nutricional permaneceram fora do diff funcional.

**PRs/commits relacionados:** [PR #76](https://github.com/magnoClovis/nutrition-tracker/pull/76); safe areas [`5324704`](https://github.com/magnoClovis/nutrition-tracker/commit/532470495d0810dda8b2c7d9b6085eac07195ac7); barra de status [`49f621b`](https://github.com/magnoClovis/nutrition-tracker/commit/49f621bfc0f519e2d77e9fda0df650c753ad6704); merge [`c6ca197`](https://github.com/magnoClovis/nutrition-tracker/commit/c6ca19783ec11e73c98038780a9d9f1a25666909).

---

## Renomeação completa de Phrona para Trofia

**Data (se determinável):** 30/07/2026 no horário local.

**Propósito:** consolidar a identidade comercial definitiva antes da assinatura e publicação, substituindo nome, Application ID e arte visual em Android, web e textos visíveis. Como o arquivo-fonte havia sido substituído por uma nova arte apesar de manter o nome `icon-placeholder.png`, todos os derivados antigos precisavam ser removidos e regenerados de fato.

**Recursos:** Android application ID/namespace; pacotes Java; adaptive icons; splash screens; Web App Manifest; Vite; PWA/favicon/apple-touch icon; PNG RGB; `aapt`; testes de identidade; Git para remoção reversível dos assets antigos.

**Arquivos:**

- `android/app/build.gradle`, `capacitor.config.json` e `android/app/src/main/res/values/strings.xml` — `com.hermegas.trofia` e nome Trofia;
- `android/app/src/main/java/com/hermegas/trofia/MainActivity.java` e `DocumentSaverPlugin.java` — estrutura de pacote movida e declarações atualizadas;
- `android/app/src/main/res/mipmap-*/*`, `drawable/splash.png` e `drawable-{port,land}-*/splash.png` — 26 PNGs Android recriados;
- `icon-placeholder.png` — nova fonte RGB 1254 × 1254, broto/folha laranja sobre verde escuro;
- `trofia-icon-192.png`, `trofia-icon-512.png`, `trofia-favicon-32.png` e `trofia-apple-touch-icon.png` — quatro novos derivados web;
- `phrona-icon-192.png`, `phrona-icon-512.png`, `phrona-favicon-32.png` e `phrona-apple-touch-icon.png` — derivados antigos removidos;
- `manifest.json`, `index.html`, `vite.config.js`, `scripts/verify-vite-build.js`, `tests/fixtures/index.legacy.html` e `tests/unit/trofia-identity.test.js` — identidade web, allowlist e contrato automatizado;
- `app.js`, `nutrition-tracker.jsx`, `nutrition-tracker-controller.js`, `login-screen.js`, `i18n.js`, `release-notice.js`, `tutorial-overlay.js`, `verify-email-screen.js`, módulos Firebase/backup e demais textos visíveis — marca atualizada sem renomear arquivos internos;
- `CAPACITOR_ANDROID_SUBFATIA_2.md`, `SUBFATIA_3.md`, `SUBFATIA_5.md`, `SUBFATIA_6A1.md`, `SUBFATIA_6A2.md`, `SUBFATIA_6B.md`, guias smoke, `STABILITY_TODO.md` e `CAPACITOR_ANDROID_RENAME_TROFIA.md` — documentação corrente atualizada.

**O que foi feito:**

- `applicationId`, namespace, `capacitor.config.json` e pacotes Java mudaram de `com.hermegas.phrona` para `com.hermegas.trofia`. O Android passa a considerar as duas identidades aplicativos distintos; Trofia pôde ser instalado ao lado do Phrona, com sessão, permissões e armazenamento separados.
- Nome de exibição, títulos, login, header, Configurações, rodapé, i18n, manifest e documentação corrente foram atualizados de Phrona/Diário Nutricional/Nutrition Tracker para Trofia onde se tratava de marca visível.
- A nova fonte foi confirmada como PNG RGB 1254 × 1254, SHA-256 `E8EDFBC77C4DF0FAF93D954BDEA4BDBEEC217758839B57586F911A803B059D80`; a cor de fundo da borda foi identificada como `#093C2D`.
- Os 15 ícones Android e 11 splash screens foram removidos e recriados a partir do novo conteúdo, não renomeados. A estratégia adaptativa manteve arte completa no foreground e `#093C2D` no background; splash usou redimensionamento proporcional com recorte central `cover`.
- Os quatro assets web `phrona-*` foram fisicamente removidos e substituídos pelos quatro `trofia-*`. Manifest, HTML, Vite, verificador e fixture passaram a apontar somente para a nova arte.
- As classes internas `phrona-*` do scanner foram deliberadamente preservadas para não reabrir um contrato técnico já validado. Os nomes `nutrition-tracker.jsx`, `nutrition-tracker-controller.js` e o pacote npm `nutrition-tracker` também foram mantidos como identidade arquitetural interna.
- Os textos PT/EN/ES preparados para justificar a câmera passaram a mencionar Trofia, sem alterar novamente o scanner.
- A suíte passou com 745 testes unitários, smokes e matriz 60/60. O APK foi inspecionado por `aapt`: pacote `com.hermegas.trofia`, label Trofia, Activity correta, `versionCode 1` e `versionName 0.8.1-beta`.
- O APK de identidade tinha 33.293.686 bytes e SHA-256 `75F2B6AB2AEAEA5E9CD1D31AAEB75BABD5E894FBE7316D36405BF2674436E440`.

**PRs/commits relacionados:** [PR #77](https://github.com/magnoClovis/nutrition-tracker/pull/77); implementação [`92c20f8`](https://github.com/magnoClovis/nutrition-tracker/commit/92c20f8f711d0b1c1d9b0a225ad83e63a2a3e1b5); merge [`7cee3e4`](https://github.com/magnoClovis/nutrition-tracker/commit/7cee3e4f1edc3bc9d2b498414d0d92db2e71f754).

---

## Preparação segura para assinatura de release Android

**Data (se determinável):** 30/07/2026.

**Propósito:** preparar o Gradle para receber uma futura chave de upload criada manualmente pelo proprietário, sem gerar, solicitar, ler ou versionar qualquer segredo durante a implementação. Builds debug precisavam continuar independentes, enquanto qualquer tentativa de produzir release sem configuração deveria falhar de forma explícita em vez de gerar artefato não assinado.

**Recursos:** Gradle/Groovy; Android signing configs; arquivo local de properties; `.gitignore`; keystore JKS; versionamento Android; testes Node; `aapt`; `apksigner`; Java 21/Android Studio.

**Arquivos:**

- `android/app/build.gradle` — carregamento condicional, validação, `signingConfigs.release`, associação exclusiva ao release e gate de tarefas;
- `android/.gitignore` — proteção de `keystore.properties`, `*.jks` e `*.keystore`;
- `android/keystore.properties.example` — modelo com placeholders sem dados reais;
- `tests/unit/android-release-signing.test.js` — contrato de segurança e consistência de versão;
- `CAPACITOR_ANDROID_SUBFATIA_7.md` — operação, limites, validação e próxima ação manual.

**O que foi feito:**

- `android/app/build.gradle` passou a procurar `android/keystore.properties` e carregar `storeFile`, `storePassword`, `keyAlias` e `keyPassword` somente se o arquivo existir.
- `signingConfigs.release` é criado apenas quando todos os quatro valores estão presentes e é associado exclusivamente a `buildTypes.release`. Debug nunca herda credencial ou configuração release.
- O grafo de tarefas identifica solicitações que produzam artefato release — `assemble`, `bundle`, `package` ou `sign`, inclusive chamadas indiretas por `build`. Sem properties válido, o Gradle falha antes da execução com mensagem acionável e sem imprimir valores secretos.
- O `.gitignore` protege o arquivo real e extensões usuais de keystore. O example contém somente caminho, alias e senhas fictícios; nenhuma chave ou senha real foi criada, solicitada ou manipulada nesta conversa.
- `versionName` permaneceu `0.8.1-beta`, espelhando `package.json`, e `versionCode` avançou de 1 para 2. Um teste unitário passou a impedir divergência futura entre Gradle e package.
- Sem `keystore.properties`, `assembleDebug` passou normalmente e `assembleRelease` falhou com a mensagem esperada. A suíte passou com 748 testes unitários, smokes e matriz 60/60.
- `aapt` e `apksigner` confirmaram pacote, label, Activity, versões e certificado automático de debug. Nenhum AAB/release assinado foi produzido.
- O APK de validação tinha 33.293.686 bytes e SHA-256 `306D1896489285B7F000F0F9C222D3341C809663109A2C8EB7B3DE1C03A8D295`.

**PRs/commits relacionados:** [PR #78](https://github.com/magnoClovis/nutrition-tracker/pull/78); implementação [`8428ae8`](https://github.com/magnoClovis/nutrition-tracker/commit/8428ae83a4b49249b92a566b138ba7b2f4a44ec1); merge [`84acdaa`](https://github.com/magnoClovis/nutrition-tracker/commit/84acdaa2aa9a4403031eb8cf1c3534c04b591c4b).

## Estado ao encerrar esta cronologia

- Último merge atribuível a esta conversa: PR #78, merge `84acdaa`, em 30/07/2026 no horário local.
- O aplicativo possuía wrapper Android funcional, identidade definitiva Trofia e Application ID `com.hermegas.trofia`.
- Login Firebase REST, dados reais, navegação, scanner nativo, câmera/lanterna, backup nativo, safe areas, barra de status e retomada tinham validação física registrada.
- A estrutura de assinatura estava preparada, mas nenhuma chave, senha, release assinado ou publicação Google Play foi realizada por esta frente até o PR #78.
- A12 foi apenas descoberta nesta conversa e não corrigida por ela. Sua resolução offline-first posterior pertence a C28 e a outra frente.
- B09–B11 permaneceram no scanner web. O adaptador nativo evitou herdá-los sem modificar nem declarar resolvido o caminho PWA.
- O proxy de IA do PR #79 e todos os trabalhos posteriores não pertencem a esta conversa e não são atribuídos aqui.

## Fontes consultadas e limitações

- Memória integral desta conversa, usada para atribuição, sequência de validações e decisões técnicas.
- Histórico Git da `main`, commits de implementação e merges dos PRs #69–#78.
- Relatórios versionados `CAPACITOR_ANDROID_SUBFATIA_2.md`, `SUBFATIA_3.md`, `SUBFATIA_5.md`, `SUBFATIA_6A1.md`, `SUBFATIA_6A2.md`, `SUBFATIA_6B.md`, `CAPACITOR_ANDROID_RENAME_TROFIA.md` e `CAPACITOR_ANDROID_SUBFATIA_7.md`.
- `documentation/README.md`, `documentation/estado-atual/ROADMAP.md` e `documentation/estado-atual/BUG-INVENTORY.md`, consultados em 31/08/2026.
- Os APKs eram ignorados pelo Git. Seus hashes e tamanhos são confirmados pelos relatórios, mas os binários não fazem parte desta documentação.
- A data exata de algumas mensagens intermediárias de teste físico não existe como evento Git separado; quando relevante, foi usada a data registrada no relatório, sem inferir horário.
