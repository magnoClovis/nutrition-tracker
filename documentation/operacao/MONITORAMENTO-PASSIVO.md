# Monitoramento passivo de testes, CI, builds e deploys

Este procedimento é obrigatório em todas as frentes do Trofia para operações automáticas demoradas. O objetivo é acompanhar resultados sem polling contínuo, sem bloquear o chat e sem gerar notificações sem mudança acionável.

## Procedimento

1. Inicie o teste, gate, build, deploy, CI ou etapa automática de validação física e guarde seu identificador.
2. Use a média histórica real para escolher a primeira janela de verificação. Sem histórico confiável, adote uma janela conservadora.
3. Programe uma automação/heartbeat silenciosa para consultar somente depois dessa janela.
4. Enquanto o processo estiver saudável e sem resultado terminal, permaneça em standby. Não faça polling manual repetido, loops ou sleeps longos.
5. Se a verificação encontrar o processo ainda ativo, estime o tempo restante pela evidência disponível e reprograme outra janela.
6. Em sucesso, execute o fechamento previsto. Em falha, preserve logs e artefatos, pare ações dependentes e comunique a causa observável. Se houver intervenção do responsável, avise imediatamente e de forma objetiva.
7. Exclua a automação assim que o resultado terminal tiver sido processado.

## Notificações e exceções

A automação só deve notificar em conclusão, falha, mudança material ou necessidade de intervenção. Monitoramento ativo é exceção e exige justificativa prévia: operação interativa, risco concreto de perder evidência ou pedido explícito do responsável.

Este procedimento se aplica a Playwright, unitários demorados, matrizes visuais, Android/AAB, GitHub Actions, deploys e etapas automáticas no Galaxy. Ele não altera os gates de qualidade nem permite considerar uma operação concluída antes de seu resultado terminal.
