# Histórico de Trabalho — Projeto Trofia (app de acompanhamento nutricional)
## Conversa: Especificação de redesign de UI/UX + pesquisa estratégica de naming

---

## Nota de escopo, método e limitações

**Natureza da conversa.** Trabalho de caráter misto, **sem escrita de código de produção**. Dois blocos:
1. Uma **especificação de design/UX** completa das telas do app, a partir de capturas enviadas pelo responsável.
2. Uma **pesquisa/consultoria estratégica de naming e identidade de marca** (nomes candidatos, traduções multilíngues e timing de renomeação em fase beta).

**Fontes de verdade usadas para este documento.**
- O conteúdo integral **desta conversa** (única fonte para descrever o que foi feito aqui).
- `ROADMAP.md` do repositório, buscado sob autorização explícita para consulta da convenção de códigos — capturado da `main` no commit `5c51fa5`, reavaliado em 30/08/2026, checkpoint operacional `0.10.0-beta`.
- `bug-inventory.txt` (convertido para Markdown como `BUG-INVENTORY.md`) — versão examinada `0.8.1-beta`, data do inventário 2026-07-26. Observação operacional: o `web_fetch` recusou esse URL por não constar de busca prévia; ele foi obtido via requisição direta ao domínio liberado `raw.githubusercontent.com`.

**Limitações de acesso (declaradas).** Não há acesso a repositório Git, a histórico de PRs/commits, nem a qualquer registro técnico externo além dos dois documentos citados. Nenhum número de PR ou commit é atribuído a partir de inferência. Onde a correspondência com códigos formais é apenas parcial ou incerta, isso está dito de forma explícita.

**Honestidade sobre datas.** As seis capturas enviadas (`Diário_Nutricional_*.pdf` e `settings.png`) exibem no rodapé a data de impressão **18/06/2026** e refletem o estado do app naquele momento (dia exibido: "quinta-feira, 18 de junho"). As mensagens da conversa **não são datadas individualmente**. A produção deste documento ocorre na sessão de **31/08/2026**. Quando um campo "Data" abaixo não é determinável com precisão, isso está declarado — não foi arbitrado.

**Convenção de códigos do projeto (resumo, extraído das fontes acima).**
- **C01–C28** — itens de roadmap (funcionalidades/tarefas de produto), concluídos ou em andamento.
- **N01–N09** — itens de roadmap ainda não iniciados.
- **G01…** — gates/defeitos tratados como bloqueio resolvido (fora da numeração de produto).
- **A01–A12+** — itens do inventário de bugs/riscos (perda, corrupção ou escrita incorreta de dados; total consolidado de 60 itens no inventário).
- **D..** — códigos de defeito referenciados no roadmap como itens separados (ex.: "D03, D05 e D10 permanecem itens separados" dentro do escopo de C01); o registro completo desses D não estava na porção lida.
- **Marco temporal:** conforme instrução do responsável, **códigos formais só existem a partir de 31/07/2026**. As capturas analisadas nesta conversa são de 18/06/2026 e, portanto, **anteriores à era de códigos** — o que enfraquece qualquer tentativa de mapear os achados visuais a um código específico e justifica os "sem código" abaixo.

**Resultado da referência cruzada.** Nenhum dos dois itens de trabalho desta conversa corresponde de forma limpa a um código formal existente. Ambos recebem **apenas título**, sem código forçado. As relações parciais com **C11** e **C01** estão registradas, honestamente, como "contexto relacionado, não equivalência", dentro de cada item.

---

## Contexto do projeto (referência externa, não produzido nesta conversa)

Extraído do `ROADMAP.md` e do `BUG-INVENTORY.md` apenas para situar o trabalho — nada aqui foi decidido nesta conversa:

- O app está em **beta**; o checkpoint operacional registrado é `0.10.0-beta` (fechado por C22, C23 e C28).
- O responsável desenvolve o app **sozinho** (reafirmado nesta conversa: "estou implementando o app, criando ele inteiro sozinho").
- O nome interno de projeto/repositório é **Trofia**; o app, porém, ainda exibe nas telas os nomes **descritivos** "Diário Nutricional" (PT) e "Nutrition Tracker" (EN). Essa distinção é central para o Item 2.
- App é uma aplicação web (hospedada em `magnoclovis.github.io/nutrition-tracker`, visível no cabeçalho dos PDFs), com empacotamento mobile (base Capacitor/Android citada no roadmap) e integração de IA.

