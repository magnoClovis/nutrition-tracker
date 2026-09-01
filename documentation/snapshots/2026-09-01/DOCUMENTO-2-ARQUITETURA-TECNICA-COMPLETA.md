# Trofia

## Documento 2 — Visão técnica completa da arquitetura

**Estado verificado em 1º de setembro de 2026**  
**Referência de código:** `origin/main` em `e68bc20`, que inclui o fechamento do C08 e o merge do S8.  
**Versão nomeada na linha principal:** `0.10.0-beta`.

Este documento descreve a arquitetura implementada do Trofia: aplicação web, empacotamento Android, domínio nutricional, persistência, funcionamento offline, autenticação, segurança, inteligência artificial, exclusão administrativa de conta, infraestrutura e verificação automatizada. Planejamento futuro é citado apenas quando delimita uma fronteira atual; não é apresentado como arquitetura já existente.

## 1. Visão geral

O Trofia é uma aplicação React executada no navegador e dentro de uma WebView Android empacotada pelo Capacitor. A interface e os cálculos nutricionais principais ficam no cliente. Dados de conta são autenticados pelo Firebase Authentication e armazenados no Cloud Firestore. O cliente usa o SDK modular do Firebase, com cache local controlado, assinaturas em tempo real e escrita granular para refeições, água e suplementos.

Funções de inteligência artificial não chamam o provedor diretamente. O cliente envia um token de identidade ao Cloudflare Worker `trofia-ai-proxy`; o Worker valida identidade, origem, método, tamanho, contrato e cota antes de chamar o Gemini. Cálculos determinísticos — metas, totais, `meal-score-v2`, médias, tendências e totais das sugestões — permanecem locais. Essa separação impede que um texto gerado substitua uma regra nutricional versionada.

Uma segunda camada remota, formada por Firebase Cloud Functions e Cloud Tasks, existe exclusivamente para a exclusão completa de conta. Ela cria um bloqueio de escrita, remove a árvore de dados, verifica que ficou vazia, apaga a identidade de autenticação e sela o bloqueio.

```text
Pessoa usuária
    |
    v
React 18 + controlador de estado + componentes de tela
    |---------------------|-----------------------|
    v                     v                       v
Domínio local             Persistência            Capacitor Android
metas, totais, GA,        Firebase Auth +          câmera, galeria,
meal-score-v2, histórico  Firestore modular        scanner, arquivos,
    |                     cache e sync             compartilhar, voltar
    |                     |                       |
    |                     v                       |
    |              nutrition/{uid}                |
    |              data/{key}                     |
    |              days/{date}/...                |
    |                                             |
    +---------------------> Cloudflare Worker <----+
                           autenticação, CORS,
                           rate limit, validação
                                  |
                                  v
                         Gemini 3.5 Flash Lite

Exclusão de conta:
cliente -> função autenticada + App Check -> job + lock -> Cloud Task
       -> exclusão recursiva -> verificação -> exclusão Auth -> lock selado

Entrega:
GitHub Actions -> preflight -> unitários -> emuladores -> Playwright
               -> build Vite verificado -> GitHub Pages
               -> Capacitor sync -> AAB Android assinado
```

## 2. Princípios arquiteturais confirmados

### 2.1 Autoridade local para números nutricionais

O provedor de IA estima e explica; não é autoridade para a nota da refeição, metas, banco de calorias, composição corporal ou totais persistidos. O cliente recalcula números usando dados canônicos antes de exibir ou registrar uma sugestão. A falha da IA não invalida uma nota já calculada e não bloqueia o registro manual.

**Motivo:** modelos generativos podem produzir texto variável, campos ausentes ou respostas malformadas. Manter o cálculo em funções determinísticas permite repetir o resultado, congelar testes numéricos e preservar comparabilidade histórica.

### 2.2 Ausente não significa zero

Nutrientes desconhecidos são representados por `null`. Zero é aceito somente quando o valor conhecido é realmente zero. Agregadores contabilizam cobertura; o score exclui componentes opcionais incompletos e marca o resultado como provisório.

**Motivo:** transformar campo ausente em zero favoreceria artificialmente alimentos sem cadastro completo e distorceria fibra, sal, carboidratos e gorduras.

### 2.3 Identidade estável e escrita granular

Cada lançamento diário possui `id` estável. Refeições, água e suplementos são persistidos em documentos individuais, não regravando o dia inteiro. Alterações de uma tela são convertidas em operações mínimas de `set` e `delete`, aplicadas em lote atômico.

**Motivo:** dois dispositivos ou duas ações próximas deixam de disputar um único documento agregado. A granularidade reduz perda por sobrescrita e permite que uma repetição idempotente escreva o mesmo identificador.

### 2.4 Fail-closed nas fronteiras de segurança

Origem não permitida, token inválido, contrato incompleto, cota indisponível, resposta externa inválida, App Check ausente na exclusão e conflito de migração são rejeitados. O sistema não tenta “aproveitar” uma resposta parcial.

**Motivo:** aceitar parcialmente dados nutricionais, autenticação ou exclusão criaria estados difíceis de provar e corrigir. A indisponibilidade controlada é preferível a gravar conteúdo ambíguo.

### 2.5 Compatibilidade sem reabrir o legado

O esquema canônico pós-C23 é a única fonte ativa. Backups antigos ainda podem ser importados e os leitores diários fazem uma migração compatível por data durante o corte granular do C28. Isso não reabre regras de acesso aos documentos históricos `nutrition/{uid}_*`.

**Motivo:** recuperação de dados de usuários antigos continua possível sem manter caminhos inseguros como armazenamento operacional.

## 3. Camada de apresentação e composição React

### 3.1 Entrada Vite e raiz React

`src/main.jsx` cria uma raiz com `createRoot()` e renderiza `App`. `src/App.jsx` é a composition root: importa módulos visuais, modelos de domínio, adaptadores de navegador, serviços Firebase e integrações Android; cria as dependências concretas e as injeta nas fábricas.

O pacote usa React `18.3.1`, React DOM `18.3.1` e Recharts `2.10.4`. Vite `7.3.6` gera o pacote de produção e o plugin React usa o runtime JSX clássico para preservar compatibilidade com módulos extraídos durante a refatoração incremental.

### 3.2 Organização por responsabilidade

- `src/components/`: componentes React e telas; recebem serviços e funções por injeção.
- `src/composite/`: fluxos que combinam domínio e infraestrutura, como reconhecimento por foto, histórico, GA, persistência diária e navegação Android.
- `src/leaf/`: unidades de domínio ou adaptadores pequenos, como cálculo de metas, score, cliente de IA, calendário e Open Food Facts.
- `src/firebase/`: composição do SDK modular, autenticação, Firestore, App Check, backup, sincronização e exclusão de conta.
- `src/controller/`: fachada ESM do controlador principal ainda extraído do arquivo histórico.

Arquivos da raiz continuam expondo módulos UMD no `globalThis`; as fachadas ESM importam esses arquivos e verificam os nomes esperados com `readLegacyNamespace()`. `App.jsx` também instala explicitamente módulos no `globalThis` para contratos do controlador ainda resolvidos em tempo de renderização.

**Motivo da arquitetura híbrida:** a conversão foi feita por fatias para preservar paridade visual e funcional. O pacote Vite já é a entrega de produção, mas C15 ainda precisa eliminar as pontes UMD/ESM e o controlador remanescente. A suíte compara carregador legado e Vite até esse corte.

### 3.3 Estado e navegação visível

`App` controla autenticação, confirmação de e-mail, perfil obrigatório, idioma, tema, avisos de versão, tutorial, privacidade, backup e configurações. O controlador `NutritionTracker` mantém Diário, Adicionar, Alimentos, Semana e Métricas.

As principais ligações entre funcionalidade e domínio são:

- **Diário:** `DailyNutritionModel`, `HistoricalGoalsModel`, `HistoryLoaders`, `MealScore`, `MealGA` e persistência diária.
- **Adicionar:** `FoodEntry`, `DishDescriptionAI`, `MealEstimate`, `ImageMealFlow` e `MealReviewAI`.
- **Alimentos:** cadastro canônico `pantry_v2`, Open Food Facts, preenchimento estruturado, refeições salvas e `suppPantry`.
- **Semana:** `WeekAggregator`, carregamento de oito datas para gráficos — sete concluídas mais hoje — e médias por refeição em 30 dias.
- **Métricas:** `GoalCalculator`, `BodyMetricsModel`, histórico corporal e metas históricas.

### 3.4 Controles reutilizáveis

`ChoiceField`, `SearchableChoiceField`, `TemporalField`, `DateField`, `NumericField`, `CheckboxField` e `SliderField` padronizam seleção, pesquisa, data, hora, entrada numérica, marcação e faixa. S8 substituiu checkboxes e sliders ativos nas sugestões e na seleção do backup, mantendo elementos HTML semânticos como alvo de interação.

