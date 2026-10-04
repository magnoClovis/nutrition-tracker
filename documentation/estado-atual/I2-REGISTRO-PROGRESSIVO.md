# I2 — Registro progressivo por campo

## Estado

Implementação em andamento na frente Trofia-UIUX. Este documento descreve o contrato funcional em validação; a fatia só será concluída depois dos gates aplicáveis, da revisão do PR e do fechamento documental pós-merge.

## Percurso principal aprovado

As credenciais de acesso são preenchidas antes do perfil, mas não contam como uma das sete decisões nutricionais. A conta Firebase somente é criada depois que o usuário percorre e revisa:

1. nome;
2. data de nascimento;
3. opção binária usada pela fórmula nutricional vigente;
4. peso e altura atuais;
5. nível de atividade;
6. objetivo — manutenção, perda ou ganho, com magnitude e prazo quando aplicáveis;
7. revisão final.

Cada etapa valida apenas a decisão apresentada antes de avançar. Voltar preserva os valores já informados. A revisão apresenta os sete grupos e é o único ponto que dispara a criação da conta e a persistência inicial do perfil.

## Persistência e limites

A I2 não cria contrato novo de backend. O fluxo reutiliza os nomes e semânticas existentes:

- `userName` e o nome público do Firebase Auth;
- `birthDate`;
- `gender`;
- `weightHistory`, com peso e altura na data civil local;
- `activityLevel`;
- `goalType`;
- `goalKg` e `goalWeeks`, vazios para manutenção;
- `language`.

Se a conta for criada e uma gravação posterior falhar, o checkpoint local já existente continua permitindo repetir apenas a persistência, sem criar outra conta. O marcador de nova conta permanece restrito à sessão. Não são adicionados retry automático, relaxamento de validação, transação fictícia ou persistência de senha.

Perguntas sobre padrão alimentar, alergias, organização das refeições e rotina detalhada permanecem fora da I2. Qualquer inclusão futura exige finalidade de produto, política de privacidade e contrato próprios.

## Recuperação de perfil obrigatório

O modal de perfil obrigatório permanece como contingência para uma conta nova cuja persistência tenha ficado incompleta. Ele agora apresenta progressivamente nascimento, opção de cálculo, atividade, objetivo e revisão, mas preserva exatamente seu contrato anterior de seis chaves: `birthDate`, `gender`, `activityLevel`, `goalType`, `goalKg` e `goalWeeks`.

O modal não duplica nome, peso ou altura e não substitui o percurso principal de sete decisões. Contas existentes com perfil incompleto continuam seguindo o tratamento recuperável já aprovado, sem serem classificadas silenciosamente como novas contas.

## Experiência e acessibilidade

- textos equivalentes em PT, EN e ES;
- temas claro e escuro pelos tokens existentes;
- progresso numérico e barra em todas as decisões;
- navegação previsível por Voltar e Continuar;
- transição curta entre etapas, removida por `prefers-reduced-motion`;
- ChoiceField e DateField reutilizados, preservando teclado, foco e leitor de tela;
- alvos e controles existentes mantidos sem selects ou inputs de data nativos.

## Validação exigida

- contratos unitários UMD e ESM do login e do modal de recuperação;
- matriz visual desktop/mobile, PT/EN/ES e claro/escuro;
- avanço, retorno, preservação de valores, revisão e movimento reduzido;
- regressões de data, ChoiceField, criação, checkpoint, verificação de email e perfil obrigatório;
- gate completo local e CI autenticado real antes do merge.

## Evidência pré-merge

- contratos focados de login e recuperação: 48/48;
- composição e controladores afetados junto aos contratos focados: 62/62;
- recorte legado após alinhar a expectativa textual do helper à cópia aprovada: 14/14;
- matriz Vite pública afetada: 50/50, com 9 skips autenticados esperados porque esse recorte não carregou credenciais;
- gate local integral autenticado: preflight verde, 1.514/1.514 unitários, smoke legado com 149 aprovados e 10 skips estruturais, smoke Vite 159/159 e cutover 60/60.

Após o diagnóstico separado `INC-I2-AUTH` entrar na `main` pelo commit `0823472`, a branch incorporou essa base no merge local `c41b0ad` sem conflitos e sem alterar o comportamento funcional da I2. Na árvore integrada, os quatro recortes afetados passaram 59/59 no legado e 59/59 no Vite. O gate integral repetido também ficou totalmente verde: preflight, 1.524/1.524 unitários, smoke legado 161/161, smoke Vite 161/161 e cutover 60/60. Nenhum dos sintomas autenticados anteriores reapareceu; esse resultado não atribui causa nem declara correção de runtime para a intermitência investigada pelo Principal.

A expectativa antiga `Weight maintenance` existia somente no helper de teste; o runtime aprovado usa `Maintain weight`. A correção não relaxou asserções nem alterou o comportamento do produto. O PR funcional é o draft #293; CI real atualizado, métricas finais e merge permanecem pendentes.

Chat-Origin: Trofia-UIUX
