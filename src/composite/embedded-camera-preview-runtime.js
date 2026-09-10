import { CameraPreview } from '@capacitor-community/camera-preview';
import { Capacitor } from '@capacitor/core';
import { createEmbeddedCameraPreview } from './embedded-camera-preview.js';

export const embeddedMealCameraPreview = createEmbeddedCameraPreview({
  cameraPreviewPlugin: CameraPreview,
  isNativeAndroid: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
});
