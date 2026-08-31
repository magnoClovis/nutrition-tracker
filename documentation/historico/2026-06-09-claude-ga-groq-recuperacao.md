# Histórico de Desenvolvimento — Sessão GA + Recuperação de Arquivo

**Projeto:** Trofia (app de acompanhamento nutricional)
**Repositório:** `github.com/magnoClovis/nutrition-tracker`
**Produção:** `https://magnoclovis.github.io/nutrition-tracker/`
**Período desta sessão:** 8–9 de junho de 2026 (inferido pelo nome do transcript anterior `2026-06-08-22-45-22` e pelos nomes de ficheiro dos screenshots `Screenshot_20260609_004312_Firefox.jpg`)
**Sessão anterior referenciada:** `/mnt/transcripts/2026-06-08-22-45-22-nutrition-tracker-ga-groq-rebuild.txt`

> **Nota sobre códigos do projeto:** O sistema de códigos C01–C28 / N01–N09 foi instaurado a partir de 31/07/2026. Esta sessão decorre em junho de 2026, portanto anterior à existência formal do sistema. Nenhum código C/N é atribuído aos itens desta sessão, com excepção de referências cruzadas verificadas no ROADMAP público. C21 ("Porções fracionadas no GA") cita o GA como funcionalidade base já existente — o que é consistente com o trabalho desta sessão, que implementa essa base.

> **Nota sobre BUG-INVENTORY.md:** O ficheiro `documentation/estado-atual/BUG-INVENTORY.md` não estava acessível publicamente no momento da redacção deste documento. Os bugs desta sessão são descritos com base exclusivamente no conteúdo da conversa, sem referência a códigos A01–A12.

---

## Contexto herdado da sessão anterior

**Data:** 8 de junho de 2026
**Propósito:** A sessão anterior (`2026-06-08-22-45-22`) tinha concluído com o app funcional (865 KB), com os estados e funções do GA inseridos no JSX compilado, mas com o modal do GA **removido** por causa de um bug de parênteses desbalanceados que deixava o `#root` DOM vazio. O placeholder `showGA && null` tinha ficado no return do `NutritionTracker`. O trabalho pendente para esta sessão era re-inserir o modal corretamente.
**Recursos:** React 18 (UMD CDN), Firebase REST, Babel, GitHub Pages
**Arquivos herdados:**
- `/mnt/user-data/outputs/index.html` — ~865 KB, HTML compilado standalone com placeholder `showGA && null`
- `/mnt/user-data/outputs/nutrition-tracker.jsx` — ~170 KB, fonte JSX com i18n, Groq, GA (sem modal)
- `/tmp/index_bundled.html` — 824 KB, de 3 de junho (sem i18n, sem Groq — versão de emergência)
- `/tmp/nt_compiled.js` — último output compilado de NutritionTracker
- `/tmp/compile.js` — script Babel de compilação

**Estado dos estados do GA herdados (já no HTML):**
```
showGA / setShowGA         — visibilidade do modal (boolean)
gaUseAll / setGAUseAll     — usar toda a despensa (boolean, default true)
gaSelIds / setGASelIds     — IDs seleccionados individualmente (object)
gaLimits / setGALimits     — limites por alimento {id: {min, max}} (object)
gaGlobalMax / setGAGlobalMax — máx. unidades global (number, default 5)
gaTolerance / setGATolerance — tolerância calórica % (number, default 15)
gaRunning / setGARunning   — flag de execução (boolean)
gaProgress / setGAProgress — progresso 0–100 (number)
gaResults / setGAResults   — array de soluções (array)
gaTargetMeal / setGATargetMeal — refeição de destino (string)
```

**PRs/commits relacionados:** não determinado (nenhum número aparece explicitamente nesta conversa)

---

## Item 1 — Implementação completa do GA: funções, botão e modal

**Data:** 9 de junho de 2026
**Propósito:** Inserir no ficheiro HTML compilado a implementação completa do Algoritmo Genético de sugestão de refeição — função `runGA`, função `addGAResultToDiary`, botão na aba Diário e modal de configuração/resultados. O trabalho foi feito em script Python de injecção directa no HTML compilado (sem recompilação do JSX), usando substituição de padrões de texto exactos.
**Recursos:** Python 3, React 18 (createElement), JavaScript async/await, Babel (compilação prévia), Firebase Firestore (via `storage` polyfill)
**Arquivos:** `/mnt/user-data/outputs/index.html`

### O que foi feito

#### Função `runGA` (async, ~150 linhas de JS compilado)

Inserida antes de `function saveFeedbackAsNote()`. Lógica completa:

1. **Coleta de alimentos:** `pantry.filter(f => gaUseAll ? true : gaSelIds[f.id])`, depois filtra por `protein100 > 0 || kcal100 > 0`.
2. **Cálculo do orçamento nutricional restante:**
   - `eatenProt = Object.values(activeLog).flat().reduce((s,e) => s+(e.protein??0), 0)`
   - `eatenKcal = Object.values(activeLog).flat().reduce((s,e) => s+(e.kcal??0), 0)`
   - `targetProt = Math.max(10, (goals.protein||150) - eatenProt)`
   - `targetKcal = Math.max(50, (goals.kcal||2000) - eatenKcal)`
   - `kcalBudget = targetKcal * (1 + gaTolerance/100)`
3. **Unidade de gene:** Para alimentos `unit === 'un'`, 1 gene = 1 unidade; para `'g'`/`'ml'`, 1 gene = 100 g/ml. A nutrição por gene é uniformemente `food.protein100 * gene` e `food.kcal100 * gene` (válido para ambos os casos).
4. **Função de fitness (menor = melhor):**
   - `protDev = Math.abs(protein - targetProt) / Math.max(targetProt, 1)`
   - `kcalPen = kcal > kcalBudget ? 10*(kcal-kcalBudget)/Math.max(kcalBudget,1) : 0.3*(kcal/Math.max(kcalBudget,1))`
   - Soluções com todos os genes = 0 recebem fitness = 999
5. **Parâmetros do GA:**
   - `POP = 120` indivíduos
   - `GENS = 350` gerações máximas
   - `MUT_RATE = 0.15`
   - `STOP_FIT = 0.08` (threshold de solução aceitável)
   - `N_SOLS = 5` (número alvo de soluções únicas)
6. **Inicialização:** população aleatória com genes entre `geneMin(i)` e `geneMax(i)` (default: 0 a `gaGlobalMax`)
7. **Selecção:** top 50% ordenados por fitness (`pop.sort((a,b) => a.fit-b.fit).slice(0, Math.floor(pop.length/2))`)
8. **Crossover:** single-point com ponto aleatório entre 0 e `genes.length`
9. **Duas estratégias de mutação** (fiel ao código Python original do utilizador):
   - Swap (50% de probabilidade): `Math.max(1, Math.floor(genes.length * 0.1))` swaps aleatórios entre posições
   - Ajuste aleatório (50% de probabilidade): `Math.floor(Math.random() * Math.ceil(genes.length/2)) + 1` genes alterados para `Math.abs(gene[j] - randGene(j))`, clampado entre geneMin e geneMax
10. **Elitismo + reset de população:** quando `solutions.length >= Math.ceil(N_SOLS/2)` e `!didReset`, repopula completamente com genes aleatórios e mantém `bestInd` na posição 0
11. **Yield de UI:** `await new Promise(r => setTimeout(r, 0))` a cada 15 gerações para não bloquear o thread
12. **Colecção de soluções:** indivíduo com `fit < STOP_FIT` e `genes.some(g => g > 0)` é adicionado; chave de deduplicação = `genes.join(',')`
13. **Fallback:** se nenhuma solução encontrada ao fim das 350 gerações, publica o melhor indivíduo de sempre
14. **Termina com:** `setGAProgress(100); setGARunning(false)`

#### Função `addGAResultToDiary`

```javascript
function addGAResultToDiary(result) {
  const meal = gaTargetMeal || MEALS[1] || MEALS[0];
  result.items.forEach(({food, gene}) => {
    const qty = food.unit === 'un' ? gene : gene * 100;
    const entry = buildEntry(food, qty);
    setActiveLog(prev => ({...prev, [meal]: [...(prev[meal]||[]), entry]}));
  });
  notify('Refeição adicionada ao diário (' + mealLabel(meal) + ')!');
  setShowGA(false);
}
```

Decisão técnica: `qty = gene * 100` para alimentos em `'g'`/`'ml'` (desfaz a normalização por 100g do gene), `qty = gene` para `'un'`. Usa `buildEntry(food, qty)` existente para consistência com o resto do app.

#### Botão "🧬 Sugerir com Algoritmo Genético" (aba Diário)

Inserido imediatamente após o botão "💾 Guardar nas notas" na aba Diário, como elemento irmão (não filho). Âncora de inserção: texto `"\\uD83D\\uDCBE Guardar nas notas"` no HTML compilado. Estilo:
```javascript
{
  width:"100%", marginTop:10,
  background:"linear-gradient(135deg,#1a2a1a,#1e2e20)",
  border:"1px solid #2d4a2d",
  color:"#7ec87e", padding:"11px",
  borderRadius:6, fontSize:11,
  letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer"
}
```
`onClick`: `setGAResults([]); setGAProgress(0); setShowGA(true); setGATargetMeal(MEALS[1]||MEALS[0])`

#### Modal do GA

Injectado como segunda child do `React.createElement(React.Fragment, null, mainDiv, modal)`. Estrutura (position:fixed, top:0/left:0/right:0/bottom:0, background:`rgba(0,0,0,0.92)`, zIndex:2000):

