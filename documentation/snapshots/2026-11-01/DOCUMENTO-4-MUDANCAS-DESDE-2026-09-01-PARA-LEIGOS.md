# Documento 4 — O que mudou no Trofia desde 1º de setembro de 2026

**Comparação para leitores sem conhecimento técnico**

**Base anterior:** snapshot imutável de 01/09/2026.
**Retrato atual:** código da `main` no commit `4e727679d8b556e89a590b2861acc1b7b53b8b72`, integrado em 01/11/2026.
**Versão nomeada:** 0.11.0-beta.
**Limite principal:** este documento compara experiências e garantias; não afirma lançamento público.

## 1. Como ler “antes” e “agora”

“Antes” significa o que o snapshot de setembro conseguia comprovar. “Agora” significa o que já está no código da linha principal em 1º de novembro. Entre esses pontos houve testes automáticos, builds instalados pela faixa interna da Google Play e provas controladas de serviços reais. Esses estados são diferentes de disponibilidade para qualquer pessoa: o Trofia continua beta, o iPhone não foi entregue e não há evidência de lançamento público.

## 2. Entrada, conta e sessão

### Antes

A abertura e os formulários já permitiam entrar, confirmar e-mail e completar o perfil, mas cadastro e perfil concentravam muitas decisões. A política de permanência da sessão não era apresentada como uma escolha clara para quem usa a web. Senhas novas ainda seguiam o mínimo histórico menor, e incidentes de perfil incompleto/reload estavam sendo diagnosticados.

### Agora

A abertura mostra a marca Trofia e mantém a tela de espera por pelo menos 900 milissegundos, com alternativa estática para quem reduz animações. Se a preparação falhar, aparece erro; a tela não finge que terminou. O cadastro divide credenciais e sete decisões — nome, nascimento, opção usada no cálculo, medidas, atividade, objetivo e revisão. A conta só é criada depois da revisão final. Se uma conta autenticada ficou com perfil incompleto, o fluxo consegue retomar a etapa necessária.

Na web, “Manter logado” decide se a sessão continua depois de fechar o navegador; sem a marcação, a sessão é limitada. No Android, a sessão continua entre aberturas. Novas senhas exigem ao menos 12 caracteres. Contas antigas continuam compatíveis, portanto a mudança não significa que todas as senhas anteriores tenham sido alteradas.

### Por que melhora e o que limita

A pessoa vê menos decisões simultâneas, entende quando a conta será criada e controla a permanência da sessão. Ainda assim, há incidentes históricos de reload, sessão e perfil em investigação ou monitoramento. Testes verdes mostram que os fluxos aprovados passaram; não provam que toda causa intermitente futura foi eliminada.

## 3. Tema e aparência

### Antes

Claro e escuro existiam, mas instalações antigas podiam herdar uma preferência escura histórica e o comportamento não distinguia com suficiente clareza o padrão do aplicativo da escolha posterior da pessoa.

### Agora

Claro é o ponto de partida. Uma instalação antiga migra uma única vez para claro. Depois disso, a pessoa pode escolher Claro, Escuro ou Sistema; “Sistema” acompanha a preferência do aparelho. A decisão fica no navegador ou instalação, não na conta, e é aplicada antes da primeira pintura para evitar um clarão do tema errado.

### Por que melhora e o que limita

O primeiro contato fica previsível e a escolha posterior não é sobrescrita. Como a preferência é local, trocar de aparelho ou navegador não transporta automaticamente o tema. A publicação de um AAB interno com essa mudança prova teste distribuído, não lançamento público.

## 4. Diário: consultar, corrigir e mover registros

### Antes

O Diário mostrava refeições e permitia ações básicas, mas consultar detalhes, corrigir uma quantidade ou mover um item para outra refeição ainda não formavam um fluxo completo e uniforme.

### Agora

