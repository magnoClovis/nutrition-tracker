# Trofia

## Ficha completa de apresentação para quem vai usar o aplicativo

**Retrato funcional da versão 0.10.0-beta — 1º de setembro de 2026**

O Trofia é um diário nutricional pessoal. Ele reúne, em um único lugar, o que a pessoa comeu, quanto bebeu de água, os suplementos que tomou, suas medidas corporais e as metas que deseja acompanhar. Em vez de mostrar apenas uma soma de calorias, o aplicativo procura responder a perguntas práticas do dia a dia: quanto ainda falta para a meta, em quais refeições a proteína se concentrou, como os últimos dias se comparam entre si e que combinação dos alimentos já cadastrados pode ajudar a completar o dia.

Esta ficha descreve somente o que existe na versão atual. O Trofia está em **fase beta**, disponível como aplicação para navegador e em **teste interno no Android**. A versão para iPhone ainda não está concluída e o lançamento público ainda depende de revisões finais. Funções que aparecem no aplicativo, mas estão em manutenção ou validação, são identificadas separadamente.

## 1. O problema que o Trofia resolve

O acompanhamento alimentar costuma ficar fragmentado: refeições anotadas em um lugar, peso em outro, metas lembradas de cabeça e informações nutricionais difíceis de comparar. O Trofia transforma esses registros em uma visão diária e histórica coerente.

Para quem usa, isso significa poder:

- registrar uma refeição alimento por alimento, descrevê-la em texto, repetir uma combinação salva ou partir de uma fotografia;
- comparar calorias, proteína, carboidratos, gorduras e nutrientes menores com as metas do próprio dia;
- diferenciar um dia de treino de um dia de descanso, pois os dois podem ter metas calóricas diferentes;
- registrar água, suplementos, peso, gordura corporal, cintura e massa muscular;
- enxergar tendências de sete e trinta dias sem tratar uma única medição como diagnóstico;
- receber uma avaliação opcional da refeição, com nota de 0 a 5, explicação, grau de confiança e aviso quando faltam informações;
- receber sugestões montadas a partir dos alimentos que a própria pessoa cadastrou;
- usar português, inglês ou espanhol e escolher aparência clara ou escura;
- conservar uma cópia dos dados e restaurá-la depois;
- alterar a senha ou apagar definitivamente a conta e os dados associados.

O aplicativo não substitui nutricionista, médico ou diagnóstico clínico. Valores obtidos por descrição, fotografia, embalagem ou cálculo corporal são estimativas que a pessoa deve revisar e, quando necessário, discutir com um profissional.

## 2. Como é a experiência do primeiro acesso

### 2.1 Entrar, criar conta e recuperar a senha

Na tela inicial, a pessoa pode escolher o idioma, alternar entre aparência clara e escura e entrar em uma conta existente ou criar uma nova. O campo de senha permite mostrar ou ocultar os caracteres digitados.

Para criar uma conta, são pedidos nome, data de nascimento, e-mail, senha e confirmação da senha. A senha precisa ter pelo menos seis caracteres. O aplicativo verifica campos obrigatórios, formato do e-mail, coincidência das duas senhas e validade da data. Depois do cadastro, é necessário confirmar o endereço de e-mail antes de continuar. Essa confirmação reduz o risco de uma conta ser criada com endereço digitado incorretamente ou pertencente a outra pessoa.

Quem esqueceu a senha informa o e-mail e solicita instruções de recuperação. Por privacidade, a mensagem exibida não confirma se aquele endereço possui ou não uma conta.

### 2.2 Completar o perfil nutricional

Quando os dados necessários para calcular metas ainda não existem, o Trofia abre uma etapa obrigatória de perfil. Nela, a pessoa informa:

- data de nascimento;
- gênero usado no cálculo disponível na versão atual: masculino ou feminino;
- nível de atividade física;
- objetivo: manutenção, perda gradual ou ganho gradual de peso;
- para perda ou ganho, quantidade desejada em quilogramas e prazo em semanas.

Altura e peso também fazem parte do perfil e do acompanhamento corporal. Esses dados, junto com idade, gênero, atividade e objetivo, sustentam as metas apresentadas no Diário. A finalidade dessa etapa não é impor um plano pronto, mas evitar que o aplicativo mostre metas sem base pessoal.

