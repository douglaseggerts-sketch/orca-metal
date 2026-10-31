package br.com.monitoracoes;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Dados guardados no próprio celular (lista de ações, médias, carteira, alertas).
 * Cada chave sincronizada guarda também quando foi alterada ("_t_" + chave),
 * para a planilha saber qual versão é a mais nova.
 */
final class Store {

    private static final String ARQUIVO = "dados";
    static final Set<String> SINCRONIZADAS = new HashSet<>(Arrays.asList(
            "lista", "medias", "ifr", "carteira", "alertas", "alertasExcluidos"));

    private Store() {
    }

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE);
    }

    static synchronized String get(Context c, String chave, String padrao) {
        return prefs(c).getString(chave, padrao);
    }

    static synchronized long tempo(Context c, String chave) {
        return prefs(c).getLong("_t_" + chave, 0);
    }

    /** Grava um valor; se mudou e a chave é sincronizada, marca a hora da alteração. */
    static synchronized void put(Context c, String chave, String valor) {
        String antes = prefs(c).getString(chave, null);
        SharedPreferences.Editor e = prefs(c).edit().putString(chave, valor);
        if (SINCRONIZADAS.contains(chave) && !valor.equals(antes)) {
            e.putLong("_t_" + chave, System.currentTimeMillis());
        }
        e.commit();
    }

    /** Grava um valor vindo da planilha, com a hora que ela informou. */
    static synchronized void putRemoto(Context c, String chave, String valor, long t) {
        prefs(c).edit().putString(chave, valor).putLong("_t_" + chave, t).commit();
    }

    static synchronized JSONArray alertas(Context c) {
        try {
            return new JSONArray(get(c, "alertas", "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    static synchronized void salvarAlertas(Context c, JSONArray a, boolean alterou) {
        SharedPreferences.Editor e = prefs(c).edit().putString("alertas", a.toString());
        if (alterou) {
            e.putLong("_t_alertas", System.currentTimeMillis());
        }
        e.commit();
    }

    static synchronized JSONArray addAlerta(Context c, String json) {
        JSONArray a = alertas(c);
        try {
            JSONObject o = new JSONObject(json);
            long agora = System.currentTimeMillis();
            if (!o.has("id")) {
                o.put("id", agora + "-" + Integer.toHexString((int) (Math.random() * 0xFFFF)));
            }
            o.put("ativo", true);
            o.put("criadoEm", agora);
            o.put("mod", agora);
            a.put(o);
            salvarAlertas(c, a, true);
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
        // lembra a exclusão, para o outro aparelho também apagar
        try {
            JSONObject exc = new JSONObject(get(c, "alertasExcluidos", "{}"));
            exc.put(id, System.currentTimeMillis());
            put(c, "alertasExcluidos", exc.toString());
        } catch (JSONException ignored) {
        }
        salvarAlertas(c, b, true);
        return b;
    }

    static synchronized JSONArray ativarAlerta(Context c, String id, boolean ativo) {
        JSONArray a = alertas(c);
        try {
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.optJSONObject(i);
                if (o != null && id.equals(o.optString("id"))) {
                    o.put("ativo", ativo);
                    o.put("mod", System.currentTimeMillis());
                    if (ativo) {
                        o.remove("disparadoEm");
                        o.remove("precoDisparo");
                        o.remove("ultimoLado");
                        o.remove("ladoEm");
                    }
                }
            }
            salvarAlertas(c, a, true);
        } catch (JSONException ignored) {
        }
        return a;
    }
}
