# Contrato da pontuação nutricional

Estado do contrato: algoritmo `meal-score-v2` implementado na Fatia C20-B. Snapshots `meal-score-v1.1` permanecem históricos e não são recalculados.

## Finalidade

A nota de 0 a 5 mede quanto uma refeição se alinha ao que resta das metas nutricionais do dia selecionado. Ela é contextual: depende das metas do usuário, dos registros daquele dia e do horário real informado para a refeição.

A nota não mede a qualidade absoluta de um alimento, não diagnostica condições de saúde e não substitui orientação de nutricionista ou profissional de saúde. Uma nota baixa nunca impede o registro da refeição.

## Entradas do contrato v2

- data civil selecionada;
- horário real da refeição, informado pelo usuário ou capturado no momento do registro;
- entradas já registradas no dia;
- alimentos candidatos da refeição;
- metas válidas do dia, inclusive metas históricas;
- origem e completude dos dados nutricionais.

Reavaliar a mesma refeição não pode trocar seu horário real pelo relógio atual. Idioma, fuso do dispositivo usado na reavaliação e momento da reavaliação também não podem mudar o resultado quando as entradas contratuais forem as mesmas.

## Nutrientes

| Nutriente | Papel aprovado | Peso v2 |
|---|---|---|
| Calorias | Obrigatório; adequação ao orçamento energético restante | 25% |
| Proteína | Obrigatório; aproximação da meta restante | 25% |
| Carboidratos | Opcional; aproximação da meta restante | 12% |
| Gorduras | Opcional; aproximação da meta restante | 10% |
| Fibra | Opcional; aproximação da meta restante | 16% |
| Sal | Opcional; respeito ao limite restante | 12% |

O campo `salt` e sua meta são expressos em gramas de sal. Eles não representam gramas de sódio. Açúcares e gorduras saturadas ficam fora do C20 enquanto a cobertura de dados depender da expansão N02.

## Validade, cobertura e nota provisória

Calorias e proteína são obrigatórias. Sem meta válida ou dados completos de uma delas, a avaliação é inválida e não apresenta uma nota numérica definitiva.

Carboidratos, gorduras, fibra e sal são opcionais: entram no cálculo apenas quando existe uma meta válida e todos os alimentos relevantes fornecem o dado. A ausência de uma meta exclui o nutriente sem reduzir a cobertura.

Quando um nutriente opcional aplicável estiver incompleto, a nota calculada com os componentes restantes deve ser exibida como provisória. O estado provisório precisa informar cada motivo de forma específica, incluindo:

- nutriente afetado;
- se a lacuna está na refeição candidata ou nos registros anteriores do dia;
- quantidade de itens sem o dado e total de itens daquele escopo.

Exemplo de apresentação: `Nota provisória — faltam dados de fibra e sal para 1 de 2 alimentos da refeição.` Um selo genérico sem a causa não satisfaz este contrato.

Incerteza de estimativa por foto é uma dimensão diferente de cobertura. Ela pode ser apresentada separadamente, mas não deve ser convertida silenciosamente em nutriente ausente nem alterar a nota sem uma regra versionada.

A cobertura divide o peso disponível pelo peso aplicável. Uma meta opcional inexistente não entra no denominador. A confiança técnica derivada da cobertura é `alta` a partir de 90%, `média` a partir de 70%, `baixa` abaixo de 70% e `indisponível` quando falta um componente obrigatório. Ela descreve apenas completude dos dados, não certeza clínica nem precisão de uma estimativa por IA.

## Curvas e horário contextual

O horário é fixado uma única vez ao abrir a revisão e combina a data civil selecionada com o horário real informado — ou o horário do sistema quando o controle opcional não foi usado. Reavaliar e confirmar reutilizam essa mesma ocorrência.

A parcela contextual do que ainda falta no dia usa uma curva suave de potência (`0,75`) sobre uma janela de três horas, com piso de 15% para refeições cedo. Nas últimas três horas do dia, todo o restante vira referência. Esse cálculo usa o relógio civil contido na ocorrência e não o fuso do aparelho que fizer uma reavaliação posterior.

- Calorias, carboidratos e gorduras usam curva de aproximação: crescem suavemente até a referência e perdem pontos progressivamente no excesso.
- Proteína e fibra usam curva de alcance com saturação na referência, sem premiar excesso adicional.
- Sal usa curva de limite: mantém pontuação integral enquanto estiver dentro da referência e aplica penalidade progressiva acima dela.
- Os pesos totalizam 100 e são renormalizados apenas entre componentes realmente disponíveis.

Os parâmetros constituem a calibração técnica inicial. A revisão externa posterior por nutricionista pode gerar uma nova versão do algoritmo; não deve alterar silenciosamente `meal-score-v2`.

## Versionamento e histórico

Toda avaliação persistida identifica a versão do algoritmo e conserva o snapshot usado no registro. O contrato novo é persistido como `meal-score-v2`.

Snapshots históricos não serão recalculados automaticamente. Comparações entre notas de versões diferentes precisam expor a versão ou evitar sugerir equivalência direta.

A persistência usa `buildMealScoreSnapshot()` como projeção única do resultado atual. A leitura compatível usa `inspectMealScoreSnapshot()`: aceita `meal-score-v1.1` e `meal-score-v2`, devolve uma cópia sem mutar o registro e classifica a calibração como histórica ou atual. `areMealScoreSnapshotsComparable()` só autoriza comparação direta quando as duas versões são idênticas.

## Integração com o GA

O limite automático do gerador de refeições conserva o contrato linear `GA v1` já observado pelos usuários. Seu relógio e sua parcela de três horas pertencem ao próprio `meal-ga.js`; não reutilizam a curva contextual do score v2. Assim, uma futura recalibração da nota não modifica silenciosamente as sugestões da despensa.

A prévia de cada resultado do GA fornece calorias, proteína, carboidratos, gorduras, fibra e sal ao avaliador. Nutrientes opcionais ausentes continuam sendo tratados como ausentes, nunca como zero.

## Invariantes de calibração

O algoritmo v2 deve satisfazer, no mínimo:

1. resultado determinístico e limitado ao intervalo de 0 a 5;
2. excesso adicional de um nutriente-limite não melhora seu componente;
3. aproximação de uma meta ainda deficitária não piora seu componente antes de atingir a faixa adequada;
4. uma refeição que aumenta excesso calórico não supera uma alternativa equivalente que permanece dentro do orçamento;
5. lacunas opcionais geram motivos provisórios específicos e não são tratadas como zero;
6. ausência de uma meta opcional exclui o componente sem criar motivo provisório;
7. horário real idêntico produz o mesmo resultado mesmo quando a reavaliação ocorre depois;
8. PT, EN e ES não alteram cálculo, unidades ou semântica;
9. o GA não pode mudar implicitamente porque o relógio do score mudou: qualquer helper compartilhado precisa de contrato e teste próprios;
10. falha da explicação por IA não altera nem invalida a nota local.

## Matriz executável

`tests/fixtures/meal-score-calibration.json` registra os casos mínimos, resultados numéricos esperados, cobertura, confiança, lacunas e relações do `meal-score-v2`. A matriz também conserva `meal-score-v1.1` como versão anterior para proteger a separação dos snapshots históricos.
