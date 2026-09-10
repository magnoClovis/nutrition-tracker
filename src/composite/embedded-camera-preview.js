const MIN_PREVIEW_EDGE = 48;

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
  isNativeAndroid,
}) {
  if (!cameraPreviewPlugin
    || typeof cameraPreviewPlugin.start !== 'function'
    || typeof cameraPreviewPlugin.capture !== 'function'
    || typeof cameraPreviewPlugin.stop !== 'function'
    || typeof isNativeAndroid !== 'function') {
    throw new TypeError('Embedded camera preview requires native dependencies');
  }

  let phase = 'idle';
  let operationId = 0;

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
      await cameraPreviewPlugin.start({
        ...bounds,
        position: 'rear',
        toBack: false,
        storeToFile: false,
        disableExifHeaderStripping: false,
        enableZoom: true,
        lockAndroidOrientation: false,
      });
      if (currentOperation !== operationId) return;
      phase = 'active';
    } catch (cause) {
      if (currentOperation === operationId) phase = 'idle';
      throw new EmbeddedCameraPreviewError('preview-start-failed', cause);
    }
  }

  async function capture() {
    if (phase !== 'active') {
      throw new EmbeddedCameraPreviewError('preview-not-active');
    }

    phase = 'capturing';
    try {
      const result = await cameraPreviewPlugin.capture({
        quality: 100,
        width: 1280,
        height: 1280,
      });
      if (!result?.value || typeof result.value !== 'string') {
        throw new EmbeddedCameraPreviewError('preview-capture-empty');
      }
      phase = 'active';
      return result.value;
    } catch (cause) {
      phase = 'active';
      if (cause instanceof EmbeddedCameraPreviewError) throw cause;
      throw new EmbeddedCameraPreviewError('preview-capture-failed', cause);
    }
  }

  async function stop() {
    if (phase === 'idle') return;
    operationId += 1;
    phase = 'stopping';
    try {
      await cameraPreviewPlugin.stop();
    } catch (cause) {
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
