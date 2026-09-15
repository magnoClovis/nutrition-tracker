# C14-C — Rollout do App Check no Worker de IA

Estado: concluído em 15/09/2026. O rollout progressivo foi encerrado somente depois das provas externas negativa e legítima no AAB distribuído pela Play.

Fechamento em 15/09/2026: o PR #210 registrou a versão `observe` `632877f3-e51f-4226-92fa-0b139e51e459` para rollback e preparou a promoção isolada. O Worker `cf6f8d82-566c-483f-9fb0-2a587dda0dab` foi publicado com `APP_CHECK_MODE = "enforce"`; o run externo `35024249874` comprovou `401 app-check-required` sem App Check. Na mesma instalação Play versionCode 16, os fluxos Descrever prato, Reconhecer por foto e Avaliar refeição com explicação concluíram via conta descartável, demonstrando que o token Play Integrity legítimo continuou aceito. O rollback não foi necessário.

## Contrato de segurança

Todos os endpoints `/v1/ai/*` continuam exigindo `Authorization: Bearer <Firebase ID token>` e passam também a receber `X-Firebase-AppCheck: <token>`. O Worker valida o token App Check com as chaves públicas oficiais do Firebase, incluindo:

- algoritmo `RS256`, tipo JWT e `kid` conhecido;
- assinatura criptográfica e expiração;
- emissor do projeto Firebase e audiência pelo número do projeto;
- `sub` pertencente à allowlist explícita dos apps Web e Android do Trofia.

As chaves públicas são mantidas em memória conforme `Cache-Control`, com teto de seis horas. Falha ao atualizar chaves nunca transforma um token não verificável em válido. Tokens, UIDs, prompts, fotos e respostas não são registrados.

## Fases obrigatórias

1. **Concluída — Observação:** publicar o Worker com `APP_CHECK_MODE = "observe"`. Tokens válidos e inválidos percorrem a verificação, mas a ausência/invalidade ainda não bloqueia clientes antigos.
2. **Concluída — Clientes:** publicar o cliente Web e gerar um AAB que enviem `X-Firebase-AppCheck` em toda chamada de texto ou imagem.
3. **Concluída — CI:** executar a suíte autenticada com o debug provider registrado do Firebase App Check. O segredo permanece somente no GitHub Actions.
4. **Concluída — Validação real:** Pages e AAB Play versionCode 16 concluíram login e os fluxos Descrever prato, Reconhecer por foto e Avaliar refeição com explicação. A prova Android usou conta descartável, ADB e Galaxy físico.
5. **Concluída — Enforcement:** o Worker `cf6f8d82-566c-483f-9fb0-2a587dda0dab` está publicado com `APP_CHECK_MODE = "enforce"`. A sonda externa sem token foi recusada com `401 app-check-required`, e os três fluxos legítimos do AAB Play versionCode 16 permaneceram operacionais com Play Integrity real. A versão `observe` `632877f3-e51f-4226-92fa-0b139e51e459` foi preservada durante toda a janela como alvo explícito de rollback; nenhum critério de reversão ocorreu.

## Critérios de rollback

Antes do enforcement, registrar o identificador exato da versão Worker em `observe`. Fazer rollback imediato para essa versão se qualquer fluxo legítimo do AAB versionCode 16 retornar `401 app-check-required`, `401 app-check-invalid`, `503 app-check-unavailable`, falhar na inicialização do token, expirar inesperadamente ou encerrar o app; também reverter se a sonda sem App Check não retornar exatamente `401 app-check-required`. A reversão usa `wrangler rollback <observe-version-id>` e deve ser iniciada antes de qualquer fluxo seguinte: comando em até 30 segundos, confirmação operacional esperada em 1–2 minutos e limite máximo de 3 minutos. Confirmar a restauração com uma requisição autenticada sem App Check e corpo vazio: em `observe`, ela deve alcançar a validação do corpo e responder `400 invalid-request`, sem chamar o Gemini. Não remover a obtenção de tokens dos clientes nem enfraquecer a validação criptográfica.

A sonda versionada `scripts/verify-ai-worker-app-check-mode.js` automatiza essa prova negativa com uma conta Firebase descartável criada dinamicamente e removida no mesmo processo. Ela envia `{}` sem `X-Firebase-AppCheck`, não alcança o rate limiter nem o Gemini e aceita somente `400 invalid-request` em `observe` ou `401 app-check-required` em `enforce`.

