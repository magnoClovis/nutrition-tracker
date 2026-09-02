> **Cópia documental — política pública vigente.** Fonte: `/PRIVACY_POLICY_PT-BR.md`, capturada da `main` no commit `5c51fa5` em 31/08/2026. Descreve o comportamento implementado; pendências futuras de contato/domínio permanecem em `PENDENCIAS.md`.

# Política de Privacidade e Exclusão de Dados do Trofia

**Aplicativo:** Trofia (`com.hermegas.trofia`)
**Responsável:** Hermegas
**Versão de referência:** Trofia 0.9.0 Beta
**Última atualização do texto:** 21 de agosto de 2026
**Vigência:** a partir da publicação
**Contato de privacidade e solicitações externas de exclusão:** nutritiontracker.beta@gmail.com
**URL pública:** https://magnoclovis.github.io/nutrition-tracker/privacy/

## 1. Escopo e responsável

Esta política explica como o Trofia coleta, utiliza, armazena, compartilha e exclui dados pessoais. O Trofia é um aplicativo de acompanhamento nutricional em versão beta, destinado a registrar refeições, metas, consumo de água, suplementos, métricas corporais e informações relacionadas.

O responsável pelo tratamento é **Hermegas**. Esta política considera os direitos e princípios do Regulamento Geral sobre a Proteção de Dados da União Europeia (**GDPR**) e da Lei Geral de Proteção de Dados Pessoais do Brasil (**LGPD**), conforme aplicáveis ao usuário e ao tratamento realizado.

## 2. Dados tratados

O Trofia pode tratar:

- dados de conta: endereço de e-mail, identificador Firebase, nome de exibição, estado de verificação e datas de acesso;
- dados de perfil: data de nascimento, gênero, altura, idioma, nível de atividade e preferências;
- dados nutricionais: refeições, horários, alimentos, nutrientes, despensa, modelos de refeições, notas, água, suplementos e metas;
- métricas corporais: peso, IMC calculado, percentual de gordura, cintura, massa muscular e histórico;
- informações sobre dias de treino ou descanso e histórico de objetivos;
- prompts, fotos de refeição enviadas voluntariamente às funcionalidades de inteligência artificial, contexto nutricional necessário ao pedido e respostas geradas;
- códigos de barras consultados quando o usuário utiliza o scanner;
- conteúdo e anexos enviados voluntariamente pelo formulário de feedback;
- configurações, caches e estado de sessão armazenados no dispositivo;
- metadados técnicos necessários para autenticação, segurança e controle de limite das chamadas de IA;
- materiais de atestação de integridade do aplicativo, tokens Firebase App Check e dados técnicos de jobs administrativos de exclusão.

A senha é processada pelo Firebase Authentication e não fica disponível para a Hermegas.

## 3. Finalidades

Os dados são usados para:

- criar, autenticar e manter a conta;
- sincronizar dados entre sessões e dispositivos;
- registrar e apresentar o diário nutricional;
- calcular metas, totais, gráficos e históricos;
- gerar sugestões e estimativas por IA, inclusive reconhecer alimentos e estimar nutrientes em fotos de refeição, quando solicitado;
- consultar informações de produtos por código de barras;
- exportar, importar e restaurar backups;
- aplicar limites de uso e proteger o serviço;
- verificar se pedidos administrativos sensíveis partem do aplicativo legítimo e processar a exclusão segura da conta;
- responder a feedbacks, solicitações de privacidade e incidentes;
- cumprir obrigações legais e manter a segurança.

## 4. Bases legais

Conforme o GDPR, a LGPD e outras normas aplicáveis, o tratamento poderá se basear:

- na execução do serviço solicitado pelo usuário;
- no consentimento, quando exigido para funcionalidades opcionais;
- no interesse legítimo de manter segurança, estabilidade e prevenção de abuso, após avaliação dos direitos do usuário;
- no cumprimento de obrigação legal ou regulatória;
- no exercício regular de direitos e no atendimento de solicitações do titular.

Quando o tratamento depender de consentimento, ele poderá ser retirado a qualquer momento, sem afetar o tratamento realizado licitamente antes da retirada.

## 5. Inteligência artificial

