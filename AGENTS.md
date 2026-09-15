# Regras operacionais do repositório

## Documentação é parte da Definition of Done

Antes de iniciar ou encerrar qualquer fatia, leia e cumpra [`documentation/PADRAO-DOCUMENTACAO.md`](documentation/PADRAO-DOCUMENTACAO.md).

- Uma fatia aprovada deve ser registrada imediatamente e por inteiro em `documentation/estado-atual/RESUMO-STATUS.md`, inclusive suas etapas ainda não iniciadas.
- Uma fatia não pode ser declarada concluída enquanto o resumo, o histórico da frente responsável e todo documento específico afetado não refletirem o estado real.
- Depois do merge, preencha o tempo real até o merge e os minutos de CI no histórico e copie exatamente os mesmos valores para a descrição do PR.
- Nunca estime datas, métricas, títulos ou escopos sem evidência. Registros de outra frente só podem ser alterados com evidência versionada ou confirmação daquela frente.
- Todo commit e toda descrição de PR terminam com `Chat-Origin: <nome do chat>`.

O checklist documental é gate obrigatório, com o mesmo peso dos testes e da validação funcional.