**Motivo:** os controles nativos variavam entre navegador, Android e tema escuro. A camada reutilizável concentra foco, teclado, rótulos acessíveis, validação, portais e aparência sem trocar o significado semântico do campo.

### 3.5 Proteções de hidratação e autosave

O carregamento inicial hidrata 24 chaves antes de liberar os efeitos de salvamento. Há fallback de 12 segundos para evitar bloqueio permanente. `HydrationGuard.canPersistHydratedKey()` impede que valores padrão do primeiro render sobrescrevam dados ainda não carregados.

`AutosaveScheduler` mantém um temporizador independente por chave: padrão de 800 ms e 1.500 ms para notas. Novo valor cancela o temporizador anterior da mesma chave. Durante restauração de backup ou exclusão de conta, `suspend()` cancela timers pendentes e espera as escritas já iniciadas; `resume()` só reabre o agendamento depois da operação crítica.

**Motivo:** o defeito G01 mostrou que um autosave antigo podia sobrescrever um backup recém-restaurado. A suspensão transforma restauração e exclusão em barreiras explícitas.

## 4. Modelo de dados canônico pós-C23

### 4.1 Árvore principal

```text
nutrition/{uid}                              perfil e preferências pequenas
nutrition/{uid}/data/{key}                   coleções lógicas serializadas
nutrition/{uid}/days/{YYYY-MM-DD}/meals/{id}
nutrition/{uid}/days/{YYYY-MM-DD}/water/{id}
nutrition/{uid}/days/{YYYY-MM-DD}/supplements/{id}
nutrition/{uid}/days/{YYYY-MM-DD}/migrations/{kind}

accountDeletionLocks/{uid}                   estado administrativo, sem acesso cliente
accountDeletionJobs/{requestId}              checkpoints administrativos, sem acesso cliente
```

O documento raiz `nutrition/{uid}` guarda campos de perfil e preferências com leitura frequente e tamanho controlado. Dados que crescem ficam em `data/{key}`. Registros de alta concorrência ficam em subcoleções por data e tipo.

### 4.2 Campos do documento raiz

O adaptador reconhece como perfil: `birthDate`, `gender`, `height`, `activityLevel`, `goalType`, `goalKg`, `goalWeeks`, `manualCalorieAdjustment`, `proteinMultiplier`, `bodyFatGoal`, `userName`, `language`, `lastLoginAt`, `lastActivityAt`, marcadores de tutorial e marcadores internos de verificação do esquema.

Valores históricos são normalizados na leitura: objetivos como `lose`, `lose_weight` e `weight_loss` convergem para `loss`; gêneros em português ou abreviações convergem para `male` ou `female`; níveis de atividade em português convergem para `sedentary`, `light`, `moderate`, `very` ou `extreme`. Se a normalização altera o valor, o adaptador tenta corrigir o campo canônico sem bloquear a leitura.

### 4.3 Documentos `data/{key}`

As chaves canônicas de longa duração incluem:

- `pantry_v2`: alimentos personalizados e nutrientes por base de porção;
- `suppPantry`: suplementos cadastrados;
- `weightHistory`: peso, altura e medidas corporais por data;
- `goalHistory`: snapshot da meta aplicável a datas anteriores;
- `mealTemplates`: refeições salvas;
- `customGoals`: metas nutricionais substituídas manualmente;
- `trainingByDate`: classificação treino/descanso;
- `waterCustomPreset` e `waterGoal`: preferências de hidratação;
- `notes_YYYY-MM-DD`: nota textual diária.

O envelope atual de `data/{key}` é `{ value: string }`. Objetos e arrays são serializados como JSON. O adaptador público mantém o formato histórico `{value}` para não obrigar todas as telas a mudar ao mesmo tempo.

### 4.4 Documentos diários granulares

Cada documento tem `schemaVersion: 1`, `id`, `date`, `entry` e `updatedAt`. Refeições acrescentam `mealKey`. Regras exigem:

- data civil no formato `YYYY-MM-DD` e data realmente válida;
- identificador com 1 a 128 caracteres em `[A-Za-z0-9_-]`;
- `entry.id` igual ao ID do documento;
- campo superior `date` igual ao segmento `{date}` do caminho;
- `updatedAt` igual a `request.time`, obtido por `serverTimestamp()`;
- `mealKey` não vazio e com até 80 caracteres;
- conjunto exato de campos permitido pelo tipo.

O caminho intermediário `days/{date}` não aceita leitura nem escrita. Somente `meals`, `water`, `supplements` e `migrations` são visíveis ao cliente autenticado.

### 4.5 Migração por data do C28

Antes da primeira mutação granular de um par `tipo:data`, `DailyEntryPersistence` chama `migrateDailyEntries()`. O leitor busca o agregado compatível — `log_v2_`, `waterIntake_` ou `suppLog_` —, atribui IDs existentes ou gera IDs determinísticos `legacy_{kind}_{hash}`, grava documentos granulares e só então cria o marcador `migrations/{kind}`.

O marcador contém `schemaVersion: 1`, `kind`, `date`, `complete: true` e `updatedAt`. Depois dele, leitores ignoram o agregado antigo. Antes dele, `mergeCompatibleDailyEntries()` combina legado e granular por ID, preferindo o documento granular. Assim, excluir uma entrada granular não a “ressuscita” do agregado depois que a migração foi marcada.

### 4.6 Diferença mínima e lote atômico

O controlador fornece um snapshot completo da tela. `diffDailyEntrySnapshots()` cria somente:

- `delete` para IDs que desapareceram;
- `set` para IDs novos ou cujo conteúdo mudou;
- nenhuma operação para registros iguais.

As operações de uma alteração são reunidas por `writeBatch()`. O mesmo lote atualiza `_dailyDates` no documento raiz com `arrayUnion()`. Aplicar uma sugestão do GA usa uma única atualização funcional e, portanto, um único lote para todos os alimentos daquela combinação.

### 4.7 Fechamento do legado C23

C23 inventariou documentos `nutrition/{uid}_*` de forma paginada e fail-closed, classificou conflitos e copiou ou mesclou **54 documentos**. Cada destino foi verificado. Após **7 dias** de observação, um export gerenciado foi confirmado; os 54 documentos foram excluídos transacionalmente e a contagem final foi zero.

O export é `gs://trofia-firestore-exports-128834310181/c23-before-legacy-delete-20260827T163200Z`, em Madrid, com lifecycle de 90 dias. As regras atuais não possuem `match` para caminhos legados, logo o cliente não os lê nem escreve. A importação de backup ainda promove formatos planos ou seção `legacy` para os destinos canônicos; a exclusão administrativa procura resíduos `nutrition/{uid}_*` como defesa.

## 5. Cache, funcionamento offline e sincronização C28

### 5.1 Política de cache local

`FirebaseFirestoreLifecycle` decide a estratégia antes de inicializar Firestore:

- Android nativo: cache persistente obrigatório;
- navegador marcado como dispositivo confiável: cache persistente;
- navegador não confiável: cache somente em memória.

O cache persistente usa IndexedDB, limite de **100 MB** e `persistentMultipleTabManager()`. A opção web é guardada em `trofia_firestore_trusted_device`.

**Motivo:** Android é um dispositivo pessoal instalado e precisa de experiência offline consistente. No navegador compartilhado, persistir dados nutricionais sem escolha explícita elevaria o risco de exposição local.

### 5.2 Propriedade do cache e troca de conta

`trofia_firestore_cache_owner_uid` identifica a conta dona do cache. Quando o UID muda, o lifecycle:

1. grava `trofia_firestore_write_block` para bloquear novas escritas;
2. publica `purge` no `BroadcastChannel` `trofia-firestore-lifecycle`;
3. aguarda 50 ms para outras abas entrarem em estado de bloqueio;
4. desativa rede, encerra a instância Firestore e limpa IndexedDB;
5. redefine caches em memória e estado de sincronização;
6. atribui o cache à nova conta e remove o bloqueio transitório.

Se a limpeza falhar, o bloqueio permanece. Essa decisão impede que dados locais de uma conta sejam expostos à conta seguinte.

### 5.3 Cache de leitura do adaptador

Além do IndexedDB do Firebase, o adaptador possui cache em memória por chave:

- valor existente: TTL de **60 segundos**;
- ausência: TTL de **10 segundos**;
- requisições simultâneas da mesma chave compartilham uma única Promise;
- versões por chave impedem que leitura antiga sobrescreva escrita nova;
- geração global invalida resultados após troca de conta ou limpeza.

`getDataDocCacheFirst()` consulta, nesta ordem: valor válido em memória, snapshot já recebido por assinatura, `getDocFromCache()` e, por fim, leitura do servidor. Assinaturas `onSnapshot()` usam `includeMetadataChanges: true` e expõem `fromCache` e `hasPendingWrites`.

`getMany()` deduplica chaves. `subscribeMany()` reutiliza uma assinatura por chave entre telas sobrepostas, entrega o snapshot local primeiro e só notifica mudança de conteúdo. Métricas internas contam solicitações, documentos, snapshots e quantos vieram do cache.

### 5.4 Estado observável de escrita

`firebase-sync-state.js` indexa operações por `kind:date:entryId`. Os estados públicos são `pending`, `synced` e `failed`. Uma geração crescente faz a conclusão de uma escrita antiga perder autoridade quando uma nova escrita do mesmo ID já começou.

Erros transitórios passam por backoff limitado de **500 ms** e **2.000 ms**. Depois das tentativas automáticas, a operação fica `failed` com código sanitizado e pode ser repetida manualmente. Lotes conservam a mesma transição para todos os IDs e são repetidos como lote, sem dividir a atomicidade.

### 5.5 Backup sob conexão instável

Antes de exportar online, `prepareBackupExport()` espera `waitForPendingWrites()`. Offline, exporta o snapshot local e declara que escritas pendentes estão incluídas. Depois da restauração, online espera o envio; offline informa que as escritas ficaram enfileiradas.

**Limite:** funções de IA, busca externa de produtos e exclusão administrativa dependem de rede. “Offline-first” não significa que todo serviço remoto funcione sem conexão.

### 5.6 Corridas ainda documentadas

`HistoryLoaders` registra dívidas preservadas: mudanças rápidas entre datas históricas não têm token de sequência; uma resposta antiga pode chegar depois da nova. Carregamentos semanal e de médias não têm cancelamento integral. O calendário bloqueia setters após desmontagem, mas não cancela requisições já iniciadas. Esses comportamentos estão congelados por contrato e pertencem ao escopo futuro de C15, não devem ser descritos como resolvidos pelo C28.

## 6. Autenticação, sessão e App Check

### 6.1 Firebase Authentication

O cliente ativo usa o SDK modular `firebase/auth` com `browserLocalPersistence`. Na inicialização, espera `authStateReady()`, sincroniza o UID com o lifecycle do Firestore e remove as chaves antigas `fb_refresh` e `fb_uid`. O SDK passa a ser a única autoridade da sessão.

Operações implementadas: login por e-mail e senha, criação de conta, atualização de nome, envio de confirmação de e-mail, recuperação de senha, recarregamento de estado, reautenticação, troca de senha, obtenção e renovação de ID token e logout.

O e-mail é guardado localmente apenas para preencher fluxos de confirmação e reautenticação. A aplicação exige e-mail confirmado antes de abrir o conteúdo nutricional. A checagem inicial possui timeout de **8 segundos**; falha ou configuração ausente encerra a tentativa e mantém a pessoa fora da área autenticada.

### 6.2 Token de identidade

Chamadas remotas usam `Authorization: Bearer <ID token>`. O Worker verifica assinatura RS256 com certificados públicos do Firebase, respeita `max-age` do cabeçalho de cache e valida `alg`, `kid`, audiência, emissor, expiração, emissão, `auth_time` e `sub`. O UID é extraído de `sub` e deve ter de 1 a 128 caracteres.

Se os certificados não puderem ser obtidos ou importados, o Worker retorna indisponibilidade de autenticação; não aceita o token sem verificação.

### 6.3 App Check no navegador e no Android

App Check comprova que uma chamada vem de uma instância reconhecida do aplicativo, complementando a identidade da pessoa:

- web: `ReCaptchaEnterpriseProvider`, com chave fornecida por `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`;
- Android: plugin `@capacitor-firebase/app-check` com Play Integrity; o token nativo entra no SDK web por `CustomProvider`.

Ambas as plataformas ativam renovação automática. Token nativo precisa ter texto não vazio e `expireTimeMillis` futuro.

Na exclusão de conta, a Cloud Function usa `enforceAppCheck: true`. A validação física do Android confirmou respostas `PLAY_RECOGNIZED` e `LICENSED` para instalação pela faixa interna do Google Play.

### 6.4 Regras do Firestore

Toda leitura de `nutrition/{uid}` exige `request.auth.uid == uid`. Escritas também exigem ausência de `accountDeletionLocks/{uid}`. Isso faz o bloqueio administrativo valer mesmo se uma aba antiga ainda tiver token válido.

`accountDeletionLocks` e `accountDeletionJobs` negam leitura e escrita ao cliente. O acesso administrativo usa o Admin SDK, que não depende das regras de cliente. Fora da árvore canônica não existe permissão.

## 7. Exclusão completa de conta C22

### 7.1 Solicitação no cliente

A interface exige senha e confirmação textual. O cliente reautentica, espera escritas pendentes, obtém ID token e App Check, cria `requestId` aleatório estável na sessão e chama `requestAccountDeletion` em `europe-southwest1`. Depois da aceitação, suspende autosaves, sela o lifecycle local, limpa IndexedDB, dados locais e sessão.

### 7.2 Gate da Cloud Function

A função callable exige Auth, App Check e autenticação recente: `auth_time` não pode estar no futuro além de 60 segundos nem ter mais de **5 minutos**. `requestId` deve ter de 16 a 128 caracteres em `[A-Za-z0-9_-]`.

Uma transação cria o job e o lock. Pedido repetido com o mesmo ID e UID retorna o estado existente; conflito de identidade falha. Se a fila estiver temporariamente indisponível, o job durável permanece para o reconciliador.

### 7.3 Saga idempotente

Os checkpoints ordenados são:

1. `requested`;
2. `locked` após adquirir o bloqueio;
3. `data_deleted` após exclusão recursiva de `nutrition/{uid}` e resíduos legados;
4. `data_verified` somente depois de provar que árvore, subcoleções e legados estão vazios;
5. `auth_deleted` depois de remover a conta de Authentication; “usuário não encontrado” é sucesso idempotente;
6. `lock_sealed` com retenção;
7. remoção do job concluído.

Cada etapa grava checkpoint antes de avançar. Uma repetição retoma da última etapa confirmada, sem reconstruir a operação do início.

### 7.4 Fila, repetição e retenção

O processamento roda em `europe-west1`, timeout de **9 minutos**, no máximo **5 tentativas** durante **24 horas**, backoff mínimo de **60 segundos**, máximo de **1 hora** e quatro duplicações do intervalo. A fila limita duas execuções simultâneas e uma nova execução por segundo. O dispatch deadline é **8 minutos**.

Um reconciliador roda a cada hora, com uma instância. Trabalho fica elegível após **6 horas** sem progresso; o lease é de **15 minutos** e nova tentativa de reconciliação espera **5 minutos**. Falha permanente e lock selado recebem TTL de **7 dias**; job concluído é removido.

**Motivo:** a exclusão precisa sobreviver a entrega duplicada, queda entre etapas, usuário Auth já ausente e indisponibilidade transitória. O lock impede novas escritas enquanto a tarefa converge.

## 8. Arquitetura de inteligência artificial C08/C09/C24

### 8.1 Fronteira gerenciada

O cliente nunca contém a chave Gemini. Todas as chamadas vão a um Cloudflare Worker. Origens aceitas são exatamente `https://magnoclovis.github.io` e `https://localhost`. Métodos aceitos são `POST` e `OPTIONS`; cabeçalhos CORS aceitos são `Authorization` e `Content-Type`. Respostas usam `Cache-Control: no-store`.

O Worker exige JSON, ID token válido e corpo dentro do limite. Texto admite até **40.000 caracteres**, saída até **1.200 tokens** e corpo de até **164.096 bytes**. Imagem admite corpo de **2.200.000 bytes**; o JPEG decodificado tem máximo de **1.500.000 bytes** e precisa começar com assinatura JPEG `FF D8 FF`.

O modelo configurado é `gemini-3.5-flash-lite`. Texto narrativo usa `generateContent` com temperatura zero. Foto e respostas estruturadas usam Interactions API, revisão `2026-05-20`, `store: false` e schema fornecido ao provedor. Observabilidade do Worker está desativada para não registrar conteúdo.

### 8.2 Endpoints ativos

- `POST /v1/ai/completion`: texto narrativo para feedback, padrões e explicação.
- `POST /v1/ai/image-meal`: reconhecimento de fotografia.
- `POST /v1/ai/food-estimate`: preenchimento nutricional por nome.
- `POST /v1/ai/dish-estimate`: descrição textual convertida em `MealEstimate`.
- `POST /v1/ai/pantry-suggestions`: combinações estruturadas por IDs da despensa.

