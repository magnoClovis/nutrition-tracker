# Resumo de status do Trofia

> Retrato do checkpoint `0.11.0-beta`, atualizado sobre a `main` no commit `141da412`, em 01/09/2026. Este resumo prioriza fatos verificáveis no repositório e nos PRs; não substitui o roadmap.

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
- **Diálogos visuais S9:** `GenericDialog` substitui os cinco usos ativos de `alert`, `confirm` e `prompt` do navegador por avisos, confirmações e entradas acessíveis no padrão One UI 8/Glass UI. A integração está no PR #172 e passa a compor a `main` com o merge desse PR.
- **Incidente App Check/perfil encerrado:** o PR #173 impede release Android sem `google-services.json` e distingue falha de leitura de perfil realmente incompleto. Na build Play versionCode 12, a conta real concluiu login, leitura e alteração de perfil, sincronização e inicialização do App Check sem erro.

## O que está em andamento agora

- **C14 — revisão geral de segurança:** C14-A está concluída; C14-B está em andamento, com B1 concluída e B2 ainda não iniciada; C14-C a C14-H não foram iniciadas. O detalhamento individual está registrado abaixo e deve ser atualizado ao final de cada fatia.
- C20, C19 e C08 continuam concluídos; a suspensão temporária da build 11 não reabre esses itens.
- **Organização documental:** o índice inicial foi mesclado no PR #153; o filtro que evita a suíte pesada em PRs exclusivamente documentais foi mesclado no PR #155.

## O que está apenas planejado, ainda sem código completo

### Indispensável antes do lançamento público

- **C14:** revisão geral de segurança — em andamento; decisões de escopo aprovadas em 01/09/2026 e execução sequencial autorizada a partir da C14-B.
- **C16:** documentação técnica e de manutenção — parcial; esta pasta ajuda, mas não equivale à conclusão integral do item.
- **C25:** gate da versão pública — parcial e dependente de C14/C16.

### Backlog pós-lançamento

- **Sequência visual desta frente:** S1–S6, S7a, S8 e S9 estão implementadas. A aplicação S7b do `NumericField` às medidas corporais continua fora da `main` no PR draft #150; por isso, a sequência S1–S9 ainda não pode ser considerada integralmente concluída. I1–I7 permanecem planejadas e cada novo tipo visual exige protótipo aprovado antes de código.
- C26 notificações, N01 voz, C21 porções fracionadas, N03 leitura de rótulos, N09 jejum, C17 e-mails, C13 feedback nativo, C10 relatórios, N07 compartilhamento profissional, N02 banco nutricional, N05 recalibração dinâmica, C15 limpeza ampla do legado, C27 widgets, N04 receitas, N06 planejamento alimentar, C12 iOS, C18 integrações de saúde e N08 exercícios/hábitos.
- Partes deliberadamente adiadas: C26-C (push/backend) e C27-B (widget funcional com escrita direta).
- Revisão externa por nutricionista e eventual comparação/troca do modelo Gemini permanecem decisões futuras registradas em `PENDENCIAS.md`.

## Estado detalhado das fatias C14

### [C14-A] - Integridade fail-closed e encerramento documental

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de conclusão:** 01/09/2026.
- **Propósito:** impedir que falhas de leitura/listagem pareçam ausência legítima e que um backup incompleto seja apresentado como bem-sucedido.
- **Recursos/arquivos principais envolvidos:** `/firebase-firestore-sdk.js`, `/firebase-backup-internal.js`, testes unitários UMD/ESM, histórico e este resumo.
- **O que foi feito:** leituras de documentos e listagens agora propagam erro e permitem retry; exportação exige raiz, lista, documentos e agregados diários comprovadamente completos. PR #174, commit `bd62a32`, merge `141da412`.

### [C14-B] - Rules do Firestore e schema canônico

- **Status:** em andamento — **Chat:** Trofia-Principal.
- **Data de conclusão:** não concluída; B1 concluída em 01/09/2026 e B2 não iniciada.
- **Propósito:** negar exclusão client-side da raiz e restringir envelopes, campos, chaves, tipos e tamanhos sem bloquear dados reais legítimos.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, testes de emulador e ferramenta Admin SDK read-only para inventário/dry-run.
- **O que foi feito:** B1 nega exclusão client-side da raiz, mantém a exclusão administrativa do C22, limita a raiz a 128 campos e exige `{value: string}` com até 900.000 caracteres em `/data/{key}`. A matriz de emulador comprova proprietário, outro UID, lock, Admin SDK e rejeição de envelopes/tamanhos inválidos. B2 fará o inventário real, allowlist, deploy progressivo e rollback e permanece não iniciada.

