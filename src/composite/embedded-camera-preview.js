const MIN_PREVIEW_EDGE = 48;
const DEFAULT_OPERATION_TIMEOUT_MS = 12000;
const GRANTED_CAMERA_PERMISSIONS = new Set(['granted', 'limited']);

function isPermissionFailure(error) {
  const value = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return value.includes('permission') && (value.includes('denied') || value.includes('not granted'));
}

export class EmbeddedCameraPreviewError extends Error {
  constructor(code, cause) {
    super(code);
    this.name = 'EmbeddedCameraPreviewError';
    this.code = code;
    this.cause = cause;
  }
}

export function measureEmbeddedPreview(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    throw new EmbeddedCameraPreviewError('preview-surface-missing');
  }

  const rect = element.getBoundingClientRect();
  const measured = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };

  if (![measured.x, measured.y, measured.width, measured.height].every(Number.isFinite)
    || measured.width < MIN_PREVIEW_EDGE || measured.height < MIN_PREVIEW_EDGE) {
    throw new EmbeddedCameraPreviewError('preview-surface-invalid');
  }

  return measured;
}

/**
 * Android-only technical seam for the embedded meal camera.
 *
 * C2 deliberately owns only the native preview lifecycle and bounded geometry.
 * The user-facing image-meal state machine and visual transition remain C3 work.
 */
export function createEmbeddedCameraPreview({
  cameraPreviewPlugin,
  cameraPermissionPlugin,
  isNativeAndroid,
  operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  if (!cameraPreviewPlugin
    || typeof cameraPreviewPlugin.start !== 'function'
    || typeof cameraPreviewPlugin.capture !== 'function'
    || typeof cameraPreviewPlugin.stop !== 'function'
    || !cameraPermissionPlugin
    || typeof cameraPermissionPlugin.checkPermissions !== 'function'
    || typeof cameraPermissionPlugin.requestPermissions !== 'function'
    || typeof isNativeAndroid !== 'function') {
    throw new TypeError('Embedded camera preview requires native dependencies');
  }

  let phase = 'idle';
  let operationId = 0;

  function withTimeout(operation, code) {
    let timerId;
    const timeout = new Promise((_, reject) => {
      timerId = setTimer(() => reject(new EmbeddedCameraPreviewError(code)), operationTimeoutMs);
    });
    return Promise.race([Promise.resolve(operation), timeout])
      .finally(() => clearTimer(timerId));
  }

  async function stopNative() {
    let firstFailure;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await withTimeout(cameraPreviewPlugin.stop(), 'preview-stop-timeout');
        return;
      } catch (cause) {
        firstFailure ||= cause;
      }
    }
    throw firstFailure;
  }

  async function ensureCameraPermission() {
    let permission = await cameraPermissionPlugin.checkPermissions();
    if (GRANTED_CAMERA_PERMISSIONS.has(permission?.camera)) return;
    if (permission?.camera === 'denied') {
      throw new EmbeddedCameraPreviewError('camera-permission-denied');
    }
    permission = await cameraPermissionPlugin.requestPermissions({ permissions: ['camera'] });
    if (!GRANTED_CAMERA_PERMISSIONS.has(permission?.camera)) {
      throw new EmbeddedCameraPreviewError('camera-permission-denied');
    }
  }

  async function start(surface) {
    if (!isNativeAndroid()) {
      throw new EmbeddedCameraPreviewError('preview-unsupported');
    }
    if (phase !== 'idle') {
      throw new EmbeddedCameraPreviewError('preview-already-active');
    }

    const bounds = measureEmbeddedPreview(surface);
    const currentOperation = ++operationId;
    phase = 'starting';
    try {
      await ensureCameraPermission();
      if (currentOperation !== operationId) return;
      let startTimedOut = false;
      const nativeStart = Promise.resolve(cameraPreviewPlugin.start({
        ...bounds,
        position: 'rear',
        // The native camera surface stays behind the WebView. C3 makes only the
        // measured viewport transparent and keeps accessible HTML controls above it.
        toBack: true,
        storeToFile: false,
        disableExifHeaderStripping: false,
        // C4 remains deliberately capture-only: no pinch zoom or camera extras.
        enableZoom: false,
        // Keeping the current orientation stable avoids stale native bounds
        // while the WebView changes layout underneath the camera surface.
        lockAndroidOrientation: true,
      }));
      void nativeStart.then(() => {
        if (startTimedOut) return stopNative().catch(() => {});
        return undefined;
      }).catch(() => {});
      try {
        await withTimeout(nativeStart, 'preview-start-timeout');
      } catch (cause) {
        startTimedOut = cause?.code === 'preview-start-timeout';
        throw cause;
      }
      if (currentOperation !== operationId) {
        await stopNative().catch(() => {});
        return;
      }
      phase = 'active';
    } catch (cause) {
      if (currentOperation !== operationId) return;
      operationId += 1;
      await stopNative().catch(() => {});
      phase = 'idle';
      if (cause instanceof EmbeddedCameraPreviewError) throw cause;
      throw new EmbeddedCameraPreviewError(
        isPermissionFailure(cause) ? 'camera-permission-denied' : 'preview-start-failed',
        cause,
      );
    }
  }

  async function capture() {
    if (phase !== 'active') {
      throw new EmbeddedCameraPreviewError('preview-not-active');
    }

    const currentOperation = operationId;
    phase = 'capturing';
    try {
      const result = await withTimeout(cameraPreviewPlugin.capture({
        quality: 100,
        width: 1280,
        height: 1280,
      }), 'preview-capture-timeout');
      if (currentOperation !== operationId) {
        throw new EmbeddedCameraPreviewError('preview-capture-cancelled');
      }
      if (!result?.value || typeof result.value !== 'string') {
        throw new EmbeddedCameraPreviewError('preview-capture-empty');
      }
      phase = 'active';
      return result.value;
    } catch (cause) {
      if (currentOperation === operationId) phase = 'active';
      if (cause instanceof EmbeddedCameraPreviewError) throw cause;
      throw new EmbeddedCameraPreviewError('preview-capture-failed', cause);
    }
  }

  async function stop() {
    if (phase === 'idle') return;
    operationId += 1;
    phase = 'stopping';
    try {
      await stopNative();
    } catch (cause) {
      if (cause instanceof EmbeddedCameraPreviewError) throw cause;
      throw new EmbeddedCameraPreviewError('preview-stop-failed', cause);
    } finally {
      phase = 'idle';
    }
  }

  return {
    start,
    capture,
    stop,
    getPhase: () => phase,
    isSupported: () => isNativeAndroid(),
  };
}
