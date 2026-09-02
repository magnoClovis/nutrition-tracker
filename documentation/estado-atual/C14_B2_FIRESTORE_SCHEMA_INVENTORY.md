# C14-B2 — inventário sanitizado do schema Firestore

> Execução administrativa somente leitura em 01/09/2026 contra o projeto `nutrition-tracker-780b3`. O relatório não contém UID, conteúdo nutricional, valores de perfil, tokens nem caminhos individualizados.

## Objetivo e garantias

- enumerar Auth, raízes canônicas e todos os collection groups relevantes com paginação completa;
- falhar fechado em página incompleta, cursor cíclico, caminho inválido ou envelope inesperado;
- registrar apenas contagens, nomes de campos canônicos, tipos e fingerprints curtos de nomes residuais desconhecidos;
- não disponibilizar qualquer operação de escrita ou exclusão no adaptador administrativo.

## Resultado do dry-run real

| Medida | Resultado |
|---|---:|
| usuários Auth | 30 |
| raízes `nutrition` | 32 |
| raízes canônicas associadas a Auth | 30 |
| usuários Auth sem raiz | 0 |
| documentos `data` enumerados | 1.209 |
| refeições granulares | 56 |
| registros granulares de água | 2 |
| suplementos granulares | 0 |
| marcadores de migração | 70 |

Todos os documentos `data` pertencentes a contas Auth ativas auditados tinham o envelope exato `{value: string}`. Os documentos granulares ativos apresentaram os envelopes externos previstos; os campos e tipos aninhados observados foram usados para construir os validadores de refeições, snapshots, água e suplementos.

## Achados que não autorizam exclusão

- Foram encontradas **2 raízes sem usuário Auth**, separadas de **114 documentos descendentes sem usuário Auth distribuídos por 26 UIDs**. As duas raízes foram criadas em 29/08/2026, contêm somente `lastLoginAt` e dois marcadores de release/tutorial cada. Os descendentes repetem padrões de marcadores de migração/tutorial, sem refeições, água, suplementos, lock ou job de exclusão. O conjunto é fortemente compatível com contas descartáveis de automação, não com histórico de usuários reais. Nada foi apagado ou alterado pela C14-B2.
- A limpeza defensiva do C22 opera sobre o UID de um job conhecido e o reconciliador só percorre jobs existentes. Ela não funciona como uma varredura Auth × Firestore e, portanto, não alcança autonomamente esses resíduos depois que Auth e job deixaram de existir. Uma eventual limpeza requer um janitor administrativo dedicado, período de carência e nova verificação fail-closed.
- Contas Auth ativas ainda contêm campos de raiz e chaves `data` residuais de versões históricas. As rules propostas permitem que esses campos antigos sobrevivam inalterados para não bloquear usuários reais, mas impedem clientes de criá-los, modificá-los ou ressuscitá-los. Chaves canônicas atuais — inclusive `seenVisualUpdateNotice_0.8.1` e `tutorialSeen_release-highlights` — permanecem graváveis.
- Por causa dos órfãos e resíduos históricos, o relatório integral permanece `complete: false`; isso é comportamento fail-closed, não falha silenciosa. O dry-run não autoriza limpeza nem deploy por si só.

## Estratégia das rules preparada

- criação de raiz: allowlist exata e tipos/tamanhos limitados;
- atualização de raiz histórica: somente campos canônicos podem mudar; resíduos existentes ficam imutáveis;
- `data/{key}`: apenas chaves estáticas atuais ou famílias com data civil e envelope `{value: string}`;
- granular: envelope e identidade do caminho, allowlists de payload, tipos primitivos, snapshots de alimento e score no nível superior, nomes canônicos dos seis componentes, limites de texto e timestamp do servidor; o contrato C20/C19 valida detalhadamente o interior dos componentes ao ler;
- exclusão da raiz continua exclusiva da saga administrativa C22; lock de exclusão continua bloqueando qualquer mutação do cliente.

