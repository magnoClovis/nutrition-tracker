# I3 — Política e migração de tema

## Estado

- **Fatia:** I3 — Política e migração de tema.
- **Status:** em andamento.
- **Chat responsável:** Trofia-UIUX.
- **Decisão de produto:** aprovada em 27/09/2026.
- **Implementação runtime:** não iniciada.
- **Protótipo visual:** exploratório e ainda não aprovado; a versão que apresentava aviso de migração ficou superada por esta política.

## Objetivo

Estabelecer o tema claro como ponto de partida consistente no app e na web, inclusive antes da autenticação, sem retirar do usuário a possibilidade de escolher tema escuro ou acompanhar o sistema depois da migração única.

## Contrato aprovado

1. O tema claro é o padrão global do produto, incluindo login, registro e demais telas públicas.
2. Uma pessoa nova inicia no tema claro e não recebe aviso de migração.
3. Login e demais telas públicas continuam oferecendo alternância manual entre claro e escuro.
4. Quando esta política for lançada, usuários existentes serão migrados uma única vez e silenciosamente para o tema claro, mesmo que possuam uma preferência escura anterior à migração.
5. Não haverá modal, banner, toast ou qualquer outro aviso sobre essa mudança.
6. Não será criado um campo para controlar se o usuário viu um aviso, porque não existirá aviso.
7. Depois da migração única, qualquer escolha feita pelo usuário — claro, escuro ou sistema — volta a ser respeitada normalmente.
8. No modo sistema, o tema acompanha a preferência do dispositivo.
9. Após a autenticação, uma preferência de conta escolhida depois da migração prevalece sobre o estado visual temporário da tela pública.
10. A migração precisa ser idempotente: uma preferência escolhida após a migração jamais pode ser sobrescrita novamente por reexecução, reload, reinstalação ou login em outro dispositivo.

## Ordem esperada de resolução

| Contexto | Resultado esperado |
|---|---|
| Primeira abertura sem sessão | Tema claro. |
| Login ou registro antes da autenticação | Tema claro por padrão, com alternância manual claro/escuro disponível. |
| Nova conta | Tema claro, sem aviso. |
| Conta existente ainda não migrada | Tema claro aplicado silenciosamente uma única vez, substituindo a preferência anterior. |
| Conta já migrada e sem nova escolha | Tema claro. |
| Conta já migrada que escolheu escuro | Tema escuro após autenticação. |
| Conta já migrada que escolheu sistema | Tema resolvido pela preferência do dispositivo. |

## Limites e decisões ainda pendentes

- O mecanismo idempotente da migração ainda será definido tecnicamente. Ele pode usar uma versão de política/migração ou uma operação controlada de dados, mas não pode depender de um marcador de aviso visto.
- Ainda será confirmado por quanto tempo a alternância feita na tela pública permanece antes da autenticação ou depois de um logout. Essa escolha temporária não pode ser confundida com a preferência persistida da conta.
- A ordem exata entre leitura local, restauração da sessão, leitura remota e aplicação visual será definida para evitar flash indevido de tema sem atrasar ou fragilizar o bootstrap.
- Nenhuma mudança em Firebase, Firestore, Auth, App Check, rules ou dados foi autorizada por este registro. Qualquer necessidade nessas camadas deve ser apresentada ao Trofia-Principal antes da implementação.

## Validação obrigatória planejada

- abertura inicial clara no app e na web, incluindo login e registro;
- alternância claro/escuro disponível e acessível nas telas públicas;
- nova conta iniciando em claro e sem aviso;
- conta existente com preferência escura anterior sendo migrada exatamente uma vez para claro;
- escolha escura posterior sobrevivendo a reload, novo login e outro dispositivo conforme o contrato de persistência;
- modo sistema acompanhando o dispositivo depois da migração;
- ausência de nova sobrescrita após a migração já ter sido aplicada;
- ausência de flash indevido durante bootstrap e autenticação;
- temas claro/escuro, app/web, PT/EN/ES, fonte ampliada, contraste e `prefers-reduced-motion` onde aplicável.

## Privacidade e dados

A política não introduz aviso nem telemetria de visualização. Tema é uma preferência visual; nenhum dado sensível, credencial ou conteúdo pessoal deve ser incluído na migração, nos testes ou na documentação.

## Relação com o protótipo

O protótipo exploratório `i3-politica-migracao-tema.html` serviu para avaliar a política anterior com aviso. A decisão aprovada neste documento remove integralmente esse aviso. Portanto, o arquivo não representa mais o contrato final nessa parte e deverá ser revisado antes de qualquer aprovação visual ou implementação runtime.

Chat-Origin: Trofia-UIUX
