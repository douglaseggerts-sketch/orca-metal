package br.com.monitoracoes;

import android.app.Activity;
import android.app.NotificationManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

/** Ponte entre a interface (JavaScript) e o Android. */
public class Bridge {

    private final Activity act;
    private final WebView web;

    Bridge(Activity act, WebView web) {
        this.act = act;
        this.web = web;
    }

    private void responder(String cbId, boolean ok, String texto) {
        final String js = "window.__cb(" + JSONObject.quote(cbId) + "," + ok + ","
                + JSONObject.quote(texto == null ? "" : texto) + ")";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    /** Busca uma URL fora do navegador (evita bloqueio de CORS). Resposta volta por window.__cb. */
    @JavascriptInterface
    public void fetch(final String url, final String cbId) {
        new Thread(() -> {
            try {
                responder(cbId, true, Http.get(url));
            } catch (Exception e) {
                responder(cbId, false, String.valueOf(e.getMessage()));
            }
        }).start();
    }

    /** GET com cabeçalhos (JSON) — usado para Fundamentus e Bolsai. */
    @JavascriptInterface
    public void fetchCom(final String url, final String cabecalhos, final String cbId) {
        new Thread(() -> {
            try {
                JSONObject h = cabecalhos == null || cabecalhos.isEmpty() ? null : new JSONObject(cabecalhos);
                responder(cbId, true, Http.get(url, h));
            } catch (Exception e) {
                responder(cbId, false, String.valueOf(e.getMessage()));
            }
        }).start();
    }

    /** Tema do celular: true = escuro. */
    @JavascriptInterface
    public boolean temaSistemaEscuro() {
        int m = act.getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        return m == android.content.res.Configuration.UI_MODE_NIGHT_YES;
    }

    /** Cor das barras do Android conforme o tema do app. */
    @JavascriptInterface
    public void barras(final String cor, final boolean claro) {
        act.runOnUiThread(() -> {
            try {
                int c = android.graphics.Color.parseColor(cor);
                android.view.Window w = act.getWindow();
                w.setStatusBarColor(c);
                w.setNavigationBarColor(c);
                web.setBackgroundColor(c);
                int f = w.getDecorView().getSystemUiVisibility();
                int luz = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                w.getDecorView().setSystemUiVisibility(claro ? (f | luz) : (f & ~luz));
            } catch (Exception ignored) {
            }
        });
    }

    @JavascriptInterface
    public String load(String chave) {
        return Store.get(act, chave, "");
    }

    @JavascriptInterface
    public void save(String chave, String valor) {
        Store.put(act, chave, valor);
    }

    @JavascriptInterface
    public String alertas() {
        return Store.alertas(act).toString();
    }

    @JavascriptInterface
    public String addAlerta(String json) {
        return Store.addAlerta(act, json).toString();
    }

    @JavascriptInterface
    public String removerAlerta(String id) {
        return Store.removerAlerta(act, id).toString();
    }

    @JavascriptInterface
    public String ativarAlerta(String id, boolean ativo) {
        return Store.ativarAlerta(act, id, ativo).toString();
    }

    /** Verifica todos os alertas agora. Resposta (resumo) volta por window.__cb. */
    @JavascriptInterface
    public void verificarAgora(final String cbId) {
        new Thread(() -> {
            try {
                android.content.Context ctx = act.getApplicationContext();
                Sync.tentar(ctx);
                String r = AlertEngine.verificar(ctx);
                Sync.tentar(ctx);
                responder(cbId, true, r);
            } catch (Exception e) {
                responder(cbId, false, String.valueOf(e.getMessage()));
            }
        }).start();
    }

    /** Sincroniza com a Planilha Google. Resposta (resumo) volta por window.__cb. */
    @JavascriptInterface
    public void sincronizar(final String cbId) {
        new Thread(() -> {
            try {
                responder(cbId, true, Sync.sincronizar(act.getApplicationContext()));
            } catch (Exception e) {
                responder(cbId, false, String.valueOf(e.getMessage()));
            }
        }).start();
    }

    @JavascriptInterface
    public boolean notificacoesLiberadas() {
        NotificationManager nm = act.getSystemService(NotificationManager.class);
        return nm != null && nm.areNotificationsEnabled();
    }
}