Quando o usuário aciona uma funcionalidade de IA, o Trofia envia o prompt e o contexto nutricional necessário para um Cloudflare Worker. No reconhecimento de refeição por imagem, o conteúdo também inclui a foto que o próprio usuário capturou ou escolheu. O Worker valida a sessão Firebase, aplica limites de uso e encaminha o conteúdo para a Gemini API do Google.

O código do Worker não grava prompts, fotos ou respostas em banco de dados e sua observabilidade está desabilitada. Para controlar limites, o Durable Object mantém registros técnicos contendo o identificador Firebase e horários recentes, além de contadores diários agregados. Esses registros não contêm o texto do prompt, a foto nem a resposta. A política técnica definida para publicação limita metadados individualizados a no máximo 24 horas.

Durante o teste beta, o Trofia pode utilizar a cota não paga da Gemini API. Conforme os termos do Google, em utilizações não pagas e fora do Espaço Econômico Europeu, Suíça e Reino Unido, entradas, arquivos enviados — inclusive imagens — e respostas podem ser utilizados para fornecer, melhorar e desenvolver produtos do Google e podem ser processados por revisores humanos. Os termos do Google aplicam condições diferentes ao serviço pago e aos usuários do Espaço Econômico Europeu, Suíça e Reino Unido. Como decisão adicional de privacidade, o Trofia exige faturamento ativo no projeto Gemini antes de disponibilizar o reconhecimento por foto a qualquer tester real nessas regiões; com o serviço pago, o Google declara que não utiliza prompts, arquivos ou respostas para melhorar seus produtos, embora possa manter registros limitados para segurança, prevenção de abuso e obrigações legais.

As respostas de IA podem conter erros e não substituem aconselhamento médico ou nutricional profissional. O usuário não deve incluir diagnósticos, prontuários, prescrições ou outros dados confidenciais desnecessários no texto enviado à IA.

## 6. Código de barras, câmera e fotos de refeição

No scanner de código de barras, a câmera é acessada somente quando o usuário inicia o scanner. As imagens de vídeo são processadas localmente para identificar o código e não são armazenadas nem enviadas pelo Trofia.

O código detectado pode ser enviado ao Open Food Facts para consultar dados públicos do produto. A precisão e disponibilidade dessas informações dependem dessa base externa.

No reconhecimento de refeição por imagem, o usuário escolhe expressamente tirar uma foto ou selecionar uma imagem da galeria. Antes do envio, o aplicativo corrige a orientação, redimensiona a imagem para no máximo 1.280 pixels, converte-a para JPEG com qualidade aproximada de 80% e a recodifica, removendo metadados incorporados. A versão processada é enviada por HTTPS, através do Worker autenticado do Trofia, para a Gemini API, que identifica alimentos e estima quantidades e nutrientes.

A foto não é salva na conta, no diário nem nos backups do Trofia, e o Worker não a persiste nem a inclui em logs. O aplicativo descarta sua prévia e sua cópia temporária após o fluxo. O sistema operacional, o navegador ou o plugin nativo podem manter temporariamente arquivos de captura sob suas próprias regras, e a foto original escolhida da galeria permanece sob controle do usuário. Se o usuário revisar e aceitar o resultado, somente os dados nutricionais derivados e editados são gravados no diário. O uso desse recurso é opcional; as outras formas de registrar refeições continuam disponíveis sem envio de foto.

## 7. Feedback

Ao escolher “Enviar feedback”, o usuário é direcionado a um Google Forms. O formulário pode receber os textos, dados de contato e imagens que o próprio usuário decidir enviar.

Essas informações ficam sujeitas às políticas do Google. A Hermegas pretende manter as respostas por até **12 meses**, salvo necessidade legítima de retenção por prazo maior, e poderá apagá-las antes mediante solicitação válida do usuário.

## 8. Prestadores e serviços externos

O Trofia utiliza:

- Firebase Authentication, para autenticação;
- Firebase App Check, com Play Integrity no Android e reCAPTCHA Enterprise na Web, para atestar a origem de pedidos administrativos sensíveis;
- Cloud Firestore, para processar e armazenar os dados da conta na região `europe-southwest1` (Madrid, Espanha, União Europeia);
- Cloud Functions for Firebase, para receber o pedido autenticado de exclusão na região `europe-southwest1` (Madrid, Espanha, União Europeia);
- Google Cloud Tasks e Cloud Scheduler, para processar, repetir e reconciliar jobs de exclusão na região `europe-west1` (Bélgica, União Europeia);
- Cloudflare Workers e Durable Objects, para intermediar e limitar chamadas de IA;
- Gemini API, para processar funcionalidades de IA, inclusive fotos de refeição enviadas voluntariamente;
- GitHub Pages, para disponibilizar a aplicação web e a política pública;
- Open Food Facts, para consultas de produtos;
- Google Forms, quando o usuário envia feedback;
- Google Play, para distribuição Android e para o processamento próprio do Google relacionado a instalação, segurança e diagnóstico.

