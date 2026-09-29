# ORG-0 — Inventário da raiz e dependências (baseline 29/09/2026)

> Auditoria somente leitura da `origin/main` em `4a9d8cc`, apresentada no PR draft #289. A ORG-PREP #286 ainda está em validação; destinos/README desse PR não são tratados aqui como mesclados. Nenhum arquivo foi movido ou excluído. Esta matriz propõe destino, **não autoriza** migração em massa.

## Método e limites

`git ls-files` identificou **129 arquivos rastreados diretamente na raiz**. Para cada um, a tabela indica destino proposto, consumidor/contrato prioritário e prova mínima. “Ponte compatível” significa que os scripts UMD do fixture legado não podem simplesmente virar import ESM: a ordem e os globais precisam continuar testados. Candidatos sem prova de desuso estão marcados como não confirmados. O checkout principal contém trabalho local e não foi alterado.

| Origem (raiz) | Destino proposto | Referência/consumidor prioritário | Risco e prova antes de mover |
|---|---|---|---|
| `.editorconfig` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `.firebaserc` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `.gitattributes` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `.gitignore` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `AGENTS.md` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `AI_NUTRITION_POLICY.md` | `documentation/compliance/AI_NUTRITION_POLICY.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `C22_ROLLOUT.md` | `documentation/estado-atual/C22_ROLLOUT.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `C24_FATIA_7_VALIDACAO.md` | `documentation/estado-atual/C24_FATIA_7_VALIDACAO.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_RENAME_TROFIA.md` | `documentation/operacao/CAPACITOR_ANDROID_RENAME_TROFIA.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_SUBFATIA_2.md` | `documentation/operacao/CAPACITOR_ANDROID_SUBFATIA_2.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_SUBFATIA_3.md` | `documentation/operacao/CAPACITOR_ANDROID_SUBFATIA_3.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_SUBFATIA_5.md` | `documentation/operacao/CAPACITOR_ANDROID_SUBFATIA_5.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_SUBFATIA_6A1.md` | `documentation/operacao/CAPACITOR_ANDROID_SUBFATIA_6A1.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_SUBFATIA_6A2.md` | `documentation/operacao/CAPACITOR_ANDROID_SUBFATIA_6A2.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_SUBFATIA_6B.md` | `documentation/operacao/CAPACITOR_ANDROID_SUBFATIA_6B.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CAPACITOR_ANDROID_SUBFATIA_7.md` | `documentation/operacao/CAPACITOR_ANDROID_SUBFATIA_7.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `CHANGELOG_DESIGN.md` | `documentation/estado-atual/CHANGELOG_DESIGN.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `GOOGLE_PLAY_DATA_SAFETY.md` | `documentation/compliance/GOOGLE_PLAY_DATA_SAFETY.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `NUTRITION_SCORE.md` | `documentation/estado-atual/NUTRITION_SCORE.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `PENDENCIAS.md` | `documentation/estado-atual/PENDENCIAS.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `PRIVACY_POLICY_EN.md` | `documentation/compliance/PRIVACY_POLICY_EN.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `PRIVACY_POLICY_ES.md` | `documentation/compliance/PRIVACY_POLICY_ES.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `PRIVACY_POLICY_PT-BR.md` | `documentation/compliance/PRIVACY_POLICY_PT-BR.md` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `ROADMAP.md` | `documentation/estado-atual/ROADMAP.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `SMOKE_TESTS_GUIDE_EN.txt` | `documentation/operacao/SMOKE_TESTS_GUIDE_EN.txt` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `SMOKE_TESTS_GUIDE_PT-BR.txt` | `documentation/operacao/SMOKE_TESTS_GUIDE_PT-BR.txt` | Guias/roadmap: atualizar links | baixo-médio; links/cópias |
| `STABILITY_TODO.md` | `documentation/estado-atual/STABILITY_TODO.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `VERSIONING.md` | `documentation/operacao/VERSIONING.md` | Cópia controlada: reconciliar canonicidade | baixo-médio; links/cópias |
| `account-deletion-client.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/firebase/account-deletion-client.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `add-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/add-screen.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `ai-client.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/ai-client.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `app-check-client.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/firebase/app-check-client.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `app-header-navigation.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/app-header-navigation.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `app.js` | `src/compat/app.js` | Espelho legado, fixture, preflight; ex.: `tests/fixtures/index.legacy.html` (13 refs de arquivo) | alto; manter igualdade e script order |
| `autosave-scheduler.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/autosave-scheduler.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `backup-modal.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/backup-modal.js` (8 refs de arquivo) | médio-alto; teste UMD/ESM |
| `barcode-scanner.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/barcode-scanner.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `body-metrics-charts.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/body-metrics-charts.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `body-metrics-model.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/body-metrics-model.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `bug-inventory.txt` | `decisão após reconciliação com BUG-INVENTORY.md` | Há alteração local não commitada no checkout principal | alto; comparar conteúdo sem perda |
| `calendar-model.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/calendar-model.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `capacitor.config.json` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `choice-field.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/choice-field.js` (8 refs de arquivo) | médio-alto; teste UMD/ESM |
| `cleanup_orphan_nutrition_docs.py` | `scripts/admin/cleanup_orphan_nutrition_docs.py` | CLI administrativa; rever comandos/referências | médio; dry-run, sem dados reais |
| `daily-entry-model.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/daily-entry-model.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `daily-entry-persistence.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/daily-entry-persistence.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `daily-nutrition-model.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/daily-nutrition-model.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `date-utils.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/date-utils.js` (18 refs de arquivo) | médio-alto; teste UMD/ESM |
| `diary-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/diary-screen.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `diary-ticker.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/diary-ticker.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `dish-description-ai.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/dish-description-ai.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `eating-patterns-ai.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/eating-patterns-ai.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `export_firestore_nutrition.py` | `scripts/admin/export_firestore_nutrition.py` | CLI administrativa; rever comandos/referências | médio; dry-run, sem dados reais |
| `firebase-app-client.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/firebase/firebase-app-client.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-auth-internal.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/firebase/firebase-auth-internal.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-auth-sdk.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/firebase/firebase-auth-sdk.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-backup-internal.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/firebase/firebase-backup-internal.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-backup-merge-internal.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/firebase/firebase-backup-merge-internal.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-config-internal.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/firebase-config-internal.js` (9 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-firestore-internal.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/firebase/firebase-firestore-internal.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-firestore-lifecycle.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/firebase/firebase-firestore-lifecycle.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-firestore-sdk.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/firebase/firebase-firestore-sdk.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-storage.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/App.jsx` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase-sync-state.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/firebase/firebase-sync-state.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `firebase.json` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `firestore.indexes.json` | `firebase/firestore.indexes.json` | firebase.json + emuladores/deploy | alto; emuladores, CI, sem deploy implícito |
| `firestore.rules` | `firebase/firestore.rules` | firebase.json + emuladores/deploy | alto; emuladores, CI, sem deploy implícito |
| `food-autofill-ai.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/food-autofill-ai.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `food-entry.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/food-entry.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `ga-result-card.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/ga-result-card.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `generic-dialog.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/generic-dialog.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `goal-calculator.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/goal-calculator.js` (12 refs de arquivo) | médio-alto; teste UMD/ESM |
| `historical-goals-model.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/historical-goals-model.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `history-loaders.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/history-loaders.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `hydration-guard.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/hydration-guard.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `i18n.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/i18n.js` (38 refs de arquivo) | médio-alto; teste UMD/ESM |
| `icon-placeholder.png` | `documentation/assets/icon-placeholder.png` | Uso runtime não confirmado; referência histórica | médio; comparar dist/Pages/Android |
| `image-meal-analysis-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/components/image-meal-analysis-screen.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `image-meal-client.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/leaf/image-meal-client.js` (3 refs de arquivo) | médio-alto; teste UMD/ESM |
| `image-meal-flow.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/composite/image-meal-flow.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `image-meal-registration.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/composite/image-meal-registration.js` (3 refs de arquivo) | médio-alto; teste UMD/ESM |
| `image-meal-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/components/image-meal-screen.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `index.html` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `login-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/login-screen.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `manifest.json` | `public/manifest.json` | Vite/cópia explícita, PWA, URLs | médio; comparar dist/Pages/Android |
| `manual-meal-result.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/manual-meal-result.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-estimate-editor.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/meal-estimate-editor.js` (4 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-estimate.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/meal-estimate.js` (8 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-ga.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/meal-ga.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-image-capture.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Consumidor fora do fixture; confirmar imports reais; ex.: `src/composite/meal-image-capture.js` (3 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-result-sheet.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/meal-result-sheet.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-review-ai.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/meal-review-ai.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-review-modal.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/meal-review-modal.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `meal-score.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/meal-score.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `metrics-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/metrics-screen.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `nutrition-feedback-ai.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/nutrition-feedback-ai.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `nutrition-tracker-controller.js` | `src/app/nutrition-tracker-controller.js (ponte compatível)` | Hooks/hidratação/autosave, fixture, adaptador ESM; ex.: `src/controller/nutrition-tracker-controller.js` (9 refs de arquivo) | alto; caracterização e smoke |
| `nutrition-tracker.jsx` | `src/compat/nutrition-tracker.jsx` | Espelho legado, fixture, preflight | alto; manter igualdade e script order |
| `one-ui.css` | `src/styles/one-ui.css` | CSS global/ordem de cascata | alto; build e visual |
| `open-food-facts.js` | `src/services/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/open-food-facts.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `package-lock.json` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `package.json` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `pantry-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/pantry-screen.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `pantry-suggestions-ai.js` | `src/features/ ou src/platform/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/pantry-suggestions-ai.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `playwright.config.js` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `playwright.cutover.config.js` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `playwright.pages.config.js` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `playwright.vite.config.js` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `privacy-panel.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/privacy-panel.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `profile-validation.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/profile-validation.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `recent-meals-model.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/leaf/recent-meals-model.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `release-notice.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/release-notice.js` (7 refs de arquivo) | médio-alto; teste UMD/ESM |
| `required-profile-modal.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/required-profile-modal.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `saved-meal-card.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/saved-meal-card.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `searchable-choice-field.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/searchable-choice-field.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `selection-controls.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/selection-controls.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `settings-panel.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/settings-panel.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `temporal-field.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/temporal-field.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `trofia-apple-touch-icon.png` | `public/trofia-apple-touch-icon.png` | Vite/cópia explícita + URLs publicadas | médio; comparar dist/Pages/Android |
| `trofia-favicon-32.png` | `public/trofia-favicon-32.png` | Vite/cópia explícita + URLs publicadas | médio; comparar dist/Pages/Android |
| `trofia-icon-192.png` | `public/trofia-icon-192.png` | Vite/cópia explícita + URLs publicadas | médio; comparar dist/Pages/Android |
| `trofia-icon-512.png` | `public/trofia-icon-512.png` | Vite/cópia explícita + URLs publicadas | médio; comparar dist/Pages/Android |
| `tutorial-overlay.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/tutorial-overlay.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `ui-primitives.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/ui-primitives.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `verify-email-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/verify-email-screen.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `visual-update-notice.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/visual-update-notice.js` (6 refs de arquivo) | médio-alto; teste UMD/ESM |
| `vite.config.js` | `raiz (manter)` | Ferramenta/entrada usa caminho convencional | baixo; verificar configs |
| `week-aggregator.js` | `src/domain/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/composite/week-aggregator.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |
| `week-screen.js` | `src/components/ ou src/features/ (com ponte `src/compat/` se necessária)` | Fixture legado; validar ordem + adaptador ESM; ex.: `src/components/week-screen.js` (5 refs de arquivo) | médio-alto; teste UMD/ESM |

## Contratos transversais observados

- `tests/fixtures/index.legacy.html` carrega scripts UMD da raiz em ordem explícita; `src/` possui adaptadores ESM, portanto semelhança de nomes não significa duplicata descartável.
- `vite.config.js` usa `base: './'`, copia manifest/ícones explicitamente e preserva a ordem do CSS; `scripts/verify-vite-build.js` faz allowlist do `dist`. Na ORG-PREP, o novo `public/README.md` exige `publicDir: false` até ORG-2.
- `firebase.json` aponta para rules/índices na raiz; mover configurações exige testes de emuladores e atualização de workflows, sem publicar rules automaticamente.
- `capacitor.config.json` usa `dist` como webDir; a prova de ORG-2/4 inclui Pages em subcaminho e Android real quando o pacote mudar.
- `app.js` e `nutrition-tracker.jsx` são espelhos validados pelo preflight; `nutrition-tracker-controller.js` concentra hooks/estado/hidratação e exige testes de caracterização antes de extração.
- `bug-inventory.txt` não pode ser removido automaticamente: o checkout principal tem edição local e existe `documentation/estado-atual/BUG-INVENTORY.md`.
- A busca literal por nome nos arquivos de `src/`, `tests/`, `scripts/` e `.github/` encontrou ao menos uma referência para **todos os 78 módulos JavaScript da raiz** examinados (excluídos os cinco arquivos `*config.js`). Isso não prova que todos sejam necessários em produção, mas refuta qualquer exclusão baseada apenas em “nenhum consumidor encontrado”.

## Cópias documentais e estrutura interna

Treze arquivos da raiz possuem arquivo homônimo em `documentation/estado-atual/` ou em `documentation/estado-atual/compliance/`. Nenhum par é byte a byte idêntico, porque as cópias incluem cabeçalho de proveniência. Em nove pares, o conteúdo integral da raiz aparece literalmente dentro da cópia. Nas três políticas de privacidade, o corpo coincide após normalizar whitespace. Em `ROADMAP.md`, a comparação de linhas apontou apenas um link relativo diferente para o plano ORG, adequado ao diretório de cada versão. Assim, **nenhuma divergência semântica foi demonstrada nesta amostra**, mas isso não autoriza retirar os originais: referências externas, links internos e o processo de atualização ainda usam a raiz. Snapshots históricos não são cópias a sincronizar.

`src/` ainda separa módulos entre `leaf/`, `composite/`, `firebase/`, `components/` e `controller/`; a ORG-5 deve estabelecer fronteiras por responsabilidade e não apagar os adaptadores só porque há um arquivo de mesmo nome na raiz. `functions/` e `worker/` já têm deploy, dependências e gates próprios; `android/` já é uma fronteira de build. Essas três árvores devem permanecer no topo. `vendor/` contém bundles do fixture legado, não são fonte editável de produto. A presença de `node_modules`, `dist`, `test-results` ou outros artefatos dentro de worktrees não os torna arquivos rastreados da raiz.

## Arquivos extensos: extração, não fragmentação cega

`nutrition-tracker.jsx` e `app.js` continuam como espelhos sincronizados da composição legada. O arquivo já instancia módulos separados para login, perfil, backup, telas de Diário/semana/métricas/alimentos, câmera, avaliação e notificações visuais. Assim, não se deve “quebrar em componentes” duplicando esses módulos: a extração útil restante é retirar do entrypoint a montagem de dependências de Auth/Firestore/App Check, integrações de IA/backup, seleção de telas e roteamento de overlays, cada qual com contrato injetável e teste de equivalência UMD/ESM. Antes, confirmar todas as referências globais e preservar o preflight que compara o espelho.

O risco maior está em `nutrition-tracker-controller.js`, que ainda concentra estado React, efeitos, hidratação temporal, autosave, Diário, IA e lifecycle. A ORG-6 deve caracterizar esses fluxos antes de extrair, por exemplo, (1) relógio civil e hidratação; (2) coordenação de persistência/autosave; (3) comandos do Diário; (4) fluxo de estimativa/IA; (5) construção das props das telas. A ordem dos hooks, closures e dependências de efeitos é contrato funcional. `one-ui.css` também é extenso; mover inteiro na ORG-2 preserva cascata, e dividir só depois de regressão visual e inventário de seletores na ORG-6.

## Git, resíduos e exclusão

Em 29/09, `git worktree list --porcelain` mostrou sete worktrees registradas: checkout principal, C14-F2 ativa, investigação de App Check, portas Playwright, ORG-PREP ativa, esta ORG-0 e a C26-T0 isolada. A última foi iniciada por interpretação equivocada da solicitação, sem commit/PR, e **arquivada em snapshot recuperável** antes de qualquer PR; as outras worktrees foram preservadas. O checkout principal continua sujo e atrás da `origin/main`.

Checagem Git adicional, sem tocar nas worktrees: `.codex-c14-f2-inventory-docs` estava limpa mas seu HEAD `928f385` **não** está contido na `origin/main` (PR/inventário em andamento); `.codex-investigate-vite-appcheck-bootstrap` estava limpa e HEAD `5c76f45` também não contido; `.codex-playwright-ports` tinha HEAD `9d16e60` contido na main, porém vários caminhos modificados/não rastreados, incluindo configs de Playwright e testes. Portanto, **nenhuma dessas três** é candidata de remoção automática. ORG-PREP segue ativa com mudanças locais/CI pendente; esta ORG-0 contém apenas documentação em edição.

A raiz física possui oito pastas `.codex-*`: três são worktrees registradas (`.codex-c14-f2-inventory-docs`, `.codex-investigate-vite-appcheck-bootstrap` e `.codex-playwright-ports`). As demais não têm marcador `.git`: `.codex-artifacts` contém evidência do run D2; `.codex-profile-v21-diagnostic` contém dependências e resultados de teste; `.codex-remote-attachments` contém anexos; `.codex-tmp` contém dependências; `.codex-ui-camera-play-hotfix` estava vazia na inspeção superficial. Nenhuma das cinco foi classificada como segura para apagar somente pelo nome, pela data ou por essa listagem de primeiro nível. A consulta de refs locais contidas em `origin/main` retornou 187 nomes: [184 candidatas à revisão de exclusão local](ORG_0_BRANCHES.md), depois de excluir `main` e duas branches de worktrees ativas; não há head de PR aberto entre essas 184 na consulta atual. As 232 linhas de refs remotas contidas na main requerem política de retenção própria. A condição de merge, sozinha, não comprova ausência de valor operacional. Nenhuma branch foi removida.

## Achados e próximos gates

1. ORG-PREP precisa terminar CI/merge antes de considerar README raiz e destinos como baseline entregue.
2. ORG-1 pode tratar guias/scripts e a política de worktrees fora do OneDrive; `bug-inventory.txt` exige reconciliação específica.
3. ORG-2 a ORG-6 devem migrar em grupos pequenos. A tabela serve como roteiro, mas cada PR precisa confirmar imports/globais concretos, URLs, saída de build e testes aplicáveis.
4. Não há arquivo/pasta cuja exclusão seja classificada como segura apenas por esta varredura. `icon-placeholder.png` tem referência documental e demanda verificação antes de arquivar; worktrees/branches demandam checagem individual.

**Validação desta etapa parcial:** `npm run preflight` passou em 29/09/2026, incluindo encoding, espelhamento `app.js`/`nutrition-tracker.jsx`, i18n PT/EN/ES e configuração de release Android. `git diff --check` não apontou whitespace inválido. Como nenhum código foi modificado, esse resultado verifica a base, não uma migração futura.