Qualquer outro caminho retorna 404. Método, mídia, autenticação, contrato, cota e resposta do provedor possuem códigos de erro separados.

### 8.3 Limites de uso

Um Durable Object com SQLite serializa a contagem:

- **5** pedidos totais por UID por minuto;
- **2** pedidos de imagem por UID por minuto;
- **12** pedidos globais por minuto;
- **400** pedidos globais por dia, com virada em `America/Los_Angeles`.

A janela curta é de 60 segundos. Metadados individuais são mantidos por até **23 horas** — 24 horas de política menos margem de 1 hora para alarme — e limpos por alarme. Se o limitador não responder com contrato válido, o Worker retorna 503; não ignora a cota.

### 8.4 Contratos estruturados

Respostas estruturadas passam por três barreiras: schema enviado ao Gemini, validação integral no Worker e validação/hidratação no cliente.

**Foto (`image-meal-v1`).** Estados: `identified`, `uncertain`, `not-food`, `not-identifiable`. Máximo de 12 itens e 12 suposições. Nome tem até 120 caracteres; unidade, 24; suposição, 240. Quantidade é positiva; proteína e kcal são obrigatórias; carboidratos, gordura, fibra, sal, açúcares e gordura saturada aceitam número ou `null`. Resolução `medium` usa orçamento visual nominal de **560 tokens**, metade de `high` (**1.120**), decisão tomada após 19 fotos comparáveis.

**Alimento (`food-estimate-v1`).** Entrada exata: `foodName`, `unit`, `language`; nome até 160 caracteres; unidade `g`, `ml` ou `un`. Resposta é `estimated` ou `rejected`. Estimativa exige proteína, kcal e confiança; unidade individual exige `unitWeightG`. Recusa exige motivo e todos os nutrientes, confiança e peso nulos.

**Descrição (`dish-estimate-v2`).** Texto até 4.000 caracteres. Compartilha o mesmo contrato de `MealEstimate` e o mesmo editor da foto. Ingredientes, óleo, molho, método e quantidade inferidos devem aparecer nas suposições.

**Despensa (`pantry-suggestions-v2`).** Entrada admite de 1 a 200 alimentos com IDs únicos; proteína e kcal obrigatórias; metas restantes de proteína, kcal e carboidratos não negativas. Saída exige exatamente três sugestões no prompt e aceita no contrato no máximo 3; cada uma contém de 1 a 8 IDs sem duplicação e quantidade entre 0 e 10.000. O provedor não retorna totais. O cliente resolve IDs contra o snapshot exato da solicitação e recalcula proteína, kcal, carboidratos, açúcares, gorduras, saturadas, fibra e sal usando o cadastro canônico.

### 8.5 Contratos narrativos

`nutrition-feedback-v2`, `eating-patterns-v2` e `meal-explanation-v1` retornam texto, mas recebem prompts versionados. Dados fornecidos são metas já calculadas, totais, cobertura, datas, tipo do dia e alimentos necessários. Nome, nascimento, gênero, altura, peso e IMC não entram em feedback e padrões.

A explicação da refeição recebe `algorithmVersion`, nota final arredondada, cobertura, componentes, horas até meia-noite e alimentos. O prompt limita a 120 palavras, até duas mudanças práticas e proíbe recalcular a nota. A chamada usa máximo de **350 tokens**.

Padrões analisam apenas dias realmente registrados em uma janela de 30 dias, separam treino e descanso e indicam contagem de dias completos por nutriente. Ausência é descrita como limitação de cobertura.

### 8.6 Proteção contra prompt injection

Nome de alimento, descrição e JSON da despensa são delimitados como dados não confiáveis. Os prompts instruem o modelo a ignorar texto com aparência de comando dentro desses campos. Na despensa, somente IDs exatos existentes podem voltar; aproximação, renomeação e substituição são proibidas.

### 8.7 Validação C24 e C08

C24 comparou 19 fotos em `high` e `medium`, além de um gate inicial. `High` produziu 17/19 respostas válidas, mediana **2,683 s** e p95 **4,308 s**. `Medium` produziu 19/19; removendo atraso de 112 s causado pela suspensão do aparelho, mediana **3,650 s**, média **3,817 s** e p95 **6,979 s**. A qualidade principal foi preservada e `medium` tratou melhor uma xícara vazia.

C08-F acrescentou matriz PT/EN/ES, campos ausentes, respostas malformadas, entrada adversarial e quatro chamadas reais controladas: alimento em PT, descrição em EN, despensa em ES e explicação em PT. A versão de Worker validada foi `ca5e65d9-2eeb-4a86-9364-5eb2d0b2b2e1`. Logs dessa validação guardam apenas código HTTP, validade do contrato e resultado da limpeza.

### 8.8 Relação entre IA e GA

O endpoint de despensa não substituiu silenciosamente o GA visual do Diário. O GA continua sendo o gerador exposto. O caminho estruturado de IA foi isolado e endurecido para uso controlado. Os dois compartilham a despensa, mas têm contratos e algoritmos independentes.

## 9. Motor de pontuação `meal-score-v2`

### 9.1 Entradas e resultado

`calculateMealScore()` recebe refeição candidata, registros anteriores do dia, metas aplicáveis, horário real da refeição, momento da avaliação e janela. Retorna validade, nota de 0 a 5, cobertura, confiança técnica, provisoriedade, motivos exatos, componentes e dados temporais.

Calorias e proteína são obrigatórias. Pesos:

| Nutriente | Tipo de curva | Peso |
|---|---|---:|
| kcal | aproximação da referência | 25% |
| proteína | alcance com saturação | 25% |
| fibra | alcance com saturação | 16% |
| sal | limite com penalidade | 12% |
| carboidratos | aproximação da referência | 12% |
| gordura | aproximação da referência | 10% |

### 9.2 Parcela temporal

O score calcula horas até meia-noite a partir do horário civil preservado. Para uma janela de 3 horas:

`parcela = 1`, se restam até 3 horas; caso contrário, `max(0,15; (3 / horasRestantes)^0,75)`.

A referência de cada nutriente é o restante da meta multiplicado por essa parcela. O piso de 15% evita referência irrealmente pequena cedo; nas últimas três horas, todo o restante vira referência.

### 9.3 Curvas por componente

- `targetScore`: abaixo da referência usa potência; acima, penalidade gaussiana `exp(-decay × excesso²)`.
- `maximizeScore`: cresce por potência até 1 e satura; excesso de proteína ou fibra não recebe prêmio adicional.
- `limitScore`: vale 1 dentro do limite e decai exponencialmente acima dele.

Parâmetros atuais: kcal `underPower 0,75`, `overDecay 3,5`; proteína `curvePower 0,7`; fibra `0,8`; sal `overDecay 5`; carboidratos `underPower 0,8`, `overDecay 2,5`; gordura `underPower 0,8`, `overDecay 3`.

A nota final é `5 × soma(peso × componente) / pesoDisponível`. Pesos são renormalizados somente entre componentes disponíveis. Cobertura é `pesoDisponível / pesoAplicável`.

### 9.4 Cobertura e confiança

Sem kcal ou proteína completas, `valid` é falso, `score` é `null` e confiança é `unavailable`. Nutriente opcional sem meta é excluído do denominador. Nutriente opcional com meta, mas incompleto, gera motivo com `nutrient`, `scope` (`candidate` ou `consumed`), `missingItemCount` e `totalItemCount`.

Confiança técnica por cobertura: `high` a partir de 90%, `medium` a partir de 70%, `low` abaixo de 70%. Essa confiança não mede certeza clínica nem confiança da estimativa por imagem.

### 9.5 Snapshot e invariantes históricos

`buildMealScoreSnapshot()` persiste versão, nota, cobertura, confiança, motivos, pesos, horário e componentes. `inspectMealScoreSnapshot()` aceita `meal-score-v2` e histórico `meal-score-v1.1` sem atualizar. `areMealScoreSnapshotsComparable()` só retorna verdadeiro para versões idênticas.

Todos os itens de uma refeição avaliada compartilham `mealEvaluationId` e snapshot idêntico. O Diário só mostra grupos completos e consistentes. Editar ou remover um item invalida a avaliação do grupo inteiro; duplicar remove metadados de avaliação. Essa regra evita exibir uma nota calculada para composição que já mudou.

## 10. Gerador de refeições GA v1

O GA é local e usa genes inteiros por alimento. Para `g` e `ml`, um gene representa 100 unidades; para `un`, um gene representa uma unidade. Alimentos sem proteína e sem kcal são excluídos.