## Estado de publicação

As rules B2 foram mescladas no PR #177 e publicadas em produção em 01/09/2026 a partir do merge `9d16e60108fbc081743bcaaf8b61e3fb515ba803`. O deploy compilou e liberou as rules sem erro, mas as duas tentativas do CI autenticado pós-deploy no run `33529042502` expuseram uma incompatibilidade real: a validação exaustiva de raiz, entrada e snapshot nutricional ultrapassava o limite de 1.000 expressões das Security Rules durante batches granulares legítimos. Legado, unitários, Worker e Functions permaneceram verdes; quatro fluxos Vite falharam em desktop e mobile.

O hotfix B2 valida integralmente toda raiz na criação, mas em updates valida o tipo somente dos campos efetivamente alterados. Resíduos históricos, conhecidos ou desconhecidos, podem permanecer intactos; não podem ser adicionados, removidos nem modificados com tipo inválido. Para manter o batch abaixo do teto de expressões, `foodSnapshot` conserva allowlist exata e identidade textual, enquanto os tipos de nutrientes continuam validados no nível principal da entrada, que é a fonte persistida dos totais. `mealScoreSnapshot` mantém validação estrita do envelope superior e dos seis nomes de componentes; a validação interna completa de cada componente foi movida para o contrato C20/C19 do cliente, que oculta o grupo inteiro se encontrar campo ou tipo malformado. Um teste integrado grava deliberadamente um componente inválido via Admin SDK, lê o documento como usuário e comprova `inspectMealScoreSnapshot() == null` e ausência de grupo no Diário. A publicação corretiva e a verificação autenticada pós-deploy ainda são necessárias antes de encerrar B2.

## Incidente e rollback de produção

- O CI anterior ao merge do PR #177 ainda exercitava as rules B1 publicadas; por isso ele não validou o comportamento real das rules B2.
- Depois do deploy B2, o run autenticado `33529042502` falhou nas tentativas 1 e 2 em oito cenários Vite: refeição retroativa, registro com score local, avaliação contextual aceita e sugestão GA, cada um em desktop e mobile. O caminho legado permaneceu verde.
- As falhas ocorriam no batch granular que grava a entrada e atualiza o índice `_dailyDates`. O emulador reproduziu o motivo exato: `Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached`. A B2 acumulava validação integral da raiz e duas listas completas de nutrientes — entrada e `foodSnapshot` — até rejeitar atomicamente a operação inteira.
- Em 01/09/2026, as rules foram restauradas imediatamente para a B1 exata do merge `8d2ddae`, hash Git do arquivo `bd1398b58bfa618797f6819a51c393b885af298a`. A compilação, o upload e a liberação no projeto `nutrition-tracker-780b3` concluíram sem erro. A tentativa 3 do run autenticado `33529042502` ficou totalmente verde: 95/95 cenários Playwright passaram, inclusive os oito fluxos Vite que falhavam sob B2. O rollback está confirmado em produção; B2 só poderá voltar após revisão e nova validação pós-deploy.
- A primeira versão do hotfix passou localmente e na tentativa 1 do run `33548758342`, mas a tentativa 2, já contra as rules publicadas, revelou quatro recusas adicionais nos fluxos com snapshots reais de seis componentes. A B1 foi restaurada pela segunda vez; a tentativa 3 do mesmo run ficou verde, confirmando novamente o funcionamento sob rollback.
- A reprodução final mostrou que até repetir apenas a allowlist interna para cada um dos seis componentes excede 1.000 expressões. A redução controlada mantém a validação superior nas rules e transfere somente o interior dos componentes para o leitor fail-closed C20/C19, agora coberto por teste Admin SDK → leitura autenticada → grupo oculto.
- O rollback não altera nem remove documentos. As recusas B2 eram atômicas: não há evidência de corrupção parcial, mas ações novas podiam deixar de ser persistidas.