O Cloud Firestore e a função que aceita pedidos de exclusão processam dados na região `europe-southwest1`, em Madrid, Espanha. A fila e o reconciliador desses pedidos operam na região `europe-west1`, na Bélgica. Essas regiões ficam dentro da União Europeia. Fora desses serviços regionais, o Firebase Authentication e serviços globais como Firebase App Check e seus prestadores de atestação, Gemini API, Cloudflare Workers, GitHub Pages, Google Forms e Google Play podem processar informações fora da União Europeia, de acordo com a natureza de seus serviços, seus termos, políticas e mecanismos legais de transferência internacional. Para a Gemini API, aplicam-se também as condições específicas descritas na seção 5.

O Trofia não integra atualmente Firebase Analytics nem Firebase Crashlytics. Dados de instalação ou diagnóstico processados diretamente pelo Google Play seguem as políticas do Google e não significam necessariamente que a Hermegas receba dados individualizados.

## 9. Compartilhamento

O Trofia não vende dados pessoais nem os utiliza para publicidade comportamental.

Dados são compartilhados somente quando necessários para prestar as funcionalidades solicitadas, operar a infraestrutura, proteger o serviço, atender solicitações do usuário ou cumprir obrigações legais.

## 10. Retenção

Os dados da conta permanecem no Firebase enquanto a conta existir ou até que sejam excluídos.

O estado local de sessão e determinados caches permanecem no dispositivo até serem substituídos, apagados pelo aplicativo ou pelo sistema, ou eliminados ao limpar os dados ou desinstalar o aplicativo.

Prompts, fotos de refeição e respostas não são armazenados pelo código do Worker. A foto é mantida pelo aplicativo apenas durante o fluxo necessário para processar e revisar o resultado e depois é descartada, ressalvados caches temporários controlados pelo sistema operacional, navegador ou plugin nativo. A retenção realizada pelo Gemini e por outros prestadores segue seus próprios termos, inclusive os períodos limitados aplicáveis à segurança, prevenção de abuso e obrigações legais. Metadados individualizados usados para limitar chamadas de IA deverão ser mantidos por no máximo 24 horas; contadores globais agregados poderão ser mantidos durante o dia de cota correspondente e pelo tempo técnico necessário à sua substituição.

O Firebase App Check não retém o material de atestação recebido, mas o envia ao prestador configurado para validação conforme os termos desse prestador. Os tokens App Check bem-sucedidos têm validade configurada de uma hora e são renovados automaticamente; como o Trofia não usa proteção contra replay, esses tokens não são retidos pelos serviços Firebase após a validação normal.

Um job de exclusão concluído é removido imediatamente. Se todas as tentativas automáticas falharem, o job mantém somente o identificador Firebase, o identificador do pedido, a etapa e o código técnico sanitizado da falha, para reconciliação e suporte, e é marcado para expirar em sete dias. Após uma exclusão concluída, o lock administrativo selado também é marcado para expirar em sete dias. A remoção física por TTL pode ocorrer de forma assíncrona. Esses registros não contêm senha nem dados nutricionais.

Respostas enviadas pelo formulário de feedback são mantidas por até 12 meses, salvo necessidade legal, segurança, investigação de incidente ou solicitação válida de exclusão antecipada.

Backups exportados permanecem sob controle do usuário. O Trofia não consegue apagar arquivos já baixados, copiados ou compartilhados pelo usuário.

Após uma solicitação válida de exclusão, a Hermegas não pretende conservar deliberadamente dados associados à conta, exceto quando a retenção for necessária para cumprir obrigação legal, exercer direitos, prevenir fraude ou proteger a segurança. Prestadores podem manter cópias transitórias ou registros conforme seus próprios prazos legais e técnicos.

## 11. Backup e exportação

