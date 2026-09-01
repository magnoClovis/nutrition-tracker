# Resumo de status do Trofia

> Retrato do checkpoint `0.11.0-beta`, atualizado sobre a `main` no commit `141da41`, em 01/09/2026. Este resumo prioriza fatos verificáveis no repositório e nos PRs; não substitui o roadmap.

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

- **C14-A — integridade de leituras e backup:** `fetchDataDoc()` e `listDataKeys()` passam a propagar falhas explicitamente, sem cachear ausência falsa. A exportação de conta falha por inteiro se qualquer leitura canônica não puder ser comprovada, em vez de gerar backup silenciosamente incompleto.
- C20, C19 e C08 continuam concluídos; a suspensão temporária da build 11 não reabre esses itens.
- **Organização documental:** o índice inicial foi mesclado no PR #153; o filtro que evita a suíte pesada em PRs exclusivamente documentais foi mesclado no PR #155.

## O que está apenas planejado, ainda sem código completo

### Indispensável antes do lançamento público

- **C14:** revisão geral de segurança — em andamento; C14-A implementa leituras e backup fail-closed, enquanto C14-B a C14-H aguardam decisões e autorização específicas.
- **C16:** documentação técnica e de manutenção — parcial; esta pasta ajuda, mas não equivale à conclusão integral do item.
- **C25:** gate da versão pública — parcial e dependente de C14/C16.

### Backlog pós-lançamento

- **Sequência visual desta frente:** S1–S6, S7a, S8 e S9 estão implementadas. A aplicação S7b do `NumericField` às medidas corporais continua fora da `main` no PR draft #150; por isso, a sequência S1–S9 ainda não pode ser considerada integralmente concluída. I1–I7 permanecem planejadas e cada novo tipo visual exige protótipo aprovado antes de código.
- C26 notificações, N01 voz, C21 porções fracionadas, N03 leitura de rótulos, N09 jejum, C17 e-mails, C13 feedback nativo, C10 relatórios, N07 compartilhamento profissional, N02 banco nutricional, N05 recalibração dinâmica, C15 limpeza ampla do legado, C27 widgets, N04 receitas, N06 planejamento alimentar, C12 iOS, C18 integrações de saúde e N08 exercícios/hábitos.
- Partes deliberadamente adiadas: C26-C (push/backend) e C27-B (widget funcional com escrita direta).
- Revisão externa por nutricionista e eventual comparação/troca do modelo Gemini permanecem decisões futuras registradas em `PENDENCIAS.md`.

## Onde aprofundar

- Estado por item: [`ROADMAP.md`](ROADMAP.md).
- Releases: [`VERSIONING.md`](VERSIONING.md).
- Decisões adiadas: [`PENDENCIAS.md`](PENDENCIAS.md).
- Bugs e riscos: [`BUG-INVENTORY.md`](BUG-INVENTORY.md).
- História da frente principal: [`../historico/2026-08-31-principal-arquitetura-ia-dados.md`](../historico/2026-08-31-principal-arquitetura-ia-dados.md).
