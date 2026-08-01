/**
 * Capture and transient preprocessing for meal photos.
 *
 * Native camera/gallery access and browser primitives are injected so this
 * module remains testable without retaining, uploading, or persisting images.
 * Every accepted source is redrawn into a fresh canvas and encoded as JPEG,
 * which applies the decoded orientation and deliberately drops source metadata.
 *
 * @module MealImageCapture
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealImageCapture = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MAX_IMAGE_DIMENSION = 1280;
  const MAX_PROCESSED_IMAGE_BYTES = 1500000;
  const JPEG_QUALITY = 0.8;
  const MIN_RETRY_DIMENSION = 320;
  const GRANTED_PERMISSIONS = new Set(["granted", "limited"]);

  class MealImageCaptureError extends Error {
    constructor(code, cause) {
      super(code);
      this.name = "MealImageCaptureError";
      this.code = code;
      if (cause !== undefined) this.cause = cause;
    }
  }

  function calculateContainedDimensions(width, height, maximum = MAX_IMAGE_DIMENSION) {
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new MealImageCaptureError("invalid-image-dimensions");
    }
    const scale = Math.min(1, maximum / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function createMealImageCapture({
    cameraPlugin,
    isNativePlatform,
    documentObject,
    fetchRequest,
    decodeImage,
    createCanvas,
    URLObject,
    blobToBase64,
    cameraDirectionRear,
    jpegEncodingType,
    photoMediaType
  }) {
    if (!cameraPlugin || typeof cameraPlugin.takePhoto !== "function" ||
        typeof cameraPlugin.chooseFromGallery !== "function") {
      throw new TypeError("Meal image capture requires the Capacitor Camera plugin");
    }
    if (typeof isNativePlatform !== "function" || !documentObject ||
        typeof fetchRequest !== "function" || typeof decodeImage !== "function" ||
        typeof createCanvas !== "function" || !URLObject ||
        typeof URLObject.createObjectURL !== "function" ||
        typeof URLObject.revokeObjectURL !== "function" ||
        typeof blobToBase64 !== "function") {
      throw new TypeError("Meal image capture requires browser and image-processing dependencies");
    }

    function selectWebImage({ capture }) {
      return new Promise((resolve, reject) => {
        const input = documentObject.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = false;
        input.hidden = true;
        if (capture) input.setAttribute("capture", "environment");

        let settled = false;
        function cleanup() {
          input.removeEventListener("change", onChange);
          input.removeEventListener("cancel", onCancel);
          if (input.parentNode) input.parentNode.removeChild(input);
        }
        function finish(callback) {
          if (settled) return;
          settled = true;
          cleanup();
          callback();
        }
        function onChange() {
          const file = input.files && input.files[0];
          finish(() => file ? resolve(file) : reject(new MealImageCaptureError("capture-cancelled")));
        }
        function onCancel() {
          finish(() => reject(new MealImageCaptureError("capture-cancelled")));
        }

        input.addEventListener("change", onChange);
        input.addEventListener("cancel", onCancel);
        documentObject.body.appendChild(input);
        input.click();
      });
    }

    async function ensureCameraPermission() {
      if (typeof cameraPlugin.checkPermissions !== "function" ||
          typeof cameraPlugin.requestPermissions !== "function") return;
      let status = await cameraPlugin.checkPermissions();
      if (!GRANTED_PERMISSIONS.has(status && status.camera)) {
        status = await cameraPlugin.requestPermissions({ permissions: ["camera"] });
      }
      if (!GRANTED_PERMISSIONS.has(status && status.camera)) {
        throw new MealImageCaptureError("camera-permission-denied");
      }
    }

    async function resultToBlob(result) {
      const source = result && (result.webPath || result.uri ||
        (result.thumbnail ? `data:image/jpeg;base64,${result.thumbnail}` : ""));
      if (!source) throw new MealImageCaptureError("image-unavailable");
      const response = await fetchRequest(source);
      if (!response || !response.ok || typeof response.blob !== "function") {
        throw new MealImageCaptureError("image-unavailable");
      }
      return response.blob();
    }

    function encodeCanvas(canvas) {
      if (typeof canvas.convertToBlob === "function") {
        return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
      }
      return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new MealImageCaptureError("image-encode-failed"));
        }, "image/jpeg", JPEG_QUALITY);
      });
    }

    async function renderJpeg(decoded, width, height) {
      const canvas = createCanvas(width, height);
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new MealImageCaptureError("image-encode-failed");
      context.drawImage(decoded.image || decoded, 0, 0, width, height);
      const blob = await encodeCanvas(canvas);
      if (!blob || blob.type !== "image/jpeg") {
        throw new MealImageCaptureError("image-encode-failed");
      }
      return blob;
    }

    function createTransientImage(initialBlob, width, height) {
      let blob = initialBlob;
      let previewUrl = URLObject.createObjectURL(blob);
      let disposed = false;
      return {
        get blob() { return blob; },
        get previewUrl() { return previewUrl; },
        get width() { return width; },
        get height() { return height; },
        get size() { return blob ? blob.size : 0; },
        get disposed() { return disposed; },
        async toRequestImage() {
          if (disposed || !blob) throw new MealImageCaptureError("image-disposed");
          return { mimeType: "image/jpeg", data: await blobToBase64(blob) };
        },
        dispose() {
          if (disposed) return;
          disposed = true;
          if (previewUrl) URLObject.revokeObjectURL(previewUrl);
          previewUrl = null;
          blob = null;
        }
      };
    }

    async function preprocess(sourceBlob) {
      if (!sourceBlob || typeof sourceBlob.size !== "number") {
        throw new MealImageCaptureError("invalid-image");
      }
      let decoded;
      try {
        decoded = await decodeImage(sourceBlob);
        let dimensions = calculateContainedDimensions(decoded.width, decoded.height);
        let jpeg = await renderJpeg(decoded, dimensions.width, dimensions.height);

        while (jpeg.size > MAX_PROCESSED_IMAGE_BYTES &&
               Math.max(dimensions.width, dimensions.height) > MIN_RETRY_DIMENSION) {
          const reduction = Math.min(0.9, Math.sqrt(MAX_PROCESSED_IMAGE_BYTES / jpeg.size) * 0.95);
          dimensions = {
            width: Math.max(1, Math.round(dimensions.width * reduction)),
            height: Math.max(1, Math.round(dimensions.height * reduction))
          };
          jpeg = await renderJpeg(decoded, dimensions.width, dimensions.height);
        }

        if (jpeg.size > MAX_PROCESSED_IMAGE_BYTES) {
          throw new MealImageCaptureError("processed-image-too-large");
        }
        return createTransientImage(jpeg, dimensions.width, dimensions.height);
      } catch (error) {
        if (error instanceof MealImageCaptureError) throw error;
        throw new MealImageCaptureError("image-processing-failed", error);
      } finally {
        if (decoded && typeof decoded.close === "function") decoded.close();
      }
    }

    async function captureFromCamera() {
      if (!isNativePlatform()) return preprocess(await selectWebImage({ capture: true }));
      await ensureCameraPermission();
      const result = await cameraPlugin.takePhoto({
        quality: 100,
        targetWidth: MAX_IMAGE_DIMENSION,
        targetHeight: MAX_IMAGE_DIMENSION,
        correctOrientation: true,
        encodingType: jpegEncodingType,
        saveToGallery: false,
        cameraDirection: cameraDirectionRear,
        editable: "no",
        includeMetadata: false
      });
      return preprocess(await resultToBlob(result));
    }

    async function chooseFromGallery() {
      if (!isNativePlatform()) return preprocess(await selectWebImage({ capture: false }));
      const selected = await cameraPlugin.chooseFromGallery({
        mediaType: photoMediaType,
        allowMultipleSelection: false,
        limit: 1,
        includeMetadata: false,
        editable: "no",
        quality: 100,
        targetWidth: MAX_IMAGE_DIMENSION,
        targetHeight: MAX_IMAGE_DIMENSION,
        correctOrientation: true
      });
      const result = selected && selected.results && selected.results[0];
      if (!result) throw new MealImageCaptureError("capture-cancelled");
      return preprocess(await resultToBlob(result));
    }

    return { captureFromCamera, chooseFromGallery, preprocess };
  }

  return {
    MAX_IMAGE_DIMENSION,
    MAX_PROCESSED_IMAGE_BYTES,
    JPEG_QUALITY,
    MealImageCaptureError,
    calculateContainedDimensions,
    createMealImageCapture
  };
});
