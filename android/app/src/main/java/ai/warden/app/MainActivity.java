package ai.warden.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    public class NativeBridge {
        private final Context context;

        public NativeBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String saveFileToDownloads(String fileName, String contentOrBase64, boolean isBase64, String subFolder) {
            try {
                byte[] data;
                if (isBase64) {
                    data = Base64.decode(contentOrBase64, Base64.DEFAULT);
                } else {
                    data = contentOrBase64.getBytes(StandardCharsets.UTF_8);
                }

                String folderName = (subFolder != null && !subFolder.trim().isEmpty()) ? subFolder.trim() : "Warden";
                String relativePath = Environment.DIRECTORY_DOWNLOADS + "/" + folderName;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = context.getContentResolver();
                    ContentValues contentValues = new ContentValues();
                    contentValues.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    contentValues.put(MediaStore.Downloads.MIME_TYPE, "application/octet-stream");
                    contentValues.put(MediaStore.Downloads.RELATIVE_PATH, relativePath);

                    Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                    if (uri != null) {
                        try (OutputStream os = resolver.openOutputStream(uri)) {
                            if (os != null) {
                                os.write(data);
                                os.flush();
                            }
                        }
                        showToast("Saved to Download/" + folderName + "/" + fileName);
                        return "{\"success\":true,\"path\":\"Download/" + folderName + "/" + fileName + "\"}";
                    }
                } else {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File targetDir = new File(downloadsDir, folderName);
                    if (!targetDir.exists()) {
                        targetDir.mkdirs();
                    }
                    File outFile = new File(targetDir, fileName);
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        fos.write(data);
                        fos.flush();
                    }
                    showToast("Saved to " + outFile.getAbsolutePath());
                    return "{\"success\":true,\"path\":\"" + outFile.getAbsolutePath() + "\"}";
                }
            } catch (Exception e) {
                e.printStackTrace();
                showToast("Failed to save: " + e.getMessage());
                return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
            }
            return "{\"success\":false,\"error\":\"Unable to create file\"}";
        }

        private void showToast(final String message) {
            runOnUiThread(() -> Toast.makeText(context, message, Toast.LENGTH_LONG).show());
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            // Unlock high refresh rate (90Hz / 120Hz) on supported Android 11+ screens
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    android.view.Display display = getDisplay();
                    if (display != null) {
                        android.view.Display.Mode[] modes = display.getSupportedModes();
                        android.view.Display.Mode maxMode = null;
                        float maxRefresh = 60f;
                        for (android.view.Display.Mode m : modes) {
                            if (m.getRefreshRate() > maxRefresh) {
                                maxRefresh = m.getRefreshRate();
                                maxMode = m;
                            }
                        }
                        if (maxMode != null) {
                            android.view.WindowManager.LayoutParams lp = getWindow().getAttributes();
                            lp.preferredDisplayModeId = maxMode.getModeId();
                            getWindow().setAttributes(lp);
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (this.bridge != null && this.bridge.getWebView() != null) {
                android.webkit.WebView webView = this.bridge.getWebView();
                // Enable hardware GPU acceleration layer & smooth touch overscroll
                webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
                webView.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);

                CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setSupportMultipleWindows(true);

                // Add native bridge to save directly to Download/Warden
                webView.addJavascriptInterface(new NativeBridge(this), "WardenNativeBridge");
            }
        } catch (Exception ignored) {}
    }
}
