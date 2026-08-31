# Histórico de desenvolvimento — Conversa de 10–11 jun 2026

**Projeto:** Trofia (app de acompanhamento nutricional)
**Fonte:** Conversa Claude — transcript `2026-06-11-09-29-39-nutrition-tracker-dev.txt`
**Período registado:** 2026-06-10T09:26Z → 2026-06-11 (sessão pós-compactação, data exata não determinada)
**Gerado em:** 2026-08-31
**Nota sobre códigos:** O sistema de códigos formal C01–C28 / N01–N09 / A01–A12 existe a partir de 31/07/2026. Todo o trabalho desta conversa é anterior a essa data — nenhum código formal é atribuível com certeza, exceto onde o ROADMAP referencia explicitamente trabalho desta época.

---

## Referência cruzada com o ROADMAP

O ROADMAP (verificado em `main`, commit `5c51fa5`, 31/08/2026) cita que **C03 — Startup seguro e loading estável** está concluído. O trabalho de estabilização do carregamento e do `ErrorBoundary` descrito nesta conversa é compatível com o escopo de C03, mas a associação formal não é confirmável nesta conversa — a nomenclatura C03 não aparece no texto.

O ROADMAP também cita que **C09 — Backend gerenciado de IA** está concluído no PR #79. Essa feature não foi trabalhada nesta conversa.

---

## Item 1 — Separação dos campos de perfil entre os formulários de login e registo

**Data:** 2026-06-10T09:26Z (inferido do timestamp do turno 0 do transcript)
**Propósito:** O formulário de autenticação tinha os campos de data de nascimento e género visíveis tanto em "Entrar" quanto em "Criar conta". A tarefa foi mover esses campos para aparecer exclusivamente na aba "Criar conta", simplificando o fluxo de login.
**Recursos:** React, Firebase Auth, `node --check` (validação de sintaxe JS)
**Arquivos:**
- `/home/claude/index.html` (ficheiro compilado, 972.730 bytes após esta edição)
- `/mnt/user-data/outputs/index.html` (cópia exportada)

**O que foi feito:** O turno 0 do transcript começa com o Claude já a entregar esta feature ("Já corrigi isso na mensagem anterior — o arquivo está pronto"). O resultado entregue: campos de data de nascimento e género removidos da aba "Entrar"; na aba "Criar conta" esses campos continuam presentes. O script do app foi validado com `node --check` (resultado: `JS: ✓ Válido`) e o ficheiro copiado para outputs com 972.730 bytes.

**PRs/commits relacionados:** não determinado

---

## Item 2 — Especificação técnica recebida: Sistema de Metas Nutricionais por Mifflin-St Jeor

**Data:** 2026-06-10T10:05Z (timestamp do turno 1)
**Propósito:** Aproveitar os dados de data de nascimento (que permitem calcular a idade) e género, recolhidos no formulário de registo, para calcular automaticamente metas diárias de calorias e proteína. Anteriormente as metas eram fixas ou calculadas sem esses parâmetros.
**Recursos:** Fórmula Mifflin-St Jeor (matemática pura, sem biblioteca externa)
**Arquivos:** nenhum arquivo criado neste item — é uma especificação enviada pelo utilizador como texto na conversa.

**O que foi feito:** O utilizador enviou a especificação completa como texto inline. Os parâmetros e fórmulas exactos definidos:

### Variáveis
- `P` = peso (kg), `A` = altura (cm), `I` = idade (anos), `FA` = fator de atividade física, `Ajuste` = delta calórico

### TMB (Taxa Metabólica Basal) — Mifflin-St Jeor
- Homens: `TMB = (10 × P) + (6.25 × A) − (5 × I) + 5`
- Mulheres: `TMB = (10 × P) + (6.25 × A) − (5 × I) − 161`

### TDEE e calorias-alvo
- `TDEE = TMB × FA`
- `Calorias-alvo = TDEE + Ajuste`
- Ajuste = 0 → manutenção; Ajuste < 0 → perda; Ajuste > 0 → ganho

