# Padrão obrigatório de documentação do Trofia

Este documento define o gate documental permanente do projeto. Documentação não é acabamento posterior: é parte da entrega. Uma fatia, correção, rollout ou incidente só está concluído quando código, validação e registros documentais contam a mesma história.

## Registros obrigatórios

Toda frente deve manter simultaneamente:

1. `documentation/estado-atual/RESUMO-STATUS.md`: retrato breve do planejamento e estado atual.
2. `documentation/historico/<arquivo-da-frente>.md`: cronologia técnica detalhada e comprovável.
3. Documento específico afetado: contrato, rollout, política, inventário, roadmap, pendência, operação ou compliance relacionado à mudança.
4. Cópia em `documentation/estado-atual/` quando um original da raiz já possuir cópia controlada ali.

Snapshots são históricos imutáveis. Nunca atualizar um snapshot antigo para fazê-lo parecer atual.

## Ao aprovar um fatiamento

Antes do primeiro código:

- registrar imediatamente a sequência completa no `RESUMO-STATUS.md`;
- incluir também as fatias ainda não iniciadas;
- marcar cada estado como `não iniciado`, `em andamento` ou `concluído`;
- registrar `O que se planeja fazer` com o escopo realmente aprovado;
- nunca remover etapas futuras quando uma etapa anterior terminar.

## Formato no RESUMO-STATUS

```markdown
### [CÓDIGO] - Título

- **Status:** não iniciado / em andamento / concluído — **Chat:** Nome-da-frente.
- **Data de início:** data comprovada ou `não determinado` / `não iniciado`.
- **Data de conclusão:** data comprovada ou `não concluído` / `não iniciado`.
- **Propósito:** uma frase sobre o problema ou objetivo.
- **O que se planeja fazer:** uma frase com o escopo aprovado.
- **Recursos/arquivos principais envolvidos:** arquivos, módulos, serviços e tecnologias reais.
- **O que foi feito:** uma frase factual, somente quando houver progresso real.
- **Alinhamento:** percentual ou qualificação, somente quando concluído.
```

Se o alinhamento for menor que 100%, explicar o desvio real e classificar o impacto final como positivo, negativo ou neutro.

## Formato no histórico da frente

```markdown
### [CÓDIGO] - Título

- **Status:** não iniciado / em andamento / concluído.
- **Data de início:** data comprovada ou `não determinado` / `não iniciado`.
- **Data de conclusão:** data comprovada ou `não concluído` / `não iniciado`.
- **Tempo decorrido:** `pendente de merge` até o merge; depois, valor exato do primeiro commit ao merge.
- **Minutos de CI:** total real, com divisão leve/pesado; `0 min; não iniciado` quando aplicável.
- **Propósito:** razão técnica e impacto pretendido.
- **O que se planeja fazer:** escopo aprovado antes da implementação.
- **Recursos/arquivos principais envolvidos:** arquivos, módulos, serviços, plataformas e ferramentas reais.
- **O que foi feito:** implementação, validação, incidentes e achados, com profundidade técnica e evidência.
- **Alinhamento:** comparação entre planejado e entregue; abaixo de 100%, justificar e classificar o impacto.
- **PRs/commits relacionados:** números, hashes e runs relevantes.
```

Não duplicar uma sequência em versões agregada e detalhada. Quando houver sub-fatias aprovadas, cada uma recebe entrada própria. Um resumo da tarefa-mãe pode existir apenas se não repetir nem substituir o estado individual.

## Métricas e rastreamento

- `Tempo decorrido` só pode ser calculado depois do merge, usando o primeiro commit da fatia e o timestamp do merge. Antes disso, escrever literalmente `pendente de merge`.
- `Minutos de CI` usa duração real dos runs concluídos e informa a divisão leve/pesado. Não aproximar silenciosamente.
- Depois do merge, copiar os mesmos valores para a descrição do PR:

```text
---
Tempo decorrido: <valor exato>
Minutos de CI: <total e divisão leve/pesado>
-----------------------------------------------
```

- Toda mensagem de commit e descrição de PR termina com `Chat-Origin: <nome do chat>`.
- Toda entrada do `RESUMO-STATUS.md` identifica `Chat: <nome da frente>`.

## Gate antes de declarar conclusão

Confirmar todos os itens:

- [ ] sequência completa e status atualizados no `RESUMO-STATUS.md`;
- [ ] entrada detalhada atualizada no histórico da frente;
- [ ] contrato/rollout/política/inventário/roadmap/pendência/guia operacional afetado atualizado;
- [ ] cópias controladas sincronizadas, quando existirem;
- [ ] planejamento, entrega e alinhamento presentes;
- [ ] datas, PRs, commits, runs e métricas baseados em evidência;
- [ ] `Tempo decorrido` pendente antes do merge e preenchido depois dele;
- [ ] descrição do PR atualizada pós-merge com as mesmas métricas;
- [ ] `Chat-Origin` presente no commit e no PR;
- [ ] nenhuma credencial, token, UID, dado pessoal, prompt, foto ou resposta sensível registrada.

Se qualquer item aplicável estiver ausente, a fatia permanece aberta documentalmente, mesmo com testes verdes e código mesclado.

## Limites entre frentes

- Cada chat mantém seu próprio arquivo em `documentation/historico/`.
- O `RESUMO-STATUS.md` é compartilhado; preservar as entradas das outras frentes.
- Não reconstruir título, data, escopo ou estado de outra frente por semelhança. Usar evidência versionada ou pedir confirmação ao chat responsável.
- Atualização documental não autoriza alterar código, configuração, infraestrutura ou estado de produção fora do escopo aprovado.
