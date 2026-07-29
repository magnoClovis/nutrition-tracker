const test = require("node:test");
const assert = require("node:assert/strict");

async function loadAdapter() {
  return import("../../src/composite/file-export-adapter.js");
}

test("selects the browser exporter outside native Android", async () => {
  const { createFileExportAdapter } = await loadAdapter();
  const calls = [];
  const adapter = createFileExportAdapter({
    isNativeAndroid: () => false,
    async webExportFile(request) {
      calls.push(["web", request]);
      return { method: "download" };
    },
    async nativeExportFile(request) {
      calls.push(["native", request]);
      return { method: "share" };
    }
  });
  const request = { content: "{}", filename: "backup.json", mimeType: "application/json" };

  const result = await adapter.exportFile(request);

  assert.deepEqual(result, { method: "download" });
  assert.deepEqual(calls, [["web", request]]);
});

test("selects the native exporter on Capacitor Android", async () => {
  const { createFileExportAdapter } = await loadAdapter();
  const calls = [];
  const adapter = createFileExportAdapter({
    isNativeAndroid: () => true,
    async webExportFile(request) {
      calls.push(["web", request]);
      return { method: "download" };
    },
    async nativeExportFile(request) {
      calls.push(["native", request]);
      return { method: "share" };
    }
  });
  const request = { content: "áçúcar", filename: "backup.json", mimeType: "application/json" };

  const result = await adapter.exportFile(request);

  assert.deepEqual(result, { method: "share" });
  assert.deepEqual(calls, [["native", request]]);
});

test("preserves the existing browser data URL download behavior", async () => {
  const { createWebFileExporter } = await loadAdapter();
  const calls = [];
  const anchor = {
    click() {
      calls.push(["click", this.href, this.download]);
    }
  };
  const exportFile = createWebFileExporter({
    documentObject: {
      createElement(tag) {
        calls.push(["createElement", tag]);
        return anchor;
      },
      body: {
        appendChild(value) { calls.push(["appendChild", value]); },
        removeChild(value) { calls.push(["removeChild", value]); }
      }
    },
    BlobCtor: class {},
    URLObject: {},
    setTimeoutFn() {}
  });

  await exportFile({
    content: '{"nome":"açúcar"}',
    filename: "backup.json",
    mimeType: "application/json"
  });

  assert.equal(anchor.href, `data:application/json;charset=utf-8,${encodeURIComponent('{"nome":"açúcar"}')}`);
  assert.equal(anchor.download, "backup.json");
  assert.deepEqual(calls.map(call => call[0]), [
    "createElement",
    "appendChild",
    "click",
    "removeChild"
  ]);
});

test("preserves the existing browser Blob fallback", async () => {
  const { createWebFileExporter } = await loadAdapter();
  const calls = [];
  let createCount = 0;
  class FakeBlob {
    constructor(parts, options) {
      calls.push(["blob", parts, options]);
    }
  }
  const exportFile = createWebFileExporter({
    documentObject: {
      createElement() {
        createCount += 1;
        if (createCount === 1) throw new Error("data URL unavailable");
        return {
          click() { calls.push(["fallbackClick", this.href, this.download]); }
        };
      },
      body: {
        appendChild() {},
        removeChild() {}
      }
    },
    BlobCtor: FakeBlob,
    URLObject: {
      createObjectURL() {
        calls.push(["createObjectURL"]);
        return "blob:backup";
      },
      revokeObjectURL(url) {
        calls.push(["revokeObjectURL", url]);
      }
    },
    setTimeoutFn(callback, delay) {
      calls.push(["setTimeout", delay]);
      callback();
    }
  });

  await exportFile({
    content: "{}",
    filename: "backup.json",
    mimeType: "application/json"
  });

  assert.deepEqual(calls, [
    ["blob", ["{}"], { type: "application/json" }],
    ["createObjectURL"],
    ["fallbackClick", "blob:backup", "backup.json"],
    ["setTimeout", 1000],
    ["revokeObjectURL", "blob:backup"]
  ]);
});

