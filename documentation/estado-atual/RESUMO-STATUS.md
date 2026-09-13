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
- **[Bugs] Concluído (09/09/2026) —** fluxo de refeições salvas no `Registrar refeição` ajustado com feedback de adição, preservação de `staged.meal`, remoção de sobrescrita do `meal` salvo e separação entre “Adicionar” (pontual) e “Editar” (permanente) em modelo salvo. Gate final verde: 1256 unitários, smoke autenticado legado/Vite e matriz `cutover` 60/60. — Chat: Trofia-Bugs.
- **[DIARY-MENU-A] Concluído (09/09/2026) — Chat: Trofia-Principal.** A ação “Detalhes” do menu de cada alimento no Diário abre um modal somente leitura com categoria, quantidade, horário, nutrientes realmente disponíveis e indicação sanitizada de estimativa por IA. Campos ausentes permanecem ocultos; fechamento por botão, backdrop, `Esc` e Voltar do Android é coberto sem alterar dados ou persistência.
- **[DIARY-MENU-B] Concluído (10/09/2026) — Chat: Trofia-Principal.** A ação “Editar” reúne quantidade e tipo de refeição em um único editor, funciona no dia atual e no histórico, preserva ID/horário/origem ao mover e invalida avaliações C19 com aviso explícito. O diff C28 atualiza o mesmo documento granular e o emulador confirma que as rules C14-B2 aceitam a mudança de `mealKey`.
- **[PHOTO-03] Concluído (10/09/2026) — Chat: Trofia-Principal.** A Fatia PHOTO-03-A criou o domínio proporcional puro e sua cobertura UMD/ESM. A Fatia PHOTO-03-B integrou a regra ao editor compartilhado de foto e descrição: quantidade recalcula peso e os oito nutrientes, peso recalcula nutrientes sem alterar quantidade, e edições nutricionais manuais tornam-se a nova base proporcional. Os builders persistem os valores revisados no Diário sem carregar metadados transitórios da estimativa.
- **[D1 — shell desktop/cabeçalho/navegação] Concluído (10/09/2026) — Chat: Trofia-UIUX.** O PR #187 removeu a margem negativa que sobrepunha as abas ao peso/IMC e ao progresso, adotou navegação em largura total centralizada no shell de 1080px e preservou a navegação móvel. O gate final autenticado `34464670583` passou em legado/Vite, desktop/mobile e claro/escuro; merge `3ccb852`.
- **[Câmera embutida — C2] Concluído (10/09/2026) — Chat: Trofia-UIUX.** O PR #185, já mesclado, comprova no Capacitor Android uma vista nativa traseira limitada ao retângulo DOM medido, sem substituir ainda o fluxo C24. No Galaxy S25 Ultra SM-S938B físico, o Android apresentou e concedeu a permissão real de câmera, o preview permaneceu confinado a `348×420` CSS px na origem `18,113`, os controles externos continuaram visíveis/clicáveis, a captura retornou imagem Base64 não vazia e a sessão nativa desconectou após `stop()`. O pacote de prova paralelo `.c2proof` foi removido e nenhum APK/AAB foi publicado.
- **[Câmera embutida — C3] Concluído (12/09/2026) — Chat: Trofia-UIUX.** O PR #190 integrou o preview traseiro ao fluxo real C24 com `toBack:true`, viewport medido, máscaras arredondadas Glass UI, controles HTML acessíveis acima da câmera, PT/EN/ES, abertura/contração e `prefers-reduced-motion`. A prova física no Galaxy validou transparência localizada, cliques sobre o preview, recorte sem vazamento, cancelamento e captura Base64; merge `c6a4e4f`.
- **[Câmera embutida — C4b] Concluído (12/09/2026) — Chat: Trofia-UIUX.** O que se planeja fazer: concluir acessibilidade, recuperação de permissão e acabamento resiliente sem ampliar funções fotográficas. O que foi feito: o PR #194 entregou foco persistente e restaurado, anúncios PT/EN/ES sem duplicidade, abertura real das Configurações, fonte 200%, contraste/alvos de 48 px e descarte temporário; Galaxy físico, gate local e CI autenticado `34710539851` ficaram verdes, com merge `050182d`, encerrando toda a sequência CAM-C1–C4b. Alinhamento: 100%, sem zoom, flash, troca de câmera, gestos ou edição.