---

## Item 1 — Especificação de redesign de UI/UX de todas as telas

**Data:** Insumos (capturas) datados de **18/06/2026**; especificação produzida na sessão de documentação **31/08/2026**. Data exata da troca original nesta conversa: **não determinável** (mensagens sem timestamp).

**Propósito.** O responsável declarou insatisfação com o design ("por enquanto não estou muito satisfeito com o design, costuma ser a parte que pior domino") e pediu, textualmente, sugestões detalhadas por aba para melhorar **navegabilidade, clareza e organização** — de ajustes finos (tamanho/posição de elementos) a mudanças estruturais (mover elementos entre abas, criar/remover abas). Pedido explícito de exaustividade e de organização por abas.

**Recursos (tecnologias/serviços observados nas telas).**
- Aplicação web em GitHub Pages (`magnoclovis.github.io/nutrition-tracker`).
- Integração de IA acionada por botões marcados com "✦": "Sugerir o que comer", "Analisar alimentação do dia", "Analisar padrões alimentares (30 dias)", "Preencher automaticamente", "Descrever prato".
- **Chave de API Groq** exposta no menu de configurações (provável backend de IA no cliente).
- Recursos nativos/PWA implícitos: modo escuro, "Backup e restaurar", "Privacidade e segurança", seletor de idioma (mostrando "English"), leitura de **código de barras**, "Buscar na base nutricional".
- Parâmetros de domínio observados: meta de água `3000ml (40ml/kg)`, alternância "Dia de TREINO/Descanso" que altera metas (kcal treino 2351 / descanso 2003; proteína 165g em ambos no exemplo), cálculo de metas por TMB/objetivo (TMB 1742 kcal, base 2699, ajuste −348 kcal/dia, proteína 2,2 g/kg).
- Nenhuma tecnologia nova foi introduzida — o trabalho foi de análise e especificação sobre a interface existente.

**Arquivos/documentos produzidos e consumidos.**
- **Produzido nesta conversa:** `redesign-diario-nutricional.md` — guia de redesign completo, organizado por aba, entregue como arquivo para download. (Este é um documento de especificação/design, não código.)
- **Consumidos (enviados pelo responsável):** `Diário_Nutricional_diario.pdf` (aba Diário), `Diário_Nutricional_registrar.pdf` (aba Registrar), `Diário_Nutricional_despensa.pdf` (aba Despensa), `Diário_Nutricional_semana.pdf` (aba Semana), `Diário_Nutricional_métricas.pdf` (aba Métricas) e `settings.png` (menu de configurações).

**Pesquisas/análises realizadas.**
- **Sem buscas na web.** Foi uma análise heurística de UX das seis imagens fornecidas.
- Opções comparadas/ponderadas ao longo da especificação: cabeçalho repetido em toda aba **vs.** cabeçalho compacto fixo (sticky) restrito à aba Diário; manter "Registrar" como aba **vs.** fundi-la ao Diário via botão "+"/bottom-sheet; manter Despensa na barra principal **vs.** movê-la para fora (uso esporádico); aba Métricas única **vs.** divisão em "acompanhamento" e "objetivo/configuração"; ordem atual das abas **vs.** reordenação por frequência de uso; anéis grandes de progresso **vs.** barras horizontais finas.

**O que foi feito (detalhamento da especificação).**
Diagnóstico transversal e recomendações por área:

- *Problemas transversais.* (1) **Cabeçalho excessivamente alto** — anéis de proteína/calorias + lista de 5 macros + micronutrientes se repetem acima de **todas** as abas, empurrando o conteúdo real para baixo da dobra em mobile; identificado como o problema nº 1. (2) **Mistura PT-PT/PT-BR** — presença de "ACTUAIS"/"MÉTRICAS ACTUAIS" onde o padrão desejado é PT-BR ("ATUAIS"). (3) Ausência de **sistema de cores semânticas** (cor por estado: dentro da meta / estourou / neutro). (4) **Hierarquia tipográfica fraca** (quase tudo no mesmo peso). (5) Excesso de **cards com borda** colados; recomendação de separar por espaço em branco. (6) **Tratamento visual inconsistente** dos botões de IA (✦). (7) **Reordenação das abas** por frequência de uso.

