# Política de Privacidade e Exclusão de Dados do Trofia

**Aplicativo:** Trofia (`com.hermegas.trofia`)  
**Responsável:** Hermegas  
**Versão de referência:** Trofia 0.8.1 Beta  
**Última atualização do texto:** 1 de agosto de 2026  
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
- prompts enviados às funcionalidades de inteligência artificial, contexto nutricional necessário ao pedido e respostas geradas;
- códigos de barras consultados quando o usuário utiliza o scanner;
- conteúdo e anexos enviados voluntariamente pelo formulário de feedback;
- configurações, caches e estado de sessão armazenados no dispositivo;
- metadados técnicos necessários para autenticação, segurança e controle de limite das chamadas de IA.

A senha é processada pelo Firebase Authentication e não fica disponível para a Hermegas.

## 3. Finalidades

Os dados são usados para:

- criar, autenticar e manter a conta;
- sincronizar dados entre sessões e dispositivos;
- registrar e apresentar o diário nutricional;
- calcular metas, totais, gráficos e históricos;
- gerar sugestões e estimativas por IA quando solicitadas;
- consultar informações de produtos por código de barras;
- exportar, importar e restaurar backups;
- aplicar limites de uso e proteger o serviço;
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

Quando o usuário aciona uma funcionalidade de IA, o Trofia envia o prompt e o contexto nutricional necessário para um Cloudflare Worker. O Worker valida a sessão Firebase, aplica limites de uso e encaminha o conteúdo para a Gemini API do Google.

O código do Worker não grava prompts nem respostas em banco de dados e sua observabilidade está desabilitada. Para controlar limites, o Durable Object mantém registros técnicos contendo o identificador Firebase e horários recentes, além de contadores diários agregados. Esses registros não contêm o texto do prompt nem da resposta. A política técnica definida para publicação limita metadados individualizados a no máximo 24 horas.

Durante o teste beta, o Trofia pode utilizar a cota não paga da Gemini API. Conforme os termos do Google, em utilizações não pagas e fora do Espaço Econômico Europeu, Suíça e Reino Unido, entradas e respostas podem ser utilizadas para fornecer, melhorar e desenvolver produtos do Google e podem ser processadas por revisores humanos. Os termos do Google aplicam condições diferentes no Espaço Econômico Europeu, Suíça e Reino Unido e exigem serviço pago para clientes de API disponibilizados a usuários nessas regiões. O Trofia deverá migrar para um projeto com faturamento ativo antes do lançamento público nessas regiões.

As respostas de IA podem conter erros e não substituem aconselhamento médico ou nutricional profissional. O usuário não deve incluir diagnósticos, prontuários, prescrições ou outros dados confidenciais desnecessários no texto enviado à IA.

## 6. Código de barras e câmera

A câmera é acessada somente quando o usuário inicia o scanner. As imagens de vídeo são processadas localmente para identificar o código e não são armazenadas nem enviadas pelo Trofia.

O código detectado pode ser enviado ao Open Food Facts para consultar dados públicos do produto. A precisão e disponibilidade dessas informações dependem dessa base externa.

## 7. Feedback

Ao escolher “Enviar feedback”, o usuário é direcionado a um Google Forms. O formulário pode receber os textos, dados de contato e imagens que o próprio usuário decidir enviar.

Essas informações ficam sujeitas às políticas do Google. A Hermegas pretende manter as respostas por até **12 meses**, salvo necessidade legítima de retenção por prazo maior, e poderá apagá-las antes mediante solicitação válida do usuário.

## 8. Prestadores e serviços externos

O Trofia utiliza:

- Firebase Authentication, para autenticação;
- Cloud Firestore, para processar e armazenar os dados da conta na região `europe-southwest1` (Madrid, Espanha, União Europeia);
- Cloudflare Workers e Durable Objects, para intermediar e limitar chamadas de IA;
- Gemini API, para processar funcionalidades de IA;
- GitHub Pages, para disponibilizar a aplicação web e a política pública;
- Open Food Facts, para consultas de produtos;
- Google Forms, quando o usuário envia feedback;
- Google Play, para distribuição Android e para o processamento próprio do Google relacionado a instalação, segurança e diagnóstico.

O Cloud Firestore processa e armazena os dados da conta na região `europe-southwest1`, em Madrid, Espanha, dentro da União Europeia. Fora do Cloud Firestore, o Firebase Authentication é operado a partir de centros de dados nos Estados Unidos, e serviços globais como Gemini API, Cloudflare Workers, GitHub Pages, Google Forms e Google Play podem processar informações fora da União Europeia, de acordo com a natureza de seus serviços, seus termos, políticas e mecanismos legais de transferência internacional. Para a Gemini API, aplicam-se também as condições específicas descritas na seção 5.

O Trofia não integra atualmente Firebase Analytics nem Firebase Crashlytics. Dados de instalação ou diagnóstico processados diretamente pelo Google Play seguem as políticas do Google e não significam necessariamente que a Hermegas receba dados individualizados.

