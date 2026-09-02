> **Cópia documental — referência de compliance atual.** Fonte: `/GOOGLE_PLAY_DATA_SAFETY.md`, capturada da `main` no commit `5c51fa5` em 31/08/2026. Consolida as declarações já enviadas/confirmadas e os pontos que exigem nova atualização se o comportamento do app mudar.

# Google Play Data Safety — Trofia

Este documento registra as respostas operacionais que devem permanecer sincronizadas com o comportamento do aplicativo e com a política pública. Ele não substitui o formulário enviado no Google Play Console.

## Alteração do C24 — reconhecimento de refeição por imagem

Antes de disponibilizar o recurso a qualquer tester real, atualizar o formulário em **Google Play Console > Conteúdo do app > Segurança dos dados** com as respostas abaixo.

| Campo do formulário | Resposta para fotos de refeição | Justificativa |
|---|---|---|
| Categoria de dados | Fotos e vídeos > Fotos | Uma versão processada da foto sai do dispositivo e é enviada ao Worker e à Gemini API. |
| Coletado | Sim | O Google Play considera coleta a transmissão de dados para fora do dispositivo, inclusive por infraestrutura ou prestadores. |
| Compartilhado | Não | Com Cloud Billing ativo, a Gemini atua como prestadora que processa os dados em nome da Hermegas sob as condições aplicáveis ao serviço pago. Essa exceção depende de o tratamento real continuar compatível com os termos e instruções contratuais vigentes. |
| Processado de forma efêmera | Não | O Trofia e o Worker não persistem a foto, mas os termos do serviço pago permitem registros limitados da Gemini para segurança, prevenção de abuso e obrigações legais; portanto, não se afirma que todo o fluxo fica apenas em memória até a resposta. |
| Obrigatório ou opcional | Coleta opcional | O envio só ocorre após ação expressa do usuário, e as demais formas de registrar refeições funcionam sem foto. |
| Finalidade | Funcionalidade do app | A foto é usada exclusivamente para identificar alimentos e estimar quantidades e nutrientes solicitados pelo usuário. |
| Criptografia em trânsito | Sim | Aplicativo, Worker e Gemini usam HTTPS. |
| Venda/publicidade | Não | A Hermegas não vende a foto nem a utiliza para publicidade comportamental. |

## Comportamento que sustenta a declaração

- câmera ao vivo e seleção da galeria são iniciadas pelo usuário;
- a imagem é corrigida, reduzida para no máximo 1.280 px, recodificada como JPEG com qualidade aproximada de 80% e perde os metadados incorporados;
- a versão processada é enviada somente ao endpoint autenticado do Worker e à Gemini API;
- o Worker não registra nem persiste a foto;
- a prévia e a cópia temporária do aplicativo são descartadas ao final do fluxo;
- a foto não entra no diário, Firestore nem backup;
- somente os dados nutricionais revisados e aceitos pelo usuário podem ser salvos;
- o original na galeria e eventuais caches temporários do sistema operacional, navegador ou plugin nativo permanecem sujeitos ao controle e às regras desses componentes.

## Gates de publicação

- [x] Cloud Billing ativo no projeto Gemini usado pelo Trofia.
- [x] Política PT/EN/ES atualizada no código-fonte.
- [x] Política atualizada publicada em `https://magnoclovis.github.io/nutrition-tracker/privacy/`.
- [x] Respostas acima enviadas no Google Play Console.
- [x] Endpoint de imagem publicado e interface exposta somente após os gates anteriores.

## Alteração do C22 — App Check e exclusão administrativa

O C22 adiciona Firebase App Check com Play Integrity no Android e reCAPTCHA Enterprise na Web para proteger a callable de exclusão. O SDK Android transmite o user agent Firebase e, quando a exclusão é solicitada, um token de integridade do Play Integrity. Segundo a documentação oficial do Firebase, esse token não é vinculado a um identificador de usuário ou dispositivo pelo App Check e é usado para prevenção de fraude, segurança e conformidade.

Antes de distribuir o primeiro AAB que contenha o C22, revisar o formulário atual no **Google Play Console > Conteúdo do app > Segurança dos dados** e registrar o comportamento abaixo conforme as opções efetivamente apresentadas pelo Console naquele momento:

| Campo | Declaração operacional do C22 |
|---|---|
| Dado técnico | Token de integridade do Play Integrity e user agent Firebase. |
| Finalidade | Prevenção de fraude, segurança e conformidade; autorizar uma operação administrativa sensível. |
| Vinculado ao usuário/dispositivo | Não pelo Firebase App Check, conforme a documentação do SDK; revalidar o tratamento próprio do Play Integrity no formulário vigente. |
| Compartilhado | Não; Firebase/Google atua como prestador da infraestrutura de segurança, sujeito aos termos aplicáveis. |
| Obrigatório | Somente ao iniciar a exclusão da conta; a callable rejeita pedidos sem atestação válida. |
| Retenção no App Check | Material de atestação não é retido pelo App Check; tokens normais sem replay protection não são retidos depois da validação e têm TTL de uma hora no Trofia. O prestador de atestação segue seus próprios termos. |

### Gate de rollout do C22

- [ ] Política C22 publicada na URL pública.
- [ ] Revisão do formulário Data Safety confirmada no Play Console.
- [ ] Novo AAB instalado a partir da faixa interna do Google Play para validar `PLAY_RECOGNIZED` e `LICENSED`.
- [ ] Exclusão destrutiva validada com uma conta descartável Android.
- [ ] Só então disponibilizar a atualização a todos os testers internos.

## Fontes de referência

- Google Play Console Help — “Provide information for Google Play's Data safety section”: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play Console Help — “User Data”: https://support.google.com/googleplay/android-developer/answer/10144311
- Gemini API Additional Terms of Service: https://ai.google.dev/gemini-api/terms
- Firebase — Privacy and Security in Firebase: https://firebase.google.com/support/privacy
- Firebase — Prepare for Google Play's data disclosure requirements: https://firebase.google.com/docs/android/play-data-disclosure
- Firebase App Check with Play Integrity: https://firebase.google.com/docs/app-check/android/play-integrity-provider

Revalidar estas respostas sempre que os termos dos prestadores, o fluxo técnico ou a finalidade do recurso mudar.
