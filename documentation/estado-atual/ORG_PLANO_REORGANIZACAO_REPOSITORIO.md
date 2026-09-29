# ORG — Plano aprovado de reorganização do repositório

> **Estado:** planejamento documental em 29/09/2026. ORG-PREP está em andamento, ORG-0 tem apenas auditoria preliminar em andamento e ORG-1 a ORG-7 não foram iniciadas. Este documento não autoriza mover, excluir, publicar ou alterar produção. A execução de cada fatia exige seus próprios gates e preserva o trabalho paralelo das outras frentes.

## Propósito e baseline comprovada

O objetivo é tornar a organização do código, dos ativos, da configuração e da documentação legível para manutenção de produção, sem trocar comportamento por aparência de limpeza. A inspeção read-only da `origin/main` em `3f3557b` encontrou 129 arquivos rastreados diretamente na raiz (83 JavaScript) e nove diretórios; não havia `README.md` na raiz. `nutrition-tracker.jsx` e `app.js` tinham 887 linhas cada e são espelhos verificados pelo preflight; o controlador UMD tinha cerca de 6.710 linhas e `one-ui.css`, cerca de 3.817. Esses números são uma fotografia da base examinada, não uma métrica permanente.

O Vite já usa `src/components`, `src/composite`, `src/firebase` e `src/leaf`, mas parte dos módulos UMD da raiz continua servindo de fonte aos adaptadores ESM e ao fixture legado. A ordem de scripts de `tests/fixtures/index.legacy.html`, os imports Vite, a allowlist de `dist`, o `base: './'` do Pages, `firebase.json`, o `webDir: dist` do Capacitor e a comparação `app.js`/`nutrition-tracker.jsx` são contratos reais. A matriz arquivo a arquivo e a busca completa de consumidores ainda pertencem à ORG-0; os exemplos abaixo não são autorização para uma movimentação em massa.

## Estrutura-alvo

```text
nutrition-tracker/
├─ README.md, AGENTS.md, index.html
├─ package.json, package-lock.json e configurações das ferramentas
├─ public/                  manifest e ícones publicados com nome estável
├─ src/
│  ├─ app/                 composição e controlador, após extração controlada
│  ├─ components/          apresentação e campos reutilizáveis
│  ├─ features/            Diário, refeições, câmera, perfil e outras jornadas
│  ├─ domain/              modelos e cálculos sem dependência de UI
│  ├─ services/            Firebase, IA e APIs externas
│  ├─ platform/            Android/Capacitor e capacidades do dispositivo
│  ├─ styles/              CSS e tokens, preservando a cascata
│  └─ compat/              UMD/ponte legada enquanto o gate legado existir
├─ firebase/               rules e índices referenciados por firebase.json
├─ android/, functions/, worker/
├─ scripts/                 build, verificação e administração
├─ tests/
└─ documentation/           documentação canônica, histórico e snapshots
```

Arquivos de entrada e configuração que as ferramentas esperam na raiz permanecem lá: `index.html`, `package*.json`, `vite.config.js`, `firebase.json`, `.firebaserc`, `capacitor.config.json`, `playwright*.config.js`, `.git*` e `AGENTS.md`. `android/`, `functions/` e `worker/` já são fronteiras de responsabilidade; movê-los para uma pasta `backend/` não gera benefício proporcional ao risco de alterar deploy e CI.

## Mapa de migração, riscos e invariantes

