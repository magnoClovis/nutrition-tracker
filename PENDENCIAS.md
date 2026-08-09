# Pendências futuras do Trofia

Este documento registra decisões conscientemente adiadas. Os itens abaixo não foram esquecidos nem cancelados: devem ser reavaliados no início da Tarefa 0 relacionada e antes do marco indicado.

| ID | Pendência deliberadamente adiada | Momento de reavaliação | Estado / risco residual |
|---:|---|---|---|
| P01 | Trocar o contato de privacidade atual (`nutritiontracker.beta@gmail.com`) por um e-mail dedicado. | Antes do lançamento público ou assim que o novo endereço estiver disponível. | Adiado deliberadamente; o endereço atual permanece funcional durante o beta. Depois da troca, atualizar as três políticas, a página pública, o app e o Google Play Console. |
| P02 | Atualizar a URL pública da política quando o Trofia migrar do GitHub Pages para domínio próprio. | Na migração de domínio. | Adiado deliberadamente; enquanto isso, a página trilíngue está publicada em `https://magnoclovis.github.io/nutrition-tracker/privacy/`. Na migração, atualizar também a Play Store e todas as referências internas. |
| P03 | Ativar Cloud Billing no projeto usado pela Gemini API antes de disponibilizar o reconhecimento de refeição por foto a qualquer tester real do EEE, Suíça ou Reino Unido. | **Gate obrigatório do C24:** antes do deploy/exposição da funcionalidade por imagem a testers nessas regiões. | **Decisão revisada e ainda pendente:** o código pode ser desenvolvido e validado sem fotos pessoais, mas o endpoint e a interface não podem ser liberados a testers reais antes da confirmação do faturamento ativo. Com o serviço pago, os termos do Gemini declaram que prompts, arquivos e respostas não são usados para melhorar produtos do Google, sem prejuízo de registros limitados para segurança, prevenção de abuso e obrigações legais. |
| P04 | Implementar expiração automática que garanta retenção máxima de 24 horas para metadados individualizados do rate limiter do Worker. | Resolvido em 1 de agosto de 2026. | **Concluído — PR #86, merge `4acc8af`, Worker versão `6d8fcbdc-c960-4101-92fc-57dcf9f9d46a` ativa em produção.** O alarme persistente limpa os registros individualizados em 23 horas, preservando margem operacional para o teto público de 24 horas, e remove contadores diários obsoletos sem depender de novo tráfego. |
| P05 | Confirmar no Firebase Console a região real da instância do Cloud Firestore e registrar a evidência operacional. | Resolvido em 1 de agosto de 2026. | **Concluído — região confirmada como `europe-southwest1` (Madrid, Espanha, União Europeia).** As três versões da política foram sincronizadas para informar que o Cloud Firestore processa e armazena os dados da conta nessa região; a redação sobre transferências internacionais ficou restrita aos demais prestadores globais. |
| P06 | Publicar a política trilíngue revisada e enviar a atualização do formulário Data Safety do Google Play para incluir fotos de refeição. | **Gate obrigatório do C24:** antes do deploy/exposição da funcionalidade por imagem a qualquer tester real. | A declaração preparada em `GOOGLE_PLAY_DATA_SAFETY.md` classifica fotos como coleta opcional para funcionalidade do app, não efêmera e não compartilhada sob a exceção de prestador aplicável ao serviço Gemini com Cloud Billing ativo. Confirmar a publicação da página e o envio no Play Console antes de marcar como resolvida. |

## Regra de manutenção

Sempre que uma Tarefa 0 resultar em uma decisão conscientemente adiada, ela deve ser adicionada aqui com:

1. descrição objetiva da decisão;
2. marco em que deve ser reavaliada;
3. risco residual aceito enquanto permanecer pendente;
4. arquivos, serviços ou publicações que precisarão ser atualizados quando a decisão for executada.