- *Cabeçalho global.* Reduzir a faixa a ~64px fixa (sticky) com barras de progresso finas de proteína e calorias; mover anéis grandes + macros completos + micronutrientes **apenas para a aba Diário**; corrigir a semântica dos anéis (número central hoje mostra o consumido com a meta abaixo, o que confunde); tornar "75.15kg · IMC 23.2" tocável (atalho para Métricas); transformar o toggle "Dia de TREINO" num switch claro Treino/Descanso com feedback de cor; avaliar remover o ícone ↻ (refresh) num app que salva sozinho.

- *Aba Diário.* Remover/torna acionável o card vago "No caminho" e o "20% proteína 24% kcal"; **eliminar a duplicação de seletor de data** (existem "‹ Hoje ›" no meio e "HOJE ▾" no fim — manter um só, no topo da aba); manter a UI de água (botões rápidos 150/200/250/330/500ml), migrando sua barra para o padrão das barras de macro; **mostrar sempre os slots de refeição** (Café, Almoço, Lanche, Jantar) com "+ adicionar", mesmo vazios; consolidar as três ações por item (··· ✏ ×) num único menu "⋯"; adicionar um **FAB "+"** para o gesto mais frequente (adicionar alimento).

- *Aba Registrar.* Tornar óbvio o estado ativo dos três modos ("Um por um"/"Montar refeição"/"Descrever prato") via segmented control; marcar "Descrever prato" com ✦ (é IA); unificar os dois campos redundantes de alimento (busca + "selecione da lista") num único autocomplete; **mostrar a quantidade/porção e o preview de macros antes de "Registrar no diário"**; promover "Refeições salvas" e "Repetir refeição recente" a chips de acesso rápido no topo. Recomendação estrutural: transformar Registrar em bottom-sheet acionado pelo "+" do Diário.

- *Aba Despensa.* **Renomear** para "Alimentos"/"Meus alimentos" ("Despensa" sugere estoque em casa, não base nutricional); **inverter a ordem** (listar primeiro Salvos/Refeições/Suplementos, com busca no topo; cadastro de novo alimento atrás de um botão "+ Novo alimento" em modal); agrupar os três botões largos (código de barras, buscar base, preencher automaticamente) numa linha de ícones; recolher campos opcionais do formulário de macros atrás de "Mais detalhes ▾"; candidata a sair da barra principal por baixa frequência de uso.

- *Aba Semana.* Bem resolvida no geral. Remover a **redundância** entre a faixa numérica de 7 dias e os dois gráficos (manter os gráficos, tornar a faixa detalhe ao toque); **tratar o dia atual**, que despenca nos gráficos por não ter terminado, como linha pontilhada/projeção ou excluí-lo da tendência e das médias; rotular a linha de meta pontilhada; considerar heatmap de 7 pontos para "dias na meta 5/7"; adicionar seletor de período (7/30 dias).

- *Aba Métricas.* Identificada como **sobrecarregada** (registra medidas, exibe métricas atuais, evolução do peso, histórico, composição corporal, progresso/previsão, perfil nutricional, metas personalizadas e relatórios numa rolagem só). Recomendação central: **dividir em dois propósitos** — (A) "Métricas"/acompanhamento (peso, IMC, composição, evolução, previsão, histórico) e (B) "Objetivo"/configuração (perfil nutricional, metas personalizadas, memória de cálculo), movendo (B) para tela própria ou sub-aba, já que é configuração e não métrica. Ajustes pontuais: corrigir "ACTUAIS"→"ATUAIS"; **remover o campo Altura do registro diário** (altura não muda; vira dado de perfil); unificar ícones "editar ×" do histórico num "⋯"; mover "Gerar relatório" para o fim ou para o menu.

- *Configurações (menu ⚙).* Rotular o seletor de idioma de forma explícita (evitar a impressão de app em inglês pelo item "English"); agrupar em seções (Aparência / Dados / Inteligência / Conta); renomear "Chave API Groq" para algo como "IA — Chave de API (avançado)" com explicação curta; acolher aqui configurações vindas das abas (meta de água 40ml/kg, perfil/objetivo, gerar relatório).

- *Ordem de prioridade entregue (6 passos).* (1) encolher o cabeçalho e retirá-lo das abas não-Diário; (2) dividir Métricas; (3) unificar a navegação de data no Diário e mostrar slots de refeição; (4) tratar o dia atual nos gráficos da Semana; (5) padronizar PT-BR e o estilo dos botões de IA; (6) reorganizar/renomear a Despensa.

