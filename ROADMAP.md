# Roadmap consolidado do Trofia

Estado reavaliado em 30/08/2026. Este documento reúne os itens C01–C28 e N01–N09 em uma única sequência de 37 posições. A ordem considera o estado real da `main`, dependências técnicas e recomendadas, segurança, conformidade, complexidade e participação externa necessária.

Os itens concluídos permanecem no início como registro histórico. C24 aparece entre os concluídos porque foi implementado fora da ordem anterior por decisão explícita do responsável. C22, C23 e C28 também estão concluídos e formam o checkpoint operacional `0.10.0-beta`.

A sequência está dividida em dois grupos: **A — indispensável para lançamento público**, que reúne os gates de segurança, estabilidade, responsabilidade nutricional e manutenção que devem fechar antes da abertura ao público geral; e **B — pode ser lançado depois**, que reúne funcionalidades e expansões desejáveis, mas não bloqueantes para um lançamento seguro. A ordem numérica continua única entre os dois grupos.

## Gate concluído — G01

> **G01 — Backup restaurado sobrescrito silenciosamente por autosave pendente no mobile**
>
> **Status:** Concluído.
>
> **Origem:** run autenticado do PR #80.
>
> **Resolução:** PR #82, com suspensão dos autosaves durante a restauração e reidratação segura; round-trip autenticado estabilizado no PR #88 e fixture histórica isolada no PR #93.
>
> **Resultado:** o backup restaurado não é mais sobrescrito por estado pendente. C05 e C07 foram fechados após execução autenticada integralmente verde.

G01 continua fora da numeração porque é um defeito resolvido, não uma entrega de produto. Ele não bloqueia mais C05 ou N05.

## Fases sugeridas

As fases acrescentam uma camada de planejamento sobre a sequência. Elas não transformam uma fase em uma única versão ou em um único PR.

| Fase | Posições | Objetivo | Sugestão de PRs/fatias |
|---|---:|---|---|
| Fase 0 — Fundação entregue | 1–10 | Registrar bases, gates e C24 já concluídos. | Nenhum PR novo; os itens permanecem como referência histórica. |
| Fase 1 — Integridade e gate de lançamento | 11–16 | Registrar C22, C23 e C28 já entregues; concluir auditoria de segurança, documentação e o gate público. | C14 e C16 em escopos próprios; C25 encerra o grupo A. |
| Fase 2 — Comunicação e motor nutricional Beta | 17–22 | Entregar notificações locais, voz e estabilizar score, avaliação, prompts e porções como recursos Beta pós-lançamento. | C26 em C26-A e C26-B; N01 próprio; C20/C19/C08 preservam sua ordem; C21 depende de C20. |
| Fase 3 — Entradas e serviços | 23–28 | Reaproveitar C24 em rótulos e preparar comunicação, feedback, relatórios e compartilhamento. | N03 reaproveita a infraestrutura de imagem; N09 e C17 separados; C13 próprio; C10 pode exigir várias fatias; N07 somente após C10. |
| Fase 4 — Dados e inteligência adaptativa | 29–30 | Ampliar a base nutricional e recalibrar metas com histórico confiável. | N02 em fonte/licença, normalização, cache e integração; N05 em cálculo, UX e validação longitudinal. |
| Fase 5 — Arquitetura, widgets, receitas e planejamento | 31–34 | Consolidar manutenibilidade antes de novos domínios e componentes nativos mais acoplados. | C15 em vários PRs pequenos; C27 entrega apenas o widget de atalho; N04 e N06 permanecem faseados. |
| Fase 6 — Plataformas, saúde e atividade | 35–37 | Expandir para iOS e integrações de saúde antes de ligar exercícios às metas. | C12 e C18 separados por plataforma; N08 somente após N05 e C18. |

> **Aviso de planejamento:** as fases e sugestões de PRs/fatias são apenas uma estrutura de planejamento. A divisão real continua sendo decidida item a item, durante a Tarefa 0 correspondente, considerando a auditoria do código, os riscos, as dependências e os critérios de validação.

## Sequência única de implementação

