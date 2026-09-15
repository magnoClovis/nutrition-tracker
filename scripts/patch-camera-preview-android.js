const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_VERSION = '8.0.1';
const PACKAGE_ROOT = path.join(__dirname, '..', 'node_modules', '@capacitor-community', 'camera-preview');

function replaceExactlyOnce(source, original, replacement, label) {
  if (source.includes(replacement)) return source;
  const first = source.indexOf(original);
  if (first < 0 || source.indexOf(original, first + original.length) >= 0) {
    throw new Error(`Camera preview patch mismatch: ${label}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + original.length);
}

function patchCameraPreview(source) {
  return replaceExactlyOnce(
    source,
    '                            fragmentTransaction.commit();\n                            fragment = null;',
    [
      '                            // Teardown may arrive after Activity.onSaveInstanceState when the app is backgrounded.',
      '                            // The camera fragment has no state worth restoring, so allow its removal during cleanup.',
      '                            fragmentTransaction.commitAllowingStateLoss();',
      '                            fragment = null;',
    ].join('\n'),
    'safe fragment teardown',
  );
}

function patchCameraActivity(source) {
  let patched = replaceExactlyOnce(
    source,
    '    private Preview mPreview;\n    private boolean canTakePicture = true;',
    [
      '    private Preview mPreview;',
      '    private boolean canTakePicture = true;',
      '    private final Object cameraOperationLock = new Object();',
      '    private volatile boolean captureCancelled = false;',
    ].join('\n'),
    'camera operation state',
  );

  patched = replaceExactlyOnce(
    patched,
    [
      '        if (mCamera != null) {',
      '            setDefaultCameraId();',
      '            mPreview.setCamera(null, -1);',
      '            mCamera.setPreviewCallback(null);',
      '            mCamera.release();',
      '            mCamera = null;',
      '        }',
    ].join('\n'),
    [
      '        synchronized (cameraOperationLock) {',
      '            if (mCamera != null) {',
      '                setDefaultCameraId();',
      '                if (!canTakePicture) {',
      '                    captureCancelled = true;',
      '                    canTakePicture = true;',
      '                    eventListener.onPictureTakenError("Camera capture interrupted");',
      '                }',
      '                mPreview.setCamera(null, -1);',
      '                mCamera.setPreviewCallback(null);',
      '                mCamera.release();',
      '                mCamera = null;',
      '            }',
      '        }',
    ].join('\n'),
    'serialized pause cleanup',
  );

  patched = replaceExactlyOnce(
    patched,
    [
      '            } finally {',
      '                canTakePicture = true;',
      '                mCamera.startPreview();',
      '            }',
    ].join('\n'),
    [
      '            } finally {',
      '                synchronized (cameraOperationLock) {',
      '                    canTakePicture = true;',
      '                    if (!captureCancelled && mCamera != null) {',
      '                        try {',
      '                            mCamera.startPreview();',
      '                        } catch (RuntimeException error) {',
      '                            Log.w(TAG, "Unable to restart camera preview after capture", error);',
      '                        }',
      '                    }',
      '                    captureCancelled = false;',
      '                }',
      '            }',
    ].join('\n'),
    'safe capture callback cleanup',
  );

  patched = replaceExactlyOnce(
    patched,
    [
      '                public void run() {',
      '                    Camera.Parameters params = mCamera.getParameters();',
      '',
      '                    Camera.Size size = getOptimalPictureSize(width, height, params.getPreviewSize(), params.getSupportedPictureSizes());',
    ].join('\n'),
    [
      '                public void run() {',
      '                    synchronized (cameraOperationLock) {',
      '                        if (mCamera == null || captureCancelled) {',
      '                            canTakePicture = true;',
      '                            eventListener.onPictureTakenError("Camera capture interrupted");',
      '                            return;',
      '                        }',
      '                        try {',
      '                            Camera.Parameters params = mCamera.getParameters();',
      '',
      '                            Camera.Size size = getOptimalPictureSize(width, height, params.getPreviewSize(), params.getSupportedPictureSizes());',
    ].join('\n'),
    'capture lock entry',
  );

  patched = replaceExactlyOnce(
    patched,
    [
      '                    mCamera.setParameters(params);',
      '                    mCamera.takePicture(shutterCallback, null, jpegPictureCallback);',
      '                }',
      '            }',
    ].join('\n'),
    [
      '                            mCamera.setParameters(params);',
      '                            mCamera.takePicture(shutterCallback, null, jpegPictureCallback);',
      '                        } catch (RuntimeException error) {',
      '                            canTakePicture = true;',
      '                            captureCancelled = false;',
      '                            Log.w(TAG, "Camera capture interrupted during teardown", error);',
      '                            eventListener.onPictureTakenError("Camera capture interrupted");',
      '                        }',
      '                    }',
      '                }',
      '            }',
    ].join('\n'),
    'capture lock exit',
  );

  return patched;
}

function applyPatch(packageRoot = PACKAGE_ROOT) {
  const manifestPath = path.join(packageRoot, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Camera preview patch failed: dependency is not installed');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== EXPECTED_VERSION) {
    throw new Error(`Camera preview patch supports ${EXPECTED_VERSION}, found ${manifest.version}`);
  }

  const javaRoot = path.join(packageRoot, 'android', 'src', 'main', 'java', 'com', 'ahm', 'capacitor', 'camera', 'preview');
  for (const [name, patcher] of [
    ['CameraPreview.java', patchCameraPreview],
    ['CameraActivity.java', patchCameraActivity],
  ]) {
    const filePath = path.join(javaRoot, name);
    const original = fs.readFileSync(filePath, 'utf8');
    const patched = patcher(original);
    if (patched !== original) fs.writeFileSync(filePath, patched, 'utf8');
  }
}

if (require.main === module) {
  applyPatch();
  process.stdout.write(`Patched @capacitor-community/camera-preview ${EXPECTED_VERSION} for Android lifecycle safety.\n`);
}

module.exports = { EXPECTED_VERSION, applyPatch, patchCameraActivity, patchCameraPreview, replaceExactlyOnce };