Cada item pode abrir detalhes somente para leitura. Quantidade e tipo de refeição podem ser alterados preservando a identidade do registro. Um item pode ser movido para outra refeição e até para uma data histórica. Foto e descrição usam o mesmo cálculo proporcional: se a quantidade muda, calorias e nutrientes mudam na mesma proporção, sem pedir que a inteligência artificial invente uma nova refeição.

Quando uma refeição já avaliada muda de composição, a avaliação antiga é invalidada. Isso evita mostrar a nota de uma composição anterior como se ainda descrevesse a refeição atual. Em telas largas, o Diário ganhou quatro cartões de resumo e um trilho lateral; no celular, conserva a organização compacta.

### Por que melhora e o que limita

Erros cotidianos podem ser corrigidos sem apagar e cadastrar tudo de novo. O redesign completo de timeline, calendário, água e detalhes expansíveis I6 ainda não foi implementado; a experiência atual é uma evolução do Diário existente, não a conclusão desse redesign futuro.

## 5. Adicionar uma refeição

### Antes

Foto, descrição, montagem manual e refeição salva já existiam, mas apareciam em pontos mais fragmentados e o destino/horário não eram coordenados por uma folha comum.

### Agora

O botão central Adicionar primeiro apresenta quatro caminhos com nomes claros: tirar foto, descrever, montar manualmente ou usar refeição salva. No celular ele abre uma folha inferior; em tela larga, um painel próximo ao botão. X, fundo, Escape e botão Voltar fecham e devolvem o foco à origem.

Depois da escolha, a folha Adicionar reúne o tipo de refeição e o horário. Uma refeição recente pode ser repetida em um toque. O Desfazer remove apenas a cópia, mantendo a fonte. O teste final provou que a origem e o destino são registros separados. Código de barras continua em seu fluxo próprio e não foi colocado nesse menu.

### Por que melhora e o que limita

A pessoa entende a escolha antes de entrar em um formulário e consegue corrigir imediatamente uma repetição. A pesquisa cumulativa com bandeja I4-C ainda não foi implementada; não deve ser confundida com a folha já entregue.

## 6. Câmera e revisão do resultado

### Antes

O Trofia já reconhecia refeições por fotografia, mas preview, fotografia, análise e resultado tinham apresentações separadas. Erros diferentes podiam parecer iguais, e tentar novamente podia exigir nova captura.

### Agora

A câmera ocupa um palco centralizado. Quando o aparelho oferece flash, o controle muda a iluminação real e volta a desligado ao sair. Após o disparo, a fotografia aparece antes da câmera ser encerrada e permanece visível durante a análise. A imagem bruta serve à primeira pintura enquanto a versão reduzida para análise é preparada em paralelo.

Timeout, sessão expirada, indisponibilidade, resposta inválida, transporte e quota recebem mensagens distintas. Em falha recuperável, a mesma fotografia pode ser usada novamente; respostas tardias da tentativa anterior são descartadas. O resultado abre em uma folha expansível compartilhada com a busca manual. Porção, peso e nutrientes podem ser revisados e recalculados proporcionalmente.

As provas físicas internas cobriram claro/escuro, flash, cancelamento, retorno do background e várias capturas. Uma medição conservadora registrou feedback visual ainda presente em 1,256 segundo e a análise já com a fotografia em 2,099 segundos; esses números delimitam a transição, não prometem tempo fixo em todo aparelho.

### Por que melhora e o que limita

A pessoa não perde a foto entre etapas e entende se vale a pena tentar novamente. A imagem permanece temporária e não entra no Diário. Reconhecimento continua sendo estimativa editável e dependente de rede. A validação conjunta CAM-RED-10 pela Play ainda não foi iniciada, apesar das provas de cada fatia.

## 7. Avaliação da refeição e inteligência do aplicativo

### Antes

A avaliação 0–5 e explicações assistidas já existiam, mas o fechamento de agosto ainda estava sendo consolidado e os critérios das sete superfícies de inteligência não estavam reunidos em uma política única executável.

### Agora

