# Capacitor Android — Subfatia 6A2: exportação nativa

## Escopo

Esta subfatia corrige o achado D15 sem alterar o mecanismo de exportação do
navegador/PWA. O caminho Android é isolado atrás do contrato assíncrono
`exportFile({ content, filename, mimeType, destination })`.

Foram migrados o backup completo e os backups por categoria disponíveis no
modal: Diário, últimos 7 dias, últimos 30 dias, Alimentos e Histórico de peso.

Permanecem deliberadamente fora do escopo:

- `exportCSV()` da despensa, que continua copiando dados para o clipboard;
- relatórios diário/semanal que hoje apenas mostram texto para cópia;
- pull-to-refresh;
- lógica de domínio, Firebase, Open Food Facts e scanner.

## Primeira validação física

O primeiro APK da subfatia confirmou que:

- a folha de compartilhamento abriu e permitiu enviar o JSON a outros apps;
- o aparelho testado não ofereceu uma opção clara para guardar o arquivo
  localmente;
- depois de transferido de volta ao telefone, o arquivo não apareceu de
  imediato em **Recentes**, exigindo procurar pelas pastas do seletor Android;
- a prévia da importação reconheceu corretamente categorias, campos e modos;
- a importação anunciou sucesso, mas a interface não refletiu os valores nem
  depois de reabrir o app;
- o botão Voltar minimizou o app na tela de backup porque aquele APK continha
  somente a branch do PR #75, sem a correção da Subfatia 6A1 do PR #74.

O número de registros mostrado na confirmação não foi anotado. Na próxima
validação ele deve ser registrado para distinguir uma falha de persistência de
uma falha apenas de reidratação da interface.

## Iteração corretiva

### Salvar no aparelho

No Android, cada exportação agora apresenta duas ações explícitas:

1. **Salvar no aparelho** abre o seletor nativo de criação de documento por
   `ACTION_CREATE_DOCUMENT`, com nome e tipo MIME sugeridos;
2. **Compartilhar** preserva o caminho já validado com
   `@capacitor/filesystem@8.1.2` em `Directory.Cache` e
   `@capacitor/share@8.0.1`.

O seletor de documento permite escolher Downloads, armazenamento local, Drive
ou outro provedor exposto pelo Android. Ele não exige permissão ampla de
armazenamento. Cancelar o seletor não produz confirmação falsa de sucesso.

A ponte `DocumentSaver` recebe conteúdo, nome e MIME por injeção no adaptador,
grava UTF-8 na URI fornecida pelo Android e devolve `{ cancelled, uri }`.

No navegador/PWA, `destination` não é exposto e o comportamento existente de
`data:`/`Blob` permanece inalterado.

### Reidratação após importação

Depois que todas as escritas da importação terminam, o modal aguarda a ponte
injetada `reloadNutritionData`, ligada ao `loadAll` já existente do
controlador. A confirmação informa o número de registros importados e só então
indica que os dados foram atualizados.

O modal também mostra **Atualizar dados** como fallback manual. Esse botão
recarrega de fato o aplicativo, sem implementar pull-to-refresh.

## Segunda validação física e causa raiz

O APK combinado confirmou:

- **Compartilhar** funciona corretamente;
- Voltar fecha a tela de backup corretamente;
- **Salvar no aparelho** abria o seletor, mas o Phrona encerrava depois da
  confirmação e deixava um arquivo vazio;
- **Atualizar dados** afirmava sucesso sem mudança observável;
- deslizar para baixo não mostrava atualização, conforme esperado, pois
  pull-to-refresh não foi implementado.

Com o aparelho conectado, o `logcat` registrou repetidamente
`TransactionTooLargeException`: parcel de 3.324.676 bytes, contendo duas cópias
do backup de 1.660.548 bytes no estado salvo pelo Capacitor. A ponte agora:

1. grava o UTF-8 em arquivo temporário no cache;
2. remove `content` do `PluginCall`;
3. abre `ACTION_CREATE_DOCUMENT`;
4. copia o arquivo temporário para a URI escolhida;
5. remove o temporário em sucesso, erro ou cancelamento.

Na importação, cada escrita confirmada agora elimina apenas os fallbacks locais
da mesma chave. Isso impede que um valor antigo e maior seja escolhido como
"mais rico" e sobrescreva novamente o valor restaurado. A confirmação mostra
somente a contagem real; não declara mais que a tela foi atualizada. O botão
**Atualizar dados** executa uma recarga completa e visível do aplicativo.