### [C14-C] - App Check no Worker de IA

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de conclusão:** não iniciado.
- **Propósito:** exigir prova de app legítimo além do Firebase ID token sem quebrar clientes existentes durante a transição.
- **Recursos/arquivos principais envolvidos:** `/worker/src/`, clientes de IA, App Check web/Android, CI, Pages e AAB real.
- **O que foi feito:** nenhuma implementação iniciada; rollout aprovado em observação, envio de token, debug provider no CI, validação real e somente então enforcement.

### [C14-D] - Android e cadeia de release

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de conclusão:** não iniciado.
- **Propósito:** proteger dados locais e tornar o AAB verificável e fail-closed quanto à configuração Firebase e ao manifesto.
- **Recursos/arquivos principais envolvidos:** AndroidManifest, `file_paths.xml`, Gradle, scripts/testes de release, AAB assinado e aparelho físico.
- **O que foi feito:** nenhuma implementação iniciada; Auto Backup será desligado, e FileProvider, cleartext, validação semântica de `google-services.json` e manifesto/hash do release serão endurecidos.

### [C14-E] - Auth, sessão e onboarding recuperável

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de conclusão:** não iniciado.
- **Propósito:** evitar onboarding parcialmente salvo, alinhar senha mínima e controlar a persistência da sessão web.
- **Recursos/arquivos principais envolvidos:** `/login-screen.js`, Firebase Auth modular, i18n PT/EN/ES, testes e Firebase Console.
- **O que foi feito:** nenhuma implementação iniciada; senha mínima aprovada em 12 caracteres sem composição forçada; “Manter logado” usará `LOCAL`, enquanto desmarcado usará `SESSION`.

### [C14-F] - Worker, observabilidade, Functions, IAM e dependências

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de conclusão:** não iniciado.
- **Propósito:** preparar limites por tier sem ativá-los nos testes, reduzir riscos do provider, observar falhas sem dados pessoais e auditar privilégios reais.
- **Recursos/arquivos principais envolvidos:** Worker/Durable Object, Functions/Tasks, Google Cloud IAM/Logging, lockfiles e testes de backend.
- **O que foi feito:** nenhuma implementação iniciada; F1 cobrirá tiers desligados, pseudonimização, timeout/saída e métricas por 30 dias; F2 auditará IAM/invocadores e dependências antes de qualquer service account nova.

### [C14-G] - Web, CSP e superfícies de debug

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de conclusão:** não iniciado.
- **Propósito:** reduzir impacto de XSS e limitar diagnósticos globais em produção.
- **Recursos/arquivos principais envolvidos:** `/index.html`, CSP via meta, Firebase/reCAPTCHA/Worker/Google APIs, globals de debug e matriz Pages PT/EN/ES.
- **O que foi feito:** nenhuma implementação iniciada; CSP imediata no GitHub Pages foi aprovada.

### [C14-H] - Staging, validação final e rollout

- **Status:** não iniciado — **Chat:** Trofia-Principal.
- **Data de conclusão:** não iniciado.
- **Propósito:** validar o endurecimento completo em ambiente destrutivo separado e preparar o gate operacional de C16/C25.
- **Recursos/arquivos principais envolvidos:** projeto Firebase staging, emuladores, CI, Pages, Worker, Functions, AAB Play e documentação de operação/rollback.
- **O que foi feito:** nenhuma implementação iniciada; staging separado foi aprovado e a matriz final cobrirá cross-account, App Check, payloads, rate limit, lifecycle/cache, backup/exclusão, Auto Backup, IAM, secrets e rollback.

## Observações não confirmadas sob acompanhamento

- **Reload/troca de idioma e bootstrap:** o chat Trofia-UI/UX relatou uma queda intermitente para a tela de login e um `SearchableChoiceField` temporariamente preso em `#loading` após reload. Três tentativas isoladas passaram, sem erro de leitura confirmado. A tentativa 2 do CI do PR #175 foi interrompida pelo teto global de 30 minutos enquanto essa asserção tinha executado por apenas 5,6 dos 15 segundos previstos; portanto, esse run não comprova travamento do produto. A investigação futura deve conferir consumidores que ainda presumam o contrato antigo `null`/`[]` após falha transitória, sem atribuir causalidade à C14-A até haver reprodução e evidência. — **Chat:** Trofia-Principal (achado original: Trofia-UI/UX).

## Onde aprofundar

- Estado por item: [`ROADMAP.md`](ROADMAP.md).
- Releases: [`VERSIONING.md`](VERSIONING.md).
- Decisões adiadas: [`PENDENCIAS.md`](PENDENCIAS.md).
- Bugs e riscos: [`BUG-INVENTORY.md`](BUG-INVENTORY.md).
- História da frente principal: [`../historico/2026-08-31-principal-arquitetura-ia-dados.md`](../historico/2026-08-31-principal-arquitetura-ia-dados.md).