### Fatores de atividade (5 níveis)
| Nível | FA | Descrição |
|---|---|---|
| Sedentário | 1.20 | Pouco ou nenhum exercício |
| Levemente ativo | 1.375 | Exercício leve 1–3 dias/semana |
| Moderadamente ativo | 1.55 | Exercício moderado 3–5 dias/semana |
| Muito ativo | 1.725 | Exercício intenso 6–7 dias/semana |
| Extremamente ativo | 1.90 | Exercício muito intenso + trabalho físico |

### Proteína diária
- Manutenção: 1.6 g/kg de peso
- Perda de peso: 2.0 g/kg
- Ganho de massa: 1.8 g/kg

### Ajuste para dias de descanso (especificado separadamente pelo Claude na implementação)
- Sedentário: mantém FA 1.20
- Demais níveis: FA reduzido para 1.35 em dias de descanso

**PRs/commits relacionados:** não determinado

---

## Item 3 — Bug: Tela preta para utilizadores já autenticados (diagnóstico e múltiplas tentativas de correcção)

**Data:** 2026-06-10T10:05Z → 2026-06-10T12:51Z (turnos 1 a 26 do transcript)
**Propósito:** Para utilizadores já com sessão iniciada (autenticados), ao abrir o app aparecia tela preta sem nenhum conteúdo nem popup. O bug foi reportado pelo utilizador no mesmo turno em que enviou a especificação de metas nutricionais.
**Recursos:** React `ErrorBoundary`, Firebase (fbGet/fbSet/storage wrapper), `node --check`, DevTools do browser, GitHub Pages (`https://magnoclovis.github.io/nutrition-tracker/`)
**Arquivos:**
- `/home/claude/index.html` (várias versões geradas e descartadas durante o debugging)
- `/mnt/user-data/outputs/index.html`

**O que foi feito — cronologia das tentativas:**

### Diagnóstico 1 (turno 2, ~10:07Z): causa raiz identificada incorrectamente
O Claude inspeccionou o código e concluiu que o `useEffect` de verificação de perfil usava `storage.get` quando `storage` não estava definido naquele contexto — a API correcta era `fbGet`/`fbSet`. Concluiu que isso fazia o `Promise.all` crashar silenciosamente. Corrigido com `storage.get` (o wrapper global `{get:fbGet, set:fbSet}`) e `.catch(()=>{})` em cada chamada.

### Diagnóstico 2 (turno 6, ~11:57Z): ErrorBoundary invisível em dark mode
Ao reler o ficheiro, o Claude identificou que o `ErrorBoundary` usava `background: 'var(--surface)'`. Em dark mode `--surface` é quase preto (`#161616`) e o texto de erro estava em `#c87e7e` (rosa escuro), tornando a mensagem de erro praticamente invisível — o utilizador via "tela preta" mas era o ErrorBoundary silencioso. Fix aplicado: fundo alterado para `#1a1a1a` fixo, texto vermelho legível.

### Tentativa 3 (turno 6): array .map() inline substituído
Como medida preventiva, substituiu um array `.map()` inline por elementos React explícitos, eliminando uma potencial causa de crash de React children.

### Tentativa 4 (turno 10, ~12:08Z): reimplementação com arquitectura isolada
Após nova reclamação do utilizador ("já foram muitas tentativas"), o Claude reverteu para o último estado estável e reimplementou a feature com arquitectura diferente:
- Wizard de perfil movido para o componente `App` (pai), fora do `NutritionTracker`
- `useEffect` de verificação de perfil no `App`, não no `NutritionTracker`
- Cálculos de metas com IIFE + try-catch inline (`(() => { try { ... } catch(e) { return null; } })()`)
- Eliminação dos subcomponentes `ProfileWizard` e `calcNutritionGoals`

### Bug crítico durante implementação (turno 12, ~12:15Z): código inserido fora do HTML
O Claude inseriu código de `useEffect` **antes da tag `<!DOCTYPE html>`**, ficando como texto visível na página em vez de executar como JavaScript. O código `}, [authed]);` corrompeu o início do ficheiro. Corrigido: código vazado removido, `useEffect` reinserido dentro de `function App()` no lugar correcto.