A nota é calculada localmente por regras versionadas; a inteligência artificial pode explicar, mas não recalcular. Dados desconhecidos permanecem desconhecidos em vez de virar zero. O app informa cobertura e confiança e guarda, quando a pessoa aceita, o snapshot exato mostrado. Alterar a refeição invalida esse snapshot; duplicar uma refeição não copia silenciosamente a avaliação.

Preenchimento por nome, descrição e foto usam contratos estruturados. Feedback e padrões recebem apenas o contexto necessário. Sugestões da Despensa só podem devolver identificadores de alimentos realmente enviados; o cliente recalcula totais. Chamadas exigem sessão e prova de origem do aplicativo antes de transmitir conteúdo ao serviço intermediário.

### Por que melhora e o que limita

Números determinísticos deixam de depender de texto variável, e ausência de dados é visível. Isso não torna a nota diagnóstico clínico nem garante disponibilidade offline das explicações. O modelo generativo pode ficar indisponível sem impedir registro manual ou score local.

## 8. Backup, restauração e histórico

### Antes

Backup e restauração já tinham corrigido a sobrescrita por autosave, mas novas falhas mostraram que leitura incompleta ou preview repetitivo ainda poderiam produzir uma impressão enganosa de sucesso.

### Agora

Leituras e exportações falham de modo explícito quando a completude não pode ser comprovada. A prévia de importação coalesce leituras por data, reduzindo a medição documentada de 1.793 para 623 solicitações naquele cenário. Chaves históricas de refeições em português, inglês e espanhol são normalizadas apenas durante a análise, sem regravar silenciosamente os dados persistidos.

Online, exportação espera escritas pendentes. Offline, o arquivo reflete o snapshot local e informa que existem operações enfileiradas. Restauração suspende autosaves e reidrata com segurança. Exclusão de conta coordena o encerramento do cache e do SDK.

### Por que melhora e o que limita

O app prefere mostrar falha a produzir um arquivo parcial apresentado como completo. A redução de solicitações é uma medição de um cenário, não garantia universal de latência. Serviços remotos e exclusão administrativa continuam dependentes de rede.

## 9. Dados locais, funcionamento offline e troca de conta

### Antes

O snapshot de setembro já documentava a arquitetura offline-first recém-entregue, mas as consequências práticas ainda eram pouco visíveis para um leitor leigo.

### Agora

Depois de carregados, dados podem abrir a partir da cópia local. Registros feitos durante interrupção ficam pendentes e sincronizam quando a rede retorna. O aplicativo distingue pendente, sincronizado e falha. Cada item diário tem identidade estável, reduzindo duplicação em repetição de envio.

Ao trocar de conta, todas as abas bloqueiam novas escritas, encerram conexões, apagam a base local e somente então atribuem o cache à próxima conta. Se a limpeza falhar, o bloqueio permanece. Essa escolha pode exigir nova tentativa, mas evita expor dados da conta anterior.

### Por que melhora e o que limita

Conexão instável deixa de significar perda imediata. “Offline-first” não quer dizer “tudo funciona sem internet”: foto, descrição assistida, busca externa e exclusão administrativa exigem serviços remotos.

## 10. Segurança percebida pela pessoa

### Antes

O app já tinha autenticação, rules, Worker e exclusão administrativa. A revisão C14 ainda precisava provar atestação, proteger o Android, explicitar sessão, limitar telemetria e revisar permissões.

### Agora

Chamadas de inteligência exigem login e App Check; sem a atestação, o Worker retorna rejeição. O Android não permite backup automático dos dados do app, bloqueia tráfego sem criptografia e compartilha arquivos somente pelo cache privado. O navegador aplica uma política que restringe os destinos de rede. Métricas do Worker usam identificador pseudônimo, não guardam prompts/respostas e têm retenção documentada de até 30 dias. Tiers comerciais são apenas observados; não existe cobrança ativa.

As Functions de exclusão passaram a identidades dedicadas para build, runtime e agendamento. Retries e chamadas legítimas foram provados com contas descartáveis. Uma permissão histórica `roles/editor` permanece registrada como decisão separada; ela não foi removida por suposição.

