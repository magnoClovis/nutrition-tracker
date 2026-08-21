# C22 — Matriz final e rollout controlado

Este documento registra os gates operacionais para concluir a exclusão administrativa, completa e idempotente da conta. Ele não substitui a política pública nem o formulário Data Safety.

## Matriz de validação

| Camada | Evidência exigida | Estado nesta fatia |
|---|---|---|
| Motor puro | Saga idempotente, checkpoints, Auth ausente e entrega duplicada | Coberto pelos testes de Functions. |
| Firestore | Lock concorrente, exclusão recursiva da árvore atual, documentos históricos `nutrition/{uid}_...` e verificação de vazio | Coberto por testes puros e emulador; o caso histórico foi acrescentado na Fatia 7. |
| Retenção administrativa | Job concluído removido; falha permanente com TTL de 7 dias; lock selado com TTL de 7 dias | Coberto por testes e configuração de TTL. |
| Cliente Web | Auth recente, reCAPTCHA Enterprise, resposta aceita, suspensão de autosave, limpeza local e logout | Coberto por unitários, CI autenticado e teste destrutivo real. |
| Cliente Android | Play Integrity real com `PLAY_RECOGNIZED` e `LICENSED` | Exige AAB desta fatia instalado pela faixa interna do Google Play. |
| Produção | Conta descartável sem Auth, Firestore atual/histórico, subcoleções ou job residual | Repetir após o deploy da Fatia 7 para incluir o caminho histórico. |
| Política pública | PT/EN/ES sincronizados e página verificada externamente | Publicar pelo Pages após o merge. |

## Ordem do rollout

1. Mesclar o PR somente com testes locais, CI autenticado e Pages verdes.
2. Publicar Functions, rules, índices e TTL; confirmar Madrid para a callable e Bélgica para fila/reconciliador.
3. Confirmar externamente a política trilíngue publicada em `https://magnoclovis.github.io/nutrition-tracker/privacy/`.
4. Revisar e confirmar o Data Safety do App Check no Play Console.
5. Gerar um novo AAB assinado, com `versionCode` incrementado apenas localmente, e enviá-lo à faixa interna.
6. Instalar o AAB pelo Google Play em um aparelho piloto e executar a exclusão com uma conta descartável criada para esse teste.
7. Confirmar Auth removido, Firestore atual/histórico removido, job concluído removido e ausência de escritas após o aceite.
8. Só depois liberar/solicitar a atualização aos demais testers internos.

## Critérios de parada

- App Check rejeitado no Android instalado pela Play Store;
- pedido aceito sem bloquear novas escritas;
- qualquer dado atual, histórico ou subcoleção remanescente;
- conta Auth remanescente após conclusão;
- job concluído ou payload sensível retido;
- política pública ou Data Safety divergente do comportamento real.

Qualquer critério de parada interrompe o rollout e exige diagnóstico antes de ampliar o acesso.
