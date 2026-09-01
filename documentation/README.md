# Central de documentação do Trofia

Esta pasta reúne as fontes internas e as versões completas de três documentos de referência: uma apresentação do Trofia para público leigo, uma visão técnica completa e um histórico cronológico detalhado do desenvolvimento.

Os arquivos em `estado-atual/` e `historico/` oferecem fontes classificadas, um resumo confiável do estado corrente e registros históricos rastreáveis. As rodadas completas dos três documentos finais ficam preservadas separadamente em `snapshots/`, sem sobrescrever rodadas anteriores.

## Estrutura

- [`estado-atual/`](estado-atual/) contém documentos sobre capacidades, contratos, compliance, operação, riscos e planejamento conhecidos na data da captura.
- [`historico/`](historico/) contém cronologias de uma frente ou chat específico, sustentadas por commits e pull requests.
- [`snapshots/`](snapshots/) contém as versões completas dos três documentos finais, agrupadas pela data de geração no formato `AAAA-MM-DD`.

Os arquivos originais continuam na raiz porque podem ser consumidos por scripts, testes, CI ou processos de publicação. As cópias desta pasta têm cabeçalho de proveniência e não devem ser editadas no lugar do original.

## Snapshots dos três documentos finais

Cada rodada completa deve ser armazenada em uma subpasta própria:

`documentation/snapshots/AAAA-MM-DD/`

A subpasta representa a data em que a rodada foi gerada e deve conter exatamente os três documentos, cada um em Markdown e Word:

- `DOCUMENTO-1-APRESENTACAO-PARA-LEIGOS.md`
- `DOCUMENTO-1-APRESENTACAO-PARA-LEIGOS.docx`
- `DOCUMENTO-2-ARQUITETURA-TECNICA-COMPLETA.md`
- `DOCUMENTO-2-ARQUITETURA-TECNICA-COMPLETA.docx`
- `DOCUMENTO-3-HISTORICO-CRONOLOGICO.md`
- `DOCUMENTO-3-HISTORICO-CRONOLOGICO.docx`

A primeira rodada completa está em [`snapshots/2026-09-01/`](snapshots/2026-09-01/).

Para uma nova rodada, crie outra subpasta com a data correspondente e mantenha intactas todas as subpastas anteriores. Não substitua arquivos dentro de um snapshot existente. Se apenas um ou dois documentos forem atualizados durante o trabalho, conclua os três formatos finais antes de registrar a nova rodada completa.

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
