# Roadmap consolidado do Trofia

Estado reavaliado em 18/08/2026. Este documento reúne os itens C01–C27 e N01–N09 em uma única sequência de 36 posições. A ordem considera o estado real da `main`, dependências técnicas e recomendadas, segurança, conformidade, complexidade e participação externa necessária.

Os itens concluídos permanecem no início como registro histórico. Os itens pendentes começam na posição 11. C24 aparece entre os concluídos porque foi implementado fora da ordem anterior por decisão explícita do responsável.

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
| Fase 1 — Integridade, segurança e gate de versão | 11–15 | Fechar exclusão, migração legada, segurança, documentação e o gate da próxima versão. | C22 e C23 em PRs separados; C14 e C16 após os contratos estabilizarem; C25 encerra a fase. |
| Fase 2 — Comunicação local e motor nutricional | 16–21 | Entregar notificações locais, voz e estabilizar score, avaliação, prompts e porções. | C26 em C26-A e C26-B; N01 em PR próprio; C20/C19/C08/C21 em fatias sequenciais. |
| Fase 3 — Entradas e serviços | 22–27 | Reaproveitar C24 em rótulos, avançar recursos independentes e preparar relatórios/compartilhamento. | N03 reaproveita a infraestrutura de imagem; N09 e C17 separados; C13 próprio; C10 pode exigir várias fatias; N07 somente após C10. |
| Fase 4 — Dados e inteligência adaptativa | 28–29 | Ampliar a base nutricional e recalibrar metas com histórico confiável. | N02 em fonte/licença, normalização, cache e integração; N05 em cálculo, UX e validação longitudinal. |
| Fase 5 — Arquitetura, widgets, receitas e planejamento | 30–33 | Consolidar a arquitetura antes de novos domínios e componentes nativos. | C15 em vários PRs pequenos; C27 entrega apenas o widget de atalho; N04 e N06 permanecem faseados. |
| Fase 6 — Plataformas, saúde e atividade | 34–36 | Expandir para iOS e integrações de saúde antes de ligar exercícios às metas. | C12 e C18 separados por plataforma; N08 somente após N05 e C18. |

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
| 11 | C22 | Exclusão completa e idempotente da conta | Parcial | Próximo gate de integridade e privacidade; risco crítico foi corrigido no PR #18, mas falta garantir remoção integral e repetível. |
| 12 | C23 | Corte da migração legada e fechamento das rules | Parcial | Depende da exclusão completa de C22 e do encerramento seguro dos caminhos antigos. |
| 13 | C14 | Revisão geral de segurança | Parcial | Consolida autenticação, exclusão, rules, Worker e superfícies nativas após C23. |
| 14 | C16 | Documentação técnica e de manutenção | Parcial | Deve documentar os contratos finais de segurança e operação após C14. |
| 15 | C25 | Gate da próxima versão beta/estável | Parcial | C05, C06 e C07 estão fechados; depende principalmente de C14 e C16. |
| 16 | C26 | Sistema de notificações | Parcial | O toast interno já existe; é a menor entrega restante e cria preferências reutilizáveis por C17. C26-A e C26-B são o escopo aprovado. |
| 17 | N01 | Registro por voz | Não iniciado | Reutiliza C09 e o pipeline de descrição; baixa/média complexidade. |
| 18 | C20 | Fechar e calibrar motor de pontuação 0–5 | Parcial | Base para C19 e C21. |
| 19 | C19 | Concluir avaliação de refeição e aceite UX | Parcial | Depende de C20; o editor compartilhado de C24 reduz retrabalho. |
| 20 | C08 | Revisar prompts e critérios nutricionais da IA | Parcial | Deve refletir os critérios estabilizados em C19/C20. |
| 21 | C21 | Porções fracionadas no GA | Não iniciado | Depende de C20 e de passos unitários coerentes. |
| 22 | N03 | Leitura de rótulo nutricional por foto | Não iniciado | Antecipado porque pode reutilizar captura, pré-processamento, Worker multimodal e revisão criados em C24. |
| 23 | N09 | Jejum intermitente | Não iniciado | Sem dependência bloqueante; complexidade média. Futuramente informa C26 sobre lembretes a suprimir durante o jejum. |
| 24 | C17 | E-mails automáticos por idioma | Parcial | Pode reutilizar preferências, idioma, consentimento e horários definidos em C26, embora notificações locais não dependam de e-mail. |
| 25 | C13 | Feedback nativo com anexos | Não iniciado | C06 está concluído; permanece depois de C22 por envolver novos dados e anexos. |
| 26 | C10 | Relatórios Python/HTTPS em produção | Parcial | Exige infraestrutura e operação documentadas; prepara N07. |
| 27 | N07 | Compartilhamento profissional mínimo | Não iniciado | Depende de C10; C06 já está satisfeito. |
| 28 | N02 | Banco nutricional mais profundo | Não iniciado | Exige fonte/licença, normalização, cache e integração; aprimorará C24 e N03 sem reabrir suas primeiras versões. |
| 29 | N05 | Recalibração dinâmica do gasto calórico | Não iniciado | G01, C01 e C05 já estão concluídos; resta modelagem, UX e validação longitudinal. |
| 30 | C15 | Refatoração, modularização e limpeza do legado | Parcial | Muitas extrações já foram entregues, mas a fronteira entre controlador, persistência e plataformas deve estabilizar antes das expansões seguintes. |
| 31 | C27 | Widgets de tela inicial | Não iniciado | O escopo atual entrega apenas a versão A, widget de atalho. A versão funcional depende de C15 e do contrato de reagendamento de C26. |
| 32 | N04 | Sistema de receitas | Não iniciado | Depende de N02, C21 e da consolidação de C15. |
| 33 | N06 | Planejamento alimentar e lista de compras | Não iniciado | Depende do sistema de receitas N04. |
| 34 | C12 | Aplicativo iOS via Capacitor | Parcial | A base Capacitor está madura no Android; iOS permanece após C15 por exigir nova plataforma, assinatura e publicação. |
| 35 | C18 | Health Connect, HealthKit e Samsung Health | Não iniciado | HealthKit depende de C12; integrações devem evitar fontes duplicadas. |
| 36 | N08 | Exercícios, rotinas e hábitos | Não iniciado | Depende de N05 e C18 para não duplicar gasto vindo de atividade declarada, sensores e integrações. |

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

