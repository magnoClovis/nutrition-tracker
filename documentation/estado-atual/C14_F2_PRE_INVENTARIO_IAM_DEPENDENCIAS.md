# C14-F2 — inventário preparatório de IAM, invocadores e dependências

> **Estado:** baseline preparatória concluída em 26/09/2026; a C14-F2 começou no mesmo dia pela reconfirmação somente leitura abaixo. Nenhuma permissão, conta de serviço, política IAM, segredo, dependência, fila, Function ou Worker foi alterado por esta auditoria.

## Objetivo

Registrar o estado administrativo real antes de reduzir privilégios ou atualizar dependências. Este documento é a referência de partida da C14-F2 e deve ser reconfirmado imediatamente antes de qualquer mutação, porque IAM, deploys e versões publicadas podem mudar depois desta captura.

## Fontes e método

- `firebase functions:list --json` no projeto `nutrition-tracker-780b3`;
- consultas somente leitura às políticas IAM do Cloud Run, ao IAM do projeto, à fila Cloud Tasks, ao Cloud Scheduler e aos repositórios Artifact Registry;
- inspeção do código em `functions/src/`, dos manifests e lockfiles;
- `npm audit --omit=dev --json` nos escopos raiz, Worker e Functions;
- consulta das versões publicadas no registro npm;
- `wrangler whoami` e tentativa de `wrangler secret list`, sem leitura de valores secretos.

Nenhuma saída contendo token, credencial, UID ou dado de usuário foi persistida.

## Estado implantado das Functions

As três Functions Gen2 executam atualmente com a mesma identidade padrão:

`128834310181-compute@developer.gserviceaccount.com`

Essa conta possui `roles/editor` no projeto. Esse é o principal risco confirmado: uma identidade administrativa ampla é compartilhada por três rotinas com necessidades diferentes.

| Function | Região | Entrada | Invocador observado | Necessidade real inferida do código |
|---|---|---|---|---|
| `requestAccountDeletion` | `europe-southwest1` | callable HTTPS | Cloud Run `roles/run.invoker` para `allUsers` | validar Auth/App Check, transacionar job/lock no Firestore e enfileirar a tarefa |
| `processAccountDeletionTask` | `europe-west1` | Cloud Tasks | sem binding IAM no recurso Cloud Run; fila sem política IAM própria | ler/alterar Firestore, excluir árvore do usuário, verificar ausência, excluir usuário no Firebase Auth e selar lock |
| `reconcileAccountDeletionJobs` | `europe-west1` | Cloud Scheduler | `roles/run.invoker` apenas para a conta padrão de Compute Engine | consultar/reconciliar jobs no Firestore e reenfileirar tarefas |

O callable público não deve ser fechado por associação automática: clientes Firebase callable precisam alcançar o endpoint, enquanto o runtime exige autenticação recente e `enforceAppCheck: true`. A C14-F2 deve validar esse contrato antes de alterar o invocador.

A ausência de binding próprio no processador de tarefas também não autoriza mudança imediata. O caminho Cloud Tasks → Function precisa ser comprovado com uma tarefa real e com a política efetiva antes e depois da troca de identidade.

## Scheduler e fila

O job `firebase-schedule-reconcileAccountDeletionJobs-europe-west1` está habilitado, roda a cada 60 minutos e gera token OIDC usando a conta padrão de Compute Engine.

A fila `processAccountDeletionTask` está `RUNNING` e preserva o contrato aprovado:

- 1 despacho por segundo;
- no máximo 2 despachos concorrentes;
- 5 tentativas;
- retenção de retry por até 24 horas;
- backoff mínimo de 60 segundos e máximo de 3.600 segundos;
- 4 duplicações progressivas de backoff.

Não há binding IAM específico na fila; hoje a capacidade de enfileirar deriva dos privilégios amplos da conta `roles/editor`.

## Matriz preliminar de privilégio mínimo

As identidades abaixo são uma proposta para a implementação, não recursos já criados:

| Identidade dedicada | Permissões/roles candidatos | Observação obrigatória |
|---|---|---|
| solicitação callable | acesso transacional ao Firestore, `roles/cloudtasks.enqueuer` na fila e escrita de logs | não precisa excluir usuários nem administrar outros serviços |
| processador de exclusão | acesso administrativo estritamente necessário ao Firestore, permissão de excluir usuário no Firebase Auth e escrita de logs | avaliar custom role para `auth.users.delete`; não conceder `roles/editor` |
| reconciliador | acesso aos jobs no Firestore, `roles/cloudtasks.enqueuer` na fila e escrita de logs | invocação Cloud Run deve ficar limitada ao principal OIDC usado pelo Scheduler |

