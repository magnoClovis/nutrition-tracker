import { CameraPreview } from '@capacitor-community/camera-preview';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { createEmbeddedCameraPreview } from './embedded-camera-preview.js';

export const embeddedMealCameraPreview = createEmbeddedCameraPreview({
  cameraPreviewPlugin: CameraPreview,
  cameraPermissionPlugin: Camera,
  isNativeAndroid: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
});
