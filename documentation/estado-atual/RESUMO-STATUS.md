# Resumo de status do Trofia

> Retrato do checkpoint `0.11.0-beta`, atualizado sobre a `main` no merge `13bd540`, em 13/09/2026. Este resumo prioriza fatos verificáveis no repositório e nos PRs; não substitui o roadmap.

## O que está implementado e funcionando hoje

- **Versão nomeada:** checkpoint `0.11.0-beta` preparado no pacote, Android `versionName`, rótulo, aviso trilíngue e tutorial pontual de score/avaliação. A build corrigida versionCode 12 foi instalada pela Play Store e validada fisicamente em 01/09/2026; o `versionCode` não é determinado pelo Git porque esse campo é ajustado localmente antes dos uploads.
- **Aplicação web e Android:** build Vite em produção, GitHub Pages e projeto Capacitor Android com publicação em teste interno. Publicação iOS não está concluída.
- **Autenticação e dados:** Firebase Auth, Firestore modular, App Check, cache persistente, comportamento offline-first, loaders cache-first, escrita granular e lifecycle seguro de conta concluídos em C28.
- **Exclusão de conta:** saga administrativa idempotente com Cloud Functions, Cloud Tasks, lock de escrita, exclusão recursiva, retries e verificação destrutiva em produção concluída em C22.
- **Armazenamento canônico:** migração legada encerrada, rules antigas fechadas e compatibilidade de importação de backups históricos preservada em C23.
- **IA gerenciada:** Gemini atrás de Cloudflare Worker autenticado; endpoints de texto, foto, preenchimento, descrição e sugestões estruturadas pela despensa. Prompts, fotos e respostas não são persistidos pelo Worker segundo o contrato atual.
- **Reconhecimento por foto:** câmera/galeria, pré-processamento, análise multimodal, editor de estimativas e persistência sem armazenar a imagem, concluídos em C24.
- **Pontuação e avaliação de refeições:** `meal-score-v2` contextual, cobertura/provisoriedade explícita, explicação opcional, snapshots versionados e badge no Diário, concluídos em C20 e C19.
- **Critérios nutricionais de IA:** C08-A a C08-F alinham as sete superfícies ao score local, preservam ausente diferente de zero, aplicam contratos estruturados fail-closed, minimizam dados pessoais e cobrem PT/EN/ES, respostas malformadas, dados ausentes e entradas adversariais. O endurecimento final do Worker foi implantado na versão `ca5e65d9-2eeb-4a86-9364-5eb2d0b2b2e1` antes da avaliação controlada real.
- **Privacidade e compliance:** política trilíngue pública, instruções de exclusão e referência atual de Data Safety.
- **Qualidade:** preflight, unitários, smoke legado/Vite, matriz visual e CI autenticado com App Check. G01, C05 e C07 estão fechados.
- **Controles visuais S8:** `CheckboxField` e `SliderField` customizados foram integrados no PR #166 às superfícies ativas de sugestões de refeição e seleção de categorias de backup.
- **Sequência visual S1–S9 concluída (10/09/2026):** seletores, campos numéricos, controles e diálogos nativos planejados foram substituídos por componentes One UI 8/Glass UI; rastreabilidade por fatia, PR e comportamento está na seção formal S1–S9 abaixo. I1–I7 permanecem planejadas e exigem protótipo aprovado antes de código. — Chat: Trofia-UIUX
- **Incidente App Check/perfil encerrado:** o PR #173 impede release Android sem `google-services.json` e distingue falha de leitura de perfil realmente incompleto. Na build Play versionCode 12, a conta real concluiu login, leitura e alteração de perfil, sincronização e inicialização do App Check sem erro.
- **[C14-C-PROFILE-GATE] Concluído (12/09/2026) — Chat: Trofia-Principal.** O PR #191 corrigiu a corrida de bootstrap: a primeira leitura protegida exige token App Check real, o gate usa confirmação do servidor, falhas exibem recuperação e o modal obrigatório ficou exclusivo da criação de conta. O Pages foi validado após o merge sem reabrir o modal no login normal; a fase Android/AAB e o enforcement do Worker continuam separados dentro da C14-C.
- **Incidente C14-B2 em produção encerrado:** após dois rollbacks seguros para B1, o hotfix definitivo manteve envelope/nutrientes nas rules e transferiu apenas a validação profunda dos componentes ao leitor fail-closed C20/C19. O teste Admin SDK comprova que componente malformado é ocultado. As rules corrigidas foram republicadas em 02/09/2026; o run autenticado `33575611133` ficou totalmente verde antes do deploy (tentativa 2) e novamente contra produção (tentativa 3). Nenhum dado foi excluído. O PR #178 foi mesclado em 07/09/2026 no commit `80bc2ca`. — **Chat:** Trofia-Principal.
- **[BUG-SAVED-MEAL-ID] — Reutilização de refeição salva:** concluído em 02/09/2026 no PR #179. Modelos atuais e antigos geram um ID novo para cada entrada carregada, mantendo `foodId` apenas como referência; a suíte comprova reutilização na mesma categoria e em categoria diferente. — **Chat:** Trofia-Principal.
- **[DIARY-MENU-A] Concluído (09/09/2026) — Chat: Trofia-Principal.** A ação “Detalhes” do menu de cada alimento no Diário abre um modal somente leitura com categoria, quantidade, horário, nutrientes realmente disponíveis e indicação sanitizada de estimativa por IA. Campos ausentes permanecem ocultos; fechamento por botão, backdrop, `Esc` e Voltar do Android é coberto sem alterar dados ou persistência.
- **[DIARY-MENU-B] Concluído (10/09/2026) — Chat: Trofia-Principal.** A ação “Editar” reúne quantidade e tipo de refeição em um único editor, funciona no dia atual e no histórico, preserva ID/horário/origem ao mover e invalida avaliações C19 com aviso explícito. O diff C28 atualiza o mesmo documento granular e o emulador confirma que as rules C14-B2 aceitam a mudança de `mealKey`.
- **[PHOTO-03] Concluído (10/09/2026) — Chat: Trofia-Principal.** A Fatia PHOTO-03-A criou o domínio proporcional puro e sua cobertura UMD/ESM. A Fatia PHOTO-03-B integrou a regra ao editor compartilhado de foto e descrição: quantidade recalcula peso e os oito nutrientes, peso recalcula nutrientes sem alterar quantidade, e edições nutricionais manuais tornam-se a nova base proporcional. Os builders persistem os valores revisados no Diário sem carregar metadados transitórios da estimativa.
- **[D1 — shell desktop/cabeçalho/navegação] Concluído (10/09/2026) — Chat: Trofia-UIUX.** O PR #187 removeu a margem negativa que sobrepunha as abas ao peso/IMC e ao progresso, adotou navegação em largura total centralizada no shell de 1080px e preservou a navegação móvel. O gate final autenticado `34464670583` passou em legado/Vite, desktop/mobile e claro/escuro; merge `3ccb852`.
- **[Câmera embutida — C2] Concluído (10/09/2026) — Chat: Trofia-UIUX.** O PR #185, já mesclado, comprova no Capacitor Android uma vista nativa traseira limitada ao retângulo DOM medido, sem substituir ainda o fluxo C24. No Galaxy S25 Ultra SM-S938B físico, o Android apresentou e concedeu a permissão real de câmera, o preview permaneceu confinado a `348×420` CSS px na origem `18,113`, os controles externos continuaram visíveis/clicáveis, a captura retornou imagem Base64 não vazia e a sessão nativa desconectou após `stop()`. O pacote de prova paralelo `.c2proof` foi removido e nenhum APK/AAB foi publicado.
- **[Câmera embutida — C3] Concluído (12/09/2026) — Chat: Trofia-UIUX.** O PR #190 integrou o preview traseiro ao fluxo real C24 com `toBack:true`, viewport medido, máscaras arredondadas Glass UI, controles HTML acessíveis acima da câmera, PT/EN/ES, abertura/contração e `prefers-reduced-motion`. A prova física no Galaxy validou transparência localizada, cliques sobre o preview, recorte sem vazamento, cancelamento e captura Base64; merge `c6a4e4f`.
- **[Câmera embutida — C4b] Concluído (12/09/2026) — Chat: Trofia-UIUX.** O que se planeja fazer: concluir acessibilidade, recuperação de permissão e acabamento resiliente sem ampliar funções fotográficas. O que foi feito: o PR #194 entregou foco persistente e restaurado, anúncios PT/EN/ES sem duplicidade, abertura real das Configurações, fonte 200%, contraste/alvos de 48 px e descarte temporário; Galaxy físico, gate local e CI autenticado `34710539851` ficaram verdes, com merge `050182d`, encerrando toda a sequência CAM-C1–C4b. Alinhamento: 100%, sem zoom, flash, troca de câmera, gestos ou edição.

### [CAM-RED-6-AUTH-CONTRACT] - Reautenticação segura após sessão expirada na câmera

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 22/09/2026.
- **Data de conclusão:** 22/09/2026.
- **Propósito:** permitir que a ação explícita “Entrar novamente” da CAM-RED-6 descarte integralmente a fotografia temporária antes de encaminhar o usuário ao fluxo real de autenticação.
- **O que se planeja fazer:** publicar um callback assíncrono de chamada única que coordene, nesta ordem, destruição do fluxo/Blob/URL da foto e transição para Auth; impedir cliques concorrentes; manter falha recuperável; e provar a ordem sem registrar credenciais, UID ou tokens.
- **Recursos/arquivos principais envolvidos:** `nutrition-tracker-controller.js`, `src/controller/nutrition-tracker-controller.js`, `src/App.jsx`, entrypoints legados `app.js`/`nutrition-tracker.jsx`, `ImageMealScreen`, testes unitários do controlador e documentação do contrato.
- **O que foi feito:** o PR #247, mesclado em `d613d91`, publicou para Vite e legado uma `Promise<void>` que coalesce cliques, destrói primeiro o fluxo e a fotografia temporária e só depois solicita a autenticação real; falhas são observáveis e recuperáveis. O `npm test` completo e os dois SHAs do PR ficaram verdes em preflight, unitários, Worker, Functions e Playwright autenticado.
- **Alinhamento:** 100% — o contrato aprovado foi entregue sem ampliar o escopo da UIUX nem alterar Worker, Firestore, App Check ou persistência da fotografia.

### [INV-VITE-APPCHECK-CONFIG-20260923] - Bootstrap Vite da CAM-RED-6 sem configuração Web completa

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 23/09/2026.
- **Data de conclusão:** 23/09/2026.
- **Propósito:** distinguir uma falha funcional de App Check de uma configuração local incompleta antes de liberar o gate autenticado da CAM-RED-6.
- **O que se planeja fazer:** preservar o worktree da UIUX, confirmar o contrato fail-closed, repetir o `auth-setup` com credenciais descartáveis e as quatro entradas exigidas e só propor código se o erro persistir com a configuração completa.
- **Recursos/arquivos principais envolvidos:** `src/firebase/app-check-client.js`, `tests/smoke/app-check-global-setup.js`, `tests/smoke/app-check-fixture.js`, `tests/smoke/app-check-ci.js`, `playwright.vite.config.js`, variáveis locais ignoradas pelo Git e Firebase App Check debug provider.
- **O que foi feito:** o artefato da UIUX confirmou `app-check-initialization-failed`; a auditoria encontrou `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` ausente no processo local. Com site key e App ID públicos, debug token registrado e credenciais descartáveis presentes no mesmo processo, o build Vite passou e o login/bootstrap protegido concluiu 3/3 vezes; 34 testes focados de App Check também passaram. O diagnóstico foi incorporado e mesclado no PR #251, sem alterar câmera, Worker, Firestore, rules ou Auth.
- **Alinhamento:** 100% — a causa de configuração foi comprovada e o gate foi liberado sem retry, relaxamento de teste ou correção especulativa de produto.

### [INC-VITE-AUTH-LEASE-20260925] - Restauração Auth destrutiva e lease residual no gate Vite

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 25/09/2026.
- **Data de conclusão:** 25/09/2026.
- **Propósito:** impedir que uma restauração modular lenta seja convertida em logout pelo bootstrap e garantir que uma falha transitória do GitHub não deixe o lease autenticado ativo por uma hora.
- **O que se planeja fazer:** preservar a CAM-RED-6, confrontar screenshots/cronologia com Auth, App Check e lease, remover a corrida destrutiva somente do Vite, tornar o cancelamento remoto idempotente e validar recorte, suíte completa e CI autenticado antes de liberar a UIUX.
- **Recursos/arquivos principais envolvidos:** `src/App.jsx`, `tests/smoke/authenticated-suite-coordinator.js`, `tests/unit/app-entry.test.js`, `tests/unit/authenticated-suite-coordinator.test.js`, Playwright Vite mobile, Firebase Auth modular, GitHub Actions e workflow `authenticated-local-lease.yml`.
- **O que foi feito:** os artefatos mostraram contextos alternando entre “Entrando...” e a tela pública; o código confirmou um timer de 8 s que chamava `fbSignOut()` concorrente a `authStateReady()`. O lease `36024006073` não foi liberado no teardown e só terminou pelo timeout de 60 min. O timer destrutivo foi removido somente do bootstrap modular, e a liberação do lease passou a consultar o estado e repetir idempotentemente um cancelamento transitório. Passaram 24 testes determinísticos, recortes 9/9 e 25/25, a suíte local integral (1.446 unitários; legado 107 + 8 skips estruturais; Vite 115/115; cutover 60/60) e os runs `36142057000`/`36142056828`; o PR #251 foi mesclado em `d6bc04f`.
- **Alinhamento:** 100% — as duas causas objetivas foram corrigidas sem alterar câmera, Worker, Firestore ou rules e sem relaxar o gate autenticado.

### [INC-FIRESTORE-PERSIST-20260917] - Data civil incorreta nos smokes autenticados do Diário

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 17/09/2026.
- **Data de conclusão:** 17/09/2026.
- **Propósito:** impedir que os gates autenticados confundam uma diferença UTC/data local com falha de persistência do Firestore.
- **O que se planeja fazer:** reproduzir os oito casos em `origin/main`, distinguir escrita real de leitura do teste e alinhar todos os cenários afetados ao domínio de data civil local do app.
- **Recursos/arquivos principais envolvidos:** `tests/smoke/authenticated-flows.spec.js`, `tests/unit/authenticated-daily-date.test.js`, `DateUtils.localToday()`, `DateUtils.addCivilDays()`, Playwright legado/Vite, Firebase e documentação.
- **O que foi feito:** o PR #222 comprovou que as refeições eram salvas corretamente, mas o teste procurava na data UTC anterior durante a virada do dia local; os quatro cenários agora usam a mesma data civil do app e possuem proteção unitária contra regressão. O merge `2ff02c9` preservou runtime, rules e App Check sem alteração.
- **Alinhamento:** 100% — a investigação descartou com evidência uma regressão de produção e corrigiu somente a fonte incompatível de data do harness.

### [INC-AUTH-BOOTSTRAP-20260917] - Login autenticado preso em “Processando...”

- **Status:** concluído sem reprodução — **Chat:** Trofia-Principal.
- **Data de início:** 17/09/2026.
- **Data de conclusão:** 17/09/2026.
- **Propósito:** determinar por que o bootstrap autenticado pode permanecer no formulário público sem publicar sucesso nem erro, bloqueando gates autenticados como a CAM-RED-4.
- **O que se planeja fazer:** reproduzir 2–3 vezes em worktree limpa da `origin/main`, observar de forma sanitizada Auth, App Check, `afterAuthenticated`, leitura protegida de perfil e retirada do loading, e só corrigir se houver causa objetiva.
- **Recursos/arquivos principais envolvidos:** `login-screen.js`, `src/App.jsx`, `src/leaf/authenticated-profile-gate.js`, adaptadores Firebase Auth/App Check, `tests/smoke/auth.setup.js`, Playwright autenticado e documentação relacionada a D03/`INV-RELOAD-SESSAO`.
- **O que foi feito:** a worktree CAM-RED-4 foi preservada; seis logins isolados passaram, incluindo três diagnósticos com Auth, verificação de e-mail e Firestore em `200`, navegação em ~1,49 s, nenhuma request pendente e nenhum erro de página. O código confirma esperas sem deadline antes de `onLogin`, mas o artefato original não identifica qual request ficou pendente; a causa permanece intermitente e não confirmada, sem correção especulativa.
- **Alinhamento:** 100% — a investigação cumpriu o protocolo aprovado para caso não reproduzível, preservou a evidência e não mascarou o gate; impacto neutro no produto e positivo na qualidade do diagnóstico.

