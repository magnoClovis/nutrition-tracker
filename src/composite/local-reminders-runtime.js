import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {
  buildLocalReminderPlan,
  normalizeReminderPreferences,
  OWNED_REMINDER_IDS,
  REMINDER_CHANNEL_ID,
} from './local-reminder-model.js';

const owned = new Set(OWNED_REMINDER_IDS);
const preferenceKey = uid => `trofia.local-reminders.v1.${uid}`;

export function readLocalReminderPreferences(storage, uid) {
  if (!uid) return normalizeReminderPreferences(null);
  try { return normalizeReminderPreferences(JSON.parse(storage.getItem(preferenceKey(uid)))); }
  catch (_) { return normalizeReminderPreferences(null); }
}

export function saveLocalReminderPreferences(storage, uid, value) {
  if (!uid) throw new Error('A signed-in account is required for reminder preferences');
  const normalized = normalizeReminderPreferences(value);
  storage.setItem(preferenceKey(uid), JSON.stringify(normalized));
  return normalized;
}

function atMillis(item) {
  const value = item?.schedule?.at;
  return new Date(value).getTime();
}

function sameNotification(actual, desired) {
  return actual.id === desired.id && actual.title === desired.title &&
    actual.body === desired.body && atMillis(actual) === atMillis(desired);
}

/** Injectable native boundary. Every write is serialized and limited to C26-B IDs. */
export function createLocalReminderRuntime({
  plugin,
  isNativeAndroid,
  now = () => new Date(),
}) {
  if (!plugin || typeof plugin.getPending !== 'function' || typeof isNativeAndroid !== 'function') {
    throw new TypeError('Local reminder runtime requires a plugin and Android detector');
  }
  let queue = Promise.resolve();
  const serialize = work => {
    const next = queue.catch(() => {}).then(work);
    queue = next;
    return next;
  };

  async function clearOwned() {
    if (!isNativeAndroid()) return;
    const pending = (await plugin.getPending()).notifications || [];
    const ours = pending.filter(item => owned.has(item.id));
    if (ours.length) await plugin.cancel({notifications: ours.map(({id}) => ({id}))});
    // Already displayed reminders must not survive a logout/account change.
    const delivered = (await plugin.getDeliveredNotifications()).notifications || [];
    const visible = delivered.filter(item => owned.has(item.id));
    if (visible.length) await plugin.removeDeliveredNotifications({notifications: visible});
  }

  async function reconcile({uid, preferences, waterState, language}) {
    if (!isNativeAndroid()) return {status: 'unsupported', count: 0};
    if (!uid || !normalizeReminderPreferences(preferences).enabled) {
      await clearOwned();
      return {status: 'disabled', count: 0};
    }
    const permission = await plugin.checkPermissions();
    if (permission.display !== 'granted') {
      await clearOwned();
      return {status: 'permission-denied', count: 0};
    }
    const plan = buildLocalReminderPlan({now: now(), preferences, waterState, language});
    const pending = (await plugin.getPending()).notifications || [];
    const ours = pending.filter(item => owned.has(item.id));
    const desired = new Map(plan.map(item => [item.id, item]));
    const obsolete = ours.filter(item => !desired.has(item.id) || !sameNotification(item, desired.get(item.id)));
    if (obsolete.length) await plugin.cancel({notifications: obsolete.map(({id}) => ({id}))});
    const unchanged = new Set(ours.filter(item => desired.has(item.id) && sameNotification(item, desired.get(item.id))).map(item => item.id));
    const missing = plan.filter(item => !unchanged.has(item.id));
    if (missing.length) {
      const channelCopy = language === 'en'
        ? ['Trofia reminders', 'Optional local reminders']
        : language === 'es'
          ? ['Recordatorios de Trofia', 'Recordatorios locales opcionales']
          : ['Lembretes do Trofia', 'Lembretes locais opcionais'];
      await plugin.createChannel({
        id: REMINDER_CHANNEL_ID,
        name: channelCopy[0],
        description: channelCopy[1],
        importance: 2,
        visibility: -1,
      });
      await plugin.schedule({notifications: missing});
    }
    const confirmed = (await plugin.getPending()).notifications || [];
    if (plan.some(item => !confirmed.some(actual => sameNotification(actual, item)))) {
      throw new Error('Native reminder schedule was not confirmed');
    }
    return {status: 'enabled', count: plan.length};
  }

  return {
    isAvailable: isNativeAndroid,
    requestPermission: () => serialize(async () => {
      if (!isNativeAndroid()) return false;
      const existing = await plugin.checkPermissions();
      if (existing.display === 'granted') return true;
      const requested = await plugin.requestPermissions();
      return requested.display === 'granted';
    }),
    reconcile: input => serialize(() => reconcile(input)),
    clearOwned: () => serialize(clearOwned),
    addActionListener: async callback => {
      if (!isNativeAndroid()) return () => {};
      const handle = await plugin.addListener('localNotificationActionPerformed', event => {
        const id = event?.notification?.id;
        const kind = event?.notification?.extra?.kind;
        if (owned.has(id) && (kind === 'water' || kind === 'diary')) callback(kind);
      });
      return () => handle.remove();
    },
  };
}

export const localReminderRuntime = createLocalReminderRuntime({
  plugin: LocalNotifications,
  isNativeAndroid: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
});
