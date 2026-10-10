# I3 — Política e migração de tema

## Estado

- **Fatia:** I3 — Política e migração de tema.
- **Status:** em andamento.
- **Chat responsável:** Trofia-UIUX.
- **Decisão de produto:** aprovada em 27/09/2026.
- **Estratégia técnica:** migração local versionada, aprovada para documentação em 27/09/2026.
- **Implementação runtime:** em validação na branch `codex/i3-theme-policy`.
- **Protótipo visual:** o aviso exploratório foi descartado; a implementação segue a política textual aprovada e não mostra aviso.

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
9. A tela pública e a aplicação autenticada compartilharão a mesma preferência local; autenticar não deve sobrescrever uma escolha feita depois da migração.
10. A migração precisa ser idempotente por navegador/instalação: uma preferência escolhida após a migração jamais pode ser sobrescrita novamente por reload ou novo login no mesmo armazenamento.

## Estado técnico anterior auditado

- A preferência existente é booleana e local: `appDarkMode` no `localStorage`.
- `app.js`, `nutrition-tracker.jsx` e `src/App.jsx` possuem a migração `appThemeDefaultDarkV1`, que força escuro uma única vez por navegador e depois respeita `appDarkMode`.
- `login-screen.js` lê e grava a mesma preferência local, portanto login e aplicação autenticada já compartilham o estado daquela instalação.
- Não existe hoje preferência de tema vinculada à conta no Firestore. Consequentemente, não existe preferência remota a ser migrada nem sincronização automática de tema entre dispositivos.
- A I3 precisava retirar a autoridade da migração escura antiga; deixá-la ativa poderia recolocar uma instalação em escuro antes da nova política.

## Implementação em validação

- `theme-policy.js` é o contrato compartilhado por legado e Vite para normalizar, resolver, migrar e persistir a preferência local.
- As chaves finais são `appThemePolicyVersion = 2` e `appThemePreference = light | dark | system`.
- `appDarkMode` permanece somente como espelho temporário para consumidores legados; não decide mais migração ou bootstrap.
- `appThemeDefaultDarkV1` pode permanecer no armazenamento, mas ficou sem autoridade.
- `index.html` aplica a política I3 antes dos estilos com hash CSP validado; a fixture legada carrega o contrato antes do controlador.
- Login grava uma escolha explícita claro/escuro e a sincroniza com o host; Configurações oferece Claro, Escuro e Sistema em PT/EN/ES.
- O modo sistema observa mudanças de `prefers-color-scheme`; o Android continua derivando o contraste das barras do `data-theme` resolvido.
- A limpeza local de conta preserva idioma e as chaves neutras de tema, sem introduzir persistência remota.
- Validação comprovada até o momento: 68/68 unitários focados; 1.529/1.529 unitários completos; build Vite e allowlist de 14 arquivos; recorte público 2/2 legado e 2/2 Vite em desktop/mobile. Smoke autenticado, cutover e CI remoto continuam pendentes.

## Algoritmo de migração aprovado

A implementação usará uma versão local de política, distinta de qualquer controle de aviso. Os nomes definitivos podem ser ajustados durante o código, mas o contrato é equivalente a `appThemePolicyVersion = 2` e uma preferência enumerada `appThemePreference = light | dark | system`.

1. Antes da primeira pintura da interface, ler a versão local da política.
2. Se a versão for anterior à I3 ou estiver ausente, gravar primeiro `light` como preferência e aplicá-lo imediatamente em `document.documentElement.dataset.theme`.
3. Somente depois de a preferência ter sido gravada, marcar a versão da política como concluída. Se a escrita falhar ou for interrompida, a migração permanece pendente e tenta novamente na próxima abertura.
4. Se a versão já for a da I3, não migrar novamente: ler e aplicar a preferência válida existente; valor ausente ou inválido resolve para `light`.
5. Alternâncias posteriores nas telas públicas ou em Configurações gravam `light`, `dark` ou `system` e não modificam a versão da política.
6. Para `system`, resolver o tema com `prefers-color-scheme` e observar mudanças do dispositivo enquanto esse modo estiver selecionado.
7. A migração antiga `appThemeDefaultDarkV1` deixa de participar da resolução. Seu valor legado pode permanecer inerte no armazenamento ou ser removido com segurança, mas nunca deve voltar a forçar escuro.

Pseudocódigo de referência:

```js
if (readThemePolicyVersion() < I3_THEME_POLICY_VERSION) {
  writeThemePreference('light');
  applyResolvedTheme('light');
  writeThemePolicyVersion(I3_THEME_POLICY_VERSION);
} else {
  applyResolvedTheme(readThemePreference() || 'light');
}
```