Antes de conceder roles, a implementação deve confirmar as permissões exatas usadas pelo Admin SDK. `roles/datastore.user`, `roles/cloudtasks.enqueuer`, `roles/logging.logWriter` e uma permissão Auth mínima são candidatos; não são uma autorização para aplicar IAM sem teste.

## Artifact Registry

Os repositórios `gcf-artifacts` em `europe-southwest1` e `europe-west1` têm a política `firebase-functions-cleanup` ativa, não está em dry-run e exclui imagens com mais de `604800s` — exatamente 7 dias. Nenhuma correção é necessária nesse ponto.

## Dependências de produção

Resultado de `npm audit --omit=dev` em 26/09/2026:

| Escopo | Vulnerabilidades de produção |
|---|---:|
| aplicação raiz | 0 |
| Worker | 0 |
| Functions | 7 moderadas |

Nas Functions, a cadeia principal parte de `firebase-admin@14.2.0` e alcança `@google-cloud/storage`, `retry-request`, `teeny-request`, `gaxios`, `uuid` e `qs`. O registro npm indica correção não major disponível em `firebase-admin@14.5.0`. `firebase-functions` também está abaixo da versão publicada consultada (`7.3.2` → `7.4.0`). A atualização precisa regenerar o lockfile e repetir emuladores, testes puros, deploy controlado e teste destrutivo com conta descartável.

## Dependências de desenvolvimento

As auditorias completas, incluindo ferramentas, encontraram riscos adicionais que não entram no runtime publicado, mas afetam cadeia de build e CI:

- raiz: 3 altas, transitivas de ferramentas como Capacitor CLI/Vite;
- Worker: 8 no total, sendo 6 altas e 2 moderadas, em ferramentas como Wrangler, Vitest e pool Workers;
- Functions: 18 no total, sendo 2 altas e 16 moderadas, incluindo o Firebase CLI e suas ferramentas auxiliares.

Versões publicadas consultadas como referência, não como atualização automática:

| Pacote direto | Atual | Publicada consultada | Cuidado |
|---|---:|---:|---|
| `firebase-admin` | 14.2.0 | 14.5.0 | candidata prioritária por corrigir a cadeia de produção |
| `firebase-functions` | 7.3.2 | 7.4.0 | validar contratos Gen2 e emuladores |
| `firebase-tools` | 15.27.0 | 15.31.0 | ferramenta de desenvolvimento/deploy |
| `wrangler` | 4.115.0 | 4.141.0 | validar Worker, Durable Object e dry-run |
| `@cloudflare/vitest-pool-workers` | 0.19.0 | 0.22.0 | atualizar junto do harness do Worker |
| `vitest` | 4.1.10 | 5.0.2 | salto major; não atualizar sem migração explícita |
| `@capacitor/cli` | 8.4.2 | 8.5.2 | validar build Android e patches locais |
| `vite` | 7.3.6 | 8.3.1 | salto major; manter fora de correção automática |

## Inventário de segredos do Worker — lacuna da baseline

A tentativa de listar apenas nomes/tipos dos segredos falhou porque o perfil Wrangler autenticado localmente aponta para outra conta Cloudflare, na qual o Worker `trofia-ai-proxy` não existe. Nenhum login, token ou segredo foi modificado.

A lacuna foi resolvida na reconfirmação da C14-F2: o perfil `trofia`, autenticado na conta Cloudflare correta durante o rollout da F1, permitiu listar somente nomes/tipos. O Worker de produção tem `GEMINI_API_KEY` e `RATE_LIMIT_PSEUDONYM_KEY`, ambos `secret_text`; nenhum valor foi consultado, exibido ou alterado. O perfil padrão que aponta para outra conta permaneceu intacto.

## Reconfirmação administrativa da C14-F2 — 26/09/2026

Esta rodada usou exclusivamente consultas GET e `getIamPolicy` (POST somente leitura, como exige a API), `firebase functions:list`, `wrangler secret list` e `npm audit` contra a configuração atual. O token OAuth da sessão existente foi usado somente em memória para as APIs Google Cloud; os resultados abaixo omitem tokens, cabeçalhos, payloads de tarefas e dados de usuários.