### Tentativa 5 (turno 14, ~12:20Z): semanas → meses
Após o utilizador confirmar que a feature funcionava, pediu a mudança da unidade de tempo de "semanas" para "meses". Implementado: fórmula do déficit/superávit alterada de `semanas × 7` para `meses × 30` dias no denominador; textos actualizados em PT e EN.

### Tentativa 6 (turno 16, ~12:22Z): tela preta regressa após o wizard salvar
Após salvar os dados no popup/wizard, o NutritionTracker re-renderizava e o IIFE de cálculo na aba Métricas crashava porque os states `userBirth`, `userGender` etc. ficavam vazios. Fix tentado: `App` passa dados do perfil como props (`profileBirth`, `profileGender`, etc.) ao `NutritionTracker`; sincronização via `useEffect` interno.

### Tentativa 7 (turno 18, ~12:25Z): remoção do IIFE de métricas
O utilizador reclamou novamente. O Claude removeu apenas o IIFE da aba Métricas (deixando o wizard funcionar mas sem o painel de metas).

### Tentativa 8 (turno 20, ~12:26Z): correcção do ErrorBoundary (de novo)
O Claude constatou que a correcção do fundo do `ErrorBoundary` não tinha chegado ao ficheiro final. Corrigiu novamente: `background: '#111'` com texto vermelho visível.

### Diagnóstico final no transcript (turno 22, ~12:36Z): hipótese do file://
O Claude sugeriu que o utilizador estava a abrir o ficheiro localmente (`file:///C:/Users/...`) e que o Firebase bloqueava pedidos de `file://`. O utilizador refutou — sempre abriu localmente e sempre funcionou antes.

### Estado final no transcript (turno 26, ~12:51Z): sem resolução
O transcript termina com o Claude a adicionar `console.log` no início do render para capturar o erro antes do ErrorBoundary. Não há confirmação de resolução dentro do transcript.

### Resolução (pós-transcript)
O sumário de compactação da conversa regista que "o utilizador resolveu os problemas de forma independente" e enviou novos ficheiros estáveis como ponto de partida. A causa raiz exacta do bug não foi documentada dentro desta conversa.

**PRs/commits relacionados:** não determinado

---

## Item 4 — Implementação do Wizard de Perfil (3 passos) no componente App

**Data:** 2026-06-10T10:07Z → 2026-06-10T12:20Z (turnos 2, 4, 10, 12, 14)
**Propósito:** Recolher dados de perfil (data de nascimento, género, nível de atividade, objectivo) de utilizadores novos ou utilizadores existentes que ainda não tinham esses dados preenchidos, sem afectar o componente `NutritionTracker` principal.
**Recursos:** React (`useState`, `useEffect`), Firebase (via `storage.get`/`storage.set` — wrapper de `fbGet`/`fbSet`)
**Arquivos:**
- `/home/claude/index.html` (ficheiro compilado, várias versões)
- `/mnt/user-data/outputs/index.html`

**O que foi feito — decisões de implementação:**

### Arquitectura inicial (turno 2): wizard como subcomponente do NutritionTracker
- Componente `ProfileWizard` com props `existingBirth`, `existingGender`, `existingActivity` para não apagar dados já existentes no Firebase
- `useEffect` de verificação de perfil dentro do `NutritionTracker`

### Arquitectura final (turno 10): wizard no componente App
Após reiteradas falhas, o wizard foi movido para o `App` (componente pai):
- States no App: `wBirth`, `wGender`, `wActivity`, `wGoalType`, `wGoalKg`, `wGoalMonths` (originalmente `wGoalWeeks`, renomeado após turno 13)
- `useEffect` no `App` que lê Firebase quando `authed` muda e decide se mostra o wizard
- `NutritionTracker` não tem conhecimento da existência do wizard

### Passos do wizard (definição final)
- **Passo 0:** Data de nascimento + género
- **Passo 1:** Nível de atividade (5 opções com FA: 1.20, 1.375, 1.55, 1.725, 1.90)
- **Passo 2:** Objectivo (manutenção / perda / ganho) + quantidade em **meses** (alterado de semanas — ver Item 5) + kg alvo

