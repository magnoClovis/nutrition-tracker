# Contrato de reautenticação da CAM-RED-6

## Finalidade

Este contrato conecta exclusivamente a ação explícita **“Entrar novamente”** do estado `session-expired` ao fluxo real de autenticação do Trofia. Fechar a tela de reconhecimento, sozinho, não é reautenticação.

## Fronteira pública

O `NutritionTracker` entrega ao `ImageMealScreen` a prop assíncrona:

```text
onRequestReauthentication(): Promise<void>
```

Ela aponta para `requestReauthenticationAfterSessionExpired()` no controlador. A tela deve chamá-la somente no clique do usuário e manter ações concorrentes bloqueadas enquanto a promise estiver pendente.

## Ordem obrigatória

1. `closeImageMealMode()` cancela operações em andamento, remove a inscrição do fluxo e chama `flow.destroy()`.
2. `flow.destroy()` descarta a fotografia transitória e revoga seu Blob/URL; nenhuma imagem é persistida.
3. Somente depois da conclusão da destruição, o controlador solicita ao shell a transição para autenticação.
4. O shell tenta `fbSignOut()` e limpa o estado autenticado local em `finally`, exibindo a tela real de login mesmo se o sign-out remoto falhar.

Chamadas simultâneas recebem a mesma promise. Quando ela termina, o bloqueio é liberado; não existe retry automático.

## Falhas e recuperação

- Se a destruição falhar, a transição Auth não começa, preservando a ordem fail-closed; a promise rejeita.
- Se o shell Auth não estiver disponível, a promise rejeita com `reauthentication-transition-unavailable`.
- Se o sign-out remoto falhar, o shell ainda volta ao login local e a promise rejeita com `reauthentication-transition-failed`. O usuário permanece em uma superfície recuperável e pode autenticar novamente; a foto já foi eliminada.
- A UI pode traduzir esses códigos para mensagem recuperável. Não deve repetir automaticamente a análise nem a autenticação.

## Limites de segurança

- O contrato não recebe nem registra e-mail, senha, UID, token, headers ou payloads.
- Não modifica Worker, Firestore, App Check, regras, quotas ou outros estados de erro da CAM-RED-6.
- Não cria persistência para a imagem nem para credenciais.
- Os estados `timeout`, rede, Worker/IA, resposta inválida e quota continuam sob o contrato já implementado pela CAM-RED-6.

## Cobertura obrigatória

Os testes UMD e ESM comprovam:

- destruição completa antes da transição Auth;
- coalescência de cliques concorrentes;
- liberação do bloqueio depois de sucesso ou falha;
- rejeição observável e nova tentativa explícita possível;
- presença do callback nos entrypoints Vite e legado.

## Estado da validação

Em 22/09/2026, a implementação passou 76/76 testes focados e o `npm test` agregado completo: preflight limpo, 1.444/1.444 unitários, 107 casos autenticados legado com 8 skips estruturais esperados, 115/115 casos Vite e 60/60 casos da matriz cutover. A integração visual do botão pela frente Trofia-UIUX permanece separada: ela deve consumir este contrato, sem duplicar fechamento, sign-out ou lógica Firebase.

## Integração esperada pela UI/UX

A frente Trofia-UIUX deve apenas consumir `onRequestReauthentication` no botão “Entrar novamente”, aguardar sua promise e representar o estado pendente/erro conforme o visual já aprovado. Não deve chamar `closeImageMealMode()`, Firebase Auth ou qualquer API protegida diretamente.

Chat-Origin: Trofia-Principal
