# C14-E — Auth, sessão e onboarding recuperável

## Estado

- **Status:** em andamento.
- **Início comprovado:** 16/09/2026.
- **Responsável:** Trofia-Principal.
- **Branch:** `codex/c14-e-auth-session-onboarding`.

## Propósito

Fechar riscos de autenticação que podem manter uma sessão web além da intenção do usuário, aceitar credenciais abaixo da política aprovada ou deixar uma conta recém-criada com onboarding parcialmente persistido e sem caminho explícito de recuperação.

## Escopo aprovado

1. Exigir no cliente senha mínima de 12 caracteres, sem composição forçada, em cadastro e alteração de senha, com mensagens equivalentes em PT/EN/ES.
2. Oferecer “Manter logado” no login web: desmarcado seleciona persistência Firebase `SESSION`; marcado seleciona `LOCAL`.
3. Preservar persistência adequada no Android nativo, sem aplicar a semântica de fechamento de aba da web ao aplicativo instalado.
4. Não engolir falhas das gravações iniciais do perfil; permitir repetir com segurança a conclusão do onboarding sem criar outra conta.
5. Manter o modal obrigatório de perfil restrito a uma conta recém-criada confirmada; conta existente recebe erro recuperável, nunca o formulário de criação.
6. Cobrir PT/EN/ES, reload, login existente, cadastro novo, falha intermediária, retry idempotente e persistências `SESSION`/`LOCAL`.
7. Alinhar manualmente a política efetiva de senha no Firebase Console antes do encerramento da fatia.

## Achados iniciais

- `firebase-auth-sdk.js` fixa `browserLocalPersistence` durante `initialize()`, sem escolha do usuário.
- `login-screen.js` e `privacy-panel.js` validam apenas 6 caracteres.
- `login-screen.js` ignora falhas de `updateProfile` e de todas as gravações iniciais no Firestore e continua para verificação de e-mail.
- o gate atual já impede conta existente de acessar o modal de criação e será preservado como limite fail-closed.

## Implementação atual

- O adaptador modular deixou de sobrescrever a persistência restaurada durante a inicialização e aplica `SESSION`/`LOCAL` imediatamente antes do login ou cadastro, de acordo com a escolha explícita.
- “Manter logado” aparece somente na web; o Android instalado continua usando persistência local apropriada ao aplicativo.
- Cadastro e alteração de senha exigem 12 caracteres, sem composição forçada, em PT/EN/ES.
- As gravações iniciais do perfil deixaram de ignorar erros. Um checkpoint de sessão com ID estável permite repetir somente a conclusão do onboarding sem criar outra conta.
- O marcador de criação é não sensível, restrito a `sessionStorage` e removido no login normal, logout ou conclusão do perfil; contas antigas continuam fail-closed fora do modal de criação.
- Falha de entrega do e-mail de verificação permanece distinta de falha ao persistir o perfil.

## Validação até o momento

- Testes focados: 83/83 no primeiro conjunto e 33/33 após cobrir separação entre persistência e entrega da verificação.
- Suíte local completa: preflight verde, 1.396 unitários, 48/48 smoke legado, 48/48 smoke Vite e 60/60 cutover.
- PR draft: [#215](https://github.com/magnoClovis/nutrition-tracker/pull/215).
- Preflight documental do PR: verde no run `35120342282`.
- A primeira matriz autenticada (`35120342305`) confirmou preflight, unitários, Worker e Functions, mas revelou uma incompatibilidade do fixture: a nova persistência web `SESSION` não pode ser transportada pelo `storageState` do Playwright para contextos novos. O setup autenticado passou a marcar explicitamente “Manter logado”, usando `LOCAL` apenas no ambiente de teste que precisa reutilizar o estado; a semântica padrão do produto permanece `SESSION`.
- Suíte local completa após o ajuste do fixture: verde novamente — preflight, 1.396 unitários, 48/48 smoke legado, 48/48 smoke Vite e 60/60 cutover.
- CI autenticado real final: run `35126370601` totalmente verde — 1.396 unitários, Worker verde, 74/74 Functions, legado com 103 aprovações e 8 skips Vite-only documentados, e Vite com 111/111 aprovações e zero skips.
- Política de senha do Firebase Console: confirmada manualmente em 16/09/2026 com mínimo 12, máximo 4.096, sem composição forçada e modo **Notificar**. A escolha preserva login de contas antigas potencialmente não conformes; a migração futura para **Exigir a aplicação** está registrada como P11.

## Critérios de aceite

- login web sem opt-in não reaparece após fechar a sessão do navegador; com opt-in, permanece;
- Android continua com persistência compatível com app instalado;
- nenhuma senha nova abaixo de 12 caracteres passa pela UI de cadastro ou troca;
- falha de persistência no cadastro aparece ao usuário, mantém um estado recuperável e pode ser repetida sem novo `createUser`;
- leitura indisponível ou perfil incompleto de conta antiga continua fora do modal de criação;
- testes focados, suíte completa e CI autenticado real ficam verdes;
- configuração manual do Firebase é confirmada com mínimo 12 e a decisão de compatibilidade fica explicitamente documentada.

## Limites

- nenhuma regra de composição obrigatória será adicionada;
- o modo Firebase **Exigir a aplicação** não será ativado sem transição explícita das contas antigas; essa decisão futura está em P11;
- nenhuma senha, token, e-mail real ou dado de perfil será registrado em documentação ou logs;
- mudanças de provedores de login, MFA e recuperação administrativa ficam fora desta fatia.
