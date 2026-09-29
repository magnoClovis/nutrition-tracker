# Trofia

Aplicativo de acompanhamento nutricional com cliente React/Vite para web e Android, integração Firebase e Worker de IA. Este README orienta a navegação do repositório; os contratos atuais, o planejamento e a história técnica ficam em [`documentation/`](documentation/README.md).

## Estrutura

| Pasta | Responsabilidade |
|---|---|
| [`src/`](src/README.md) | Cliente web/Android, UI e módulos em migração. |
| [`public/`](public/README.md) | Destino planejado para ativos estáticos publicados; ainda sem ativos de produção. |
| [`firebase/`](firebase/README.md) | Destino planejado para rules e índices; arquivos ativos ainda estão na raiz. |
| [`functions/`](functions/README.md) | Functions Firebase e seus testes. |
| [`worker/`](worker/README.md) | Worker Cloudflare de IA e seus testes. |
| [`android/`](android/README.md) | Projeto nativo Capacitor/Gradle. |
| [`scripts/`](scripts/README.md) | Verificações, build e utilitários operacionais. |
| [`tests/`](tests/README.md) | Testes unitários, smoke autenticado, fixtures e cutover. |
| [`documentation/`](documentation/README.md) | Estado atual, políticas, operação, roadmap e histórico. |

Entradas e configurações exigidas por ferramentas continuam na raiz. Há também módulos JavaScript e CSS legados na raiz; sua migração será feita por fatias ORG após a matriz de dependências. Este README não declara que essa migração já aconteceu.

## Validação local

Com as dependências locais instaladas, use `npm run preflight` para a checagem rápida, `npm run test:unit` para unitários e `npm run build:vite` para verificar o artefato web. `npm test` executa também os smokes e o cutover; partes autenticadas exigem a configuração descartável descrita em [`tests/smoke/README.md`](tests/smoke/README.md). Nunca versionar credenciais, tokens, keystores, `google-services.json` ou dados de usuários.

## Convenção de inventário por pasta

Cada diretório de destino possui um README com propósito e limites. Ao mover um arquivo em uma fatia ORG, atualizar no mesmo PR a tabela de inventário do destino com **arquivo, função, origem, consumidores e contrato de validação**. Arquivos já existentes não devem receber descrições presumidas antes da auditoria ORG-0. O plano aprovado está em [`documentation/estado-atual/ORG_PLANO_REORGANIZACAO_REPOSITORIO.md`](documentation/estado-atual/ORG_PLANO_REORGANIZACAO_REPOSITORIO.md).
