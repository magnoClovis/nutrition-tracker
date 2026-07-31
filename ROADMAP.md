# Roadmap consolidado do Trofia

Estado consolidado em 31/07/2026. Este documento reúne os itens C01–C25 e N01–N09 em uma única sequência de implementação. A posição considera dependências técnicas e recomendadas, segurança e conformidade, complexidade crescente quando não há dependência real e a participação externa necessária.

## Gate obrigatório em andamento — G01

> **G01 — Backup restaurado sobrescrito silenciosamente por autosave pendente no mobile**  
> **Status:** Parcial — correção em andamento.  
> **Origem:** run autenticado do PR #80.  
> **Risco:** perda silenciosa dos dados que o usuário acabou de restaurar.  
> **Gate:** precisa estar corrigido e coberto por teste antes de **C05 — Backup seguro e round-trip real** e **N05 — Recalibração dinâmica do gasto calórico**. O fluxo de importação deve suspender ou cancelar autosaves pendentes durante e imediatamente após a restauração, impedindo que um estado antigo ou vazio sobrescreva o backup importado.

G01 fica fora da numeração dos 34 itens porque é um defeito ativo e bloqueante, não uma nova entrega de roadmap.

## Fases sugeridas

As fases abaixo acrescentam uma camada de planejamento sobre a sequência aprovada. Elas não alteram a ordem numérica nem as dependências registradas na tabela.

| Fase | Posições | Objetivo | Sugestão de PRs/fatias |
|---|---:|---|---|
| Fase 0 — Fundação entregue | 1–5 | Registrar as bases já concluídas: secrets, startup, CI, Métricas mobile e backend de IA. | Nenhum PR novo; os itens permanecem como referência histórica. |
| Fase 1 — Integridade, compliance e gate de versão | 6–14 | Resolver as pendências que impedem uma base segura e verificável. | G01 em PR urgente próprio; C01 em PR pequeno; C06 separado por envolver texto e aprovação; C05 e C07 em PRs sequenciais; C22 e C23 separados pelo risco; C14, C16 e C25 podem fechar a fase em um PR documental/de verificação se a Tarefa 0 confirmar escopo pequeno. |
| Fase 2 — Motor nutricional e critérios de IA | 15–18 | Estabilizar pontuação, avaliação, prompts e porções. | C20 e C19 podem compartilhar um PR com fatias distintas; C08 em fatia ou PR próprio; C21 provavelmente em PR próprio devido ao impacto transversal. |
| Fase 3 — Funcionalidades incrementais e serviços | 19–24 | Entregar recursos relativamente isolados e preparar relatórios e compartilhamento. | N01 e N09 em PRs próprios; C17 separado por infraestrutura externa; C10 pode exigir várias fatias no mesmo PR; N07 somente depois de C10; C13 em PR próprio. |
| Fase 4 — Dados nutricionais e inteligência adaptativa | 25–27 | Ampliar formas de entrada, profundidade dos dados e personalização das metas. | N03 em PR próprio; N02 provavelmente dividido em vários PRs — fonte/licença, normalização, cache e integração; N05 também pode exigir vários PRs — cálculo, histórico, UX e validação longitudinal. |
| Fase 5 — Arquitetura, receitas e planejamento | 28–30 | Preparar a arquitetura para domínios mais complexos e implementar receitas e planejamento. | C15 deve ser um programa com vários PRs pequenos de extração/cutover; N04 provavelmente vários PRs por fases; N06 somente depois da base de receitas e também pode ser faseado. |
| Fase 6 — Expansão nativa, multimodal e saúde | 31–34 | Ampliar plataformas, reconhecimento visual, integrações de saúde e atividade física. | C12 em vários PRs de preparação, build e publicação; C24 dividido entre captura, IA, revisão e persistência; C18 separado por plataforma; N08 em vários PRs após estabilizar N05 e C18. |

> **Aviso de planejamento:** as fases e sugestões de PRs/fatias são apenas uma estrutura de planejamento. A divisão real continua sendo decidida item a item, durante a Tarefa 0 correspondente, considerando a auditoria do código, os riscos, as dependências e os critérios de validação. Uma fase não representa necessariamente uma única versão ou um único PR.

## Sequência única de implementação

| Posição | ID | Item | Estado atual | Motivo da posição |
|---:|:---:|---|---|---|
| 1 | C02 | Higiene de secrets | Concluído | Base de segurança já entregue; item independente e de baixa complexidade. |
| 2 | C03 | Startup seguro e loading estável | Concluído | Fundação de inicialização já entregue; independente e de baixa complexidade. |
| 3 | C04 | Preflight/release check integrado ao CI | Concluído | Gate automatizado que sustenta as verificações das entregas seguintes. |
| 4 | C11 | Layout mobile de Métricas | Concluído | Ajuste independente já entregue, mantido na faixa inicial de baixa/média complexidade. |
| 5 | C09 | Backend gerenciado de IA | Concluído | Infraestrutura necessária para voz, revisão de prompts e futuras entradas multimodais. |
| 6 | C01 | Textos, datas, mojibake e bugs visuais restantes | Parcial | Sem dependência bloqueante e relativamente pequeno; as correções de data devem anteceder N05. |
| 7 | C06 | Política pública de privacidade e exclusão | Não iniciado | Gate de conformidade antes de novas funcionalidades ou novos tratamentos de dados. |
| 8 | C05 | Backup seguro e round-trip real | Parcial | Depende obrigatoriamente da correção de G01; integridade dos dados vem antes da expansão funcional. |
| 9 | C07 | Testes autenticados e CI verde | Parcial | Deve validar o comportamento de backup já corrigido em G01/C05 e fechar o gate de qualidade. |
| 10 | C22 | Exclusão completa e idempotente da conta | Parcial | Vem após política e testes; estabiliza a remoção de dados antes de novos esquemas e integrações. |
| 11 | C23 | Corte da migração legada e fechamento das rules | Parcial | Depende da exclusão completa e do encerramento seguro dos caminhos legados. |
| 12 | C14 | Revisão geral de segurança | Parcial | Consolida os contratos de política, exclusão, rules e testes antes da retomada de produto. |
| 13 | C16 | Documentação técnica e de manutenção | Parcial | Documenta os contratos finais de segurança e operação antes do gate de versão. |
| 14 | C25 | Gate da próxima versão beta/estável | Parcial | Depende de C05, C06, C07, C14 e C16; encerra o congelamento de funcionalidades com uma base verificável. |
| 15 | C20 | Fechar e calibrar motor de pontuação 0–5 | Parcial | Primeira evolução funcional após os gates; é base para C19 e C21. |
| 16 | C19 | Concluir avaliação de refeição e aceite UX | Parcial | Depende da calibração do motor em C20. |
| 17 | C08 | Revisar prompts e critérios nutricionais da IA | Parcial | Vem após a estabilização do score e da avaliação para manter critérios coerentes. |
| 18 | C21 | Porções fracionadas no GA | Não iniciado | Depende de C20 e de passos unitários coerentes no motor nutricional. |
| 19 | N01 | Registro por voz | Não iniciado | Reutiliza C09 e o pipeline existente de descrição; é a menor entrega competitiva estimada. |
| 20 | N09 | Jejum intermitente | Não iniciado | Sem dependência funcional bloqueante; fica neste grupo por complexidade e organização da sequência. |
| 21 | C17 | E-mails automáticos por idioma | Parcial | Sem dependência com N09; ocupa a mesma faixa de complexidade, mas exige infraestrutura, consentimento e configuração externa. |
| 22 | C10 | Relatórios Python/HTTPS em produção | Parcial | Vem após C16 porque exige operação e deploy documentados; prepara o compartilhamento profissional. |
| 23 | N07 | Compartilhamento profissional mínimo | Não iniciado | Depende de C10 para os relatórios e de C06 para os termos de privacidade e compartilhamento. |
| 24 | C13 | Feedback nativo com anexos | Não iniciado | Posicionado após C22 e C06 porque anexos precisam de política e exclusão de dados consistentes. |
| 25 | N03 | Leitura de rótulo nutricional por foto | Não iniciado | Pode preencher o esquema nutricional atual sem depender de N02; é menor que a expansão completa do banco. |
| 26 | N02 | Banco nutricional mais profundo | Não iniciado | Exige maior trabalho de normalização, cache, cobertura e licenciamento; prepara receitas e melhora recursos multimodais. |
| 27 | N05 | Recalibração dinâmica do gasto calórico | Não iniciado | Depende de G01/C05 para histórico confiável e das correções de data de C01. |
| 28 | C15 | Refatoração, modularização e limpeza do legado | Parcial | Trabalho de alta complexidade; não bloqueia entregas isoladas, mas deve preceder expansões nativas e domínios mais profundos. |
| 29 | N04 | Sistema de receitas | Não iniciado | Depende de N02 para alimentos normalizados e de C21 para porções coerentes; beneficia-se da modularização de C15. |
| 30 | N06 | Planejamento alimentar e lista de compras | Não iniciado | Depende do sistema de receitas N04. |
| 31 | C12 | Aplicativo iOS via Capacitor | Parcial | Depende da consolidação arquitetural de C15 antes de ampliar a manutenção nativa. |
| 32 | C24 | Reconhecimento de refeição por imagem | Não iniciado | Usa C09 e deve aproveitar critérios de C19 e a cobertura nutricional ampliada de N02. |
| 33 | C18 | Health Connect, HealthKit e Samsung Health | Não iniciado | Vem após C12 porque o escopo consolidado inclui HealthKit e, portanto, a base iOS. |
| 34 | N08 | Exercícios, rotinas e hábitos | Não iniciado | Depende de N05 e C18 para ligar atividade às metas sem dupla contagem de gasto calórico. |

