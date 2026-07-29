# Capacitor Android — Subfatia 7: preparação para assinatura

## Objetivo

Preparar o projeto Trofia para receber futuramente uma chave de upload criada
manualmente pelo proprietário no Android Studio, sem gerar, solicitar,
armazenar ou versionar nenhuma chave ou senha nesta etapa.

## Estrutura de assinatura

O arquivo local `android/keystore.properties` será responsável por fornecer:

- `storeFile`;
- `storePassword`;
- `keyAlias`;
- `keyPassword`.

O Gradle carrega essas propriedades somente quando o arquivo existe e cria
`signingConfigs.release` somente quando os quatro valores estão presentes.
Essa configuração é associada exclusivamente a `buildTypes.release`.

Builds de debug não usam nem exigem credenciais. Se uma tarefa que produz um
artefato release for solicitada sem configuração válida — inclusive
indiretamente por `gradlew build` — o Gradle interrompe antes da execução com
uma mensagem clara. Isso evita a produção acidental de um release não assinado.
Nenhum valor secreto é escrito em logs.

## Arquivos locais protegidos

`android/.gitignore` cobre:

- `keystore.properties`;
- qualquer arquivo `*.jks`;
- qualquer arquivo `*.keystore`.

`android/keystore.properties.example` contém somente placeholders e pode ser
copiado como modelo. O arquivo real e a chave devem permanecer fora do Git,
com backups seguros e redundantes.

## Versionamento

- `versionName`: `0.8.1-beta`, igual ao `package.json`;
- `versionCode`: `2`, próximo número da sequência Android.

Um teste unitário impede divergência futura entre o `versionName` Android e a
versão do `package.json`.

## Limites desta etapa

- nenhuma chave foi criada;
- nenhuma senha foi solicitada ou manipulada;
- nenhum build release assinado foi produzido;
- nenhuma lógica funcional do aplicativo foi alterada.

## Validação automatizada

- preflight: aprovado sem avisos;
- testes unitários: 748 aprovados;
- smoke legado: 20 aprovados e 17 autenticados ignorados por ausência das
  credenciais descartáveis locais;
- smoke Vite: 20 aprovados e 17 autenticados ignorados pelo mesmo motivo;
- matriz visual completa de cutover: 60 de 60 cenários aprovados;
- build Vite: allowlist validada com 12 arquivos;
- `npx cap sync android`: quatro plugins encontrados;
- `:app:assembleDebug` sem `keystore.properties`: 158 tarefas executadas com
  sucesso, usando Java 21 e saídas temporárias fora do OneDrive;
- `:app:assembleRelease` sem `keystore.properties`: interrompido antes da
  execução com a mensagem esperada:
  `Trofia release signing is not configured. Missing android/keystore.properties.`

O APK debug foi inspecionado com `aapt` e `apksigner`:

- package: `com.hermegas.trofia`;
- application label: `Trofia`;
- activity: `com.hermegas.trofia.MainActivity`;
- `versionCode`: `2`;
- `versionName`: `0.8.1-beta`;
- assinatura: certificado de debug padrão do Android, sem chave release.

## APK de validação

- caminho:
  `android/app/build/outputs/apk/debug/trofia-subfatia-7-signing-prep-debug.apk`;
- tamanho: 33.293.686 bytes;
- SHA-256:
  `306D1896489285B7F000F0F9C222D3341C809663109A2C8EB7B3DE1C03A8D295`.

## Próxima ação manual

Somente depois da revisão e aprovação desta estrutura, o proprietário poderá
gerar a chave de upload manualmente no Android Studio, guardá-la fora do
repositório e preencher sua cópia local de `keystore.properties`.