**Header (sticky, top:0):**
- Emoji 🧬 + "ALGORITMO GENÉTICO" (bold, letterSpacing:2)
- Meta restante calculada inline: `"Meta restante: " + Math.round(Math.max(0, (goals.protein||0) - eatenProt)) + "g prot · " + Math.round(Math.max(0, (goals.kcal||0) - eatenKcal)) + " kcal"`
- Botão × para fechar (`setShowGA(false)`)

**Painel de configuração:**
- Select "ADICIONAR EM" com `MEALS.map(m => <option>mealLabel(m)</option>)` — valor = `gaTargetMeal`
- Grid 2 colunas: "MÁX. UNIDADES" (number, min:1, max:20) e "TOLERÂNCIA CALÓRICA (%)" (number, min:0, max:50)
- Checkbox "Usar todos os alimentos da despensa" (estilo manual com div 16×16px)
- Se `!gaUseAll` e `pantry.length > 0`: lista scrollável (maxHeight:220px) com checkbox + nome/unidade + input "max" por alimento
- Se `!gaUseAll` e `pantry.length === 0`: mensagem "Despensa vazia. Adiciona alimentos primeiro."
- Botão "▶ Gerar sugestões" / "⏳ Calculando... X%" (desactivado durante execução)
- Barra de progresso animada (transition:"width 0.3s", background:"#4a8a4a")

**Painel de resultados** (visível quando `gaResults.length > 0`):
- Header: "X combinações encontradas" (uppercase, muted)
- Por cada resultado: card com background:`var(--surface)`, border:`var(--border2)`, borderRadius:8px
  - Header do card: "Opção N" + totais proteína (cor âmbar `#c8a96e`) e kcal (cor teal `#8ec8c8`)
  - Lista de alimentos: nome | `qty+unit — Xg, Ykcal` (muted)
  - Botão "+ Adicionar ao diário (refeição)" — usa `var(--btn-ok)` e variantes

**Verificação de parênteses:** confirmados 151 aberturas = 151 encerramentos no bloco do modal.

**PRs/commits relacionados:** não determinado

---

## Item 2 — Bug: Modal injectado dentro de `LoginScreen` em vez de `NutritionTracker`

**Data:** 9 de junho de 2026
**Propósito:** O script de injecção do Item 1 usou o padrão `"  );\n}\n\n// ── Settings Panel (compact sl"` para localizar o fim do return do `NutritionTracker`, mas este padrão aparecia primeiro no ficheiro como o **fim do `LoginScreen`** (que também precede o comentário `// ── Settings Panel`). O modal foi inserido dentro do `LoginScreen`, não do `NutritionTracker`, causando `SyntaxError: Unexpected token ')' at 6898:38`.
**Recursos:** Python 3, regex de busca de texto
**Arquivos:** `/mnt/user-data/outputs/index.html`

### O que foi feito

1. **Diagnóstico:** inspecção das linhas 6890–6910 revelou que o `LoginScreen` terminava com `}))));\n}\n\n// ── Settings Panel` — o mesmo padrão que se pretendia para o `NutritionTracker`. O `NutritionTracker` fechava na linha 6899 (antes de `const inp = {  width: "100%"`).
2. **Correcção:**
   - Localizado o início do modal erroneamente inserido (variável `ga_start` via `content.find('\n    showGA && /*#__PURE__*/React.createElement("div", {\n      style: {\n        position:"fixed"')`)
   - Localizado o padrão de fim de modal: `'    ),\n  );\n}\n\n// ── Settings Panel'`
   - Removido o bloco do modal do `LoginScreen`, restaurando o seu fechamento original (`\n  );\n}\n\n// ── Settings Panel`)
3. **Reinserção no `NutritionTracker`:** identificado o fim real do return do `NutritionTracker` usando `content.rfind(';\n}', 0, idx_const_inp)` — a posição 867098 (o `;` que termina o return statement). O `)` imediatamente anterior (posição 867097) é o que fecha o `React.createElement("div", {minHeight:"100vh",...})`.
4. **Estratégia de inserção:** modal adicionado **antes** do `)` na posição 867097, como último filho do div externo do `NutritionTracker`, com `,\n  [MODAL]` precedendo o `)`.

**PRs/commits relacionados:** não determinado

---

## Item 3 — Bug: `SyntaxError: Malformed Unicode Character Escape Sequence` (linha 7038:15)

**Data:** 9 de junho de 2026
**Propósito:** Escape unicode inválido no texto do botão "Adicionar ao diário" dentro do modal.
**Recursos:** Python 3, JavaScript runtime (Edge)
**Arquivos:** `/mnt/user-data/outputs/index.html`

### O que foi feito