Como o ambiente local pode sofrer o bloqueio F06 do hostname compartilhado `workers.dev`, `.github/workflows/c14-c5-app-check-gate.yml` executa a mesma sonda em infraestrutura externa: em PR ela exige o baseline ainda publicado em `observe`; depois do deploy, um disparo manual com `expected_mode=enforce` exige a recusa obrigatória. O workflow não contém comandos de deploy ou rollback.

O gate local pré-deploy de 15/09/2026 ficou verde: 35 testes focados, 1.380 unitários, 48 smokes públicos legado, 48 Vite e 60 cenários cutover. Os únicos skips locais foram os 63 cenários autenticados por runtime já documentados, que exigem as credenciais protegidas do CI e serão executados no PR.

## Gate adicional descoberto na validação do Pages

Antes do AAB, o bootstrap autenticado precisava comprovar que inicialização do provedor não era confundida com token App Check válido, que dummy tokens eram rejeitados e que o perfil obrigatório era decidido somente por leitura confirmada no servidor. O PR #191 implementou esse gate; a validação real posterior confirmou que falha de atestação/rede abre erro recuperável, nunca o modal de criação, e que login/reload de conta existente não alcançam esse modal.

## Evidência necessária para conclusão

- suíte unitária completa e testes do Worker verdes;
- CI autenticado real verde usando debug provider;
- Pages publicado e validado com token reCAPTCHA Enterprise real;
- AAB distribuído pela Play e validado com Play Integrity real;
- enforcement publicado e nova verificação pós-deploy verde.

## Evidência da fase 4

- Web: Pages validado depois do PR #191 com login normal e sem modal indevido de perfil; Descrever prato, Reconhecer por foto e Avaliar refeição com explicação passaram.
- Android: AAB versionCode 16, pacote `com.hermegas.trofia`, assinatura reconhecida e instalação pela Play confirmada por `installerPackageName=com.android.vending`.
- Dispositivo: Galaxy SM-S938B, conta descartável, automação ADB; os mesmos três fluxos passaram e nenhuma refeição foi persistida.
- Higiene: foto de teste sanitizada, mídia temporária e log bruto removidos; sessão descartável encerrada; DND, sincronização e timeout de tela restaurados; processos ADB/logcat/scrcpy encerrados.
- Limite da evidência: como `observe` aceita também ausência/invalidade, a recusa criptográfica obrigatória só será comprovada na fase 5.

## Evidência da fase 5

- Deploy: Worker `cf6f8d82-566c-483f-9fb0-2a587dda0dab`, com `APP_CHECK_MODE = "enforce"`.
- Prova negativa: run `35024249874`, executado sobre o merge `f799a93`, recebeu exatamente `401 app-check-required` para uma requisição autenticada sem App Check e corpo vazio, sem alcançar Gemini ou rate limiter.
- Prova legítima Android: AAB Play versionCode 16, pacote `com.hermegas.trofia`, `installerPackageName=com.android.vending`, Galaxy SM-S938B e conta descartável.
- Matriz legítima: Descrever prato retornou estimativa estruturada; Reconhecer por foto retornou estimativa estruturada; Avaliar refeição exibiu nota local e explicação da IA. Nenhuma refeição foi confirmada ou persistida.
- Inferência criptográfica controlada: como o mesmo Worker em `enforce` recusou a ausência de token e aceitou os três fluxos do pacote Play, o cabeçalho produzido pela ponte Play Integrity foi validado pelo contrato do Worker. O logcat não expôs token e não foi usado como fonte de segredo.
- Higiene: sessão descartável encerrada; app finalizado; 38 artefatos temporários removidos do aparelho; mídia sintética removida; DND desligado; sincronização mestre ativa; timeout restaurado para 30 segundos; `stay_on_while_plugged_in` restaurado a `0`; servidor e processos ADB encerrados. A rotação automática ficou ativada inadvertidamente e não foi verificada no fechamento; o usuário a restaurou manualmente. O procedimento permanente passou a exigir captura e comparação explícita de `accelerometer_rotation` antes/depois.
- Rollback: não acionado, pois nenhum fluxo legítimo retornou `401`, `503`, timeout, crash ou falha inesperada.
