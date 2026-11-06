// Local, non-critical Android reminders. Dates are constructed in the device's
// civil timezone; no health data or account identifier enters a notification.
export const REMINDER_CHANNEL_ID = 'trofia_reminders_v1';
export const REMINDER_IDS = Object.freeze({
  water: [2601001, 2601002],
  daily: [2601010, 2601011, 2601012, 2601013, 2601014, 2601015],
});
export const OWNED_REMINDER_IDS = Object.freeze([
  ...REMINDER_IDS.water,
  ...REMINDER_IDS.daily,
]);
export const DEFAULT_REMINDER_PREFERENCES = Object.freeze({
  enabled: false,
  water: true,
  daily: false,
  activeStart: '09:00',
  activeEnd: '20:00',
});

const MIN_LEAD_MS = 45 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function minutesOf(value, fallback) {
  if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return fallback;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

export function normalizeReminderPreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  const start = minutesOf(source.activeStart, 540);
  const end = minutesOf(source.activeEnd, 1200);
  const validWindow = start >= 360 && end <= 1380 && end - start >= 240;
  return {
    enabled: source.enabled === true,
    water: source.water !== false,
    daily: source.daily === true,
    activeStart: validWindow ? `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}` : '09:00',
    activeEnd: validWindow ? `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}` : '20:00',
  };
}

function localAt(day, minuteOfDay) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(),
    Math.floor(minuteOfDay / 60), minuteOfDay % 60);
}

function message(kind, language) {
  const code = String(language || 'pt').slice(0, 2).toLowerCase();
  const copy = {
    water: {pt: 'Que tal fazer uma pausa para beber água?', en: 'How about taking a water break?', es: '¿Qué tal hacer una pausa para beber agua?'},
    morning: {pt: 'Um novo dia para cuidar de você.', en: 'A new day to take care of yourself.', es: 'Un nuevo día para cuidarte.'},
    midday: {pt: 'Que tal conferir como vai o seu dia?', en: 'How about checking in on your day?', es: '¿Qué tal revisar cómo va tu día?'},
    evening: {pt: 'Reserve um momento para revisar o seu dia.', en: 'Take a moment to review your day.', es: 'Dedica un momento a revisar tu día.'},
  };
  return copy[kind][code] || copy[kind].pt;
}

function notification(id, kind, at, language) {
  return {
    id,
    title: 'Trofia',
    body: message(kind, language),
    channelId: REMINDER_CHANNEL_ID,
    schedule: {at},
    isExactNotification: false,
    extra: {kind: kind === 'water' ? 'water' : 'diary'},
  };
}

/** Build at most two water reminders for a confirmed current civil day and
 * three generic daily check-ins per day for today/tomorrow. */
export function buildLocalReminderPlan({now = new Date(), preferences, waterState, language = 'pt'} = {}) {
  const prefs = normalizeReminderPreferences(preferences);
  if (!prefs.enabled || (!prefs.water && !prefs.daily)) return [];
  const current = new Date(now);
  if (Number.isNaN(current.getTime())) return [];
  const start = minutesOf(prefs.activeStart, 540);
  const end = minutesOf(prefs.activeEnd, 1200);
  const result = [];
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate());

  if (prefs.water && waterState?.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`) {
    const goal = Number(waterState.goal);
    const entries = waterState.intake;
    const validEntries = Array.isArray(entries) && entries.every(entry => Number.isFinite(Number(entry?.ml)) && Number(entry.ml) >= 0);
    const total = validEntries ? entries.reduce((sum, entry) => sum + Number(entry.ml), 0) : NaN;
    if (Number.isFinite(goal) && goal > 0 && Number.isFinite(total) && total < goal) {
      const deficitRatio = Math.min(1, (goal - total) / goal);
      const count = deficitRatio > 0.5 ? 2 : 1;
      const slots = [start + Math.floor((end - start) / 3), start + Math.floor((end - start) * 2 / 3)];
      const future = slots.map(minute => localAt(today, minute))
        .filter(at => at.getTime() - current.getTime() >= MIN_LEAD_MS);
      future.slice(0, count).forEach((at, index) => result.push(notification(REMINDER_IDS.water[index], 'water', at, language)));
    }
  }

  if (prefs.daily) {
    for (let offset = 0; offset < 2; offset += 1) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      const slots = [
        ['morning', start + 30],
        ['midday', Math.floor((start + end) / 2)],
        ['evening', end - 30],
      ];
      slots.forEach(([kind, minute], index) => {
        const at = localAt(day, minute);
        if (at.getTime() - current.getTime() >= MIN_LEAD_MS &&
            at.getTime() - current.getTime() < 2 * DAY_MS) {
          result.push(notification(REMINDER_IDS.daily[offset * 3 + index], kind, at, language));
        }
      });
    }
  }
  return result;
}
