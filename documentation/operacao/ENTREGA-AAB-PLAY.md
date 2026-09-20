# Entrega de AAB ao Google Play — procedimento permanente

Este procedimento é obrigatório sempre que qualquer frente gerar um AAB para publicação manual no Google Play Console.

## Informações que devem ser entregues ao responsável

No mesmo relatório que confirma o build, informar sempre:

1. o caminho absoluto da **pasta** que contém o AAB;
2. o caminho absoluto do **arquivo** AAB;
3. `versionCode` e `versionName`;
4. SHA-256 do arquivo final;
5. confirmação da assinatura e dos gates fail-closed aplicáveis;
6. commit ou estado Git exato usado no build;
7. notas de versão prontas para copiar e colar no Play Console em `en-US`, `pt-BR` e `es-ES`.

Nunca obrigar o responsável a extrair a pasta a partir do caminho do arquivo ou a traduzir/formar manualmente as notas.

## Formato obrigatório das notas

Entregar um único bloco copiável neste formato exato:

```text
<en-US>
Release notes in English.
</en-US>

<pt-BR>
Notas da versão em português do Brasil.
</pt-BR>

<es-ES>
Notas de la versión en español.
</es-ES>
```

As três versões devem comunicar o mesmo escopo factual. Não anunciar funcionalidade ainda não mesclada ou indisponível no artefato. Em builds diagnósticos ou intermediários, deixar claro que se trata de teste interno e descrever somente as correções, proteções ou validações realmente incluídas.

## Segurança e rastreabilidade

- Não incluir senha, token, UID, certificado, conteúdo de perfil ou outro dado sensível nas notas ou no relatório.
- Conferir o hash novamente depois de copiar o artefato para a pasta entregue ao responsável.
- Não marcar a etapa como publicada até o responsável confirmar o upload.
- Não marcar uma validação Play como concluída até confirmar instalação por `com.android.vending` e executar a matriz aprovada.
