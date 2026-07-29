/**
 * Injectable file-export boundary shared by browser and native Android.
 */

function validateExportRequest({ content, filename, mimeType }) {
  if (typeof content !== 'string' || !filename || !mimeType) {
    throw new TypeError('exportFile requires string content, filename, and mimeType');
  }
}

export function createWebFileExporter({
  documentObject,
  BlobCtor,
  URLObject,
  setTimeoutFn,
}) {
  if (!documentObject?.createElement || !documentObject.body
    || typeof BlobCtor !== 'function' || !URLObject
    || typeof setTimeoutFn !== 'function') {
    throw new TypeError('Web file exporter requires browser services');
  }

  return async function webExportFile({ content, filename, mimeType }) {
    validateExportRequest({ content, filename, mimeType });
    try {
      const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
      const anchor = documentObject.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      documentObject.body.appendChild(anchor);
      anchor.click();
      documentObject.body.removeChild(anchor);
    } catch (_) {
      const blob = new BlobCtor([content], { type: mimeType });
      const url = URLObject.createObjectURL(blob);
      const anchor = documentObject.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeoutFn(() => URLObject.revokeObjectURL(url), 1000);
    }
    return { method: 'download', filename, mimeType };
  };
}

export function createNativeFileExporter({
  documentSaver,
  filesystem,
  share,
  cacheDirectory,
  utf8Encoding,
}) {
  if (!documentSaver?.saveFile
    || !filesystem?.writeFile || !filesystem?.getUri || !share?.share
    || !cacheDirectory || !utf8Encoding) {
    throw new TypeError('Native file exporter requires document saving, Filesystem, and Share plugins');
  }

  return async function nativeExportFile({
    content,
    filename,
    mimeType,
    destination = 'save',
  }) {
    validateExportRequest({ content, filename, mimeType });
    if (destination === 'save') {
      const saveResult = await documentSaver.saveFile({
        content,
        filename,
        mimeType,
      });
      return {
        method: 'save',
        filename,
        mimeType,
        uri: saveResult?.uri,
        cancelled: saveResult?.cancelled === true,
      };
    }
    if (destination !== 'share') {
      throw new TypeError(`Unsupported native export destination: ${destination}`);
    }

    await filesystem.writeFile({
      path: filename,
      data: content,
      directory: cacheDirectory,
      encoding: utf8Encoding,
    });
    const { uri } = await filesystem.getUri({
      path: filename,
      directory: cacheDirectory,
    });
    if (!uri) throw new Error('Filesystem did not return a URI for the exported file');

    const shareResult = await share.share({
      title: filename,
      dialogTitle: filename,
      files: [uri],
    });
    return {
      method: 'share',
      filename,
      mimeType,
      uri,
      activityType: shareResult?.activityType,
    };
  };
}

export function createFileExportAdapter({
  isNativeAndroid,
  webExportFile,
  nativeExportFile,
}) {
  if (typeof isNativeAndroid !== 'function'
    || typeof webExportFile !== 'function'
    || typeof nativeExportFile !== 'function') {
    throw new TypeError('File export adapter requires environment and exporter dependencies');
  }

  return {
    exportFile(request) {
      return isNativeAndroid()
        ? nativeExportFile(request)
        : webExportFile(request);
    },
  };
}