| Posição | ID | Item | Estado atual | Motivo da posição |
|---:|:---:|---|---|---|
| 1 | C02 | Higiene de secrets | Concluído | Base de segurança entregue e preservada. |
| 2 | C03 | Startup seguro e loading estável | Concluído | Fundação de inicialização entregue. |
| 3 | C04 | Preflight/release check integrado ao CI | Concluído | Gate automatizado sustenta as entregas seguintes. |
| 4 | C11 | Layout mobile de Métricas | Concluído | Ajuste mobile entregue e mantido. |
| 5 | C09 | Backend gerenciado de IA | Concluído | Worker Gemini entregue no PR #79 e ampliado para multimodal em C24. |
| 6 | C01 | Textos, datas, mojibake e bugs visuais do escopo aprovado | Concluído | Encoding, datas civis e virada reativa da meia-noite concluídos nos PRs #83–#85. D03, D05 e D10 permanecem itens separados. |
| 7 | C06 | Política pública de privacidade e exclusão | Concluído | Política trilíngue publicada nos PRs #86–#87 e atualizada para fotos no PR #95; Data Safety e região do Firestore confirmados. |
| 8 | C05 | Backup seguro e round-trip real | Concluído | G01 corrigido no PR #82; round-trip autenticado estabilizado nos PRs #88 e #93. |
| 9 | C07 | Testes autenticados e CI verde | Concluído | Suite autenticada estabilizada no PR #88 e mantida verde nas entregas posteriores. |
| 10 | C24 | Reconhecimento de refeição por imagem | Concluído fora de ordem | Priorizado explicitamente; PRs #89–#97 cobrem contrato, Worker, captura, revisão, persistência, compliance, validação física e navegação real. |
| 11 | C22 | Exclusão completa e idempotente da conta | Concluído | Saga administrativa idempotente, App Check, fila/reconciliação e validação destrutiva em produção concluídas nos PRs #99–#106. |
| 12 | C23 | Corte da migração legada e fechamento das rules | Concluído | Inventário e migração administrativos, corte do cliente, observação de 7 dias, export de segurança, exclusão verificada e fechamento definitivo das rules concluídos nos PRs #107–#111. |
| 13 | C28 | Arquitetura offline-first e cache local | Concluído | SDK modular, App Check, cache persistente, lifecycle, loaders cache-first, escrita offline, granularização do A09, backup e rollout concluídos nos PRs #113–#124; fecha o checkpoint `0.10.0-beta` com C22 e C23. |
| 14 | C14 | Revisão geral de segurança | Parcial — indispensável | Consolida autenticação, exclusão, rules, Worker e superfícies nativas sobre a arquitetura estabilizada por C28. |
| 15 | C16 | Documentação técnica e de manutenção | Parcial — indispensável | Deve documentar os contratos finais de arquitetura, segurança e operação após C14. |
| 16 | C25 | Gate da versão pública | Parcial — indispensável | C05, C06 e C07 estão fechados; encerra o grupo A após C14 e C16. |
| 17 | C26 | Sistema de notificações | Parcial — pós-lançamento | O toast interno já existe; C26-A e C26-B são melhorias relevantes, mas não bloqueiam um lançamento público seguro. |
| 18 | N01 | Registro por voz | Não iniciado — pós-lançamento | Reutiliza C09 e o pipeline de descrição; baixa/média complexidade. |
| 19 | C20 | Fechar e calibrar motor de pontuação 0–5 | **Concluído** — PRs #129, #131, #132, #134 e C20-E | Motor `meal-score-v2` calibrado, integrado e validado em PT/EN/ES; base estabilizada para C19 e C21. |
| 20 | C19 | Concluir avaliação de refeição e aceite UX | **Concluído** — PRs #137, #139, #140, #142 e C19-E | Avaliação opcional estabilizada nos fluxos manual e por foto; snapshots aceitos têm integridade conservadora, aparecem agrupados no Diário e foram validados em PT/EN/ES, desktop/mobile e legado/Vite. |
| 21 | C08 | Revisar prompts e critérios nutricionais da IA | Parcial — pós-lançamento Beta | Deve refletir os critérios estabilizados em C19/C20. |
| 22 | C21 | Porções fracionadas no GA | Não iniciado — pós-lançamento | Depende de C20 e de passos unitários coerentes. |
| 23 | N03 | Leitura de rótulo nutricional por foto | Não iniciado — pós-lançamento | Pode reutilizar captura, pré-processamento, Worker multimodal e revisão criados em C24. |
| 24 | N09 | Jejum intermitente | Não iniciado — pós-lançamento | Sem dependência bloqueante; complexidade média. Futuramente informa C26 sobre lembretes a suprimir durante o jejum. |
| 25 | C17 | E-mails automáticos por idioma | Parcial — pós-lançamento | Pode reutilizar preferências, idioma, consentimento e horários definidos em C26, embora notificações locais não dependam de e-mail. |
| 26 | C13 | Feedback nativo com anexos | Não iniciado — pós-lançamento | C06 está concluído; permanece depois de C22 por envolver novos dados e anexos. |
| 27 | C10 | Relatórios Python/HTTPS em produção | Parcial — pós-lançamento | Exige infraestrutura e operação documentadas; prepara N07. |
| 28 | N07 | Compartilhamento profissional mínimo | Não iniciado — pós-lançamento | Depende de C10; C06 já está satisfeito. |
| 29 | N02 | Banco nutricional mais profundo | Não iniciado — pós-lançamento | Exige fonte/licença, normalização, cache e integração; aprimorará C24 e N03 sem reabrir suas primeiras versões. |
| 30 | N05 | Recalibração dinâmica do gasto calórico | Não iniciado — pós-lançamento | G01, C01 e C05 já estão concluídos; resta modelagem, UX e validação longitudinal. |
| 31 | C15 | Refatoração, modularização e limpeza do legado | Parcial — pós-lançamento | C28 já estabilizou a arquitetura de dados, mas a limpeza é uma entrega de manutenibilidade extensa e não bloqueia um lançamento público seguro. Permanece antes de C27, N04, N06, C12, C18 e N08. |
| 32 | C27 | Widgets de tela inicial | Não iniciado — pós-lançamento | O escopo atual entrega apenas a versão A, widget de atalho. A versão funcional depende da consolidação concluída em C15 e do contrato de reagendamento de C26. |
| 33 | N04 | Sistema de receitas | Não iniciado — pós-lançamento | Depende de N02, C21 e da consolidação de C15. |
| 34 | N06 | Planejamento alimentar e lista de compras | Não iniciado — pós-lançamento | Depende do sistema de receitas N04. |
| 35 | C12 | Aplicativo iOS via Capacitor | Parcial — pós-lançamento | A base Capacitor está madura no Android; iOS permanece após C15 por exigir nova plataforma, assinatura e publicação. |
| 36 | C18 | Health Connect, HealthKit e Samsung Health | Não iniciado — pós-lançamento | HealthKit depende de C12; integrações devem evitar fontes duplicadas. |
| 37 | N08 | Exercícios, rotinas e hábitos | Não iniciado — pós-lançamento | Depende de N05 e C18 para não duplicar gasto vindo de atividade declarada, sensores e integrações. |