## 9. Compartilhamento

O Trofia não vende dados pessoais nem os utiliza para publicidade comportamental.

Dados são compartilhados somente quando necessários para prestar as funcionalidades solicitadas, operar a infraestrutura, proteger o serviço, atender solicitações do usuário ou cumprir obrigações legais.

## 10. Retenção

Os dados da conta permanecem no Firebase enquanto a conta existir ou até que sejam excluídos.

O estado local de sessão e determinados caches permanecem no dispositivo até serem substituídos, apagados pelo aplicativo ou pelo sistema, ou eliminados ao limpar os dados ou desinstalar o aplicativo.

Prompts e respostas não são armazenados pelo código do Worker. A retenção realizada pelo Gemini e por outros prestadores segue seus próprios termos. Metadados individualizados usados para limitar chamadas de IA deverão ser mantidos por no máximo 24 horas; contadores globais agregados poderão ser mantidos durante o dia de cota correspondente e pelo tempo técnico necessário à sua substituição.

Respostas enviadas pelo formulário de feedback são mantidas por até 12 meses, salvo necessidade legal, segurança, investigação de incidente ou solicitação válida de exclusão antecipada.

Backups exportados permanecem sob controle do usuário. O Trofia não consegue apagar arquivos já baixados, copiados ou compartilhados pelo usuário.

Após uma solicitação válida de exclusão, a Hermegas não pretende conservar deliberadamente dados associados à conta, exceto quando a retenção for necessária para cumprir obrigação legal, exercer direitos, prevenir fraude ou proteger a segurança. Prestadores podem manter cópias transitórias ou registros conforme seus próprios prazos legais e técnicos.

## 11. Backup e exportação

O usuário pode exportar dados em arquivos JSON e outros formatos disponíveis. Esses arquivos podem conter dados pessoais e nutricionais e devem ser guardados com segurança.

A importação pode anexar ou substituir categorias selecionadas conforme a escolha apresentada no aplicativo.

## 12. Exclusão da conta e dos dados

No aplicativo, o caminho é:

**Configurações → Privacidade e segurança → Excluir conta.**

O usuário deve informar novamente sua senha e confirmar a operação. O fluxo solicita primeiro a exclusão dos documentos associados no Firestore e, depois, a exclusão da conta no Firebase Authentication.

Se uma etapa detectável falhar, o aplicativo informa o erro e a exclusão pode ter sido parcial. Nesse caso, o usuário deve entrar em contato pelo e-mail **nutritiontracker.beta@gmail.com**.

Também é possível solicitar a exclusão sem acesso ao aplicativo enviando uma mensagem para **nutritiontracker.beta@gmail.com** a partir do endereço da conta, ou fornecendo informações suficientes para que a identidade seja verificada. A solicitação será respondida e tratada em até **30 dias**, salvo prazo diferente exigido pela legislação aplicável.

Arquivos de backup baixados e outras cópias mantidas pelo usuário não são apagados. Dados locais residuais podem exigir a limpeza dos dados do aplicativo ou sua desinstalação. Prestadores podem manter cópias transitórias ou registros exigidos para segurança e obrigações legais conforme suas políticas.

## 13. Direitos do usuário

Conforme aplicável pelo GDPR, LGPD ou outra legislação, o usuário pode solicitar acesso, confirmação de tratamento, correção, exportação, portabilidade, exclusão, anonimização, restrição ou oposição, além de informações sobre compartilhamento e bases legais.

O usuário também pode retirar consentimento quando essa for a base utilizada e apresentar reclamação à autoridade de proteção de dados competente.

Solicitações devem ser enviadas a **nutritiontracker.beta@gmail.com** e serão respondidas em até 30 dias, salvo prazo legal diferente.

## 14. Segurança

O Trofia utiliza autenticação Firebase, tokens de sessão, regras de acesso e conexões HTTPS. O proxy de IA exige autenticação e aplica limites por usuário e globais.

Nenhum sistema é totalmente livre de riscos. O usuário deve proteger sua senha e seus arquivos de backup.

## 15. Crianças e adolescentes

O Trofia não é destinado a menores de **16 anos**. Pessoas com 16 ou 17 anos devem utilizar o serviço de acordo com a legislação aplicável e, quando necessário, com autorização e supervisão de responsável legal.

## 16. Limitações nutricionais

O Trofia fornece cálculos e estimativas para fins informativos. Resultados podem variar devido a porções, marcas, preparo, informações cadastradas, bases externas e limitações da IA.

O aplicativo não realiza diagnóstico, tratamento ou acompanhamento clínico e não substitui profissionais de saúde.

## 17. Alterações

Esta política poderá ser atualizada quando houver mudanças no produto, nos prestadores ou na legislação. Alterações relevantes serão comunicadas pelo aplicativo, pela página pública ou por outro meio apropriado.
