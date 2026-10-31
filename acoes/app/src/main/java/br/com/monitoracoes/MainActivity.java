package br.com.monitoracoes;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends Activity {

    private WebView web;
    private ValueCallback<Uri[]> escolhaArquivo;
    private static final int PEDIDO_ARQUIVO = 7;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Notif.criarCanal(this);
        AlertJob.agendar(this);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#08090C"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        // permite escolher o Excel da B3 (botão "Importar da B3")
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (escolhaArquivo != null) {
                    escolhaArquivo.onReceiveValue(null);
                }
                escolhaArquivo = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolha o arquivo da B3"), PEDIDO_ARQUIVO);
                } catch (Exception e) {
                    escolhaArquivo = null;
                    return false;
                }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(this, web), "Android");
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PEDIDO_ARQUIVO && escolhaArquivo != null) {
            Uri[] r = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                r = new Uri[]{data.getData()};
            }
            escolhaArquivo.onReceiveValue(r);
            escolhaArquivo = null;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.evaluateJavascript("window.aoVoltarAoApp && window.aoVoltarAoApp()", null);
        }
    }

    @Override
    public void onBackPressed() {
        if (web == null) {
            finish();
            return;
        }
        web.evaluateJavascript("window.voltar ? window.voltar() : false", valor -> {
            if (!"true".equals(valor)) {
                finish();
            }
        });
    }
}