### 2.3 Guias dentro do próprio aplicativo

Há uma apresentação inicial curta e um guia específico em cada área. O botão discreto com a letra “i” reabre a explicação da tela. Os guias mostram onde registrar refeições, onde cadastrar alimentos, como interpretar a semana e como lançar medidas e metas. Isso permite aprender o aplicativo por partes, sem depender deste documento durante o uso.

## 3. Estrutura principal

A navegação é dividida em cinco áreas:

1. **Diário:** o dia escolhido, suas refeições, metas, água, suplementos, notas e orientações.
2. **Adicionar:** as quatro formas de registrar uma refeição.
3. **Alimentos:** cadastro e manutenção de alimentos, refeições salvas e suplementos.
4. **Semana:** resumo dos dias recentes, gráficos, médias e exportação do período.
5. **Métricas:** medidas corporais, evolução, previsão e configuração de metas.

As Configurações ficam no menu de engrenagem. Ao terminar um registro iniciado pelo botão global **+ Adicionar**, o Trofia retorna à mesma área, data e posição da tela em que a pessoa estava.

## 4. Diário — acompanhamento completo de um dia

### 4.1 Escolher e percorrer a data

O Diário não se limita ao dia atual. A pessoa pode avançar ou voltar entre datas e abrir o calendário para ir diretamente ao dia desejado. O aplicativo mantém registros separados por data, permitindo consultar o que foi consumido e quais metas valiam em cada ocasião.

O cabeçalho apresenta uma saudação e cartões informativos rotativos. A área central compara o que foi registrado com as metas do dia escolhido.

### 4.2 Dia de treino ou de descanso

Cada data pode ser marcada como **treino** ou **descanso**. Essa escolha altera a referência de calorias do dia: treino usa a meta ativa; descanso aplica a regra reduzida configurada para dias sem treino. A distinção evita comparar todos os dias com um único número, mesmo quando a rotina muda.

Exemplo: se a terça-feira foi marcada como treino e a quarta como descanso, o círculo de calorias de cada data usa sua própria referência. O histórico mantém essa diferença ao calcular o saldo semanal.

### 4.3 Círculos de calorias e proteína

Dois indicadores de destaque mostram calorias e proteína. Cada um apresenta o total registrado, a meta aplicável e quanto falta ou quanto foi ultrapassado. A leitura é imediata: a pessoa não precisa somar refeições mentalmente.

A informação é sempre ligada ao dia selecionado. Se ainda não houver registros, o total começa vazio; à medida que refeições são adicionadas, os indicadores são atualizados.

### 4.4 Resumo de nutrientes

Além de calorias e proteína, o Diário reúne carboidratos e gorduras e permite expandir a área de nutrientes menores. Quando os alimentos possuem esses dados, podem aparecer fibras, sódio, potássio, cálcio, ferro, magnésio, zinco e vitaminas cadastradas.

Ausência de um nutriente no cadastro não é tratada automaticamente como consumo zero. Essa diferença é importante: “não informado” significa que o aplicativo não tem dado suficiente; não significa que o alimento não contém aquele nutriente.

### 4.5 Refeições do dia

As refeições aparecem em categorias como café da manhã, almoço, lanche e jantar, de acordo com o que foi registrado. Categorias vazias ficam ocultas para deixar a tela mais limpa. Quando há horário informado, a ordem acompanha o primeiro registro de cada refeição, aproximando a tela da sequência real do dia.

Em cada item, a pessoa pode:

- abrir os detalhes do alimento e dos valores registrados;
- editar a quantidade;
- duplicar o item quando consumiu a mesma porção novamente;
- remover um lançamento incorreto;
- acrescentar outro alimento à mesma refeição.

O botão global **+ Adicionar** abre o fluxo de registro sem obrigar a pessoa a procurar primeiro uma categoria vazia.

### 4.6 Avaliação opcional da refeição

Antes de registrar uma refeição, a pessoa pode escolher **Avaliar refeição**. O Trofia calcula uma nota de **0 a 5** considerando a composição da refeição, o que já foi consumido naquele dia, o que ainda falta para as metas e o tempo restante até o fim do dia.

O resultado mostra:

- a nota com duas casas decimais;
- uma leitura resumida: **Bem alinhada** a partir de 4, **Parcialmente alinhada** a partir de 3 e **Pouco alinhada** abaixo de 3;
- os pontos fortes da refeição;
- o principal desvio encontrado;
- quais nutrientes foram avaliados;
- uma explicação em linguagem comum quando o serviço de inteligência está disponível;
- grau de confiança alto, médio ou baixo;
- porcentagem de cobertura dos dados;
- aviso de resultado provisório e os motivos, quando faltam informações em alimentos da refeição ou em registros anteriores do dia.

A nota continua disponível mesmo se a explicação estiver temporariamente indisponível. A pessoa pode editar quantidades, avaliar de novo ou registrar a refeição apesar do resultado. A avaliação é orientação, não bloqueio.

Depois de aceita, a avaliação fica anexada ao registro com a nota e o contexto daquele momento. Ela não é recalculada silenciosamente mais tarde. Assim, o Diário preserva o que foi efetivamente mostrado quando a pessoa decidiu registrar.

Exemplo: um prato com frango, arroz, feijão e salada pode receber destaque positivo pela proteína e pela composição geral, mas indicar que a quantidade de carboidrato ficou acima do que ainda cabia na meta do dia. Se dois alimentos não tiverem fibras informadas, o resultado explica que a cobertura desse nutriente está incompleta, em vez de considerar fibra igual a zero.

### 4.7 Sugestão do que comer com os alimentos cadastrados

O botão **Sugerir o que comer** cruza o que ainda falta para as metas com os alimentos salvos pela própria pessoa. É possível indicar a refeição desejada, selecionar os alimentos que podem participar, permitir o uso de todos os itens disponíveis e ajustar limites.

Entre os ajustes apresentados estão faixa mínima de calorias, mínimo e máximo de proteína, quantidade máxima de alimentos na combinação e tolerância para a proteína. O progresso da busca é mostrado enquanto as combinações são testadas.

Cada sugestão apresenta os alimentos e quantidades propostos, uma pontuação de adequação e uma explicação do que favorece ou prejudica o resultado. A pessoa continua no controle: pode usar a combinação como referência, ajustar os itens ou registrá-la.

Essa função resolve um problema específico: ao fim do dia, saber que “faltam 35 g de proteína” não diz automaticamente o que comer. A sugestão transforma o saldo em uma combinação possível usando alimentos que a pessoa realmente mantém cadastrados.

### 4.8 Água

O Diário possui uma área própria para hidratação, com meta diária e total já consumido. A pessoa pode expandir o controle, acrescentar volumes predefinidos ou informar um volume personalizado. Também pode desfazer um lançamento incorreto.

A água fica separada das refeições porque seu acompanhamento é frequente e não deve exigir a criação de um alimento a cada copo.

### 4.9 Suplementos do dia

Suplementos cadastrados na área Alimentos podem ser marcados no Diário com a dose usada naquele dia. O lançamento pode ser removido se houver erro. Essa separação evita tratar creatina, vitaminas ou cápsulas como se fossem refeições, ao mesmo tempo em que mantém o histórico de uso junto do restante do dia.

### 4.10 Notas e análise do período

A pessoa pode escrever notas livres para o dia e consultar notas anteriores. Isso permite registrar contexto que os números não explicam, como “treino mais longo”, “almoço fora de casa”, “pouco apetite” ou “medição feita após viagem”.

Há também uma análise em linguagem comum do período selecionado. Quando solicitada e disponível, ela comenta os registros e pode ser salva como nota. A pessoa decide se quer conservar esse texto; ele não substitui os lançamentos originais.

## 5. Adicionar — quatro formas de registrar uma refeição

Ao abrir **+ Adicionar**, a pessoa escolhe a refeição e, se desejar, informa o horário. O seletor de horário aceita horas de 0 a 23 e minutos de 0 a 59, oferece a opção **Agora** e pode ser deixado em branco.

### 5.1 Montar com alimentos salvos

No modo de montagem, a pessoa pesquisa um alimento já cadastrado, informa uma quantidade maior que zero e o adiciona à refeição. Pode repetir o processo até incluir todos os componentes do prato.

O Trofia mostra os itens escolhidos e seus totais antes do registro. A pessoa pode retirar um componente, corrigir a quantidade, registrar diretamente ou pedir a avaliação de 0 a 5.