### [INC-PROFILE-INCOMPLETE-PLAY-20260917] - Perfil existente classificado como incompleto no AAB Play

- **Status:** em monitoramento após prova Play limpa — **Chat:** Trofia-Principal.
- **Data de início:** 17/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** identificar por que uma conta descartável com histórico alcançou `profile-incomplete-existing-account` no AAB real versionCode 20 distribuído pela Play, bloqueando a prova física CAM-RED-4.
- **O que se planeja fazer:** preservar as evidências físicas, confirmar por leitura não destrutiva o perfil no servidor, localizar a etapa Auth/App Check/Firestore/validação/cache que produziu a classificação e implementar somente uma correção comprovada, sem fallback que transforme falha em ausência.
- **Recursos/arquivos principais envolvidos:** AABs Play `com.hermegas.trofia` versionCode 20 e 21, Firebase Auth/App Check/Firestore, `src/App.jsx`, `src/leaf/authenticated-profile-gate.js`, `firebase-firestore-sdk.js`, `profile-validation.js`, conta descartável, Galaxy SM-S938B, testes unitários/autenticados e documentação D03.
- **O que foi feito:** a conta foi confirmada por leitura remota não destrutiva como completa e válida; o PR #229/merge `1e9ef55` corrigiu o retorno vazio quando o UID ainda não estava disponível. A prova Play versionCode 21 de 20/09 voltou a exibir `profile-incomplete-existing-account`, motivando a instrumentação sanitizada D1. Na D2, o AAB diagnóstico versionCode 22 instalado pela Play concluiu uma única autenticação real, leu o perfil protegido e abriu a navegação principal sem `profile-incomplete-existing-account` nem `firestore-profile-auth-unavailable`. A passagem limpa conclui a prova planejada e permite repetir o gate da CAM-RED-4 com monitoramento, mas não demonstra que a intermitência deixou de existir nem justifica uma correção D3 especulativa.

### [INC-PROFILE-V21-D1] - Observabilidade sanitizada da leitura de perfil

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 20/09/2026.
- **Data de conclusão:** 20/09/2026.
- **Propósito:** localizar, sem expor dados pessoais, em qual fronteira um perfil completo do Firestore se torna inválido no cliente Android.
- **O que se planeja fazer:** registrar somente presença, tipo e validade booleana dos campos obrigatórios após o snapshot, após a normalização e antes da decisão do gate; cobrir ausência de vazamento e contratos fail-closed em testes.
- **Recursos/arquivos principais envolvidos:** `firebase-firestore-sdk.js`, `profile-validation.js`, `src/leaf/authenticated-profile-gate.js`, `src/App.jsx`, tela recuperável de perfil, unitários UMD/ESM e documentação.
- **O que foi feito:** o PR #239/merge `ef30eec` transporta metadados não enumeráveis limitados a existência/tipos, produz um código sanitizado de tipos e validades somente no erro de perfil incompleto e prova ausência de valores pessoais e preservação do contrato público; suíte local e CI autenticado `35522846863` ficaram integralmente verdes.
- **Alinhamento:** 100% — a instrumentação aprovada foi entregue sem retry, leitura duplicada, fallback de cache nem flexibilização do gate.

### [INC-PROFILE-V21-D2] - Prova diagnóstica no AAB distribuído pela Play

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 20/09/2026.
- **Data de conclusão:** 20/09/2026.
- **Propósito:** obter uma única evidência física capaz de identificar o campo e a transformação que divergem na build real protegida por Play Integrity.
- **O que se planeja fazer:** gerar AAB assinado com versionCode novo e versionName `0.11.0-beta`, distribuir pela faixa interna, executar uma única submissão com conta descartável e capturar apenas os códigos sanitizados; aplicar integralmente o protocolo permanente do Galaxy.
- **Recursos/arquivos principais envolvidos:** AAB release, Play Console/faixa interna, Play Integrity, Galaxy SM-S938B, ADB/logcat sanitizado e conta descartável local.
- **O que foi feito:** o AAB diagnóstico versionCode 22/versionName `0.11.0-beta`, SHA-256 `E3E48768B929D43F7857E3025C17208A37FE67B7CD388D28D46639A85D2A9B4F`, foi instalado pela Play no Galaxy físico. Uma única autenticação com conta descartável concluiu o bootstrap, confirmou o perfil protegido e abriu a navegação sem os dois erros monitorados; não houve retry. A sessão foi encerrada e tela, DND, sincronização, rotação e processos ADB foram restaurados/fechados.
- **Alinhamento:** 100% — a prova única aprovada foi executada exatamente uma vez; como a falha não reapareceu, o resultado permite retomar o gate monitorado, mas não é tratado como prova de eliminação da intermitência.

### [INC-PROFILE-V21-D3] - Correção causal e encerramento do incidente

- **Status:** não iniciado, condicionado a nova recorrência com diagnóstico causal — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** corrigir a causa exata comprovada pela prova Play sem retry automático, leitura dupla, fallback de cache ou relaxamento do perfil obrigatório.
- **O que se planeja fazer:** implementar a menor correção causal, adicionar regressão determinística, executar teste focado, suíte completa e CI autenticado, repetir a validação Play e só então liberar a CAM-RED-4.
- **Recursos/arquivos principais envolvidos:** módulo identificado na D2, testes unitários/autenticados, Firebase Auth/App Check/Firestore, AAB Play, documentação e comunicação de desbloqueio da UI/UX.

### [INC-AUTH-CLEANUP-LANG-F1] - Diagnóstico e infraestrutura do lease autenticado

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 18/09/2026.
- **Data de conclusão:** 19/09/2026.
- **Propósito:** confirmar a origem dos timeouts de restauração e do idioma anterior no gate CAM-RED-4 e instalar a base segura para coordenar toda suíte que usa a conta descartável compartilhada.
- **O que se planeja fazer:** preservar as evidências, reproduzir sobre `origin/main` limpa, distinguir produto de interferência externa, serializar worktrees locais, adicionar o workflow remoto que compartilhará o grupo de concorrência do CI e documentar a operação sem aumentar timeout, adicionar retry ou tocar na câmera/flash.
- **Recursos/arquivos principais envolvidos:** `.github/workflows/authenticated-local-lease.yml`, `tests/smoke/app-check-global-setup.js`, `tests/smoke/authenticated-suite-coordinator.js`, `tests/unit/authenticated-suite-coordinator.test.js`, `tests/unit/github-workflows.test.js`, `tests/smoke/README.md`, Playwright, GitHub Actions e conta descartável.
- **O que foi feito:** os horários dos artefatos comprovaram que o gate local colidiu com o CI `35281945540` na mesma conta. O PR #231/merge `763beec` adicionou lock local, recusa diante de CI já ativo, workflow manual no mesmo grupo remoto, testes e guia operacional. Seus gates também encontraram e corrigiram duas fragilidades independentes: o editor de fixture permanecia aberto antes da navegação e o overlay pesquisável ficava preso ao cartão com `backdrop-filter`; o roteiro agora fecha o editor e o seletor é portalizado em `document.body`. O gate final passou 1.412 unitários, 103 legado + 8 skips estruturais, 111 Vite e 60 cutover no run autenticado `35441455961`; a aquisição automática permanece reservada à F2.
- **Alinhamento:** escopo ampliado com impacto positivo: a coordenação planejada foi entregue integralmente e o próprio gate revelou duas falhas independentes, corrigidas sem relaxar testes nem alterar câmera/flash.

### [INC-AUTH-CLEANUP-LANG-F2] - Ativação e prova real do lease distribuído

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 19/09/2026.
- **Data de conclusão:** 19/09/2026.
- **Propósito:** eliminar também a janela em que um CI poderia começar depois da verificação local inicial e voltar a disputar a mesma conta descartável.
- **O que se planeja fazer:** depois que o workflow de lease existir na `main`, adquirir o mesmo grupo `nutrition-authenticated-suite` antes do login local, liberar no teardown, falhar fechado em erro/timeout e comprovar numa disputa controlada que um CI novo permanece enfileirado até a liberação.
- **Recursos/arquivos principais envolvidos:** workflow de lease já publicado na `main`, `gh` autenticado, coordenador do Playwright, grupo de concorrência do GitHub Actions, testes unitários/integração e guia operacional.
- **O que foi feito:** o PR #233/merge `d56480e` ativou aquisição/liberação fail-closed do lease remoto antes de qualquer login local. A prova controlada manteve o CI `35448749636` enfileirado enquanto o lease `35448711416` possuía o grupo e o iniciou automaticamente 2 s após a liberação; suíte local e gates remotos passaram integralmente.
- **Alinhamento:** 100%; aquisição, exclusão mútua nos dois sentidos, liberação, falha fechada e prova real foram entregues como planejado.

### [INC-PAGES-APPCHECK-20260919] - Compatibilidade do smoke Pages com App Check

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 19/09/2026.
- **Data de conclusão:** 19/09/2026.
- **Propósito:** restaurar a verificação determinística do Pages sem enfraquecer o App Check exigido pelo bootstrap real.
- **O que se planeja fazer:** instalar o debug provider registrado apenas no navegador efêmero do job Pages, manter o token fora do artefato publicado e preservar o fail-closed dos testes autenticados que acessam Firestore.
- **Recursos/arquivos principais envolvidos:** `.github/workflows/pages.yml`, `tests/smoke/app-check-fixture.js`, Playwright Pages, Firebase App Check debug provider, unitários e documentação.
- **O que foi feito:** o PR #235/merge `53e8fd9` separou o modo Pages sem credenciais do modo autenticado fail-closed, manteve o segredo apenas no navegador efêmero e desativou traces nesse contexto. Após uma falha isolada de releitura GA no primeiro CI, o gate integral repetido e o CI pós-merge passaram; o Pages `35462394508` concluiu build, deploy e 4/4 smokes publicados.
- **Alinhamento:** 100%; o harness voltou a validar o produto real sem enfraquecer App Check, publicar segredo ou modificar runtime/persistência.

### [BUG-SAVED-MEALS] - Comportamento de refeições salvas

- **Status:** concluído — **Chat:** Trofia-Bugs.
- **Data de início:** 07/09/2026.
- **Data de conclusão:** 09/09/2026.
- **Propósito:** eliminar a adição ambígua e a troca indevida do tipo de refeição, separando a edição permanente do modelo do ajuste pontual no Diário.
- **O que se planeja fazer:** preservar `staged.meal`, fechar “Salvas” e rolar até “Na refeição” após adicionar, deixar de persistir `meal` em novos modelos e abrir no próprio cartão o editor permanente de nome, ingredientes e quantidades.
- **Recursos/arquivos principais envolvidos:** `add-screen.js`, `nutrition-tracker-controller.js`, `saved-meal-card.js`, `tests/unit/add-screen.test.js`, `tests/unit/saved-meal-card.test.js`, smoke autenticado legado/Vite e documentação.
- **O que foi feito:** o PR #181 (head `ed7d85f6`, merge `db01a1a5`) entregou os três comportamentos, manteve modelos antigos legíveis com `meal` ignorado/removido ao editar, preservou os IDs novos do PR #179 e passou em 1256 unitários, smoke autenticado legado/Vite e matriz `cutover` 60/60.
- **Alinhamento:** 100% — o escopo aprovado foi entregue integralmente, sem alterar o ajuste pontual nem reintroduzir a reutilização de IDs.

### [BUG-BACKUP-D08-D09] - Integridade fail-closed de exportação e preview de backup

- **Status:** em andamento — **Chat:** Trofia-Bugs.
- **Data de início:** 26/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** impedir que “Diário — hoje” exporte uma data histórica e que o preview de importação apresente uma comparação não comprovada ou incompleta.
- **O que se planeja fazer:** resolver D08 e D09 numa única fatia, fixando a exportação na data civil local atual, validando estritamente `existingItems` e a coerência das contagens, bloqueando importação após preview inválido e preservando backups antigos e estratégias append/replace.
- **Recursos/arquivos principais envolvidos:** `backup-modal.js`, `firebase-backup-internal.js`, `nutrition-tracker-controller.js`, testes unitários UMD/ESM, smoke autenticado legado/Vite, matriz cutover e documentação de estado/histórico.
- **O que foi feito:** o PR draft #264 já exporta somente snapshot hidratado de `TODAY`, falha fechada em virada civil ou preview inconsistente, usa exclusivamente `existingItems` e bloqueia importação sem contrato válido; gates locais e CI `36245598218`/`36245598213` passaram, e a fatia aguarda revisão.

## O que está em andamento agora

- **Diagnóstico do encerramento do smoke legado:** correção técnica isolada em andamento após a `origin/main` reproduzir todos os casos concluídos, porta liberada e processo auxiliar Node ainda vivo no Windows. — **Chat:** Trofia-UIUX.
- **C14 — revisão geral de segurança:** C14-A, C14-B1, C14-B2, C14-C, C14-D, C14-E e C14-F1 estão concluídas; C14-F2 está em andamento; C14-G e C14-H não foram iniciadas. — **Chat:** Trofia-Principal.
- C20, C19 e C08 continuam concluídos; a suspensão temporária da build 11 não reabre esses itens.
- **Organização documental:** o índice inicial foi mesclado no PR #153; o filtro que evita a suíte pesada em PRs exclusivamente documentais foi mesclado no PR #155.
- **[DOC-TRACKING-193] Concluído (12/09/2026) — Chat: Trofia-Principal.** O que se planeja fazer: registrar integralmente as sequências aprovadas e formalizar planejamento, entrega, alinhamento e métricas. O que foi feito: 100 entradas de fatias foram normalizadas no PR #193, com escopos incertos de D3–D7 explicitamente delegados ao chat UI/UX. Alinhamento: 100%.

### [DOC-SYNC-LOCAL-20260916] - Reconciliação segura do checkout principal

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 16/09/2026.
- **Propósito:** eliminar a divergência entre a documentação local e a `origin/main` sem perder métricas retroativas nem arquivos locais sensíveis.
- **O que se planeja fazer:** preservar hashes e backup externo, transplantar somente registros exclusivos sobre a main atual, publicar a reconciliação e atualizar o checkout principal por fast-forward com reaplicação seletiva.
- **Recursos/arquivos principais envolvidos:** Git/worktrees, backup externo em AppData, nove históricos em `documentation/historico/`, `android/app/build.gradle`, `android/build.gradle`, `bug-inventory.txt`, keystore e `google-services.json`.
- **O que foi feito:** o PR #219 preservou 240 linhas exclusivas sem regressão; a `main` local avançou 49 commits até `f62d745`, os três ajustes locais foram reaplicados seletivamente e os hashes sensíveis permaneceram idênticos.
- **Alinhamento:** 100% — backup, reconciliação, merge, sincronização seletiva e verificação final seguiram o plano aprovado.

### [DOC-FORMAT-198] - Padronização detalhada das entradas históricas

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 14/09/2026.
- **Data de conclusão:** 14/09/2026.
- **Propósito:** transformar registros compactados da frente principal em entradas verificáveis com campos separados e preservar a granularidade das sequências aprovadas.
- **O que se planeja fazer:** reformatar as entradas sob responsabilidade da frente principal, adicionar datas, planejamento, recursos, entrega e alinhamento e consolidar duplicatas C14.
- **Recursos/arquivos principais envolvidos:** `documentation/estado-atual/RESUMO-STATUS.md`, evidências de PR/commit e preflight documental.
- **O que foi feito:** o PR #198 reformatou 78 entradas, consolidou o bloco C14 no resumo e registrou o padrão permanente então aprovado; a reconciliação posterior DOC-RECONCILIACAO-C14 corrige a granularidade que ainda faltava no histórico detalhado.
- **Alinhamento:** divergiu parcialmente — o resumo foi normalizado, mas o histórico ainda agregava algumas sub-fatias C14; o impacto inicial foi positivo e a lacuna residual está sendo corrigida explicitamente no PR #208.

## O que está apenas planejado, ainda sem código completo

