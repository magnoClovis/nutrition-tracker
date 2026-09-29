# Módulo Android do Trofia

Módulo Gradle do aplicativo, com manifest, código nativo, recursos e configuração de build release. A estrutura sob `src/` segue as convenções Android/Capacitor e não será reorganizada apenas para reduzir caminhos.

`google-services.json` real e material de assinatura são locais/sensíveis. O build release deve falhar claramente quando a configuração obrigatória faltar; não versionar nem documentar valores secretos.

## Inventário dos arquivos migrados

Nenhum arquivo foi movido pela ORG-PREP. Para migrações futuras: arquivo | função nativa | origem | consumidor Gradle/Capacitor | prova no AAB.
