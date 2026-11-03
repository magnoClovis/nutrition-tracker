# C26-A — Toast interno seguro

**Estado em 03/11/2026:** implementação mesclada na `main` pelo PR #354 (`4cfa5f4`, merge `a2e52c9`). Esta fatia melhora o feedback já existente para metas nutricionais atingidas; não cria notificações externas, não solicita permissão e não envia dados a serviços remotos. A única pendência é a prova física no próximo AAB conjunto.

## Contrato aprovado

- O toast continua não bloqueante e mantém a fila atual: múltiplas metas não se sobrepõem.
- No Android, o card deve respeitar os insets reais do sistema para não disputar espaço com notch, câmera ou barra de status.
- O feedback sonoro deve ser curto, reconhecível e limitado pelo volume escolhido no dispositivo; falhas ou bloqueio de áudio permanecem silenciosos.
- O Android usa Haptics nativo quando disponível. Web e plataformas sem suporte não falham nem simulam permissão.
- Textos, valores e regras de detecção de metas permanecem os existentes; nenhum novo dado nutricional é persistido ou exposto.

## Auditoria da base

| Superfície | Estado encontrado | Correção da C26-A |
|---|---|---|
| Toast | `app-header-navigation.js` fixa o mobile a 10 px do topo e não marca o elemento com `data-safe-area-toast`. | O marcador foi adicionado; o CSS agora usa os insets reais já definidos em `one-ui.css`, reduz a largura útil de modo seguro e mantém o card abaixo da barra de status. |
| Áudio | `nutrition-tracker-controller.js` cria um seno Web Audio de ~0,18 s, ganho máximo 0,08. | O envelope passou a ~0,36 s e ganho máximo 0,14, ainda condicionado ao volume/às permissões do dispositivo e silencioso quando o browser não aceita áudio. |
| Vibração | O código chama somente `navigator.vibrate`, que não é garantia no WebView Android. | `@capacitor/haptics` é usado somente no Android nativo; falha, web e outras plataformas retornam ao fallback de navegador sem erro. |
| Fila e acessibilidade | Há fila, transição e `pointerEvents: none`; o anúncio semântico ainda precisa ser confirmado nos testes. | A fila foi preservada; o card agora expõe `role="status"` e `aria-live="polite"`, com teste de caracterização da semântica e safe area. |

## Fora do escopo

- Notificações locais com app fechado (C26-B), push/FCM/backend (C26-C), permissões de notificação, AAB e Play.
- Alteração de metas, cálculos nutricionais, textos de negócio, persistência ou dados de conta.

## Gates previstos

1. **Concluído localmente:** preflight sem avisos; testes focados de runtime/semântica (13/13); controlador (71/71); build Vite; `capacitor sync android`; `:app:assembleDebug` com o plugin Haptics.
2. **Concluído no PR #354:** Documentation preflight `41639904052` em 35 s; CI `41639904064` em 1 h 44 min 21 s, com 1.584 unitários, Worker 48, Functions 77, Playwright legado 191/191, Vite 201/201, CSP e `SMOKE_OUTCOME: success`.
3. **Concluído na main:** Documentation preflight `41667348649` em 28 s. A CI `41667348548` passou na segunda tentativa; a primeira passou preflight, unitários, Worker, Functions, Playwright legado e 200/201 Vite, mas falhou no backup round-trip mobile por browser-error sanitizado de GET local 200 e abortos Firestore em reload. A repetição do job Vite passou integralmente, sem evidência de ligação com a C26-A.
4. **Pendente de release:** validação física no Android dentro do próximo AAB conjunto, cobrindo safe area, cue sonoro, Haptics e fallback; sem publicação automática.
