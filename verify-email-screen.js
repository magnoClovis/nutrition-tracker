/**
 * Email-verification screen for the Trofia authentication flow.
 *
 * The UMD module exposes a `createVerifyEmailScreen` factory. The host injects
 * React, named Firebase authentication services from `firebase-storage.js`,
 * browser-local storage, and interval services. The configured component takes
 * user/display props and returns a React element tree.
 *
 * COMPATIBILITY CONTRACT: language selection intentionally remains binary. Only
 * the exact `en` value uses English; Spanish and every other non-English value
 * use Portuguese. A truthy `lang` prop takes precedence over the persisted
 * `appLang` value. Polling remains fixed at 5000 ms, with the `active` guard and
 * interval cleanup order preserved. The currently unused `checking` state is
 * retained as known cleanup debt so this extraction does not alter behavior.
 *
 * @module VerifyEmailScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.VerifyEmailScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the verification screen with runtime and environmental services supplied by the host.
   *
   * @param {Object} dependencies Injected verification-screen dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host.
   * @param {{checkEmailVerified: function(): Promise<boolean>, sendVerificationEmail: function(): Promise<void>}} dependencies.authService Named Firebase authentication services from `firebase-storage.js`.
   * @param {{getItem: function(string): (string|null)}} dependencies.localStorage Browser-local storage service.
   * @param {{setInterval: function(function(): void, number): *, clearInterval: function(*): void}} dependencies.timers Browser interval services.
   * @returns {{VerifyEmailScreen: function(Object): Object}} Configured verification-screen component API.
   */
  function createVerifyEmailScreen({
    React,
    authService,
    localStorage: localStorageService,
    timers
  }) {
    if (!React || typeof React.createElement !== "function" ||
        typeof React.useState !== "function" || typeof React.useEffect !== "function" ||
        !authService || typeof authService.checkEmailVerified !== "function" ||
        typeof authService.sendVerificationEmail !== "function" ||
        !localStorageService || typeof localStorageService.getItem !== "function" ||
        !timers || typeof timers.setInterval !== "function" ||
        typeof timers.clearInterval !== "function") {
      throw new TypeError("VerifyEmailScreen requires React, authentication, localStorage, and timer services");
    }

    const localStorage = localStorageService;
    const fbCheckEmailVerified = authService.checkEmailVerified;
    const fbSendVerificationEmail = authService.sendVerificationEmail;
    const setInterval = timers.setInterval;
    const clearInterval = timers.clearInterval;

    /**
     * Renders the verification status screen and polls until the account email is verified.
     *
     * @param {Object} props Verification-screen props.
     * @param {string} props.email Email address awaiting verification.
     * @param {string} props.name Registration name; a truthy value marks a new account.
     * @param {string} props.lang Current language, taking precedence over persisted `appLang`.
     * @param {function(boolean): void} props.onVerified Continues authentication after verification.
     * @param {function(): void} props.onBack Returns to the login screen.
     * @returns {Object} React element tree for the verification screen.
     */
    function VerifyEmailScreen({ email, name, lang, onVerified, onBack }) {
      const isPt = (lang || localStorage.getItem('appLang') || 'pt') !== 'en';
      const [status, setStatus] = React.useState(''); // '', 'resent', 'error'
      const [checking, setChecking] = React.useState(false);
      const isNew = !!name; // name only passed on new registrations

      // Poll every 5s to check if email was verified
      React.useEffect(() => {
        let active = true;
        const interval = setInterval(async () => {
          try {
            const verified = await fbCheckEmailVerified();
            if (verified && active) {
              clearInterval(interval);
              onVerified(isNew);
            }
          } catch(e) {}
        }, 5000);
        return () => { active = false; clearInterval(interval); };
      }, []);

      async function resend() {
        setStatus('');
        try {
          await fbSendVerificationEmail();
          setStatus('resent');
        } catch(e) {
          setStatus('error');
        }
      }

      const inp = {
        width:'100%', background:'var(--input,#1e1e1e)',
        border:'1px solid var(--border2,#333)', color:'var(--text1,#fff)',
        padding:'11px 14px', borderRadius:10, fontSize:14,
        fontFamily:'inherit', boxSizing:'border-box'
      };

      return React.createElement('div', {
        style: {
          minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
          background:'var(--bg,#111)', padding:20
        }
      },
        React.createElement('div', {
          style: {
            background:'var(--surface,#fff)', borderRadius:20, padding:'36px 28px',
            width:'100%', maxWidth:420, textAlign:'center',
            boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
            border:'1px solid var(--border2,#333)'
          }
        },
          // Icon
          React.createElement('div', {style:{fontSize:52, marginBottom:16}}, '\uD83D\uDCE7'),

          // Title
          React.createElement('h2', {
            style:{margin:'0 0 8px', fontSize:20, color:'var(--text1,#fff)', fontWeight: 600}
          }, isPt
            ? (name ? 'Ol\xe1, ' + name + '! Verifique seu email \uD83D\uDC4B' : 'Verifique seu email')
            : (name ? 'Hi, ' + name + '! Verify your email \uD83D\uDC4B' : 'Verify your email')
          ),

          // Subtitle
          React.createElement('p', {
            style:{margin:'0 0 24px', fontSize:13, color:'var(--text2,#aaa)', lineHeight:1.6}
          }, isPt
            ? 'Env\xe1mos um link de verifica\xe7\xe3o para '
            : 'We sent a verification link to '
          ,
            React.createElement('strong', {style:{color:'var(--accent,#7ec87e)'}}, email),
            isPt
              ? '. Clique no link para ativar sua conta. Se n\xe3o encontrar o email, verifique a pasta de spam ou lixo eletr\xf4nico. Esta p\xe1gina atualiza automaticamente.'
              : '. Click the link to activate your account. If you don\'t see it, check your spam or junk folder. This page updates automatically.'
          ),

          // Spinner / waiting indicator
          React.createElement('div', {
            style:{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              marginBottom:24, color:'var(--text2,#aaa)', fontSize:12
            }
          },
            React.createElement('div', {
              style:{
                width:14, height:14, borderRadius:'50%',
                border:'2px solid var(--accent,#7ec87e)',
                borderTopColor:'transparent',
                animation:'spin 1s linear infinite'
              }
            }),
            isPt ? 'Aguardando verifica\xe7\xe3o...' : 'Waiting for verification...'
          ),

          // Status message
          status === 'resent' && React.createElement('p', {
            style:{color:'var(--accent,#7ec87e)', fontSize:12, marginBottom:12}
          }, isPt ? '\u2713 Email reenviado!' : '\u2713 Email resent!'),
          status === 'error' && React.createElement('p', {
            style:{color:'#c87e7e', fontSize:12, marginBottom:12}
          }, isPt ? 'Erro ao reenviar. Tente novamente.' : 'Error resending. Please try again.'),

          // Resend button
          React.createElement('button', {
            onClick: resend,
            style:{
              width:'100%', padding:'12px', borderRadius:10, marginBottom:12,
              background:'var(--accent,#7ec87e)', border:'none',
              color:'#111', fontSize:13, fontWeight: 600,
              cursor:'pointer', fontFamily:'inherit', letterSpacing:0.5
            }
          }, isPt ? 'Reenviar email de verifica\xe7\xe3o' : 'Resend verification email'),

          // Back button
          React.createElement('button', {
            onClick: onBack,
            style:{
              width:'100%', padding:'11px', borderRadius:10,
              background:'none', border:'1px solid var(--border2,#333)',
              color:'var(--text2,#aaa)', fontSize:13,
              cursor:'pointer', fontFamily:'inherit'
            }
          }, isPt ? '\u2190 Voltar para o login' : '\u2190 Back to login')
        )
      );
    }

    return { VerifyEmailScreen };
  }

  return { createVerifyEmailScreen };
});
