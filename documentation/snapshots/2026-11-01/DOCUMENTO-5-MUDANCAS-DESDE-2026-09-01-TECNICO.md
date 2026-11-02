# Trofia

## Documento 5 Mudanças técnicas desde 1º de setembro de 2026

**Data da comparação:** 01/11/2026
**Base anterior:** snapshot imutável `documentation/snapshots/2026-09-01/`
**Referência atual:** `origin/main` em `4e727679d8b556e89a590b2861acc1b7b53b8b72`
**Versão nomeada:** `0.11.0-beta`.

## 1. Regra de leitura

“Mesclado” significa presente na linha principal. “Validado localmente” descreve um gate executado fora do CI. “CI verde” exige run remoto concluído. “Produção controlada” exige rollout e prova documentados de um serviço específico. “Staging” é ambiente separado e incompleto. Nenhum desses estados, isoladamente, prova lançamento público.

## 2. Matriz auditável de mudanças

| Mudança | Antes → agora | Evidência | Impacto, limites e estado |
|---|---|---|---|
| Versão | `0.10.0-beta` → `0.11.0-beta` | PR #169; merge `0187c90`; `package.json` | Nomeado em código; não prova release público. |
| Diálogos | `alert/confirm/prompt` ativos → `GenericDialog` | PR #172; `f612de2` | Mesclado; cinco usos substituídos, foco/teclado/Back cobertos. |
| Diário | sem detalhes/edição/movimento → menu completo | PRs #182/#184; `842b7de`/`cadad17` | Mesclado; snapshots são invalidados após mudança. |
| Estimativas | edição sem domínio proporcional comum → recálculo compartilhado | PRs #186/#188 | Mesclado; foto e descrição usam o mesmo domínio. |
| Desktop | shell/Diário estreitos → D1/D2 responsivos | PRs #187/#270/#272 | Mesclado; mobile preservado. |
| Câmera | preview e processamento fragmentados → fluxo CAM-RED-2–9 | PRs #203, #207, #227, #244, #246, #256, #277, #323 | Mesclado e provado em builds internos específicos; CAM-RED-10 ainda pendente. |
| App Check | verificação parcial → enforcement do Worker | PRs #189/#210; `APP_CHECK_MODE=enforce` | Produção controlada documentada; staging Web sem enforcement. |
| Android | limites locais básicos → backup/cleartext/FileProvider fail-closed | PR #213; `fbb8486` | Mesclado; verificador de release. Não prova publicação pública. |
| Auth | persistência implícita e senha menor → `SESSION` padrão, opt-in `LOCAL`, senha nova 12 | PR #215; `b307d29` | Mesclado; contas antigas têm compatibilidade documentada. |
| Worker | limites fixos → HMAC, tiers observados, timeout 40 s, resposta 128 KB, métricas sanitizadas | PR #257; `6293899` | Rollout F1 comprovado; tiers não cobram nem negam por plano. |
| Backup | preview permissivo/repetitivo → fail-closed e coalescido | PRs #264/#274 | Mesclado; medição 1.793 → 623 requests, sem extrapolar para toda latência. |
| Histórico | chaves de refeição canônicas apenas → normalização PT/EN/ES em memória | PR #271; `adc4dcf` | Mesclado; não migra dados persistidos. |
| Loading | espera genérica → marca, mínimo 900 ms, reduced motion | PR #280; `b0e20f4` | Mesclado e CI verde no fechamento. |
| Registro | formulário concentrado → sete decisões progressivas | PR #293; `f09ac0b` | Mesclado; incidentes correlatos ainda monitorados. |
| CSP | política anterior → destinos restritos e debug condicionado | PR #294; `5dfff2a` | Pages publicado/provado; não equivale a lançamento do produto. |
| IAM/Functions | identidades compartilhadas/dependências antigas → identidades dedicadas, OIDC e lockfile atualizado | PRs #292, #298, #299, #308, #311 | Produção controlada comprovada para três Functions; role residual tratada separadamente. |
| Tema | política escura histórica → migração local v2 para claro e `light/dark/system` | PR #321; `76b71eb` | Mesclado; preferência não é remota. |
| Adicionar | entrada direta fragmentada → menu I4-A e sheet I4-B | PRs #332/#337; `b00f7e5`/`3657dde` | Mesclado; barcode fora. Pós-merge I4-B em #347. |
| Staging | inexistente → projeto, manifesto, apps e fronteiras parciais | PRs #319, #320, #327, #330, #334, #336, #341, #343 | Em andamento e fail-closed; sem matriz/Android/recursos completos. |
| Descrição longa | limite compartilhado com foto → limite próprio de prato | PR #345; `f025e47` | Mesclado e documentado em #346. |
| Despensa | acordeões → shell com busca/segmentos/categorias | PR #340; `4e72767` | Código mesclado; fechamento documental contraditório e ainda não reconciliado. |