Limites automáticos usam parcela linear `min(1, 3 / max(0,25, horasRestantes))`, não a curva 0,75 do score. Tolerância de tamanho produz multiplicador mínimo 0,2. Limites finais têm piso de 5 g de proteína e 50 kcal.

Parâmetros de busca:

- população entre 80 e 200: `min(200, max(80, alimentos × 7))`;
- gerações por reinício: `max(600, alimentos × 60)`;
- reinícios: 3 até 10 alimentos, 4 até 20, 5 acima disso;
- estagnação: `max(150, alimentos × 20)`;
- mutação: 15%;
- até 5 soluções;
- entrega de progresso e yield ao event loop a cada 20 gerações.

Com limites absolutos, penalidade de intervalo usa dureza 8 e pequeno termo de centralização 0,1. Sem limites absolutos, excesso de proteína ou kcal recebe multiplicador 10; déficit calórico usa peso 0,3. `proteinTolerance` é aceito pela interface, mas atualmente não altera o algoritmo; essa limitação está documentada no módulo.

**Motivo de separação do score:** recalibrar a nota não pode mudar implicitamente combinações já conhecidas pelos usuários. Compartilhamento de helper temporal só é permitido com contrato próprio.

## 11. Empacotamento Android com Capacitor

### 11.1 Estrutura

`capacitor.config.json` define `appId` `com.hermegas.trofia`, nome `Trofia` e `webDir` `dist`. `npx cap sync android` copia o pacote Vite para `android/app/src/main/assets/public` e atualiza plugins.

Dependências nativas: Capacitor `8.4.2`, App `8.1.1`, Camera `8.2.1`, Filesystem `8.1.2`, Share `8.0.1`, scanner ML Kit `8.1.0` e App Check `8.4.0`.

### 11.2 Plataforma e permissões

Android mínimo 24, alvo 36 e compilação 36. O manifesto solicita Internet e Camera; câmera, autofocus e qualquer câmera são recursos opcionais, portanto instalação não exige hardware fotográfico.

`MainActivity` usa `singleTask`, recebe mudanças de orientação, teclado, tamanho, idioma, tema e densidade sem recriação padrão. `FileProvider` não é exportado e concede URIs temporárias para compartilhamento.

### 11.3 Integrações

- Camera abre câmera ou galeria, normaliza cancelamento como `capture-cancelled` e produz JPEG processado.
- ML Kit lê código de barras; o fluxo esconde a WebView para não cobrir a visualização nativa e remove listeners ao concluir ou cancelar.
- Filesystem e Share oferecem salvar no aparelho ou compartilhar backups/exportações.
- App captura o botão Voltar; um dispatcher por prioridade fecha primeiro modal, painel, scanner ou fluxo. Sem ação interna, minimiza o aplicativo.
- barras de sistema acompanham tema claro/escuro; safe areas protegem conteúdo de notch, barra e teclado.

### 11.4 Build e assinatura

`versionName` é `0.10.0-beta`; o arquivo observado contém `versionCode 10`, mas o histórico registra que o número distribuído pode ser ajustado localmente e não é determinável somente pelo Git.

Build de release falha se `android/keystore.properties` não existir ou não tiver `storeFile`, `storePassword`, `keyAlias` e `keyPassword`. Também exige `VITE_FIREBASE_WEB_APP_ID` e `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` e verifica se os arquivos web já copiados contêm esses valores, impedindo assinar pacote com ambiente antigo. Minificação está desativada.

## 12. Build web e infraestrutura de publicação

### 12.1 Vite

O build parte de `index.html`, usa base relativa `./` e gera `dist/`. CSS não é minificado. Um plugin reposiciona o CSS gerado antes dos estilos inline para preservar a cascata histórica. Outro copia somente manifesto e ícones explícitos. A página de privacidade trilíngue é renderizada durante o build.

`verify-vite-build.js` aplica allowlist: exige `index.html`, manifesto, quatro ícones e `privacy/index.html`; arquivos extras só podem estar em `assets/`. Rejeita `.env`, backups, exports pessoais, credenciais, CSV, Markdown, scripts e planilhas. Também exige JavaScript e CSS com hash e caminho relativo, proíbe entradas de fonte, runtimes legados, `?v=` manual e ordem errada da cascata.

### 12.2 GitHub Pages

`pages.yml` só executa automaticamente após CI da `main` concluído com sucesso ou por acionamento manual. Faz checkout do SHA exato validado, instala dependências, gera e verifica `dist`, publica o artefato e depois testa o endereço implantado.

A verificação externa confirma HTML, caminhos relativos, hashes, tipos MIME e política PT/EN/ES. Playwright executa a aplicação publicada em Desktop Chrome e Pixel 5.

### 12.3 Infraestrutura remota

- GitHub Pages: aplicação web estática e política pública.
- Firebase Authentication: contas, confirmação, senha e ID tokens.
- Cloud Firestore: dados nutricionais canônicos em região europeia confirmada pelo projeto.
- Firebase Cloud Functions/Tasks: exclusão administrativa; chamada em Madrid e tarefa/reconciliador na Bélgica.
- Cloudflare Worker + Durable Object SQLite: proxy de IA e limitação de uso.
- Gemini: geração narrativa e estruturada.
- Google Play faixa interna: distribuição e Play Integrity do Android.

## 13. CI, testes e gates

### 13.1 Pipeline principal

`.github/workflows/ci.yml` roda em Windows Server 2022, Node `24.18.0`, Java 21 e Chromium. Instala dependências com `npm ci` na raiz, Worker e Functions. O timeout do job é 30 minutos.

A sequência executa:

1. preflight;
2. testes unitários;
3. testes do Worker em Node e no runtime Cloudflare;
4. testes das Functions com emuladores Auth, Firestore e Functions;
5. Playwright legado e Vite autenticados.

Cada etapa continua para produzir resumo único; o job falha no final se qualquer resultado foi `failure`. Diagnósticos são guardados por 7 dias. A suíte autenticada usa uma conta descartável compartilhada, por isso `concurrency` serializa todas as execuções e não cancela a anterior.

Mudança exclusivamente documental ignora a suíte pesada e aciona `documentation-preflight.yml`, com timeout de 5 minutos. Mudança mista executa CI completo.

### 13.2 Preflight

`scripts/preflight-release.ps1` verifica encoding, igualdade SHA-256 entre `app.js` e `nutrition-tracker.jsx`, sintaxe, auditoria de traduções, ausência de `innerHTML` direto no startup, declaração UTF-8 e ausência de exports/credenciais rastreados. Arquivos sensíveis locais ignorados geram aviso, não são publicados.

### 13.3 Testes unitários e contratuais

No estado inspecionado há **135 arquivos** nos diretórios de teste e **405 chamadas de teste de nível superior**: 102 arquivos unitários, 21 de smoke, 1 do Worker e 11 das Functions. Subtestes internos tornam o total de asserções/casos executados maior; 405 não deve ser confundido com a contagem final exibida pelo runner.

As matrizes cobrem score numérico, política de IA, contratos estruturados, armazenamento, migração, lifecycle, sync, backup, autenticação, App Check, Worker, exclusão, telas, Android, idioma, build e workflows.

### 13.4 Playwright e matriz de cutover

O Playwright roda com um worker para evitar disputa da conta. `auth-setup` cria estado autenticado; projetos Desktop Chrome e Pixel 5 o reutilizam. Quando existe token de debug App Check, traces são desligados para não capturá-lo; screenshots ficam somente em falha.

Há dois servidores locais:

- legado em porta 8765;
- `dist` Vite em porta 8766.

A matriz de cutover usa portas 8775 e 8776, timeout de 120 segundos, GPU desativada e compara as duas variantes. O teste de Pages usa o URL implantado e os mesmos perfis desktop/mobile.

### 13.5 Emuladores e produção controlada

Functions usam projeto `demo-trofia-c22`, Auth 9099, Firestore 8080 e Functions 5001. Operações que dependem de atestação real, origem pública, provedor Gemini ou exclusão destrutiva exigem smoke controlado em produção com conta descartável e limpeza comprovada.

## 14. Segurança, privacidade e limites atuais

### 14.1 Segredos e minimização

A chave Gemini existe somente como secret do Worker. Configuração pública Firebase pode estar no pacote, mas autorização depende de Auth, App Check e regras. O build bloqueia nomes conhecidos de exports pessoais. Worker não ativa observabilidade e envia `store: false` ao Gemini para contratos estruturados.

### 14.2 Defesa em profundidade

Uma chamada de IA precisa passar por origem, CORS, método, mídia, tamanho, Auth, assinatura do token, cota, schema de entrada, resposta do provedor e schema de saída. Uma escrita Firestore precisa passar por Auth, UID, ausência de lock, caminho canônico e formato do documento. Exclusão acrescenta reautenticação recente e App Check.

