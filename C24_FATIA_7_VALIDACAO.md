# C24 — Fatia 7: validação e liberação controlada

Esta fatia separa os gates técnicos que não dependem do conteúdo de fotos reais da avaliação de qualidade do reconhecimento. A funcionalidade permanece fora da navegação de produção até todos os gates abaixo serem concluídos.

## Concluído sem fotos reais

- Worker multimodal publicado em produção em 13 de agosto de 2026:
  - endpoint: `POST https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/image-meal`;
  - versão Cloudflare: `c4c25767-633f-4045-b42b-01123868a335`;
  - autenticação Firebase, CORS e limites continuam fail-closed;
  - nenhuma foto foi enviada durante o smoke de implantação.
- Política trilíngue publicada e conferida.
- Cloud Billing ativado pelo responsável.
- Data Safety Form atualizado pelo responsável no Google Play Console.
- Build Android de debug concluído com `@capacitor/camera@8.2.1`; APK gerado localmente sem exposição na navegação de produção.

## Matriz Android física sem avaliação de conteúdo

Executar em APK de teste antes de avaliar a qualidade nutricional:

| Área | Cenários | Resultado |
|---|---|---|
| Permissão | primeira solicitação; negar; tentar novamente; abrir configurações; conceder | Aguardando aparelho conectado |
| Câmera | abrir; cancelar; voltar; colocar app em segundo plano; retornar | Aguardando aparelho conectado |
| Galeria | escolher; cancelar seletor; selecionar arquivo inválido | Aguardando aparelho conectado |
| Prévia | exibir JPEG processado; trocar foto; descartar; confirmar liberação do indicador/cópia temporária | Aguardando aparelho conectado |
| Navegação | vazio → captura → prévia → processamento simulado → revisão; voltar em cada estado | Aguardando aparelho conectado |
| Erros simulados | permissão, foto inválida, nada identificável, cota, sessão, serviço e resposta inválida | Aguardando aparelho conectado |
| Persistência simulada | falha mantém tela; sucesso fecha e restaura aba/data/rolagem | Aguardando aparelho conectado |

## Gates que exigem fotos reais e permanecem abertos

1. Comparar `mediaResolution: HIGH` e `MEDIUM` com o mesmo conjunto de imagens.
2. Validar identificação de prato/alimentos, quantidades, nutrientes, confiança e suposições.
3. Fixar a resolução final somente depois de comparar qualidade, latência e consumo.
4. Só então ligar a entrada da tela C24 à navegação destinada aos testers.

Não usar rostos, documentos, telas, localização visível ou outros dados pessoais no conjunto de validação.
