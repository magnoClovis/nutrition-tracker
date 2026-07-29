# Renomeação completa: Phrona → Trofia

## Escopo

Esta etapa consolida **Trofia** como nome comercial definitivo antes do
processo de assinatura e publicação Android. A mudança é exclusivamente de
identidade: nenhum fluxo de domínio, Firebase, Open Food Facts ou scanner foi
alterado.

- Nome de exibição Android e Web: `Trofia`
- Application ID Android: `com.hermegas.trofia`
- Versão: `0.8.1-beta` (`versionCode 1`)
- Fonte visual: `icon-placeholder.png`, PNG RGB de 1254 × 1254 px
- SHA-256 da fonte: `E8EDFBC77C4DF0FAF93D954BDEA4BDBEEC217758839B57586F911A803B059D80`
- Cor de fundo extraída da borda da arte: `#093C2D`

O novo Application ID faz o Android tratar Trofia e Phrona como aplicativos
distintos. Assim, o APK desta etapa é instalado ao lado do Phrona anterior,
com armazenamento, sessão e permissões próprios. Ele não atualiza nem apaga a
instalação antiga.

## Assets regenerados

Todos os PNGs produzidos a partir da arte antiga foram removidos e recriados
diretamente da nova imagem-fonte:

- 15 ícones Android (`ic_launcher`, `ic_launcher_round` e
  `ic_launcher_foreground`) nas cinco densidades;
- 11 splash screens Android nas variantes base, retrato e paisagem;
- 4 assets Web: `trofia-icon-192.png`, `trofia-icon-512.png`,
  `trofia-favicon-32.png` e `trofia-apple-touch-icon.png`.

O ícone adaptativo mantém a estratégia provisória já validada: a arte completa
é usada no foreground e `#093C2D` no background. A splash mantém o mesmo
redimensionamento proporcional com recorte central (`cover`) usado na etapa
anterior.

Os quatro arquivos Web com prefixo `phrona-` foram removidos. O histórico Git
continua preservando permanentemente suas versões anteriores.

## Decisões deliberadas

- As classes CSS internas com prefixo `phrona-` continuam inalteradas. Elas
  compõem o contrato técnico já validado do scanner e não são visíveis.
- Os arquivos `nutrition-tracker.jsx` e
  `nutrition-tracker-controller.js` conservam seus nomes por compatibilidade
  arquitetural.
- O nome técnico do pacote npm (`nutrition-tracker`) também permanece
  inalterado; ele não é exibido ao usuário.

## Justificativa de câmera preparada

Estes textos ficam documentados para a futura apresentação contextual da
permissão, sem introduzir mudança no scanner nesta etapa:

- PT: “A Trofia usa a câmera somente para escanear códigos de barras de
  alimentos. Nenhuma foto ou vídeo é salvo.”
- EN: “Trofia uses the camera only to scan food barcodes. No photos or videos
  are saved.”
- ES: “Trofia usa la cámara únicamente para escanear códigos de barras de
  alimentos. No se guardan fotos ni vídeos.”

## Roteiro de validação física

1. Instalar o novo APK sem desinstalar o Phrona.
2. Confirmar que os dois aplicativos coexistem e que o novo aparece como
   **Trofia** no launcher e nas informações do aplicativo.
3. Confirmar que o ícone do Trofia é o broto/folha laranja sobre fundo verde
   escuro, sem a antiga letra “P”.
4. Abrir o Trofia e conferir a nova arte na splash.
5. Conferir o nome **Trofia** no login, header, configurações e rodapé.
6. Alternar idiomas PT/EN/ES e confirmar que a marca continua **Trofia**.
7. Fazer login e navegar pelas abas para confirmar que a identidade visual não
   afetou o comportamento.

## Validação automatizada

- preflight: aprovado sem avisos;
- testes unitários: 745 aprovados;
- smoke legado: 20 aprovados e 17 autenticados ignorados por ausência das
  credenciais descartáveis locais;
- smoke Vite: 20 aprovados e 17 autenticados ignorados pelo mesmo motivo;
- matriz visual completa de cutover: 60 de 60 cenários aprovados;
- build Vite: allowlist validada com 12 arquivos;
- `npx cap sync android`: quatro plugins encontrados;
- `:app:assembleDebug`: 158 tarefas, sendo 150 executadas e 8 atualizadas, com
  Java 21 e saídas temporárias fora do OneDrive.

O APK foi inspecionado com `aapt`:

- package: `com.hermegas.trofia`;
- application label: `Trofia`;
- activity: `com.hermegas.trofia.MainActivity`;
- `versionCode`: `1`;
- `versionName`: `0.8.1-beta`.

## APK de validação

- caminho:
  `android/app/build/outputs/apk/debug/trofia-identity-debug.apk`;
- tamanho: 33.293.686 bytes;
- SHA-256:
  `75F2B6AB2AEAEA5E9CD1D31AAEB75BABD5E894FBE7316D36405BF2674436E440`.