## Validação automatizada

- testes focados do adaptador, modal e composição: passaram;
- build Vite e verificação da allowlist: passaram;
- sincronização Capacitor: passou;
- compilação Android da ponte `DocumentSaver`: passou;
- preflight: passou sem avisos;
- testes unitários: 727 passaram;
- smoke legado: 20 passaram e 17 foram ignorados por ausência deliberada das
  credenciais locais de teste autenticado;
- smoke Vite: 20 passaram e 17 foram ignorados pelo mesmo motivo;
- matriz de cutover: 60 de 60 combinações passaram.

Na segunda iteração corretiva, a suíte completa voltou a passar integralmente:
preflight, 727 testes unitários, ambos os smokes e 60/60 da matriz de cutover.
A compilação Android isolada terminou com 131 tarefas executadas.

A primeira execução da matriz apresentou a mesma divergência de pixels isolada
já observada anteriormente em Métricas, português, mobile, tema escuro, depois
de 51 casos aprovados. O caso passou imediatamente quando repetido sozinho. A
tentativa integral seguinte foi interrompida por um bloqueio `EBUSY` do OneDrive
em um trace temporário. Redirecionada a saída do Playwright para a pasta
temporária do Windows, a matriz integral passou em 60 de 60 casos.

O build Android usa Java 21 do Android Studio e saída intermediária temporária,
evitando a disputa de arquivos do Gradle com o OneDrive. Nenhuma configuração
permanente da máquina ou do projeto é alterada.

## APK combinado para validação física

O APK final desta iteração será montado temporariamente com:

- PR #74 — Subfatia 6A1, incluindo a correção do botão Voltar;
- PR #75 — Subfatia 6A2 e esta iteração corretiva.

As branches e os históricos dos dois PRs permanecem separados. Caminho, tamanho
e SHA-256 do artefato gerado:

- caminho convencional:
  `android/app/build/outputs/apk/debug/app-debug.apk`;
- cópia identificada:
  `android/app/build/outputs/apk/debug/phrona-combined-pr74-pr75-debug.apk`;
- tamanho: 35.539.826 bytes;
- SHA-256:
  `73DAD1C7F0EF557ABA33F86603B98DDB10EF24194D05EAEF5A932913FFD98346`.

Na composição temporária, o preflight passou, 734 testes unitários passaram, o
build Vite foi verificado, os quatro plugins Capacitor foram sincronizados e o
`assembleDebug` terminou com 150 tarefas executadas. Nenhum commit de merge foi
criado.

## Roteiro de validação física

### 1. Salvar no aparelho

1. Abra **Backup e restauração**.
2. Exporte o backup completo e escolha **Salvar no aparelho**.
3. Confirme que o seletor Android abre com o nome
   `backup_completo_AAAA-MM-DD.json`.
4. Escolha **Downloads** e toque em **Salvar**.
5. Repita uma exportação e cancele o seletor; confirme que não aparece mensagem
   de sucesso.
6. Abra o seletor de importação e confira se o arquivo salvo aparece em
   **Recentes**. A organização de Recentes e dos provedores é controlada pelo
   seletor do Android, não pelo Phrona.

### 2. Compartilhar

1. Exporte uma categoria e escolha **Compartilhar**.
2. Confirme que a folha de compartilhamento abre.
3. Envie a um destino disponível e confirme que o anexo é um `.json`.

### 3. Fechar o ciclo de importação

Use preferencialmente uma conta de teste e revise o modo antes de confirmar.

1. Importe o backup salvo em Downloads.
2. Confirme que a prévia lista as categorias esperadas.
3. Anote o número de registros mostrado após a importação.
4. Confirme se os dados escolhidos aparecem automaticamente no app.
5. Se algum dado visual permanecer antigo, toque em **Atualizar dados** e
   confira novamente.
6. Feche e reabra o app para confirmar persistência.

### 4. Botão Voltar no APK combinado

1. Abra **Backup e restauração**.
2. Pressione Voltar.
3. Confirme que a tela de backup fecha e o app retorna à tela anterior, sem
   minimizar.

## Registro dos próximos resultados físicos

- modelo e versão Android:
- salvar em Downloads:
- arquivo em Recentes:
- cancelar sem falso sucesso:
- compartilhar:
- categorias importadas:
- número de registros informado:
- atualização automática:
- botão Atualizar dados:
- persistência após reabrir:
- botão Voltar:
- observações:
