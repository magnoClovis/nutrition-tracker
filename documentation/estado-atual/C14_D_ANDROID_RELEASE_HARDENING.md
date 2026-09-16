# C14-D — Hardening Android e cadeia de release

## Estado

- **Status:** em validação; implementação e suíte local concluídas, CI autenticado pendente.
- **Início comprovado:** 16/09/2026.
- **Responsável:** Trofia-Principal.
- **Branch:** `codex/c14-d-android-release`.

## Propósito

Reduzir a exposição de dados locais associados à conta e tornar todo artefato Android release verificável e fail-closed quanto à configuração Firebase, propriedades de segurança do manifesto, assinatura e identidade de versão.

## Escopo aprovado

1. Desligar o Auto Backup Android ou excluir de forma comprovável todos os armazenamentos associados à conta.
2. Auditar e restringir `FileProvider` e caminhos compartilháveis ao mínimo necessário.
3. Negar cleartext traffic explicitamente no artefato release, sem quebrar o runtime HTTPS do Capacitor.
4. Falhar com mensagem clara quando `google-services.json` estiver ausente, inválido ou incompatível com `com.hermegas.trofia`.
5. Verificar no manifesto mesclado as propriedades efetivas de backup, cleartext, aplicação e providers.
6. Verificar assinatura, `versionCode`, `versionName` e SHA-256 do AAB final sem registrar segredos.
7. Cobrir as garantias com testes automatizados e, quando houver novo AAB autorizado, validação física pela Play.

## Critérios de aceite

- o manifesto release efetivo declara backup desabilitado e cleartext negado;
- nenhum `FileProvider` exportado ou caminho amplo permite compartilhamento fora do escopo necessário;
- o build release falha antes do empacotamento se a configuração Firebase real estiver ausente ou não corresponder ao package esperado;
- os verificadores distinguem ausência, placeholder, package incorreto e configuração válida sem imprimir credenciais;
- o AAB pode ter assinatura, versão e hash auditados por comando/script reproduzível;
- o build debug e os testes web não recebem regressões pelas restrições de release;
- documentação, preflight, testes focados, suíte completa e CI autenticado ficam verdes antes do merge.

## Evidências previstas

- diff do manifesto e recursos XML;
- testes dos verificadores de release;
- saída sanitizada do manifesto mesclado e da inspeção do AAB;
- runs local/autenticado e, se aplicável, prova física via Play.

## Implementação e evidências atuais

- `android:allowBackup="false"`, `android:fullBackupContent="false"` e regras de extração excluem todos os domínios de dados tanto do cloud backup quanto da transferência entre dispositivos;
- `android:usesCleartextTraffic="false"` torna a política HTTPS explícita;
- o `FileProvider` não é exportado e compartilha somente o cache privado da aplicação, sem `external-path` ou caminhos persistentes;
- o Gradle valida semanticamente o `google-services.json` do projeto Firebase `nutrition-tracker-780b3` e do package `com.hermegas.trofia`, sem imprimir app id ou chave;
- o verificador inspeciona o manifesto mesclado, confere `versionCode`/`versionName`, exige que `jarsigner` prove `jar verified.` e calcula o SHA-256 do AAB;
- ausência da configuração Firebase ou da assinatura bloqueia o grafo release antes do empacotamento;
- a configuração Firebase real foi usada temporariamente apenas para validar a compilação, com igualdade de SHA-256 conferida na cópia, e removida do worktree em seguida;
- recursos Android compilados com sucesso em `:app:processDebugResources` (`106` tarefas); o manifesto release mesclado também passou no verificador;
- testes focados: `11/11`; unitários completos: `1.386/1.386`; smoke local legado e Vite: `48/48` cada, com apenas os `63` skips autenticados esperados em cada execução; cutover: `60/60`;
- CI autenticado real e métricas do PR permanecem pendentes antes do encerramento formal.

## Limites

- nenhum certificado, keystore, senha, token ou conteúdo sensível será versionado ou exibido;
- `versionCode` local e geração/upload de AAB somente ocorrerão mediante autorização explícita;
- esta fatia não altera Auth, sessão ou onboarding, reservados à C14-E.
