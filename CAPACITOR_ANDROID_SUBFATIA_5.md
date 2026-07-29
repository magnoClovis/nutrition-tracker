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

## Validação física final pendente

O spike e sua superfície foram validados anteriormente no aparelho
físico. A integração final foi produzida sem aparelho conectado, por
restrição explícita desta sessão. Antes do merge, ainda é necessário
instalar o novo APK e confirmar no fluxo **Alimentos > Ler código de
barras > Usar câmera**:

1. prévia visível nos temas claro e escuro;
2. leitura de um produto e retorno automático do resultado do Open Food
   Facts;
3. cancelamento e fechamento do modal liberando a câmera;
4. permissão negada mantendo a digitação manual disponível;
5. lanterna ligando e desligando quando oferecida.

## Resultado desta implementação

- preflight: aprovado, sem avisos;
- testes unitários: 704 aprovados;
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
- tamanho do APK: 35.395.224 bytes;
- SHA-256:
  `3E439552F6CB76B68EDD8147F3AF0E69B70BA0685833FBBCBA2FD763A0F0EB46`.

Nenhum comando `adb` foi executado e o APK não foi instalado durante
esta sessão.
