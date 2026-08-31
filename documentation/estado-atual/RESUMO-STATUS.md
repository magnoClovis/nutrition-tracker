# Resumo de status do Trofia

> Retrato da `main` no commit `3d776dbe8305a4b1d3732dfd6bb206e2e563ee5a`, em 31/08/2026, acrescido do trabalho explicitamente identificado como branch/PR em andamento. Este resumo prioriza fatos verificáveis no repositório e nos PRs; não substitui o roadmap.

## O que está implementado e funcionando hoje

- **Versão nomeada:** `0.10.0-beta` no pacote, Android `versionName`, rótulo do app e aviso de release. O `versionCode` efetivamente distribuído não é determinado pelo Git porque esse campo é ajustado localmente antes dos uploads.
- **Aplicação web e Android:** build Vite em produção, GitHub Pages e projeto Capacitor Android com publicação em teste interno. Publicação iOS não está concluída.
- **Autenticação e dados:** Firebase Auth, Firestore modular, App Check, cache persistente, comportamento offline-first, loaders cache-first, escrita granular e lifecycle seguro de conta concluídos em C28.
- **Exclusão de conta:** saga administrativa idempotente com Cloud Functions, Cloud Tasks, lock de escrita, exclusão recursiva, retries e verificação destrutiva em produção concluída em C22.
- **Armazenamento canônico:** migração legada encerrada, rules antigas fechadas e compatibilidade de importação de backups históricos preservada em C23.
- **IA gerenciada:** Gemini atrás de Cloudflare Worker autenticado; endpoints de texto, foto, preenchimento e descrição estruturada. Prompts, fotos e respostas não são persistidos pelo Worker segundo o contrato atual.
- **Reconhecimento por foto:** câmera/galeria, pré-processamento, análise multimodal, editor de estimativas e persistência sem armazenar a imagem, concluídos em C24.
- **Pontuação e avaliação de refeições:** `meal-score-v2` contextual, cobertura/provisoriedade explícita, explicação opcional, snapshots versionados e badge no Diário, concluídos em C20 e C19.
- **Privacidade e compliance:** política trilíngue pública, instruções de exclusão e referência atual de Data Safety.
- **Qualidade:** preflight, unitários, smoke legado/Vite, matriz visual e CI autenticado com App Check. G01, C05 e C07 estão fechados.

## O que está em andamento agora

- **S8 — checkboxes e sliders customizados:** protótipo aprovado e implementação em andamento na branch `codex/ui-checkbox-slider-s8`. `CheckboxField`/`SliderField` já substituem os controles ativos de sugestão de refeição e seleção de categorias de backup na branch, mas ainda dependem de PR draft, CI autenticado e merge para integrarem a `main`.
- **Esta organização documental:** branch `codex/documentation-reference`, iniciada após o merge do PR #152. O PR será aberto em draft ao concluir esta captura.
- **C08 — critérios nutricionais de IA:** C08-A a C08-D estão mesclados (#147, #149, #151 e #152). O endpoint estruturado de sugestões pela despensa e qualquer fatia final residual ainda não estão concluídos; por isso o roadmap mantém C08 como parcial.
- **PRs abertos observados na captura:** #101 (quick wins antigos de Firestore), #143 (documentação do incidente F06 em `workers.dev`) e #150 (NumericField nas métricas) estavam abertos em draft. O fato de estarem abertos não prova atividade atual; #101 aparenta sobreposição com entregas posteriores de C28, mas sua decisão de fechamento é **não determinada** nesta tarefa.

## O que está apenas planejado, ainda sem código completo

### Indispensável antes do lançamento público

- **C14:** revisão geral de segurança — parcial.
- **C16:** documentação técnica e de manutenção — parcial; esta pasta ajuda, mas não equivale à conclusão integral do item.
- **C25:** gate da versão pública — parcial e dependente de C14/C16.

### Backlog pós-lançamento

- **Sequência visual desta frente:** S9 (diálogo genérico) e I1–I7 continuam planejadas e sem implementação; cada novo tipo visual exige protótipo aprovado antes de código.
- C26 notificações, N01 voz, C21 porções fracionadas, N03 leitura de rótulos, N09 jejum, C17 e-mails, C13 feedback nativo, C10 relatórios, N07 compartilhamento profissional, N02 banco nutricional, N05 recalibração dinâmica, C15 limpeza ampla do legado, C27 widgets, N04 receitas, N06 planejamento alimentar, C12 iOS, C18 integrações de saúde e N08 exercícios/hábitos.
- Partes deliberadamente adiadas: C26-C (push/backend) e C27-B (widget funcional com escrita direta).
- Revisão externa por nutricionista e eventual comparação/troca do modelo Gemini permanecem decisões futuras registradas em `PENDENCIAS.md`.

## Onde aprofundar

- Estado por item: [`ROADMAP.md`](ROADMAP.md).
- Releases: [`VERSIONING.md`](VERSIONING.md).
- Decisões adiadas: [`PENDENCIAS.md`](PENDENCIAS.md).
- Bugs e riscos: [`BUG-INVENTORY.md`](BUG-INVENTORY.md).
- História da frente principal: [`../historico/2026-08-31-principal-arquitetura-ia-dados.md`](../historico/2026-08-31-principal-arquitetura-ia-dados.md).