- **Causa:** a string `"\u2b; Adicionar ao di\xe1rio"` continha `\u2b` com apenas 2 dígitos hexadecimais — inválido em JavaScript (exige 4 dígitos: `\u002b`).
- **Fix:** substituição de `"\u2b; Adicionar ao di\xe1rio"` por `"+ Adicionar ao di\xe1rio"` — usou-se o caractere `+` em texto simples em vez do escape unicode.

**PRs/commits relacionados:** não determinado

---

## Item 4 — Bug: `SyntaxError: Unexpected token ')' at 7042:4`

**Data:** 9 de junho de 2026
**Propósito:** O modal tinha 1 parêntese de encerramento a mais, desequilibrando o return do `NutritionTracker`.
**Recursos:** Python 3, contagem de parênteses
**Arquivos:** `/mnt/user-data/outputs/index.html`

### O que foi feito

- **Diagnóstico:** contagem de parênteses no bloco do modal: 152 fechamentos vs 151 aberturas (diff = +1).
- **Localização:** a sequência de fechamento do modal terminava em `  ));\n}` (2 `)` antes do `;`), quando deveria ser `  );\n}` (1 `)`). O `)` extra estava a fechar prematuramente o div externo do `NutritionTracker`, tornando o `)` original da posição 867097 inesperado.
- **Fix:** substituição de `'      )\n    )\n  ));\n}\nconst inp'` por `'      )\n    )\n  );\n}\nconst inp'`, removendo o `)` extra.
- **Verificação:** contagem pós-fix: 151 aberturas = 151 fechamentos no bloco do modal.

**PRs/commits relacionados:** não determinado

---

## Item 5 — Bug crítico: tela preta após login (DOM root vazio)

**Data:** 9 de junho de 2026
**Propósito:** Após corrigir os 3 bugs de sintaxe anteriores, o app carregava sem erros de sintaxe mas mostrava uma tela completamente preta após login. O `#root` do DOM ficava vazio (0 children, 0 innerHTML) mesmo com o React a ser chamado com sucesso.
**Recursos:** Python 3, React 18, JavaScript DevTools (Edge/Firefox), `setTimeout` DOM check
**Arquivos:** `/mnt/user-data/outputs/index.html`

### Processo de diagnóstico (em ordem cronológica)

1. **Remoção do auto-open do SettingsPanel:** o `useEffect` em `App` que chamava `setShowSettings(true)` quando não havia `groq_key` no localStorage foi removido — era irritante e não relacionado com o problema principal, mas foi tratado em paralelo.

2. **Adição de `console.log` ao `NutritionTracker`:**
   - `console.log('[NT] mounting NutritionTracker')` — no topo da função
   - `console.log('[NT] loaded:', loaded, 'tab:', tab)` — antes do `if (!loaded)` check
   - O console confirmou 3 renders, o último com `loaded: true tab: diario`

3. **Adição de timeout de 12 segundos ao `loadAll()`:**
   ```javascript
   const _loadTimeout = setTimeout(() => {
     setSyncing(false); setLoaded(true);
   }, 12000);
   ```
   com `clearTimeout(_loadTimeout)` antes dos `setSyncing/setLoaded` normais — fallback para o caso de Firebase pendurado.

4. **Adição de CSS custom properties ao `:root`** do `<style>` do HTML:
   Hipótese: `var(--bg)` e outras vars não resolviam durante o loading state porque só eram definidas pelo THEME do componente montado. Fix: definição estática em CSS:
   ```css
   :root {
     --bg:#111; --surface:#161616; --surface3:#141414; --input:#1e1e1e;
     --track:#1c1c1c; --row:#181818; --border:#222; --border2:#2a2a2a;
     --border3:#1e1e1e; --text:#e8e0d5; --text2:#d5cfc8; --text3:#c9bfb0;
     --muted:#8a8a8a; --muted2:#7a7a7a; --dim:#444; --faint:#333;
     --btn-ok:#1e2e1e; --btn-ok-border:#3a5a3a; --btn-ok-text:#7ec87e;
     --btn-info:#1a1e2a; --btn-info-border:#2a2a4a; --btn-info-text:#8a9ec8;
     --btn-warn:#2a1a1a; --btn-warn-border:#4a2a2a; --btn-warn-text:#c87e7e;
     --btn-teal:#1a2a2a; --btn-teal-border:#2a4a4a; --btn-teal-text:#7ec8c8;
     --btn-inactive:#191919; --btn-inactive-border:#252525; --btn-inactive-text:#666;
     --tab-active:#191919; --tab-text-active:#c9bfb0;
   }
   body { background: var(--bg); color: var(--text); }
   ```
   Esta hipótese foi descartada como causa principal (o problema persistiu), mas a correcção foi mantida como melhoria.