### Indispensável antes do lançamento público

- **C14:** revisão geral de segurança — em andamento; decisões de escopo aprovadas em 01/09/2026 e execução sequencial autorizada a partir da C14-B.
- **C26-A/B:** toast seguro e lembretes locais — não iniciados; promovidos ao pré-lançamento em 25/09/2026, sem incluir push/backend.
- **C30:** assinaturas, cobranças e direitos de acesso — não iniciado; depende de C14 e antecede a documentação e o gate finais.
- **C16:** documentação técnica e de manutenção — parcial; deve fechar depois de C14, C26-A/B e C30.
- **C25:** gate da versão pública — parcial e dependente de C14, C26-A/B, C30 e C16.

### Backlog pós-lançamento

- C26-C push/backend, N01 voz, C21 porções fracionadas, C29 reclassificação assistida por foto, N03 leitura de rótulos, N09 jejum, C17 e-mails, C13 feedback nativo, C10 relatórios, N07 compartilhamento profissional, N02 banco nutricional, N05 recalibração dinâmica, C15 limpeza ampla do legado, C27 widgets, N04 receitas, N06 planejamento alimentar, C12 iOS, C18 integrações de saúde e N08 exercícios/hábitos.
- Partes deliberadamente adiadas: C26-C (push/backend) e C27-B (widget funcional com escrita direta).
- Revisão externa por nutricionista e eventual comparação/troca do modelo Gemini permanecem decisões futuras registradas em `PENDENCIAS.md`.

## Sequências de fatias aprovadas — registro completo

### Encerramento do servidor de smoke legado no Windows

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 15/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Propósito:** impedir que o gate local fique aberto após todos os testes terminarem por causa de um processo auxiliar Node residual.
- **O que se planeja fazer:** reproduzir em `origin/main`, confirmar porta/árvore de processos, tornar o encerramento do servidor determinístico no Windows e repetir o smoke completo sem alterar testes nem requisitos.
- **Recursos/arquivos principais envolvidos:** `tests/smoke/serve-static.js`, `tests/smoke/server-global-teardown.js`, `playwright.config.js`, teste unitário dedicado, Playwright, Node.js e Windows.
- **O que foi feito:** o PR #201 (`3165e91`, merge `a16ba79`) isolou o Node descendente órfão e adicionou shutdown local acionado pelo `globalTeardown`; o gate local e a segunda tentativa do CI autenticado `34913949788` passaram integralmente.
- **Alinhamento:** 100%.

> Regra de manutenção: nenhuma fatia aprovada é removida desta seção. Cada chat deve atualizar o status `não iniciado` → `em andamento` → `concluído`; novas fatias devem registrar, antes do código, `O que se planeja fazer` e, ao terminar, `O que foi feito` e `Alinhamento`.

### Protocolo permanente de rastreamento

- O padrão completo e a checklist obrigatória estão em `documentation/PADRAO-DOCUMENTACAO.md`; documentação é gate de conclusão, não etapa opcional posterior.
- Assim que um fatiamento for aprovado, a sequência completa deve ser registrada aqui, inclusive as fatias ainda não iniciadas, e seus estados devem ser atualizados sem remover etapas futuras.
- Cada fatia nova registra `O que se planeja fazer` antes da implementação; ao concluir, registra `O que foi feito` e `Alinhamento`. Neste resumo, cada campo permanece em uma frase breve.
- Toda entrada da frente Trofia-Principal usa cabeçalho próprio `### [CÓDIGO] - Título` e campos separados para `Status`/`Chat`, `Data de início`, `Data de conclusão`, `Propósito`, `O que se planeja fazer` e `Recursos/arquivos principais envolvidos`; `O que foi feito` só aparece após progresso real e `Alinhamento` somente quando a fatia estiver concluída.
- Datas só podem ser preenchidas com evidência real; quando a data de início não puder ser confirmada, registra-se `não determinado`, sem estimativa retrospectiva.
- O histórico detalhado da frente registra os mesmos três campos. Quando o alinhamento for inferior a 100%, deve explicar o desvio real e classificar o impacto como positivo, negativo ou neutro.
- Toda entrada de fatia/PR em `documentation/historico/*.md` registra `Tempo decorrido` e `Minutos de CI` logo após a data de conclusão. Antes do merge, o tempo permanece literalmente `pendente de merge`; depois do merge, o mesmo valor é copiado para a descrição do PR.
- Commits e descrições de PR novos terminam com `Chat-Origin: <nome do chat>`; neste arquivo, toda atualização identifica o chat responsável pelo item.

### [DOC-ROADMAP-LAUNCH-C26-C30] - Notificações e cobrança no pré-lançamento

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 25/09/2026.
- **Data de conclusão:** 25/09/2026.
- **Propósito:** alinhar o roadmap e os checkpoints à decisão de lançar o Trofia com lembretes locais e cobrança segura, preservando push e reclassificação por IA para depois.
- **O que se planeja fazer:** promover C26-A/B ao grupo A, criar C30-A–E entre C14 e C16, manter C26-C/C29 no grupo B e sincronizar roadmap, versão, resumo e histórico sem iniciar código.
- **Recursos/arquivos principais envolvidos:** `ROADMAP.md`, `VERSIONING.md`, cópias em `documentation/estado-atual/`, `RESUMO-STATUS.md` e histórico principal.
- **O que foi feito:** o PR #253 reorganizou as 39 posições, registrou C26-A/B e C30-A–E, sincronizou roadmap/versionamento/cópias e corrigiu por evidência as contradições de C14-F1 e INC-FIRESTORE-PERSIST; todas as fatias funcionais permanecem não iniciadas.
- **Alinhamento:** 100%; a mudança foi exclusivamente documental e preservou C26-C/C29 no pós-lançamento conforme aprovado.

### Frente principal — sequências aprovadas e ainda não iniciadas

### [C26-A] - Toast interno seguro

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** tornar a conquista interna perceptível sem colidir com notch/barra de status e com feedback nativo adequado.
- **O que se planeja fazer:** ajustar safe area e animação, revisar o som e adicionar vibração Android com fallback silencioso, preservando a fila e a web.
- **Recursos/arquivos principais envolvidos:** toast de conquista, CSS de safe area, áudio, `@capacitor/haptics`, Android e testes PT/EN/ES.

### [C26-B] - Lembretes locais

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** oferecer lembretes úteis de água e acompanhamento diário com o app fechado antes do lançamento público.
- **O que se planeja fazer:** implementar consentimento, preferências, janela ativa/silenciosa, agendamento local contextual, cancelamento/reagendamento e navegação ao tocar.
- **Recursos/arquivos principais envolvidos:** `@capacitor/local-notifications`, metas e registros locais, idioma/fuso, preferências, Android, Data Safety e testes físicos.

### [C26-C] - Push e backend de notificações

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** manter rastreável a expansão futura para mensagens remotas sem ampliar o MVP local por inferência.
- **O que se planeja fazer:** após validar C26-B e aprovar nova Tarefa 0, avaliar FCM, tokens por dispositivo, agendamento servidor, consentimento, retenção/exclusão e relação com C17.
- **Recursos/arquivos principais envolvidos:** FCM, backend ainda não definido, tokens por dispositivo, política de privacidade, Data Safety e preferências de comunicação.

### [C30-A] - Produto e contrato de planos

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** definir a oferta comercial antes de codificar cobrança ou direitos de acesso.
- **O que se planeja fazer:** aprovar benefícios gratuitos/pagos, preços, periodicidade, teste/ofertas, tratamento dos testers e estados de entitlement sem hardcode comercial no cliente.
- **Recursos/arquivos principais envolvidos:** ROADMAP, contrato de tiers C14-F1, catálogo Play, UX de planos, termos e decisões do responsável.

### [C30-B] - Backend de entitlements

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** tornar o backend a fonte de verdade verificável dos benefícios pagos associados à conta Trofia.
- **O que se planeja fazer:** verificar compras no servidor e manter estados idempotentes de compra/assinatura sem confiar no cliente nem armazenar dados de pagamento.
- **Recursos/arquivos principais envolvidos:** Google Play Developer API, Functions/Cloud Run a definir na Tarefa 0, Firestore canônico, Auth, App Check, IAM e testes.

### [C30-C] - Integração Android e restauração

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** permitir compra, restauração e gerenciamento transparentes pela Google Play no aplicativo Android.
- **O que se planeja fazer:** integrar Play Billing, catálogo e estados recuperáveis; restaurar direitos entre reinstalação/aparelhos sem associar compra à conta errada.
- **Recursos/arquivos principais envolvidos:** Google Play Billing, módulo nativo Android/Capacitor, Play Console, telas PT/EN/ES, lifecycle e testes com license testers.

### [C30-D] - Ciclo de vida, reconciliação e segurança

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** manter direitos corretos diante de renovação, cancelamento, falha de pagamento, reembolso e eventos duplicados.
- **O que se planeja fazer:** processar notificações em tempo real de forma idempotente, consultar o estado oficial, reconhecer compras verificadas e reconciliar divergências com observabilidade sanitizada.
- **Recursos/arquivos principais envolvidos:** RTDN/Pub/Sub, Google Play Developer API, backend de entitlements, filas/retries, monitoramento e runbooks.

### [C30-E] - Compliance, testes e rollout

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** provar a cobrança e os direitos no artefato distribuído antes de expor planos ao público.
- **O que se planeja fazer:** atualizar política/termos/Data Safety, configurar produtos e testers, validar todos os ciclos principais, rollback e AAB Play interno antes do C25.
- **Recursos/arquivos principais envolvidos:** políticas trilíngues, Play Console, license testers, Pages, AAB, Galaxy físico, CI, documentação operacional e C25.

### [DOC-RECONCILIACAO-C14] - Granularidade e gate documental da frente principal

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 15/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Propósito:** eliminar lacunas entre o resumo compartilhado e o histórico detalhado e impedir que novas fatias sejam encerradas sem documentação completa.
- **O que se planeja fazer:** separar no histórico C14-B1/B2, C14-C1–C5 e C14-F1/F2, formalizar o padrão obrigatório e torná-lo instrução operacional do repositório.
- **Recursos/arquivos principais envolvidos:** `AGENTS.md`, `documentation/PADRAO-DOCUMENTACAO.md`, `documentation/README.md`, `documentation/estado-atual/RESUMO-STATUS.md` e `documentation/historico/2026-08-31-principal-arquitetura-ia-dados.md`.
- **O que foi feito:** o PR #208 eliminou os agregados C14-B/C/F do histórico, criou uma entrada completa por fatia, registrou DOC-FORMAT-198 e tornou o padrão documental uma instrução obrigatória do repositório.
- **Alinhamento:** 100%; todas as lacunas confirmadas na reconciliação foram corrigidas sem alterar registros de outras frentes por inferência.

### Frente principal — sequências concluídas

### [C01-A] - Textos e proteção de encoding

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 01/08/2026.
- **Data de conclusão:** 01/08/2026.
- **Propósito:** eliminar textos corrompidos e impedir regressões de codificação nos módulos executados pelo app.
- **O que se planeja fazer:** corrigir D01/D02, ampliar o scanner de mojibake para todo o runtime e validar PT/EN/ES.
- **Recursos/arquivos principais envolvidos:** `nutrition-feedback-ai.js`, `verify-email-screen.js`, `scripts/audit-i18n.js`, `scripts/encoding-audit.js` e testes de encoding/i18n.
- **O que foi feito:** O PR #83 ampliou a auditoria de encoding e corrigiu as superfícies PT/EN/ES afetadas.
- **Alinhamento:** 100%.

### [C01-B] - Domínio de datas civis

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 01/08/2026.
- **Data de conclusão:** 01/08/2026.
- **Propósito:** evitar deslocamentos de data, erros de DST e divergências entre loaders e metas históricas.
- **O que se planeja fazer:** criar helpers únicos de hoje local, soma/diferença civil e migrar janelas semanais/mensais, nascimento e metas.
- **Recursos/arquivos principais envolvidos:** `date-utils.js`, `history-loaders.js`, `goal-calculator.js`, `body-metrics-model.js`, `firebase-storage.js`, controladores e testes de datas.
- **O que foi feito:** O PR #84 centralizou as operações de data civil e migrou os consumidores sem alterar chaves históricas.
- **Alinhamento:** 100%.

### [C01-C] - Virada reativa da meia-noite

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 01/08/2026.
- **Data de conclusão:** 01/08/2026.
- **Propósito:** trocar o dia ativo sem carregar ou salvar estado pertencente ao dia anterior.
- **O que se planeja fazer:** substituir TODAY estático, suspender autosaves durante a troca e reidratar log, água, suplementos e nota.
- **Recursos/arquivos principais envolvidos:** `autosave-scheduler.js`, `nutrition-tracker-controller.js`, `app.js`, `nutrition-tracker.jsx`, `src/App.jsx` e testes com relógio/fuso.
- **O que foi feito:** O PR #85 implementou relógio local reativo, suspensão dos autosaves e reidratação segura do novo dia.
- **Alinhamento:** 100%.

### [UX80-F1] - Tooltip semanal e centralização de Nutrientes

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** remover a duplicação do tooltip de ontem e alinhar texto/seta como um único bloco.
- **O que se planeja fazer:** corrigir os itens 1 e 3 da rodada visual sem alterar os demais gráficos.
- **Recursos/arquivos principais envolvidos:** `week-screen.js`, `diary-screen.js` e testes unitários das telas Semana/Diário.
- **O que foi feito:** O PR #80 corrigiu a composição duplicada do tooltip e centralizou o controle “Nutrientes”.
- **Alinhamento:** 100%.

### [UX80-F2] - Ajuda e navegação de data sem sobreposição

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** impedir que o botão de ajuda cubra navegação, Hoje ou o fechamento do modal.
- **O que se planeja fazer:** reposicionar a ajuda e organizar a navegação de data em duas linhas responsivas.
- **Recursos/arquivos principais envolvidos:** `app.js`, `add-screen.js`, `nutrition-tracker-controller.js` e testes de layout/navegação.
- **O que foi feito:** O PR #80 reposicionou o botão de ajuda e estabilizou a navegação de data nas superfícies afetadas.
- **Alinhamento:** 100%.

### [UX80-F3] - Horário opcional da refeição

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** permitir registrar a hora real da refeição sem tornar o fluxo mais pesado.
- **O que se planeja fazer:** adicionar “+ Informar horário”, aplicando o mesmo horário a todos os itens e mantendo agora como padrão.
- **Recursos/arquivos principais envolvidos:** `add-screen.js`, `nutrition-tracker-controller.js`, `meal-review-modal.js` e testes de registro.
- **O que foi feito:** O PR #80 adicionou o controle recolhido e persistiu o horário escolhido em todos os métodos de registro.
- **Alinhamento:** 100%.

### [UX80-F4] - Fechamento seguro do modal Adicionar

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** fechar o modal somente depois de persistência bem-sucedida e devolver o usuário à origem exata.
- **O que se planeja fazer:** capturar aba/data/scroll, restaurá-los no sucesso e manter o modal aberto em qualquer erro.
- **Recursos/arquivos principais envolvidos:** `add-screen.js`, `nutrition-tracker-controller.js`, `app.js`, navegação Android e testes.
- **O que foi feito:** O PR #80 passou a fechar após sucesso e restaurar aba, data e rolagem; validação, IA ou persistência falhas não fecham.
- **Alinhamento:** 100%.

### [UX80-F5] - Categorias do Diário somente quando preenchidas

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** reduzir ruído visual e ordenar refeições pelo horário real.
- **O que se planeja fazer:** ocultar categorias vazias, manter apenas o botão global Adicionar e ordenar por primeiro horário com fallback MEALS.
- **Recursos/arquivos principais envolvidos:** `diary-screen.js`, `nutrition-tracker-controller.js` e testes unitários/autenticados do Diário.
- **O que foi feito:** O PR #80 ocultou categorias vazias, removeu botões individuais e aplicou ordenação cronológica estável.
- **Alinhamento:** 100%.

### [UX80-F6] - Água em resumo colapsável

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** reduzir a altura do bloco de água sem perder nenhuma ação.
- **O que se planeja fazer:** mostrar resumo e barra fina fechados; expor rápidos, personalizado, lista e meta ao expandir.
- **Recursos/arquivos principais envolvidos:** `app.js`, `nutrition-tracker-controller.js` e testes da interface de água.
- **O que foi feito:** O PR #80 entregou o resumo colapsável preservando valores rápidos, customização, histórico e meta.
- **Alinhamento:** 100%.

