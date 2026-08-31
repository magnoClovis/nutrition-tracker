# Central de documentação do Trofia

Esta pasta reúne fontes internas para três documentos futuros, que serão produzidos em outra etapa: uma apresentação do Trofia para público leigo, uma visão técnica completa e um histórico cronológico detalhado do desenvolvimento.

O objetivo aqui não é substituir os arquivos operacionais da raiz nem produzir esses três documentos finais. Esta pasta oferece cópias classificadas, um resumo confiável do estado atual e registros históricos rastreáveis para que um chat sem acesso às conversas anteriores consiga distinguir fato implementado, trabalho em andamento e planejamento.

## Estrutura

- [`estado-atual/`](estado-atual/) contém documentos sobre capacidades, contratos, compliance, operação, riscos e planejamento conhecidos na data da captura.
- [`historico/`](historico/) contém cronologias de uma frente ou chat específico, sustentadas por commits e pull requests.

Os arquivos originais continuam na raiz porque podem ser consumidos por scripts, testes, CI ou processos de publicação. As cópias desta pasta têm cabeçalho de proveniência e não devem ser editadas no lugar do original.

## Como interpretar os estados

- **Concluído / implementado:** existe código, configuração ou publicação comprovada pelas fontes citadas.
- **Em andamento / parcial:** existe entrega parcial, PR aberto ou trabalho residual conhecido. “Parcial” não significa necessariamente que alguém esteja trabalhando nele neste instante.
- **Planejado / não iniciado:** decisão ou intenção registrada, sem garantia de código disponível hoje.
- **Não determinado:** as fontes consultadas não permitem afirmar o fato com segurança.

O [`estado-atual/RESUMO-STATUS.md`](estado-atual/RESUMO-STATUS.md) é a entrada recomendada. O `ROADMAP.md` mistura os três estados deliberadamente e deve ser interpretado pelos marcadores da coluna “Estado atual”, não apenas pela posição do item.

## Convenção para `historico/`

Cada frente escreve em um arquivo próprio:

`AAAA-MM-DD-nome-curto-do-chat-ou-frente.md`

- A data é a data real do commit ou PR mais recente daquela frente.
- Quando a data não puder ser confirmada, usa-se `sem-data`.
- O nome curto deve remeter à tarefa ou chat de origem, por exemplo `auditoria-arquitetura-ia`.
- Dois chats não devem compartilhar o mesmo arquivo; uma continuação comprovadamente pertencente à mesma frente pode atualizar seu arquivo e sua data.
- Toda afirmação histórica material deve citar PR, commit ou documento. O que não for comprovável deve aparecer como **não determinado**, nunca como inferência silenciosa.

## Inventário das cópias

### Estado e planejamento

- `ROADMAP.md`: sequência consolidada; mistura concluído, parcial e planejado.
- `VERSIONING.md`: releases existentes e checkpoints futuros.
- `PENDENCIAS.md`: decisões adiadas e entradas resolvidas.
- `BUG-INVENTORY.md`: conversão Markdown do inventário original em texto.
- `STABILITY_TODO.md`: checklist histórico com itens abertos e concluídos.
- `CHANGELOG_DESIGN.md`: mudanças de UX já registradas.

### Contratos e rollouts

- `AI_NUTRITION_POLICY.md`: política canônica das superfícies de IA.
- `NUTRITION_SCORE.md`: contrato do `meal-score-v2`.
- `C22_ROLLOUT.md`: matriz usada no rollout da exclusão administrativa.
- `C24_FATIA_7_VALIDACAO.md`: validação do reconhecimento por imagem.

### Compliance e operação

- `compliance/`: políticas PT/EN/ES e referência do Google Play Data Safety.
- `operacao/`: guias históricos de smoke test convertidos para Markdown.
- `operacao/REFERENCIAS-TECNICAS.md`: índice de fontes técnicas que permanecem na raiz ou nas pastas de testes.

## Base desta captura

- Repositório: `magnoClovis/nutrition-tracker`.
- Branch-base: `main`.
- Commit-base: `5c51fa530b4d88b1d34a56f5648a1b3895f1ede6` (merge do PR #152).
- Data de captura: 31/08/2026.
- Limitação: `versionCode` de artefatos Android é historicamente ajustado fora dos commits; seu valor distribuído não deve ser inferido apenas de `android/app/build.gradle`.
