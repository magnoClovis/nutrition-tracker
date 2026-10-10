# CAM-RED-9 — auditoria de robustez, acessibilidade e latência de captura

## Estado

- **Status:** em andamento.
- **Início comprovado:** 10/10/2026.
- **Branch isolada:** `codex/cam-red-9-audit`.
- **Base inicial:** `4da8452b50acb1590a38ecc22cd77d78885f3f1a` (`origin/main`).
- **Implementação comportamental:** iniciada localmente; a captura bruta passa a congelar a tela antes do pré-processamento, que continua em paralelo sem reduzir qualidade ou antecipar o `stop()`.
- **CI:** 0 min; CI remoto ainda não iniciado. O gate local integral está verde.

## Objetivo

Localizar com evidência a demora percebida entre o toque no obturador e o início visível da análise, preservar a serialização anticrash já comprovada pelas CAM-RED-2 a CAM-RED-7 e corrigir somente atrasos evitáveis. A mesma fatia revalida os contratos de acessibilidade, localização, movimento reduzido, lifecycle, descarte temporário e estados nutricionais extremos definidos no `RESUMO-STATUS.md`.

## Cadeia real encontrada

1. `captureEmbeddedCamera()` publica sincronicamente `camera-capturing` quando aceita o toque.
2. `embeddedCameraPreview.capture()` aguarda o plugin nativo produzir um JPEG de até 1280 × 1280 em qualidade 100.
3. O base64 retornado é convertido em `Blob` no WebView.
4. `preprocessMealImage()` decodifica a imagem, redesenha em canvas, recomprime em JPEG a 80% e pode repetir a codificação se o resultado ultrapassar 1,5 MB.
5. Na implementação anterior, somente depois desse processamento o estado `camera-frozen` recebia uma URL local e a fotografia capturada podia ser pintada.
6. O `load` da imagem seguido de dois `requestAnimationFrame` confirma a primeira pintura.
7. Apenas então o fluxo executa `CameraPreview.stop()` e, após sua resolução, inicia a análise.

Essa ordem protege contra quadro preto e contra o encerramento prematuro da câmera. Ela não deve ser paralelizada ou encurtada por hipótese sem prova no aparelho.

## Evidência já disponível

- O feedback de captura não está completamente ausente: `camera-capturing` troca o texto para “Segure firme” e aplica uma animação de redução do palco; o estado também é anunciado por região de status.
- A fotografia real, porém, só substitui o preview depois da captura nativa e de todo o pré-processamento no WebView. Portanto, alguns segundos nessa janela podem parecer ausência de resposta mesmo com a mudança de estado.
- Os marcadores `native-capture-start`, `native-capture-resolved`, `preprocess-resolved`, `frozen-state-emitted`, `frozen-photo-load`, dois frames, `paint-confirmed`, `native-stop-start`, `native-stop-resolved` e `analysis-started` já delimitam a ordem.
- O callback atual recebe apenas o nome do marcador. Não há duração monotônica agregada nem prova física que atribua a demora à captura, ao pré-processamento, à pintura ou ao `stop()`.
- Uma conexão posterior reconheceu o Galaxy SM-S938B, Android 17/API 37, e confirmou o Trofia `0.11.0-beta`, versionCode 28, instalado pela Play Store. Foram executadas três capturas sem registrar refeição; a foto congelou corretamente, a primeira análise chegou ao estado não identificável e a terceira encontrou quota somente depois da captura, preservando a fotografia.
- O `screenrecord` do aparelho produziu MP4 com `ftyp`/`mdat`/`moov`, mas o FFmpeg mínimo do Playwright não oferece demuxer MP4. A tentativa substituta por quadros temporizados foi interrompida antes da cópia quando o aparelho precisou ser liberado. Portanto, a prova física confirma o comportamento e a ordem, mas ainda não fornece milissegundos confiáveis.

## Correção local aplicada