### [UX80-F7] - Estado local da Trofia IA

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** informar o estado da última chamada sem criar uma consulta adicional ao Worker.
- **O que se planeja fazer:** adicionar Trofia IA ao menu, sanitizar sessionStorage e distinguir 429 por escopo/Retry-After.
- **Recursos/arquivos principais envolvidos:** `ai-client.js`, `worker/src/ai-worker.js`, `app.js` e testes do cliente/Worker.
- **O que foi feito:** O PR #80 adicionou os seis estados locais e enriqueceu respostas 429 com `scope` sanitizado.
- **Alinhamento:** 100%.

### [UX80-F8] - Documentação e validação da rodada UX

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/07/2026.
- **Data de conclusão:** 31/07/2026.
- **Propósito:** encerrar a rodada com rastreabilidade e regressão completa.
- **O que se planeja fazer:** atualizar inventário/changelog e validar unitários, smoke, Vite e cutover.
- **Recursos/arquivos principais envolvidos:** `CHANGELOG_DESIGN.md`, `bug-inventory.txt`, `STABILITY_TODO.md` e suítes de teste.
- **O que foi feito:** O PR #80 registrou a rodada e fechou os gates locais e autenticados.
- **Alinhamento:** 100%.

### [C20-A] - Contrato e matriz de calibração do score

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** definir o significado contextual da nota 0–5 antes de alterar produção.
- **O que se planeja fazer:** formalizar componentes, faixas, cobertura, confiança e casos de referência.
- **Recursos/arquivos principais envolvidos:** `NUTRITION_SCORE.md`, `tests/fixtures/meal-score-calibration.json`, i18n e testes de calibração.
- **O que foi feito:** O PR #129 estabeleceu o contrato e a matriz canônica, incluindo a correção de sal versus sódio.
- **Alinhamento:** 100%.

### [C20-B] - Algoritmo meal-score-v2

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** calibrar a nota contextual com horário real, curvas e dados opcionais completos.
- **O que se planeja fazer:** implementar v2 versionada sem recalcular snapshots históricos.
- **Recursos/arquivos principais envolvidos:** `meal-score.js`, `nutrition-feedback-ai.js`, `nutrition-tracker-controller.js`, fixture de calibração e testes.
- **O que foi feito:** O PR #131 implementou `meal-score-v2`, cobertura/confiança e componentes opcionais de carboidrato e gordura.
- **Alinhamento:** 100%.

### [C20-C] - Integração do score v2

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** usar o algoritmo calibrado no controlador e no GA preservando resultados já salvos.
- **O que se planeja fazer:** integrar v2 aos fluxos ativos e manter retrocompatibilidade de snapshots.
- **Recursos/arquivos principais envolvidos:** `meal-score.js`, `meal-ga.js`, `ga-result-card.js`, `nutrition-tracker-controller.js` e testes autenticados.
- **O que foi feito:** O PR #132 integrou a nota v2 ao GA/controlador e manteve leitura dos snapshots anteriores.
- **Alinhamento:** 100%.

### [C20-D] - Apresentação mínima da pontuação

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** explicar nota, faixas, confiança e provisoriedade sem linguagem diagnóstica.
- **O que se planeja fazer:** apresentar rótulos corretos e o motivo específico da baixa cobertura.
- **Recursos/arquivos principais envolvidos:** `ga-result-card.js`, `meal-review-modal.js` e testes unitários/autenticados da apresentação.
- **O que foi feito:** O PR #134 exibiu confiança, faixas e razões específicas para nota provisória.
- **Alinhamento:** 100%.

### [C20-E] - Validação final da pontuação

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** comprovar estabilidade do C20 nos idiomas e runtimes suportados.
- **O que se planeja fazer:** executar matriz PT/EN/ES, desktop/mobile e suíte autenticada completa.
- **Recursos/arquivos principais envolvidos:** `ROADMAP.md`, `tests/smoke/authenticated-flows.spec.js` e pipelines CI/Pages.
- **O que foi feito:** O PR #135 encerrou o C20 com matriz integral verde.
- **Alinhamento:** 100%.

### [C19-A] - Contrato e integridade dos snapshots

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** garantir que avaliações aceitas não sobrevivam a edições incompatíveis nem apareçam malformadas.
- **O que se planeja fazer:** definir agrupamento, invalidação conservadora, duplicação sem metadados e leitura fail-closed.
- **Recursos/arquivos principais envolvidos:** `meal-score.js`, `nutrition-tracker-controller.js` e respectivos testes unitários.
- **O que foi feito:** O PR #137 implementou contrato, invalidação do grupo e ocultação fail-closed.
- **Alinhamento:** 100%.

### [C19-B] - Avaliação opcional e retry contextual

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** eliminar loading/retry inadequado sem tornar a avaliação obrigatória.
- **O que se planeja fazer:** manter Registrar refeição e oferecer retry apenas quando a explicação de IA falhar.
- **Recursos/arquivos principais envolvidos:** `meal-review-ai.js`, `meal-review-modal.js`, `nutrition-tracker-controller.js` e testes smoke/unitários.
- **O que foi feito:** O PR #139 estabilizou o fluxo opcional, renomeou a ação e restringiu o retry à falha explicativa.
- **Alinhamento:** 100%.

### [C19-C] - Avaliação opcional no fluxo de foto

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** oferecer o mesmo motor calibrado após reconhecimento por imagem sem bloquear a confirmação.
- **O que se planeja fazer:** integrar a ação opcional à revisão C24 preservando Confirmar refeição.
- **Recursos/arquivos principais envolvidos:** `image-meal-flow.js`, `image-meal-screen.js`, `nutrition-tracker-controller.js`, `src/App.jsx` e testes.
- **O que foi feito:** O PR #140 integrou a avaliação opcional à foto e preservou o caminho direto de confirmação.
- **Alinhamento:** 100%.

### [C19-D] - Badge da avaliação aceita no Diário

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** tornar avaliações persistidas consultáveis sem permitir edição acidental.
- **O que se planeja fazer:** agrupar por `mealEvaluationId`, mostrar badge e abrir detalhe somente leitura.
- **Recursos/arquivos principais envolvidos:** `diary-screen.js`, `nutrition-tracker-controller.js`, entrypoints, navegação Android e testes.
- **O que foi feito:** O PR #142 entregou badge agrupado e detalhe somente leitura no Diário.
- **Alinhamento:** 100%.

### [C19-E] - Validação final da avaliação

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** encerrar a integração C19 com cobertura real nos idiomas e layouts.
- **O que se planeja fazer:** executar suíte completa, CI autenticado e matriz PT/EN/ES desktop/mobile.
- **Recursos/arquivos principais envolvidos:** `ROADMAP.md`, testes smoke autenticados e pipelines CI/Pages.
- **O que foi feito:** O PR #145 fechou o C19 com toda a matriz verde.
- **Alinhamento:** 100%.

### [C08-A] - Política e matriz nutricional da IA

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** alinhar sete superfícies de IA aos critérios canônicos C20/C19.
- **O que se planeja fazer:** formalizar nutrientes, ausência, cobertura, linguagem e contratos antes de produção.
- **Recursos/arquivos principais envolvidos:** `AI_NUTRITION_POLICY.md`, `PENDENCIAS.md`, fixture `ai-nutrition-policy.json` e testes.
- **O que foi feito:** O PR #147 criou a política versionada `c08-ai-nutrition-policy-v1` e sua matriz executável.
- **Alinhamento:** 100%.

### [C08-B] - Ausente não é zero

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 31/08/2026.
- **Propósito:** impedir que dados nutricionais desconhecidos sejam tratados como zero real.
- **O que se planeja fazer:** distinguir ausência, zero declarado e cobertura nas superfícies afetadas.
- **Recursos/arquivos principais envolvidos:** `dish-description-ai.js`, `eating-patterns-ai.js`, `nutrition-feedback-ai.js`, controlador e testes.
- **O que foi feito:** O PR #149 separou ausência de zero e passou a relatar cobertura exata em PT/EN/ES.
- **Alinhamento:** 100%.

### [C08-C] - Estimativas estruturadas

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 31/08/2026.
- **Propósito:** uniformizar preenchimento de alimento, descrição textual e foto com validação estrita.
- **O que se planeja fazer:** criar endpoints estruturados e reutilizar o contrato/editor compartilhado do C24.
- **Recursos/arquivos principais envolvidos:** `food-autofill-ai.js`, `dish-description-ai.js`, `ai-client.js`, `add-screen.js`, Worker e testes.
- **O que foi feito:** O PR #151 alinhou os três fluxos, adicionou endpoints estruturados e validação fail-closed.
- **Alinhamento:** 100%.

### [C08-D] - Feedback e padrões alimentares

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 31/08/2026.
- **Propósito:** melhorar análises narrativas usando dados disponíveis sem enviar atributos pessoais desnecessários.
- **O que se planeja fazer:** incluir cobertura real, linguagem não diagnóstica e minimizar nome/idade/sexo/antropometria.
- **Recursos/arquivos principais envolvidos:** `nutrition-feedback-ai.js`, `eating-patterns-ai.js`, política/fixture e testes.
- **O que foi feito:** O PR #152 incluiu nutrientes disponíveis, cobertura e minimização de dados nos prompts narrativos.
- **Alinhamento:** 100%.

### [C08-E] - Despensa e explicação da avaliação

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 31/08/2026.
- **Propósito:** garantir que sugestões usem somente itens válidos da despensa e alinhar a explicação C19.
- **O que se planeja fazer:** extrair prompts embutidos, estruturar sugestões e validar a saída contra a despensa.
- **Recursos/arquivos principais envolvidos:** `pantry-suggestions-ai.js`, `meal-review-ai.js`, `ai-client.js`, Worker, política e documentação.
- **O que foi feito:** O PR #165 criou `/v1/ai/pantry-suggestions`, validação fail-closed e alinhou a explicação de avaliação.
- **Alinhamento:** 100%.

### [C08-F] - Validação final dos critérios de IA

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 31/08/2026.
- **Propósito:** provar os contratos contra idiomas, dados adversariais e Gemini real.
- **O que se planeja fazer:** cobrir PT/EN/ES, ausentes, respostas malformadas, prompts adversariais e avaliação controlada.
- **Recursos/arquivos principais envolvidos:** workflows C08/pantry, `AI_NUTRITION_POLICY.md`, `ROADMAP.md`, testes e Worker publicado.
- **O que foi feito:** O PR #167 concluiu a matriz e a prova controlada após deploy do Worker.
- **Alinhamento:** 100%.

### [C22-F1] - Infraestrutura de Functions e emuladores

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 18/08/2026.
- **Data de conclusão:** 18/08/2026.
- **Propósito:** criar uma base administrativa separada do Worker para exclusão integral de contas.
- **O que se planeja fazer:** configurar Functions 2nd gen, Admin SDK, emuladores e contratos de infraestrutura.
- **Recursos/arquivos principais envolvidos:** `functions/`, `firebase.json`, `.firebaserc`, workflows e testes de infraestrutura.
- **O que foi feito:** O PR #99 criou a base em `europe-southwest1` e os ambientes de teste.
- **Alinhamento:** 100%.

### [C22-F2] - Motor idempotente de exclusão

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 18/08/2026.
- **Data de conclusão:** 18/08/2026.
- **Propósito:** transformar exclusão em saga retomável e segura contra repetição.
- **O que se planeja fazer:** implementar estados, idempotência, falhas/retries e testes puros.
- **Recursos/arquivos principais envolvidos:** `functions/src/account-deletion-engine.js`, testes do motor e fixtures autenticadas.
- **O que foi feito:** O PR #100 implementou o motor da saga e estabilizou fixtures relacionadas.
- **Alinhamento:** 100%.

### [C22-F3] - Lock e exclusão recursiva

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 21/08/2026.
- **Data de conclusão:** 21/08/2026.
- **Propósito:** impedir novas escritas enquanto todos os dados canônicos e subcoleções são removidos.
- **O que se planeja fazer:** adicionar lock nas rules, recursão administrativa e testes de concorrência.
- **Recursos/arquivos principais envolvidos:** `firestore.rules`, `functions/src/firestore-account-deletion.js` e testes de rules/recursão.
- **O que foi feito:** O PR #103 implementou lock, remoção recursiva e cenários concorrentes.
- **Alinhamento:** 100%.

### [C22-F4] - Fila, retries e reconciliação

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 21/08/2026.
- **Data de conclusão:** 21/08/2026.
- **Propósito:** processar exclusões assincronamente sem perder jobs falhos ou duplicados.
- **O que se planeja fazer:** integrar Cloud Tasks, backoff por etapa, retenção/TTL de falhos e entrega duplicada.
- **Recursos/arquivos principais envolvidos:** `functions/src/account-deletion-jobs.js`, `account-deletion-task.js`, índices/TTL, `firebase.json` e testes.
- **O que foi feito:** O PR #104 entregou fila em `europe-west1`, reconciliação e idempotência de tarefas.
- **Alinhamento:** 100%.

### [C22-F5] - Cliente, App Check e limpeza local

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 21/08/2026.
- **Data de conclusão:** 21/08/2026.
- **Propósito:** iniciar a exclusão protegida e impedir persistência local posterior ao aceite do job.
- **O que se planeja fazer:** integrar painel, callable protegida, suspensão de autosave e limpeza mantendo idioma/tema.
- **Recursos/arquivos principais envolvidos:** `account-deletion-client.js`, `privacy-panel.js`, `app-check-client.js`, entrypoints Android/web e testes.
- **O que foi feito:** O PR #105 integrou o fluxo assíncrono, App Check e o lifecycle local seguro.
- **Alinhamento:** 100%.

### [C22-F6] - Deploy e teste destrutivo descartável

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 21/08/2026.
- **Data de conclusão:** 21/08/2026.
- **Propósito:** comprovar a saga em produção sem tocar em conta real.
- **O que se planeja fazer:** publicar Functions/Tasks e executar exclusão real com conta descartável criada dinamicamente.
- **Recursos/arquivos principais envolvidos:** Firebase Functions, Cloud Tasks, App Check Android/web, scripts de teste destrutivo e logs sanitizados.
- **O que foi feito:** O rollout do PR #105 validou aceite, lock, remoção Auth/Firestore e idempotência numa conta descartável.
- **Alinhamento:** 100%.

### [C22-F7] - Validação final, política e rollout

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 21/08/2026.
- **Data de conclusão:** 21/08/2026.
- **Propósito:** fechar operação, compliance e prova Play Integrity da exclusão administrativa.
- **O que se planeja fazer:** validar matriz final, atualizar/publicar política e Data Safety e testar AAB distribuído pela Play.
- **Recursos/arquivos principais envolvidos:** `C22_ROLLOUT.md`, políticas PT/EN/ES, `GOOGLE_PLAY_DATA_SAFETY.md`, índices/TTL e AAB Play.
- **O que foi feito:** O PR #106 e a validação física posterior encerraram o C22 em produção.
- **Alinhamento:** 100%.

### [C23-F1] - Inventário e migrador administrativo

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 22/08/2026.
- **Data de conclusão:** 22/08/2026.
- **Propósito:** classificar dados legados e conflitos antes de qualquer escrita ou exclusão.
- **O que se planeja fazer:** criar dry-run paginado, fail-closed e testável via Admin SDK.
- **Recursos/arquivos principais envolvidos:** `functions/scripts/c23-legacy-dry-run.js`, `legacy-migration-inventory.js`, `firebase.json` e testes.
- **O que foi feito:** O PR #107 entregou inventário/migrador somente leitura com classificação conservadora.
- **Alinhamento:** 100%.

### [C23-F2] - Cópia e verificação dos legados

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 23/08/2026.
- **Data de conclusão:** 23/08/2026.
- **Propósito:** migrar dados reais sem apagar a origem e parar diante de conflitos.
- **O que se planeja fazer:** copiar/mesclar os 54 documentos, verificar cada destino e manter legados intactos.
- **Recursos/arquivos principais envolvidos:** `c23-legacy-copy.js`, `legacy-migration-copy.js`, inventário e testes.
- **O que foi feito:** O PR #108 registrou a ferramenta; a execução real verificou individualmente os 54 destinos sem conflito.
- **Alinhamento:** 100%.

