const MIN_PREVIEW_EDGE = 48;
const DEFAULT_OPERATION_TIMEOUT_MS = 12000;
const GRANTED_CAMERA_PERMISSIONS = new Set(['granted', 'limited']);
const PREVIEW_VIEWPORT_GUTTER = 12;

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

function nextLayoutFrame(element) {
  const view = element?.ownerDocument?.defaultView;
  return new Promise(resolve => {
    if (typeof view?.requestAnimationFrame === 'function') {
      view.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

/**
 * Places the complete camera card inside the add-meal viewport before its
 * native bounds are measured. The viewport is locked after settling and
 * before CameraPreview starts so HTML controls cannot drift from the surface.
 */
export async function prepareEmbeddedPreviewSurface(element) {
  if (!element || typeof element.closest !== 'function') return false;
  const card = element.closest('[data-embedded-camera="true"]');
  const scrollViewport = element.closest('[data-app-main="adicionar"]');
  if (!card || !scrollViewport
    || typeof card.getBoundingClientRect !== 'function'
    || typeof scrollViewport.getBoundingClientRect !== 'function') {
    return false;
  }

  const cardRect = card.getBoundingClientRect();
  const viewportRect = scrollViewport.getBoundingClientRect();
  const availableHeight = viewportRect.height - (PREVIEW_VIEWPORT_GUTTER * 2);
  let scrollDelta = 0;

  if (cardRect.height <= availableHeight && cardRect.top < viewportRect.top + PREVIEW_VIEWPORT_GUTTER) {
    scrollDelta = cardRect.top - viewportRect.top - PREVIEW_VIEWPORT_GUTTER;
  } else if (cardRect.bottom > viewportRect.bottom - PREVIEW_VIEWPORT_GUTTER) {
    scrollDelta = cardRect.bottom - viewportRect.bottom + PREVIEW_VIEWPORT_GUTTER;
  }

  if (scrollDelta !== 0) {
    if (typeof scrollViewport.scrollBy === 'function') {
      scrollViewport.scrollBy({ top: scrollDelta, behavior: 'auto' });
    } else if (Number.isFinite(scrollViewport.scrollTop)) {
      scrollViewport.scrollTop += scrollDelta;
    }
    await nextLayoutFrame(element);
    await nextLayoutFrame(element);
  }
  if (card.dataset) card.dataset.cameraGeometryReady = 'true';
  await nextLayoutFrame(element);
  return true;
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

    const currentOperation = ++operationId;
    phase = 'starting';
    try {
      await ensureCameraPermission();
      if (currentOperation !== operationId) return;
      await prepareEmbeddedPreviewSurface(surface);
      if (currentOperation !== operationId) return;
      const bounds = measureEmbeddedPreview(surface);
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