| Superfície | Resultado reconfirmado | Limite da evidência |
|---|---|---|
| Functions Gen2 / Cloud Run | As três permanecem `ACTIVE`, em Node.js 22, usando `128834310181-compute@developer.gserviceaccount.com`; o projeto ainda concede `roles/editor` a essa identidade. A listagem Cloud Run nas duas regiões das Functions mostrou somente esses três serviços, todos com a mesma identidade. | Não é um inventário de todos os produtos/regiões do projeto, nem testa a troca de runtime identity. |
| Cloud Run invokers | Callable: `roles/run.invoker` para `allUsers`; processador: nenhuma binding própria no serviço; reconciliador: `roles/run.invoker` para uma service account. | Política de invocação não substitui a autenticação e App Check exigidos no runtime; não se deve fechar o callable por reflexo. |
| Fila Cloud Tasks | `RUNNING`, 1 despacho/s, concorrência 2, 5 tentativas, retry 24 h e backoff de 60–3.600 s; `getIamPolicy` retornou política vazia. | A primeira tentativa com GET devolveu 404 porque a API exige POST para esse método; a segunda com POST retornou 200 e nenhuma binding. |
| Cloud Scheduler | Job `ENABLED`, a cada 60 minutos, com token OIDC da mesma conta padrão de Compute Engine. | Nenhum job foi disparado nesta auditoria. |
| Outros consumidores da conta padrão | Os três serviços Cloud Run das regiões usadas foram identificados; uma tentativa de inventariar VMs por `compute.instances.aggregatedList` recebeu HTTP 403. | Não há evidência para afirmar que a conta padrão é exclusiva das Functions. Antes de revogar `roles/editor`, um administrador deve concluir o inventário de consumidores e simular a mudança. |
| Artifact Registry | `gcf-artifacts` em Madrid e Bélgica expõe política `firebase-functions-cleanup` com ação `DELETE` e `olderThan=604800s` (7 dias). | Nenhuma imagem foi removida ou criada nesta auditoria. |
| Worker Cloudflare | `GEMINI_API_KEY` e `RATE_LIMIT_PSEUDONYM_KEY` constam como `secret_text` no perfil correto. | Somente nomes/tipos; valores permanecem desconhecidos para esta auditoria. |
| Dependências de produção | `npm audit --omit=dev`: raiz 0, Worker 0, Functions 7 moderadas; pacotes afetados: `firebase-admin`, `@google-cloud/storage`, `gaxios`, `qs`, `retry-request`, `teeny-request`, `uuid`. O audit aponta `firebase-admin@14.5.0` como correção não-major, e essa versão foi confirmada no registry. | Achados de registry podem mudar; repetir antes de atualizar lockfiles. |
| Cadeia completa, inclusive dev/build | `npm audit`: raiz 3 altas; Worker 6 altas + 2 moderadas; Functions 2 altas + 16 moderadas. | Separadas do runtime publicado; não aplicar `npm audit fix` automaticamente. |

O maior risco confirmado continua sendo `roles/editor` na identidade compartilhada. A decisão seguinte deve separar, por Function, permissões Firestore, enfileiramento, exclusão Auth e logging; medir invocação positiva/negativa e manter rollback antes de retirar a role ampla. A conta padrão pode ser usada por outros workloads do projeto: antes de remover `roles/editor`, é obrigatório inventariar todos os seus vínculos de runtime e simular o impacto da remoção, não apenas testar as três Functions. A autenticação de tarefas HTTP também pode exigir `iam.serviceAccounts.actAs`, identidade OIDC autorizada e binding `roles/run.invoker` no destino; isso deve ser comprovado para o contrato exato do Firebase, não presumido da matriz preliminar. As sete vulnerabilidades moderadas de produção das Functions justificam uma atualização pequena e isolada do Admin SDK, mas não uma atualização automática de todo o toolchain. Esta auditoria **não** autoriza nem executa essas mudanças.

