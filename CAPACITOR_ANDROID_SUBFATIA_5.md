# Capacitor Android — Subfatia 5: scanner nativo

## Escopo

Esta subfatia introduz `@capacitor-mlkit/barcode-scanning@8.1.0`,
valida a captura em aparelho Android físico e integra o scanner ao
fluxo real de cadastro de alimentos.

A primeira etapa usou uma superfície deliberadamente diagnóstica:

- mostra somente o código e o formato detectados;
- não chama `lookupBarcode`;
- não consulta produtos;
- não grava nem altera dados;
- não substitui nem modifica o scanner web existente.

Depois da validação física, o botão diagnóstico foi removido. O botão
real **Usar câmera** agora seleciona o scanner nativo somente quando a
aplicação está executando como Android pelo Capacitor.

## Instalação do APK

1. Conecte o aparelho por USB e mantenha a depuração USB autorizada.
2. No PowerShell, confirme que o aparelho aparece como `device`:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
   ```

3. Instale ou atualize o APK de debug:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"
   ```

4. Espere a mensagem `Success` e abra **Phrona** no aparelho.

Se o Android responder `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, a versão
instalada foi assinada com outra chave de debug. Não desinstale antes
de decidir se os dados locais desse app de teste podem ser apagados.

## Roteiro manual

### 1. Superfície isolada

1. Confirme que o app continua abrindo normalmente.
2. Toque em **Testar scanner nativo**.
3. Confirme que o painel informa que não consulta produtos nem grava dados.
4. Confirme que o scanner web e o fluxo normal de alimentos não foram acionados.

### 2. Permissão negada

1. Toque em **Iniciar teste**.
2. Leia a justificativa apresentada pela Phrona.
3. Toque em **Continuar e permitir câmera**.
4. Na janela do Android, negue a câmera.
5. Confirme que o painel informa a negativa e oferece
   **Abrir configurações** e **Verificar novamente**.
6. Confirme que a câmera não ficou ativa.

### 3. Permissão concedida

1. Toque em **Abrir configurações**.
2. Na tela **Informações do app > Permissões > Câmera**, selecione
   **Permitir somente durante o uso do app**.
3. Volte para a Phrona.
4. Toque em **Verificar novamente**.
5. Confirme que a prévia da câmera aparece atrás da mira.

### 4. Leitura real

1. Aponte a câmera para um código EAN-13, EAN-8 ou UPC de um produto real.
2. Confirme que a leitura termina automaticamente.
3. Confira se o número exibido corresponde ao produto.
4. Confira se o formato exibido é coerente.
5. Confirme que nenhum produto foi pesquisado e nenhum dado foi salvo.

Resultado:

- Código lido:
- Formato:
- Produto usado:
- Observações:

### 5. Cancelamento

1. Inicie outra leitura.
2. Sem mostrar um código à câmera, toque em **Cancelar e liberar câmera**.
3. Confirme a mensagem de cancelamento.
4. Confirme que a câmera foi encerrada.
5. Inicie novamente e confirme que uma nova sessão abre normalmente.

### 6. Lanterna

1. Em ambiente pouco iluminado, inicie uma leitura.
2. Se o aparelho expuser lanterna para essa câmera, toque em
   **Ligar lanterna**.
3. Confirme que ela liga.
4. Toque em **Desligar lanterna** e confirme que ela desliga.
5. Cancele a leitura e confirme que a lanterna não permanece ligada.

Se o botão não aparecer, registre o modelo do aparelho; isso significa
que a biblioteca informou `available: false` para a câmera em uso.

### 7. Ciclo de vida

1. Inicie uma leitura e minimize a Phrona.
2. Confirme que o indicador de uso da câmera do Android desaparece.
3. Volte à Phrona.
4. Confirme que o painel mostra a leitura como cancelada.
5. Inicie novamente, feche o painel pelo fluxo disponível e confirme
   que a câmera não permanece ativa.

## Critério para avançar — concluído

A integração com `lookupBarcode` permaneceu bloqueada até a validação,
em aparelho físico, de:

- leitura correta de um código real;
- cancelamento e reinício;
- permissão negada e posteriormente concedida;
- lanterna, quando disponível;
- encerramento da câmera ao colocar o app em segundo plano.

## Iteração física 1

No primeiro teste em aparelho físico:

- o Android solicitou e recebeu a permissão de câmera;
- o plugin chegou ao estado de leitura;
- o indicador de uso da câmera ficou ativo;
- a biblioteca informou que a lanterna estava disponível;
- a prévia permaneceu encoberta por uma camada escura da WebView.

A superfície foi ajustada para seguir o padrão recomendado pelo plugin:
durante a leitura, todo o `body` fica invisível e somente o painel
diagnóstico volta a ser mostrado. O véu escuro ao redor da mira também
foi removido para tornar a segunda validação da prévia inequívoca.

## Iteração física 2

A segunda validação isolou o comportamento:

- mesmo com a prévia preta, códigos eram detectados corretamente;
- a lanterna física funcionava;
- no tema claro da Phrona, a prévia aparecia normalmente;
- no tema escuro, somente a imagem da prévia permanecia encoberta.

Uma tentativa de isolar o problema trocando temporariamente o tema para
claro confirmou que a camada opaca pertencia à WebView, mas não resolveu
a prévia: o fundo apenas mudou de escuro para claro.

## Iteração física 3

A inspeção dos estilos computados no WebView do aparelho localizou a
causa: a regra global de One UI
`body:has([data-one-ui-root][data-theme="dark"])` tem especificidade maior
que a regra inicial do scanner e mantinha `background-color` e
`background-image` opacos.

A correção definitiva usa um seletor limitado às classes ativas no
`html` e no `body`, com especificidade suficiente para tornar somente
essas duas propriedades transparentes durante a leitura. A câmera
apareceu imediatamente no aparelho após aplicar exatamente essas
propriedades, sem trocar o tema e sem aguardar temporizadores ou ciclos
de pintura.

## Integração no fluxo real

A composição Vite instala uma fachada runtime com o mesmo
`createBarcodeScanner(dependencies)` consumido pelo controller:

- navegador e PWA recebem diretamente o controller criado por
  `barcode-scanner.js`, sem alterar seu código ou comportamento;
- Capacitor Android recebe o serviço ML Kit com EAN-13, EAN-8, UPC-A,
  UPC-E e Code 128;
- o código capturado é entregue a `setInput(code)` e ao
  `lookupBarcode(code)` já injetado pelo controller;
- o serviço nativo encerra a câmera e remove os listeners antes de
  entregar o resultado ao lookup;
- um identificador compartilhado de lançamento descarta concessões de
  permissão e resultados tardios depois de cancelamento;
- cancelamento, fechamento do modal, desmontagem e ida ao background
  executam o mesmo cleanup idempotente;
- a lanterna aparece no modal real somente quando o plugin informa que
  ela está disponível.

`lookupBarcode`, `fetchBarcodeProduct`, a integração Open Food Facts e
`barcode-scanner.js` permanecem inalterados.

## Iteração física 4 — fluxo real

O APK integrado foi validado no fluxo real de alimentos:

- a câmera abriu e exibiu a prévia corretamente;
- a leitura de código ocorreu sem falhas;
- o produto foi entregue ao fluxo existente sem regressões;
- o tema do app permaneceu estável durante e depois da leitura.

A validação revelou somente dois defeitos visuais pequenos. O elemento
HTML `<video>`, que no modo nativo serve apenas como âncora para localizar
o modal, era exibido vazio e recebia do WebView/One UI um indicador de
reprodução. Além disso, o documento continuava rolável atrás da WebView
transparente, o que permitia uma captura de tela longa e repetida.

A correção visual mantém o `<video>` montado, mas invisível no modo
nativo, substitui sua borda por uma moldura CSS independente, bloqueia
scroll e overscroll durante a leitura e reduz o painel ativo aos
controles de fechar, parar câmera e lanterna. Entrada manual, busca e
mensagem auxiliar reaparecem integralmente assim que a câmera é
encerrada.

## Iteração física 5 — posicionamento do painel

A leitura permaneceu correta e a rolagem deixou de ocorrer. Porém, o
painel de controles ficou fora do viewport e a moldura decorativa foi
deslocada para baixo. A causa foi a animação `softIn` mantida no
`data-app-main`: mesmo terminando em `translateY(0)`, a propriedade
`transform` cria um bloco de posicionamento para descendentes `fixed`.

A moldura foi removida porque não limita a área real reconhecida pelo ML
Kit. Durante a sessão nativa, a animação e o transform do ancestral são
neutralizados para que o painel seja posicionado contra o viewport. O
painel agora usa `var(--surface)`, `var(--text)` e `var(--border2)`,
herdando automaticamente o tema claro ou escuro ativo.

## Iteração física 6 — portal de viewport

A prévia e a leitura continuaram corretas, mas o painel permaneceu fora
da área visível. Isso demonstrou que neutralizar propriedades isoladas do
contêiner existente não é uma base confiável no WebView do aparelho.

A solução deixa de posicionar o painel dentro da árvore rolável de
**Adicionar**. A composição Vite injeta explicitamente uma porta React
que renderiza o mesmo modal controlado diretamente em `document.body`
somente enquanto a sessão nativa está ativa. Assim:

- os mesmos callbacks React continuam controlando fechar, parar câmera e
  lanterna;
- o navegador/PWA e o carregador legado continuam usando o modal inline;
- o overlay nativo não depende de animação, transform, altura ou overflow
  dos contêineres da tela;
- os tokens globais `--surface-block`, `--surface-block-alt` e
  `--text-primary` preservam o tema claro ou escuro.

## Validação automatizada da integração

A integração cobre por teste:

- delegação integral ao scanner web fora do Android nativo;
- permissão já concedida, solicitação de permissão e negativa;
- cancelamento enquanto a solicitação de permissão ainda está aberta;
- entrega do código ao input e ao lookup existente;
- descarte de resultados tardios e parada antes do callback;
- cleanup ao colocar o app em segundo plano;
- disponibilidade, acionamento e estado da lanterna;
- especificidade da transparência da WebView no tema escuro.

## Revalidação visual final pendente

O fluxo funcional integrado já foi validado em aparelho físico. Após a
correção dos dois defeitos visuais, resta instalar o novo APK e confirmar
no fluxo **Alimentos > Ler código de barras > Usar câmera**:

1. painel compacto visível no rodapé sem precisar rolar;
2. painel claro no tema claro e escuro no tema escuro;
3. ausência do indicador de reprodução, da moldura e da rolagem;
4. prévia, leitura, cancelamento e lanterna preservados;
5. entrada manual novamente disponível depois de parar a câmera.

## Resultado desta implementação

- preflight: aprovado, sem avisos;
- testes unitários: 707 aprovados;
- smoke legado: 20 aprovados e 17 autenticados ignorados por ausência
  de credenciais locais;
- smoke Vite: 20 aprovados e 17 autenticados ignorados pelo mesmo
  motivo;
- matriz visual legado/Vite: 60 aprovados;
- sincronização Capacitor: concluída com o plugin
  `@capacitor-mlkit/barcode-scanning@8.1.0`;
- `:app:assembleDebug`: concluído com sucesso usando saídas Gradle
  temporárias fora do OneDrive;
- APK copiado para
  `android/app/build/outputs/apk/debug/app-debug.apk`;
- tamanho do APK: 35.399.339 bytes;
- SHA-256:
  `552CCC081410AEE160EB7A1058A64FD13E67E063F2DE1F4FA30E15D6C678FF89`.

Nenhum comando `adb` foi executado e o APK não foi instalado durante
esta sessão.
