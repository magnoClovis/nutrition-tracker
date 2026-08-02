const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../meal-image-capture.js'))],
  ['ESM', () => import('../../src/composite/meal-image-capture.js')],
];

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

function createFixture(api, overrides = {}) {
  const calls = {
    takePhoto: [],
    gallery: [],
    permissionRequests: [],
    fetched: [],
    canvases: [],
    draws: [],
    objectUrls: [],
    revoked: [],
    decodedClosed: 0,
  };
  const sourceBlob = overrides.sourceBlob || new Blob(['source-with-exif'], { type: 'image/png' });
  const encodedSizes = [...(overrides.encodedSizes || [900])];
  const cameraPlugin = {
    async checkPermissions() {
      return overrides.checkedPermission || { camera: 'granted', photos: 'granted' };
    },
    async requestPermissions(options) {
      calls.permissionRequests.push(options);
      return overrides.requestedPermission || { camera: 'granted', photos: 'granted' };
    },
    async takePhoto(options) {
      calls.takePhoto.push(options);
      return overrides.cameraResult || { webPath: 'capacitor://camera-photo' };
    },
    async chooseFromGallery(options) {
      calls.gallery.push(options);
      return overrides.galleryResult || { results: [{ uri: 'content://gallery-photo' }] };
    },
  };
  const documentObject = overrides.documentObject || {
    body: { appendChild() {} },
    createElement() { throw new Error('unexpected web input'); },
  };
  const fixture = {
    calls,
    sourceBlob,
    service: api.createMealImageCapture({
      cameraPlugin,
      isNativePlatform: () => overrides.native !== false,
      documentObject,
      async fetchRequest(source) {
        calls.fetched.push(source);
        return { ok: true, blob: async () => sourceBlob };
      },
      async decodeImage() {
        return {
          width: overrides.width || 4000,
          height: overrides.height || 2000,
          close() { calls.decodedClosed += 1; },
        };
      },
      createCanvas(width, height) {
        calls.canvases.push({ width, height });
        return {
          width,
          height,
          getContext() {
            return {
              drawImage(...args) { calls.draws.push(args); },
            };
          },
          toBlob(callback, type, quality) {
            const size = encodedSizes.length > 1 ? encodedSizes.shift() : encodedSizes[0];
            calls.canvases.at(-1).encoding = { type, quality, size };
            callback(new Blob([new Uint8Array(size)], { type: 'image/jpeg' }));
          },
        };
      },
      URLObject: {
        createObjectURL(blob) {
          const url = `blob:preview-${calls.objectUrls.length + 1}`;
          calls.objectUrls.push({ url, blob });
          return url;
        },
        revokeObjectURL(url) { calls.revoked.push(url); },
      },
      async blobToBase64(blob) {
        return `encoded-${blob.size}`;
      },
      cameraDirectionRear: 'REAR',
      jpegEncodingType: 'JPEG',
      photoMediaType: 'PHOTO',
    }),
  };
  return fixture;
}

contractTest('contains landscape and portrait images within 1280px', api => {
  assert.deepEqual(api.calculateContainedDimensions(4000, 2000), { width: 1280, height: 640 });
  assert.deepEqual(api.calculateContainedDimensions(1200, 2400), { width: 640, height: 1280 });
  assert.deepEqual(api.calculateContainedDimensions(640, 480), { width: 640, height: 480 });
  assert.throws(() => api.calculateContainedDimensions(0, 480), error => (
    error instanceof api.MealImageCaptureError && error.code === 'invalid-image-dimensions'
  ));
});

contractTest('captures natively with orientation correction and no metadata or gallery persistence', async api => {
  const fixture = createFixture(api, {
    checkedPermission: { camera: 'prompt' },
    requestedPermission: { camera: 'granted' },
  });

  const image = await fixture.service.captureFromCamera();

  assert.deepEqual(fixture.calls.permissionRequests, [{ permissions: ['camera'] }]);
  assert.deepEqual(fixture.calls.takePhoto, [{
    quality: 100,
    targetWidth: 1280,
    targetHeight: 1280,
    correctOrientation: true,
    encodingType: 'JPEG',
    saveToGallery: false,
    cameraDirection: 'REAR',
    editable: 'no',
    includeMetadata: false,
  }]);
  assert.deepEqual(fixture.calls.fetched, ['capacitor://camera-photo']);
  assert.deepEqual(fixture.calls.canvases, [{
    width: 1280,
    height: 640,
    encoding: { type: 'image/jpeg', quality: 0.8, size: 900 },
  }]);
  assert.equal(fixture.calls.decodedClosed, 1);
  assert.equal(image.previewUrl, 'blob:preview-1');
  assert.equal(image.size, 900);
  assert.deepEqual(await image.toRequestImage(), {
    mimeType: 'image/jpeg',
    data: 'encoded-900',
  });

  image.dispose();
  image.dispose();
  assert.equal(image.disposed, true);
  assert.equal(image.previewUrl, null);
  assert.equal(image.blob, null);
  assert.equal(image.size, 0);
  assert.deepEqual(fixture.calls.revoked, ['blob:preview-1']);
  await assert.rejects(image.toRequestImage(), error => error.code === 'image-disposed');
});

