# Configuracao de ambientes

Esta pasta guarda manifestos versionados que descrevem a identidade e os destinos de cada ambiente do Trofia. Ela nao armazena senhas, tokens, chaves privadas nem dados de usuarios. Cada manifesto deve ser validado antes de ser usado por um build ou deploy; campos vazios significam que o ambiente ainda nao esta pronto.

## Arquivos

- `staging-environment.json`: inventario declarativo do staging. Projeto, apps Web/Android, chave publica Web, host Firebase Hosting e site key publica do App Check Web foram confirmados. Auth por e-mail/senha foi habilitado no projeto isolado; Play Integrity Android ainda requer assinatura/distribuicao. Worker, callable e recursos de Functions seguem vazios. Campos vazios mantem o build staging bloqueado; este arquivo nao autoriza publicar nem conectar o app a producao.

Ao adicionar arquivos nesta pasta, registre aqui a finalidade de cada um e preserve a separacao entre staging e producao.
