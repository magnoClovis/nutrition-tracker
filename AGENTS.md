# Regras operacionais do repositório

## Documentação é parte da Definition of Done

Antes de iniciar ou encerrar qualquer fatia, leia e cumpra [`documentation/PADRAO-DOCUMENTACAO.md`](documentation/PADRAO-DOCUMENTACAO.md).

- Uma fatia aprovada deve ser registrada imediatamente e por inteiro em `documentation/estado-atual/RESUMO-STATUS.md`, inclusive suas etapas ainda não iniciadas.
- Uma fatia não pode ser declarada concluída enquanto o resumo, o histórico da frente responsável e todo documento específico afetado não refletirem o estado real.
- Depois do merge, preencha o tempo real até o merge e os minutos de CI no histórico e copie exatamente os mesmos valores para a descrição do PR.
- Nunca estime datas, métricas, títulos ou escopos sem evidência. Registros de outra frente só podem ser alterados com evidência versionada ou confirmação daquela frente.
- Todo commit e toda descrição de PR terminam com `Chat-Origin: <nome do chat>`.

O checklist documental é gate obrigatório, com o mesmo peso dos testes e da validação funcional.

## Evidência de CI em PR técnico

Quando o último SHA com código, configuração ou infraestrutura já passou todos os checks aplicáveis, registre os resultados comprovados no corpo do PR. Não acrescente ao mesmo PR um commit final que altere somente documentos para copiar esses resultados: o diff técnico do PR dispararia novamente o CI integral. Depois do merge, registre nos documentos, por PR exclusivamente documental, os resultados e as métricas exatas de tempo até o merge e de CI; copie os mesmos valores ao corpo do PR original. Até esse registro ser mesclado, a fatia permanece documentalmente aberta.

Esta economia não dispensa nenhum gate: alteração técnica posterior, mudança de base que exija revalidação, check ausente/falho ou divergência de evidência requerem os testes e CI aplicáveis antes do merge. A regra também não altera o CI da `main` nem a autorização necessária para mesclar PRs técnicos.

## Autorização permanente para PRs exclusivamente documentais

O usuário autorizou retirar do draft e mesclar qualquer PR que altere somente documentação, sem solicitar nova aprovação de merge. Antes de mesclar, confirme que o diff é exclusivamente documental, que os checks aplicáveis passaram, que o PR está mesclável e que o merge não interromperá CI ou testes autenticados de outra frente. Essa autorização não se estende a PRs de código, configuração ou infraestrutura, nem autoriza deploy, publicação ou alteração de IAM.

## Monitoramento passivo obrigatório

Testes demorados, gates completos, builds, deploys, CI e etapas automáticas de testes físicos devem ser acompanhados sem polling contínuo. Depois de iniciar a operação, use a duração histórica para programar uma automação/heartbeat silenciosa para a primeira verificação. Se ainda estiver saudável e em execução, reprograme uma nova janela conservadora; só notifique em conclusão, falha, mudança material ou necessidade de intervenção. Remova a automação depois de processar o resultado terminal.

Não use loops de consulta, sleeps longos nem mantenha o turno bloqueado apenas aguardando. Monitoramento ativo só é aceitável quando a operação for interativa, houver risco concreto de perda de evidência ou o usuário o solicitar; nesse caso, explique antes por que o standby não é seguro.
