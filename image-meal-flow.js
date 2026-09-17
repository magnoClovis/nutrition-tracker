/**
 * Race-safe state machine for capture, analysis, review, and confirmation.
 *
 * @module ImageMealFlow
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageMealFlow = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const ACTIONABLE_STATUSES = new Set(["identified", "uncertain"]);
  const INVALID_PHOTO_CODES = new Set([
    "invalid-image",
    "invalid-image-dimensions",
    "image-unavailable",
    "image-encode-failed",
    "image-processing-failed",
    "processed-image-too-large",
    "invalid-photo"
  ]);
  const DEFAULT_FROZEN_PHOTO_PAINT_TIMEOUT_MS = 2500;

  function initialState() {
    return {
      phase: "empty",
      photo: null,
      estimate: null,
      error: null,
      validationErrors: [],
      retryAfterSeconds: undefined,
      scope: undefined,
      notIdentifiableReason: null,
      cameraFlashModes: [],
      cameraFlashProbe: "not-run",
      cameraFlashMode: "off",
      cameraFlashChanging: false,
      cameraFlashError: null
    };
  }

  function classifyError(error, ImageMealClientError, MealEstimateValidationError) {
    if (error && error.name === "AbortError") return "cancelled";
    if (error && error.code === "capture-cancelled") return "cancelled";
    if (error && error.code === "camera-permission-denied") return "permission-denied";
    if (error && [
      "preview-start-failed",
      "preview-start-timeout",
      "preview-capture-failed",
      "preview-capture-timeout",
      "preview-stop-failed",
      "preview-stop-timeout"
    ].includes(error.code)) return "camera-unavailable";
    if (error && error.code === "preview-capture-empty") return "invalid-photo";
    if (error && INVALID_PHOTO_CODES.has(error.code)) return "invalid-photo";
    if (ImageMealClientError && error instanceof ImageMealClientError) return error.code;
    if (MealEstimateValidationError && error instanceof MealEstimateValidationError) {
      return "invalid-response";
    }
    return "service-unavailable";
  }

  function createImageMealFlow({
    captureFromCamera,
    embeddedCameraPreview,
    preprocessEmbeddedCapture,
    chooseFromGallery,
    analyzeImageMeal,
    normalizeMealEstimate,
    validateMealEstimate,
    onReview,
    onConfirm,
    createAbortController,
    ImageMealClientError,
    MealEstimateValidationError,
    onCameraHandoffTrace,
    frozenPhotoPaintTimeoutMs = DEFAULT_FROZEN_PHOTO_PAINT_TIMEOUT_MS,
    setTimer = setTimeout,
    clearTimer = clearTimeout
  }) {
    if (typeof captureFromCamera !== "function" || typeof chooseFromGallery !== "function" ||
        typeof analyzeImageMeal !== "function" || typeof normalizeMealEstimate !== "function" ||
        typeof validateMealEstimate !== "function" || typeof onReview !== "function" ||
        typeof onConfirm !== "function" ||
        typeof createAbortController !== "function") {
      throw new TypeError("ImageMealFlow requires capture, AI, validation, review, confirmation, and abort dependencies");
    }

    let state = initialState();
    let operationId = 0;
    let activeAbortController = null;
    let cameraPreviousPhoto = null;
    let frozenPhotoPaintTimer = null;
    let frozenPhotoStopPending = false;
    const listeners = new Set();

    function traceCameraHandoff(stage) {
      if (typeof onCameraHandoffTrace !== "function") return;
      try {
        onCameraHandoffTrace(stage);
      } catch (_) {
        // Diagnostics must never influence the camera state machine.
      }
    }

    function snapshot() {
      return {
        ...state,
        validationErrors: [...state.validationErrors],
        cameraFlashModes: [...state.cameraFlashModes]
      };
    }
    function emit(next) {
      state = next;
      const current = snapshot();
      listeners.forEach(listener => listener(current));
      return current;
    }
    function patch(values) {
      return emit({ ...state, ...values });
    }
    function abortActive() {
      if (activeAbortController) activeAbortController.abort();
      activeAbortController = null;
    }
    function clearFrozenPhotoPaintTimer() {
      if (frozenPhotoPaintTimer !== null) clearTimer(frozenPhotoPaintTimer);
      frozenPhotoPaintTimer = null;
    }
    function disposePhoto(photo) {
      if (photo && typeof photo.dispose === "function") photo.dispose();
    }

    async function acquire(source) {
      const currentOperation = ++operationId;
      abortActive();
      const previousPhoto = state.photo;
      patch({ phase: "capturing", error: null, validationErrors: [] });
      try {
        const photo = await (source === "camera" ? captureFromCamera() : chooseFromGallery());
        if (currentOperation !== operationId) {
          disposePhoto(photo);
          return snapshot();
        }
        if (previousPhoto && previousPhoto !== photo) disposePhoto(previousPhoto);
        return emit({
          ...initialState(),
          phase: "photo",
          photo
        });
      } catch (error) {
        if (currentOperation !== operationId) return snapshot();
        const code = classifyError(error, ImageMealClientError, MealEstimateValidationError);
        if (code === "cancelled") {
          return patch({ phase: previousPhoto ? "photo" : "empty", error: null });
        }
        return patch({ phase: "error", photo: previousPhoto, error: code });
      }
    }

    async function openCamera() {
      if (!embeddedCameraPreview || !embeddedCameraPreview.isSupported()) {
        return acquire("camera");
      }
      operationId += 1;
      abortActive();
      cameraPreviousPhoto = state.photo;
      return patch({ phase: "camera-opening", error: null, validationErrors: [] });
    }

    async function startEmbeddedCamera(surface) {
      if (state.phase !== "camera-opening") return snapshot();
      const currentOperation = operationId;
      try {
        await embeddedCameraPreview.start(surface);
        if (currentOperation !== operationId || state.phase !== "camera-opening") {
          await embeddedCameraPreview.stop().catch(() => {});
          return snapshot();
        }
        let cameraFlashModes = [];
        let cameraFlashProbe = "unsupported";
        if (typeof embeddedCameraPreview.getSupportedFlashModes === "function") {
          try {
            cameraFlashModes = await embeddedCameraPreview.getSupportedFlashModes();
            cameraFlashProbe = "complete";
          } catch (error) {
            cameraFlashProbe = error?.code || "preview-flash-modes-failed";
          }
        }
        if (currentOperation !== operationId || state.phase !== "camera-opening") {
          await embeddedCameraPreview.stop().catch(() => {});
          return snapshot();
        }
        if (typeof console !== "undefined" && typeof console.info === "function") {
          console.info(`[CAM-RED-2] rear camera flash modes: ${cameraFlashModes.join(",") || "none"} (${cameraFlashProbe})`);
        }
        return patch({
          phase: "camera-active",
          error: null,
          cameraFlashModes,
          cameraFlashProbe,
          cameraFlashMode: "off",
          cameraFlashChanging: false,
          cameraFlashError: null
        });
      } catch (error) {
        if (currentOperation !== operationId) return snapshot();
        const code = classifyError(error, ImageMealClientError, MealEstimateValidationError);
        cameraPreviousPhoto = null;
        return patch({ phase: "error", error: code, photo: state.photo });
      }
    }

    async function toggleEmbeddedCameraFlash() {
      if (state.phase !== "camera-active" || state.cameraFlashChanging ||
          typeof embeddedCameraPreview?.setFlashMode !== "function") return snapshot();
      const supportedModes = [...state.cameraFlashModes];
      const enabledMode = supportedModes.includes("torch")
        ? "torch"
        : supportedModes.includes("on") ? "on" : null;
      if (!enabledMode || !supportedModes.includes("off")) return snapshot();
      const currentOperation = operationId;
      const previousMode = state.cameraFlashMode;
      const nextMode = previousMode === "off" ? enabledMode : "off";
      patch({ cameraFlashChanging: true, cameraFlashError: null });
      try {
        await embeddedCameraPreview.setFlashMode(nextMode);
        if (currentOperation !== operationId || state.phase !== "camera-active") return snapshot();
        return patch({ cameraFlashMode: nextMode, cameraFlashChanging: false, cameraFlashError: null });
      } catch (error) {
        if (currentOperation !== operationId || state.phase !== "camera-active") return snapshot();
        return patch({
          cameraFlashMode: previousMode,
          cameraFlashChanging: false,
          cameraFlashError: error?.code || "preview-flash-mode-failed"
        });
      }
    }

    async function captureEmbeddedCamera() {
      if (state.phase !== "camera-active") return snapshot();
      const currentOperation = ++operationId;
      patch({ phase: "camera-capturing", error: null });
      try {
        traceCameraHandoff("native-capture-start");
        const base64 = await embeddedCameraPreview.capture();
        traceCameraHandoff("native-capture-resolved");
        if (state.cameraFlashMode !== "off" && typeof embeddedCameraPreview.setFlashMode === "function") {
          await embeddedCameraPreview.setFlashMode("off").catch(() => {});
        }
        const photo = await preprocessEmbeddedCapture(base64);
        traceCameraHandoff("preprocess-resolved");
        if (currentOperation !== operationId) {
          disposePhoto(photo);
          return snapshot();
        }
        const cameraFlashModes = [...state.cameraFlashModes];
        const cameraFlashProbe = state.cameraFlashProbe;
        frozenPhotoStopPending = false;
        const frozen = emit({
          ...initialState(),
          phase: "camera-frozen",
          photo,
          cameraFlashModes,
          cameraFlashProbe
        });
        clearFrozenPhotoPaintTimer();
        frozenPhotoPaintTimer = setTimer(() => {
          traceCameraHandoff("frozen-photo-paint-timeout");
          void rejectEmbeddedPhotoPaint("frozen-photo-paint-timeout");
        }, frozenPhotoPaintTimeoutMs);
        traceCameraHandoff("frozen-state-emitted");
        return frozen;
      } catch (error) {
        clearFrozenPhotoPaintTimer();
        await embeddedCameraPreview.stop().catch(() => {});
        if (currentOperation !== operationId) return snapshot();
        const code = classifyError(error, ImageMealClientError, MealEstimateValidationError);
        const previousPhoto = cameraPreviousPhoto;
        cameraPreviousPhoto = null;
        return patch({ phase: "error", photo: previousPhoto, error: code });
      }
    }

    async function confirmEmbeddedPhotoPainted() {
      if (state.phase !== "camera-frozen" || frozenPhotoStopPending) return snapshot();
      traceCameraHandoff("paint-confirmed");
      const currentOperation = operationId;
      frozenPhotoStopPending = true;
      clearFrozenPhotoPaintTimer();
      try {
        traceCameraHandoff("native-stop-start");
        await embeddedCameraPreview.stop();
        traceCameraHandoff("native-stop-resolved");
        if (currentOperation !== operationId || state.phase !== "camera-frozen") return snapshot();
        if (cameraPreviousPhoto && cameraPreviousPhoto !== state.photo) disposePhoto(cameraPreviousPhoto);
        cameraPreviousPhoto = null;
        frozenPhotoStopPending = false;
        const next = patch({ phase: "photo", error: null });
        traceCameraHandoff("photo-state-emitted");
        return next;
      } catch (error) {
        traceCameraHandoff("native-stop-failed");
        if (currentOperation !== operationId) return snapshot();
        if (cameraPreviousPhoto && cameraPreviousPhoto !== state.photo) disposePhoto(cameraPreviousPhoto);
        cameraPreviousPhoto = null;
        frozenPhotoStopPending = false;
        return patch({
          phase: "error",
          error: classifyError(error, ImageMealClientError, MealEstimateValidationError)
        });
      }
    }

    async function rejectEmbeddedPhotoPaint(code = "invalid-photo") {
      if (state.phase !== "camera-frozen" || frozenPhotoStopPending) return snapshot();
      operationId += 1;
      frozenPhotoStopPending = true;
      clearFrozenPhotoPaintTimer();
      await embeddedCameraPreview.stop().catch(() => {});
      const failedPhoto = state.photo;
      const previousPhoto = cameraPreviousPhoto;
      cameraPreviousPhoto = null;
      frozenPhotoStopPending = false;
      if (failedPhoto && failedPhoto !== previousPhoto) disposePhoto(failedPhoto);
      return emit({
        ...initialState(),
        phase: "error",
        photo: previousPhoto,
        error: code === "frozen-photo-paint-timeout" ? "camera-unavailable" : "invalid-photo"
      });
    }

    async function cancelEmbeddedCamera() {
      if (!state.phase.startsWith("camera-")) return snapshot();
      operationId += 1;
      clearFrozenPhotoPaintTimer();
      frozenPhotoStopPending = false;
      await embeddedCameraPreview.stop().catch(() => {});
      const previousPhoto = cameraPreviousPhoto;
      const interruptedPhoto = state.photo;
      cameraPreviousPhoto = null;
      if (interruptedPhoto && interruptedPhoto !== previousPhoto) disposePhoto(interruptedPhoto);
      return emit({ ...initialState(), phase: previousPhoto ? "photo" : "empty", photo: previousPhoto });
    }

    async function interruptEmbeddedCamera() {
      return cancelEmbeddedCamera();
    }

    async function process(language) {
      if (!state.photo || typeof state.photo.toRequestImage !== "function") {
        return patch({ phase: "error", error: "invalid-photo" });
      }
      const currentOperation = ++operationId;
      abortActive();
      const controller = createAbortController();
      activeAbortController = controller;
      const photo = state.photo;
      patch({
        phase: "processing",
        error: null,
        estimate: null,
        validationErrors: [],
        retryAfterSeconds: undefined,
        scope: undefined,
        notIdentifiableReason: null
      });
      try {
        const image = await photo.toRequestImage();
        const remoteEstimate = await analyzeImageMeal({
          image,
          language,
          signal: controller.signal
        });
        if (currentOperation !== operationId) return snapshot();
        activeAbortController = null;
        const estimate = normalizeMealEstimate(remoteEstimate);
        if (!ACTIONABLE_STATUSES.has(estimate.status)) {
          return patch({
            phase: "not-identifiable",
            estimate: null,
            notIdentifiableReason: estimate.status
          });
        }
        return patch({ phase: "result", estimate });
      } catch (error) {
        if (currentOperation !== operationId) return snapshot();
        activeAbortController = null;
        const code = classifyError(error, ImageMealClientError, MealEstimateValidationError);
        if (code === "cancelled") return patch({ phase: "photo", error: null });
        return patch({
          phase: "error",
          error: code,
          retryAfterSeconds: error?.retryAfterSeconds,
          scope: error?.scope
        });
      }
    }

    function cancelProcessing() {
      if (state.phase !== "processing") return snapshot();
      operationId += 1;
      abortActive();
      return patch({ phase: "photo", error: null });
    }

    function updateEstimate(estimate) {
      if (state.phase !== "result") return snapshot();
      return patch({ estimate, validationErrors: [], error: null });
    }

    function normalizedReviewedEstimate() {
      if (state.phase !== "result" || !state.estimate) return null;
      const validation = validateMealEstimate(state.estimate);
      if (!validation.valid) {
        patch({ validationErrors: validation.errors || [] });
        return null;
      }
      try {
        return normalizeMealEstimate(state.estimate);
      } catch (error) {
        patch({
          validationErrors: Array.isArray(error?.errors) ? error.errors : [],
          error: "invalid-response"
        });
        return null;
      }
    }

    async function review() {
      const normalized = normalizedReviewedEstimate();
      if (!normalized) return snapshot();
      try {
        await onReview(normalized);
        return patch({ validationErrors: [], error: null });
      } catch (_) {
        return patch({ error: "invalid-response" });
      }
    }

    async function confirm() {
      const normalized = normalizedReviewedEstimate();
      if (!normalized) return snapshot();
      const currentOperation = ++operationId;
      patch({ phase: "confirming", validationErrors: [], error: null });
      try {
        await onConfirm(normalized);
        if (currentOperation !== operationId) return snapshot();
        disposePhoto(state.photo);
        return emit({ ...initialState(), phase: "confirmed" });
      } catch (_) {
        if (currentOperation !== operationId) return snapshot();
        return patch({ phase: "result", error: "confirmation-failed" });
      }
    }

    function discard() {
      operationId += 1;
      abortActive();
      clearFrozenPhotoPaintTimer();
      frozenPhotoStopPending = false;
      if (embeddedCameraPreview) embeddedCameraPreview.stop().catch(() => {});
      if (cameraPreviousPhoto && cameraPreviousPhoto !== state.photo) disposePhoto(cameraPreviousPhoto);
      cameraPreviousPhoto = null;
      disposePhoto(state.photo);
      return emit(initialState());
    }

    function subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("ImageMealFlow listener must be a function");
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return {
      getState: snapshot,
      subscribe,
      captureFromCamera: openCamera,
      startEmbeddedCamera,
      captureEmbeddedCamera,
      toggleEmbeddedCameraFlash,
      traceCameraHandoff,
      confirmEmbeddedPhotoPainted,
      rejectEmbeddedPhotoPaint,
      cancelEmbeddedCamera,
      interruptEmbeddedCamera,
      chooseFromGallery: () => acquire("gallery"),
      process,
      cancelProcessing,
      updateEstimate,
      review,
      confirm,
      discard,
      destroy: discard
    };
  }

  return { initialState, classifyError, createImageMealFlow };
});