| Grupo atual | Destino proposto | Risco e prova exigida |
|---|---|---|
| Guias, políticas, roadmap e relatórios `.md`/`.txt` da raiz | `documentation/estado-atual/`, `documentation/operacao/`, `documentation/compliance/` ou arquivo histórico conforme conteúdo | Escolher uma fonte canônica e comparar as cópias controladas antes de retirar a origem. Atualizar links; nunca reescrever `documentation/snapshots/` para fingir estado atual. |
| `cleanup_orphan_nutrition_docs.py`, `export_firestore_nutrition.py` | `scripts/admin/` | Atualizar comandos e referências. O script com `--delete` mantém pré-condições e dry-run; nenhum dado real é tocado para provar a reorganização. |
| `manifest.json` e ícones Trofia usados no build | `public/` | Preservar nomes e URLs finais em `dist`, Pages sob subcaminho e Android. Ajustar o plugin explícito de cópia e a allowlist sem incluir arquivos sensíveis. |
| `icon-placeholder.png` | arquivo de ativos históricos da documentação, se a ORG-0 confirmar ausência de uso runtime | O documento de renomeação Android o cita como fonte visual; não apagar por ausência de import no app. |
| `one-ui.css` | `src/styles/one-ui.css`, inicialmente como arquivo único | Atualizar a entrada Vite e o fixture legado; comparar CSS gerado e matriz visual. Dividir por camadas somente em fatia posterior, respeitando a ordem da cascata. |
| `firestore.rules`, `firestore.indexes.json` | `firebase/` | Atualizar `firebase.json`, emuladores, testes, scripts e workflows. Dry-run e testes antes de qualquer publicação; mover arquivo não autoriza deploy de rules. |
| Módulos UMD/JS da raiz | `src/compat/` e, progressivamente, `src/domain/`, `src/services/`, `src/features/` ou `src/components/` | Mapear cada import e global; migrar por grupo, congelando script order e os contratos UMD/ESM. Não eliminar a ponte apenas por ter arquivos parecidos. |
| `nutrition-tracker-controller.js`, `app.js`, `nutrition-tracker.jsx` | `src/app/`/`src/compat/`, com extrações posteriores | Alto risco: preservar ordem dos hooks, dependências de efeitos, closures, hidratação e autosave. O espelhamento `app.js`/`nutrition-tracker.jsx` só pode ser encerrado após substituir seus consumidores e o preflight. |

`bug-inventory.txt` exige tratamento próprio: há alterações locais não commitadas no checkout principal e uma cópia documental em Markdown. A ORG não pode escolher uma versão por semelhança nem apagar registros; deve reconciliar as duas fontes com evidência e preservar o original até decisão explícita. O mesmo cuidado vale para segredos locais, keystore e `android/app/google-services.json`: não mover, abrir, versionar ou incluir em artefatos.

## Sequência aprovada

0. **ORG-PREP — Diretórios-alvo e README de responsabilidade (em andamento):** antes de prosseguir com o inventário ORG-0, criar somente os diretórios-alvo ainda ausentes e adicionar `README.md` à raiz e aos diretórios-alvo novos e já existentes. Cada README explica a responsabilidade, o que pertence e o que não pertence à pasta, as cautelas de integração e reserva uma seção de inventário por arquivo. Enquanto a pasta estiver vazia ou contiver arquivos legados ainda não auditados, não atribuir propósito individual inventado. Ao migrar cada arquivo nas fatias futuras, atualizar o README correspondente no mesmo PR com seu propósito, origem, consumidores e contratos relevantes. Não mover, apagar, renomear ou alterar comportamento de código nesta preparação. Preservar qualquer README existente e não criar subpastas de feature especulativas antes da matriz ORG-0. Como Vite copia automaticamente `public/`, a preparação deve manter `publicDir: false` até a ORG-2, quando o contrato de ativos públicos será migrado e validado; o README não pode aparecer em `dist` nem enfraquecer sua allowlist.
1. **ORG-0 — Inventário final e mapa de dependências (em andamento):** catalogar cada arquivo da raiz e os diretórios relevantes; identificar consumidores, cópias, assets, caminhos de build/deploy, branches/worktrees e candidatos a exclusão. Entregar matriz `origem → destino → referências → risco → prova` e marcar como `não confirmado` qualquer órfão sem análise suficiente. Não alterar código ou remover conteúdo.
2. **ORG-1 — Documentação, README, scripts e convenção de worktrees (não iniciado):** criar README de entrada, estabelecer documentação canônica e mover somente guias/scripts após atualizar referências. Padronizar novos worktrees fora do checkout principal e do diretório sincronizado pelo OneDrive; não mover worktrees ativas à força.
3. **ORG-2 — Ativos estáticos e estilos (não iniciado):** migrar manifest/ícones para `public/` e CSS para `src/styles/` preservando URLs públicas, conteúdo gerado, cascata e aparência web/Android.
4. **ORG-3 — Configuração Firebase (não iniciado):** organizar rules/índices em `firebase/` e atualizar consumidores. Emuladores e CI antecedem qualquer deploy; publicação é decisão operacional separada.
5. **ORG-4 — Módulos da raiz e ponte UMD/ESM (não iniciado):** mover grupos pequenos para `src/compat/` e destinos canônicos sem mudar lógica ou a ordem de carregamento; manter smoke legado e Vite verdes.
6. **ORG-5 — Organização interna de `src/` (não iniciado):** substituir agrupamentos transitórios como `leaf`/`composite` por fronteiras de app, feature, domínio, serviço e plataforma, com import graph e contratos preservados.
7. **ORG-6 — Controlador e CSS grandes (não iniciado):** extrair responsabilidades em PRs menores e testes de caracterização antes de qualquer divisão comportamental; uma simples mudança de caminho não conta como conclusão desta fatia.
8. **ORG-7 — Limpeza e verificação final (não iniciado):** excluir somente duplicatas/artefatos cuja dispensabilidade esteja comprovada, revisar refs/branches/worktrees sem trabalho exclusivo, comparar saída web/Android e concluir documentação.

