/**
 * Blocking required-profile form for completing the persisted nutrition profile.
 *
 * The UMD module exposes a `createRequiredProfileModal` factory. The host injects
 * React, language helpers from `i18n.js`, the real `ACTIVITY_LEVELS` value from
 * `goal-calculator.js`, profile rules/readers from `profile-validation.js`, and
 * the `storage` adapter from `firebase-storage.js`. The component accepts plain
 * `lang` and `profile` props and reports the verified persisted profile through
 * `onComplete`.
 *
 * Persistence contract: the component writes exactly `birthDate`, `gender`,
 * `activityLevel`, `goalType`, `goalKg`, and `goalWeeks`. Maintenance profiles
 * persist empty strings for `goalKg` and `goalWeeks`. These names and semantics
 * must not change without a data-migration plan. The birth-date maximum uses
 * the shared local civil-date helper.
 *
 * @module RequiredProfileModal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RequiredProfileModalModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the required-profile modal with all application services supplied by the host.
   *
   * @param {Object} dependencies Injected UI, localization, validation, and persistence dependencies.
   * @param {Object} dependencies.React React runtime used to create elements and manage state.
   * @param {function(string): string} dependencies.normalizeLanguage Language normalizer from `i18n.js`.
   * @param {function(string, *, *, *): *} dependencies.pickLang Language selector from `i18n.js`.
   * @param {function(Object): Object} dependencies.ChoiceField Reusable Trofia list selector.
   * @param {function(Object): Object} dependencies.DateField Reusable Trofia civil-date selector.
   * @param {Object<string, Object>} dependencies.activityLevels Real `ACTIVITY_LEVELS` descriptors from `goal-calculator.js`.
   * @param {{set: function(string, *): Promise<*>}} dependencies.storage App persistence adapter from `firebase-storage.js`.
   * @param {function(string): boolean} dependencies.isValidBirthDate Birth-date validator from `profile-validation.js`.
   * @param {function(string): boolean} dependencies.isValidGender Gender validator from `profile-validation.js`.
   * @param {function(Object): boolean} dependencies.isValidGoalProfile Goal-profile validator from `profile-validation.js`.
   * @param {function(): Promise<Object>} dependencies.getRequiredProfileData Persisted-profile reader from `profile-validation.js`.
   * @param {function(Object): boolean} dependencies.hasRequiredProfileData Required-profile completeness check from `profile-validation.js`.
   * @param {function(Date=): string} dependencies.localToday Shared local civil-date formatter.
   * @returns {{RequiredProfileModal: function(Object): Object}} Configured React component API.
   */
  function createRequiredProfileModal({
    React,
    normalizeLanguage,
    pickLang,
    ChoiceField,
    DateField,
    activityLevels,
    storage,
    isValidBirthDate,
    isValidGender,
    isValidGoalProfile,
    getRequiredProfileData,
    hasRequiredProfileData,
    localToday
  }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function" ||
        typeof normalizeLanguage !== "function" || typeof pickLang !== "function" ||
        typeof ChoiceField !== "function" || typeof DateField !== "function" ||
        !activityLevels || typeof activityLevels !== "object" || !storage || typeof storage.set !== "function" ||
        typeof isValidBirthDate !== "function" || typeof isValidGender !== "function" ||
        typeof isValidGoalProfile !== "function" || typeof getRequiredProfileData !== "function" ||
        typeof hasRequiredProfileData !== "function" || typeof localToday !== "function") {
      throw new TypeError("RequiredProfileModal requires React, ChoiceField, DateField, localization, activity, storage, and profile-validation dependencies");
    }

    const ACTIVITY_LEVELS = activityLevels;

    /**
     * Renders the blocking form and persists a valid required nutrition profile.
     *
     * @param {Object} props Component props.
     * @param {string} props.lang Current application language.
     * @param {Object} props.profile Existing full or partial persisted profile.
     * @param {function(Object): void} props.onComplete Called with the reread, validated persisted profile.
     * @returns {Object} React element tree for the required-profile modal.
     */
    function RequiredProfileModal({lang, profile, onComplete}) {
      const normalizedLang = normalizeLanguage(lang || 'pt');
      const isPt = normalizedLang === 'pt';
      const isEs = normalizedLang === 'es';
      const [birthDate, setBirthDate] = React.useState(profile?.birthDate || '');
      const [gender, setGender] = React.useState(profile?.gender || '');
      const [activityLevel, setActivityLevel] = React.useState(profile?.activityLevel || '');
      const [goalType, setGoalType] = React.useState(profile?.goalType || '');
      const [goalKg, setGoalKg] = React.useState(profile?.goalKg || '');
      const [goalWeeks, setGoalWeeks] = React.useState(profile?.goalWeeks || '');
      const [error, setError] = React.useState('');
      const [saving, setSaving] = React.useState(false);
      const S = isPt
        ? {title:'Completar perfil nutricional', text:'Para calcular suas metas, estes dados s\u00e3o obrigat\u00f3rios.', birth:'Data de nascimento *', gender:'G\u00eanero *', activity:'Atividade f\u00edsica *', goal:'Objetivo *', choose:'Selecionar', close:'Fechar', male:'Masculino', female:'Feminino', maintenance:'Manuten\u00e7\u00e3o do peso', maintenanceDesc:'Manter o peso e a composi\u00e7\u00e3o atuais', loss:'Perda de peso', lossDesc:'Reduzir o peso de forma gradual', gain:'Ganho de peso', gainDesc:'Aumentar o peso de forma gradual', kgLoss:'Quantos kg deseja perder?', kgGain:'Quantos kg deseja ganhar?', weeks:'Em quantas semanas?', save:'Salvar e continuar', saving:'Salvando...', err:'Preencha todos os dados obrigat\u00f3rios.', readErr:'Os dados n\u00e3o foram encontrados depois de salvar.', saveErr:'N\u00e3o foi poss\u00edvel salvar no banco de dados: '}
        : isEs
          ? {title:'Completar perfil nutricional', text:'Estos datos son obligatorios para calcular tus metas.', birth:'Fecha de nacimiento *', gender:'G\u00e9nero *', activity:'Actividad f\u00edsica *', goal:'Objetivo *', choose:'Seleccionar', close:'Cerrar', male:'Masculino', female:'Femenino', maintenance:'Mantenimiento del peso', maintenanceDesc:'Mantener el peso y la composici\u00f3n actuales', loss:'P\u00e9rdida de peso', lossDesc:'Reducir el peso de forma gradual', gain:'Ganancia de peso', gainDesc:'Aumentar el peso de forma gradual', kgLoss:'\u00bfCu\u00e1ntos kg quieres perder?', kgGain:'\u00bfCu\u00e1ntos kg quieres ganar?', weeks:'\u00bfEn cu\u00e1ntas semanas?', save:'Guardar y continuar', saving:'Guardando...', err:'Completa todos los datos obligatorios.', readErr:'Los datos no se encontraron despu\u00e9s de guardar.', saveErr:'No fue posible guardar en la base de datos: '}
          : {title:'Complete nutrition profile', text:'These details are required to calculate your targets.', birth:'Date of birth *', gender:'Gender *', activity:'Physical activity *', goal:'Goal *', choose:'Select', close:'Close', male:'Male', female:'Female', maintenance:'Weight maintenance', maintenanceDesc:'Maintain your current weight and body composition', loss:'Weight loss', lossDesc:'Reduce weight gradually', gain:'Weight gain', gainDesc:'Increase weight gradually', kgLoss:'How many kg do you want to lose?', kgGain:'How many kg do you want to gain?', weeks:'In how many weeks?', save:'Save and continue', saving:'Saving...', err:'Fill all required details.', readErr:'Saved details could not be read back.', saveErr:'Could not save to the database: '};
      const dateCopy = isPt
        ? {title:'Escolher data de nascimento',previousMonth:'M\u00eas anterior',nextMonth:'Pr\u00f3ximo m\u00eas',editMonthYear:'Escolher m\u00eas e ano',previousYear:'Ano anterior',nextYear:'Pr\u00f3ximo ano',editYear:'Digitar ano',showDays:'Mostrar dias',cancel:'Cancelar',confirm:'Confirmar',close:'Voltar',backspace:'Apagar d\u00edgito',invalidYear:'Digite um ano entre 1900 e hoje.'}
        : isEs
          ? {title:'Elegir fecha de nacimiento',previousMonth:'Mes anterior',nextMonth:'Mes siguiente',editMonthYear:'Elegir mes y a\u00f1o',previousYear:'A\u00f1o anterior',nextYear:'A\u00f1o siguiente',editYear:'Escribir a\u00f1o',showDays:'Mostrar d\u00edas',cancel:'Cancelar',confirm:'Confirmar',close:'Volver',backspace:'Borrar d\u00edgito',invalidYear:'Introduce un a\u00f1o entre 1900 y hoy.'}
          : {title:'Choose date of birth',previousMonth:'Previous month',nextMonth:'Next month',editMonthYear:'Choose month and year',previousYear:'Previous year',nextYear:'Next year',editYear:'Type year',showDays:'Show days',cancel:'Cancel',confirm:'Confirm',close:'Back',backspace:'Delete digit',invalidYear:'Enter a year from 1900 to today.'};
      const dateLocale = isPt ? 'pt-BR' : isEs ? 'es-ES' : 'en-US';
      const inp = {width:'100%',background:'var(--surface-block-alt)',border:'1px solid color-mix(in srgb, var(--text-primary) 13%, transparent)',color:'var(--text-primary)',padding:'12px 14px',borderRadius:'var(--radius-control)',fontSize:15,fontFamily:'inherit',boxSizing:'border-box',outline:'none',marginTop:6,marginBottom:14};
      const labelStyle = {fontSize:12,color:'var(--text-secondary)'};
      async function saveProfile(e) {
        e.preventDefault();
        setError('');
        const nextProfile = {birthDate, gender, activityLevel, goalType, goalKg, goalWeeks};
        if (!isValidBirthDate(birthDate) || !isValidGender(gender) || !isValidGoalProfile(nextProfile)) { setError(S.err); return; }
        setSaving(true);
        try {
          await Promise.all([
            storage.set('birthDate', birthDate),
            storage.set('gender', gender),
            storage.set('activityLevel', activityLevel),
            storage.set('goalType', goalType),
            storage.set('goalKg', goalType === 'maintenance' ? '' : goalKg),
            storage.set('goalWeeks', goalType === 'maintenance' ? '' : goalWeeks)
          ]);
          const savedProfile = await getRequiredProfileData().catch(()=>null);
          if (!hasRequiredProfileData(savedProfile)) throw new Error(S.readErr);
          setSaving(false);
          onComplete(savedProfile);
        } catch (err) {
          setSaving(false);
          setError(S.saveErr + (err?.message || err));
        }
      }
      const activityOptions = Object.entries(ACTIVITY_LEVELS).map(([key, data]) => ({
        value:key,
        label:pickLang(normalizedLang, data.pt, data.en, data.es),
        description:pickLang(normalizedLang, data.descPt, data.descEn, data.descEs)
      }));
      const goalOptions = [
        {value:'maintenance',label:S.maintenance,description:S.maintenanceDesc},
        {value:'loss',label:S.loss,description:S.lossDesc},
        {value:'gain',label:S.gain,description:S.gainDesc}
      ];
      return React.createElement('div', {'data-safe-area-dialog':'20','data-required-profile-modal':'true', style:{position:'fixed',inset:0,zIndex:100000,background:'color-mix(in srgb, var(--surface-page) 88%, transparent)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto',backdropFilter:'blur(10px)'}},
        React.createElement('form', {'data-required-profile-form':'true',onSubmit:saveProfile, style:{width:'100%',maxWidth:420,background:'color-mix(in srgb, var(--surface-block) 92%, transparent)',border:'1px solid color-mix(in srgb, var(--text-primary) 9%, transparent)',borderRadius:'var(--radius-block)',padding:24,boxShadow:'0 20px 80px color-mix(in srgb, var(--text-primary) 14%, transparent)',margin:'auto',backdropFilter:'blur(18px) saturate(130%)'}},
          React.createElement('div', {style:{fontSize:20,color:'var(--text-primary)',marginBottom:8}}, S.title),
          React.createElement('div', {style:{fontSize:13,color:'var(--text-secondary)',lineHeight:1.5,marginBottom:20}}, S.text),
          React.createElement(DateField, {id:'required-profile-birth-date',label:S.birth,value:birthDate,onChange:setBirthDate,min:'1900-01-01',max:localToday(),locale:dateLocale,initialViewYear:Number(localToday().slice(0,4))-18,strings:dateCopy,style:{marginBottom:14}}),
          React.createElement(ChoiceField, {id:'required-profile-gender',label:S.gender,value:gender,onChange:setGender,placeholder:S.choose,closeLabel:S.close,required:true,options:[{value:'male',label:S.male},{value:'female',label:S.female}],style:{marginBottom:14}}),
          React.createElement(ChoiceField, {id:'required-profile-activity',label:S.activity,value:activityLevel,onChange:setActivityLevel,placeholder:S.choose,closeLabel:S.close,required:true,options:activityOptions,style:{marginBottom:14}}),
          React.createElement(ChoiceField, {id:'required-profile-goal',label:S.goal,value:goalType,onChange:setGoalType,placeholder:S.choose,closeLabel:S.close,required:true,options:goalOptions,style:{marginBottom:14}}),
          (goalType === 'loss' || goalType === 'gain') && React.createElement(React.Fragment, null,
            React.createElement('label', {style:labelStyle}, goalType === 'loss' ? S.kgLoss : S.kgGain),
            React.createElement('input', {type:'number', min:'0.1', step:'0.1', value:goalKg, onChange:e=>setGoalKg(e.target.value), required:true, style:inp}),
            React.createElement('label', {style:labelStyle}, S.weeks),
            React.createElement('input', {type:'number', min:'1', step:'1', value:goalWeeks, onChange:e=>setGoalWeeks(e.target.value), required:true, style:inp})
          ),
          error && React.createElement('div', {style:{color:'#c87e7e',fontSize:12,marginBottom:14,padding:'8px 12px',background:'rgba(200,80,80,0.1)',borderRadius:6,border:'1px solid rgba(200,80,80,0.2)'}}, error),
          React.createElement('button', {type:'submit', disabled:saving, style:{width:'100%',background:saving?'var(--surface-block-alt)':'var(--accent-action-bg)',border:'1px solid transparent',color:saving?'var(--text-muted)':'var(--accent-action-text)',padding:'13px',borderRadius:'var(--radius-control)',fontSize:12,letterSpacing:1,textTransform:'uppercase',cursor:saving?'default':'pointer',fontFamily:'inherit'}}, saving ? S.saving : S.save)
        )
      );
    }

    /**
     * Shows a recoverable profile-read failure without misrepresenting it as
     * missing nutrition data. Technical details are restricted to a sanitized
     * Firebase/application error code supplied by the shell.
     */
    function RequiredProfileReadError({lang, errorCode, onRetry, onLogout}) {
      const normalizedLang = normalizeLanguage(lang || 'pt');
      const isPt = normalizedLang === 'pt';
      const isEs = normalizedLang === 'es';
      const S = isPt
        ? {title:'N\u00e3o foi poss\u00edvel carregar seu perfil', text:'Seus dados n\u00e3o foram apagados. Verifique sua conex\u00e3o e tente novamente.', detail:'Detalhe t\u00e9cnico', retry:'Tentar novamente', logout:'Sair'}
        : isEs
          ? {title:'No se pudo cargar tu perfil', text:'Tus datos no se han eliminado. Comprueba tu conexi\u00f3n e int\u00e9ntalo de nuevo.', detail:'Detalle t\u00e9cnico', retry:'Intentar de nuevo', logout:'Cerrar sesi\u00f3n'}
          : {title:'Your profile could not be loaded', text:'Your data has not been deleted. Check your connection and try again.', detail:'Technical detail', retry:'Try again', logout:'Sign out'};
      const safeCode = /^[A-Za-z0-9_./-]{1,100}$/.test(String(errorCode || ''))
        ? String(errorCode)
        : 'firestore-profile-read-failed';
      return React.createElement('div', {'data-safe-area-dialog':'20','data-required-profile-read-error':'true',style:{position:'fixed',inset:0,zIndex:100000,background:'color-mix(in srgb, var(--surface-page) 88%, transparent)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto',backdropFilter:'blur(10px)'}},
        React.createElement('div', {role:'alert',style:{width:'100%',maxWidth:420,background:'color-mix(in srgb, var(--surface-block) 92%, transparent)',border:'1px solid color-mix(in srgb, var(--text-primary) 9%, transparent)',borderRadius:'var(--radius-block)',padding:24,boxShadow:'0 20px 80px color-mix(in srgb, var(--text-primary) 14%, transparent)',margin:'auto'}},
          React.createElement('div', {style:{fontSize:20,color:'var(--text-primary)',marginBottom:8}}, S.title),
          React.createElement('div', {style:{fontSize:13,color:'var(--text-secondary)',lineHeight:1.5,marginBottom:14}}, S.text),
          React.createElement('div', {style:{fontSize:12,color:'var(--text-muted)',marginBottom:20}}, `${S.detail}: ${safeCode}`),
          React.createElement('div', {style:{display:'flex',gap:10,flexWrap:'wrap'}},
            React.createElement('button', {type:'button',onClick:onRetry,style:{flex:'1 1 180px',background:'var(--accent-action-bg)',border:'1px solid transparent',color:'var(--accent-action-text)',padding:'13px',borderRadius:'var(--radius-control)',fontSize:12,letterSpacing:0.5,fontFamily:'inherit'}}, S.retry),
            React.createElement('button', {type:'button',onClick:onLogout,style:{flex:'1 1 120px',background:'var(--surface-block-alt)',border:'1px solid color-mix(in srgb, var(--text-primary) 13%, transparent)',color:'var(--text-primary)',padding:'13px',borderRadius:'var(--radius-control)',fontSize:12,fontFamily:'inherit'}}, S.logout)
          )
        )
      );
    }

    return { RequiredProfileModal, RequiredProfileReadError };
  }

  return { createRequiredProfileModal };
});
