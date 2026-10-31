package br.com.monitoracoes;

import android.content.Context;

import org.json.JSONObject;

import java.util.Iterator;

/**
 * Sincroniza com a Planilha Google (script publicado como app da Web).
 * Uma única chamada envia o que mudou aqui e recebe a versão juntada dos dois aparelhos.
 */
final class Sync {

    private Sync() {
    }

    static boolean configurado(Context c) {
        return !Store.get(c, "syncUrl", "").isEmpty() && !Store.get(c, "syncChave", "").isEmpty();
    }

    /** Devolve um resumo em texto. Lança exceção se falhar. */
    static synchronized String sincronizar(Context c) throws Exception {
        String url = Store.get(c, "syncUrl", "").trim();
        String chave = Store.get(c, "syncChave", "").trim();
        if (url.isEmpty() || chave.isEmpty()) {
            return "Sincronização não configurada.";
        }
        if (!url.startsWith("https://script.google.com/")) {
            throw new Exception("O endereço deve começar com https://script.google.com/");
        }

        JSONObject dados = new JSONObject();
        for (String k : Store.SINCRONIZADAS) {
            String v = Store.get(c, k, null);
            if (v == null) {
                continue;
            }
            dados.put(k, new JSONObject().put("v", v).put("t", Store.tempo(c, k)));
        }
        JSONObject corpo = new JSONObject().put("chave", chave).put("dados", dados)
                .put("aparelho", "celular");

        JSONObject r = new JSONObject(Http.post(url, corpo.toString()));
        if (!r.optBoolean("ok")) {
            throw new Exception(r.optString("erro", "a planilha recusou a sincronização"));
        }
        JSONObject remoto = r.optJSONObject("dados");
        int recebidos = 0;
        if (remoto != null) {
            Iterator<String> it = remoto.keys();
            while (it.hasNext()) {
                String k = it.next();
                if (!Store.SINCRONIZADAS.contains(k)) {
                    continue;
                }
                JSONObject o = remoto.optJSONObject(k);
                if (o == null) {
                    continue;
                }
                String v = o.optString("v", null);
                long t = o.optLong("t", 0);
                String local = Store.get(c, k, null);
                // só aceita se não houve alteração aqui depois do que foi enviado
                if (v != null && !v.equals(local) && t >= Store.tempo(c, k)) {
                    Store.putRemoto(c, k, v, t);
                    recebidos++;
                }
            }
        }
        Store.put(c, "ultimaSync", String.valueOf(System.currentTimeMillis()));
        return recebidos == 0 ? "Sincronizado." : "Sincronizado (" + recebidos + " item(ns) recebido(s)).";
    }

    /** Versão que nunca falha (para uso em segundo plano). */
    static void tentar(Context c) {
        if (!configurado(c)) {
            return;
        }
        try {
            sincronizar(c);
        } catch (Exception ignored) {
        }
    }
}
