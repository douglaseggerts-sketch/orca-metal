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
            if (v == null || ("bolsaiChave".equals(k) && v.trim().isEmpty())) {
                continue;   // chave vazia não apaga a do outro aparelho
            }
            dados.put(k, new JSONObject().put("v", v).put("t", Store.tempo(c, k)));
        }
        JSONObject corpo = new JSONObject().put("chave", chave).put("dados", dados)
                .put("aparelho", "celular");

        String resposta = Http.post(url, corpo.toString());
        JSONObject r;
        try {
            r = new JSONObject(resposta);
        } catch (Exception e) {
            throw new Exception(motivo(resposta));
        }
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
                if ("bolsaiChave".equals(k) && (v == null || v.trim().isEmpty())) {
                    continue;
                }
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

    /** Explica o que o Google respondeu quando não vieram os dados. */
    static String motivo(String t) {
        if (t == null) t = "";
        if (t.contains("accounts.google.com") || t.contains("ServiceLogin") || t.contains("Fazer login") || t.contains("Sign in")) {
            return "a planilha pediu login do Google: em Implantar › Gerenciar implantações, deixe \"Quem pode acessar: Qualquer pessoa\" e publique uma nova versão";
        }
        String l = t.toLowerCase();
        if (l.contains("authoriz") || l.contains("autoriza")) {
            return "o script ainda não foi autorizado: no Apps Script, execute a função \"testar\", permita o acesso e publique uma nova versão";
        }
        if (l.contains("script function not found")) {
            return "o script colado está incompleto: cole o arquivo MonitorAcoes.gs inteiro e publique uma nova versão";
        }
        return "a planilha respondeu algo inesperado: confira o endereço (termina em /exec) e o acesso \"Qualquer pessoa\"";
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