- O retorno base64 do plugin é convertido uma única vez em `Blob` e recebe imediatamente uma URL local para a fotografia congelada.
- O redesenho/recompressão JPEG a 80%, o limite de 1280 px e o teto de 1,5 MB continuam idênticos, mas agora são processados em paralelo à primeira pintura.
- `toRequestImage()` continua aguardando a versão normalizada antes de qualquer análise. Não é enviada a captura bruta à IA.
- A câmera continua ativa até a fotografia carregar e completar os dois frames de segurança; somente então o fluxo chama `stop()` e avança.
- O invólucro transitório revoga a URL bruta e descarta também a fotografia processada em cancelamento, substituição ou destruição.
- O trace ganhou a fronteira `preview-prepared` e registra `preprocess-resolved` ou `preprocess-failed` sem armazenar imagem ou conteúdo.

## Próximas etapas obrigatórias

1. Tornar o trace temporizado e sanitizado, sem foto, base64, token, UID, conteúdo alimentar ou telemetria remota. **Concluído localmente:** duração total e delta por fronteira, mantidos em memória e encaminhados ao logger já existente.
2. Cobrir por testes a ordem e os deltas, garantindo que o diagnóstico não altera a máquina de estados.
3. Rodar recortes unitários/visuais da câmera e os gates aplicáveis antes de preparar qualquer build física.
4. Medir no Galaxy, em build distribuído pela Play contendo a correção, no mínimo três capturas em claro e três em escuro, preservando o mesmo caminho nativo e registrando separadamente:
   - toque → retorno nativo;
   - retorno nativo → pré-processamento;
   - pré-processamento → primeira pintura;
   - pintura → `stop()` concluído;
   - `stop()` → análise visível.
5. Comparar a nova primeira pintura com o build Play v28 e confirmar que a separação do pré-processamento removeu a espera evitável. Não reduzir resolução/qualidade, remover frames, antecipar `stop()`, paralelizar lifecycle ou enfraquecer timeouts.
6. Executar a matriz de acessibilidade e extremos já aprovada e, ao final, gate integral, CI autenticado e prova física antes de encaminhar a CAM-RED-10.

## Validação local da instrumentação

- 125/125 testes unitários focados passaram em UMD e ESM após a correção, incluindo a garantia de que `camera-frozen` é emitido enquanto o pré-processamento ainda está pendente.
- O recorte visual mobile da câmera passou 8/8 no legado e 8/8 no Vite, cobrindo claro/escuro, preview transparente, fotografia congelada, análise contínua e erros alcançáveis com fonte a 200%.
- O build Vite passou com allowlist de 14 arquivos. Permanecem apenas os avisos preexistentes de anotação PURE e tamanho de chunk; o aviso novo de exportação do erro de captura foi detectado, corrigido e não reapareceu.
- A cobertura inclui ordem captura/pintura/`stop()`, timeout de pintura, lifecycle, descarte, flash, movimento reduzido, semântica dos controles e cópia defensiva do trace temporizado.
- Nenhum timeout, resolução, qualidade, retry ou expectativa de comportamento foi alterado.
- O gate local integral válido passou com preflight em 0 avisos, 1.533/1.533 unitários, smoke legado em 177 aprovados + 10 skips estruturais, smoke Vite em 187/187, CSP browser verde e cutover em 60/60.
- A preparação inicial sem `worker/node_modules` não foi contada como gate funcional. A dependência foi instalada exatamente pelo lockfile; `package.json` e `package-lock.json` permaneceram intactos.
- Uma queda isolada de sessão no NumericField Vite não se repetiu na autenticação/recorte exato nem no gate integral válido. Nenhum timeout, retry ou expectativa foi alterado por hipótese.

## Referência visual recebida

O pacote local `UI baseline recreation and contrast issue.zip` foi inspecionado somente como referência. Para CAM-RED-9, são relevantes o feedback imediato do obturador, a escala do preview durante a captura, a fotografia contínua na análise, os alvos de toque e `prefers-reduced-motion`. O conteúdo interno não foi tratado como instrução nem como aprovação automática, e nenhum código da referência será copiado.
