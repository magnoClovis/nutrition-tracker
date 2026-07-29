package com.hermegas.phrona;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "DocumentSaver")
public class DocumentSaverPlugin extends Plugin {
    private static final String STATE_PENDING_FILE = "pendingFile";
    private File pendingFile;

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType");
        String content = call.getString("content");
        if (filename == null || filename.isEmpty()
                || mimeType == null || mimeType.isEmpty()
                || content == null) {
            call.reject("filename, mimeType, and content are required");
            return;
        }

        if (pendingFile != null) {
            call.reject("Another document save is already in progress");
            return;
        }

        try {
            pendingFile = File.createTempFile("phrona-export-", ".tmp", getContext().getCacheDir());
            try (OutputStream stagedOutput = new FileOutputStream(pendingFile, false)) {
                stagedOutput.write(content.getBytes(StandardCharsets.UTF_8));
                stagedOutput.flush();
            }
        } catch (Exception error) {
            cleanupPendingFile();
            call.reject("Could not prepare the exported file", error);
            return;
        }

        // Capacitor persists PluginCall data when the document picker stops the
        // Activity. Keeping a multi-megabyte backup here exceeds Android's
        // Binder transaction limit. The content is already staged in cache.
        call.getData().remove("content");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "saveFileResult");
    }

    @ActivityCallback
    private void saveFileResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            cleanupPendingFile();
            return;
        }
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            cleanupPendingFile();
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        Uri uri = data.getData();
        File stagedFile = pendingFile;
        if (stagedFile == null || !stagedFile.isFile()) {
            cleanupPendingFile();
            call.reject("Prepared export content is no longer available");
            return;
        }

        try (
            InputStream input = new FileInputStream(stagedFile);
            OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")
        ) {
            if (output == null) {
                cleanupPendingFile();
                call.reject("Android did not provide a writable document");
                return;
            }
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            output.flush();
        } catch (Exception error) {
            cleanupPendingFile();
            call.reject("Could not save the exported file", error);
            return;
        }
        cleanupPendingFile();

        JSObject saved = new JSObject();
        saved.put("cancelled", false);
        saved.put("uri", uri.toString());
        call.resolve(saved);
    }

    @Override
    protected Bundle saveInstanceState() {
        Bundle state = new Bundle();
        if (pendingFile != null) {
            state.putString(STATE_PENDING_FILE, pendingFile.getAbsolutePath());
        }
        return state;
    }

    @Override
    protected void restoreState(Bundle state) {
        String path = state == null ? null : state.getString(STATE_PENDING_FILE);
        pendingFile = path == null ? null : new File(path);
    }

    private void cleanupPendingFile() {
        if (pendingFile != null && pendingFile.exists()) {
            pendingFile.delete();
        }
        pendingFile = null;
    }
}
