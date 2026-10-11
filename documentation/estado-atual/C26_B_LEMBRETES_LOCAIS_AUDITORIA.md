# C26-B — Tarefa 0: lembretes locais

**Estado em 11/10/2026:** investigação da base `origin/main` em `8b46ead`; nenhuma notificação local foi implementada, nenhuma permissão foi solicitada e nenhum agendamento foi criado nesta tarefa. A C26-B permanece necessária antes do lançamento público; C26-A (toast dentro do app) e C26-C (push/backend pós-lançamento) são fatias separadas.

## Contrato já aprovado

O [roadmap](ROADMAP.md) prevê consentimento explícito, preferências por tipo, período ativo e silencioso, lembretes de água proporcionais ao déficit e ao tempo restante, início/meio/fim do dia, reagendamento após mudança de água/meta/idioma/fuso e navegação ao tocar. A entrega é local no Android, sem servidor, FCM ou tokens de push. Horários, textos, intensidade e opt-in concretos ainda não foram escolhidos pelo responsável.

## Inventário comprovado no repositório

| Área | Estado e consequência |
| --- | --- |
| Capacitor | `@capacitor/core` e `@capacitor/android` estão em `8.4.2`; `@capacitor/local-notifications` não consta de `package.json`/lockfile. Não há adaptador nem listener de notificações locais. |
| Android | `android/variables.gradle` declara minSdk 24 e target/compileSdk 36. O manifesto principal declara Internet e câmera, mas não `POST_NOTIFICATIONS`; não há canal, ícone de status nem contrato de toque da C26-B. O manifesto final gerado precisará ser verificado após instalar o plugin, sem supor que o manifesto fonte conte toda a história. |
| Dados | `nutrition-tracker-controller.js` mantém `waterGoal` e `waterIntake` por data civil, hidrata-os antes do uso e persiste alterações. `date-utils.js` já possui utilitários de data civil. Um planejador não deve tomar defaults pré-hidratação como dados reais nem converter horário local usando UTC inadvertidamente. |
| Ciclo de vida | `src/composite/android-app-runtime.js` oferece detecção Android e listener de `appStateChange`; `src/App.jsx` concentra bootstrap, idioma, logout e tela de configurações. Há pontos reais de integração, mas nenhum deles agenda ou cancela lembretes hoje. |
| Interface | `settings-panel.js` contém aparência, idioma, dados e conta, sem preferências de lembrete. I4/I6/I8 da UI/UX estão em andamento; a localização visual dessas preferências deve ser combinada com essa frente antes de editar o layout. |
| Web | Não há plano aprovado de Notification API/PWA para a C26-B. A web deve permanecer funcional sem plugin nativo, sem prompt e sem promessa de lembretes com navegador fechado. |

## Restrições da plataforma e riscos

- Android 13+ exige permissão de notificação; o pedido deve ocorrer após uma escolha explícita no app, não no bootstrap. Consentimento no Trofia e permissão do sistema são condições distintas; negação ou revogação precisam produzir estado compreensível sem repetição intrusiva do prompt. [Android — permissão de notificações](https://developer.android.com/develop/ui/compose/notifications/notification-permission), [Capacitor v8 — Local Notifications](https://capacitorjs.com/docs/apis/local-notifications).
- A documentação atual do plugin v8 informa que `isExactNotification` pode assumir `true` por padrão nas versões que o oferecem. Lembretes não críticos devem pedir explicitamente agendamento **inexato** e não adicionar `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` por conveniência. A assinatura exata da versão escolhida deve ser confirmada no lockfile antes de codificar. [Capacitor v8](https://capacitorjs.com/docs/apis/local-notifications), [Android — alarmes](https://developer.android.com/develop/background-work/services/alarms).
- Um lembrete previamente agendado é um retrato local: com o app fechado, ele não consulta Firestore nem recalcula déficit, metas, idioma ou ações feitas em outro dispositivo. Portanto, texto com números/progresso pode ficar falso. Preferir corpo genérico ou horizonte curto; reavaliar em abertura/retorno e a cada mutação local. Não apresentar dado antigo como “progresso atual”.
- Notificações podem aparecer na tela bloqueada e sobreviver ao fechamento da WebView. Evitar valores nutricionais, nomes de refeição, identificadores de conta e outros dados de saúde no texto/`extra`; ao sair, trocar de conta, excluir conta ou desligar lembretes, cancelar apenas os IDs pertencentes à C26-B e retirar notificações já exibidas conforme o contrato escolhido.
- Entrega inexata pode atrasar por Doze, economia de bateria, fabricante, reboot e restrições do sistema; não prometer hora exata. Mudança de fuso, horário de verão e virada civil requerem testes físicos. Preferências de frequência e limite diário precisam impedir excesso de avisos.
- Agendamento e cancelamento têm de ser idempotentes e verificáveis com `getPending()`, sem duplicar mensagens em re-render, login, retorno, edição de água ou instalação de atualização. IDs inteiros e namespace reservado devem impedir colisões com notificações de outras funcionalidades.

## Arquitetura proposta para avaliação — sem implementação nesta Tarefa 0

1. **Modelo puro:** recebe consentimento, tipos ativos, janela, data/hora local, último estado de água comprovadamente hidratado, meta, idioma e conta ativa; devolve uma lista limitada de notificações futuras e razões de supressão. Não lê Firestore nem aciona UI/plugin.
2. **Adaptador Android:** verifica plataforma e permissão, cria canal/ícone apropriados, agenda com inexatidão explícita, compara/cancela somente IDs próprios e registra o listener de toque com cleanup. Fallback web = nenhuma notificação local.
3. **Coordenador por conta/dispositivo:** reconcilia após opt-in, login, hidratação concluída, mutação confirmada de água/meta, mudança de preferência/idioma, retorno ao app, troca de fuso, logout e exclusão. Falha de leitura não deve gerar agendamento otimista; falha do plugin deve aparecer como estado recuperável, sem dizer que agendou quando não agendou.
4. **Interface e textos:** preferências e explicação do consentimento no local aprovado pela UI/UX, PT/EN/ES; payload e ação de toque em rotas estáveis, com autenticação normal antes de abrir a área escolhida. Não incluir informação sensível no texto.
5. **Prova:** testes unitários de calendário/fuso/limites/consentimento/idempotência, testes com plugin injetado, suíte web legado/Vite, CI autenticado e AAB distribuído pela Play em Galaxy físico (permissão concedida/negada, app fechado, modo silencioso, toque, logout, duas contas, troca de fuso e reboot). A validação física é gate, não substituída por emulador.

Esta sequência é uma **proposta técnica**, não autorização para instalar plugin, alterar permissões, publicar AAB ou iniciar push/backend.

## Decisões de produto ainda necessárias antes da implementação

1. Quais tipos começam ligados após o opt-in e quais ficam desligados por padrão? Recomendação: nenhum lembrete até consentimento explícito; cada tipo deve poder ser desligado separadamente.
2. Horários padrão de início/meio/fim do dia, início/fim da janela ativa, período silencioso e limite máximo por dia. Recomendação: presets conservadores editáveis; não inferir hábitos ou horário de dormir de dados nutricionais.
3. Quanto tempo continuar avisando se o app não for aberto e como redigir água/check-ins sem afirmar progresso obsoleto. Recomendação: água contextual somente até o fim do dia calculado; avisos futuros genéricos e pouco frequentes, ou nenhum, até a próxima abertura — escolha explícita.
4. Preferências locais por dispositivo/conta ou sincronizadas entre dispositivos. Recomendação inicial: por conta **e** dispositivo, sem backend adicional; cancelamento obrigatório na troca de conta. A decisão afeta persistência, exclusão e privacidade.
5. Local da configuração e destino de cada toque, alinhados à UI/UX; tom e textos PT/EN/ES. Recomenda-se não mostrar quantidades, peso ou dados de saúde na tela bloqueada.

## Próximo gate

Revisar estas decisões com o responsável e a UI/UX; só então definir a fatia de implementação, atualizar `RESUMO-STATUS.md` com todas as subetapas aprovadas e começar código em PR separado. C26-B funcional continua **não implementada** e não pode ser marcada concluída com este relatório.

## Evolução posterior à Tarefa 0 — 11/10/2026

O PR documental #328 foi mesclado em `e17c5e7`; a autorização posterior iniciou a implementação em branch separada. Para o primeiro candidato, adotaram-se padrões técnicos conservadores e reversíveis, ainda sujeitos a revisão funcional: nada é ativado antes do opt-in; o opt-in liga somente pausas de água, deixando check-ins diários desligados; a janela é selecionável entre 08–18, 09–20 e 10–21, com padrão 09–20; no máximo duas pausas de água são planejadas para o dia civil atual com leitura comprovada, e até três check-ins genéricos por dia são planejados para hoje/amanhã. Texto e payload não contêm quantidades nem dados da conta. Preferências ficam no dispositivo por conta, sem Firestore ou push. O toque leva ao diário depois da autenticação normal.

O candidato usa `@capacitor/local-notifications` 8.3.1, `isExactNotification: false` em cada agendamento e remove `SCHEDULE_EXACT_ALARM` do manifesto mesclado pelo plugin. A checagem de permissão acontece antes de agendar; `requestPermissions()` é chamada somente na ação explícita de ativar. A reconciliação se limita a IDs reservados da C26-B e cancela pendentes/notificações exibidas no logout, troca de conta e opt-out. A web não agenda nem pede permissão.

**Estado do gate:** preflight sem avisos, 1.547/1.547 unitários, smokes locais legado/Vite verdes (casos autenticados pulados por ausência de credenciais nesta worktree), check Chromium CSP e cutover 60/60 verdes; `npm test` terminou com código 0 em 11/10/2026. O build Vite e o APK Android debug com os assets finais passaram. Manifestos mesclados debug **e release** contêm `POST_NOTIFICATIONS` e não contêm `SCHEDULE_EXACT_ALARM`. No commit funcional `b62d2dc` do PR draft #329, preflight 38155092286 e CI autenticado 38155092279 passaram: 1.547 unitários, Worker 44, Functions emuladas 74, legado 177 aprovados + 10 skips estruturais, Vite 187/187, CSP verde e `SMOKE_OUTCOME: success`. Revisão do PR e ensaio físico com AAB ainda pendem. Nenhuma versão foi publicada; a entrega funcional segue **não concluída**.