### Passagem de dados ao NutritionTracker (tentativa no turno 16)
Props adicionadas: `profileBirth`, `profileGender`, `profileActivity`, `profileGoal`, `profileGoalKg`, `profileGoalMonths` — sincronizadas via `useEffect` interno quando o wizard fecha.

**PRs/commits relacionados:** não determinado

---

## Item 5 — Decisão: mudar unidade de tempo do objectivo de semanas para meses

**Data:** 2026-06-10T12:20Z (turno 13 — pedido; turno 14 — implementação)
**Propósito:** O utilizador, após confirmar que o wizard funcionava pela primeira vez, pediu explicitamente que a unidade de tempo para definir o objectivo (ex: "perder 5 kg em X semanas") passasse a ser meses.
**Recursos:** React (estado do wizard), cálculo aritmético de déficit/superávit
**Arquivos:** `/home/claude/index.html`

**O que foi feito:**
- Label "Semanas" substituído por "Meses" em PT e EN no wizard e no painel de edição da aba Métricas
- Fórmula do déficit/superávit calórico alterada:
  - **Antes:** `delta_kcal = (goalKg × 7700) / (semanas × 7)`
  - **Depois:** `delta_kcal = (goalKg × 7700) / (meses × 30)`
- State `wGoalWeeks` renomeado para `wGoalMonths`; chave Firebase correspondente actualizada

**PRs/commits relacionados:** não determinado

---

## Item 6 — Painel de Metas Nutricionais na Aba Métricas (implementado e revertido)

**Data:** 2026-06-10T10:07Z → 2026-06-10T12:25Z (turnos 2, 4, 16, 18)
**Propósito:** Mostrar as metas calculadas (calorias, proteína, TMB, TDEE) directamente na aba Métricas do app, com edição inline, para que o utilizador possa ver e ajustar as suas metas sem sair da view principal.
**Recursos:** React (IIFE inline, try-catch), Mifflin-St Jeor (cálculo em JS puro)
**Arquivos:** `/home/claude/index.html`

**O que foi feito:**

### Conteúdo do painel (definido no turno 4)
- Linha de contexto: idade calculada, FA activo, ajuste calórico (déficit/superávit)
- 4 cards: Meta calórica, Meta de proteína, TMB, TDEE
- Resumo do objectivo em texto (ex: "perder 5kg em 12 meses · 430 kcal/dia déficit")
- Botão "⚙ Editar objetivo" com formulário inline para alterar nível de atividade, tipo de objectivo, kg e meses
- Aviso quando o perfil está incompleto, com botão para abrir o wizard

### Técnica de implementação (turno 10)
IIFE com try-catch directamente no render do NutritionTracker:
```js
{(() => { try { /* cálculos e JSX */ return elemento; } catch(e) { return null; } })()}
```

### Regressão e remoção (turno 18)
O IIFE era suspeito de causar a tela preta após o wizard salvar (os states de perfil chegavam vazios ao IIFE). Após nova reclamação do utilizador, o Claude removeu completamente o IIFE — o painel ficou sem implementação activa até o utilizador resolver o problema de forma independente.

**PRs/commits relacionados:** não determinado

---

## Item 7 — Recepção de ficheiros estáveis como novo ponto de partida (pós-resolução)

**Data:** não determinado (sessão pós-compactação, após 10 jun 2026)
**Propósito:** O utilizador resolveu os problemas de forma independente e enviou os ficheiros finais estáveis para sincronizar o estado base, substituindo todas as versões geradas durante a sessão de debugging.
**Recursos:** Firebase, React, Capacitor (mencionado nas memórias do projecto)
**Arquivos:**
- `/mnt/user-data/uploads/index.html` (1.042.155 bytes — versão estável do utilizador)
- `/mnt/user-data/uploads/nutrition-tracker.jsx` (173.671 bytes — fonte JSX)
- `/mnt/user-data/uploads/manifest.json` (PWA manifest)
- `/home/claude/index.html` ← sincronizado a partir dos uploads
- `/home/claude/nutrition-tracker.jsx` ← sincronizado a partir dos uploads
- `/mnt/user-data/outputs/index.html` ← sincronizado

