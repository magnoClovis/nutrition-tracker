# Administração controlada

Destino para utilitários administrativos de inventário, exportação e limpeza após ORG-1. `cleanup_orphan_nutrition_docs.py` e `export_firestore_nutrition.py` ainda estão na raiz; este README não autoriza executá-los nem mover dados.

Operações destrutivas devem manter dry-run, alvo explícito, permissões mínimas e trilha de validação. Nunca versionar chaves de serviço, relatórios com dados pessoais ou backups reais.

## Inventário dos arquivos migrados

Nenhum script foi migrado. Ao migrar, registrar: arquivo | função | origem | comando | risco/dry-run | validação.
