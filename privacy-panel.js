/**
 * MAXIMUM-RISK account privacy and security panel.
 *
 * THIS MODULE EXECUTES DESTRUCTIVE AND IRREVERSIBLE OPERATIONS against real
 * user data: password reauthentication, direct Firebase password updates,
 * Firestore account-data deletion, Firebase Auth account deletion, and logout.
 * Any future change requires explicit data-safety review at the same level as
 * this extraction.
 *
 * The UMD module exposes a `createPrivacyPanel` factory. The host injects React,
 * named account/session operations from `firebase-storage.js`, optional dynamic
 * getters for the existing window bridges, localStorage, fetch, the Firebase
 * API-key configuration value, and timers. The component accepts `lang`,
 * `onClose`, and `onLogout` and returns a React element tree.
 *
 * CRITICAL PRE-EXISTING RISKS DELIBERATELY PRESERVED: Firestore listing failures
 * can behave like empty lists inside the external deletion bridge, and missing
 * Firestore cleanup skips directly to Auth deletion. Partial deletion has no
 * transaction or rollback. Spanish and every non-`pt` language continue to use
 * English copy except for the account-deletion failure message added explicitly
 * in all three supported languages.
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
   * @param {{signIn: function(string,string): Promise<*>, getToken: function(): Promise<string>, signOut: function(): void, getSaveSession: function(): (function(Object): void|undefined), getDeleteFirestoreData: function(): (function(): Promise<*>|undefined)}} dependencies.accountService Named account/session services and optional dynamic bridge getters.
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
        typeof accountService.getDeleteFirestoreData !== "function" ||
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
    const window = {};
    Object.defineProperties(window, {
      _saveSession: { get: accountService.getSaveSession },
      deleteCurrentUserFirestoreData: { get: accountService.getDeleteFirestoreData }
    });

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

      const accountDeletionFailureMessage = (firestoreDataRemoved) => {
        if (lang === 'pt') return firestoreDataRemoved
          ? 'Falha ao excluir a conta. Seus dados do Firestore j\u00e1 foram removidos, mas a conta n\u00e3o foi exclu\u00edda. Tente novamente ou entre em contato com o suporte.'
          : 'Falha ao excluir a conta. A conta n\u00e3o foi exclu\u00edda. Tente novamente ou entre em contato com o suporte.';
        if (lang === 'es') return firestoreDataRemoved
          ? 'No se pudo eliminar la cuenta. Tus datos de Firestore ya se eliminaron, pero la cuenta no. Int\u00e9ntalo de nuevo o contacta con soporte.'
          : 'No se pudo eliminar la cuenta. La cuenta no se elimin\u00f3. Int\u00e9ntalo de nuevo o contacta con soporte.';
        return firestoreDataRemoved
          ? 'Account deletion failed. Your Firestore data has already been removed, but your account was not deleted. Try again or contact support.'
          : 'Account deletion failed. Your account was not deleted. Try again or contact support.';
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
        setErr(''); setStatus('');
        if (!delPwd) { setErr(isPt?'Digite sua senha para confirmar.':'Enter your password to confirm.'); return; }
        if (delConf !== (isPt?'APAGAR':'DELETE')) { setErr(isPt?'Digite APAGAR para confirmar.':'Type DELETE to confirm.'); return; }
        let firestoreDataRemoved = false;
        try {
          const email = localStorage.getItem('fb_email') || '';
          await fbSignIn(email, delPwd); // throws if wrong password
          // Firestore data must be deleted before Auth deletion; Firebase Auth does
          // not cascade-delete user documents after accounts:delete.
          if (typeof window.deleteCurrentUserFirestoreData === 'function') {
            await window.deleteCurrentUserFirestoreData();
            firestoreDataRemoved = true;
          }
          // Delete account via REST
          const token = await fbToken();
          let response;
          try {
            response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key=' + FB_KEY, {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({idToken: token})
            });
          } catch(e) {
            setErr(accountDeletionFailureMessage(firestoreDataRemoved));
            return;
          }
          if (!response.ok) {
            setErr(accountDeletionFailureMessage(firestoreDataRemoved));
            return;
          }
          fbSignOut();
          onLogout();
        } catch(e) {
          setErr(isPt?'Senha incorreta ou erro ao apagar conta.':'Incorrect password or error deleting account.');
        }
      }

      const header = (title) => React.createElement('div', {
        style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}
      },
        React.createElement('h2', {style:{margin:0, fontSize:16, color:'var(--text1)'}}, title),
        React.createElement('button', {
          onClick: section==='main' ? onClose : ()=>{ setSection('main'); setErr(''); setStatus(''); },
          style:{background:'none', border:'none', color:'var(--text2)', fontSize:20, cursor:'pointer'}
        }, section==='main' ? '\u00D7' : '\u2190')
      );

      if (section === 'changePassword') return React.createElement('div', {style:overlay},
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

      if (section === 'deleteAccount') return React.createElement('div', {style:overlay},
        React.createElement('div', {style:box},
          header(isPt?'Apagar conta':'Delete account'),
          React.createElement('p', {style:{color:'#c87e7e', fontSize:13, marginBottom:12, lineHeight:1.5}},
            isPt
              ? 'Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.'
              : 'This action is irreversible. All your data will be permanently deleted.'),
          err && React.createElement('p', {style:{color:'#c87e7e', fontSize:12, marginBottom:10}}, err),
          React.createElement('input', {type:'password', value:delPwd, onChange:e=>setDelPwd(e.target.value),
            placeholder:isPt?'Sua senha':'Your password', style:inp}),
          React.createElement('input', {type:'text', value:delConf, onChange:e=>setDelConf(e.target.value),
            placeholder:isPt?'Digite APAGAR para confirmar':'Type DELETE to confirm',
            style:{...inp, marginBottom:16}}),
          React.createElement('button', {onClick:deleteAccount,
            style:{...btn('#8b1a1a'), border:'1px solid #c87e7e'}},
            isPt?'\uD83D\uDDD1 Apagar conta permanentemente':'\uD83D\uDDD1 Delete account permanently')
        )
      );

      // Main panel
      return React.createElement('div', {style:overlay},
        React.createElement('div', {style:box},
          header(isPt?'\uD83D\uDD12 Privacidade e seguran\xe7a':'\uD83D\uDD12 Privacy & security'),

          React.createElement('p', {style:{color:'var(--text2)', fontSize:12, marginBottom:16, lineHeight:1.5}},
            isPt
              ? 'Aqui voc\xea pode gerenciar as configura\xe7\xf5es de seguran\xe7a e privacidade da sua conta.'
              : 'Here you can manage your account security and privacy settings.'),

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
