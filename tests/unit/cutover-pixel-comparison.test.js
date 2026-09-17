const test = require('node:test');
const assert = require('node:assert/strict');
const { PNG } = require('pngjs');
const {
  comparePngPixels,
  isWithinRoundingTolerance,
} = require('../smoke/png-pixel-comparison');

function pngBuffer(pixels, width = pixels.length) {
  const image = new PNG({ width, height: pixels.length / width });
  pixels.forEach((pixel, index) => {
    image.data.set(pixel, index * 4);
  });
  return PNG.sync.write(image);
}

test('cutover pixel comparison tolerates only the measured edge-antialiasing margin', () => {
  const baselinePixels = Array.from({ length: 21 }, () => [20, 30, 40, 255]);
  const baseline = pngBuffer(baselinePixels);
  const twentyEdgeDeltas = pngBuffer(baselinePixels.map((pixel, index) => (
    index < 20 ? [25, 35, 45, 255] : pixel
  )));
  const excessiveChannelDelta = pngBuffer(baselinePixels.map((pixel, index) => (
    index === 0 ? [26, 30, 40, 255] : pixel
  )));
  const twentyOnePixelDeltas = pngBuffer(baselinePixels.map(() => [21, 30, 40, 255]));

  assert.equal(isWithinRoundingTolerance(comparePngPixels(baseline, baseline)), true);
  assert.equal(isWithinRoundingTolerance(comparePngPixels(baseline, twentyEdgeDeltas)), true);
  assert.equal(isWithinRoundingTolerance(comparePngPixels(baseline, excessiveChannelDelta)), false);
  assert.equal(isWithinRoundingTolerance(comparePngPixels(baseline, twentyOnePixelDeltas)), false);
  assert.equal(
    isWithinRoundingTolerance(comparePngPixels(baseline, pngBuffer([[20, 30, 40, 255]], 1))),
    false,
  );
});