Exemplo: para registrar “almoço”, a pessoa procura arroz, informa 160 g; procura feijão, informa 100 g; acrescenta frango e salada; então confere o conjunto antes de salvar.

### 5.2 Descrever o prato em texto

No modo **Descrever**, a pessoa escreve o que comeu em linguagem natural. Quanto mais concreta a descrição, melhor a estimativa. Um texto útil seria: “Frango grelhado com arroz branco e feijão, porção normal de refeitório; salada de alface e tomate com um fio de azeite; uma laranja de sobremesa”.

O Trofia devolve uma estimativa estruturada dos alimentos, quantidades e valores nutricionais. Antes de registrar, a pessoa revisa o resultado. Pode salvar diretamente ou pedir a avaliação da refeição.

Essa opção atende situações em que montar o prato item por item seria lento, mas a pessoa ainda se lembra da composição. Os números não devem ser entendidos como medição exata: porção “normal”, método de preparo e quantidade de óleo podem variar.

### 5.3 Reconhecer por fotografia

No modo **Foto**, a pessoa tira uma fotografia ou escolhe uma imagem da galeria. O Trofia prepara a imagem e estima o nome do prato, os alimentos visíveis, as quantidades e os nutrientes.

Antes de registrar, a tela exige revisão. Ela mostra a fotografia, o grau geral de confiança, a quantidade de alimentos reconhecidos e os detalhes estimados. A pessoa pode editar nome, componentes, quantidades e nutrientes, avaliar a refeição, analisar a imagem novamente, tirar outra foto, escolher outra da galeria ou descartar o processo.

Se nada puder ser reconhecido com segurança, o aplicativo informa isso e oferece nova tentativa. Se a câmera estiver bloqueada, a galeria continua sendo alternativa. Se ocorrer uma falha ao salvar, os ajustes feitos pela pessoa são mantidos para evitar retrabalho.

A fotografia serve apenas para produzir a estimativa do registro; a versão atual não conserva a imagem da refeição como parte do Diário. O processamento depende de conexão e de sessão válida.

Exemplo: uma foto de um prato misto pode sugerir “arroz, feijão, peito de frango e salada”, cada item com quantidade aproximada. Se a salada foi confundida ou o frango era maior, a pessoa corrige antes de tocar em **Registrar refeição**.

### 5.4 Usar uma refeição salva

Combinações frequentes podem ser guardadas com um nome, como “Shake pré-treino” ou “Café da manhã de trabalho”. Na próxima vez, a pessoa pesquisa a refeição salva e a repete com poucos toques.

O modelo economiza tempo sem transformar a combinação em regra fixa: os alimentos e quantidades podem ser revistos antes do novo registro. A própria tela de montagem oferece **Salvar como refeição** depois que uma combinação foi preparada.

## 6. Alimentos — a base pessoal de itens reutilizáveis

### 6.1 Lista e pesquisa

A área Alimentos mostra tudo que foi cadastrado pela pessoa. Há busca por nome, abertura dos detalhes, edição e remoção. Essa lista alimenta tanto o registro manual quanto as sugestões do que comer.

### 6.2 Criar um alimento manualmente

O botão **+ Novo alimento** abre um formulário. A pessoa informa nome, unidade e valores nutricionais. As unidades disponíveis incluem gramas, mililitros e unidade; suplementos possuem opções próprias, como miligramas, microgramas e cápsulas.

O cadastro contempla calorias, proteína, carboidratos e gorduras e pode receber fibras, minerais e vitaminas quando esses números estiverem disponíveis. O objetivo é conservar a informação que existe na embalagem ou em uma fonte nutricional, sem obrigar a inventar o que não foi informado.

Para produtos contados por unidade — pão, barra, bolacha ou item semelhante — existe a opção **Cadastrar por unidade**. Quando a embalagem apresenta valores por 100 g e a pessoa sabe o peso médio de uma unidade, ela informa esse peso. O Trofia converte os valores e salva a referência como “1 unidade”. Para gramas e mililitros, também é possível indicar uma porção diferente de 100 e deixar o aplicativo ajustar a base usada no cadastro.

### 6.3 Preenchimento assistido pelo nome