Em continuidade à F2, o draft PR #265, commit `1e3b442`, atualizou `firebase-admin` 14.2.0→14.5.0 em `functions/package.json` e seu lockfile. `npm audit --omit=dev` passou de sete para dois achados moderados nessa árvore de dependências, após correções transitivas compatíveis do lockfile; a alteração também eleva transitivamente a biblioteca opcional `@google-cloud/firestore` de 8.7.1 para 9.2.0, compatível com Node.js 22 mas relevante para testar o backend administrativo. O recorte focado passou (33 executados, um skip que exige emulador), a suíte isolada das Functions passou (62 executados, 12 skips estruturais) e o gate real de emuladores passou 74/74, sem falhas ou skips. O `npm test` do repositório passou preflight, 1.465 unitários, smokes legado/Vite e cutover 60/60; a primeira tentativa de smoke foi adiada porque a porta 8765 estava ocupada pelo Playwright ativo da worktree UI/UX `.codex-ui-cam-red-7`, cuja execução foi preservada. Os casos autenticados locais sem credenciais ficaram nos skips esperados. O preflight documental `36249321257` passou em 32 s e o CI autenticado real `36249321278` passou em 38 min 3 s: 1.465 unitários, 44 testes do Worker, 74 das Functions, 111 smokes legados com 8 skips estruturais e 119 Vite, sem falhas. A atualização ainda não foi mesclada ou publicada. Nenhum ajuste IAM está autorizado por essa redução no audit; a lacuna de inventário de outros consumidores da conta padrão continua aberta.

**Gate atual do PR #265:** após integrar a `origin/main`, o SHA `102d2d6` repetiu `npm test` local com 1.475 unitários e cutover 60/60. O preflight remoto `36257846869` passou, mas as duas tentativas do CI autenticado `36257846855` falharam no mesmo teste de preview de backup Vite (mobile e desktop, respectivamente); cada tentativa aprovou os demais 118 casos Vite, 111 legados com oito skips estruturais, Worker e Functions. O diálogo de preview não apareceu após a seleção do JSON dentro da espera contratada; o modal permaneceu aberto sem erro visível. Uma execução local autenticada isolada do mesmo caso mobile passou, insuficiente para declarar a falha resolvida. Essa ocorrência posterior à integração de `main` ainda não tem causa confirmada nem relação causal demonstrada com a atualização de dependências das Functions. O PR continua draft e bloqueado para merge/deploy enquanto o gate não for esclarecido; nenhuma política IAM foi alterada.

**Reteste após o trabalho separado de backup:** a `main` incorporou os PRs #274/#275, que coalescem leituras de chaves diárias por data no preview; a mudança não foi produzida pela F2. Em 27/09/2026, o recorte de backup passou 32/32; a suíte pura das Functions passou 62 testes com 12 skips reservados aos emuladores; os emuladores, com `XDG_CONFIG_HOME` isolado apenas para contornar acesso negado ao configstore global da CLI, passaram 74/74 sem skips. O `npm test` sobre o merge local passou integralmente fora do sandbox: preflight sem avisos, 1.496/1.496 unitários, smokes legado e Vite com os skips esperados por ausência de credenciais descartáveis nesta worktree, e cutover 60/60. Duas tentativas anteriores de `npm test` não foram contadas como sucesso: uma falhou ao carregar `vite.config.js` por restrição do sandbox (o build Vite isolado passou fora dele), e outra parou porque a porta Vite 8766 estava ocupada; a porta foi depois encontrada livre, sem encerrar processo de outra frente. Após integrar também a `main` documental em `4537403`, o `npm test` completo passou novamente com as mesmas contagens. No SHA final `97d1054`, o preflight remoto `36336629163` passou em 31 s e o CI autenticado `36336629044` passou em 41 min 25 s: 1.496/1.496 unitários, 44/44 Worker, 74/74 Functions, 125 smokes legado + 10 skips estruturais restritos ao Vite e 135/135 Vite. O caso de preview de backup anteriormente intermitente passou sob a matriz autenticada completa. O PR #265 permanece draft, sem merge nem deploy. O inventário incompleto de consumidores da conta padrão e o bloqueio de alteração IAM permanecem inalterados.

**Bloqueio de gate no commit documental:** o run `36341945423` da revisão `30418eb` foi cancelado na primeira tentativa antes de iniciar job por substituição na fila compartilhada e repetido uma vez após a fila liberar. A tentativa 2 passou preflight, unitários, Worker, Functions e todo o legado, mas terminou com 134/135 casos Vite: o teste D2 `desktop-diary.visual.spec.js` não encontrou uma data preenchida entre 31 datas da conta descartável. O snapshot mostrou Diário vazio, sem erro visível; o teste não prepara o estado preenchido e não faz parte do diff da F2. Isso bloqueia o merge do PR #265 apesar do CI verde no SHA anterior. O artefato de falha está preservado no run; não houve retry adicional, alteração de teste da UI/UX, deploy nem mudança IAM.

