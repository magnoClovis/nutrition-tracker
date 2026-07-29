# Capacitor Android — Subfatia 6A1: botão Voltar

## Escopo

Esta subfatia intercepta o botão e o gesto **Voltar** somente no Android
nativo. Ela não altera exportação, teclado, safe areas, links externos,
scanner, Open Food Facts, Firebase ou lógica de domínio.

O navegador e o PWA continuam sem listener nativo. No Android, o plugin
oficial `@capacitor/app` entrega o evento a um dispatcher central e
injetável. O dispatcher oferece prioridades explícitas e só minimiza o
aplicativo quando nenhum estado interno consegue consumir o evento.

## Ordem de consumo

O estado visível mais interno é consumido primeiro:

1. painel aninhado dentro de outro modal;
2. modal aberto;
3. menu, formulário ou edição contextual;
4. tela secundária dentro da aba ativa;
5. tela **Adicionar**;
6. data histórica do Diário, retornando para hoje;
7. aba secundária, retornando pela pilha real de abas visitadas.

Acima da navegação nutricional, o shell fecha estados globais como
configurações, backup, privacidade, avisos e tutorial. Painéis aninhados
de Configurações e da prévia de importação possuem prioridade maior que
o próprio shell.

Na raiz — aba **Diário**, data de hoje e nenhum painel aberto — o evento
não é consumido e o Capacitor minimiza a Trofia. Um segundo evento não é
executado em paralelo enquanto o primeiro ainda está sendo processado.

## Preservação dos fluxos existentes

As ações do dispatcher chamam os mesmos setters e funções de fechamento
já usados pela interface. Em particular:

- fechar o scanner usa o cleanup existente, incluindo a liberação
  idempotente da câmera;
- abrir um dia pela aba Semana passa pela mesma navegação de abas e
  preserva a origem na pilha;
- o retorno de uma data histórica ocorre antes do retorno à aba anterior;
- a implementação legada permanece compatível, pois o novo resolvedor é
  uma dependência explícita da composição Vite e é inerte quando ausente.

## Validação automatizada

Os testes unitários cobrem:

- inércia do adaptador fora do Android nativo;
- registro e remoção do listener do plugin;
- minimização somente quando o evento não foi consumido;
- precedência entre painel aninhado, shell e navegação nutricional;
- ordem dos sete níveis;
- desempate determinístico dentro do mesmo nível;
- fechamento de um estado aninhado de Configurações antes do painel.

Antes da entrega do APK, também são executados:

- preflight;
- suíte unitária completa;
- smoke legado;
- smoke Vite;
- matriz visual completa de cutover.

Resultados finais:

- preflight: aprovado, sem avisos;
- testes unitários: 716 aprovados;
- smoke legado: 20 aprovados e 17 testes autenticados ignorados porque
  as credenciais locais de teste não estavam configuradas;
- smoke Vite: 20 aprovados e 17 testes autenticados ignorados pelo
  mesmo motivo;
- matriz visual de cutover: 60 aprovados.

## APK de debug

O build Vite final foi sincronizado com o projeto Android e o APK foi
gerado pela tarefa Gradle `assembleDebug`.

Artefato local, deliberadamente ignorado pelo Git:

`android/app/build/outputs/apk/debug/app-debug.apk`

- tamanho: 35.415.845 bytes;
- SHA-256:
  `CB4F5C509B10FBA00B42F7C3C7DBB5BA3569299D0C22A3E387DE4B1DB4E69B99`.

O APK usa a assinatura automática de debug do Android e serve somente
para desenvolvimento e sideload. Ele não é um artefato de release para
o Google Play.

Como o repositório está dentro do OneDrive, as saídas do Gradle foram
redirecionadas temporariamente para `%TEMP%`, evitando os bloqueios de
cache já identificados. O APK resultante foi copiado para o caminho
local convencional acima; nenhuma configuração temporária de build
permanece na árvore versionada.

## Roteiro de validação física

Instale o APK de debug preservando os dados da instalação atual:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"
```

Se o Android responder `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, pare antes
de desinstalar: isso indica outra chave de debug e a desinstalação
apagaria os dados locais desse app de teste.

### 1. Estados aninhados e globais

1. Abra **Configurações** e depois a confirmação de feedback.
2. Pressione Voltar: somente a confirmação deve fechar.
3. Pressione Voltar novamente: Configurações deve fechar.
4. Abra o backup e, se houver um arquivo seguro para o teste, chegue à
   prévia de importação.
5. Pressione Voltar: somente a prévia deve fechar.
6. Pressione Voltar novamente: o backup deve fechar.

### 2. Modais e scanner

1. Abra o scanner de código de barras.
2. Pressione Voltar: o modal deve fechar e o indicador de câmera deve
   desaparecer.
3. Abra novamente para confirmar que a câmera foi liberada.
4. Repita com calendário, detalhe de alimento ou outro modal disponível:
   Voltar deve fechar somente o elemento superior.

### 3. Estados contextuais e telas secundárias

1. Abra um menu ou comece a editar um registro.
2. Pressione Voltar: o menu ou a edição deve fechar sem minimizar.
3. Abra uma tela secundária de Alimentos, como despensa ou modelos.
4. Pressione Voltar: deve retornar à tela principal da aba.

### 4. Adicionar, abas e histórico

1. Partindo do Diário, percorra **Alimentos → Semana → Métricas**.
2. Pressione Voltar sucessivamente.
3. A ordem esperada é **Métricas → Semana → Alimentos → Diário**.
4. Entre em **Adicionar** a partir de outra aba.
5. Pressione Voltar: deve retornar à aba de origem.

### 5. Data histórica

1. Na Semana, abra um dia diferente de hoje.
2. No Diário histórico, pressione Voltar: deve permanecer no Diário e
   mudar para hoje.
3. Pressione Voltar novamente: deve retornar à Semana.

### 6. Raiz

1. Vá ao Diário de hoje e feche todos os painéis.
2. Pressione Voltar: a Trofia deve ser minimizada.
3. Reabra-o pelos aplicativos recentes e confirme que o estado continua
   íntegro.

## Resultado físico

Primeira validação concluída no aparelho físico:

- estados aninhados e globais: aprovados;
- modais e scanner: aprovados;
- estados contextuais e telas secundárias: aprovados;
- tela Adicionar, abas e histórico: aprovados;
- data histórica e retorno contextual à Semana: aprovados;
- retomada pelos aplicativos recentes: aprovada.

Foi identificado um caso limítrofe na raiz: ao tocar explicitamente em
**Diário** depois de visitar outras abas, Voltar ainda percorria toda a
pilha anterior antes de minimizar. O ajuste de revalidação limpa a pilha
somente nesse toque explícito. A abertura contextual de um dia pela
Semana continua preservando a origem e a ordem Diário histórico →
Diário de hoje → Semana.

Pendente apenas a revalidação física desse ajuste final.