Depois de digitar o nome, a pessoa pode pedir **Preencher automaticamente**. O Trofia procura estimar os dados do alimento e preenche o formulário para revisão. Nada deve ser salvo sem conferência, porque marcas, receitas e tamanhos de porção mudam.

### 6.4 Pesquisa em base nutricional

O formulário permite buscar o alimento em uma base nutricional. Os resultados encontrados ajudam a preencher o cadastro, mas a escolha e a revisão final continuam sendo da pessoa.

### 6.5 Código de barras

É possível ler o código de barras com a câmera. Quando disponível no aparelho, a lanterna pode ser ligada ou desligada. Se a câmera não funcionar ou o navegador impedir o acesso, a pessoa digita o número do código manualmente e toca em **Buscar**.

O resultado vem de uma base colaborativa de produtos alimentares. Por isso, o Trofia apresenta o conteúdo como ponto de partida para revisão, não como garantia de que a embalagem atual possui exatamente os mesmos valores.

### 6.6 Refeições salvas

A mesma área reúne as refeições que foram guardadas como modelos. A pessoa vê quantos modelos existem, abre cada combinação, reutiliza, edita ou remove conforme as opções disponíveis. Separar modelos de alimentos individuais evita procurar repetidamente todos os componentes de uma combinação habitual.

### 6.7 Suplementos

Há uma lista própria de suplementos. Para cada item, a pessoa informa nome, dose, unidade e uma nota opcional — por exemplo, “tomar com água”. O suplemento fica disponível para marcação no Diário.

O formulário também aceita medidas corporais opcionais ligadas ao acompanhamento, como gordura corporal, cintura e massa muscular, quando o fluxo correspondente é usado. Esses números aparecem depois na área Métricas; não alteram retroativamente uma refeição.

## 7. Semana — leitura dos dias recentes

### 7.1 Resumo dos sete dias concluídos

A área Semana usa os **sete dias concluídos** para o resumo principal. O dia atual aparece como “em andamento” e não é misturado à consolidação dos dias fechados.

Os cartões mostram médias do período, quantos dias alcançaram a meta de proteína e o **banco de calorias**. O banco soma, para cada dia registrado, a diferença entre o consumo e a meta específica daquele dia. Como a meta pode variar entre treino e descanso, o cálculo respeita a referência que valia em cada data. A tela também informa quantos dos sete dias tinham registros, evitando apresentar um saldo incompleto como se toda a semana estivesse preenchida.

### 7.2 Acesso ao detalhe de cada dia

Os dias aparecem como pontos de entrada para o Diário. Ao tocar em uma data, a pessoa abre diretamente seus registros e pode verificar quais refeições produziram aquele total.

### 7.3 Gráficos de proteína e calorias

Um gráfico mostra a proteína dos últimos sete dias com uma linha de referência para a meta. Outro mostra as calorias e sua meta diária. Isso ajuda a reconhecer constância, oscilação e dias sem dados sem reduzir a análise a uma única média.

### 7.4 Médias por refeição em trinta dias

Quando há dados suficientes, a tela calcula médias por refeição nos últimos 30 dias. Para cada categoria, mostra calorias, proteína, carboidratos e a proporção da meta diária de proteína que ela costuma representar.

Exemplo: a pessoa pode descobrir que o almoço concentra a maior parte da proteína, enquanto café da manhã e lanche contribuem pouco. O valor não diz que o padrão é certo ou errado; torna o padrão visível para uma decisão consciente.

### 7.5 Padrões dos últimos trinta dias

Há uma área específica para padrões recentes. Ela usa o histórico disponível para destacar comportamento do período, sempre condicionado à quantidade de dias realmente registrados.

### 7.6 Exportar a semana

O resumo semanal pode ser exportado em quatro formatos:

- **dados completos**, para conservar a estrutura do período;
- **planilha**, para abrir e organizar os números em programas de tabela;
- **página de relatório**, para leitura com formatação;
- **texto simples**, para copiar ou arquivar sem formatação especial.

Depois da geração, a tela mostra o nome do arquivo, o conteúdo e um botão para copiar o resultado. Essa exportação da Semana está disponível; ela é diferente dos relatórios avançados da área Métricas, que estão em manutenção.

## 8. Métricas — corpo, metas, progresso e previsão

A área Métricas possui duas subáreas: **Acompanhamento** e **Metas**.

