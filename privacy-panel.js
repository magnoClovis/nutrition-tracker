/**
 * MAXIMUM-RISK account privacy and security panel.
 *
 * THIS MODULE EXECUTES DESTRUCTIVE AND IRREVERSIBLE OPERATIONS against real
 * user data: password reauthentication, direct Firebase password updates,
 * administrative account-deletion requests, local cleanup, and logout.
 * Any future change requires explicit data-safety review at the same level as
 * this extraction.
 *
 * The UMD module exposes a `createPrivacyPanel` factory. The host injects React,
 * named account/session operations from `firebase-storage.js`, the protected
 * administrative deletion client, localStorage, fetch, the Firebase
 * API-key configuration value, and timers. The component accepts `lang`,
 * `onClose`, and `onLogout` and returns a React element tree.
 *
 * Account deletion is asynchronous and fail-closed. The browser never deletes
 * Firestore or Auth directly: the App-Check-protected backend must durably
 * accept an idempotent job before local account data is cleared.
 *
 * @module PrivacyPanel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PrivacyPanelModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the privacy panel with account operations and environment services supplied by the host.
   *
   * @param {Object} dependencies Injected privacy-panel dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host.
   * @param {{signIn: function(string,string): Promise<*>, getToken: function(): Promise<string>, signOut: function(): void, getSaveSession: function(): (function(Object): void|undefined), requestDeletion: function(): Promise<*>, suspendAutosaves: function(): Promise<void>, resumeAutosaves: function(): void, clearLocalAccountData: function(): void}} dependencies.accountService Account/session and administrative deletion services.
   * @param {{getItem: function(string): (string|null)}} dependencies.localStorage Browser-local storage service.
   * @param {function(string,Object): Promise<Object>} dependencies.fetchRequest Browser fetch service.
   * @param {string} dependencies.firebaseApiKey Firebase web API-key configuration value from `firebase-storage.js`.
   * @param {{setTimeout: function(function(): void,number): *}} dependencies.timers Browser timer service.
   * @returns {{PrivacyPanel: function(Object): Object}} Configured privacy-panel component API.
   */
  function createPrivacyPanel({
    React,
    accountService,
    localStorage: localStorageService,
    fetchRequest,
    firebaseApiKey,
    timers
  }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function" ||
        !accountService || typeof accountService.signIn !== "function" ||
        typeof accountService.getToken !== "function" || typeof accountService.signOut !== "function" ||
        typeof accountService.getSaveSession !== "function" ||
        typeof accountService.requestDeletion !== "function" ||
        typeof accountService.suspendAutosaves !== "function" ||
        typeof accountService.resumeAutosaves !== "function" ||
        typeof accountService.clearLocalAccountData !== "function" ||
        !localStorageService || typeof localStorageService.getItem !== "function" ||
        typeof fetchRequest !== "function" || typeof firebaseApiKey !== "string" ||
        !timers || typeof timers.setTimeout !== "function") {
      throw new TypeError("PrivacyPanel requires React, account services, localStorage, fetch, Firebase configuration, and timers");
    }

    const fbSignIn = accountService.signIn;
    const fbToken = accountService.getToken;
    const fbSignOut = accountService.signOut;
    const localStorage = localStorageService;
    const fetch = fetchRequest;
    const FB_KEY = firebaseApiKey;
    const setTimeout = timers.setTimeout;
    const PRIVACY_POLICY_URL = 'https://magnoclovis.github.io/nutrition-tracker/privacy/';
    const window = {};
    Object.defineProperty(window, "_saveSession", {get: accountService.getSaveSession});

    /**
     * Renders password-management and irreversible account-deletion controls.
     *
     * @param {Object} props Privacy-panel props.
     * @param {string} props.lang Current language; only exact `pt` uses Portuguese.
     * @param {function(): void} props.onClose Closes the panel from its main section.
     * @param {function(): void} props.onLogout Runs the host logout transition after account deletion.
     * @returns {Object} React element tree for privacy and account security.
     */
    function PrivacyPanel({ lang, onClose, onLogout }) {
      const isPt = lang === 'pt';
      const policyLabel = lang === 'pt'
        ? 'Ler a política de privacidade'
        : lang === 'es'
          ? 'Leer la política de privacidad'
          : 'Read the privacy policy';
      const policyHint = lang === 'pt'
        ? 'Abre a página pública em português, inglês ou espanhol.'
        : lang === 'es'
          ? 'Abre la página pública en portugués, inglés o español.'
          : 'Opens the public page in Portuguese, English, or Spanish.';
      const [section, setSection] = React.useState('main'); // main | changePassword | deleteAccount
      const [status, setStatus]   = React.useState('');
      const [err, setErr]         = React.useState('');

      // Change password
      const [curPwd,  setCurPwd]  = React.useState('');
      const [newPwd,  setNewPwd]  = React.useState('');
      const [newPwd2, setNewPwd2] = React.useState('');

      // Delete account
      const [delPwd,  setDelPwd]  = React.useState('');
      const [delConf, setDelConf] = React.useState('');
      const [deleting, setDeleting] = React.useState(false);
      const [deletionAccepted, setDeletionAccepted] = React.useState(false);
      const deletionText = {
        accepted: lang === 'pt'
          ? 'Exclus\u00e3o iniciada. Seus dados ser\u00e3o removidos com seguran\u00e7a em segundo plano.'
          : lang === 'es'
            ? 'Eliminaci\u00f3n iniciada. Tus datos se eliminar\u00e1n de forma segura en segundo plano.'
            : 'Deletion started. Your data will be safely removed in the background.',
        failed: lang === 'pt'
          ? 'N\u00e3o foi poss\u00edvel iniciar a exclus\u00e3o. Nenhum dado local foi apagado. Tente novamente.'
          : lang === 'es'
            ? 'No se pudo iniciar la eliminaci\u00f3n. No se borr\u00f3 ning\u00fan dato local. Int\u00e9ntalo de nuevo.'
            : 'Deletion could not be started. No local data was erased. Try again.',
        unavailable: lang === 'pt'
          ? 'A verifica\u00e7\u00e3o de seguran\u00e7a n\u00e3o est\u00e1 dispon\u00edvel neste dispositivo.'
          : lang === 'es'
            ? 'La verificaci\u00f3n de seguridad no est\u00e1 disponible en este dispositivo.'
            : 'Security verification is not available on this device.'
      };

      const overlay = {
        position:'fixed', inset:0, zIndex:99998,
        background:'rgba(0,0,0,0.75)', backdropFilter:'blur(3px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:16
      };
      const box = {
        background:'var(--surface)', borderRadius:16, padding:'24px',
        width:'100%', maxWidth:420,
        boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
        border:'1px solid var(--border2)',
        maxHeight:'85vh', overflowY:'auto'
      };
      const inp = {
        width:'100%', background:'var(--input)', border:'1px solid var(--border2)',
        color:'var(--text2)', padding:'10px 12px', borderRadius:8,
        fontSize:13, fontFamily:'inherit', boxSizing:'border-box', marginBottom:10
      };
      const btn = (col) => ({
        width:'100%', padding:'11px', borderRadius:8,
        background:col||'var(--accent)', border:'none',
        color: col ? '#fff' : '#111', fontSize:13,
        cursor:'pointer', fontFamily:'inherit', fontWeight:600,
        marginBottom:8
      });

      async function changePassword() {
        setErr(''); setStatus('');
        if (!curPwd || !newPwd || !newPwd2) { setErr(isPt?'Preencha todos os campos.':'Fill all fields.'); return; }
        if (newPwd !== newPwd2) { setErr(isPt?'As senhas não coincidem.':'Passwords do not match.'); return; }
        if (newPwd.length < 6) { setErr(isPt?'A senha deve ter pelo menos 6 caracteres.':'Password must be at least 6 characters.'); return; }
        try {
          if (typeof accountService.changePassword === 'function') {
            await accountService.changePassword(curPwd, newPwd);
            setStatus(isPt?'Senha alterada com sucesso!':'Password changed successfully!');
            setCurPwd(''); setNewPwd(''); setNewPwd2('');
            setTimeout(()=>setSection('main'),1500);
            return;
          }
          // Re-authenticate via REST to get fresh token
          const email = localStorage.getItem('fb_email') || '';
          await fbSignIn(email, curPwd); // throws if wrong password
          // Update password via REST
          const token = await fbToken();
          const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:update?key=' + FB_KEY, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({idToken: token, password: newPwd, returnSecureToken: true})
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error?.message || 'error');
          // Save new session tokens
          if (d.idToken) window._saveSession && window._saveSession(d);
          setStatus(isPt?'Senha alterada com sucesso!':'Password changed successfully!');
          setCurPwd(''); setNewPwd(''); setNewPwd2('');
          setTimeout(()=>setSection('main'),1500);
        } catch(e) {
          setErr(isPt?'Senha atual incorreta ou erro ao alterar.':'Current password incorrect or error changing password.');
        }
      }

      async function deleteAccount() {
        if (deleting || deletionAccepted) return;
        setErr(''); setStatus('');
        if (!delPwd) { setErr(isPt?'Digite sua senha para confirmar.':'Enter your password to confirm.'); return; }
        if (delConf !== (isPt?'APAGAR':'DELETE')) { setErr(isPt?'Digite APAGAR para confirmar.':'Type DELETE to confirm.'); return; }
        let autosavesSuspended = false;
        setDeleting(true);
        try {
          const email = localStorage.getItem('fb_email') || '';
          await fbSignIn(email, delPwd); // throws if wrong password
          await accountService.suspendAutosaves();
          autosavesSuspended = true;
          if (typeof accountService.prepareDeletion === 'function') {
            await accountService.prepareDeletion();
          }
          await accountService.requestDeletion();
          if (typeof accountService.finalizeDeletion === 'function') {
            await accountService.finalizeDeletion();
          } else {
            await fbSignOut();
          }
          accountService.clearLocalAccountData();
          setDeletionAccepted(true);
          setStatus(deletionText.accepted);
          setTimeout(onLogout, 1500);
        } catch(e) {
          if (autosavesSuspended) accountService.resumeAutosaves();
          const unavailable = String(e?.code || '').startsWith('app-check-');
          setErr(unavailable
            ? deletionText.unavailable
            : String(e?.message || '').includes('INVALID_LOGIN_CREDENTIALS')
              ? (isPt?'Senha incorreta.':lang === 'es'?'Contrase\u00f1a incorrecta.':'Incorrect password.')
              : deletionText.failed);
        } finally {
          setDeleting(false);
        }
      }

      const header = (title) => React.createElement('div', {
        style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}
      },
        React.createElement('h2', {style:{margin:0, fontSize:16, color:'var(--text1)'}}, title),
        React.createElement('button', {
          onClick: deletionAccepted || deleting ? undefined : section==='main' ? onClose : ()=>{ setSection('main'); setErr(''); setStatus(''); },
          disabled: deletionAccepted || deleting,
          style:{background:'none', border:'none', color:'var(--text2)', fontSize:20, cursor:deletionAccepted||deleting?'default':'pointer', opacity:deletionAccepted||deleting?0.4:1}
        }, section==='main' ? '\u00D7' : '\u2190')
      );

      if (section === 'changePassword') return React.createElement('div', {'data-safe-area-dialog':'16', style:overlay},
        React.createElement('div', {style:box},
          header(isPt?'Alterar senha':'Change password'),
          err && React.createElement('p', {style:{color:'#c87e7e', fontSize:12, marginBottom:10}}, err),
          status && React.createElement('p', {style:{color:'#7ec87e', fontSize:12, marginBottom:10}}, status),
          React.createElement('input', {type:'password', value:curPwd, onChange:e=>setCurPwd(e.target.value),
            placeholder:isPt?'Senha atual':'Current password', style:inp}),
          React.createElement('input', {type:'password', value:newPwd, onChange:e=>setNewPwd(e.target.value),
            placeholder:isPt?'Nova senha':'New password', style:inp}),
          React.createElement('input', {type:'password', value:newPwd2, onChange:e=>setNewPwd2(e.target.value),
            placeholder:isPt?'Confirmar nova senha':'Confirm new password', style:{...inp,marginBottom:16}}),
          React.createElement('button', {onClick:changePassword, style:btn()},
            isPt?'Salvar nova senha':'Save new password')
        )
      );

      if (section === 'deleteAccount') return React.createElement('div', {'data-safe-area-dialog':'16', style:overlay},
        React.createElement('div', {style:box},
          header(isPt?'Apagar conta':'Delete account'),
          React.createElement('p', {style:{color:'#c87e7e', fontSize:13, marginBottom:12, lineHeight:1.5}},
            isPt
              ? 'Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.'
              : lang === 'es'
                ? 'Esta acción es irreversible. Todos tus datos se eliminarán permanentemente.'
                : 'This action is irreversible. All your data will be permanently deleted.'),
          err && React.createElement('p', {style:{color:'#c87e7e', fontSize:12, marginBottom:10}}, err),
          status && React.createElement('p', {style:{color:'#7ec87e', fontSize:12, marginBottom:10}}, status),
          React.createElement('input', {type:'password', value:delPwd, disabled:deleting||deletionAccepted, onChange:e=>setDelPwd(e.target.value),
            placeholder:isPt?'Sua senha':lang === 'es'?'Tu contraseña':'Your password', style:inp}),
          React.createElement('input', {type:'text', value:delConf, disabled:deleting||deletionAccepted, onChange:e=>setDelConf(e.target.value),
            placeholder:isPt?'Digite APAGAR para confirmar':lang === 'es'?'Escribe DELETE para confirmar':'Type DELETE to confirm',
            style:{...inp, marginBottom:16}}),
          React.createElement('button', {onClick:deleteAccount, disabled:deleting||deletionAccepted,
            style:{...btn('#8b1a1a'), border:'1px solid #c87e7e', opacity:deleting?0.65:1}},
            deletionAccepted
              ? deletionText.accepted
              : deleting
                ? (isPt?'Iniciando exclusão…':lang === 'es'?'Iniciando eliminación…':'Starting deletion…')
                : isPt?'\uD83D\uDDD1 Apagar conta permanentemente':lang === 'es'?'\uD83D\uDDD1 Eliminar cuenta permanentemente':'\uD83D\uDDD1 Delete account permanently')
        )
      );

      // Main panel
      return React.createElement('div', {'data-safe-area-dialog':'16', style:overlay},
        React.createElement('div', {style:box},
          header(isPt?'\uD83D\uDD12 Privacidade e seguran\xe7a':'\uD83D\uDD12 Privacy & security'),

          React.createElement('p', {style:{color:'var(--text2)', fontSize:12, marginBottom:16, lineHeight:1.5}},
            isPt
              ? 'Aqui voc\xea pode gerenciar as configura\xe7\xf5es de seguran\xe7a e privacidade da sua conta.'
              : 'Here you can manage your account security and privacy settings.'),

          React.createElement('a', {
            href:PRIVACY_POLICY_URL,
            target:'_blank',
            rel:'noopener noreferrer',
            style:{
              width:'100%', padding:'13px 16px', borderRadius:10, marginBottom:10,
              background:'var(--bg)', border:'1px solid var(--border2)',
              color:'var(--text1)', fontSize:13, cursor:'pointer', boxSizing:'border-box',
              fontFamily:'inherit', display:'flex', alignItems:'center', gap:12, textAlign:'left', textDecoration:'none'
            }
          },
            React.createElement('span', {style:{fontSize:20}}, '\uD83D\uDCC4'),
            React.createElement('div', null,
              React.createElement('div', {style:{fontWeight:600, marginBottom:2}}, policyLabel),
              React.createElement('div', {style:{fontSize:11, color:'var(--text2)'}}, policyHint)
            )
          ),

          // Change password
          React.createElement('button', {
            onClick:()=>setSection('changePassword'),
            style:{
              width:'100%', padding:'13px 16px', borderRadius:10, marginBottom:10,
              background:'var(--bg)', border:'1px solid var(--border2)',
              color:'var(--text1)', fontSize:13, cursor:'pointer',
              fontFamily:'inherit', display:'flex', alignItems:'center', gap:12, textAlign:'left'
            }
          },
            React.createElement('span', {style:{fontSize:20}}, '\uD83D\uDD11'),
            React.createElement('div', null,
              React.createElement('div', {style:{fontWeight:600, marginBottom:2}},
                isPt?'Alterar senha':'Change password'),
              React.createElement('div', {style:{fontSize:11, color:'var(--text2)'}},
                isPt?'Atualize a senha da sua conta':'Update your account password')
            )
          ),

          // Divider
          React.createElement('div', {style:{height:1, background:'var(--border2)', margin:'8px 0 16px'}}),

          // Delete account
          React.createElement('button', {
            onClick:()=>setSection('deleteAccount'),
            style:{
              width:'100%', padding:'13px 16px', borderRadius:10,
              background:'rgba(139,26,26,0.15)', border:'1px solid rgba(200,126,126,0.3)',
              color:'#c87e7e', fontSize:13, cursor:'pointer',
              fontFamily:'inherit', display:'flex', alignItems:'center', gap:12, textAlign:'left'
            }
          },
            React.createElement('span', {style:{fontSize:20}}, '\uD83D\uDDD1'),
            React.createElement('div', null,
              React.createElement('div', {style:{fontWeight:600, marginBottom:2}},
                isPt?'Apagar conta':'Delete account'),
              React.createElement('div', {style:{fontSize:11}},
                isPt?'Remove permanentemente todos os seus dados':'Permanently removes all your data')
            )
          )
        )
      );
    }

    return { PrivacyPanel };
  }

  return { createPrivacyPanel };
});