contractTest('chooses one native gallery photo with preprocessing options', async api => {
  const fixture = createFixture(api);
  await fixture.service.chooseFromGallery();

  assert.deepEqual(fixture.calls.gallery, [{
    mediaType: 'PHOTO',
    allowMultipleSelection: false,
    limit: 1,
    includeMetadata: false,
    editable: 'no',
    quality: 100,
    targetWidth: 1280,
    targetHeight: 1280,
    correctOrientation: true,
  }]);
  assert.deepEqual(fixture.calls.fetched, ['content://gallery-photo']);
});

contractTest('uses a hidden file input on web and only adds capture for live camera', async api => {
  const inputs = [];
  function createInput(file) {
    const listeners = {};
    const input = {
      files: [file],
      parentNode: null,
      attributes: {},
      addEventListener(type, callback) { listeners[type] = callback; },
      removeEventListener(type) { delete listeners[type]; },
      setAttribute(name, value) { this.attributes[name] = value; },
      click() { listeners.change(); },
    };
    inputs.push(input);
    return input;
  }
  const webFiles = [
    new Blob(['camera'], { type: 'image/heic' }),
    new Blob(['gallery'], { type: 'image/png' }),
  ];
  const documentObject = {
    body: {
      appendChild(input) {
        input.parentNode = this;
      },
      removeChild(input) {
        input.parentNode = null;
      },
    },
    createElement(type) {
      assert.equal(type, 'input');
      return createInput(webFiles.shift());
    },
  };
  const fixture = createFixture(api, { native: false, documentObject });

  await fixture.service.captureFromCamera();
  await fixture.service.chooseFromGallery();

  assert.equal(inputs[0].type, 'file');
  assert.equal(inputs[0].accept, 'image/*');
  assert.equal(inputs[0].attributes.capture, 'environment');
  assert.deepEqual(inputs[1].attributes, {});
  assert.ok(inputs.every(input => input.parentNode === null));
  assert.equal(fixture.calls.takePhoto.length, 0);
  assert.equal(fixture.calls.gallery.length, 0);
});

contractTest('keeps JPEG quality at 80% while reducing a noisy result below 1.5 MB', async api => {
  const fixture = createFixture(api, {
    width: 3000,
    height: 3000,
    encodedSizes: [2000000, 1400000],
  });

  const image = await fixture.service.preprocess(fixture.sourceBlob);

  assert.equal(fixture.calls.canvases.length, 2);
  assert.deepEqual(fixture.calls.canvases.map(canvas => canvas.encoding.quality), [0.8, 0.8]);
  assert.deepEqual(fixture.calls.canvases[0], {
    width: 1280,
    height: 1280,
    encoding: { type: 'image/jpeg', quality: 0.8, size: 2000000 },
  });
  assert.ok(image.width < 1280);
  assert.equal(image.width, image.height);
  assert.equal(image.size, 1400000);
  assert.ok(image.size <= api.MAX_PROCESSED_IMAGE_BYTES);
});

contractTest('rejects denied camera permission before opening the camera', async api => {
  const fixture = createFixture(api, {
    checkedPermission: { camera: 'denied' },
    requestedPermission: { camera: 'denied' },
  });

  await assert.rejects(
    fixture.service.captureFromCamera(),
    error => error instanceof api.MealImageCaptureError && error.code === 'camera-permission-denied',
  );
  assert.equal(fixture.calls.takePhoto.length, 0);
});

contractTest('rejects an empty native gallery result without preprocessing', async api => {
  const fixture = createFixture(api, { galleryResult: { results: [] } });
  await assert.rejects(
    fixture.service.chooseFromGallery(),
    error => error instanceof api.MealImageCaptureError && error.code === 'capture-cancelled',
  );
  assert.equal(fixture.calls.canvases.length, 0);
});
