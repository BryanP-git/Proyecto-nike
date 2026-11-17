package co.armario.tienda;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.view.Window;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Contenedor de la tienda Armario para Android.
 *
 * La app no trae una copia de la tienda: abre el servidor (Node + MySQL) en un WebView,
 * igual que una PWA instalada. Por eso pesa muy poco y siempre muestra el inventario real.
 *
 * - La primera vez muestra setup.html para escribir la dirección del servidor.
 * - La dirección se guarda en SharedPreferences.
 * - Esquema armario:// para hablar con la página:
 *     armario://save?url=...  guarda la dirección y abre la tienda
 *     armario://setup         vuelve a la pantalla de dirección
 *     armario://print         imprime o guarda en PDF la factura con el servicio de Android
 * - Enlaces a otros dominios se abren en el navegador.
 * - Selector de archivos para la foto de perfil.
 *
 * Este archivo es la versión legible. El APK se arma con los .smali equivalentes
 * (ver build.sh); en Android Studio se puede compilar este archivo directamente.
 */
public class MainActivity extends Activity {
    static final String SETUP = "file:///android_asset/setup.html";
    static final int PICK = 7;
    WebView web;
    ValueCallback<Uri[]> files;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        w.setStatusBarColor(0xff0a0710);
        w.setNavigationBarColor(0xff07050b);

        web = new WebView(this);
        web.setBackgroundColor(0xff07050b);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setUserAgentString(s.getUserAgentString() + " ArmarioApp/1.0");
        web.setWebViewClient(new Client(this));
        web.setWebChromeClient(new Chrome(this));
        setContentView(web);

        String url = saved();
        web.loadUrl(url != null ? url : SETUP);
    }

    private String saved() {
        return getSharedPreferences("armario", 0).getString("url", null);
    }

    public void showSetup(boolean error) {
        String u = saved();
        if (u == null) u = "";
        web.loadUrl((error ? SETUP + "#e=1&u=" : SETUP + "#u=") + Uri.encode(u));
    }

    /** Devuelve true si la navegación ya se atendió aquí y el WebView no debe cargarla. */
    public boolean handle(String url) {
        if (url.startsWith("http")) {
            String s = saved();
            if (s == null) return false;
            Uri target = Uri.parse(url);
            if (Uri.parse(s).getHost().equals(target.getHost())) return false;
            try { startActivity(new Intent("android.intent.action.VIEW", target)); } catch (Exception e) { }
            return true;
        }
        if (!url.startsWith("armario:")) return false;
        Uri u = Uri.parse(url);
        String host = u.getHost();
        if ("save".equals(host)) {
            String target = u.getQueryParameter("url");
            if (target != null) {
                SharedPreferences.Editor e = getSharedPreferences("armario", 0).edit();
                e.putString("url", target).apply();
                web.loadUrl(target);
            }
        } else if ("setup".equals(host)) {
            showSetup(false);
        } else if ("print".equals(host)) {
            PrintManager pm = (PrintManager) getSystemService("print");
            pm.print("Factura Armario", web.createPrintDocumentAdapter("Factura Armario"), null);
        }
        return true;
    }

    public boolean choose(ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams params) {
        if (files != null) files.onReceiveValue(null);
        files = cb;
        try {
            startActivityForResult(params.createIntent(), PICK);
        } catch (Exception e) {
            files = null;
            return false;
        }
        return true;
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == PICK && files != null) {
            files.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            files = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /* las animaciones de la tienda se pausan cuando la app queda en segundo plano */
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
}

class Client extends WebViewClient {
    private final MainActivity a;
    Client(MainActivity a) { this.a = a; }

    @Override
    public boolean shouldOverrideUrlLoading(WebView v, String url) { return a.handle(url); }

    @Override
    public void onReceivedError(WebView v, int code, String description, String url) {
        if (url != null && !url.startsWith("file:")) a.showSetup(true);
    }
}

class Chrome extends WebChromeClient {
    private final MainActivity a;
    Chrome(MainActivity a) { this.a = a; }

    @Override
    public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
        return a.choose(cb, p);
    }
}