## C23 — Fechamento concluído e compatibilidade preservada

O corte do armazenamento legado foi concluído administrativamente, sem depender do login dos usuários. O inventário paginado e fail-closed classificou todos os documentos; 54 documentos legados foram copiados ou mesclados e tiveram seus destinos canônicos verificados individualmente. Depois da janela de observação de 7 dias, um export gerenciado completo foi confirmado antes da exclusão transacional desses mesmos 54 documentos. A verificação final encontrou zero documentos legados, e as rules de produção passaram a negar leitura e escrita nos caminhos antigos.

O export de segurança está em `gs://trofia-firestore-exports-128834310181/c23-before-legacy-delete-20260827T163200Z`. O bucket dedicado fica em Madrid (`EUROPE-SOUTHWEST1`) e possui lifecycle de exclusão automática para objetos com 90 dias.

A compatibilidade necessária permanece deliberadamente isolada dos caminhos ativos:

- novos backups exportam somente as seções canônicas `root` e `data`;
- a importação continua aceitando backups históricos em formato plano e backups versionados que contenham a seção `legacy`, promovendo seu conteúdo aos destinos canônicos;
- a exclusão administrativa do C22 continua procurando, removendo e verificando documentos órfãos no padrão legado `nutrition/{uid}_*`, como defesa para contas ou resíduos fora do inventário conhecido;
- essas garantias não reabrem leitura, escrita, migração automática nem exclusão legada pelo cliente.

## C15 — Decisões já aprovadas para o futuro

C15 permanece no grupo B e não deve ser iniciado por inferência. Quando sua Tarefa 0 de implementação for retomada, duas decisões de encerramento já estão aprovadas:

1. a suíte legado — loader clássico e matriz visual legado/Vite — será aposentada definitivamente assim que o cutover do C15 fechar; ela não continuará como referência congelada depois disso;
2. a importação retrocompatível de backups antigos será mantida por duas versões públicas após o fechamento do C15 e então removida em uma mudança explicitamente anunciada e testada.

Até o cutover final do C15, ambos continuam ativos para proteger a paridade observável e a recuperação de dados históricos.

## C26 — Escopo aprovado de notificações

### C26-A — Toast interno

Primeira entrega, de baixa complexidade:

- respeitar a safe area do notch/barra de status;
- revisar posição e animação do toast de conquista;
- aumentar o volume do som dentro de limite seguro e respeitando o volume do dispositivo;
- usar `@capacitor/haptics` para vibração nativa no Android, com fallback silencioso onde não houver suporte;
- preservar a fila atual de conquistas e o comportamento web.