### 8.1 Registro rápido de medidas

Em Acompanhamento, a pessoa registra o peso e pode acrescentar:

- gordura corporal em porcentagem;
- cintura em centímetros;
- massa muscular em quilogramas.

A altura permanece como dado do perfil. As três medidas complementares são opcionais porque nem todas as pessoas as acompanham e porque os métodos de medição variam.

### 8.2 Situação atual

Cartões apresentam o peso atual, o **índice de massa corporal** e a **taxa metabólica basal** estimada. O índice relaciona peso e altura; a taxa basal representa uma estimativa da energia usada pelo corpo em repouso. Ambos são referências gerais, não diagnósticos.

Quando há gordura corporal, o Trofia também estima massa de gordura em quilogramas e um peso-alvo ligado à meta de gordura. A validade depende da qualidade e da consistência das medições informadas.

### 8.3 Evolução e histórico

Gráficos mostram a evolução do peso e, quando há histórico suficiente, da taxa metabólica basal. A composição corporal possui acompanhamento próprio para gordura, cintura e massa muscular.

O histórico lista data, peso, índice de massa corporal, gordura, músculo, cintura e referência de proteína daquele registro. A pessoa pode abrir um lançamento, editar seus valores ou removê-lo. Registrar a data de cada medição permite distinguir tendência de variação pontual.

### 8.4 Meta de gordura corporal

A pessoa pode informar a gordura corporal atual e a porcentagem desejada. O Trofia calcula a gordura estimada a perder e alinha esse resultado com o prazo da meta nutricional.

Se houver sequência suficiente de medições compatíveis, aparece uma estimativa de semanas baseada na tendência recente. Quando os dados não bastam, a tela diz explicitamente que ainda não há tendência suficiente, em vez de inventar uma data.

### 8.5 Progresso e previsão

A seção expansível **Progresso e previsão** usa dias concluídos e exclui o dia atual. Ela apresenta:

- ajuste calórico semanal planejado;
- déficit, isto é, calorias abaixo da base estimada de manutenção;
- superávit, isto é, calorias acima dessa base;
- aderência semanal ao ajuste planejado;
- tendência recente de mudança de peso;
- previsão de semanas para a mudança planejada, quando o objetivo é perda ou ganho e existem dados suficientes.

O próprio aplicativo orienta a usar essa área como leitura de direção, não como julgamento diário. Água corporal, glicogênio, sódio e digestão podem alterar o peso de um dia para outro.

### 8.6 Configurar metas

Na subárea Metas, a pessoa pode revisar e alterar:

- atividade física;
- objetivo de manutenção, perda ou ganho gradual;
- meta de gordura corporal;
- quantidade de quilogramas a perder ou ganhar;
- prazo em semanas;
- ajuste de calorias ligado ao objetivo;
- quantidade de proteína por quilograma de peso;
- metas personalizadas de calorias e proteína.

Um resumo de cálculo explica como a meta foi formada: taxa metabólica basal, base estimada do dia, ajuste do objetivo, resultado final de calorias e proteína calculada. Essa “memória de cálculo” existe para que a pessoa não receba apenas um número sem entender de onde veio.

### 8.7 Relatórios avançados: função em manutenção

A tela contém uma área chamada **Relatórios avançados**, destinada a produzir documentos de dia, semana, mês ou histórico completo com gráficos e análise. Na versão retratada por esta ficha, ela está marcada como **Em manutenção** e não deve ser apresentada como função disponível.

Quem precisa retirar dados do aplicativo hoje pode usar a exportação da Semana ou o Backup e restaurar descrito adiante.

## 9. Configurações

### 9.1 Idioma

O Trofia pode ser usado em português, inglês ou espanhol. A escolha altera a tela de entrada, a navegação, os formulários, mensagens de erro, avaliações, guias e áreas de privacidade.

### 9.2 Aparência clara e escura

A pessoa alterna entre modo claro e modo escuro. A opção também está disponível antes de entrar na conta, para que a primeira tela respeite a preferência visual.

### 9.3 Inteligência do aplicativo

As funções identificadas com o símbolo ✦ estão disponíveis para a conta quando o serviço correspondente está ativo. Isso inclui descrição de prato, fotografia, preenchimento assistido, avaliação explicada e orientações. Como dependem de conexão, podem ficar temporariamente indisponíveis sem impedir registros manuais ou o cálculo local da nota da refeição.

