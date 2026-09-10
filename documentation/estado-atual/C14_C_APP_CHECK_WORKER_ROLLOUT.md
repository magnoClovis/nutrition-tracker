# C14-C — Rollout do App Check no Worker de IA

Estado: em andamento desde 10/09/2026. Este documento é o procedimento operacional do rollout; não declara o enforcement concluído antes dos gates reais.

Progresso em 10/09/2026: o Worker `632877f3-e51f-4226-92fa-0b139e51e459` está publicado em observação e passou no smoke externo; o run autenticado `34478874949` validou a implementação e o debug provider. O cliente ainda aguarda merge/publicação e o enforcement continua desligado.

## Contrato de segurança

Todos os endpoints `/v1/ai/*` continuam exigindo `Authorization: Bearer <Firebase ID token>` e passam também a receber `X-Firebase-AppCheck: <token>`. O Worker valida o token App Check com as chaves públicas oficiais do Firebase, incluindo:

- algoritmo `RS256`, tipo JWT e `kid` conhecido;
- assinatura criptográfica e expiração;
- emissor do projeto Firebase e audiência pelo número do projeto;
- `sub` pertencente à allowlist explícita dos apps Web e Android do Trofia.

As chaves públicas são mantidas em memória conforme `Cache-Control`, com teto de seis horas. Falha ao atualizar chaves nunca transforma um token não verificável em válido. Tokens, UIDs, prompts, fotos e respostas não são registrados.

## Fases obrigatórias

1. **Observação:** publicar o Worker com `APP_CHECK_MODE = "observe"`. Tokens válidos e inválidos percorrem a verificação, mas a ausência/invalidade ainda não bloqueia clientes antigos.
2. **Clientes:** publicar o cliente Web e gerar um AAB que enviem `X-Firebase-AppCheck` em toda chamada de texto ou imagem.
3. **CI:** executar a suíte autenticada com o debug provider registrado do Firebase App Check. O segredo permanece somente no GitHub Actions.
4. **Validação real:** confirmar no Pages e em um AAB instalado pela Play que texto, foto e ao menos um endpoint estruturado respondem com sucesso.
5. **Enforcement:** alterar exclusivamente `APP_CHECK_MODE` para `"enforce"`, publicar o Worker e repetir os smokes reais. Ausência ou token inválido passa a receber `401`; indisponibilidade das chaves públicas recebe `503`.

## Critérios de rollback

Se um cliente legítimo falhar após o enforcement, restaurar imediatamente `APP_CHECK_MODE = "observe"` e republicar o Worker. Não remover a obtenção de tokens dos clientes nem enfraquecer a validação criptográfica. Investigar a plataforma afetada antes de tentar novo enforcement.

## Evidência necessária para conclusão

- suíte unitária completa e testes do Worker verdes;
- CI autenticado real verde usando debug provider;
- Pages publicado e validado com token reCAPTCHA Enterprise real;
- AAB distribuído pela Play e validado com Play Integrity real;
- enforcement publicado e nova verificação pós-deploy verde.