### [C23-F3] - Rules transitórias

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 23/08/2026.
- **Data de conclusão:** 23/08/2026.
- **Propósito:** retirar a exclusão legada do cliente antes do corte de leitura.
- **O que se planeja fazer:** negar delete legado, manter leitura temporária e testar owner/outro usuário/lock/canônico.
- **Recursos/arquivos principais envolvidos:** `firestore.rules` e testes de emulador em `functions/test/firestore-rules.emulator.test.js`.
- **O que foi feito:** O PR #109 publicou a transição que preservava leitura e removia exclusão client-side.
- **Alinhamento:** 100%.

### [C23-F4] - Corte do cliente legado

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 27/08/2026.
- **Data de conclusão:** 27/08/2026.
- **Propósito:** parar normalização automática e exclusão client-side sem quebrar backups antigos.
- **O que se planeja fazer:** simplificar Firestore interno, remover módulo de exclusão e extrair helpers de merge retrocompatíveis.
- **Recursos/arquivos principais envolvidos:** `firebase-firestore-internal.js`, `firebase-account-data-internal.js`, módulos de backup/migração e três entrypoints.
- **O que foi feito:** O PR #110 cortou caminhos runtime legados e manteve importação de backups antigos.
- **Alinhamento:** 100%.

### [C23-F5] - Janela observacional

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 27/08/2026.
- **Data de conclusão:** não determinado.
- **Propósito:** detectar regressões tardias antes da exclusão física irreversível.
- **O que se planeja fazer:** distribuir build intermediária e observar Semana/dados/testers por sete dias completos.
- **Recursos/arquivos principais envolvidos:** AAB intermediário, Play Console, aba Semana e relatos dos testers.
- **O que foi feito:** A janela aprovada terminou sem duplicação, ausência de dados ou relato de erro.
- **Alinhamento:** 100%.

### [C23-F6] - Fechamento físico dos legados

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 27/08/2026.
- **Data de conclusão:** 27/08/2026.
- **Propósito:** eliminar somente fontes verificadas após criar uma recuperação externa.
- **O que se planeja fazer:** exportar Firestore, reconfirmar destinos, excluir legados verificados e fechar leitura nas rules.
- **Recursos/arquivos principais envolvidos:** `c23-legacy-delete.js`, `legacy-migration-delete.js`, `firestore.rules`, export gerenciado e testes.
- **O que foi feito:** O PR #111 fechou as rules e a execução administrativa confirmou contagem final de zero documentos legados.
- **Alinhamento:** 100%.

### [C23-F7] - Documentação e retenção

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 27/08/2026.
- **Data de conclusão:** 28/08/2026.
- **Propósito:** registrar o corte, a compatibilidade preservada e a retenção do export.
- **O que se planeja fazer:** marcar roadmap/bugs, manter import antigo e limpeza C22, e aplicar lifecycle de 90 dias ao export.
- **Recursos/arquivos principais envolvidos:** `ROADMAP.md`, `bug-inventory.txt`, bucket de export e documentação operacional.
- **O que foi feito:** O PR #112 encerrou C23 e registrou A01/A02/A03 como resolvidos; lifecycle de 90 dias foi aplicado.
- **Alinhamento:** 100%.

### [C24-F1] - Contrato e editor compartilhado

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 01/08/2026.
- **Data de conclusão:** 01/08/2026.
- **Propósito:** criar uma representação reutilizável para revisar estimativas de refeição.
- **O que se planeja fazer:** extrair domínio/editor compartilhado antes de implementar captura e IA.
- **Recursos/arquivos principais envolvidos:** `meal-estimate.js`, `meal-estimate-editor.js`, cópias ESM e testes unitários.
- **O que foi feito:** O PR #89 criou contrato/editor compartilhados por foto e descrição.
- **Alinhamento:** 100%.

### [C24-F2] - Worker multimodal

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 02/08/2026.
- **Data de conclusão:** 02/08/2026.
- **Propósito:** analisar JPEG autenticado sem persistir imagem e sob limites próprios.
- **O que se planeja fazer:** criar `/v1/ai/image-meal`, schema estruturado, limites 1,5/2,2 MB e rate limit 2 imagens/min.
- **Recursos/arquivos principais envolvidos:** `worker/src/ai-worker.js`, `image-meal.js`, `rate-limiter.js` e testes do Worker.
- **O que foi feito:** O PR #90 entregou endpoint multimodal, validação e limites acumulados.
- **Alinhamento:** 100%.

### [C24-F3] - Captura e pré-processamento

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 02/08/2026.
- **Data de conclusão:** 02/08/2026.
- **Propósito:** obter câmera/galeria com payload consistente e sem metadados persistidos.
- **O que se planeja fazer:** integrar Camera 8.x, fallback web, orientação, 1.280 px e JPEG 80%.
- **Recursos/arquivos principais envolvidos:** `meal-image-capture.js`, `@capacitor/camera`, `src/App.jsx`, Gradle/Capacitor e testes.
- **O que foi feito:** O PR #91 implementou captura, galeria, normalização, preview e descarte temporário.
- **Alinhamento:** 100%.

### [C24-F4] - Tela dedicada de reconhecimento

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 02/08/2026.
- **Data de conclusão:** 02/08/2026.
- **Propósito:** oferecer estados completos de captura, processamento, revisão e erros.
- **O que se planeja fazer:** criar tela com cancelamento, resultado editável e mensagens distintas por categoria de falha.
- **Recursos/arquivos principais envolvidos:** `image-meal-screen.js`, `image-meal-flow.js`, `image-meal-client.js`, componentes ESM e testes.
- **O que foi feito:** O PR #92 entregou a máquina de estados e a revisão editável.
- **Alinhamento:** 100%.

### [C24-F5] - Persistência da refeição reconhecida

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 08/08/2026.
- **Data de conclusão:** 09/08/2026.
- **Propósito:** registrar estimativas revisadas sem guardar a imagem e sem perder a origem da navegação.
- **O que se planeja fazer:** persistir itens individuais com `_estimated`/`_estimateSource`, categoria/horário e falha recuperável.
- **Recursos/arquivos principais envolvidos:** `image-meal-registration.js`, `nutrition-tracker-controller.js`, `src/App.jsx` e testes.
- **O que foi feito:** O PR #94 integrou `saveMealRegistration()`, preservou a tela no erro e restaurou a origem no sucesso.
- **Alinhamento:** 100%.

### [C24-F6] - Privacidade e Data Safety

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 09/08/2026.
- **Data de conclusão:** 09/08/2026.
- **Propósito:** tornar a coleta transitória de fotos transparente antes de expor o recurso.
- **O que se planeja fazer:** sincronizar políticas PT/EN/ES, guia do Play e publicação pública antes dos testers.
- **Recursos/arquivos principais envolvidos:** `PRIVACY_POLICY_PT-BR.md`, `PRIVACY_POLICY_EN.md`, `PRIVACY_POLICY_ES.md`, `GOOGLE_PLAY_DATA_SAFETY.md` e testes.
- **O que foi feito:** O PR #95 atualizou compliance; política, Data Safety e Cloud Billing foram confirmados antes do rollout.
- **Alinhamento:** 100%.

### [C24-F7] - Validação física e rollout

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 13/08/2026.
- **Data de conclusão:** 17/08/2026.
- **Propósito:** validar qualidade, robustez e integração real antes de liberar aos testers.
- **O que se planeja fazer:** publicar Worker, comparar High/Medium, testar fotos reais/Android e liberar navegação somente após gates.
- **Recursos/arquivos principais envolvidos:** `C24_FATIA_7_VALIDACAO.md`, Worker/Interactions API, captura, scripts de deploy e matriz Android.
- **O que foi feito:** Os PRs #96–#97 corrigiram o adaptador do provider, validaram fotos reais e liberaram Reconhecer por foto.
- **Alinhamento:** aproximadamente 90% — o contrato público permaneceu igual, mas o adaptador interno precisou migrar para a Interactions API após rejeições do schema; impacto final positivo para compatibilidade real.

