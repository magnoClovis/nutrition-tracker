# Teste físico no Galaxy — procedimento operacional permanente

Este checklist é obrigatório para toda validação do Trofia realizada em Galaxy conectado por USB. Ele protege a conta real, evita alterações persistentes no aparelho e libera o telefone assim que a etapa física termina, mesmo que o trabalho no PC continue.

## Antes de usar o aparelho

1. Confirmar o dispositivo exato com `adb devices -l`; nunca operar um aparelho não autorizado explicitamente.
2. Registrar os valores atuais de timeout da tela, `stay_on_while_plugged_in`, modo Não Perturbar, sincronização principal, `accelerometer_rotation` e orientação bloqueada antes de alterá-los.
3. Confirmar que o usuário saiu da conta real e que o Trofia está na tela de login.
4. Usar exclusivamente uma conta descartável criada ou designada para o teste. Nunca executar exclusão, gravação de fixture ou automação destrutiva na conta real.
5. Manter a tela ligada enquanto o aparelho for necessário. Ativar Não Perturbar por tempo indefinido somente quando notificações não fizerem parte da matriz.
6. Preparar filtros de logcat sanitizados: não registrar senha, token, foto, prompt, resposta de IA, UID ou conteúdo nutricional pessoal.

Se qualquer estado inicial não puder ser lido ou preservado, interromper antes do primeiro toque automatizado.

## Durante a validação

- Dirigir a sequência por ADB sempre que possível; solicitar participação manual apenas quando houver julgamento humano indispensável.
- Em formulários com teclado aberto, não usar `KEYCODE_BACK` apenas para ocultar o IME antes de um toque por coordenada: no Android esse mesmo evento pode enviar a atividade ao plano de fundo. Preferir a ação IME do campo ou redescobrir os limites acessíveis depois que o teclado fechar; confirmar pelo logcat se houve submissão antes de contabilizar uma tentativa.
- Monitorar PID, encerramentos, erros fatais, App Check, Firestore e transporte de IA sem capturar conteúdo sensível.
- Usar somente fotos aprovadas e sem rostos/dados pessoais; criar cópia sanitizada quando necessário.
- Evitar persistir refeições ou alterações fora do objetivo do teste. Se houver persistência necessária, registrar exatamente o dado descartável criado para removê-lo ao final.
- Parar imediatamente diante de risco à conta real, perda de dados, falha de atestação inesperada ou comportamento fora do escopo aprovado.

## Encerramento no aparelho

1. Sair da conta descartável e confirmar a tela de login.
2. Fechar/forçar a parada do Trofia quando a matriz terminar.
3. Remover mídias, capturas, logs brutos e outros artefatos temporários criados no aparelho e no PC.
4. Desativar Não Perturbar.
5. Reativar a sincronização principal.
6. Restaurar o timeout da tela para 30 segundos, salvo se o valor inicial registrado for diferente e o usuário pedir sua restauração exata.
7. Restaurar `stay_on_while_plugged_in`, rotação automática/orientação e qualquer outra configuração alterada ao valor capturado no preflight.
8. Confirmar novamente todos os valores restaurados, incluindo `accelerometer_rotation`, antes de liberar o aparelho.
9. Encerrar logcat, scrcpy, servidores auxiliares e subprocessos; executar `adb kill-server` e verificar que não restou processo relacionado ao Galaxy.
10. Avisar imediatamente ao usuário que o Galaxy já pode ser desconectado, sem esperar testes ou documentação que continuem apenas no PC.

## Evidência mínima no relatório

- modelo/serial sanitizado do aparelho e versão instalada;
- origem da instalação quando relevante (`com.android.vending` para build Play);
- conta descartável confirmada;
- fluxos executados e resultado de cada um;
- erros relevantes encontrados ou ausência deles no recorte observado;
- artefatos removidos e configurações restauradas;
- comparação explícita antes/depois de timeout, tela ativa, DND, sincronização e rotação;
- horário em que o aparelho foi liberado;
- limitações da evidência, sem transformar inferência em comprovação.