### 14.3 Limitações declaradas

- C14, revisão geral de segurança, permanece parcial; este documento não equivale a auditoria externa.
- O relatório avançado está desativado por `REPORTS_ENABLED`; exportação semanal e backup continuam ativos.
- iOS não está entregue.
- C15 ainda precisa remover controlador e pontes legadas, corridas históricas e duplicação UMD/ESM.
- Revisão nutricional externa pode originar nova versão de score; não pode alterar `meal-score-v2` retroativamente.
- Troca do modelo Gemini é decisão futura.
- IndexedDB é apagado em logout/troca/exclusão, mas um navegador confiável mantém dados locais enquanto a sessão pertence à mesma conta.
- Open Food Facts é base colaborativa; o cliente normaliza unidade e energia, mas o usuário precisa revisar o produto.

## 15. Fluxos completos de referência

### 15.1 Registrar e avaliar refeição

1. A tela cria IDs idempotentes para os alimentos.
2. Alimentos manuais usam `pantry_v2`; descrição/foto passam por Worker e `MealEstimateEditor`.
3. O editor preserva `null`, confiança e suposições.
4. `meal-score-v2` usa metas históricas, registros anteriores e horário civil.
5. Explicação opcional recebe o snapshot; não muda a nota.
6. Confirmação grava `mealEvaluationId` e snapshot em cada item.
7. Persistência calcula diff, migra a data se necessário e envia lote granular.
8. Sync publica `pending` e depois `synced` ou `failed` com retry limitado.

### 15.2 Abrir uma semana

1. `HistoryLoaders` monta oito datas, incluindo hoje.
2. Datas históricas usam leitura granular compatível; hoje usa estado em memória.
3. `HistoricalGoalsModel` resolve peso, treino/descanso, perfil, preferências, customização e snapshot histórico.
4. `WeekAggregator` calcula linhas, banco de calorias e médias.
5. Assinaturas compartilhadas podem entregar cache primeiro e atualização do servidor depois.

### 15.3 Reconhecer fotografia

1. Capacitor Camera ou seletor web produz JPEG.
2. O cliente reduz e valida a imagem antes do envio.
3. Worker valida origem, token, tamanho, assinatura JPEG e cota de imagem.
4. Gemini responde segundo schema; Worker rejeita qualquer desvio.
5. Cliente normaliza e abre editor; imagem fica transitória.
6. Pessoa revisa, avalia opcionalmente e confirma.
7. Somente entradas nutricionais são persistidas.

### 15.4 Trocar de conta

1. Auth identifica UID anterior e próximo.
2. Lifecycle bloqueia escrita em todas as abas.
3. BroadcastChannel ordena purge.
4. Firestore desativa rede, termina e apaga IndexedDB.
5. Caches, subscriptions, retries e baselines são zerados.
6. Nova conta recebe instância limpa.

## 16. Fontes técnicas principais

- `firestore.rules`, `firebase.json` e `functions/src/`: autorização e exclusão administrativa.
- `firebase-firestore-sdk.js`, `firebase-firestore-lifecycle.js`, `firebase-sync-state.js`, `daily-entry-persistence.js`: C28.
- `AI_NUTRITION_POLICY.md`, `worker/src/`, `ai-client.js`, módulos `*-ai.js`: IA.
- `NUTRITION_SCORE.md`, `meal-score.js`, `meal-ga.js`: score e GA.
- `src/App.jsx`, `src/components/`, `src/composite/`, `src/leaf/`: cliente.
- `capacitor.config.json`, `android/`, documentos C24: Android.
- `vite.config.js`, `scripts/verify-vite-build.js`, `.github/workflows/`, configurações Playwright: build e qualidade.
- `documentation/estado-atual/DOCUMENTO-1-APRESENTACAO-PARA-LEIGOS.md`: inventário funcional visto pela pessoa usuária.
- `documentation/estado-atual/DOCUMENTO-3-HISTORICO-CRONOLOGICO.md`: decisões e ordem histórica.
- `documentation/estado-atual/ROADMAP.md`, `RESUMO-STATUS.md` e `BUG-INVENTORY.md`: limites entre estado entregue, dívida conhecida e trabalho futuro.

# GLOSSÁRIO TÉCNICO GERAL

## A–C

**AAB (Android App Bundle):** pacote usado para publicar Android no Google Play; a loja gera APKs adequados a cada aparelho.

**API (interface de programação):** contrato pelo qual um programa solicita uma operação a outro. Pode ser uma chamada local entre módulos ou uma requisição de rede.

**APK:** arquivo instalável de uma aplicação Android. Diferentemente do AAB de publicação, um APK já contém uma variante pronta para um conjunto de aparelhos.

**Adaptador:** módulo que traduz a interface esperada pelo sistema para uma biblioteca ou serviço concreto.

**Admin SDK:** biblioteca com privilégios administrativos usada em ambiente controlado; não obedece às regras destinadas ao cliente.

**Alarme:** agendamento interno usado pelo Durable Object para limpar metadados expirados.

**Allowlist:** lista fechada do que é permitido. Qualquer item fora dela é rejeitado.

**Assinatura em tempo real:** observação contínua de um documento; o cliente recebe novo snapshot quando conteúdo ou metadados mudam.

**Atomicidade / lote atômico:** propriedade pela qual um conjunto de gravações é confirmado inteiro ou não é confirmado.

**Autenticação:** processo de provar qual conta está fazendo uma operação.

**Autorização:** decisão sobre o que uma conta autenticada pode ler ou alterar.

**Backoff:** aumento controlado do intervalo antes de repetir uma operação que falhou.

**Backend:** código executado fora do aparelho para atender operações remotas, proteger segredos ou administrar dados.

**Baseline:** referência congelada usada para comparar comportamento antes e depois de uma mudança.

**BroadcastChannel:** recurso do navegador para enviar mensagens entre abas da mesma origem.

**Build:** processo que transforma fontes em arquivos prontos para execução ou publicação.

**Certificado público:** documento criptográfico que associa uma chave pública a uma identidade. O Worker usa certificados publicados pelo Firebase para verificar, sem conhecer a chave privada, a assinatura dos tokens.

**Cache:** cópia temporária para leitura rápida ou funcionamento sem rede.

**Cache-first:** estratégia que tenta devolver a cópia local antes de consultar o servidor.

**Capacitor:** camada que empacota a aplicação web como aplicativo nativo e oferece plugins para recursos do aparelho.

**Callable function:** função remota invocada pelo cliente com contrato próprio de autenticação e resposta.

**Checkpoint:** registro da última etapa confirmada de um processo longo.

**CI (integração contínua):** execução automática de verificações a cada mudança enviada ao repositório.

**CI/CD:** integração contínua somada à entrega ou implantação automatizada. No Trofia, CI valida e o fluxo de Pages publica após sucesso.

**Cliente:** parte executada no navegador ou aparelho da pessoa.

**Cloud Function:** função executada sob demanda na infraestrutura Firebase/Google Cloud.

**Cloudflare Worker:** programa executado na rede da Cloudflare próximo de quem fez a chamada; no Trofia, forma a fronteira autenticada entre cliente e Gemini.

**Cloud Task:** tarefa enfileirada com repetição e prazo de execução.

**CSS:** linguagem que define aparência, dimensões, posicionamento e adaptação visual dos elementos HTML.

**Chromium:** motor de navegador usado pelo Chrome e pela automação da suíte para executar a interface web.

**CORS:** regras do navegador que controlam quais origens podem chamar um serviço remoto.

**Composition root:** ponto onde implementações concretas são criadas e conectadas às abstrações da aplicação.

**Contrato:** formato e regras que entrada, saída ou módulo devem obedecer.

**Contrato narrativo:** resposta em texto livre limitada por instruções e invariantes, sem campos JSON fixos.

**Contrato estruturado:** resposta com campos, tipos e limites definidos por schema.

**CRUD:** operações de criar, ler, atualizar e excluir.

## D–H

**Debounce:** atraso que substitui uma sequência de mudanças rápidas por uma gravação depois que a atividade para.

**Deep link:** endereço que abre o aplicativo diretamente em uma área específica.

**Deploy / implantação:** publicação de uma versão em infraestrutura onde pode ser executada.

**Diff:** conjunto mínimo de diferenças entre estado anterior e novo.

**Durable Object:** unidade Cloudflare com identidade estável, estado persistente e execução serializada.

**Emulador:** serviço local que reproduz comportamento de um serviço remoto para testes.

**Endpoint:** combinação de caminho e método usada para chamar um serviço remoto.

**ESM (ECMAScript Module):** formato moderno de módulos JavaScript baseado em `import` e `export`.

