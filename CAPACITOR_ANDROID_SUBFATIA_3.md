# Capacitor Android — Subfatia 3

Data da validação: 28 de julho de 2026.

## Escopo

Esta subfatia formaliza a validação funcional do primeiro wrapper Android de
debug da Trofia em aparelho real. Ela não inclui correções funcionais,
alterações no scanner de código de barras, implementação de permissões,
integrações nativas, assinatura de release ou decisões das Subfatias 4 e 5.

Resultado geral: **PASSOU COM RESSALVAS**.

## Ambiente

- aparelho físico identificado pelo ADB como `SM_S938B`;
- instalação autorizada por depuração USB;
- application ID atual `com.hermegas.trofia`;
- variante Android `debug`;
- APK:
  `android/app/build/outputs/apk/debug/app-debug.apk`;
- tamanho do APK: 5.452.557 bytes;
- SHA-256:
  `C28C173A093035228643C161ECB30D225B5C6EDB4F1B776105C6C5E0031614AD`.

O APK foi instalado diretamente com `adb install -r`. A compilação normal
dentro do repositório sincronizado apresentou bloqueios de exclusão nos caches
Gradle. O artefato foi regenerado com os diretórios de saída temporariamente
redirecionados para fora do repositório, sem mudança versionada de
configuração.

## Instalação e inicialização

Resultado: **PASSOU**.

- o ADB reconheceu e autorizou o aparelho;
- o APK foi instalado com sucesso;
- a Trofia apareceu na lista de aplicativos;
- o aplicativo abriu normalmente no aparelho físico;
- o fluxo inicial e a tela de login ficaram disponíveis.

## Autenticação Firebase

Resultado: **PASSOU**.

- login com conta existente;
- carregamento normal do aplicativo após o login;
- persistência da sessão depois de remover o app dos recentes, forçar parada e
  reabrir;
- logout e permanência do estado deslogado depois de forçar parada e reabrir;
- solicitação de recuperação de senha;
- recebimento do e-mail de recuperação;
- abertura do link no navegador do celular;
- alteração da senha e login com a nova senha;
- cadastro de uma nova conta;
- bloqueio correto antes da verificação do e-mail;
- recebimento e abertura do link de verificação no navegador;
- login e fluxo inicial após a verificação.

Não foram observados erros de CORS, `403`, cookies ou sessão nas chamadas
Firebase REST dentro da WebView.

## Persistência de dados

### Com conexão

Resultado: **PASSOU**.

- uma refeição de teste foi registrada;
- o registro apareceu no Diário;
- depois de forçar parada e reabrir, a sessão e a refeição permaneceram;
- os valores continuaram corretos e o registro permaneceu disponível nas telas
  relacionadas.

### Sem conexão

Resultado: **PASSOU COM RESSALVAS**.

- dados registrados anteriormente permaneceram visíveis;
- os gráficos da aba Semana desapareceram offline, mesmo quando a aba já havia
  sido aberta com conexão;
- depois da reconexão, os gráficos retornaram ao sair e entrar novamente na
  aba Semana, sem reiniciar o aplicativo;
- uma refeição criada offline apareceu normalmente e seus nutrientes foram
  computados nas metas;
- nenhum erro, aviso ou estado pendente foi apresentado;
- a refeição offline não foi persistida e desapareceu posteriormente.

O comportamento de escrita offline é uma falha de integridade percebida: a
interface confirma visualmente uma operação que será perdida.

## Backup, importação e clipboard

### Exportação

Resultado: **FALHOU**.

Todas as opções de exportação disponíveis foram acionadas. Nenhuma produziu:

- arquivo;
- seletor de destino;
- painel de compartilhamento;
- notificação;
- mensagem de sucesso;
- mensagem de erro.

### Importação

Resultado: **BLOQUEADO / NÃO TESTADO**.

Não havia backup anterior conhecido e confiável. Como a exportação não produziu
um arquivo, a importação foi adiada para depois da correção da exportação. Não
foi usado um arquivo improvisado para evitar risco de escrita incorreta.

### Clipboard

Resultado: **PASSOU**.

O conteúdo copiado pela Trofia pôde ser colado corretamente em outro aplicativo
do Android.

## Links externos

Resultado: **PASSOU**.

Os links externos disponíveis abriram corretamente no ambiente do aparelho e o
retorno à Trofia funcionou sem perda observável de estado.

## Scanner web atual

Resultado da câmera: **BLOQUEADO**.

- o Android não apresentou solicitação de permissão de câmera;
- em Configurações, a Trofia informou que nenhuma permissão era necessária;
- não havia opção para conceder câmera manualmente;
- o scanner exibiu a mensagem de que a câmera foi negada, não estava disponível
  ou não era compatível;
- não foi possível testar concessão, negação, preview ou leitura real pela
  câmera.

O wrapper atual não declara a permissão Android de câmera. Este teste não avalia
se o scanner web seria confiável depois da permissão, nem substitui a decisão
técnica reservada para a Subfatia 5.

Resultado da digitação manual: **PASSOU**.

Ao informar manualmente um código de barras, o alimento correspondente foi
encontrado normalmente.

## Comportamento geral do Android

### Botão ou gesto Voltar

Resultado: **FALHOU**.

Com modal, configurações ou outra tela interna aberta, Voltar não fechou o
estado atual nem retornou à tela anterior. Em todos os casos testados, o
aplicativo foi enviado ao fundo.

### Rotação

Resultado: **PASSOU**.

Não foram observadas falhas, perda de sessão ou perda de estado durante o teste
de rotação.

### Minimizar e retornar

Resultado: **PASSOU**.

O aplicativo preservou o estado observado ao ser minimizado e retomado.

## Achados adiados

Os seguintes itens foram adicionados ao inventário consolidado:

- `A12`: refeição registrada offline aparenta sucesso, mas não é persistida;
- `D15`: exportação de backup não produz arquivo nem feedback na WebView
  Android;
- `D16`: wrapper Android não declara câmera e impede o scanner antes da
  permissão;
- `D17`: botão ou gesto Voltar minimiza o app em vez de fechar o estado interno.

As mesmas necessidades foram adicionadas ao checklist de estabilidade. Nenhuma
delas foi corrigida nesta subfatia.

## Conclusão

O wrapper Android é funcional em aparelho real para instalação, inicialização,
autenticação Firebase, sessão, persistência online, clipboard, links externos,
rotação e retomada do app.

As limitações encontradas não impediram a validação da base Capacitor, mas
precisam ser tratadas antes de considerar o aplicativo pronto para produção:
perda silenciosa de escritas offline, exportação inoperante, ausência da
permissão de câmera e semântica incorreta do botão Voltar.

A Subfatia 3 termina somente com documentação. Nenhuma atividade das Subfatias
4 ou 5 foi iniciada.