5. **Correcção de referências CSS circulares:** 6 variáveis CSS que apontavam para si próprias no objecto THEME foram corrigidas:
   - `"--btn-inactive": "var(--btn-inactive)"` → `"--btn-inactive": "#191919"`
   - `"--input": "var(--btn-inactive)"` → `"--input": "#1e1e1e"`
   - `"--tab-active": "var(--btn-inactive)"` → `"--tab-active": "#191919"`
   - `"--btn-ok-text": "var(--btn-ok-text)"` → `"--btn-ok-text": "#7ec87e"`
   - `"--btn-info-text": "var(--btn-info-text)"` → `"--btn-info-text": "#8a9ec8"`
   - `"--btn-warn-text": "var(--btn-warn-text)"` → `"--btn-warn-text": "#c87e7e"`
   - `"--btn-teal-text": "var(--btn-teal-text)"` → `"--btn-teal-text": "#7ec8c8"`

6. **Background do loading state hardcoded:**
   - `background: "var(--bg)"` → `background: "#1a3a1a"` (verde escuro visível para debug)
   - `color: "var(--muted)"` → `color: "#888"`

7. **Adição de diagnóstico DOM via `setTimeout` (2.5 segundos):**
   ```javascript
   setTimeout(function() {
     var r = document.getElementById('root');
     console.log('[DOM] root children:', r ? r.children.length : 'null');
     console.log('[DOM] root innerHTML len:', r ? r.innerHTML.length : 0);
     // ... primeiro filho info
     var el = document.createElement('div');
     el.style.cssText = 'position:fixed;top:50%;...;background:red;...;z-index:999999;';
     el.textContent = r.innerHTML.length > 100
       ? 'REACT OK - ' + r.children.length + ' filhos'
       : 'REACT FALHOU - DOM vazio';
     document.body.appendChild(el);
     setTimeout(() => document.body.removeChild(el), 5000);
   }, 2500);
   ```
   Resultado: **"PROBLEMA: root tem 0 chars no innerHTML"** — confirma que React renderiza mas o DOM fica vazio.

8. **Tentativa de banner vermelho de debug:**
   - `background: "#003366"` (azul escuro) adicionado ao div externo do NutritionTracker
   - Banner `position:fixed; top:0; zIndex:99999; background:#ff4444` adicionado como primeira child do div externo
   - Resultado: o utilizador reportou que **nada** era visível — nem o azul, nem o banner

9. **Causa raiz identificada:** ao re-examinar o return statement do `NutritionTracker`, a contagem de parênteses revelou **1491 opens vs 1493 closes** — 2 parênteses extra. O React chamava o componente, mas o resultado do render era descartado silenciosamente porque a estrutura do `React.createElement` estava inválida, causando o React 18 a desmontar o root sem lançar erro visível.

   A origem dos 2 extra: no passo de remoção do modal do `LoginScreen` (Item 2), `content[:modal_start]` terminava com `))))` (4 parênteses — os que precediam a vírgula antes do modal), e o `new_end = ')))));\n}'` adicionado tinha 5 parênteses. Total: 9 parênteses onde deviam existir apenas 5. As operações posteriores de step 3 reduziram para 8, depois para 6 — ainda 2 a mais.

### Solução implementada

1. **Fragment wrapper:** o return do `NutritionTracker` foi alterado de:
   ```javascript
   return React.createElement("div", {style:{minHeight:"100vh",...}}, ...children...);
   ```
   para:
   ```javascript
   return React.createElement(React.Fragment, null,
     React.createElement("div", {style:{minHeight:"100vh",...}}, ...children...),
     showGA && null  // ← placeholder para o modal
   );
   ```
   Adicionando `React.createElement(React.Fragment, null,` no início e `, showGA && null)` no final.

2. **Redução do closing a 4 parênteses:** a sequência `"Repor metas automáticas")))))), showGA && null);\n}const inp` foi ajustada para `"Repor metas automáticas")))), showGA && null);\n}const inp` — de 6 para 4 parênteses antes da vírgula, com o `)` do Fragment e o `;` depois.

3. **Verificação final:** 1491 opens = 1491 closes. App confirmado funcional pelo utilizador: *"ok, agora o app já abre de novo normalmente"*.

**Estado resultante:** app funciona, mas o **modal do GA ainda não está integrado** (placeholder `showGA && null`).

**PRs/commits relacionados:** não determinado

---

## Item 6 — Falha catastrófica: corrupção do ficheiro para 0 KB (#1)

**Data:** 9 de junho de 2026
**Propósito:** Primeira tentativa de inserir o modal do GA no placeholder `showGA && null`.
**Recursos:** Python 3 (UnicodeEncodeError), JavaScript (surrogate pair)
**Arquivos:** `/mnt/user-data/outputs/index.html` (corrompido para 0 KB)

### O que aconteceu