## O que está em andamento agora

- **C14 — revisão geral de segurança:** C14-A, C14-B1 e C14-B2 estão concluídas; C14-C está em andamento; C14-D a C14-H não foram iniciadas. — **Chat:** Trofia-Principal.
- C20, C19 e C08 continuam concluídos; a suspensão temporária da build 11 não reabre esses itens.
- **Organização documental:** o índice inicial foi mesclado no PR #153; o filtro que evita a suíte pesada em PRs exclusivamente documentais foi mesclado no PR #155.

## O que está apenas planejado, ainda sem código completo

### Indispensável antes do lançamento público

- **C14:** revisão geral de segurança — em andamento; decisões de escopo aprovadas em 01/09/2026 e execução sequencial autorizada a partir da C14-B.
- **C16:** documentação técnica e de manutenção — parcial; esta pasta ajuda, mas não equivale à conclusão integral do item.
- **C25:** gate da versão pública — parcial e dependente de C14/C16.

### Backlog pós-lançamento

- C26 notificações, N01 voz, C21 porções fracionadas, N03 leitura de rótulos, N09 jejum, C17 e-mails, C13 feedback nativo, C10 relatórios, N07 compartilhamento profissional, N02 banco nutricional, N05 recalibração dinâmica, C15 limpeza ampla do legado, C27 widgets, N04 receitas, N06 planejamento alimentar, C12 iOS, C18 integrações de saúde e N08 exercícios/hábitos.
- Partes deliberadamente adiadas: C26-C (push/backend) e C27-B (widget funcional com escrita direta).
- Revisão externa por nutricionista e eventual comparação/troca do modelo Gemini permanecem decisões futuras registradas em `PENDENCIAS.md`.

## Sequências de fatias aprovadas — registro completo

> Regra de manutenção: nenhuma fatia aprovada é removida desta seção. Cada chat deve atualizar o status `não iniciado` → `em andamento` → `concluído`; novas fatias devem registrar, antes do código, `O que se planeja fazer` e, ao terminar, `O que foi feito` e `Alinhamento`.

### Protocolo permanente de rastreamento

- Assim que um fatiamento for aprovado, a sequência completa deve ser registrada aqui, inclusive as fatias ainda não iniciadas, e seus estados devem ser atualizados sem remover etapas futuras.
- Cada fatia nova registra `O que se planeja fazer` antes da implementação; ao concluir, registra `O que foi feito` e `Alinhamento`. Neste resumo, cada campo permanece em uma frase breve.
- O histórico detalhado da frente registra os mesmos três campos. Quando o alinhamento for inferior a 100%, deve explicar o desvio real e classificar o impacto como positivo, negativo ou neutro.
- Toda entrada de fatia/PR em `documentation/historico/*.md` registra `Tempo decorrido` e `Minutos de CI` logo após a data de conclusão. Antes do merge, o tempo permanece literalmente `pendente de merge`; depois do merge, o mesmo valor é copiado para a descrição do PR.
- Commits e descrições de PR novos terminam com `Chat-Origin: <nome do chat>`; neste arquivo, toda atualização identifica o chat responsável pelo item.

### Frente principal — sequências concluídas

