# C14-C — Rollout do App Check no Worker de IA

Estado: em andamento desde 10/09/2026. Este documento é o procedimento operacional do rollout; não declara o enforcement concluído antes dos gates reais.

Progresso em 15/09/2026: o Worker `632877f3-e51f-4226-92fa-0b139e51e459` continua publicado em observação e passou no smoke externo; o run autenticado `34478874949` validou a implementação e o debug provider. O PR #189 publicou o cliente, e o PR #191 corrigiu a corrida do gate de perfil descoberta na primeira validação do Pages. Depois do hotfix, Pages, login normal e os três fluxos de IA passaram. A fase 4 foi concluída no Android com o AAB versionCode 16 da CAM-RED-2, instalado pela Play (`installerPackageName=com.android.vending`) e validado no Galaxy SM-S938B com conta descartável. O enforcement continua desligado até a execução controlada da fase 5.

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
5. **Em andamento desde 15/09/2026 — Enforcement:** a promoção isolada de `APP_CHECK_MODE` para `"enforce"` e a sonda fail-closed de modo estão em preparação e ainda não foram publicadas. Ausência ou token inválido passará a receber `401`; indisponibilidade das chaves públicas receberá `503`. O deploy e a matriz física permanecem bloqueados até o Galaxy estar conectado e autorizado pelo usuário. O deployment ativo de baseline foi consultado em 15/09/2026 e aponta 100% para a versão `632877f3-e51f-4226-92fa-0b139e51e459`, que é o alvo explícito de rollback.

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
