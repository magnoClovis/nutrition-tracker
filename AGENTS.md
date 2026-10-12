# Regras operacionais do repositório

## Documentação é parte da Definition of Done

Antes de iniciar ou encerrar qualquer fatia, leia e cumpra [`documentation/PADRAO-DOCUMENTACAO.md`](documentation/PADRAO-DOCUMENTACAO.md).

- Uma fatia aprovada deve ser registrada imediatamente e por inteiro em `documentation/estado-atual/RESUMO-STATUS.md`, inclusive suas etapas ainda não iniciadas.
- Uma fatia não pode ser declarada concluída enquanto o resumo, o histórico da frente responsável e todo documento específico afetado não refletirem o estado real.
- Depois do merge, preencha o tempo real até o merge e os minutos de CI no histórico e copie exatamente os mesmos valores para a descrição do PR.
- Nunca estime datas, métricas, títulos ou escopos sem evidência. Registros de outra frente só podem ser alterados com evidência versionada ou confirmação daquela frente.
- Todo commit e toda descrição de PR terminam com `Chat-Origin: <nome do chat>`.

O checklist documental é gate obrigatório, com o mesmo peso dos testes e da validação funcional.

## Compatibilidade dos testes com contratos alterados

Toda frente que alterar design, navegação, funcionalidade, processamento em background ou contratos de DOM, seletores, API, eventos ou dados deve verificar os **consumidores do contrato antigo** antes do commit final e do fechamento da fatia. Isso inclui testes unitários, smoke/Playwright, helpers, fixtures, mocks e scripts de validação, mesmo que o recorte novo da funcionalidade já esteja verde.

- Identifique os consumidores afetados e registre no PR como foram encontrados, inclusive buscas pelo seletor, função, rota ou estado substituído.
- Atualize os consumidores para o comportamento novo e remova expectativas obsoletas. Preserve as garantias funcionais; não afrouxe asserções, aumente timeouts ou adicione retries para ocultar uma regressão.
- Execute os recortes afetados **e** os gates completos aplicáveis sobre o conjunto integrado. Teste novo verde não substitui teste antigo que ainda depende do contrato removido.
- Se um gate falhar, preserve os artefatos, classifique se há defeito real no app ou consumidor desatualizado, corrija a causa e repita o gate. Não declare a fatia concluída, nem publique ou mescle o PR, enquanto restarem consumidores conhecidos do contrato anterior.

Registre no PR e na documentação da fatia a evidência das buscas, dos consumidores atualizados e dos resultados dos gates. O checklist detalhado está em `documentation/PADRAO-DOCUMENTACAO.md`.

## Monitoramento passivo obrigatório

Testes demorados, gates completos, builds, deploys, CI e etapas automáticas de testes físicos devem ser acompanhados sem polling contínuo. Depois de iniciar a operação, use a duração histórica para programar uma automação/heartbeat silenciosa para a primeira verificação. Se ainda estiver saudável e em execução, reprograme uma nova janela conservadora; só notifique em conclusão, falha, mudança material ou necessidade de intervenção. Remova a automação depois de processar o resultado terminal.

Não use loops de consulta, sleeps longos nem mantenha o turno bloqueado apenas aguardando. Monitoramento ativo só é aceitável quando a operação for interativa, houver risco concreto de perda de evidência ou o usuário o solicitar; nesse caso, explique antes por que o standby não é seguro.
