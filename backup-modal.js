/**
 * Backup and restore UI for exporting and importing real Trofia user data.
 *
 * The UMD module exposes a `createBackupModal` factory. The host injects React,
 * localization helpers from `i18n.js`, storage and browser services, plus a
 * `getBackupContext` function. That getter must return the latest export data
 * and bridge functions from NutritionTracker/firebase-storage.js and is invoked
 * at the moment of every export, preview, and confirmed import action.
 *
 * DATA-SAFETY CONTRACT: this component can trigger real account writes. It does
 * not own or duplicate backup schemas, categorization, validation, persistence,
 * or legacy meal-key repair. `normalizeMealKeys` remains outside this module and
 * is applied to imported diary data only when NutritionTracker reloads it. When
 * available, the controller's coordinated restore bridge owns autosave suspension,
 * import and rehydration as one operation.
 *
 * Known behaviors deliberately preserved for future backlog work:
 * - full exports may precede debounced persistence of the latest React state;
 * - “Diary — today” can use the currently viewed historical `activeLog` while
 *   retaining TODAY in the exported filename and payload;
 * - preview rendering reads `category.existing` although the adapter returns
 *   `existingItems`;
 * - closing during asynchronous operations does not cancel work, and imports
 *   have no cross-category transaction or rollback.
 *
 * @module BackupModal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BackupModalModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the backup modal with all state bridges and environment services supplied by the host.
   *
   * @param {Object} dependencies Injected backup-modal dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host.
   * @param {function(string): string} dependencies.normalizeLanguage Language normalizer from `i18n.js`.
   * @param {function(string, *, *, *): *} dependencies.pickLang Language selector from `i18n.js`.
   * @param {{get: function(string): Promise<Object|null>}} dependencies.storage App storage adapter.
   * @param {{getItem: function(string): (string|null)}} dependencies.localStorage Browser-local storage service.
   * @param {function(Object): Promise<Object>} [dependencies.exportFile] Runtime file-export adapter.
   * @param {boolean} [dependencies.supportsNativeFileDestinations=false] Whether Android save/share choices are available.
   * @param {function(): Object} dependencies.getBackupContext Returns current export data and backup bridge functions for each action.
   * @param {function(): Object} dependencies.FileReader Browser FileReader constructor.
   * @param {function(string): void} dependencies.alertUser Browser alert service.
   * @param {function(...*): void} dependencies.reportError Error logger, normally `console.error`.
   * @param {function(Date=): string} dependencies.localToday Shared local civil-date formatter.
   * @param {function(string, number): string} dependencies.addCivilDays Shared calendar-day shifter.
   * @param {Function} dependencies.CheckboxField Native-semantic multiple-choice control.
   * @returns {{BackupModal: function(Object): Object}} Configured backup-modal component API.
   */
  function createBackupModal({
    React,
    normalizeLanguage,
    pickLang,
    storage,
    localStorage: localStorageService,
    exportFile,
    supportsNativeFileDestinations = false,
    getBackupContext,
    FileReader: FileReaderCtor,
    alertUser,
    reportError,
    localToday,
    addCivilDays,
    CheckboxField
  }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function" ||
        typeof normalizeLanguage !== "function" || typeof pickLang !== "function" ||
        !storage || typeof storage.get !== "function" ||
        !localStorageService || typeof localStorageService.getItem !== "function" ||
        (exportFile !== undefined && typeof exportFile !== "function") ||
        typeof supportsNativeFileDestinations !== "boolean" ||
        typeof getBackupContext !== "function" || typeof FileReaderCtor !== "function" ||
        typeof alertUser !== "function" || typeof reportError !== "function" ||
        typeof localToday !== "function" || typeof addCivilDays !== "function" ||
        typeof CheckboxField !== "function") {
      throw new TypeError("BackupModal requires React, i18n, storage, browser services, getBackupContext, and CheckboxField");
    }

    const localStorage = localStorageService;
    const FileReader = FileReaderCtor;
    const alert = alertUser;
    const console = { error: reportError };

    /**
     * Renders backup/export controls and the category-level import preview.
     *
     * @param {Object} props Backup-modal props.
     * @param {string} props.lang Active application language.
     * @param {boolean} props.darkMode Whether dark mode is active.
     * @param {function(): void} props.onClose Closes the modal without cancelling in-flight operations.
     * @param {function(Object): function(): void} [props.registerBackHandler] Registers nested Android Back handling.
     * @param {number} [props.backHandlerPriority] Dispatcher priority for the nested handler.
     * @returns {Object} React element tree for backup and restore.
     */
    function BackupModal({
      lang,
      darkMode,
      onClose,
      registerBackHandler,
      backHandlerPriority
    }) {
      const normalizedLang = normalizeLanguage(lang);
      const isPt = normalizedLang === 'pt';
      const L = (pt, en, es) => pickLang(normalizedLang, pt, en, es);
      const [loading, setLoading] = React.useState(null);
      const [importDone, setImportDone] = React.useState('');
      const [downloaded, setDownloaded] = React.useState(null);
      const [pendingImportBackup, setPendingImportBackup] = React.useState(null);
      const [importPreview, setImportPreview] = React.useState(null);
      const [importSelections, setImportSelections] = React.useState({});
      const [importingBackup, setImportingBackup] = React.useState(false);
      const [exportDestinationKey, setExportDestinationKey] = React.useState(null);
      const [refreshingData, setRefreshingData] = React.useState(false);
      const [showRefreshFallback, setShowRefreshFallback] = React.useState(false);
    
      const backupCategoryLabels = {
        profile: L('Perfil nutricional', 'Nutrition profile', 'Perfil nutricional'),
        nutritionGoals: L('Configurações nutricionais', 'Nutrition settings', 'Configuración nutricional'),
        pantry: L('Despensa', 'Pantry', 'Despensa'),
        mealTemplates: L('Refeições salvas', 'Saved meals', 'Comidas guardadas'),
        supplements: L('Suplementos', 'Supplements', 'Suplementos'),
        diary: L('Registros diários', 'Daily logs', 'Registros diarios'),
        dayTypes: L('Dias de treino/descanso', 'Training/rest days', 'Días de entrenamiento/descanso'),
        water: L('Água', 'Water', 'Agua'),
        notes: L('Notas', 'Notes', 'Notas'),
        supplementLog: L('Registro de suplementos', 'Supplement logs', 'Registro de suplementos'),
        bodyMetrics: L('Métricas corporais', 'Body metrics', 'Métricas corporales')
      };
    
      const exportOptions = [
        { key:'today',  icon:'', title:L('Diário - hoje', 'Diary - today', 'Diario - hoy'), desc:L('Refeições e totais do dia atual', 'Meals and totals for today', 'Comidas y totales del día actual') },
        { key:'week',   icon:'', title:L('Últimos 7 dias', 'Last 7 days', 'Últimos 7 días'), desc:L('Histórico da semana com refeições e macros', 'Weekly history with meals and macros', 'Historial semanal con comidas y macros') },
        { key:'month',  icon:'', title:L('Último mês (30 dias)', 'Last 30 days', 'Último mes (30 días)'), desc:L('Histórico do mês com totais diários', 'Monthly history with daily totals', 'Historial mensual con totales diarios') },
        { key:'pantry', icon:'', title:L('Alimentos', 'Pantry', 'Alimentos'), desc:L('Todos os alimentos cadastrados', 'All registered foods', 'Todos los alimentos registrados') },
        { key:'weight', icon:'', title:L('Histórico de peso', 'Weight history', 'Historial de peso'), desc:L('Peso e altura registrados', 'Logged weight and height data', 'Peso y altura registrados') },
        { key:'all',    icon:'', title:L('Exportar dados', 'Export data', 'Exportar datos'), desc:L('Backup completo: diário, alimentos, peso, metas e água', 'Full backup: diary, foods, weight, goals, and water', 'Backup completo: diario, alimentos, peso, metas y agua'), highlight:true },
      ];
    
      async function doExport(key, destination) {
        setExportDestinationKey(null);
        setLoading(key);
        try {
          const backupContext = getBackupContext() || {};
          const d = backupContext.exportData || {};
          const {activeLog, log, TODAY, isTraining, goals, goalHistory, trainingByDate,
                 buildDayTotals, normalizeMealKeys, exportFile: contextExportFile, lang, notify,
                 weightHistory} = d;
          const activeExportFile = exportFile || contextExportFile;
          if (typeof activeExportFile !== "function") {
            throw new Error(L('App ainda não está pronto', 'App not ready', 'La app aún no está lista'));
          }
          const today = TODAY || localToday();
          const exportLang = normalizeLanguage(lang || normalizedLang || 'pt');
          const E = (pt, en, es) => pickLang(exportLang, pt, en, es);
          const exportRequest = request => activeExportFile({
            ...request,
            ...(destination ? {destination} : {})
          });
    
          if (key === 'all') {
            if (backupContext.exportFullBackup) {
              const result = await backupContext.exportFullBackup({destination});
              if (result?.cancelled) {
                setLoading(null);
                return;
              }
            }
    
          } else if (key === 'today') {
            if (!activeLog || !buildDayTotals) throw new Error(E('App ainda não está pronto', 'App not ready', 'La app aún no está lista'));
            const ae = Object.values(activeLog||{}).flat();
            const totDay = {
              protein: Math.round(ae.reduce((s,e)=>s+(e.protein ?? 0),0)*10)/10,
              kcal:    Math.round(ae.reduce((s,e)=>s+(e.kcal ?? 0),0)*10)/10,
              carbs:   Math.round(ae.reduce((s,e)=>s+(e.carbs ?? 0),0)*10)/10,
              fat:     Math.round(ae.reduce((s,e)=>s+(e.fat ?? 0),0)*10)/10,
              fiber:   Math.round(ae.reduce((s,e)=>s+(e.fiber ?? 0),0)*10)/10,
              salt:    Math.round(ae.reduce((s,e)=>s+(e.salt ?? 0),0)*10)/10
            };
            const data = {date:today, isTraining, goals, meals:activeLog, totals:totDay};
            const result = await exportRequest({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type:'day',data},null,2),
              filename: 'diario_'+today+'.json',
              mimeType: 'application/json'
            });
            if (result?.cancelled) {
              setLoading(null);
              return;
            }
            if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));
    
          } else if (key === 'week' || key === 'month') {
            if (!buildDayTotals || !normalizeMealKeys) throw new Error(E('App ainda não está pronto', 'App not ready', 'La app aún no está lista'));
            const n = key === 'week' ? 7 : 30;
            const days = [];
            for (let i = n-1; i >= 0; i--) {
              const date = addCivilDays(today, -i);
              let dayLog = date === today ? (log||{}) : {};
              if (date !== today) {
                const l = await storage.get('log_v2_'+date).catch(()=>null);
                if (l) dayLog = normalizeMealKeys(JSON.parse(l.value));
              }
              const dtEntries = Object.values(dayLog).flat();
              const tot = {
                protein: Math.round(dtEntries.reduce((s,e)=>s+(e.protein ?? 0),0)*10)/10,
                kcal:    Math.round(dtEntries.reduce((s,e)=>s+(e.kcal ?? 0),0)*10)/10,
                carbs:   Math.round(dtEntries.reduce((s,e)=>s+(e.carbs ?? 0),0)*10)/10,
                fat:     Math.round(dtEntries.reduce((s,e)=>s+(e.fat ?? 0),0)*10)/10,
                fiber:   Math.round(dtEntries.reduce((s,e)=>s+(e.fiber ?? 0),0)*10)/10,
                salt:    Math.round(dtEntries.reduce((s,e)=>s+(e.salt ?? 0),0)*10)/10
              };
              days.push({date, isTraining:trainingByDate?.[date] ?? true, goals: goalHistory?.[date] || null, totals:tot, meals:dayLog});
            }
            const fname = (key==='week'?'semana':'mes')+'_'+today+'.json';
            const result = await exportRequest({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type:key,days},null,2),
              filename: fname,
              mimeType: 'application/json'
            });
            if (result?.cancelled) {
              setLoading(null);
              return;
            }
            if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));
    
          } else if (key === 'pantry') {
            const r = await storage.get('pantry_v2');
            const data = {pantry_v2: r?.value || '[]'};
            const result = await exportRequest({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type:'pantry',data},null,2),
              filename: 'despensa_'+today+'.json',
              mimeType: 'application/json'
            });
            if (result?.cancelled) {
              setLoading(null);
              return;
            }
            if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));
    
          } else if (key === 'weight') {
            const whr = await storage.get('weightHistory').catch(()=>null);
            const whData = whr?.value ? JSON.parse(whr.value) : (weightHistory||[]);
            const result = await exportRequest({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type:'weight',data:{weightHistory:whData}},null,2),
              filename: 'peso_'+today+'.json',
              mimeType: 'application/json'
            });
            if (result?.cancelled) {
              setLoading(null);
              return;
            }
            if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));
          }
          setDownloaded(key);
        } catch(e) {
          console.error('Export error:', e);
          alert(L('Erro ao exportar: ', 'Export error: ', 'Error al exportar: ') + e.message);
        }
        setLoading(null);
      }
    
      /**
       * Reads the selected backup file and opens the category-level dry-run dialog
       * inside this modal. Keeping the state local avoids a hidden confirmation
       * flow when the backup screen is mounted above the main app shell.
       */
      function readBackupFile(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              resolve(JSON.parse(String(reader.result || '{}')));
            } catch (error) {
              reject(new Error(L('Arquivo JSON inválido.', 'Invalid JSON file.', 'Archivo JSON inválido.')));
            }
          };
          reader.onerror = () => reject(reader.error || new Error(L('Não foi possível ler o arquivo.', 'Could not read file.', 'No se pudo leer el archivo.')));
          reader.readAsText(file, 'utf-8');
        });
      }
    
      async function doImport(e) {
        const file = e?.target?.files?.[0];
        setImportDone('');
        if (!file) return;
    
        try {
          const rawBackup = await readBackupFile(file);
          const backupContext = getBackupContext() || {};
          const previewFullAccountBackupImport = backupContext.previewFullAccountBackupImport;
          if (!previewFullAccountBackupImport) {
            throw new Error(L('Pré-visualização de importação indisponível.', 'Import preview is unavailable.', 'La vista previa de importación no está disponible.'));
          }
    
          const preview = await previewFullAccountBackupImport(rawBackup);
          if (!preview?.ok) {
            const message = preview?.errors?.join(', ') || L('Backup inválido.', 'Invalid backup.', 'Backup inválido.');
            throw new Error(message);
          }
    
          setPendingImportBackup(rawBackup);
          setImportPreview(preview);
          setImportSelections({});
        } catch (error) {
          setImportDone(L('Erro ao importar: ', 'Import error: ', 'Error al importar: ') + (error?.message || String(error)));
        } finally {
          if (e?.target) e.target.value = '';
        }
      }
    
      function setImportCategory(categoryId, checked) {
        setImportSelections(current => {
          const next = {...current};
          if (checked) next[categoryId] = '';
          else delete next[categoryId];
          return next;
        });
      }
    
      function setImportCategoryStrategy(categoryId, strategy) {
        setImportSelections(current => ({...current, [categoryId]: strategy}));
      }
    
      function closeImportPreview() {
        setPendingImportBackup(null);
        setImportPreview(null);
        setImportSelections({});
        setImportingBackup(false);
      }

      const nestedBackStateRef = React.useRef(null);
      nestedBackStateRef.current = () => {
        if (!importPreview) return false;
        closeImportPreview();
        return true;
      };
      React.useEffect(() => {
        if (typeof registerBackHandler !== 'function') return undefined;
        return registerBackHandler({
          id: 'backup-modal',
          priority: Number(backHandlerPriority) || 0,
          handler: () => nestedBackStateRef.current(),
        });
      }, [registerBackHandler, backHandlerPriority]);
    
      async function confirmImportPreview() {
        if (!pendingImportBackup) return;
        const backupContext = getBackupContext() || {};
        const importFullAccountBackup = backupContext.importFullAccountBackup;
        const restoreFullAccountBackup = backupContext.restoreFullAccountBackup;
        if (!restoreFullAccountBackup && !importFullAccountBackup) return;
    
        const selected = Object.fromEntries(
          Object.entries(importSelections).filter(([, strategy]) => strategy === 'append' || strategy === 'replace')
        );
    
        if (!Object.keys(selected).length) {
          setImportDone(L('Selecione pelo menos uma categoria e uma estratégia.', 'Select at least one category and strategy.', 'Selecciona al menos una categoría y una estrategia.'));
          return;
        }
    
        setImportingBackup(true);
        try {
          const importOptions = {categories: selected};
          const result = typeof restoreFullAccountBackup === 'function'
            ? await restoreFullAccountBackup(pendingImportBackup, importOptions)
            : await importFullAccountBackup(pendingImportBackup, importOptions);
          const count = Number(result?.imported ?? 0);
          const reloadNutritionData = backupContext.reloadNutritionData;
          if (typeof restoreFullAccountBackup !== 'function' && typeof reloadNutritionData === 'function') {
            try {
              await reloadNutritionData();
            } catch (_) {}
          }
          closeImportPreview();
          setShowRefreshFallback(true);
          setImportDone(L(
            `Importação concluída: ${count} registros.`,
            `Import complete: ${count} records.`,
            `Importación completada: ${count} registros.`
          ));
        } catch (error) {
          setImportDone(L('Erro ao importar: ', 'Import error: ', 'Error al importar: ') + (error?.message || String(error)));
          setImportingBackup(false);
        }
      }

      async function refreshImportedData() {
        const backupContext = getBackupContext() || {};
        const reloadApplication = backupContext.reloadApplication;
        if (typeof reloadApplication !== 'function') {
          setImportDone(L(
            'Atualização de dados indisponível.',
            'Data refresh is unavailable.',
            'La actualización de datos no está disponible.'
          ));
          return;
        }
        setRefreshingData(true);
        try {
          setImportDone(L(
            'Recarregando o aplicativo...',
            'Reloading the app...',
            'Recargando la aplicación...'
          ));
          await reloadApplication();
        } catch (error) {
          setImportDone(L(
            'Erro ao atualizar dados: ',
            'Data refresh error: ',
            'Error al actualizar datos: '
          ) + (error?.message || String(error)));
        } finally {
          setRefreshingData(false);
        }
      }
      // Read theme from localStorage (same as App and LoginScreen)
      const bDark = darkMode !== undefined ? darkMode : localStorage.getItem('appDarkMode') === 'true';
      const bTheme = bDark ? {
        '--bg':'#111','--surface':'#161616','--border2':'#2a2a2a',
        '--text':'#e8e0d5','--text1':'#e8e0d5','--muted':'#8a8a8a',
        '--btn-ok':'#1e2e1e','--btn-ok-border':'#3a5a3a','--btn-ok-text':'#7ec87e',
        '--btn-info':'#1a1e2a','--btn-info-border':'#3a3a6a','--btn-info-text':'#8a9ec8',
        '--dim':'#555'
      } : {
        '--bg':'#f2f1ed','--surface':'#ffffff','--border2':'#b8b4ac',
        '--text':'#252220','--text1':'#252220','--muted':'#6a6662',
        '--btn-ok':'#e8f4e8','--btn-ok-border':'#a8cfa8','--btn-ok-text':'#2a6a2a',
        '--btn-info':'#e8eaf4','--btn-info-border':'#a8aed0','--btn-info-text':'#3a4a8a',
        '--dim':'#8a8680'
      };
    
      return React.createElement('div', {'data-safe-area-screen':'true', style: Object.assign({
        position:'fixed', inset:0, zIndex:99998,
        background: bDark?'#111':'#f2f1ed', overflowY:'auto',
        display:'flex', flexDirection:'column'
      }, bTheme)},
        // Header
        React.createElement('div', {'data-safe-area-screen-header':'true', style:{
          display:'flex', alignItems:'center', gap:12,
          padding:'16px 20px', borderBottom:'1px solid var(--border2)',
          background:'var(--surface)', position:'sticky', top:0, zIndex:1
        }},
          React.createElement('button', {onClick:onClose, style:{
            background:'none', border:'none', color:'var(--text2)',
            fontSize:22, cursor:'pointer', padding:'0 4px', lineHeight:1
          }}, '\u2190'),
          React.createElement('div', null,
            React.createElement('h2', {style:{margin:0, fontSize:17, color:'var(--text)', fontWeight:600}},
              L('Backup e restaurar', 'Backup & restore', 'Backup y restauración')),
            React.createElement('p', {style:{margin:0, fontSize:12, color:'var(--muted)'}},
              L('Escolha o que exportar ou importe um arquivo', 'Choose what to export or import a file', 'Elige qué exportar o importa un archivo'))
          )
        ),
    
        // Export section
        React.createElement('div', {style:{padding:'20px 16px 8px'}},
          React.createElement('p', {style:{
            fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase',
            color:'var(--muted)', margin:'0 0 12px'
          }}, L('Exportar', 'Export', 'Exportar')),
          React.createElement('div', {style:{display:'flex', flexDirection:'column', gap:8}},
            exportOptions.map(opt =>
              React.createElement('button', {
                key: opt.key,
                onClick: () => supportsNativeFileDestinations
                  ? setExportDestinationKey(opt.key)
                  : doExport(opt.key),
                disabled: loading === opt.key,
                style:{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'14px 16px', borderRadius:opt.highlight ? 999 : 12, cursor:'pointer',
                  fontFamily:'inherit', textAlign:'left',
                  background: opt.highlight ? 'var(--btn-ok)' : 'var(--surface)',
                  border: '1px solid ' + (opt.highlight ? 'var(--btn-ok-border)' : 'var(--border2)'),
                  opacity: loading && loading !== opt.key ? 0.5 : 1,
                  transition: 'opacity 0.2s'
                }
              },
                React.createElement('span', {style:{fontSize:24, flexShrink:0}}, opt.icon),
                React.createElement('div', {style:{flex:1}},
                  React.createElement('div', {style:{
                    fontSize:14, fontWeight:500,
                    color: opt.highlight ? 'var(--btn-ok-text)' : 'var(--text)'
                  }}, opt.title),
                  React.createElement('div', {style:{fontSize:12, color:'var(--muted)', marginTop:2}}, opt.desc)
                ),
                loading === opt.key
                  ? React.createElement('div', {style:{
                      width:16, height:16, borderRadius:'50%',
                      border:'2px solid var(--btn-ok-text)',
                      borderTopColor:'transparent',
                      animation:'spin 0.8s linear infinite', flexShrink:0
                    }})
                  : React.createElement('span', {style:{color:'var(--muted)', fontSize:16, flexShrink:0}}, '\u2193')
              )
            )
          )
        ),
    
        // Divider
        React.createElement('div', {style:{height:1, background:'var(--border2)', margin:'8px 16px'}}),
    
        // Import section
        React.createElement('div', {style:{padding:'8px 16px 32px'}},
          React.createElement('p', {style:{
            fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase',
            color:'var(--muted)', margin:'0 0 12px'
          }}, L('Importar', 'Import', 'Importar')),
          React.createElement('label', {style:{
            display:'flex', alignItems:'center', gap:14,
            padding:'14px 16px', borderRadius:999, cursor:'pointer',
            background:'var(--surface)', border:'1px dashed var(--border2)'
          }},
            React.createElement('span', {style:{fontSize:24}}, '\uD83D\uDCC2'),
            React.createElement('div', {style:{flex:1}},
              React.createElement('div', {style:{fontSize:14, fontWeight:500, color:'var(--text)'}},
                L('Importar dados', 'Import data', 'Importar datos')),
              React.createElement('div', {style:{fontSize:12, color:'var(--muted)', marginTop:2}},
                L('Restaura dados de um backup anterior', 'Restore data from a previous backup', 'Restaura datos de un backup anterior'))
            ),
            React.createElement('span', {style:{color:'var(--muted)', fontSize:16}}, '\u2191'),
            React.createElement('input', {type:'file', accept:'.json', onChange:doImport, style:{display:'none'}})
          ),
          importDone && React.createElement('div', {style:{
            marginTop:10, padding:'14px 16px', borderRadius:12,
            background:'var(--btn-ok)', border:'1px solid var(--btn-ok-border)',
            color:'var(--btn-ok-text)', fontSize:14
          }}, importDone),
          showRefreshFallback && React.createElement('button', {
            type:'button',
            onClick:refreshImportedData,
            disabled:refreshingData,
            style:{
              marginTop:10, width:'100%', padding:'12px 16px', borderRadius:999,
              background:'var(--btn-info)', border:'1px solid var(--btn-info-border)',
              color:'var(--btn-info-text)', fontFamily:'inherit', fontWeight:600,
              cursor:refreshingData?'default':'pointer', opacity:refreshingData?0.65:1
            }
          }, refreshingData
            ? L('Atualizando...', 'Refreshing...', 'Actualizando...')
            : L('Atualizar dados', 'Refresh data', 'Actualizar datos')),
          React.createElement('p', {style:{
            fontSize:12, color:'var(--muted)', marginTop:10, lineHeight:1.5
          }}, L(
            ' A importação pode anexar ou substituir os grupos selecionados.',
            ' Import can append or replace the selected groups.',
            ' La importación puede anexar o sustituir los grupos seleccionados.'
          ))
        ),
    
        exportDestinationKey && React.createElement('div', {'data-safe-area-dialog':'16', style:{
          position:'fixed', inset:0, zIndex:100006,
          background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:16
        }},
          React.createElement('div', {style:{
            width:'min(420px, 100%)', background:'var(--surface)',
            border:'1px solid var(--border2)', borderRadius:14,
            boxShadow:'0 20px 70px rgba(0,0,0,0.32)', padding:20, color:'var(--text)'
          }},
            React.createElement('h3', {style:{margin:'0 0 8px', fontSize:18}},
              L('Exportar arquivo', 'Export file', 'Exportar archivo')),
            React.createElement('p', {style:{margin:'0 0 16px', color:'var(--muted)', fontSize:13, lineHeight:1.45}},
              L(
                'Escolha onde deseja guardar o backup.',
                'Choose how to keep the backup.',
                'Elige cómo guardar el backup.'
              )),
            React.createElement('div', {style:{display:'flex', flexDirection:'column', gap:10}},
              React.createElement('button', {
                type:'button',
                onClick:() => doExport(exportDestinationKey, 'save'),
                style:{
                  padding:'13px 16px', borderRadius:999, cursor:'pointer',
                  background:'var(--btn-ok)', border:'1px solid var(--btn-ok-border)',
                  color:'var(--btn-ok-text)', fontFamily:'inherit', fontWeight:600
                }
              }, L('Salvar no aparelho', 'Save on device', 'Guardar en el dispositivo')),
              React.createElement('button', {
                type:'button',
                onClick:() => doExport(exportDestinationKey, 'share'),
                style:{
                  padding:'13px 16px', borderRadius:999, cursor:'pointer',
                  background:'var(--btn-info)', border:'1px solid var(--btn-info-border)',
                  color:'var(--btn-info-text)', fontFamily:'inherit', fontWeight:600
                }
              }, L('Compartilhar', 'Share', 'Compartir')),
              React.createElement('button', {
                type:'button',
                onClick:() => setExportDestinationKey(null),
                style:{
                  padding:'11px 16px', border:0, background:'transparent',
                  color:'var(--muted)', fontFamily:'inherit', cursor:'pointer'
                }
              }, L('Cancelar', 'Cancel', 'Cancelar'))
            )
          )
        ),

        importPreview && (() => {
          const categories = Array.isArray(importPreview.categories) ? importPreview.categories : [];
          const selectedKeys = Object.keys(importSelections);
          const selectedCount = selectedKeys.length;
          const needsStrategy = selectedKeys.some(key => !importSelections[key]);
          const canImport = selectedCount > 0 && !needsStrategy && !importingBackup;
    
          return React.createElement('div', {'data-safe-area-dialog':'16', style:{
            position:'fixed', inset:0, zIndex:100006,
            background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:16
          }},
            React.createElement('div', {style:{
              width:'min(760px, 100%)', maxHeight:'90vh', overflowY:'auto',
              background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14,
              boxShadow:'0 20px 70px rgba(0,0,0,0.32)', padding:20, color:'var(--text)'
            }},
              React.createElement('div', {style:{display:'flex', alignItems:'flex-start', gap:12, marginBottom:14}},
                React.createElement('div', {style:{flex:1}},
                  React.createElement('h3', {style:{margin:'0 0 8px', fontSize:18, letterSpacing:1.4, textTransform:'uppercase'}},
                    L('Revisar importação', 'Review import', 'Revisar importación')),
                  React.createElement('p', {style:{margin:0, color:'var(--muted)', fontSize:13, lineHeight:1.45}},
                    L(
                      'Escolha quais dados deseja restaurar e defina se cada grupo deve anexar dados novos ou substituir os dados atuais.',
                      'Choose which data to restore and decide whether each group should append new data or replace current data.',
                      'Elige qué datos quieres restaurar y define si cada grupo debe anexar datos nuevos o sustituir los datos actuales.'
                    ))
                ),
                React.createElement('button', {onClick:closeImportPreview, style:{
                  border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text)',
                  borderRadius:10, width:42, height:42, cursor:'pointer', fontSize:22
                }}, '×')
              ),
    
              React.createElement('div', {style:{display:'grid', gap:10}},
                categories.length
                  ? categories.map(category => {
                      const checked = Object.prototype.hasOwnProperty.call(importSelections, category.id);
                      const strategy = importSelections[category.id] || '';
                      const label = backupCategoryLabels[category.id] || category.id;
                      const summary = L(
                        `${category.total || 0} registros · ${category.newItems || 0} novos · ${category.existing || 0} existentes`,
                        `${category.total || 0} records · ${category.newItems || 0} new · ${category.existing || 0} existing`,
                        `${category.total || 0} registros · ${category.newItems || 0} nuevos · ${category.existing || 0} existentes`
                      );
    
                      return React.createElement('div', {key:category.id, style:{
                        border:'1px solid var(--border2)', borderRadius:12, padding:12,
                        background:checked ? 'var(--btn-ok)' : 'var(--surface)'
                      }},
                        React.createElement(CheckboxField, {
                          id: `backup-category-${category.id}`,
                          checked,
                          onChange: nextChecked => setImportCategory(category.id, nextChecked),
                          label,
                          description: summary,
                          style: { padding: 0 }
                        }),
                        checked && React.createElement('div', {style:{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}},
                          React.createElement('button', {onClick:()=>setImportCategoryStrategy(category.id, 'append'), style:{
                            flex:'1 1 150px', padding:'10px 12px', borderRadius:9, cursor:'pointer', fontFamily:'inherit',
                            background:strategy === 'append' ? 'var(--btn-ok)' : 'var(--surface)',
                            border:'1px solid ' + (strategy === 'append' ? 'var(--btn-ok-border)' : 'var(--border2)'),
                            color:strategy === 'append' ? 'var(--btn-ok-text)' : 'var(--text)'
                          }}, L('Anexar', 'Append', 'Anexar')),
                          React.createElement('button', {onClick:()=>setImportCategoryStrategy(category.id, 'replace'), style:{
                            flex:'1 1 150px', padding:'10px 12px', borderRadius:9, cursor:'pointer', fontFamily:'inherit',
                            background:strategy === 'replace' ? 'var(--btn-info)' : 'var(--surface)',
                            border:'1px solid ' + (strategy === 'replace' ? 'var(--btn-info-border)' : 'var(--border2)'),
                            color:strategy === 'replace' ? 'var(--btn-info-text)' : 'var(--text)'
                          }}, L('Substituir', 'Replace', 'Sustituir'))
                        )
                      );
                    })
                  : React.createElement('div', {style:{color:'var(--muted)', fontSize:14}},
                      L('Nenhum dado importável foi encontrado neste arquivo.', 'No importable data was found in this file.', 'No se encontraron datos importables en este archivo.'))
              ),
    
              React.createElement('div', {style:{display:'flex', gap:10, marginTop:18, flexWrap:'wrap'}},
                React.createElement('button', {onClick:closeImportPreview, disabled:importingBackup, style:{
                  flex:'1 1 180px', padding:'13px 16px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                  background:'var(--surface)', border:'1px solid var(--border2)', color:'var(--text)',
                  textTransform:'uppercase', letterSpacing:1.2
                }}, L('Cancelar', 'Cancel', 'Cancelar')),
                React.createElement('button', {onClick:confirmImportPreview, disabled:!canImport, style:{
                  flex:'1 1 220px', padding:'13px 16px', borderRadius:10,
                  cursor:canImport ? 'pointer' : 'not-allowed', fontFamily:'inherit',
                  background:'var(--btn-ok)', border:'1px solid var(--btn-ok-border)', color:'var(--btn-ok-text)',
                  opacity:canImport ? 1 : 0.5, textTransform:'uppercase', letterSpacing:1.2
                }}, importingBackup
                  ? L('Importando...', 'Importing...', 'Importando...')
                  : L('Importar selecionados', 'Import selected', 'Importar seleccionados'))
              )
            )
          );
        })()
      );
    }
    

    return { BackupModal };
  }

  return { createBackupModal };
});