**FileProvider:** componente Android que concede a outro aplicativo acesso temporário e restrito a um arquivo por URI, sem expor diretamente o caminho privado.

**Event loop:** mecanismo que agenda tarefas assíncronas no JavaScript sem bloquear permanentemente a interface.

**Fail-closed:** comportamento que nega a operação quando não é possível validar segurança ou integridade.

**Fachada:** interface estável que esconde detalhes ou adapta uma implementação interna.

**Fixture:** conjunto fixo de dados usado para repetir um teste de forma determinística.

**Firestore:** banco de documentos em nuvem usado para armazenar dados do Trofia.

**Função determinística:** função que produz o mesmo resultado para as mesmas entradas.

**GitHub Actions:** serviço que executa workflows de CI e publicação definidos no repositório.

**Git, branch e `main`:** Git registra versões do projeto. Uma branch é uma linha isolada de mudanças; `main` é a linha principal usada como referência de integração do Trofia.

**GitHub Pages:** hospedagem estática usada para servir a aplicação web e a política pública.

**HTML:** linguagem que descreve a estrutura e o significado dos elementos de uma página, como formulário, botão, título e região de navegação.

**Hash / SHA-256:** resumo matemático usado para identificar conteúdo; mudança de um byte altera o resultado esperado.

**Header:** metadado enviado com uma requisição ou resposta de rede.

**Hidratação:** carregamento dos dados persistidos para o estado da interface após iniciar.

**Gradle:** sistema que resolve dependências e coordena a compilação, os testes e o empacotamento Android.

**HTTP:** protocolo de requisição e resposta usado entre cliente e serviços.

## I–P

**ID token:** credencial temporária assinada que identifica a conta perante um serviço.

**Claim de token:** campo interno de um token assinado. `alg` informa o algoritmo, `kid` seleciona a chave pública, `aud` identifica o destinatário, `iss` o emissor, `sub` a conta, `iat` a emissão, `exp` a expiração e `auth_time` a última autenticação.

**Idempotente:** operação que pode ser repetida com a mesma identidade sem duplicar o efeito final.

**IndexedDB:** armazenamento estruturado do navegador usado pelo cache persistente do Firestore.

**Injeção de dependência:** fornecimento de serviços a um módulo por parâmetros, em vez de criá-los escondidos dentro dele.

**JavaScript:** linguagem principal do cliente e do Worker.

**Java:** linguagem e ambiente usados pelo conjunto de ferramentas que compila a camada Android do Trofia.

**JSX:** sintaxe que permite declarar a árvore visual dentro do JavaScript; o build a transforma em chamadas compreendidas pelo React.

**JSON:** formato textual de objetos, arrays, números, textos, booleanos e valores nulos.

**JWT:** formato assinado usado pelo ID token; contém cabeçalho, conteúdo e assinatura.

**Lifecycle:** regras que controlam criação, uso, troca e destruição de um recurso.

**Listener:** função registrada para receber eventos ou snapshots.

**Biblioteca:** conjunto reutilizável de funções ou componentes incorporado por outro programa, como React ou Recharts.

**LocalStorage:** armazenamento simples de pares chave/valor no navegador.

**MIME type:** identificação do tipo de conteúdo, como `application/json` ou `image/jpeg`.

**Objeto e array:** objeto agrupa campos nomeados; array guarda uma sequência ordenada de valores. Ambos podem ser representados em JSON.

**Minificação:** redução mecânica do tamanho do código distribuído; está desativada no release Android atual.

**Modelo generativo:** sistema que produz texto ou dados novos a partir de instrução e contexto. A saída é probabilística e precisa de validação antes de influenciar dados persistidos.

**Módulo:** unidade de código com responsabilidade e interface delimitadas.

**Node.js:** ambiente que executa JavaScript fora do navegador, usado no build, nos testes e em serviços do projeto.

**npm / `npm ci`:** gerenciador de pacotes JavaScript e comando de instalação reprodutível que segue exatamente o arquivo de versões travadas.

**Multimodal:** processamento que combina texto e imagem.

**`null`:** valor explícito que representa ausência conhecida de informação; é diferente de zero.

**Observabilidade:** registros e métricas usados para acompanhar um serviço em execução.

**Offline-first:** arquitetura que prioriza dados locais e sincroniza quando a rede permite.

**Origem:** combinação de protocolo, domínio e porta usada pelo CORS para identificar quem chama.

**Payload:** conteúdo útil de uma mensagem, token ou requisição.

**Plugin:** extensão que liga uma ferramenta ou plataforma a uma capacidade adicional; no Trofia há plugins de build e plugins nativos do Capacitor.

**Persistência:** armazenamento que sobrevive ao ciclo imediato de renderização.

**Playwright:** ferramenta que controla navegadores para testar fluxos reais da interface.

**Portal de interface:** técnica que renderiza um painel fora da hierarquia visual imediata do componente, evitando que cortes ou camadas do contêiner o escondam.

**Promise:** objeto JavaScript que representa resultado futuro de operação assíncrona.

**Prompt:** instrução e dados enviados ao modelo generativo.

**Prompt injection:** tentativa de inserir comandos em dados que deveriam ser tratados apenas como conteúdo.

**Proxy:** serviço intermediário que recebe chamada do cliente e a encaminha com controles adicionais.

## Q–Z

**Rate limit:** limite de chamadas em uma janela de tempo.

**Reautenticação:** nova prova de senha antes de operação sensível.

**Reconciliador:** processo periódico que procura trabalhos parados e tenta recolocá-los no fluxo.

**Regra de segurança:** condição avaliada pelo Firestore antes de permitir acesso do cliente.

**React / React DOM:** biblioteca de interface e ligação com o documento HTML. React descreve componentes e estado; React DOM monta essa descrição no navegador.

**Recharts:** biblioteca de gráficos baseada em React, usada nas visualizações de evolução e agregados.

**Retry:** nova tentativa automática ou manual após falha.

**Runtime:** ambiente e bibliotecas efetivamente usados para executar o código.

**Runner:** máquina ou processo que executa uma suíte automatizada e reúne seus resultados.

**Schema:** definição de campos permitidos, tipos, limites e obrigatoriedade.

**Secret:** valor confidencial armazenado fora do código público, como a chave Gemini.

**Server timestamp:** horário atribuído pelo servidor no momento em que aceita a gravação.

**Status HTTP:** número padronizado que resume o resultado de uma requisição, como sucesso, erro do cliente ou indisponibilidade do serviço.

**Sessão:** estado autenticado mantido entre aberturas do aplicativo.

**Snapshot:** fotografia lógica de dados ou resultado em um momento específico.

**Smoke test:** teste curto que confirma que fluxos essenciais iniciam e concluem.

**SQL / SQLite:** linguagem e mecanismo relacional usados pelo limitador para guardar contagens.

**Subcoleção:** coleção de documentos localizada abaixo de outro documento Firestore.

**Subscription:** vínculo ativo que entrega atualizações até ser cancelado.

**Sync / sincronização:** convergência entre estado local e remoto.

**TTL (time to live):** prazo após o qual dado temporário pode ser removido automaticamente.

**Token:** sequência assinada ou secreta que representa identidade, atestação ou autorização.

**RS256:** método de assinatura de JWT baseado em RSA e SHA-256. A chave privada assina; o certificado público permite verificar autoria e integridade.

**Transação:** conjunto de leituras e escritas que verifica o estado antes de confirmar a mudança.

**Tree shaking:** remoção de partes importadas que não são usadas durante o build.

**UID:** identificador único da conta autenticada.

**UMD:** formato antigo de módulo que pode publicar sua interface em variável global.

**UTF-8:** codificação que transforma caracteres de diferentes idiomas em bytes de forma padronizada.

**URI:** identificador de recurso; no compartilhamento Android, representa o arquivo concedido temporariamente.

**Vite:** ferramenta que organiza módulos e produz o pacote web.

**WebView:** navegador incorporado dentro do aplicativo Android.

**Webhook:** chamada HTTP enviada automaticamente por um serviço para notificar outro. O Trofia atual não depende de webhook; o termo é incluído para diferenciar de Cloud Tasks e funções chamadas diretamente.

**Workflow:** sequência automatizada de etapas no GitHub Actions.

## Termos quantitativos e de teste

**Asserção:** verificação de que o resultado observado coincide com o esperado.

**Cobertura de dados:** proporção dos componentes aplicáveis que possuem informação completa; não é cobertura de linhas de código.

**Cobertura de testes:** medida de quanto código ou comportamento é exercitado por testes; este documento não afirma percentual para o Trofia.

**Mediana:** valor central de uma série ordenada.

**p95:** valor abaixo do qual ficaram 95% das medições.

**Regressão:** comportamento que funcionava e deixa de funcionar após mudança.