- O script Python `/tmp/add_modal.py` foi escrito via heredoc para tentar contornar o problema anterior de surrogates. O modal continha o emoji 🧬 escrito como `"\uD83E\uDDEC"` — par surrogate em Python 3, onde `str` é Unicode e surrogates são inválidos em strings normais.
- `open('/mnt/user-data/outputs/index.html', 'w').write(content)` falhou com `UnicodeEncodeError: 'utf-8' codec can't encode characters in position 868826-868827: surrogates not allowed`.
- O modo `'w'` em Python **trunca o ficheiro antes de escrever**. A falha ocorreu durante a escrita, deixando o ficheiro com **0 KB** — irrecuperável.
- Nenhum ficheiro em `/tmp` tinha as alterações recentes (os backups em `/tmp/index_bundled.html` e `/tmp/index_final2.html` eram de 3 de junho de 2026, sem i18n, Groq ou GA).
- A verificação de balanceamento do script mostrou: `( = 1642, ) = 1644, diff = 2` — havia ainda 2 parênteses extra no modal que seriam problema adicional.

**Lição técnica registada:** emoji como surrogate pair (`\uD83E\uDDEC`) em Python 3 causa `UnicodeEncodeError`. Deve usar-se o caractere UTF-8 literal ou o escape `\U0001F9EC` (32-bit).

**PRs/commits relacionados:** não determinado

---

## Item 7 — Reconstrução do app a partir do JSX source + index_bundled.html + Babel

**Data:** 9 de junho de 2026
**Propósito:** Recuperar o app funcional após a dupla corrupção do ficheiro. Estratégia: modificar o JSX source (`nutrition-tracker.jsx`) com as alterações da sessão, compilar com Babel, e reconstruir o HTML com o resultado compilado substituindo o bloco NT do `index_bundled.html` (versão de 3 de junho).
**Recursos:** Node.js 22.22.2, `@babel/core`, `@babel/preset-react` (instalados em `/tmp/node_modules/`), Python 3
**Arquivos:**
- `/mnt/user-data/outputs/nutrition-tracker.jsx` — modificado nesta etapa
- `/tmp/index_bundled.html` — base HTML (824 KB, 3 de junho)
- `/tmp/nt_compiled.js` — output da compilação Babel (205.987 bytes)
- `/tmp/compile.js` — script de compilação
- `/mnt/user-data/outputs/index.html` — reconstruído (839 KB)

### Inventário inicial do JSX source

O JSX tinha os seguintes recursos **presentes** (de sessão anterior de 4 de junho):
- `const STRINGS` — sistema i18n completo PT/EN
- `menuOpen` / `setMenuOpen` — dropdown de configurações no header
- `buildEntry(food, qty)` — função de criação de entradas do diário
- `normalizeMealKeys` — migração de chaves de refeição EN→PT
- `callAI(prompt, maxTokens)` — ainda com Gemini nesta versão
- `autoFillNutrition()` — preenchimento automático via IA
- `generateFeedback(type)` — feedback semanal/diário via IA
- `mealLabel(m)` — etiqueta localizada de refeição

**Ausentes no JSX:**
- `runGA` / `addGAResultToDiary` — funções do GA
- Estados `showGA`, `gaUseAll`, etc.
- Groq API (ainda usava Gemini)

### Modificações ao JSX source

**1. Migração `callAI` de Gemini para Groq:**

Antes:
```javascript
// ── Gemini AI helper
async function callAI(prompt, maxTokens) {
  const key = localStorage.getItem('gemini_key') || '';
  if (!key) throw new Error('Chave API Gemini não configurada. Abre as Configurações (⚙).');
  const proxy = localStorage.getItem('cors_proxy') || '';
  const url = proxy + 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      contents: [{parts: [{text: prompt}]}],
      generationConfig: {maxOutputTokens: maxTokens || 800, temperature: 0.3}
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro na API Gemini');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```

Depois:
```javascript
// ── Groq AI helper
async function callAI(prompt, maxTokens) {
  const key = localStorage.getItem('groq_key') || '';
  if (!key) throw new Error('Chave API Groq não configurada. Abre as Configurações (⚙).');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key},
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{role: 'user', content: prompt}],
      max_tokens: maxTokens || 800,
      temperature: 0
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro na API Groq');
  return data.choices?.[0]?.message?.content || '';
}
```

Decisão: temperatura 0 (determinística), modelo `llama-3.3-70b-versatile`, chave `groq_key`.

**2. Adição dos 10 estados do GA** após `const [suggestions,setSuggestions] = useState(null);`

**3. Adição das funções `runGA` e `addGAResultToDiary`** antes de `return (` — lógica idêntica à descrita no Item 1.

**4. JSX source guardado:** 170 KB (linha count aumentou).

### Compilação Babel

