# Capacitor Android — Subfatia 5: spike do scanner nativo

## Escopo

Este spike valida `@capacitor-mlkit/barcode-scanning@8.1.0` em um
aparelho Android físico antes da integração com o fluxo de produto.

A superfície é deliberadamente diagnóstica:

- mostra somente o código e o formato detectados;
- não chama `lookupBarcode`;
- não consulta produtos;
- não grava nem altera dados;
- não substitui nem modifica o scanner web existente.

O botão **Testar scanner nativo** aparece somente quando a aplicação
está executando como aplicativo Android nativo pelo Capacitor.

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

## Critério para avançar

A integração com `lookupBarcode` permanece bloqueada até a validação,
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