**Algoritmo genético, gene, população, geração e mutação:** busca inspirada em evolução. Um gene codifica parte da solução; uma população reúne candidatas; cada geração seleciona e combina candidatas; mutação altera genes para explorar novas combinações.

**Curva de potência, exponencial e gaussiana:** funções matemáticas usadas para transformar distância da meta em nota ou penalidade com formatos distintos; a escolha determina quão rápido o valor cresce ou decai.

# GLOSSÁRIO ESPECÍFICO DO TROFIA

**`0.10.0-beta`:** versão nomeada no pacote web, Android e aviso da linha principal inspecionada. Indica fase beta e não lançamento público final.

**`accountDeletionJobs/{requestId}`:** coleção administrativa com checkpoint, tentativa e falha sanitizada da exclusão. Cliente não acessa.

**`accountDeletionLocks/{uid}`:** coleção administrativa consultada pelas regras para bloquear escrita durante e depois da exclusão.

**AI Nutrition Policy / `c08-ai-nutrition-policy-v1`:** contrato comum das sete superfícies de IA; define autoridade local, `null`, minimização, idiomas e validação.

**App Check no Trofia:** atestação com reCAPTCHA Enterprise na web e Play Integrity no Android; é obrigatória na exclusão e complementa Auth.

**Firebase Authentication no Trofia:** serviço que mantém contas, confirmação de e-mail, senha, reautenticação e emissão de ID token. O SDK modular é a única autoridade de sessão no cliente atual.

**`App.jsx`:** composition root Vite que conecta React, controlador, domínio, Firebase, IA e Capacitor.

**`globalThis` e `readLegacyNamespace()`:** `globalThis` é o objeto global do JavaScript; durante a transição arquitetural, módulos UMD publicam nele. A fachada `readLegacyNamespace()` lê e valida esses nomes para expô-los a módulos ESM.

**`AutosaveScheduler`:** agendador por chave com 800 ms, ou 1.500 ms para notas, suspensível em backup/exclusão.

**Banco de calorias:** soma semanal da diferença entre consumo e meta própria de cada dia concluído; respeita treino/descanso e metas históricas.

**C08:** revisão dos critérios nutricionais de IA. A–F estão implementadas e validadas na referência atual.

**C09:** entrega do backend gerenciado de IA, que retirou a chave do cliente.

**C15:** limpeza ampla futura do legado e das pontes UMD/ESM; não é nome do trabalho incremental histórico.

**C19:** persistência e exibição da avaliação aceita no Diário.

**C20:** calibração e contrato do `meal-score-v2`.

**C22:** exclusão administrativa completa e idempotente da conta.

**C23:** fechamento dos caminhos Firestore legados e preservação da importação de backups antigos.

**C24:** reconhecimento de refeição por fotografia, editor e validação física/real.

**C28:** arquitetura Firebase modular, cache, offline-first, escrita granular e lifecycle de conta.

**C14/C16/C25:** revisão geral de segurança, documentação/manutenção e gate público; permanecem parciais e delimitam o que falta antes do lançamento amplo.

**`ChoiceField`:** seletor reutilizável para opções fechadas, com rótulo, ajuda, fechamento e teclado consistentes.

**`SearchableChoiceField`:** variante que filtra opções, inclusive sem depender de acentos, usada em listas extensas.

**`TemporalField`, `DateField`, `NumericField`:** família para hora civil, data civil e número por teclado controlado.

**`CheckboxField` / `SliderField`:** controles S8 que preservam checkbox/range semânticos e aplicam apresentação própria.

**Data civil:** string `YYYY-MM-DD` tratada como dia de calendário, sem conversão implícita de fuso.

**`DailyEntryPersistence`:** coordenador que migra uma data, calcula diff e serializa alterações por tipo/data.

**Despensa:** nome funcional da coleção pessoal de alimentos, persistida em `pantry_v2`.

**`dish-estimate-v2`:** contrato estruturado que transforma descrição em `MealEstimate`.

**`eating-patterns-v2`:** prompt narrativo que analisa somente dias registrados e declara cobertura por nutriente.

**`food-estimate-v1`:** contrato de preenchimento nutricional com estimativa ou recusa integral.

**G01:** defeito em que autosave pendente sobrescrevia backup restaurado; resolvido com suspensão e reidratação.

**GA / GA v1:** algoritmo genético local que procura combinações de alimentos da despensa. Não é IA generativa e não usa `meal-score-v2` como fitness.

**`goalHistory`:** snapshots de metas usados para que um dia antigo conserve a referência que valia nele.

**`HydrationGuard`:** proteção que impede autosave antes de uma chave ter sido hidratada.

**`image-meal-v1`:** contrato da resposta estruturada de fotografia.

**Gemini no Trofia:** provedor generativo acessado somente pelo `trofia-ai-proxy`; produz narrativas ou respostas estruturadas, mas não é autoridade para score, metas ou totais persistidos.

**Interactions API no Trofia:** modalidade do serviço Gemini usada pelo Worker para imagem e saídas estruturadas, na revisão `2026-05-20`, sem armazenamento remoto da interação (`store: false`).

**`mealEvaluationId`:** identificador compartilhado pelos itens de uma refeição avaliada.

**ML Kit no Trofia:** leitor nativo de código de barras usado no Android; entrega o código ao fluxo de pesquisa de produto e libera câmera e listeners ao sair.

**`MealEstimate`:** objeto editável com prato, itens, quantidades, nutrientes, confiança e suposições; compartilhado por foto e descrição.

**`meal-explanation-v1`:** prompt narrativo que explica snapshot definitivo sem recalcular a nota.

**`meal-score-v1.1`:** versão histórica aceita somente para leitura e comparação com a mesma versão.

**`meal-score-v2`:** algoritmo local atual de nota contextual de 0 a 5.

**`nutrition-feedback-v2`:** prompt narrativo de feedback que recebe metas e cobertura calculadas, não perfil bruto.

**`nutrition/{uid}`:** documento raiz canônico da conta no Firestore.

**`nutrition/{uid}/data/{key}`:** documentos canônicos de dados lógicos serializados.

**`nutrition/{uid}/days/{date}`:** raiz intermediária sem acesso direto; abriga subcoleções granulares.

**`notes_YYYY-MM-DD`, `log_v2_YYYY-MM-DD`, `waterIntake_YYYY-MM-DD`, `suppLog_YYYY-MM-DD`:** chaves compatíveis de nota e agregados diários; as três últimas alimentam migração granular.

**`pantry-suggestions-v2`:** contrato de sugestões por IDs exatos, validado no Worker e recalculado no cliente. Não substitui o GA exposto.

**`pantry_v2`:** chave canônica dos alimentos personalizados.

**Parcela temporal:** fração do restante diário usada como referência da refeição, baseada em horas até meia-noite.

**`persistentMultipleTabManager`:** configuração do Firestore que coordena cache persistente entre abas confiáveis.

**Phrona:** nome histórico presente em classes e identificadores antigos; a identidade pública atual é Trofia.

**`origin/main`:** referência Git da linha `main` observada no repositório remoto. Este documento fixa o commit `e68bc20` para que a arquitetura descrita possa ser conferida no mesmo estado.

**Safe area, notch e teclado no Trofia:** margens dinâmicas aplicadas à interface Android para impedir que recortes de tela, barras do sistema ou teclado cubram controles.

**`singleTask`:** modo Android em que a atividade principal existente recebe uma nova intenção em vez de criar cópias empilhadas; ajuda a tratar links e retorno ao aplicativo de forma única.

**`REPORTS_ENABLED`:** chave que mantém relatórios avançados desativados até infraestrutura segura; não desativa backup ou exportação semanal.

**Snapshot de avaliação:** projeção persistida do score, cobertura, horário e componentes, sem recálculo retroativo.

**`suppPantry`:** chave canônica da lista de suplementos.

**`trainingByDate`:** mapa que registra treino ou descanso por data.

**`trofia-ai-proxy`:** Worker que autentica e valida chamadas Gemini.

**`trofia-firestore-lifecycle`:** nome do BroadcastChannel usado para coordenar purge entre abas.

**`verify-vite-build.js`:** verificador que aplica a lista exata de arquivos publicáveis, rejeita material sensível e confirma hashes, caminhos relativos e ordem da cascata antes da publicação.

**Worktree `.codex-*`:** cópia de trabalho isolada criada para uma fatia; pode conter evidência ou branch específica e não prova que o conteúdo foi mesclado à `main`.

**`_dailyDates`:** índice no documento raiz com datas que possuem escrita granular, atualizado por `arrayUnion()`.

**`_storageSchemaVerified`, `_legacyCleanupDone`:** marcadores internos de verificação do esquema; não são dados nutricionais apresentados na interface.
