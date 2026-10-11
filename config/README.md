# Configuracao de ambientes

Esta pasta guarda manifestos versionados que descrevem a identidade e os destinos de cada ambiente do Trofia. Ela nao armazena senhas, tokens, chaves privadas nem dados de usuarios. Cada manifesto deve ser validado antes de ser usado por um build ou deploy; campos vazios significam que o ambiente ainda nao esta pronto.

## Arquivos

- `staging-environment.json`: inventario declarativo do staging. O projeto e seu numero ja foram confirmados; os demais campos permanecem vazios ate que os recursos isolados sejam criados e verificados. Sua existencia nao autoriza publicar nem conectar o app a producao.

Ao adicionar arquivos nesta pasta, registre aqui a finalidade de cada um e preserve a separacao entre staging e producao.
