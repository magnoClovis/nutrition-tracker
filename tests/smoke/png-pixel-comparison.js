const { PNG } = require('pngjs');

function comparePngPixels(baselineBuffer, candidateBuffer) {
  const baseline = PNG.sync.read(baselineBuffer);
  const candidate = PNG.sync.read(candidateBuffer);
  if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
    return {
      dimensionsMatch: false,
      differentPixels: Number.POSITIVE_INFINITY,
      maxChannelDelta: 255,
    };
  }

  let differentPixels = 0;
  let maxChannelDelta = 0;
  for (let offset = 0; offset < baseline.data.length; offset += 4) {
    let pixelDiffers = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(baseline.data[offset + channel] - candidate.data[offset + channel]);
      if (delta > 0) pixelDiffers = true;
      if (delta > maxChannelDelta) maxChannelDelta = delta;
    }
    if (pixelDiffers) differentPixels += 1;
  }

  return { dimensionsMatch: true, differentPixels, maxChannelDelta };
}

function isWithinRoundingTolerance(result) {
  return result.dimensionsMatch
    && result.differentPixels <= 20
    && result.maxChannelDelta <= 5;
}

module.exports = { comparePngPixels, isWithinRoundingTolerance };