### [C28-F1] - Quick wins de leitura e CI por SHA

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 28/08/2026.
- **Data de conclusão:** 28/08/2026.
- **Propósito:** reduzir imediatamente leituras redundantes e duplicação da suíte autenticada.
- **O que se planeja fazer:** coalescer leituras óbvias e executar o CI autenticado uma única vez por SHA.
- **Recursos/arquivos principais envolvidos:** `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `firebase-firestore-internal.js` e testes.
- **O que foi feito:** O PR #113 reaplicou os quick wins válidos e eliminou a duplicação entre workflows.
- **Alinhamento:** 100%.

### [C28-F2] - Firebase App, Auth modular e App Check

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 28/08/2026.
- **Data de conclusão:** 28/08/2026.
- **Propósito:** estabelecer uma instância modular compartilhada e autenticação compatível com cache protegido.
- **O que se planeja fazer:** migrar Auth, integrar reCAPTCHA web e ponte Play Integrity Android sem ativar o cutover ainda.
- **Recursos/arquivos principais envolvidos:** `firebase-app-client.js`, `firebase-auth-sdk.js`, `app-check-client.js`, cópias ESM e testes.
- **O que foi feito:** O PR #114 entregou a fundação modular e a ponte de App Check.
- **Alinhamento:** 100%.

### [C28-F3] - Adaptador Firestore SDK

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 28/08/2026.
- **Data de conclusão:** 28/08/2026.
- **Propósito:** substituir REST pelo SDK oficial sem alterar o contrato público de storage.
- **O que se planeja fazer:** implementar get/set/delete/list sobre o schema canônico C23.
- **Recursos/arquivos principais envolvidos:** `firebase-firestore-sdk.js`, cópia ESM e testes de composição/contrato.
- **O que foi feito:** O PR #115 introduziu o adaptador modular mantendo a API pública existente.
- **Alinhamento:** 100%.

### [C28-F4] - Cache persistente e lifecycle

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 28/08/2026.
- **Data de conclusão:** 28/08/2026.
- **Propósito:** oferecer cache offline protegido sem replay entre contas ou após exclusão.
- **O que se planeja fazer:** ativar IndexedDB multi-tab/100 MB e limpar cache em logout, troca de conta e exclusão.
- **Recursos/arquivos principais envolvidos:** `firebase-firestore-lifecycle.js`, Auth/Firestore SDK, runtime ESM e testes.
- **O que foi feito:** O PR #116 implementou cache persistente, escolha de confiança web e encerramento seguro.
- **Alinhamento:** 100%.

### [C28-F5] - Loaders cache-first e deduplicação

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** evitar refetches repetitivos ao navegar por dados já consultados.
- **O que se planeja fazer:** agrupar Semana/calendário/recentes/padrões/relatórios e reutilizar subscriptions.
- **Recursos/arquivos principais envolvidos:** `history-loaders.js`, `firebase-firestore-sdk.js`, `nutrition-tracker-controller.js` e testes.
- **O que foi feito:** O PR #117 entregou leituras cache-first e subscriptions reutilizáveis.
- **Alinhamento:** 100%.

### [C28-F6A] - IDs idempotentes e mutações diárias

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** criar identidade estável para escritas offline e preparar granularização concorrente.
- **O que se planeja fazer:** introduzir IDs idempotentes e transformação pura das entradas do dia.
- **Recursos/arquivos principais envolvidos:** `daily-entry-model.js`, `nutrition-tracker-controller.js`, `src/App.jsx`, baseline/fixtures e testes.
- **O que foi feito:** O PR #118 criou o domínio idempotente para entradas diárias.
- **Alinhamento:** 100%.

### [C28-F6B] - Esquema granular de alta concorrência

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** evitar que autosaves agregados sobrescrevam alterações concorrentes.
- **O que se planeja fazer:** persistir log, água e suplementos em documentos granulares aceitos pelas rules.
- **Recursos/arquivos principais envolvidos:** `firebase-firestore-sdk.js`, `firestore.rules`, runtime ESM e testes de emulador/SDK.
- **O que foi feito:** O PR #119 criou o esquema granular e suas regras.
- **Alinhamento:** 100%.

### [C28-F6C] - Leitura retrocompatível durante migração

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** manter dados antigos visíveis enquanto novos registros usam o formato granular.
- **O que se planeja fazer:** mesclar leitura agregada antiga com documentos granulares novos sem duplicação.
- **Recursos/arquivos principais envolvidos:** `firebase-firestore-sdk.js`, `firestore.rules`, runtime e testes de composição/emulador.
- **O que foi feito:** O PR #120 implementou leitura híbrida retrocompatível.
- **Alinhamento:** 100%.

### [C28-F6D] - Estados de sincronização e retries

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** tornar escritas offline observáveis e recuperáveis.
- **O que se planeja fazer:** expor pendente/sincronizado/erro, aguardar confirmações e oferecer retry seguro.
- **Recursos/arquivos principais envolvidos:** `firebase-sync-state.js`, `firebase-firestore-lifecycle.js`, SDK/runtime e testes.
- **O que foi feito:** O PR #121 implementou estados e retries sem duplicar mutações.
- **Alinhamento:** 100%.

### [C28-F6E] - Cutover final e fechamento do A09

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** eliminar a causa raiz das sobrescritas por autosave agregado.
- **O que se planeja fazer:** migrar consumidores para persistência granular e retirar autosaves concorrentes antigos.
- **Recursos/arquivos principais envolvidos:** `daily-entry-persistence.js`, `meal-ga.js`, `history-loaders.js`, controlador, entrypoints, SDK e inventário.
- **O que foi feito:** O PR #122 concluiu o cutover granular e marcou A09 como resolvido.
- **Alinhamento:** 100%.

### [C28-F7] - Backup, restauração e exclusão

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** adaptar operações globais ao cache e às escritas pendentes sem exportar estado enganoso.
- **O que se planeja fazer:** aguardar pending writes online, indicar export offline e encerrar SDK com segurança no C22.
- **Recursos/arquivos principais envolvidos:** `firebase-backup-internal.js`, Auth/lifecycle, `privacy-panel.js`, controladores/entrypoints e testes.
- **O que foi feito:** O PR #123 integrou backup/restauração/exclusão ao novo lifecycle.
- **Alinhamento:** 100%.

### [C28-F8] - Validação e rollout offline-first

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 29/08/2026.
- **Data de conclusão:** 29/08/2026.
- **Propósito:** comprovar o sistema em cenários reais de cache, concorrência e Android.
- **O que se planeja fazer:** validar emuladores, meia-noite, multi-aba, reconexão, encerramento, troca, backup, exclusão e leituras.
- **Recursos/arquivos principais envolvidos:** SDKs Firebase, Functions/emuladores, matriz física Android, testes e medição do Firestore.
- **O que foi feito:** O PR #124 encerrou C28 após CI, Pages e validação física/medição reais.
- **Alinhamento:** 100%.

### [DIARY-MENU-A] - Detalhes somente leitura no Diário

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 09/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** fazer a ação Detalhes mostrar informação útil sem permitir mutação.
- **O que se planeja fazer:** abrir modal com campos disponíveis, estimativa sanitizada e fechamento acessível.
- **Recursos/arquivos principais envolvidos:** `diary-screen.js`, testes unitários e smoke autenticado, além da documentação desta frente.
- **O que foi feito:** O PR #182 entregou modal somente leitura com fechamento por botão, backdrop, Esc e Voltar Android.
- **Alinhamento:** 100%.

### [DIARY-MENU-B] - Editar quantidade e mover refeição

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** editar quantidade/tipo preservando identidade e integridade dos snapshots.
- **O que se planeja fazer:** criar editor único, mover pelo mesmo ID, invalidar C19 com aviso e provar aceitação das rules.
- **Recursos/arquivos principais envolvidos:** `daily-entry-model.js`, `diary-screen.js`, `nutrition-tracker-controller.js`, rules/emulador e testes.
- **O que foi feito:** O PR #184 entregou edição/movimentação em dias atuais e históricos e validou `mealKey` no emulador.
- **Alinhamento:** 100%.

### [PHOTO-03-A] - Transformação proporcional de estimativas

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** recalcular nutrientes coerentemente quando peso ou quantidade muda.
- **O que se planeja fazer:** criar função pura em que quantidade ajusta gramas/nutrientes e gramas ajustam apenas nutrientes.
- **Recursos/arquivos principais envolvidos:** `meal-estimate.js`, cópia ESM e testes unitários de domínio.
- **O que foi feito:** O PR #186 implementou a transformação, usando cada edição manual posterior como nova base proporcional.
- **Alinhamento:** 100%.

### [PHOTO-03-B] - Integração proporcional no editor

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** aplicar a regra de domínio igualmente a foto e descrição e persistir o resultado revisado.
- **O que se planeja fazer:** integrar o editor compartilhado aos dois fluxos sem guardar metadados transitórios.
- **Recursos/arquivos principais envolvidos:** `meal-estimate-editor.js`, `app.js`, `nutrition-tracker.jsx`, `src/App.jsx` e testes dos builders/persistência.
- **O que foi feito:** O PR #188 integrou quantidade, gramas e oito nutrientes aos fluxos de foto/texto e persistência.
- **Alinhamento:** 100%.

### [C29-A] - Contrato seguro de reclassificação por IA

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** permitir reavaliar somente um alimento classificado incorretamente, sem ampliar a coleta nem enfraquecer os contratos de IA já protegidos.
- **O que se planeja fazer:** definir requisição e resposta estruturadas, sanitizar e limitar a correção textual, exigir Auth/App Check, aplicar limites/rate limits, validar fail-closed e manter imagem, correção, prompt e resposta bruta estritamente transitórios.
- **Recursos/arquivos principais envolvidos:** Worker multimodal, `worker/src/ai-worker.js`, validação Firebase Auth/App Check, Durable Object/rate limiter, contratos de estimativa C24/C08, `image-meal-client.js` e testes do Worker/cliente.

### [C29-B] - Integração da reclassificação no editor compartilhado

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** oferecer correção assistida dentro da revisão por foto sem alterar outros alimentos nem retirar do usuário o controle final da estimativa.
- **O que se planeja fazer:** adicionar “Classificado incorretamente”, coletar descrição breve, substituir apenas o item escolhido após resposta válida, preservar os demais itens/edições e cobrir revisão, cancelamento, retry, erros, acessibilidade e PT/EN/ES.
- **Recursos/arquivos principais envolvidos:** `image-meal-screen.js`, `image-meal-flow.js`, `meal-estimate-editor.js`, composições legado/Vite, i18n, testes unitários/smoke e revisão de política/Data Safety.

### UI/UX — sequências aprovadas compartilhadas

### [S1] - ChoiceField reutilizável

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** substituir o seletor nativo de tipo de refeição por uma base visual e acessível reutilizável.
- **O que se planeja fazer:** criar bottom sheet One UI 8/Glass UI com seleção imediata, foco e PT/EN/ES.
- **Recursos/arquivos principais envolvidos:** React, CSS, `choice-field.js`, registro de refeição e Playwright.
- **O que foi feito:** o PR #126 entregou o componente controlado e migrou o tipo de refeição com fechamento imediato.
- **Alinhamento:** 100%.

### [S2] - ChoiceField nos seletores de refeição

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** remover pickers nativos dos demais contextos estáticos ligados a refeições.
- **O que se planeja fazer:** migrar categoria da foto, refeição alvo, refeição padrão e confiança da estimativa.
- **Recursos/arquivos principais envolvidos:** `choice-field.js`, fluxos de foto/GA/refeições salvas, CSS e Playwright.
- **O que foi feito:** o PR #130 integrou os quatro contextos, incluindo descrição e barra semântica de confiança.
- **Alinhamento:** 100%.

### [S3] - ChoiceField global em perfil, métricas e unidades

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** aplicar uma régua única aos seletores estáticos globais sem tornar decisões pequenas excessivamente pesadas.
- **O que se planeja fazer:** usar inline até cinco opções sem descrição e bottom sheet para listas maiores ou descritas.
- **Recursos/arquivos principais envolvidos:** `choice-field.js`, cadastro/perfil obrigatório, Métricas, Alimentos e testes visuais.
- **O que foi feito:** PRs #133, #136 e #138 migraram gênero/unidade de alimento inline e atividade/objetivo/suplemento em sheet.
- **Alinhamento:** 100%.

### [S4] - SearchableChoiceField dinâmico

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** tornar listas longas e dinâmicas pesquisáveis sem depender do seletor do sistema.
- **O que se planeja fazer:** criar sheet com busca fixa, filtragem sem acentos, contagem, destaque e scrollbar temática.
- **Recursos/arquivos principais envolvidos:** `searchable-choice-field.js`, refeição salva, suplemento do Diário, CSS e Playwright.
- **O que foi feito:** o PR #141 integrou os dois contextos dinâmicos com busca, resultado vazio acessível e claro/escuro.
- **Alinhamento:** 100%.

### [S5] - TemporalField de horário

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** remover o relógio Android no idioma do sistema e alinhar horário ao idioma interno do app.
- **O que se planeja fazer:** oferecer steppers e digitação direta de hora/minuto pelo keypad próprio.
- **Recursos/arquivos principais envolvidos:** `temporal-field.js`, `numeric-field.js`, registro de refeição, CSS e Playwright.
- **O que foi feito:** o PR #144 entregou horário controlado, locale independente e entrada direta com confirmação imediata.
- **Alinhamento:** 100%.

### [S6] - TemporalField de data

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 30/08/2026.
- **Data de conclusão:** 30/08/2026.
- **Propósito:** substituir a data de nascimento nativa por calendário coerente e trilíngue.
- **O que se planeja fazer:** criar calendário civil com navegação mensal e salto rápido de ano por digitação.
- **Recursos/arquivos principais envolvidos:** `temporal-field.js`, `login-screen.js`, `required-profile-modal.js`, CSS e Playwright.
- **O que foi feito:** o PR #146 migrou cadastro e perfil obrigatório preservando validação de datas e PT/EN/ES.
- **Alinhamento:** 100%.

### [S7a] - NumericField para quantidade de alimento

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 31/08/2026.
- **Propósito:** acelerar a edição frequente de quantidade sem substituir o IME Android global.
- **O que se planeja fazer:** criar keypad interno 0–9, decimal, apagar e confirmar para a quantidade principal.
- **Recursos/arquivos principais envolvidos:** `numeric-field.js`, `add-screen.js`, CSS e Playwright autenticado.
- **O que foi feito:** o PR #148 integrou o keypad e corrigiu o estado vazio para neutro até interação inválida.
- **Alinhamento:** 100%.

### [S7b] - NumericField em medidas corporais

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** reutilizar o keypad nos campos corporais de maior frequência sem quebrar overlays de Métricas.
- **O que se planeja fazer:** migrar peso, gordura, cintura e massa muscular e validar stacking/containing contexts.
- **Recursos/arquivos principais envolvidos:** `numeric-field.js`, tela/controlador de Métricas, `one-ui.css` e Playwright.
- **O que foi feito:** o PR #150 integrou quatro medidas e neutralizou o containing context do card somente com overlay aberto.
- **Alinhamento:** desvio positivo; a validação ampliou o endurecimento de stacking sem alterar o escopo funcional.

### [S8] - Checkboxes e sliders semânticos

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 31/08/2026.
- **Propósito:** alinhar controles de seleção/intervalo ao visual do app preservando semântica nativa.
- **O que se planeja fazer:** criar checkbox quadrado para seleção múltipla e slider temático com teclado, min/max e leitor de tela.
- **Recursos/arquivos principais envolvidos:** `selection-controls.js`, Configurações/sugestões/backup, CSS e Playwright.
- **O que foi feito:** o PR #166 integrou `CheckboxField`/`SliderField` e consolidou círculo exclusivo, quadrado múltiplo e toggle persistente.
- **Alinhamento:** 100%.

### [S9] - GenericDialog

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** 01/09/2026.
- **Propósito:** eliminar `alert`, `confirm` e `prompt` nativos sem perder hierarquia, foco ou validação.
- **O que se planeja fazer:** criar aviso, confirmação e entrada acessíveis, com ação destrutiva distinta e PT/EN/ES.
- **Recursos/arquivos principais envolvidos:** `generic-dialog.js`, controlador/Configurações/água/refeições, CSS e Playwright.
- **O que foi feito:** o PR #172 substituiu os cinco diálogos ativos e validou claro/escuro, responsividade, foco e estados bloqueados.
- **Alinhamento:** desvio positivo; fixtures e navegação foram endurecidas durante o gate sem mudar o componente aprovado.

### [I1] - Carregamento animado

- **Status:** em andamento — **Chat:** Trofia-UIUX.
- **Data de início:** 22/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** transformar a espera inicial em uma transição deliberada e coerente com a identidade do Trofia.
- **O que se planeja fazer:** prototipar e implementar logo pulsando/expandindo, mínimo de 800–1000 ms, claro/escuro e alternativa estática em reduced-motion.
- **Recursos/arquivos principais envolvidos:** bootstrap/loading do app, logo Trofia, CSS de animação, temporização JS e Playwright visual.

### [I2] - Registro progressivo por campo

- **Status:** em andamento — **Chat:** Trofia-UIUX.
- **Data de início:** 22/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** reduzir a carga cognitiva do cadastro apresentando uma decisão clara por etapa.
- **O que se planeja fazer:** reorganizar o onboarding em decisões progressivas reconstruídas na linguagem One UI 8/Glass UI.
- **Recursos/arquivos principais envolvidos:** `login-screen.js`, `required-profile-modal.js`, ChoiceField/TemporalField, i18n e Playwright.

### [I3] - Política e migração de tema

- **Status:** em andamento — **Chat:** Trofia-UIUX.
- **Data de início:** 22/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** tornar o claro o padrão visual comum sem retirar do usuário o controle posterior do tema.
- **O que se planeja fazer:** migrar todos os usuários uma única vez para claro e depois respeitar escolha manual ou acompanhamento do dispositivo.
- **Recursos/arquivos principais envolvidos:** preferências de tema, storage local, Configurações, tokens claro/escuro e testes de migração.

### [I4] - Ação principal e menu “o que criar”

- **Status:** em andamento — **Chat:** Trofia-UIUX.
- **Data de início:** 22/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** tornar a ação principal mais encontrável e esclarecer as alternativas de criação antes da escolha.
- **O que se planeja fazer:** avaliar FAB estendido e menu de criação com subtítulos, adaptando a hierarquia concorrente ao One UI 8/Glass UI.
- **Recursos/arquivos principais envolvidos:** navegação/Diário, fluxo Adicionar, menu de criação, ícones SVG, CSS e Playwright.

### [I5] - Configurações em tela cheia

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 22/09/2026.
- **Data de conclusão:** 25/09/2026.
- **Propósito:** dar às preferências uma hierarquia própria e aproveitar melhor telas móveis e largas.
- **O que se planeja fazer:** prototipar Configurações em tela cheia, coordenando a estrutura e os breakpoints com a fatia D7.
- **Recursos/arquivos principais envolvidos:** tela de Configurações, SelectionControls, GenericDialog, shell desktop, `one-ui.css` e Playwright.

### [I6] - Hierarquia visual da tela inicial

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** priorizar informações e ações da página inicial sem copiar a aparência dos aplicativos de referência.
- **O que se planeja fazer:** reprojetar a organização da tela inicial com protótipo e aprovação específicos por ser a mudança mais subjetiva e ampla.
- **Recursos/arquivos principais envolvidos:** Diário/home, cabeçalho, cards nutricionais, ações principais, estados vazios, `one-ui.css` e Playwright.

### [I7] - Gamificação de metas

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** tornar progresso e consistência mais legíveis sem impor o contador a quem não o deseja.
- **O que se planeja fazer:** adicionar contadores de meta ativos por padrão e preferência para desativá-los, sem coletar dados sensíveis novos.
- **Recursos/arquivos principais envolvidos:** Diário/home, cálculo de metas existentes, Configurações, storage/Firestore já autorizado, i18n e testes.

### [D1] - Shell desktop, cabeçalho e navegação

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** remover a sobreposição global das abas sobre peso/IMC e aproveitar a largura do shell desktop.
- **O que se planeja fazer:** adotar navegação de largura total abaixo do cabeçalho em 1280/1440/1920 px sem alterar mobile.
- **Recursos/arquivos principais envolvidos:** `one-ui.css`, shell/cabeçalho, navegação e `tests/smoke/desktop-shell.visual.spec.js`.
- **O que foi feito:** o PR #187 removeu a margem negativa, centralizou a navegação no shell de 1080 px e passou no CI `34464670583`.
- **Alinhamento:** 100%.

### [D2] - Responsividade do Diário

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** eliminar a sobreposição dos cards de macros/água e a coluna móvel estreita em telas largas.
- **O que se planeja fazer:** prototipar vazio/preenchido em 1280/1440/1920 px e então redistribuir cards e conteúdo do Diário.
- **Recursos/arquivos principais envolvidos:** Diário/controlador, cards de macros/água, `one-ui.css` e Playwright visual.

### [D3] - Responsividade de Alimentos

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** usar melhor o espaço desktop em listas, busca, ações e estados da despensa.
- **O que se planeja fazer:** escopo detalhado pendente de confirmação após protótipo vazio/preenchido nas três larguras.
- **Recursos/arquivos principais envolvidos:** tela de Alimentos, cards/listas, seletores, `one-ui.css` e Playwright visual.

### [D4] - Responsividade de Métricas

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** adaptar cartões, formulários e progresso/previsão sem reintroduzir conflitos de overlay.
- **O que se planeja fazer:** escopo detalhado pendente de confirmação após protótipo claro/escuro vazio/preenchido.
- **Recursos/arquivos principais envolvidos:** tela/controlador de Métricas, gráficos, NumericField/ChoiceField, `one-ui.css` e Playwright.

### [D5] - Validação responsiva de Semana

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** evitar mudança desnecessária se a tela semanal já aproveitar corretamente o desktop.
- **O que se planeja fazer:** escopo pendente de confirmação; comparar 1280/1440/1920 px e implementar apenas ganho demonstrável.
- **Recursos/arquivos principais envolvidos:** tela Semana, gráficos/resumo, `one-ui.css` e Playwright visual comparativo.

### [D6] - Responsividade de overlays

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** tornar modais, sheets e editores proporcionais a telas largas sem quebrar composição nativa.
- **O que se planeja fazer:** escopo pendente de confirmação e coordenado com o estado final da câmera antes do protótipo.
- **Recursos/arquivos principais envolvidos:** modais/bottom sheets, GenericDialog, campos customizados, câmera e `one-ui.css`.

### [D7] - Responsividade de Configurações

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** resolver o uso de largura da tela de preferências sem duplicar a decisão estrutural de I5.
- **O que se planeja fazer:** escopo pendente de confirmação; prototipar em conjunto com Configurações em tela cheia I5.
- **Recursos/arquivos principais envolvidos:** tela de Configurações, SelectionControls, GenericDialog, `one-ui.css` e Playwright.

### [CAM-C1] - Protótipo visual da câmera embutida

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não determinada.
- **Propósito:** validar a direção visual antes de assumir o risco da integração nativa.
- **O que se planeja fazer:** prototipar estados, expansão/contração, temas, mobile/desktop e movimento reduzido.
- **Recursos/arquivos principais envolvidos:** protótipo HTML/CSS/JS externo, sem alteração do runtime.
- **O que foi feito:** protótipo interativo revisado e aprovado antes da C2.
- **Alinhamento:** 100%.

### [CAM-C2] - Prova técnica Android da câmera embutida

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** comprovar preview nativo retangular sem substituir o fluxo de produção.
- **O que se planeja fazer:** integrar o plugin atrás de um serviço Android isolado e validar geometria, captura e compilação.
- **Recursos/arquivos principais envolvidos:** Camera Preview, Capacitor, Gradle, `src/composite/embedded-camera-preview.js`.
- **O que foi feito:** prova técnica e validação física em pacote paralelo concluídas no PR #185.
- **Alinhamento:** 100%.

### [CAM-C3] - Integração visual e funcional da câmera embutida

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 12/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Propósito:** substituir a câmera Android em tela cheia pelo preview aprovado dentro do fluxo C24.
- **O que se planeja fazer:** integrar `toBack:true`, controles HTML, moldura, estados e pré-processamento existente.
- **Recursos/arquivos principais envolvidos:** Camera Preview, React, `image-meal-flow.js`, `image-meal-screen.js`, `one-ui.css`.
- **O que foi feito:** composição nativa/HTML, captura e transições entregues no PR #190.
- **Alinhamento:** 100%.

### [CAM-C4a] - Robustez nativa e ciclo de vida

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 12/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Propósito:** impedir sessões órfãs e estados presos em eventos e falhas reais do Android.
- **O que se planeja fazer:** cobrir permissão, timeout, cancelamento tardio, background, Voltar, orientação e limpeza.
- **Recursos/arquivos principais envolvidos:** Capacitor App/Camera, Camera Preview, fluxo C24 e testes Android.
- **O que foi feito:** lifecycle e falhas endurecidos, com prova física e CI, no PR #192.
- **Alinhamento:** 100%.

### [CAM-C4b] - Acessibilidade e acabamento resiliente

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 12/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Propósito:** reconstruir na composição híbrida as garantias acessíveis esperadas de um controle nativo.
- **O que se planeja fazer:** garantir TalkBack, foco/anúncios, fonte 200%, contraste, alvos, PT/EN/ES e descarte temporário.
- **Recursos/arquivos principais envolvidos:** semântica HTML/ARIA, Android settings, `image-meal-screen.js`, `one-ui.css`.
- **O que foi feito:** acessibilidade validada no Galaxy e no CI `34710539851`, entregue no PR #194.
- **Alinhamento:** 100%.

### [CAM-INC-1] - Hotfix da câmera na build publicada

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 13/09/2026.
- **Data de conclusão:** 13/09/2026.
- **Propósito:** restaurar preview e ações que ficaram invisíveis/inacessíveis na build da Play.
- **O que se planeja fazer:** corrigir transparência escura e ordenar scroll, medição e bloqueio sem redesenhar a câmera.
- **Recursos/arquivos principais envolvidos:** `one-ui.css`, `image-meal-screen.js`, preview composto e testes unitários/Playwright/Android.
- **O que foi feito:** o PR #196/merge `13bd540` corrigiu transparência e geometria, passou no CI autenticado `34757379713` sem skips e comprovou preview, captura e cancelamento no Galaxy em release de prova claro/escuro.
- **Alinhamento:** 100%.

### [CAM-INC-2] - Validação do hotfix pela Play Store

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 14/09/2026.
- **Data de conclusão:** 21/09/2026.
- **Propósito:** impedir que diferenças entre build local e distribuição escondam novamente uma falha crítica.
- **O que se planeja fazer:** publicar AAB assinado no canal interno, instalar pela Play e validar fisicamente no Galaxy.
- **Recursos/arquivos principais envolvidos:** Gradle signing, AAB, Google Play Console e Galaxy físico.
- **O que foi feito:** depois de o v23 revelar o bloqueio D19, o PR #227 corrigiu o teardown e o AAB v24 instalado pela faixa interna confirmou preview, captura, controles e fechamento global em claro/escuro, com App Check/Play Integrity e instalador `com.android.vending` reais.
- **Alinhamento:** 100% — a validação exigida foi concluída no artefato efetivamente distribuído; os ciclos adicionais preservaram o critério original e tiveram impacto positivo.

### [CAM-RED-1] - Protótipo do redesenho centralizado

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** 15/09/2026.
- **Propósito:** decidir visualmente o novo comportamento sem misturá-lo ao hotfix urgente.
- **O que se planeja fazer:** prototipar preview central, backdrop, X, flash, transições, temas, idiomas e acessibilidade.
- **Recursos/arquivos principais envolvidos:** protótipo externo Claude Design em HTML/CSS/JS, exports claro/escuro e referências One UI 8/Glass UI; nenhum arquivo de runtime foi alterado.
- **O que foi feito:** a Proposta A, “Continuidade total”, foi revisada e aprovada para câmera centralizada, análise sobre a foto capturada, sheet de resultado e reaproveitamento visual na busca manual antes de qualquer implementação real.
- **Alinhamento:** 100%.

> **Regra transversal dos gates CAM-RED:** monitorar especificamente `profile-incomplete-existing-account`; se reaparecer em qualquer execução local ou CI autenticada, parar a sequência e apresentar o padrão antes de prosseguir, sem reclassificá-lo automaticamente como falha isolada.

### [CAM-RED-2] - Prova técnica do redesenho no Android

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 15/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Propósito:** comprovar a continuidade entre preview nativo, fotografia congelada e análise antes da integração visual definitiva.
- **O que se planeja fazer:** introduzir e provar no fluxo real um estado de congelamento que exiba a foto antes de `stop()`, encerre a câmera logo após a primeira pintura confirmada, preserve cancelamento/background/timeouts e levante os modos reais de flash no Galaxy.
- **Recursos/arquivos principais envolvidos:** `image-meal-flow.js`, `src/composite/embedded-camera-preview.js`, `image-meal-screen.js`, `scripts/patch-camera-preview-android.js`, Camera Preview 8.0.1 com `toBack:true`, testes unitários e Galaxy físico em build release da Play.
- **O que foi feito:** o PR #203 foi mesclado após comprovar a fotografia congelada antes de `stop()`, os modos `off/auto/on/torch` e a eliminação dos dois crashes em três repetições físicas diretas por cenário no Galaxy com a versão 16 instalada pela Play, preservando captura sem quadro preto, permissão negada, cancelamento e orientação.
- **Alinhamento:** 100%.

### [CAM-RED-3] - Palco centralizado da câmera

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 15/09/2026.
- **Data de conclusão:** 16/09/2026.
- **Propósito:** implementar a composição centralizada da Proposta A sem voltar ao card embutido antigo.
- **O que se planeja fazer:** extrair o palco de captura, aplicar backdrop escurecido/desfoque somente ao app, bloquear scroll, separar o X da câmera do X do reconhecimento e animar expansão/contração com movimento reduzido; código de barras permanece fora do escopo.
- **Recursos/arquivos principais envolvidos:** novo componente de captura UMD/ESM, `image-meal-screen.js`, `image-meal-flow.js`, `nutrition-tracker-controller.js`, `one-ui.css`, `i18n.js` e testes visuais legado/Vite.
- **O que foi feito:** o PR #207, mesclado no commit `449ab9a`, entregou o palco centralizado e corrigiu a pintura do recorte; a versão 19 da Play concluiu 6/6 capturas, inclusive reabertura e temas escuro/claro, sem reproduzir o bloqueio intermitente da versão 18, que permanece sem causa confirmada e deve ser monitorado.
- **Alinhamento:** ~95% — desvio neutro pela investigação adicional do bloqueio intermitente pós-captura, sem redução do escopo visual aprovado.

### [CAM-RED-4] - Flash visual e funcional

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 21/09/2026.
- **Propósito:** entregar a aparência aprovada somente junto do controle real de iluminação, sem botão decorativo.
- **O que se planeja fazer:** detectar modos suportados, ligar/desligar pelo plugin, localizar e anunciar o estado e restaurar `off` em captura, cancelamento, Voltar, background, timeout e desmontagem.
- **Recursos/arquivos principais envolvidos:** `src/composite/embedded-camera-preview.js`, `image-meal-flow.js`, `image-meal-screen.js`, `nutrition-tracker-controller.js`, `one-ui.css`, `getSupportedFlashModes()`/`setFlashMode()`, testes unitários/visuais, CI autenticado e Galaxy físico.
- **O que foi feito:** comando e estado nativos de flash foram implementados; no AAB Play v24, flash real, captura, reset e fechamento global D19 passaram fisicamente em claro/escuro, assim como remoção do rótulo, raio preenchido e escala pill/X. A prova mostrou transparência residual fora das curvas; por decisão explícita, esse acabamento mínimo foi transferido para a CAM-RED-5 e não integra o merge desta fatia.
- **Alinhamento:** ~95% — desvio neutro: todo o comportamento funcional e o acabamento aprovado do flash foram entregues; somente a opacidade externa dos cantos foi transferida explicitamente para a abertura da CAM-RED-5.

### Correção técnica do App Check e da paridade visual do cutover

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 17/09/2026.
- **Propósito:** tornar a matriz de cutover confiável em contextos Playwright criados manualmente e distinguir regressão visual de antialiasing subpixel determinístico.
- **O que se planeja fazer:** instalar o token de App Check em cada contexto do cutover, comparar PNGs decodificados com tolerância estrita aprovada e provar por testes negativos que diferenças maiores continuam falhando.
- **Recursos/arquivos principais envolvidos:** `playwright.cutover.config.js`, `tests/smoke/app-check-fixture.js`, `tests/smoke/cutover-visual-matrix.spec.js`, novo comparador PNG, `pngjs` e testes unitários.
- **O que foi feito:** o PR #224, mesclado em `9f252d6`, generalizou a fixture para contextos manuais e fixou a tolerância estrita em 20 pixels/delta 5; após uma ocorrência intermitente de reload no primeiro CI, o mesmo caso passou 3/3 isolado e o rerun canônico fechou legado 103 + 8 skips esperados, Vite 111/111 e cutover 60/60 sem alteração adicional.
- **Alinhamento:** 100% — a correção técnica aprovada foi entregue sem relaxar o contrato visual nem alterar runtime do app.

### [CAM-RED-5] - Análise honesta em tela cheia

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 21/09/2026.
- **Data de conclusão:** 22/09/2026.
- **Propósito:** substituir o processamento inline pela análise contínua sobre a fotografia capturada.
- **O que se planeja fazer:** primeiro tornar completamente opacas e validar fisicamente as quatro máscaras dos cantos do preview; depois ocupar a tela com a foto sem blur, aplicar overlay translúcido, progresso indeterminado e Cancelar fixo, iniciar a análise automaticamente e usar textos honestos sem simular fases que o Worker não informa.
- **Recursos/arquivos principais envolvidos:** novo componente de análise UMD/ESM, `image-meal-screen.js`, `image-meal-flow.js`, `one-ui.css`, `i18n.js`, máscaras do preview nativo, safe areas, testes visuais e Galaxy físico.
- **O que foi feito:** o PR #244/merge `087647f` tornou opacas as máscaras dos cantos, adicionou análise UMD/ESM em tela cheia somente após pintura da foto e `stop()`, passou em 1.440/1.440 unitários, matrizes legado/Vite, cutover 60/60, CI autenticado 115/115 e prova Play v25 claro/escuro com cancelamento e liberação da câmera; a latência percebida do obturador foi atribuída explicitamente à CAM-RED-9.
- **Alinhamento:** 100% — escopo visual, continuidade segura, acessibilidade e acabamento transferido da CAM-RED-4 foram entregues integralmente; a medição de latência é requisito adicional posterior, com impacto neutro nesta fatia.

### [CAM-RED-6] - Timeout, classificação de falhas e retry

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** eliminar o carregamento infinito e permitir que o usuário saiba quando repetir ou abandonar a análise.
- **O que se planeja fazer:** impor timeout inicialmente configurável em 45 s, separar falha de transporte, timeout, Worker/IA indisponível, resposta inválida, sessão e quota, preservar a foto no retry e ignorar respostas tardias; começa por protótipo focado dos erros.
- **Recursos/arquivos principais envolvidos:** `image-meal-client.js`, `image-meal-flow.js`, componente de análise, `i18n.js`, AbortController/timers e testes unitários/smoke; nenhuma alteração em `worker/`.
- **O que foi feito:** o PR #246/merge `3b8bac0` entregou timeout, classificação acionável, retry com a mesma foto, proteção contra resposta tardia e reautenticação pelo contrato público; gate local e dois HEADs de CI autenticado ficaram verdes, sem mudanças em Worker/Auth/Firestore.
- **Alinhamento:** 100% — escopo aprovado integralmente entregue.

### [CAM-RED-7] - Resultado compartilhado e integração da foto

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** converter o resultado aprovado em componente reutilizável sem perder validação ou edição nutricional.
- **O que se planeja fazer:** criar um sheet com encaixes em aproximadamente 68% e na altura total útil, expansível/recolhível por arraste e por alternativa acessível, coordenar gesto e rolagem interna, manter foto acima no estado inicial, CTA/refeição alcançáveis e edição de porção/ingredientes com recálculo proporcional imediato de kcal e nutrientes, cobrindo confiança, dados incompletos e listas extensas.
- **Recursos/arquivos principais envolvidos:** novo `meal-result-sheet.js` UMD/ESM, controlador de sheet/gestos e safe areas, `meal-estimate-editor.js`, `meal-estimate.js`, `image-meal-screen.js`, ChoiceField, NumericField, `one-ui.css`, ARIA/teclado e testes.

### [TEST-CAM-48PX] - Sincronização da medição dos alvos CAM-RED-6

- **Status:** concluído — **Chat:** Trofia-UIUX.
- **Data de início:** 26/09/2026.
- **Data de conclusão:** 26/09/2026.
- **Propósito:** impedir falso negativo visual ao medir o alvo de 48 px do botão de fechar durante a animação de entrada da análise.
- **O que se planeja fazer:** aguardar a animação `scale(.985) → scale(1)` terminar antes da leitura geométrica, mantendo sem tolerância a exigência final de pelo menos 48 px.
- **Recursos/arquivos principais envolvidos:** `tests/smoke/embedded-camera-hotfix.visual.spec.js`, Playwright mobile, estado CAM-RED-6 com fonte a 200% e temas claro/escuro.
- **O que foi feito:** o PR #259/merge `39903c7` passou a aguardar a animação antes da geometria e ficou verde em 4/4 casos focados no legado, 4/4 no Vite, 1.457/1.457 unitários e CI real, sem alterar o PR #257 nem reduzir 48 px.
- **Alinhamento:** 100% — corrida do roteiro eliminada com o requisito visual preservado.

### [CAM-RED-8] - Busca manual com o mesmo resultado

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** eliminar a duplicação visual e comportamental entre alimento pesquisado e estimativa por foto.
- **O que se planeja fazer:** modernizar resultados dos alimentos salvos e abrir o mesmo `MealResultSheet` com origem verificada, porção e nutrientes recalculados; busca textual em base aberta permanece fora do escopo.
- **Recursos/arquivos principais envolvidos:** `add-screen.js`, adaptador de resultado manual, `meal-result-sheet.js`, `nutrition-tracker-controller.js`, NumericField, ChoiceField, `one-ui.css`, `i18n.js` e testes.

### [CAM-RED-9] - Robustez, acessibilidade e estados extremos

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** preservar integralmente CAM-C4a/C4b e os contratos nutricionais após a mudança estrutural.
- **O que se planeja fazer:** revalidar permissão/Configurações/galeria, TalkBack, foco, 200%, contraste, 48 px, PT/EN/ES, reduced-motion, lifecycle, descarte temporário, baixa confiança, dados parciais, nomes/listas longos e zero ingredientes; medir toque no obturador → retorno nativo → primeira pintura → `stop()` → análise, dar feedback visual imediato e reduzir somente atrasos comprovadamente evitáveis sem enfraquecer a serialização anticrash.
- **Recursos/arquivos principais envolvidos:** componentes CAM-RED, `embedded-camera-preview.js`, trace do fluxo de captura, Camera Preview/Capacitor, ARIA/TalkBack, CSS responsivo, Playwright legado/Vite e Galaxy físico.

### [CAM-RED-10] - Validação final do redesenho pela Play Store

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** concluir o redesenho somente com evidência do mesmo artefato entregue ao usuário.
- **O que se planeja fazer:** executar gates completos, gerar AAB fail-closed e assinado, publicar no canal interno, instalar pela Play e validar fisicamente câmera, flash, captura, análise, retry, resultado, registro, temas e lifecycle.
- **Recursos/arquivos principais envolvidos:** Gradle/Capacitor, `google-services.json` fail-closed, AAB assinado, CI autenticado, Google Play Console e Galaxy físico.

### Atalho de código de barras dentro da câmera — avaliação futura

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** avaliar separadamente se o scanner já existente deve compartilhar a nova superfície da câmera de refeição.
- **O que se planeja fazer:** auditar UX e conflito de ciclo de vida entre Camera Preview e o scanner ML Kit antes de qualquer integração; o atalho está excluído de CAM-RED-2–10.
- **Recursos/arquivos principais envolvidos:** fluxo de código de barras existente, `@capacitor-mlkit/barcode-scanning`, Camera Preview e Galaxy físico.

### Busca textual em base aberta — avaliação futura

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** avaliar uma fonte de busca além dos alimentos salvos sem introduzir dependência de dados dentro do redesenho visual.
- **O que se planeja fazer:** definir provedor, contrato, privacidade, disponibilidade e UX em coordenação própria; CAM-RED-8 continuará restrita à fonte local já existente.
- **Recursos/arquivos principais envolvidos:** fonte de alimentos ainda não definida, camada de dados, busca manual e coordenação com Trofia-Principal.

## Estado detalhado das fatias C14

### [C14-A] - Integridade fail-closed e encerramento documental

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** 01/09/2026.
- **Propósito:** impedir que falhas de leitura/listagem pareçam ausência legítima e que backup incompleto seja declarado bem-sucedido.
- **O que se planeja fazer:** propagar erros em fetch/list, exigir completude comprovada do backup e registrar o incidente da build 12.
- **Recursos/arquivos principais envolvidos:** `firebase-firestore-sdk.js`, `firebase-backup-internal.js`, testes UMD/ESM, histórico e este resumo.
- **O que foi feito:** O PR #174 (`bd62a32`, merge `141da412`) tornou leituras/listagens recuperáveis e exportações fail-closed.
- **Alinhamento:** 100%.

### [C14-B1] - Proteção inicial das rules

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** 01/09/2026.
- **Propósito:** negar exclusão client-side da raiz e proteger envelopes canônicos sem fechar o schema prematuramente.
- **O que se planeja fazer:** remover delete do cliente, limitar raiz/data e preservar a exclusão administrativa C22.
- **Recursos/arquivos principais envolvidos:** `firestore.rules`, testes de emulador, workflow CI e documentação.
- **O que foi feito:** O PR #175 publicou a negação de exclusão, limite de 128 campos e envelope `{value: string}` até 900.000 caracteres.
- **Alinhamento:** 100%.

### [C14-B2] - Schema completo das rules

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** 07/09/2026.
- **Propósito:** restringir campos, tipos e tamanhos com base em inventário real sem rejeitar escrita legítima.
- **O que se planeja fazer:** inventariar dados via Admin SDK, aplicar allowlists e validar owner, lock, entradas e score.
- **Recursos/arquivos principais envolvidos:** `firestore.rules`, `C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`, Admin SDK, testes de emulador/cliente e documentação.
- **O que foi feito:** O PR #178 fechou B2 após rollback do primeiro deploy: `diff().affectedKeys()` passou a validar só mudanças, nutrientes duplicados foram removidos de `foodSnapshot` e um teste Admin comprova leitura fail-closed de componente malformado; run pós-deploy `33575611133` verde.
- **Alinhamento:** divergiu do desenho estrito original — a validação profunda dos seis componentes passou ao leitor C20/C19 porque as rules excediam o orçamento de 1.000 expressões; impacto final positivo para compatibilidade e segurança observável.

### [C14-C1] - Observação do App Check no Worker

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Propósito:** medir tokens App Check válidos/inválidos antes de bloquear clientes.
- **O que se planeja fazer:** validar criptograficamente o token no Worker em modo observe, com métricas sanitizadas e apps permitidos.
- **Recursos/arquivos principais envolvidos:** `worker/src/firebase-app-check-token.js`, `worker/src/ai-worker.js`, `worker/wrangler.jsonc`, testes e rollout C14-C.
- **O que foi feito:** O modo `observe` foi publicado e o smoke externo confirmou validação sem enforcement.
- **Alinhamento:** 100%.

### [C14-C2] - Clientes enviam token App Check

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Propósito:** anexar atestação a todas as chamadas de IA sem enviar conteúdo quando ela falhar.
- **O que se planeja fazer:** obter token real e enviar `X-Firebase-AppCheck` nas sete superfícies web/Android.
- **Recursos/arquivos principais envolvidos:** `app-check-client.js`, `ai-client.js`, `image-meal-client.js`, demais clientes IA, entrypoints e testes.
- **O que foi feito:** O PR #189 integrou o cabeçalho em todos os clientes e falha sanitizada antes da transmissão.
- **Alinhamento:** 100%.

### [C14-C3] - Debug provider no CI

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Propósito:** manter o CI autenticado compatível com App Check sem usar atestação de produção.
- **O que se planeja fazer:** configurar provider/token de debug no pipeline e validar chamadas reais.
- **Recursos/arquivos principais envolvidos:** workflows autenticados, secrets de debug App Check, clientes Firebase/IA e testes.
- **O que foi feito:** O run autenticado `34478874949` do PR #189 validou o provider de debug e todas as superfícies.
- **Alinhamento:** 100%.

### [C14-C4] - Validação Pages e AAB real

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 12/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Propósito:** provar web e Play Integrity reais antes de tornar o Worker obrigatório.
- **O que se planeja fazer:** validar login e três fluxos de IA no Pages; depois gerar/distribuir AAB e repetir no aparelho físico.
- **Recursos/arquivos principais envolvidos:** `profile-validation.js`, `firebase-firestore-sdk.js`, `app-check-client.js`, ponte nativa `@capacitor-firebase/app-check`, Worker em modo `observe`, Pages, AAB Play versionCode 16, Galaxy SM-S938B, ADB/logcat e `C14_C_APP_CHECK_WORKER_ROLLOUT.md`.
- **O que foi feito:** O Pages e os três fluxos de IA passaram após o PR #191; em 15/09, a mesma instalação versionCode 16 da CAM-RED-2, distribuída pela Play (`installerPackageName=com.android.vending`), validou com conta descartável login sem modal indevido, Descrever prato, Reconhecer por foto e Avaliar refeição com explicação, sem persistir refeição nem registrar falhas fatais, de Firestore ou transporte de IA.
- **Alinhamento:** 100%; a reutilização do AAB real já instalado evitou outro upload sem reduzir a prova aprovada, e a confirmação criptográfica definitiva do bloqueio permanece corretamente reservada à C14-C5.

### [C14-C5] - Enforcement obrigatório no Worker

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 15/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Propósito:** rejeitar chamadas de IA sem atestação válida somente depois dos gates web/Android.
- **O que se planeja fazer:** registrar a versão `observe`, ativar `APP_CHECK_MODE = "enforce"`, exigir `401 app-check-required` sem token, repetir via ADB os três fluxos legítimos no AAB versionCode 16 e reverter imediatamente ao primeiro erro inesperado do cliente real.
- **Recursos/arquivos principais envolvidos:** `worker/wrangler.jsonc`, `scripts/verify-ai-worker-app-check-mode.js`, workflow `c14-c5-app-check-gate.yml`, Firebase App Check, Worker, AAB Play versionCode 16, Galaxy SM-S938B e documentação de rollout.
- **O que foi feito:** o PR #210 publicou a preparação; o Worker `cf6f8d82-566c-483f-9fb0-2a587dda0dab` entrou em `enforce`, o run `35024249874` comprovou `401` sem App Check e a matriz ADB confirmou descrição, foto e avaliação com explicação no cliente Play legítimo, sem persistência de refeição nem rollback; a rotação automática ficou ativada no encerramento e foi corrigida manualmente pelo usuário.
- **Alinhamento:** ~95%; o objetivo de segurança foi integralmente atingido, mas a restauração do aparelho divergiu porque a rotação não foi capturada/verificada; impacto operacional negativo e limitado, com checklist permanente corrigido.

### [C14-D] - Android e cadeia de release

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 16/09/2026.
- **Propósito:** proteger dados locais e tornar o AAB fail-closed e verificável.
- **O que se planeja fazer:** desligar Auto Backup, revisar FileProvider/cleartext e reforçar validação de google-services/manifesto/hash.
- **Recursos/arquivos principais envolvidos:** AndroidManifest, `file_paths.xml`, Gradle, scripts/testes de release, AAB assinado e aparelho físico.
- **O que foi feito:** o PR #213 negou backup, transferência de dados de conta e cleartext, limitou o compartilhamento ao cache privado e tornou configuração Firebase, manifesto, assinatura, versão e hash do AAB verificáveis de forma fail-closed; CI autenticado final verde no run 35109617209.
- **Alinhamento:** 100%; o escopo Android aprovado foi entregue, sem alterar `versionCode` nem gerar AAB fora de autorização.

### [C14-E] - Auth, sessão e onboarding recuperável

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 16/09/2026.
- **Propósito:** evitar cadastro parcialmente salvo e controlar credenciais/sessão com política explícita.
- **O que se planeja fazer:** aplicar senha mínima 12, checkbox Manter logado (`LOCAL`/`SESSION`) e fluxo recuperável PT/EN/ES.
- **Recursos/arquivos principais envolvidos:** `login-screen.js`, `profile-validation.js`, Firebase Auth modular, i18n, testes e Firebase Console.
- **O que foi feito:** o PR #215, merge `b307d29`, passou a usar `SESSION` por padrão e `LOCAL` apenas com “Manter logado” na web, preservou a sessão Android, elevou senhas novas para 12 caracteres em PT/EN/ES e tornou o onboarding recuperável; CI final verde e Firebase configurado em **Notificar**, com enforcement futuro registrado como P11.
- **Alinhamento:** 100%; o escopo aprovado foi entregue e a compatibilidade temporária de contas antigas ficou explícita e rastreável.

### [C14-F1] - Worker, tiers e observabilidade

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 25/09/2026.
- **Data de conclusão:** 26/09/2026.
- **Propósito:** preparar limites comerciais e monitoramento sem dados pessoais antes da distribuição pública.
- **O que se planeja fazer:** modelar tiers com enforcement desligado, pseudonimização, timeouts/saída e métricas sanitizadas por 30 dias.
- **Recursos/arquivos principais envolvidos:** Worker, Durable Object, rate limiter, Cloudflare Workers Logs/Analytics Engine, contratos, testes e configuração Wrangler.
- **O que foi feito:** o PR #257 (merge `6293899`) implementou HMAC, tiers em observação, limite Gemini de 40 s/128 KB e métricas sanitizadas por até 30 dias. Em 26/09, o segredo foi instalado sem exposição, a versão `179df5a8` chegou a 100% em produção, texto/imagem passaram com conta descartável e App Check, o smoke de despensa ficou verde e a métrica customizada sanitizada foi confirmada; a falha visual de câmera do primeiro CI segue em triagem separada.
- **Alinhamento:** 100%; o rollout e os gates operacionais concluíram o escopo aprovado, mantendo enforcement comercial desligado.

### [C14-F2] - IAM, invocadores e dependências

- **Status:** em andamento — **Chat:** Trofia-Principal.
- **Data de início:** 26/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** reduzir privilégios e dependências somente após conhecer o estado administrativo real.
- **O que se planeja fazer:** reconfirmar IAM, contas de serviço, invocadores, Functions/Tasks, segredos por nome/tipo e lockfiles; propor redução de privilégios e correções de dependências sem aplicá-las antes de avaliar o inventário.
- **Recursos/arquivos principais envolvidos:** Google Cloud IAM/Run/Scheduler/Tasks/Artifact Registry, Firebase Functions, Cloudflare Wrangler, `functions/src/`, manifests/lockfiles e inventário administrativo.
- **O que foi feito:** a reconfirmação de 26/09 manteve as três Functions na conta padrão com `roles/editor`, confirmou invocadores, fila/Scheduler, limpeza de 7 dias e achados de dependência (0/0/7 em produção), e fechou a lacuna de segredos por nomes/tipos; consumidores fora das regiões Cloud Run auditadas ainda exigem verificação antes de revogar Editor.

### [C14-F2-PRE] - Inventário preparatório de IAM e dependências

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 26/09/2026.
- **Data de conclusão:** 26/09/2026.
- **Propósito:** deixar uma baseline administrativa comprovada para a C14-F2 sem antecipar mudanças de privilégio ou dependência.
- **O que se planeja fazer:** consultar IAM, invocadores, Scheduler, Cloud Tasks, Artifact Registry, auditorias npm e inventário de segredos somente em leitura.
- **Recursos/arquivos principais envolvidos:** Google Cloud IAM/Run/Scheduler/Tasks/Artifact Registry, Firebase CLI, Wrangler, manifests/lockfiles e `C14_F2_PRE_INVENTARIO_IAM_DEPENDENCIAS.md`.
- **O que foi feito:** confirmou `roles/editor` na identidade compartilhada das três Functions, retenção de imagens em 7 dias, zero vulnerabilidades de produção na raiz/Worker e sete moderadas nas Functions; a listagem de segredos do Worker ficou bloqueada por perfil Wrangler autenticado em outra conta.
- **Alinhamento:** 100%; o inventário foi concluído sem alterar infraestrutura, e a lacuna Cloudflare ficou explicitamente registrada para o início da F2.

### [C14-G] - CSP e superfícies de debug

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** reduzir impacto de XSS e impedir diagnósticos globais desnecessários em produção.
- **O que se planeja fazer:** aplicar CSP via meta compatível com Firebase/reCAPTCHA/Worker e restringir globals de debug.
- **Recursos/arquivos principais envolvidos:** `index.html`, CSP, Firebase/reCAPTCHA/Google APIs, globals de debug, Pages e matriz PT/EN/ES.

### [C14-H] - Staging, validação final e rollout

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** validar o endurecimento completo fora da produção e preparar o gate de lançamento.
- **O que se planeja fazer:** criar Firebase staging e executar matriz cross-account, App Check, payloads, rate limit, cache, backup, exclusão, IAM e rollback.
- **Recursos/arquivos principais envolvidos:** projeto Firebase staging, emuladores, CI, Pages, Worker, Functions, AAB Play e runbooks.

### [DOC-PR170-CLOSEOUT] - Encerramento de PR documental obsoleto

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/08/2026.
- **Data de conclusão:** 16/09/2026.
- **Propósito:** retirar um PR duplicado sem regredir a documentação atual da S8/S9.
- **O que se planeja fazer:** confirmar que o PR #170 estava superado e sem trabalho exclusivo antes de fechar e limpar seus resíduos.
- **Recursos/arquivos principais envolvidos:** PR #170, histórico UI/UX, RESUMO-STATUS, branch `codex/docs-s8-completion` e worktree `.codex-ui-s8-status`.
- **O que foi feito:** o PR #170 foi fechado sem merge porque os PRs #169, #172 e #196 já incorporavam informações mais atuais; worktree limpo e branches foram removidos sem tocar no produto.
- **Alinhamento:** 100%; limpeza administrativa concluída sem perda de conteúdo.

## Observações não confirmadas sob acompanhamento

### [INV-RELOAD-SESSAO] - Sessão e loading após reload/troca de idioma

- **Status:** em investigação — **Chat:** Trofia-UIUX.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** monitorar uma possível inconsistência de restauração da sessão e do bootstrap após reload durante ciclos PT/EN/ES.
- **O que se planeja fazer:** aguardar recorrência reproduzível e então isolar estado de autenticação, término do loading e consumidores do contrato de leitura, coordenando qualquer correção fora de UI com o chat principal.
- **Recursos/arquivos principais envolvidos:** `tests/smoke/auth.setup.js`, `setAppLanguage`, `pantry-choice-field.visual.spec.js`, `searchable-choice-field.visual.spec.js`, Firebase Auth/App Check, Playwright e CI autenticado.
- **O que foi feito:** além das ocorrências de reload dos runs `33488032008`/`33497924576`, em 17/09/2026 o setup local da CAM-RED-4 ficou em “Processando...” por mais de 20 s; a investigação `INC-AUTH-BOOTSTRAP-20260917` do Principal executou 6/6 logins limpos, três instrumentados, sem request pendente ou erro, não confirmou relação com câmera/App Check e não aplicou correção especulativa. A ocorrência permanece intermitente e exige nova parada se reaparecer.

## Onde aprofundar

- Estado por item: [`ROADMAP.md`](ROADMAP.md).
- Releases: [`VERSIONING.md`](VERSIONING.md).
- Decisões adiadas: [`PENDENCIAS.md`](PENDENCIAS.md).
- Bugs e riscos: [`BUG-INVENTORY.md`](BUG-INVENTORY.md).
- História da frente principal: [`../historico/2026-08-31-principal-arquitetura-ia-dados.md`](../historico/2026-08-31-principal-arquitetura-ia-dados.md).