### C26-B — Lembretes locais

Segunda entrega, de complexidade média/alta, usando `@capacitor/local-notifications` e sem servidor:

- consentimento explícito e preferências por tipo de lembrete;
- período ativo e janela silenciosa;
- lembrete de água distribuído conforme déficit, meta e horário restante;
- mensagem motivacional no início do dia;
- check-ins de meio e fim do dia com o último progresso conhecido;
- cancelamento e reagendamento quando água, meta, idioma, fuso ou preferências mudarem;
- abertura da área correta do app ao tocar na notificação;
- preferência por agendamento inexato para não exigir alarmes exatos em lembretes não críticos.

### C26-C — Push/backend adiado

Push remoto, FCM, tokens por dispositivo e agendamento em servidor não fazem parte do MVP. Essa fase fica deliberadamente adiada até a validação de C26-B. Se retomada, exige nova Tarefa 0 para infraestrutura, consentimento, política de privacidade, Data Safety, retenção/exclusão de tokens e relação com C17.

## C27 — Escopo aprovado de widgets

### Versão A — Widget de atalho

Única versão autorizada por enquanto:

- widget Android nativo simples;
- abre o Trofia diretamente em uma área específica;
- implementação com `AppWidgetProvider`/`RemoteViews`, recursos Android e contrato mínimo de navegação com o app Capacitor;
- sem leitura ou gravação de dados nutricionais fora da WebView.

### Versão B — Widget funcional adiado

A ação direta `+250 ml` sem abrir o app não faz parte do escopo atual. Ela fica deliberadamente adiada até:

1. C15 estabilizar a fronteira entre controlador, persistência JS/Firebase e módulos nativos;
2. C26 definir o contrato de reagendamento dos lembretes de água;
3. uma Tarefa 0 aprovar uma fonte de verdade compartilhada que impeça duplicação, perda ou divergência de registros.

A futura versão B exigirá módulo nativo Android, persistência compartilhada e sincronização segura; não deve ser tratada como simples extensão visual da versão A.

## Decisões de ordenação

- **Linha de lançamento público:** as posições 1–16 formam o grupo A; funcionalidades Beta e trabalhos de manutenibilidade pós-lançamento começam na posição 17, no grupo B.
- **C28 antes de C15:** a arquitetura offline-first está concluída; C15 pode agora remover pontes e duplicações sem limpar código que ainda seria reescrito.
- **C24 concluído fora de ordem:** C19 e N02 passam a ser melhorias futuras de critérios e cobertura nutricional, não condições para reabrir C24.
- **N03 antecipado por reutilização:** a infraestrutura difícil de imagem já existe em C24.
- **C26 antes de C17:** notificações locais não dependem de e-mail, mas preferências de comunicação podem ser compartilhadas depois.
- **C26-C não está implícito em C26-B:** push/backend só volta ao plano após validação do MVP local e nova aprovação.
- **C27 entrega apenas a versão A:** a versão B não começa junto e não é necessária para considerar o primeiro widget entregue.
- **C15 permanece no pós-lançamento:** a estimativa de 6–10 semanas e 8–12 PRs caracteriza uma entrega ampla de manutenibilidade, não um bloqueador equivalente a C22, C23 ou C28.
- **C20, C19 e C08 permanecem no pós-lançamento:** a cadeia de dependência interna é preservada, mas os três evoluem publicamente como recursos Beta e não bloqueiam C14, C16 ou C25.
- **N04 espera N02, C21 e C15; N06 espera N04.**
- **N08 espera N05 e C18:** a ordem evita dupla contagem de gasto calórico.

## Participação externa e itens a reavaliar

- **Dependem de ação ou decisão do responsável:** C10 (infraestrutura HTTPS), C12 (conta, certificados e publicação Apple), C17 (domínio/provedor/consentimento), C18 (contas e configuração das plataformas), C26 (horários, textos, intensidade e opt-in) e qualquer fase que introduza custo, credenciais ou novos termos.
- **Podem avançar tecnicamente após seus gates:** C08, C13–C16, C19–C23, C25–C27 e N01–N09, ressalvadas aprovações de UX, conteúdo, fornecedores e escopo.
- **Decisões deliberadamente adiadas:** C26-C e C27 versão B permanecem visíveis neste documento e não devem ser iniciados por inferência durante as fases anteriores.
- **Itens de valor a revalidar:** C12 pode continuar parcial sem decisão de publicação iOS; C17 deve avançar apenas com necessidade transacional clara; N08 deve evitar transformar o Trofia em uma plataforma fitness genérica.
