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
| usuários Auth | 29 |
| raízes `nutrition` | 31 |
| raízes canônicas associadas a Auth | 29 |
| usuários Auth sem raiz | 0 |
| documentos `data` enumerados | 1.209 |
| refeições granulares | 56 |
| registros granulares de água | 2 |
| suplementos granulares | 0 |
| marcadores de migração | 70 |

Todos os 1.140 documentos `data` pertencentes a contas Auth ativas tinham o envelope exato `{value: string}`. Os documentos granulares ativos apresentaram os envelopes externos previstos; os campos e tipos aninhados observados foram usados para construir os validadores de refeições, snapshots, água e suplementos.

## Achados que não autorizam exclusão

- Foram encontradas **2 raízes sem usuário Auth e 114 documentos descendentes associados**. As rules já não permitem que um cliente sem o UID Auth correspondente acesse esses dados, mas o achado exige investigação administrativa de retenção/órfãos em uma fatia própria. Nada foi apagado ou alterado pela C14-B2.
- Contas Auth ativas ainda contêm campos de raiz e chaves `data` residuais de versões históricas. As rules propostas permitem que esses campos antigos sobrevivam inalterados para não bloquear usuários reais, mas impedem clientes de criá-los, modificá-los ou ressuscitá-los. Chaves canônicas atuais — inclusive `seenVisualUpdateNotice_0.8.1` e `tutorialSeen_release-highlights` — permanecem graváveis.
- Por causa dos órfãos e resíduos históricos, o relatório integral permanece `complete: false`; isso é comportamento fail-closed, não falha silenciosa. O dry-run não autoriza limpeza nem deploy por si só.

## Estratégia das rules preparada

- criação de raiz: allowlist exata e tipos/tamanhos limitados;
- atualização de raiz histórica: somente campos canônicos podem mudar; resíduos existentes ficam imutáveis;
- `data/{key}`: apenas chaves estáticas atuais ou famílias com data civil e envelope `{value: string}`;
- granular: envelope e identidade do caminho, allowlists de payload, tipos primitivos, snapshots de alimento e score, limites de texto e timestamp do servidor;
- exclusão da raiz continua exclusiva da saga administrativa C22; lock de exclusão continua bloqueando qualquer mutação do cliente.

## Estado de publicação

As regras B2 foram apenas compiladas e testadas em emulador nesta etapa. **Não foram publicadas em produção.** O deploy exige revisão do PR e um rollout explícito posterior, com smoke autenticado e plano de rollback.