O usuário pode exportar dados em arquivos JSON e outros formatos disponíveis. Esses arquivos podem conter dados pessoais e nutricionais e devem ser guardados com segurança.

A importação pode anexar ou substituir categorias selecionadas conforme a escolha apresentada no aplicativo.

Fotos de refeição não são incluídas nos backups. Quando o usuário aceita uma análise por imagem, o backup pode conter somente as entradas nutricionais derivadas que foram revisadas e gravadas no diário.

## 12. Exclusão da conta e dos dados

No aplicativo, o caminho é:

**Configurações → Privacidade e segurança → Excluir conta.**

O usuário deve informar novamente sua senha e digitar a confirmação exibida. Após reautenticação recente, o aplicativo envia um pedido protegido por Firebase Authentication e Firebase App Check à função administrativa. Quando o backend aceita o job, o aplicativo suspende novas gravações, apaga os dados locais associados à conta — preservando somente preferências neutras de idioma e tema — e encerra a sessão. A mensagem “Exclusão iniciada” indica que o processamento continuará em segundo plano.

O backend aplica um lock que bloqueia novas escritas, exclui recursivamente os dados nutricionais atuais e históricos do usuário no Firestore, confirma que esses dados foram removidos e só então exclui a conta do Firebase Authentication. O processamento é idempotente, usa tentativas com backoff e um reconciliador periódico. Jobs concluídos são removidos imediatamente; falhas permanentes mantêm apenas os metadados técnicos sanitizados descritos na seção 10 e são marcadas para expirar em sete dias.

Se o pedido não puder ser aceito, nenhum dado local é apagado e o usuário pode tentar novamente. Se um job já aceito não puder ser concluído automaticamente, o usuário deve entrar em contato pelo e-mail **nutritiontracker.beta@gmail.com** para investigação dentro do prazo aplicável.

Também é possível solicitar a exclusão sem acesso ao aplicativo enviando uma mensagem para **nutritiontracker.beta@gmail.com** a partir do endereço da conta, ou fornecendo informações suficientes para que a identidade seja verificada. A solicitação será respondida e tratada em até **30 dias**, salvo prazo diferente exigido pela legislação aplicável.

Arquivos de backup baixados e outras cópias mantidas pelo usuário não são apagados. O fluxo aceito limpa do aplicativo os dados locais vinculados à conta e preserva somente idioma e tema; caches controlados pelo sistema operacional ou cópias externas ainda podem exigir a limpeza dos dados do aplicativo, sua desinstalação ou ação do próprio usuário. Prestadores podem manter cópias transitórias ou registros exigidos para segurança e obrigações legais conforme suas políticas.

## 13. Direitos do usuário

Conforme aplicável pelo GDPR, LGPD ou outra legislação, o usuário pode solicitar acesso, confirmação de tratamento, correção, exportação, portabilidade, exclusão, anonimização, restrição ou oposição, além de informações sobre compartilhamento e bases legais.

O usuário também pode retirar consentimento quando essa for a base utilizada e apresentar reclamação à autoridade de proteção de dados competente.

Solicitações devem ser enviadas a **nutritiontracker.beta@gmail.com** e serão respondidas em até 30 dias, salvo prazo legal diferente.

## 14. Segurança

O Trofia utiliza autenticação Firebase, reautenticação recente para operações sensíveis, Firebase App Check, tokens de sessão, regras de acesso, lock administrativo de escrita e conexões HTTPS. O proxy de IA exige autenticação e aplica limites por usuário e globais.

Nenhum sistema é totalmente livre de riscos. O usuário deve proteger sua senha e seus arquivos de backup.

## 15. Crianças e adolescentes

O Trofia não é destinado a menores de **16 anos**. Pessoas com 16 ou 17 anos devem utilizar o serviço de acordo com a legislação aplicável e, quando necessário, com autorização e supervisão de responsável legal.

## 16. Limitações nutricionais

O Trofia fornece cálculos e estimativas para fins informativos. Resultados podem variar devido a porções, marcas, preparo, informações cadastradas, bases externas e limitações da IA.

O aplicativo não realiza diagnóstico, tratamento ou acompanhamento clínico e não substitui profissionais de saúde.

## 17. Alterações

Esta política poderá ser atualizada quando houver mudanças no produto, nos prestadores ou na legislação. Alterações relevantes serão comunicadas pelo aplicativo, pela página pública ou por outro meio apropriado.
