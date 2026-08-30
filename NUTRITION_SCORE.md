# Contrato da pontuação nutricional

Estado do contrato: aprovado para a calibração técnica do C20. A fórmula de produção continua em `meal-score-v1.1` até a Fatia C20-B.

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

| Nutriente | Papel aprovado | Disponibilidade |
|---|---|---|
| Calorias | Obrigatório; adequação ao orçamento energético restante | Atual |
| Proteína | Obrigatório; aproximação da meta restante | Atual |
| Carboidratos | Opcional; aproximação da meta restante | C20-B |
| Gorduras | Opcional; aproximação da meta restante | C20-B |
| Fibra | Opcional; aproximação da meta restante | Atual |
| Sal | Opcional; respeito ao limite restante | Atual |

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

## Versionamento e histórico

Toda avaliação persistida deve identificar a versão do algoritmo e conservar o snapshot usado no registro. A introdução do contrato novo exige uma nova versão, prevista como `meal-score-v2`.

Snapshots históricos não serão recalculados automaticamente. Comparações entre notas de versões diferentes precisam expor a versão ou evitar sugerir equivalência direta.

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

`tests/fixtures/meal-score-calibration.json` registra os casos mínimos, lacunas esperadas e relações que orientarão a implementação. Na C20-A, a matriz valida o contrato e documenta a linha de base de `meal-score-v1.1`; ela não modifica nem aprova os pesos atuais.

Os pesos e curvas finais passam pela calibração técnica da C20-B e por revisão externa posterior de nutricionista antes do lançamento público desse recurso fora do estado Beta.