**O que foi feito:** O Claude sincronizou os três ficheiros dos uploads para os working directories. Verificações feitas após a cópia:
- `function App()` ✓ presente
- `function NutritionTracker` ✓ presente
- `fbGet` ✓ presente
- `ReactDOM.render` ✗ ausente (o utilizador implementou com arquitectura diferente)
- `userBirth` ✗ ausente (o utilizador implementou com nomenclatura diferente)
- `showProfileWizard` ✗ ausente

A nota no manifest.json recebido:
```json
{
  "name": "Diário Nutricional",
  "short_name": "Nutrição",
  "description": "Registo diário de nutrição com IA",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#111111",
  "theme_color": "#111111",
  "orientation": "portrait"
}
```

**PRs/commits relacionados:** não determinado

---

## Item 8 — Diagnóstico de hang no loading screen ("A CARREGAR..." infinito)

**Data:** não determinado (sessão pós-compactação)
**Propósito:** O utilizador enviou screenshot mostrando o app preso no ecrã de loading ("A CARREGAR..." com spinner) sem nunca chegar ao React. O problema foi reportado logo após tentar usar a versão que estava no outputs.
**Recursos:** Firebase, React, GitHub Pages, CSS (`display:flex` no loading div)
**Arquivos:** `/mnt/user-data/outputs/index.html` (956.273 bytes — versão problemática anterior)

**O que foi feito:**
- Verificado que `loadAll()` tem `setTimeout` de timeout (força `setLoaded(true)` após um limite), mas o loading não terminava.
- Inspeccionado o loading div HTML: controlado por CSS, escondido quando React renderiza.
- Verificado que o ficheiro em outputs tinha 956.273 bytes (diferente do enviado pelo utilizador: 1.042.155 bytes) — ficheiro desactualizado.
- Diagnóstico inconclusivo: não foi determinado se o problema era cache do GitHub Pages, ficheiro errado no deploy, ou outra causa.
- Resolução: o utilizador enviou os ficheiros estáveis (Item 7) — os ficheiros desactualizados foram substituídos.

**PRs/commits relacionados:** não determinado

---

## Item 9 — Implementação do cumprimento personalizado no header (feature final desta conversa)

**Data:** não determinado (sessão pós-compactação, após sincronização dos ficheiros estáveis)
**Propósito:** Mostrar uma saudação curta e personalizada com o nome do utilizador logo abaixo do header — entre o toggle treino/descanso e as argolas de proteína/calorias — para tornar o app mais acolhedor e contextual.
**Recursos:** React (`useState`), Firebase (chave `"userName"`), `@babel/standalone` (compilação JSX→JS via Node.js)
**Arquivos:**
- `/home/claude/nutrition-tracker.jsx` (fonte JSX — editado)
- `/home/claude/index.html` (compilado — 864.421 bytes)
- `/mnt/user-data/outputs/index.html` (cópia final)
- `/mnt/user-data/outputs/nutrition-tracker.jsx` (cópia final)

**O que foi feito — decisões exactas:**

### Localização no ecrã
Inserido entre o bloco do toggle treino/descanso e as argolas de proteína/calorias. Visível **apenas quando `isToday === true`** — não aparece ao navegar em datas históricas.

### Critério de período (horário local do dispositivo)
- 5h ≤ hora < 12h → **"Bom dia"** / **"Good morning"**
- 12h ≤ hora < 18h → **"Boa tarde"** / **"Good afternoon"**
- 18h ≤ hora < 5h → **"Boa noite"** / **"Good evening"**

### Função criada: `getGreeting(name, lang)`
Função utilitária global (fora do componente), inserida no JSX antes de `function dateLabel()`.
Retorna `{ greeting, phrase }` onde:
- `greeting` = ex: `"Bom dia, Magno!"` ou `"Bom dia!"` (sem nome se vazio)
- `phrase` = frase contextual do período

