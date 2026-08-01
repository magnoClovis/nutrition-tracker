import { Capacitor } from '@capacitor/core';
import {
  Camera,
  CameraDirection,
  EncodingType,
  MediaTypeSelection,
} from '@capacitor/camera';
import { createMealImageCapture } from './meal-image-capture.js';

function loadHtmlImage(blob) {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(source),
      image,
    });
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error('Unable to decode image'));
    };
    image.src = source;
  });
}

async function decodeImage(blob) {
  if (typeof globalThis.createImageBitmap === 'function') {
    return globalThis.createImageBitmap(blob, { imageOrientation: 'from-image' });
  }
  const decoded = await loadHtmlImage(blob);
  return {
    width: decoded.width,
    height: decoded.height,
    close: decoded.close,
    get image() { return decoded.image; },
  };
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const separator = result.indexOf(',');
      if (separator < 0) reject(new Error('Unable to encode image'));
      else resolve(result.slice(separator + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to encode image'));
    reader.readAsDataURL(blob);
  });
}

const captureService = createMealImageCapture({
  cameraPlugin: Camera,
  isNativePlatform: () => Capacitor.isNativePlatform(),
  documentObject: document,
  fetchRequest: (...args) => fetch(...args),
  decodeImage,
  createCanvas,
  URLObject: URL,
  blobToBase64,
  cameraDirectionRear: CameraDirection.Rear,
  jpegEncodingType: EncodingType.JPEG,
  photoMediaType: MediaTypeSelection.Photo,
});

export const captureMealImageFromCamera = captureService.captureFromCamera;
export const chooseMealImageFromGallery = captureService.chooseFromGallery;
export const preprocessMealImage = captureService.preprocess;