## Decisões de ordenação

- **Segurança e conformidade antes de produto:** G01 e os itens C05, C06, C07, C14 e C25 formam o gate para retomar novas funcionalidades com dados confiáveis, política publicada e CI autenticado estável.
- **C25 não encerra o roadmap:** a posição 14 representa o gate para uma nova beta/estável segura. Não significa que todos os itens posteriores precisem entrar na mesma versão.
- **C15 não é bloqueador universal:** o cutover para Vite e as extrações já realizadas permitem implementar entregas isoladas antes da remoção total do legado. Tornar C15 pré-requisito de N01, N03 ou N05 bloquearia trabalho sem necessidade técnica. Ele permanece antes das expansões arquiteturais e nativas mais profundas.
- **N03 vem antes de N02:** o OCR de rótulos pode ler valores impressos e preencher o esquema atual. Um banco mais profundo melhora o ecossistema, mas não é necessário para a primeira versão do recurso.
- **N04 espera N02 e C21:** receitas precisam de alimentos normalizados e de uma representação coerente de quantidades e porções.
- **N08 espera N05 e C18:** ligar exercícios às metas antes da recalibração e das integrações de saúde aumentaria o risco de contar duas vezes o gasto vindo de METs, sensores e do fator de atividade atual.
- **N09 e C17 não têm dependência entre si:** as posições 20 e 21 refletem agrupamento por faixa de complexidade e necessidades operacionais, não uma relação de precedência técnica.
- **Dependências recomendadas contam como reais:** quando a auditoria indicou uma dependência como fortemente recomendada, a sequência a trata como obrigatória para evitar retrabalho e inconsistência de dados.

## Participação externa e itens a reavaliar

- **Dependem de ação ou decisão do desenvolvedor:** C06 (texto e publicação da política), C10 (infraestrutura HTTPS), C12 (conta, certificados e publicação Apple), C17 (domínio, provedor e consentimento de e-mail), C18 (contas e configuração das plataformas de saúde) e qualquer recurso que introduza custo, credenciais ou novos termos de uso.
- **Podem avançar tecnicamente de forma autônoma após seus gates:** C01, C05, C07, C08, C14, C15, C16, C19–C25 e N01–N09, ressalvadas as aprovações de UX, conteúdo, fornecedores e escopo já indicadas em cada auditoria.
- **Não remover automaticamente do roadmap:** itens cujo valor possa ter mudado devem ser reavaliados no início da respectiva fatia. C12 pode continuar parcial enquanto não houver decisão de publicação iOS; C17 só deve avançar com uma necessidade transacional clara; N08 deve permanecer limitado ao escopo que não duplique plataformas de saúde ou transforme o Trofia em uma rede social/fitness genérica.