**Referência cruzada com códigos formais (honesta, sem forçar).**
- **C11 — "Layout mobile de Métricas" (Concluído, per roadmap):** relaciona-se ao tema da aba Métricas, mas **não é equivalente** ao que foi especificado aqui. C11 trata de layout mobile (já entregue); a recomendação desta conversa é de **arquitetura de informação** (dividir acompanhamento vs. configuração), um escopo distinto. Por isso, sem código no título.
- **C01 — "Textos, datas, mojibake e bugs visuais" (Concluído, PRs #83–#85, per roadmap):** o achado "ACTUAIS"→"ATUAIS" cai no domínio de higiene textual de C01, mas as capturas são de **18/06/2026**, anteriores tanto aos PRs #83–#85 quanto ao marco de códigos (31/07/2026). Não é possível, só com esta conversa, afirmar se o item ainda persiste na versão atual. Registrado como **contexto relacionado, não equivalência**.

**Conclusões/decisões tomadas.** A entrega foi uma **especificação de recomendações** com ordem de prioridade. **Nenhuma recomendação foi confirmada como adotada pelo responsável dentro desta conversa** — não houve "vou implementar X". Ao final do bloco de design, foi oferecida a produção de um mockup visual de uma tela (ex.: Diário) antes de mexer no código; o responsável **não deu seguimento**, migrando o assunto para naming. Portanto: **em aberto quanto à adoção**; entregue quanto à especificação.

**PRs/commits relacionados.** **Nenhum apareceu nesta conversa.** O trabalho aqui foi **exclusivamente de especificação/design**; qualquer implementação real teria ocorrido (provavelmente) em outra conversa/sessão, o que **não é determinável** a partir deste material.

---

## Item 2 — Pesquisa estratégica de naming e identidade de marca

**Data:** Sessão **31/08/2026** (data da sessão de documentação; as trocas de naming vêm depois do bloco de design, ainda nesta conversa). Data exata das mensagens: **não determinável**.

**Propósito.** O responsável avalia adotar um **nome definitivo** para o app, hoje exibido com nomes descritivos ("Diário Nutricional" em PT, "Nutrition Tracker" em EN), e pediu ajuda por se descrever como pouco criativo para nomes ("não sou muito criativo pra isso de nome"). Ao longo do bloco, o objetivo evoluiu: de "sugira um nome" para "quero um nome que funcione em vários idiomas" e, por fim, para "posso adiar essa decisão?".

**Recursos (tecnologias/serviços).** Nenhum. Trabalho de brainstorm linguístico/de marca. Único aspecto técnico tocado: a observação de que o **nome do repositório está na URL** (`magnoclovis.github.io/nutrition-tracker`) e que renomear o nome de exibição **não** exige mexer no repositório, mas renomear o repositório quebraria links antigos.

**Arquivos/documentos produzidos.** Nenhum arquivo. Toda a pesquisa ficou no corpo da conversa.

**Pesquisas/análises realizadas.**
- **Sem buscas na web.** Foi oferecida verificação de disponibilidade de domínio/conta de loja para os candidatos, mas **não executada** — o responsável adiou a decisão antes disso.
- **Sub-análise A — candidatos de nome (por "vibe").** Curtos/de marca: *Nutre, Saciar, Macro/Macros, Pratto*. Fitness/recomposição: *MacroFit, ProtaDiária/Proteína em Dia, Recomp*. Diário/acompanhamento: *Diário Macro, Meu Prato, Em Forma*. Recomendação apontada: *Nutre* (personalidade) ou *MacroFit* (função clara). Observação estratégica: como as telas destacam **proteína/recomposição**, um nome que sinalize isso diferencia de "contador de calorias" genérico.
- **Sub-análise B — tradução de "Nutre" em cinco idiomas.** EN: *Nourish* (alt.: *Nurture*, que puxa para "cuidar/criar"); FR: *Nourris* (imperativo) / *Nourrir*; ES: *Nutre* (idêntico ao PT); JA: sem verbo curto elegante — 栄養 *eiyō* ("nutrição", substantivo) ou 育む *hagukumu* ("nutrir/cultivar"), com transliteração em katakana como alternativa de marca; DE: *Nähre* (imperativo de *nähren*) / *Nähren*. Nota estratégica levantada: PT e ES coincidem ("Nutre"), útil para o mercado da Espanha; o alemão traz o trema (ä), que complica URL/digitação; o japonês não tem equivalente "limpo" de uma palavra.
- **Sub-análise C — nome único para EN/PT/ES/FR/DE.** Candidatos de raiz latina que atravessam os cinco idiomas: *Vital* (grafia idêntica nos cinco, porém muito usado → difícil de registrar), *Macro* (encaixe funcional perfeito, mas genérico), *Vita* ("vida", brandável), *Nutri/Nutra* (raiz de nutrição, clara), *Forma* (joga com "em forma", com pequena variação de grafia). Aposta indicada: *Vita* (equilíbrio entre marca própria e significado universal) ou *Nutra* (se o nome deve dizer a função). Foi oferecido gerar variações sobre o escolhido (ex.: *Vita, VitaFit, Vitamo*) — não executado por decisão de adiar.
- **Sub-análise D — timing de renomeação em beta.** Análise de custo de troca de nome: o custo não está no nome, e sim em **quantas referências já apontam para ele** (bookmarks, indexação, listagem em loja, boca a boca); em beta com poucos testadores, esse custo é ~zero. Regra prática entregue: **escolher o nome definitivo antes do primeiro empurrão de divulgação pública** (post público, loja de app, marketing), pois é aí que o custo dispara. Reforço técnico: dá para manter o repo `nutrition-tracker` e ainda assim exibir outro nome na tela; casar a URL com a marca só é necessário/custoso depois de divulgar.

**O que foi feito.** Consultoria de nomeação em quatro camadas (candidatos → traduções → nome multilíngue unificado → estratégia de timing), fechada com apoio à decisão de adiar, incluindo enquadramento de que "não ser criativo para nomes" é, na prática, **excesso de proximidade com o projeto**, e que bons nomes tendem a surgir de exposição fortuita, não de forçar a criatividade.

**Conclusões/decisões tomadas.** **Decisão do responsável: adiar a escolha do nome.** Mantém, durante o beta, os nomes descritivos atuais ("Diário Nutricional"/"Nutrition Tracker") e definirá a marca antes da divulgação pública. Declarações que sustentam a decisão: "por enquanto deixarei assim"; "o nome poderia esperar eu acho"; "um passo por vez". Candidatos permanecem na mesa para retomada futura (com destaque para *Vita*, *Nutra*, *Vital*, *Nutre*), e a oferta de checar disponibilidade e gerar variações fica pendente para quando a decisão for retomada.

**Referência cruzada com códigos formais.** **Nenhuma.** Não há item de roadmap nem de inventário de bugs relativo a naming/branding. Registre-se apenas, para evitar confusão futura, que o **nome interno "Trofia"** (usado no enquadramento do projeto e como designação de repositório/projeto) **não foi objeto desta conversa de naming** — aqui se discutiu o **nome de exibição** do app, ainda descritivo. "Trofia" não foi proposto, escolhido ou avaliado nesta troca.

**PRs/commits relacionados.** **Não aplicável** — nenhum código foi escrito e nenhum PR/commit foi citado. Trabalho 100% estratégico/consultivo.

---

## Síntese e estado final

**Entregáveis desta conversa.**
- `redesign-diario-nutricional.md` — especificação de redesign por aba (arquivo).
- Corpo de pesquisa de naming em quatro camadas (em conversa, sem arquivo).
- `historico-trofia-redesign-e-naming.md` — este documento histórico (arquivo).

**Decisões efetivamente tomadas.**
- **Naming:** adiar; manter nomes descritivos durante o beta; definir marca antes da divulgação pública. *(Decisão explícita do responsável.)*

**Itens em aberto.**
- **Adoção das recomendações de redesign** — especificação entregue; nenhuma implementação confirmada nesta conversa. Oferta de mockup visual de uma tela permanece disponível e não iniciada.
- **Escolha final do nome** — deliberadamente adiada; verificação de disponibilidade e geração de variações pendentes.

**Fronteira de honestidade.** Este documento descreve **apenas** o que ocorreu nesta conversa. Correspondências com C11 e C01 são relações parciais e datadas, não equivalências; nenhum PR/commit foi atribuído; o estado atual do app na versão vigente (pós-18/06/2026) não é verificável a partir deste material, apenas contextualizável pelas cópias documentais de ROADMAP.md e BUG-INVENTORY.md.