### 9.4 Feedback e suporte

O item **Enviar feedback / reportar erro** explica que um formulário será aberto em nova aba e pede confirmação antes de sair do aplicativo. A pessoa pode cancelar ou abrir o formulário. Essa é a forma disponível hoje para relatar um problema ou enviar uma sugestão.

### 9.5 Sair da conta

O botão **Sair da conta** encerra o acesso naquele dispositivo sem apagar os dados. Ao entrar novamente com a mesma conta confirmada, a pessoa volta a acessar seus registros.

## 10. Backup e restaurar

### 10.1 Escolher o que exportar

A pessoa pode gerar uma cópia de:

- Diário de hoje, com refeições e totais;
- últimos sete dias, com refeições e nutrientes principais;
- últimos 30 dias, com totais diários;
- alimentos cadastrados;
- histórico de peso e altura;
- conjunto completo, incluindo Diário, alimentos, peso, metas e água.

No Android, depois de gerar o arquivo, é possível escolher **Salvar no aparelho** ou **Compartilhar**. No navegador, o arquivo é baixado pelos recursos disponíveis no próprio navegador.

### 10.2 Importar e revisar antes de aplicar

Ao escolher um arquivo de cópia, o Trofia primeiro o analisa. A tela lista cada grupo encontrado e informa:

- total de registros;
- quantos são novos;
- quantos já existem.

A pessoa escolhe quais grupos quer restaurar e define uma ação para cada um:

- **Anexar:** mantém o que já existe e acrescenta os dados novos;
- **Substituir:** troca o grupo atual pelo conteúdo do arquivo.

Somente depois dessa revisão o botão **Importar selecionados** aplica a escolha. O formato atual continua aceitando cópias produzidas por versões anteriores do Trofia.

Essa etapa evita que uma importação seja uma ação cega. Ainda assim, **Substituir** deve ser usado com atenção, pois altera o conjunto atual do grupo selecionado.

## 11. Privacidade e segurança vistas pela pessoa

### 11.1 Política de privacidade

A área **Privacidade e segurança** oferece acesso à política em português, inglês e espanhol. Ela explica o tratamento dos dados e as formas de controlar a conta.

### 11.2 Alterar a senha

Para trocar a senha, a pessoa informa a senha atual, a nova e a confirmação. A nova senha deve ter pelo menos seis caracteres. Se as duas versões não coincidirem ou a senha atual estiver incorreta, a alteração não é concluída.

### 11.3 Apagar a conta

Apagar a conta é uma ação separada de sair. A tela avisa que a exclusão é irreversível e que todos os dados serão removidos permanentemente. Para confirmar, a pessoa precisa informar a própria senha e digitar **APAGAR**.

Quando a solicitação é aceita, novos salvamentos são interrompidos, os dados ligados à conta entram no processo de remoção e as informações locais daquela conta são limpas. A operação foi desenhada para continuar com segurança mesmo que a remoção de uma quantidade grande de dados leve mais de uma etapa.

### 11.4 Fotografias e textos enviados para análise

O contrato atual das funções de inteligência estabelece que fotografias de refeição, textos enviados para estimativa e respostas produzidas para essa análise não são guardados pelo serviço intermediário do Trofia. A imagem também não é anexada ao registro final do Diário. O que permanece é o registro nutricional que a pessoa revisou e decidiu salvar.

## 12. Uso com conexão instável

Depois que os dados da conta já foram carregados no dispositivo, o Trofia prioriza essa cópia para abrir as telas rapidamente. Registros feitos durante uma interrupção de conexão podem ficar aguardando envio e são reconciliados quando a comunicação retorna.

Isso não significa funcionamento integral sem internet. Entrada manual, consulta de dados já carregados e parte dos cálculos podem continuar; descrição de prato, reconhecimento por fotografia, preenchimento assistido, explicações e outras análises precisam de conexão. O aplicativo possui estados de carregamento, aviso de falha e nova tentativa para reduzir o risco de confundir “ainda não enviado” com “perdido”.

## 13. Diferenças práticas entre navegador e Android

