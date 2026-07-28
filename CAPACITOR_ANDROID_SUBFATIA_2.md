# Capacitor Android — Subfatia 2

Data da validação: 28 de julho de 2026.

## Escopo

Esta subfatia formaliza o primeiro wrapper Android de debug do Phrona,
baseado no projeto Capacitor introduzido pelo PR #69. Ela não inclui
validação em aparelho físico, alterações no scanner de código de barras,
permissões de câmera, ícones definitivos, splash screen definitivo ou
assinatura de release.

## Validação manual no Android Studio

Ambiente informado:

- emulador Pixel 8;
- Android API 36.

Resultados:

- o projeto compilou e o aplicativo abriu corretamente;
- o splash screen placeholder do Capacitor apareceu, conforme esperado
  nesta etapa;
- a tela de login carregou com o tema escuro e os idiomas português,
  inglês e espanhol;
- o login por e-mail e senha via Firebase REST funcionou;
- dados reais de proteína, calorias e água foram carregados após o login;
- as abas Diário, Alimentos, Semana e Métricas ficaram visíveis e
  navegáveis.

## APK de debug

O conteúdo web foi reconstruído com `npm.cmd run build:vite`, sincronizado
com `npx.cmd cap sync android` e o APK foi produzido pela tarefa Gradle
`assembleDebug`.

Artefato local, deliberadamente ignorado pelo Git:

`android/app/build/outputs/apk/debug/app-debug.apk`

- tamanho: 5.452.557 bytes;
- SHA-256:
  `C28C173A093035228643C161ECB30D225B5C6EDB4F1B776105C6C5E0031614AD`.

O APK usa a assinatura automática de debug do Android e serve apenas para
desenvolvimento e sideload. Ele não é um artefato de publicação no Google
Play.

## Avaliação de configuração

Nenhum ajuste de configuração do aplicativo foi identificado como
necessário. A compilação, a inicialização, a autenticação Firebase, o
carregamento de dados reais e a navegação funcionaram com:

- application ID `com.hermegas.phrona`;
- nome de exibição `Phrona`;
- `compileSdkVersion` e `targetSdkVersion` 36;
- `minSdkVersion` 24;
- `versionCode` 1;
- `versionName` `0.8.1-beta`;
- `webDir` `dist`.

Durante a geração pela linha de comando, o Android Studio aberto em uma
pasta sincronizada pelo OneDrive manteve caches Gradle bloqueados. O build
foi concluído redirecionando temporariamente apenas os diretórios de saída
do Gradle para a pasta temporária do Windows. Isso é uma condição local do
ambiente de build, não uma deficiência da configuração Android, e não
resultou em mudança versionada.

Os avisos de `flatDir`, operações Java não verificadas, anotação
`/*#__PURE__*/` e tamanho do bundle Vite não impediram o build e já existiam
antes desta formalização.

## Regressão web

Resultados da suíte existente:

- preflight: aprovado, sem avisos;
- testes unitários: 689 aprovados;
- smoke legado: 20 aprovados e 17 autenticados ignorados por ausência de
  credenciais locais de teste;
- smoke Vite: 20 aprovados e 17 autenticados ignorados pelo mesmo motivo;
- matriz visual de cutover: 60 aprovados.

A autenticação real no wrapper Android foi coberta pela validação manual
descrita acima. Nenhuma regressão observável da aplicação web foi
identificada.
