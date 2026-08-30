/**
 * Authentication entry screen for login, registration, password recovery,
 * initial profile persistence, language selection, and theme selection.
 *
 * The UMD module exposes a `createLoginScreen` factory. The host injects React,
 * the real language and profile-validation contracts, seven named Firebase
 * operations from `firebase-storage.js`, `readPreferredDarkMode` from app.js,
 * and browser environment services. The configured component accepts only
 * `onLogin` and `onPendingVerification` and returns a React element tree.
 *
 * AUTHENTICATION-ROBUSTNESS BACKLOG DELIBERATELY PRESERVED: login theme state is
 * not synchronized back to App.darkMode; submit actions have no synchronous
 * double-click guard; registration writes have no transaction or rollback;
 * pending verification returns without resetting loading; and the local login
 * language can later be replaced by App.afterAuthenticated. Partial profile
 * write failures remain swallowed. Registration and birth-date bounds use the
 * shared local civil-date helper.
 * Any regression in this module can block entry to the entire product.
 *
 * @module LoginScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoginScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the login screen with application contracts and environment services supplied by the host.
   *
   * @param {Object} dependencies Injected login-screen dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host.
   * @param {Array<Object>} dependencies.languageOptions Real `LANGUAGE_OPTIONS` from `i18n.js`.
   * @param {function(string): string} dependencies.normalizeLanguage Language normalizer from `i18n.js`.
   * @param {function(string): boolean} dependencies.isValidBirthDate Birth-date validator from `profile-validation.js`.
   * @param {function(string): boolean} dependencies.isValidGender Gender validator from `profile-validation.js`.
   * @param {function(Object): Object} dependencies.ChoiceField Reusable Trofia list selector.
   * @param {function(Object): Object} dependencies.DateField Reusable Trofia civil-date selector.
   * @param {{signIn: function(string,string): Promise<*>, checkEmailVerified: function(): Promise<boolean>, signUp: function(string,string): Promise<*>, updateProfile: function(string): Promise<*>, setValue: function(string,*): Promise<*>, sendVerificationEmail: function(): Promise<*>, sendPasswordResetEmail: function(string): Promise<*>}} dependencies.authService Named Firebase authentication and persistence operations.
   * @param {function(): boolean} dependencies.readPreferredDarkMode Existing theme initializer from app.js.
   * @param {{getItem: function(string): (string|null), setItem: function(string,string): void}} dependencies.localStorage Browser-local storage service.
   * @param {{dataset: Object}} dependencies.documentElement Root document element whose theme dataset is written.
   * @param {function(new: Date, ...*): Date} dependencies.Date Native Date constructor supplied by the host.
   * @param {function(Date=): string} dependencies.localToday Shared local civil-date formatter.
   * @returns {{LoginScreen: function(Object): Object}} Configured login-screen component API.
   */
  function createLoginScreen({
    React,
    languageOptions,
    normalizeLanguage,
    isValidBirthDate,
    isValidGender,
    ChoiceField,
    DateField,
    authService,
    readPreferredDarkMode,
    localStorage: localStorageService,
    documentElement,
    Date: DateCtor,
    localToday
  }) {
    if (!React || typeof React.createElement !== "function" ||
        typeof React.useState !== "function" || typeof React.useEffect !== "function" ||
        !Array.isArray(languageOptions) || typeof normalizeLanguage !== "function" ||
        typeof isValidBirthDate !== "function" || typeof isValidGender !== "function" ||
        typeof ChoiceField !== "function" || typeof DateField !== "function" ||
        !authService || typeof authService.signIn !== "function" ||
        typeof authService.checkEmailVerified !== "function" ||
        typeof authService.signUp !== "function" || typeof authService.updateProfile !== "function" ||
        typeof authService.setValue !== "function" ||
        typeof authService.sendVerificationEmail !== "function" ||
        typeof authService.sendPasswordResetEmail !== "function" ||
        typeof readPreferredDarkMode !== "function" ||
        !localStorageService || typeof localStorageService.getItem !== "function" ||
        typeof localStorageService.setItem !== "function" ||
        !documentElement || !documentElement.dataset || typeof DateCtor !== "function" ||
        typeof localToday !== "function") {
      throw new TypeError("LoginScreen requires React, ChoiceField, DateField, i18n, profile validation, Firebase, theme, storage, document, and Date services");
    }

    const LANGUAGE_OPTIONS = languageOptions;
    const localStorage = localStorageService;
    const document = { documentElement };
    const Date = DateCtor;
    const fbSignIn = authService.signIn;
    const fbCheckEmailVerified = authService.checkEmailVerified;
    const fbSignUp = authService.signUp;
    const fbUpdateProfile = authService.updateProfile;
    const fbSet = authService.setValue;
    const fbSendVerificationEmail = authService.sendVerificationEmail;
    const fbSendPasswordResetEmail = authService.sendPasswordResetEmail;

    /**
     * Renders the complete authentication entry flow.
     *
     * @param {Object} props Login-screen callbacks.
     * @param {function(boolean): void} props.onLogin Continues after a verified login.
     * @param {function(string,string=): void} props.onPendingVerification Opens verification for login or registration.
     * @returns {Object} React element tree for login, registration, and password recovery.
     */
    function LoginScreen({onLogin, onPendingVerification}) {
      const [mode, setMode] = React.useState('login');
      const [email, setEmail] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [password2, setPassword2] = React.useState('');
      const [passwordVisible, setPasswordVisible] = React.useState(false);
      const [password2Visible, setPassword2Visible] = React.useState(false);
      const [error, setError] = React.useState('');
      const [resetMessage, setResetMessage] = React.useState('');
      const [loading, setLoading] = React.useState(false);
      const [resetLoading, setResetLoading] = React.useState(false);
      const [loginLang, setLoginLang] = React.useState(() => normalizeLanguage(localStorage.getItem('appLang') || 'pt'));
      const [regWeight, setRegWeight] = React.useState('');
      const [regHeight, setRegHeight] = React.useState('');
      const [regName, setRegName] = React.useState('');
      const [regBirthDate, setRegBirthDate] = React.useState('');
      const [regGender, setRegGender] = React.useState('');
      const [loginDark, setLoginDark] = React.useState(readPreferredDarkMode);
      React.useEffect(() => {
        document.documentElement.dataset.theme = loginDark ? 'dark' : 'light';
      }, [loginDark]);

      const normalizedLoginLang = normalizeLanguage(loginLang);
      const loginCopy = {
        pt: {
          title: 'Trofia', login: 'Entrar', register: 'Criar conta',
          subtitle: 'Acompanhe sua nutri\u00e7\u00e3o di\u00e1ria e alcance seus objetivos.',
          email: 'Email', password: 'Senha', confirm: 'Confirmar senha',
          showPassword: 'Mostrar senha', hidePassword: 'Ocultar senha',
          loginBtn: 'Entrar', registerBtn: 'Criar conta', processing: 'Processando...',
          forgotPassword: 'Esqueci minha senha', resetSending: 'Enviando...',
          resetSent: 'Se existir uma conta com esse e-mail, enviaremos as instru\u00e7\u00f5es de recupera\u00e7\u00e3o.',
          resetEmailRequired: 'Digite seu e-mail para recuperar a senha.',
          tabLogin: 'Entrar', tabRegister: 'Criar conta', name: 'Seu nome *', birthTitle: 'Data de nascimento *',
          genderPlaceholder: 'G\u00eanero *', choose: 'Selecionar', close: 'Fechar', weightPlaceholder: 'Peso (kg)', heightPlaceholder: 'Altura (cm)',
          male: 'Masculino', female: 'Feminino', errPrefix: 'Erro: ',
          errCredentials: 'Email ou senha incorretos.', errPassword: 'Senha incorreta.',
          errTooMany: 'Muitas tentativas. Tente novamente mais tarde.',
          errExists: 'Este email j\u00e1 tem uma conta. Entre.', errWeak: 'A senha deve ter pelo menos 6 caracteres.',
          errInvalid: 'Email inv\u00e1lido.', errMatch: 'As senhas n\u00e3o coincidem.', errShort: 'A senha deve ter pelo menos 6 caracteres.',
          errName: 'O nome \u00e9 obrigat\u00f3rio.', errBirth: 'A data de nascimento \u00e9 obrigat\u00f3ria e deve ser v\u00e1lida.',
          errGender: 'O g\u00eanero \u00e9 obrigat\u00f3rio.'
        },
        en: {
          title: 'Trofia', login: 'Sign in', register: 'Create account',
          subtitle: 'Track your daily nutrition and reach your goals.',
          email: 'Email', password: 'Password', confirm: 'Confirm password',
          showPassword: 'Show password', hidePassword: 'Hide password',
          loginBtn: 'Sign in', registerBtn: 'Create account', processing: 'Processing...',
          forgotPassword: 'Forgot password?', resetSending: 'Sending...',
          resetSent: 'If an account exists for this email, password recovery instructions will be sent.',
          resetEmailRequired: 'Enter your email to recover your password.',
          tabLogin: 'Sign in', tabRegister: 'Create account', name: 'Your name *', birthTitle: 'Date of birth *',
          genderPlaceholder: 'Gender *', choose: 'Select', close: 'Close', weightPlaceholder: 'Weight (kg)', heightPlaceholder: 'Height (cm)',
          male: 'Male', female: 'Female', errPrefix: 'Error: ',
          errCredentials: 'Incorrect email or password.', errPassword: 'Incorrect password.',
          errTooMany: 'Too many attempts. Try again later.', errExists: 'This email already has an account. Sign in instead.',
          errWeak: 'Password must be at least 6 characters.', errInvalid: 'Invalid email.', errMatch: "Passwords don't match.",
          errShort: 'Password must be at least 6 characters.', errName: 'Name is required.',
          errBirth: 'Date of birth is required and must be valid.', errGender: 'Gender is required.'
        },
        es: {
          title: 'Trofia', login: 'Iniciar sesi\u00f3n', register: 'Crear cuenta',
          subtitle: 'Registra tu nutrici\u00f3n diaria y avanza hacia tus objetivos.',
          email: 'Email', password: 'Contrase\u00f1a', confirm: 'Confirmar contrase\u00f1a',
          showPassword: 'Mostrar contrase\u00f1a', hidePassword: 'Ocultar contrase\u00f1a',
          loginBtn: 'Entrar', registerBtn: 'Crear cuenta', processing: 'Procesando...',
          forgotPassword: 'Olvid\u00e9 mi contrase\u00f1a', resetSending: 'Enviando...',
          resetSent: 'Si existe una cuenta con este email, enviaremos las instrucciones de recuperaci\u00f3n.',
          resetEmailRequired: 'Escribe tu email para recuperar la contrase\u00f1a.',
          tabLogin: 'Entrar', tabRegister: 'Crear cuenta', name: 'Tu nombre *', birthTitle: 'Fecha de nacimiento *',
          genderPlaceholder: 'G\u00e9nero *', choose: 'Seleccionar', close: 'Cerrar', weightPlaceholder: 'Peso (kg)', heightPlaceholder: 'Altura (cm)',
          male: 'Masculino', female: 'Femenino', errPrefix: 'Error: ',
          errCredentials: 'Email o contrase\u00f1a incorrectos.', errPassword: 'Contrase\u00f1a incorrecta.',
          errTooMany: 'Demasiados intentos. Int\u00e9ntalo m\u00e1s tarde.', errExists: 'Este email ya tiene una cuenta. Inicia sesi\u00f3n.',
          errWeak: 'La contrase\u00f1a debe tener al menos 6 caracteres.', errInvalid: 'Email inv\u00e1lido.', errMatch: 'Las contrase\u00f1as no coinciden.',
          errShort: 'La contrase\u00f1a debe tener al menos 6 caracteres.', errName: 'El nombre es obligatorio.',
          errBirth: 'La fecha de nacimiento es obligatoria y debe ser v\u00e1lida.', errGender: 'El g\u00e9nero es obligatorio.'
        }
      };
      const S = loginCopy[normalizedLoginLang] || loginCopy.pt;
      const dateCopy = normalizedLoginLang === 'en'
        ? {title:'Choose date of birth',previousMonth:'Previous month',nextMonth:'Next month',editMonthYear:'Choose month and year',previousYear:'Previous year',nextYear:'Next year',editYear:'Type year',showDays:'Show days',cancel:'Cancel',confirm:'Confirm',close:'Back',backspace:'Delete digit',invalidYear:'Enter a year from 1900 to today.'}
        : normalizedLoginLang === 'es'
          ? {title:'Elegir fecha de nacimiento',previousMonth:'Mes anterior',nextMonth:'Mes siguiente',editMonthYear:'Elegir mes y a\u00f1o',previousYear:'A\u00f1o anterior',nextYear:'A\u00f1o siguiente',editYear:'Escribir a\u00f1o',showDays:'Mostrar d\u00edas',cancel:'Cancelar',confirm:'Confirmar',close:'Volver',backspace:'Borrar d\u00edgito',invalidYear:'Introduce un a\u00f1o entre 1900 y hoy.'}
          : {title:'Escolher data de nascimento',previousMonth:'M\u00eas anterior',nextMonth:'Pr\u00f3ximo m\u00eas',editMonthYear:'Escolher m\u00eas e ano',previousYear:'Ano anterior',nextYear:'Pr\u00f3ximo ano',editYear:'Digitar ano',showDays:'Mostrar dias',cancel:'Cancelar',confirm:'Confirmar',close:'Voltar',backspace:'Apagar d\u00edgito',invalidYear:'Digite um ano entre 1900 e hoje.'};
      const dateLocale = normalizedLoginLang === 'en' ? 'en-US' : normalizedLoginLang === 'es' ? 'es-ES' : 'pt-BR';

      function toggleLoginDark() {
        setLoginDark(d => {
          const next = !d;
          localStorage.setItem('appDarkMode', String(next));
          return next;
        });
      }

      function setLoginLanguage(nextLang) {
        const normalized = normalizeLanguage(nextLang);
        localStorage.setItem('appLang', normalized);
        setLoginLang(normalized);
      }

      function friendlyError(msg) {
        const raw = String(msg || '');
        if (raw.includes('EMAIL_NOT_FOUND') || raw.includes('INVALID_LOGIN_CREDENTIALS') || raw.includes('INVALID_EMAIL')) return S.errCredentials;
        if (raw.includes('WRONG_PASSWORD')) return S.errPassword;
        if (raw.includes('TOO_MANY_ATTEMPTS')) return S.errTooMany;
        if (raw.includes('EMAIL_EXISTS')) return S.errExists;
        if (raw.includes('WEAK_PASSWORD')) return S.errWeak;
        return S.errPrefix + raw;
      }

      async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setResetMessage('');
        if (mode === 'register' && password !== password2) { setError(S.errMatch); return; }
        if (mode === 'register' && password.length < 6) { setError(S.errShort); return; }
        setLoading(true);
        try {
          if (mode === 'login') {
            await fbSignIn(email, password);
            const verified = await fbCheckEmailVerified();
            if (!verified) { onPendingVerification(email); return; }
            onLogin(false);
          } else {
            if (!regName.trim()) { setError(S.errName); setLoading(false); return; }
            if (!isValidBirthDate(regBirthDate)) { setError(S.errBirth); setLoading(false); return; }
            if (!isValidGender(regGender)) { setError(S.errGender); setLoading(false); return; }
            await fbSignUp(email, password);
            localStorage.setItem('fb_email', email);
            await fbUpdateProfile(regName.trim()).catch(()=>{});
            const today = localToday(new Date());
            if (regWeight || regHeight) {
              const entry = {
                id: Date.now().toString(),
                date: today,
                weight: regWeight ? parseFloat(regWeight) : null,
                height: regHeight ? parseFloat(regHeight) : null
              };
              await fbSet('weightHistory', JSON.stringify([entry])).catch(()=>{});
            }
            await fbSet('userName', regName.trim()).catch(()=>{});
            await fbSet('birthDate', regBirthDate).catch(()=>{});
            await fbSet('gender', regGender).catch(()=>{});
            await fbSet('language', normalizedLoginLang).catch(()=>{});
            await fbSendVerificationEmail();
            onPendingVerification(email, regName.trim());
          }
        } catch(err) {
          setError(friendlyError(err.message));
        }
        setLoading(false);
      }

      /**
       * Sends a Firebase password reset request without exposing whether the email
       * exists. Reads the current email input and writes a local status message.
       */
      async function handlePasswordReset() {
        const cleanEmail = String(email || '').trim();
        setError('');
        setResetMessage('');
        if (!cleanEmail) { setError(S.resetEmailRequired); return; }
        setResetLoading(true);
        try {
          await fbSendPasswordResetEmail(cleanEmail);
          setResetMessage(S.resetSent);
        } catch (err) {
          if (String(err.message || '').includes('EMAIL_NOT_FOUND')) setResetMessage(S.resetSent);
          else setError(friendlyError(err.message));
        } finally {
          setResetLoading(false);
        }
      }

      function switchMode(m) {
        setMode(m);
        setError('');
        setResetMessage('');
        setPassword('');
        setPassword2('');
        setPasswordVisible(false);
        setPassword2Visible(false);
      }

      const inp = {width:'100%',background:'var(--input)',border:'1px solid var(--border2)',color:'var(--text)',padding:'12px 14px',borderRadius:8,fontSize:15,fontFamily:'inherit',boxSizing:'border-box',outline:'none',marginBottom:12};
      function renderPasswordInput({value, onChange, placeholder, visible, onToggle, autoComplete, marginBottom, testId}) {
        const visibilityLabel = visible ? S.hidePassword : S.showPassword;
        return React.createElement('div', {style:{position:'relative',marginBottom}},
          React.createElement('input', {
            type:visible?'text':'password', value, onChange, placeholder, required:true,
            style:{...inp,marginBottom:0,paddingRight:48}, autoComplete
          }),
          React.createElement('button', {
            type:'button', onClick:onToggle, 'aria-label':visibilityLabel, title:visibilityLabel,
            'aria-pressed':visible, 'data-testid':testId,
            style:{position:'absolute',right:3,top:3,bottom:3,width:40,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',color:'var(--muted)',borderRadius:6,cursor:'pointer',padding:0}
          }, React.createElement('svg', {
            width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true'
          },
            React.createElement('path', {d:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z'}),
            React.createElement('circle', {cx:12,cy:12,r:3}),
            visible ? React.createElement('path', {d:'M4 4l16 16'}) : null
          ))
        );
      }
      const tabStyle = active => ({flex:1,padding:'10px',background:'none',border:'none',borderBottom:active?'2px solid var(--btn-ok-text,#4a9a4a)':'2px solid var(--border2)',color:active?'var(--btn-ok-text,#4a9a4a)':'var(--muted)',fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'});
      const loginTheme = loginDark
        ? {'--bg':'#111','--surface':'#161616','--input':'#1e1e1e','--border2':'#2a2a2a','--text':'#e8e0d5','--text3':'#c9bfb0','--muted':'#8a8a8a','--btn-ok':'#1e2e1e','--btn-ok-border':'#3a5a3a','--btn-ok-text':'#7ec87e','--btn-info':'#1a1e2a','--btn-info-border':'#3a3a6a','--btn-info-text':'#8a9ec8','--btn-inactive':'#191919','--btn-warn-text':'#c87e7e'}
        : {'--bg':'#f2f1ed','--surface':'#ffffff','--input':'#f5f3ef','--border2':'#b8b4ac','--text':'#252220','--text3':'#3a3733','--muted':'#6a6662','--btn-ok':'#e8f4e8','--btn-ok-border':'#a8cfa8','--btn-ok-text':'#2a6a2a','--btn-info':'#e8eaf4','--btn-info-border':'#a8aed0','--btn-info-text':'#3a4a8a','--btn-inactive':'#ede9e3','--btn-warn-text':'#8a2a2a'};
      const loginVars = Object.assign({position:'fixed',inset:0,background:loginDark?'#111':'#f2f1ed',display:'flex',alignItems:'center',justifyContent:'center',padding:24,zIndex:99999}, loginTheme);

      return React.createElement('div', {'data-safe-area-dialog':'24', style: loginVars},
        React.createElement('div', {style:{width:'100%',maxWidth:380}},
          React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:16}},
            React.createElement('button', {onClick:toggleLoginDark, style:{background:'none',border:'1px solid var(--border2)',color:'var(--muted)',borderRadius:6,padding:'5px 10px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}, loginDark ? '\u2600' : '\u263e'),
            React.createElement('div', {style:{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}},
              LANGUAGE_OPTIONS.map(option => React.createElement('button', {
                key: option.code,
                onClick:()=>setLoginLanguage(option.code),
                style:{background:option.code===normalizedLoginLang?'var(--btn-info)':'none',border:'1px solid var(--border2)',color:option.code===normalizedLoginLang?'var(--btn-info-text)':'var(--muted)',borderRadius:6,padding:'5px 8px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}
              }, option.flag + ' ' + option.short))
            )
          ),
          React.createElement('div', {style:{textAlign:'center',marginBottom:32}},
            React.createElement('div', {style:{fontSize:11,letterSpacing:1,color:'var(--muted)',textTransform:'uppercase',marginBottom:6}}, S.title),
            React.createElement('div', {style:{fontSize:22,color:'var(--text3)',fontWeight:400,marginBottom:8}}, mode === 'login' ? S.login : S.register),
            mode === 'login' && React.createElement('p', {style:{fontSize:13,color:'var(--muted)',margin:0,lineHeight:1.5}}, S.subtitle)
          ),
          React.createElement('div', {style:{display:'flex',marginBottom:28,borderBottom:'2px solid var(--border2)'}},
            React.createElement('button', {onClick:()=>switchMode('login'), style:tabStyle(mode==='login')}, S.tabLogin),
            React.createElement('button', {onClick:()=>switchMode('register'), style:tabStyle(mode==='register')}, S.tabRegister)
          ),
          React.createElement('form', {onSubmit:handleSubmit},
            React.createElement('input', {type:'email',value:email,onChange:e=>setEmail(e.target.value),placeholder:S.email,required:true,style:inp,autoComplete:'email'}),
            renderPasswordInput({value:password,onChange:e=>setPassword(e.target.value),placeholder:S.password,visible:passwordVisible,onToggle:()=>setPasswordVisible(visible=>!visible),autoComplete:mode==='login'?'current-password':'new-password',marginBottom:mode==='register'?12:error?8:20,testId:'password-visibility'}),
            mode === 'login' && React.createElement('button', {type:'button',onClick:handlePasswordReset,disabled:resetLoading || loading,style:{width:'100%',background:'none',border:'none',color:'var(--btn-info-text)',cursor:(resetLoading||loading)?'default':'pointer',fontSize:12,fontFamily:'inherit',textAlign:'right',padding:'0 2px 14px',opacity:(resetLoading||loading)?0.65:1}}, resetLoading ? S.resetSending : S.forgotPassword),
            mode === 'register' && renderPasswordInput({value:password2,onChange:e=>setPassword2(e.target.value),placeholder:S.confirm,visible:password2Visible,onToggle:()=>setPassword2Visible(visible=>!visible),autoComplete:'new-password',marginBottom:12,testId:'password-confirmation-visibility'}),
            mode === 'register' && React.createElement('input', {type:'text',value:regName,onChange:e=>setRegName(e.target.value),placeholder:S.name,style:{...inp,marginBottom:12},autoComplete:'name'}),
            mode === 'register' && React.createElement(DateField, {
              id:'registration-birth-date',label:S.birthTitle,value:regBirthDate,onChange:setRegBirthDate,
              min:'1900-01-01',max:localToday(new Date()),locale:dateLocale,
              initialViewYear:new Date().getFullYear()-18,strings:dateCopy,style:{marginBottom:12}
            }),
            mode === 'register' && React.createElement(ChoiceField, {
              id:'registration-gender', label:S.genderPlaceholder, value:regGender,
              onChange:setRegGender, placeholder:S.choose, closeLabel:S.close, required:true,
              options:[{value:'male',label:S.male},{value:'female',label:S.female}],
              style:{marginBottom:12}
            }),
            mode === 'register' && React.createElement('div', {style:{display:'flex',gap:8,marginBottom:error?8:20}},
              React.createElement('input', {type:'number',value:regWeight,onChange:e=>setRegWeight(e.target.value),placeholder:S.weightPlaceholder,min:30,max:300,step:0.1,style:{...inp,marginBottom:0,flex:1}}),
              React.createElement('input', {type:'number',value:regHeight,onChange:e=>setRegHeight(e.target.value),placeholder:S.heightPlaceholder,min:100,max:250,style:{...inp,marginBottom:0,flex:1}})
            ),
            error && React.createElement('div', {style:{color:'#c87e7e',fontSize:12,marginBottom:16,padding:'8px 12px',background:'rgba(200,80,80,0.1)',borderRadius:6,border:'1px solid rgba(200,80,80,0.2)'}}, error),
            resetMessage && React.createElement('div', {style:{color:'var(--btn-ok-text)',fontSize:12,marginBottom:16,padding:'8px 12px',background:'rgba(80,160,80,0.1)',borderRadius:6,border:'1px solid var(--btn-ok-border)',lineHeight:1.4}}, resetMessage),
            React.createElement('button', {type:'submit',disabled:loading,style:{width:'100%',background:loading?'var(--btn-inactive)':mode==='login'?'var(--btn-ok)':'var(--btn-info)',border:'1px solid ' + (mode==='login'?'var(--btn-ok-border)':'var(--btn-info-border)'),color:loading?'var(--muted)':mode==='login'?'var(--btn-ok-text)':'var(--btn-info-text)',padding:'13px',borderRadius:8,fontSize:12,letterSpacing:1,textTransform:'uppercase',cursor:loading?'default':'pointer',fontFamily:'inherit',transition:'all 0.2s'}}, loading ? S.processing : mode==='login' ? S.loginBtn : S.registerBtn)
          )
        )
      );
    }

    return { LoginScreen };
  }

  return { createLoginScreen };
});