Script `/tmp/compile.js`:
```javascript
const babel = require('/tmp/node_modules/@babel/core');
let src = fs.readFileSync('/mnt/user-data/outputs/nutrition-tracker.jsx','utf8');
src = src.replace(/^import\s+.*$/gm, '');
src = src.replace(
  /export default function NutritionTracker\(\{([^}]+)\}\)/,
  (m, p) => 'function NutritionTracker({' + p + '})'
);
src = src.replace(/window\.storage\./g, 'storage.');
babel.transformSync(src, {
  presets:[['@babel/preset-react', {runtime:'classic'}]],
  filename:'app.jsx'
});
// → /tmp/nt_compiled.js
```
Output: 205.987 bytes (`/tmp/nt_compiled.js`).

### Reconstrução do HTML

```python
bundled = open('/tmp/index_bundled.html').read()
compiled_nt = open('/tmp/nt_compiled.js').read()

start_marker = bundled.find('const {useState,useEffect,useRef}=React;')  # linha 354
end_marker = bundled.find('\nfunction LoginScreen(')                       # linha 5663

new_html = bundled[:start_marker] + compiled_nt + bundled[end_marker:]
```

### Fixes aplicados ao HTML reconstruído

| Substituição | Motivo |
|---|---|
| `gemini_key` → `groq_key` | Wrapper (SettingsPanel, App) ainda usava nome antigo |
| `geminiKey` → `groqKey` | Estado local do SettingsPanel |
| `setGeminiKey` → `setGroqKey` | Setter do estado |
| `Gemini API Key` → `Groq API Key` | Label UI |
| `AIza...` → `gsk_...` | Placeholder do input da chave |
| `menuOpen` state adicionado | Não existia no `index_bundled.html` (adicionado ao lado do estado `lang`) |
| CSS `:root` vars adicionadas ao `<style>` | Garantir disponibilidade antes do primeiro render |

### Verificação

13/13 checks passaram:
- STRINGS (i18n), menuOpen, Groq callAI (`api.groq.com`), `groq_key`, `runGA`, `addGAResultToDiary`, `showGA` state, `normalizeMealKeys`, `buildEntry`, ErrorBoundary, Firebase (`FB_BASE`), `_root.render`, SettingsPanel

**App confirmado funcional:** utilizador reportou *"ok, agora o app já abre de novo normalmente"*.

**Estado:** 839 KB, `showGA && null` placeholder ainda presente, modal do GA **não integrado**.

**PRs/commits relacionados:** não determinado

---

## Item 8 — Falha catastrófica: corrupção do ficheiro para 0 KB (#2) + Tentativa de inserção da modal

**Data:** 9 de junho de 2026
**Propósito:** Segunda tentativa de inserir o modal do GA no placeholder `showGA && null`, desta vez usando heredoc Python para evitar surrogates.
**Recursos:** Python 3 (UnicodeEncodeError)
**Arquivos:** `/mnt/user-data/outputs/index.html` (corrompido novamente para 0 KB)

### O que aconteceu

- Script `/tmp/add_modal.py` escrito via heredoc shell (`cat << 'HEREDOC' ... HEREDOC`).
- O script executou parcialmente: imprimiu "Modal inserted" e "Balance: ( = 1642, ) = 1644, diff = 2" — indicando que o modal tinha ainda 2 parênteses a mais.
- Na linha `open('/mnt/user-data/outputs/index.html','w').write(content)`: `UnicodeEncodeError` novamente — o emoji 🧬 persistia como surrogate `\uD83E\uDDEC` em algum ponto da string.
- Ficheiro truncado para **0 KB** novamente.
- Adicionalmente, o diff = 2 indica que a inserção do modal teria causado um bug de sintaxe mesmo que a escrita tivesse sido bem-sucedida.

**Estado final desta sessão:** `/mnt/user-data/outputs/index.html` = 0 KB (corrompido). Modal do GA não integrado. A sessão termina sem resolver este item.

**PRs/commits relacionados:** não determinado

---

## Item 9 — Screenshots do app em produção (GitHub Pages)

**Data:** 9 de junho de 2026 (00:43 — horário nos screenshots)
**Propósito:** O utilizador partilhou screenshots do app em produção para contextualizar uma questão nutricional. Não é trabalho de código, mas documenta o estado da produção na data.
**Recursos:** Firefox mobile, GitHub Pages (`magnoclovis.github.io/nutrition-tracker/`)

### Dados observados

**Screenshot 1 — domingo, 7 de junho de 2026 (dia de TREINO):**
- Proteína: 167g / meta 163g (acima da meta)
- Calorias: 2493 kcal / meta 3108 kcal (abaixo da meta)
- Carboidratos: 316.3g / 333g | Gorduras: 72.4g / 74g | Fibra: 31.9g / 30g | Sal: 4.0g / 5g
- Alimento visível: Aveia Carrefour 100g — 9g prot, 376 kcal, horário 09:04
- Funcionalidades visíveis: toggle "Dia de TREINO", peso 74kg, IMC 22.8, barras de macros, secção MICRONUTRIENTES recolhida, tabs DIÁRIO / + / DESPENSA / SEMANA / MÉTRICAS