### Mecanismo de variação das frases
`phrases[new Date().getDate() % phrases.length]` — determinístico, baseado no dia do mês, sem aleatoriedade. Garante que a frase muda a cada dia mas é consistente ao longo do mesmo dia.

### Frases implementadas (5 por período, PT e EN)

**Manhã PT:** "Vamos começar bem o dia 💪", "Como foi o sono? Bora registrar! ☀️", "Dia novo, novos registros 🥗", "Café da manhã registrado já? 😄", "Energia total hoje! ⚡"

**Tarde PT:** "O almoço já foi pro diário? 🍽️", "Metade do dia, como estão as metas? 📊", "Boa tarde! Bora manter o foco 💪", "Hidratação em dia? 💧", "Tarde produtiva! Registra tudo 📝"

**Noite PT:** "Como foi o dia? Fecha os registros 📋", "Hora de relaxar e registrar a janta 🌙", "Boa noite! Quase lá nas metas 🎯", "Último esforço do dia 💪", "Jantar registrado? 🍽️"

**Manhã EN:** "Let's start the day strong 💪", "How did you sleep? Let's log! ☀️", "New day, new records 🥗", "Breakfast logged yet? 😄", "Full energy today! ⚡"

**Tarde EN:** "Lunch logged yet? 🍽️", "Halfway through — how are the goals? 📊", "Keep the focus going 💪", "Staying hydrated? 💧", "Productive afternoon! Log everything 📝"

**Noite EN:** "How was the day? Close out your log 📋", "Time to relax and log dinner 🌙", "Almost at the goals 🎯", "Last push of the day 💪", "Dinner logged yet? 🍽️"

### Alterações no `loadAll()` do `NutritionTracker`
1. Adicionado `window.storage.get("userName").catch(()=>null)` ao `Promise.all`
2. Variável `un` adicionada à desestruturação:
   `const [p,l,t,w,mt,n,wg,wi,sp,sl,cg,bd,gd,al,gt,gkg,gw,ma,pm,un] = await Promise.all([...])`
3. Adicionado após `setProfileData`: `if(un) setUserName(un.value || "")`

### State adicionado ao NutritionTracker
`const [userName, setUserName] = useState("")` — inserido imediatamente após a linha `const [profileData,setProfileData] = useState({birthDate:"",gender:""})`.

### Estilos do bloco do cumprimento
```css
background: var(--surface)
borderBottom: 1px solid var(--border)
padding: 10px 20px 11px
```
- `greeting`: `fontSize:15, fontWeight:600, color:var(--text2)`
- `phrase`: `fontSize:14, color:var(--muted), marginLeft:6`

### Compilação
O JSX foi compilado com `@babel/standalone` via Node.js. O script do app (posição 6 entre os 6 scripts do HTML, byte offset 662.767–1.039.658 na versão base) foi localizado por offset e substituído pelo output do Babel. Resultado: 864.421 bytes.

**PRs/commits relacionados:** não determinado

---

## Continuidade com outras conversas

Esta conversa **tem continuidade explícita de sessões anteriores**:

1. O turno 0 do transcript começa com *"Já corrigi isso na mensagem anterior — o arquivo está pronto"*, indicando que a separação dos campos de login/registo (Item 1) tinha sido iniciada numa conversa anterior e esta conversa começa já a entregar o resultado.

2. O sumário de compactação menciona `journal.txt` no mesmo directório dos transcritos como catálogo de conversas anteriores — o trabalho desta conversa faz parte de uma sequência maior de sessões.

3. As memórias do projecto referem work anterior a esta conversa: migração para Vite (PRs #58–#68), publicação no Google Play (PRs #69–#78), barcode scanning com `@capacitor-mlkit/barcode-scanning@8.1.0`, stack React/Vite/Firebase/Capacitor/GitHub Actions. Nenhum desses temas foi trabalhado nesta conversa.

4. As memórias referem que "no fim da última sessão, a equipa estava a começar a arquitectura para substituir a configuração de API key por utilizador do Groq por um proxy Cloudflare Workers servindo Gemini Flash como backend" — este workstream (C09 no ROADMAP, concluído no PR #79) não aparece nesta conversa.
