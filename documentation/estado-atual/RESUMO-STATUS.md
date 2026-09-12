# Resumo de status do Trofia

> Retrato do checkpoint `0.11.0-beta`, atualizado sobre a `main` no merge `050182d`, em 12/09/2026. Este resumo prioriza fatos verificáveis no repositório e nos PRs; não substitui o roadmap.

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
- **Diálogos visuais S9:** `GenericDialog` substitui os cinco usos ativos de `alert`, `confirm` e `prompt` do navegador por avisos, confirmações e entradas acessíveis no padrão One UI 8/Glass UI. A implementação e o gate local final estão concluídos no PR #172; o componente passa a compor a `main` com o merge desse PR. — Chat: Trofia-UIUX
- **Sequência visual S1–S9 concluída (10/09/2026):** todos os seletores e campos customizados planejados integram a `main`. O fechamento ocorreu com a S7b no PR #150: `NumericField` em peso, gordura corporal, cintura e massa muscular, com o containing/stacking context do cartão Glass neutralizado apenas enquanto o overlay está aberto. Gate final: CI autenticado `34412674372`, legado com 93 aprovados e oito skips exclusivos/documentados do Vite, Vite 101/101; merge `d3fdab0`. I1–I7 permanecem planejadas e cada novo tipo visual exige protótipo aprovado antes de código. — Chat: Trofia-UIUX
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

- **[S1] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: criar a base reutilizável `ChoiceField`. O que foi feito: entregue no PR #126.
- **[S2] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: substituir seletores estáticos de refeição. O que foi feito: entregue no PR #130.
- **[S3] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: aplicar ChoiceField a cadastro, perfil, métricas e unidades. O que foi feito: entregue nos PRs #133, #136 e #138.
- **[S4] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: criar seletores pesquisáveis para listas dinâmicas. O que foi feito: entregue no PR #141.
- **[S5] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: criar `TemporalField` de horário. O que foi feito: entregue no PR #144.
- **[S6] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: criar `TemporalField` de data. O que foi feito: entregue no PR #146.
- **[S7a] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: criar keypad numérico para quantidade. O que foi feito: entregue no PR #148.
- **[S7b] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: aplicar keypad às métricas corporais. O que foi feito: entregue no PR #150.
- **[S8] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: customizar checkboxes e sliders. O que foi feito: entregue no PR #166.
- **[S9] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: substituir diálogos nativos por `GenericDialog`. O que foi feito: entregue no PR #172.

- **[I1 — carregamento animado] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: prototipar e implementar logo pulsando/expandindo, mínimo de 800–1000 ms, claro/escuro e alternativa estática em reduced-motion. O que foi feito: não iniciado.
- **[I2 — registro progressivo por campo] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: reorganizar o onboarding em decisões progressivas reconstruídas na linguagem One UI 8/Glass UI. O que foi feito: não iniciado.
- **[I3 — política e migração de tema] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: migrar todos os usuários uma única vez para claro e depois respeitar escolha manual ou acompanhamento do dispositivo. O que foi feito: não iniciado.
- **[I4 — ação principal e menu “o que criar”] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: avaliar FAB estendido e menu de criação com subtítulos sem copiar a aparência dos concorrentes. O que foi feito: não iniciado.
- **[I5 — Configurações em tela cheia] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: prototipar hierarquia de Configurações em tela cheia coordenada com D7. O que foi feito: não iniciado.
- **[I6 — hierarquia visual da tela inicial] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: reprojetar a organização da tela inicial com aprovação específica por ser a mudança mais subjetiva e ampla. O que foi feito: não iniciado.
- **[I7 — gamificação de metas] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: adicionar contadores de meta ativos por padrão e preferência para desativá-los, sem coletar dados sensíveis novos. O que foi feito: não iniciado.

- **[D1] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: corrigir shell desktop, cabeçalho e navegação. O que foi feito: entregue no PR #187.
- **[D2 — Diário] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: corrigir sobreposições dos cards de macros/água e distribuir o Diário adequadamente em 1280/1440/1920 px. O que foi feito: não iniciado.
- **[D3 — Alimentos] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: ampliar a área útil e reorganizar lista, ações e estados vazio/preenchido para telas largas. O que foi feito: não iniciado.
- **[D4 — Métricas] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: adaptar cartões, grade de progresso/previsão e formulários para desktop sem quebrar overlays. O que foi feito: não iniciado.
- **[D5 — Semana] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: validar comparativamente nas três larguras e só implementar se o protótipo demonstrar ganho real. O que foi feito: não iniciado.
- **[D6 — Overlays] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: revisar modais, bottom sheets e editores em telas largas após a integração visual C3. O que foi feito: não iniciado.
- **[D7 — Configurações] — Status: não iniciado — Chat: Trofia-UIUX.** O que se planeja fazer: tratar a responsividade de Configurações em conjunto com o protótipo de tela cheia I5. O que foi feito: não iniciado.

- **[CAM-C1] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: validar protótipo visual da câmera embutida. O que foi feito: protótipo aprovado fora do runtime.
- **[CAM-C2] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: provar preview nativo limitado ao retângulo. O que foi feito: prova Android entregue no PR #185.
- **[CAM-C3] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: integrar preview embutido ao fluxo C24. O que foi feito: integração entregue no PR #190.
- **[CAM-C4a] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: endurecer permissões, timeouts, lifecycle e limpeza nativa. O que foi feito: entregue no PR #192.
- **[CAM-C4b] — Status: concluído — Chat: Trofia-UIUX.** O que se planeja fazer: garantir TalkBack, foco/anúncios, ordem das ações, fonte 200%, contraste, alvos, PT/EN/ES e descarte temporário, sem novos recursos fotográficos. O que foi feito: entregue no PR #194, validado no Galaxy e no CI autenticado `34710539851`, e mesclado como `050182d`. Alinhamento: 100%, sem zoom, flash, troca de câmera, gestos ou edição.

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

- **Reload/troca de idioma e bootstrap:** o chat Trofia-UI/UX relatou uma queda intermitente para a tela de login e um `SearchableChoiceField` temporariamente preso em `#loading` após reload. Três tentativas isoladas passaram, sem erro de leitura confirmado. A tentativa 2 do CI do PR #175 foi interrompida pelo teto global de 30 minutos enquanto essa asserção tinha executado por apenas 5,6 dos 15 segundos previstos; portanto, esse run não comprova travamento do produto. A investigação futura deve conferir consumidores que ainda presumam o contrato antigo `null`/`[]` após falha transitória, sem atribuir causalidade à C14-A até haver reprodução e evidência. — **Chat:** Trofia-Principal (achado original: Trofia-UI/UX).

## Onde aprofundar

- Estado por item: [`ROADMAP.md`](ROADMAP.md).
- Releases: [`VERSIONING.md`](VERSIONING.md).
- Decisões adiadas: [`PENDENCIAS.md`](PENDENCIAS.md).
- Bugs e riscos: [`BUG-INVENTORY.md`](BUG-INVENTORY.md).
- História da frente principal: [`../historico/2026-08-31-principal-arquitetura-ia-dados.md`](../historico/2026-08-31-principal-arquitetura-ia-dados.md).