test("writes UTF-8 to cache, resolves its URI, then opens Android sharing", async () => {
  const { createNativeFileExporter } = await loadAdapter();
  const calls = [];
  const exportFile = createNativeFileExporter({
    documentSaver: {
      async saveFile() {
        throw new Error("must not save");
      }
    },
    filesystem: {
      async writeFile(options) {
        calls.push(["writeFile", options]);
      },
      async getUri(options) {
        calls.push(["getUri", options]);
        return { uri: "content://cache/backup.json" };
      }
    },
    share: {
      async share(options) {
        calls.push(["share", options]);
        return { activityType: "android.intent.action.SEND" };
      }
    },
    cacheDirectory: "CACHE",
    utf8Encoding: "utf8"
  });
  const request = {
    content: '{"nome":"açúcar"}',
    filename: "backup.json",
    mimeType: "application/json",
    destination: "share"
  };

  const result = await exportFile(request);

  assert.deepEqual(calls, [
    ["writeFile", {
      path: "backup.json",
      data: request.content,
      directory: "CACHE",
      encoding: "utf8"
    }],
    ["getUri", {
      path: "backup.json",
      directory: "CACHE"
    }],
    ["share", {
      title: "backup.json",
      dialogTitle: "backup.json",
      files: ["content://cache/backup.json"]
    }]
  ]);
  assert.deepEqual(result, {
    method: "share",
    filename: "backup.json",
    mimeType: "application/json",
    uri: "content://cache/backup.json",
    activityType: "android.intent.action.SEND"
  });
});

test("does not open sharing when the native file write fails", async () => {
  const { createNativeFileExporter } = await loadAdapter();
  let shareCalls = 0;
  const exportFile = createNativeFileExporter({
    documentSaver: {
      async saveFile() {
        throw new Error("must not save");
      }
    },
    filesystem: {
      async writeFile() {
        throw new Error("disk unavailable");
      },
      async getUri() {
        throw new Error("must not run");
      }
    },
    share: {
      async share() {
        shareCalls += 1;
      }
    },
    cacheDirectory: "CACHE",
    utf8Encoding: "utf8"
  });

  await assert.rejects(
    exportFile({
      content: "{}",
      filename: "backup.json",
      mimeType: "application/json",
      destination: "share"
    }),
    /disk unavailable/
  );
  assert.equal(shareCalls, 0);
});

test("uses the Android document picker by default and preserves cancellation", async () => {
  const { createNativeFileExporter } = await loadAdapter();
  const calls = [];
  const exportFile = createNativeFileExporter({
    documentSaver: {
      async saveFile(options) {
        calls.push(options);
        return { cancelled: true };
      }
    },
    filesystem: {
      async writeFile() {
        throw new Error("must not stage a saved file");
      },
      async getUri() {
        throw new Error("must not resolve a saved file");
      }
    },
    share: {
      async share() {
        throw new Error("must not share a saved file");
      }
    },
    cacheDirectory: "CACHE",
    utf8Encoding: "utf8"
  });
  const request = {
    content: '{"nome":"açúcar"}',
    filename: "backup.json",
    mimeType: "application/json"
  };

  const result = await exportFile(request);

  assert.deepEqual(calls, [request]);
  assert.deepEqual(result, {
    method: "save",
    filename: "backup.json",
    mimeType: "application/json",
    uri: undefined,
    cancelled: true
  });
});

test("returns the URI selected by the Android document picker", async () => {
  const { createNativeFileExporter } = await loadAdapter();
  const exportFile = createNativeFileExporter({
    documentSaver: {
      async saveFile() {
        return {
          cancelled: false,
          uri: "content://downloads/backup.json"
        };
      }
    },
    filesystem: {
      async writeFile() {},
      async getUri() {}
    },
    share: {
      async share() {}
    },
    cacheDirectory: "CACHE",
    utf8Encoding: "utf8"
  });

  const result = await exportFile({
    content: "{}",
    filename: "backup.json",
    mimeType: "application/json",
    destination: "save"
  });

  assert.deepEqual(result, {
    method: "save",
    filename: "backup.json",
    mimeType: "application/json",
    uri: "content://downloads/backup.json",
    cancelled: false
  });
});