Nenhuma fatia muda a posição ou os gates já aprovados de C14, C16 ou lançamento público por inferência. ORG-PREP deve provar que a saída Vite permanece idêntica e, por tocar a configuração de build, exige teste focado, suíte completa e CI autenticado antes do merge. ORG-1 pode ser coordenada com frentes ativas; ORG-2 a ORG-6 exigem janela sem edição concorrente dos mesmos arquivos. Cada fatia usa PR draft e documentação do próprio escopo.

**Checkpoint ORG-PREP (29/09/2026):** o PR documental #285 foi mesclado. Na branch de preparação, os onze destinos ausentes e README de responsabilidade foram criados sem mover arquivos de produto. Guias anteriores de documentação, benchmark GA e smoke autenticado foram preservados. `publicDir: false` impediu a cópia do novo README de `public/`; o teste focado do verificador passou 21/21, o build Vite confirmou os 14 arquivos permitidos e `npm test` completo terminou com código 0. O CI autenticado ainda falta, portanto ORG-PREP continua em andamento.

## Política de worktrees e exclusão

Para novas tarefas, preferir worktrees gerenciadas pelo Codex ou um diretório operacional fora do OneDrive, por exemplo `C:\Users\clovi\AppData\Local\Trofia\worktrees\`, com nome da fatia e remoção/arquivamento ao encerrar. `.worktrees/` git-ignorada dentro da raiz é tecnicamente possível, mas não resolve o ruído de sincronização e locks do OneDrive. Nenhuma mudança de convenção remove worktrees existentes automaticamente.

Antes de remover uma worktree: conferir PR e processos, `git status`, branch/commit, inclusão na `main`, arquivos ignorados de valor e backup recuperável; usar o fluxo gerenciado/`git worktree remove`, não apagar a pasta registrada manualmente. Antes de excluir branches: confirmar merge, ausência de worktree e ausência de trabalho exclusivo; referências remotas exigem revisão própria. Pastas físicas não registradas precisam de inventário separado. **Neste plano, nenhuma exclusão individual está autorizada ou classificada como segura.**

## Gates transversais de cada PR de implementação

- basear em `origin/main` atual e não tocar no checkout principal sujo nem em branches de outras frentes;
- usar `git mv`/diff com detecção de renomeação e conferir referências quebradas, imports, links e configuração;
- rodar teste focado, `npm test` completo e CI autenticado real quando houver código/configuração; incluir Worker, Functions/emuladores, Pages e Android quando a fatia os afetar;
- comparar a allowlist e os caminhos de `dist`, o funcionamento no subcaminho do Pages, o fixture legado, os adaptadores Vite e o empacotamento Android aplicável;
- não usar movimento de arquivo como justificativa para publicar Worker, Functions, rules ou AAB sem o gate/deploy próprio;
- manter `RESUMO-STATUS.md`, histórico da frente e documentos específicos sincronizados, com métricas reais e `Chat-Origin` conforme `PADRAO-DOCUMENTACAO.md`.