- **[C01-A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: corrigir textos/mojibake e ampliar a proteção de encoding. O que foi feito: proteção PT/EN/ES e scanner de módulos runtime concluídos no PR #83.
- **[C01-B] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: unificar o domínio de datas civis, janelas e DST. O que foi feito: helpers e consumidores foram unificados no PR #84.
- **[C01-C] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: tornar a virada da meia-noite reativa e reidratar o novo dia com segurança. O que foi feito: relógio local reativo e proteção dos autosaves concluídos no PR #85.

- **[UX80-F1] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: corrigir tooltip semanal duplicado e centralização de “Nutrientes”. O que foi feito: itens 1 e 3 entregues no PR #80.
- **[UX80-F2] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: reposicionar ajuda e navegação de data sem sobreposição. O que foi feito: item 2 entregue no PR #80.
- **[UX80-F3] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: adicionar horário opcional ao registro de refeição. O que foi feito: item 9 entregue no PR #80.
- **[UX80-F4] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: fechar o modal somente após registro bem-sucedido e restaurar a origem. O que foi feito: item 6 entregue no PR #80.
- **[UX80-F5] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: ocultar categorias vazias e usar um único botão global no Diário. O que foi feito: item 7 entregue no PR #80.
- **[UX80-F6] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: compactar o bloco de água em resumo colapsável. O que foi feito: item 8 entregue no PR #80.
- **[UX80-F7] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: mostrar o estado local da IA e enriquecer limites 429. O que foi feito: item 4 entregue no PR #80.
- **[UX80-F8] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: fechar documentação, validação e PR da rodada. O que foi feito: changelog/inventário e gate final foram incorporados ao PR #80.

- **[C20-A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: formalizar contrato e matriz do score 0–5 sem mudar produção. O que foi feito: contrato/calibração registrados no PR #129.
- **[C20-B] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: criar algoritmo v2 com horário real, curvas, pesos e cobertura. O que foi feito: `meal-score-v2` concluído no PR #131.
- **[C20-C] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: integrar score v2 ao controlador/GA preservando snapshots. O que foi feito: integração retrocompatível concluída no PR #132.
- **[C20-D] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: apresentar rótulos, confiança e faixas sem diagnóstico. O que foi feito: apresentação mínima concluída no PR #134.
- **[C20-E] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: validar integralmente PT/EN/ES e runtimes. O que foi feito: fechamento técnico concluído no PR #135.

- **[C19-A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: proteger integridade e invalidação dos snapshots aceitos. O que foi feito: contrato fail-closed concluído no PR #137.
- **[C19-B] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: estabilizar explicação opcional e retry contextual. O que foi feito: fluxo opcional concluído no PR #139.
- **[C19-C] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: incluir avaliação opcional no fluxo de foto. O que foi feito: integração C24 concluída no PR #140.
- **[C19-D] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: exibir badge agrupado e detalhe somente leitura no Diário. O que foi feito: integração do Diário concluída no PR #142.
- **[C19-E] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: executar validação final completa. O que foi feito: C19 encerrado no PR #145.

- **[C08-A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: formalizar política nutricional e matriz canônica das sete superfícies. O que foi feito: política `c08-ai-nutrition-policy-v1` concluída no PR #147. Alinhamento: 100%.
- **[C08-B] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: impedir que nutriente ausente vire zero. O que foi feito: ausência, zero e cobertura foram separados no PR #149. Alinhamento: 100%.
- **[C08-C] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: alinhar estimativas estruturadas de alimento, texto e foto. O que foi feito: contratos/editor compartilhado concluídos no PR #151. Alinhamento: 100%.
- **[C08-D] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: minimizar dados pessoais e alinhar feedback/padrões. O que foi feito: prompts e cobertura concluídos no PR #152. Alinhamento: 100%.
- **[C08-E] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: validar sugestões contra a despensa e alinhar explicação C19. O que foi feito: endpoint/contratos fail-closed concluídos no PR #165. Alinhamento: 100%.
- **[C08-F] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: validar idiomas, dados ausentes, respostas malformadas e prompts adversariais. O que foi feito: matriz e prova controlada concluídas no PR #167. Alinhamento: 100%.

- **[C22-F1] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: criar infraestrutura Functions e emuladores. O que foi feito: base 2nd gen/Admin SDK entregue no PR #99.
- **[C22-F2] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: implementar saga idempotente de exclusão. O que foi feito: motor e testes puros entregues no PR #100.
- **[C22-F3] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: bloquear escrita e excluir recursivamente dados canônicos. O que foi feito: lock/rules/recursão entregues no PR #103.
- **[C22-F4] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: adicionar Cloud Tasks, retries e reconciliação. O que foi feito: processamento assíncrono entregue no PR #104.
- **[C22-F5] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: integrar painel, App Check e limpeza local. O que foi feito: cliente protegido entregue no PR #105.
- **[C22-F6] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: realizar deploy controlado e teste destrutivo descartável. O que foi feito: backend e teste real concluídos durante o rollout do PR #105.
- **[C22-F7] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: validar matriz final, política e rollout Play Integrity. O que foi feito: fechamento operacional entregue no PR #106 e validado na build Play.

- **[C23-F1] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: criar inventário/migrador Admin SDK em dry-run. O que foi feito: ferramenta fail-closed entregue no PR #107.
- **[C23-F2] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: copiar, mesclar e verificar individualmente dados legados. O que foi feito: 54 documentos migrados/verificados no PR #108.
- **[C23-F3] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: retirar exclusão legada do cliente mantendo leitura transitória. O que foi feito: rules transitórias entregues no PR #109.
- **[C23-F4] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: cortar normalização/exclusão legada no cliente e preservar importação antiga. O que foi feito: cutover do cliente entregue no PR #110.
- **[C23-F5] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: observar a build intermediária por sete dias. O que foi feito: dados semanais e relatos dos testers permaneceram normais durante a janela aprovada.
- **[C23-F6] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: exportar, excluir apenas legados verificados e fechar leitura antiga. O que foi feito: export gerenciado, zero legado e rules finais concluídos no PR #111.
- **[C23-F7] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: documentar fechamento, retrocompatibilidade e retenção. O que foi feito: C23 encerrado no PR #112.

- **[C24-F1] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: compartilhar contrato/editor de estimativas. O que foi feito: domínio compartilhado entregue no PR #89.
- **[C24-F2] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: criar endpoint multimodal autenticado e limitado. O que foi feito: Worker de imagem entregue no PR #90.
- **[C24-F3] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: capturar e pré-processar câmera/galeria sem metadados. O que foi feito: pipeline entregue no PR #91.
- **[C24-F4] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: criar tela dedicada e estados/erros. O que foi feito: interface de reconhecimento entregue no PR #92.
- **[C24-F5] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: persistir revisão como entradas individuais estimadas. O que foi feito: persistência entregue no PR #94.
- **[C24-F6] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: atualizar privacidade, Data Safety e publicação antes dos testers. O que foi feito: compliance entregue no PR #95 e confirmado externamente.
- **[C24-F7] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: validar Worker, Android físico e qualidade High/Medium. O que foi feito: gates e rollout concluídos nos PRs #96–#97.

- **[C28-F1] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: reduzir leituras redundantes e serializar CI por SHA. O que foi feito: quick wins entregues no PR #113.
- **[C28-F2] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: compartilhar Firebase App/Auth e ponte App Check. O que foi feito: fundação modular entregue no PR #114.
- **[C28-F3] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: substituir REST por adaptador Firestore SDK mantendo contrato. O que foi feito: adaptador entregue no PR #115.
- **[C28-F4] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: ativar cache persistente multi-tab e lifecycle seguro. O que foi feito: cache/limpeza entregues no PR #116.
- **[C28-F5] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: tornar loaders históricos cache-first e deduplicados. O que foi feito: carregamentos/subscriptions entregues no PR #117.
- **[C28-F6A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: introduzir IDs idempotentes e mutações diárias. O que foi feito: fundação de escrita granular entregue no PR #118.
- **[C28-F6B] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: criar esquema granular de log/água/suplementos. O que foi feito: esquema entregue no PR #119.
- **[C28-F6C] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: ler agregado antigo e granular novo durante a migração. O que foi feito: retrocompatibilidade entregue no PR #120.
- **[C28-F6D] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: expor estados pendente/sincronizado/erro e retries. O que foi feito: estado de sincronização entregue no PR #121.
- **[C28-F6E] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: cortar autosaves agregados e encerrar A09. O que foi feito: cutover final entregue no PR #122.
- **[C28-F7] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: adaptar backup/restauração/exclusão ao SDK e pending writes. O que foi feito: lifecycle seguro entregue no PR #123.
- **[C28-F8] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: validar offline, multi-tab, Android e leituras reais. O que foi feito: rollout e medição concluídos no PR #124.

- **[DIARY-MENU-A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: abrir detalhes somente leitura pelo menu do Diário. O que foi feito: modal acessível entregue no PR #182. Alinhamento: 100%.
- **[DIARY-MENU-B] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: editar quantidade/tipo preservando identidade e invalidando C19. O que foi feito: editor/movimentação e prova das rules entregues no PR #184. Alinhamento: 100%.
- **[PHOTO-03-A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: criar transformação proporcional pura de peso/quantidade e nutrientes. O que foi feito: domínio entregue no PR #186. Alinhamento: 100%.
- **[PHOTO-03-B] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: integrar a transformação aos fluxos de foto/texto e persistência. O que foi feito: integração entregue no PR #188. Alinhamento: 100%.

### Segurança C14 — sequência aprovada e rollout interno

- **[C14-A] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: tornar leituras/backups fail-closed. O que foi feito: entregue no PR #174. Alinhamento: 100%.
- **[C14-B1] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: negar exclusão client-side e proteger envelopes canônicos. O que foi feito: rules iniciais entregues no PR #175.
- **[C14-B2] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: aplicar schema completo após inventário real. O que foi feito: após rollback e hotfix de orçamento, rules finais encerradas no PR #178. Alinhamento: divergiu do desenho estrito original — a validação profunda dos componentes foi movida para o leitor fail-closed porque as rules excediam o orçamento; impacto final positivo para compatibilidade, com incidente documentado.
- **[C14-C1 — observação] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: publicar validação App Check no Worker sem enforcement. O que foi feito: modo `observe` publicado e validado.
- **[C14-C2 — clientes enviam token] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: enviar `X-Firebase-AppCheck` em todas as superfícies. O que foi feito: clientes integrados no PR #189.
- **[C14-C3 — debug provider CI] — Status: concluído — Chat: Trofia-Principal.** O que se planeja fazer: fornecer atestação válida no CI autenticado. O que foi feito: run autenticado do PR #189 validou o provider de debug.
- **[C14-C4 — validar Pages/AAB real] — Status: em andamento — Chat: Trofia-Principal.** O que se planeja fazer: validar Web real e AAB Play Integrity antes do enforcement. O que foi feito: Pages e os três fluxos de IA foram validados após o hotfix #191; AAB físico ainda não foi concluído. Alinhamento: parcial — a fase revelou e corrigiu a corrida do perfil antes de prosseguir; impacto positivo para segurança do rollout.
- **[C14-C5 — enforcement] — Status: não iniciado — Chat: Trofia-Principal.** O que se planeja fazer: tornar App Check obrigatório no Worker e repetir as validações. O que foi feito: não iniciado.
- **[C14-D] — Status: não iniciado — Chat: Trofia-Principal.** O que se planeja fazer: endurecer Android, Auto Backup e cadeia de release. O que foi feito: não iniciado.
- **[C14-E] — Status: não iniciado — Chat: Trofia-Principal.** O que se planeja fazer: endurecer senha, sessão web e onboarding recuperável. O que foi feito: não iniciado.
- **[C14-F1] — Status: não iniciado — Chat: Trofia-Principal.** O que se planeja fazer: preparar tiers/rate limit, timeout e métricas sanitizadas. O que foi feito: não iniciado.
- **[C14-F2] — Status: não iniciado — Chat: Trofia-Principal.** O que se planeja fazer: auditar IAM, invocadores e dependências antes de alterar privilégios. O que foi feito: não iniciado.
- **[C14-G] — Status: não iniciado — Chat: Trofia-Principal.** O que se planeja fazer: aplicar CSP e restringir superfícies de debug. O que foi feito: não iniciado.
- **[C14-H] — Status: não iniciado — Chat: Trofia-Principal.** O que se planeja fazer: criar staging e executar validação/rollout final. O que foi feito: não iniciado.

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

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** transformar a espera inicial em uma transição deliberada e coerente com a identidade do Trofia.
- **O que se planeja fazer:** prototipar e implementar logo pulsando/expandindo, mínimo de 800–1000 ms, claro/escuro e alternativa estática em reduced-motion.
- **Recursos/arquivos principais envolvidos:** bootstrap/loading do app, logo Trofia, CSS de animação, temporização JS e Playwright visual.

### [I2] - Registro progressivo por campo

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** reduzir a carga cognitiva do cadastro apresentando uma decisão clara por etapa.
- **O que se planeja fazer:** reorganizar o onboarding em decisões progressivas reconstruídas na linguagem One UI 8/Glass UI.
- **Recursos/arquivos principais envolvidos:** `login-screen.js`, `required-profile-modal.js`, ChoiceField/TemporalField, i18n e Playwright.

### [I3] - Política e migração de tema

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** tornar o claro o padrão visual comum sem retirar do usuário o controle posterior do tema.
- **O que se planeja fazer:** migrar todos os usuários uma única vez para claro e depois respeitar escolha manual ou acompanhamento do dispositivo.
- **Recursos/arquivos principais envolvidos:** preferências de tema, storage local, Configurações, tokens claro/escuro e testes de migração.

### [I4] - Ação principal e menu “o que criar”

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** tornar a ação principal mais encontrável e esclarecer as alternativas de criação antes da escolha.
- **O que se planeja fazer:** avaliar FAB estendido e menu de criação com subtítulos, adaptando a hierarquia concorrente ao One UI 8/Glass UI.
- **Recursos/arquivos principais envolvidos:** navegação/Diário, fluxo Adicionar, menu de criação, ícones SVG, CSS e Playwright.

### [I5] - Configurações em tela cheia

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
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

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** impedir que diferenças entre build local e distribuição escondam novamente uma falha crítica.
- **O que se planeja fazer:** publicar AAB assinado no canal interno, instalar pela Play e validar fisicamente no Galaxy.
- **Recursos/arquivos principais envolvidos:** Gradle signing, AAB, Google Play Console e Galaxy físico.

### [CAM-RED-1] - Protótipo do redesenho centralizado

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** decidir visualmente o novo comportamento sem misturá-lo ao hotfix urgente.
- **O que se planeja fazer:** prototipar preview central, backdrop, X, flash, transições, temas, idiomas e acessibilidade.
- **Recursos/arquivos principais envolvidos:** protótipo HTML/CSS/JS externo e referências One UI 8/Glass UI.

### [CAM-RED-2] - Prova técnica do redesenho no Android

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** validar no aparelho as premissas nativas antes da integração visual definitiva.
- **O que se planeja fazer:** provar empilhamento, máscara, controles HTML, scroll bloqueado e suporte real de flash.
- **Recursos/arquivos principais envolvidos:** Camera Preview, WebView transparente, Capacitor/Gradle e Galaxy físico.

### [CAM-RED-3] - Overlay, fechamento e transições

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** implementar a estrutura visual aprovada sem acoplar prematuramente o flash.
- **O que se planeja fazer:** integrar preview central, backdrop, X dedicado e expansão/contração ao fluxo real.
- **Recursos/arquivos principais envolvidos:** React, fluxo C24, `image-meal-screen.js`, `one-ui.css` e Camera Preview.

### [CAM-RED-4] - Flash da câmera embutida

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** oferecer iluminação sem assumir suporte inexistente ou deixar hardware ligado.
- **O que se planeja fazer:** detectar suporte, controlar flash com estados localizados/acessíveis e restaurá-lo em toda saída.
- **Recursos/arquivos principais envolvidos:** API de flash do Camera Preview, estado React e testes Android.

### [CAM-RED-5] - Robustez e acessibilidade do redesenho

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** preservar as garantias C4a/C4b depois da mudança estrutural da câmera.
- **O que se planeja fazer:** validar TalkBack, fonte 200%, contraste, PT/EN/ES, reduced-motion, permissões e lifecycle.
- **Recursos/arquivos principais envolvidos:** ARIA/TalkBack, CSS responsivo, Playwright, Capacitor e Galaxy físico.

### [CAM-RED-6] - Validação final do redesenho pela Play Store

- **Status:** não iniciado — **Chat:** Trofia-UIUX.
- **Data de início:** não determinado.
- **Data de conclusão:** não iniciado.
- **Propósito:** concluir o redesenho somente com evidência do mesmo artefato entregue ao usuário.
- **O que se planeja fazer:** publicar o AAB final no canal interno, instalar pela Play e executar a matriz física.
- **Recursos/arquivos principais envolvidos:** AAB assinado, Google Play Console, telemetria de versão e Galaxy físico.

## Estado detalhado das fatias C14

### [C14-A] - Integridade fail-closed e encerramento documental

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de conclusão:** 01/09/2026.
- **Propósito:** impedir que falhas de leitura/listagem pareçam ausência legítima e que um backup incompleto seja apresentado como bem-sucedido.
- **Recursos/arquivos principais envolvidos:** `/firebase-firestore-sdk.js`, `/firebase-backup-internal.js`, testes unitários UMD/ESM, histórico e este resumo.
- **O que foi feito:** leituras de documentos e listagens agora propagam erro e permitem retry; exportação exige raiz, lista, documentos e agregados diários comprovadamente completos. PR #174, commit `bd62a32`, merge `141da412`.

### [C14-B] - Rules do Firestore e schema canônico

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de conclusão:** validação técnica em 02/09/2026; fechamento formal pelo merge do PR #178 em 07/09/2026.
- **Propósito:** negar exclusão client-side da raiz e restringir envelopes, campos, chaves, tipos e tamanhos sem bloquear dados reais legítimos.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, testes de emulador e ferramenta Admin SDK read-only para inventário/dry-run.
- **O que foi feito:** B1 nega exclusão client-side da raiz, mantém a exclusão administrativa do C22, limita a raiz a 128 campos e exige `{value: string}` com até 900.000 caracteres em `/data/{key}`. B2 criou o inventário Admin SDK e as allowlists; o primeiro deploy e a primeira revisão excederam o teto de 1.000 expressões em batches legítimos e foram revertidos imediatamente. A correção final valida somente mudanças da raiz, preserva entrada/nutrientes e o envelope superior do score nas rules, e delega apenas o interior dos seis componentes ao leitor C20/C19 fail-closed. O teste integrado injeta campo inválido via Admin SDK e comprova que o cliente o rejeita sem badge/grupo. As rules foram republicadas em 02/09/2026 e o run `33575611133` passou integralmente antes e depois do deploy. A investigação dos órfãos permanece somente leitura, sem exclusão. Evidência: [`C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`](C14_B2_FIRESTORE_SCHEMA_INVENTORY.md). — **Chat:** Trofia-Principal.

### [C14-C] - App Check no Worker de IA

- **Status:** em andamento (10/09/2026) — **Chat:** Trofia-Principal.
- **Data de conclusão:** não concluído.
- **Propósito:** exigir prova de app legítimo além do Firebase ID token sem quebrar clientes existentes durante a transição.
- **Recursos/arquivos principais envolvidos:** `/worker/src/firebase-app-check-token.js`, `/worker/src/ai-worker.js`, `/worker/wrangler.jsonc`, clientes de IA, App Check web/Android, CI, Pages, AAB real e [`C14_C_APP_CHECK_WORKER_ROLLOUT.md`](C14_C_APP_CHECK_WORKER_ROLLOUT.md).
- **O que foi feito:** o Worker passou a validar criptograficamente o token App Check e a restringir os apps aceitos ao Web e Android do Trofia; todos os clientes enviam `X-Firebase-AppCheck` e falham de modo sanitizado antes de transmitir dados se não obtiverem token. A versão Worker `632877f3-e51f-4226-92fa-0b139e51e459` foi publicada em `observe` e passou no smoke externo. O run autenticado `34478874949` validou o código e o debug provider no CI. Após o PR #191, o Pages validou login normal e os três fluxos de IA sem abrir indevidamente o modal de perfil. Permanecem como gates um AAB real com Play Integrity e somente então o enforcement obrigatório com nova validação.
- **Achado da fase 4:** a validação manual revelou uma corrida de bootstrap capaz de mostrar o modal exclusivo de criação a uma conta antiga. O PR #191 encerrou esse subincidente ao exigir token real, confirmação do servidor e erro recuperável; AAB/enforcement permanecem bloqueados apenas pelos gates normais do rollout.

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

### [INV-RELOAD-SESSAO] - Sessão e loading após reload/troca de idioma

- **Status:** em investigação — **Chat:** Trofia-UIUX.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** não concluído.
- **Propósito:** monitorar uma possível inconsistência de restauração da sessão e do bootstrap após reload durante ciclos PT/EN/ES.
- **O que se planeja fazer:** aguardar recorrência reproduzível e então isolar estado de autenticação, término do loading e consumidores do contrato de leitura, coordenando qualquer correção fora de UI com o chat principal.
- **Recursos/arquivos principais envolvidos:** `setAppLanguage`, `pantry-choice-field.visual.spec.js`, `searchable-choice-field.visual.spec.js`, Firebase Auth/App Check e CI autenticado.
- **O que foi feito:** os runs `33488032008` e `33497924576` registraram ocorrências diferentes após reload, mas o diagnóstico isolado `33502189291` passou em 3/3 repetições PT/EN/ES sem erro de leitura, console ou requisição pendente; permanece intermitente, sem causa confirmada e sem correção aplicada.

## Onde aprofundar

- Estado por item: [`ROADMAP.md`](ROADMAP.md).
- Releases: [`VERSIONING.md`](VERSIONING.md).
- Decisões adiadas: [`PENDENCIAS.md`](PENDENCIAS.md).
- Bugs e riscos: [`BUG-INVENTORY.md`](BUG-INVENTORY.md).
- História da frente principal: [`../historico/2026-08-31-principal-arquitetura-ia-dados.md`](../historico/2026-08-31-principal-arquitetura-ia-dados.md).
