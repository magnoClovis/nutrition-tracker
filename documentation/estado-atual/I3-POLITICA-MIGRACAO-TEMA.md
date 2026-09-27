# I3 — Política e migração de tema

## Estado

- **Fatia:** I3 — Política e migração de tema.
- **Status:** em andamento.
- **Chat responsável:** Trofia-UIUX.
- **Decisão de produto:** aprovada em 27/09/2026.
- **Estratégia técnica:** migração local versionada, aprovada para documentação em 27/09/2026.
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
9. A tela pública e a aplicação autenticada compartilharão a mesma preferência local; autenticar não deve sobrescrever uma escolha feita depois da migração.
10. A migração precisa ser idempotente por navegador/instalação: uma preferência escolhida após a migração jamais pode ser sobrescrita novamente por reload ou novo login no mesmo armazenamento.

## Estado técnico atual

- A preferência existente é booleana e local: `appDarkMode` no `localStorage`.
- `app.js`, `nutrition-tracker.jsx` e `src/App.jsx` possuem a migração `appThemeDefaultDarkV1`, que força escuro uma única vez por navegador e depois respeita `appDarkMode`.
- `login-screen.js` lê e grava a mesma preferência local, portanto login e aplicação autenticada já compartilham o estado daquela instalação.
- Não existe hoje preferência de tema vinculada à conta no Firestore. Consequentemente, não existe preferência remota a ser migrada nem sincronização automática de tema entre dispositivos.
- A I3 deverá retirar a autoridade da migração escura antiga; deixá-la ativa poderia recolocar uma instalação em escuro antes da nova política.

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

## Privacidade e dados

A política não introduz aviso nem telemetria de visualização. A versão local registra somente a execução técnica da política, não uma interação do usuário. Tema é uma preferência visual; nenhum dado sensível, credencial ou conteúdo pessoal deve ser incluído na migração, nos testes ou na documentação.

## Relação com o protótipo

O protótipo exploratório `i3-politica-migracao-tema.html` serviu para avaliar a política anterior com aviso. A decisão aprovada neste documento remove integralmente esse aviso. Portanto, o arquivo não representa mais o contrato final nessa parte e deverá ser revisado antes de qualquer aprovação visual ou implementação runtime.

Chat-Origin: Trofia-UIUX