O marcador de versão é necessário para distinguir uma instalação ainda não migrada de uma instalação já migrada na qual o usuário escolheu escuro depois. Ele não registra que alguém viu uma mensagem e não existe para telemetria.

## Ordem esperada de resolução

| Contexto | Resultado esperado |
|---|---|
| Primeira abertura sem sessão | Tema claro. |
| Login ou registro antes da autenticação | Tema claro por padrão, com alternância manual claro/escuro disponível. |
| Nova conta | Tema claro, sem aviso. |
| Instalação existente ainda não migrada | Tema claro aplicado silenciosamente uma única vez, substituindo `appDarkMode` anterior. |
| Instalação já migrada e sem nova escolha | Tema claro. |
| Instalação já migrada que escolheu escuro | Tema escuro também depois da autenticação. |
| Instalação já migrada que escolheu sistema | Tema resolvido pela preferência do dispositivo. |

## Limites e decisões ainda pendentes

- A implementação definirá os nomes finais das chaves e a estratégia de compatibilidade temporária com `appDarkMode`, sem alterar o contrato acima.
- A aplicação antecipada do tema deverá ocorrer antes da primeira pintura para impedir flash escuro, mas o ponto exato do bootstrap será confirmado com teste real nos runtimes legado e Vite.
- Esta fatia não sincroniza tema entre aparelhos. Em uma instalação nova, reinstalada ou com armazenamento apagado, o produto começa corretamente em claro; uma escolha escura feita em outro dispositivo não será recuperada pelo comportamento atual.
- Sincronização por conta exigiria uma fatia separada de persistência remota e coordenação com o Trofia-Principal. Nenhuma mudança em Firebase, Firestore, Auth, App Check, rules ou dados está autorizada na I3 atual.

## Validação obrigatória planejada

- abertura inicial clara no app e na web, incluindo login e registro;
- alternância claro/escuro disponível e acessível nas telas públicas;
- nova conta iniciando em claro e sem aviso;
- instalação existente com `appDarkMode=true` sendo migrada exatamente uma vez para claro;
- escolha escura posterior sobrevivendo a reload e novo login no mesmo armazenamento;
- modo sistema acompanhando o dispositivo depois da migração;
- ausência de nova sobrescrita após a migração já ter sido aplicada;
- ausência de flash indevido durante bootstrap e autenticação;
- migração antiga `appThemeDefaultDarkV1` incapaz de voltar a forçar escuro;
- falha de storage resolvendo de forma segura para claro e permitindo nova tentativa sem loop destrutivo;
- temas claro/escuro, app/web, PT/EN/ES, fonte ampliada, contraste e `prefers-reduced-motion` onde aplicável.

## Evidência pré-merge

- 68/68 testes unitários focados da política e de seus consumidores;
- 1.529/1.529 testes unitários completos;
- smoke legado com 177 aprovados e 10 skips estruturais;
- smoke Vite 187/187;
- build Vite com 848 módulos e allowlist aprovada de 14 arquivos;
- verificação CSP confirmando bootstrap público em `light` e bloqueio de script inline;
- cutover legado/Vite 60/60.
- CI remoto do PR draft #321 integralmente verde: run pesado `38025532624` em 48 min 07 s e preflight documental `38025532606` em 27 s.

Dois cenários autenticados de avaliação de refeição foram ajustados somente na ordem das verificações: primeiro aguardam a confirmação de persistência pela janela de 30 segundos que já existia e depois exigem o fechamento da tela. O runtime, os timeouts e as expectativas funcionais permaneceram inalterados. Uma falha isolada de clique no perfil obrigatório não foi reproduzida nos recortes legado/Vite e passou no gate integral final, sem correção especulativa.

## Privacidade e dados

A política não introduz aviso nem telemetria de visualização. A versão local registra somente a execução técnica da política, não uma interação do usuário. Tema é uma preferência visual; nenhum dado sensível, credencial ou conteúdo pessoal deve ser incluído na migração, nos testes ou na documentação.

## Relação com o protótipo

O protótipo exploratório `i3-politica-migracao-tema.html` serviu para avaliar a política anterior com aviso. A decisão textual aprovada neste documento removeu integralmente esse aviso antes da implementação. O runtime entregue segue este contrato documental — migração silenciosa e local — e o protótipo permanece apenas como artefato exploratório histórico, não como especificação vigente.

Chat-Origin: Trofia-UIUX
