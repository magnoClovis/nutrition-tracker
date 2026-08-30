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

  function initialState() {
    return {
      phase: "empty",
      photo: null,
      estimate: null,
      error: null,
      validationErrors: [],
      retryAfterSeconds: undefined,
      scope: undefined,
      notIdentifiableReason: null
    };
  }

  function classifyError(error, ImageMealClientError, MealEstimateValidationError) {
    if (error && error.name === "AbortError") return "cancelled";
    if (error && error.code === "capture-cancelled") return "cancelled";
    if (error && error.code === "camera-permission-denied") return "permission-denied";
    if (error && INVALID_PHOTO_CODES.has(error.code)) return "invalid-photo";
    if (ImageMealClientError && error instanceof ImageMealClientError) return error.code;
    if (MealEstimateValidationError && error instanceof MealEstimateValidationError) {
      return "invalid-response";
    }
    return "service-unavailable";
  }

  function createImageMealFlow({
    captureFromCamera,
    chooseFromGallery,
    analyzeImageMeal,
    normalizeMealEstimate,
    validateMealEstimate,
    onReview,
    onConfirm,
    createAbortController,
    ImageMealClientError,
    MealEstimateValidationError
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
    const listeners = new Set();

    function snapshot() {
      return { ...state, validationErrors: [...state.validationErrors] };
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
      captureFromCamera: () => acquire("camera"),
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
