import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';

/**
 * Native-only haptic boundary for the in-app achievement toast.
 *
 * The controller owns queueing and must remain usable in the web/legacy runtime,
 * so unsupported platforms deliberately resolve false rather than throw.
 */
export function createGoalToastFeedbackRuntime({
  haptics = Haptics,
  isNativeAndroid = () => (
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  ),
} = {}) {
  async function notify(tone = 'success') {
    if (!isNativeAndroid() || typeof haptics?.notification !== 'function') return false;
    try {
      await haptics.notification({
        type: tone === 'warning' ? NotificationType.Warning : NotificationType.Success,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  return { notify };
}

export const goalToastFeedbackRuntime = createGoalToastFeedbackRuntime();