**Retomada após a correção D2:** os PRs separados #282/#283 corrigiram o teste com uma fixture preenchida controlada e restauração no `finally`; o PR #284 corrigiu as métricas documentais desse trabalho. A `origin/main` em `3f3557b` foi integrada à branch da F2 sem conflito e as edições documentais prévias foram reaplicadas de stash restrito, mantido como proteção. Em 29/09/2026, `npm test` local sobre esse estado terminou com exit code 0: preflight aprovado, smokes com skips esperados pela falta de credenciais nesta worktree e cutover 60/60. Isso remove a dependência conhecida do teste D2 em dados preexistentes, mas **não substitui o CI autenticado real no novo SHA**, ainda pendente; o PR #265 permanece draft e não houve deploy nem alteração IAM.

O teste focado das Functions aprovou 62 casos e pulou os 12 reservados aos emuladores. Duas tentativas de iniciar o gate emulado pararam antes dos testes porque um processo Java antigo da própria worktree F2, criado em 27/09 e já sem processo pai, ainda ocupava a porta Firestore 8080. Somente esse PID órfão foi finalizado, após identificação da linha de comando e confirmação de que não pertencia a outra frente. Com as portas livres, `npm run test:emulators` terminou com exit code 0 e 74/74 casos aprovados, sem skips; o encerramento normal desligou os emuladores. Não houve alteração de código nem relaxamento de teste para contornar a colisão ambiental.

Os dois achados residuais são uma única cadeia: `@google-cloud/storage@8.2.0` depende de `gaxios@6.7.1`, que importa `uuid@9.0.1`. O [aviso GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) limita a falha aos métodos `uuid.v3/v5/v6` quando recebem buffer/offset fora dos limites; o código instalado de `gaxios@6.7.1` chama apenas `uuid.v4()` para criar o limite de multipart, sem buffer fornecido pelo chamador. Isso reduz a probabilidade de exploração pelo caminho identificado, mas **não elimina o alerta do scanner nem prova ausência absoluta de outros caminhos**. `gaxios@6` não tem release corrigido na mesma linha e `@google-cloud/storage@8.2.0` ainda exige `gaxios ^6`; não forçamos override major de `uuid` sem suporte do upstream. A exceção é temporária, limitada a esses dois achados moderados, e deverá ser reavaliada quando o upstream publicar uma cadeia compatível ou em revisão específica; não deve ser apresentada como audit zero.

Referências oficiais para a decisão IAM futura: [conta padrão e remoção segura de Editor](https://docs.cloud.google.com/compute/docs/access/service-accounts), [Cloud Tasks HTTP com OIDC](https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks), [permissão de enfileiramento](https://docs.cloud.google.com/iam/docs/roles-permissions/cloudtasks) e [invocação de Functions Gen2](https://docs.cloud.google.com/functions/docs/securing/managing-access-iam).

## Ordem recomendada para as próximas mudanças da C14-F2

1. Reconfirmar todo o inventário contra produção e fechar a lacuna de segredos do Worker — realizado em 26/09/2026, somente leitura; repetir imediatamente antes de qualquer mutação.
2. Criar identidades dedicadas, inicialmente sem remover a identidade atual.
3. Conceder permissões mínimas por recurso e configurar cada Function para sua identidade.
4. Validar callable, tarefa duplicada, retry, reconciliador, exclusão completa e logs com conta descartável.
5. Remover `roles/editor` da identidade antiga somente depois de inventariar todos os workloads que a utilizam, simular a revogação e provar que nenhum ainda depende dela.
6. Atualizar dependências em grupos pequenos: produção das Functions primeiro; ferramentas depois, sem misturar saltos major não relacionados.
7. Repetir suíte completa, emuladores, CI autenticado, deploy controlado e matriz destrutiva.
8. Registrar política de rollback antes de cada mutação IAM/deploy.

## Critérios de aceitação futuros

- nenhuma Function administrativa executa com `roles/editor`;
- cada identidade possui somente os acessos necessários ao seu fluxo;
- invocadores públicos/privados são comprovados por testes positivos e negativos;
- Cloud Tasks e Scheduler continuam funcionando com OIDC e retry reais;
- `npm audit --omit=dev` fica sem vulnerabilidades conhecidas ou qualquer exceção permanece explicitamente justificada e rastreada;
- inventário de segredos do Worker é concluído sem expor valores;
- nenhum dado real é apagado durante a validação; testes destrutivos usam contas descartáveis;
- documentação, runbook e rollback refletem o estado efetivamente implantado.