### Por que melhora e o que limita

Há barreiras independentes no cliente, transporte, Worker e armazenamento. Mesmo assim, C14 não está integralmente concluída porque staging e a matriz final continuam abertos. Auditoria interna e testes não equivalem a certificação externa de ausência de vulnerabilidades.

## 11. Android e distribuição

### Antes

Havia AABs internos e provas físicas, mas a cadeia de release ainda permitia lacunas de verificação e a identidade instalada não estava alinhada ao novo carregamento.

### Agora

O build release verifica configuração Firebase, manifesto, assinatura, versão e hash de forma fail-closed. Auto Backup, transferência de dados e cleartext foram desativados. A marca “T + folha” ganhou variantes web, legada, redonda, adaptativa e monocromática, geradas de fonte versionada. Builds internos 28 e 29 comprovaram tema e câmera em aparelhos reais.

### Por que melhora e o que limita

O artefato interno é mais verificável e coerente. O `versionCode` efetivamente distribuído em toda a história não pode ser reconstruído apenas pelo Gradle atual. Não há iOS entregue nem prova de faixa pública.

## 12. Alimentos e Despensa

### Antes

Alimentos, refeições salvas e suplementos apareciam em blocos expansíveis.

### Agora

O código da PR #340 introduz cabeçalho com contagens reais, busca permanente, segmentos para Alimentos, Refeições, Suplementos e Categorias, filtros locais, categorias derivadas e estados vazios. Nenhum schema foi alterado; criação, scanner, edição e persistência existentes foram preservados.

### Contradição que permanece

O código está mesclado no commit-base, mas `RESUMO-STATUS.md` e `I8-ALIMENTOS-DESPENSA.md` ainda chamam I8-A de “em andamento” e o PR de draft. Este snapshot registra as duas evidências sem escolher silenciosamente uma terceira versão: integração no Git está comprovada; encerramento documental não foi reconciliado. I8-B e I8-C — cartões/ações e busca unificada externa — continuam não iniciadas.

## 13. Staging, produção controlada e lançamento

| Estado | O que está comprovado | O que não significa |
|---|---|---|
| Código na `main` | As mudanças descritas estão no commit-base, com a ressalva documental da I8-A. | Ausência de bugs futuros. |
| CI verde | Gates de cada fatia passaram nos commits documentados. | Que toda execução histórica ou futura passará. |
| Produção controlada | Worker, Functions e Pages tiveram rollouts e provas específicas. | Produto aberto ao público. |
| Android interno | AABs foram instalados pela faixa interna da Play e testados fisicamente. | Publicação em faixa pública. |
| Staging parcial | Projeto, apps, Auth, App Check web, manifesto e CSP parciais existem. | Worker, Functions, Tasks, Scheduler, IAM, Android e matriz completos. |
| Lançamento público | Não comprovado. | — |

## 14. O que ainda bloqueia a versão pública

- concluir C14-H com recursos remotos, CI, Android staging e matriz cross-account;
- implementar C26-A e C26-B: toast seguro e lembretes locais consentidos;
- decidir e implementar C30 se o lançamento for monetizado;
- fechar documentação operacional C16 e o gate público C25;
- reconciliar a documentação viva da I8-A;
- manter incidentes de sessão/reload sob investigação quando reaparecerem.

## 15. Resumo final da comparação

Desde setembro, o Trofia ficou mais claro para entrar, mais seguro para manter sessão e dados locais, mais direto para adicionar/corrigir refeições e muito mais contínuo ao usar a câmera. Backup e serviços remotos passaram a falhar de maneira mais explícita; a segurança ganhou atestação, limites, telemetria minimizada e identidades mais restritas. Ao mesmo tempo, o projeto ainda distingue honestamente código mesclado, teste automatizado, produção controlada, staging parcial, teste interno e lançamento público. A última condição não está comprovada.
