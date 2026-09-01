> **Cópia documental — conteúdo misto.** Fonte: `/VERSIONING.md`, capturada da `main` no commit `5c51fa5` em 31/08/2026. `0.9.0-beta` e `0.10.0-beta` são marcos já publicados/testados; versões posteriores são checkpoints planejados, não funcionalidades disponíveis hoje. O original da raiz continua sendo a fonte operacional.

# Versionamento e checkpoints de release do Trofia

Este documento registra os marcos de versão aprovados a partir da `0.9.0-beta`. Ele é uma referência de planejamento: cada checkpoint continua sujeito à Tarefa 0, validação, CI autenticado e decisão de publicação correspondentes.

## Convenção

- Versões beta usam o formato `X.Y.Z-beta` no `package.json`, `package-lock.json` e Android `versionName`.
- O rótulo visível usa `Trofia vX.Y.Z Beta`.
- O Android `versionCode` é independente e deve aumentar em todo novo artefato enviado ao Play Console.
- Correções compatíveis dentro de um checkpoint usam patch; blocos funcionais coerentes usam minor.
- A versão `1.0.0-rc.1` congela funcionalidades e antecede `1.0.0`.
- Todo release tem um identificador único. Quem pulou versões recebe somente o aviso cumulativo do release atual.

## Regra de aviso e tutorial

Todos os usuários veem o mesmo aviso de boas-vindas da versão atual.

- Conta existente: depois do aviso, recebe apenas o tutorial pontual do release, quando houver.
- Conta nova: depois do aviso, recebe o tutorial completo atualizado, reunindo funcionalidades antigas e novas.
- A versão só é marcada como concluída depois do aviso e do tutorial correspondente.

## Checkpoints

| Versão | Grupo | Itens/marco | Tutorial |
|---|---|---|---|
| `0.9.0-beta` | Estado atual | UX, C01, C05, C06, C07 e C24 | Pontual: foto, revisão de estimativas e fluxo Adicionar/Diário |
| `0.10.0-beta` | A | C22 + C23 + C28 | Aviso; ajuda contextual na exclusão/sincronização |
| `0.11.0-beta` | A | C20 + C19 + C08 | Pontual: score, revisão e critérios de avaliação |
| `1.0.0-rc.1` | A | C14 + C16 concluídos; candidato entra no gate C25 | Sem tutorial extra |
| `1.0.0` | A | C25 concluído e liberação pública | Antigos: aviso; novos: tutorial completo |
| `1.1.0` | B | C26 + N01 + C21 + C17 | Pontual: voz, porções e notificações |
| `1.2.0` | B | N03 + N02 + N05 + N09 | Pontual: rótulo, origem dos dados, recalibração e jejum |
| `1.3.0` | B | C13 + C10 + N07 | Pontual: relatórios, compartilhamento e feedback |
| `1.4.0` | B | C15 + C27 | Aviso com instruções do widget; sem alvo fora da WebView |
| `1.5.0` | B | N04 + N06 | Pontual: receitas, porções, planejamento e compras |
| `1.6.0` | B | C12 + C18 + N08 | Pontual e específico por plataforma |

## Textos aprovados e propostos

### 0.9.0-beta

**PT:** Agora você pode reconhecer refeições por foto, revisar as estimativas antes de registrar e usar um Diário mais claro, com datas, backups e privacidade reforçados.

**EN:** You can now recognize meals from photos, review estimates before logging, and use a clearer Diary with more reliable dates, backups, and privacy protections.

**ES:** Ahora puedes reconocer comidas por foto, revisar las estimaciones antes de registrarlas y usar un Diario más claro, con fechas, copias de seguridad y privacidad reforzadas.

### 0.10.0-beta

**PT:** Seus dados agora funcionam melhor offline, sincronizam com mais segurança e podem ser excluídos integralmente por um fluxo confiável.

**EN:** Your data now works better offline, syncs more safely, and can be fully deleted through a reliable account-deletion process.

**ES:** Tus datos ahora funcionan mejor sin conexión, se sincronizan con mayor seguridad y pueden eliminarse por completo mediante un proceso fiable.

### 0.11.0-beta

**PT:** A avaliação de refeições, a pontuação nutricional e as sugestões da IA agora seguem critérios mais claros e consistentes.

**EN:** Meal evaluation, nutrition scores, and AI suggestions now follow clearer and more consistent criteria.

**ES:** La evaluación de comidas, la puntuación nutricional y las sugerencias de IA ahora siguen criterios más claros y coherentes.

### 1.0.0-rc.1

**PT:** Esta versão candidata reúne os reforços finais de segurança, manutenção e confiabilidade para o lançamento público.

**EN:** This release candidate brings together the final security, maintenance, and reliability improvements for the public launch.

**ES:** Esta versión candidata reúne las mejoras finales de seguridad, mantenimiento y fiabilidad para el lanzamiento público.

### 1.0.0

**PT:** O Trofia está oficialmente lançado: Diário, metas, IA, reconhecimento por foto, backup, privacidade e funcionamento offline em uma base estável.

**EN:** Trofia is officially launched, bringing together the Diary, goals, AI, photo recognition, backups, privacy, and offline support on a stable foundation.

**ES:** Trofia se lanza oficialmente con Diario, objetivos, IA, reconocimiento por foto, copias de seguridad, privacidad y funcionamiento sin conexión sobre una base estable.

### 1.1.0

**PT:** Ficou mais rápido registrar e acompanhar sua rotina com voz, porções fracionadas, lembretes locais e comunicações no seu idioma.

**EN:** Logging and following your routine is now faster with voice input, fractional portions, local reminders, and communication in your language.

**ES:** Registrar y seguir tu rutina ahora es más rápido con voz, porciones fraccionadas, recordatorios locales y comunicaciones en tu idioma.

### 1.2.0

**PT:** Fotos de rótulos, um banco nutricional ampliado, metas adaptativas e jejum oferecem análises mais completas e personalizadas.

**EN:** Nutrition-label photos, a deeper food database, adaptive goals, and fasting support provide more complete and personalized insights.

**ES:** Las fotos de etiquetas, una base nutricional ampliada, los objetivos adaptativos y el ayuno ofrecen análisis más completos y personalizados.

### 1.3.0

**PT:** Relatórios, compartilhamento profissional e feedback com anexos facilitam acompanhar e discutir sua evolução.

**EN:** Reports, professional sharing, and feedback with attachments make it easier to review and discuss your progress.

**ES:** Los informes, el uso compartido profesional y los comentarios con archivos adjuntos facilitan revisar y comentar tu evolución.

### 1.4.0

**PT:** O Trofia ganhou uma base mais leve e um widget de atalho para chegar mais rápido ao que você usa.

**EN:** Trofia now has a lighter foundation and a shortcut widget for faster access to the areas you use most.

**ES:** Trofia ahora cuenta con una base más ligera y un widget de acceso directo para llegar más rápido a lo que más utilizas.

### 1.5.0

**PT:** Crie receitas, calcule nutrientes por porção e planeje suas refeições e compras da semana.

**EN:** Create recipes, calculate nutrients per serving, and plan your meals and shopping for the week.

**ES:** Crea recetas, calcula nutrientes por porción y planifica tus comidas y compras de la semana.

### 1.6.0

**PT:** O Trofia chega a mais plataformas e integra dados de saúde, atividade e hábitos em um acompanhamento unificado.

**EN:** Trofia reaches more platforms and brings health, activity, and habit data into one unified experience.

**ES:** Trofia llega a más plataformas e integra datos de salud, actividad y hábitos en un seguimiento unificado.
