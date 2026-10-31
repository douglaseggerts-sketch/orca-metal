package br.com.monitoracoes;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Dados guardados no próprio celular (lista de ações, médias, alertas). */
final class Store {

    private static final String ARQUIVO = "dados";

    private Store() {
    }

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE);
    }

    static synchronized String get(Context c, String chave, String padrao) {
        return prefs(c).getString(chave, padrao);
    }

    static synchronized void put(Context c, String chave, String valor) {
        prefs(c).edit().putString(chave, valor).apply();
    }

    static synchronized JSONArray alertas(Context c) {
        try {
            return new JSONArray(get(c, "alertas", "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    static synchronized void salvarAlertas(Context c, JSONArray a) {
        prefs(c).edit().putString("alertas", a.toString()).commit();
    }

    static synchronized JSONArray addAlerta(Context c, String json) {
        JSONArray a = alertas(c);
        try {
            JSONObject o = new JSONObject(json);
            if (!o.has("id")) {
                o.put("id", String.valueOf(System.currentTimeMillis()));
            }
            o.put("ativo", true);
            o.put("criadoEm", System.currentTimeMillis());
            a.put(o);
            salvarAlertas(c, a);
        } catch (JSONException ignored) {
        }
        return a;
    }

    static synchronized JSONArray removerAlerta(Context c, String id) {
        JSONArray a = alertas(c);
        JSONArray b = new JSONArray();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && !id.equals(o.optString("id"))) {
                b.put(o);
            }
        }
        salvarAlertas(c, b);
        return b;
    }

    static synchronized JSONArray ativarAlerta(Context c, String id, boolean ativo) {
        JSONArray a = alertas(c);
        try {
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.optJSONObject(i);
                if (o != null && id.equals(o.optString("id"))) {
                    o.put("ativo", ativo);
                    if (ativo) {
                        o.remove("disparadoEm");
                        o.remove("precoDisparo");
                        o.remove("ultimoLado");
                    }
                }
            }
            salvarAlertas(c, a);
        } catch (JSONException ignored) {
        }
        return a;
    }
}
