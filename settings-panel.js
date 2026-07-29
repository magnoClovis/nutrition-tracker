/**
 * Settings panel for appearance, language, data tools, local AI credentials,
 * feedback, and account logout.
 *
 * The UMD module exposes a `createSettingsPanel` factory. The host injects its
 * React runtime, the real language contracts from `i18n.js`, a browser-like
 * local-storage service, the Firebase sign-out service, and a URL-opening
 * service. The component receives callbacks and current UI settings through
 * props and returns a React element tree.
 *
 * Local persistence contract: `groq_key` and `cors_proxy` remain browser-only
 * localStorage keys. Logout calls the injected sign-out service first, tolerates
 * its errors, then invokes `onLogout` and `onClose` in that order. The host's
 * current `onLogout` implementation signs out again; this intentional duplicate
 * call is preserved as an explicitly documented compatibility behavior.
 *
 * @module SettingsPanel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SettingsPanelModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the settings panel with UI, localization, and environmental services supplied by the host.
   *
   * @param {Object} dependencies Injected settings-panel dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host.
   * @param {Array<Object>} dependencies.languageOptions Real `LANGUAGE_OPTIONS` from `i18n.js`.
   * @param {function(string): string} dependencies.normalizeLanguage Language normalizer from `i18n.js`.
   * @param {function(string): Object} dependencies.getLanguageOption Language descriptor reader from `i18n.js`.
   * @param {function(string, *, *, *): *} dependencies.pickLang Language selector from `i18n.js`.
   * @param {{getItem: function(string): (string|null), setItem: function(string, string): void}} dependencies.localStorage Browser-local storage service.
   * @param {function(): (*|Promise<*>)} dependencies.signOut Firebase sign-out service from `firebase-storage.js`.
   * @param {function(string, string, string): *} dependencies.openUrl Browser URL-opening service, normally bound `window.open`.
   * @returns {{SettingsPanel: function(Object): Object}} Configured settings-panel component API.
   */
  function createSettingsPanel({
    React,
    languageOptions,
    normalizeLanguage,
    getLanguageOption,
    pickLang,
    localStorage: localStorageService,
    signOut,
    openUrl
  }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function" ||
        !Array.isArray(languageOptions) || typeof normalizeLanguage !== "function" ||
        typeof getLanguageOption !== "function" || typeof pickLang !== "function" ||
        !localStorageService || typeof localStorageService.getItem !== "function" ||
        typeof localStorageService.setItem !== "function" || typeof signOut !== "function" ||
        typeof openUrl !== "function") {
      throw new TypeError("SettingsPanel requires React, i18n, localStorage, signOut, and openUrl dependencies");
    }

    const LANGUAGE_OPTIONS = languageOptions;
    const localStorage = localStorageService;
    const fbSignOut = signOut;
    const window = { open: openUrl };

    /**
     * Renders settings and delegates application actions through explicit callbacks.
     *
     * @param {Object} props Settings-panel props.
     * @param {function(): void} props.onClose Closes the panel.
     * @param {function(): void} props.onLogout Runs the host logout state transition.
     * @param {function(): void} props.onOpenBackup Opens backup and restore.
     * @param {function(): void} props.onOpenPrivacy Opens privacy and security.
     * @param {string} props.lang Active application language.
     * @param {boolean} props.darkMode Whether dark mode is active.
     * @param {function(string): void} props.toggleLang Changes the active language.
     * @param {function(): void} props.toggleDark Toggles the active color mode.
     * @param {boolean} props.directKey Whether to open directly on the AI-key editor.
     * @param {function(Object): function(): void} [props.registerBackHandler] Registers nested Android Back handling.
     * @param {number} [props.backHandlerPriority] Dispatcher priority for the nested handler.
     * @returns {Object} React element tree for the settings panel.
     */
    function SettingsPanel({
      onClose,
      onLogout,
      onOpenBackup,
      onOpenPrivacy,
      lang,
      darkMode,
      toggleLang,
      toggleDark,
      directKey,
      registerBackHandler,
      backHandlerPriority
    }) {
      const [showKey, setShowKey] = React.useState(!!directKey);
      const [showFeedbackConfirm, setShowFeedbackConfirm] = React.useState(false);
      const [languageMenuOpen, setLanguageMenuOpen] = React.useState(false);
      const [groqKey, setGroqKey] = React.useState(()=>localStorage.getItem('groq_key')||'');
      const [proxy, setProxy] = React.useState(()=>localStorage.getItem('cors_proxy')||'');
    
      const normalizedLang = normalizeLanguage(lang || 'pt');
      const currentLanguage = getLanguageOption(normalizedLang);
      const feedbackFormUrl = normalizedLang === 'pt'
        ? 'https://forms.gle/KYg6WKRDzgWkKC5U7'
        : 'https://forms.gle/4WUAXiWHAWd5vJ94A';
    
      const S = {
        title: pickLang(normalizedLang, 'Configura\u00e7\u00f5es', 'Settings', 'Configuraci\u00f3n'),
        appearance: pickLang(normalizedLang, 'Apar\u00eancia', 'Appearance', 'Apariencia'),
        languageTitle: pickLang(normalizedLang, 'Idioma', 'Language', 'Idioma'),
        languageHint: pickLang(normalizedLang, 'Escolha o idioma da interface.', 'Choose the interface language.', 'Elige el idioma de la interfaz.'),
        darkMode: darkMode
          ? pickLang(normalizedLang, 'Modo claro', 'Light mode', 'Modo claro')
          : pickLang(normalizedLang, 'Modo escuro', 'Dark mode', 'Modo oscuro'),
        data: pickLang(normalizedLang, 'Dados', 'Data', 'Datos'),
        backup: pickLang(normalizedLang, 'Backup e restaurar', 'Backup & restore', 'Copia de seguridad y restauraci\u00f3n'),
        privacy: pickLang(normalizedLang, 'Privacidade e seguran\u00e7a', 'Privacy & security', 'Privacidad y seguridad'),
        intelligence: pickLang(normalizedLang, 'Intelig\u00eancia', 'Intelligence', 'Inteligencia'),
        apiKey: pickLang(normalizedLang, 'IA / Chave de API (avan\u00e7ado)', 'AI / API key (advanced)', 'IA / Clave API (avanzado)'),
        aiHint: pickLang(
          normalizedLang,
          'Habilita as fun\u00e7\u00f5es com \u2726, como an\u00e1lises e preenchimento por IA.',
          'Enables \u2726 features such as AI analysis and automatic filling.',
          'Activa las funciones con \u2726, como an\u00e1lisis y relleno con IA.'
        ),
        feedbackSupport: pickLang(normalizedLang, 'Feedback e suporte', 'Feedback & support', 'Comentarios y soporte'),
        feedbackLabel: pickLang(normalizedLang, 'Enviar feedback / reportar erro', 'Send feedback / report a bug', 'Enviar comentarios / reportar error'),
        feedbackHint: pickLang(normalizedLang, 'Abre um formul\u00e1rio em uma nova aba.', 'Opens a form in a new tab.', 'Abre un formulario en una nueva pesta\u00f1a.'),
        feedbackTitle: pickLang(normalizedLang, 'Enviar feedback', 'Send feedback', 'Enviar comentarios'),
        feedbackMessage: pickLang(
          normalizedLang,
          'Voc\u00ea ser\u00e1 redirecionado para um Google Forms em uma nova aba. Use o formul\u00e1rio para enviar sugest\u00f5es, reportar erros ou anexar imagens.',
          'You will be redirected to a Google Forms page in a new tab. Use the form to send suggestions, report bugs, or attach screenshots.',
          'Se abrir\u00e1 Google Forms en una nueva pesta\u00f1a. Usa el formulario para enviar sugerencias, reportar errores o adjuntar capturas.'
        ),
        feedbackCancel: pickLang(normalizedLang, 'Cancelar', 'Cancel', 'Cancelar'),
        feedbackOpen: pickLang(normalizedLang, 'Abrir formul\u00e1rio', 'Open form', 'Abrir formulario'),
        account: pickLang(normalizedLang, 'Conta', 'Account', 'Cuenta'),
        logout: pickLang(normalizedLang, 'Sair da conta', 'Sign out', 'Cerrar sesi\u00f3n'),
        save: pickLang(normalizedLang, 'Salvar', 'Save', 'Guardar'),
        keyLabel: pickLang(normalizedLang, 'Chave API Groq', 'Groq API Key', 'Clave API de Groq'),
        keyHint: pickLang(
          normalizedLang,
          'Cole aqui sua chave da Groq. Ela fica salva apenas neste navegador.',
          'Paste your Groq key here. It is stored only in this browser.',
          'Pega aqu\u00ed tu clave de Groq. Se guarda solo en este navegador.'
        ),
        proxyLabel: pickLang(normalizedLang, 'Proxy CORS (opcional)', 'CORS proxy (optional)', 'Proxy CORS (opcional)'),
        proxyHint: pickLang(
          normalizedLang,
          'Use somente se os recursos de IA falharem por bloqueio de CORS.',
          'Use only if AI features fail because of CORS blocking.',
          '\u00dasalo solo si las funciones de IA fallan por bloqueo CORS.'
        )
      };
    
      function closeKey() { directKey ? onClose() : setShowKey(false); }
      function saveKey() {
        localStorage.setItem('groq_key', groqKey);
        localStorage.setItem('cors_proxy', proxy);
        closeKey();
      }
      async function doLogout() {
        try {
          await Promise.resolve(fbSignOut());
        } catch (_) {}
        onLogout();
        onClose();
      }
      function openFeedbackForm() {
        window.open(feedbackFormUrl, '_blank', 'noopener,noreferrer');
        setShowFeedbackConfirm(false);
        onClose();
      }
      function chooseLanguage(code) {
        toggleLang(code);
        setLanguageMenuOpen(false);
      }

      const nestedBackStateRef = React.useRef(null);
      nestedBackStateRef.current = () => {
        if (showFeedbackConfirm) {
          setShowFeedbackConfirm(false);
          return true;
        }
        if (showKey) {
          closeKey();
          return true;
        }
        if (languageMenuOpen) {
          setLanguageMenuOpen(false);
          return true;
        }
        return false;
      };
      React.useEffect(() => {
        if (typeof registerBackHandler !== 'function') return undefined;
        return registerBackHandler({
          id: 'settings-panel',
          priority: Number(backHandlerPriority) || 0,
          handler: () => nestedBackStateRef.current(),
        });
      }, [registerBackHandler, backHandlerPriority]);
    
      const inp = {width:'100%',background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',padding:'11px 12px',borderRadius:8,fontSize:13,boxSizing:'border-box',outline:'none',fontFamily:'inherit'};
    
      const sectionTitle = label => React.createElement('div', {
        style:{padding:'16px 20px 6px',fontSize:11,letterSpacing:2,textTransform:'uppercase',color:'var(--muted)',fontWeight:700}
      }, label);
    
      const rowBtn = (label, onClick, danger, hint, leading) => React.createElement('button', {onClick, style:{
        display:'flex',alignItems:'center',gap:12,width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border2)',
        color:danger?'var(--btn-warn-text)':'var(--text2)',padding:'15px 20px',fontSize:14,cursor:'pointer',fontFamily:'inherit',textAlign:'left'
      }},
        leading ? React.createElement('span', {style:{fontSize:17,width:22,textAlign:'center',flex:'0 0 22px'}}, leading) : null,
        React.createElement('span', {style:{flex:1}},
          React.createElement('span', null, label),
          hint ? React.createElement('span', {style:{display:'block',fontSize:12,color:'var(--muted)',marginTop:4,lineHeight:1.35}}, hint) : null
        )
      );
    
      const languageButton = React.createElement('div', {style:{borderTop:'1px solid var(--border2)',padding:'0 20px 12px'}},
        React.createElement('button', {
          onClick:()=>setLanguageMenuOpen(open=>!open),
          style:{width:'100%',display:'flex',alignItems:'center',gap:12,background:'none',border:'none',color:'var(--text2)',padding:'15px 0 8px',fontSize:14,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}
        },
          React.createElement('span', {style:{fontSize:18,width:24,textAlign:'center'}}, currentLanguage.flag),
          React.createElement('span', {style:{flex:1}},
            React.createElement('span', null, S.languageTitle + ': ' + currentLanguage.label),
            React.createElement('span', {style:{display:'block',fontSize:12,color:'var(--muted)',marginTop:4,lineHeight:1.35}}, S.languageHint)
          ),
          React.createElement('span', {style:{transform:languageMenuOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform 160ms ease'}}, '\u25be')
        ),
        React.createElement('div', {style:{
          overflow:'hidden',maxHeight:languageMenuOpen?170:0,opacity:languageMenuOpen?1:0,transform:languageMenuOpen?'translateY(0)':'translateY(-4px)',
          transition:'max-height 180ms ease, opacity 160ms ease, transform 160ms ease',border:languageMenuOpen?'1px solid var(--border2)':'1px solid transparent',borderRadius:10,background:'var(--bg)'
        }},
          LANGUAGE_OPTIONS.map(option => React.createElement('button', {
            key: option.code,
            onClick:()=>chooseLanguage(option.code),
            style:{width:'100%',display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',background:option.code===normalizedLang?'var(--btn-ok)':'transparent',border:'none',borderTop:'1px solid var(--border2)',color:option.code===normalizedLang?'var(--btn-ok-text)':'var(--text2)',padding:'11px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:13,textAlign:'left'}
          },
            React.createElement('span', null, option.flag + ' ' + option.label),
            option.code === normalizedLang ? React.createElement('span', null, '\u2713') : null
          ))
        )
      );
    
      if (showKey) return React.createElement('div', {'data-safe-area-dialog':'20', style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.94)',zIndex:10002,display:'flex',alignItems:'center',justifyContent:'center',padding:20}},
        React.createElement('div', {style:{background:'var(--surface,#fff)',borderRadius:14,width:'100%',maxWidth:400,padding:24,border:'1px solid var(--border2)'}},
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}},
            React.createElement('span',{style:{fontSize:11,letterSpacing:1,color:'var(--muted)',textTransform:'uppercase'}}, S.keyLabel),
            React.createElement('button',{onClick:closeKey,style:{background:'none',border:'none',color:'var(--text2)',fontSize:22,cursor:'pointer',lineHeight:1}},'x')
          ),
          React.createElement('input',{type:'text',value:groqKey,onChange:e=>setGroqKey(e.target.value),placeholder:'gsk_...',style:{...inp,fontFamily:'monospace',fontSize:11,marginBottom:4}}),
          React.createElement('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:14}},S.keyHint),
          React.createElement('input',{type:'text',value:proxy,onChange:e=>setProxy(e.target.value),placeholder:'https://corsproxy.io/?',style:{...inp,marginBottom:4}}),
          React.createElement('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:20}},S.proxyLabel + ' - ' + S.proxyHint),
          React.createElement('button',{onClick:saveKey,style:{width:'100%',background:'var(--btn-ok)',border:'1px solid var(--btn-ok-border)',color:'var(--btn-ok-text)',padding:'12px',borderRadius:8,fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}, S.save)
        )
      );
    
      return React.createElement(React.Fragment, null,
        React.createElement('div', {onClick:onClose, style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'flex-end'}},
          React.createElement('div', {'data-safe-area-sheet':'true', onClick:e=>e.stopPropagation(), style:{background:'var(--surface,#fff)',borderRadius:'18px 18px 0 0',width:'100%',maxHeight:'86vh',paddingBottom:'calc(20px + var(--app-safe-bottom))',overflowY:'auto',boxShadow:'0 -4px 40px rgba(0,0,0,0.6)'}},
            React.createElement('div',{style:{textAlign:'center',padding:'14px 0 4px',cursor:'pointer'},onClick:onClose},
              React.createElement('div',{style:{width:32,height:4,background:'var(--border2)',borderRadius:2,margin:'0 auto'}})
            ),
            React.createElement('div',{style:{paddingBottom:8}},
              sectionTitle(S.appearance),
              languageButton,
              rowBtn(S.darkMode, toggleDark, false, null, darkMode ? '\u2600' : '\u263e'),
              sectionTitle(S.data),
              rowBtn(S.backup, ()=>{onClose(); onOpenBackup && onOpenBackup();}, false, null, '\ud83d\udcbe'),
              rowBtn(S.privacy, ()=>{onClose(); onOpenPrivacy && onOpenPrivacy();}, false, null, '\ud83d\udd12'),
              sectionTitle(S.intelligence),
              rowBtn(S.apiKey, ()=>setShowKey(true), false, S.aiHint, '\ud83d\udd11'),
              sectionTitle(S.feedbackSupport),
              rowBtn(S.feedbackLabel, ()=>setShowFeedbackConfirm(true), false, S.feedbackHint, '\ud83d\udcac'),
              sectionTitle(S.account),
              rowBtn(S.logout, doLogout, true, null, '\u23fb')
            )
          )
        ),
        showFeedbackConfirm ? React.createElement('div', {
          'data-safe-area-dialog':'20',
          onClick:()=>setShowFeedbackConfirm(false),
          style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:10001,display:'flex',alignItems:'center',justifyContent:'center',padding:20}
        },
          React.createElement('div', {
            onClick:e=>e.stopPropagation(),
            style:{background:'var(--surface,#fff)',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:14,width:'100%',maxWidth:420,padding:22,boxShadow:'0 18px 60px rgba(0,0,0,0.35)'}
          },
            React.createElement('div', {style:{fontSize:13,letterSpacing:2,textTransform:'uppercase',color:'var(--text2)',marginBottom:12}}, S.feedbackTitle),
            React.createElement('div', {style:{fontSize:14,lineHeight:1.5,color:'var(--muted)',marginBottom:20}}, S.feedbackMessage),
            React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}},
              React.createElement('button', {onClick:()=>setShowFeedbackConfirm(false), style:{background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text2)',borderRadius:8,padding:'12px 10px',fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}, S.feedbackCancel),
              React.createElement('button', {onClick:openFeedbackForm, style:{background:'var(--btn-ok)',border:'1px solid var(--btn-ok-border)',color:'var(--btn-ok-text)',borderRadius:8,padding:'12px 10px',fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}, S.feedbackOpen)
            )
          )
        ) : null
      );
    }

    return { SettingsPanel };
  }

  return { createSettingsPanel };
});

