const test = require("node:test");
const assert = require("node:assert/strict");
const { createGoalCalculator } = require("../../goal-calculator.js");
const { createProfileValidation } = require("../../profile-validation.js");

const { ACTIVITY_LEVELS } = createGoalCalculator();

function createStorage(values = {}) {
  return {
    async get(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? { value: values[key] } : null;
    }
  };
}

function createApi(values = {}) {
  return createProfileValidation({ storage: createStorage(values), activityLevels: ACTIVITY_LEVELS });
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("validates birth-date boundaries using the current local date", () => {
  const { isValidBirthDate } = createApi();
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  assert.equal(isValidBirthDate(localDateString(today)), true);
  assert.equal(isValidBirthDate(localDateString(tomorrow)), false);
  assert.equal(isValidBirthDate("1899-12-31"), false);
  assert.equal(isValidBirthDate("1900-01-01"), true);
  assert.equal(isValidBirthDate("2000-02-29"), true);
  assert.equal(isValidBirthDate(""), false);
});

test("validates gender and the real goal-calculator activity levels", () => {
  const { isValidGender, isValidActivityLevel } = createApi();

  assert.equal(isValidGender("male"), true);
  assert.equal(isValidGender("female"), true);
  assert.equal(isValidGender("other"), false);
  assert.equal(isValidGender(""), false);
  for (const activityLevel of Object.keys(ACTIVITY_LEVELS)) {
    assert.equal(isValidActivityLevel(activityLevel), true);
  }
  assert.equal(isValidActivityLevel("unknown"), false);
  assert.equal(isValidActivityLevel(), false);
});

test("validates maintenance, loss, and gain goal profiles", () => {
  const { isValidGoalProfile } = createApi();

  assert.equal(isValidGoalProfile({ activityLevel: "moderate", goalType: "maintenance" }), true);
  assert.equal(isValidGoalProfile({ activityLevel: "light", goalType: "loss", goalKg: "5", goalWeeks: "10" }), true);
  assert.equal(isValidGoalProfile({ activityLevel: "very", goalType: "gain", goalKg: 3.5, goalWeeks: 8 }), true);
  assert.equal(isValidGoalProfile({ activityLevel: "moderate", goalType: "loss", goalKg: 0, goalWeeks: 10 }), false);
  assert.equal(isValidGoalProfile({ activityLevel: "unknown", goalType: "maintenance" }), false);
  assert.equal(isValidGoalProfile({ activityLevel: "moderate", goalType: "invalid" }), false);
  assert.equal(isValidGoalProfile(), false);
});

test("reads a complete profile and preserves the persisted/manual property-name distinction", async () => {
  const values = {
    birthDate: "1990-06-15",
    gender: "female",
    activityLevel: "moderate",
    goalType: "loss",
    goalKg: "5",
    goalWeeks: "10",
    manualCalorieAdjustment: "-300"
  };
  const { getRequiredProfileData, hasRequiredProfileData } = createApi(values);
  const profile = await getRequiredProfileData();

  assert.deepEqual(profile, {
    birthDate: "1990-06-15",
    gender: "female",
    activityLevel: "moderate",
    goalType: "loss",
    goalKg: "5",
    goalWeeks: "10",
    manualAdjustment: "-300"
  });
  assert.equal(Object.hasOwn(profile, "manualCalorieAdjustment"), false);
  assert.equal(hasRequiredProfileData(profile), true);
});

test("returns empty fallbacks for partial and empty persisted profiles", async () => {
  const partialApi = createApi({ birthDate: "1990-06-15", gender: "male" });
  const partial = await partialApi.getRequiredProfileData();
  assert.deepEqual(partial, {
    birthDate: "1990-06-15",
    gender: "male",
    activityLevel: "",
    goalType: "",
    goalKg: "",
    goalWeeks: "",
    manualAdjustment: ""
  });
  assert.equal(partialApi.hasRequiredProfileData(partial), false);

  const emptyApi = createApi();
  const empty = await emptyApi.getRequiredProfileData();
  assert.deepEqual(empty, {
    birthDate: "",
    gender: "",
    activityLevel: "",
    goalType: "",
    goalKg: "",
    goalWeeks: "",
    manualAdjustment: ""
  });
  assert.equal(emptyApi.hasRequiredProfileData(empty), false);
});