## 3. Arquitetura atual por camada

### Cliente e apresentação

React `18.3.1`, React DOM `18.3.1`, Vite `7.3.6` e Recharts `2.10.4` permanecem. A composição ainda combina ESM e namespaces UMD; C15/ORG continuam abertos. Novos contratos visuais são componentes compartilhados, não um segundo backend.

### Dados e offline

O esquema canônico pós-C23 e a escrita granular C28 continuam a base. C14-B2 endureceu validação de documentos e orçamento de regras. Backup fail-closed e coalescência de preview foram acrescentados sem mudar a árvore canônica. Não há migração nova de dados associada a I2, I3, I4 ou I8.

### Auth, App Check e segurança

Auth modular, ID token, regras e lifecycle de cache continuam. App Check agora é obrigatório no Worker e na exclusão. O CI usa debug apenas no gate autenticado serializado. Android release, CSP, Worker e Functions receberam gates específicos. C14 não está encerrada porque staging e matriz final permanecem incompletos.

### IA

Contratos C08 continuam versionados e o cliente continua recalculando números determinísticos. C14-F1 adicionou fronteiras operacionais. A PR #345 separou o máximo de itens de descrição do máximo de fotografia. Modelo configurado: `gemini-3.5-flash-lite`. Chave continua somente no Worker.

### Android

Capacitor `8.4.2`, Android mínimo 24 e alvo 36. Camera Preview `8.0.1` sustenta a câmera contínua. `versionName` é `0.11.0-beta`; `versionCode` versionado não representa necessariamente o código dos AABs internos documentados.

### CI

A árvore contém 190 arquivos sob diretórios de teste e 602 declarações `test()`/`it()` de nível superior. O gate mais recente documentado da I8-A executou 1.572 unitários, legado 185 + 10 skips, Vite 195 e cutover 60/60. O workflow principal usa Windows 2022, Node 24.18.0, Java 21, Chromium, timeout de 60 minutos e concorrência global serializada. Mudanças exclusivamente documentais acionam o preflight rápido e pulam a suíte autenticada pesada.

## 4. Estado operacional por superfície

| Superfície | Estado comprovado | Não comprovado |
|---|---|---|
| `main` | commit `4e727679d8b556e89a590b2861acc1b7b53b8b72` contém os merges citados | ausência de defeitos futuros |
| CI | runs verdes registrados por fatia | que todo run histórico ficou verde |
| Pages | deploy/verificação documentados para C14-G | lançamento comercial público |
| Worker | App Check enforce e F1 publicados/provados | tiers pagos ativos |
| Functions | C14-F2 publicou e testou três funções | C14 integral concluída |
| Android | AABs internos e provas físicas específicas | distribuição pública |
| Staging | projeto/apps/manifesto/CSP parcial | ambiente completo ou matriz aprovada |

## 5. Pendências técnicas relevantes

1. C14-H: Android staging, recursos remotos, IAM, CI, matriz e rollback.
2. C26-A/B e C30-A–E: necessários pela linha de lançamento, ainda sem implementação funcional.
3. C16/C25: documentação final e gate público.
4. I6/I8-B-C/I9/I10 e CAM-RED-10: experiência visual e validações ainda abertas.
5. ORG/C15: retirar duplicação UMD/ESM e reorganizar sem quebrar consumidores.
6. Incidentes de reload/sessão e perfil: investigação/monitoramento, sem causa universal declarada.

## 6. Contradições documentais preservadas

- I8-A: merge #340 presente; resumo e documento específico ainda dizem “em andamento”.
- VERSIONING: tabela preserva “estado atual” histórico para 0.9.0-beta, enquanto manifests atuais nomeiam 0.11.0-beta.
- `versionCode`: valores distribuídos internamente aparecem nos históricos e não podem ser reconstruídos apenas do Gradle atual.

Nenhuma dessas contradições foi corrigida fora deste snapshot.

## 7. Fontes verificadas

- snapshot de 01/09/2026;
- `origin/main` no commit `4e727679d8b556e89a590b2861acc1b7b53b8b72`;
- `git log --first-parent` e metadados das PRs citadas;
- `documentation/estado-atual/RESUMO-STATUS.md`, `ROADMAP.md`, `BUG-INVENTORY.md`, `VERSIONING.md` e documentos C14/I2/I3/I8/UI;
- históricos das frentes Principal, UIUX e Bugs;
- manifests, rules, Worker, Functions, Android, workflows e testes versionados.