- **Segurança antes da próxima expansão:** C22–C25 fecham exclusão, legado, segurança, documentação e gate de versão antes dos novos itens pendentes.
- **C24 concluído fora de ordem:** C19 e N02 passam a ser melhorias futuras de critérios e cobertura nutricional, não condições para reabrir C24.
- **N03 antecipado por reutilização:** a infraestrutura difícil de imagem já existe em C24.
- **C26 antes de C17:** notificações locais não dependem de e-mail, mas preferências de comunicação podem ser compartilhadas depois.
- **C26-C não está implícito em C26-B:** push/backend só volta ao plano após validação do MVP local e nova aprovação.
- **C27 entrega apenas a versão A:** a versão B não começa junto e não é necessária para considerar o primeiro widget entregue.
- **C15 não é bloqueador universal:** continua depois de entregas isoladas, mas antes de widgets com persistência nativa, receitas, planejamento e expansão iOS.
- **N04 espera N02, C21 e C15; N06 espera N04.**
- **N08 espera N05 e C18:** a ordem evita dupla contagem de gasto calórico.

## Participação externa e itens a reavaliar

- **Dependem de ação ou decisão do responsável:** C10 (infraestrutura HTTPS), C12 (conta, certificados e publicação Apple), C17 (domínio/provedor/consentimento), C18 (contas e configuração das plataformas), C26 (horários, textos, intensidade e opt-in) e qualquer fase que introduza custo, credenciais ou novos termos.
- **Podem avançar tecnicamente após seus gates:** C08, C13–C16, C19–C23, C25–C27 e N01–N09, ressalvadas aprovações de UX, conteúdo, fornecedores e escopo.
- **Decisões deliberadamente adiadas:** C26-C e C27 versão B permanecem visíveis neste documento e não devem ser iniciados por inferência durante as fases anteriores.
- **Itens de valor a revalidar:** C12 pode continuar parcial sem decisão de publicação iOS; C17 deve avançar apenas com necessidade transacional clara; N08 deve evitar transformar o Trofia em uma plataforma fitness genérica.