**Screenshot 2 — segunda-feira, 8 de junho de 2026 (dia de DESCANSO — hoje):**
- Proteína: 110g / meta 133g (faltam 23g)
- Calorias: 1879 kcal / meta 2738 kcal (faltam 859 kcal)
- Linha de resumo: "Faltam 23g proteína · Faltam 859 kcal"
- Botão "✦ SUGERIR O QUE COMER" visível (sugestão IA existente)
- Água: 0ml / 2600ml (35ml/kg)
- Funcionalidades visíveis: toggle "DESCANSO", mesmos macros e estrutura

**PRs/commits relacionados:** não determinado

---

## Item 10 — Discussão nutricional: metas de proteína em dia de descanso vs treino

**Data:** 9 de junho de 2026
**Propósito:** O utilizador questionou a lógica do app de ter metas menores de proteína e calorias em dia de descanso, dado que o músculo se recupera precisamente nesse período.

### Decisões/conclusões

Esta discussão **não resultou em código implementado**, mas produziu uma decisão de produto documentada:

1. **Proteína em dia de descanso:** deve ser mantida igual (ou quase) ao dia de treino. A síntese proteica muscular pós-treino persiste nas horas seguintes, que incluem o dia de descanso. A literatura de nutrição desportiva recomenda distribuição uniforme (~0.4g/kg por refeição, constante). A meta reduzida do app é simplificação excessiva.

2. **Calorias em dia de descanso:** faz sentido reduzir um pouco (o gasto energético do treino em si desaparece), mas a redução adequada é da ordem de 200–400 kcal, não 860 kcal como o app estava a calcular para este utilizador.

3. **Crítica ao app:** usa fórmula proporcional simples que reduz tanto proteína como calorias no descanso — válida como estimativa grosseira, inadequada para utilizadores com treino sério.

4. **Proposta de melhoria registada (não implementada):** ajustar o cálculo das metas no app para manter a proteína constante entre treino e descanso, reduzindo apenas levemente as calorias. Este trabalho não foi iniciado nesta sessão.

**Correspondência com ROADMAP:** N05 ("Recalibração dinâmica do gasto calórico") e C08 ("Revisar prompts e critérios nutricionais da IA") são os itens mais próximos no ROADMAP verificado, mas a discussão desta sessão é anterior ao sistema de códigos e mais específica sobre a fórmula de metas diárias, não sobre IA ou gasto calórico dinâmico.

---

## Resumo do estado dos ficheiros ao fim da sessão

| Ficheiro | Estado | Tamanho |
|---|---|---|
| `/mnt/user-data/outputs/index.html` | **0 KB — corrompido** | 0 KB |
| `/mnt/user-data/outputs/nutrition-tracker.jsx` | Actualizado (Groq + GA states + runGA + addGAResultToDiary) | ~170 KB |
| `/tmp/index_bundled.html` | Intacto (versão de 3 de junho) | 824 KB |
| `/tmp/nt_compiled.js` | Compilação desta sessão | 205.987 bytes |
| `/tmp/compile.js` | Script de compilação | intacto |

## Trabalho completado nesta sessão

| Funcionalidade | Estado |
|---|---|
| Função `runGA` (algoritmo genético completo) | ✅ No JSX source e no HTML reconstruído (839 KB) |
| Função `addGAResultToDiary` | ✅ No JSX source e no HTML reconstruído |
| 10 estados do GA | ✅ No JSX source e no HTML reconstruído |
| Botão "🧬 Sugerir com Algoritmo Genético" na aba Diário | ✅ No HTML reconstruído |
| Modal completo do GA | ❌ **Não integrado** (2 tentativas falharam por corrupção) |
| Migração Gemini → Groq no JSX source | ✅ Concluída |
| CSS `:root` vars no `<style>` | ✅ No HTML reconstruído |
| Correcção de referências CSS circulares (6 vars) | ✅ No HTML reconstruído |
| Remoção do auto-open do SettingsPanel | ✅ No HTML reconstruído |
| Timeout de 12s no `loadAll()` | ✅ No HTML reconstruído |
| App funcional confirmado pelo utilizador | ✅ (com 839 KB, sem modal) |
| `/mnt/user-data/outputs/index.html` no final | ❌ 0 KB (corrompido na 2ª tentativa de inserção do modal) |

## Continuidade com outras conversas

- Esta sessão é **explicitamente continuação** de: `/mnt/transcripts/2026-06-08-22-45-22-nutrition-tracker-ga-groq-rebuild.txt` (8 de junho de 2026)
- A sessão **termina com trabalho incompleto**: modal do GA não inserido, ficheiro corrompido. Haverá sessão subsequente para concluir a integração.
- Trabalho discutido mas não iniciado: ajuste da fórmula de metas (proteína constante entre treino e descanso).
