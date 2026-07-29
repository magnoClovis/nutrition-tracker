# Capacitor Android — Subfatia 6A2: exportação nativa

## Escopo

Esta subfatia corrige o achado D15: os downloads de backup baseados em
`data:`/`Blob` não produziam arquivo nem feedback na WebView Android.

A correção introduz uma fronteira assíncrona e injetável:

- navegador e PWA preservam o mecanismo existente de `data:` URL, com o mesmo
  fallback para `Blob`;
- Capacitor Android grava o conteúdo UTF-8 em `Directory.Cache` com
  `@capacitor/filesystem@8.1.2`;
- em seguida, obtém a URI do arquivo e abre o seletor de compartilhamento do
  Android com `@capacitor/share@8.0.1`;
- mensagens de sucesso só são emitidas depois que a exportação assíncrona
  termina; erros de escrita ou compartilhamento seguem o tratamento de erro
  existente.

Foram migrados o backup completo e os backups por categoria disponíveis no
modal: Diário, últimos 7 dias, últimos 30 dias, Alimentos e Histórico de peso.

Permanecem deliberadamente fora do escopo:

- `exportCSV()` da despensa, que continua copiando dados para o clipboard;
- relatórios diário/semanal em JSON, CSV, HTML e TXT que hoje apenas mostram
  texto para cópia;
- lógica de domínio, Firebase, Open Food Facts e scanner.

## Arquitetura

O contrato compartilhado é:

```js
await exportFile({ content, filename, mimeType });
```

O runtime usa `Capacitor.isNativePlatform()` e
`Capacitor.getPlatform() === "android"` para escolher o implementador.
As dependências nativas e os serviços do navegador são fornecidos
explicitamente às fábricas do adaptador, permitindo testar seleção, ordem e
falhas sem um aparelho conectado.

No Android, a ordem observável é:

1. `Filesystem.writeFile`, com `Directory.Cache` e `Encoding.UTF8`;
2. `Filesystem.getUri`;
3. `Share.share`, passando a URI em `files`.

O arquivo em cache é temporário e pode ser removido pelo sistema. A cópia
durável é aquela que o usuário salva em Arquivos, Drive, e-mail ou outro destino
selecionado no compartilhamento.

## Validação automatizada

- preflight: passou sem avisos;
- testes unitários: 719 passaram;
- smoke legado: 20 passaram e 17 foram ignorados por ausência deliberada das
  credenciais locais de teste autenticado;
- smoke Vite: 20 passaram e 17 foram ignorados pelo mesmo motivo;
- matriz de cutover: 60 de 60 combinações passaram;
- build Android: `assembleDebug` passou com 131 tarefas executadas.

A primeira execução da matriz apresentou uma divergência de pixels isolada em
Métricas, português, mobile, tema escuro, depois de 51 casos aprovados. A
combinação passou imediatamente quando repetida sozinha e a segunda execução
integral passou em 60 de 60 casos. Nenhuma alteração visual foi necessária.

## APK de debug

- caminho: `android/app/build/outputs/apk/debug/app-debug.apk`;
- tamanho: 35.535.224 bytes;
- SHA-256:
  `89531FA35308852B571CEF9695C21A128351CF413F9E3A801E7CC7463E1EB041`.

Como o repositório fica sob o OneDrive, as saídas intermediárias do Gradle foram
redirecionadas temporariamente para fora da árvore de trabalho e somente o APK
final foi copiado para o caminho convencional. O build usou o Java 21 incluído
no Android Studio apenas por variável de ambiente do processo; nenhuma
configuração permanente da máquina ou do projeto foi alterada.

## Roteiro de validação física

### 1. Instalar ou atualizar

1. Na raiz do repositório, conecte o aparelho com depuração USB autorizada.
2. Confirme que ele aparece como `device`:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
   ```

3. Instale ou atualize o APK:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"
   ```

4. Espere `Success` e abra **Phrona**.

Se aparecer `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, a instalação existente usa
outra chave de debug. Não desinstale antes de decidir se os dados locais de
teste podem ser apagados.

### 2. Backup completo

1. Entre no fluxo de backup e toque em **Exportar dados**.
2. Confirme que o seletor de compartilhamento do Android abre.
3. Confirme que aparecem destinos compatíveis instalados no aparelho, por
   exemplo Arquivos, Google Drive e e-mail.
4. Escolha **Arquivos** ou equivalente e salve
   `backup_completo_AAAA-MM-DD.json` em uma pasta fácil de localizar.
5. Abra o arquivo em um visualizador de texto e confirme que:
   - ele não está vazio;
   - caracteres acentuados estão corretos;
   - o conteúdo é JSON legível.

### 3. Backups por categoria

Repita o teste pelo menos para:

1. **Diário — hoje**;
2. **Últimos 7 dias**;
3. **Último mês (30 dias)**;
4. **Alimentos**;
5. **Histórico de peso**.

Para cada opção, confirme:

- o compartilhamento abre;
- o nome do arquivo corresponde à categoria e à data;
- é possível salvar ou enviar o arquivo;
- não aparece mensagem de sucesso antes da criação/abertura do
  compartilhamento;
- se ocorrer uma falha real, aparece uma mensagem de erro e não uma confirmação
  falsa.

### 4. Destinos de compartilhamento

Use o backup completo para validar, conforme os aplicativos disponíveis:

1. salvar pelo app Arquivos;
2. enviar ao Google Drive;
3. anexar a um rascunho de e-mail.

Confirme que o destino recebe um arquivo `.json`, não apenas texto ou um link.
Não é necessário enviar o e-mail; o rascunho com o anexo é suficiente.

### 5. Fechar o ciclo: exportação e importação

Este teste escreve dados reais. Use preferencialmente uma conta de teste e
revise cuidadosamente o modo de importação antes de confirmar.

1. Guarde um backup completo pelo app Arquivos.
2. Volte ao Phrona e abra a importação.
3. Selecione exatamente o arquivo recém-exportado.
4. Confirme que a prévia reconhece o backup e lista as categorias esperadas.
5. Para evitar sobrescrever dados, use o modo não destrutivo disponível ou
   selecione somente uma categoria segura de teste.
6. Confirme a importação.
7. Verifique que o fluxo termina sem erro e que os dados escolhidos continuam
   coerentes.

Resultado esperado: o ciclo `exportar → salvar → selecionar → pré-visualizar →
importar` funciona integralmente no aparelho Android.

## Registro dos resultados físicos

- modelo e versão Android:
- backup completo:
- categorias:
- Arquivos:
- Google Drive:
- e-mail:
- importação:
- observações:
