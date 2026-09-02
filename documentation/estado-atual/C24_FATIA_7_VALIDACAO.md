> **Cópia documental — validação concluída.** Fonte: `/C24_FATIA_7_VALIDACAO.md`, capturada da `main` no commit `5c51fa5` em 31/08/2026. Registra evidências e gates do reconhecimento por foto já liberado; não representa uma fatia ainda em andamento.

# C24 — Fatia 7: validação e liberação controlada

Esta fatia separa os gates técnicos que não dependem do conteúdo de fotos reais da avaliação de qualidade do reconhecimento. A funcionalidade permanece fora da navegação de produção até a revisão deste resultado e a decisão explícita de liberá-la aos testers.

## Concluído sem fotos reais

- Worker multimodal publicado em produção em 13 de agosto de 2026:
  - endpoint: `POST https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/image-meal`;
  - versão Cloudflare validada: `ca673d16-1464-48ae-937c-520b68780710`;
  - o adaptador interno de imagem usa a Interactions API, com `store: false`, sem alterar o contrato público do Worker;
  - autenticação Firebase, CORS e limites continuam fail-closed;
  - respostas e imagens não são registradas nem persistidas pelo Trofia.
- Política trilíngue publicada e conferida.
- Cloud Billing ativado pelo responsável.
- Data Safety Form atualizado pelo responsável no Google Play Console.
- Build Android de debug concluído com `@capacitor/camera@8.2.1`; APK gerado localmente sem exposição na navegação de produção.

## Matriz Android física

Executada em 17 de agosto de 2026 no Galaxy SM-S938B, Android 16, dispositivo `RFCY10TW2RN`, usando uma variante interna com application ID isolado e sem gravação no diário real.

| Área | Cenários | Resultado |
|---|---|---|
| Permissão | primeira solicitação; negar; tentar novamente; abrir configurações; conceder | Aprovado |
| Câmera | abrir; cancelar; voltar; colocar app em segundo plano; retornar | Aprovado após normalizar o cancelamento nativo da câmera |
| Galeria | escolher; cancelar seletor; selecionar arquivo inválido | Aprovado após normalizar o cancelamento nativo da galeria |
| Prévia | exibir JPEG processado; trocar foto; descartar; confirmar liberação do indicador/cópia temporária | Aprovado |
| Navegação | vazio → captura → prévia → processamento → revisão; voltar/cancelar em cada estado | Aprovado |
| Erros simulados | permissão, foto inválida, nada identificável, cota, sessão, serviço e resposta inválida | Aprovado |
| Persistência simulada | falha mantém tela; sucesso conclui o fluxo, sem gravar no diário da conta de teste | Aprovado (`result` após falha; `confirmed` após sucesso) |

Durante a matriz, o plugin retornou `User cancelled photos app` no cancelamento normal da câmera/galeria. O erro era tratado como indisponibilidade do serviço. A captura agora normaliza os códigos e mensagens nativos conhecidos para `capture-cancelled`; o cancelamento voltou a ser silencioso e foi revalidado no aparelho.

## Comparação High × Medium com fotos reais

- Conjunto privado: 20 fotos sem rostos ou dados pessoais, cobrindo pratos simples, mistos, baixa iluminação, ângulos difíceis e negativos.
- `simples-01.jpg` foi usada apenas como gate High inicial. As outras 19 fotos foram processadas nas duas resoluções; os relatórios sanitizados permaneceram fora do Git.
- High: 17/19 respostas válidas no lote, mediana de 2,683 s e p95 de 4,308 s. Uma chamada teve indisponibilidade transitória e outra atingiu o limite deslizante `image-user`. O gate High separado também retornou HTTP 200.
- Medium: 19/19 respostas válidas. Excluindo um atraso de 112 s causado pela suspensão do aparelho durante o lote, a mediana foi 3,650 s, a média 3,817 s e o p95 6,979 s.
- Qualidade: Medium preservou a identificação principal dos pratos e dos alimentos em todas as fotos úteis, marcou corretamente as duas imagens negativas como não identificáveis e não apresentou perda material frente a High. High classificou uma xícara vazia como bebida incerta; Medium a classificou corretamente como vazia.
- Quantidades, calorias e nutrientes permaneceram estimativas plausíveis para revisão humana, mas não são medição objetiva. Pratos compartilhados, molhos e ingredientes parcialmente ocultos continuam exigindo atenção do usuário no editor.
- Confiança: Medium produziu 15 resultados `high` e 4 `medium`; os estados foram 16 `identified`, 1 `uncertain` e 2 `not-identifiable`.

## Decisão técnica

`MEDIUM` foi escolhida para a primeira liberação controlada. No conjunto avaliado ela manteve a qualidade observável, tratou melhor o negativo ambíguo e usa metade do orçamento nominal de tokens visuais da configuração High (560 em vez de 1.120), reduzindo pressão de custo e cota. A validação estrita integral permanece no Worker.

## Gate de liberação aos testers

Os gates técnicos, de qualidade e compliance estão concluídos. A entrada da tela C24 continua fora da navegação destinada aos testers até a revisão deste PR e a autorização explícita de liberação.

Não usar rostos, documentos, telas, localização visível ou outros dados pessoais no conjunto de validação.
