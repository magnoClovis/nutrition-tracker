# Pendências futuras do Trofia

Este documento registra decisões conscientemente adiadas. Os itens abaixo não foram esquecidos nem cancelados: devem ser reavaliados no início da Tarefa 0 relacionada e antes do marco indicado.

| ID | Pendência deliberadamente adiada | Momento de reavaliação | Estado / risco residual |
|---:|---|---|---|
| P01 | Trocar o contato de privacidade atual (`nutritiontracker.beta@gmail.com`) por um e-mail dedicado. | Antes do lançamento público ou assim que o novo endereço estiver disponível. | Adiado deliberadamente; o endereço atual permanece funcional durante o beta. Depois da troca, atualizar as três políticas, a página pública, o app e o Google Play Console. |
| P02 | Atualizar a URL pública da política quando o Trofia migrar do GitHub Pages para domínio próprio. | Na migração de domínio. | Adiado deliberadamente; enquanto isso, a página trilíngue está publicada em `https://magnoclovis.github.io/nutrition-tracker/privacy/`. Na migração, atualizar também a Play Store e todas as referências internas. |
| P03 | Ativar Cloud Billing no projeto usado pela Gemini API antes de disponibilizar o reconhecimento de refeição por foto a qualquer tester real do EEE, Suíça ou Reino Unido. | Resolvido em 13 de agosto de 2026. | **Concluído — confirmação manual do responsável.** O Cloud Billing está ativo no projeto Gemini. A liberação do C24 continua bloqueada pelos testes físicos e pela validação de qualidade com fotos reais, registrados em `C24_FATIA_7_VALIDACAO.md`. |
| P04 | Implementar expiração automática que garanta retenção máxima de 24 horas para metadados individualizados do rate limiter do Worker. | Resolvido em 1 de agosto de 2026. | **Concluído — PR #86, merge `4acc8af`, Worker versão `6d8fcbdc-c960-4101-92fc-57dcf9f9d46a` ativa em produção.** O alarme persistente limpa os registros individualizados em 23 horas, preservando margem operacional para o teto público de 24 horas, e remove contadores diários obsoletos sem depender de novo tráfego. |
| P05 | Confirmar no Firebase Console a região real da instância do Cloud Firestore e registrar a evidência operacional. | Resolvido em 1 de agosto de 2026. | **Concluído — região confirmada como `europe-southwest1` (Madrid, Espanha, União Europeia).** As três versões da política foram sincronizadas para informar que o Cloud Firestore processa e armazena os dados da conta nessa região; a redação sobre transferências internacionais ficou restrita aos demais prestadores globais. |
| P06 | Publicar a política trilíngue revisada e enviar a atualização do formulário Data Safety do Google Play para incluir fotos de refeição. | Resolvido em 13 de agosto de 2026. | **Concluído — política pública conferida e confirmação manual do responsável de que o Data Safety Form foi enviado no Google Play Console.** A declaração permanece documentada em `GOOGLE_PLAY_DATA_SAFETY.md`. |
| P07 | Comparar ou trocar o modelo `gemini-3.5-flash-lite` usado pelas superfícies de IA. | Em uma Tarefa 0 própria, depois de concluir o C08 com o modelo atual. | Adiado deliberadamente na C08-A; custo, qualidade e limites precisam ser avaliados em conjunto antes de qualquer mudança de modelo ou alias. |
| P08 | Submeter os critérios nutricionais e pesos técnicos a revisão externa por nutricionista. | Após a calibração técnica do C08 e antes do marco público/estável definido pelo responsável. | Validação posterior aprovada e não bloqueante para o trabalho técnico inicial. Qualquer ajuste incompatível deve criar nova versão do contrato; não pode reinterpretar silenciosamente `meal-score-v2` ou resultados históricos. |

## Regra de manutenção

Sempre que uma Tarefa 0 resultar em uma decisão conscientemente adiada, ela deve ser adicionada aqui com:

1. descrição objetiva da decisão;
2. marco em que deve ser reavaliada;
3. risco residual aceito enquanto permanecer pendente;
4. arquivos, serviços ou publicações que precisarão ser atualizados quando a decisão for executada.
