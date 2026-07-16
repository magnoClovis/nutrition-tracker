/**
 * Required-profile validation and persisted-profile reading helpers.
 *
 * The UMD module exposes a `createProfileValidation` factory. The host injects
 * the app `storage` adapter from `firebase-storage.js` and the real
 * `ACTIVITY_LEVELS` descriptor object returned by `goal-calculator.js`.
 * Validation helpers accept primitive values or plain profile objects and
 * return booleans. The asynchronous reader returns a plain profile object.
 *
 * Persistence contract: `manualCalorieAdjustment` is the stored field name,
 * while the returned profile property is `manualAdjustment`. These names must
 * not be changed without a data-migration plan.
 *
 * @module ProfileValidation
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ProfileValidation = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates required-profile helpers with persistence and activity descriptors supplied by the host.
   *
   * @param {Object} dependencies Injected profile dependencies.
   * @param {{get: function(string): Promise<Object|null>}} dependencies.storage App persistence adapter from `firebase-storage.js`.
   * @param {Object<string, Object>} dependencies.activityLevels Activity descriptors from `goal-calculator.js`.
   * @returns {Object} Required-profile readers and validation helpers.
   */
  function createProfileValidation({ storage, activityLevels }) {
    if (!storage || typeof storage.get !== "function" || !activityLevels || typeof activityLevels !== "object") {
      throw new TypeError("ProfileValidation requires storage.get and activityLevels");
    }

    /**
     * Checks whether a birth date is parseable, not in the future, and no earlier than 1900-01-01.
     *
     * @param {string} value Birth date in `YYYY-MM-DD` format.
     * @returns {boolean} Whether the birth date satisfies the required-profile bounds.
     */
    function isValidBirthDate(value) {
      if (!value) return false;
      const d = new Date(value + 'T00:00:00');
      if (Number.isNaN(d.getTime())) return false;
      const today = new Date();
      const min = new Date('1900-01-01T00:00:00');
      return d <= today && d >= min;
    }

    /**
     * Checks whether a gender value belongs to the persisted profile allowlist.
     *
     * @param {string} value Persisted gender identifier.
     * @returns {boolean} Whether the value is `male` or `female`.
     */
    function isValidGender(value) {
      return value === 'male' || value === 'female';
    }

    /**
     * Checks whether an activity identifier exists in the injected activity descriptors.
     *
     * @param {string} value Persisted activity-level identifier.
     * @returns {boolean} Whether the activity level is supported.
     */
    function isValidActivityLevel(value) {
      return !!activityLevels[value];
    }

    /**
     * Checks the activity and target fields required for a nutritional-goal profile.
     *
     * @param {Object} profile Plain profile with goal and activity fields.
     * @returns {boolean} Whether the maintenance, loss, or gain profile is complete and valid.
     */
    function isValidGoalProfile(profile) {
      if (!profile || !['maintenance','loss','gain'].includes(profile.goalType)) return false;
      if (!isValidActivityLevel(profile.activityLevel)) return false;
      if (profile.goalType === 'maintenance') return true;
      return Number(profile.goalKg) > 0 && Number(profile.goalWeeks) > 0;
    }

    /**
     * Reads the persisted fields used by the required-profile gate.
     *
     * @returns {Promise<Object>} Profile values with empty-string fallbacks for missing records.
     */
    async function getRequiredProfileData() {
      const [birthDate, gender, activityLevel, goalType, goalKg, goalWeeks, manualAdjustment] = await Promise.all([
        storage.get('birthDate').catch(()=>null),
        storage.get('gender').catch(()=>null),
        storage.get('activityLevel').catch(()=>null),
        storage.get('goalType').catch(()=>null),
        storage.get('goalKg').catch(()=>null),
        storage.get('goalWeeks').catch(()=>null),
        storage.get('manualCalorieAdjustment').catch(()=>null)
      ]);
      return {
        birthDate: birthDate && birthDate.value ? birthDate.value : '',
        gender: gender && gender.value ? gender.value : '',
        activityLevel: activityLevel && activityLevel.value ? activityLevel.value : '',
        goalType: goalType && goalType.value ? goalType.value : '',
        goalKg: goalKg && goalKg.value ? goalKg.value : '',
        goalWeeks: goalWeeks && goalWeeks.value ? goalWeeks.value : '',
        manualAdjustment: manualAdjustment && manualAdjustment.value ? manualAdjustment.value : ''
      };
    }

    /**
     * Checks whether a loaded profile satisfies every required-profile rule.
     *
     * @param {Object} profile Plain profile returned by `getRequiredProfileData` or equivalent input.
     * @returns {boolean} Whether the authenticated app may proceed past the profile gate.
     */
    function hasRequiredProfileData(profile) {
      return !!profile && isValidBirthDate(profile.birthDate) && isValidGender(profile.gender) && isValidGoalProfile(profile);
    }

    return {
      isValidBirthDate,
      isValidGender,
      isValidActivityLevel,
      isValidGoalProfile,
      getRequiredProfileData,
      hasRequiredProfileData
    };
  }

  return { createProfileValidation };
});
