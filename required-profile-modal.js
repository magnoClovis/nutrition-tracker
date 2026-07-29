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
 * must not change without a data-migration plan. The birth-date maximum keeps
 * the existing UTC `toISOString()` behavior intentionally.
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
   * @param {Object<string, Object>} dependencies.activityLevels Real `ACTIVITY_LEVELS` descriptors from `goal-calculator.js`.
   * @param {{set: function(string, *): Promise<*>}} dependencies.storage App persistence adapter from `firebase-storage.js`.
   * @param {function(string): boolean} dependencies.isValidBirthDate Birth-date validator from `profile-validation.js`.
   * @param {function(string): boolean} dependencies.isValidGender Gender validator from `profile-validation.js`.
   * @param {function(Object): boolean} dependencies.isValidGoalProfile Goal-profile validator from `profile-validation.js`.
   * @param {function(): Promise<Object>} dependencies.getRequiredProfileData Persisted-profile reader from `profile-validation.js`.
   * @param {function(Object): boolean} dependencies.hasRequiredProfileData Required-profile completeness check from `profile-validation.js`.
   * @returns {{RequiredProfileModal: function(Object): Object}} Configured React component API.
   */
  function createRequiredProfileModal({
    React,
    normalizeLanguage,
    pickLang,
    activityLevels,
    storage,
    isValidBirthDate,
    isValidGender,
    isValidGoalProfile,
    getRequiredProfileData,
    hasRequiredProfileData
  }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function" ||
        typeof normalizeLanguage !== "function" || typeof pickLang !== "function" ||
        !activityLevels || typeof activityLevels !== "object" || !storage || typeof storage.set !== "function" ||
        typeof isValidBirthDate !== "function" || typeof isValidGender !== "function" ||
        typeof isValidGoalProfile !== "function" || typeof getRequiredProfileData !== "function" ||
        typeof hasRequiredProfileData !== "function") {
      throw new TypeError("RequiredProfileModal requires React, localization, activity, storage, and profile-validation dependencies");
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
        ? {title:'Completar perfil nutricional', text:'Para calcular suas metas, estes dados s\u00e3o obrigat\u00f3rios.', birth:'Data de nascimento *', gender:'G\u00eanero *', activity:'Atividade f\u00edsica *', goal:'Objetivo *', choose:'Selecionar', male:'Masculino', female:'Feminino', maintenance:'Manuten\u00e7\u00e3o do peso', loss:'Perda de peso', gain:'Ganho de peso', kgLoss:'Quantos kg deseja perder?', kgGain:'Quantos kg deseja ganhar?', weeks:'Em quantas semanas?', save:'Salvar e continuar', saving:'Salvando...', err:'Preencha todos os dados obrigat\u00f3rios.', readErr:'Os dados n\u00e3o foram encontrados depois de salvar.', saveErr:'N\u00e3o foi poss\u00edvel salvar no banco de dados: '}
        : isEs
          ? {title:'Completar perfil nutricional', text:'Estos datos son obligatorios para calcular tus metas.', birth:'Fecha de nacimiento *', gender:'G\u00e9nero *', activity:'Actividad f\u00edsica *', goal:'Objetivo *', choose:'Seleccionar', male:'Masculino', female:'Femenino', maintenance:'Mantenimiento del peso', loss:'P\u00e9rdida de peso', gain:'Ganancia de peso', kgLoss:'\u00bfCu\u00e1ntos kg quieres perder?', kgGain:'\u00bfCu\u00e1ntos kg quieres ganar?', weeks:'\u00bfEn cu\u00e1ntas semanas?', save:'Guardar y continuar', saving:'Guardando...', err:'Completa todos los datos obligatorios.', readErr:'Los datos no se encontraron despu\u00e9s de guardar.', saveErr:'No fue posible guardar en la base de datos: '}
          : {title:'Complete nutrition profile', text:'These details are required to calculate your targets.', birth:'Date of birth *', gender:'Gender *', activity:'Physical activity *', goal:'Goal *', choose:'Select', male:'Male', female:'Female', maintenance:'Weight maintenance', loss:'Weight loss', gain:'Weight gain', kgLoss:'How many kg do you want to lose?', kgGain:'How many kg do you want to gain?', weeks:'In how many weeks?', save:'Save and continue', saving:'Saving...', err:'Fill all required details.', readErr:'Saved details could not be read back.', saveErr:'Could not save to the database: '};
      const inp = {width:'100%',background:'#f5f3ef',border:'1px solid #b8b4ac',color:'#252220',padding:'12px 14px',borderRadius:8,fontSize:15,fontFamily:'inherit',boxSizing:'border-box',outline:'none',marginTop:6,marginBottom:14};
      const labelStyle = {fontSize:10,letterSpacing:1.5,color:'#6a6662',textTransform:'uppercase'};
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
      return React.createElement('div', {'data-safe-area-dialog':'20', style:{position:'fixed',inset:0,zIndex:100000,background:'rgba(242,241,237,0.94)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}},
        React.createElement('form', {onSubmit:saveProfile, style:{width:'100%',maxWidth:420,background:'#ffffff',border:'1px solid #ccc8c0',borderRadius:14,padding:24,boxShadow:'0 20px 80px rgba(60,50,40,0.18)',margin:'auto'}},
          React.createElement('div', {style:{fontSize:20,color:'#3a3733',marginBottom:8}}, S.title),
          React.createElement('div', {style:{fontSize:13,color:'#6a6662',lineHeight:1.5,marginBottom:20}}, S.text),
          React.createElement('label', {style:labelStyle}, S.birth),
          React.createElement('input', {type:'date', value:birthDate, onChange:e=>setBirthDate(e.target.value), required:true, max:new Date().toISOString().split('T')[0], min:'1900-01-01', style:inp}),
          React.createElement('label', {style:labelStyle}, S.gender),
          React.createElement('select', {value:gender, onChange:e=>setGender(e.target.value), required:true, style:inp},
            React.createElement('option', {value:'', style:{background:'#f5f3ef',color:'#252220'}}, S.choose),
            React.createElement('option', {value:'male', style:{background:'#f5f3ef',color:'#252220'}}, S.male),
            React.createElement('option', {value:'female', style:{background:'#f5f3ef',color:'#252220'}}, S.female)
          ),
          React.createElement('label', {style:labelStyle}, S.activity),
          React.createElement('select', {value:activityLevel, onChange:e=>setActivityLevel(e.target.value), required:true, style:inp},
            React.createElement('option', {value:'', style:{background:'#f5f3ef',color:'#252220'}}, S.choose),
            Object.entries(ACTIVITY_LEVELS).map(([key, data]) => {
              const label = pickLang(normalizedLang, data.pt, data.en, data.es);
              const desc = pickLang(normalizedLang, data.descPt, data.descEn, data.descEs);
              return React.createElement('option', {key, value:key, style:{background:'#f5f3ef',color:'#252220'}}, label + ' - ' + desc);
            })
          ),
          React.createElement('label', {style:labelStyle}, S.goal),
          React.createElement('select', {value:goalType, onChange:e=>setGoalType(e.target.value), required:true, style:inp},
            React.createElement('option', {value:'', style:{background:'#f5f3ef',color:'#252220'}}, S.choose),
            React.createElement('option', {value:'maintenance', style:{background:'#f5f3ef',color:'#252220'}}, S.maintenance),
            React.createElement('option', {value:'loss', style:{background:'#f5f3ef',color:'#252220'}}, S.loss),
            React.createElement('option', {value:'gain', style:{background:'#f5f3ef',color:'#252220'}}, S.gain)
          ),
          (goalType === 'loss' || goalType === 'gain') && React.createElement(React.Fragment, null,
            React.createElement('label', {style:labelStyle}, goalType === 'loss' ? S.kgLoss : S.kgGain),
            React.createElement('input', {type:'number', min:'0.1', step:'0.1', value:goalKg, onChange:e=>setGoalKg(e.target.value), required:true, style:inp}),
            React.createElement('label', {style:labelStyle}, S.weeks),
            React.createElement('input', {type:'number', min:'1', step:'1', value:goalWeeks, onChange:e=>setGoalWeeks(e.target.value), required:true, style:inp})
          ),
          error && React.createElement('div', {style:{color:'#c87e7e',fontSize:12,marginBottom:14,padding:'8px 12px',background:'rgba(200,80,80,0.1)',borderRadius:6,border:'1px solid rgba(200,80,80,0.2)'}}, error),
          React.createElement('button', {type:'submit', disabled:saving, style:{width:'100%',background:saving?'#ede9e3':'#e8f4e8',border:'1px solid #a8cfa8',color:saving?'#8a8680':'#2a6a2a',padding:'13px',borderRadius:8,fontSize:12,letterSpacing:1,textTransform:'uppercase',cursor:saving?'default':'pointer',fontFamily:'inherit'}}, saving ? S.saving : S.save)
        )
      );
    }

    return { RequiredProfileModal };
  }

  return { createRequiredProfileModal };
});