As funções centrais são compartilhadas. No Android em teste interno, o Trofia aproveita recursos do aparelho para câmera, galeria, leitura de código de barras, salvamento e compartilhamento de arquivos. O botão físico ou gesto de voltar fecha primeiro a janela ou etapa aberta antes de abandonar a tela principal. Espaços de segurança evitam que botões fiquem cobertos por recortes, barras do sistema ou teclado.

No navegador, câmera e arquivos dependem das permissões oferecidas pelo navegador e pelo dispositivo. Quando a câmera não está disponível, fotografia pela galeria e digitação manual do código de barras continuam como alternativas.

## 14. O que está disponível, o que está em validação e o que não faz parte desta versão

### Disponível na versão beta atual

Estão presentes conta com confirmação de e-mail, Diário por data, treino e descanso, registro manual, descrição em texto, fotografia, refeições salvas, cadastro e busca de alimentos, código de barras, avaliação de refeição, sugestão com alimentos salvos, água, suplementos, notas, resumo semanal, exportação da semana, medidas, metas, tendências, previsão, três idiomas, dois temas, cópia e restauração, troca de senha e exclusão da conta.

### Em acabamento ou validação final

Os critérios usados nas orientações nutricionais geradas pelo aplicativo passaram por uma revisão ampla e a parte mais recente das sugestões estruturadas com alimentos salvos está em validação final. A função pode aparecer na versão de trabalho, mas sua revisão completa ainda não deve ser tratada como encerrada para lançamento público.

### Em manutenção

Os **Relatórios avançados** da área Métricas estão visíveis, porém marcados como em manutenção. A exportação da área Semana e as cópias de segurança continuam sendo os caminhos disponíveis para retirar dados.

### Fora da versão atual

Não estão concluídos para uso atual: versão para iPhone, notificações e lembretes completos, registro por voz, leitura automática de rótulos por fotografia, controle de jejum, planejamento de refeições, receitas, integração com relógios e serviços de saúde, exercícios e hábitos em uma área própria, acompanhamento profissional compartilhado, widgets funcionais e lançamento público definitivo.

## 15. Exemplo completo de uso em um dia

Uma pessoa abre o Trofia de manhã e marca o dia como treino. Registra seu peso em Métricas e, no Diário, acrescenta 300 ml de água. No café da manhã, abre **+ Adicionar**, escolhe uma refeição salva chamada “Iogurte com aveia e fruta”, confere as quantidades e registra.

No almoço fora de casa, tira uma fotografia do prato. O Trofia sugere arroz, feijão, frango e salada. A pessoa corrige a porção de frango, remove um item identificado por engano e pede uma avaliação. A nota aparece com pontos fortes, principal desvio, cobertura e confiança. Depois da revisão, ela registra a refeição.

À tarde, marca a dose de creatina já cadastrada e escreve a nota “treino mais longo hoje”. À noite, os círculos mostram quanto falta de calorias e proteína. Em **Sugerir o que comer**, seleciona ovos, pão e queijo entre seus alimentos salvos, limita a combinação a três itens e recebe quantidades possíveis. Ajusta a sugestão e registra o jantar.

No fim da semana, abre Semana, confere o banco de calorias calculado com as metas próprias dos dias de treino e descanso, toca em um dia fora do padrão para abrir seu Diário e exporta o resumo em formato de planilha. Em Métricas, olha a tendência de peso sem interpretar a oscilação de um único dia como resultado definitivo.

## 16. Leitura correta dos resultados

Para usar o Trofia com responsabilidade:

- revise estimativas obtidas por texto, fotografia, código de barras ou preenchimento assistido;
- deixe um nutriente sem valor quando ele for desconhecido, em vez de registrar zero sem confirmação;
- interprete nota de refeição como orientação contextual, não como aprovação médica;
- compare tendências de dias ou semanas, não apenas uma medição isolada;
- lembre que metas e previsões dependem dos dados informados e da regularidade dos registros;
- procure orientação profissional para condições clínicas, restrições alimentares, mudanças intensas de peso ou decisões terapêuticas.

## 17. Em uma frase final

O Trofia é um diário nutricional pessoal e trilíngue que transforma refeições, hidratação, suplementos, medidas e metas em acompanhamento diário e histórico, oferecendo quatro maneiras de registrar o que foi consumido, explicações transparentes sobre estimativas e controle direto da pessoa sobre seus dados.
